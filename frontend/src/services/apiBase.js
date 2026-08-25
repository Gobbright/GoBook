const DEFAULT_API_URL = 'http://localhost:5000/api';

function normalizeApiUrl(url) {
  return url.replace(/\/+$/, '');
}

const configuredApiUrl = import.meta.env.VITE_API_URL;
const browserHost = typeof window !== 'undefined' ? window.location.hostname : '';
const shouldUseBrowserHost = browserHost && !['localhost', '127.0.0.1'].includes(browserHost);
const fallbackApiUrl = shouldUseBrowserHost ? `http://${browserHost}:5000/api` : DEFAULT_API_URL;
const configuredUsesLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(configuredApiUrl || '');
const resolvedApiUrl = shouldUseBrowserHost && configuredUsesLocalhost
  ? fallbackApiUrl
  : (configuredApiUrl || fallbackApiUrl);

export const API_BASE_URL = normalizeApiUrl(resolvedApiUrl);
export const SERVER_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');
