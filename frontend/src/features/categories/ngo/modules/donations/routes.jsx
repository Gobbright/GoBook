import { ModulePlaceholderPage } from '../../../../../components/common/ModulePlaceholderPage.jsx';

function page(title) {
  return <ModulePlaceholderPage title={title} group="Donations" category="NGO" />;
}

export const ngoDonationRoutes = [
  { path: '/ngo/donations/entry', element: page('Donation Entry') },
  { path: '/ngo/donations/receipt', element: page('Donation Receipt') },
  { path: '/ngo/donations/80g-receipt-auto-generation', element: page('80G Receipt Auto-Generation') },
  { path: '/ngo/donations/online-payment', element: page('Online Payment') },
  { path: '/ngo/donations/in-kind-donations', element: page('In-Kind Donations') },
  { path: '/ngo/donations/reports', element: page('Reports') },
];
