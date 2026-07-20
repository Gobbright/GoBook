import { GenericModulePage } from '../../../../../components/common/GenericModulePage.jsx';

const GROUP = 'Clients & Tenders';
const CATEGORY = 'Construction';

const ITEMS = [
  {
    path: '/construction/clients-tenders/clients', title: 'Clients', fields: [
      { key: 'name', label: 'Client Name', required: true },
      { key: 'phone', label: 'Phone' },
      { key: 'email', label: 'Email' },
      { key: 'address', label: 'Address', type: 'textarea' },
    ],
  },
  {
    path: '/construction/clients-tenders/tender-management', title: 'Tender Management', fields: [
      { key: 'tenderName', label: 'Tender Name', required: true },
      { key: 'clientName', label: 'Client Name' },
      { key: 'submissionDate', label: 'Submission Date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: ['Submitted', 'Won', 'Lost'] },
    ],
  },
  {
    path: '/construction/clients-tenders/estimates', title: 'Estimates', fields: [
      { key: 'projectName', label: 'Project Name', required: true },
      { key: 'clientName', label: 'Client Name' },
      { key: 'estimatedCost', label: 'Estimated Cost', type: 'number' },
      { key: 'date', label: 'Date', type: 'date' },
    ],
  },
  {
    path: '/construction/clients-tenders/agreements', title: 'Agreements', fields: [
      { key: 'clientName', label: 'Client Name', required: true },
      { key: 'projectName', label: 'Project Name' },
      { key: 'signedDate', label: 'Signed Date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: ['Draft', 'Signed', 'Expired'] },
    ],
  },
];

export const clientsTendersRoutes = ITEMS.map(({ path, title, fields }) => ({
  path,
  element: <GenericModulePage title={title} group={GROUP} category={CATEGORY} moduleKey={path.slice(1)} fields={fields} />,
}));
