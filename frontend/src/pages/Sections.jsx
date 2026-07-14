import { useState, useEffect } from 'react';
import { api } from '../api';
import { Plus, Trash2, Edit2, Loader2 } from 'lucide-react';

export default function Sections() {
  const [sections, setSections] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', zone: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchSections = async () => {
    try {
      const [sectionsData, zonesData] = await Promise.all([
        api.getSections(),
        api.getZones()
      ]);
      setSections(sectionsData.results || sectionsData || []);
      setZones(zonesData.results || zonesData || []);
      setError(null);
    } catch {
      setError('Failed to load groups/sections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSections();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        await api.updateSection(editingId, formData);
      } else {
        await api.createSection(formData);
      }
      setShowModal(false);
      setFormData({ name: '', description: '', zone: '' });
      setEditingId(null);
      fetchSections();
    } catch (err) {
      alert(`Failed to save section. Error: ${err.message || JSON.stringify(err)}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this group? Members in this group will not be deleted, but they will be removed from this group.')) {
      try {
        await api.deleteSection(id);
        fetchSections();
      } catch {
        alert('Failed to delete');
      }
    }
  };

  const openEditModal = (section) => {
    setFormData({ name: section.name || '', zone: section.zone || '' });
    setEditingId(section.id);
    setShowModal(true);
  };

  const openCreateModal = () => {
    setFormData({ name: '', zone: '' });
    setEditingId(null);
    setShowModal(true);
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-sky-500" /></div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Sections & Groups</h1>
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
              <th className="px-6 py-4 font-medium">Zone</th>
              <th className="px-6 py-4 font-medium">Members</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sections.length === 0 ? (
              <tr>
                <td colSpan="3" className="px-6 py-8 text-center text-slate-500">
                  No groups created yet. Click "Add Group" to create one.
                </td>
              </tr>
            ) : (
              sections.map(section => (
                <tr key={section.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-slate-800">{section.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {section.zone_details?.name ? (
                      <span className="bg-indigo-50 text-indigo-700 py-1 px-2.5 rounded-full text-xs font-medium">
                        {section.zone_details.name}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs italic">Unassigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    <span className="bg-slate-100 text-slate-600 py-1 px-2.5 rounded-full text-xs font-medium">
                      {section.member_count || 0} members
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openEditModal(section)} className="text-slate-400 hover:text-sky-600 p-2 transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(section.id)} className="text-slate-400 hover:text-red-600 p-2 transition-colors ml-1">
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
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <h2 className="text-xl font-bold text-slate-800 mb-4">{editingId ? 'Edit Group' : 'Create New Group'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Group Name</label>
                  <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white/50 focus:outline-none focus:border-indigo-500"
                  placeholder="e.g. Section 1"
                />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Parent Zone (Optional)</label>
                  <select
                    value={formData.zone}
                    onChange={(e) => setFormData({...formData, zone: e.target.value || null})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white/50 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Unassigned --</option>
                    {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                  </select>
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
