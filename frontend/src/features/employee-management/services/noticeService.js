import { api } from './api.js';

export const noticeService = {
  list: () => api.get('/employee/notices'),
  adminList: () => api.get('/admin/notices'),
  create: (payload) => api.post('/admin/notices', payload),
};