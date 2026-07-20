import { useEffect, useMemo, useState } from 'react';
import { AlertOctagon, BarChart3, CalendarDays, Clock, Database, IndianRupee, Menu, RefreshCw, TrendingUp, UserCheck, UsersRound, X } from 'lucide-react';

import { fetchAdminDashboard, isAdminAuthenticated } from './adminService.js';
import { DataTable } from './components/DataTable.jsx';
import { AdminLayout } from './AdminLayout.jsx';

function money(value) {
  return `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;
}

function DashboardMetric({ label, value, icon: Icon, tone = 'blue' }) {
  const tones = {
    blue: 'from-blue-50 to-indigo-50 text-blue-600 dark:from-blue-950/40 dark:to-indigo-950/40 dark:text-blue-300',
    green: 'from-emerald-50 to-teal-50 text-emerald-600 dark:from-emerald-950/40 dark:to-teal-950/40 dark:text-emerald-300',
    red: 'from-red-50 to-rose-50 text-red-600 dark:from-red-950/40 dark:to-rose-950/40 dark:text-red-300',
    amber: 'from-amber-50 to-orange-50 text-amber-600 dark:from-amber-950/40 dark:to-orange-950/40 dark:text-amber-300',
    slate: 'from-slate-50 to-slate-100 text-slate-700 dark:from-slate-800 dark:to-slate-900 dark:text-slate-200',
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 hover:shadow-lg transition-all">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12px] font-bold text-slate-600 dark:text-slate-400">{label}</span>
        <div className={`p-2.5 rounded-lg bg-gradient-to-br ${tones[tone]}`}>
          <Icon size={18} />
        </div>
      </div>
      <div className="text-[28px] font-extrabold mt-3 text-slate-900 dark:text-slate-100">
        {typeof value === 'number' ? value.toLocaleString('en-IN') : value}
      </div>
    </div>
  );
}

function BarChart({ title, data }) {
  const max = Math.max(1, ...data.map((item) => Number(item.value) || 0));
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
      <h2 className="m-0 text-[15px] font-extrabold text-slate-900 dark:text-slate-100 mb-4">{title}</h2>
      <div className="space-y-3">
        {data.map((item) => (
          <div key={item.label}>
            <div className="flex justify-between text-[12px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              <span>{item.label}</span>
              <span>{item.value}</span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.max(4, ((Number(item.value) || 0) / max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DonutSummary({ activeUsers, totalUsers }) {
  const percent = totalUsers ? Math.round((activeUsers / totalUsers) * 100) : 0;
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
      <h2 className="m-0 text-[15px] font-extrabold text-slate-900 dark:text-slate-100 mb-4">User Activity</h2>
      <div className="flex items-center gap-5">
        <div className="relative h-28 w-28 rounded-full grid place-items-center" style={{ background: `conic-gradient(#2563eb ${percent * 3.6}deg, #e2e8f0 0deg)` }}>
          <div className="h-20 w-20 rounded-full bg-white dark:bg-slate-900 grid place-items-center text-xl font-black text-slate-900 dark:text-slate-100">{percent}%</div>
        </div>
        <div className="space-y-2 text-sm font-bold text-slate-600 dark:text-slate-400">
          <p className="m-0"><span className="text-blue-600">Active:</span> {activeUsers}</p>
          <p className="m-0"><span className="text-slate-900 dark:text-slate-100">Total:</span> {totalUsers}</p>
        </div>
      </div>
    </div>
  );
}

export function AdminDashboard() {
  const [status, setStatus] = useState('loading');
  const [dashboard, setDashboard] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function loadDashboard() {
    setStatus('loading');
    try {
      const data = await fetchAdminDashboard();
      setDashboard(data);
      setStatus('ready');
    } catch {
      window.location.hash = '/admin-login';
    }
  }

  useEffect(() => {
    if (!isAdminAuthenticated()) {
      window.location.hash = '/admin-login';
      return;
    }
    loadDashboard();
  }, []);

  const panel = dashboard?.panel || {};
  const usersSection = useMemo(() => {
    const section = dashboard?.sections?.find((item) => item.key === 'users');
    if (!section) return null;
    return {
      ...section,
      label: 'All Users',
      fields: ['name', 'email', 'phone', 'businessName', 'category', 'subscriptionPlan', 'subscriptionAmount', 'status', 'createdAt'],
    };
  }, [dashboard]);

  if (status === 'loading' && !dashboard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center font-bold text-slate-600 dark:text-slate-300">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="min-h-screen text-slate-900 dark:text-slate-100">
        <header className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-4 md:px-7 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 md:hidden mb-3">
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition">
                  {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
                <h1 className="text-[20px] font-extrabold">Admin Panel</h1>
              </div>
              <h1 className="hidden md:block m-0 text-[24px] font-extrabold tracking-tight">Dashboard</h1>
              <p className="m-0 text-[12px] text-slate-500 dark:text-slate-400 mt-1">Users, renewals and revenue from MongoDB</p>
            </div>
            <button onClick={loadDashboard} className="h-10 px-3 rounded-lg bg-blue-600 text-white border-0 cursor-pointer flex items-center gap-2 text-[13px] font-bold hover:bg-blue-700 transition">
              <RefreshCw size={15} /> Refresh
            </button>
          </div>
        </header>

        <div className="p-3 md:p-6 lg:p-7 space-y-4 md:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            <DashboardMetric label="Total Users" value={panel.totalUsers ?? 0} icon={UsersRound} />
            <DashboardMetric label="Active Users" value={panel.activeUsers ?? 0} icon={UserCheck} tone="green" />
            <DashboardMetric label="Expired Users" value={panel.expiredUsers ?? 0} icon={Clock} tone="amber" />
            <DashboardMetric label="Blocked Users" value={panel.blockedUsers ?? 0} icon={AlertOctagon} tone="red" />
            <DashboardMetric label="Today Registrations" value={panel.todayRegistrations ?? 0} icon={CalendarDays} tone="blue" />
            <DashboardMetric label="Upcoming Renewals" value={panel.upcomingRenewals ?? 0} icon={TrendingUp} tone="amber" />
            <DashboardMetric label="Total Revenue" value={money(panel.totalRevenue)} icon={IndianRupee} tone="slate" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
            <BarChart
              title="Dashboard Overview"
              data={[
                { label: 'Total Users', value: panel.totalUsers ?? 0 },
                { label: 'Active Users', value: panel.activeUsers ?? 0 },
                { label: 'Expired Users', value: panel.expiredUsers ?? 0 },
                { label: 'Blocked Users', value: panel.blockedUsers ?? 0 },
                { label: 'Today Registrations', value: panel.todayRegistrations ?? 0 },
                { label: 'Upcoming Renewals', value: panel.upcomingRenewals ?? 0 },
              ]}
            />
            <DonutSummary activeUsers={panel.activeUsers ?? 0} totalUsers={panel.totalUsers ?? 0} />
          </div>

          {usersSection ? <DataTable section={usersSection} /> : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-8 text-center">
              <Database size={40} className="mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500 dark:text-slate-400 font-medium">No users found</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
