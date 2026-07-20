import { apiClient } from './apiClient.js';

export function listModuleRecords(moduleKey) {
  return apiClient(`/module-records?moduleKey=${encodeURIComponent(moduleKey)}`);
}

export function createModuleRecord(moduleKey, data) {
  return apiClient('/module-records', { method: 'POST', body: JSON.stringify({ moduleKey, data }) });
}

export function updateModuleRecord(id, data) {
  return apiClient(`/module-records/${id}`, { method: 'PUT', body: JSON.stringify({ data }) });
}

export function deleteModuleRecord(id) {
  return apiClient(`/module-records/${id}`, { method: 'DELETE' });
}
