import { GenericModulePage } from '../../../../../components/common/GenericModulePage.jsx';

const GROUP = 'Donors';
const CATEGORY = 'NGO';

const ITEMS = [
  {
    path: '/ngo/donors/donors', title: 'Donors', fields: [
      { key: 'name', label: 'Donor Name', required: true },
      { key: 'phone', label: 'Phone' },
      { key: 'email', label: 'Email' },
      { key: 'totalDonated', label: 'Total Donated', type: 'number' },
    ],
  },
  {
    path: '/ngo/donors/categories', title: 'Donor Categories', fields: [
      { key: 'categoryName', label: 'Category Name', required: true },
      { key: 'minAmount', label: 'Minimum Amount', type: 'number' },
      { key: 'description', label: 'Description', type: 'textarea' },
    ],
  },
  {
    path: '/ngo/donors/recurring-donors', title: 'Recurring Donors', fields: [
      { key: 'donorName', label: 'Donor Name', required: true },
      { key: 'amount', label: 'Amount', type: 'number' },
      { key: 'frequency', label: 'Frequency', type: 'select', options: ['Monthly', 'Quarterly', 'Yearly'] },
      { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Paused', 'Cancelled'] },
    ],
  },
  {
    path: '/ngo/donors/communication', title: 'Donor Communication', fields: [
      { key: 'donorName', label: 'Donor Name', required: true },
      { key: 'channel', label: 'Channel', type: 'select', options: ['Email', 'Phone', 'WhatsApp', 'Letter'] },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
];

export const ngoDonorRoutes = ITEMS.map(({ path, title, fields }) => ({
  path,
  element: <GenericModulePage title={title} group={GROUP} category={CATEGORY} moduleKey={path.slice(1)} fields={fields} />,
}));
