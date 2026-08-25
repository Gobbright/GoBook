import { academicRoutes } from './modules/academic/routes.jsx';
import { admissionsRoutes } from './modules/admissions/routes.jsx';
import { attendanceRoutes } from './modules/attendance/routes.jsx';
import { communicationRoutes } from './modules/communication/routes.jsx';
import { examinationsRoutes } from './modules/examinations/routes.jsx';
import { feeManagementRoutes } from './modules/fee-management/routes.jsx';
import { homeworkRoutes } from './modules/homework/routes.jsx';
import { hostelRoutes } from './modules/hostel/routes.jsx';
import { libraryRoutes } from './modules/library/routes.jsx';
import { studentManagementRoutes } from './modules/student-management/routes.jsx';
import { transportRoutes } from './modules/transport/routes.jsx';

export const schoolRoutes = [
  ...admissionsRoutes,
  ...studentManagementRoutes,
  ...academicRoutes,
  ...attendanceRoutes,
  ...examinationsRoutes,
  ...feeManagementRoutes,
  ...homeworkRoutes,
  ...communicationRoutes,
  ...libraryRoutes,
  ...transportRoutes,
  ...hostelRoutes,
];
