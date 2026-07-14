import { useState, useEffect } from 'react';
import { Plus, CheckCircle, Clock, Trash2 } from 'lucide-react';
import axios from 'axios';
import { formatDate } from '../utils';
import { useAuth } from '../context/AuthContext';

export default function PrayerWall() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'pta';
  const [requests, setRequests] = useState([]);
  const [formData, setFormData] = useState({ request_text: '', is_private: false, is_anonymous: false });
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/prayer-requests/', {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
      });
      setRequests(response.data.results || response.data || []);
    } catch (err) {
      console.error('Failed to fetch prayer requests', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this prayer request?")) return;
    try {
      await axios.delete(`http://127.0.0.1:8000/api/prayer-requests/${id}/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
      });
      fetchRequests();
    } catch (err) {
      alert("Failed to delete prayer request");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('http://127.0.0.1:8000/api/prayer-requests/', formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
      });
      setShowModal(false);
      setFormData({ request_text: '', is_private: false, is_anonymous: false });
      fetchRequests();
    } catch (err) {
      if (err.response && err.response.data) {
        const errorMsg = Object.entries(err.response.data)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
          .join('\n');
        alert(`Failed to submit prayer request:\n${errorMsg}`);
      } else {
        alert('Failed to submit prayer request. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await axios.patch(`http://127.0.0.1:8000/api/prayer-requests/${id}/`, { status }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
      });
      fetchRequests();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  return (
    <div className="py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Prayer Wall</h2>
          <p className="text-sm text-slate-500 mt-1">Submit a request and pray for others</p>
        </div>
        <div className="flex gap-3 items-center">
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-1.5 py-2">
            <Plus className="w-4 h-4" /> Submit Request
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {requests.length === 0 ? (
          <div className="col-span-full py-12 text-center text-sm text-slate-400 bg-white rounded-xl border border-slate-200 shadow-sm">
            No prayer requests at the moment.
          </div>
        ) : requests.map(req => (
          <div key={req.id} className={`bg-white rounded-xl shadow-sm border-l-4 overflow-hidden flex flex-col ${
            req.status === 'answered' ? 'border-l-emerald-500' :
            req.status === 'praying' ? 'border-l-amber-500' : 'border-l-slate-300'
          } border-y border-r border-slate-200`}>
            <div className="p-5 flex-1">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-slate-800">{req.member_name}</h3>
                
                {req.status === 'pending' && <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full flex items-center gap-1"><Clock className="w-3 h-3"/> Pending</span>}
                {req.status === 'praying' && <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">Currently Praying</span>}
                {req.status === 'answered' && <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Answered!</span>}
              </div>
              
              <p className="text-sm text-slate-600 italic leading-relaxed mt-2">"{req.request_text}"</p>
              
              {req.is_private && (
                <div className="mt-3">
                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded uppercase tracking-wider">Private</span>
                </div>
              )}
            </div>
            
            {isAdmin && (
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Update Status:</span>
                  <select 
                    value={req.status} 
                    onChange={(e) => handleUpdateStatus(req.id, e.target.value)}
                    className="text-xs py-1.5 px-2 border border-slate-300 rounded focus:outline-none focus:border-sky-500 bg-white"
                  >
                    <option value="pending">Pending</option>
                    <option value="praying">Currently Praying</option>
                    <option value="answered">Answered!</option>
                  </select>
                </div>
                <button onClick={() => handleDelete(req.id)} className="text-xs flex items-center gap-1.5 text-slate-500 hover:text-red-600 transition-colors font-medium bg-white px-2.5 py-1.5 border border-slate-200 rounded-md hover:border-red-200 hover:bg-red-50">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-semibold text-slate-800">Submit Prayer Request</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">What would you like us to pray for?</label>
                <textarea 
                  value={formData.request_text} 
                  onChange={e => setFormData({...formData, request_text: e.target.value})} 
                  required 
                  rows="4"
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-400"
                />
              </div>
              
              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.is_anonymous} 
                    onChange={e => setFormData({...formData, is_anonymous: e.target.checked})} 
                    className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 w-4 h-4"
                  />
                  <span className="text-sm text-slate-700">Hide my name from others (Anonymous)</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.is_private} 
                    onChange={e => setFormData({...formData, is_private: e.target.checked})} 
                    className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 w-4 h-4"
                  />
                  <span className="text-sm text-slate-700">Keep private (only leaders will see)</span>
                </label>
              </div>
              
              <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-lg">Cancel</button>
                <button type="submit" disabled={loading} className="btn-primary py-2 px-5 disabled:opacity-70">{loading ? 'Submitting...' : 'Submit Request'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
