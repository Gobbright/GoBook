export const SESSION_KEY = 'gobook.lastRoute';
export const AUTH_PATHS = new Set(['/login', '/register', '/forgot-password']);

export function normalizeStoredPath(path) {
  if (!path || path === '/') return '/dashboard';
  return path.startsWith('/') ? path : `/${path}`;
}

export function getLastRoute() {
  return normalizeStoredPath(sessionStorage.getItem(SESSION_KEY));
}

