import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react';

import { login, loginWithGoogle } from '../../services/authService.js';
import { signInWithGoogle } from '../../services/googleAuth.js';
import { AuthLayout } from './AuthLayout.jsx';
import { ERROR_BOX, ERROR_TEXT, EYE_BUTTON, GoogleIcon, HEADING, ICON, INPUT, LABEL, MUTED, SUBTEXT } from './authTheme.jsx';
import { LaunchExperience } from './LaunchExperience.jsx';

export function LoginPage() {
  const [email,          setEmail]          = useState('');
  const [password,       setPassword]       = useState('');
  const [showPassword,   setShowPassword]   = useState(false);
  const [error,          setError]          = useState('');
  const [submitting,     setSubmitting]     = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await login(email, password);
      window.location.assign(user.needsEmailVerification ? '/verify-email' : '/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setError('');
    setGoogleSubmitting(true);
    try {
      const credential = await signInWithGoogle();
      const user = await loginWithGoogle(credential);
      window.location.assign(user.needsOnboarding ? '/google-onboarding' : '/dashboard');
    } catch (err) {
      setError(err.message || 'Google sign-in failed. Please try again.');
    } finally {
      setGoogleSubmitting(false);
    }
  }

  return (
    <LaunchExperience>
      <AuthLayout compact cardMaxWidth={400}>
      {/* Header */}
      <div className="text-center mb-4 sm:mb-5">
        <div className="hidden sm:flex justify-center mb-2.5">
          <div className="inline-flex bg-white rounded-xl px-3.5 py-2">
            <img src="/gobook-logo-full.png" alt="GoBook" className="h-8 w-auto object-contain" />
          </div>
        </div>
        <h2 className={`text-[20px] sm:text-[21px] font-bold m-0 mb-1 ${HEADING}`}>Welcome back!</h2>
        <p className={`text-[12px] sm:text-[12.5px] m-0 mb-2 ${SUBTEXT}`}>Sign in to continue to your account</p>
        <div className="w-10 h-[3px] mx-auto rounded-full" style={{ background: '#4f90ff' }} />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">

        {/* Email */}
        <div>
          <label htmlFor="email" className={LABEL}>Email Address</label>
          <div className="relative">
            <Mail size={15} className={ICON} />
            <input
              id="email" type="email" required placeholder="Enter your email address"
              value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT}
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className={LABEL}>Password</label>
          <div className="relative">
            <Lock size={15} className={ICON} />
            <input
              id="password" type={showPassword ? 'text' : 'password'} required
              placeholder="Enter your password" value={password}
              onChange={(e) => setPassword(e.target.value)} className={`${INPUT} pr-11`}
            />
            <button type="button" onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className={`absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer bg-transparent border-0 p-0 flex items-center transition-colors ${EYE_BUTTON}`}>
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <div className="flex justify-end mt-1.5">
            <a href="/forgot-password" className="text-[12.5px] font-semibold no-underline hover:underline"
               style={{ color: '#4f90ff' }}>
              Forgot Password?
            </a>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className={`rounded-xl px-4 py-2.5 ${ERROR_BOX}`}>
            <span className={`text-[12.5px] ${ERROR_TEXT}`}>{error}</span>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit" disabled={submitting}
          className="w-full flex items-center justify-center gap-2.5 rounded-xl px-4 py-3 text-white font-bold text-[14px] border-0 cursor-pointer transition-all duration-150 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed mt-1"
          style={{ background: 'linear-gradient(135deg, #4f90ff 0%, #6366f1 100%)', boxShadow: '0 6px 24px -4px rgba(79,144,255,0.55)' }}
        >
          <ArrowRight size={18} />
          {submitting ? 'Signing in…' : 'Sign In'}
        </button>

        <div className="flex items-center gap-3 my-0">
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
          <span className="text-[11.5px] font-medium text-slate-400 dark:text-slate-500">or continue with</span>
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleSubmitting}
          className="w-full flex items-center justify-center gap-2.5 rounded-xl px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-[13.5px] cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <GoogleIcon />
          {googleSubmitting ? 'Signing in…' : 'Sign in with Google'}
        </button>
      </form>

      <p className={`text-center text-[12px] mt-3 mb-0 ${MUTED}`}>
        Don&apos;t have an account?{' '}
        <a href="/register" className="font-bold no-underline hover:underline" style={{ color: '#4f90ff' }}>
          Create Account
        </a>
      </p>
      <div className="text-center mt-2">
        <a href="/admin-login" className="text-[12px] font-bold no-underline hover:underline" style={{ color: '#334155' }}>
          Admin Panel
        </a>
      </div>
      </AuthLayout>
    </LaunchExperience>
  );
}
