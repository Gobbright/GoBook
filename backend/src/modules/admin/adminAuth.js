import jwt from 'jsonwebtoken';

import { env } from '../../config/env.js';
import { httpError } from '../../utils/httpError.js';

export function signAdminToken() {
  return jwt.sign(
    { sub: env.adminLoginId, scope: 'admin-panel' },
    env.jwtSecret,
    { expiresIn: env.adminJwtExpiresIn },
  );
}

export function requireAdminAuth(req, _res, next) {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(httpError(401, 'Admin authentication required'));
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    if (payload.scope !== 'admin-panel' || payload.sub !== env.adminLoginId) {
      return next(httpError(403, 'Admin access denied'));
    }
    req.admin = { id: payload.sub };
    next();
  } catch {
    next(httpError(401, 'Invalid or expired admin token'));
  }
}