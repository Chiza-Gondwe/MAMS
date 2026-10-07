// components/MembersTable.jsx
import { useState, useEffect } from 'react';
import { api } from '../api';
import { formatDate } from '../utils';
import { Eye, Edit2, Trash2, Search, Plus, X, Loader, Check, CheckCircle, UserPlus, Users, AlertCircle, Download, Navigation } from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../context/AuthContext';

export default function MembersTable() {
  const { user, refreshUser } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const isLeader = ['section_admin', 'zone_admin', 'group_leader'].includes(user?.role);
  const canManage = isAdmin || isLeader;

  const [members, setMembers] = useState([]);
  const [sections, setSections] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [ministryFilter, setMinistryFilter] = useState('all');
  const [ministries, setMinistries] = useState([]);
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
    gender: '',
    role: 'member',
    status: 'active',
    section_id: '',
    zone_id: '',
    address: '',
    ministries: [],
    profile_picture: null
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const [attendanceCount, setAttendanceCount] = useState(0);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState([]);

  const exportToExcel = () => {
    const exportData = filtered.map((m, index) => ({
      '#': index + 1,
      'First Name': m.first_name,
      'Last Name': m.last_name,
      Email: m.email || '',
      Phone: m.phone_number || m.phone || '',
      Role: m.role || 'member',
      Status: m.status || 'active',
      'Joined Date': formatDate(m.date_joined)
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Members");
    XLSX.writeFile(workbook, "MAMS_Members_Export.xlsx");
    setShowExportMenu(false);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("MAMS Members Export", 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
    
    const tableColumn = ["#", "Name", "Email", "Phone", "Role", "Status"];
    const tableRows = [];
    
    filtered.forEach((m, index) => {
      tableRows.push([
        index + 1,
        `${m.first_name} ${m.last_name}`,
        m.email || '-',
        m.phone_number || m.phone || '-',
        m.role || 'member',
        m.status || 'active'
      ]);
    });
    
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 35,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [8, 145, 178] }
    });
    
    doc.save("MAMS_Members_Export.pdf");
    setShowExportMenu(false);
  };

  const loadMembers = async () => {
    setLoading(true);
    try {
      const data = await api.getMembers();
      const sortedMembers = (data.results || []).sort((a, b) => 
        (a.last_name || '').localeCompare(b.last_name || '')
      );
      setMembers(sortedMembers);
    } catch (error) {
      console.error('Failed to load members:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOrganizationData = async () => {
    try {
      const [secData, zoneData, minData] = await Promise.all([
        api.getSections(),
        api.getZones(),
        api.getMinistries()
      ]);
      setSections(Array.isArray(secData.results) ? secData.results : Array.isArray(secData) ? secData : []);
      setZones(Array.isArray(zoneData.results) ? zoneData.results : Array.isArray(zoneData) ? zoneData : []);
      setMinistries(Array.isArray(minData.results) ? minData.results : Array.isArray(minData) ? minData : []);
    } catch (err) {
      console.error("Failed to load organization data", err);
      setSections([]);
      setZones([]);
      setMinistries([]);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadMembers();
      loadOrganizationData();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleMinistryToggle = (ministryId) => {
    setFormData(prev => {
      const current = prev.ministries || [];
      if (current.includes(ministryId)) {
        return { ...prev, ministries: current.filter(id => id !== ministryId) };
      } else {
        return { ...prev, ministries: [...current, ministryId] };
      }
    });
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
    if (!formData.first_name || !formData.last_name || !formData.email || !formData.phone) {
      setFormError('Please fill in all required fields (including phone)');
      return;
    }
    
    setFormLoading(true);
    setFormError('');
    
    try {
      let payload;
      if (formData.profile_picture) {
        payload = new FormData();
        payload.append('first_name', formData.first_name);
        payload.append('last_name', formData.last_name);
        payload.append('email', formData.email);
        payload.append('phone_number', formData.phone);
        if (formData.gender) payload.append('gender', formData.gender);
        payload.append('role', formData.role);
        payload.append('status', formData.status);
        if (formData.section_id) payload.append('section', formData.section_id);
        else payload.append('section', '');
        if (formData.zone_id) payload.append('zone', formData.zone_id);
        else payload.append('zone', '');
        payload.append('address', formData.address || '');
        
        formData.ministries.forEach(m => payload.append('ministries', m));
        payload.append('profile_picture', formData.profile_picture);
        
        if (searchedUser) {
          payload.append('user', searchedUser.id);
        }
      } else {
        payload = {
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone_number: formData.phone,
          gender: formData.gender || null,
          role: formData.role,
          status: formData.status,
          ministries: formData.ministries,
          section: formData.section_id || null,
          zone: formData.zone_id || null,
          address: formData.address || '',
        };
        if (searchedUser) payload.user = searchedUser.id;
      }
      
      await api.createMember(payload);
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
      let payload;
      if (formData.profile_picture && formData.profile_picture !== 'DELETE') {
        payload = new FormData();
        payload.append('first_name', formData.first_name);
        payload.append('last_name', formData.last_name);
        payload.append('email', formData.email);
        payload.append('phone_number', formData.phone);
        if (formData.gender) payload.append('gender', formData.gender);
        payload.append('role', formData.role);
        payload.append('status', formData.status);
        if (formData.section_id) payload.append('section', formData.section_id);
        else payload.append('section', '');
        if (formData.zone_id) payload.append('zone', formData.zone_id);
        else payload.append('zone', '');
        payload.append('address', formData.address || '');
        
        formData.ministries.forEach(m => payload.append('ministries', m));
        payload.append('profile_picture', formData.profile_picture);
      } else {
        payload = {
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone_number: formData.phone,
          gender: formData.gender || null,
          role: formData.role,
          status: formData.status,
          ministries: formData.ministries,
          section: formData.section_id || null,
          zone: formData.zone_id || null,
          address: formData.address || '',
        };
        if (formData.profile_picture === 'DELETE') payload.profile_picture = null;
      }
      
      await api.updateMember(selectedMember.id, payload);
      if (selectedMember.id === user.member_id) {
        await refreshUser();
      }
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

  const handleApproveMember = async (member) => {
    try {
      await api.updateMember(member.id, { status: 'active' });
      await loadMembers();
    } catch (error) {
      alert(error.message || 'Failed to approve member');
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedMembers(filtered.map(m => m.id));
    } else {
      setSelectedMembers([]);
    }
  };

  const handleSelectMember = (id) => {
    setSelectedMembers(prev => 
      prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedMembers.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedMembers.length} members?`)) return;
    
    try {
      setFormLoading(true);
      await api.bulkDeleteMembers(selectedMembers);
      setSelectedMembers([]);
      await loadMembers();
    } catch (error) {
      console.error(error);
      alert('Failed to bulk delete members');
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
    } finally {
      setFormLoading(false);
    }
  };

  const openEditModal = (member) => {
    setSelectedMember(member);
    setFormData({
      first_name: member.first_name,
      last_name: member.last_name,
      email: member.email,
      gender: member.gender || '',
      phone: member.phone_number || member.phone || '',
      role: member.role || 'member',
      status: member.status || 'active',
      section_id: member.section || member.section_id || '',
      zone_id: member.zone || member.zone_id || '',
      address: member.address || '',
      ministries: member.ministries || [],
      profile_picture: null
    });
    setFormError('');
    setShowEditModal(true);
  };

  const openDeleteModal = (member) => {
    setSelectedMember(member);
    setShowDeleteModal(true);
  };

  const openViewModal = async (member) => {
    setSelectedMember(member);
    setShowViewModal(true);
    setAttendanceCount(0);
    try {
      // Assuming getAttendanceRecords has search capability or returns all for filtering
      const records = await api.getAttendanceRecords(1, '');
      const count = (records.results || []).filter(r => r.member === member.id).length;
      setAttendanceCount(count);
    } catch (e) {
      console.error(e);
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      gender: '',
      role: 'member',
      status: 'active',
      section_id: '',
      zone_id: '',
      address: '',
      ministries: [],
      profile_picture: null
    });
    setEmailSearch('');
    setSearchedUser(null);
    setFormError('');
  };

  const filtered = members.filter(m => {
    const matchesSearch = `${m.first_name} ${m.last_name} ${m.email || ''}`.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || m.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
    
    // Member objects might have section/zone as IDs or nested objects.
    // The API serializer currently returns section_name and zone_name, but the model has section and zone.
    const memberSectionId = m.section?.id || m.section;
    const memberZoneId = m.zone?.id || m.zone;
    
    const matchesSection = sectionFilter === 'all' || String(memberSectionId) === String(sectionFilter);
    const matchesZone = zoneFilter === 'all' || String(memberZoneId) === String(zoneFilter);
    
    // Check if the member has the selected ministry
    const matchesMinistry = ministryFilter === 'all' || 
      (m.ministries_details && m.ministries_details.some(min => String(min.id) === String(ministryFilter))) ||
      (m.ministries && m.ministries.some(minId => String(minId) === String(ministryFilter)));
    
    return matchesSearch && matchesRole && matchesStatus && matchesSection && matchesZone && matchesMinistry;
  });

  return (
    <div className="py-6">
      <div className="mb-6 space-y-4">
        {/* Header Title & Primary Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
              {canManage ? 'Members Directory' : 'Congregation Directory'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {canManage 
                ? `Manage, filter, and organize your ${user?.org_type === 'PTA' ? 'PTA' : 'church'} members`
                : 'Browse fellow members and church leadership for fellowship, prayer, and visits'}
            </p>
          </div>
          {canManage && (
            <div className="flex items-center gap-3">
              <div className="relative">
                <button 
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 shadow-xl rounded-lg py-1.5 z-20 overflow-hidden transform origin-top-right transition-all">
                    <button 
                      onClick={exportToExcel}
                      className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                    >
                      Export to Excel
                    </button>
                    <button 
                      onClick={exportToPDF}
                      className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                    >
                      Export to PDF
                    </button>
                  </div>
                )}
              </div>
              <button 
                onClick={() => { resetForm(); setShowAddModal(true); }} 
                className="btn-primary flex items-center gap-2 py-2 px-4 shadow-sm shadow-sky-200 hover:shadow-sky-300 transition-all"
              >
                <Plus className="w-4 h-4" />
                Add Member
              </button>
            </div>
          )}
        </div>

        {/* Filters Toolbar */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-400 transition-all bg-slate-50/50 hover:bg-white"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="select-filter text-sm bg-slate-50/50 hover:bg-white border-slate-200 py-2 rounded-lg">
              <option value="all">All Roles</option>
              <option value="member">Regular Member</option>
              {user?.org_type === 'PTA' && <option value="pta">PTA</option>}
              <option value="group_leader">Group Leader</option>
              <option value="section_admin">{user?.org_type === 'PTA' ? 'Class Representative' : 'Section Leader'}</option>
              <option value="zone_admin">{user?.org_type === 'PTA' ? 'Grade Representative' : 'Zone Leader'}</option>
              <option value="admin">Admin</option>
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="select-filter text-sm bg-slate-50/50 hover:bg-white border-slate-200 py-2 rounded-lg">
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending_review">Pending Review</option>
              <option value="inactive">Inactive</option>
            </select>
            <select value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)} className="select-filter text-sm bg-slate-50/50 hover:bg-white border-slate-200 py-2 rounded-lg max-w-[140px]">
              <option value="all">{user?.org_type === 'PTA' ? 'All Classes' : 'All Sections'}</option>
              {sections.map(sec => <option key={sec.id} value={sec.id}>{sec.name}</option>)}
            </select>
            <select value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)} className="select-filter text-sm bg-slate-50/50 hover:bg-white border-slate-200 py-2 rounded-lg max-w-[140px]">
              <option value="all">{user?.org_type === 'PTA' ? 'All Grades' : 'All Zones'}</option>
              {zones.map(zone => <option key={zone.id} value={zone.id}>{zone.name}</option>)}
            </select>
            <select value={ministryFilter} onChange={(e) => setMinistryFilter(e.target.value)} className="select-filter text-sm bg-slate-50/50 hover:bg-white border-slate-200 py-2 rounded-lg max-w-[140px]">
              <option value="all">{user?.org_type === 'PTA' ? 'All Committees' : 'All Groups'}</option>
              {ministries.map(min => <option key={min.id} value={min.id}>{min.name}</option>)}
            </select>
          </div>
        </div>
        
        {/* Bulk Actions Toolbar */}
        {selectedMembers.length > 0 && (
          <div className="bg-sky-50 p-3 rounded-xl border border-sky-200 shadow-sm flex items-center justify-between animate-in fade-in slide-in-from-top-2">
            <span className="text-sm font-medium text-sky-800">{selectedMembers.length} members selected</span>
            <div className="flex gap-2">
              <button 
                onClick={handleBulkDelete}
                className="bg-white border border-red-200 text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              >
                Delete Selected
              </button>
            </div>
          </div>
        )}
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
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="py-3 px-3 text-left w-10">
                    <input 
                      type="checkbox" 
                      checked={filtered.length > 0 && selectedMembers.length === filtered.length}
                      onChange={handleSelectAll}
                      className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 w-4 h-4"
                    />
                  </th>
                  <th className="text-left py-3 px-2 text-xs font-medium text-slate-400 uppercase tracking-wider">Name</th>
                  <th className="text-left py-3 px-2 text-xs font-medium text-slate-400 uppercase tracking-wider">Email</th>
                  <th className="text-left py-3 px-2 text-xs font-medium text-slate-400 uppercase tracking-wider">Role</th>
                  <th className="text-left py-3 px-2 text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="text-left py-3 px-2 text-xs font-medium text-slate-400 uppercase tracking-wider">Joined</th>
                  <th className="text-right py-3 px-2 text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((member, index) => (
                  <tr key={member.id} className="hover:bg-slate-100 transition-colors group even:bg-slate-50/70">
                    <td className="py-3 px-3">
                      <input 
                        type="checkbox" 
                        checked={selectedMembers.includes(member.id)}
                        onChange={() => handleSelectMember(member.id)}
                        className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 w-4 h-4"
                      />
                    </td>
                    <td className="py-3 px-2 text-sm flex items-center gap-3">
                      {member.profile_picture ? (
                        <img src={member.profile_picture.replace(/^https?:\/\/[^\/]+/, '')} alt="" className="w-8 h-8 rounded-full object-cover shadow-sm" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-medium text-xs shadow-sm">
                          {member.first_name?.[0]}{member.last_name?.[0]}
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-slate-700 whitespace-nowrap">{member.first_name} {member.last_name}</div>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-sm text-slate-500 whitespace-nowrap">{member.email || '—'}</td>
                    <td className="py-3 px-2 text-sm capitalize text-slate-600 whitespace-nowrap">{member.role === 'pta' ? 'PTA' : member.role === 'section_admin' ? 'Section Leader' : member.role === 'zone_admin' ? 'Zone Leader' : member.role || 'member'}</td>
                    <td className="py-3 px-2">
                      <span className={`inline-block px-2 py-0.5 text-xs rounded-full whitespace-nowrap ${
                        member.status === 'active' 
                          ? 'bg-green-50 text-green-700' 
                          : member.status === 'pending_review'
                          ? 'bg-orange-50 text-orange-600'
                          : 'bg-red-50 text-red-600'
                      }`}>
                        {member.status === 'pending_review' ? 'Pending Review' : member.status || 'active'}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-sm text-slate-500 whitespace-nowrap">
                      {member.created_at ? new Date(member.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {member.latitude && member.longitude && (
                          <a 
                            href={`https://www.google.com/maps/dir/?api=1&destination=${member.latitude},${member.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded-lg transition-colors inline-flex items-center"
                            title="Get Directions / Visit"
                          >
                            <Navigation className="w-4 h-4" />
                          </a>
                        )}
                        <button 
                          onClick={() => { setSelectedMember(member); setShowViewModal(true); }} 
                          className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors" 
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {canManage && member.status === 'pending_review' && (
                          <button 
                            onClick={() => handleApproveMember(member)} 
                            className="p-1.5 text-slate-400 hover:text-green-600 transition-colors rounded-md hover:bg-green-50"
                            title="Approve member"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canManage && (
                          <>
                            <button 
                              onClick={() => openEditModal(member)} 
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" 
                              title="Edit Member"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => { setSelectedMember(member); setShowDeleteModal(true); }} 
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
                              title="Delete Member"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
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
              <div>
                <label className="block text-xs text-slate-500 mb-1">Profile Picture (Optional)</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={e => setFormData({...formData, profile_picture: e.target.files[0]})} 
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 focus:outline-none"
                />
              </div>
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
                <label className="block text-xs text-slate-500 mb-1">Gender</label>
                <select 
                  value={formData.gender} 
                  onChange={e => setFormData({...formData, gender: e.target.value})} 
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-300"
                >
                  <option value="">Not Specified</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">{user?.org_type === 'PTA' ? 'Class' : 'Section'}</label>
                  <select 
                    value={formData.section_id} 
                    onChange={e => setFormData({...formData, section_id: e.target.value})} 
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-300"
                  >
                    <option value="">{user?.org_type === 'PTA' ? '-- Select class --' : '-- Select section --'}</option>
                    {Array.isArray(sections) && sections.map(section => (
                      <option key={section.id} value={section.id}>{section.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">{user?.org_type === 'PTA' ? 'Grade' : 'Zone'}</label>
                  <select 
                    value={formData.zone_id} 
                    onChange={e => setFormData({...formData, zone_id: e.target.value})} 
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-300"
                  >
                    <option value="">{user?.org_type === 'PTA' ? '-- Select grade --' : '-- Select zone --'}</option>
                    {Array.isArray(zones) && zones.map(zone => (
                      <option key={zone.id} value={zone.id}>{zone.name}</option>
                    ))}
                  </select>
                </div>
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
                    <option value="member">{user?.org_type === 'PTA' ? 'Parent / Student' : 'Member'}</option>
                    {user?.org_type === 'PTA' && <option value="pta">PTA Official</option>}
                    <option value="group_leader">{user?.org_type === 'PTA' ? 'Committee Leader' : 'Group Leader'}</option>
                    {user?.role !== 'section_admin' && <option value="section_admin">{user?.org_type === 'PTA' ? 'Class Teacher / Rep' : 'Section Leader'}</option>}
                    {(user?.role === 'admin' || user?.role === 'superadmin') && <option value="zone_admin">{user?.org_type === 'PTA' ? 'Grade Head' : 'Zone Leader'}</option>}
                    {(user?.role === 'admin' || user?.role === 'superadmin') && <option value="admin">Admin</option>}
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
                    <option value="pending_review">Pending Review</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {ministries.length > 0 && (
                <div>
                  <label className="block text-xs text-slate-500 mb-2">{user?.org_type === 'PTA' ? 'Committees & Activities' : 'Ministries / Groups'}</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 border border-slate-200 rounded-md bg-slate-50">
                    {Array.isArray(ministries) && ministries.map(ministry => (
                      <label key={ministry.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer p-1.5 hover:bg-white rounded border border-transparent hover:border-slate-200">
                        <input 
                          type="checkbox" 
                          checked={(formData.ministries || []).includes(ministry.id)}
                          onChange={() => handleMinistryToggle(ministry.id)}
                          className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                        />
                        <span>{ministry.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              
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
              <div>
                <label className="block text-xs text-slate-500 mb-1">Profile Picture (Optional)</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={e => setFormData({...formData, profile_picture: e.target.files[0]})} 
                    className="w-full text-sm text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 focus:outline-none"
                  />
                  {(selectedMember.profile_picture || formData.profile_picture) && formData.profile_picture !== 'DELETE' && (
                    <button 
                      onClick={() => setFormData({...formData, profile_picture: 'DELETE'})}
                      className="text-xs text-rose-500 hover:text-rose-700 font-medium px-2 py-1 bg-rose-50 rounded-md whitespace-nowrap"
                    >
                      Remove Photo
                    </button>
                  )}
                </div>
              </div>
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
                <label className="block text-xs text-slate-500 mb-1">Gender</label>
                <select 
                  value={formData.gender} 
                  onChange={e => setFormData({...formData, gender: e.target.value})} 
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-300"
                >
                  <option value="">-- Select Gender --</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">{user?.org_type === 'PTA' ? 'Class' : 'Section'}</label>
                  <select 
                    value={formData.section_id} 
                    onChange={e => setFormData({...formData, section_id: e.target.value})} 
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-300"
                  >
                    <option value="">{user?.org_type === 'PTA' ? '-- Select class --' : '-- Select section --'}</option>
                    {Array.isArray(sections) && sections.map(section => (
                      <option key={section.id} value={section.id}>{section.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">{user?.org_type === 'PTA' ? 'Grade' : 'Zone'}</label>
                  <select 
                    value={formData.zone_id} 
                    onChange={e => setFormData({...formData, zone_id: e.target.value})} 
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-300"
                  >
                    <option value="">{user?.org_type === 'PTA' ? '-- Select grade --' : '-- Select zone --'}</option>
                    {Array.isArray(zones) && zones.map(zone => (
                      <option key={zone.id} value={zone.id}>{zone.name}</option>
                    ))}
                  </select>
                </div>
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
                    <option value="member">{user?.org_type === 'PTA' ? 'Parent / Student' : 'Member'}</option>
                    {user?.org_type === 'PTA' && <option value="pta">PTA Official</option>}
                    <option value="group_leader">{user?.org_type === 'PTA' ? 'Committee Leader' : 'Group Leader'}</option>
                    {user?.role !== 'section_admin' && <option value="section_admin">{user?.org_type === 'PTA' ? 'Class Teacher / Rep' : 'Section Leader'}</option>}
                    {(user?.role === 'admin' || user?.role === 'superadmin') && <option value="zone_admin">{user?.org_type === 'PTA' ? 'Grade Head' : 'Zone Leader'}</option>}
                    {(user?.role === 'admin' || user?.role === 'superadmin') && <option value="admin">Admin</option>}
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
                    <option value="pending_review">Pending Review</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {ministries.length > 0 && (
                <div>
                  <label className="block text-xs text-slate-500 mb-2">{user?.org_type === 'PTA' ? 'Committees & Activities' : 'Ministries / Groups'}</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 border border-slate-200 rounded-md bg-slate-50">
                    {Array.isArray(ministries) && ministries.map(ministry => (
                      <label key={ministry.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer p-1.5 hover:bg-white rounded border border-transparent hover:border-slate-200">
                        <input 
                          type="checkbox" 
                          checked={(formData.ministries || []).includes(ministry.id)}
                          onChange={() => handleMinistryToggle(ministry.id)}
                          className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                        />
                        <span>{ministry.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              
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
                <p className="text-sm text-slate-600">{selectedMember.phone_number || selectedMember.phone || '—'}</p>
              </div>
              
              <div className="pb-3 border-b border-slate-100">
                <p className="text-xs text-slate-400">Role</p>
                <p className="text-sm text-slate-600 capitalize">
                  {selectedMember.role === 'pta' ? 'PTA Official' : selectedMember.role === 'section_admin' ? (user?.org_type === 'PTA' ? 'Class Teacher / Rep' : 'Section Leader') : selectedMember.role === 'zone_admin' ? (user?.org_type === 'PTA' ? 'Grade Head' : 'Zone Leader') : selectedMember.role === 'group_leader' ? (user?.org_type === 'PTA' ? 'Committee Leader' : 'Group Leader') : selectedMember.role || 'member'}
                </p>
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
                <p className="text-xs text-slate-400">Total Attendance Sessions</p>
                <p className="text-sm font-semibold text-sky-600">{attendanceCount}</p>
              </div>
              
              <div className="pb-3 border-b border-slate-100">
                <p className="text-xs text-slate-400">{user?.org_type === 'PTA' ? 'Committees & Activities' : 'Ministries / Groups'}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedMember.ministries_details && selectedMember.ministries_details.length > 0 ? (
                    selectedMember.ministries_details.map(m => (
                      <span key={m.id} className="inline-block px-2 py-0.5 text-xs rounded-full bg-sky-50 text-sky-700 border border-sky-100">
                        {m.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-600">—</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <p className="text-xs text-slate-400">{user?.org_type === 'PTA' ? 'Class' : 'Section'}</p>
                  <p className="text-sm text-slate-600">{selectedMember.section_name || 'Not assigned'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">{user?.org_type === 'PTA' ? 'Grade' : 'Zone'}</p>
                  <p className="text-sm text-slate-600">{selectedMember.zone_name || 'Not assigned'}</p>
                </div>
              </div>
              
              <div className="pb-3 border-b border-slate-100">
                <p className="text-xs text-slate-400">Address</p>
                <p className="text-sm text-slate-600">{selectedMember.address || '—'}</p>
              </div>
              
              {selectedMember.latitude && selectedMember.longitude && (
                <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">Home Location</p>
                    <p className="text-xs font-medium text-emerald-600">GPS Coordinates Available</p>
                  </div>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selectedMember.latitude},${selectedMember.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors !text-white no-underline"
                  >
                    <Navigation className="w-3.5 h-3.5" /> Get Directions
                  </a>
                </div>
              )}
              
              <div>
                <p className="text-xs text-slate-400">Joined date</p>
                <p className="text-sm text-slate-600">{formatDate(selectedMember.date_joined)}</p>
              </div>
            </div>
            
            <div className="flex gap-2 mt-5 pt-3 border-t border-slate-100">
              {canManage && (
                <button onClick={() => { setShowViewModal(false); openEditModal(selectedMember); }} className="flex-1 btn-primary text-sm py-2">
                  Edit Member
                </button>
              )}
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