import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Eye, EyeOff, Building2, CheckCircle2, User, Key, Mail, Phone } from 'lucide-react';

export default function RegisterChurch() {
  const [formData, setFormData] = useState({
    church_name: '',
    org_type: 'CHURCH',
    city: 'LUSAKA',
    first_name: '',
    middle_name: '',
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
    const joinQrTargetUrl = `${window.location.origin}/register?org_code=${encodeURIComponent(successData.org_code)}`;
    const joinQrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(joinQrTargetUrl)}`;
    const orgName = successData.organization?.name || 'Organization';
    const isPTA = successData.organization?.org_type === 'PTA';

    const handlePrintJoinPoster = () => {
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${orgName} - Join QR Poster</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; text-align: center; padding: 40px; margin: 0; background: #fff; }
              .poster { max-width: 650px; margin: 0 auto; border: 4px solid #0284c7; border-radius: 24px; padding: 40px 30px; box-sizing: border-box; }
              h1 { font-size: 30px; color: #0f172a; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px; }
              h2 { font-size: 20px; color: #0284c7; margin: 0 0 24px 0; font-weight: 600; }
              .qr-wrapper { margin: 15px auto; padding: 16px; background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 20px; display: inline-block; }
              .qr-wrapper img { width: 280px; height: 280px; display: block; }
              .code-box { font-size: 26px; font-weight: 800; letter-spacing: 3px; color: #0369a1; background: #e0f2fe; padding: 10px 24px; border-radius: 12px; display: inline-block; margin-top: 16px; }
              .instructions { font-size: 17px; color: #334155; margin: 20px 0 8px 0; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="poster">
              <h1>${orgName}</h1>
              <h2>Scan to Join Our ${isPTA ? 'School / PTA' : 'Congregation'} on MAMS</h2>
              <div class="qr-wrapper">
                <img src="${joinQrImageUrl}" alt="Join QR Code" />
              </div>
              <br />
              <div class="code-box">${successData.org_code}</div>
              <p class="instructions">Scan this QR code in the MAMS Mobile App (or with your phone camera) to register!</p>
            </div>
            <script>window.onload = function() { window.print(); };</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-sky-950 to-indigo-950 py-12 relative overflow-hidden">
        {/* Animated Background Shapes */}
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-sky-600/30 rounded-full mix-blend-screen filter blur-[100px] animate-float"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-600/30 rounded-full mix-blend-screen filter blur-[100px] animate-float-reverse"></div>
        <div className="absolute top-[40%] left-[60%] w-72 h-72 bg-rose-600/20 rounded-full mix-blend-screen filter blur-[100px] animate-float-delayed"></div>
        
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 pointer-events-none"></div>
        <div className="w-full max-w-md bg-white/70 backdrop-blur-2xl p-8 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.1)] relative z-10 border border-white/40 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Organization Registered!</h2>
          <p className="text-slate-600 mb-5">You are now the admin for <strong>{successData.organization?.name}</strong> ({successData.organization?.city}).</p>
          
          <div className="bg-sky-50 border border-sky-100 p-4 rounded-xl mb-5">
            <h3 className="text-sky-800 font-medium mb-1 text-sm">Organization Join Code & QR</h3>
            <p className="text-xs text-sky-600 mb-3">Members can scan this QR code or enter the code below to join your organization.</p>
            <div className="bg-white p-3 rounded-xl border border-sky-200 inline-block mb-3 shadow-sm">
              <img src={joinQrImageUrl} alt="Organization Join QR Code" className="w-44 h-44 mx-auto" />
            </div>
            <div className="bg-white px-4 py-2.5 border border-sky-200 rounded-lg text-lg font-bold text-sky-700 tracking-wider">
              {successData.org_code}
            </div>
            <button
              type="button"
              onClick={handlePrintJoinPoster}
              className="mt-3 text-xs font-semibold text-sky-700 hover:text-sky-800 underline"
            >
              Print / Save Join QR Poster
            </button>
          </div>
          
          <button 
            onClick={() => navigate('/login')} 
            className="w-full bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-semibold py-3 rounded-xl transition-all duration-300 shadow-lg shadow-sky-600/30 hover:shadow-sky-500/40 hover:-translate-y-0.5 mt-2"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-sky-950 to-indigo-950 py-12 relative overflow-hidden">
      {/* Animated Background Shapes */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-sky-600/30 rounded-full mix-blend-screen filter blur-[100px] animate-float"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-600/30 rounded-full mix-blend-screen filter blur-[100px] animate-float-reverse"></div>
      <div className="absolute top-[40%] left-[60%] w-72 h-72 bg-rose-600/20 rounded-full mix-blend-screen filter blur-[100px] animate-float-delayed"></div>
      
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 pointer-events-none"></div>
      <div className="w-full max-w-md bg-white/70 backdrop-blur-2xl p-8 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.1)] relative z-10 border border-white/40">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Building2 className="w-6 h-6 text-sky-600" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-br from-sky-800 to-indigo-900 bg-clip-text text-transparent tracking-tight">Register Organization</h1>
          <p className="text-sm text-slate-600 mt-2 font-medium">Create a new workspace for your congregation</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Organization Name</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  name="church_name"
                  value={formData.church_name}
                  onChange={handleChange}
                  placeholder="e.g. UCZ Trinity Congregation or St. Jude School"
                  className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-400"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Organization Type</label>
              <select
                name="org_type"
                value={formData.org_type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-400"
                required
              >
                <option value="CHURCH">Church</option>
                <option value="PTA">School / PTA</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">City / Town</label>
              <select
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-400"
                required
              >
                <option value="LUSAKA">Lusaka</option>
                <option value="KITWE">Kitwe</option>
                <option value="NDOLA">Ndola</option>
                <option value="KABWE">Kabwe</option>
                <option value="CHINGOLA">Chingola</option>
                <option value="MUFULIRA">Mufulira</option>
                <option value="LIVINGSTONE">Livingstone</option>
                <option value="LUANSHYA">Luanshya</option>
                <option value="KASAMA">Kasama</option>
                <option value="CHIPATA">Chipata</option>
                <option value="SOLWEZI">Solwezi</option>
                <option value="MANSA">Mansa</option>
                <option value="MONGU">Mongu</option>
                <option value="CHOMA">Choma</option>
                <option value="MAZABUKA">Mazabuka</option>
                <option value="KAFUE">Kafue</option>
              </select>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Admin Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-400"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Middle Name <span className="text-xs text-slate-400 font-normal">(Opt)</span></label>
                <input
                  type="text"
                  name="middle_name"
                  value={formData.middle_name}
                  onChange={handleChange}
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-400"
                />
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="e.g. 0971234567"
                  className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-400"
                  required
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
          
          <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-semibold py-3 rounded-xl transition-all duration-300 shadow-lg shadow-sky-600/30 hover:shadow-sky-500/40 hover:-translate-y-0.5 mt-4 disabled:opacity-50">
            {loading ? 'Registering...' : 'Create Organization Workspace'}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500">
            Are you a member? <span onClick={() => navigate('/register')} className="text-sky-600 hover:underline cursor-pointer font-medium">Join an existing organization</span>
          </p>
          <p className="text-sm text-slate-500 mt-2">
            Already registered? <span onClick={() => navigate('/login')} className="text-sky-600 hover:underline cursor-pointer font-medium">Sign in</span>
          </p>
        </div>
      </div>
    </div>
  );
}
