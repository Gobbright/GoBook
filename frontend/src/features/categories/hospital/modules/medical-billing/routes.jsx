import { ModulePlaceholderPage } from '../../../../../components/common/ModulePlaceholderPage.jsx';

function page(title) {
  return <ModulePlaceholderPage title={title} group="Medical Billing" category="Hospital" />;
}

export const medicalBillingRoutes = [
  { path: '/hospital/medical-bills', element: page('Medical Bills') },
  { path: '/hospital/insurance-claims', element: page('Insurance Claims') },
  { path: '/hospital/payments', element: page('Payments') },
  { path: '/hospital/receivables', element: page('Receivables') },
  { path: '/hospital/revenue-reports', element: page('Revenue Reports') },
];
