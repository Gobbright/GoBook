import { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight, BarChart3, CalendarCheck2, CircleCheckBig, Clock3, IndianRupee,
  ListChecks, UserPlus, UsersRound, WalletCards,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { financeApi } from './financeApi.js';
import {
  ErrorState, FinanceCard, FinancePage, LoadingState, formatMoney, indiaToday, primaryButton,
} from './FinanceUi.jsx';

const metrics = [
  { key: 'todayCollectedAmount', label: 'Today collected', icon: IndianRupee, money: true, tone: 'brand' },
  { key: 'todayEntriesCount', label: 'Today entries', icon: ListChecks, tone: 'blue' },
  { key: 'monthTotalCollection', label: 'This month', icon: WalletCards, money: true, tone: 'violet' },
  { key: 'pendingTodayCount', label: 'Pending today', icon: Clock3, tone: 'amber' },
  { key: 'activeCustomersCount', label: 'Active customers', icon: UsersRound, tone: 'cyan' },
  { key: 'finishedCustomersCount', label: 'Closed customers', icon: CircleCheckBig, tone: 'slate' },
];

const tones = {
  brand: 'bg-blue-50 text-[#4f90ff] dark:bg-blue-950',
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950',
  violet: 'bg-violet-50 text-violet-600 dark:bg-violet-950',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950',
  cyan: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-950',
  slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

export function FinanceDashboardPage() {
  const navigate = useNavigate();
  const chartMonth = indiaToday().slice(0, 7);
  const [data, setData] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setData(null);
    setReportData(null);
    setError('');
    try {
      const [dashboardData, reportsData] = await Promise.all([
        financeApi.dashboard(),
        financeApi.reports(chartMonth),
      ]);
      setData(dashboardData);
      setReportData(reportsData);
    } catch (err) {
      setError(err.message);
    }
  }, [chartMonth]);

  useEffect(() => { load(); }, [load]);

  const maxDayTotal = Math.max(1, ...(reportData?.dayBreakdown || []).map((day) => day.total));

  return (
    <FinancePage title="Dashboard" description="Daily collection performance and customer progress at a glance.">
      {!data && !error && <LoadingState />}
      {error && <ErrorState message={error} onRetry={load} />}
      {data && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
            {metrics.map(({ key, label, icon: Icon, money, tone }) => (
              <FinanceCard key={key} className="min-w-0 p-4">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div>
                    <p className="m-0 inline-flex max-w-full items-center gap-1.5 truncate text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      <Icon size={13} />
                      {label}
                    </p>
                    <p className="mb-0 mt-2 truncate text-xl font-black text-slate-900 dark:text-white">
                      {money ? formatMoney(data[key]) : data[key]}
                    </p>
                  </div>
                  <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${tones[tone]}`}>
                    <Icon size={18} />
                  </span>
                </div>
              </FinanceCard>
            ))}
          </div>

          {reportData && (
            <FinanceCard className="mt-5 overflow-hidden">
              <div className="flex items-center gap-3 border-b border-slate-100 p-5 dark:border-slate-800">
                <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-[#4f90ff] dark:bg-blue-950"><BarChart3 size={20} /></span>
                <div>
                  <h2 className="m-0 text-base font-black text-slate-900 dark:text-white">Day-by-day collection</h2>
                  <p className="mb-0 mt-1 text-xs text-slate-500">{chartMonth} dashboard chart</p>
                </div>
              </div>
              <div className="overflow-x-auto p-5">
                <div className="flex h-64 min-w-[720px] items-end gap-2 border-b border-slate-200 px-1 dark:border-slate-700">
                  {reportData.dayBreakdown.map((day) => {
                    const height = day.total ? Math.max(7, (day.total / maxDayTotal) * 100) : 2;
                    return (
                      <div key={day.date} className="group flex min-w-0 flex-1 flex-col items-center justify-end self-stretch">
                        <div className="invisible mb-1 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-[10px] font-bold text-white group-hover:visible">
                          {formatMoney(day.total)} - {day.count}
                        </div>
                        <div className={`w-full max-w-8 rounded-t-md ${day.total ? 'bg-[#4f90ff]' : 'bg-slate-100 dark:bg-slate-800'}`} style={{ height: `${height}%` }} />
                        <span className="py-2 text-[10px] font-bold text-slate-400">{day.date.slice(-2)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </FinanceCard>
          )}

          <FinanceCard className="mt-5 overflow-hidden">
            <div className="border-b border-slate-100 p-5 dark:border-slate-800">
              <h2 className="m-0 text-base font-black text-slate-900 dark:text-white">Quick actions</h2>
              <p className="mb-0 mt-1 text-xs text-slate-500">Keep today&apos;s work moving.</p>
            </div>
            <div className="grid gap-3 p-5 md:grid-cols-2">
              <button type="button" onClick={() => navigate('/finance/collections')} className={`${primaryButton} justify-between px-5 py-4`}>
                <span className="inline-flex items-center gap-3"><CalendarCheck2 size={20} /> Enter today&apos;s collection</span>
                <ArrowRight size={18} />
              </button>
              <button type="button" onClick={() => navigate('/finance/customers/add')} className="inline-flex min-h-10 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-extrabold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-blue-950">
                <span className="inline-flex items-center gap-3"><UserPlus size={20} /> Add new customer</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </FinanceCard>
        </>
      )}
    </FinancePage>
  );
}



