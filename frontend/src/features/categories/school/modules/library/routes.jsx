import { ModulePlaceholderPage } from '../../../../../components/common/ModulePlaceholderPage.jsx';

function page(title) {
  return <ModulePlaceholderPage title={title} group="Library" category="School" />;
}

export const libraryRoutes = [
  { path: '/school/library', element: page('Library') },
  { path: '/school/library/books', element: page('Books') },
  { path: '/school/library/issue-return', element: page('Issue / Return') },
  { path: '/school/library/fine', element: page('Fine') },
  { path: '/school/library/catalogue', element: page('Catalogue') },
];
