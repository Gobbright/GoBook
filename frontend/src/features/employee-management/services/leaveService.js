import { api } from './api.js';

export const leaveService = {
  apply: (payload) => api.post('/employee/leave/apply', payload),
  status: () => api.get('/employee/leave/status'),
  history: () => api.get('/employee/leave/history'),
  adminLeaves: () => api.get('/admin/leaves'),
  updateStatus: (id, status) => api.put(`/admin/leaves/${id}/status`, { status }),
};