import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { api } from '../api';

export default function VerifyEmail() {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();
  
  const queryParams = new URLSearchParams(location.search);
  const email = queryParams.get('email');

  useEffect(() => {
    if (!email) {
      navigate('/login');
    }
  }, [email, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      await api.verifyEmail(email, otp);
      navigate('/login', { state: { message: 'Email verified successfully! You can now log in.' } });
    } catch (err) {
      setError(err.message || 'Verification failed. Please check your code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError('');
    setMessage('');
    
    try {
      await api.resendOtp(email);
      setMessage('A new code has been sent to your email.');
    } catch (err) {
      setError(err.message || 'Failed to resend code.');
    } finally {
      setResending(false);
    }
  };

  if (!email) return null;

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center py-12 px-4">
      <div className="mb-8 flex items-center justify-center">
        <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center mb-4">
          <ShieldCheck className="w-8 h-8 text-sky-600" />
        </div>
      </div>
      
      <div className="w-full max-w-md bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Verify your email</h1>
        <p className="text-sm text-slate-500 mb-8">
          We've sent a 6-digit verification code to <br />
          <span className="font-medium text-slate-800">{email}</span>
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full text-center text-3xl tracking-[0.5em] px-3 py-4 border border-slate-300 rounded-lg focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              required
            />
          </div>

          {error && <p className="text-red-500 text-sm p-3 bg-red-50 rounded-md border border-red-100">{error}</p>}
          {message && <p className="text-emerald-600 text-sm p-3 bg-emerald-50 rounded-md border border-emerald-100">{message}</p>}
          
          <button type="submit" disabled={loading || otp.length !== 6} className="btn-primary w-full py-3 flex justify-center items-center gap-2 text-base">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify Account'}
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-slate-100">
          <p className="text-sm text-slate-500">
            Didn't receive the code?{' '}
            <button 
              onClick={handleResend} 
              disabled={resending}
              className="text-sky-600 hover:text-sky-700 font-medium disabled:opacity-50"
            >
              {resending ? 'Sending...' : 'Click to resend'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
