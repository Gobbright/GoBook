import { GenericModulePage } from '../../../../../components/common/GenericModulePage.jsx';

const GROUP = 'Materials';
const CATEGORY = 'Construction';

const ITEMS = [
  {
    path: '/construction/materials/purchase', title: 'Purchase', fields: [
      { key: 'materialName', label: 'Material Name', required: true },
      { key: 'vendorName', label: 'Vendor Name' },
      { key: 'quantity', label: 'Quantity', type: 'number' },
      { key: 'amount', label: 'Amount', type: 'number' },
      { key: 'date', label: 'Date', type: 'date' },
    ],
  },
  {
    path: '/construction/materials/site-inventory', title: 'Site Inventory', fields: [
      { key: 'materialName', label: 'Material Name', required: true },
      { key: 'siteName', label: 'Site Name' },
      { key: 'quantity', label: 'Quantity', type: 'number' },
      { key: 'unit', label: 'Unit' },
    ],
  },
  {
    path: '/construction/materials/vendors', title: 'Vendors', fields: [
      { key: 'name', label: 'Vendor Name', required: true },
      { key: 'phone', label: 'Phone' },
      { key: 'email', label: 'Email' },
      { key: 'materialsSupplied', label: 'Materials Supplied' },
    ],
  },
  {
    path: '/construction/materials/material-issue', title: 'Material Issue', fields: [
      { key: 'materialName', label: 'Material Name', required: true },
      { key: 'siteName', label: 'Site Name' },
      { key: 'quantity', label: 'Quantity', type: 'number' },
      { key: 'issueDate', label: 'Issue Date', type: 'date' },
    ],
  },
  {
    path: '/construction/materials/stock', title: 'Stock', fields: [
      { key: 'materialName', label: 'Material Name', required: true },
      { key: 'quantity', label: 'Quantity', type: 'number' },
      { key: 'unit', label: 'Unit' },
      { key: 'reorderLevel', label: 'Reorder Level', type: 'number' },
    ],
  },
];

export const constructionMaterialRoutes = ITEMS.map(({ path, title, fields }) => ({
  path,
  element: <GenericModulePage title={title} group={GROUP} category={CATEGORY} moduleKey={path.slice(1)} fields={fields} />,
}));
