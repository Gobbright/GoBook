import { PatientsPage } from './PatientsPage.jsx';
import { AppointmentsPage } from './AppointmentsPage.jsx';
import { AdmissionsPage } from './AdmissionsPage.jsx';
import { DischargePage } from './DischargePage.jsx';
import { MedicalHistoryPage } from './MedicalHistoryPage.jsx';
import { FollowUpPage } from './FollowUpPage.jsx';

export const patientManagementRoutes = [
  { path: '/hospital/patients', element: <PatientsPage /> },
  { path: '/hospital/appointments', element: <AppointmentsPage /> },
  { path: '/hospital/admissions', element: <AdmissionsPage /> },
  { path: '/hospital/discharge', element: <DischargePage /> },
  { path: '/hospital/medical-history', element: <MedicalHistoryPage /> },
  { path: '/hospital/follow-up', element: <FollowUpPage /> },
];
