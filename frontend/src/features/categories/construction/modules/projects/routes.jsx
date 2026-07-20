import { ModulePlaceholderPage } from '../../../../../components/common/ModulePlaceholderPage.jsx';

function page(title) {
  return <ModulePlaceholderPage title={title} group="Projects" category="Construction" />;
}

export const constructionProjectRoutes = [
  { path: '/construction/projects/boq', element: page('BOQ') },
  { path: '/construction/projects/work-orders', element: page('Work Orders') },
  { path: '/construction/projects/site-progress', element: page('Site Progress') },
  { path: '/construction/projects/milestones', element: page('Milestones') },
  { path: '/construction/projects/ra-bills', element: page('RA Bills') },
  { path: '/construction/projects/retention-money', element: page('Retention Money') },
];
