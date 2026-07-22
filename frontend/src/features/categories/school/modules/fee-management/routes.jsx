import { FeeStructurePage } from './FeeStructurePage.jsx';
import { FeeCollectionPage } from './FeeCollectionPage.jsx';
import { FeeReceiptPage } from './FeeReceiptPage.jsx';
import { ScholarshipsPage } from './ScholarshipsPage.jsx';
import { DueReportsPage } from './DueReportsPage.jsx';

export const feeManagementRoutes = [
  { path: '/school/fee-structure', element: <FeeStructurePage /> },
  { path: '/school/fee-collection', element: <FeeCollectionPage /> },
  { path: '/school/fee-receipt', element: <FeeReceiptPage /> },
  { path: '/school/scholarships', element: <ScholarshipsPage /> },
  { path: '/school/due-reports', element: <DueReportsPage /> },
];
