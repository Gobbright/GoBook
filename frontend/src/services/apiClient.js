import { redirectTo } from '../routes/navigation.js';
import { expireSession, getToken } from './authToken.js';
import { API_BASE_URL } from './apiBase.js';

const DEVICE_ID_KEY = 'gobook.device.id';

function getDeviceId() {
  try {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  } catch {
    return '';
  }
}

export async function apiClient(path, options = {}) {
  const token = getToken();
  const isFormData = options.body instanceof FormData;
  const { headers: customHeaders = {}, ...fetchOptions } = options;
  const deviceId = getDeviceId();

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...fetchOptions,
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(deviceId ? { 'X-Device-Id': deviceId } : {}),
        ...customHeaders,
      },
    });
  } catch {
    throw new Error(`Unable to reach API at ${API_BASE_URL}. Check API domain SSL, CORS, and deployment.`);
  }

  if (response.status === 401 && !path.startsWith('/auth/')) {
    expireSession();
    redirectTo('/login');
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `API request failed: ${response.status}`);
  }

  return data;
}
