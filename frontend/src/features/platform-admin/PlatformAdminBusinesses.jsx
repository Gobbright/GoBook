import { useState } from 'react';
import { Search } from 'lucide-react';

const TH = 'text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 px-5 py-3 border-b border-slate-200 dark:border-slate-800';
const TD = 'px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 text-[13px]';
const AVATAR_COLORS = ['#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4'];

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function PlatformAdminBusinesses({ businesses }) {
  const [search, setSearch] = useState('');

  const filtered = businesses.filter((b) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return b.name.toLowerCase().includes(term) || (b.ownerEmail || '').toLowerCase().includes(term);
  });

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="m-0 text-[20px] font-bold text-slate-900 dark:text-white">Businesses</h1>
          <p className="m-0 text-[13px] text-slate-500 dark:text-slate-400 mt-1">{businesses.length} total across the platform</p>
        </div>
        <div className="relative max-w-xs w-full">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg pl-8 pr-3 py-2 text-[13px] outline-none focus:border-blue-500"
            placeholder="Search business or owner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={TH}>Business</th>
                <th className={TH}>Owner</th>
                <th className={TH}>Users</th>
                <th className={TH}>Created</th>
                <th className={TH}>Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan="5" className="text-center py-10 text-slate-400 text-[13px]">No businesses match your search.</td></tr>
              )}
              {filtered.map((b, i) => (
                <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className={`${TD} font-medium text-slate-900 dark:text-white`}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-none" style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>
                        {b.name[0]?.toUpperCase()}
                      </div>
                      {b.name}
                    </div>
                  </td>
                  <td className={TD}>
                    <div className="text-slate-700 dark:text-slate-200">{b.ownerName || '—'}</div>
                    <div className="text-slate-400 dark:text-slate-500 text-[12px]">{b.ownerEmail}</div>
                  </td>
                  <td className={`${TD} text-slate-500 dark:text-slate-400`}>{b.userCount}</td>
                  <td className={`${TD} text-slate-500 dark:text-slate-400`}>{formatDate(b.createdAt)}</td>
                  <td className={`${TD} text-slate-500 dark:text-slate-400`}>{formatDate(b.lastActivity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
