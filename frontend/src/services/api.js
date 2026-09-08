import { redirectTo } from '../routes/navigation.js';
import { expireSession, getToken } from './authToken.js';
import { API_BASE_URL, SERVER_ORIGIN } from './apiBase.js';

const BASE = API_BASE_URL;

export { SERVER_ORIGIN };

function authHeader() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function handleUnauthorized(res) {
  if (res.status === 401) {
    expireSession();
    redirectTo('/login');
  }
}

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...authHeader() },
    body: body ? JSON.stringify(body) : undefined,
  });
  handleUnauthorized(res);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data;
}

async function upload(path, formData) {
  const res = await fetch(`${BASE}${path}`, { method: 'POST', headers: authHeader(), body: formData });
  handleUnauthorized(res);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Upload failed (${res.status})`);
  return data;
}

function qs(params) {
  const q = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== '')),
  ).toString();
  return q ? `?${q}` : '';
}

export const api = {
  getMe: () => request('GET', '/auth/me'),
  // ── Settings ──────────────────────────────────────────────────────────────
  getSettings: () => request('GET', '/settings'),
  listStaffUsers: (params) => request('GET', `/settings/users${qs(params ?? {})}`),

  // ── Audit Log ─────────────────────────────────────────────────────────────
  listAuditLogs:      (params) => request('GET', `/audit-logs${qs(params ?? {})}`),
  listAuditModelNames: ()      => request('GET', '/audit-logs/models'),

  // ── Global Search ─────────────────────────────────────────────────────────
  globalSearch: (q) => request('GET', `/search${qs({ q: q ?? '' })}`),

  // ── Invoices ──────────────────────────────────────────────────────────────
  getNextNumber: (prefix)    => request('GET',    `/sales/invoices/next-number?prefix=${encodeURIComponent(prefix)}`),
  listInvoices:  (params)    => request('GET',    `/sales/invoices${qs(params ?? {})}`),
  getInvoice:    (id)        => request('GET',    `/sales/invoices/${id}`),
  createInvoice: (payload)   => request('POST',   '/sales/invoices', payload),
  updateInvoice: (id, payload) => request('PUT',  `/sales/invoices/${id}`, payload),
  deleteInvoice:     (id)          => request('DELETE', `/sales/invoices/${id}`),
  sendInvoiceEmail:  (id, payload) => request('POST',   `/sales/invoices/${id}/send-email`, payload),

  // ── Payments ──────────────────────────────────────────────────────────────
  listPayments:    (invoiceId)          => request('GET',    `/sales/invoices/${invoiceId}/payments`),
  recordPayment:   (invoiceId, payload) => request('POST',   `/sales/invoices/${invoiceId}/payments`, payload),
  deletePayment:   (paymentId)          => request('DELETE', `/sales/payments/${paymentId}`),
  listOutstanding: (params)             => request('GET',    `/sales/invoices/outstanding${qs(params ?? {})}`),

  // ── Credit Notes ──────────────────────────────────────────────────────────
  getCreditNoteNextNumber: ()           => request('GET',    '/sales/credit-notes/next-number'),
  listCreditNotes:  (params)            => request('GET',    `/sales/credit-notes${qs(params ?? {})}`),
  getCreditNote:    (id)                => request('GET',    `/sales/credit-notes/${id}`),
  createCreditNote: (payload)           => request('POST',   '/sales/credit-notes', payload),
  updateCreditNote: (id, payload)       => request('PUT',    `/sales/credit-notes/${id}`, payload),
  deleteCreditNote: (id)                => request('DELETE', `/sales/credit-notes/${id}`),

  // ── Debit Notes ───────────────────────────────────────────────────────────
  getDebitNoteNextNumber: ()           => request('GET',    '/sales/debit-notes/next-number'),
  listDebitNotes:  (params)            => request('GET',    `/sales/debit-notes${qs(params ?? {})}`),
  getDebitNote:    (id)                => request('GET',    `/sales/debit-notes/${id}`),
  createDebitNote: (payload)           => request('POST',   '/sales/debit-notes', payload),
  updateDebitNote: (id, payload)       => request('PUT',    `/sales/debit-notes/${id}`, payload),
  deleteDebitNote: (id)                => request('DELETE', `/sales/debit-notes/${id}`),

  // ── Sales Returns ─────────────────────────────────────────────────────────
  getSalesReturnNextNumber: ()          => request('GET',    '/sales/sales-returns/next-number'),
  listSalesReturns: (params)            => request('GET',    `/sales/sales-returns${qs(params ?? {})}`),
  getSalesReturn:   (id)                => request('GET',    `/sales/sales-returns/${id}`),
  createSalesReturn: (payload)          => request('POST',   '/sales/sales-returns', payload),
  updateSalesReturn: (id, payload)      => request('PUT',    `/sales/sales-returns/${id}`, payload),
  deleteSalesReturn: (id)               => request('DELETE', `/sales/sales-returns/${id}`),

  // ── Supplier Returns ──────────────────────────────────────────────────────
  getSupplierReturnNextNumber: ()          => request('GET',    '/sales/supplier-returns/next-number'),
  listSupplierReturns: (params)            => request('GET',    `/sales/supplier-returns${qs(params ?? {})}`),
  getSupplierReturn:   (id)                => request('GET',    `/sales/supplier-returns/${id}`),
  createSupplierReturn: (payload)          => request('POST',   '/sales/supplier-returns', payload),
  updateSupplierReturn: (id, payload)      => request('PUT',    `/sales/supplier-returns/${id}`, payload),
  deleteSupplierReturn: (id)               => request('DELETE', `/sales/supplier-returns/${id}`),

  // ── Delivery Challans ─────────────────────────────────────────────────────
  getChallanNextNumber: ()           => request('GET',    '/sales/challans/next-number'),
  listChallans:  (params)            => request('GET',    `/sales/challans${qs(params ?? {})}`),
  getChallan:    (id)                => request('GET',    `/sales/challans/${id}`),
  createChallan: (payload)           => request('POST',   '/sales/challans', payload),
  updateChallan: (id, payload)       => request('PUT',    `/sales/challans/${id}`, payload),
  deleteChallan: (id)                => request('DELETE', `/sales/challans/${id}`),

  // ── E-Invoices ─────────────────────────────────────────────────────────────
  getEInvoiceNextNumber: ()          => request('GET',    '/sales/e-invoices/next-number'),
  listEInvoices:  (params)           => request('GET',    `/sales/e-invoices${qs(params ?? {})}`),
  getEInvoice:    (id)               => request('GET',    `/sales/e-invoices/${id}`),
  createEInvoice: (payload)          => request('POST',   '/sales/e-invoices', payload),
  updateEInvoice: (id, payload)      => request('PUT',    `/sales/e-invoices/${id}`, payload),
  deleteEInvoice: (id)               => request('DELETE', `/sales/e-invoices/${id}`),

  // ── E-Way Bills ────────────────────────────────────────────────────────────
  getEWayBillNextNumber: ()          => request('GET',    '/sales/e-way-bills/next-number'),
  listEWayBills:  (params)           => request('GET',    `/sales/e-way-bills${qs(params ?? {})}`),
  getEWayBill:    (id)               => request('GET',    `/sales/e-way-bills/${id}`),
  createEWayBill: (payload)          => request('POST',   '/sales/e-way-bills', payload),
  updateEWayBill: (id, payload)      => request('PUT',    `/sales/e-way-bills/${id}`, payload),
  deleteEWayBill: (id)               => request('DELETE', `/sales/e-way-bills/${id}`),
  generateEWayBillGSP: (payload)     => request('POST',   '/sales/e-way-bills/gsp-generate', payload),
  updateSettings: (payload)          => request('PUT',    '/settings', payload),

  // ── Customers ─────────────────────────────────────────────────────────────
  listCustomers:  (search)   => request('GET',    `/sales/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  createCustomer: (payload)  => request('POST',   '/sales/customers', payload),
  updateCustomer: (id, payload) => request('PUT', `/sales/customers/${id}`, payload),
  deleteCustomer: (id)       => request('DELETE', `/sales/customers/${id}`),
  importCustomers: (formData) => upload('/crm/customers/import', formData),
  listVendors:    (search)   => request('GET',    `/more-modules/vendors${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  createVendor:   (payload)  => request('POST',   '/more-modules/vendors', payload),
  updateVendor:   (id, payload) => request('PUT', `/more-modules/vendors/${id}`, payload),

  // ── Products ──────────────────────────────────────────────────────────────
  listProducts:  (params)    => {
    if (typeof params === 'string') return request('GET', `/sales/products${params ? `?search=${encodeURIComponent(params)}` : ''}`);
    return request('GET', `/sales/products${qs(params ?? {})}`);
  },
  createProduct: (payload)   => request('POST',   '/sales/products', payload),
  updateProduct: (id, payload) => request('PUT',  `/sales/products/${id}`, payload),
  deleteProduct: (id)        => request('DELETE', `/sales/products/${id}`),

  // ── Inventory: Products ───────────────────────────────────────────────────
  invProductStats:      ()               => request('GET', '/inventory/products/stats'),
  invProductNextCode:   (params)         => request('GET', `/inventory/products/next-code${qs(params ?? {})}`),
  invProductCategories: ()               => request('GET', '/inventory/products/categories'),
  invProductSubcategories: ()            => request('GET', '/inventory/products/subcategories'),
  invProductBrands:     ()               => request('GET', '/inventory/products/brands'),
  invProductSizes:      ()               => request('GET', '/inventory/products/sizes'),
  invProductFabrics:    ()               => request('GET', '/inventory/products/fabrics'),
  invProductColours:    ()               => request('GET', '/inventory/products/colours'),
  invProductTypes:      ()               => request('GET', '/inventory/products/types'),
  invListProducts:      (params)         => request('GET', `/inventory/products${qs(params ?? {})}`),
  invGetProduct:        (id)             => request('GET', `/inventory/products/${id}`),
  invCreateProduct:     (payload)        => request('POST',   '/inventory/products', payload),
  invUpdateProduct:     (id, payload)    => request('PUT',    `/inventory/products/${id}`, payload),
  invDeleteProduct:     (id)             => request('DELETE', `/inventory/products/${id}`),
  invImportProducts:    (formData, params) => upload(`/inventory/products/import${qs(params ?? {})}`, formData),

  invStockSummary:      (params)         => request('GET', `/inventory/reports/summary${qs(params ?? {})}`),
  invStockLedger:       (params)         => request('GET', `/inventory/reports/ledger${qs(params ?? {})}`),

  // ── Inventory: Stock In ───────────────────────────────────────────────────
  invStockInNextNumber: ()            => request('GET', '/inventory/stock-in/next-number'),
  invStockInStats:      (params)      => request('GET', `/inventory/stock-in/stats${qs(params ?? {})}`),
  invListStockIn:       (params)      => request('GET', `/inventory/stock-in${qs(params ?? {})}`),
  invCreateStockIn:     (payload)     => request('POST',   '/inventory/stock-in', payload),
  invUpdateStockIn:     (id, payload) => request('PUT',    `/inventory/stock-in/${id}`, payload),
  invDeleteStockIn:     (id)          => request('DELETE', `/inventory/stock-in/${id}`),
  invImportStockIn:     (formData)    => upload('/inventory/stock-in/import', formData),

  // ── Inventory: Stock Out ──────────────────────────────────────────────────
  invStockOutNextNumber: ()            => request('GET', '/inventory/stock-out/next-number'),
  invStockOutStats:      (params)      => request('GET', `/inventory/stock-out/stats${qs(params ?? {})}`),
  invListStockOut:       (params)      => request('GET', `/inventory/stock-out${qs(params ?? {})}`),
  invCreateStockOut:     (payload)     => request('POST',   '/inventory/stock-out', payload),
  invUpdateStockOut:     (id, payload) => request('PUT',    `/inventory/stock-out/${id}`, payload),
  invDeleteStockOut:     (id)          => request('DELETE', `/inventory/stock-out/${id}`),

  // ── Inventory: Warehouses ─────────────────────────────────────────────────
  invWarehouseStats:   ()               => request('GET', '/inventory/warehouses/stats'),
  invListWarehouses:   (params)         => request('GET', `/inventory/warehouses${qs(params ?? {})}`),
  invCreateWarehouse:  (payload)        => request('POST',   '/inventory/warehouses', payload),
  invUpdateWarehouse:  (id, payload)    => request('PUT',    `/inventory/warehouses/${id}`, payload),
  invDeleteWarehouse:  (id)             => request('DELETE', `/inventory/warehouses/${id}`),

  // ── Inventory: Categories ─────────────────────────────────────────────────
  invCategoryStats:   ()               => request('GET', '/inventory/categories/stats'),
  invListCategories:  (params)         => request('GET', `/inventory/categories${qs(params ?? {})}`),
  invCreateCategory:  (payload)        => request('POST',   '/inventory/categories', payload),
  invUpdateCategory:  (id, payload)    => request('PUT',    `/inventory/categories/${id}`, payload),
  invDeleteCategory:  (id)             => request('DELETE', `/inventory/categories/${id}`),

  // ── Inventory: Brands ──────────────────────────────────────────────────────
  invBrandStats:   ()               => request('GET', '/inventory/brands/stats'),
  invListBrands:   (params)         => request('GET', `/inventory/brands${qs(params ?? {})}`),
  invCreateBrand:  (payload)        => request('POST',   '/inventory/brands', payload),
  invUpdateBrand:  (id, payload)    => request('PUT',    `/inventory/brands/${id}`, payload),
  invDeleteBrand:  (id)             => request('DELETE', `/inventory/brands/${id}`),

  // ── Inventory: Alerts ─────────────────────────────────────────────────────
  invAlertStats: (params) => request('GET', `/inventory/alerts/stats${qs(params ?? {})}`),
  invListAlerts: (params) => request('GET', `/inventory/alerts${qs(params ?? {})}`),

  // ── HR & Payroll: Employees ───────────────────────────────────────────────
  hrEmployeeStats:   ()                  => request('GET', '/hr-payroll/employees/stats'),
  hrDepartments:     ()                  => request('GET', '/hr-payroll/employees/departments'),
  hrListEmployees:   (params)            => request('GET', `/hr-payroll/employees${qs(params ?? {})}`),
  hrGetEmployee:     (id)                => request('GET', `/hr-payroll/employees/${id}`),
  hrCreateEmployee:  (payload)           => request('POST',   '/hr-payroll/employees', payload),
  hrUpdateEmployee:  (id, payload)       => request('PUT',    `/hr-payroll/employees/${id}`, payload),
  hrDeleteEmployee:  (id)                => request('DELETE', `/hr-payroll/employees/${id}`),
  hrImportEmployees: (formData)          => upload('/hr-payroll/employees/import', formData),

  // ── HR & Payroll: Payroll ─────────────────────────────────────────────────
  hrPayrollStats:        (params)        => request('GET', `/hr-payroll/payroll/stats${qs(params ?? {})}`),
  hrPayrollMonths:       ()              => request('GET', '/hr-payroll/payroll/months'),
  hrListPayroll:         (params)        => request('GET', `/hr-payroll/payroll${qs(params ?? {})}`),
  hrCreatePayroll:       (payload)       => request('POST',   '/hr-payroll/payroll', payload),
  hrUpdatePayroll:       (id, payload)   => request('PUT',    `/hr-payroll/payroll/${id}`, payload),
  hrPatchPayrollStatus:  (id, status)    => request('PATCH',  `/hr-payroll/payroll/${id}/status`, { status }),
  hrDeletePayroll:       (id)            => request('DELETE', `/hr-payroll/payroll/${id}`),
  hrImportPayroll:       (formData)      => upload('/hr-payroll/payroll/import', formData),

  // ── HR & Payroll: Attendance ──────────────────────────────────────────────
  hrAttendanceStats:     (params)        => request('GET', `/hr-payroll/attendance/stats${qs(params ?? {})}`),
  hrListAttendance:      (params)        => request('GET', `/hr-payroll/attendance${qs(params ?? {})}`),
  hrCreateAttendance:    (payload)       => request('POST',   '/hr-payroll/attendance', payload),
  hrUpdateAttendance:    (id, payload)   => request('PUT',    `/hr-payroll/attendance/${id}`, payload),
  hrDeleteAttendance:    (id)            => request('DELETE', `/hr-payroll/attendance/${id}`),
  hrImportAttendance:    (formData)      => upload('/hr-payroll/attendance/import', formData),

  // ── HR & Payroll: Leaves ──────────────────────────────────────────────────
  hrLeaveStats:          ()              => request('GET', '/hr-payroll/leaves/stats'),
  hrListLeaves:          (params)        => request('GET', `/hr-payroll/leaves${qs(params ?? {})}`),
  hrCreateLeave:         (payload)       => request('POST',   '/hr-payroll/leaves', payload),
  hrUpdateLeave:         (id, payload)   => request('PUT',    `/hr-payroll/leaves/${id}`, payload),
  hrPatchLeaveStatus:    (id, status)    => request('PATCH',  `/hr-payroll/leaves/${id}/status`, { status }),
  hrDeleteLeave:         (id)            => request('DELETE', `/hr-payroll/leaves/${id}`),

  // ── Platform Admin (site-owner only) ─────────────────────────────────────
  platformStats:     ()       => request('GET', '/platform-admin/stats'),
  platformBusinesses: ()      => request('GET', '/platform-admin/businesses'),
  platformUsers:      (search) => request('GET', `/platform-admin/users${qs({ search })}`),

  // ── HR & Payroll: Documents ───────────────────────────────────────────────
  hrDocFolderCounts:  ()              => request('GET', '/hr-payroll/documents/folder-counts'),
  hrListDocuments:    (params)        => request('GET', `/hr-payroll/documents${qs(params ?? {})}`),
  hrUploadDocument:   (formData)      => upload('/hr-payroll/documents', formData),
  hrUpdateDocument:   (id, payload)   => request('PUT',    `/hr-payroll/documents/${id}`, payload),
  hrDeleteDocument:   (id)            => request('DELETE', `/hr-payroll/documents/${id}`),
  hrDocDownloadUrl:   (id)            => `${BASE}/hr-payroll/documents/${id}/download`,
  hrDocViewUrl:       (id)            => `${BASE}/hr-payroll/documents/${id}/view`,
};
