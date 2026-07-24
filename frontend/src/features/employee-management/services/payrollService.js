import { api } from './api.js';

export const payrollService = {
  payslips: () => api.get('/employee/payslips'),
  adminPayroll: () => api.get('/admin/payroll'),
  update: (id, payload) => api.put(`/admin/payroll/${id}`, payload),
};