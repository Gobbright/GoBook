import { AiInsights } from '../features/ai-insights/AiInsights.jsx';
import { DashboardMetrics } from '../features/dashboard/DashboardMetrics.jsx';
import { DashboardOverview } from '../features/dashboard/DashboardOverview.jsx';
import { QuickActions } from '../features/dashboard/QuickActions.jsx';
import { RecentTransactions } from '../features/dashboard/RecentTransactions.jsx';
import { Reminders } from '../features/dashboard/Reminders.jsx';
import { getCategoryDashboard } from '../features/dashboard/categoryDashboardData.js';
import { useDashboard } from '../hooks/useDashboard.js';
import { getCurrentUser } from '../services/authService.js';
import { useLocation } from 'react-router-dom';

export function DashboardPage() {
  const location = useLocation();
  const { error, insights, isLoading, metrics, reminders, transactions, topCustomers, inventoryStatus, salesTrend, cashFlow, growthScore } = useDashboard();
  const categoryDashboard = getCategoryDashboard(getCurrentUser()?.category);
  const activeHash = location.pathname || '/dashboard';
  const dashboard = categoryDashboard ? {
    metrics: categoryDashboard.metrics,
    topCustomers: categoryDashboard.list,
    inventoryStatus: categoryDashboard.inventory,
    salesTrend: categoryDashboard.trend,
    cashFlow: categoryDashboard.donut,
    growthScore: categoryDashboard.score,
    insights: [
      `${categoryDashboard.title} is showing the category dashboard overview.`,
      'Dashboard sidebar links highlight their matching metric on this page.',
    ],
  } : {
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
        <div>
          <h1 className="m-0 text-[28px]">{categoryDashboard?.title || 'Welcome back, Admin!'}</h1>
          <p className="text-[#536173] dark:text-slate-400 mt-2 mb-0">
            {categoryDashboard?.subtitle || "Here's what's happening with your business today."}
          </p>
        </div>
      </section>
      {!categoryDashboard && isLoading && <p className="text-blue-600 dark:text-blue-400 text-sm mt-4">Loading dashboard from backend...</p>}
      {!categoryDashboard && error && <p className="text-amber-700 dark:text-amber-400 text-sm mt-4">Backend unavailable. Unable to load dashboard data.</p>}
      <DashboardMetrics metrics={dashboard.metrics} activeHash={activeHash} />
      <DashboardOverview
        topCustomers={dashboard.topCustomers}
        inventoryStatus={dashboard.inventoryStatus}
        salesTrend={dashboard.salesTrend}
        cashFlow={dashboard.cashFlow}
        growthScore={dashboard.growthScore}
        secondaryStats={categoryDashboard?.secondary}
        titles={categoryDashboard ? {
          primaryChartTitle: categoryDashboard.primaryChartTitle,
          donutTitle: categoryDashboard.donutTitle,
          listTitle: categoryDashboard.listTitle,
          secondaryCardTitle: categoryDashboard.secondaryCardTitle,
          inventoryTitle: categoryDashboard.inventoryTitle,
          scoreTitle: categoryDashboard.scoreTitle,
        } : undefined}
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
