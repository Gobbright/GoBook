import { Router } from 'express';

import { getDashboardSummary } from './dashboardController.js';

export const dashboardRouter = Router();

dashboardRouter.get('/summary', getDashboardSummary);
