import { apiClient } from './apiClient.js';

function upload(path, formData) {
  return apiClient(path, {
    method: 'POST',
    body: formData,
  });
}

export function getCustomers(search) {
  const q = search ? `?search=${encodeURIComponent(search)}` : '';
  return apiClient(`/crm/customers${q}`);
}

export function createCustomer(customer) {
  return apiClient('/crm/customers', { method: 'POST', body: JSON.stringify(customer) });
}

export function updateCustomer(id, customer) {
  return apiClient(`/crm/customers/${id}`, { method: 'PUT', body: JSON.stringify(customer) });
}

export function deleteCustomer(id) {
  return apiClient(`/crm/customers/${id}`, { method: 'DELETE' });
}

export function importCustomers(formData) {
  return upload('/crm/customers/import', formData);
}

export function getLeads(search) {
  const q = search ? `?search=${encodeURIComponent(search)}` : '';
  return apiClient(`/crm/leads${q}`);
}

export function createLead(lead) {
  return apiClient('/crm/leads', { method: 'POST', body: JSON.stringify(lead) });
}

export function updateLead(id, lead) {
  return apiClient(`/crm/leads/${id}`, { method: 'PUT', body: JSON.stringify(lead) });
}

export function deleteLead(id) {
  return apiClient(`/crm/leads/${id}`, { method: 'DELETE' });
}

export function importLeads(formData) {
  return upload('/crm/leads/import', formData);
}

export function getFollowUps() {
  return apiClient('/crm/follow-ups');
}

export function createFollowUp(followUp) {
  return apiClient('/crm/follow-ups', { method: 'POST', body: JSON.stringify(followUp) });
}

export function updateFollowUp(id, followUp) {
  return apiClient(`/crm/follow-ups/${id}`, { method: 'PUT', body: JSON.stringify(followUp) });
}

export function deleteFollowUp(id) {
  return apiClient(`/crm/follow-ups/${id}`, { method: 'DELETE' });
}

export function getCustomerLifecycle() {
  return apiClient('/crm/lifecycle');
}
