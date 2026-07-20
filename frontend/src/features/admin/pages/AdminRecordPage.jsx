import { useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, Search } from 'lucide-react';

import { AdminLayout } from '../AdminLayout.jsx';
import { createAdminRecord, fetchAdminRecords, isAdminAuthenticated } from '../adminService.js';
import { DataTable } from '../components/DataTable.jsx';

const ADMIN_RECORD_VIEWS = {
  renewalReminder: { group: 'Notifications', title: 'Renewal Reminder', defaultStatus: 'Scheduled' },
  expiryReminder: { group: 'Notifications', title: 'Expiry Reminder', defaultStatus: 'Scheduled' },
  paymentReminder: { group: 'Notifications', title: 'Payment Reminder', defaultStatus: 'Pending' },
  sendNotification: { group: 'Notifications', title: 'Send Notification', defaultStatus: 'Draft' },
  userReport: { group: 'Reports', title: 'User Report', defaultStatus: 'Ready' },
  renewalReport: { group: 'Reports', title: 'Renewal Report', defaultStatus: 'Ready' },
  expiryReport: { group: 'Reports', title: 'Expiry Report', defaultStatus: 'Ready' },
  paymentReport: { group: 'Reports', title: 'Payment Report', defaultStatus: 'Ready' },
  revenueReport: { group: 'Reports', title: 'Revenue Report', defaultStatus: 'Ready' },
  subscriptionPlans: { group: 'Settings', title: 'Subscription Plans', defaultStatus: 'Active' },
  trialDays: { group: 'Settings', title: 'Trial Days', defaultStatus: 'Active' },
  gracePeriod: { group: 'Settings', title: 'Grace Period', defaultStatus: 'Active' },
  autoBlockAfterExpiry: { group: 'Settings', title: 'Auto Block After Expiry', defaultStatus: 'Enabled' },
  paymentSettings: { group: 'Settings', title: 'Payment Settings', defaultStatus: 'Active' },
};

function normalize(value) {
  return String(value || '').toLowerCase();
}

export function AdminRecordPage({ kind }) {
  const view = ADMIN_RECORD_VIEWS[kind] || ADMIN_RECORD_VIEWS.renewalReminder;
  const [section, setSection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [form, setForm] = useState({
    title: `${view.title} data`,
    status: view.defaultStatus,
    amount: 0,
    target: 'All Users',
    notes: `${view.title} admin data`,
  });

  async function loadData() {
    if (!isAdminAuthenticated()) {
      window.location.hash = '/admin-login';
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await fetchAdminRecords(kind);
      setSection(data);
    } catch (err) {
      setError(err.message || `Unable to load ${view.title}`);
    } finally {
      setLoading(false);
    }
  }

  async function addData(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await createAdminRecord(kind, form);
      setForm((current) => ({ ...current, title: `${view.title} data`, notes: `${view.title} admin data` }));
      await loadData();
    } catch (err) {
      setError(err.message || `Unable to save ${view.title}`);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    setForm({
      title: `${view.title} data`,
      status: view.defaultStatus,
      amount: 0,
      target: 'All Users',
      notes: `${view.title} admin data`,
    });
    loadData();
  }, [kind]);

  const rows = useMemo(() => {
    const sourceRows = section?.rows || [];
    const term = query.trim().toLowerCase();
    if (!term) return sourceRows;
    return sourceRows.filter((row) => Object.values(row).some((value) => normalize(value).includes(term)));
  }, [query, section]);

  const tableSection = {
    key: kind,
    label: view.title,
    count: rows.length,
    fields: section?.fields || ['title', 'status', 'amount', 'target', 'scheduledDate', 'notes', 'createdAt'],
    rows,
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 text-slate-900 dark:text-slate-100">
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="m-0 text-[12px] font-black uppercase tracking-wide text-blue-600 dark:text-blue-400">{view.group}</p>
              <h1 className="m-0 text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">{view.title}</h1>
              <p className="m-0 text-sm text-slate-500 dark:text-slate-400 mt-1">DB connected: admin records</p>
            </div>
            <button onClick={loadData} className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 transition border-0 cursor-pointer">
              <RefreshCw size={16} /> Refresh
            </button>
          </div>
        </header>

        <main className="p-6 space-y-5">
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
              <p className="m-0 text-sm text-slate-500 dark:text-slate-400 font-medium">Total Records</p>
              <p className="m-0 text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">{section?.count || rows.length}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
              <p className="m-0 text-sm text-slate-500 dark:text-slate-400 font-medium">Status</p>
              <p className="m-0 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{view.defaultStatus}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
              <p className="m-0 text-sm text-slate-500 dark:text-slate-400 font-medium">Page</p>
              <p className="m-0 text-xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">{view.title}</p>
            </div>
          </section>

          <form onSubmit={addData} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="md:col-span-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm" placeholder="Title" />
            <input value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm" placeholder="Status" />
            <input type="number" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm" placeholder="Amount" />
            <input value={form.target} onChange={(event) => setForm({ ...form, target: event.target.value })} className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm" placeholder="Target" />
            <button disabled={saving} className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg flex items-center justify-center gap-2 border-0 cursor-pointer disabled:opacity-60">
              <Plus size={16} /> {saving ? 'Saving...' : 'Add Data'}
            </button>
            <input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="md:col-span-5 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm" placeholder="Notes" />
          </form>

          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search data..." className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 outline-none" />
            </div>
          </section>

          {loading && <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-8 text-center text-slate-500 dark:text-slate-400 font-medium">Loading data...</div>}
          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm font-bold text-red-700">{error}</div>}
          {!loading && !error && <DataTable section={tableSection} />}
        </main>
      </div>
    </AdminLayout>
  );
}

