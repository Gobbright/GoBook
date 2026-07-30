import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { safeNavigate } from '../../../routes/navigation.js';
import { Search } from 'lucide-react';

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

function isTrialUser(row) {
  return !row.subscriptionPlan || row.subscriptionPlan === '';
}

function separateUsersByType(rows) {
  const active = rows.filter((row) => normalize(row.status) === 'active' && !isTrialUser(row));
  const trial = rows.filter(isTrialUser);
  const expired = rows.filter((row) => normalize(row.status) === 'expired');
  const blocked = rows.filter((row) => normalize(row.status) === 'blocked');
  const deleted = rows.filter((row) => normalize(row.status) === 'deleted');
  return { active, trial, expired, blocked, deleted, all: rows };
}

export function AdminUserListPage({ type = 'all' }) {
  const navigate = useNavigate();
  const view = USER_VIEWS[type] || USER_VIEWS.all;
  const [section, setSection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  async function loadData() {
    if (!isAdminAuthenticated()) {
      safeNavigate(navigate, '/admin-login');
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

  const separated = useMemo(() => {
    const allRows = section?.rows || [];
    const separated = separateUsersByType(allRows);

    const term = query.trim().toLowerCase();
    if (term) {
      Object.keys(separated).forEach(key => {
        separated[key] = separated[key].filter((row) =>
          Object.values(row).some((value) => String(value || '').toLowerCase().includes(term))
        );
      });
    }
    return separated;
  }, [query, section]);

  const mainData = separated[type] || [];
  const visibleUserCount = mainData.length;

  const mainSection = {
    key: `users-main-${type}`,
    sourceKey: 'users',
    label: view.title,
    count: mainData.length,
    fields: ['name', 'email', 'phone', 'businessName', 'category', 'subscriptionPlan', 'subscriptionAmount', 'status', 'createdAt', 'lastLogin'],
    rows: mainData,
  };

  const otherSections = type === 'all' ? [
    { key: 'trial', label: 'Trial Users', rows: separated.trial },
    { key: 'expired', label: 'Expired Users', rows: separated.expired },
    { key: 'blocked', label: 'Blocked Users', rows: separated.blocked },
  ] : [];

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 text-slate-900 dark:text-slate-100">
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 py-4 md:py-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
            <div>
              <p className="m-0 text-[10px] md:text-[12px] font-black uppercase tracking-wide text-blue-600 dark:text-blue-400">User Management</p>
              <h1 className="m-0 text-lg md:text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">{view.title}</h1>
              <p className="m-0 text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">{view.subtitle}</p>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-6 space-y-4 md:space-y-5 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 md:p-4">
              <p className="m-0 text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium">Visible Users</p>
              <p className="m-0 text-lg md:text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-2">{visibleUserCount}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 md:p-4">
              <p className="m-0 text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium">All Users</p>
              <p className="m-0 text-lg md:text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-2">{section?.count || 0}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 md:p-4">
              <p className="m-0 text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium">DB Table</p>
              <p className="m-0 text-lg md:text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">Users</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 md:px-4 py-2 md:py-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 md:w-4 md:h-4" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search users..."
                className="w-full pl-8 md:pl-9 pr-3 md:pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs md:text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 outline-none"
              />
            </div>
          </div>

          {loading && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-8 text-center text-slate-500 dark:text-slate-400 font-medium">
              Loading users...
            </div>
          )}

          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm font-bold text-red-700">{error}</div>}

          {!loading && !error && (
            <>
              {/* Main Content - Highlighted */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4 md:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-4 h-4 bg-blue-600 rounded-full"></div>
                  <h2 className="m-0 text-lg md:text-xl font-extrabold text-blue-900 dark:text-blue-100">Main Content</h2>
                </div>
                <DataTable section={mainSection} onChanged={loadData} />
              </div>

              {/* Other Sections */}
              {otherSections.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-slate-700 dark:text-slate-300">Other User Categories</h2>
                  {otherSections.map((sectionData) => (
                    <div key={sectionData.key} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 md:p-6">
                      <DataTable section={{
                        key: sectionData.key,
                        sourceKey: 'users',
                        label: sectionData.label,
                        count: sectionData.rows.length,
                        fields: ['name', 'email', 'phone', 'businessName', 'category', 'subscriptionPlan', 'subscriptionAmount', 'status', 'createdAt', 'lastLogin'],
                        rows: sectionData.rows,
                      }} />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </AdminLayout>
  );
}



