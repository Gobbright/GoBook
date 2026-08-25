import { Router } from 'express';

import { archiveAdminNotification, createAdminRecord, deleteAdminRecord, deleteAdminSectionRow, getAdminDashboard, getAdminNotifications, getAdminRecords, getAdminSection, getAdminStats, getSubscriptionPayments, getSubscriptionPlans, loginAdmin, markAllAdminNotificationsRead, sendSubscriptionPaymentInvoice, updateAdminNotification, updateAdminRecord, updateAdminSectionRow, updateSubscriptionPlan, sendRenewalReminder } from './adminController.js';
import { adminStorageUpload, downloadStorageFile, exportStorageCollections, getDailyReports, getStorageOverview, listStorageBusinesses, listStorageFiles, uploadStorageFile } from './storageController.js';
import { requireEmployeeManagementAdminAuth, requireEmployeePortalRole } from '../../middleware/employeePortalAuth.js';
import { adminCorrections, adminDashboard, adminHolidays, adminLeaves, adminMonthlyAttendance, adminNotices, adminPayroll, adminTodayAttendance, approveAdminPayroll, createAdminCorrection, createAdminEmployee, createAdminLeave, createHoliday, createNotice, deleteAdminEmployee, employeePhotoUpload, generateAdminPayroll, leaveAttachmentUpload, listAdminEmployees, markAdminAttendance, updateAdminEmployee, updateAdminPayroll, updateCorrection, updateLeaveStatus } from '../employee-portal/portalController.js';
import { requireAdminAuth } from './adminAuth.js';

export const adminRouter = Router();

adminRouter.post('/login', loginAdmin);
adminRouter.get('/dashboard', requireAdminAuth, getAdminDashboard);
adminRouter.get('/stats', requireAdminAuth, getAdminStats);
adminRouter.get('/notifications', requireAdminAuth, getAdminNotifications);
adminRouter.patch('/notifications/read-all', requireAdminAuth, markAllAdminNotificationsRead);
adminRouter.patch('/notifications/:id', requireAdminAuth, updateAdminNotification);
adminRouter.delete('/notifications/:id', requireAdminAuth, archiveAdminNotification);
adminRouter.get('/storage/overview', requireAdminAuth, getStorageOverview);
adminRouter.get('/storage/files', requireAdminAuth, listStorageFiles);
adminRouter.post('/storage/files', requireAdminAuth, adminStorageUpload.single('file'), uploadStorageFile);
adminRouter.get('/storage/files/:id', requireAdminAuth, downloadStorageFile);
adminRouter.get('/storage/businesses', requireAdminAuth, listStorageBusinesses);
adminRouter.get('/storage/collections/export', requireAdminAuth, exportStorageCollections);
adminRouter.get('/storage/daily-reports', requireAdminAuth, getDailyReports);
adminRouter.get('/section/users', requireAdminAuth, (req, res, next) => { req.params.section = 'users'; return getAdminSection(req, res, next); });
adminRouter.get('/section/:section', requireAdminAuth, getAdminSection);
adminRouter.put('/section/:section/:id', requireAdminAuth, updateAdminSectionRow);
adminRouter.delete('/section/:section/:id', requireAdminAuth, deleteAdminSectionRow);
adminRouter.get('/records/:kind', requireAdminAuth, getAdminRecords);
adminRouter.post('/records/:kind', requireAdminAuth, createAdminRecord);
adminRouter.put('/records/:kind/:id', requireAdminAuth, updateAdminRecord);
adminRouter.delete('/records/:kind/:id', requireAdminAuth, deleteAdminRecord);
adminRouter.post('/send-reminder/:userId', requireAdminAuth, sendRenewalReminder);
adminRouter.get('/subscription-plans', requireAdminAuth, getSubscriptionPlans);
adminRouter.put('/subscription-plans/:id', requireAdminAuth, updateSubscriptionPlan);
adminRouter.get('/subscription-payments', requireAdminAuth, getSubscriptionPayments);
adminRouter.post('/subscription-payments/:id/send-invoice', requireAdminAuth, sendSubscriptionPaymentInvoice);



const requireHrAdmin = [requireEmployeeManagementAdminAuth];

adminRouter.get('/employee-dashboard', ...requireHrAdmin, adminDashboard);
adminRouter.get('/employees', ...requireHrAdmin, listAdminEmployees);
adminRouter.post('/employees', ...requireHrAdmin, employeePhotoUpload.single('photo'), createAdminEmployee);
adminRouter.put('/employees/:id', ...requireHrAdmin, updateAdminEmployee);
adminRouter.delete('/employees/:id', ...requireHrAdmin, deleteAdminEmployee);
adminRouter.get('/attendance/today', ...requireHrAdmin, adminTodayAttendance);
adminRouter.get('/attendance/monthly', ...requireHrAdmin, adminMonthlyAttendance);
adminRouter.post('/attendance/mark', ...requireHrAdmin, markAdminAttendance);
adminRouter.get('/attendance/corrections', ...requireHrAdmin, adminCorrections);
adminRouter.post('/attendance/corrections', ...requireHrAdmin, createAdminCorrection);
adminRouter.put('/attendance/corrections/:id', ...requireHrAdmin, updateCorrection);
adminRouter.get('/leaves', ...requireHrAdmin, adminLeaves);
adminRouter.post('/leaves', ...requireHrAdmin, leaveAttachmentUpload.single('attachment'), createAdminLeave);
adminRouter.put('/leaves/:id/status', ...requireHrAdmin, updateLeaveStatus);
adminRouter.get('/payroll', ...requireHrAdmin, adminPayroll);
adminRouter.post('/payroll/generate', ...requireHrAdmin, generateAdminPayroll);
adminRouter.post('/payroll/approve', ...requireHrAdmin, approveAdminPayroll);
adminRouter.put('/payroll/:id', ...requireHrAdmin, updateAdminPayroll);
adminRouter.get('/notices', ...requireHrAdmin, adminNotices);
adminRouter.post('/notices', ...requireHrAdmin, requireEmployeePortalRole('admin'), createNotice);
adminRouter.get('/holidays', ...requireHrAdmin, adminHolidays);
adminRouter.post('/holidays', ...requireHrAdmin, createHoliday);
