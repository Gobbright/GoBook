import { GenericModulePage } from '../../../../../components/common/GenericModulePage.jsx';

const GROUP = 'Customers & Vehicles';
const CATEGORY = 'Automobile';

const ITEMS = [
  {
    path: '/automobile/customers-vehicles/customers', title: 'Customers', fields: [
      { key: 'name', label: 'Customer Name', required: true },
      { key: 'phone', label: 'Phone' },
      { key: 'email', label: 'Email' },
      { key: 'address', label: 'Address', type: 'textarea' },
    ],
  },
  {
    path: '/automobile/customers-vehicles/vehicles', title: 'Vehicles', fields: [
      { key: 'vehicleNumber', label: 'Vehicle Number', required: true },
      { key: 'ownerName', label: 'Owner Name' },
      { key: 'make', label: 'Make' },
      { key: 'model', label: 'Model' },
    ],
  },
  {
    path: '/automobile/customers-vehicles/service-history', title: 'Vehicle Service History', fields: [
      { key: 'vehicleNumber', label: 'Vehicle Number', required: true },
      { key: 'serviceDate', label: 'Service Date', type: 'date' },
      { key: 'serviceType', label: 'Service Type' },
      { key: 'amount', label: 'Amount', type: 'number' },
    ],
  },
  {
    path: '/automobile/customers-vehicles/documents', title: 'Documents', fields: [
      { key: 'vehicleNumber', label: 'Vehicle Number', required: true },
      { key: 'documentType', label: 'Document Type', type: 'select', options: ['RC', 'Insurance', 'PUC', 'Warranty'] },
      { key: 'expiryDate', label: 'Expiry Date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: ['Valid', 'Expired'] },
    ],
  },
];

export const automobileCustomersVehicleRoutes = ITEMS.map(({ path, title, fields }) => ({
  path,
  element: <GenericModulePage title={title} group={GROUP} category={CATEGORY} moduleKey={path.slice(1)} fields={fields} />,
}));
