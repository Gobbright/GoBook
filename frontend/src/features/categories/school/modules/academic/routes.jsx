import { ModulePlaceholderPage } from '../../../../../components/common/ModulePlaceholderPage.jsx';

function page(title) {
  return <ModulePlaceholderPage title={title} group="Academic" category="School" />;
}

export const academicRoutes = [
  { path: '/school/classes', element: page('Classes') },
  { path: '/school/sections', element: page('Sections') },
  { path: '/school/subjects', element: page('Subjects') },
  { path: '/school/timetable', element: page('Timetable') },
  { path: '/school/exams', element: page('Exams') },
];
