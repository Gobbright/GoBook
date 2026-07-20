import { GenericModulePage } from '../../../../../components/common/GenericModulePage.jsx';

const GROUP = 'Billing';
const CATEGORY = 'Hotel';

const ITEMS = [
  {
    path: '/hotel/guest-invoice', title: 'Guest Invoice', fields: [
      { key: 'guestName', label: 'Guest Name', required: true },
      { key: 'roomNumber', label: 'Room Number' },
      { key: 'amount', label: 'Amount', type: 'number' },
      { key: 'invoiceDate', label: 'Invoice Date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: ['Paid', 'Pending'] },
    ],
  },
  {
    path: '/hotel/pos', title: 'POS', fields: [
      { key: 'guestName', label: 'Guest Name', required: true },
      { key: 'item', label: 'Item' },
      { key: 'amount', label: 'Amount', type: 'number' },
      { key: 'date', label: 'Date', type: 'date' },
    ],
  },
  {
    path: '/hotel/payments', title: 'Payments', fields: [
      { key: 'guestName', label: 'Guest Name', required: true },
      { key: 'amount', label: 'Amount', type: 'number' },
      { key: 'mode', label: 'Mode', type: 'select', options: ['Cash', 'Card', 'UPI', 'Bank Transfer'] },
      { key: 'date', label: 'Date', type: 'date' },
    ],
  },
  {
    path: '/hotel/billing-reports', title: 'Reports', fields: [
      { key: 'period', label: 'Period', required: true },
      { key: 'totalRevenue', label: 'Total Revenue', type: 'number' },
      { key: 'totalInvoices', label: 'Total Invoices', type: 'number' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
];

export const hotelBillingRoutes = ITEMS.map(({ path, title, fields }) => ({
  path,
  element: <GenericModulePage title={title} group={GROUP} category={CATEGORY} moduleKey={path.slice(1)} fields={fields} />,
}));
