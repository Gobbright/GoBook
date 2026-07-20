import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';
import { httpError } from '../utils/httpError.js';

export function requireAuth(req, _res, next) {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(httpError(401, 'Authentication required'));
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      businessId: payload.businessId,
      category: payload.category || 'retail',
    };
    next();
  } catch {
    next(httpError(401, 'Invalid or expired token'));
  }
}
