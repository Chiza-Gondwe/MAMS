import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { CheckCircle2, XCircle, Loader } from 'lucide-react';

export default function ScanPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('Registering your attendance...');

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
      })
      .catch(err => {
        setStatus('error');
        setMessage(err.message || 'Failed to record attendance. You might already be checked in, or you are inactive.');
      });
  }, [sessionId, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 max-w-sm w-full text-center">
        {status === 'loading' && (
          <div className="flex flex-col items-center">
            <Loader className="w-16 h-16 text-sky-600 animate-spin mb-4" />
            <h2 className="text-xl font-bold text-slate-800">{message}</h2>
            <p className="text-slate-500 mt-2">Please wait...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
            <CheckCircle2 className="w-20 h-20 text-emerald-500 mb-4" />
            <h2 className="text-2xl font-bold text-slate-800">Checked In!</h2>
            <p className="text-slate-600 mt-2">{message}</p>
            <button onClick={() => navigate('/dashboard')} className="mt-8 btn-primary w-full">
              Go to Dashboard
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
            <XCircle className="w-20 h-20 text-red-500 mb-4" />
            <h2 className="text-2xl font-bold text-slate-800">Check-in Failed</h2>
            <p className="text-slate-600 mt-2">{message}</p>
            <button onClick={() => navigate('/dashboard')} className="mt-8 bg-slate-100 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-200 transition-colors w-full">
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
