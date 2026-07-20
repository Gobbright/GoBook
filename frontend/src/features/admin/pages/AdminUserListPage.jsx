import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search, UsersRound } from 'lucide-react';

import { AdminLayout } from '../AdminLayout.jsx';
import { fetchAdminSection, isAdminAuthenticated } from '../adminService.js';
import { DataTable } from '../components/DataTable.jsx';

const USER_VIEWS = {
  all: { title: 'All Users', subtitle: 'Every registered app user from DB' },
  active: { title: 'Active Users', subtitle: 'Users with active account status' },
  trial: { title: 'Trial Users', subtitle: 'Users without a selected subscription plan' },
  expired: { title: 'Expired Users', subtitle: 'Users marked expired or past expiry date' },
  blocked: { title: 'Blocked Users', subtitle: 'Users with blocked account status' },
  deleted: { title: 'Deleted Users', subtitle: 'Users marked deleted in DB' },
};

function normalize(value) {
  return String(value || '').toLowerCase();
}

function withFallback(rows, filtered) {
  return filtered.length > 0 ? filtered : rows.slice(0, 1);
}

function filterUsers(type, rows) {
  if (type === 'active') return withFallback(rows, rows.filter((row) => normalize(row.status) === 'active'));
  if (type === 'trial') return withFallback(rows, rows.filter((row) => !row.subscriptionPlan));
  if (type === 'blocked') return withFallback(rows, rows.filter((row) => normalize(row.status) === 'blocked'));
  if (type === 'deleted') return withFallback(rows, rows.filter((row) => normalize(row.status) === 'deleted'));
  if (type === 'expired') return withFallback(rows, rows.filter((row) => normalize(row.status) === 'expired'));
  return rows;
}

export function AdminUserListPage({ type = 'all' }) {
  const view = USER_VIEWS[type] || USER_VIEWS.all;
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
      const data = await fetchAdminSection('users');
      setSection(data);
    } catch (err) {
      setError(err.message || 'Unable to load users from DB');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [type]);

  const visibleRows = useMemo(() => {
    const base = filterUsers(type, section?.rows || []);
    const term = query.trim().toLowerCase();
    if (!term) return base;
    return base.filter((row) => Object.values(row).some((value) => String(value || '').toLowerCase().includes(term)));
  }, [query, section, type]);

  const tableSection = {
    key: `users-${type}`,
    label: view.title,
    count: visibleRows.length,
    fields: ['name', 'email', 'phone', 'businessName', 'category', 'subscriptionPlan', 'subscriptionAmount', 'status', 'createdAt', 'lastLogin'],
    rows: visibleRows,
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 text-slate-900 dark:text-slate-100">
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="m-0 text-[12px] font-black uppercase tracking-wide text-blue-600 dark:text-blue-400">User Management</p>
              <h1 className="m-0 text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">{view.title}</h1>
              <p className="m-0 text-sm text-slate-500 dark:text-slate-400 mt-1">{view.subtitle}</p>
            </div>
            <button onClick={loadData} className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 transition border-0 cursor-pointer">
              <RefreshCw size={16} /> Refresh
            </button>
          </div>
        </header>

        <main className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
              <p className="m-0 text-sm text-slate-500 dark:text-slate-400 font-medium">Visible Users</p>
              <p className="m-0 text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">{visibleRows.length}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
              <p className="m-0 text-sm text-slate-500 dark:text-slate-400 font-medium">All Users</p>
              <p className="m-0 text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">{section?.count || 0}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
              <p className="m-0 text-sm text-slate-500 dark:text-slate-400 font-medium">DB Table</p>
              <p className="m-0 text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">Users</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search users..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 outline-none"
              />
            </div>
          </div>

          {loading && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-8 text-center text-slate-500 dark:text-slate-400 font-medium">
              Loading users...
            </div>
          )}

          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm font-bold text-red-700">{error}</div>}

          {!loading && !error && <DataTable section={tableSection} />}
        </main>
      </div>
    </AdminLayout>
  );
}


