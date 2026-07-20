import { Router } from 'express';

import { getAdminDashboard, loginAdmin } from './adminController.js';
import { requireAdminAuth } from './adminAuth.js';

export const adminRouter = Router();

adminRouter.post('/login', loginAdmin);
adminRouter.get('/dashboard', requireAdminAuth, getAdminDashboard);