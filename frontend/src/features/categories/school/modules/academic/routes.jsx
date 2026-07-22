import { ClassesPage } from './ClassesPage.jsx';
import { SectionsPage } from './SectionsPage.jsx';
import { SubjectsPage } from './SubjectsPage.jsx';
import { TimetablePage } from './TimetablePage.jsx';
import { ExamsPage } from './ExamsPage.jsx';

export const academicRoutes = [
  { path: '/school/classes', element: <ClassesPage /> },
  { path: '/school/sections', element: <SectionsPage /> },
  { path: '/school/subjects', element: <SubjectsPage /> },
  { path: '/school/timetable', element: <TimetablePage /> },
  { path: '/school/exams', element: <ExamsPage /> },
];
