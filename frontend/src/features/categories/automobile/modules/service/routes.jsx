import { GenericModulePage } from '../../../../../components/common/GenericModulePage.jsx';

const GROUP = 'Service';
const CATEGORY = 'Automobile';

const ITEMS = [
  {
    path: '/automobile/service/inspection', title: 'Inspection', fields: [
      { key: 'vehicleNumber', label: 'Vehicle Number', required: true },
      { key: 'inspectedBy', label: 'Inspected By' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'findings', label: 'Findings', type: 'textarea' },
    ],
  },
  {
    path: '/automobile/service/repair', title: 'Repair', fields: [
      { key: 'vehicleNumber', label: 'Vehicle Number', required: true },
      { key: 'repairDescription', label: 'Repair Description', type: 'textarea' },
      { key: 'technicianName', label: 'Technician Name' },
      { key: 'status', label: 'Status', type: 'select', options: ['Pending', 'In Progress', 'Completed'] },
    ],
  },
  {
    path: '/automobile/service/spare-parts', title: 'Spare Parts', fields: [
      { key: 'partName', label: 'Part Name', required: true },
      { key: 'partNumber', label: 'Part Number' },
      { key: 'quantity', label: 'Quantity', type: 'number' },
      { key: 'price', label: 'Price', type: 'number' },
    ],
  },
  {
    path: '/automobile/service/labour-charges', title: 'Labour Charges', fields: [
      { key: 'vehicleNumber', label: 'Vehicle Number', required: true },
      { key: 'workDescription', label: 'Work Description' },
      { key: 'hours', label: 'Hours', type: 'number' },
      { key: 'amount', label: 'Amount', type: 'number' },
    ],
  },
  {
    path: '/automobile/service/road-test', title: 'Road Test', fields: [
      { key: 'vehicleNumber', label: 'Vehicle Number', required: true },
      { key: 'testedBy', label: 'Tested By' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'result', label: 'Result', type: 'select', options: ['Passed', 'Failed'] },
    ],
  },
  {
    path: '/automobile/service/delivery', title: 'Delivery', fields: [
      { key: 'vehicleNumber', label: 'Vehicle Number', required: true },
      { key: 'customerName', label: 'Customer Name' },
      { key: 'deliveryDate', label: 'Delivery Date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: ['Pending', 'Delivered'] },
    ],
  },
];

export const automobileServiceRoutes = ITEMS.map(({ path, title, fields }) => ({
  path,
  element: <GenericModulePage title={title} group={GROUP} category={CATEGORY} moduleKey={path.slice(1)} fields={fields} />,
}));
