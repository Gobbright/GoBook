import { API_BASE_URL } from './apiBase.js';
import { getToken } from './authToken.js';

function safeFilename(name = 'report') {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'report'}.csv`;
}

function filenameFromDisposition(disposition, fallback) {
  const match = /filename="?([^";]+)"?/i.exec(disposition || '');
  return match?.[1] || fallback;
}

export async function downloadReportCsv(downloadKey, reportName, { branch = '' } = {}) {
  const token = getToken();
  const query = new URLSearchParams({ key: downloadKey });
  if (branch) query.set('branch', branch);
  const response = await fetch(`${API_BASE_URL}/more-modules/reports-download?${query}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'Report download failed');
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filenameFromDisposition(response.headers.get('Content-Disposition'), safeFilename(reportName));
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
