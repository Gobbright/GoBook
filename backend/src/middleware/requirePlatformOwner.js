import { AppUser } from '../models/AppUser.js';
import { httpError } from '../utils/httpError.js';

// Re-checks the platform-owner flag against the database on every request
// (rather than trusting the JWT), so revoking it takes effect immediately.
// Returns 404 rather than 403 so this area doesn't reveal its own existence.
export async function requirePlatformOwner(req, _res, next) {
  try {
    const user = await AppUser.findById(req.user.id).select('isPlatformOwner').lean();
    if (!user?.isPlatformOwner) {
      return next(httpError(404, 'Not found'));
    }
    next();
  } catch (err) {
    next(err);
  }
}
