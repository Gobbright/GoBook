import { ModulePlaceholderPage } from '../../../../../components/common/ModulePlaceholderPage.jsx';

function page(title) {
  return <ModulePlaceholderPage title={title} group="Volunteers" category="NGO" />;
}

export const ngoVolunteerRoutes = [
  { path: '/ngo/volunteers/volunteers', element: page('Volunteers') },
  { path: '/ngo/volunteers/assignments', element: page('Assignments') },
  { path: '/ngo/volunteers/certificates', element: page('Certificates') },
];
