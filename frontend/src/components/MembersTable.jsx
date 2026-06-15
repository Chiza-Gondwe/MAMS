// components/MembersTable.jsx
import { useState, useEffect } from 'react';
import { api } from '../api';
import { formatDate } from '../utils';
import { Eye, Edit2, Trash2, Search, Filter, Plus, X, Loader, Check, UserPlus, Mail, Phone, Calendar, Users, Building } from 'lucide-react';

export default function MembersTable() {
  const [members, setMembers] = useState([]);
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [emailSearch, setEmailSearch] = useState('');
  const [searchedUser, setSearchedUser] = useState(null);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role: 'member',
    status: 'active',
    branch_id: '',
    address: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    loadMembers();
    loadBranches();
  }, []);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const data = await api.getMembers();
      setMembers(data.results || []);
    } catch (error) {
      console.error('Failed to load members:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBranches = async () => {
    try {
      // Fetch branches from API - adjust endpoint as needed
      const data = await api.getBranches();
      setBranches(data.results || []);
    } catch (error) {
      console.error('Failed to load branches:', error);
      // Fallback to empty array
      setBranches([]);
    }
  };

  const searchUserByEmail = async () => {
    if (!emailSearch) {
      setFormError('Please enter an email address');
      return;
    }
    
    setUserSearchLoading(true);
    setFormError('');
    setSearchedUser(null);
    
    try {
      const user = await api.searchUserByEmail(emailSearch);
      if (user) {
        setSearchedUser(user);
        setFormData(prev => ({
          ...prev,
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          email: user.email,
          phone: user.phone || ''
        }));
      } else {
        setFormError('No user found with this email');
      }
    } catch (error) {
      setFormError(error.message || 'Failed to search user');
    } finally {
      setUserSearchLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!formData.first_name || !formData.last_name || !formData.email) {
      setFormError('Please fill in all required fields');
      return;
    }
    
    setFormLoading(true);
    setFormError('');
    
    try {
      const memberData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        status: formData.status,
        branch_id: formData.branch_id || null,
        address: formData.address
      };
      
      await api.createMember(memberData);
      await loadMembers();
      resetForm();
      setShowAddModal(false);
    } catch (error) {
      setFormError(error.message || 'Failed to add member');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditMember = async () => {
    if (!selectedMember) return;
    
    setFormLoading(true);
    setFormError('');
    
    try {
      const updateData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        role: formData.role,
        status: formData.status,
        branch_id: formData.branch_id || null,
        address: formData.address
      };
      
      await api.updateMember(selectedMember.id, updateData);
      await loadMembers();
      resetForm();
      setShowEditModal(false);
      setSelectedMember(null);
    } catch (error) {
      setFormError(error.message || 'Failed to update member');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteMember = async () => {
    if (!selectedMember) return;
    
    setFormLoading(true);
    
    try {
      await api.deleteMember(selectedMember.id);
      await loadMembers();
      setShowDeleteModal(false);
      setSelectedMember(null);
    } catch (error) {
      setFormError(error.message || 'Failed to delete member');
      setFormLoading(false);
    }
  };

  const openEditModal = (member) => {
    setSelectedMember(member);
    setFormData({
      first_name: member.first_name,
      last_name: member.last_name,
      email: member.email,
      phone: member.phone || '',
      role: member.role || 'member',
      status: member.status || 'active',
      branch_id: member.branch_id || '',
      address: member.address || ''
    });
    setFormError('');
    setShowEditModal(true);
  };

  const openDeleteModal = (member) => {
    setSelectedMember(member);
    setShowDeleteModal(true);
  };

  const openViewModal = (member) => {
    setSelectedMember(member);
    setShowViewModal(true);
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      role: 'member',
      status: 'active',
      branch_id: '',
      address: ''
    });
    setEmailSearch('');
    setSearchedUser(null);
    setFormError('');
  };

  const filtered = members.filter(m => {
    const matchesSearch = `${m.first_name} ${m.last_name} ${m.email || ''}`.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || m.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-medium text-slate-700">Members</h2>
          <p className="text-xs text-slate-400 mt-0.5">Manage church and PTA members</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-md w-48 focus:outline-none focus:border-sky-300"
            />
          </div>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="select-filter text-sm">
            <option value="all">All roles</option>
            <option value="admin">Admin</option>
            <option value="member">Member</option>
            <option value="leader">Leader</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="select-filter text-sm">
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button 
            onClick={() => { resetForm(); setShowAddModal(true); }} 
            className="bg-sky-800 hover:bg-sky-900 text-white px-3 py-1.5 rounded-md text-sm flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Member
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex items-center justify-center">
          <Loader className="w-5 h-5 text-slate-400 animate-spin" />
          <span className="ml-2 text-sm text-slate-500">Loading members...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-sm">
          No members found. Click "Add Member" to get started.
        </div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Name</th>
              <th className="text-left py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Email</th>
              <th className="text-left py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Role</th>
              <th className="text-left py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
              <th className="text-left py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Joined</th>
              <th className="text-right py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((member) => (
              <tr key={member.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="py-3 text-sm">
                  <span className="font-medium text-slate-700">{member.first_name} {member.last_name}</span>
                  <span className="text-slate-400 text-xs ml-2">#{member.id}</span>
                 </td>
                <td className="py-3 text-sm text-slate-500">{member.email || '—'}</td>
                <td className="py-3 text-sm capitalize text-slate-600">{member.role || 'member'}</td>
                <td className="py-3">
                  <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${
                    member.status === 'active' 
                      ? 'bg-green-50 text-green-700' 
                      : 'bg-red-50 text-red-600'
                  }`}>
                    {member.status || 'active'}
                  </span>
                 </td>
                <td className="py-3 text-sm text-slate-500">{formatDate(member.joined_date)}</td>
                <td className="py-3 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => openViewModal(member)} 
                      className="p-1.5 text-slate-400 hover:text-sky-600 transition-colors rounded-md hover:bg-slate-100"
                      title="View details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => openEditModal(member)} 
                      className="p-1.5 text-slate-400 hover:text-sky-600 transition-colors rounded-md hover:bg-slate-100"
                      title="Edit member"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => openDeleteModal(member)} 
                      className="p-1.5 text-slate-400 hover:text-red-600 transition-colors rounded-md hover:bg-slate-100"
                      title="Delete member"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                 </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-lg p-5 w-[500px] max-h-[85vh] overflow-y-auto border border-slate-200 shadow-sm" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-slate-800 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-sky-700" />
                Add New Member
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search by email section */}
            <div className="mb-5 p-3 bg-slate-50 rounded-md border border-slate-100">
              <label className="block text-xs font-medium text-slate-600 mb-2">Find existing user</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Enter email address..."
                  value={emailSearch}
                  onChange={(e) => setEmailSearch(e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-300"
                />
                <button 
                  onClick={searchUserByEmail} 
                  disabled={userSearchLoading}
                  className="px-3 py-1.5 border border-slate-200 rounded-md text-sm text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-1"
                >
                  {userSearchLoading ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  Search
                </button>
              </div>
              {searchedUser && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md text-xs text-green-700 flex items-center justify-between">
                  <span>✓ Found: {searchedUser.first_name} {searchedUser.last_name}</span>
                  <Check className="w-3.5 h-3.5" />
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">First name *</label>
                  <input 
                    type="text" 
                    value={formData.first_name} 
                    onChange={e => setFormData({...formData, first_name: e.target.value})} 
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-300"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Last name *</label>
                  <input 
                    type="text" 
                    value={formData.last_name} 
                    onChange={e => setFormData({...formData, last_name: e.target.value})} 
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-300"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Email *</label>
                <input 
                  type="email" 
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-300"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Phone (Zambian format)</label>
                <input 
                  type="text" 
                  value={formData.phone} 
                  onChange={e => setFormData({...formData, phone: e.target.value})} 
                  placeholder="09XXXXXXXX or +260XXXXXXXX"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-300"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Branch</label>
                <select 
                  value={formData.branch_id} 
                  onChange={e => setFormData({...formData, branch_id: e.target.value})} 
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-300"
                >
                  <option value="">-- Select branch --</option>
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Address</label>
                <textarea 
                  value={formData.address} 
                  onChange={e => setFormData({...formData, address: e.target.value})} 
                  rows="2"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-300"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Role</label>
                  <select 
                    value={formData.role} 
                    onChange={e => setFormData({...formData, role: e.target.value})} 
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-300"
                  >
                    <option value="member">Member</option>
                    <option value="leader">Leader</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Status</label>
                  <select 
                    value={formData.status} 
                    onChange={e => setFormData({...formData, status: e.target.value})} 
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-300"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              
              {formError && (
                <div className="p-2 bg-red-50 border border-red-200 rounded-md text-xs text-red-600 flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {formError}
                </div>
              )}
              
              <div className="flex gap-2 pt-2">
                <button onClick={handleAddMember} className="btn-primary flex-1 text-sm py-2" disabled={formLoading}>
                  {formLoading ? <Loader className="w-3.5 h-3.5 animate-spin mx-auto" /> : 'Add Member'}
                </button>
                <button onClick={() => setShowAddModal(false)} className="btn-secondary flex-1 text-sm py-2">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {showEditModal && selectedMember && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-lg p-5 w-[500px] max-h-[85vh] overflow-y-auto border border-slate-200 shadow-sm" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-slate-800 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-sky-700" />
                Edit Member
              </h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">First name *</label>
                  <input 
                    type="text" 
                    value={formData.first_name} 
                    onChange={e => setFormData({...formData, first_name: e.target.value})} 
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-300"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Last name *</label>
                  <input 
                    type="text" 
                    value={formData.last_name} 
                    onChange={e => setFormData({...formData, last_name: e.target.value})} 
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-300"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Email</label>
                <input 
                  type="email" 
                  value={formData.email} 
                  disabled
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-sm bg-slate-50 text-slate-500"
                />
                <p className="text-xs text-slate-400 mt-0.5">Email cannot be changed</p>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Phone</label>
                <input 
                  type="text" 
                  value={formData.phone} 
                  onChange={e => setFormData({...formData, phone: e.target.value})} 
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-300"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Branch</label>
                <select 
                  value={formData.branch_id} 
                  onChange={e => setFormData({...formData, branch_id: e.target.value})} 
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-300"
                >
                  <option value="">-- Select branch --</option>
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Address</label>
                <textarea 
                  value={formData.address} 
                  onChange={e => setFormData({...formData, address: e.target.value})} 
                  rows="2"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-300"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Role</label>
                  <select 
                    value={formData.role} 
                    onChange={e => setFormData({...formData, role: e.target.value})} 
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-300"
                  >
                    <option value="member">Member</option>
                    <option value="leader">Leader</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Status</label>
                  <select 
                    value={formData.status} 
                    onChange={e => setFormData({...formData, status: e.target.value})} 
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-300"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              
              {formError && (
                <div className="p-2 bg-red-50 border border-red-200 rounded-md text-xs text-red-600">
                  {formError}
                </div>
              )}
              
              <div className="flex gap-2 pt-2">
                <button onClick={handleEditMember} className="btn-primary flex-1 text-sm py-2" disabled={formLoading}>
                  {formLoading ? <Loader className="w-3.5 h-3.5 animate-spin mx-auto" /> : 'Save Changes'}
                </button>
                <button onClick={() => setShowEditModal(false)} className="btn-secondary flex-1 text-sm py-2">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedMember && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50" onClick={() => setShowDeleteModal(false)}>
          <div className="bg-white rounded-lg p-5 w-96 border border-slate-200 shadow-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-medium text-slate-800">Delete Member</h3>
                <p className="text-xs text-slate-500">This action cannot be undone</p>
              </div>
            </div>
            
            <p className="text-sm text-slate-600 mb-4">
              Are you sure you want to delete <span className="font-medium">{selectedMember.first_name} {selectedMember.last_name}</span>?
              All attendance records and contributions will also be removed.
            </p>
            
            {formError && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-md text-xs text-red-600">
                {formError}
              </div>
            )}
            
            <div className="flex gap-2">
              <button onClick={handleDeleteMember} className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm transition-colors" disabled={formLoading}>
                {formLoading ? <Loader className="w-3.5 h-3.5 animate-spin mx-auto" /> : 'Delete'}
              </button>
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-3 py-2 border border-slate-200 rounded-md text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Member Modal */}
      {showViewModal && selectedMember && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50" onClick={() => setShowViewModal(false)}>
          <div className="bg-white rounded-lg p-5 w-[450px] border border-slate-200 shadow-sm" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-slate-800 flex items-center gap-2">
                <Users className="w-4 h-4 text-sky-700" />
                Member Details
              </h3>
              <button onClick={() => setShowViewModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="pb-3 border-b border-slate-100">
                <p className="text-xs text-slate-400">Full name</p>
                <p className="text-sm font-medium text-slate-800">{selectedMember.first_name} {selectedMember.last_name}</p>
              </div>
              
              <div className="pb-3 border-b border-slate-100">
                <p className="text-xs text-slate-400">Email</p>
                <p className="text-sm text-slate-600">{selectedMember.email || '—'}</p>
              </div>
              
              <div className="pb-3 border-b border-slate-100">
                <p className="text-xs text-slate-400">Phone</p>
                <p className="text-sm text-slate-600">{selectedMember.phone || '—'}</p>
              </div>
              
              <div className="pb-3 border-b border-slate-100">
                <p className="text-xs text-slate-400">Role</p>
                <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-700 capitalize">
                  {selectedMember.role || 'member'}
                </span>
              </div>
              
              <div className="pb-3 border-b border-slate-100">
                <p className="text-xs text-slate-400">Status</p>
                <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${
                  selectedMember.status === 'active' 
                    ? 'bg-green-50 text-green-700' 
                    : 'bg-red-50 text-red-600'
                }`}>
                  {selectedMember.status || 'active'}
                </span>
              </div>
              
              <div className="pb-3 border-b border-slate-100">
                <p className="text-xs text-slate-400">Branch</p>
                <p className="text-sm text-slate-600">{selectedMember.branch_name || 'Not assigned'}</p>
              </div>
              
              <div className="pb-3 border-b border-slate-100">
                <p className="text-xs text-slate-400">Address</p>
                <p className="text-sm text-slate-600">{selectedMember.address || '—'}</p>
              </div>
              
              <div>
                <p className="text-xs text-slate-400">Joined date</p>
                <p className="text-sm text-slate-600">{formatDate(selectedMember.joined_date)}</p>
              </div>
            </div>
            
            <div className="flex gap-2 mt-5 pt-3 border-t border-slate-100">
              <button onClick={() => { setShowViewModal(false); openEditModal(selectedMember); }} className="flex-1 btn-primary text-sm py-2">
                Edit Member
              </button>
              <button onClick={() => setShowViewModal(false)} className="flex-1 btn-secondary text-sm py-2">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}