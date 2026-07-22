import { GenericModulePage } from '../../../../../components/common/GenericModulePage.jsx';

const GROUP = 'Hostel';
const CATEGORY = 'School';

const ITEMS = [
  {
    path: '/school/hostel', title: 'Hostel', fields: [
      { key: 'roomNumber', label: 'Room Number', required: true },
      { key: 'capacity', label: 'Capacity', type: 'number' },
      { key: 'occupied', label: 'Occupied', type: 'number' },
      { key: 'wardenName', label: 'Warden Name' },
    ],
  },
  {
    path: '/school/hostel/rooms', title: 'Rooms', fields: [
      { key: 'roomNumber', label: 'Room Number', required: true },
      { key: 'type', label: 'Type', type: 'select', options: ['Single', 'Double', 'Dormitory'] },
      { key: 'capacity', label: 'Capacity', type: 'number' },
      { key: 'status', label: 'Status', type: 'select', options: ['Available', 'Full'] },
    ],
  },
  {
    path: '/school/hostel/allocation', title: 'Allocation', fields: [
      { key: 'studentName', label: 'Student Name', required: true },
      { key: 'roomNumber', label: 'Room Number' },
      { key: 'allocationDate', label: 'Allocation Date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Vacated'] },
    ],
  },
  {
    path: '/school/hostel/mess', title: 'Mess', fields: [
      { key: 'mealType', label: 'Meal Type', type: 'select', options: ['Breakfast', 'Lunch', 'Dinner'] },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'menu', label: 'Menu' },
      { key: 'headCount', label: 'Head Count', type: 'number' },
    ],
  },
  {
    path: '/school/hostel/fees', title: 'Hostel Fees', fields: [
      { key: 'studentName', label: 'Student Name', required: true },
      { key: 'amount', label: 'Amount', type: 'number' },
      { key: 'dueDate', label: 'Due Date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: ['Paid', 'Pending'] },
    ],
  },
];

export const hostelRoutes = ITEMS.map(({ path, title, fields }) => ({
  path,
  element: <GenericModulePage title={title} group={GROUP} category={CATEGORY} moduleKey={path.slice(1)} fields={fields} />,
}));
