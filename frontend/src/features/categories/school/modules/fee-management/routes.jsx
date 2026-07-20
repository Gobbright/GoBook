import { ModulePlaceholderPage } from '../../../../../components/common/ModulePlaceholderPage.jsx';

function page(title) {
  return <ModulePlaceholderPage title={title} group="Fee Management" category="School" />;
}

export const feeManagementRoutes = [
  { path: '/school/fee-structure', element: page('Fee Structure') },
  { path: '/school/fee-collection', element: page('Fee Collection') },
  { path: '/school/fee-receipt', element: page('Fee Receipt') },
  { path: '/school/scholarships', element: page('Scholarships') },
  { path: '/school/due-reports', element: page('Due Reports') },
];
