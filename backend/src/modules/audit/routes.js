import { Router } from 'express';

import { listAuditLogs, listAuditModelNames } from './auditController.js';

export const auditRouter = Router();

auditRouter.get('/', listAuditLogs);
auditRouter.get('/models', listAuditModelNames);
