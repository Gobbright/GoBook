import { Building2, TrendingUp, UserCheck, Users } from 'lucide-react';

function StatCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${accent}18` }}>
          <Icon size={18} style={{ color: accent }} />
        </div>
      </div>
      <div className="text-[26px] font-bold text-slate-900 dark:text-white leading-tight">{value}</div>
      <div className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">{label}</div>
      {sub && <div className="text-[11.5px] text-slate-400 dark:text-slate-500 mt-2">{sub}</div>}
    </div>
  );
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function PlatformAdminOverview({ stats, businesses }) {
  const recentBusinesses = businesses.slice(0, 5);

  return (
    <div>
      <h1 className="m-0 text-[20px] font-bold text-slate-900 dark:text-white">Overview</h1>
      <p className="m-0 text-[13px] text-slate-500 dark:text-slate-400 mt-1 mb-6">Snapshot of the whole platform, across every business.</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Building2} label="Total Businesses" value={stats.totalBusinesses} sub={`+${stats.newBusinessesThisWeek} this week`} accent="#3b82f6" />
        <StatCard icon={Users} label="Total Users" value={stats.totalUsers} sub={`+${stats.newUsersThisWeek} this week`} accent="#8b5cf6" />
        <StatCard icon={UserCheck} label="Active Users" value={stats.activeUsers} sub={`${stats.inactiveUsers} inactive`} accent="#22c55e" />
        <StatCard icon={TrendingUp} label="New This Month" value={stats.newBusinessesThisMonth} sub={`${stats.newUsersThisMonth} new users`} accent="#f59e0b" />
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="m-0 text-[14px] font-semibold text-slate-900 dark:text-white">Most Recent Businesses</h2>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {recentBusinesses.length === 0 && (
            <div className="px-5 py-8 text-center text-[13px] text-slate-400">No businesses yet.</div>
          )}
          {recentBusinesses.map((b) => (
            <div key={b.id} className="px-5 py-3.5 flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-[13.5px] font-medium text-slate-900 dark:text-white truncate">{b.name}</div>
                <div className="text-[12px] text-slate-400 dark:text-slate-500 truncate">{b.ownerEmail}</div>
              </div>
              <div className="text-[12px] text-slate-400 dark:text-slate-500 flex-none pl-4">{formatDate(b.createdAt)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
