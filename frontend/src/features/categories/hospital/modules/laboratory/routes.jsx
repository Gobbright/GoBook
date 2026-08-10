import { TestOrdersPage } from './TestOrdersPage.jsx';
import { LabReportsPage } from './LabReportsPage.jsx';
import { SampleCollectionPage } from './SampleCollectionPage.jsx';
import { DiagnosticsPage } from './DiagnosticsPage.jsx';
import { LaboratoryPage } from './LaboratoryPage.jsx';
import { LabResultsPage } from './LabResultsPage.jsx';

export const laboratoryRoutes = [
  { path: '/hospital/test-orders', element: <TestOrdersPage /> },
  { path: '/hospital/lab-reports', element: <LabReportsPage /> },
  { path: '/hospital/sample-collection', element: <SampleCollectionPage /> },
  { path: '/hospital/test-results', element: <LabResultsPage /> },
  { path: '/hospital/lab-results', element: <LabResultsPage /> },
  { path: '/hospital/diagnostics', element: <LaboratoryPage /> },
  { path: '/hospital/diagnostic-reports', element: <DiagnosticsPage /> },
];
