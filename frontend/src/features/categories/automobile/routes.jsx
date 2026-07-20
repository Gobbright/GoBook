import { automobileCustomersVehicleRoutes } from './modules/customers-vehicles/routes.jsx';
import { automobileDashboardRoutes } from './modules/dashboard/routes.jsx';
import { automobileJobCardRoutes } from './modules/job-cards/routes.jsx';
import { automobileServiceRoutes } from './modules/service/routes.jsx';
import { automobileServiceInvoiceRoutes } from './modules/service-invoice/routes.jsx';

export const automobileRoutes = [
  ...automobileDashboardRoutes,
  ...automobileCustomersVehicleRoutes,
  ...automobileJobCardRoutes,
  ...automobileServiceRoutes,
  ...automobileServiceInvoiceRoutes,
];
