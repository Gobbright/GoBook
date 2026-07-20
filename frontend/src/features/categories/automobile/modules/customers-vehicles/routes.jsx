import { ModulePlaceholderPage } from '../../../../../components/common/ModulePlaceholderPage.jsx';

function page(title) {
  return <ModulePlaceholderPage title={title} group="Customers & Vehicles" category="Automobile" />;
}

export const automobileCustomersVehicleRoutes = [
  { path: '/automobile/customers-vehicles/customers', element: page('Customers') },
  { path: '/automobile/customers-vehicles/vehicles', element: page('Vehicles') },
  { path: '/automobile/customers-vehicles/service-history', element: page('Vehicle Service History') },
  { path: '/automobile/customers-vehicles/documents', element: page('Documents') },
];
