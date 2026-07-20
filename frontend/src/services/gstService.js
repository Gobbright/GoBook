import { apiClient } from './apiClient.js';

function enc(val) { return encodeURIComponent(val); }

export const gstService = {
  // Dashboard
  getDashboard: () =>
    apiClient('/gst/dashboard'),

  // GSTR-1
  getGstr1: (period, filingType = 'monthly') =>
    apiClient(`/gst/gstr1?period=${enc(period)}&filingType=${filingType}`),
  saveGstr1: (data) =>
    apiClient('/gst/gstr1', { method: 'PUT', body: JSON.stringify(data) }),
  fileGstr1: (period, filingType = 'monthly') =>
    apiClient('/gst/gstr1/file', { method: 'POST', body: JSON.stringify({ period, filingType }) }),
  autoPopulateGstr1: (period, filingType = 'monthly') =>
    apiClient(`/gst/gstr1/auto-populate?period=${enc(period)}&filingType=${filingType}`),

  // GSTR-3B
  getGstr3b: (period) =>
    apiClient(`/gst/gstr3b?period=${enc(period)}`),
  saveGstr3b: (data) =>
    apiClient('/gst/gstr3b', { method: 'PUT', body: JSON.stringify(data) }),
  postGstr3bAccountingAdjustment: (period) =>
    apiClient('/gst/gstr3b/accounting-adjustment', { method: 'POST', body: JSON.stringify({ period }) }),
  fileGstr3b: (period) =>
    apiClient('/gst/gstr3b/file', { method: 'POST', body: JSON.stringify({ period }) }),

  // Reconciliation
  getReconciliation: (period, type = '2b') =>
    apiClient(`/gst/reconciliation?period=${enc(period)}&type=${type}`),
  saveReconciliation: (data) =>
    apiClient('/gst/reconciliation', { method: 'PUT', body: JSON.stringify(data) }),
  updateEntry: (entryId, data) =>
    apiClient(`/gst/reconciliation/entry/${entryId}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Reports
  getReport: (type, period) =>
    apiClient(`/gst/reports?type=${enc(type)}&period=${enc(period)}`),

  // GSTR-9 (Annual Return)
  getGstr9: (fy) =>
    apiClient(`/gst/gstr9?fy=${enc(fy)}`),
};
