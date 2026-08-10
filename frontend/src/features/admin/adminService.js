import { redirectTo } from '../../routes/navigation.js';
import { API_BASE_URL } from '../../services/apiBase.js';

const ADMIN_TOKEN_KEY = 'gobook_admin_token';
const ADMIN_USER_KEY = 'gobook_admin_user';

export function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY) || '';
}

export function isAdminAuthenticated() {
  return Boolean(getAdminToken());
}

export function clearAdminSession() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_USER_KEY);
}

function setAdminSession(token, admin) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
  localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(admin || {}));
}

function isToday(value) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  return date.getFullYear() === today.getFullYear()
    && date.getMonth() === today.getMonth()
    && date.getDate() === today.getDate();
}

function buildAdminNotification(id, type, title, message, relatedUser, createdAt) {
  return {
    id: String(id),
    type,
    title,
    message,
    relatedUser: relatedUser || '',
    read: false,
    createdAt: createdAt || new Date(),
  };
}

function buildNotificationsFromDashboard(dashboard = {}) {
  const panel = dashboard.panel || {};
  const users = Array.isArray(panel.users) ? panel.users : [];
  const payments = Array.isArray(panel.payments) ? panel.payments : [];
  const newUsers = users.filter((user) => isToday(user.createdAt));
  const expiredUsers = users.filter((user) => String(user.status || '').toLowerCase() === 'expired');
  const todayPayments = payments.filter((payment) => isToday(payment.createdAt || payment.date));

  const notifications = [
    ...newUsers.map((user) => {
      const displayName = user.businessName || user.name || user.email || 'New user';
      return buildAdminNotification(
        `new-user-${user.id || user._id || user.email}`,
        'new_user',
        'New User Registration',
        `${displayName} registered today`,
        displayName,
        user.createdAt
      );
    }),
    ...expiredUsers.map((user) => {
      const displayName = user.businessName || user.name || user.email || 'User';
      return buildAdminNotification(
        `expired-${user.id || user._id || user.email}`,
        'expiry_1day',
        'Expired User Alert',
        `${displayName} account is marked expired`,
        displayName,
        user.updatedAt || user.createdAt
      );
    }),
    ...todayPayments.map((payment) => {
      const displayName = payment.customerName || 'Customer';
      return buildAdminNotification(
        `payment-${payment.id || payment._id || payment.customerName || payment.createdAt}`,
        'payment',
        'Payment Received',
        `${displayName} paid ₹ ${Number(payment.amount || 0).toLocaleString('en-IN')}`,
        displayName,
        payment.createdAt || payment.date
      );
    }),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return {
    count: notifications.length,
    unreadCount: notifications.filter((item) => !item.read).length,
    newUserCount: Number(panel.todayRegistrations ?? newUsers.length ?? 0),
    expiringCount: Number(panel.expiredUsers ?? expiredUsers.length ?? 0),
    generatedAt: dashboard.generatedAt || new Date().toISOString(),
    notifications,
  };
}
async function adminRequest(path, options = {}) {
  const token = getAdminToken();
  const isFormData = options.body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) clearAdminSession();
    throw new Error(data.message || `Admin request failed: ${response.status}`);
  }
  return data;
}

export async function loginAdmin(adminId, password) {
  const data = await adminRequest('/admin/login', {
    method: 'POST',
    body: JSON.stringify({ adminId: adminId.trim(), password }),
  });
  setAdminSession(data.token, data.admin);
  return data.admin;
}

export async function fetchAdminDashboard() {
  return adminRequest('/admin/dashboard');
}

export async function fetchAdminStats() {
  return adminRequest('/admin/stats');
}

export async function fetchAdminNotifications(dashboardData) {
  try {
    return await adminRequest('/admin/notifications?limit=2000');
  } catch (error) {
    if (!dashboardData) throw error;
    return buildNotificationsFromDashboard(dashboardData);
  }
}

export async function updateAdminNotification(id, read) {
  return adminRequest(`/admin/notifications/${id}`, { method: 'PATCH', body: JSON.stringify({ read }) });
}

