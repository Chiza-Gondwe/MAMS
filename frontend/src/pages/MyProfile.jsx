// pages/MyProfile.jsx
import { useState, useEffect } from 'react';
import { User, Phone, MapPin, Mail, Settings, Save, Map, Layers, Users } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function MyProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
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
      setLoading(false);
    }).catch(err => {
      console.error("Failed to load profile", err);
      setLoading(false);
    });
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        email: formData.email,
        phone_number: formData.phone_number,
        address: formData.address,
        ministries: formData.ministries
      };
      
      if (formData.section_id) payload.section = formData.section_id;
      if (formData.zone_id) payload.zone = formData.zone_id;

      await api.updateMember(user.member_id, payload);
      alert("Profile updated successfully!");
    } catch (err) {
      alert("Failed to update profile: " + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-slate-500">Loading profile...</div>;

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
            <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center border-4 border-white/20 backdrop-blur-sm">
              <User className="w-10 h-10 text-white" />
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

          {/* Church Affiliations */}
          {user.org_type !== 'PTA' && (
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b pb-2">Church Affiliations</h3>
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
