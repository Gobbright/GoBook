import { useState } from 'react';
import { Eye, EyeOff, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { loginAdmin } from './adminService.js';

export function MainAdminLoginPage() {
  const navigate = useNavigate();
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await loginAdmin(adminId, password);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid Admin ID or password.');
    } finally {
      setSubmitting(false);
    }
  }

  async function quickLogin() {
    const localAdminId = import.meta.env.VITE_LOCAL_MAIN_ADMIN_ID;
    const localAdminPassword = import.meta.env.VITE_LOCAL_MAIN_ADMIN_PASSWORD;
    if (!localAdminId || !localAdminPassword) {
      setError('Local admin credentials are not configured.');
      return;
    }

    setAdminId(localAdminId);
    setPassword(localAdminPassword);
    setError('');
    setSubmitting(true);
    try {
      await loginAdmin(localAdminId, localAdminPassword);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.message || 'Quick login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-7 shadow-2xl">
        <div className="mb-7 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400"><ShieldCheck size={30} /></span>
          <h1 className="mb-1 mt-4 text-[22px] font-black text-white">Main Admin Login</h1>
          <p className="m-0 text-[13px] text-slate-400">Manage all GoBook businesses, users, payments and system records.</p>
        </div>
        <div className="space-y-4">
          <label className="block"><span className="mb-1.5 block text-[12px] font-bold text-slate-300">Admin ID</span><div className="relative"><UserRound size={16} className="absolute left-3 top-3 text-slate-500" /><input required autoFocus value={adminId} onChange={(event) => setAdminId(event.target.value)} className="h-10 w-full rounded-lg border border-slate-700 bg-slate-800 pl-10 pr-3 text-[13px] text-white outline-none focus:border-emerald-500" placeholder="Enter Admin ID" /></div></label>
          <label className="block"><span className="mb-1.5 block text-[12px] font-bold text-slate-300">Password</span><div className="relative"><LockKeyhole size={16} className="absolute left-3 top-3 text-slate-500" /><input required type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} className="h-10 w-full rounded-lg border border-slate-700 bg-slate-800 pl-10 pr-10 text-[13px] text-white outline-none focus:border-emerald-500" placeholder="Enter password" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 border-0 bg-transparent text-slate-400">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
          {error && <p className="m-0 rounded-lg border border-red-900/60 bg-red-950/50 px-3 py-2 text-[12px] text-red-300">{error}</p>}
          <button disabled={submitting} className="h-11 w-full rounded-lg border-0 bg-emerald-600 text-[13px] font-black text-white hover:bg-emerald-500 disabled:opacity-60">{submitting ? 'Signing in…' : 'Open Main Admin Dashboard'}</button>
        </div>
        <button type="button" disabled={submitting} onClick={quickLogin} className="mt-4 h-10 w-full rounded-lg border border-emerald-500/50 bg-emerald-500/10 text-[12px] font-black text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-60">Quick Login (Local Admin)</button>
      </form>
    </main>
  );
}
