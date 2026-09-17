// pages/Login.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [throttleSeconds, setThrottleSeconds] = useState(0);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let timer = null;
    if (throttleSeconds > 0) {
      timer = setInterval(() => {
        setThrottleSeconds((prev) => {
          if (prev <= 1) {
            setError(''); // Clear error when done
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [throttleSeconds]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (throttleSeconds > 0) return;
    
    const result = await login(username, password);
    if (result.success) {
      const returnTo = location.state?.returnTo || '/dashboard';
      navigate(returnTo);
    } else {
      if (result.error === 'account_not_verified') {
        setError('not_verified');
      } else {
        setError(result.error);
        const match = result.error.match(/Expected available in (\d+) seconds/);
        if (match) {
          setThrottleSeconds(parseInt(match[1], 10));
        } else {
          setThrottleSeconds(0);
        }
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
      
      <div className="w-full max-w-sm bg-white/70 backdrop-blur-2xl px-8 py-10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.1)] relative z-10 border border-white/40">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold bg-gradient-to-br from-sky-800 to-indigo-900 bg-clip-text text-transparent tracking-tight">MAMS</h1>
          <p className="text-sm text-slate-600 mt-2 font-medium">Membership Affiliation & Management System</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Username / Email</label>
            <input
              type="text"
              placeholder="admin@organization.com"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-slate-200/60 rounded-xl text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all shadow-sm"
              required
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">Password</label>
              <span onClick={() => navigate('/forgot-password')} className="text-xs font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer transition-colors">Forgot Password?</span>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-200/60 rounded-xl text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all pr-10 shadow-sm"
                required
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[46%] -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
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
            <p className="text-red-500 text-sm font-medium text-center bg-red-50 py-2 rounded-lg">
              {throttleSeconds > 0 ? `Request was throttled. Expected available in ${throttleSeconds} seconds.` : error}
            </p>
          ) : null}
          <button 
            type="submit" 
            disabled={throttleSeconds > 0}
            className={`w-full text-white font-semibold py-3 rounded-xl transition-all duration-300 shadow-lg mt-2 ${throttleSeconds > 0 ? 'bg-slate-400 cursor-not-allowed shadow-none' : 'bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 shadow-indigo-600/30 hover:shadow-indigo-500/40 hover:-translate-y-0.5'}`}
          >
            {throttleSeconds > 0 ? `Wait ${throttleSeconds}s` : 'Sign in'}
          </button>
        </form>
        <div className="mt-10 text-center space-y-2">
          <p className="text-sm text-slate-500">
            Are you a member? <span onClick={() => navigate('/register')} className="text-indigo-600 font-medium hover:text-indigo-700 cursor-pointer transition-colors">Join an existing organization</span>
          </p>
          <p className="text-sm text-slate-500">
            Are you a Leader/Admin? <span onClick={() => navigate('/register-church')} className="text-indigo-600 font-medium hover:text-indigo-700 cursor-pointer transition-colors">Register a new organization</span>
          </p>
        </div>
      </div>
    </div>
  );
}
