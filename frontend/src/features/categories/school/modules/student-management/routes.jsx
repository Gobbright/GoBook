import { StudentsPage } from './StudentsPage.jsx';
import { AdmissionPage } from './AdmissionPage.jsx';
import { TransferPage } from './TransferPage.jsx';
import { ParentDetailsPage } from './ParentDetailsPage.jsx';
import { CertificatesPage } from './CertificatesPage.jsx';

export const studentManagementRoutes = [
  { path: '/school/students', element: <StudentsPage /> },
  { path: '/school/admission', element: <AdmissionPage /> },
  { path: '/school/transfer', element: <TransferPage /> },
  { path: '/school/parent-details', element: <ParentDetailsPage /> },
  { path: '/school/certificates', element: <CertificatesPage /> },
];
