import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { CheckCircle2, XCircle, Loader, ShieldCheck, Layers, MapPin } from 'lucide-react';

export default function ScanPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('Verifying your identity & attendance...');
  const [memberInfo, setMemberInfo] = useState(null);
  const [sessionTitle, setSessionTitle] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    
    // If they aren't logged in, send them to login but remember where to return
    if (!token) {
      navigate('/login', { state: { returnTo: `/scan/${sessionId}` } });
      return;
    }

    // Attempt to scan in
    api.scanAttendance(sessionId, null)
      .then(res => {
        setStatus('success');
        setMessage(res.message || 'Attendance successfully recorded!');
        if (res.member) setMemberInfo(res.member);
        if (res.session_title) setSessionTitle(res.session_title);
      })
      .catch(err => {
        setStatus('error');
        setMessage(err.data?.message || err.message || 'Failed to record attendance.');
        if (err.data?.member) setMemberInfo(err.data.member);
      });
  }, [sessionId, navigate]);

  const photoSrc = memberInfo?.profile_picture_relative || (
    memberInfo?.profile_picture ? memberInfo.profile_picture.replace(/^https?:\/\/[^/]+/, '') : null
  );
  const initials = (memberInfo?.full_name || 'M')
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() || '')
    .join('');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="bg-white p-7 rounded-2xl shadow-xl border border-slate-200 max-w-md w-full text-center">
        {status === 'loading' && (
          <div className="flex flex-col items-center py-6">
            <Loader className="w-14 h-14 text-blue-600 animate-spin mb-4" />
            <h2 className="text-lg font-bold text-slate-800">{message}</h2>
            <p className="text-sm text-slate-500 mt-1">Please wait...</p>
          </div>
        )}

        {(status === 'success' || status === 'error') && (
          <div className="flex flex-col items-center">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border ${
              status === 'success'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              <ShieldCheck className="w-4 h-4" />
              <span>{status === 'success' ? 'Visual Identity Verified' : 'Check-in Notice'}</span>
            </div>

            {memberInfo ? (
              <div className="relative mb-3">
                <div className={`w-28 h-28 rounded-full p-1 border-4 ${
                  status === 'success' ? 'border-emerald-500' : 'border-rose-400'
                }`}>
                  {photoSrc ? (
                    <img
                      src={photoSrc}
                      alt={memberInfo.full_name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-blue-50 text-blue-700 flex items-center justify-center text-3xl font-extrabold">
                      {initials}
                    </div>
                  )}
                </div>
                <div className={`absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center text-white border-2 border-white ${
                  status === 'success' ? 'bg-emerald-500' : 'bg-rose-500'
                }`}>
                  {status === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                </div>
              </div>
            ) : (
              status === 'success' ? (
                <CheckCircle2 className="w-20 h-20 text-emerald-500 mb-3" />
              ) : (
                <XCircle className="w-20 h-20 text-rose-500 mb-3" />
              )
            )}

            {memberInfo && (
              <>
                <h2 className="text-xl font-extrabold text-slate-900">{memberInfo.full_name}</h2>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
                  Member #{memberInfo.id} • {memberInfo.role}
                </p>

                <div className="w-full grid grid-cols-2 gap-2.5 mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-left">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Section</p>
                    <p className="text-xs font-bold text-slate-800 flex items-center gap-1 mt-0.5 truncate">
                      <Layers className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="truncate">{memberInfo.section_name}</span>
                    </p>
                  </div>
                  <div className="border-l border-slate-200 pl-2.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Zone</p>
                    <p className="text-xs font-bold text-slate-800 flex items-center gap-1 mt-0.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="truncate">{memberInfo.zone_name}</span>
                    </p>
                  </div>
                </div>
              </>
            )}

            <div className={`w-full mt-4 p-3 rounded-xl border text-sm font-medium ${
              status === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}>
              {sessionTitle && <p className="text-xs font-bold uppercase tracking-wider mb-0.5">{sessionTitle}</p>}
              <p>{message}</p>
            </div>

            <button
              onClick={() => navigate('/dashboard')}
              className="mt-5 w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
