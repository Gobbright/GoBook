import { ModulePlaceholderPage } from '../../../../../components/common/ModulePlaceholderPage.jsx';

function page(title) {
  return <ModulePlaceholderPage title={title} group="Billing" category="Hotel" />;
}

export const hotelBillingRoutes = [
  { path: '/hotel/guest-invoice', element: page('Guest Invoice') },
  { path: '/hotel/pos', element: page('POS') },
  { path: '/hotel/payments', element: page('Payments') },
  { path: '/hotel/billing-reports', element: page('Reports') },
];
