import { useState } from 'react';
import { Lock, LogIn, ShieldCheck, Sparkles, UserRound } from 'lucide-react';

import { loginAdmin } from './adminService.js';

export function AdminLoginPage() {
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await loginAdmin(adminId, password);
      window.location.assign('/admin');
    } catch (err) {
      setError(err.message || 'Admin login failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleQuickLogin() {
    setError('');
    setAdminId('admin');
    setPassword('admin@123');
    setSubmitting(true);
    try {
      await loginAdmin('admin', 'admin@123');
      window.location.assign('/admin');
    } catch (err) {
      setError(err.message || 'Admin quick login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f6f8] flex items-center justify-center p-4 text-slate-900">
      <div className="w-full max-w-[390px] bg-white border border-slate-200 rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-lg bg-slate-900 text-white flex items-center justify-center">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 className="text-[22px] font-extrabold m-0 tracking-tight">Admin Panel</h1>
            <p className="text-[12px] text-slate-500 m-0">Site owner control centre</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="adminId" className="block text-[12px] font-bold text-slate-700 mb-1.5">Admin ID</label>
            <div className="relative">
              <UserRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="adminId"
                value={adminId}
                onChange={(e) => setAdminId(e.target.value)}
                className="w-full h-11 rounded-md border border-slate-200 pl-9 pr-3 text-[14px] outline-none focus:border-slate-900"
                placeholder="Enter admin ID"
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="adminPassword" className="block text-[12px] font-bold text-slate-700 mb-1.5">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="adminPassword"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 rounded-md border border-slate-200 pl-9 pr-3 text-[14px] outline-none focus:border-slate-900"
                placeholder="Enter password"
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          {error && <div className="rounded-md bg-red-50 border border-red-100 px-3 py-2 text-[12px] text-red-700">{error}</div>}

          <button
            type="button"
            onClick={handleQuickLogin}
            disabled={submitting}
            className="w-full h-11 rounded-md bg-emerald-600 text-white text-[14px] font-bold border-0 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Sparkles size={17} />
            Quick Login
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-11 rounded-md bg-slate-900 text-white text-[14px] font-bold border-0 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <LogIn size={17} />
            {submitting ? 'Checking...' : 'Login to Admin'}
          </button>
        </form>

        <div className="mt-5 flex justify-between text-[12px]">
          <a href="/login" className="text-slate-500 hover:text-slate-900 no-underline">Back to user login</a>
          <span className="text-slate-400">Protected</span>
        </div>
      </div>
    </div>
  );
}