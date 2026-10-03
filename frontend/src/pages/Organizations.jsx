import React, { useState, useEffect } from 'react';
import { Building2, Plus, Users, Search, AlertCircle, CheckCircle2, Trash2, QrCode } from 'lucide-react';
import { api } from '../api';

export default function Organizations() {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Modals state
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [qrOrg, setQrOrg] = useState(null);

  // Forms state
  const [orgForm, setOrgForm] = useState({ name: '', org_type: 'CHURCH', city: 'LUSAKA' });
  const [adminForm, setAdminForm] = useState({ first_name: '', last_name: '', email: '', phone_number: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const data = await api.getSuperadminOrganizations();
      setOrganizations(data.results || data || []);
    } catch (err) {
      setError('Failed to fetch organizations.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrg = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.createSuperadminOrganization(orgForm);
      setShowOrgModal(false);
      setOrgForm({ name: '', org_type: 'CHURCH', city: 'LUSAKA' });
      setSuccessMsg('Organization created successfully.');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchOrganizations();
    } catch (err) {
      alert(err.message || 'Failed to create organization');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOrg = async (orgId, orgName) => {
    if (!window.confirm(`Are you absolutely sure you want to delete ${orgName}? This will wipe all data.`)) return;
    try {
      await api.deleteSuperadminOrganization(orgId);
      setOrganizations(organizations.filter(org => org.id !== orgId));
      setSuccessMsg('Organization deleted successfully.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError('Failed to delete organization.');
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.createLocalAdmin({
        organization_id: selectedOrg.id,
        ...adminForm
      });
      alert('Local Admin created successfully! Their default password is: password123');
      setShowAdminModal(false);
      setAdminForm({ first_name: '', last_name: '', email: '', phone_number: '' });
    } catch (err) {
      alert(err.message || 'Failed to create admin');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-slate-500">Loading organizations...</div>;

  return (
    <div className="max-w-6xl mx-auto py-6">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tenant Organizations</h1>
          <p className="text-sm text-slate-500 mt-1">Manage all registered churches and schools on the platform.</p>
        </div>
        <button 
          onClick={() => setShowOrgModal(true)}
          className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 flex items-center gap-2 text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Organization
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5" /> {error}
        </div>
      )}

      {successMsg && (
        <div className="mb-6 p-4 bg-emerald-50 text-emerald-600 rounded-lg flex items-center gap-3 text-sm">
          <CheckCircle2 className="w-5 h-5" /> {successMsg}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold tracking-wider">
              <tr>
                <th className="px-6 py-4">Organization Name</th>
                <th className="px-6 py-4">Org Code</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">City</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {organizations.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                    No organizations found. Click "Add Organization" to create one.
                  </td>
                </tr>
              ) : (
                organizations.map(org => (
                  <tr key={org.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-sky-600" />
                        </div>
                        <span className="font-medium text-slate-800">{org.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{org.org_code}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{org.org_type}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{org.city}</td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setQrOrg(org)}
                        className="px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors inline-flex items-center gap-1 mr-2"
                      >
                        <QrCode className="w-3 h-3" /> Join QR
                      </button>
                      <button 
                        onClick={() => { setSelectedOrg(org); setShowAdminModal(true); }}
                        className="px-3 py-1.5 text-xs font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-md transition-colors flex items-center gap-1 inline-flex"
                      >
                        <Users className="w-3 h-3" /> Assign Local Admin
                      </button>
                      <button 
                        onClick={() => handleDeleteOrg(org.id, org.name)}
                        className="ml-2 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors flex items-center gap-1 inline-flex"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Organization Join QR Modal */}
      {qrOrg && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center border border-slate-200">
            <h3 className="text-xl font-bold text-slate-800">{qrOrg.name}</h3>
            <p className="text-xs font-semibold text-sky-600 uppercase tracking-wider mt-1">
              {qrOrg.org_type === 'PTA' ? 'School / PTA' : 'Church'} Join QR Code ({qrOrg.city})
            </p>
            <div className="my-5 p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl inline-block">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(`${window.location.origin}/register?org_code=${encodeURIComponent(qrOrg.org_code)}`)}`}
                alt="Organization Join QR Code"
                className="w-56 h-56 mx-auto"
              />
            </div>
            <div className="mb-5">
              <p className="text-xs text-slate-500 mb-1">Organization Join Code</p>
              <span className="inline-block bg-sky-50 border border-sky-200 text-sky-800 font-mono font-bold text-xl px-5 py-2 rounded-xl tracking-widest">
                {qrOrg.org_code}
              </span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&data=${encodeURIComponent(`${window.location.origin}/register?org_code=${encodeURIComponent(qrOrg.org_code)}`)}`;
                  const win = window.open('', '_blank');
                  win.document.write(`
                    <!DOCTYPE html>
                    <html>
                      <head>
                        <title>${qrOrg.name} - Join QR Poster</title>
                        <style>
                          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; text-align: center; padding: 40px; margin: 0; background: #fff; }
                          .poster { max-width: 650px; margin: 0 auto; border: 4px solid #0284c7; border-radius: 24px; padding: 40px 30px; box-sizing: border-box; }
                          h1 { font-size: 30px; color: #0f172a; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px; }
                          h2 { font-size: 20px; color: #0284c7; margin: 0 0 24px 0; font-weight: 600; }
                          .qr-wrapper { margin: 15px auto; padding: 16px; background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 20px; display: inline-block; }
                          .qr-wrapper img { width: 300px; height: 300px; display: block; }
                          .code-box { font-size: 26px; font-weight: 800; letter-spacing: 3px; color: #0369a1; background: #e0f2fe; padding: 10px 24px; border-radius: 12px; display: inline-block; margin-top: 16px; }
                          .instructions { font-size: 17px; color: #334155; margin: 20px 0 8px 0; font-weight: bold; }
                        </style>
                      </head>
                      <body>
                        <div class="poster">
                          <h1>${qrOrg.name}</h1>
                          <h2>Scan to Join Our ${qrOrg.org_type === 'PTA' ? 'School / PTA' : 'Congregation'} on MAMS</h2>
                          <div class="qr-wrapper">
                            <img src="${qrImg}" alt="Join QR Code" />
                          </div>
                          <br />
                          <div class="code-box">${qrOrg.org_code}</div>
                          <p class="instructions">Scan this QR code in the MAMS Mobile App (or with your phone camera) to register!</p>
                        </div>
                        <script>window.onload = function() { window.print(); };</script>
                      </body>
                    </html>
                  `);
                  win.document.close();
                }}
                className="flex-1 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
              >
                Print Join Poster
              </button>
              <button
                onClick={() => setQrOrg(null)}
                className="px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold py-2.5 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Organization Modal */}
      {showOrgModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-semibold text-slate-800">Add New Organization</h3>
            </div>
            <form onSubmit={handleCreateOrg} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Organization Name</label>
                <input 
                  type="text" required
                  value={orgForm.name} onChange={e => setOrgForm({...orgForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-500" 
                  placeholder="e.g. Grace Chapel Ndola"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
                  <select 
                    value={orgForm.org_type} onChange={e => setOrgForm({...orgForm, org_type: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-500"
                  >
                    <option value="CHURCH">Church</option>
                    <option value="PTA">PTA / School</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">City</label>
                  <select 
                    value={orgForm.city} onChange={e => setOrgForm({...orgForm, city: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-500"
                  >
                    <option value="LUSAKA">Lusaka</option>
                    <option value="KITWE">Kitwe</option>
                    <option value="NDOLA">Ndola</option>
                    <option value="LIVINGSTONE">Livingstone</option>
                    <option value="CHIPATA">Chipata</option>
                  </select>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4 mt-6 border-t border-slate-100">
                <button type="button" onClick={() => setShowOrgModal(false)} className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700 disabled:opacity-50">
                  {isSubmitting ? 'Creating...' : 'Create Organization'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Local Admin Modal */}
      {showAdminModal && selectedOrg && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-sky-50 text-sky-800">
              <h3 className="font-semibold">Assign Admin to {selectedOrg.name}</h3>
              <p className="text-xs text-sky-600 mt-1">They will use these credentials to log into their local dashboard.</p>
            </div>
            <form onSubmit={handleCreateAdmin} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">First Name</label>
                  <input type="text" required value={adminForm.first_name} onChange={e => setAdminForm({...adminForm, first_name: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Last Name</label>
                  <input type="text" required value={adminForm.last_name} onChange={e => setAdminForm({...adminForm, last_name: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
                <input type="email" required value={adminForm.email} onChange={e => setAdminForm({...adminForm, email: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Phone Number</label>
                <input type="text" required value={adminForm.phone_number} onChange={e => setAdminForm({...adminForm, phone_number: e.target.value})} placeholder="e.g. 0971234567" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-500" />
              </div>
              
              <div className="p-3 bg-amber-50 text-amber-800 rounded-lg border border-amber-200 text-xs">
                <strong>Note:</strong> The default password will be <code>password123</code>. The admin can change this after logging in.
              </div>

              <div className="flex gap-3 pt-4 mt-6 border-t border-slate-100">
                <button type="button" onClick={() => setShowAdminModal(false)} className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700 disabled:opacity-50">
                  {isSubmitting ? 'Creating...' : 'Create Admin Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
