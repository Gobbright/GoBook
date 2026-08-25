import { GenericModulePage } from '../../../../../components/common/GenericModulePage.jsx';

const GROUP = 'Transport';
const CATEGORY = 'School';

const ITEMS = [
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
      { key: 'vehicleType', label: 'Vehicle Type' },
      { key: 'capacity', label: 'Capacity', type: 'number' },
      { key: 'driverName', label: 'Driver Name' },
    ],
  },
  {
    path: '/school/transport/stops', title: 'Stops', fields: [
      { key: 'stopName', label: 'Stop Name', required: true },
      { key: 'routeName', label: 'Route' },
      { key: 'pickupTime', label: 'Pickup Time' },
      { key: 'dropTime', label: 'Drop Time' },
    ],
  },
  {
    path: '/school/transport/student-allocation', title: 'Student Allocation', fields: [
      { key: 'studentName', label: 'Student Name', required: true },
      { key: 'className', label: 'Class' },
      { key: 'routeName', label: 'Route' },
      { key: 'stopName', label: 'Stop' },
    ],
  },
  {
    path: '/school/transport/tracking', title: 'Transport Tracking', fields: [
      { key: 'vehicleNumber', label: 'Vehicle Number', required: true },
      { key: 'routeName', label: 'Route' },
      { key: 'currentLocation', label: 'Current Location' },
      { key: 'lastUpdated', label: 'Last Updated', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: ['On Route', 'Idle', 'Maintenance'] },
    ],
  },
];

export const transportRoutes = ITEMS.map(({ path, title, fields }) => ({
  path,
  element: <GenericModulePage title={title} group={GROUP} category={CATEGORY} moduleKey={path.slice(1)} fields={fields} />,
}));
