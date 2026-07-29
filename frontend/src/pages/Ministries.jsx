import { useState, useEffect } from 'react';
import { api } from '../api';
import { Plus, Trash2, Edit2, Loader2, X } from 'lucide-react';

export default function Ministries() {
  const [ministries, setMinistries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchMinistries = async () => {
    try {
      const data = await api.getMinistries();
      setMinistries(data.results || data || []);
      setError(null);
    } catch {
      setError('Failed to load groups/ministries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMinistries();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        await api.updateMinistry(editingId, formData);
      } else {
        await api.createMinistry(formData);
      }
      setShowModal(false);
      setFormData({ name: '', description: '' });
      setEditingId(null);
      fetchMinistries();
    } catch {
      alert('Failed to save ministry. Ensure the name is unique.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this group? Members in this group will not be deleted, but they will be removed from this group.')) {
      try {
        await api.deleteMinistry(id);
        fetchMinistries();
      } catch {
        alert('Failed to delete');
      }
    }
  };

  const openEditModal = (ministry) => {
    setFormData({ name: ministry.name, description: ministry.description || '' });
    setEditingId(ministry.id);
    setShowModal(true);
  };

  const openCreateModal = () => {
    setFormData({ name: '', description: '' });
    setEditingId(null);
    setShowModal(true);
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-sky-500" /></div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Ministries & Groups</h1>
          <p className="text-slate-500 text-sm mt-1">Manage the different groups your members can join.</p>
        </div>
        <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Group
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm">
              <th className="px-6 py-4 font-medium">Group Name</th>
              <th className="px-6 py-4 font-medium">Description</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ministries.length === 0 ? (
              <tr>
                <td colSpan="3" className="px-6 py-8 text-center text-slate-500">
                  No groups created yet. Click "Add Group" to create one.
                </td>
              </tr>
            ) : (
              ministries.map(ministry => (
                <tr key={ministry.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-800">{ministry.name}</td>
                  <td className="px-6 py-4 text-slate-500 text-sm">{ministry.description || '-'}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openEditModal(ministry)} className="text-slate-400 hover:text-sky-600 p-2 transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(ministry.id)} className="text-slate-400 hover:text-red-600 p-2 transition-colors ml-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-800">{editingId ? 'Edit Group' : 'Create New Group'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Group Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. Singing - Youth Choir"
                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description (Optional)</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Brief description of this group..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-500 min-h-[100px]"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors disabled:opacity-70 flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingId ? 'Save Changes' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
