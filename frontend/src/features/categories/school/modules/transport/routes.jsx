import { ModulePlaceholderPage } from '../../../../../components/common/ModulePlaceholderPage.jsx';

function page(title) {
  return <ModulePlaceholderPage title={title} group="Transport" category="School" />;
}

export const transportRoutes = [
  { path: '/school/transport', element: page('Transport') },
  { path: '/school/transport/routes', element: page('Routes') },
  { path: '/school/transport/vehicles', element: page('Vehicles') },
  { path: '/school/transport/drivers', element: page('Drivers') },
  { path: '/school/transport/gps-tracking', element: page('GPS Tracking') },
  { path: '/school/transport/fees', element: page('Transport Fees') },
];
