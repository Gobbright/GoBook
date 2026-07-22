import { MedicalBillsPage } from './MedicalBillsPage.jsx';
import { InsuranceClaimsPage } from './InsuranceClaimsPage.jsx';
import { PaymentsPage } from './PaymentsPage.jsx';
import { ReceivablesPage } from './ReceivablesPage.jsx';
import { RevenueReportsPage } from './RevenueReportsPage.jsx';

export const medicalBillingRoutes = [
  { path: '/hospital/medical-bills', element: <MedicalBillsPage /> },
  { path: '/hospital/insurance-claims', element: <InsuranceClaimsPage /> },
  { path: '/hospital/payments', element: <PaymentsPage /> },
  { path: '/hospital/receivables', element: <ReceivablesPage /> },
  { path: '/hospital/revenue-reports', element: <RevenueReportsPage /> },
];
