import { api } from './api.js';

export const holidayService = {
  list: () => api.get('/employee/holidays'),
  adminList: () => api.get('/admin/holidays'),
  create: (payload) => api.post('/admin/holidays', payload),
};