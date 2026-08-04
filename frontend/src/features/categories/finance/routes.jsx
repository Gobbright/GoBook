import { Navigate } from 'react-router-dom';

import { FinanceAutoBillPage, FinanceManualBillPage } from './FinanceBillsPage.jsx';
import { FinanceCollectionPage } from './FinanceCollectionPage.jsx';
import {
  FinanceAddCustomerPage,
  FinanceAllCustomersPage,
  FinanceClosedCustomersPage,
} from './FinanceCustomersPage.jsx';
import { FinanceDashboardPage } from './FinanceDashboardPage.jsx';
import { FinanceProfileSettingsPage } from './FinanceProfileSettingsPage.jsx';
import { FinanceRemindersPage } from './FinanceRemindersPage.jsx';
import { FinanceReportsPage } from './FinanceReportsPage.jsx';

export const financeRoutes = [
  { path: '/finance/dashboard', element: <FinanceDashboardPage /> },
  { path: '/finance/customers', element: <Navigate to="/finance/customers/all" replace /> },
  { path: '/finance/customers/add', element: <FinanceAddCustomerPage /> },
  { path: '/finance/customers/all', element: <FinanceAllCustomersPage /> },
  { path: '/finance/customers/closed', element: <FinanceClosedCustomersPage /> },
  { path: '/finance/collections', element: <FinanceCollectionPage /> },
  { path: '/finance/bills', element: <Navigate to="/finance/bills/auto" replace /> },
  { path: '/finance/bills/auto', element: <FinanceAutoBillPage /> },
  { path: '/finance/bills/manual', element: <FinanceManualBillPage /> },
  { path: '/finance/profile-settings', element: <FinanceProfileSettingsPage /> },
  { path: '/finance/reminders', element: <FinanceRemindersPage /> },
  { path: '/finance/finished-customers', element: <Navigate to="/finance/customers/closed" replace /> },
  { path: '/finance/reports', element: <FinanceReportsPage /> },
];
