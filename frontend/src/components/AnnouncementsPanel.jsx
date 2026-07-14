// components/AnnouncementsPanel.jsx
import { useState, useEffect } from 'react';
import { api } from '../api';
import { formatDate } from '../utils';
import { FileText, Video, Trash2, Plus } from 'lucide-react';

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
      await api.createAnnouncement(formData, 1);
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
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50" onClick={() => setPreview(null)}>
          <div className="bg-white rounded-lg p-5 max-w-md w-full border border-slate-200" onClick={e => e.stopPropagation()}>
            <h3 className="font-medium text-slate-800 mb-1">{preview.title}</h3>
            <p className="text-xs text-slate-400 mb-3">{formatDate(preview.created_at)}</p>
            <p className="text-sm text-slate-600 mb-3">{preview.content}</p>
            {preview.video_url && <video src={preview.video_url} controls className="w-full rounded-md" />}
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