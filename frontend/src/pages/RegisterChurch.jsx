import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Eye, EyeOff, Building2, CheckCircle2, User, Key, Mail, Phone } from 'lucide-react';

export default function RegisterChurch() {
  const [formData, setFormData] = useState({
    church_name: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: ''
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await api.registerChurch(formData);
      setSuccessData(response);
    } catch (err) {
      if (err.cause && typeof err.cause === 'object') {
        const firstErrorKey = Object.keys(err.cause)[0];
        setError(`${firstErrorKey}: ${err.cause[firstErrorKey][0]}`);
      } else {
        setError(err.message || 'Failed to register church. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({...prev, [e.target.name]: e.target.value}));
  };

  if (successData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-sky-950 to-emerald-900 py-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="w-full max-w-md bg-white/95 backdrop-blur-xl p-8 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative z-10 border border-white/20 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Church Registered!</h2>
          <p className="text-slate-600 mb-6">You are now the admin for <strong>{successData.organization?.name}</strong>.</p>
          
          <div className="bg-sky-50 border border-sky-100 p-4 rounded-xl mb-6">
            <h3 className="text-sky-800 font-medium mb-1 text-sm">Your Organization Code</h3>
            <p className="text-xs text-sky-600 mb-3">Share this code with your members so they can join your church.</p>
            <div className="bg-white px-4 py-3 border border-sky-200 rounded-lg text-lg font-bold text-sky-700 tracking-wider">
              {successData.org_code}
            </div>
          </div>
          
          <button 
            onClick={() => navigate('/login')} 
            className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-medium shadow-sm transition-all"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-sky-950 to-emerald-900 py-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
      <div className="w-full max-w-md bg-white/95 backdrop-blur-xl p-8 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative z-10 border border-white/20">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Building2 className="w-6 h-6 text-sky-600" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-800">Register Your Church</h1>
          <p className="text-sm text-slate-500 mt-1">Create a new workspace for your congregation</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Church Name</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                name="church_name"
                value={formData.church_name}
                onChange={handleChange}
                placeholder="e.g. Grace Fellowship Church"
                className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-400"
                required
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Admin Details</p>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-400"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-400"
                  required
                />
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-400"
                  required
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number (Optional)</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-400"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-10 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-400"
                  required
                  minLength={6}
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
          </div>

          {error && <p className="text-red-500 text-sm p-3 bg-red-50 rounded-lg border border-red-100 mt-2">{error}</p>}
          
          <button type="submit" disabled={loading} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm transition-all mt-4 disabled:opacity-50">
            {loading ? 'Registering...' : 'Create Church Workspace'}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500">
            Are you a member? <span onClick={() => navigate('/register')} className="text-sky-600 hover:underline cursor-pointer font-medium">Join an existing church</span>
          </p>
          <p className="text-sm text-slate-500 mt-2">
            Already registered? <span onClick={() => navigate('/login')} className="text-sky-600 hover:underline cursor-pointer font-medium">Sign in</span>
          </p>
        </div>
      </div>
    </div>
  );
}
