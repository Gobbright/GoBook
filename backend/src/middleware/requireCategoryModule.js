import { EXCLUSIVE_MODULES_BY_CATEGORY } from '../constants/categories.js';
import { httpError } from '../utils/httpError.js';

// Blocks access to modules that are exclusive to certain categories (e.g. Sales/Inventory
// are Retail-only). Modules not listed in EXCLUSIVE_MODULES_BY_CATEGORY are common to all
// categories and don't need this guard.
export function requireCategoryModule(moduleKey) {
  return function (req, _res, next) {
    const allowed = EXCLUSIVE_MODULES_BY_CATEGORY[req.user.category] || [];
    if (!allowed.includes(moduleKey)) {
      return next(httpError(404, 'Not found'));
    }
    next();
  };
}
