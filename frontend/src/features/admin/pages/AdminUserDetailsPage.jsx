import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';

import { AdminLayout } from '../AdminLayout.jsx';
import { fetchAdminSection, isAdminAuthenticated } from '../adminService.js';
import { DataTable } from '../components/DataTable.jsx';

const DETAIL_VIEWS = {
  business: { title: 'Business Details', source: 'users', fields: ['businessName', 'name', 'email', 'phone', 'category', 'status'] },
  owner: { title: 'Owner Details', source: 'users', fields: ['name', 'email', 'phone', 'role', 'businessName', 'status'] },
  category: { title: 'Category', source: 'users', fields: ['name', 'businessName', 'category', 'subscriptionPlan', 'status'] },
  subscription: { title: 'Subscription Plan', source: 'users', fields: ['name', 'email', 'businessName', 'subscriptionPlan', 'subscriptionAmount', 'status'] },
  registration: { title: 'Registration Date', source: 'users', fields: ['name', 'email', 'businessName', 'category', 'createdAt', 'status'] },
  expiry: { title: 'Expiry Date', source: 'users', fields: ['name', 'email', 'businessName', 'subscriptionPlan', 'status'] },
  payments: { title: 'Payment History', source: 'payments', fields: ['customerName', 'amount', 'mode', 'status', 'date'] },
  login: { title: 'Login History', source: 'users', fields: ['name', 'email', 'authProvider', 'lastLogin', 'status'] },
};

export function AdminUserDetailsPage({ type = 'business' }) {
  const view = DETAIL_VIEWS[type] || DETAIL_VIEWS.business;
  const [section, setSection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  async function loadData() {
    if (!isAdminAuthenticated()) {
      window.location.hash = '/admin-login';
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await fetchAdminSection(view.source);
      setSection(data);
    } catch (err) {
      setError(err.message || 'Unable to load user details from DB');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [type]);

  const rows = useMemo(() => {
    const allRows = section?.rows || [];
    const term = query.trim().toLowerCase();
    if (!term) return allRows;
    return allRows.filter((row) => Object.values(row).some((value) => String(value || '').toLowerCase().includes(term)));
  }, [query, section]);

  const tableSection = {
    key: `user-details-${type}`,
    label: view.title,
    count: rows.length,
    fields: view.fields,
    rows,
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 text-slate-900 dark:text-slate-100">
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="m-0 text-[12px] font-black uppercase tracking-wide text-blue-600 dark:text-blue-400">User Details</p>
              <h1 className="m-0 text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">{view.title}</h1>
              <p className="m-0 text-sm text-slate-500 dark:text-slate-400 mt-1">DB connected: {view.source}</p>
            </div>
            <button onClick={loadData} className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 transition border-0 cursor-pointer">
              <RefreshCw size={16} /> Refresh
            </button>
          </div>
        </header>

        <main className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
              <p className="m-0 text-sm text-slate-500 dark:text-slate-400 font-medium">Visible Records</p>
              <p className="m-0 text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">{rows.length}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
              <p className="m-0 text-sm text-slate-500 dark:text-slate-400 font-medium">Source</p>
              <p className="m-0 text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">{view.source}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
              <p className="m-0 text-sm text-slate-500 dark:text-slate-400 font-medium">Fields</p>
              <p className="m-0 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{view.fields.length}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search details..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 outline-none"
              />
            </div>
          </div>

          {loading && <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-8 text-center text-slate-500 dark:text-slate-400 font-medium">Loading details...</div>}
          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm font-bold text-red-700">{error}</div>}
          {!loading && !error && <DataTable section={tableSection} />}
        </main>
      </div>
    </AdminLayout>
  );
}

