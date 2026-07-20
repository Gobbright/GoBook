import { DashboardPage } from '../../../../../pages/DashboardPage.jsx';

const dashboard = <DashboardPage />;

export const hotelDashboardRoutes = [
  { path: '/hotel/dashboard', element: dashboard },
  { path: '/hotel/dashboard/occupancy', element: dashboard },
  { path: '/hotel/dashboard/arrivals', element: dashboard },
  { path: '/hotel/dashboard/departures', element: dashboard },
  { path: '/hotel/dashboard/revenue', element: dashboard },
  { path: '/hotel/dashboard/adr-revpar', element: dashboard },
];
