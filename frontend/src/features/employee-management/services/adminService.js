import { api } from './api.js';

export const adminService = {
  dashboard: () => api.get('/admin/employee-dashboard'),
  employees: () => api.get('/admin/employees'),
  createEmployee: (payload) => api.post('/admin/employees', payload),
  updateEmployee: (id, payload) => api.put(`/admin/employees/${id}`, payload),
  deleteEmployee: (id) => api.delete(`/admin/employees/${id}`),
};