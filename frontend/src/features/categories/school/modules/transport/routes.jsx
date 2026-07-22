import { RoutesPage } from './RoutesPage.jsx';
import { VehiclesPage } from './VehiclesPage.jsx';
import { DriversPage } from './DriversPage.jsx';
import { GpsTrackingPage } from './GpsTrackingPage.jsx';
import { TransportFeesPage } from './TransportFeesPage.jsx';

export const transportRoutes = [
  { path: '/school/transport/routes', element: <RoutesPage /> },
  { path: '/school/transport/vehicles', element: <VehiclesPage /> },
  { path: '/school/transport/drivers', element: <DriversPage /> },
  { path: '/school/transport/gps-tracking', element: <GpsTrackingPage /> },
  { path: '/school/transport/fees', element: <TransportFeesPage /> },
];
