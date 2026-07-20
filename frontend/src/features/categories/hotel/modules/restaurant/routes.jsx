import { ModulePlaceholderPage } from '../../../../../components/common/ModulePlaceholderPage.jsx';

function page(title) {
  return <ModulePlaceholderPage title={title} group="Restaurant" category="Hotel" />;
}

export const restaurantRoutes = [
  { path: '/hotel/restaurant', element: page('Restaurant') },
  { path: '/hotel/restaurant/table-management', element: page('Table Management') },
  { path: '/hotel/restaurant/kot', element: page('KOT') },
  { path: '/hotel/restaurant/menu', element: page('Menu') },
  { path: '/hotel/restaurant/room-service', element: page('Room Service') },
  { path: '/hotel/restaurant/bar', element: page('Bar') },
];
