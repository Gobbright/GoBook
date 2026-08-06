import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { safeNavigate } from '../../../routes/navigation.js';
import { Plus, Search } from 'lucide-react';

import { AdminLayout } from '../AdminLayout.jsx';
import { createAdminRecord, fetchAdminRecords, isAdminAuthenticated } from '../adminService.js';
import { DataTable } from '../components/DataTable.jsx';
import { SelectDropdown } from '../../../components/forms/SelectDropdown.jsx';

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

const ADMIN_FIELD_CLASS = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';
const ADMIN_SELECT_CLASS = `${ADMIN_FIELD_CLASS} cursor-pointer`;
const ADMIN_STATUS_OPTIONS = ['Active', 'Inactive', 'Pending', 'Scheduled', 'Ready', 'Draft', 'Enabled', 'Disabled', 'Completed', 'Failed'];
const ADMIN_TARGET_OPTIONS = ['All Users', 'Active Users', 'Trial Users', 'Expired Users', 'Blocked Users', 'Paid Users'];

function normalize(value) {
  return String(value || '').toLowerCase();
}

export function AdminRecordPage({ kind }) {
  const navigate = useNavigate();
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
      safeNavigate(navigate, '/admin-login');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await fetchAdminRecords(kind);
      setSection(data);
    } catch (err) {
      console.error('Error loading records:', err);
      setError(err.message || 'Unable to load admin tools data');
      setSection({
        key: kind,
        label: view.title,
        count: 0,
        fields: ['title', 'status', 'amount', 'target', 'scheduledDate', 'notes', 'createdAt'],
        rows: [],
      });
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
      console.error('Error saving record:', err);
      setError(err.message || 'Unable to save admin tools data');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (view) {
      setForm({
        title: `${view.title} data`,
        status: view.defaultStatus,
        amount: 0,
        target: 'All Users',
        notes: `${view.title} admin data`,
      });
    }
    loadData();
  }, [kind, view]);

  const rows = useMemo(() => {
    const sourceRows = section?.rows || [];
    const term = query.trim().toLowerCase();
    if (!term) return sourceRows;
    return sourceRows.filter((row) => Object.values(row).some((value) => normalize(value).includes(term)));
  }, [query, section]);

  const tableSection = {
    key: kind,
    label: view?.title || 'Data',
    count: rows.length,
    fields: section?.fields || ['title', 'status', 'amount', 'target', 'scheduledDate', 'notes', 'createdAt'],
    rows,
    sourceKey: `records/${kind}`,
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 text-slate-900 dark:text-slate-100">
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 py-4 md:py-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
            <div>
              <p data-admin-hide className="m-0 text-[10px] md:text-[12px] font-black uppercase tracking-wide text-blue-600 dark:text-blue-400">{view.group}</p>
              <h1 data-admin-hide className="m-0 text-lg md:text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">{view.title}</h1>
              <p data-admin-hide className="m-0 text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">DB connected: admin records</p>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-6 space-y-4 md:space-y-5 max-w-7xl mx-auto">
          <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 md:p-4">
              <p className="m-0 text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium">Total Records</p>
              <p className="m-0 text-lg md:text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-2">{section?.count || rows.length}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 md:p-4">
              <p className="m-0 text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium">Status</p>
              <p className="m-0 text-lg md:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">{view.defaultStatus}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 md:p-4">
              <p className="m-0 text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium">Page</p>
              <p className="m-0 text-lg md:text-xl font-extrabold text-blue-600 dark:text-blue-400 mt-2">{view.title}</p>
            </div>
          </section>

          <form onSubmit={addData} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 md:p-4 grid grid-cols-1 md:grid-cols-6 gap-2 md:gap-3">
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className={`md:col-span-2 ${ADMIN_FIELD_CLASS}`} placeholder="Title" />
            <SelectDropdown value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={ADMIN_STATUS_OPTIONS} buttonClassName={ADMIN_SELECT_CLASS} />
            <input type="number" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} className={ADMIN_FIELD_CLASS} placeholder="Amount" />
            <SelectDropdown value={form.target} onChange={(v) => setForm({ ...form, target: v })} options={ADMIN_TARGET_OPTIONS} buttonClassName={ADMIN_SELECT_CLASS} />
            <input type="date" value={form.scheduledDate || ''} onChange={(event) => setForm({ ...form, scheduledDate: event.target.value })} className={ADMIN_FIELD_CLASS} />
            <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className={`md:col-span-5 min-h-10 resize-y ${ADMIN_FIELD_CLASS}`} placeholder="Notes" />
            <button disabled={saving} className="px-2 md:px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg flex items-center justify-center gap-1 md:gap-2 border-0 cursor-pointer disabled:opacity-60 text-xs md:text-sm font-bold">
              <Plus size={14} className="md:w-4 md:h-4" /> <span className="hidden sm:inline">{saving ? 'Saving...' : 'Add Data'}</span>
            </button>
          </form>

          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 md:px-4 py-2 md:py-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 md:w-4 md:h-4" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search data..." className="w-full pl-8 md:pl-9 pr-3 md:pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs md:text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 outline-none" />
            </div>
          </section>

          {loading && <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-8 text-center text-slate-500 dark:text-slate-400 font-medium">Loading data...</div>}
          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm font-bold text-red-700">{error}</div>}
          {!loading && !error && <DataTable section={tableSection} onChanged={loadData} />}
        </main>
      </div>
    </AdminLayout>
  );
}


