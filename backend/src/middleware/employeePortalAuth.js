import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';
import { httpError } from '../utils/httpError.js';

function portalUserFromPayload(payload) {
  return {
    id: payload.sub,
    ownerUserId: payload.ownerUserId,
    employeeObjectId: payload.employeeObjectId,
    employeeId: payload.employeeId,
    email: payload.email,
    name: payload.name,
    role: payload.role,
    category: payload.category || '',
  };
}

export function requireEmployeePortalAuth(req, _res, next) {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) return next(httpError(401, 'Employee portal authentication required'));

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    if (payload.scope !== 'employee-portal') return next(httpError(403, 'Employee portal access denied'));
    req.employeeUser = portalUserFromPayload(payload);
    next();
  } catch {
    next(httpError(401, 'Invalid or expired employee portal token'));
  }
}

export function requireEmployeeManagementAdminAuth(req, _res, next) {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) return next(httpError(401, 'Employee management authentication required'));

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    if (payload.scope === 'employee-portal') {
      if (!['admin', 'hr'].includes(payload.role)) {
        return next(httpError(403, 'Employee management access denied'));
      }
      req.employeeUser = portalUserFromPayload(payload);
      next();
      return;
    }

    if (!payload.sub) return next(httpError(403, 'Employee management access denied'));
    req.employeeUser = {
      id: payload.sub,
      ownerUserId: payload.sub,
      employeeObjectId: '',
      employeeId: '',
      email: payload.email || '',
      name: payload.name || payload.email || 'Admin',
      role: 'admin',
      category: payload.category || 'retail',
    };
    next();
  } catch {
    next(httpError(401, 'Invalid or expired employee management token'));
  }
}

export function requireEmployeePortalRole(...roles) {
  return (req, _res, next) => {
    if (!req.employeeUser || !roles.includes(req.employeeUser.role)) {
      return next(httpError(403, 'You do not have access to this employee portal resource'));
    }
    next();
  };
}
