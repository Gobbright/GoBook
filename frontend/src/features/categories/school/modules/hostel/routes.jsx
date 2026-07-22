import { RoomsPage } from './RoomsPage.jsx';
import { AllocationPage } from './AllocationPage.jsx';
import { MessPage } from './MessPage.jsx';
import { HostelFeesPage } from './HostelFeesPage.jsx';

export const hostelRoutes = [
  { path: '/school/hostel/rooms', element: <RoomsPage /> },
  { path: '/school/hostel/allocation', element: <AllocationPage /> },
  { path: '/school/hostel/mess', element: <MessPage /> },
  { path: '/school/hostel/fees', element: <HostelFeesPage /> },
];
