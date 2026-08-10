import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';
import { httpError } from '../utils/httpError.js';
import { auditContext } from '../services/auditContext.js';

const TENANT_OWNERSHIP_FIELDS = ['userId', 'businessId'];
const TENANT_MUTATION_OPERATORS = ['$set', '$setOnInsert', '$unset', '$rename'];

export function stripTenantOwnershipFields(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return;

  for (const field of TENANT_OWNERSHIP_FIELDS) {
    delete body[field];
  }

  for (const operator of TENANT_MUTATION_OPERATORS) {
    const payload = body[operator];
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) continue;
    for (const field of TENANT_OWNERSHIP_FIELDS) {
      delete payload[field];
    }
  }
}

export function requireAuth(req, _res, next) {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(httpError(401, 'Authentication required'));
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    stripTenantOwnershipFields(req.body);

    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      businessId: payload.businessId,
      category: payload.category || 'retail',
    };
    // Scope the actor for the rest of this request's async chain so the
    // global audit plugin can attribute writes without req.user being
    // threaded through every controller/service call.
    auditContext.run(
      { userId: req.user.id, email: req.user.email, businessId: req.user.businessId },
      next,
    );
  } catch {
    next(httpError(401, 'Invalid or expired token'));
  }
}
