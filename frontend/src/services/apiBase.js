const DEFAULT_API_URL = 'http://localhost:5000/api';

function normalizeApiUrl(url) {
  const normalized = url.replace(/\/+$/, '');
  return /\/api$/i.test(normalized) ? normalized : `${normalized}/api`;
}

const configuredApiUrl = import.meta.env.VITE_API_URL;
const fallbackApiUrl = DEFAULT_API_URL;
const resolvedApiUrl = configuredApiUrl || fallbackApiUrl;

export const API_BASE_URL = normalizeApiUrl(resolvedApiUrl);
export const SERVER_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');
