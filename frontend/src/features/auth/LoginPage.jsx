import { redirectTo } from '../../routes/navigation.js';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarDays, Eye, EyeOff, Lock, Mail } from 'lucide-react';

import { commitAuthSession, googleLogin, login } from '../../services/authService.js';
import { commitAdminSession, loginAdmin } from '../admin/adminService.js';
import { renderGoogleSignInButton } from '../../services/googleAuth.js';
import { AuthLayout } from './AuthLayout.jsx';
import { ERROR_BOX, ERROR_TEXT, EYE_BUTTON, HEADING, ICON, INPUT, LABEL, MUTED, SUBTEXT } from './authTheme.jsx';
import { LaunchExperience } from './LaunchExperience.jsx';

const preventPasswordPaste = (event) => event.preventDefault();

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
    </svg>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deviceChallenge, setDeviceChallenge] = useState(null);
  const [deviceOtp, setDeviceOtp] = useState('');
  const googleButtonRef = useRef(null);
  const transitionTimerRef = useRef(null);
  const [googleReady, setGoogleReady] = useState(false);
  const [authTransition, setAuthTransition] = useState(null);

  function resolvePostLoginPath(user = {}, adminToken = '') {
    if (user.isPlatformOwner || adminToken) return '/admin';
    if (user.needsEmailVerification) return '/verify-email';
    if (user.needsOnboarding && !user.businessId) return '/register';
    if (user.billingStatus === 'PAYMENT_METHOD_VERIFICATION_PENDING') return '/payment-method-verification';
    if (
      user.subscriptionStatus === 'expired'
      || user.billingStatus === 'TRIAL_EXPIRED'
      || user.billingStatus === 'SUBSCRIPTION_EXPIRED'
    ) return '/payment';
    return '/dashboard';
  }

  function finishSignIn({ token, user, adminToken, admin } = {}) {
    const nextPath = resolvePostLoginPath(user, adminToken);
    setAuthTransition({ nextPath });
    transitionTimerRef.current = window.setTimeout(() => {
      commitAuthSession(token, user);
      commitAdminSession(adminToken, admin);
      if (nextPath === '/admin') sessionStorage.removeItem('gobook.lastRoute');
      redirectTo(nextPath);
    }, 2000);
  }

  useEffect(() => {
    if (!googleButtonRef.current) return undefined;
    let active = true;
    renderGoogleSignInButton(
      googleButtonRef.current,
      async (credential) => {
        if (!active) return;
        setSubmitting(true);
        setError('');
        try {
          const data = await googleLogin(credential, { deferSession: true });
          if (data.registrationRequired) {
            navigate('/register', { state: { email: data.email } });
            return;
          }
          finishSignIn(data);
        } catch (err) {
          if (active) setError(err.message || 'Google sign-in failed. Please try again.');
        } finally {
          if (active) setSubmitting(false);
        }
      },
      (err) => {
        console.warn('[Google Sign-In] Error:', err);
      },
      { width: 220, logoAlignment: 'center', shape: 'pill' }
    )
      .then(() => {
        if (!active) return;
        const checkReady = () => {
          if (!active || !googleButtonRef.current) return;
          if (googleButtonRef.current.querySelector('iframe, [role="button"]')) {
            setGoogleReady(true);
          }
        };
        checkReady();
        const t1 = setTimeout(checkReady, 400);
        const t2 = setTimeout(checkReady, 1200);
        return () => { clearTimeout(t1); clearTimeout(t2); };
      })
      .catch((err) => {
        console.warn('[Google Sign-In] Init failed:', err);
      });
    return () => { active = false; };
  }, []);

  function handleGoogleFallbackClick() {
    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed()) {
            const reason = notification.getNotDisplayedReason?.() || '';
            console.warn('[Google prompt not displayed]:', reason);
            setError(`Google sign-in prompt could not open. Please ensure ${window.location.origin} is added to Authorized JavaScript Origins in Google Cloud Console.`);
          }
        });
        return;
      } catch (e) {
        console.warn('Google prompt exception:', e);
      }
    }
    setError(`Google sign-in service is initializing. Please verify ${window.location.origin} is added to Authorized JavaScript Origins in Google Cloud Console.`);
  }

  useEffect(() => () => {
    if (transitionTimerRef.current) window.clearTimeout(transitionTimerRef.current);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      if (!email.includes('@')) {
        await loginAdmin(email, password);
        setAuthTransition({ nextPath: '/admin' });
        transitionTimerRef.current = window.setTimeout(() => {
          sessionStorage.removeItem('gobook.lastRoute');
          redirectTo('/admin');
        }, 2000);
        return;
      }
      const data = await login(email, password, { deferSession: true });
      if (data.deviceVerificationRequired) {
        setDeviceChallenge(data);
        setMessage(data.message || 'OTP sent to your email. Verify to continue on this device.');
        setSubmitting(false);
        return;
      }
      finishSignIn(data);
    } catch (err) {
      setError(err.message || 'Invalid email or password. Please try again.');
      setSubmitting(false);
    }
  }

  async function handleDeviceOtpSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      const data = await login(email, password, { deferSession: true, deviceOtp });
      finishSignIn(data);
    } catch (err) {
      setError(err.message || 'Invalid or expired OTP. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <LaunchExperience>
      <AuthLayout compact cardMaxWidth={500}>
        <div className="auth-login-heading text-center mb-4 sm:mb-5">
          <div className="auth-login-card-logo hidden sm:flex justify-center mb-2.5">
            <div className="inline-flex bg-white rounded-xl px-3.5 py-2">
              <img src="/gobook-logo-full.png" alt="GoBook" className="h-8 w-auto object-contain" />
            </div>
          </div>
          <h2 className={`text-[20px] sm:text-[21px] font-bold m-0 mb-1 ${HEADING}`}>Welcome back!</h2>
          <p className={`text-[12px] sm:text-[12.5px] m-0 mb-2 ${SUBTEXT}`}>Sign in to continue to your account</p>
          <div className="auth-login-indicator" aria-hidden="true"><span /><b /><span /></div>
        </div>

          <form onSubmit={deviceChallenge ? handleDeviceOtpSubmit : handleSubmit} className="auth-login-form flex flex-col gap-3">
            {deviceChallenge && (
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-[12.5px] text-blue-800">
                This account is already active on another {deviceChallenge.deviceType}. Enter the OTP sent to your email to continue here and sign out the previous {deviceChallenge.deviceType}.
              </div>
            )}
            <div>
              <label htmlFor="email" className={LABEL}>Email Address</label>
              <div className="relative">
                <Mail size={15} className={ICON} />
                <input id="email" type="text" autoComplete="username" disabled={submitting || deviceChallenge} required placeholder="Enter email or admin ID" value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} />
              </div>
            </div>

            <div>
              <label htmlFor="password" className={LABEL}>Password</label>
              <div className="relative">
                <Lock size={15} className={ICON} />
                <input id="password" autoComplete="current-password" disabled={submitting || deviceChallenge} type={showPassword ? 'text' : 'password'} required placeholder="Enter your password" value={password} onPaste={preventPasswordPaste} onChange={(e) => setPassword(e.target.value)} className={`${INPUT} pr-11`} />
                <button type="button" onClick={() => setShowPassword((s) => !s)} aria-label={showPassword ? 'Hide password' : 'Show password'} className={`absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer bg-transparent border-0 p-0 flex items-center transition-colors ${EYE_BUTTON}`}>
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <div className="flex justify-end mt-1.5">
                <Link to="/forgot-password" className="text-[12.5px] font-semibold no-underline hover:underline" style={{ color: '#4f90ff' }}>Forgot Password?</Link>
              </div>
            </div>

            {deviceChallenge && (
              <div>
                <label htmlFor="deviceOtp" className={LABEL}>Email OTP</label>
                <input id="deviceOtp" type="text" inputMode="numeric" autoComplete="one-time-code" required maxLength={6} placeholder="Enter 6-digit OTP" value={deviceOtp} onChange={(e) => setDeviceOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} className={`${INPUT} pl-3 text-center tracking-[8px] text-[18px] font-extrabold`} />
              </div>
            )}

            {error && <div className={`rounded-xl px-4 py-2.5 ${ERROR_BOX}`}><span className={`text-[12.5px] ${ERROR_TEXT}`}>{error}</span></div>}
            {message && <div className="rounded-xl px-4 py-2.5 bg-emerald-50 text-emerald-700 text-[12.5px] border border-emerald-100">{message}</div>}

            <button type="submit" disabled={submitting} className="auth-cyber-submit w-full flex items-center justify-center gap-2.5 rounded-xl px-4 py-3 text-white font-bold text-[14px] border-0 cursor-pointer transition-all duration-150 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed mt-1" style={{ background: 'linear-gradient(135deg, #4f90ff 0%, #6366f1 100%)', boxShadow: '0 6px 24px -4px rgba(79,144,255,0.55)' }}>
              <ArrowRight size={18} />{submitting ? 'Signing in...' : deviceChallenge ? 'Verify & Sign In' : 'Sign In'}
            </button>

            {deviceChallenge && (
              <button type="button" disabled={submitting} onClick={() => { setDeviceChallenge(null); setDeviceOtp(''); setMessage(''); setError(''); }} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-bold text-slate-600 cursor-pointer disabled:opacity-60">
                Use different account
              </button>
            )}

            <Link
              to="/register"
              state={{ startTrial: true }}
              className="auth-trial-link w-full flex items-center justify-center gap-2.5 rounded-xl px-4 py-3 text-[14px] font-extrabold no-underline border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 transition-all duration-150 hover:bg-blue-100 dark:hover:bg-blue-500/25 active:scale-[0.99]"
            >
              <CalendarDays size={17} />
              Start 15 Day Free Trial
            </Link>

            <div className="flex items-center gap-3 my-1" aria-hidden="true"><span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" /><span className="text-[11px] text-slate-400 dark:text-slate-500">or continue with</span><span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" /></div>

            <div className="auth-google-row relative min-h-[44px] w-full flex items-center justify-center">
              {/* Branded Google Sign-In button: Always visible immediately */}
              <button
                type="button"
                onClick={handleGoogleFallbackClick}
                disabled={submitting}
                className={`w-full min-h-[44px] flex items-center justify-center rounded-xl px-4 py-2.5 text-[14px] font-semibold border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all shadow-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${googleReady ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
              >
                <div className="flex items-center gap-2">
                  <GoogleIcon />
                  <span>Sign in with Google</span>
                </div>
              </button>

              {/* Native Google iframe mounts over the fallback button when ready */}
              <div
                ref={googleButtonRef}
                className={`absolute inset-0 flex justify-center items-center overflow-hidden rounded-xl [&>div]:!w-[220px] [&>iframe]:!w-[220px] transition-opacity duration-200 ${googleReady ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
              />
            </div>
          </form>

          <p className={`auth-login-register text-center text-[12px] mt-3 mb-0 ${MUTED}`}>Don&apos;t have an account? <Link to="/register" className="font-bold no-underline hover:underline" style={{ color: '#4f90ff' }}>Create Account</Link></p>
      </AuthLayout>

      {authTransition && (
        <div className="auth-signin-transition" role="status" aria-live="polite">
          <div className="auth-signin-transition-shell">
            <img src="/gobook-logo-full.png" alt="GoBook Suite" />
          </div>
        </div>
      )}
    </LaunchExperience>
  );
}
