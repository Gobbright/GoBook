import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.js';
import { requireEmployeePortalAuth, requireEmployeePortalRole } from '../../middleware/employeePortalAuth.js';
import {
  applyLeave,
  checkIn,
  checkOut,
  createCorrection,
  employeeDashboard,
  employeeHolidays,
  employeeLeaveHistory,
  employeeLeaveStatus,
  employeeMonthlyAttendance,
  employeeNotices,
  employeePayslips,
  exchangeMainToken,
  getEmployeePortalMe,
  loginEmployeePortal,
} from './portalController.js';

export const employeePortalRouter = Router();

employeePortalRouter.post('/auth/login', loginEmployeePortal);
employeePortalRouter.post('/auth/exchange-main', requireAuth, exchangeMainToken);

employeePortalRouter.use(requireEmployeePortalAuth);

employeePortalRouter.get('/me', getEmployeePortalMe);
employeePortalRouter.get('/dashboard', employeeDashboard);
employeePortalRouter.post('/attendance/check-in', requireEmployeePortalRole('employee'), checkIn);
employeePortalRouter.post('/attendance/check-out', requireEmployeePortalRole('employee'), checkOut);
employeePortalRouter.get('/attendance/monthly', requireEmployeePortalRole('employee'), employeeMonthlyAttendance);
employeePortalRouter.post('/attendance/correction', requireEmployeePortalRole('employee'), createCorrection);
employeePortalRouter.post('/leave/apply', requireEmployeePortalRole('employee'), applyLeave);
employeePortalRouter.get('/leave/status', requireEmployeePortalRole('employee'), employeeLeaveStatus);
employeePortalRouter.get('/leave/history', requireEmployeePortalRole('employee'), employeeLeaveHistory);
employeePortalRouter.get('/notices', employeeNotices);
employeePortalRouter.get('/payslips', requireEmployeePortalRole('employee'), employeePayslips);
employeePortalRouter.get('/holidays', employeeHolidays);