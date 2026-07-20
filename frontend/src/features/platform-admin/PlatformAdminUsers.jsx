import { Search } from 'lucide-react';

import { CATEGORY_LABELS } from '../../constants/categories.js';

const TH = 'text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 px-5 py-3 border-b border-slate-200 dark:border-slate-800';
const TD = 'px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 text-[13px]';
const AVATAR_COLORS = ['#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4'];

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function PlatformAdminUsers({ users, search, onSearchChange }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="m-0 text-[20px] font-bold text-slate-900 dark:text-white">Users</h1>
          <p className="m-0 text-[13px] text-slate-500 dark:text-slate-400 mt-1">{users.length} across every business</p>
        </div>
        <div className="relative max-w-xs w-full">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg pl-8 pr-3 py-2 text-[13px] outline-none focus:border-blue-500"
            placeholder="Search name or email..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={TH}>Name</th>
                <th className={TH}>Business</th>
                <th className={TH}>Category</th>
                <th className={TH}>Role</th>
                <th className={TH}>Status</th>
                <th className={TH}>Signup</th>
                <th className={TH}>Last Login</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr><td colSpan="7" className="text-center py-10 text-slate-400 text-[13px]">No users found.</td></tr>
              )}
              {users.map((u, i) => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className={TD}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-none" style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>
                        {u.name[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900 dark:text-white truncate">{u.name}</div>
                        <div className="text-slate-400 dark:text-slate-500 text-[12px] truncate">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className={`${TD} text-slate-500 dark:text-slate-400`}>{u.businessName || '—'}</td>
                  <td className={`${TD} text-slate-500 dark:text-slate-400`}>{CATEGORY_LABELS[u.category] || u.category || '—'}</td>
                  <td className={`${TD} text-slate-700 dark:text-slate-200`}>{u.role}</td>
                  <td className={TD}>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${u.status === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400'}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className={`${TD} text-slate-500 dark:text-slate-400`}>{u.signupMethod}</td>
                  <td className={`${TD} text-slate-500 dark:text-slate-400 text-[12px]`}>{formatDate(u.lastLogin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
