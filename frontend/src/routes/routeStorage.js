export const SESSION_KEY = 'gobook.lastRoute';
export const AUTH_PATHS = new Set([
  '/login',
  '/register',
  '/forgot-password',
  '/onboarding',
  '/verify-email',
  '/payment',
  '/payment-method-verification',
]);

export function normalizeStoredPath(path) {
  if (!path || path === '/') return '/dashboard';
  if (path.startsWith('#/')) return path.slice(1);
  return path.startsWith('/') ? path : `/${path}`;
}

export function getLastRoute() {
  const path = normalizeStoredPath(sessionStorage.getItem(SESSION_KEY));
  return AUTH_PATHS.has(path) ? '/dashboard' : path;
}

