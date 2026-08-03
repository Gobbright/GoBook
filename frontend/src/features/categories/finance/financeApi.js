import { apiClient } from '../../../services/apiClient.js';

function query(params = {}) {
  const value = new URLSearchParams(
    Object.entries(params).filter(([, item]) => item !== undefined && item !== ''),
  ).toString();
  return value ? `?${value}` : '';
}

export const financeApi = {
  dashboard: () => apiClient('/finance/dashboard'),
  customers: (status = 'Active') => apiClient(`/finance/customers${query({ status })}`),
  createCustomer: (payload) => apiClient('/finance/customers', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updateCustomer: (id, payload) => apiClient(`/finance/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),
  updateCustomerStatus: (id, status) => apiClient(`/finance/customers/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }),
  collectionEntry: (date) => apiClient(`/finance/collections${query({ date })}`),
  saveCollection: (customerId, payload) => apiClient(`/finance/collections/${customerId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),
  reminders: () => apiClient('/finance/reminders'),
  reports: (month) => apiClient(`/finance/reports${query({ month })}`),
  settings: () => apiClient('/settings'),
  updateSettings: (payload) => apiClient('/settings', {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),
};
