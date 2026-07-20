import { ModulePlaceholderPage } from '../../../../../components/common/ModulePlaceholderPage.jsx';

function page(title) {
  return <ModulePlaceholderPage title={title} group="Hostel" category="School" />;
}

export const hostelRoutes = [
  { path: '/school/hostel', element: page('Hostel') },
  { path: '/school/hostel/rooms', element: page('Rooms') },
  { path: '/school/hostel/allocation', element: page('Allocation') },
  { path: '/school/hostel/mess', element: page('Mess') },
  { path: '/school/hostel/fees', element: page('Hostel Fees') },
];
