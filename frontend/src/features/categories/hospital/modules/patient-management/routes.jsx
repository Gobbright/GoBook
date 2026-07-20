import { ModulePlaceholderPage } from '../../../../../components/common/ModulePlaceholderPage.jsx';

function page(title) {
  return <ModulePlaceholderPage title={title} group="Patient Management" category="Hospital" />;
}

export const patientManagementRoutes = [
  { path: '/hospital/patients', element: page('Patients') },
  { path: '/hospital/appointments', element: page('Appointments') },
  { path: '/hospital/admissions', element: page('Admissions') },
  { path: '/hospital/discharge', element: page('Discharge') },
  { path: '/hospital/medical-history', element: page('Medical History') },
  { path: '/hospital/follow-up', element: page('Follow Up') },
];
