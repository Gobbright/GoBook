import { api } from './api.js';

export const payrollService = {
  payslips: () => api.get('/employee/payslips'),
  adminPayroll: (month) => api.get(`/admin/payroll${month ? `?month=${month}` : ''}`),
  generate: (month) => api.post('/admin/payroll/generate', { month }),
  approve: (month) => api.post('/admin/payroll/approve', { month }),
  update: (id, payload) => api.put(`/admin/payroll/${id}`, payload),
};
