// components/AnnouncementsPanel.jsx
import { useState, useEffect } from 'react';
import { api } from '../api';
import { formatDate } from '../utils';
import { FileText, Video, Eye, Trash2, Plus } from 'lucide-react';

export default function AnnouncementsPanel() {
  const [announcements, setAnnouncements] = useState([]);
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    api.getAnnouncements(search).then(data => setAnnouncements(data.results || []));
  }, [search]);

  return (
    <div className="py-6 border-t border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-medium text-slate-700">Announcements</h2>
        <button onClick={() => setShowCreate(true)} className="text-sm text-sky-700 hover:text-sky-800 flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> New announcement
        </button>
      </div>

      <div className="space-y-0.5">
        {announcements.map(ann => (
          <div key={ann.id} className="flex items-center justify-between py-3 px-2 hover:bg-slate-50/50 rounded-md transition-colors cursor-pointer" onClick={() => setPreview(ann)}>
            <div className="flex items-center gap-3">
              {ann.announcement_type === 'video' ? <Video className="w-4 h-4 text-sky-700" /> : <FileText className="w-4 h-4 text-slate-400" />}
              <div>
                <p className="text-sm font-medium text-slate-700">{ann.title}</p>
                <p className="text-xs text-slate-400">{ann.announcement_type} • {ann.audience || 'all'} • {formatDate(ann.created_at)}</p>
              </div>
            </div>
            <button className="p-1 text-slate-400 hover:text-red-600" onClick={(e) => { e.stopPropagation(); api.deleteAnnouncement(ann.id).then(() => api.getAnnouncements().then(d => setAnnouncements(d.results || []))); }}>
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
    </div>
  );
}