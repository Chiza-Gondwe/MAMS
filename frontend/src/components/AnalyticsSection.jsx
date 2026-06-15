// components/AttendanceSection.jsx
import { useState, useEffect } from 'react';
import { api } from '../api';
import { formatDateTime } from '../utils';
import { QrCode, Plus, CheckCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const trendData = [
  { week: 'W1', attendance: 42 },
  { week: 'W2', attendance: 48 },
  { week: 'W3', attendance: 55 },
  { week: 'W4', attendance: 62 },
];

export default function AttendanceSection() {
  const [sessions, setSessions] = useState([]);
  const [records, setRecords] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newSession, setNewSession] = useState({ title: '', session_type: 'church', date: '' });
  const [qrCode, setQrCode] = useState(null);

  useEffect(() => {
    api.getSessions().then(data => setSessions(data.results || []));
    api.getAttendanceRecords().then(data => setRecords(data.results || []));
  }, []);

  const createSession = async () => {
    const data = await api.createSession(newSession);
    if (data.id) {
      setQrCode(`http://127.0.0.1:8000/media/qr_codes/session_${data.id}.png`);
      setShowCreate(false);
      api.getSessions().then(res => setSessions(res.results || []));
    }
  };

  return (
    <div className="py-6 border-t border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-medium text-slate-700">Attendance</h2>
        <button onClick={() => setShowCreate(true)} className="text-sm text-sky-700 hover:text-sky-800 flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> New session
        </button>
      </div>

      {/* Mini trend chart */}
      <div className="mb-6 pb-4 border-b border-slate-100">
        <p className="text-xs text-slate-400 mb-2">Weekly attendance trend</p>
        <ResponsiveContainer width="100%" height={80}>
          <LineChart data={trendData}>
            <Line type="monotone" dataKey="attendance" stroke="#0891b2" strokeWidth={1.5} dot={false} />
            <Tooltip contentStyle={{ fontSize: '12px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* QR Creation Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-lg p-5 w-96 border border-slate-200" onClick={e => e.stopPropagation()}>
            <h3 className="font-medium text-slate-800 mb-3">Create attendance session</h3>
            <input type="text" placeholder="Title" value={newSession.title} onChange={e => setNewSession({...newSession, title: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm mb-2" />
            <select value={newSession.session_type} onChange={e => setNewSession({...newSession, session_type: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm mb-2">
              <option value="church">Church</option>
              <option value="pta">PTA</option>
            </select>
            <input type="date" value={newSession.date} onChange={e => setNewSession({...newSession, date: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm mb-3" />
            <div className="flex gap-2">
              <button onClick={createSession} className="btn-primary flex-1">Create & Generate QR</button>
              <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* QR Display */}
      {qrCode && (
        <div className="mb-6 p-3 border border-slate-200 rounded-md inline-flex items-center gap-3">
          <QrCode className="w-5 h-5 text-sky-700" />
          <img src={qrCode} alt="QR" className="w-10 h-10" />
          <span className="text-xs text-slate-500">Session QR code ready</span>
        </div>
      )}

      {/* Recent attendance records */}
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-2 text-xs font-medium text-slate-400">Member</th>
            <th className="text-left py-2 text-xs font-medium text-slate-400">Event</th>
            <th className="text-left py-2 text-xs font-medium text-slate-400">Time</th>
            <th className="text-left py-2 text-xs font-medium text-slate-400">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {records.slice(0, 4).map(rec => (
            <tr key={rec.id} className="hover:bg-slate-50/50">
              <td className="py-2 text-sm text-slate-600">{rec.member_name || `Member #${rec.member_id}`}</td>
              <td className="py-2 text-sm text-slate-600">{rec.event_title || 'Sunday Service'}</td>
              <td className="py-2 text-sm text-slate-500">{formatDateTime(rec.checked_in_at)}</td>
              <td className="py-2"><CheckCircle className="w-3.5 h-3.5 text-green-600" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}