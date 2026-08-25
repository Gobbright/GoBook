import { httpError } from '../utils/httpError.js';

function isSuperAdmin(user = {}) {
  return user.isSuperAdmin || user.accountType === 'owner' || user.role === 'Super Admin';
}

export function requireModuleAccess(...moduleKeys) {
  return (req, _res, next) => {
    if (isSuperAdmin(req.user)) return next();
    const modules = Array.isArray(req.user?.permissions?.modules) ? req.user.permissions.modules : [];
    if (moduleKeys.some((key) => modules.includes(key))) return next();
    return next(httpError(403, 'You do not have access to this module'));
  };
}

