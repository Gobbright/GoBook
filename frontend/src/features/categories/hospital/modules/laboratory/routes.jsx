import { TestOrdersPage } from './TestOrdersPage.jsx';
import { LabReportsPage } from './LabReportsPage.jsx';
import { SampleCollectionPage } from './SampleCollectionPage.jsx';
import { DiagnosticsPage } from './DiagnosticsPage.jsx';

export const laboratoryRoutes = [
  { path: '/hospital/test-orders', element: <TestOrdersPage /> },
  { path: '/hospital/lab-reports', element: <LabReportsPage /> },
  { path: '/hospital/sample-collection', element: <SampleCollectionPage /> },
  { path: '/hospital/diagnostics', element: <DiagnosticsPage /> },
];
