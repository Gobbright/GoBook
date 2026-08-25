import { AiInsights } from '../features/ai-insights/AiInsights.jsx';
import { DashboardMetrics } from '../features/dashboard/DashboardMetrics.jsx';
import { DashboardOverview } from '../features/dashboard/DashboardOverview.jsx';
import { QuickActions } from '../features/dashboard/QuickActions.jsx';
import { RecentTransactions } from '../features/dashboard/RecentTransactions.jsx';
import { Reminders } from '../features/dashboard/Reminders.jsx';
import { useDashboard } from '../hooks/useDashboard.js';
import { useLocation } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';

import { SelectDropdown } from '../components/forms/SelectDropdown.jsx';
import { useCurrentUser } from '../hooks/useCurrentUser.js';
import { normalizeAppPath } from '../routes/navigation.js';
import { apiClient } from '../services/apiClient.js';

export function DashboardPage() {
  const location = useLocation();
  const currentUser = useCurrentUser();
  const [branches, setBranches] = useState([]);
  const [branch, setBranch] = useState('');
  const isSuperAdmin = currentUser?.isSuperAdmin || currentUser?.accountType === 'owner' || currentUser?.role === 'Super Admin';
  const branchOptions = useMemo(() => [
    { value: '', label: 'All Branches' },
    ...branches.map((item) => ({ value: item.code || item.name, label: `${item.name}${item.code ? ` (${item.code})` : ''}` })),
  ], [branches]);
  const { error, insights, isLoading, metrics, reminders, transactions, topCustomers, inventoryStatus, salesTrend, cashFlow, growthScore } = useDashboard({ branch: isSuperAdmin ? branch : '' });
  const activePath = normalizeAppPath(location.pathname || '/dashboard');

  useEffect(() => {
    if (!isSuperAdmin) return;
    apiClient('/settings/branches')
      .then((data) => setBranches(data.branches || []))
      .catch(() => setBranches([]));
  }, [isSuperAdmin]);

  const dashboard = {
    metrics,
    topCustomers,
    inventoryStatus,
    salesTrend,
    cashFlow,
    growthScore,
    insights,
  };

  return (
    <div className="p-4 md:p-7">
      <section className="mb-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
          <div>
          <h1 className="m-0 text-[28px]">Welcome back, Admin!</h1>
          <p className="text-[#536173] dark:text-slate-400 mt-2 mb-0">
            Here's what's happening with your business today.
          </p>
          </div>
          {isSuperAdmin && (
            <SelectDropdown
              value={branch}
              onChange={setBranch}
              options={branchOptions}
              buttonClassName="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] bg-white font-[inherit] outline-none min-w-44"
            />
          )}
        </div>
      </section>
      {isLoading && <p className="text-blue-600 dark:text-blue-400 text-sm mt-4">Loading dashboard from backend...</p>}
      {error && <p className="text-amber-700 dark:text-amber-400 text-sm mt-4">Backend unavailable. Unable to load dashboard data.</p>}
      <DashboardMetrics metrics={dashboard.metrics} activePath={activePath} />
      <DashboardOverview
        topCustomers={dashboard.topCustomers}
        inventoryStatus={dashboard.inventoryStatus}
        salesTrend={dashboard.salesTrend}
        cashFlow={dashboard.cashFlow}
        growthScore={dashboard.growthScore}
      />
      <AiInsights insights={dashboard.insights} />
      <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-4 mt-5">
        <RecentTransactions transactions={transactions} />
        <Reminders reminders={reminders} />
      </section>
      <QuickActions />
    </div>
  );
}
