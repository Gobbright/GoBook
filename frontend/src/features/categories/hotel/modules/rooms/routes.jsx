import { ModulePlaceholderPage } from '../../../../../components/common/ModulePlaceholderPage.jsx';

function page(title) {
  return <ModulePlaceholderPage title={title} group="Rooms" category="Hotel" />;
}

export const roomsRoutes = [
  { path: '/hotel/room-types', element: page('Room Types') },
  { path: '/hotel/availability', element: page('Availability') },
  { path: '/hotel/housekeeping', element: page('Housekeeping') },
  { path: '/hotel/maintenance', element: page('Maintenance') },
];
