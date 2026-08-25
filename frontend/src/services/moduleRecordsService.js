import { apiClient } from './apiClient.js';
import { API_BASE_URL } from './apiBase.js';
import { getToken } from './authToken.js';

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

export async function uploadModuleRecordFile(moduleKey, file) {
  const formData = new FormData();
  formData.append('moduleKey', moduleKey);
  formData.append('file', file);
  const { file: stored } = await apiClient('/module-records/files', { method: 'POST', body: formData });
  return stored;
}

export async function openModuleRecordFile(fileId) {
  const response = await fetch(`${API_BASE_URL}/module-records/files/${fileId}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!response.ok) throw new Error('Unable to open file');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
