const LOCAL_API_URL = 'http://localhost:5000/api';
const PRODUCTION_API_URL = 'https://api.gobooksuite.com/api';

function isProductionHost() {
  if (typeof window === 'undefined') return false;
  return ['gobooksuite.com', 'www.gobooksuite.com', 'employee.gobooksuite.com'].includes(
    window.location.hostname,
  );
}

function isLocalApiUrl(url) {
  try {
    return ['localhost', '127.0.0.1'].includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

function normalizeApiUrl(url) {
  return url.replace(/\/+$/, '');
}

const configuredApiUrl = import.meta.env.VITE_API_URL;
const resolvedApiUrl = isProductionHost() && (!configuredApiUrl || isLocalApiUrl(configuredApiUrl))
  ? PRODUCTION_API_URL
  : configuredApiUrl || LOCAL_API_URL;

export const API_BASE_URL = normalizeApiUrl(resolvedApiUrl);
export const SERVER_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');
