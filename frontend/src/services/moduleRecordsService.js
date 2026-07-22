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

export function importModuleRecords(moduleKey, fields, file) {
  const formData = new FormData();
  formData.append('moduleKey', moduleKey);
  formData.append('fields', JSON.stringify(fields.map((f) => ({ key: f.key, label: f.label, type: f.type, required: !!f.required }))));
  formData.append('file', file);
  return apiClient('/module-records/import', { method: 'POST', body: formData });
}