export async function markAllAdminNotificationsRead() {
  return adminRequest('/admin/notifications/read-all', { method: 'PATCH', body: '{}' });
}

export async function archiveAdminNotification(id) {
  return adminRequest(`/admin/notifications/${id}`, { method: 'DELETE' });
}

export async function fetchStorageOverview() {
  return adminRequest('/admin/storage/overview');
}

export async function fetchStorageFiles(kind = 'all') {
  return adminRequest(`/admin/storage/files?kind=${encodeURIComponent(kind)}&limit=1000`);
}

export async function fetchStorageBusinesses() {
  return adminRequest('/admin/storage/businesses');
}

export async function fetchDailyStorageReports(days = 30) {
  return adminRequest(`/admin/storage/daily-reports?days=${encodeURIComponent(days)}`);
}

export async function uploadAdminStorageFile(formData) {
  return adminRequest('/admin/storage/files', { method: 'POST', body: formData });
}

export async function downloadAdminStorageFile(id, inline = false) {
  const response = await fetch(`${API_BASE_URL}/admin/storage/files/${id}?inline=${inline ? '1' : '0'}`, {
    headers: { Authorization: `Bearer ${getAdminToken()}` },
  });
  if (!response.ok) throw new Error('Unable to download stored file');
  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') || '';
  const filename = disposition.match(/filename="([^"]+)"/i)?.[1] || 'gobook-file';
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function downloadAdminCollectionExport(collection = '') {
  const query = collection ? `?collection=${encodeURIComponent(collection)}` : '';
  const response = await fetch(`${API_BASE_URL}/admin/storage/collections/export${query}`, {
    headers: { Authorization: `Bearer ${getAdminToken()}` },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    if (response.status === 401 || response.status === 403) clearAdminSession();
    throw new Error(data.message || 'Unable to export database collection');
  }
  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') || '';
  const filename = disposition.match(/filename="([^"]+)"/i)?.[1] || 'gobooks-database-export.json';
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function fetchAdminSection(sectionKey) {
  try {
    return await adminRequest(`/admin/section/${sectionKey}`);
  } catch (err) {
    const message = String(err.message || '').toLowerCase();
    if (!message.includes('route not found') && !message.includes('section')) throw err;

    const dashboard = await fetchAdminDashboard();
    const section = dashboard.sections?.find((item) => item.key === sectionKey);
    if (section) return section;
    throw err;
  }
}


export async function fetchAdminRecords(kind) {
  return adminRequest(`/admin/records/${kind}`);
}

export async function fetchSubscriptionPlans() {
  return adminRequest('/admin/subscription-plans');
}

export async function updateSubscriptionPlan(id, payload) {
  return adminRequest(`/admin/subscription-plans/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function fetchSubscriptionPayments(status = 'all') {
  return adminRequest(`/admin/subscription-payments?status=${encodeURIComponent(status)}`);
}

export async function sendSubscriptionPaymentInvoice(id) {
  return adminRequest(`/admin/subscription-payments/${id}/send-invoice`, {
    method: 'POST',
    body: '{}',
  });
}

export async function createAdminRecord(kind, payload) {
  return adminRequest(`/admin/records/${kind}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateAdminTableRow(sourceKey, id, payload) {
  const path = sourceKey.startsWith('records/')
    ? `/admin/${sourceKey}/${id}`
    : `/admin/section/${sourceKey}/${id}`;
  return adminRequest(path, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminTableRow(sourceKey, id) {
  const path = sourceKey.startsWith('records/')
    ? `/admin/${sourceKey}/${id}`
    : `/admin/section/${sourceKey}/${id}`;
  return adminRequest(path, { method: 'DELETE' });
}
export async function sendRenewalReminder(userId) {
  return adminRequest(`/admin/send-reminder/${userId}`, { method: 'POST' });
}

export function logoutAdmin() {
  clearAdminSession();
  redirectTo('/admin-login');
}



