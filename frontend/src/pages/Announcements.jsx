import { useState, useEffect } from 'react';
import { api } from '../api';
import { formatDate } from '../utils';
import { Trash2, Plus, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [sections, setSections] = useState([]);
  const [zones, setZones] = useState([]);
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
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
      
      await api.createAnnouncement(payload, 1);
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
          <p className="text-sm text-slate-500 mt-1">Manage and publish church communications</p>
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
        ) : filtered.map(ann => (
          <div key={ann.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer flex flex-col" onClick={() => setPreview(ann)}>
            <div className="p-5 flex-1">
              <div className="flex justify-between items-start mb-3">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  ann.announcement_type === 'video' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {ann.announcement_type === 'video' ? 'Video' : 'Text'}
                </span>
                <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full capitalize">
                  {ann.audience || 'All'}
                </span>
              </div>
              <h3 className="font-semibold text-slate-800 mb-2 line-clamp-1">{ann.title}</h3>
              <p className="text-sm text-slate-500 line-clamp-2">{ann.content}</p>
            </div>
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
              <span className="text-xs text-slate-400">{formatDate(ann.created_at)}</span>
              <button className="text-slate-400 hover:text-red-600 p-1.5 rounded-md hover:bg-slate-200 transition-colors" onClick={(e) => { e.stopPropagation(); api.deleteAnnouncement(ann.id).then(() => fetchData()); }}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Preview Modal */}
      {preview && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setPreview(null)}>
          <div className="bg-white rounded-xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 transform transition-all" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold text-slate-800">{preview.title}</h3>
              <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-md">{formatDate(preview.created_at)}</span>
            </div>
            <div className="mb-4">
              <span className="inline-block text-xs font-medium text-sky-700 bg-sky-50 px-2 py-1 rounded mb-3 capitalize">Audience: {preview.audience || 'All'}</span>
              <p className="text-slate-600 leading-relaxed whitespace-pre-wrap text-sm">{preview.content}</p>
            </div>
            {preview.video_url && (
              <div className="mt-4 rounded-lg overflow-hidden bg-slate-900 aspect-video flex items-center justify-center">
                 <video src={preview.video_url} controls className="w-full h-full object-cover" />
              </div>
            )}
            <div className="mt-6">
              <button onClick={() => setPreview(null)} className="btn-secondary w-full py-2.5">Close Preview</button>
            </div>
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
                    {user?.role === 'admin' && <option value="all">Everyone (Church & PTA)</option>}
                    <option value="members">Church Members Only</option>
                    {user?.role !== 'group_leader' && <option value="leaders">All Leaders</option>}
                    {user?.role === 'admin' || user?.role === 'section_admin' ? <option value="section_admins">Section Leaders Only</option> : null}
                    {user?.role === 'admin' || user?.role === 'zone_admin' ? <option value="zone_admins">Zone Leaders Only</option> : null}
                    {user?.role === 'admin' && <option value="pta">PTA Officials</option>}
                  </select>
                </div>
              </div>

              {(user?.role === 'admin' || user?.role === 'superadmin') && (formData.audience === 'all' || formData.audience === 'members' || formData.audience === 'section_admins' || formData.audience === 'zone_admins') ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Target Specific Sections (Optional)</label>
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 border border-slate-200 rounded-md">
                      {sections.map(s => (
                        <label key={s.id} className="flex items-center gap-2 text-sm text-slate-700">
                          <input type="checkbox" checked={formData.target_sections.includes(s.id)} onChange={(e) => {
                            if (e.target.checked) setFormData({...formData, target_sections: [...formData.target_sections, s.id]});
                            else setFormData({...formData, target_sections: formData.target_sections.filter(id => id !== s.id)});
                          }} className="rounded border-slate-300" /> {s.name}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Target Specific Zones (Optional)</label>
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 border border-slate-200 rounded-md">
                      {zones.map(z => (
                        <label key={z.id} className="flex items-center gap-2 text-sm text-slate-700">
                          <input type="checkbox" checked={formData.target_zones.includes(z.id)} onChange={(e) => {
                            if (e.target.checked) setFormData({...formData, target_zones: [...formData.target_zones, z.id]});
                            else setFormData({...formData, target_zones: formData.target_zones.filter(id => id !== z.id)});
                          }} className="rounded border-slate-300" /> {z.name}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Target Specific Groups/Ministries (Optional)</label>
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 border border-slate-200 rounded-md">
                      {ministries.map(m => (
                        <label key={m.id} className="flex items-center gap-2 text-sm text-slate-700">
                          <input type="checkbox" checked={formData.target_ministries.includes(m.id)} onChange={(e) => {
                            if (e.target.checked) setFormData({...formData, target_ministries: [...formData.target_ministries, m.id]});
                            else setFormData({...formData, target_ministries: formData.target_ministries.filter(id => id !== m.id)});
                          }} className="rounded border-slate-300" /> {m.name}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

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

              <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-lg">Cancel</button>
                <button type="submit" disabled={loading} className="btn-primary py-2 px-5 disabled:opacity-70">{loading ? 'Publishing...' : 'Publish'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
