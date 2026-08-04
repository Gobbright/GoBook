import { api } from './api.js';

export const attendanceService = {
  checkIn: (payload) => api.post('/employee/attendance/check-in', payload),
  checkOut: (payload) => api.post('/employee/attendance/check-out', payload),
  monthly: (month) => api.get(`/employee/attendance/monthly${month ? `?month=${month}` : ''}`),
  correction: (payload) => api.post('/employee/attendance/correction', payload),
  adminDate: (date) => api.get(`/admin/attendance/today${date ? `?date=${date}` : ''}`),
  adminToday: () => api.get('/admin/attendance/today'),
  adminMonthly: (month) => api.get(`/admin/attendance/monthly${month ? `?month=${month}` : ''}`),
  corrections: () => api.get('/admin/attendance/corrections'),
  updateCorrection: (id, payload) => api.put(`/admin/attendance/corrections/${id}`, payload),
};