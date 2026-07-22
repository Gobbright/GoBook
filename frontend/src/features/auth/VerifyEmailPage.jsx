import { redirectTo } from '../../routes/navigation.js';
import { useState } from 'react';
import { CheckCircle2, Mail, RefreshCw } from 'lucide-react';

import { getCurrentUser, logout, resendEmailVerificationOtp, verifyEmailOtp } from '../../services/authService.js';
import { AuthLayout } from './AuthLayout.jsx';
import { ERROR_BOX, ERROR_TEXT, HEADING, INPUT, MUTED, SUBTEXT } from './authTheme.jsx';

export function VerifyEmailPage() {
  const user = getCurrentUser();
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      await verifyEmailOtp(otp);
      redirectTo('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid OTP');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setError('');
    setMessage('');
    setResending(true);
    try {
      const data = await resendEmailVerificationOtp();
      setMessage(data.message || 'OTP sent again');
    } catch (err) {
      setError(err.message || 'Unable to resend OTP');
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthLayout compact cardMaxWidth={400}>
      <div className="text-center mb-5">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 mx-auto mb-3 flex items-center justify-center text-blue-600">
          <Mail size={24} />
        </div>
        <h2 className={`text-[21px] font-bold m-0 mb-1 ${HEADING}`}>Verify Email</h2>
        <p className={`text-[12.5px] m-0 ${SUBTEXT}`}>Enter the OTP sent to your email</p>
        <p className={`text-[12px] m-0 mt-2 truncate ${MUTED}`}>{user?.email}</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          value={otp}
          onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
          className={`${INPUT} pl-3 text-center tracking-[8px] text-[20px] font-extrabold`}
          placeholder="000000"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          required
        />

        {error && <div className={`rounded-xl px-3 py-2 ${ERROR_BOX}`}><span className={`text-[12px] ${ERROR_TEXT}`}>{error}</span></div>}
        {message && <div className="rounded-xl px-3 py-2 bg-emerald-50 text-emerald-700 text-[12px] border border-emerald-100">{message}</div>}

        <button type="submit" disabled={submitting || otp.length !== 6} className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-white font-bold text-[14px] border-0 cursor-pointer disabled:opacity-60" style={{ background: 'linear-gradient(135deg, #4f90ff 0%, #6366f1 100%)' }}>
          <CheckCircle2 size={17} />
          {submitting ? 'Verifying...' : 'Verify and Continue'}
        </button>

        <button type="button" onClick={handleResend} disabled={resending} className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-[12px] cursor-pointer disabled:opacity-60">
          <RefreshCw size={14} />
          {resending ? 'Sending...' : 'Resend OTP'}
        </button>

        <button type="button" onClick={logout} className="bg-transparent border-0 cursor-pointer text-[11.5px] font-bold text-slate-500">Use another account</button>
      </form>
    </AuthLayout>
  );
}