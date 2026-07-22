import { GenericModulePage } from '../../../../../components/common/GenericModulePage.jsx';

const GROUP = 'Medical Billing';
const CATEGORY = 'Hospital';

const ITEMS = [
  {
    path: '/hospital/medical-bills', title: 'Medical Bills', fields: [
      { key: 'patientName', label: 'Patient Name', required: true },
      { key: 'billDate', label: 'Bill Date', type: 'date' },
      { key: 'amount', label: 'Amount', type: 'number' },
      { key: 'status', label: 'Status', type: 'select', options: ['Paid', 'Pending'] },
    ],
  },
  {
    path: '/hospital/insurance-claims', title: 'Insurance Claims', fields: [
      { key: 'patientName', label: 'Patient Name', required: true },
      { key: 'insurer', label: 'Insurer' },
      { key: 'claimAmount', label: 'Claim Amount', type: 'number' },
      { key: 'status', label: 'Status', type: 'select', options: ['Submitted', 'Approved', 'Rejected'] },
    ],
  },
  {
    path: '/hospital/payments', title: 'Payments', fields: [
      { key: 'patientName', label: 'Patient Name', required: true },
      { key: 'amount', label: 'Amount', type: 'number' },
      { key: 'mode', label: 'Mode', type: 'select', options: ['Cash', 'Card', 'UPI', 'Insurance'] },
      { key: 'date', label: 'Date', type: 'date' },
    ],
  },
  {
    path: '/hospital/receivables', title: 'Receivables', fields: [
      { key: 'patientName', label: 'Patient Name', required: true },
      { key: 'amountDue', label: 'Amount Due', type: 'number' },
      { key: 'dueDate', label: 'Due Date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: ['Pending', 'Overdue', 'Cleared'] },
    ],
  },
  {
    path: '/hospital/revenue-reports', title: 'Revenue Reports', fields: [
      { key: 'period', label: 'Period', required: true },
      { key: 'totalRevenue', label: 'Total Revenue', type: 'number' },
      { key: 'totalBills', label: 'Total Bills', type: 'number' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
];

export const medicalBillingRoutes = ITEMS.map(({ path, title, fields }) => ({
  path,
  element: <GenericModulePage title={title} group={GROUP} category={CATEGORY} moduleKey={path.slice(1)} fields={fields} />,
}));
