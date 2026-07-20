import { ModulePlaceholderPage } from '../../../../../components/common/ModulePlaceholderPage.jsx';

function page(title) {
  return <ModulePlaceholderPage title={title} group="Donors" category="NGO" />;
}

export const ngoDonorRoutes = [
  { path: '/ngo/donors/donors', element: page('Donors') },
  { path: '/ngo/donors/categories', element: page('Donor Categories') },
  { path: '/ngo/donors/recurring-donors', element: page('Recurring Donors') },
  { path: '/ngo/donors/communication', element: page('Donor Communication') },
];
