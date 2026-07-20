import { Router } from 'express';

import { getStats, listBusinesses, listUsers } from './platformAdminController.js';

export const platformAdminRouter = Router();

platformAdminRouter.get('/stats',     getStats);
platformAdminRouter.get('/businesses', listBusinesses);
platformAdminRouter.get('/users',     listUsers);
