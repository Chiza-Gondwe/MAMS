// components/Sidebar.jsx
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Calendar, Megaphone, BarChart3, Settings, Mail, CalendarDays, BookOpen, Building2 } from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/dashboard/members', label: 'Members', icon: Users },
  { path: '/dashboard/sections', label: 'Sections', icon: Users },
  { path: '/dashboard/zones', label: 'Zones', icon: Users },
  { path: '/dashboard/ministries', label: 'Groups & Ministries', icon: Users },
  { path: '/dashboard/students', label: 'Students & PTA', icon: BookOpen },
  { path: '/dashboard/attendance', label: 'Attendance', icon: Calendar },
  { path: '/dashboard/events', label: 'Events & Meetings', icon: CalendarDays },
  { path: '/dashboard/announcements', label: 'Announcements', icon: Megaphone },
  { path: '/dashboard/communications', label: 'Communications', icon: Mail },
  { path: '/dashboard/sermons', label: 'Sermons & Media', icon: Megaphone },
  { path: '/dashboard/prayer', label: 'Prayer Wall', icon: Users },
  { path: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/dashboard/settings', label: 'Settings', icon: Settings },
];

import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
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

  let displayNavItems = navItems;

  if (isSuperadmin) {
    displayNavItems = superadminNavItems;
  } else if (isMember && activeUser.role !== 'section_admin' && activeUser.role !== 'zone_admin' && activeUser.role !== 'group_leader') {
    displayNavItems = [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/dashboard/events', label: 'Events & Meetings', icon: CalendarDays },
      { path: '/dashboard/sermons', label: 'Sermons & Media', icon: Megaphone },
      { path: '/dashboard/prayer', label: 'Prayer Wall', icon: Users },
      { path: '/dashboard/profile', label: 'My Profile', icon: Settings },
    ];
  } else if (activeUser.role === 'section_admin' || activeUser.role === 'zone_admin' || activeUser.role === 'group_leader') {
    displayNavItems = [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/dashboard/members', label: 'Members', icon: Users },
      { path: '/dashboard/attendance', label: 'Attendance', icon: Calendar },
      { path: '/dashboard/announcements', label: 'Announcements', icon: Megaphone },
      { path: '/dashboard/events', label: 'Events & Meetings', icon: CalendarDays },
      { path: '/dashboard/sermons', label: 'Sermons & Media', icon: Megaphone },
      { path: '/dashboard/prayer', label: 'Prayer Wall', icon: Users },
      { path: '/dashboard/profile', label: 'My Profile', icon: Settings },
    ];
  }

  // Filter based on Organization Type if not superadmin and is an admin
  if (!isSuperadmin && activeUser.role === 'admin') {
    if (orgType === 'CHURCH') {
      displayNavItems = displayNavItems.filter(item => item.label !== 'Students & PTA');
    } else if (orgType === 'PTA') {
      displayNavItems = displayNavItems.filter(item => 
        !['Sermons & Media', 'Prayer Wall', 'Sections', 'Zones', 'Groups & Ministries'].includes(item.label)
      );
    }
  }

  return (
    <aside className="w-64 flex-shrink-0 bg-sky-950 flex flex-col border-r border-sky-900/50 shadow-2xl relative z-20">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>
      <div className="px-6 py-8 relative z-10 shrink-0">
        <h1 className="text-2xl font-bold text-white tracking-tight leading-tight">
          {activeUser.org_name ? activeUser.org_name : 'MAMS'}
        </h1>
        <p className="text-xs text-sky-200 mt-1 font-medium leading-tight">
          Membership Affiliation &<br/>Management System
        </p>
      </div>
      <nav className="px-3 space-y-1 flex-1 relative z-10 overflow-y-auto overflow-x-hidden pb-4">
        {displayNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/dashboard'}
            title={`Navigate to ${item.label}`}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                isActive 
                  ? 'bg-gradient-to-r from-sky-600 to-rose-600 text-white shadow-lg shadow-rose-900/20 border border-white/10' 
                  : 'text-sky-100/70 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <item.icon className="w-4 h-4" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      
      <div className="p-4 mt-auto border-t border-slate-800 shrink-0 relative z-10 bg-sky-950">
        <div className="flex items-center gap-3 w-full group">
          <div className="w-9 h-9 rounded-full bg-sky-600 flex items-center justify-center text-sm font-bold text-white shadow-inner">
            {(activeUser?.first_name || activeUser?.username || 'U')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate leading-tight">
              {activeUser?.first_name || activeUser?.username}
            </p>
            <p className="text-xs text-slate-400 capitalize">{activeUser.role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}