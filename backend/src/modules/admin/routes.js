import { Router } from 'express';

import { createAdminRecord, deleteAdminRecord, deleteAdminSectionRow, getAdminDashboard, getAdminNotifications, getAdminRecords, getAdminSection, getAdminStats, loginAdmin, updateAdminRecord, updateAdminSectionRow, sendRenewalReminder } from './adminController.js';
import { requireEmployeeManagementAdminAuth, requireEmployeePortalRole } from '../../middleware/employeePortalAuth.js';
import { adminCorrections, adminDashboard, adminHolidays, adminLeaves, adminMonthlyAttendance, adminNotices, adminPayroll, adminTodayAttendance, createAdminEmployee, createHoliday, createNotice, deleteAdminEmployee, listAdminEmployees, updateAdminEmployee, updateAdminPayroll, updateCorrection, updateLeaveStatus } from '../employee-portal/portalController.js';
import { requireAdminAuth } from './adminAuth.js';

export const adminRouter = Router();

adminRouter.post('/login', loginAdmin);
adminRouter.get('/dashboard', requireAdminAuth, getAdminDashboard);
adminRouter.get('/stats', requireAdminAuth, getAdminStats);
adminRouter.get('/notifications', requireAdminAuth, getAdminNotifications);
adminRouter.get('/section/users', requireAdminAuth, (req, res, next) => { req.params.section = 'users'; return getAdminSection(req, res, next); });
adminRouter.get('/section/:section', requireAdminAuth, getAdminSection);
adminRouter.put('/section/:section/:id', requireAdminAuth, updateAdminSectionRow);
adminRouter.delete('/section/:section/:id', requireAdminAuth, deleteAdminSectionRow);
adminRouter.get('/records/:kind', requireAdminAuth, getAdminRecords);
adminRouter.post('/records/:kind', requireAdminAuth, createAdminRecord);
adminRouter.put('/records/:kind/:id', requireAdminAuth, updateAdminRecord);
adminRouter.delete('/records/:kind/:id', requireAdminAuth, deleteAdminRecord);
adminRouter.post('/send-reminder/:userId', requireAdminAuth, sendRenewalReminder);



const requireHrAdmin = [requireEmployeeManagementAdminAuth];

adminRouter.get('/employee-dashboard', ...requireHrAdmin, adminDashboard);
adminRouter.get('/employees', ...requireHrAdmin, listAdminEmployees);
adminRouter.post('/employees', ...requireHrAdmin, createAdminEmployee);
adminRouter.put('/employees/:id', ...requireHrAdmin, updateAdminEmployee);
adminRouter.delete('/employees/:id', ...requireHrAdmin, deleteAdminEmployee);
adminRouter.get('/attendance/today', ...requireHrAdmin, adminTodayAttendance);
adminRouter.get('/attendance/monthly', ...requireHrAdmin, adminMonthlyAttendance);
adminRouter.get('/attendance/corrections', ...requireHrAdmin, adminCorrections);
adminRouter.put('/attendance/corrections/:id', ...requireHrAdmin, updateCorrection);
adminRouter.get('/leaves', ...requireHrAdmin, adminLeaves);
adminRouter.put('/leaves/:id/status', ...requireHrAdmin, updateLeaveStatus);
adminRouter.get('/payroll', ...requireHrAdmin, adminPayroll);
adminRouter.put('/payroll/:id', ...requireHrAdmin, updateAdminPayroll);
adminRouter.get('/notices', ...requireHrAdmin, adminNotices);
adminRouter.post('/notices', ...requireHrAdmin, requireEmployeePortalRole('admin'), createNotice);
adminRouter.get('/holidays', ...requireHrAdmin, adminHolidays);
adminRouter.post('/holidays', ...requireHrAdmin, createHoliday);