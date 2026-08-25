import { GenericModulePage } from '../../../../../components/common/GenericModulePage.jsx';
import { CheckOutPage } from './CheckOutPage.jsx';
import { CheckInPage } from './CheckInPage.jsx';
import { InHouseGuestsPage } from './InHouseGuestsPage.jsx';
import { NewReservationPage } from './NewReservationPage.jsx';
import { RatePlansPage } from './RatePlansPage.jsx';
import { ReservationCalendarPage } from './ReservationCalendarPage.jsx';
import { ReservationAvailabilityPage } from './ReservationAvailabilityPage.jsx';
import { ReservationListPage } from './ReservationListPage.jsx';
import { RoomChangePage } from './RoomChangePage.jsx';
import { GuestRequestsPage } from './GuestRequestsPage.jsx';
import { GuestListPage } from './GuestListPage.jsx';
import { GuestDocumentsPage } from './GuestDocumentsPage.jsx';
import { GuestProfilePage } from './GuestProfilePage.jsx';
import { GuestRegistrationPage } from './GuestRegistrationPage.jsx';
import { RoomTypesPage } from './RoomTypesPage.jsx';
import { RoomsPage } from './RoomsPage.jsx';
import { RoomStatusPage } from './RoomStatusPage.jsx';
import { FloorBuildingPage } from './FloorBuildingPage.jsx';
import { HousekeepingBoardPage } from './HousekeepingBoardPage.jsx';
import { CleaningTasksPage } from './CleaningTasksPage.jsx';
import { HousekeepingSchedulePage } from './HousekeepingSchedulePage.jsx';
import { LostFoundPage } from './LostFoundPage.jsx';
import { PosBillingPage } from './PosBillingPage.jsx';
import { RestaurantTablesPage } from './RestaurantTablesPage.jsx';
import { RestaurantMenuPage } from './RestaurantMenuPage.jsx';
import { RestaurantOrdersPage } from './RestaurantOrdersPage.jsx';
import { KotPage } from './KotPage.jsx';
import { RoomServicePage } from './RoomServicePage.jsx';
import { LaundryPage } from './LaundryPage.jsx';
import { SpaPage } from './SpaPage.jsx';
import { TransportPage } from './TransportPage.jsx';
import { OtherServicesPage } from './OtherServicesPage.jsx';
import { NewBillPage } from './NewBillPage.jsx';
import { GuestBillingPage } from './GuestBillingPage.jsx';
import { RestaurantBillingPage } from './RestaurantBillingPage.jsx';
import { BillsInvoicesPage } from './BillsInvoicesPage.jsx';
import { HotelPaymentsPage } from './HotelPaymentsPage.jsx';
import { OutstandingPage } from './OutstandingPage.jsx';
import { RefundsPage } from './RefundsPage.jsx';
import { EstimatesPage } from './EstimatesPage.jsx';
import { HotelReportsPage } from './HotelReportsPage.jsx';

const CATEGORY = 'Hotel';

const reservationFields = [
  { key: 'reservationNo', label: 'Reservation No', required: true },
  { key: 'guestName', label: 'Guest Name', required: true },
  { key: 'roomType', label: 'Room Type' },
  { key: 'checkInDate', label: 'Check-In Date', type: 'date' },
  { key: 'checkOutDate', label: 'Check-Out Date', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: ['Confirmed', 'Pending', 'Cancelled'] },
];

const roomFields = [
  { key: 'roomNumber', label: 'Room Number', required: true },
  { key: 'roomType', label: 'Room Type' },
  { key: 'floor', label: 'Floor' },
  { key: 'rate', label: 'Rate', type: 'number' },
  { key: 'status', label: 'Status', type: 'select', options: ['Available', 'Occupied', 'Reserved', 'Cleaning', 'Maintenance'] },
];

