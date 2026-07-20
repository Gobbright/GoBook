import { DashboardPage } from '../../../../../pages/DashboardPage.jsx';

const dashboard = <DashboardPage />;

export const ngoDashboardRoutes = [
  { path: '/ngo/dashboard', element: dashboard },
  { path: '/ngo/dashboard/total-donations', element: dashboard },
  { path: '/ngo/dashboard/active-campaigns', element: dashboard },
  { path: '/ngo/dashboard/beneficiaries-served', element: dashboard },
  { path: '/ngo/dashboard/volunteers', element: dashboard },
];
