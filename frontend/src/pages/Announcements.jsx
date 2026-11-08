import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { formatDate } from '../utils';
import { Trash2, Plus, Search, X, Sparkles, Play, Video, ExternalLink, Camera, Square, Upload, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const getVideoDetails = (item) => {
  if (!item) return { url: null, embedUrl: null, isDirect: false };
  let url = (item.video_url || item.video_file_url || item.video_file || '').trim();
  if (!url && item.content) {
    const match = item.content.match(/https?:\/\/[^\s]+/);
    if (match) {
      const candidate = match[0];
      if (candidate.includes('youtu') || candidate.includes('vimeo') || candidate.includes('drive.google') || candidate.endsWith('.mp4') || item.announcement_type === 'video') {
        url = candidate;
      }
    }
  }
  if (!url) return { url: null, embedUrl: null, isDirect: false };

  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (ytMatch) {
    return { url, embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}`, isDirect: false };
  }

  if (url.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i) || url.includes('/media/announcements/')) {
    return { url, embedUrl: null, isDirect: true };
  }

  return { url, embedUrl: null, isDirect: false };
};

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [sections, setSections] = useState([]);
  const [zones, setZones] = useState([]);
  const [ministries, setMinistries] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiTone, setAiTone] = useState('warm');
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'text',
    audience: 'all',
    target_sections: [],
    target_zones: [],
    target_ministries: [],
    video_url: ''
  });

  // Video recording / upload state
  const [videoMode, setVideoMode] = useState('record'); // 'record' | 'upload' | 'link'
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  const videoLiveRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);

  const handleGenerateWithAI = async () => {
    if (!aiPrompt.trim()) {
      alert("Please provide a short prompt or brief notes for the AI drafter.");
      return;
    }
    setAiGenerating(true);
    try {
      const res = await api.draftMessageWithAI(aiPrompt, aiTone, formData.audience);
      if (res && res.title && res.content) {
        setFormData(prev => ({
          ...prev,
          title: res.title,
          content: res.content
        }));
      } else {
        alert("Could not generate announcement draft. Please try again.");
      }
    } catch (err) {
      alert("AI drafter encountered an error: " + (err.message || "Failed to reach AI service."));
    } finally {
      setAiGenerating(false);
    }
  };

  const fetchData = async () => {
    try {
      const [annData, secData, zoneData, minData] = await Promise.all([
        api.getAnnouncements(),
        api.getSections().catch(() => ({results: []})),
        api.getZones().catch(() => ({results: []})),
        api.getMinistries().catch(() => ({results: []}))
      ]);
      setAnnouncements(annData.results || annData || []);
      setSections(secData.results || secData || []);
      setZones(zoneData.results || zoneData || []);
      setMinistries(minData.results || minData || []);
    } catch (err) {
      console.error("Failed to fetch announcements data", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Cleanup camera stream when closing modal or unmounting
  const stopCameraStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setCameraActive(false);
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  useEffect(() => {
    if (!isModalOpen) {
      stopCameraStream();
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
        setVideoPreviewUrl(null);
      }
      setVideoFile(null);
    }
  }, [isModalOpen]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { max: 24 } },
        audio: true
      });
      mediaStreamRef.current = stream;
      if (videoLiveRef.current) {
        videoLiveRef.current.srcObject = stream;
        videoLiveRef.current.play();
      }
      setCameraActive(true);
    } catch (err) {
      console.error("Camera access error:", err);
      setCameraError("Camera access denied or unavailable. You can upload an existing video instead.");
    }
  };

  const startRecording = () => {
    if (!mediaStreamRef.current) return;
    recordedChunksRef.current = [];
    try {
      const options = { mimeType: 'video/webm;codecs=vp8,opus' };
      let recorder;
      if (MediaRecorder.isTypeSupported(options.mimeType)) {
        recorder = new MediaRecorder(mediaStreamRef.current, options);
      } else {
        recorder = new MediaRecorder(mediaStreamRef.current);
      }

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const file = new File([blob], `announcement_${Date.now()}.webm`, { type: 'video/webm' });
        
        // 20MB server storage guard
        if (file.size > 20 * 1024 * 1024) {
          alert("Recorded video exceeds 20MB. Please record a shorter message (under 60 seconds) to save server storage.");
          return;
        }

        setVideoFile(file);
        const url = URL.createObjectURL(blob);
        setVideoPreviewUrl(url);
        stopCameraStream();
      };

      recorder.start(1000); // 1s slices
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);

      // Max 90s countdown timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds(sec => {
          if (sec >= 89) {
            stopRecording();
            return 90;
          }
          return sec + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Failed to start MediaRecorder:", err);
      alert("Could not start recording. You can upload a recorded video file instead.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setIsRecording(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Strict 20MB server limit
    const sizeMb = file.size / (1024 * 1024);
    if (sizeMb > 20) {
      alert(`Video is ${sizeMb.toFixed(1)}MB. Maximum allowed is 20MB to save PythonAnywhere server storage. Please choose a smaller or trimmed clip.`);
      e.target.value = '';
      return;
    }

    setVideoFile(file);
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    setVideoPreviewUrl(URL.createObjectURL(file));
  };

  const clearVideo = () => {
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    setVideoPreviewUrl(null);
    setVideoFile(null);
    stopCameraStream();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (formData.type === 'video' && videoFile) {
        const payload = new FormData();
        payload.append('title', formData.title.trim());
        payload.append('content', formData.content.trim());
        payload.append('announcement_type', 'video');
        payload.append('audience', formData.audience);
        if (formData.video_url.trim()) {
          payload.append('video_url', formData.video_url.trim());
        }
        payload.append('video_file', videoFile);
        formData.target_sections.forEach(id => payload.append('target_sections', id));
        formData.target_zones.forEach(id => payload.append('target_zones', id));
        formData.target_ministries.forEach(id => payload.append('target_ministries', id));

        await api.createAnnouncement(payload);
      } else {
        const payload = { ...formData };
        await api.createAnnouncement(payload);
      }

      setIsModalOpen(false);
      clearVideo();
      setFormData({
        title: '',
        content: '',
        type: 'text',
        audience: 'all',
        target_sections: [],
        target_zones: [],
        target_ministries: [],
        video_url: ''
      });
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to create announcement');
    } finally {
      setLoading(false);
    }
  };

  const isSectionLeader = ['section_admin', 'section_treasurer'].includes(user?.role);
  const isZoneLeader = ['zone_admin', 'zone_treasurer'].includes(user?.role);
  const isMinistryLeader = user?.role === 'group_leader';
  const isAdmin = ['admin', 'superadmin', 'treasurer'].includes(user?.role);

  const filtered = announcements.filter(a => 
    a.title.toLowerCase().includes(search.toLowerCase()) || 
    (a.content && a.content.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Announcements</h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage and publish {user?.org_type === 'PTA' ? 'school & PTA' : 'church'} communications
          </p>
        </div>
        <div className="flex gap-3 items-center">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search announcements..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-400 bg-white" 
            />
          </div>
          {(isAdmin || isSectionLeader || isZoneLeader || isMinistryLeader) && (
            <button 
              onClick={() => setIsModalOpen(true)} 
              className="btn-primary flex items-center gap-2 py-2 px-4 shadow-sm"
            >
              <Plus className="w-4 h-4" /> New Announcement
            </button>
          )}
        </div>
      </div>

      {/* Announcements List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No announcements found matching your criteria.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map(ann => {
              const video = getVideoDetails(ann);
              return (
                <div 
                  key={ann.id} 
                  className="p-5 hover:bg-slate-50/60 transition-colors flex items-start justify-between gap-4 cursor-pointer"
                  onClick={() => setPreview(ann)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        ann.announcement_type === 'video' 
                          ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                          : 'bg-sky-50 text-sky-700 border border-sky-200'
                      }`}>
                        {ann.announcement_type === 'video' ? <Video className="w-3 h-3" /> : null}
                        {ann.announcement_type === 'video' ? 'Video Announcement' : 'Text Notice'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 capitalize">
                        {ann.audience || 'All'}
                      </span>
                      <span className="text-xs text-slate-400">
                        • {formatDate(ann.created_at)}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-slate-800 mb-1">{ann.title}</h3>
                    <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">{ann.content}</p>
                    {video.url && (
                      <div className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700">
                        <Play className="w-3.5 h-3.5 fill-rose-600" /> Watch Video Clip
                      </div>
                    )}
                  </div>
                  {isAdmin && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Are you sure you want to delete this announcement?')) {
                          api.deleteAnnouncement(ann.id).then(fetchData);
                        }
                      }}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                      title="Delete Announcement"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {preview && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50" onClick={() => setPreview(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-start gap-4 mb-3">
                <h3 className="text-lg font-bold text-slate-900">{preview.title}</h3>
                <button onClick={() => setPreview(null)} className="text-slate-400 hover:text-slate-600 p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-slate-400 mb-4">{formatDate(preview.created_at)}</p>

              {/* Video Player */}
              {(() => {
                const v = getVideoDetails(preview);
                if (!v.url) return null;
                return (
                  <div className="mb-4 rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                    {v.embedUrl ? (
                      <iframe src={v.embedUrl} title={preview.title} className="w-full h-full border-0" allowFullScreen />
                    ) : v.isDirect ? (
                      <video src={v.url} controls autoPlay className="w-full h-full object-contain" />
                    ) : (
                      <div className="text-center p-4 text-white">
                        <Video className="w-8 h-8 mx-auto mb-2 text-rose-500" />
                        <p className="text-xs">External Video Link</p>
                      </div>
                    )}
                  </div>
                );
              })()}

              <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{preview.content}</p>
            </div>
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button onClick={() => setPreview(null)} className="btn-secondary px-5 py-2 text-xs font-bold">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-100" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 shrink-0 bg-white">
              <div>
                <h2 className="text-xl font-semibold text-slate-800">New Announcement</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Publish an official communication to your members or congregation
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-5 overflow-y-auto flex-1">

                {/* Leader Jurisdiction Scoping Banner */}
                {isSectionLeader && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span><b>Section Scoped:</b> This announcement will be strictly delivered to members within your Section.</span>
                  </div>
                )}
                {isZoneLeader && (
                  <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-indigo-600" />
                    <span><b>Zone Scoped:</b> This announcement will be strictly delivered to members within your Zone.</span>
                  </div>
                )}
                {isMinistryLeader && (
                  <div className="p-3 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-teal-600" />
                    <span><b>Ministry Scoped:</b> This announcement will be strictly delivered to members of your assigned ministries.</span>
                  </div>
                )}

                {/* AI Drafter */}
                <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-blue-800 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-blue-600" /> AI Smart Drafter
                    </span>
                    <select
                      value={aiTone}
                      onChange={e => setAiTone(e.target.value)}
                      className="text-xs px-2.5 py-1.5 rounded-lg border border-blue-200 bg-white text-slate-700 font-medium"
                    >
                      <option value="warm">Warm & Welcoming</option>
                      <option value="formal">Official & Formal</option>
                      <option value="urgent">Urgent Notice</option>
                    </select>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <input
                      type="text"
                      value={aiPrompt}
                      onChange={e => setAiPrompt(e.target.value)}
                      placeholder="Brief notes, e.g. Choir rehearsal Saturday at 14:00 in Main Sanctuary..."
                      className="flex-1 px-3.5 py-2 bg-white border border-blue-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleGenerateWithAI}
                      disabled={aiGenerating}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0 transition-colors disabled:opacity-60"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {aiGenerating ? 'Drafting...' : 'Generate with AI'}
                    </button>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Title</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Section Fellowship Notice"
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-400"
                  />
                </div>

                {/* Type & Audience */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Announcement Format</label>
                    <select 
                      value={formData.type} 
                      onChange={e => setFormData({...formData, type: e.target.value})} 
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-400 bg-white"
                    >
                      <option value="text">Standard Text Notice</option>
                      <option value="video">Video Announcement</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Audience</label>
                    <select 
                      value={formData.audience} 
                      onChange={e => setFormData({...formData, audience: e.target.value})} 
                      disabled={!isAdmin}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-400 bg-white disabled:bg-slate-50 disabled:text-slate-500"
                    >
                      {isAdmin && <option value="all">Everyone (Entire Congregation)</option>}
                      <option value="members">Church Members Only</option>
                      {!isMinistryLeader && <option value="leaders">All Leaders</option>}
                      {(isAdmin || isSectionLeader) && <option value="section_admins">Section Elders Only</option>}
                      {(isAdmin || isZoneLeader) && <option value="zone_admins">Zone Elders Only</option>}
                    </select>
                  </div>
                </div>

                {/* Video Capture & Options */}
                {formData.type === 'video' && (
                  <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                        <Video className="w-4 h-4 text-rose-600" /> Video Recording & Upload (Max 20MB)
                      </span>
                      <div className="flex gap-1 bg-white p-1 rounded-lg border border-rose-200 text-xs font-medium">
                        <button
                          type="button"
                          onClick={() => { setVideoMode('record'); clearVideo(); }}
                          className={`px-2.5 py-1 rounded-md transition-colors ${videoMode === 'record' ? 'bg-rose-600 text-white font-bold' : 'text-slate-600 hover:text-rose-600'}`}
                        >
                          Webcam
                        </button>
                        <button
                          type="button"
                          onClick={() => { setVideoMode('upload'); clearVideo(); }}
                          className={`px-2.5 py-1 rounded-md transition-colors ${videoMode === 'upload' ? 'bg-rose-600 text-white font-bold' : 'text-slate-600 hover:text-rose-600'}`}
                        >
                          Upload File
                        </button>
                        <button
                          type="button"
                          onClick={() => { setVideoMode('link'); clearVideo(); }}
                          className={`px-2.5 py-1 rounded-md transition-colors ${videoMode === 'link' ? 'bg-rose-600 text-white font-bold' : 'text-slate-600 hover:text-rose-600'}`}
                        >
                          Link
                        </button>
                      </div>
                    </div>

                    {/* Mode 1: Webcam Recording */}
                    {videoMode === 'record' && (
                      <div className="space-y-3">
                        {!cameraActive && !videoPreviewUrl && (
                          <div className="text-center py-6 bg-white rounded-xl border border-dashed border-rose-200">
                            <Camera className="w-10 h-10 text-rose-400 mx-auto mb-2" />
                            <p className="text-xs font-medium text-slate-700 mb-3">Record directly with your laptop / device camera</p>
                            <button
                              type="button"
                              onClick={startCamera}
                              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-2 shadow-xs"
                            >
                              <Camera className="w-4 h-4" /> Turn On Camera
                            </button>
                            {cameraError && <p className="text-xs text-red-600 mt-2">{cameraError}</p>}
                          </div>
                        )}

                        {cameraActive && (
                          <div className="rounded-xl overflow-hidden bg-black aspect-video relative flex items-center justify-center">
                            <video ref={videoLiveRef} muted playsInline className="w-full h-full object-cover" />
                            {isRecording && (
                              <div className="absolute top-3 right-3 bg-red-600 text-white px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 animate-pulse">
                                <span className="w-2 h-2 rounded-full bg-white"></span>
                                {recordingSeconds}s / 90s max
                              </div>
                            )}
                            <div className="absolute bottom-3 inset-x-0 flex justify-center gap-3">
                              {!isRecording ? (
                                <button
                                  type="button"
                                  onClick={startRecording}
                                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full text-xs font-bold inline-flex items-center gap-2 shadow-lg"
                                >
                                  <div className="w-2.5 h-2.5 rounded-full bg-white"></div> Start Recording
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={stopRecording}
                                  className="px-5 py-2 bg-slate-900/90 hover:bg-black text-white rounded-full text-xs font-bold inline-flex items-center gap-2 shadow-lg"
                                >
                                  <Square className="w-3.5 h-3.5 fill-white" /> Stop & Save Clip
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {videoPreviewUrl && (
                          <div className="space-y-2">
                            <div className="rounded-xl overflow-hidden bg-black aspect-video">
                              <video src={videoPreviewUrl} controls className="w-full h-full object-contain" />
                            </div>
                            <div className="flex items-center justify-between text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
                              <span className="flex items-center gap-1.5 font-medium text-emerald-700">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                Ready ({((videoFile?.size || 0) / (1024 * 1024)).toFixed(1)} MB)
                              </span>
                              <button
                                type="button"
                                onClick={clearVideo}
                                className="text-xs text-rose-600 hover:text-rose-700 font-bold inline-flex items-center gap-1"
                              >
                                <RefreshCw className="w-3 h-3" /> Retake
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Mode 2: File Upload */}
                    {videoMode === 'upload' && (
                      <div className="space-y-3">
                        <div className="border border-dashed border-rose-300 rounded-xl p-6 text-center bg-white">
                          <Upload className="w-8 h-8 text-rose-400 mx-auto mb-2" />
                          <p className="text-xs font-medium text-slate-700 mb-1">Upload a video clip (MP4, WebM)</p>
                          <p className="text-[11px] text-slate-400 mb-3">Maximum file size: 20MB (saves server disk space)</p>
                          <input
                            type="file"
                            accept="video/mp4,video/webm,video/quicktime,video/*"
                            onChange={handleFileUpload}
                            className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100 cursor-pointer"
                          />
                        </div>

                        {videoPreviewUrl && (
                          <div className="space-y-2">
                            <div className="rounded-xl overflow-hidden bg-black aspect-video max-h-52">
                              <video src={videoPreviewUrl} controls className="w-full h-full object-contain" />
                            </div>
                            <div className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-slate-200">
                              <span className="text-emerald-700 font-medium">Selected: {videoFile?.name} ({((videoFile?.size || 0) / (1024 * 1024)).toFixed(1)} MB)</span>
                              <button type="button" onClick={clearVideo} className="text-rose-600 font-bold text-xs">Remove</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Mode 3: External Link */}
                    {videoMode === 'link' && (
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">YouTube / Vimeo / External Video URL</label>
                        <input
                          type="url"
                          placeholder="https://youtube.com/watch?v=... or https://youtu.be/..."
                          value={formData.video_url}
                          onChange={e => setFormData({...formData, video_url: e.target.value})}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-rose-400"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Content */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Announcement Content / Message</label>
                  <textarea
                    required
                    rows="4"
                    placeholder="Type the announcement details here..."
                    value={formData.content}
                    onChange={e => setFormData({...formData, content: e.target.value})}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-400 leading-relaxed"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-white border border-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || (formData.type === 'video' && !videoFile && !formData.video_url.trim())}
                  className="btn-primary py-2 px-6 disabled:opacity-50"
                >
                  {loading ? 'Publishing...' : 'Publish Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
