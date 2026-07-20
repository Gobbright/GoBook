import { apiClient } from './apiClient.js';

export function getDashboardSummary() {
  return apiClient('/dashboard/summary');
}
