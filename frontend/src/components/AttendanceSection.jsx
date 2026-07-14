// components/AttendanceSection.jsx - Completely rewritten with proper JWT handling
import { useState, useEffect } from 'react';
import { api } from '../api';
import { formatDateTime } from '../utils';
import { QrCode, Plus, CheckCircle, X, Loader, RefreshCw, AlertCircle, Download } from 'lucide-react';
import { LineChart, Line, Tooltip, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Sample trend data - replace with real API data
const trendData = [
  { week: 'Week 1', attendance: 42 },
  { week: 'Week 2', attendance: 48 },
  { week: 'Week 3', attendance: 55 },
  { week: 'Week 4', attendance: 62 },
];

export default function AttendanceSection() {
  const [sessions, setSessions] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [newSession, setNewSession] = useState({ title: '', session_type: 'church', date: '' });
  const [qrUrl, setQrUrl] = useState('');
  const [scanMemberId, setScanMemberId] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(null);
  const [selectedSessionForQR, setSelectedSessionForQR] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const exportToExcel = () => {
    const exportData = records.map((r, index) => ({
      '#': index + 1,
      'Member': r.member_name || `Member #${r.member_id}`,
      'Event': r.event_title || 'Service',
      'Time': formatDateTime(r.checked_in_at),
      'Status': 'Attended'
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
    XLSX.writeFile(workbook, "MAMS_Attendance_Export.xlsx");
    setShowExportMenu(false);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("MAMS Attendance Export", 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
    
    const tableColumn = ["#", "Member", "Event", "Time", "Status"];
    const tableRows = [];
    
    records.forEach((r, index) => {
      tableRows.push([
        index + 1,
        r.member_name || `Member #${r.member_id}`,
        r.event_title || 'Service',
        formatDateTime(r.checked_in_at),
        'Attended'
      ]);
    });
    
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 35,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [8, 145, 178] }
    });
    
    doc.save("MAMS_Attendance_Export.pdf");
    setShowExportMenu(false);
  };

  const loadData = async (isRefresh = false) => {
    if (isRefresh) {
      setLoading(true);
    }
    try {
      const [sessionsData, recordsData] = await Promise.all([
        api.getSessions(),
        api.getAttendanceRecords()
      ]);
      setSessions(sessionsData.results || []);
      setRecords(recordsData.results || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load attendance data:', err);
      setError(err.message || 'Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData(false);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleCreateSession = async () => {
    if (!newSession.title || !newSession.date) {
      setError('Please fill in all fields');
      return;
    }
    
    setCreateLoading(true);
    setError(null);
    try {
      const data = await api.createSession(newSession);
      if (data.id) {
        setQrUrl(`http://127.0.0.1:8000/media/qr_codes/session_${data.id}.png`);
        setSelectedSessionForQR(data);
        setShowCreateModal(false);
        await loadData();
        // Don't auto-hide QR, let user see it
      }
    } catch (err) {
      console.error('Create session failed:', err);
      setError(err.message || 'Failed to create session');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleScanAttendance = async () => {
    if (!selectedSessionId || !scanMemberId) {
      setError('Please select a session and enter a member ID');
      return;
    }
    
    setScanLoading(true);
    setError(null);
    setScanSuccess(null);
    try {
      const result = await api.scanAttendance(selectedSessionId, scanMemberId);
      setScanSuccess({
        message: result.message || 'Attendance recorded successfully',
        firstVisit: result.first_visit || false
      });
      setScanMemberId('');
      await loadData();
      // Auto-close after 2 seconds
      setTimeout(() => {
        setShowScanModal(false);
        setScanSuccess(null);
      }, 2000);
    } catch (err) {
      console.error('Scan attendance failed:', err);
      setError(err.message || 'Failed to record attendance');
    } finally {
      setScanLoading(false);
    }
  };

  const getQRCodeUrl = (sessionId) => {
    return `http://127.0.0.1:8000/media/qr_codes/session_${sessionId}.png`;
  };

  if (loading && sessions.length === 0) {
    return (
      <div className="py-12 flex items-center justify-center">
        <Loader className="w-5 h-5 text-slate-400 animate-spin" />
        <span className="ml-2 text-sm text-slate-500">Loading attendance data...</span>
      </div>
    );
  }

  return (
    <div className="py-6 border-t border-slate-200">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-medium text-slate-700">Attendance</h2>
          <p className="text-xs text-slate-400 mt-0.5">Track check-ins and generate QR codes</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <button 
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="text-sm text-sky-700 hover:text-sky-800 flex items-center gap-1.5 transition-colors border border-sky-200 px-2 py-1 rounded-md bg-sky-50"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
            {showExportMenu && (
              <div className="absolute right-0 mt-1 w-36 bg-white border border-slate-200 shadow-lg rounded-md py-1 z-10">
                <button 
                  onClick={exportToExcel}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Export to Excel
                </button>
                <button 
                  onClick={exportToPDF}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Export to PDF
                </button>
              </div>
            )}
          </div>
          <button 
            onClick={() => setShowScanModal(true)} 
            className="text-sm text-sky-700 hover:text-sky-800 flex items-center gap-1.5 transition-colors"
          >
            <QrCode className="w-3.5 h-3.5" />
            Scan attendance
          </button>
          <button 
            onClick={() => setShowCreateModal(true)} 
            className="text-sm text-sky-700 hover:text-sky-800 flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New session
          </button>
          <button 
            onClick={loadData} 
            className="text-slate-400 hover:text-slate-600 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span className="text-sm text-red-700">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Mini trend chart */}
      <div className="mb-6 pb-4 border-b border-slate-100">
        <p className="text-xs text-slate-400 mb-2">Weekly attendance trend</p>
        <ResponsiveContainer width="100%" height={80}>
          <LineChart data={trendData}>
            <Line type="monotone" dataKey="attendance" stroke="#0891b2" strokeWidth={1.5} dot={false} />
            <Tooltip 
              contentStyle={{ fontSize: '11px', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px 8px' }}
              labelStyle={{ fontSize: '11px' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Recent sessions summary */}
      {sessions.length > 0 && (
        <div className="mb-5">
          <p className="text-xs text-slate-400 mb-2">Recent sessions</p>
          <div className="flex flex-wrap gap-2">
            {sessions.slice(0, 3).map(session => (
              <div key={session.id} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-md">
                <span className="text-xs text-slate-600">{session.title}</span>
                <button 
                  onClick={() => {
                    setQrUrl(getQRCodeUrl(session.id));
                    setSelectedSessionForQR(session);
                  }}
                  className="text-sky-600 hover:text-sky-700"
                >
                  <QrCode className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* QR Code display */}
      {qrUrl && selectedSessionForQR && (
        <div className="mb-5 p-3 border border-slate-200 rounded-md inline-flex items-center gap-3 bg-slate-50/50">
          <QrCode className="w-5 h-5 text-sky-700" />
          <img src={qrUrl} alt="QR Code" className="w-12 h-12 border border-slate-200 rounded" />
          <div>
            <p className="text-xs font-medium text-slate-700">{selectedSessionForQR.title}</p>
            <p className="text-xs text-slate-400">Scan for check-in</p>
          </div>
          <button 
            onClick={() => { setQrUrl(''); setSelectedSessionForQR(null); }}
            className="ml-2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Recent attendance records */}
      {records.length > 0 ? (
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-2 text-xs font-medium text-slate-400 uppercase tracking-wider">Member</th>
              <th className="text-left py-2 text-xs font-medium text-slate-400 uppercase tracking-wider">Event</th>
              <th className="text-left py-2 text-xs font-medium text-slate-400 uppercase tracking-wider">Time</th>
              <th className="text-left py-2 text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {records.slice(0, 4).map((rec, index) => (
              <tr key={rec.id} className="hover:bg-slate-100 transition-colors even:bg-slate-50/70">
                <td className="py-2 px-2 text-sm text-slate-600">#{index + 1} - {rec.member_name || `Member #${rec.member_id}`}</td>
                <td className="py-2 px-2 text-sm text-slate-600">{rec.event_title || 'Service'}</td>
                <td className="py-2 text-sm text-slate-500">{formatDateTime(rec.checked_in_at)}</td>
                <td className="py-2">
                  <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="py-8 text-center text-slate-400 text-sm">
          No attendance records yet. Create a session and start scanning.
        </div>
      )}

      {/* Create Session Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-lg p-5 w-96 border border-slate-200 shadow-sm" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-slate-800">Create attendance session</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Title</label>
                <input 
                  type="text" 
                  value={newSession.title} 
                  onChange={e => setNewSession({...newSession, title: e.target.value})} 
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-300"
                  placeholder="Sunday Service, PTA Meeting..."
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Type</label>
                <select 
                  value={newSession.session_type} 
                  onChange={e => setNewSession({...newSession, session_type: e.target.value})} 
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-300"
                >
                  <option value="church">Church</option>
                  <option value="pta">PTA</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Date</label>
                <input 
                  type="date" 
                  value={newSession.date} 
                  onChange={e => setNewSession({...newSession, date: e.target.value})} 
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-300"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={handleCreateSession} className="btn-primary flex-1 text-sm py-2" disabled={createLoading}>
                  {createLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader className="w-3.5 h-3.5 animate-spin" />
                      Creating...
                    </span>
                  ) : (
                    'Create & Generate QR'
                  )}
                </button>
                <button onClick={() => setShowCreateModal(false)} className="btn-secondary flex-1 text-sm py-2">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scan Attendance Modal */}
      {showScanModal && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50" onClick={() => setShowScanModal(false)}>
          <div className="bg-white rounded-lg p-5 w-96 border border-slate-200 shadow-sm" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-slate-800">Record attendance</h3>
              <button onClick={() => setShowScanModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {scanSuccess && (
              <div className="mb-4 p-2 bg-green-50 border border-green-200 rounded-md text-center">
                <CheckCircle className="w-4 h-4 text-green-600 mx-auto mb-1" />
                <p className="text-xs text-green-700">{scanSuccess.message}</p>
                {scanSuccess.firstVisit && (
                  <p className="text-xs text-green-600 mt-1">✨ First time attending!</p>
                )}
              </div>
            )}
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Select Session</label>
                <select 
                  value={selectedSessionId} 
                  onChange={e => setSelectedSessionId(e.target.value)} 
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-300"
                >
                  <option value="">-- Select a session --</option>
                  {sessions.map(s => (
                    <option key={s.id} value={s.id}>{s.title} ({s.session_type})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Member ID</label>
                <input 
                  type="number" 
                  value={scanMemberId} 
                  onChange={e => setScanMemberId(e.target.value)} 
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-300"
                  placeholder="Enter member ID"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={handleScanAttendance} className="btn-primary flex-1 text-sm py-2" disabled={scanLoading}>
                  {scanLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader className="w-3.5 h-3.5 animate-spin" />
                      Recording...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <QrCode className="w-3.5 h-3.5" />
                      Record attendance
                    </span>
                  )}
                </button>
                <button onClick={() => setShowScanModal(false)} className="btn-secondary flex-1 text-sm py-2">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}