import { useState, useEffect } from 'react';
import { api } from '../api';
import { formatDateTime } from '../utils';
import { useAuth } from '../context/AuthContext';
import { QrCode, Plus, CheckCircle, X, Loader, RefreshCw, AlertCircle, Download, Printer, FileText, Layers, Trash2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';




export default function AttendanceSection() {
  const [sessions, setSessions] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [sundayDate, setSundayDate] = useState('');
  const [sundayType, setSundayType] = useState('church');
  const [services, setServices] = useState([{ title: '', start_time: '', end_time: '' }]);
  const [qrUrl, setQrUrl] = useState('');
  const [scanMemberId, setScanMemberId] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(null);
  const [verifiedMember, setVerifiedMember] = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [selectedSessionForQR, setSelectedSessionForQR] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [filterSessionId, setFilterSessionId] = useState('');

  const filteredRecords = filterSessionId 
    ? records.filter(r => String(r.session) === String(filterSessionId))
    : records;

  const activeSessionObj = sessions.find(s => String(s.id) === String(filterSessionId));

  const exportToExcel = () => {
    const exportData = filteredRecords.map((r, index) => ({
      '#': index + 1,
      'Member': r.member_name || `Member #${r.member_id}`,
      'Session': r.session_title || (sessions.find(s => String(s.id) === String(r.session))?.title) || 'Service',
      'Time': formatDateTime(r.scanned_at),
      'Status': 'Attended'
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
    const fileName = activeSessionObj 
      ? `Attendance_${activeSessionObj.title.replace(/\s+/g, '_')}_${activeSessionObj.date}.xlsx`
      : "MAMS_Attendance_Export.xlsx";
    XLSX.writeFile(workbook, fileName);
    setShowExportMenu(false);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    const titleText = activeSessionObj 
      ? `Attendance: ${activeSessionObj.title} (${activeSessionObj.date})`
      : "MAMS Attendance Export";
    doc.text(titleText, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()} • Total Attendees: ${filteredRecords.length}`, 14, 30);
    
    const tableColumn = ["#", "Member", "Session", "Time", "Status"];
    const tableRows = [];
    
    filteredRecords.forEach((r, index) => {
      tableRows.push([
        index + 1,
        r.member_name || `Member #${r.member_id}`,
        r.session_title || (sessions.find(s => String(s.id) === String(r.session))?.title) || 'Service',
        formatDateTime(r.scanned_at),
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
    
    const pdfName = activeSessionObj 
      ? `Attendance_${activeSessionObj.title.replace(/\s+/g, '_')}_${activeSessionObj.date}.pdf`
      : "MAMS_Attendance_Export.pdf";
    doc.save(pdfName);
    setShowExportMenu(false);
  };

  const { user } = useAuth();
  const [showMasterQRModal, setShowMasterQRModal] = useState(false);
  const churchName = user?.org_name || 'UCZ Changachanga Congregation';
  const masterQRTargetUrl = `${window.location.origin}/scan/today`;
  const masterQRImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(masterQRTargetUrl)}`;

  const isPTA = user?.org_type === 'PTA';
  const meetingLabel = isPTA ? 'PTA Meeting' : 'Sunday Service';

  const printDoorPoster = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${churchName} - Attendance Poster</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; text-align: center; padding: 40px; margin: 0; background: #fff; }
            .poster { max-width: 650px; margin: 0 auto; border: 4px solid #0284c7; border-radius: 24px; padding: 40px 30px; box-sizing: border-box; }
            h1 { font-size: 30px; color: #0f172a; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px; }
            h2 { font-size: 20px; color: #0284c7; margin: 0 0 24px 0; font-weight: 600; }
            .qr-wrapper { margin: 15px auto; padding: 16px; background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 20px; display: inline-block; }
            .qr-wrapper img { width: 300px; height: 300px; display: block; }
            .instructions { font-size: 18px; color: #334155; margin: 24px 0 10px 0; font-weight: bold; }
            .steps { font-size: 15px; color: #64748b; margin-top: 10px; text-align: left; display: inline-block; }
            .steps li { margin-bottom: 6px; }
            .badge { display: inline-block; background: #e0f2fe; color: #0369a1; font-weight: bold; font-size: 13px; padding: 6px 16px; border-radius: 9999px; margin-top: 24px; }
            @media print {
              body { padding: 0; }
              .poster { border-color: #000; }
            }
          </style>
        </head>
        <body>
          <div class="poster">
            <h1>${churchName}</h1>
            <h2>${meetingLabel} Attendance Check-in</h2>
            <div class="qr-wrapper">
              <img src="${masterQRImageUrl}" alt="Attendance QR Code" />
            </div>
            <p class="instructions">Scan with your phone camera or the MAMS App!</p>
            <div class="steps">
              <ol>
                <li>Open your smartphone camera or MAMS App</li>
                <li>Point your camera at this QR code</li>
                <li>Tap the link to record your attendance for today</li>
              </ol>
            </div>
            <br />
            <div class="badge">Permanent Master QR Code • Works Every ${isPTA ? 'Meeting' : 'Service'}</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const printBenchStickers = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${churchName} - Pew & Bench Stickers</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 20px; margin: 0; background: #fff; }
            h3 { text-align: center; font-size: 16px; color: #475569; margin: 0 0 15px 0; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
            .sticker { border: 2px dashed #94a3b8; border-radius: 12px; padding: 12px; text-align: center; box-sizing: border-box; background: #fff; }
            .org { font-size: 11px; font-weight: bold; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .qr { width: 140px; height: 140px; margin: 6px auto; display: block; }
            .scan-text { font-size: 11px; font-weight: bold; color: #0284c7; margin: 4px 0 2px 0; }
            .bench-text { font-size: 9px; color: #64748b; }
            @media print {
              body { padding: 10px; }
              .sticker { border: 1.5px dashed #64748b; }
            }
          </style>
        </head>
        <body>
          <h3>${churchName} - Pew / Bench Sticker Sheet (Cut along dashed lines)</h3>
          <div class="grid">
            ${Array(9).fill(0).map(() => `
              <div class="sticker">
                <div class="org">${churchName}</div>
                <img src="${masterQRImageUrl}" class="qr" alt="QR" />
                <div class="scan-text">SCAN TO CHECK IN</div>
                <div class="bench-text">Pew & Bench Attendance</div>
              </div>
            `).join('')}
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
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

  const addServiceRow = () => setServices(prev => [...prev, { title: '', start_time: '', end_time: '' }]);
  const removeServiceRow = (index) => setServices(prev => prev.filter((_, i) => i !== index));
  const updateService = (index, field, value) => setServices(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));

  const handleCreateSession = async () => {
    if (!sundayDate) { setError('Please select a date'); return; }
    const validServices = services.filter(s => s.title.trim());
    if (validServices.length === 0) { setError('Please add at least one service name'); return; }

    setCreateLoading(true);
    setError(null);
    try {
      const results = await Promise.all(
        validServices.map(svc =>
          api.createSession({
            title: svc.title.trim(),
            session_type: sundayType,
            date: sundayDate,
            start_time: svc.start_time || null,
            end_time: svc.end_time || null,
          })
        )
      );
      const firstCreated = results.find(r => r.id);
      if (firstCreated) {
        setQrUrl(`/media/qr_codes/session_${firstCreated.id}.png`);
        setSelectedSessionForQR(firstCreated);
      }
      setShowCreateModal(false);
      setSundayDate('');
      setSundayType('church');
      setServices([{ title: '', start_time: '', end_time: '' }]);
      await loadData();
    } catch (err) {
      console.error('Create session failed:', err);
      setError(err.message || 'Failed to create session');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleVerifyMember = async (rawId) => {
    const target = (rawId ?? scanMemberId ?? '').toString().trim();
    if (!target) {
      setError('Please enter or scan a Member ID first');
      return;
    }
    setVerifyLoading(true);
    setError(null);
    setScanSuccess(null);
    try {
      const res = await api.verifyMemberForAttendance(target);
      if (res && res.member) {
        setVerifiedMember(res.member);
        setScanMemberId(String(res.member.id));
      }
    } catch (err) {
      setVerifiedMember(null);
      setError(err.message || 'Member not found');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleScanAttendance = async () => {
    const cleanId = String(scanMemberId || '').replace('MAMS-MEMBER:', '').trim();
    if (!cleanId) {
      setError('Please enter or scan a Member ID');
      return;
    }

    setScanLoading(true);
    setError(null);
    setScanSuccess(null);
    try {
      const sessionTarget = selectedSessionId || 'today';
      const result = await api.scanAttendance(sessionTarget, cleanId);
      if (result.member) {
        setVerifiedMember(result.member);
      }
      setScanSuccess({
        message: result.message || 'Attendance recorded successfully',
        firstVisit: result.is_first_visit || result.first_visit || false
      });
      await loadData();
    } catch (err) {
      console.error('Scan attendance failed:', err);
      setError(err.message || 'Failed to record attendance');
    } finally {
      setScanLoading(false);
    }
  };

  const getQRCodeUrl = (sessionId) => {
    return `/media/qr_codes/session_${sessionId}.png`;
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
            onClick={() => setShowMasterQRModal(true)} 
            className="text-xs bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
            title={isPTA ? "Permanent QR code for Doors, Noticeboards & Handouts" : "Permanent QR code for Doors, Benches & Brochures"}
          >
            <QrCode className="w-4 h-4 text-indigo-600" />
            <span>{isPTA ? "Permanent Meeting QR" : "Permanent Church QR"}</span>
          </button>
          {(sessions.length > 0 || records.length > 0) && (
            <button 
              onClick={async () => {
                if (window.confirm("Are you sure you want to delete ALL attendance records and sessions? This will reset all attendance to zero.")) {
                  try {
                    await api.clearAllAttendance();
                    await loadData();
                  } catch (err) {
                    alert(err.message || 'Failed to clear attendance');
                  }
                }
              }}
              className="text-xs bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
              title="Clear all sessions and attendance records"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Clear All</span>
            </button>
          )}
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
            {isPTA ? "New meeting" : "New session"}
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

      {/* Attendance trend chart */}
      <div className="mb-6 pb-4 border-b border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{isPTA ? "Attendance per Meeting / Event" : "Attendance per Service"}</p>
          <span className="text-xs text-slate-400">
            {sessions.length > 0 ? `Showing last ${Math.min(sessions.length, 8)} ${isPTA ? 'meetings' : 'services'}` : (isPTA ? 'No meetings yet' : 'No services yet')}
          </span>
        </div>

        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-36 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <svg className="w-8 h-8 text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-sm font-medium text-slate-400">{isPTA ? "No meetings yet" : "No services yet"}</p>
            <p className="text-xs text-slate-300 mt-0.5">{isPTA ? "Create a meeting and start scanning to see trends" : "Create a session and start scanning to see trends"}</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart
              data={sessions.slice(0, 8).map(s => ({
                name: s.title,
                date: s.date ? new Date(s.date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : s.title,
                attendance: records.filter(r => String(r.session) === String(s.id)).length
              })).reverse()}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0284c7" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
                interval={0}
                tickFormatter={v => v.length > 10 ? v.slice(0, 10) + '…' : v}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', fontSize: '11px' }}>
                        <p style={{ fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>{d.name}</p>
                        <p style={{ color: '#94a3b8', marginBottom: 6 }}>{d.date}</p>
                        <p style={{ fontWeight: 700, color: '#0284c7', fontSize: '16px', lineHeight: 1 }}>
                          {d.attendance} <span style={{ fontWeight: 400, fontSize: '11px', color: '#64748b' }}>attended</span>
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="attendance"
                stroke="#0284c7"
                strokeWidth={2.5}
                fill="url(#attendanceGradient)"
                dot={{ r: 4, fill: '#fff', stroke: '#0284c7', strokeWidth: 2.5 }}
                activeDot={{ r: 6, fill: '#0284c7', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Interactive Service/Session Filter Pills */}
      {sessions.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Filter by Service / Sunday
            </p>
            {filterSessionId && (
              <button
                onClick={() => setFilterSessionId('')}
                className="text-xs text-sky-600 hover:text-sky-700 font-semibold flex items-center gap-1"
              >
                <span>Show All Sessions</span>
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {/* "All Sessions" Pill */}
            <button
              onClick={() => setFilterSessionId('')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 border ${
                filterSessionId === ''
                  ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200/70'
              }`}
            >
              <span>All Services</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                filterSessionId === '' ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {records.length} total
              </span>
            </button>

            {/* Individual Session Pills */}
            {sessions.map(session => {
              const count = records.filter(r => String(r.session) === String(session.id)).length;
              const isSelected = filterSessionId === String(session.id);

              return (
                <div 
                  key={session.id} 
                  className={`flex items-center rounded-lg border transition-all ${
                    isSelected 
                      ? 'bg-sky-600 text-white border-sky-600 shadow-sm' 
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <button
                    onClick={() => setFilterSessionId(isSelected ? '' : String(session.id))}
                    className="px-3 py-1.5 text-xs font-medium flex items-center gap-2 text-left"
                  >
                    <span className="font-semibold">{session.title}</span>
                    <span className={`text-[11px] ${isSelected ? 'text-sky-100' : 'text-slate-400'}`}>
                      ({session.date}{session.start_time ? ` · ${session.start_time.slice(0,5)}–${session.end_time?.slice(0,5) || '?'}` : ''})
                    </span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isSelected ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      {count} {count === 1 ? 'attendee' : 'attendees'}
                    </span>
                  </button>

                  {/* QR Code button */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setQrUrl(getQRCodeUrl(session.id));
                      setSelectedSessionForQR(session);
                    }}
                    title="View & Print QR Code"
                    className={`p-1.5 border-l transition-colors ${
                      isSelected 
                        ? 'border-white/20 text-white hover:bg-white/10' 
                        : 'border-slate-200 text-sky-600 hover:bg-slate-50'
                    }`}
                  >
                    <QrCode className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete Session button */}
                  <button 
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (window.confirm(`Are you sure you want to delete "${session.title}" and its attendance records?`)) {
                        try {
                          await api.deleteSession(session.id);
                          setSessions(prev => prev.filter(s => s.id !== session.id));
                          setRecords(prev => prev.filter(r => String(r.session) !== String(session.id)));
                          if (filterSessionId === String(session.id)) setFilterSessionId('');
                        } catch (err) {
                          alert(err.message || 'Failed to delete session');
                        }
                      }
                    }}
                    title="Delete Session"
                    className={`p-1.5 border-l transition-colors ${
                      isSelected 
                        ? 'border-white/20 text-rose-200 hover:bg-rose-700/50' 
                        : 'border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Session Active Banner */}
      {activeSessionObj && (
        <div className="mb-5 p-4 bg-gradient-to-r from-sky-50 to-indigo-50/40 border border-sky-200 rounded-xl flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-sky-600 text-white px-2 py-0.5 rounded">
                Filtered Service
              </span>
              <h4 className="font-bold text-slate-900 text-base">{activeSessionObj.title}</h4>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Service Date: <span className="font-medium text-slate-700">{activeSessionObj.date}</span> • Attendance counts reset per service
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-2xl font-black text-sky-700">{filteredRecords.length}</div>
              <div className="text-xs font-semibold text-sky-900">Total Present</div>
            </div>
          </div>
        </div>
      )}

      {/* QR Code display */}
      {qrUrl && selectedSessionForQR && (
        <div className="mb-5 p-4 border border-sky-100 rounded-lg inline-flex items-center gap-4 bg-sky-50 shadow-sm">
          <div className="bg-white p-2 rounded-lg border border-slate-200">
            <img src={qrUrl} alt="QR Code" className="w-24 h-24" />
          </div>
          <div className="flex flex-col gap-2">
            <div>
              <p className="text-sm font-bold text-slate-800">{selectedSessionForQR.title}</p>
              <p className="text-xs text-slate-500">Scan this code to check in</p>
            </div>
            <div className="flex gap-2 mt-1">
              <a 
                href={qrUrl} 
                target="_blank" 
                rel="noreferrer"
                download={`session_${selectedSessionForQR.id}_qr.png`}
                className="text-xs bg-sky-600 hover:bg-sky-700 text-white px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Download / Print
              </a>
              <button 
                onClick={() => { setQrUrl(''); setSelectedSessionForQR(null); }}
                className="text-xs bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1.5 rounded flex items-center gap-1 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attendance records table */}
      {filteredRecords.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2.5 px-3 text-xs font-bold text-slate-500 uppercase tracking-wider">#</th>
                <th className="text-left py-2.5 px-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Member</th>
                <th className="text-left py-2.5 px-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Service / Session</th>
                <th className="text-left py-2.5 px-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Time Scanned</th>
                <th className="text-left py-2.5 px-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.map((rec, index) => {
                const sessionName = rec.session_title || 
                  (sessions.find(s => String(s.id) === String(rec.session))?.title) || 
                  'Service';
                const sessionDate = rec.session_date || 
                  (sessions.find(s => String(s.id) === String(rec.session))?.date);
                const photoUrl = rec.member_photo ? rec.member_photo.replace(/^https?:\/\/[^/]+/, '') : null;
                const displayName = rec.member_name || `Member #${rec.member}`;

                return (
                  <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors even:bg-slate-50/40">
                    <td className="py-2.5 px-3 text-xs font-bold text-sky-700 w-12">
                      #{index + 1}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2.5">
                        {photoUrl ? (
                          <img src={photoUrl} alt={displayName} className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 font-bold text-xs flex items-center justify-center shrink-0">
                            {displayName.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-semibold text-slate-800 leading-tight">{displayName}</p>
                          {(rec.member_section || rec.member_zone) && (
                            <p className="text-[11px] text-slate-400">
                              {rec.member_section || 'Unassigned Section'} • {rec.member_zone || 'Unassigned Zone'}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-xs text-slate-600">
                      <span className="font-medium text-slate-800">{sessionName}</span>
                      {sessionDate && <span className="text-slate-400 ml-1">({sessionDate})</span>}
                    </td>
                    <td className="py-2.5 px-3 text-xs text-slate-500">
                      {formatDateTime(rec.scanned_at)}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Present</span>
                        </div>
                        <button
                          onClick={async () => {
                            if (window.confirm(`Delete attendance record for ${displayName}?`)) {
                              try {
                                await api.deleteAttendanceRecord(rec.id);
                                setRecords(prev => prev.filter(r => r.id !== rec.id));
                              } catch (err) {
                                alert(err.message || 'Failed to delete record');
                              }
                            }
                          }}
                          title="Delete Record"
                          className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors ml-2"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-12 text-center text-slate-400 text-sm">
          {filterSessionId 
            ? 'No members have checked into this session yet.'
            : 'No attendance records yet. Create a session and start scanning.'}
        </div>
      )}

      {/* Create Session Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-xl p-5 w-full max-w-lg border border-slate-200 shadow-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-semibold text-slate-800">Plan Sunday Services</h3>
                <p className="text-xs text-slate-400 mt-0.5">Set up one or more services for a Sunday in one go</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Date + Type Row */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-slate-500 mb-1">Sunday Date</label>
                  <input
                    type="date"
                    value={sundayDate}
                    onChange={e => setSundayDate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-300"
                  />
                </div>
                <div className="w-32">
                  <label className="block text-xs text-slate-500 mb-1">Type</label>
                  <select
                    value={sundayType}
                    onChange={e => setSundayType(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-300"
                  >
                    <option value="church">Church</option>
                    <option value="pta">PTA</option>
                  </select>
                </div>
              </div>

              {/* Services Rows */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Services</label>
                  <span className="text-[10px] text-slate-400">Start/end time enables smart QR routing</span>
                </div>
                <div className="space-y-2">
                  {services.map((svc, idx) => (
                    <div key={idx} className="flex gap-2 items-start p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={svc.title}
                          onChange={e => updateService(idx, 'title', e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-300 bg-white"
                          placeholder={idx === 0 ? 'Morning Service' : 'Afternoon Service'}
                        />
                      </div>
                      <div className="w-24">
                        <input
                          type="time"
                          value={svc.start_time}
                          onChange={e => updateService(idx, 'start_time', e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-md text-xs focus:outline-none focus:border-sky-300 bg-white"
                          title="Start time"
                        />
                      </div>
                      <div className="w-24">
                        <input
                          type="time"
                          value={svc.end_time}
                          onChange={e => updateService(idx, 'end_time', e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-md text-xs focus:outline-none focus:border-sky-300 bg-white"
                          title="End time"
                        />
                      </div>
                      {services.length > 1 && (
                        <button
                          onClick={() => removeServiceRow(idx)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors flex-shrink-0"
                          title="Remove"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400 pl-1">
                  <span className="font-medium text-sky-600">Name</span>
                  <span>·</span>
                  <span className="font-medium text-sky-600">Start</span>
                  <span>·</span>
                  <span className="font-medium text-sky-600">End</span>
                  <span className="ml-1">(times optional — leave blank for single-service Sundays)</span>
                </div>
              </div>

              {/* Add Service Button */}
              <button
                onClick={addServiceRow}
                className="w-full py-2 border border-dashed border-slate-300 rounded-lg text-sm text-slate-500 hover:border-sky-400 hover:text-sky-600 hover:bg-sky-50/50 transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add another service
              </button>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-1">
                <button onClick={handleCreateSession} className="btn-primary flex-1 text-sm py-2" disabled={createLoading}>
                  {createLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader className="w-3.5 h-3.5 animate-spin" />
                      Creating...
                    </span>
                  ) : (
                    `Save ${services.filter(s => s.title.trim()).length > 1 ? 'All Services' : 'Session'} & Generate QR`
                  )}
                </button>
                <button onClick={() => setShowCreateModal(false)} className="btn-secondary flex-1 text-sm py-2">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scan & Visual Identity Verification Modal */}
      {showScanModal && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowScanModal(false);
            setVerifiedMember(null);
            setScanSuccess(null);
          }}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-md border border-slate-200 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Visual Identity & Attendance Check-In</h3>
                <p className="text-xs text-slate-500 mt-0.5">Scan or enter Member ID to verify photo, name & section</p>
              </div>
              <button
                onClick={() => {
                  setShowScanModal(false);
                  setVerifiedMember(null);
                  setScanSuccess(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Service / Session</label>
                <select
                  value={selectedSessionId}
                  onChange={e => setSelectedSessionId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-400"
                >
                  <option value="today">Today&apos;s Active Service (Auto)</option>
                  {sessions.map(s => (
                    <option key={s.id} value={s.id}>{s.title} ({s.date})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Member QR Code or Member ID</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={scanMemberId}
                    onChange={e => {
                      setScanMemberId(e.target.value);
                      setScanSuccess(null);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleVerifyMember(e.target.value);
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-400"
                    placeholder="e.g. 12 or MAMS-MEMBER:12"
                  />
                  <button
                    type="button"
                    onClick={() => handleVerifyMember(scanMemberId)}
                    disabled={verifyLoading}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors"
                  >
                    {verifyLoading ? 'Verifying...' : 'Verify Photo'}
                  </button>
                </div>
              </div>

              {/* Visual Identity Verification Card */}
              {verifiedMember && (
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-center">
                  <span className={`inline-block text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full mb-3 ${
                    scanSuccess
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {scanSuccess ? 'Identity Verified • Checked In ✓' : 'Visual Identity Verification'}
                  </span>

                  <div className="w-24 h-24 mx-auto rounded-full p-1 border-2 border-blue-500 mb-2.5 overflow-hidden bg-white flex items-center justify-center">
                    {verifiedMember.profile_picture_relative || verifiedMember.profile_picture ? (
                      <img
                        src={verifiedMember.profile_picture_relative || verifiedMember.profile_picture.replace(/^https?:\/\/[^/]+/, '')}
                        alt={verifiedMember.full_name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-extrabold text-blue-700">
                        {(verifiedMember.full_name || 'M').slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <h4 className="font-extrabold text-slate-900 text-base">{verifiedMember.full_name}</h4>
                  <p className="text-xs text-slate-500 font-medium">
                    Member #{verifiedMember.id} • {verifiedMember.role} • {verifiedMember.status}
                  </p>

                  <div className="grid grid-cols-2 gap-2 mt-3 p-2.5 bg-white rounded-lg border border-slate-200 text-left">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Section</p>
                      <p className="text-xs font-bold text-slate-800 truncate">{verifiedMember.section_name}</p>
                    </div>
                    <div className="border-l border-slate-200 pl-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Zone</p>
                      <p className="text-xs font-bold text-slate-800 truncate">{verifiedMember.zone_name}</p>
                    </div>
                  </div>
                </div>
              )}

              {scanSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                  <CheckCircle className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                  <p className="text-xs font-semibold text-emerald-800">{scanSuccess.message}</p>
                  {scanSuccess.firstVisit && (
                    <p className="text-xs text-emerald-600 mt-1">✨ First time attending!</p>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleScanAttendance}
                  className="btn-primary flex-1 text-sm py-2.5"
                  disabled={scanLoading}
                >
                  {scanLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader className="w-4 h-4 animate-spin" />
                      Recording...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <QrCode className="w-4 h-4" />
                      {verifiedMember ? 'Confirm Identity & Check In' : 'Verify & Record Attendance'}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowScanModal(false);
                    setVerifiedMember(null);
                    setScanSuccess(null);
                  }}
                  className="btn-secondary px-4 text-sm py-2.5"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Master QR Code Modal */}
      {showMasterQRModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowMasterQRModal(false)}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[11px] uppercase tracking-wider font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                  Permanent Master Code
                </span>
                <h3 className="font-bold text-slate-800 text-lg mt-1">Multi-Use Attendance QR Code</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  One code that never expires. Members can scan it from doors, benches, or brochures every Sunday!
                </p>
              </div>
              <button onClick={() => setShowMasterQRModal(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* QR Code Center Display */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center flex flex-col items-center">
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm inline-block">
                <img src={masterQRImageUrl} alt="Permanent Church QR" className="w-48 h-48 block" />
              </div>
              <p className="text-xs font-semibold text-slate-700 mt-3">{churchName}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Target: {masterQRTargetUrl}</p>
            </div>

            {/* Print & Download Options */}
            <div className="space-y-2.5">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Choose Print / Export Format:</p>
              
              {/* Option 1: Door Poster */}
              <button
                onClick={printDoorPoster}
                className="w-full p-3 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 flex items-center justify-between text-left transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-sky-100 text-sky-700 group-hover:bg-sky-200 transition-colors">
                    <Printer className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{isPTA ? "Print Meeting Entrance Poster (Full Page)" : "Print Church Door Poster (Full Page)"}</h4>
                    <p className="text-xs text-slate-500">{isPTA ? "Includes school title, instructions & large QR code for the hall/meeting entrance." : "Includes church title, instructions & large QR code for the main entrance."}</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-indigo-600 bg-white px-2 py-1 rounded-md border border-slate-200 group-hover:border-indigo-300">
                  Print
                </span>
              </button>

              {/* Option 2: Bench Stickers */}
              <button
                onClick={printBenchStickers}
                className="w-full p-3 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 flex items-center justify-between text-left transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200 transition-colors">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{isPTA ? "Print Desk / Chair Sticker Sheet (Grid of 9)" : "Print Pew / Bench Sticker Sheet (Grid of 9)"}</h4>
                    <p className="text-xs text-slate-500">{isPTA ? "Formats 9 compact stickers per A4 page to cut & stick on desks, chairs or folders." : "Formats 9 compact stickers per A4 page to cut & stick on each bench or chair."}</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-emerald-600 bg-white px-2 py-1 rounded-md border border-slate-200 group-hover:border-emerald-300">
                  Print Grid
                </span>
              </button>

              {/* Option 3: Download for Brochure */}
              <a
                href={masterQRImageUrl}
                target="_blank"
                rel="noreferrer"
                download={isPTA ? "School_Attendance_QR_Code.png" : "Church_Attendance_QR_Code.png"}
                className="w-full p-3 rounded-xl border border-slate-200 hover:border-purple-400 hover:bg-purple-50/40 flex items-center justify-between text-left transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-100 text-purple-700 group-hover:bg-purple-200 transition-colors">
                    <Download className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{isPTA ? "Download for Agenda / Newsletter (PNG)" : "Download for Brochure / Bulletin (PNG)"}</h4>
                    <p className="text-xs text-slate-500">{isPTA ? "Save high-res image to paste into Word, noticeboard, or meeting agenda." : "Save high-res image to paste into MS Word, Canva, or weekly bulletin."}</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-purple-600 bg-white px-2 py-1 rounded-md border border-slate-200 group-hover:border-purple-300">
                  Download
                </span>
              </a>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowMasterQRModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
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
