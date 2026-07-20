import { GenericModulePage } from '../../../../../components/common/GenericModulePage.jsx';

const GROUP = 'Service Invoice';
const CATEGORY = 'Automobile';

const ITEMS = [
  {
    path: '/automobile/service-invoice/estimate-to-invoice', title: 'Estimate -> Invoice', fields: [
      { key: 'vehicleNumber', label: 'Vehicle Number', required: true },
      { key: 'customerName', label: 'Customer Name' },
      { key: 'amount', label: 'Amount', type: 'number' },
      { key: 'date', label: 'Date', type: 'date' },
    ],
  },
  {
    path: '/automobile/service-invoice/parts-labour-split', title: 'Parts + Labour Split', fields: [
      { key: 'vehicleNumber', label: 'Vehicle Number', required: true },
      { key: 'partsAmount', label: 'Parts Amount', type: 'number' },
      { key: 'labourAmount', label: 'Labour Amount', type: 'number' },
      { key: 'date', label: 'Date', type: 'date' },
    ],
  },
  {
    path: '/automobile/service-invoice/insurance-claim-billing', title: 'Insurance Claim Billing', fields: [
      { key: 'vehicleNumber', label: 'Vehicle Number', required: true },
      { key: 'insurer', label: 'Insurer' },
      { key: 'claimAmount', label: 'Claim Amount', type: 'number' },
      { key: 'status', label: 'Status', type: 'select', options: ['Submitted', 'Approved', 'Rejected'] },
    ],
  },
];

export const automobileServiceInvoiceRoutes = ITEMS.map(({ path, title, fields }) => ({
  path,
  element: <GenericModulePage title={title} group={GROUP} category={CATEGORY} moduleKey={path.slice(1)} fields={fields} />,
}));
