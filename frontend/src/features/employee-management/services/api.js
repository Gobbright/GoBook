import { API_BASE_URL } from '../../../services/apiBase.js';
import { getToken as getMainToken } from '../../../services/authToken.js';

const GET_CACHE_TTL_MS = 15_000;
const REQUEST_TIMEOUT_MS = 30_000;
const getCache = new Map();
const inFlightGets = new Map();

function getEmployeeToken() {
  return localStorage.getItem('employee_portal_token') || '';
}

function clearGetCache() {
  getCache.clear();
  inFlightGets.clear();
}

function setEmployeeSession(data) {
  if (!data?.token || !data?.user) return;
  localStorage.setItem('employee_portal_token', data.token);
  localStorage.setItem('employee_portal_user', JSON.stringify(data.user));
  clearGetCache();
}

async function exchangeMainToken() {
  const mainToken = getMainToken();
  if (!mainToken) return '';
  const res = await fetch(`${API_BASE_URL}/employee/auth/exchange-main`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${mainToken}`,
    },
    body: JSON.stringify({}),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.message || 'Employee management login failed');
  setEmployeeSession(data);
  return data.token;
}

async function authHeader(path, providedHeaders = {}) {
  if (providedHeaders.Authorization) return providedHeaders;
  if (path.startsWith('/employee/auth/login')) return providedHeaders;

  if (path.startsWith('/admin/')) {
    const mainToken = getMainToken();
    if (mainToken) return { ...providedHeaders, Authorization: `Bearer ${mainToken}` };

    const employeeToken = getEmployeeToken() || await exchangeMainToken();
    return employeeToken
      ? { ...providedHeaders, Authorization: `Bearer ${employeeToken}` }
      : providedHeaders;
  }

  const token = getEmployeeToken();
  return token ? { ...providedHeaders, Authorization: `Bearer ${token}` } : providedHeaders;
}

export async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const finalHeaders = await authHeader(path, headers);
  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...finalHeaders,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if (error?.name === 'TimeoutError') {
      throw new Error('Server response timed out. Please try again.', { cause: error });
    }
    throw new Error('Backend not running. Start backend on port 5000 and try again.', { cause: error });
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.message || 'Request failed');
  return data;
}

function cacheKey(path) {
  const token = path.startsWith('/admin/')
    ? getMainToken() || getEmployeeToken()
    : getEmployeeToken();
  return `${token}:${path}`;
}

function cachedGet(path) {
  const key = cacheKey(path);
  const cached = getCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.data);
  if (inFlightGets.has(key)) return inFlightGets.get(key);

  const pending = request(path)
    .then((data) => {
      getCache.set(key, { data, expiresAt: Date.now() + GET_CACHE_TTL_MS });
      return data;
    })
    .finally(() => inFlightGets.delete(key));
  inFlightGets.set(key, pending);
  return pending;
}

async function mutate(path, options) {
  const data = await request(path, options);
  clearGetCache();
  return data;
}

async function upload(path, formData, { method = 'POST' } = {}) {
  const headers = await authHeader(path);
  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: formData,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if (error?.name === 'TimeoutError') {
      throw new Error('Server response timed out. Please try again.', { cause: error });
    }
    throw new Error('Backend not running. Start backend on port 5000 and try again.', { cause: error });
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.message || 'Upload failed');
  clearGetCache();
  return data;
}

export const api = {
  get: cachedGet,
  post: (path, body, options = {}) => mutate(path, { method: 'POST', body, ...options }),
  put: (path, body) => mutate(path, { method: 'PUT', body }),
  delete: (path) => mutate(path, { method: 'DELETE' }),
  upload,
};
