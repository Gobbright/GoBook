import jwt from 'jsonwebtoken';

import { env } from '../../config/env.js';
import { AppUser } from '../../models/AppUser.js';
import { httpError } from '../../utils/httpError.js';

export function signAdminToken(adminId, options = {}) {
  return jwt.sign(
    { sub: adminId, scope: 'admin-panel', ...options },
    env.jwtSecret,
    { expiresIn: env.adminJwtExpiresIn },
  );
}

export async function requireAdminAuth(req, _res, next) {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(httpError(401, 'Admin authentication required'));
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const envAdmin = env.adminAccounts.some((account) => account.id.toLowerCase() === String(payload.sub || '').toLowerCase());
    if (!envAdmin) {
      const user = await AppUser.findById(payload.sub).select('isPlatformOwner status').lean();
      if (!user?.isPlatformOwner || user.status !== 'Active') {
        return next(httpError(403, 'Admin access denied'));
      }
    } else if (payload.scope !== 'admin-panel') {
      return next(httpError(403, 'Admin access denied'));
    }
    req.admin = { id: payload.sub };
    next();
  } catch {
    next(httpError(401, 'Invalid or expired admin token'));
  }
}
