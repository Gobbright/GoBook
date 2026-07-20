import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, Lock, Sparkles, UserRound } from 'lucide-react';

import { loginAdmin } from './adminService.js';
import { AuthLayout } from '../auth/AuthLayout.jsx';
import { ERROR_BOX, ERROR_TEXT, EYE_BUTTON, HEADING, ICON, INPUT, LABEL, MUTED, SUBTEXT } from '../auth/authTheme.jsx';

export function AdminLoginPage() {
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await loginAdmin(adminId, password);
      window.location.hash = '/admin';
    } catch (err) {
      setError(err.message || 'Admin login failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleQuickLogin() {
    setError('');
    setSubmitting(true);
    try {
      await loginAdmin('admin', 'admin@123');
      window.location.hash = '/admin';
    } catch (err) {
      setError(err.message || 'Quick login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout compact cardMaxWidth={400}>
        {/* Header */}
        <div className="text-center mb-4 sm:mb-5">
          <div className="hidden sm:flex justify-center mb-2.5">
            <div className="inline-flex bg-white rounded-xl px-3.5 py-2">
              <img src="/gobook-logo-full.png" alt="GoBook" className="h-8 w-auto object-contain" />
            </div>
          </div>
          <h2 className={`text-[20px] sm:text-[21px] font-bold m-0 mb-1 ${HEADING}`}>Admin Panel</h2>
          <p className={`text-[12px] sm:text-[12.5px] m-0 mb-2 ${SUBTEXT}`}>Site owner control centre</p>
          <div className="w-10 h-[3px] mx-auto rounded-full" style={{ background: '#4f90ff' }} />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* Admin ID */}
          <div>
            <label htmlFor="adminId" className={LABEL}>Admin ID</label>
            <div className="relative">
              <UserRound size={15} className={ICON} />
              <input
                id="adminId"
                type="text"
                required
                placeholder="Enter your admin ID"
                value={adminId}
                onChange={(e) => setAdminId(e.target.value)}
                className={INPUT}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="adminPassword" className={LABEL}>Password</label>
            <div className="relative">
              <Lock size={15} className={ICON} />
              <input
                id="adminPassword"
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${INPUT} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className={`absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer bg-transparent border-0 p-0 flex items-center transition-colors ${EYE_BUTTON}`}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className={`rounded-xl px-4 py-2.5 ${ERROR_BOX}`}>
              <span className={`text-[12.5px] ${ERROR_TEXT}`}>{error}</span>
            </div>
          )}

          {/* Quick Login */}
          <button
            type="button"
            onClick={handleQuickLogin}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2.5 rounded-xl px-4 py-3 text-white font-bold text-[14px] border-0 cursor-pointer transition-all duration-150 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: '#10b981', boxShadow: '0 6px 24px -4px rgba(16,185,129,0.4)' }}
          >
            <Sparkles size={18} />
            {submitting ? 'Signing in…' : 'Quick Login'}
          </button>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2.5 rounded-xl px-4 py-3 text-white font-bold text-[14px] border-0 cursor-pointer transition-all duration-150 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #4f90ff 0%, #6366f1 100%)', boxShadow: '0 6px 24px -4px rgba(79,144,255,0.55)' }}
          >
            <ArrowRight size={18} />
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className={`text-center text-[12px] mt-3 mb-0 ${MUTED}`}>
          Not an admin?{' '}
          <a href="#/login" className="font-bold no-underline hover:underline" style={{ color: '#4f90ff' }}>
            User Login
          </a>
        </p>
    </AuthLayout>
  );
}
