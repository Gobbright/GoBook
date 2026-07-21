import { expireSession, getToken } from './authToken.js';
import { API_BASE_URL } from './apiBase.js';

export async function apiClient(path, options = {}) {
  const token = getToken();
  const isFormData = options.body instanceof FormData;
  const { headers: customHeaders = {}, ...fetchOptions } = options;

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...fetchOptions,
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...customHeaders,
      },
    });
  } catch {
    throw new Error(`Unable to reach API at ${API_BASE_URL}. Check API domain SSL, CORS, and deployment.`);
  }

  if (response.status === 401 && !path.startsWith('/auth/')) {
    expireSession();
    window.location.assign('/login');
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `API request failed: ${response.status}`);
  }

  return data;
}
