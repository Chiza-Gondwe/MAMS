// components/Topbar.jsx
import { Search, Bell, User, ChevronDown, Megaphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect, useRef } from 'react';
import { api } from '../api';

export default function Topbar({ onSearch }) {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [pushPermission, setPushPermission] = useState('default');
  
  const notifRef = useRef(null);
  const userRef = useRef(null);

  useEffect(() => {
    if ('Notification' in window) {
      setPushPermission(Notification.permission);
    }
  }, []);

  const handleEnablePush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Push notifications are not supported by your browser.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      
      if (permission === 'granted') {
        const registration = await navigator.serviceWorker.register('/sw.js');
        
        const VAPID_PUBLIC_KEY = 'BEkvy5Yj80t_xKjKhBoQgP-7W-RgKWgZ7BWKYO7iHpP7oC-BAuoquB8u3uOqfbzsZxJ-oYHR-vGvKSmbglkvDUs';
        
        // Helper to convert VAPID key
        const padding = '='.repeat((4 - VAPID_PUBLIC_KEY.length % 4) % 4);
        const base64 = (VAPID_PUBLIC_KEY + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: outputArray
        });

        // Save to backend
        await api.subscribeToPushNotifications(subscription.toJSON());
        alert('Successfully subscribed to notifications!');
      }
    } catch (err) {
      console.error('Failed to subscribe to push notifications', err);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef(null);

  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const [annsData, eventsData, sermonsData] = await Promise.all([
          api.getAnnouncements(),
          api.getEvents(),
          api.getSermons()
        ]);
        
        const anns = (annsData.results || annsData || []).map(a => ({
          id: `ann_${a.id}`, type: 'announcement', title: a.title, content: a.content, date: new Date(a.created_at)
        }));
        
        const evts = (eventsData.results || eventsData || []).map(e => ({
          id: `evt_${e.id}`, type: 'event', title: `New Event: ${e.title}`, content: `${e.date} at ${e.time}`, date: new Date(e.created_at)
        }));
        
        const srms = (sermonsData.results || sermonsData || []).map(s => ({
          id: `srm_${s.id}`, type: 'sermon', title: `New Sermon: ${s.title}`, content: `By ${s.speaker}`, date: new Date(s.created_at)
        }));
        
        const allNotifs = [...anns, ...evts, ...srms].sort((a, b) => b.date - a.date);
        const top5 = allNotifs.slice(0, 5);
        setNotifications(top5);
        
        let readNotifs = [];
        try {
          readNotifs = JSON.parse(localStorage.getItem('readNotifs') || '[]');
        } catch (e) {
          readNotifs = [];
        }
        
        const unread = top5.filter(n => !readNotifs.includes(n.id)).length;
        setUnreadCount(unread);
      } catch (err) {
        console.error("Failed to load notifications", err);
      }
    };

    fetchNotifications(); // Initial fetch
    const interval = setInterval(fetchNotifications, 15000); // Poll every 15 seconds
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllAsRead = () => {
    if (notifications.length > 0) {
      const allIds = notifications.map(n => n.id);
      localStorage.setItem('readNotifs', JSON.stringify(allIds));
      setUnreadCount(0);
    }
  };

  const handleNotificationClick = (notif) => {
    // Navigate based on type
    if (notif.type === 'event') navigate('/dashboard/events');
    else if (notif.type === 'sermon') navigate('/dashboard/sermons');
    else navigate('/dashboard/announcements');
    
    // Auto-mark this specific notification as read to clear the red dot
    try {
      const readNotifs = JSON.parse(localStorage.getItem('readNotifs') || '[]');
      if (!readNotifs.includes(notif.id)) {
        readNotifs.push(notif.id);
        localStorage.setItem('readNotifs', JSON.stringify(readNotifs));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch(e) {}
    
    setShowNotifications(false);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (userRef.current && !userRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchResults(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchChange = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (onSearch) onSearch(query);

    if (query.trim().length < 2) {
      setSearchResults(null);
      return;
    }

    setIsSearching(true);
    try {
      const membersData = await api.getMembers(1, query);
      const annsData = await api.getAnnouncements(query);
      
      const members = membersData.results || membersData || [];
      const anns = annsData.results || annsData || [];

      // Local filter fallback to be absolutely sure we find matching items
      const filteredMembers = members.filter(m => 
        `${m.first_name} ${m.last_name} ${m.email || ''}`.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5);

      const filteredAnns = anns.filter(a =>
        `${a.title} ${a.content || ''}`.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 3);

      setSearchResults({ members: filteredMembers, announcements: filteredAnns });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <header className="h-16 border-b border-white/40 bg-white/60 backdrop-blur-md flex items-center justify-between px-6 z-30 relative shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
      <div className="relative w-96" ref={searchRef}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          placeholder="Search members, announcements..."
          onChange={handleSearchChange}
          className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-400 focus:bg-white transition-colors"
          title="Search the platform"
        />
        
        {searchResults && (
          <div className="absolute top-full left-0 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50">
            {isSearching && (
              <div className="p-4 text-center text-sm text-slate-500">Searching...</div>
            )}
            
            {!isSearching && searchResults.members.length === 0 && searchResults.announcements.length === 0 && (
              <div className="p-4 text-center text-sm text-slate-500">No results found for "{searchQuery}"</div>
            )}

            {!isSearching && searchResults.members.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase">Members</div>
                {searchResults.members.map(m => (
                  <div key={m.id} className="px-4 py-3 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 font-bold text-xs shrink-0">
                      {m.first_name[0]}{m.last_name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{m.first_name} {m.last_name}</p>
                      <p className="text-xs text-slate-500">{m.email || m.phone || 'No contact info'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isSearching && searchResults.announcements.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 border-t text-xs font-semibold text-slate-500 uppercase">Announcements</div>
                {searchResults.announcements.map(a => (
                  <div key={a.id} className="px-4 py-3 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors flex items-center gap-3">
                    <div className="p-1.5 rounded-md bg-indigo-50 text-indigo-600 shrink-0">
                      <Megaphone className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800 line-clamp-1">{a.title}</p>
                      <p className="text-xs text-slate-500 capitalize">{a.announcement_type}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-4">
        {pushPermission === 'default' && (
          <button onClick={handleEnablePush} className="hidden md:flex text-xs font-semibold bg-sky-50 text-sky-600 hover:bg-sky-100 px-3 py-1.5 rounded-full items-center gap-1.5 transition-colors border border-sky-200">
            <Bell className="w-3.5 h-3.5" />
            Enable Push Notifications
          </button>
        )}
        
        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-full text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            title="View Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse border border-white"></span>
            )}
          </button>
          
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50 transform origin-top-right transition-all">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-semibold text-slate-800 text-sm">Recent Activity</h3>
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{unreadCount} New</span>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-sm">No new notifications</div>
                ) : (
                  notifications.map((notif, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => handleNotificationClick(notif)}
                      className="px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3"
                    >
                      <div className="mt-0.5 bg-indigo-50 p-1.5 rounded-full text-indigo-600 flex-shrink-0">
                        <Megaphone className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{notif.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{notif.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div onClick={handleMarkAllAsRead} className="p-2 bg-slate-50 border-t border-slate-100 text-center cursor-pointer hover:bg-slate-100 transition-colors text-indigo-600 text-xs font-semibold">
                Mark all as read
              </div>
            </div>
          )}
        </div>

        {/* User Dropdown */}
        <div className="relative" ref={userRef}>
          <button 
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-indigo-600 transition-colors p-1.5 rounded-md hover:bg-indigo-50"
            title="User Settings & Logout"
          >
            {user?.profile_picture ? (
              <img src={user.profile_picture.replace(/^https?:\/\/[^\/]+/, '')} alt="Profile" className="w-6 h-6 rounded-full object-cover shadow-sm border border-slate-200" />
            ) : (
              <User className="w-4 h-4" />
            )}
            <span className="font-medium">{user?.first_name || user?.username || 'Admin'}</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          {showUserDropdown && (
            <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-50">
              <button onClick={logout} className="w-full text-left px-4 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors">
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}