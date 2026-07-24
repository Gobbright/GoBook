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
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
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
  const dashboard = dashboardData || await fetchAdminDashboard();
  return buildNotificationsFromDashboard(dashboard);
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



