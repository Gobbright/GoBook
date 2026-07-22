import { GenericModulePage } from '../../../../../components/common/GenericModulePage.jsx';

const GROUP = 'Donations';
const CATEGORY = 'NGO';

const ITEMS = [
  {
    path: '/ngo/donations/entry', title: 'Donation Entry', fields: [
      { key: 'donorName', label: 'Donor Name', required: true },
      { key: 'amount', label: 'Amount', type: 'number' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'campaignName', label: 'Campaign' },
    ],
  },
  {
    path: '/ngo/donations/receipt', title: 'Donation Receipt', fields: [
      { key: 'donorName', label: 'Donor Name', required: true },
      { key: 'receiptNumber', label: 'Receipt Number' },
      { key: 'amount', label: 'Amount', type: 'number' },
      { key: 'date', label: 'Date', type: 'date' },
    ],
  },
  {
    path: '/ngo/donations/80g-receipt-auto-generation', title: '80G Receipt Auto-Generation', fields: [
      { key: 'donorName', label: 'Donor Name', required: true },
      { key: 'panNumber', label: 'PAN Number' },
      { key: 'amount', label: 'Amount', type: 'number' },
      { key: 'status', label: 'Status', type: 'select', options: ['Generated', 'Pending'] },
    ],
  },
  {
    path: '/ngo/donations/online-payment', title: 'Online Payment', fields: [
      { key: 'donorName', label: 'Donor Name', required: true },
      { key: 'amount', label: 'Amount', type: 'number' },
      { key: 'gateway', label: 'Gateway' },
      { key: 'status', label: 'Status', type: 'select', options: ['Success', 'Failed', 'Pending'] },
    ],
  },
  {
    path: '/ngo/donations/in-kind-donations', title: 'In-Kind Donations', fields: [
      { key: 'donorName', label: 'Donor Name', required: true },
      { key: 'itemDescription', label: 'Item Description' },
      { key: 'estimatedValue', label: 'Estimated Value', type: 'number' },
      { key: 'date', label: 'Date', type: 'date' },
    ],
  },
  {
    path: '/ngo/donations/reports', title: 'Reports', fields: [
      { key: 'period', label: 'Period', required: true },
      { key: 'totalDonations', label: 'Total Donations', type: 'number' },
      { key: 'totalDonors', label: 'Total Donors', type: 'number' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
];

export const ngoDonationRoutes = ITEMS.map(({ path, title, fields }) => ({
  path,
  element: <GenericModulePage title={title} group={GROUP} category={CATEGORY} moduleKey={path.slice(1)} fields={fields} />,
}));
