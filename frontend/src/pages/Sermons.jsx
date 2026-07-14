import { useState, useEffect } from 'react';
import { api } from '../api';
import { Plus, Video, Calendar, User, Trash2 } from 'lucide-react';
import axios from 'axios';
import { formatDate } from '../utils';
import { useAuth } from '../context/AuthContext';

export default function Sermons() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'pta';
  const [sermons, setSermons] = useState([]);
  const [formData, setFormData] = useState({ title: '', speaker: '', date_preached: '', description: '', video_url: '' });
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSermons();
  }, []);

  const fetchSermons = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/sermons/', {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
      });
      setSermons(response.data.results || response.data || []);
    } catch (err) {
      console.error('Failed to fetch sermons', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this sermon?")) return;
    try {
      await axios.delete(`http://127.0.0.1:8000/api/sermons/${id}/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
      });
      fetchSermons();
    } catch (err) {
      alert("Failed to delete sermon");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('http://127.0.0.1:8000/api/sermons/', formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
      });
      setShowModal(false);
      setFormData({ title: '', speaker: '', date_preached: '', description: '', video_url: '' });
      fetchSermons();
    } catch (err) {
      if (err.response && err.response.data) {
        const errorMsg = Object.entries(err.response.data)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
          .join('\n');
        alert(`Failed to save sermon:\n${errorMsg}`);
      } else {
        alert('Failed to save sermon. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Sermons & Media</h2>
          <p className="text-sm text-slate-500 mt-1">Listen to and watch past sermons</p>
        </div>
        <div className="flex gap-3 items-center">
          {isAdmin && (
            <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-1.5 py-2">
              <Plus className="w-4 h-4" /> Upload Sermon
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sermons.length === 0 ? (
          <div className="col-span-full py-12 text-center text-sm text-slate-400 bg-white rounded-xl border border-slate-200 shadow-sm">
            No sermons uploaded yet.
          </div>
        ) : sermons.map(sermon => (
          <div key={sermon.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col relative group">
            {isAdmin && (
              <button onClick={() => handleDelete(sermon.id)} className="absolute top-4 right-4 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <div className="p-5 flex-1">
              <h3 className="font-semibold text-slate-800 mb-3 line-clamp-1 text-lg pr-8">{sermon.title}</h3>
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                <User className="w-4 h-4" />
                <span>{sermon.speaker}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
                <Calendar className="w-4 h-4" />
                <span>{sermon.date_preached}</span>
              </div>
              {sermon.description && (
                <p className="text-sm text-slate-600 line-clamp-3 mt-3">{sermon.description}</p>
              )}
            </div>
            {sermon.video_url && (
              <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50">
                <a href={sermon.video_url} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 w-full py-2 bg-sky-100 hover:bg-sky-200 text-sky-700 rounded-lg transition-colors text-sm font-semibold">
                  <Video className="w-4 h-4" /> Watch Video
                </a>
              </div>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-semibold text-slate-800">Upload Sermon</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-400" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Speaker</label>
                  <input required type="text" value={formData.speaker} onChange={e => setFormData({...formData, speaker: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date Preached</label>
                  <input required type="date" value={formData.date_preached} onChange={e => setFormData({...formData, date_preached: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-400" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Video URL (e.g. YouTube link)</label>
                <input type="url" value={formData.video_url} onChange={e => setFormData({...formData, video_url: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-400" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea rows="3" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-400"></textarea>
              </div>

              <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-lg">Cancel</button>
                <button type="submit" disabled={loading} className="btn-primary py-2 px-5 disabled:opacity-70">{loading ? 'Saving...' : 'Save Sermon'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
