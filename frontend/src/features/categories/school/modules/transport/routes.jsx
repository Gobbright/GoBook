import { GenericModulePage } from '../../../../../components/common/GenericModulePage.jsx';

const GROUP = 'Transport';
const CATEGORY = 'School';

const ITEMS = [
  {
    path: '/school/transport', title: 'Transport', fields: [
      { key: 'routeName', label: 'Route Name', required: true },
      { key: 'vehicleNumber', label: 'Vehicle Number' },
      { key: 'driverName', label: 'Driver Name' },
      { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
    ],
  },
  {
    path: '/school/transport/routes', title: 'Routes', fields: [
      { key: 'routeName', label: 'Route Name', required: true },
      { key: 'startPoint', label: 'Start Point' },
      { key: 'endPoint', label: 'End Point' },
      { key: 'distance', label: 'Distance (km)', type: 'number' },
    ],
  },
  {
    path: '/school/transport/vehicles', title: 'Vehicles', fields: [
      { key: 'vehicleNumber', label: 'Vehicle Number', required: true },
      { key: 'type', label: 'Type' },
      { key: 'capacity', label: 'Capacity', type: 'number' },
      { key: 'driverName', label: 'Driver Name' },
    ],
  },
  {
    path: '/school/transport/drivers', title: 'Drivers', fields: [
      { key: 'name', label: 'Driver Name', required: true },
      { key: 'phone', label: 'Phone' },
      { key: 'licenseNumber', label: 'License Number' },
      { key: 'vehicleNumber', label: 'Vehicle Number' },
    ],
  },
  {
    path: '/school/transport/gps-tracking', title: 'GPS Tracking', fields: [
      { key: 'vehicleNumber', label: 'Vehicle Number', required: true },
      { key: 'currentLocation', label: 'Current Location' },
      { key: 'lastUpdated', label: 'Last Updated', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: ['Moving', 'Stopped'] },
    ],
  },
  {
    path: '/school/transport/fees', title: 'Transport Fees', fields: [
      { key: 'studentName', label: 'Student Name', required: true },
      { key: 'routeName', label: 'Route Name' },
      { key: 'amount', label: 'Amount', type: 'number' },
      { key: 'status', label: 'Status', type: 'select', options: ['Paid', 'Pending'] },
    ],
  },
];

export const transportRoutes = ITEMS.map(({ path, title, fields }) => ({
  path,
  element: <GenericModulePage title={title} group={GROUP} category={CATEGORY} moduleKey={path.slice(1)} fields={fields} />,
}));
