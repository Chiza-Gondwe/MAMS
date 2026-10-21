import { useState, useEffect } from 'react';
import { api } from '../api';
import { formatDate } from '../utils';
import { Trash2, Plus, Search, X, Sparkles, Play, Video, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const getVideoDetails = (item) => {
  if (!item) return { url: null, embedUrl: null, isDirect: false };
  let url = (item.video_url || '').trim();
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

  if (url.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i)) {
    return { url, embedUrl: null, isDirect: true };
  }

  return { url, embedUrl: null, isDirect: false };
};

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [sections, setSections] = useState([]);
  const [zones, setZones] = useState([]);
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiTone, setAiTone] = useState('warm');
  const [aiGenerating, setAiGenerating] = useState(false);
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
  
  const { user } = useAuth();

  const [ministries, setMinistries] = useState([]);

  const handleGenerateWithAI = async () => {
    const topicText = aiPrompt.trim() || formData.title.trim() || formData.content.trim();
    if (!topicText) {
      alert('Enter a few words or topic first (e.g. "Youth choir practice Saturday 2pm")');
      return;
    }
    setAiGenerating(true);
    try {
      const res = await api.draftMessageWithAI({
        prompt: topicText,
        tone: aiTone,
        audience: formData.audience,
        message_type: 'announcement',
      });
      setFormData(prev => ({
        ...prev,
        title: res.title || prev.title,
        content: res.content || prev.content,
      }));
    } catch (err) {
      alert(err.message || 'Failed to generate with AI');
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...formData };
      
      await api.createAnnouncement(payload);
      setIsModalOpen(false);
      setFormData({ title: '', content: '', type: 'text', audience: 'all', target_sections: [], target_zones: [], target_ministries: [], video_url: '' });
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to create announcement');
    } finally {
      setLoading(false);
    }
  };

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
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg w-64 focus:outline-none focus:border-sky-400"
            />
          </div>
          <button onClick={() => setIsModalOpen(true)} className="btn-primary flex items-center gap-1.5 py-2">
            <Plus className="w-4 h-4" /> New announcement
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full py-12 text-center text-sm text-slate-400 bg-white rounded-xl border border-slate-200 shadow-sm">
            No announcements found.
          </div>
        ) : filtered.map(ann => {
          const v = getVideoDetails(ann);
          const isVideo = ann.announcement_type === 'video' || Boolean(v.url);
          return (
            <div key={ann.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer flex flex-col" onClick={() => setPreview(ann)}>
              <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    isVideo ? 'bg-rose-100 text-rose-700 font-bold flex items-center gap-1' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {isVideo && <Play className="w-3 h-3 fill-rose-600" />}
                    {isVideo ? 'Video' : 'Text'}
                  </span>
                  <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full capitalize">
                    {(ann.audience === 'all' || !ann.audience) ? 'All Members' : ann.audience}
                  </span>
                </div>
                <h3 className="font-semibold text-slate-800 mb-2 line-clamp-1">{ann.title}</h3>
                <p className="text-sm text-slate-500 line-clamp-2">{ann.content}</p>
                {v.url && (
                  <div className="mt-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-semibold hover:bg-rose-100 transition-colors">
                      <Play className="w-3 h-3 fill-rose-600" /> Watch Video
                    </span>
                  </div>
                )}
              </div>
              <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                <span className="text-xs text-slate-400">{formatDate(ann.created_at)}</span>
                <button className="text-slate-400 hover:text-red-600 p-1.5 rounded-md hover:bg-slate-200 transition-colors" onClick={(e) => { e.stopPropagation(); api.deleteAnnouncement(ann.id).then(() => fetchData()); }}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Preview Modal */}
      {preview && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setPreview(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[88vh] flex flex-col overflow-hidden shadow-2xl border border-slate-100" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start gap-3 px-6 py-4 border-b border-slate-100 shrink-0 bg-white">
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-slate-800 leading-snug">{preview.title}</h3>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <span className="text-xs font-medium text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-md capitalize">
                    Audience: {(preview.audience === 'all' || !preview.audience) ? 'All Members' : preview.audience}
                  </span>
                  <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                    {formatDate(preview.created_at)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreview(null)}
                aria-label="Close announcement"
                className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-lg transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <p className="text-slate-600 leading-relaxed whitespace-pre-wrap text-sm">{preview.content}</p>
              {(() => {
                const v = getVideoDetails(preview);
                if (!v.url) return null;
                return (
                  <div className="space-y-3 pt-1">
                    <div className="rounded-xl overflow-hidden bg-slate-900 aspect-video max-h-56 w-full flex items-center justify-center border border-slate-800 shadow-inner">
                      {v.embedUrl ? (
                        <iframe
                          src={v.embedUrl}
                          title={preview.title}
                          className="w-full h-full border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : v.isDirect ? (
                        <video src={v.url} controls className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center p-4">
                          <Video className="w-10 h-10 text-rose-400 mx-auto mb-1.5 opacity-80" />
                          <p className="text-xs text-slate-300 font-medium">External Video Announcement</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
              {(() => {
                const v = getVideoDetails(preview);
                if (!v.url) return null;
                return (
                  <a
                    href={v.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20 transition-all cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-white" /> Watch Video
                    <ExternalLink className="w-3.5 h-3.5 text-rose-200" />
                  </a>
                );
              })()}
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Close / Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-100" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 shrink-0 bg-white">
              <div>
                <h2 className="text-xl font-semibold text-slate-800">New Announcement</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Publish an official {user?.org_type === 'PTA' ? 'school / PTA' : 'congregation'} announcement
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-5 overflow-y-auto flex-1">
                {/* AI Smart Announcement Drafter */}
                <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-blue-800 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      AI Smart Announcement Drafter
                    </span>
                    <select
                      value={aiTone}
                      onChange={e => setAiTone(e.target.value)}
                      className="text-xs px-2.5 py-1.5 rounded-lg border border-blue-200 bg-white text-slate-700 font-medium focus:outline-none"
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
                      placeholder={user?.org_type === 'PTA' ? 'Brief notes, e.g. PTA General Meeting Friday at 14:00 in Main Hall...' : 'Brief notes, e.g. Choir rehearsal Saturday at 14:00 in Main Sanctuary...'}
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

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Title</label>
                  <input
                    required
                    type="text"
                    placeholder={user?.org_type === 'PTA' ? 'e.g. Term 3 PTA General Meeting Notice' : 'e.g. Sunday Service & Fellowship Notice'}
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-400"
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Type</label>
                    <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-400 bg-white">
                      <option value="text">Text Announcement</option>
                      <option value="video">Video Announcement</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Audience</label>
                    <select value={formData.audience} onChange={e => setFormData({...formData, audience: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-400 bg-white">
                      {user?.role === 'admin' && <option value="all">Everyone {user?.org_type === 'PTA' ? '(Students & PTA)' : '(Entire Congregation)'}</option>}
                      <option value="members">{user?.org_type === 'PTA' ? 'Parents & Students Only' : 'Church Members Only'}</option>
                      {user?.role !== 'group_leader' && <option value="leaders">{user?.org_type === 'PTA' ? 'All Teachers / Officials' : 'All Leaders'}</option>}
                      {user?.role === 'admin' || user?.role === 'section_admin' ? <option value="section_admins">{user?.org_type === 'PTA' ? 'Class Teachers Only' : 'Section Leaders Only'}</option> : null}
                      {user?.role === 'admin' || user?.role === 'zone_admin' ? <option value="zone_admins">{user?.org_type === 'PTA' ? 'Grade Heads Only' : 'Zone Leaders Only'}</option> : null}
                      {user?.role === 'admin' && user?.org_type === 'PTA' && <option value="pta">PTA Officials Only</option>}
                    </select>
                  </div>
                </div>

                {(user?.role === 'admin' || user?.role === 'superadmin') && (formData.audience === 'all' || formData.audience === 'members' || formData.audience === 'section_admins' || formData.audience === 'zone_admins') ? (
                  <div className="space-y-3 pt-3 border-t border-slate-200">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                          Target {user?.org_type === 'PTA' ? 'Classes' : 'Sections'} (Optional)
                        </label>
                        <div className="p-2.5 border border-slate-200 rounded-lg bg-slate-50/70 max-h-32 overflow-y-auto space-y-1.5">
                          {sections.length > 0 ? sections.map(s => (
                            <label key={s.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:text-slate-900">
                              <input type="checkbox" checked={formData.target_sections.includes(s.id)} onChange={(e) => {
                                if (e.target.checked) setFormData({...formData, target_sections: [...formData.target_sections, s.id]});
                                else setFormData({...formData, target_sections: formData.target_sections.filter(id => id !== s.id)});
                              }} className="rounded text-sky-600 focus:ring-sky-500" />
                              <span className="truncate">{s.name}</span>
                            </label>
                          )) : (
                            <p className="text-xs text-slate-400 italic py-1">
                              No {user?.org_type === 'PTA' ? 'classes' : 'sections'} created yet
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                          Target {user?.org_type === 'PTA' ? 'Grades' : 'Zones'} (Optional)
                        </label>
                        <div className="p-2.5 border border-slate-200 rounded-lg bg-slate-50/70 max-h-32 overflow-y-auto space-y-1.5">
                          {zones.length > 0 ? zones.map(z => (
                            <label key={z.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:text-slate-900">
                              <input type="checkbox" checked={formData.target_zones.includes(z.id)} onChange={(e) => {
                                if (e.target.checked) setFormData({...formData, target_zones: [...formData.target_zones, z.id]});
                                else setFormData({...formData, target_zones: formData.target_zones.filter(id => id !== z.id)});
                              }} className="rounded text-sky-600 focus:ring-sky-500" />
                              <span className="truncate">{z.name}</span>
                            </label>
                          )) : (
                            <p className="text-xs text-slate-400 italic py-1">
                              No {user?.org_type === 'PTA' ? 'grades' : 'zones'} created yet
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                          Target {user?.org_type === 'PTA' ? 'Committees' : 'Ministries'} (Optional)
                        </label>
                        <div className="p-2.5 border border-slate-200 rounded-lg bg-slate-50/70 max-h-32 overflow-y-auto space-y-1.5">
                          {ministries.length > 0 ? ministries.map(m => (
                            <label key={m.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:text-slate-900">
                              <input type="checkbox" checked={formData.target_ministries.includes(m.id)} onChange={(e) => {
                                if (e.target.checked) setFormData({...formData, target_ministries: [...formData.target_ministries, m.id]});
                                else setFormData({...formData, target_ministries: formData.target_ministries.filter(id => id !== m.id)});
                              }} className="rounded text-sky-600 focus:ring-sky-500" />
                              <span className="truncate">{m.name}</span>
                            </label>
                          )) : (
                            <p className="text-xs text-slate-400 italic py-1">
                              No {user?.org_type === 'PTA' ? 'committees' : 'ministries'} created yet
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {formData.type === 'video' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Video URL (e.g. YouTube link)</label>
                    <input type="url" value={formData.video_url} onChange={e => setFormData({...formData, video_url: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-400" />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Announcement Content</label>
                  <textarea
                    required
                    rows="5"
                    placeholder="Write your announcement message here, or use the AI Smart Drafter above..."
                    value={formData.content}
                    onChange={e => setFormData({...formData, content: e.target.value})}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-400 leading-relaxed"
                  />
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-white border border-slate-200 rounded-lg transition-colors">Cancel</button>
                <button type="submit" disabled={loading} className="btn-primary py-2 px-6 disabled:opacity-70">{loading ? 'Publishing...' : 'Publish Announcement'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
