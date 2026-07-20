const LOCAL_API_URL = 'http://localhost:5000/api';
const PRODUCTION_API_URL = 'https://api-gobook.gobrightglobal.com/api';

function isProductionHost() {
  if (typeof window === 'undefined') return false;
  return ['gobook.gobrightglobal.com', 'www.gobook.gobrightglobal.com'].includes(window.location.hostname);
}

function normalizeApiUrl(url) {
  return url.replace(/\/+$/, '');
}

export const API_BASE_URL = normalizeApiUrl(
  import.meta.env.VITE_API_URL || (isProductionHost() ? PRODUCTION_API_URL : LOCAL_API_URL),
);

export const SERVER_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');
