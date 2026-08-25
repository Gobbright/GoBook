import { GenericModulePage } from '../../../../../components/common/GenericModulePage.jsx';

const GROUP = 'Fees & Billing';
const CATEGORY = 'School';

const ITEMS = [
  {
    path: '/school/fees/fee-structure', title: 'Fee Structure', fields: [
      { key: 'className', label: 'Class', required: true },
      { key: 'academicYear', label: 'Academic Year' },
      { key: 'tuitionFee', label: 'Tuition Fee', type: 'number' },
      { key: 'transportFee', label: 'Transport Fee', type: 'number' },
      { key: 'otherFee', label: 'Other Fee', type: 'number' },
    ],
  },
  {
    path: '/school/fees/student-fees', title: 'Student Fees', fields: [
      { key: 'studentName', label: 'Student Name', required: true },
      { key: 'className', label: 'Class' },
      { key: 'totalFee', label: 'Total Fee', type: 'number' },
      { key: 'paidAmount', label: 'Paid Amount', type: 'number' },
      { key: 'balance', label: 'Balance', type: 'number' },
    ],
  },
  {
    path: '/school/fees/collect-fees', title: 'Collect Fees', fields: [
      { key: 'studentName', label: 'Student Name', required: true },
      { key: 'amount', label: 'Amount', type: 'number', required: true },
      { key: 'paymentMode', label: 'Payment Mode', type: 'select', options: ['Cash', 'Card', 'UPI', 'Bank Transfer'] },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'receiptNumber', label: 'Receipt Number' },
    ],
  },
  {
    path: '/school/fees/receipts', title: 'Fee Receipts', fields: [
      { key: 'receiptNumber', label: 'Receipt Number', required: true },
      { key: 'studentName', label: 'Student Name' },
      { key: 'amount', label: 'Amount', type: 'number' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'paymentMode', label: 'Payment Mode', type: 'select', options: ['Cash', 'Card', 'UPI', 'Bank Transfer'] },
    ],
  },
  {
    path: '/school/fees/outstanding', title: 'Outstanding', fields: [
      { key: 'studentName', label: 'Student Name', required: true },
      { key: 'className', label: 'Class' },
      { key: 'dueAmount', label: 'Due Amount', type: 'number' },
      { key: 'dueDate', label: 'Due Date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: ['Overdue', 'Due Soon', 'Cleared'] },
    ],
  },
  {
    path: '/school/fees/refunds', title: 'Refunds', fields: [
      { key: 'studentName', label: 'Student Name', required: true },
      { key: 'amount', label: 'Amount', type: 'number' },
      { key: 'reason', label: 'Reason' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: ['Pending', 'Approved', 'Processed'] },
    ],
  },
];

export const feeManagementRoutes = ITEMS.map(({ path, title, fields }) => ({
  path,
  element: <GenericModulePage title={title} group={GROUP} category={CATEGORY} moduleKey={path.slice(1)} fields={fields} />,
}));
