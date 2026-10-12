import { useEffect, useState } from 'react';
import { CreditCard, Power, ShieldCheck } from 'lucide-react';
import { AdminLayout } from '../AdminLayout.jsx';
import { fetchAdminRecords, updateAdminTableRow } from '../adminService.js';

export function AdminPaymentControlPage() {
  const [setting, setSetting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  async function load() {
    setError('');
    try { const data = await fetchAdminRecords('paymentSettings'); setSetting(data.rows?.[0] || null); }
    catch (err) { setError(err.message || 'Unable to load Razorpay payment settings.'); }
  }
  useEffect(() => { load(); }, []);
  async function setEnabled(enabled) {
    if (!setting?.id) return;
    setSaving(true); setError('');
    try {
      const data = await updateAdminTableRow('records/paymentSettings', setting.id, { status: enabled ? 'Enabled' : 'Disabled', title: 'Razorpay Payment Control', notes: enabled ? 'Razorpay checkout is enabled by admin.' : 'Razorpay checkout is disabled by admin.' });
      setSetting(data.row || { ...setting, status: enabled ? 'Enabled' : 'Disabled' });
    } catch (err) { setError(err.message || 'Unable to update Razorpay payment setting.'); }
    finally { setSaving(false); }
  }
  const enabled = setting?.status === 'Enabled';
  return <AdminLayout><main className="p-4 md:p-7"><div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="mb-6 flex items-start gap-4"><span className={`rounded-xl p-3 ${enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}><CreditCard size={26} /></span><div><h1 className="m-0 text-xl font-black text-slate-900">Razorpay Payment Control</h1><p className="mt-1 text-sm text-slate-500">Control whether users can open a new Razorpay checkout.</p></div></div><div className={`mb-6 rounded-xl border p-4 ${enabled ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}><div className="flex items-center gap-2 font-bold"><ShieldCheck size={18} />Razorpay is currently {enabled ? 'Enabled' : 'Disabled'}</div><p className="mb-0 mt-1 text-sm">{enabled ? 'Users can pay after their free trial ends.' : 'New Razorpay payment and verification checkouts are blocked.'}</p></div>{error && <p className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}<div className="flex flex-wrap gap-3"><button disabled={saving || enabled} onClick={() => setEnabled(true)} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"><Power size={16} />Enable Razorpay</button><button disabled={saving || !enabled} onClick={() => setEnabled(false)} className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"><Power size={16} />Disable Razorpay</button></div></div></main></AdminLayout>;
}
