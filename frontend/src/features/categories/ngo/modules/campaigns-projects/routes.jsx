import { ModulePlaceholderPage } from '../../../../../components/common/ModulePlaceholderPage.jsx';

function page(title) {
  return <ModulePlaceholderPage title={title} group="Campaigns & Projects" category="NGO" />;
}

export const ngoCampaignProjectRoutes = [
  { path: '/ngo/campaigns-projects/campaigns', element: page('Campaigns') },
  { path: '/ngo/campaigns-projects/projects', element: page('Projects') },
  { path: '/ngo/campaigns-projects/grant-management', element: page('Grant Management') },
  { path: '/ngo/campaigns-projects/csr-partner-portal', element: page('CSR Partner Portal') },
  { path: '/ngo/campaigns-projects/budget-vs-actual', element: page('Budget vs Actual') },
];
