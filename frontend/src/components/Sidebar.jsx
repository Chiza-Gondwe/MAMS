import { NavLink, Link } from 'react-router-dom';
import { LayoutDashboard, Users, Calendar, Megaphone, BarChart3, Settings, Mail, CalendarDays, BookOpen, Building2, Banknote, Map, MessageSquare, X } from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/dashboard/chat', label: 'Group Chat', icon: MessageSquare },
  { path: '/dashboard/members', label: 'Members', icon: Users },
  { path: '/dashboard/map', label: 'Member Map', icon: Map },
  { path: '/dashboard/sections', label: 'Sections', icon: Users },
  { path: '/dashboard/zones', label: 'Zones', icon: Users },
  { path: '/dashboard/ministries', label: 'Groups & Ministries', icon: Users },
  { path: '/dashboard/students', label: 'Students & PTA', icon: BookOpen },
  { path: '/dashboard/attendance', label: 'Attendance', icon: Calendar },
  { path: '/dashboard/finances', label: 'Finances', icon: Banknote },
  { path: '/dashboard/events', label: 'Events & Meetings', icon: CalendarDays },
  { path: '/dashboard/announcements', label: 'Announcements', icon: Megaphone },
  { path: '/dashboard/communications', label: 'Communications', icon: Mail },
  { path: '/dashboard/sermons', label: 'Sermons & Media', icon: Megaphone },
  { path: '/dashboard/prayer', label: 'Prayer Wall', icon: Users },
  { path: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/dashboard/settings', label: 'Settings', icon: Settings },
];

import { useAuth } from '../context/AuthContext';

export default function Sidebar({ isOpen = false, onClose = () => {} }) {
  const { user } = useAuth();
  const activeUser = user || { username: 'Admin', role: 'admin' };

  const isSuperadmin = activeUser.role === 'superadmin';
  const isMember = activeUser.role === 'member';
  const orgType = activeUser.org_type || 'CHURCH';
  
  const superadminNavItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/dashboard/organizations', label: 'Organizations', icon: Building2 },
    { path: '/dashboard/analytics', label: 'Global Analytics', icon: BarChart3 },
    { path: '/dashboard/settings', label: 'Settings', icon: Settings },
  ];

  let displayNavItems = navItems.map(item => {
    if (orgType === 'PTA') {
      if (item.label === 'Sections') return { ...item, label: 'Classes' };
      if (item.label === 'Zones') return { ...item, label: 'Grades' };
      if (item.label === 'Groups & Ministries') return { ...item, label: 'Committees & Activities' };
    }
    return item;
  });

  if (isSuperadmin) {
    displayNavItems = superadminNavItems;
  } else if (isMember && activeUser.role !== 'section_admin' && activeUser.role !== 'zone_admin' && activeUser.role !== 'group_leader') {
    displayNavItems = [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/dashboard/chat', label: 'Group Chat', icon: MessageSquare },
      { path: '/dashboard/members', label: 'Directory', icon: Users },
      { path: '/dashboard/map', label: 'Member Map', icon: Map },
      { path: '/dashboard/events', label: 'Events & Meetings', icon: CalendarDays },
      { path: '/dashboard/sermons', label: 'Sermons & Media', icon: Megaphone },
      { path: '/dashboard/prayer', label: 'Prayer Wall', icon: Users },
      { path: '/dashboard/finances', label: 'My Contributions', icon: Banknote },
      { path: '/dashboard/profile', label: 'My Profile', icon: Settings },
    ];
  } else if (activeUser.role === 'section_admin' || activeUser.role === 'zone_admin' || activeUser.role === 'group_leader') {
    displayNavItems = [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/dashboard/chat', label: 'Group Chat', icon: MessageSquare },
      { path: '/dashboard/members', label: 'Members', icon: Users },
      { path: '/dashboard/map', label: 'Member Map', icon: Map },
      { path: '/dashboard/attendance', label: 'Attendance', icon: Calendar },
      { path: '/dashboard/announcements', label: 'Announcements', icon: Megaphone },
      { path: '/dashboard/events', label: 'Events & Meetings', icon: CalendarDays },
      { path: '/dashboard/sermons', label: 'Sermons & Media', icon: Megaphone },
      { path: '/dashboard/prayer', label: 'Prayer Wall', icon: Users },
      { path: '/dashboard/finances', label: 'My Contributions', icon: Banknote },
      { path: '/dashboard/profile', label: 'My Profile', icon: Settings },
    ];
  }

  // Filter based on Organization Type if not superadmin and is an admin
  if (!isSuperadmin && activeUser.role === 'admin') {
    if (orgType === 'CHURCH') {
      displayNavItems = displayNavItems.filter(item => item.label !== 'Students & PTA');
    } else if (orgType === 'PTA') {
      displayNavItems = displayNavItems.filter(item => 
        !['Sermons & Media', 'Prayer Wall', 'Students & PTA'].includes(item.label)
      );
    }
  }

  return (
    <aside className={`
      fixed inset-y-0 left-0 z-50 w-72 bg-white/95 md:bg-white/60 backdrop-blur-2xl flex flex-col border-r border-slate-200/80 md:border-white/40 shadow-2xl md:shadow-[4px_0_24px_rgba(0,0,0,0.02)]
      transform transition-transform duration-300 ease-in-out
      md:static md:translate-x-0 md:w-64 md:flex-shrink-0
      ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
    `}>
      <div className="px-6 py-6 md:py-8 relative z-10 shrink-0 flex items-center justify-between">
        <h1 className="text-2xl font-bold bg-gradient-to-br from-sky-700 to-indigo-800 bg-clip-text text-transparent tracking-tight leading-tight truncate">
          {activeUser.org_name ? activeUser.org_name : 'MAMS'}
        </h1>
        <button
          onClick={onClose}
          className="md:hidden p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          title="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <nav className="px-3 space-y-1 flex-1 relative z-10 overflow-y-auto overflow-x-hidden pb-4">
        {displayNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/dashboard'}
            onClick={onClose}
            title={`Navigate to ${item.label}`}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 group ${
                isActive 
                  ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-lg shadow-sky-600/30 border border-transparent' 
                  : 'text-slate-600 hover:bg-white/80 hover:text-sky-700 hover:shadow-sm hover:border-white/50 border border-transparent hover:translate-x-1'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={`w-4 h-4 transition-transform duration-300 ${isActive ? '' : 'group-hover:scale-110'}`} />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
      
      <div className="p-4 mt-auto border-t border-slate-200/50 shrink-0 relative z-10 bg-white/40 backdrop-blur-md">
        <Link 
          to="/dashboard/profile" 
          onClick={onClose}
          className="flex items-center gap-3 w-full group cursor-pointer hover:bg-slate-100 p-2 -mx-2 rounded-lg transition-colors"
        >
          {activeUser?.profile_picture ? (
            <img src={activeUser.profile_picture.replace(/^https?:\/\/[^\/]+/, '')} alt="Profile" className="w-10 h-10 rounded-full object-cover shadow-inner shadow-black/20" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-sm font-bold text-white shadow-inner shadow-white/20">
              {(activeUser?.first_name || activeUser?.username || 'U')[0].toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate leading-tight group-hover:text-sky-700 transition-colors">
              {activeUser?.first_name || activeUser?.username}
            </p>
            <p className="text-xs text-slate-500 capitalize font-medium">{activeUser.role}</p>
          </div>
        </Link>
      </div>
    </aside>
  );
}