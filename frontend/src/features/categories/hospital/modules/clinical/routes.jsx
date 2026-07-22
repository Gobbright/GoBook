import { DoctorsPage } from './DoctorsPage.jsx';
import { DepartmentsPage } from './DepartmentsPage.jsx';
import { ConsultationPage } from './ConsultationPage.jsx';
import { TreatmentPage } from './TreatmentPage.jsx';
import { PrescriptionPage } from './PrescriptionPage.jsx';
import { NursingPage } from './NursingPage.jsx';

export const clinicalRoutes = [
  { path: '/hospital/doctors', element: <DoctorsPage /> },
  { path: '/hospital/departments', element: <DepartmentsPage /> },
  { path: '/hospital/consultation', element: <ConsultationPage /> },
  { path: '/hospital/treatment', element: <TreatmentPage /> },
  { path: '/hospital/prescription', element: <PrescriptionPage /> },
  { path: '/hospital/nursing', element: <NursingPage /> },
];
