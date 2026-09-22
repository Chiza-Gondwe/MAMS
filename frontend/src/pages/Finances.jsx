import { useState, useEffect } from 'react';
import { api } from '../api';
import { Banknote, Plus, Search, FileText, CheckCircle2, Calendar, Trash2, Tags } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Finances() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  
  const [activeTab, setActiveTab] = useState('contributions');
  const [donations, setDonations] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [members, setMembers] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [showManageLedgersModal, setShowManageLedgersModal] = useState(false);
  
  const [newDonation, setNewDonation] = useState({
    member_id: '',
    ledger_account_id: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    service_type: 'Regular Service',
    session: 'Morning',
    status: 'Completed'
  });
  
  const [newLedger, setNewLedger] = useState({ name: '', description: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [donRes, ledRes, memRes] = await Promise.all([
        api.getDonations(),
        api.getLedgerAccounts(),
        isAdmin ? api.getMembers() : Promise.resolve({ results: [] })
      ]);
      
      let allDonations = donRes.results || donRes || [];
      if (!isAdmin) {
        allDonations = allDonations.filter(d => d.member === user?.member_id || (d.member?.id && d.member.id === user?.member_id));
      }
      
      setDonations(allDonations);
      setLedgers(ledRes.results || ledRes || []);
      setMembers(memRes.results || memRes || []);
    } catch (err) {
      console.error("Failed to fetch finance data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordContribution = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        member: newDonation.member_id || null,
        ledger_account: newDonation.ledger_account_id,
        amount: newDonation.amount,
        date: newDonation.date,
        service_type: newDonation.service_type,
        session: newDonation.session,
        status: newDonation.status
      };
      await api.createDonation(payload);
      setShowAddModal(false);
      setNewDonation({ ...newDonation, member_id: '', amount: '' });
      fetchData();
    } catch (err) {
      alert("Failed to record contribution");
    }
  };

  const handleAddLedger = async (e) => {
    e.preventDefault();
    try {
      await api.createLedgerAccount(newLedger);
      setShowLedgerModal(false);
      setNewLedger({ name: '', description: '' });
      fetchData();
    } catch (err) {
      alert("Failed to add ledger category");
    }
  };

  const handleDeleteLedger = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete the category "${name}"?`)) {
      try {
        await api.deleteLedgerAccount(id);
        fetchData();
      } catch (err) {
        alert("Failed to delete category");
      }
    }
  };

  const totalCollected = donations.reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);

  const getMemberName = (memberData) => {
    if (!memberData) return 'Anonymous';
    if (typeof memberData === 'object' && memberData.first_name) return `${memberData.first_name} ${memberData.last_name}`;
    if (!isAdmin && user && (memberData === user.member_id)) {
      return `${user.first_name || user.username} ${user.last_name || ''}`.trim() || 'Me';
    }
    const m = members.find(x => x.id === memberData);
    return m ? `${m.first_name} ${m.last_name}` : 'Unknown Member';
  };

  const getLedgerName = (ledgerId) => {
    if (typeof ledgerId === 'object' && ledgerId?.name) return ledgerId.name;
    const l = ledgers.find(x => x.id === ledgerId);
    return l ? l.name : 'General';
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading financial records...</div>;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{isAdmin ? 'Finances & Contributions' : 'My Contributions'}</h1>
          <p className="text-sm text-slate-500 mt-1">{isAdmin ? 'Manage and view financial contribution records securely.' : 'View your personal giving history.'}</p>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setShowManageLedgersModal(true)} className="px-4 py-2 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center gap-2">
              <Tags className="w-4 h-4 text-sky-600" /> Manage Categories
            </button>
            <button onClick={() => setShowLedgerModal(true)} className="px-4 py-2 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Category
            </button>
            <button onClick={() => setShowAddModal(true)} className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-sm font-semibold transition-all shadow-sm shadow-indigo-200 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Record Contribution
            </button>
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
              <Banknote className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Recorded</p>
              <h3 className="text-2xl font-bold text-slate-800 font-mono">ZK {totalCollected.toFixed(2)}</h3>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Entries</p>
              <h3 className="text-2xl font-bold text-slate-800 font-mono">{donations.length}</h3>
            </div>
          </div>
          <div 
            onClick={() => setShowManageLedgersModal(true)}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:border-sky-300 hover:shadow-md transition-all cursor-pointer group"
            title="Click to manage categories"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-sky-100 flex items-center justify-center text-sky-600 group-hover:bg-sky-200 transition-colors">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Active Categories</p>
                <h3 className="text-2xl font-bold text-slate-800 font-mono">{ledgers.length}</h3>
              </div>
            </div>
            <span className="text-xs font-semibold text-sky-600 group-hover:translate-x-0.5 transition-transform">
              Manage →
            </span>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/50 p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex gap-4 w-full sm:w-auto">
            <button className="text-sm font-semibold text-indigo-600 border-b-2 border-indigo-600 pb-1">
              Contribution History
            </button>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search records..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500">
                <th className="p-4 font-semibold">Date</th>
                <th className="p-4 font-semibold">Member</th>
                <th className="p-4 font-semibold">Category</th>
                <th className="p-4 font-semibold">Amount</th>
                <th className="p-4 font-semibold">Status</th>
                {isAdmin && <th className="p-4 font-semibold text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {donations.filter(d => getMemberName(d.member).toLowerCase().includes(searchTerm.toLowerCase())).map((donation) => (
                <tr key={donation.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-600 font-medium">{donation.date}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm font-medium text-slate-800">{getMemberName(donation.member)}</td>
                  <td className="p-4 text-sm text-slate-600">
                    <span className="px-2 py-1 bg-slate-100 rounded-md text-xs font-medium text-slate-600">
                      {getLedgerName(donation.ledger_account)}
                    </span>
                  </td>
                  <td className="p-4 text-sm font-bold text-emerald-600 font-mono">ZK {parseFloat(donation.amount).toFixed(2)}</td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
                      <CheckCircle2 className="w-3 h-3" /> {donation.status}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="p-4 text-right">
                      <button 
                        onClick={async () => {
                          if(window.confirm('Are you sure you want to delete this contribution?')) {
                            try {
                              await api.deleteDonation(donation.id);
                              fetchData();
                            } catch (e) {
                              alert('Failed to delete contribution');
                            }
                          }
                        }}
                        className="text-red-500 hover:text-red-700 text-xs font-medium px-2 py-1 bg-red-50 rounded"
                      >
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {donations.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-500 text-sm">
                    No contribution records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Contribution Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in-up">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-semibold text-slate-800">Record Contribution</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleRecordContribution} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Member (Optional)</label>
                <select 
                  value={newDonation.member_id}
                  onChange={e => setNewDonation({...newDonation, member_id: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400"
                >
                  <option value="">Anonymous / Not a member</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Category / Ledger</label>
                <select 
                  value={newDonation.ledger_account_id}
                  onChange={e => setNewDonation({...newDonation, ledger_account_id: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400"
                  required
                >
                  <option value="">Select Category...</option>
                  {ledgers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Amount (ZK)</label>
                  <input 
                    type="number" step="0.01" min="0"
                    value={newDonation.amount}
                    onChange={e => setNewDonation({...newDonation, amount: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:border-indigo-400"
                    placeholder="0.00" required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Date</label>
                  <input 
                    type="date"
                    value={newDonation.date}
                    onChange={e => setNewDonation({...newDonation, date: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400"
                    required
                  />
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-sm">Save Record</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Ledger Modal */}
      {showLedgerModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-fade-in-up">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-semibold text-slate-800">Add Category</h3>
              <button onClick={() => setShowLedgerModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleAddLedger} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Category Name</label>
                <input 
                  type="text"
                  value={newLedger.name}
                  onChange={e => setNewLedger({...newLedger, name: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400"
                  placeholder="e.g. Sunday Tithe, PTA Fund" required
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowLedgerModal(false)} className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-sm">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Categories Modal */}
      {showManageLedgersModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in-up">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-sky-100 text-sky-600 rounded-lg">
                  <Tags className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">Manage Categories</h3>
                  <p className="text-xs text-slate-500">View and remove fund categories</p>
                </div>
              </div>
              <button onClick={() => setShowManageLedgersModal(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">✕</button>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {ledgers.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                    <Tags className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-600">No active categories</p>
                  <p className="text-xs text-slate-400 mt-1 mb-4">You haven't created any contribution categories yet.</p>
                  <button
                    onClick={() => {
                      setShowManageLedgersModal(false);
                      setShowLedgerModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 shadow-sm transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Category
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {ledgers.map(ledger => {
                    const count = donations.filter(d => (typeof d.ledger_account === 'object' ? d.ledger_account?.id : d.ledger_account) === ledger.id).length;
                    return (
                      <div key={ledger.id} className="p-3 bg-slate-50/80 hover:bg-slate-100/70 border border-slate-200/70 rounded-xl flex items-center justify-between transition-colors">
                        <div>
                          <h4 className="font-semibold text-sm text-slate-800">{ledger.name}</h4>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {count} {count === 1 ? 'record' : 'records'}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteLedger(ledger.id, ledger.name)}
                          className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200/60 px-2.5 py-1.5 rounded-lg transition-colors"
                          title="Delete Category"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
              <button
                onClick={() => {
                  setShowManageLedgersModal(false);
                  setShowLedgerModal(true);
                }}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add New Category
              </button>
              <button
                onClick={() => setShowManageLedgersModal(false)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
