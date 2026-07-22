import { GenericModulePage } from '../../../../../components/common/GenericModulePage.jsx';

const GROUP = 'Pharmacy';
const CATEGORY = 'Hospital';

const ITEMS = [
  {
    path: '/hospital/medicines', title: 'Medicines', fields: [
      { key: 'name', label: 'Medicine Name', required: true },
      { key: 'category', label: 'Category' },
      { key: 'manufacturer', label: 'Manufacturer' },
      { key: 'price', label: 'Price', type: 'number' },
      { key: 'stock', label: 'Stock Qty', type: 'number' },
    ],
  },
  {
    path: '/hospital/pharmacy-stock', title: 'Stock', fields: [
      { key: 'medicineName', label: 'Medicine Name', required: true },
      { key: 'batchNumber', label: 'Batch Number' },
      { key: 'quantity', label: 'Quantity', type: 'number' },
      { key: 'expiryDate', label: 'Expiry Date', type: 'date' },
    ],
  },
  {
    path: '/hospital/expiry-alerts', title: 'Expiry Alerts', fields: [
      { key: 'medicineName', label: 'Medicine Name', required: true },
      { key: 'batchNumber', label: 'Batch Number' },
      { key: 'expiryDate', label: 'Expiry Date', type: 'date' },
      { key: 'quantity', label: 'Quantity', type: 'number' },
    ],
  },
  {
    path: '/hospital/suppliers', title: 'Suppliers', fields: [
      { key: 'name', label: 'Supplier Name', required: true },
      { key: 'phone', label: 'Phone' },
      { key: 'email', label: 'Email' },
      { key: 'address', label: 'Address', type: 'textarea' },
    ],
  },
];

export const pharmacyRoutes = ITEMS.map(({ path, title, fields }) => ({
  path,
  element: <GenericModulePage title={title} group={GROUP} category={CATEGORY} moduleKey={path.slice(1)} fields={fields} />,
}));
