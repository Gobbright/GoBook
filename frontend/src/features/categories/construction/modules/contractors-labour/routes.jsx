import { ModulePlaceholderPage } from '../../../../../components/common/ModulePlaceholderPage.jsx';

function page(title) {
  return <ModulePlaceholderPage title={title} group="Contractors & Labour" category="Construction" />;
}

export const contractorsLabourRoutes = [
  { path: '/construction/contractors-labour/contractors', element: page('Contractors') },
  { path: '/construction/contractors-labour/subcontractor-billing', element: page('Subcontractor Billing') },
  { path: '/construction/contractors-labour/labour-register', element: page('Labour Register') },
  { path: '/construction/contractors-labour/wages', element: page('Wages') },
];
