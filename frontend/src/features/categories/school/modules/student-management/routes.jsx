import { ModulePlaceholderPage } from '../../../../../components/common/ModulePlaceholderPage.jsx';

function page(title) {
  return <ModulePlaceholderPage title={title} group="Student Management" category="School" />;
}

export const studentManagementRoutes = [
  { path: '/school/students', element: page('Students') },
  { path: '/school/admission', element: page('Admission') },
  { path: '/school/transfer', element: page('Transfer') },
  { path: '/school/parent-details', element: page('Parent Details') },
  { path: '/school/certificates', element: page('Certificates') },
];
