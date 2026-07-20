import { Router } from 'express';

import {
  getEmployeeStats,
  getDepartments,
  listEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  importEmployees,
} from './employeeController.js';

import {
  getPayrollStats,
  getMonths,
  listPayroll,
  getPayrollRecord,
  createPayrollRecord,
  updatePayrollRecord,
  patchPayrollStatus,
  deletePayrollRecord,
  importPayroll,
} from './payrollController.js';

import {
  getAttendanceStats,
  listAttendance,
  getAttendanceRecord,
  createAttendanceRecord,
  updateAttendanceRecord,
  deleteAttendanceRecord,
  importAttendance,
} from './attendanceController.js';

import {
  getLeaveStats,
  listLeaves,
  getLeave,
  createLeave,
  updateLeave,
  patchLeaveStatus,
  deleteLeave,
} from './leaveController.js';

import {
  getFolderCounts,
  listDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
  downloadDocument,
  viewDocument,
  upload,
} from './documentController.js';
import { uploadExcelFile } from '../../../utils/excelImport.js';

export const hrPayrollRouter = Router();

// ── Employees ──────────────────────────────────────────────────────────────
hrPayrollRouter.get('/employees/stats',       getEmployeeStats);
hrPayrollRouter.get('/employees/departments', getDepartments);
hrPayrollRouter.get('/employees',             listEmployees);
hrPayrollRouter.get('/employees/:id',         getEmployee);
hrPayrollRouter.post('/employees/import',     uploadExcelFile.single('file'), importEmployees);
hrPayrollRouter.post('/employees',            createEmployee);
hrPayrollRouter.put('/employees/:id',         updateEmployee);
hrPayrollRouter.delete('/employees/:id',      deleteEmployee);

// ── Payroll ────────────────────────────────────────────────────────────────
hrPayrollRouter.get('/payroll/stats',          getPayrollStats);
hrPayrollRouter.get('/payroll/months',         getMonths);
hrPayrollRouter.get('/payroll',                listPayroll);
hrPayrollRouter.get('/payroll/:id',            getPayrollRecord);
hrPayrollRouter.post('/payroll/import',        uploadExcelFile.single('file'), importPayroll);
hrPayrollRouter.post('/payroll',               createPayrollRecord);
hrPayrollRouter.put('/payroll/:id',            updatePayrollRecord);
hrPayrollRouter.patch('/payroll/:id/status',   patchPayrollStatus);
hrPayrollRouter.delete('/payroll/:id',         deletePayrollRecord);

// ── Attendance ─────────────────────────────────────────────────────────────
hrPayrollRouter.get('/attendance/stats',       getAttendanceStats);
hrPayrollRouter.get('/attendance',             listAttendance);
hrPayrollRouter.get('/attendance/:id',         getAttendanceRecord);
hrPayrollRouter.post('/attendance/import',     uploadExcelFile.single('file'), importAttendance);
hrPayrollRouter.post('/attendance',            createAttendanceRecord);
hrPayrollRouter.put('/attendance/:id',         updateAttendanceRecord);
hrPayrollRouter.delete('/attendance/:id',      deleteAttendanceRecord);

// ── Leaves ─────────────────────────────────────────────────────────────────
hrPayrollRouter.get('/leaves/stats',           getLeaveStats);
hrPayrollRouter.get('/leaves',                 listLeaves);
hrPayrollRouter.get('/leaves/:id',             getLeave);
hrPayrollRouter.post('/leaves',                createLeave);
hrPayrollRouter.put('/leaves/:id',             updateLeave);
hrPayrollRouter.patch('/leaves/:id/status',    patchLeaveStatus);
hrPayrollRouter.delete('/leaves/:id',          deleteLeave);

// ── Documents ──────────────────────────────────────────────────────────────
hrPayrollRouter.get('/documents/folder-counts',       getFolderCounts);
hrPayrollRouter.get('/documents',                     listDocuments);
hrPayrollRouter.post('/documents',                    upload.single('file'), createDocument);
hrPayrollRouter.put('/documents/:id',                 updateDocument);
hrPayrollRouter.delete('/documents/:id',              deleteDocument);
hrPayrollRouter.get('/documents/:id/download',        downloadDocument);
hrPayrollRouter.get('/documents/:id/view',            viewDocument);
