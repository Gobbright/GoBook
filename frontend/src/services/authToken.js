const TOKEN_KEY = 'gobook.token';
const USER_KEY = 'gobook.user';
const LAST_ROUTE_KEY = 'gobook.lastRoute';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  try {
    const user = JSON.parse(localStorage.getItem(USER_KEY));
    return user && typeof user === 'object' ? user : null;
  } catch {
    return null;
  }
}

export function setSession(token, user) {
  if (!token || !user) return;
  const normalizedUser = { ...user, id: user.id ?? user._id };
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(normalizedUser));
}

export function clearSession({ preserveUser = false, preserveRoute = false } = {}) {
  localStorage.removeItem(TOKEN_KEY);
  if (!preserveUser) localStorage.removeItem(USER_KEY);
  if (!preserveRoute) sessionStorage.removeItem(LAST_ROUTE_KEY);
}

export function expireSession() {
  clearSession({ preserveUser: true, preserveRoute: true });
}

export function isAuthenticated() {
  return Boolean(getToken());
}
