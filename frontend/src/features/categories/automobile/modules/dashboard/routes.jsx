import { DashboardPage } from '../../../../../pages/DashboardPage.jsx';

const dashboard = <DashboardPage />;

export const automobileDashboardRoutes = [
  { path: '/automobile/dashboard', element: dashboard },
  { path: '/automobile/dashboard/job-cards', element: dashboard },
  { path: '/automobile/dashboard/vehicles-in-service', element: dashboard },
  { path: '/automobile/dashboard/revenue', element: dashboard },
  { path: '/automobile/dashboard/pending-delivery', element: dashboard },
];
