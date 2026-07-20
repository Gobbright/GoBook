import { GenericModulePage } from '../../../../../components/common/GenericModulePage.jsx';

const GROUP = 'Student Management';
const CATEGORY = 'School';

const ITEMS = [
  {
    path: '/school/students', title: 'Students', fields: [
      { key: 'name', label: 'Student Name', required: true },
      { key: 'rollNumber', label: 'Roll Number' },
      { key: 'className', label: 'Class' },
      { key: 'section', label: 'Section' },
      { key: 'phone', label: 'Phone' },
    ],
  },
  {
    path: '/school/admission', title: 'Admission', fields: [
      { key: 'studentName', label: 'Student Name', required: true },
      { key: 'className', label: 'Class' },
      { key: 'admissionDate', label: 'Admission Date', type: 'date' },
      { key: 'guardianName', label: 'Guardian Name' },
      { key: 'status', label: 'Status', type: 'select', options: ['Pending', 'Approved', 'Rejected'] },
    ],
  },
  {
    path: '/school/transfer', title: 'Transfer', fields: [
      { key: 'studentName', label: 'Student Name', required: true },
      { key: 'fromClass', label: 'From Class' },
      { key: 'toClass', label: 'To Class' },
      { key: 'transferDate', label: 'Transfer Date', type: 'date' },
      { key: 'reason', label: 'Reason' },
    ],
  },
  {
    path: '/school/parent-details', title: 'Parent Details', fields: [
      { key: 'studentName', label: 'Student Name', required: true },
      { key: 'parentName', label: 'Parent Name' },
      { key: 'relation', label: 'Relation', type: 'select', options: ['Father', 'Mother', 'Guardian'] },
      { key: 'phone', label: 'Phone' },
      { key: 'email', label: 'Email' },
    ],
  },
  {
    path: '/school/certificates', title: 'Certificates', fields: [
      { key: 'studentName', label: 'Student Name', required: true },
      { key: 'certificateType', label: 'Certificate Type' },
      { key: 'issueDate', label: 'Issue Date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: ['Issued', 'Pending'] },
    ],
  },
];

export const studentManagementRoutes = ITEMS.map(({ path, title, fields }) => ({
  path,
  element: <GenericModulePage title={title} group={GROUP} category={CATEGORY} moduleKey={path.slice(1)} fields={fields} />,
}));
