import { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, KeyRound, Lock, Mail, ShieldCheck } from 'lucide-react';

import { requestPasswordReset, resetPasswordWithOtp } from '../../services/authService.js';
import { AuthLayout } from './AuthLayout.jsx';
import {
  BTN_PRIMARY, ERROR_BOX, ERROR_TEXT, EYE_BUTTON, HEADING, ICON, ICON_BOX_BLUE, ICON_BOX_SUCCESS,
  INFO_BOX, INFO_TEXT, INPUT, LABEL, SECONDARY_BUTTON, SECONDARY_BUTTON_TEXT, SUBTEXT, SUCCESS_BOX, SUCCESS_TEXT,
} from './authTheme.jsx';

const SPECIAL_CHAR_REGEX = /[^A-Za-z0-9]/;
const preventPasswordPaste = (event) => event.preventDefault();

function getPasswordChecks(password = '') {
  return [
    { key: 'length', label: '8 characters', passed: password.length >= 8 },
    { key: 'capital', label: '1 capital letter', passed: /[A-Z]/.test(password) },
    { key: 'number', label: '1 number', passed: /[0-9]/.test(password) },
    { key: 'special', label: '1 special character', passed: SPECIAL_CHAR_REGEX.test(password) },
  ];
}

function isStrongPassword(password = '') {
  return getPasswordChecks(password).every((item) => item.passed);
}

