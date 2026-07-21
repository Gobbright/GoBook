import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Building2, Database, LogOut, RefreshCw, Search, ShieldCheck, UsersRound } from 'lucide-react';

import { fetchAdminDashboard, isAdminAuthenticated, logoutAdmin } from './adminService.js';

const MODULE_GROUPS = [
  { title: 'Dashboard', items: ['Total users', 'Active users', 'Trial users', 'Revenue summary', 'Upcoming renewals', 'MRR / ARR', 'Top revenue'] },
  { title: 'User Management', items: ['All users', 'Active users', 'Trial users', 'Expired users', 'Blocked users', 'Deleted users', 'Login and last login reports'] },
  { title: 'Business', items: ['Business data', 'Owner details', 'Category', 'Subscription plan', 'Registration date', 'Expiry date', 'Payment history', 'Login history', 'Usage statistics'] },
  { title: 'Subscription', items: ['Plans', 'Plan features', 'Usage limits', 'Active subscriptions', 'Expired subscriptions', 'Renewal requests', 'Renewal history'] },
  { title: 'User Actions', items: ['Activate user', 'Renew account', 'Change expiry date', 'Extend trial', 'Upgrade plan', 'Block user', 'Unlock user', 'Reset password', 'Delete user'] },
  { title: 'Payments & Billing', items: ['All payments', 'Pending payments', 'Successful payments', 'Failed payments', 'Subscription GST invoices', 'Manual payment approval'] },
  { title: 'Growth', items: ['Coupon codes', 'Referral program', 'Affiliate partners', 'White label / reseller management banner'] },
  { title: 'Support', items: ['Support tickets', 'Complaints', 'Feature requests', 'Knowledge base', 'FAQ / AI chatbot'] },
  { title: 'Notifications', items: ['Renewal reminder', 'Expiry reminder', 'Payment reminder', 'Send notice email', 'Broadcast'] },
  { title: 'Reports & Analytics', items: ['User report', 'Renewal report', 'Expiry report', 'Payment report', 'Revenue report', 'Churn analysis', 'Retention cohort', 'Category-wise growth'] },
  { title: 'Settings', items: ['Subscription plans', 'Trial days', 'Grace period', 'Admin email', 'Payment gateway', 'Email / SMS config', 'System health log'] },
];

const TOTAL_CARDS = [
  { key: 'businesses', label: 'Businesses', icon: Building2 },
  { key: 'users', label: 'Users', icon: UsersRound },
  { key: 'invoices', label: 'Invoices', icon: BarChart3 },
  { key: 'products', label: 'Products', icon: Database },
];

function formatValue(value) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return String(value.name || value.email || value.id || value._id || JSON.stringify(value));
  return String(value);
}

function DataTable({ section }) {
  const visibleFields = section.fields.slice(0, 6);
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3">
        <div>
          <h3 className="m-0 text-[15px] font-extrabold text-slate-900">{section.label}</h3>
          <p className="m-0 text-[11px] text-slate-500">{section.count} total records</p>
        </div>
        <span className="text-[12px] font-bold rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">Latest 20</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-left">
          <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
            <tr>
              {visibleFields.map((field) => <th key={field} className="px-4 py-2 font-bold">{field}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-[12px] text-slate-700">
            {section.rows.length === 0 ? (
              <tr><td colSpan={visibleFields.length || 1} className="px-4 py-5 text-center text-slate-400">No records found</td></tr>
            ) : section.rows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50">
                {visibleFields.map((field) => <td key={field} className="px-4 py-2 max-w-[220px] truncate">{formatValue(row[field])}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminPanelPage() {
  const [status, setStatus] = useState('loading');
  const [dashboard, setDashboard] = useState(null);
  const [query, setQuery] = useState('');

  async function loadDashboard() {
    setStatus('loading');
    try {
      const data = await fetchAdminDashboard();
      setDashboard(data);
      setStatus('ready');
    } catch {
      window.location.assign('/admin-login');
    }
  }

  useEffect(() => {
    if (!isAdminAuthenticated()) {
      window.location.assign('/admin-login');
      return;
    }
    loadDashboard();
  }, []);

  const filteredSections = useMemo(() => {
    const sections = dashboard?.sections || [];
    const term = query.trim().toLowerCase();
    if (!term) return sections;
    return sections.filter((section) => section.label.toLowerCase().includes(term) || section.fields.some((field) => field.toLowerCase().includes(term)));
  }, [dashboard, query]);

  if (status === 'loading' && !dashboard) {
    return <div className="min-h-screen bg-[#f4f6f8]" />;
  }

  return (
    <div className="min-h-screen bg-[#f4f6f8] text-slate-900">
      <aside className="fixed left-0 top-0 bottom-0 w-[280px] bg-white border-r border-slate-200 hidden lg:flex flex-col">
        <div className="p-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center"><ShieldCheck size={22} /></div>
            <div>
              <h1 className="m-0 text-[18px] font-extrabold">Admin Panel</h1>
              <p className="m-0 text-[11px] text-slate-500">SaaS owner control centre</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-4">
          {MODULE_GROUPS.map((group) => (
            <section key={group.title}>
              <h2 className="m-0 mb-1 text-[12px] font-extrabold text-slate-800">{group.title}</h2>
              <ul className="m-0 pl-4 text-[11px] leading-5 text-slate-600">
                {group.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </section>
          ))}
        </nav>
        <button onClick={logoutAdmin} className="m-4 h-10 rounded-md border border-slate-200 bg-white text-slate-700 text-[13px] font-bold flex items-center justify-center gap-2 cursor-pointer">
          <LogOut size={16} /> Logout
        </button>
      </aside>

      <main className="lg:ml-[280px] min-h-screen">
        <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-200 px-4 md:px-7 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="m-0 text-[24px] font-extrabold tracking-tight">Admin Database View</h1>
            <p className="m-0 text-[12px] text-slate-500">All software data from MongoDB, grouped by module</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search modules" className="h-10 w-[220px] rounded-md border border-slate-200 pl-9 pr-3 text-[13px] outline-none focus:border-slate-900" />
            </div>
            <button onClick={loadDashboard} className="h-10 px-3 rounded-md bg-slate-900 text-white border-0 cursor-pointer flex items-center gap-2 text-[13px] font-bold">
              <RefreshCw size={15} /> Refresh
            </button>
          </div>
        </header>

        <div className="p-4 md:p-7 space-y-6">
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {TOTAL_CARDS.map(({ key, label, icon: Icon }) => (
              <div key={key} className="bg-white border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[12px] font-bold text-slate-500">{label}</span>
                  <Icon size={18} className="text-slate-500" />
                </div>
                <div className="text-[28px] font-extrabold mt-2">{dashboard?.totals?.[key] ?? 0}</div>
              </div>
            ))}
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4 lg:hidden">
            <h2 className="m-0 mb-3 text-[15px] font-extrabold">Admin Modules</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {MODULE_GROUPS.map((group) => <div key={group.title} className="border border-slate-100 rounded-md p-3 text-[12px] font-bold">{group.title}</div>)}
            </div>
          </div>

          <div className="space-y-4">
            {filteredSections.map((section) => <DataTable key={section.key} section={section} />)}
          </div>
        </div>
      </main>
    </div>
  );
}