// pages/MyProfile.jsx
import { useState, useEffect, useCallback } from 'react';
import { User, Phone, MapPin, Mail, Settings, Save, Map, Layers, Users, KeyRound, Lock, Camera, Check, LocateFixed, X, Trash2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

// Helper: captures map clicks and calls onPick(lat, lng)
function MapClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MyProfile() {
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  
  const [profilePicFile, setProfilePicFile] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState(null);

  // Map location picker
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [pickedLat, setPickedLat] = useState(null);
  const [pickedLng, setPickedLng] = useState(null);
  const [tempLat, setTempLat] = useState(null);
  const [tempLng, setTempLng] = useState(null);
  const [tempAddress, setTempAddress] = useState('');
  const [lookingUpAddress, setLookingUpAddress] = useState(false);
  const [locationCleared, setLocationCleared] = useState(false);
  
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
      if (myProfile.latitude && myProfile.longitude) {
        setPickedLat(parseFloat(myProfile.latitude));
        setPickedLng(parseFloat(myProfile.longitude));
      }
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

  const reverseGeocode = async (lat, lng) => {
    setLookingUpAddress(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, {
        headers: { 'User-Agent': 'MAMS-Church-App/1.0 (church management system)' }
      });
      const data = await res.json();
      if (data && data.address) {
        const addr = data.address;
        const road = addr.road || addr.pedestrian || addr.suburb || '';
        const suburb = addr.suburb || addr.neighbourhood || addr.residential || '';
        const city = addr.city || addr.town || addr.district || 'Lusaka';
        const cleanParts = [];
        if (road) cleanParts.push(road);
        if (suburb && suburb !== road) cleanParts.push(suburb);
        if (city && city !== suburb) cleanParts.push(city);
        cleanParts.push(addr.country || 'Zambia');
        const formatted = cleanParts.join(', ');
        setTempAddress(formatted);
        return formatted;
      }
      setTempAddress(data.display_name || '');
      return data.display_name || '';
    } catch (err) {
      console.error("Reverse geocoding error:", err);
      setTempAddress('');
      return '';
    } finally {
      setLookingUpAddress(false);
    }
  };

  const handleClearLocation = () => {
    setPickedLat(null);
    setPickedLng(null);
    setTempLat(null);
    setTempLng(null);
    setTempAddress('');
    setFormData(prev => ({ ...prev, address: '' }));
    setLocationCleared(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let payload;
      if (profilePicFile && profilePicFile !== 'DELETE') {
        payload = new FormData();
        payload.append('email', formData.email);
        payload.append('phone_number', formData.phone_number);
        payload.append('address', formData.address || '');
        if (formData.section_id) payload.append('section', formData.section_id);
        if (formData.zone_id) payload.append('zone', formData.zone_id);
        formData.ministries.forEach(m => payload.append('ministries', m));
        payload.append('profile_picture', profilePicFile);
        if (pickedLat !== null) {
          payload.append('latitude', pickedLat);
          payload.append('longitude', pickedLng);
        } else if (locationCleared) {
          payload.append('latitude', '');
          payload.append('longitude', '');
        }
      } else {
        payload = {
          email: formData.email,
          phone_number: formData.phone_number,
          address: formData.address || '',
          ministries: formData.ministries,
        };
        if (formData.section_id) payload.section = formData.section_id;
        if (formData.zone_id) payload.zone = formData.zone_id;
        if (profilePicFile === 'DELETE') payload.profile_picture = null;
        // Only include coords when the user explicitly pinned (non-null) or explicitly cleared
        if (pickedLat !== null) {
          payload.latitude = pickedLat;
          payload.longitude = pickedLng;
        } else if (locationCleared) {
          payload.latitude = null;
          payload.longitude = null;
        }
        // If neither: omit lat/lng → backend auto-geocodes from address field
      }

      const updated = await api.updateMember(user.member_id, payload);
      if (updated && updated.latitude && updated.longitude) {
        setPickedLat(parseFloat(updated.latitude));
        setPickedLng(parseFloat(updated.longitude));
      } else if (locationCleared) {
        setPickedLat(null);
        setPickedLng(null);
      }
      await refreshUser();
      setLocationCleared(false);
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
            <div className="flex flex-col items-center gap-2">
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
              {profilePicPreview && (
                <button 
                  onClick={() => { setProfilePicPreview(null); setProfilePicFile('DELETE'); }}
                  className="text-xs text-rose-200 hover:text-white font-medium bg-black/20 px-2 py-1 rounded-md backdrop-blur-sm transition-colors"
                >
                  Remove Photo
                </button>
              )}
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
                  name="email"
                  id="profile_email"
                  autoComplete="email"
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
                  name="phone"
                  id="profile_phone"
                  autoComplete="tel"
                  value={formData.phone_number} 
                  onChange={e => setFormData({...formData, phone_number: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-400" 
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" /> Home Address
                  </span>
                  {pickedLat && (
                    <span className="text-[11px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-medium flex items-center gap-1">
                      <Check className="w-3 h-3" /> Pinned on map
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input 
                    type="text" 
                    name="home_address"
                    id="profile_home_address"
                    autoComplete="street-address"
                    value={formData.address} 
                    onChange={e => {
                      setFormData({...formData, address: e.target.value});
                      setLocationCleared(false);
                    }}
                    placeholder="e.g. House 15, Changachanga Road, Lusaka"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-400 pr-10" 
                  />
                  {formData.address && (
                    <button
                      type="button"
                      title="Clear address text"
                      onClick={() => setFormData({...formData, address: ''})}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTempLat(pickedLat);
                      setTempLng(pickedLng);
                      setTempAddress(formData.address || '');
                      setMapPickerOpen(true);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      pickedLat
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <LocateFixed className={`w-3.5 h-3.5 ${pickedLat ? 'text-indigo-500' : 'text-slate-400'}`} />
                    {pickedLat ? 'Move Pin on Map' : 'Pick Pin on Map'}
                  </button>

                  {(pickedLat || formData.address) && (
                    <button
                      type="button"
                      onClick={handleClearLocation}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      Delete Location
                    </button>
                  )}

                  {pickedLat && (
                    <span className="text-xs text-slate-500 font-mono bg-slate-100 px-2 py-1 rounded">
                      📍 {pickedLat.toFixed(4)}, {pickedLng.toFixed(4)}
                    </span>
                  )}

                  {locationCleared && (
                    <span className="text-xs text-amber-600 font-medium">
                      Location removed — click Save Changes to apply.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Map Picker Modal */}
          {mapPickerOpen && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col" style={{ height: '80vh' }}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">Pick Your Home Location</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Click anywhere on the map — your address will fill in automatically</p>
                  </div>
                  <button onClick={() => setMapPickerOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Map */}
                <div className="flex-1 relative">
                  <MapContainer
                    center={tempLat ? [tempLat, tempLng] : [-15.3875, 28.3228]}
                    zoom={14}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      attribution='&copy; Google Maps &amp; OpenStreetMap contributors'
                      url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                    />
                    <MapClickHandler onPick={(lat, lng) => {
                      setTempLat(lat);
                      setTempLng(lng);
                      reverseGeocode(lat, lng);
                    }} />
                    {tempLat && (
                      <Marker
                        position={[tempLat, tempLng]}
                        icon={L.divIcon({
                          className: '',
                          html: `<div style="color:#4F46E5;font-size:40px;line-height:1;margin-top:-36px;margin-left:-12px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))">📍</div>`,
                          iconSize: [24, 40],
                          iconAnchor: [12, 40],
                        })}
                      />
                    )}
                  </MapContainer>
                  {!tempLat && (
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-white rounded-full px-4 py-2 shadow-lg text-sm text-slate-600 flex items-center gap-2 pointer-events-none">
                      <LocateFixed className="w-4 h-4 text-indigo-500" />
                      Click on the map to place your pin
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-5 py-4 border-t border-slate-100 gap-3">
                  <div className="min-w-0 flex-1">
                    {tempLat ? (
                      <div>
                        <p className="text-xs font-semibold text-slate-800 flex items-center gap-1.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                          {lookingUpAddress ? 'Looking up address...' : (tempAddress || `${tempLat.toFixed(5)}, ${tempLng.toFixed(5)}`)}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {tempLat.toFixed(5)}, {tempLng.toFixed(5)}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">No spot selected yet</p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-auto flex-shrink-0">
                    <button
                      onClick={() => setMapPickerOpen(false)}
                      className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg border border-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={!tempLat}
                      onClick={() => {
                        setPickedLat(tempLat);
                        setPickedLng(tempLng);
                        if (tempAddress) {
                          setFormData(prev => ({ ...prev, address: tempAddress }));
                        }
                        setLocationCleared(false);
                        setMapPickerOpen(false);
                      }}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      Confirm Location
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

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
                  <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" /> Groups & Ministries
                  </label>
                  
                  <div className="flex flex-wrap gap-2 p-1">
                    {ministriesList.map(m => {
                      const isSelected = (formData.ministries || []).includes(m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            const current = formData.ministries || [];
                            if (isSelected) {
                              setFormData({...formData, ministries: current.filter(id => id !== m.id)});
                            } else {
                              setFormData({...formData, ministries: [...current, m.id]});
                            }
                          }}
                          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border cursor-pointer ${
                            isSelected 
                              ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm' 
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300 hover:text-slate-700'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                          {m.name}
                        </button>
                      );
                    })}
                  </div>
                  {ministriesList.length === 0 && (
                    <p className="text-sm text-slate-500 italic px-1">No groups or ministries available.</p>
                  )}
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
                    name="new_password"
                    autoComplete="new-password"
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
