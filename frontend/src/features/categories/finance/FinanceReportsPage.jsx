import { useCallback, useEffect, useState } from 'react';
import { BarChart3, CalendarDays, IndianRupee, ListChecks, UsersRound } from 'lucide-react';

import { financeApi } from './financeApi.js';
import {
  EmptyState, ErrorState, FinanceCard, FinancePage, LoadingState, StatusBadge, TypeBadge,
  formatMoney, indiaToday,
} from './FinanceUi.jsx';

export function FinanceReportsPage() {
  const [month, setMonth] = useState(() => indiaToday().slice(0, 7));
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setData(null);
    setError('');
    try {
      setData(await financeApi.reports(month));
    } catch (err) {
      setError(err.message);
    }
  }, [month]);

  useEffect(() => { load(); }, [load]);

  const maxDayTotal = Math.max(1, ...(data?.dayBreakdown || []).map((day) => day.total));

  return (
    <FinancePage
      title="Reports"
      description="Daily and customer-wise collection performance."
      action={(
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          <CalendarDays size={17} className="text-[#4f90ff]" />
          <span className="hidden sm:inline">Report month</span>
          <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="border-0 bg-transparent text-sm font-extrabold text-slate-800 outline-none dark:text-white" />
        </label>
      )}
    >
      {!data && !error && <LoadingState />}
      {error && <ErrorState message={error} onRetry={load} />}
      {data && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { label: 'Today total', value: formatMoney(data.todayTotal), icon: IndianRupee, tone: 'brand' },
              { label: 'This month total', value: formatMoney(data.monthTotal), icon: BarChart3, tone: 'blue' },
              { label: 'Today entries', value: data.todayEntriesCount, icon: ListChecks, tone: 'violet' },
            ].map(({ label, value, icon: Icon, tone }) => (
              <FinanceCard key={label} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="m-0 text-xs font-bold text-slate-500">{label}</p>
                    <p className="mb-0 mt-2 text-2xl font-black text-slate-900 dark:text-white">{value}</p>
                  </div>
                  <span className={`grid size-10 place-items-center rounded-xl ${
                    tone === 'brand' ? 'bg-blue-50 text-[#4f90ff] dark:bg-blue-950'
                      : tone === 'blue' ? 'bg-blue-50 text-blue-600 dark:bg-blue-950'
                        : 'bg-violet-50 text-violet-600 dark:bg-violet-950'
                  }`}><Icon size={20} /></span>
                </div>
              </FinanceCard>
            ))}
          </div>

          <FinanceCard className="hidden">
            <div className="border-b border-slate-100 p-5 dark:border-slate-800">
              <h2 className="m-0 text-base font-black text-slate-900 dark:text-white">Day-by-day collection</h2>
              <p className="mb-0 mt-1 text-xs text-slate-500">{month} breakdown</p>
            </div>
            <div className="overflow-x-auto p-5">
              <div className="flex h-64 min-w-[720px] items-end gap-2 border-b border-slate-200 px-1 dark:border-slate-700">
                {data.dayBreakdown.map((day) => {
                  const height = day.total ? Math.max(7, (day.total / maxDayTotal) * 100) : 2;
                  return (
                    <div key={day.date} className="group flex min-w-0 flex-1 flex-col items-center justify-end self-stretch">
                      <div className="invisible mb-1 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-[10px] font-bold text-white group-hover:visible">
                        {formatMoney(day.total)} · {day.count}
                      </div>
                      <div className={`w-full max-w-8 rounded-t-md ${day.total ? 'bg-[#4f90ff]' : 'bg-slate-100 dark:bg-slate-800'}`} style={{ height: `${height}%` }} />
                      <span className="py-2 text-[10px] font-bold text-slate-400">{day.date.slice(-2)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </FinanceCard>

          <FinanceCard className="mt-5 overflow-hidden">
            <div className="flex items-center gap-3 border-b border-slate-100 p-5 dark:border-slate-800">
              <span className="grid size-10 place-items-center rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-950"><UsersRound size={20} /></span>
              <div>
                <h2 className="m-0 text-base font-black text-slate-900 dark:text-white">Customer-wise total collection</h2>
                <p className="mb-0 mt-1 text-xs text-slate-500">Lifetime totals across active and finished customers.</p>
              </div>
            </div>
            {data.customerTotals.length === 0 && <EmptyState title="No customer collection data" description="Saved collection entries will appear in this report." />}
            {data.customerTotals.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[780px] text-left text-sm">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 dark:bg-slate-950">
                    <tr>
                      <th className="px-5 py-3">Customer</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Entries</th>
                      <th className="px-4 py-3">Last payment</th>
                      <th className="px-5 py-3 text-right">Total collected</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data.customerTotals.map((customer) => (
                      <tr key={customer.customerId} className="text-slate-700 dark:text-slate-200">
                        <td className="px-5 py-4">
                          <p className="m-0 font-extrabold text-slate-900 dark:text-white">{customer.name}</p>
                          <p className="mb-0 mt-1 text-xs text-slate-500">{customer.phone}</p>
                        </td>
                        <td className="px-4 py-4"><TypeBadge type={customer.type} /></td>
                        <td className="px-4 py-4"><StatusBadge status={customer.status} /></td>
                        <td className="px-4 py-4 font-bold">{customer.entriesCount}</td>
                        <td className="px-4 py-4 text-xs text-slate-500">{customer.lastPaymentDate || '—'}</td>
                        <td className="px-5 py-4 text-right font-black text-[#4f90ff]">{formatMoney(customer.totalCollected)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </FinanceCard>
        </>
      )}
    </FinancePage>
  );
}
