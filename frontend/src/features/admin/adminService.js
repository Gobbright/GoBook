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

export function logoutAdmin() {
  clearAdminSession();
  window.location.assign('/admin-login');
}