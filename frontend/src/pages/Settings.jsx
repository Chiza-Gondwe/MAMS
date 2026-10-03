import { useState, useEffect } from 'react';
import { Save, Building, Mail, ShieldAlert, CheckCircle2, Loader2 } from 'lucide-react';
import { api } from '../api';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  const [settings, setSettings] = useState({
    name: '',
    org_code: '',
    org_type: 'CHURCH',
    address: '',
    phone: '',
    email: '',
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
    use_tls: true
  });

  const fetchSettings = () => {
    setLoading(true);
    api.getSettings()
      .then(data => {
        setSettings({
          name: data.name || '',
          org_code: data.org_code || '',
          org_type: data.org_type || 'CHURCH',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          smtp_host: data.smtp_host || '',
          smtp_port: data.smtp_port || 587,
          smtp_user: data.smtp_user || '',
          smtp_password: '', // We don't fetch the password
          use_tls: data.use_tls !== undefined ? data.use_tls : true
        });
      })
      .catch(err => {
        console.error(err);
        // If settings don't exist yet, it's fine, we'll create them on save
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    
    // Only send password if it was actually changed
    const payload = { ...settings };
    if (!payload.smtp_password) {
      delete payload.smtp_password;
    }

    try {
      await api.updateSettings(payload);
      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error(err);
      setMessage('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">System Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Manage global configurations for the application</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row min-h-[500px]">
        
        {/* Sidebar Tabs */}
        <div className="w-full md:w-64 bg-slate-50 border-r border-slate-200 flex flex-col p-4">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors mb-1 ${activeTab === 'profile' ? 'bg-sky-50 text-sky-700' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <Building className="w-4 h-4" />
            Church Profile
          </button>
          
          <button 
            onClick={() => setActiveTab('email')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors mb-1 ${activeTab === 'email' ? 'bg-sky-50 text-sky-700' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <Mail className="w-4 h-4" />
            Email Configuration
          </button>

          <div className="mt-auto pt-4 border-t border-slate-200">
            <button 
              onClick={() => setActiveTab('security')}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'security' ? 'bg-red-50 text-red-700' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <ShieldAlert className="w-4 h-4" />
              Security & Resets
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8">
          <form onSubmit={handleSave}>
            
            {activeTab === 'profile' && (
              <div className="animate-in fade-in duration-300 space-y-6">
                <h2 className="text-lg font-bold text-slate-800 mb-6 border-b border-slate-100 pb-2">Organization Details</h2>
                
                {settings.org_code && (
                  <div className="bg-sky-50 border border-sky-200 rounded-xl p-5 flex flex-col sm:flex-row items-center gap-5">
                    <div className="bg-white p-2.5 rounded-xl border border-sky-200 shrink-0 shadow-sm">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(`${window.location.origin}/register?org_code=${encodeURIComponent(settings.org_code)}`)}`}
                        alt="Organization Join QR Code"
                        className="w-32 h-32"
                      />
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                      <p className="text-xs font-bold uppercase tracking-wider text-sky-700">Organization Join Code & QR</p>
                      <p className="text-xl font-mono font-bold text-slate-800 tracking-widest mt-1">{settings.org_code}</p>
                      <p className="text-xs text-slate-600 mt-1">
                        Share this QR code or join code with new {settings.org_type === 'PTA' ? 'parents and teachers' : 'congregation members'} so they can register directly into <strong>{settings.name || 'your organization'}</strong>.
                      </p>
                      <div className="mt-3.5 flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(`${window.location.origin}/register?org_code=${encodeURIComponent(settings.org_code)}`)}`;
                            const orgTitle = settings.name || 'Organization';
                            const isPTA = settings.org_type === 'PTA';
                            const win = window.open('', '_blank');
                            win.document.write(`
                              <!DOCTYPE html>
                              <html>
                                <head>
                                  <title>${orgTitle} - Join QR Poster</title>
                                  <style>
                                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; text-align: center; padding: 40px; margin: 0; background: #fff; }
                                    .poster { max-width: 650px; margin: 0 auto; border: 4px solid #1e3a8a; border-radius: 24px; padding: 40px 30px; box-sizing: border-box; }
                                    h1 { font-size: 32px; color: #0f172a; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px; }
                                    h2 { font-size: 20px; color: #2563eb; margin: 0 0 24px 0; font-weight: 600; }
                                    .qr-wrapper { margin: 15px auto; padding: 18px; background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 20px; display: inline-block; }
                                    .qr-wrapper img { width: 340px; height: 340px; display: block; }
                                    .code-box { font-size: 28px; font-weight: 800; letter-spacing: 3px; color: #1e3a8a; background: #eff6ff; border: 2px solid #bfdbfe; padding: 10px 26px; border-radius: 12px; display: inline-block; margin-top: 16px; }
                                    .instructions { font-size: 17px; color: #334155; margin: 22px 0 8px 0; font-weight: bold; }
                                  </style>
                                </head>
                                <body>
                                  <div class="poster">
                                    <h1>${orgTitle}</h1>
                                    <h2>Scan to Join Our ${isPTA ? 'School / PTA' : 'Congregation'} on MAMS</h2>
                                    <div class="qr-wrapper">
                                      <img src="${qrUrl}" alt="Join QR Code" />
                                    </div>
                                    <br />
                                    <div class="code-box">${settings.org_code}</div>
                                    <p class="instructions">Scan this QR code in the MAMS Mobile App (or with your phone camera) to register!</p>
                                  </div>
                                  <script>window.onload = function() { window.print(); };</script>
                                </body>
                              </html>
                            `);
                            win.document.close();
                          }}
                          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                        >
                          Print Big Join Poster
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=800x800&format=png&data=${encodeURIComponent(`${window.location.origin}/register?org_code=${encodeURIComponent(settings.org_code)}`)}`;
                              const response = await fetch(qrUrl);
                              const blob = await response.blob();
                              const blobUrl = URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.href = blobUrl;
                              link.download = `${(settings.name || 'Organization').replace(/\s+/g, '-')}-${settings.org_code}-QR.png`;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              URL.revokeObjectURL(blobUrl);
                            } catch {
                              window.open(`https://api.qrserver.com/v1/create-qr-code/?size=800x800&format=png&data=${encodeURIComponent(`${window.location.origin}/register?org_code=${encodeURIComponent(settings.org_code)}`)}`, '_blank');
                            }
                          }}
                          className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg shadow-sm transition-colors"
                        >
                          Download High-Res QR (PNG)
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Official Organization Name</label>
                    <input type="text" name="name" value={settings.name} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-400" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Physical Address</label>
                    <input type="text" name="address" value={settings.address} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-400" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number(s)</label>
                      <input 
                        type="text" 
                        name="phone" 
                        value={settings.phone} 
                        onChange={handleChange} 
                        placeholder="+260XXXXXXXX, 09XXXXXXXX"
                        className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-400" 
                      />
                      <p className="text-xs text-slate-400 mt-1">Separate multiple numbers with commas.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Contact Email</label>
                      <input type="email" name="email" value={settings.email} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-400" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'email' && (
              <div className="animate-in fade-in duration-300 space-y-6">
                <h2 className="text-lg font-bold text-slate-800 mb-6 border-b border-slate-100 pb-2">SMTP Server Configuration</h2>
                <p className="text-sm text-slate-500 mb-6">Enter your email provider credentials (e.g., Gmail App Password, SendGrid, Amazon SES) to enable real newsletter sending.</p>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">SMTP Host</label>
                      <input type="text" name="smtp_host" value={settings.smtp_host} onChange={handleChange} placeholder="smtp.gmail.com" className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-400" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Port</label>
                      <input type="number" name="smtp_port" value={settings.smtp_port} onChange={handleChange} placeholder="587" className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-400" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">SMTP Username</label>
                    <input type="text" name="smtp_user" value={settings.smtp_user} onChange={handleChange} placeholder="your-email@gmail.com" className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-400" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">SMTP Password (Leave blank to keep existing)</label>
                    <input type="password" name="smtp_password" value={settings.smtp_password} onChange={handleChange} placeholder="••••••••••••" className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-400" />
                  </div>

                  <div className="flex items-center mt-4">
                    <input type="checkbox" id="use_tls" name="use_tls" checked={settings.use_tls} onChange={handleChange} className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded" />
                    <label htmlFor="use_tls" className="ml-2 block text-sm text-slate-700">
                      Use TLS Security (Recommended)
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="animate-in fade-in duration-300 space-y-6">
                <h2 className="text-lg font-bold text-red-600 mb-6 border-b border-red-100 pb-2">Danger Zone</h2>
                <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                  <h3 className="text-sm font-semibold text-red-800">Reset System Data</h3>
                  <p className="text-xs text-red-600 mt-1 mb-4">This action is irreversible and will permanently delete records.</p>
                  <button type="button" className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg opacity-50 cursor-not-allowed">
                    Wipe Database (Disabled)
                  </button>
                </div>
              </div>
            )}

            {/* Save Actions */}
            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
              <div>
                {message && (
                  <span className={`text-sm font-medium flex items-center gap-1 ${message.includes('success') ? 'text-emerald-600' : 'text-red-600'}`}>
                    {message.includes('success') && <CheckCircle2 className="w-4 h-4" />} {message}
                  </span>
                )}
              </div>
              <button 
                type="submit" 
                disabled={saving || activeTab === 'security'}
                className="btn-primary flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Settings
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
