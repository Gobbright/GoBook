import { GenericModulePage } from '../../../../../components/common/GenericModulePage.jsx';

const GROUP = 'Fee Management';
const CATEGORY = 'School';

const ITEMS = [
  {
    path: '/school/fee-structure', title: 'Fee Structure', fields: [
      { key: 'className', label: 'Class', required: true },
      { key: 'feeType', label: 'Fee Type' },
      { key: 'amount', label: 'Amount', type: 'number' },
      { key: 'dueDate', label: 'Due Date', type: 'date' },
    ],
  },
  {
    path: '/school/fee-collection', title: 'Fee Collection', fields: [
      { key: 'studentName', label: 'Student Name', required: true },
      { key: 'amount', label: 'Amount', type: 'number' },
      { key: 'paymentDate', label: 'Payment Date', type: 'date' },
      { key: 'mode', label: 'Mode', type: 'select', options: ['Cash', 'Card', 'UPI', 'Bank Transfer'] },
    ],
  },
  {
    path: '/school/fee-receipt', title: 'Fee Receipt', fields: [
      { key: 'studentName', label: 'Student Name', required: true },
      { key: 'receiptNumber', label: 'Receipt Number' },
      { key: 'amount', label: 'Amount', type: 'number' },
      { key: 'date', label: 'Date', type: 'date' },
    ],
  },
  {
    path: '/school/scholarships', title: 'Scholarships', fields: [
      { key: 'studentName', label: 'Student Name', required: true },
      { key: 'scholarshipType', label: 'Scholarship Type' },
      { key: 'amount', label: 'Amount', type: 'number' },
      { key: 'status', label: 'Status', type: 'select', options: ['Applied', 'Approved', 'Rejected'] },
    ],
  },
  {
    path: '/school/due-reports', title: 'Due Reports', fields: [
      { key: 'studentName', label: 'Student Name', required: true },
      { key: 'amountDue', label: 'Amount Due', type: 'number' },
      { key: 'dueDate', label: 'Due Date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: ['Pending', 'Overdue'] },
    ],
  },
];

export const feeManagementRoutes = ITEMS.map(({ path, title, fields }) => ({
  path,
  element: <GenericModulePage title={title} group={GROUP} category={CATEGORY} moduleKey={path.slice(1)} fields={fields} />,
}));
