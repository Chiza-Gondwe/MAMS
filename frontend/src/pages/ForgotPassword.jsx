import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, KeyRound, EyeOff, Eye, ArrowLeft } from 'lucide-react';
import { api } from '../api';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Email, 2: OTP & New Password
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      const response = await api.requestPasswordReset(email);
      setMessage(response.message || 'If an account exists, a reset code was sent.');
      setStep(2);
    } catch (err) {
      setError(err.message || 'Failed to request password reset. Try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await api.confirmPasswordReset(email, otpCode, password);
      navigate('/login', { state: { message: response.message || 'Password reset successfully. Please log in.' }});
    } catch (err) {
      setError(err.message || 'Invalid code or reset failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-400 to-indigo-500"></div>
        
        <div className="p-8">
          <button 
            onClick={() => navigate('/login')} 
            className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Login
          </button>
          
          <div className="mb-8 flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-sky-100 to-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner">
              <Lock className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Password Reset</h2>
              <p className="text-sm text-slate-500 mt-1">
                {step === 1 ? "Enter your email to receive a code." : "Enter the code and your new password."}
              </p>
            </div>
          </div>

          {step === 1 ? (
            <form onSubmit={handleRequestReset} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    placeholder="admin@organization.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all"
                    required
                  />
                </div>
              </div>
              
              {error && <p className="text-red-500 text-sm font-medium text-center bg-red-50 py-2 rounded-lg">{error}</p>}
              
              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-md shadow-sky-200 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {loading ? <span className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full"></span> : "Send Reset Code"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleConfirmReset} className="space-y-5">
              {message && <p className="text-emerald-600 text-sm font-medium text-center bg-emerald-50 py-2 rounded-lg">{message}</p>}
              
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">6-Digit Code</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <KeyRound className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all font-mono tracking-widest"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">New Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all"
                    required
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              {error && <p className="text-red-500 text-sm font-medium text-center bg-red-50 py-2 rounded-lg">{error}</p>}
              
              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-md shadow-sky-200 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {loading ? <span className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full"></span> : "Reset Password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