const guestFields = [
  { key: 'guestName', label: 'Guest Name', required: true },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'idProof', label: 'ID Proof' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

const billingFields = [
  { key: 'billNo', label: 'Bill No', required: true },
  { key: 'guestName', label: 'Guest Name', required: true },
  { key: 'roomNumber', label: 'Room Number' },
  { key: 'amount', label: 'Amount', type: 'number' },
  { key: 'billDate', label: 'Bill Date', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: ['Paid', 'Pending', 'Refunded', 'Cancelled'] },
];

const SECTION_ITEMS = [
  {
    group: 'Reservations',
    items: [
      { path: '/hotel/reservations/new', title: 'New Reservation', fields: reservationFields },
      { path: '/hotel/reservations/list', title: 'Reservation List', fields: reservationFields },
      { path: '/hotel/reservations/calendar', title: 'Calendar', fields: [{ key: 'date', label: 'Date', type: 'date', required: true }, ...reservationFields] },
      { path: '/hotel/reservations/availability', title: 'Availability', fields: roomFields },
      { path: '/hotel/reservations/rate-plans', title: 'Rate Plans', fields: [
        { key: 'planName', label: 'Plan Name', required: true },
        { key: 'roomType', label: 'Room Type' },
        { key: 'baseRate', label: 'Base Rate', type: 'number' },
        { key: 'mealPlan', label: 'Meal Plan' },
        { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
      ] },
    ],
  },
  {
    group: 'Front Desk',
    items: [
      { path: '/hotel/front-desk/check-in', title: 'Check-in', fields: [
        { key: 'guestName', label: 'Guest Name', required: true },
        { key: 'roomNumber', label: 'Room Number', required: true },
        { key: 'checkInTime', label: 'Check-in Time' },
        { key: 'idVerified', label: 'ID Verified', type: 'select', options: ['Yes', 'No'] },
      ] },
      { path: '/hotel/front-desk/in-house-guests', title: 'In-House Guests', fields: guestFields },
      { path: '/hotel/front-desk/check-out', title: 'Check-out', fields: [
        { key: 'guestName', label: 'Guest Name', required: true },
        { key: 'roomNumber', label: 'Room Number', required: true },
        { key: 'checkOutTime', label: 'Check-out Time' },
        { key: 'billStatus', label: 'Bill Status', type: 'select', options: ['Paid', 'Pending'] },
      ] },
      { path: '/hotel/front-desk/room-change', title: 'Room Change', fields: [
        { key: 'guestName', label: 'Guest Name', required: true },
        { key: 'fromRoom', label: 'From Room' },
        { key: 'toRoom', label: 'To Room' },
        { key: 'reason', label: 'Reason', type: 'textarea' },
      ] },
      { path: '/hotel/front-desk/guest-requests', title: 'Guest Requests', fields: [
        { key: 'guestName', label: 'Guest Name', required: true },
        { key: 'roomNumber', label: 'Room Number' },
        { key: 'request', label: 'Request', type: 'textarea' },
        { key: 'status', label: 'Status', type: 'select', options: ['Open', 'In Progress', 'Closed'] },
      ] },
    ],
  },
  {
    group: 'Guests',
    items: [
      { path: '/hotel/guests/registration', title: 'Guest Registration', fields: guestFields },
      { path: '/hotel/guests/list', title: 'Guest List', fields: guestFields },
      { path: '/hotel/guests/profile', title: 'Guest Profile', fields: guestFields },
      { path: '/hotel/guests/documents', title: 'Guest Documents', fields: [
        { key: 'guestName', label: 'Guest Name', required: true },
        { key: 'documentType', label: 'Document Type' },
        { key: 'documentNo', label: 'Document No' },
        { key: 'expiryDate', label: 'Expiry Date', type: 'date' },
      ] },
    ],
  },
  {
    group: 'Rooms & Availability',
    items: [
      { path: '/hotel/rooms-availability/room-types', title: 'Room Types', fields: [
        { key: 'typeName', label: 'Room Type', required: true },
        { key: 'capacity', label: 'Capacity', type: 'number' },
        { key: 'baseRate', label: 'Base Rate', type: 'number' },
        { key: 'amenities', label: 'Amenities', type: 'textarea' },
      ] },
      { path: '/hotel/rooms-availability/rooms', title: 'Rooms', fields: roomFields },
      { path: '/hotel/rooms-availability/room-status', title: 'Room Status', fields: roomFields },
      { path: '/hotel/rooms-availability/floor-building', title: 'Floor / Building', fields: [
        { key: 'buildingName', label: 'Building Name', required: true },
        { key: 'floor', label: 'Floor' },
        { key: 'totalRooms', label: 'Total Rooms', type: 'number' },
        { key: 'notes', label: 'Notes', type: 'textarea' },
      ] },
    ],
  },
  {
    group: 'Housekeeping',
    items: [
      { path: '/hotel/housekeeping/room-status', title: 'Housekeeping Board', fields: roomFields },
      { path: '/hotel/housekeeping/cleaning-tasks', title: 'Cleaning Tasks', fields: [
        { key: 'roomNumber', label: 'Room Number', required: true },
        { key: 'task', label: 'Task', required: true },
        { key: 'assignedTo', label: 'Assigned To' },
        { key: 'status', label: 'Status', type: 'select', options: ['Pending', 'In Progress', 'Done'] },
      ] },
      { path: '/hotel/housekeeping/schedule', title: 'Housekeeping Schedule', fields: [
        { key: 'date', label: 'Date', type: 'date', required: true },
        { key: 'staffName', label: 'Staff Name', required: true },
        { key: 'floor', label: 'Floor' },
        { key: 'shift', label: 'Shift', type: 'select', options: ['Morning', 'Evening', 'Night'] },
      ] },
      { path: '/hotel/housekeeping/lost-found', title: 'Lost & Found', fields: [
        { key: 'itemName', label: 'Item Name', required: true },
        { key: 'foundAt', label: 'Found At' },
        { key: 'foundDate', label: 'Found Date', type: 'date' },
        { key: 'status', label: 'Status', type: 'select', options: ['Stored', 'Returned', 'Disposed'] },
      ] },
    ],
  },
  {
    group: 'Restaurant & POS',
    items: [
      { path: '/hotel/restaurant-pos/billing', title: 'POS / Billing', fields: billingFields },
      { path: '/hotel/restaurant-pos/tables', title: 'Table Management', fields: [
        { key: 'tableNumber', label: 'Table Number', required: true },
        { key: 'capacity', label: 'Capacity', type: 'number' },
        { key: 'area', label: 'Area' },
        { key: 'status', label: 'Status', type: 'select', options: ['Available', 'Occupied', 'Reserved'] },
      ] },
      { path: '/hotel/restaurant-pos/menu', title: 'Menu Management', fields: [
        { key: 'itemName', label: 'Item Name', required: true },
        { key: 'category', label: 'Category' },
        { key: 'price', label: 'Price', type: 'number' },
        { key: 'available', label: 'Available', type: 'select', options: ['Yes', 'No'] },
      ] },
      { path: '/hotel/restaurant-pos/orders', title: 'Orders', fields: [
        { key: 'orderNo', label: 'Order No', required: true },
        { key: 'tableOrRoom', label: 'Table / Room' },
        { key: 'items', label: 'Items', type: 'textarea' },
        { key: 'status', label: 'Status', type: 'select', options: ['Open', 'Preparing', 'Served', 'Paid'] },
      ] },
      { path: '/hotel/restaurant-pos/kot', title: 'KOT / Kitchen', fields: [
        { key: 'kotNo', label: 'KOT No', required: true },
        { key: 'tableOrRoom', label: 'Table / Room' },
        { key: 'items', label: 'Items', type: 'textarea' },
        { key: 'status', label: 'Status', type: 'select', options: ['Pending', 'Preparing', 'Ready', 'Served'] },
      ] },
    ],
  },
  {
    group: 'Hotel Services',
    items: [
      { path: '/hotel/services/room-service', title: 'Room Service', fields: [
        { key: 'roomNumber', label: 'Room Number', required: true },
        { key: 'guestName', label: 'Guest Name' },
        { key: 'request', label: 'Request', type: 'textarea' },
        { key: 'status', label: 'Status', type: 'select', options: ['Requested', 'Delivered', 'Cancelled'] },
      ] },
      { path: '/hotel/services/laundry', title: 'Laundry', fields: [
        { key: 'guestName', label: 'Guest Name', required: true },
        { key: 'roomNumber', label: 'Room Number' },
        { key: 'items', label: 'Items', type: 'textarea' },
        { key: 'status', label: 'Status', type: 'select', options: ['Received', 'Processing', 'Delivered'] },
      ] },
      { path: '/hotel/services/spa', title: 'Spa', fields: [
        { key: 'guestName', label: 'Guest Name', required: true },
        { key: 'serviceName', label: 'Service Name' },
        { key: 'appointmentTime', label: 'Appointment Time' },
        { key: 'status', label: 'Status', type: 'select', options: ['Booked', 'Completed', 'Cancelled'] },
      ] },
      { path: '/hotel/services/transport', title: 'Transport', fields: [
        { key: 'guestName', label: 'Guest Name', required: true },
        { key: 'pickupLocation', label: 'Pickup Location' },
        { key: 'dropLocation', label: 'Drop Location' },
        { key: 'status', label: 'Status', type: 'select', options: ['Requested', 'Scheduled', 'Completed'] },
      ] },
      { path: '/hotel/services/other-services', title: 'Other Services', fields: [
        { key: 'serviceName', label: 'Service Name', required: true },
        { key: 'guestName', label: 'Guest Name' },
        { key: 'charge', label: 'Charge', type: 'number' },
        { key: 'status', label: 'Status', type: 'select', options: ['Requested', 'Completed', 'Cancelled'] },
      ] },
    ],
  },
  {
    group: 'Billing',
    items: [
      { path: '/hotel/billing/new-bill', title: 'Manual Bill', fields: billingFields },
      { path: '/hotel/billing/guest-billing', title: 'Guest Folio', fields: billingFields },
      { path: '/hotel/billing/restaurant-billing', title: 'Restaurant Bills', fields: billingFields },
      { path: '/hotel/billing/bills-invoices', title: 'Bills & Invoices', fields: billingFields },
      { path: '/hotel/billing/payments', title: 'Payments', fields: [
        { key: 'receiptNo', label: 'Receipt No', required: true },
        { key: 'guestName', label: 'Guest Name', required: true },
        { key: 'amount', label: 'Amount', type: 'number' },
        { key: 'mode', label: 'Mode', type: 'select', options: ['Cash', 'Card', 'UPI', 'Bank Transfer'] },
      ] },
      { path: '/hotel/billing/outstanding', title: 'Outstanding', fields: billingFields },
      { path: '/hotel/billing/refunds', title: 'Refunds', fields: billingFields },
      { path: '/hotel/billing/estimates', title: 'Estimates', fields: billingFields },
    ],
  },
  {
    group: 'Reports',
    items: [
      { path: '/hotel/reports', title: 'Reports', fields: [
        { key: 'reportName', label: 'Report Name', required: true },
        { key: 'period', label: 'Period' },
        { key: 'occupancyRate', label: 'Occupancy Rate', type: 'number' },
        { key: 'revenue', label: 'Revenue', type: 'number' },
      ] },
    ],
  },
];

const ITEMS = SECTION_ITEMS.flatMap(({ group, items }) => items.map((item) => ({ ...item, group })));

const CUSTOM_PAGES = {
  '/hotel/reservations/new': <NewReservationPage />,
  '/hotel/reservations/list': <ReservationListPage />,
  '/hotel/reservations/calendar': <ReservationCalendarPage />,
  '/hotel/reservations/availability': <ReservationAvailabilityPage />,
  '/hotel/reservations/rate-plans': <RatePlansPage />,
  '/hotel/front-desk/check-in': <CheckInPage />,
  '/hotel/front-desk/in-house-guests': <InHouseGuestsPage />,
  '/hotel/front-desk/check-out': <CheckOutPage />,
  '/hotel/front-desk/room-change': <RoomChangePage />,
  '/hotel/front-desk/guest-requests': <GuestRequestsPage />,
  '/hotel/guests/registration': <GuestRegistrationPage />,
  '/hotel/guests/list': <GuestListPage />,
  '/hotel/guests/profile': <GuestProfilePage />,
  '/hotel/guests/documents': <GuestDocumentsPage />,
  '/hotel/rooms-availability/room-types': <RoomTypesPage />,
  '/hotel/rooms-availability/rooms': <RoomsPage />,
  '/hotel/rooms-availability/room-status': <RoomStatusPage />,
  '/hotel/rooms-availability/floor-building': <FloorBuildingPage />,
  '/hotel/housekeeping/room-status': <HousekeepingBoardPage />,
  '/hotel/housekeeping/cleaning-tasks': <CleaningTasksPage />,
  '/hotel/housekeeping/schedule': <HousekeepingSchedulePage />,
  '/hotel/housekeeping/lost-found': <LostFoundPage />,
  '/hotel/restaurant-pos/billing': <PosBillingPage />,
  '/hotel/restaurant-pos/tables': <RestaurantTablesPage />,
  '/hotel/restaurant-pos/menu': <RestaurantMenuPage />,
  '/hotel/restaurant-pos/orders': <RestaurantOrdersPage />,
  '/hotel/restaurant-pos/kot': <KotPage />,
  '/hotel/services/room-service': <RoomServicePage />,
  '/hotel/services/laundry': <LaundryPage />,
  '/hotel/services/spa': <SpaPage />,
  '/hotel/services/transport': <TransportPage />,
  '/hotel/services/other-services': <OtherServicesPage />,
  '/hotel/billing/new-bill': <NewBillPage />,
  '/hotel/billing/guest-billing': <GuestBillingPage />,
  '/hotel/billing/restaurant-billing': <RestaurantBillingPage />,
  '/hotel/billing/bills-invoices': <BillsInvoicesPage />,
  '/hotel/billing/payments': <HotelPaymentsPage />,
  '/hotel/billing/outstanding': <OutstandingPage />,
  '/hotel/billing/refunds': <RefundsPage />,
  '/hotel/billing/estimates': <EstimatesPage />,
  '/hotel/reports': <HotelReportsPage />,
};

export const hotelCoreRoutes = ITEMS.map(({ path, title, group, fields }) => ({
  path,
  element: CUSTOM_PAGES[path] || <GenericModulePage title={title} group={group} category={CATEGORY} moduleKey={path.slice(1)} fields={fields} />,
}));
