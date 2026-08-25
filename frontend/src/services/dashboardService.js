import { apiClient } from './apiClient.js';

export function getDashboardSummary(params = {}) {
  const search = new URLSearchParams();
  if (params.branch) search.set('branch', params.branch);
  return apiClient(`/dashboard/summary${search.toString() ? `?${search}` : ''}`);
}
