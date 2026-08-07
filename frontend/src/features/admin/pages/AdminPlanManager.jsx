import { useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { CATEGORIES, CATEGORY_LABELS } from '../../../constants/categories.js';
import { fetchSubscriptionPlans, updateSubscriptionPlan } from '../adminService.js';

const money = (value) => '₹' + Number(value || 0).toLocaleString('en-IN');

function PlanEditor({ plan, onSaved }) {
  const [amount, setAmount] = useState(String(plan.amount));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function save() {
    setSaving(true);
    setMessage('');
    try {
      const data = await updateSubscriptionPlan(plan.id, { amount: Number(amount), enabled: plan.enabled });
      onSaved(data.plan);
      setMessage('Saved');
    } catch (error) {
      setMessage(error.message || 'Unable to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between"><h3 className="m-0 text-lg font-black">{plan.name}</h3><span className="text-xs font-bold text-slate-500">Annual</span></div>
      <p className="mt-2 text-2xl font-black text-indigo-600">{money(amount)}</p>
      <label className="mt-4 block text-xs font-bold text-slate-600">Price in rupees</label>
      <input type="number" min="1" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-bold outline-none focus:border-indigo-500 dark:bg-slate-800" />
      <div className="mt-4 space-y-1.5">{plan.features.map((feature) => <p key={feature} className="m-0 text-xs text-slate-500">✓ {feature}</p>)}</div>
      <button type="button" onClick={save} disabled={saving} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border-0 bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white cursor-pointer disabled:opacity-60"><Save size={15} />{saving ? 'Saving...' : 'Save price'}</button>
      {message && <p className="mb-0 mt-2 text-center text-xs font-bold text-slate-500">{message}</p>}
    </article>
  );
}

export function AdminPlanManager() {
  const [plans, setPlans] = useState([]);
  const [category, setCategory] = useState('retail');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSubscriptionPlans()
      .then((data) => setPlans(data.plans || []))
      .catch((err) => setError(err.message || 'Unable to load plans'))
      .finally(() => setLoading(false));
  }, []);

  const categoryPlans = useMemo(
    () => plans.filter((plan) => plan.category === category),
    [category, plans],
  );
  function replacePlan(updated) {
    setPlans((current) => current.map((plan) => plan.id === updated.id ? updated : plan));
  }

  return (
    <main className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <section className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-600 to-violet-600 p-5 text-white shadow-lg">
        <p className="m-0 text-xs font-black uppercase tracking-widest text-indigo-100">Admin controlled pricing</p>
        <h2 className="mb-1 mt-2 text-2xl font-black">Basic, Mid & Advanced packages</h2>
        <p className="m-0 text-sm text-indigo-100">Checkout always uses these database prices. Client-submitted amounts are ignored.</p>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <label className="text-xs font-black uppercase tracking-wide text-slate-500">Business category</label>
        <select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-bold outline-none md:max-w-sm dark:bg-slate-800">
          {CATEGORIES.map((item) => <option key={item.value} value={item.value}>{CATEGORY_LABELS[item.value]}</option>)}
        </select>
      </section>
      {loading && <div className="rounded-xl border bg-white p-8 text-center text-slate-500">Loading plan prices...</div>}
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>}
      {!loading && !error && <section className="grid gap-4 lg:grid-cols-3">{categoryPlans.map((plan) => <PlanEditor key={plan.id} plan={plan} onSaved={replacePlan} />)}</section>}
    </main>
  );
}
