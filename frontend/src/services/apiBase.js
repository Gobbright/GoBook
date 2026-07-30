const DEFAULT_API_URL = 'http://localhost:5000/api';

function normalizeApiUrl(url) {
  return url.replace(/\/+$/, '');
}

const configuredApiUrl = import.meta.env.VITE_API_URL;
const resolvedApiUrl = configuredApiUrl || DEFAULT_API_URL;

export const API_BASE_URL = normalizeApiUrl(resolvedApiUrl);
export const SERVER_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');