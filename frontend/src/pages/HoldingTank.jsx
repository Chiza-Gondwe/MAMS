import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';

export default function HoldingTank() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-900 to-indigo-900 p-6">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Account Under Review</h1>
        <p className="text-slate-600 mb-6">
          Hi {user?.first_name}, your account is currently in the holding tank waiting for approval from an organization administrator. You will be granted access once your profile is verified.
        </p>
        <button 
          onClick={logout}
          className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors font-medium"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </div>
  );
}
