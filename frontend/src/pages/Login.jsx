// pages/Login.jsx
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(username, password);
    if (result.success) {
      const returnTo = location.state?.returnTo || '/dashboard';
      navigate(returnTo);
    } else {
      if (result.error === 'account_not_verified') {
        setError('not_verified');
      } else {
        setError(result.error);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-sky-950 to-indigo-950 relative overflow-hidden">
      {/* Animated Background Shapes */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-sky-600/30 rounded-full mix-blend-screen filter blur-[100px] animate-float"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-600/30 rounded-full mix-blend-screen filter blur-[100px] animate-float-reverse"></div>
      <div className="absolute top-[40%] left-[60%] w-72 h-72 bg-rose-600/20 rounded-full mix-blend-screen filter blur-[100px] animate-float-delayed"></div>
      
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 pointer-events-none"></div>
      
      <div className="w-full max-w-sm bg-white/70 backdrop-blur-2xl p-8 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.1)] relative z-10 border border-white/40">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold bg-gradient-to-br from-sky-800 to-indigo-900 bg-clip-text text-transparent tracking-tight">MAMS</h1>
          <p className="text-sm text-slate-600 mt-2 font-medium">Membership Affiliation & Management System</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Username / Email</label>
            <input
              type="text"
              placeholder="admin@organization.com"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all pr-10"
                required
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                tabIndex="-1"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {location.state?.message && <p className="text-emerald-600 text-sm font-medium text-center bg-emerald-50 py-2 rounded-lg">{location.state.message}</p>}
          {error === 'not_verified' ? (
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 text-center">
              <p className="text-amber-800 text-sm font-medium mb-2">Please verify your email</p>
              <button 
                type="button" 
                onClick={() => navigate(`/verify-email?email=${encodeURIComponent(username)}`)}
                className="text-xs bg-amber-100 hover:bg-amber-200 text-amber-800 font-semibold py-1.5 px-3 rounded transition-colors"
              >
                Go to Verification Page
              </button>
            </div>
          ) : error ? (
            <p className="text-red-500 text-sm font-medium text-center bg-red-50 py-2 rounded-lg">{error}</p>
          ) : null}
          <button type="submit" className="w-full bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-semibold py-3 rounded-xl transition-all duration-300 shadow-lg shadow-sky-600/30 hover:shadow-sky-500/40 hover:-translate-y-0.5 mt-2">Sign in</button>
        </form>
        <div className="mt-8 text-center space-y-2">
          <p className="text-sm text-slate-500">
            Are you a member? <span onClick={() => navigate('/register')} className="text-sky-600 font-medium hover:text-sky-700 cursor-pointer transition-colors">Join an existing church</span>
          </p>
          <p className="text-sm text-slate-500">
            Are you a Pastor? <span onClick={() => navigate('/register-church')} className="text-indigo-600 font-medium hover:text-indigo-700 cursor-pointer transition-colors">Register a new church</span>
          </p>
        </div>
      </div>
    </div>
  );
}
