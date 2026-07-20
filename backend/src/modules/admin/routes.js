import { Router } from 'express';

import { createAdminRecord, deleteAdminRecord, deleteAdminSectionRow, getAdminDashboard, getAdminRecords, getAdminSection, getAdminStats, loginAdmin, updateAdminRecord, updateAdminSectionRow } from './adminController.js';
import { requireAdminAuth } from './adminAuth.js';

export const adminRouter = Router();

adminRouter.post('/login', loginAdmin);
adminRouter.get('/dashboard', requireAdminAuth, getAdminDashboard);
adminRouter.get('/stats', requireAdminAuth, getAdminStats);
adminRouter.get('/section/users', requireAdminAuth, (req, res, next) => { req.params.section = 'users'; return getAdminSection(req, res, next); });
adminRouter.get('/section/:section', requireAdminAuth, getAdminSection);
adminRouter.put('/section/:section/:id', requireAdminAuth, updateAdminSectionRow);
adminRouter.delete('/section/:section/:id', requireAdminAuth, deleteAdminSectionRow);
adminRouter.get('/records/:kind', requireAdminAuth, getAdminRecords);
adminRouter.post('/records/:kind', requireAdminAuth, createAdminRecord);
adminRouter.put('/records/:kind/:id', requireAdminAuth, updateAdminRecord);
adminRouter.delete('/records/:kind/:id', requireAdminAuth, deleteAdminRecord);


