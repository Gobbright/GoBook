import { API_BASE_URL } from './apiBase.js';
import { apiClient } from './apiClient.js';
import { getToken } from './authToken.js';

function selectedParam(collections = []) {
  return collections.length ? collections.join(',') : 'all';
}

function filenameFromDisposition(disposition) {
  const match = /filename="?([^";]+)"?/i.exec(disposition || '');
  return match?.[1] || `gobook-backup-${new Date().toISOString().slice(0, 10)}.json`;
}

function branchParam(branch = '') {
  return branch ? `branch=${encodeURIComponent(branch)}` : '';
}

export function getDataManagementSummary({ branch = '' } = {}) {
  const query = branchParam(branch);
  return apiClient(`/data-management/summary${query ? `?${query}` : ''}`);
}

export async function downloadDataBackup(collections = [], { branch = '' } = {}) {
  const token = getToken();
  const query = new URLSearchParams({ collections: selectedParam(collections) });
  if (branch) query.set('branch', branch);
  const response = await fetch(`${API_BASE_URL}/data-management/export?${query}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'Backup export failed');
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filenameFromDisposition(response.headers.get('Content-Disposition'));
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function importDataBackup({ file, mode = 'merge', collections = [], branch = '' }) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('mode', mode);
  formData.append('collections', selectedParam(collections));
  if (branch) formData.append('branchFilter', branch);
  return apiClient('/data-management/import', { method: 'POST', body: formData });
}

export function deleteDataByPeriod({ year, month = '', collections = [], branch = '' }) {
  return apiClient('/data-management/period', {
    method: 'DELETE',
    body: JSON.stringify({ year, month, collections: selectedParam(collections), branchFilter: branch }),
  });
}
