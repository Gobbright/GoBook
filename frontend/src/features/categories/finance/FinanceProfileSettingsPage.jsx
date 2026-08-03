import { useEffect, useState } from 'react';
import { Building2, LoaderCircle, ReceiptText, Save, Settings } from 'lucide-react';

import { FinanceBillNav } from './FinanceBillNav.jsx';
import { financeApi } from './financeApi.js';
import {
  ErrorState, FinanceCard, FinancePage, LoadingState,
  fieldClass, primaryButton,
} from './FinanceUi.jsx';

const defaults = {
  businessName: '',
  phone: '',
  address: '',
  city: '',
  state: 'Tamil Nadu',
  pincode: '',
  gstin: '',
  financeReceiptPrefix: 'FIN-',
  financeBillFooter: 'Thank you for your payment.',
};

export function FinanceProfileSettingsPage() {
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    financeApi.settings()
      .then((data) => {
        setSettings(data);
        setForm({ ...defaults, ...data });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function set(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const updated = await financeApi.updateSettings({
        ...settings,
        ...form,
        financeReceiptPrefix: form.financeReceiptPrefix || 'FIN-',
        financeBillFooter: form.financeBillFooter || defaults.financeBillFooter,
      });
      setSettings(updated);
      setForm({ ...defaults, ...updated });
      setSuccess('Finance profile settings saved');
      window.dispatchEvent(new CustomEvent('gobook:settings-updated', { detail: { settings: updated } }));
    } catch (err) {
      setError(err.message || 'Unable to save finance profile');
    } finally {
      setSaving(false);
    }
  }

  return (
    <FinancePage title="Profile Settings" description="Set the finance bill profile, receipt prefix and PDF footer.">
      <FinanceBillNav />
      {loading && <LoadingState />}
      {!loading && error && !settings && <ErrorState message={error} />}
      {!loading && settings && (
        <FinanceCard className="mx-auto max-w-4xl p-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-[#4f90ff] dark:bg-blue-950">
              <Settings size={20} />
            </span>
            <div>
              <h2 className="m-0 text-base font-black text-slate-900 dark:text-white">Finance bill profile</h2>
              <p className="mb-0 mt-0.5 text-xs text-slate-500">These details print on Auto Bill and Manual Bill PDFs.</p>
            </div>
          </div>
          <form onSubmit={save} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                <span className="inline-flex items-center gap-1.5"><Building2 size={14} /> Business name</span>
                <input value={form.businessName} onChange={set('businessName')} className={`${fieldClass} mt-1.5`} />
              </label>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                Phone
                <input value={form.phone} onChange={set('phone')} className={`${fieldClass} mt-1.5`} />
              </label>
            </div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
              Address
              <input value={form.address} onChange={set('address')} className={`${fieldClass} mt-1.5`} />
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                City
                <input value={form.city} onChange={set('city')} className={`${fieldClass} mt-1.5`} />
              </label>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                State
                <input value={form.state} onChange={set('state')} className={`${fieldClass} mt-1.5`} />
              </label>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                Pincode
                <input value={form.pincode} onChange={set('pincode')} className={`${fieldClass} mt-1.5`} maxLength={6} />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                GSTIN
                <input value={form.gstin} onChange={set('gstin')} className={`${fieldClass} mt-1.5`} />
              </label>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                <span className="inline-flex items-center gap-1.5"><ReceiptText size={14} /> Receipt prefix</span>
                <input value={form.financeReceiptPrefix} onChange={set('financeReceiptPrefix')} className={`${fieldClass} mt-1.5`} placeholder="FIN-" />
              </label>
            </div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
              Bill footer
              <input value={form.financeBillFooter} onChange={set('financeBillFooter')} className={`${fieldClass} mt-1.5`} />
            </label>
            {error && <p className="m-0 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 dark:bg-red-950/40">{error}</p>}
            {success && <p className="m-0 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 dark:bg-blue-950/40">{success}</p>}
            <button type="submit" disabled={saving} className={primaryButton}>
              {saving ? <LoaderCircle className="animate-spin" size={17} /> : <Save size={17} />}
              {saving ? 'Saving...' : 'Save profile settings'}
            </button>
          </form>
        </FinanceCard>
      )}
    </FinancePage>
  );
}
