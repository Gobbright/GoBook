import { hotelCoreRoutes } from './modules/core/routes.jsx';
import { hotelBillingRoutes } from './modules/billing/routes.jsx';
import { hotelDashboardRoutes } from './modules/dashboard/routes.jsx';
import { guestManagementRoutes } from './modules/guest-management/routes.jsx';
import { restaurantRoutes } from './modules/restaurant/routes.jsx';
import { roomsRoutes } from './modules/rooms/routes.jsx';

export const hotelRoutes = [
  ...hotelCoreRoutes,
  ...hotelDashboardRoutes,
  ...guestManagementRoutes,
  ...roomsRoutes,
  ...hotelBillingRoutes,
  ...restaurantRoutes,
];
