import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { api } from '../api';

// Fix for default marker icon in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MemberMap = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://127.0.0.1:8000/api/members/?page_size=1000', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const responseData = await response.json();
      const data = responseData.results || responseData || [];
      // Filter out members who haven't set their GPS location
      const locatedMembers = Array.isArray(data) ? data.filter(m => m.latitude && m.longitude) : [];
      setMembers(locatedMembers);
    } catch (error) {
      console.error("Error fetching members for map:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading Map...</div>;
  }

  // Default center: Lusaka, Zambia or first member's location
  const center = members.length > 0 
    ? [members[0].latitude, members[0].longitude] 
    : [-15.3875, 28.3228]; 

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Member Map</h1>
        <span className="bg-sky-100 text-sky-800 text-sm font-medium px-3 py-1 rounded-full">
          {members.length} Members Mapped
        </span>
      </div>
      
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200" style={{ height: '70vh' }}>
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {members.map(member => (
            <Marker key={member.id} position={[member.latitude, member.longitude]}>
              <Popup>
                <div className="text-center">
                  {member.profile_picture ? (
                    <img src={member.profile_picture.startsWith('/') ? `http://127.0.0.1:8000${member.profile_picture}` : member.profile_picture} alt={member.first_name} className="w-16 h-16 rounded-full mx-auto mb-2 object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-slate-200 mx-auto mb-2 flex items-center justify-center">
                      <span className="text-slate-500 text-xl">{member.first_name[0]}</span>
                    </div>
                  )}
                  <h3 className="font-bold text-slate-800">{member.first_name} {member.last_name}</h3>
                  <p className="text-xs text-indigo-600 font-medium uppercase mb-1">{member.role.replace('_', ' ')}</p>
                  <p className="text-sm text-slate-600">{member.phone_number}</p>
                  {member.address && <p className="text-xs text-slate-500 mt-1">{member.address}</p>}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default MemberMap;
