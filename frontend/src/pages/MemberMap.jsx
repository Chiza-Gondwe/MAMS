import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Navigation, Phone, ShieldCheck, Users } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

function MapBoundsUpdater({ members, currentUserId }) {
  const map = useMap();
  useEffect(() => {
    if (!members || members.length === 0) return;
    const me = members.find(m => m.id === currentUserId);
    if (me && me.latitude && me.longitude) {
      map.setView([me.latitude, me.longitude], 14);
    } else {
      const bounds = L.latLngBounds(members.map(m => [m.latitude, m.longitude]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [members, currentUserId, map]);
  return null;
}

// Single member colored pin
const createMarkerIcon = (role) => {
  const isLeader = ['admin', 'superadmin'].includes(role);
  const bgColor = isLeader ? '#f59e0b' : '#0284c7';
  const shadowColor = isLeader ? 'rgba(245, 158, 11, 0.4)' : 'rgba(2, 132, 199, 0.4)';
  return L.divIcon({
    className: 'custom-map-pin',
    html: `<div style="
      background-color: ${bgColor};
      width: 30px;
      height: 30px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 8px ${shadowColor};
      border: 2.5px solid white;
    ">
      <div style="
        width: 10px;
        height: 10px;
        background-color: white;
        border-radius: 50%;
        transform: rotate(45deg);
      "></div>
    </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  });
};

// Cluster pin with count badge
const createClusterIcon = (count, hasLeader) => {
  const bgColor = hasLeader ? '#f59e0b' : '#0284c7';
  const shadowColor = hasLeader ? 'rgba(245,158,11,0.4)' : 'rgba(2,132,199,0.4)';
  return L.divIcon({
    className: 'custom-cluster-pin',
    html: `<div style="position:relative; width:38px; height:38px;">
      <div style="
        background-color: ${bgColor};
        width: 30px;
        height: 30px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 4px 8px ${shadowColor};
        border: 2.5px solid white;
        position: absolute;
        top: 4px;
        left: 4px;
      ">
        <div style="
          width: 10px;
          height: 10px;
          background-color: white;
          border-radius: 50%;
          transform: rotate(45deg);
          position: absolute;
          top: 50%;
          left: 50%;
          margin: -5px 0 0 -5px;
        "></div>
      </div>
      <div style="
        position: absolute;
        top: 0;
        right: 0;
        background: #dc2626;
        color: white;
        border-radius: 50%;
        width: 18px;
        height: 18px;
        font-size: 10px;
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1.5px solid white;
        z-index: 10;
      ">${count}</div>
    </div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 34],
    popupAnchor: [0, -34],
  });
};

const MemberMap = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    api.getMembers(1, '')
      .then((responseData) => {
        if (!isMounted) return;
        const data = responseData.results || responseData || [];
        const locatedMembers = Array.isArray(data)
          ? data.filter(m => m.latitude !== null && m.latitude !== undefined && m.longitude !== null && m.longitude !== undefined)
          : [];
        setMembers(locatedMembers);
      })
      .catch((error) => {
        console.error("Error fetching members for map:", error);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Group members at same location (rounded to 4 decimal places ≈ 11m)
  const clusters = useMemo(() => {
    const groups = {};
    members.forEach(m => {
      const key = `${parseFloat(m.latitude).toFixed(4)},${parseFloat(m.longitude).toFixed(4)}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    });
    return Object.entries(groups).map(([key, group]) => {
      const [lat, lng] = key.split(',').map(Number);
      return { lat, lng, group };
    });
  }, [members]);

  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading Map...</div>;
  }

  const center = members.length > 0 
    ? [members[0].latitude, members[0].longitude] 
    : [-15.3875, 28.3228]; 

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Member Map</h1>
          <p className="text-xs text-slate-500 mt-0.5">Locate members and leadership for visits and pastoral care</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
            <span className="font-bold text-slate-400 mr-1 uppercase text-[10px] tracking-wider">Legend:</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span>Leadership</span>
            <span className="text-slate-300 mx-1">|</span>
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
            <span>Member</span>
            <span className="text-slate-300 mx-1">|</span>
            <span className="w-4 h-4 rounded-full bg-sky-500 flex items-center justify-center text-white" style={{fontSize:'8px',fontWeight:'bold'}}>2+</span>
            <span>Cluster (Shared Spot)</span>
          </div>
          <span className="bg-sky-100 text-sky-800 text-xs font-semibold px-3 py-1.5 rounded-lg">
            {members.length} {members.length === 1 ? 'Location' : 'Locations'}
          </span>
        </div>
      </div>
      
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200" style={{ height: '70vh' }}>
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapBoundsUpdater members={members} currentUserId={user?.member_id} />
          
          {clusters.map(({ lat, lng, group }) => {
            const isCluster = group.length > 1;
            const hasLeader = group.some(m => ['admin','superadmin'].includes(m.role));
            const position = [lat, lng];

            if (isCluster) {
              return (
                <Marker
                  key={`cluster-${lat}-${lng}`}
                  position={position}
                  icon={createClusterIcon(group.length, hasLeader)}
                >
                  <Popup>
                    <div style={{ minWidth: '200px' }}>
                      <div className="flex items-center gap-1.5 mb-3 pb-2 border-b border-slate-100">
                        <Users className="w-4 h-4 text-sky-500" />
                        <span className="font-bold text-sm text-slate-700">{group.length} people at this location</span>
                      </div>
                      {group.map((member) => {
                        const isLeader = ['admin','superadmin'].includes(member.role);
                        return (
                          <div key={member.id} className="flex items-center gap-2 py-2 border-b border-slate-50 last:border-0">
                            {member.profile_picture ? (
                              <img 
                                src={member.profile_picture.startsWith('/') ? `http://127.0.0.1:8000${member.profile_picture}` : member.profile_picture}
                                alt={member.first_name} 
                                className="w-9 h-9 rounded-full object-cover border border-slate-100 flex-shrink-0"
                              />
                            ) : (
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${isLeader ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'}`}>
                                {member.first_name?.[0]}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-800 leading-tight truncate">{member.first_name} {member.last_name}</p>
                              <p className={`text-[10px] font-bold uppercase ${isLeader ? 'text-amber-600' : 'text-sky-600'}`}>
                                {isLeader ? 'Leadership' : member.role?.replace('_',' ') || 'Member'}
                              </p>
                              {member.phone_number && <p className="text-[11px] text-slate-500 truncate">{member.phone_number}</p>}
                            </div>
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-[11px] font-semibold no-underline transition-colors"
                              style={{ color: '#ffffff' }}
                            >
                              <Navigation className="w-3 h-3" /> Go
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  </Popup>
                </Marker>
              );
            }

            // Single member
            const member = group[0];
            return (
              <Marker
                key={member.id}
                position={position}
                icon={createMarkerIcon(member.role)}
              >
                <Popup>
                  <div className="text-center p-1" style={{ minWidth: '180px' }}>
                    {member.profile_picture ? (
                      <img src={member.profile_picture.startsWith('/') ? `http://127.0.0.1:8000${member.profile_picture}` : member.profile_picture} alt={member.first_name} className="w-14 h-14 rounded-full mx-auto mb-2 object-cover border-2 border-slate-100" />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-slate-100 mx-auto mb-2 flex items-center justify-center text-slate-500 font-bold text-lg border border-slate-200">
                        {member.first_name?.[0] || 'M'}
                      </div>
                    )}
                    <h3 className="font-bold text-slate-800 text-sm leading-tight">{member.first_name} {member.last_name}</h3>
                    
                    <div className="my-1.5">
                      {['admin', 'superadmin'].includes(member.role) ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[10px] font-bold uppercase tracking-wider">
                          <ShieldCheck className="w-3 h-3 text-amber-500" /> Church Leadership
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 bg-sky-50 text-sky-700 border border-sky-100 rounded-full text-[10px] font-semibold uppercase tracking-wider">
                          {member.role?.replace('_', ' ') || 'Member'}
                        </span>
                      )}
                    </div>

                    {member.phone_number && (
                      <p className="text-xs text-slate-600 flex items-center justify-center gap-1 my-1">
                        <Phone className="w-3 h-3 text-slate-400" /> {member.phone_number}
                      </p>
                    )}
                    {member.address && <p className="text-[11px] text-slate-400 mt-1 mb-2">{member.address}</p>}
                    
                    <a 
                      href={`https://www.google.com/maps/dir/?api=1&destination=${member.latitude},${member.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#ffffff' }}
                      className="mt-2.5 inline-flex items-center justify-center gap-1.5 w-full py-1.5 px-3 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors !text-white no-underline"
                    >
                      <Navigation className="w-3.5 h-3.5" /> Get Directions
                    </a>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
};

export default MemberMap;
