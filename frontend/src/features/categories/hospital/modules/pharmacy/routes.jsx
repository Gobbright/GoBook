import { ModulePlaceholderPage } from '../../../../../components/common/ModulePlaceholderPage.jsx';

function page(title) {
  return <ModulePlaceholderPage title={title} group="Pharmacy" category="Hospital" />;
}

export const pharmacyRoutes = [
  { path: '/hospital/medicines', element: page('Medicines') },
  { path: '/hospital/pharmacy-stock', element: page('Stock') },
  { path: '/hospital/expiry-alerts', element: page('Expiry Alerts') },
  { path: '/hospital/suppliers', element: page('Suppliers') },
];
