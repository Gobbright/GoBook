import { api } from './api.js';

export const authService = {
  login: (payload) => api.post('/employee/auth/login', payload),
  exchangeMain: (token) => api.post('/employee/auth/exchange-main', {}, { headers: { Authorization: 'Bearer ' + token} }),
  me: () => api.get('/employee/me'),
};