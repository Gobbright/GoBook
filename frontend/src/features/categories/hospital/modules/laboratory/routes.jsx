import { ModulePlaceholderPage } from '../../../../../components/common/ModulePlaceholderPage.jsx';

function page(title) {
  return <ModulePlaceholderPage title={title} group="Laboratory" category="Hospital" />;
}

export const laboratoryRoutes = [
  { path: '/hospital/test-orders', element: page('Test Orders') },
  { path: '/hospital/lab-reports', element: page('Reports') },
  { path: '/hospital/sample-collection', element: page('Sample Collection') },
  { path: '/hospital/diagnostics', element: page('Diagnostics') },
];
