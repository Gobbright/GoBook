import { GenericModulePage } from '../../../../../components/common/GenericModulePage.jsx';

const GROUP = 'Rooms';
const CATEGORY = 'Hotel';

const ITEMS = [
  {
    path: '/hotel/room-types', title: 'Room Types', fields: [
      { key: 'typeName', label: 'Room Type', required: true },
      { key: 'price', label: 'Price / Night', type: 'number' },
      { key: 'capacity', label: 'Capacity', type: 'number' },
      { key: 'amenities', label: 'Amenities', type: 'textarea' },
    ],
  },
  {
    path: '/hotel/availability', title: 'Availability', fields: [
      { key: 'roomNumber', label: 'Room Number', required: true },
      { key: 'roomType', label: 'Room Type' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: ['Available', 'Booked', 'Blocked'] },
    ],
  },
  {
    path: '/hotel/housekeeping', title: 'Housekeeping', fields: [
      { key: 'roomNumber', label: 'Room Number', required: true },
      { key: 'assignedTo', label: 'Assigned To' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: ['Pending', 'In Progress', 'Cleaned'] },
    ],
  },
  {
    path: '/hotel/maintenance', title: 'Maintenance', fields: [
      { key: 'roomNumber', label: 'Room Number', required: true },
      { key: 'issue', label: 'Issue' },
      { key: 'reportedDate', label: 'Reported Date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: ['Open', 'In Progress', 'Resolved'] },
    ],
  },
];

export const roomsRoutes = ITEMS.map(({ path, title, fields }) => ({
  path,
  element: <GenericModulePage title={title} group={GROUP} category={CATEGORY} moduleKey={path.slice(1)} fields={fields} />,
}));
