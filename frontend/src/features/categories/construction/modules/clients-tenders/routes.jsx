import { ModulePlaceholderPage } from '../../../../../components/common/ModulePlaceholderPage.jsx';

function page(title) {
  return <ModulePlaceholderPage title={title} group="Clients & Tenders" category="Construction" />;
}

export const clientsTendersRoutes = [
  { path: '/construction/clients-tenders/clients', element: page('Clients') },
  { path: '/construction/clients-tenders/tender-management', element: page('Tender Management') },
  { path: '/construction/clients-tenders/estimates', element: page('Estimates') },
  { path: '/construction/clients-tenders/agreements', element: page('Agreements') },
];
