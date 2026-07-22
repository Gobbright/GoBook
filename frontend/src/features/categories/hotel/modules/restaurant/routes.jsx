import { GenericModulePage } from '../../../../../components/common/GenericModulePage.jsx';

const GROUP = 'Restaurant';
const CATEGORY = 'Hotel';

const ITEMS = [
  {
    path: '/hotel/restaurant', title: 'Restaurant', fields: [
      { key: 'tableNumber', label: 'Table Number', required: true },
      { key: 'guestName', label: 'Guest Name' },
      { key: 'status', label: 'Status', type: 'select', options: ['Occupied', 'Available'] },
    ],
  },
  {
    path: '/hotel/restaurant/table-management', title: 'Table Management', fields: [
      { key: 'tableNumber', label: 'Table Number', required: true },
      { key: 'capacity', label: 'Capacity', type: 'number' },
      { key: 'status', label: 'Status', type: 'select', options: ['Occupied', 'Available', 'Reserved'] },
    ],
  },
  {
    path: '/hotel/restaurant/kot', title: 'KOT', fields: [
      { key: 'tableNumber', label: 'Table Number', required: true },
      { key: 'items', label: 'Items', type: 'textarea' },
      { key: 'orderTime', label: 'Order Time' },
      { key: 'status', label: 'Status', type: 'select', options: ['Pending', 'Preparing', 'Served'] },
    ],
  },
  {
    path: '/hotel/restaurant/menu', title: 'Menu', fields: [
      { key: 'itemName', label: 'Item Name', required: true },
      { key: 'category', label: 'Category' },
      { key: 'price', label: 'Price', type: 'number' },
      { key: 'available', label: 'Available', type: 'select', options: ['Yes', 'No'] },
    ],
  },
  {
    path: '/hotel/restaurant/room-service', title: 'Room Service', fields: [
      { key: 'roomNumber', label: 'Room Number', required: true },
      { key: 'items', label: 'Items', type: 'textarea' },
      { key: 'orderTime', label: 'Order Time' },
      { key: 'status', label: 'Status', type: 'select', options: ['Pending', 'Delivered'] },
    ],
  },
  {
    path: '/hotel/restaurant/bar', title: 'Bar', fields: [
      { key: 'itemName', label: 'Item Name', required: true },
      { key: 'category', label: 'Category' },
      { key: 'price', label: 'Price', type: 'number' },
      { key: 'stock', label: 'Stock', type: 'number' },
    ],
  },
];

export const restaurantRoutes = ITEMS.map(({ path, title, fields }) => ({
  path,
  element: <GenericModulePage title={title} group={GROUP} category={CATEGORY} moduleKey={path.slice(1)} fields={fields} />,
}));
