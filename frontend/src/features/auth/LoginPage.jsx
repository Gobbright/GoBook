import { redirectTo } from '../../routes/navigation.js';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, Lock, Mail, Sparkles } from 'lucide-react';

import { commitAuthSession, googleLogin, login } from '../../services/authService.js';
import { renderGoogleSignInButton } from '../../services/googleAuth.js';
import { AuthLayout } from './AuthLayout.jsx';
import { ERROR_BOX, ERROR_TEXT, EYE_BUTTON, HEADING, ICON, INPUT, LABEL, MUTED, SUBTEXT } from './authTheme.jsx';
import { LaunchExperience } from './LaunchExperience.jsx';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const googleButtonRef = useRef(null);
  const transitionTimerRef = useRef(null);
  const [googleError, setGoogleError] = useState('');
  const [authTransition, setAuthTransition] = useState(null);

  function resolvePostLoginPath(user = {}) {
    if (user.isPlatformOwner) return '/platform-admin';
    if (user.needsEmailVerification) return '/verify-email';
    if (user.needsOnboarding && !user.businessId) return '/register';
    return '/dashboard';
  }

  function finishSignIn({ token, user } = {}) {
    const nextPath = resolvePostLoginPath(user);
    setAuthTransition({ nextPath });
    transitionTimerRef.current = window.setTimeout(() => {
      commitAuthSession(token, user);
      redirectTo(nextPath);
    }, 2000);
  }

  useEffect(() => {
    if (!googleButtonRef.current) return undefined;
    let active = true;
    renderGoogleSignInButton(googleButtonRef.current, async (credential) => {
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
    }, (err) => active && setGoogleError(err.message || 'Google sign-in is unavailable'))
      .catch((err) => active && setGoogleError(err.message || 'Google sign-in is unavailable'));
    return () => { active = false; };
  }, []);

  useEffect(() => () => {
    if (transitionTimerRef.current) window.clearTimeout(transitionTimerRef.current);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      const data = await login(email, password, { deferSession: true });
      finishSignIn(data);
    } catch (err) {
      setError(err.message || 'Invalid email or password. Please try again.');
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

          <form onSubmit={handleSubmit} className="auth-login-form flex flex-col gap-3">
            <div>
              <label htmlFor="email" className={LABEL}>Email Address</label>
              <div className="relative">
                <Mail size={15} className={ICON} />
                <input id="email" type="email" autoComplete="username" disabled={submitting} required placeholder="Enter your email address" value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} />
              </div>
            </div>

            <div>
              <label htmlFor="password" className={LABEL}>Password</label>
              <div className="relative">
                <Lock size={15} className={ICON} />
                <input id="password" autoComplete="current-password" disabled={submitting} type={showPassword ? 'text' : 'password'} required placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} className={`${INPUT} pr-11`} />
                <button type="button" onClick={() => setShowPassword((s) => !s)} aria-label={showPassword ? 'Hide password' : 'Show password'} className={`absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer bg-transparent border-0 p-0 flex items-center transition-colors ${EYE_BUTTON}`}>
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <div className="flex justify-end mt-1.5">
                <Link to="/forgot-password" className="text-[12.5px] font-semibold no-underline hover:underline" style={{ color: '#4f90ff' }}>Forgot Password?</Link>
              </div>
            </div>

            {error && <div className={`rounded-xl px-4 py-2.5 ${ERROR_BOX}`}><span className={`text-[12.5px] ${ERROR_TEXT}`}>{error}</span></div>}
            {message && <div className="rounded-xl px-4 py-2.5 bg-emerald-50 text-emerald-700 text-[12.5px] border border-emerald-100">{message}</div>}

            <button type="submit" disabled={submitting} className="auth-cyber-submit w-full flex items-center justify-center gap-2.5 rounded-xl px-4 py-3 text-white font-bold text-[14px] border-0 cursor-pointer transition-all duration-150 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed mt-1" style={{ background: 'linear-gradient(135deg, #4f90ff 0%, #6366f1 100%)', boxShadow: '0 6px 24px -4px rgba(79,144,255,0.55)' }}>
              <ArrowRight size={18} />{submitting ? 'Signing in...' : 'Sign In'}
            </button>

            <Link
              to="/register"
              state={{ startTrial: true }}
              className="w-full flex items-center justify-center gap-2.5 rounded-xl px-4 py-3 text-[14px] font-extrabold no-underline border border-blue-200 bg-blue-50 text-blue-700 transition-all duration-150 hover:bg-blue-100 active:scale-[0.99]"
            >
              <Sparkles size={17} />
              Start 15 Day Free Trial
            </Link>

            <div className="flex items-center gap-3 my-1" aria-hidden="true"><span className="h-px flex-1 bg-slate-200" /><span className="text-[11px] text-slate-400">or continue with</span><span className="h-px flex-1 bg-slate-200" /></div>
            {googleError ? <p className="m-0 text-center text-[12px] text-red-600">{googleError}</p> : <div ref={googleButtonRef} className="min-h-10 w-full flex justify-center" />}
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
