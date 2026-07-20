import { academicRoutes } from './modules/academic/routes.jsx';
import { feeManagementRoutes } from './modules/fee-management/routes.jsx';
import { hostelRoutes } from './modules/hostel/routes.jsx';
import { libraryRoutes } from './modules/library/routes.jsx';
import { studentManagementRoutes } from './modules/student-management/routes.jsx';
import { transportRoutes } from './modules/transport/routes.jsx';

export const schoolRoutes = [
  ...studentManagementRoutes,
  ...academicRoutes,
  ...feeManagementRoutes,
  ...libraryRoutes,
  ...transportRoutes,
  ...hostelRoutes,
];
