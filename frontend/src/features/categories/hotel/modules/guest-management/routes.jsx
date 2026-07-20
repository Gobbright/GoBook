import { ModulePlaceholderPage } from '../../../../../components/common/ModulePlaceholderPage.jsx';

function page(title) {
  return <ModulePlaceholderPage title={title} group="Guest Management" category="Hotel" />;
}

export const guestManagementRoutes = [
  { path: '/hotel/guests', element: page('Guests') },
  { path: '/hotel/bookings', element: page('Bookings') },
  { path: '/hotel/check-in', element: page('Check-In') },
  { path: '/hotel/check-out', element: page('Check-Out') },
  { path: '/hotel/guest-history', element: page('Guest History') },
];
