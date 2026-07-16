import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Eye, EyeOff, Search, CheckCircle2 } from 'lucide-react';

export default function Register() {
  const [orgCode, setOrgCode] = useState('');
  const [organization, setOrganization] = useState(null);
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    password: '',
    gender: '',
    section_id: '',
    zone_id: '',
    ministries: []
  });
  
  const [ministries, setMinistries] = useState([]);
  const [sections, setSections] = useState([]);
  const [zones, setZones] = useState([]);
  
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const navigate = useNavigate();

  const handleVerifyCode = async () => {
    if (!orgCode.trim()) return;
    setVerifying(true);
    setError('');
    try {
      const data = await api.verifyOrgCode(orgCode);
      setOrganization(data.organization);
      setZones(data.zones || []);
      setSections(data.sections || []);
      setMinistries(data.ministries || []);
    } catch (err) {
      setError(err.message || 'Invalid organization code.');
      setOrganization(null);
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const submitData = { ...formData, organization: organization.id };
      if (!submitData.section_id) delete submitData.section_id;
      if (!submitData.zone_id) delete submitData.zone_id;
      
      await api.register(submitData);
      navigate(`/verify-email?email=${encodeURIComponent(formData.email)}`);
    } catch (err) {
      if (err.cause && typeof err.cause === 'object') {
        const firstErrorKey = Object.keys(err.cause)[0];
        setError(`${firstErrorKey}: ${err.cause[firstErrorKey][0]}`);
      } else {
        setError('Failed to register. Please check your inputs.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({...prev, [e.target.name]: e.target.value}));
  };

  const handleMinistryToggle = (ministryId) => {
    setFormData(prev => {
      const current = prev.ministries;
      if (current.includes(ministryId)) {
        return { ...prev, ministries: current.filter(id => id !== ministryId) };
      } else {
        return { ...prev, ministries: [...current, ministryId] };
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-sky-950 to-indigo-950 py-12 relative overflow-hidden">
      {/* Animated Background Shapes */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-sky-600/30 rounded-full mix-blend-screen filter blur-[100px] animate-float"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-600/30 rounded-full mix-blend-screen filter blur-[100px] animate-float-reverse"></div>
      <div className="absolute top-[40%] left-[60%] w-72 h-72 bg-rose-600/20 rounded-full mix-blend-screen filter blur-[100px] animate-float-delayed"></div>
      
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 pointer-events-none"></div>
      
      <div className="w-full max-w-md bg-white/70 backdrop-blur-2xl p-8 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.1)] relative z-10 border border-white/40">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-br from-sky-800 to-indigo-900 bg-clip-text text-transparent tracking-tight">Create Account</h1>
          <p className="text-sm text-slate-600 mt-2 font-medium">Join the MAMS platform</p>
        </div>
        
        {!organization ? (
          <div className="space-y-4">
            <div className="bg-sky-50 border border-sky-100 p-4 rounded-xl mb-6">
              <h3 className="text-sky-800 font-medium mb-1 text-sm">Organization Code</h3>
              <p className="text-xs text-sky-600 mb-3">Please enter the unique code provided by your organization administrator to join their workspace.</p>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. LUS-C-001"
                  value={orgCode}
                  onChange={(e) => setOrgCode(e.target.value)}
                  className="flex-1 px-3 py-2 border border-sky-200 rounded-lg text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 uppercase"
                />
                <button
                  onClick={handleVerifyCode}
                  disabled={verifying || !orgCode}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {verifying ? 'Checking...' : <><Search className="w-4 h-4" /> Verify</>}
                </button>
              </div>
            </div>
            {error && <p className="text-red-500 text-sm p-3 bg-red-50 rounded-lg border border-red-100">{error}</p>}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-green-50 border border-green-200 p-3 rounded-lg flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-800">{organization.name}</p>
                  <p className="text-xs text-green-600">{organization.city} • {organization.org_type}</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setOrganization(null)}
                className="text-xs text-green-700 hover:underline font-medium"
              >
                Change
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-400"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-400"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-400"
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  name="phone_number"
                  placeholder="e.g. 0971234567"
                  value={formData.phone_number}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-400"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-400"
                  required
                >
                  <option value="">Select Gender</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-400 pr-10"
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Section / Branch (Optional)</label>
                <select
                  value={formData.section_id}
                  onChange={(e) => setFormData({...formData, section_id: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white/50"
                >
                  <option value="">-- None --</option>
                  {sections.map(sec => <option key={sec.id} value={sec.id}>{sec.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Zone (Optional)</label>
                <select
                  value={formData.zone_id}
                  onChange={(e) => setFormData({...formData, zone_id: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white/50"
                >
                  <option value="">-- None --</option>
                  {zones.map(zone => <option key={zone.id} value={zone.id}>{zone.name}</option>)}
                </select>
              </div>
            </div>

            {ministries.length > 0 && (
              <div className="pt-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Join Ministries / Groups (Optional)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border border-slate-200 rounded-md bg-white/50 backdrop-blur-sm">
                  {ministries.map(ministry => (
                    <label key={ministry.id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer p-1.5 hover:bg-white rounded">
                      <input 
                        type="checkbox" 
                        checked={formData.ministries.includes(ministry.id)}
                        onChange={() => handleMinistryToggle(ministry.id)}
                        className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                      />
                      <span>{ministry.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {error && <p className="text-red-500 text-sm p-2 bg-red-50 rounded-md border border-red-100">{error}</p>}
            
            <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-semibold py-3 rounded-xl transition-all duration-300 shadow-lg shadow-sky-600/30 hover:shadow-sky-500/40 hover:-translate-y-0.5 mt-4 disabled:opacity-50">
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>
        )}
        
        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account? <span onClick={() => navigate('/login')} className="text-sky-600 hover:underline cursor-pointer font-medium">Sign in</span>
        </p>
      </div>
    </div>
  );
}
