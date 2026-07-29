// pages/MyProfile.jsx
import { useState, useEffect } from 'react';
import { User, Phone, MapPin, Mail, Settings, Save, Map, Layers, Users, KeyRound, Lock, Camera } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function MyProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  
  const [profilePicFile, setProfilePicFile] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState(null);
  
  const [sections, setSections] = useState([]);
  const [zones, setZones] = useState([]);
  const [ministriesList, setMinistriesList] = useState([]);
  
  const [formData, setFormData] = useState({
    email: '',
    phone_number: '',
    address: '',
    section_id: '',
    zone_id: '',
    ministries: []
  });

  useEffect(() => {
    Promise.all([
      api.getMembers(),
      api.getSections().catch(() => ({results: []})),
      api.getZones().catch(() => ({results: []})),
      api.getMinistries().catch(() => ({results: []}))
    ]).then(([membersData, sectionsData, zonesData, ministriesData]) => {
      const members = membersData.results || membersData || [];
      const myProfile = members.find(m => m.id === user.member_id) || {
        first_name: user.username,
        last_name: '',
        email: user.username + '@example.com',
        phone_number: '',
        address: '',
        status: 'active',
        section: null,
        zone: null,
        ministries: []
      };
      
      setSections(sectionsData.results || sectionsData || []);
      setZones(zonesData.results || zonesData || []);
      setMinistriesList(ministriesData.results || ministriesData || []);
      
      setProfile(myProfile);
      setFormData({
        email: myProfile.email || '',
        phone_number: myProfile.phone_number || '',
        address: myProfile.address || '',
        section_id: myProfile.section || '',
        zone_id: myProfile.zone || '',
        ministries: myProfile.ministries || []
      });
      if (myProfile.profile_picture) {
        setProfilePicPreview(myProfile.profile_picture.replace(/^https?:\/\/[^\/]+/, ''));
      }
      setLoading(false);
    }).catch(err => {
      console.error("Failed to load profile", err);
      // Fallback if API fails to prevent crash
      setProfile({
        first_name: user?.username || 'Unknown',
        last_name: '',
        email: '',
        phone_number: '',
        address: '',
        status: 'unknown',
        ministries: []
      });
      setLoading(false);
    });
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      let payload;
      if (profilePicFile) {
        payload = new FormData();
        payload.append('email', formData.email);
        payload.append('phone_number', formData.phone_number);
        payload.append('address', formData.address);
        if (formData.section_id) payload.append('section', formData.section_id);
        if (formData.zone_id) payload.append('zone', formData.zone_id);
        formData.ministries.forEach(m => payload.append('ministries', m));
        payload.append('profile_picture', profilePicFile);
      } else {
        payload = {
          email: formData.email,
          phone_number: formData.phone_number,
          address: formData.address,
          ministries: formData.ministries
        };
        if (formData.section_id) payload.section = formData.section_id;
        if (formData.zone_id) payload.zone = formData.zone_id;
      }

      await api.updateMember(user.member_id, payload);
      alert("Profile updated successfully!");
    } catch (err) {
      alert("Failed to update profile: " + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfilePicFile(file);
      setProfilePicPreview(URL.createObjectURL(file));
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }
    setChangingPassword(true);
    try {
      await api.changePassword(newPassword);
      alert("Password changed successfully!");
      setNewPassword('');
    } catch (err) {
      alert("Failed to change password: " + (err.message || 'Unknown error'));
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-slate-500">Loading profile...</div>;
  if (!profile) return <div className="p-12 text-center text-red-500">Error loading profile data.</div>;

  return (
    <div className="max-w-3xl mx-auto py-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">My Profile</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your personal information and affiliations.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 sm:p-8 bg-gradient-to-r from-sky-900 to-indigo-900 text-white relative">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="relative z-10 flex items-center gap-6">
            <div className="relative group">
              <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center border-4 border-white/20 backdrop-blur-sm overflow-hidden relative">
                {profilePicPreview ? (
                  <img src={profilePicPreview} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-white" />
                )}
                <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                  <Camera className="w-6 h-6 text-white" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold">{profile.first_name} {profile.last_name}</h2>
              <p className="text-sky-200 mt-1 capitalize">{user.role}</p>
              <span className="mt-3 inline-block px-2.5 py-1 bg-white/20 rounded-full text-xs font-medium backdrop-blur-sm">
                Status: {profile.status}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-8">
          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b pb-2">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400" /> Email Address
                </label>
                <input 
                  type="email" 
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-400" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400" /> Phone Number
                </label>
                <input 
                  type="text" 
                  value={formData.phone_number} 
                  onChange={e => setFormData({...formData, phone_number: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-400" 
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-400" /> Home Address
                </label>
                <input 
                  type="text" 
                  value={formData.address} 
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-400" 
                />
              </div>
            </div>
          </div>

          {/* Affiliations */}
          {user.org_type !== 'PTA' && (
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b pb-2">Affiliations</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                    <Map className="w-4 h-4 text-slate-400" /> Zone
                  </label>
                  <select 
                    value={formData.zone_id} 
                    onChange={e => setFormData({...formData, zone_id: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-400"
                  >
                    <option value="">Select Zone</option>
                    {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-slate-400" /> Section
                  </label>
                  <select 
                    value={formData.section_id} 
                    onChange={e => setFormData({...formData, section_id: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-400"
                  >
                    <option value="">Select Section</option>
                    {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" /> Groups & Ministries
                  </label>
                  <select 
                    multiple
                    value={formData.ministries} 
                    onChange={e => {
                      const options = [...e.target.selectedOptions];
                      const values = options.map(opt => parseInt(opt.value));
                      setFormData({...formData, ministries: values});
                    }}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-400 min-h-[100px]"
                  >
                    {ministriesList.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">Hold Ctrl (or Cmd on Mac) to select multiple ministries.</p>
                </div>
              </div>
            </div>
          )}

          {/* Security */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b pb-2">Security</h3>
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
              <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-indigo-500" /> Change Password
              </h4>
              <p className="text-xs text-slate-500 mb-4">Set a new password for your account. It must be at least 6 characters long.</p>
              
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="relative w-full max-w-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-400" />
                  </div>
                  <input 
                    type="password" 
                    placeholder="New password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <button 
                  onClick={handleChangePassword}
                  disabled={changingPassword || !newPassword}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {changingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
            <button className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors">
              Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors disabled:opacity-70"
            >
              {saving ? <Settings className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
