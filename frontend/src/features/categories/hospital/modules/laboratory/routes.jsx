import { GenericModulePage } from '../../../../../components/common/GenericModulePage.jsx';

const GROUP = 'Laboratory';
const CATEGORY = 'Hospital';

const ITEMS = [
  {
    path: '/hospital/test-orders', title: 'Test Orders', fields: [
      { key: 'patientName', label: 'Patient Name', required: true },
      { key: 'testName', label: 'Test Name' },
      { key: 'orderedBy', label: 'Ordered By' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: ['Pending', 'In Progress', 'Completed'] },
    ],
  },
  {
    path: '/hospital/lab-reports', title: 'Reports', fields: [
      { key: 'patientName', label: 'Patient Name', required: true },
      { key: 'testName', label: 'Test Name' },
      { key: 'result', label: 'Result', type: 'textarea' },
      { key: 'reportDate', label: 'Report Date', type: 'date' },
    ],
  },
  {
    path: '/hospital/sample-collection', title: 'Sample Collection', fields: [
      { key: 'patientName', label: 'Patient Name', required: true },
      { key: 'sampleType', label: 'Sample Type' },
      { key: 'collectedBy', label: 'Collected By' },
      { key: 'collectionDate', label: 'Collection Date', type: 'date' },
    ],
  },
  {
    path: '/hospital/diagnostics', title: 'Diagnostics', fields: [
      { key: 'patientName', label: 'Patient Name', required: true },
      { key: 'scanType', label: 'Scan Type' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'findings', label: 'Findings', type: 'textarea' },
    ],
  },
];

export const laboratoryRoutes = ITEMS.map(({ path, title, fields }) => ({
  path,
  element: <GenericModulePage title={title} group={GROUP} category={CATEGORY} moduleKey={path.slice(1)} fields={fields} />,
}));