function PasswordRequirementPopover({ password, show }) {
  if (!show) return null;
  const checks = getPasswordChecks(password);
  const passedCount = checks.filter((item) => item.passed).length;
  const strong = passedCount === checks.length;

  return (
    <div className="absolute bottom-full left-0 z-30 mb-2 w-full max-w-[310px] rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className={`text-[10.5px] font-extrabold uppercase tracking-wide ${strong ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'}`}>
          {strong ? 'Strong password' : 'Required password'}
        </span>
        <span className={`text-[10.5px] font-bold ${strong ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'}`}>{passedCount}/4</span>
      </div>
      <div className="grid grid-cols-2 gap-x-2 gap-y-1">
        {checks.map((item) => (
          <span key={item.key} className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${item.passed ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'}`}>
            <span className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] ${item.passed ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300'}`}>
              {item.passed ? 'OK' : ''}
            </span>
            {item.label}
          </span>
        ))}
      </div>
      <span className="absolute left-6 top-full h-3 w-3 -translate-y-1.5 rotate-45 border-b border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900" />
    </div>
  );
}

export function ForgotPasswordPage() {
  const [email,           setEmail]           = useState('');
  const [otp,             setOtp]             = useState('');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword,    setShowPassword]    = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [step,            setStep]            = useState('email');
  const [message,         setMessage]         = useState('');
  const [error,           setError]           = useState('');
  const [submitting,      setSubmitting]      = useState(false);

  async function handleRequestOtp(e) {
    e.preventDefault();
    setError(''); setMessage(''); setSubmitting(true);
    try {
      await requestPasswordReset(email);
      setStep('reset');
      setMessage(`OTP sent to ${email}`);
    } catch (err) {
      setError(err.message || 'Unable to send OTP');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    setError(''); setMessage('');
    if (!/^\d{6}$/.test(otp.trim()))  { setError('Enter the 6-digit OTP sent to your email'); return; }
    if (!isStrongPassword(password))   { setError('Password must have 8 characters, 1 capital letter, 1 number, and 1 special character'); return; }
    if (password !== confirmPassword)  { setError('Passwords do not match'); return; }
    setSubmitting(true);
    try {
      await resetPasswordWithOtp({ email, otp: otp.trim(), password });
      setStep('done');
    } catch (err) {
      setError(err.message || 'Unable to reset password');
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Step: Done ── */
  if (step === 'done') {
    return (
      <AuthLayout>
        <div className="text-center mb-6">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${ICON_BOX_SUCCESS}`}>
            <CheckCircle2 size={26} className={SUCCESS_TEXT} />
          </div>
          <h2 className={`text-[22px] font-bold m-0 mb-1.5 ${HEADING}`}>Password Reset!</h2>
          <p className={`text-[13px] m-0 mb-3 ${SUBTEXT}`}>Your password has been updated successfully</p>
          <div className="w-10 h-[3px] mx-auto rounded-full" style={{ background: '#10b981' }} />
        </div>

        <div className={`rounded-xl px-4 py-3 mb-5 ${SUCCESS_BOX}`}>
          <p className={`text-[12.5px] m-0 ${SUCCESS_TEXT}`}>
            You can now sign in with your new password.
          </p>
        </div>

        <a href="/login"
           className="w-full flex items-center justify-center gap-2.5 rounded-xl px-4 py-3.5 text-white font-bold text-[15px] no-underline transition-all duration-150 active:scale-[0.99]"
           style={BTN_PRIMARY}>
          <ArrowRight size={18} />
          Back to Sign In
        </a>
      </AuthLayout>
    );
  }

  /* ── Step: Reset (OTP + new password) ── */
  if (step === 'reset') {
    return (
      <AuthLayout>
        <div className="text-center mb-6">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${ICON_BOX_BLUE}`}>
            <KeyRound size={24} style={{ color: '#4f90ff' }} />
          </div>
          <h2 className={`text-[22px] font-bold m-0 mb-1.5 ${HEADING}`}>Check Your Email</h2>
          <p className={`text-[13px] m-0 mb-3 ${SUBTEXT}`}>
            Enter the OTP sent to{' '}
            <span className={`font-semibold ${HEADING}`}>{email}</span>
          </p>
          <div className="w-10 h-[3px] mx-auto rounded-full" style={{ background: '#4f90ff' }} />
        </div>

        {message && (
          <div className={`rounded-xl px-4 py-2.5 mb-4 ${INFO_BOX}`}>
            <span className={`text-[12.5px] ${INFO_TEXT}`}>{message}</span>
          </div>
        )}

        <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
          {/* OTP */}
          <div>
            <label htmlFor="reset-otp" className={LABEL}>Email OTP</label>
            <div className="relative">
              <KeyRound size={15} className={ICON} />
              <input id="reset-otp" type="text" inputMode="numeric" autoComplete="one-time-code"
                     required maxLength={6} placeholder="Enter 6-digit OTP"
                     value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                     className={INPUT} />
            </div>
          </div>

          {/* New password */}
          <div>
            <label htmlFor="new-password" className={LABEL}>New Password</label>
            <div className="relative">
              <PasswordRequirementPopover password={password} show={passwordFocused} />
              <Lock size={15} className={ICON} />
              <input id="new-password" type={showPassword ? 'text' : 'password'} required
                     placeholder="Enter your password" value={password}
                     onPaste={preventPasswordPaste}
                     onFocus={() => setPasswordFocused(true)}
                     onBlur={() => setPasswordFocused(false)}
                     onChange={(e) => setPassword(e.target.value)} className={`${INPUT} pr-11`} />
              <button type="button" onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className={`absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer bg-transparent border-0 p-0 flex items-center transition-colors ${EYE_BUTTON}`}>
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div>
            <label htmlFor="confirm-new-password" className={LABEL}>Confirm New Password</label>
            <div className="relative">
              <Lock size={15} className={ICON} />
              <input id="confirm-new-password" type={showPassword ? 'text' : 'password'} required
                     value={confirmPassword}
                     onPaste={preventPasswordPaste}
                     onChange={(e) => setConfirmPassword(e.target.value)} className={INPUT} />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className={`rounded-xl px-4 py-2.5 ${ERROR_BOX}`}>
              <span className={`text-[12.5px] ${ERROR_TEXT}`}>{error}</span>
            </div>
          )}

          {/* Submit */}
          <button type="submit" disabled={submitting}
                  className="w-full flex items-center justify-center gap-2.5 rounded-xl px-4 py-3.5 text-white font-bold text-[15px] border-0 cursor-pointer transition-all duration-150 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed mt-1"
                  style={BTN_PRIMARY}>
            <ArrowRight size={18} />
            {submitting ? 'Resetting…' : 'Reset Password'}
          </button>

          {/* Use different email */}
          <button type="button" disabled={submitting}
                  onClick={() => { setStep('email'); setOtp(''); setPassword(''); setConfirmPassword(''); setMessage(''); setError(''); }}
                  className={`w-full rounded-xl px-4 py-3 font-semibold text-[13.5px] cursor-pointer transition-all duration-150 disabled:opacity-50 ${SECONDARY_BUTTON} ${SECONDARY_BUTTON_TEXT}`}>
            Use a different email
          </button>
        </form>
      </AuthLayout>
    );
  }

  /* ── Step: Email ── */
  return (
    <AuthLayout>
      <div className="text-center mb-7">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${ICON_BOX_BLUE}`}>
          <ShieldCheck size={24} style={{ color: '#4f90ff' }} />
        </div>
        <h2 className={`text-[22px] font-bold m-0 mb-1.5 ${HEADING}`}>Reset Password</h2>
        <p className={`text-[13px] m-0 mb-3 ${SUBTEXT}`}>
          Enter your email and we&apos;ll send you an OTP
        </p>
        <div className="w-10 h-[3px] mx-auto rounded-full" style={{ background: '#4f90ff' }} />
      </div>

      <form onSubmit={handleRequestOtp} className="flex flex-col gap-4">
        <div>
          <label htmlFor="forgot-email" className={LABEL}>Email Address</label>
          <div className="relative">
            <Mail size={15} className={ICON} />
            <input id="forgot-email" type="email" required placeholder="Enter your email address"
                   value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} />
          </div>
        </div>

        {error && (
          <div className={`rounded-xl px-4 py-2.5 ${ERROR_BOX}`}>
            <span className={`text-[12.5px] ${ERROR_TEXT}`}>{error}</span>
          </div>
        )}

        <button type="submit" disabled={submitting}
                className="w-full flex items-center justify-center gap-2.5 rounded-xl px-4 py-3.5 text-white font-bold text-[15px] border-0 cursor-pointer transition-all duration-150 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed mt-1"
                style={BTN_PRIMARY}>
          <ArrowRight size={18} />
          {submitting ? 'Sending OTP…' : 'Send OTP'}
        </button>
      </form>

      <p className="text-center mt-5 mb-0">
        <a href="/login"
           className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold no-underline hover:underline"
           style={{ color: '#4f90ff' }}>
          <ArrowLeft size={14} />
          Back to Sign In
        </a>
      </p>
    </AuthLayout>
  );
}
