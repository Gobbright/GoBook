import { ModulePlaceholderPage } from '../../../../../components/common/ModulePlaceholderPage.jsx';

function page(title) {
  return <ModulePlaceholderPage title={title} group="Materials" category="Construction" />;
}

export const constructionMaterialRoutes = [
  { path: '/construction/materials/purchase', element: page('Purchase') },
  { path: '/construction/materials/site-inventory', element: page('Site Inventory') },
  { path: '/construction/materials/vendors', element: page('Vendors') },
  { path: '/construction/materials/material-issue', element: page('Material Issue') },
  { path: '/construction/materials/stock', element: page('Stock') },
];
