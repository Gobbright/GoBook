import { ModulePlaceholderPage } from '../../../../../components/common/ModulePlaceholderPage.jsx';

function page(title) {
  return <ModulePlaceholderPage title={title} group="Clinical" category="Hospital" />;
}

export const clinicalRoutes = [
  { path: '/hospital/doctors', element: page('Doctors') },
  { path: '/hospital/departments', element: page('Departments') },
  { path: '/hospital/consultation', element: page('Consultation') },
  { path: '/hospital/treatment', element: page('Treatment') },
  { path: '/hospital/prescription', element: page('Prescription') },
  { path: '/hospital/nursing', element: page('Nursing') },
];
