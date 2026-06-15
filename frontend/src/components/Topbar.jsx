// components/Topbar.jsx
import { Search, Bell, User, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

export default function Topbar({ onSearch }) {
  const { logout, user } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-6">
      <div className="relative w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search members, announcements..."
          onChange={(e) => onSearch(e.target.value)}
          className="input-search"
        />
      </div>
      <div className="flex items-center gap-4">
        <button className="text-slate-400 hover:text-slate-600 transition-colors">
          <Bell className="w-5 h-5" />
        </button>
        <div className="relative">
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800"
          >
            <User className="w-4 h-4" />
            <span>{user?.username || 'Admin'}</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-32 bg-white border border-slate-200 rounded-md shadow-sm">
              <button onClick={logout} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-slate-50">Sign out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}