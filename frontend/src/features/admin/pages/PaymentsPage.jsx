import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';

import { AdminLayout } from '../AdminLayout.jsx';
import { DataTable } from '../components/DataTable.jsx';
import { fetchAdminSection, isAdminAuthenticated } from '../adminService.js';

const PAYMENT_VIEWS = {
  all: { title: 'All Payments', subtitle: 'All payment transactions from DB', status: 'all' },
  pending: { title: 'Pending Payments', subtitle: 'Payments waiting for completion', status: 'pending' },
  successful: { title: 'Successful Payments', subtitle: 'Completed payment transactions', status: 'success' },
  failed: { title: 'Failed Payments', subtitle: 'Failed payment transactions', status: 'failed' },
  reports: { title: 'Payment Reports', subtitle: 'Payment summary and transaction report', status: 'all' },
};

function normalize(value) {
  return String(value || '').toLowerCase();
}

export function PaymentsPage({ type = 'all' }) {
  const view = PAYMENT_VIEWS[type] || PAYMENT_VIEWS.all;
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
      const result = await fetchAdminSection('payments');
      setSection(result);
    } catch (err) {
      setError(err.message || 'Failed to load payments from DB');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [type]);

  const rows = useMemo(() => {
    const allRows = section?.rows || [];
    const filtered = view.status === 'all' ? allRows : allRows.filter((row) => normalize(row.status) === view.status);
    const byStatus = filtered.length > 0 ? filtered : allRows.slice(0, 1);
    const term = query.trim().toLowerCase();
    if (!term) return byStatus;
    return byStatus.filter((row) => Object.values(row).some((value) => normalize(value).includes(term)));
  }, [query, section, view.status]);

  const tableSection = {
    key: `payments-${type}`,
    sourceKey: 'payments',
    label: view.title,
    count: rows.length,
    fields: ['customerName', 'amount', 'mode', 'status', 'date'],
    rows,
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 text-slate-900 dark:text-slate-100">
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 py-4 md:py-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
            <div>
              <p className="m-0 text-[10px] md:text-[12px] font-black uppercase tracking-wide text-blue-600 dark:text-blue-400">Payments</p>
              <h1 className="m-0 text-lg md:text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">{view.title}</h1>
              <p className="m-0 text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">{view.subtitle}</p>
            </div>
            <button onClick={loadData} className="px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 transition border-0 cursor-pointer text-xs md:text-sm">
              <RefreshCw size={14} className="md:w-4 md:h-4" /> <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </header>

        <main className="p-4 md:p-6 space-y-4 md:space-y-5">
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 md:px-4 py-2 md:py-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 md:w-4 md:h-4" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search payment data..." className="w-full pl-8 md:pl-9 pr-3 md:pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs md:text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 outline-none" />
            </div>
          </section>

          {loading && <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-8 text-center text-slate-500 dark:text-slate-400 font-medium">Loading payments...</div>}
          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm font-bold text-red-700">{error}</div>}
          {!loading && !error && <DataTable section={tableSection} onChanged={loadData} />}
        </main>
      </div>
    </AdminLayout>
  );
}
