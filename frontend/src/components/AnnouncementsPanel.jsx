// components/AnnouncementsPanel.jsx
import { useState, useEffect } from 'react';
import { api } from '../api';
import { formatDate } from '../utils';
import { FileText, Video, Trash2, Plus, Play, ExternalLink } from 'lucide-react';
import { getVideoDetails } from '../pages/Announcements';

export default function AnnouncementsPanel() {
  const [announcements, setAnnouncements] = useState([]);
  const [preview, setPreview] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'text',
    audience: 'all',
    video_url: ''
  });

  const fetchAnnouncements = () => {
    api.getAnnouncements().then(data => setAnnouncements(data.results || []));
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1 is a dummy memberId for now. A real app would get this from auth context.
      await api.createAnnouncement(formData);
      setIsModalOpen(false);
      setFormData({ title: '', content: '', type: 'text', audience: 'all', video_url: '' });
      fetchAnnouncements();
    } catch (err) {
      alert(err.message || 'Failed to create announcement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-6 border-t border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-medium text-slate-700">Announcements</h2>
        <button onClick={() => setIsModalOpen(true)} className="text-sm text-sky-700 hover:text-sky-800 flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> New announcement
        </button>
      </div>

      <div className="space-y-0.5">
        {announcements.length === 0 ? (
          <div className="py-4 text-center text-xs text-slate-400">No announcements yet.</div>
        ) : announcements.map(ann => (
          <div key={ann.id} className="flex items-center justify-between py-3 px-2 hover:bg-slate-50/50 rounded-md transition-colors cursor-pointer" onClick={() => setPreview(ann)}>
            <div className="flex items-center gap-3">
              {ann.announcement_type === 'video' ? <Video className="w-4 h-4 text-sky-700" /> : <FileText className="w-4 h-4 text-slate-400" />}
              <div>
                <p className="text-sm font-medium text-slate-700">{ann.title}</p>
                <p className="text-xs text-slate-400">{ann.announcement_type} • {ann.audience || 'all'} • {formatDate(ann.created_at)}</p>
              </div>
            </div>
            <button className="p-1 text-slate-400 hover:text-red-600" onClick={(e) => { e.stopPropagation(); api.deleteAnnouncement(ann.id).then(() => fetchAnnouncements()); }}>
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Preview Modal */}
      {preview && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50" onClick={() => setPreview(null)}>
          <div className="bg-white rounded-xl p-5 max-w-md w-full max-h-[88vh] overflow-y-auto border border-slate-200 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start gap-2 mb-1">
              <h3 className="font-semibold text-slate-800">{preview.title}</h3>
              <button type="button" onClick={() => setPreview(null)} className="text-slate-400 hover:text-slate-700 text-lg leading-none px-1.5 py-0.5 rounded hover:bg-slate-100">×</button>
            </div>
            <p className="text-xs text-slate-400 mb-3">{formatDate(preview.created_at)}</p>
            <p className="text-sm text-slate-600 mb-3 whitespace-pre-wrap">{preview.content}</p>
            {(() => {
              const v = getVideoDetails(preview);
              if (!v.url) return null;
              return (
                <div className="mt-3 space-y-2">
                  <div className="rounded-lg overflow-hidden bg-slate-900 aspect-video flex items-center justify-center border border-slate-800">
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
                        <Video className="w-8 h-8 text-rose-400 mx-auto mb-1 opacity-80" />
                        <p className="text-xs text-slate-300">External Video Link</p>
                      </div>
                    )}
                  </div>
                  <a
                    href={v.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 w-full py-2 px-3 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-all"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" /> Watch Video
                    <ExternalLink className="w-3 h-3 text-rose-200" />
                  </a>
                </div>
              );
            })()}
            <button onClick={() => setPreview(null)} className="mt-4 btn-secondary w-full">Close</button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-semibold text-slate-800">New Announcement</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-400" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-400">
                    <option value="text">Text</option>
                    <option value="video">Video</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Audience</label>
                  <select value={formData.audience} onChange={e => setFormData({...formData, audience: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-400">
                    <option value="all">All</option>
                    <option value="leaders">Leaders</option>
                    <option value="pta">PTA</option>
                  </select>
                </div>
              </div>

              {formData.type === 'video' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Video URL (e.g. YouTube link)</label>
                  <input type="url" value={formData.video_url} onChange={e => setFormData({...formData, video_url: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-400" />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Content</label>
                <textarea required rows="4" value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-400"></textarea>
              </div>

              <div className="mt-8 flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-lg">Cancel</button>
                <button type="submit" disabled={loading} className="btn-primary disabled:opacity-70">{loading ? 'Publishing...' : 'Publish'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}