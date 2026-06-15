// components/Sidebar.jsx
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Calendar, Megaphone, BarChart3, Settings } from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/dashboard/members', label: 'Members', icon: Users },
  { path: '/dashboard/attendance', label: 'Attendance', icon: Calendar },
  { path: '/dashboard/announcements', label: 'Announcements', icon: Megaphone },
  { path: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  return (
    <aside className="w-56 flex-shrink-0 border-r border-slate-200 bg-white">
      <div className="px-4 py-6">
        <h1 className="text-lg font-semibold text-sky-800">MAMS</h1>
        <p className="text-xs text-slate-400 mt-0.5">Church & PTA</p>
      </div>
      <nav className="px-2 space-y-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-all duration-150 ${
                isActive 
                  ? 'bg-sky-50 text-sky-800' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`
            }
          >
            <item.icon className="w-4 h-4" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}