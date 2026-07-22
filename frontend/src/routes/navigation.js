export function normalizeAppPath(path = '/') {
  const value = String(path || '/').trim();
  if (!value || value === '#') return '/dashboard';
  if (value.startsWith('#/')) return value.slice(1);
  if (value.startsWith('#')) return `/${value.slice(1)}`;
  return value.startsWith('/') ? value : `/${value}`;
}

export function currentAppPath() {
  return `${window.location.pathname || '/'}${window.location.search || ''}`;
}

export function redirectTo(path, { replace = false } = {}) {
  const target = normalizeAppPath(path);
  if (replace) window.location.replace(target);
  else window.location.assign(target);
}

export function safeNavigate(navigate, path, options) {
  navigate(normalizeAppPath(path), options);
}
