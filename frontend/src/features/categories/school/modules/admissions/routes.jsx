import { NewAdmissionPage } from './NewAdmissionPage.jsx';
import { ApplicationsPage } from './ApplicationsPage.jsx';
import { EnquiriesPage } from './EnquiriesPage.jsx';
import { MeritSelectionPage } from './MeritSelectionPage.jsx';
import { AdmissionReportsPage } from './AdmissionReportsPage.jsx';

export const admissionsRoutes = [
  { path: '/school/admissions/new-admission', element: <NewAdmissionPage /> },
  { path: '/school/admissions/applications', element: <ApplicationsPage /> },
  { path: '/school/admissions/enquiries', element: <EnquiriesPage /> },
  { path: '/school/admissions/merit-selection', element: <MeritSelectionPage /> },
  { path: '/school/admissions/reports', element: <AdmissionReportsPage /> },
];
