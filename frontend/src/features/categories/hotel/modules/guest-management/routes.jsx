import { GenericModulePage } from '../../../../../components/common/GenericModulePage.jsx';

const GROUP = 'Guest Management';
const CATEGORY = 'Hotel';

const ITEMS = [
  {
    path: '/hotel/guests', title: 'Guests', fields: [
      { key: 'name', label: 'Guest Name', required: true },
      { key: 'phone', label: 'Phone' },
      { key: 'email', label: 'Email' },
      { key: 'idProof', label: 'ID Proof' },
    ],
  },
  {
    path: '/hotel/bookings', title: 'Bookings', fields: [
      { key: 'guestName', label: 'Guest Name', required: true },
      { key: 'roomType', label: 'Room Type' },
      { key: 'checkInDate', label: 'Check-In Date', type: 'date' },
      { key: 'checkOutDate', label: 'Check-Out Date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: ['Confirmed', 'Pending', 'Cancelled'] },
    ],
  },
  {
    path: '/hotel/check-in', title: 'Check-In', fields: [
      { key: 'guestName', label: 'Guest Name', required: true },
      { key: 'roomNumber', label: 'Room Number' },
      { key: 'checkInDate', label: 'Check-In Date', type: 'date' },
      { key: 'idProof', label: 'ID Proof' },
    ],
  },
  {
    path: '/hotel/check-out', title: 'Check-Out', fields: [
      { key: 'guestName', label: 'Guest Name', required: true },
      { key: 'roomNumber', label: 'Room Number' },
      { key: 'checkOutDate', label: 'Check-Out Date', type: 'date' },
      { key: 'billAmount', label: 'Bill Amount', type: 'number' },
    ],
  },
  {
    path: '/hotel/guest-history', title: 'Guest History', fields: [
      { key: 'guestName', label: 'Guest Name', required: true },
      { key: 'lastStayDate', label: 'Last Stay Date', type: 'date' },
      { key: 'totalStays', label: 'Total Stays', type: 'number' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
];

export const guestManagementRoutes = ITEMS.map(({ path, title, fields }) => ({
  path,
  element: <GenericModulePage title={title} group={GROUP} category={CATEGORY} moduleKey={path.slice(1)} fields={fields} />,
}));
