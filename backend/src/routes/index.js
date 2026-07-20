import { Router } from 'express';

import { requireAuth } from '../middleware/auth.js';
import { requireCategoryModule } from '../middleware/requireCategoryModule.js';
import { requirePlatformOwner } from '../middleware/requirePlatformOwner.js';
import { adminRouter } from '../modules/admin/routes.js';
import { aiRouter } from '../modules/ai/routes.js';
import { authRouter } from '../modules/auth/routes.js';
import { dashboardRouter } from '../modules/dashboard/routes.js';
import { hospitalRouter } from '../modules/hospital/routes.js';
import { platformAdminRouter } from '../modules/platform-admin/routes.js';
import { accountingRouter } from '../modules/retail/accounting/routes.js';
import { crmRouter } from '../modules/retail/crm/routes.js';
import { gstRouter } from '../modules/retail/gst/routes.js';
import { hrPayrollRouter } from '../modules/retail/hr-payroll/routes.js';
import { inventoryRouter } from '../modules/retail/inventory/routes.js';
import { moreModulesRouter } from '../modules/retail/more-modules/routes.js';
import { salesRouter } from '../modules/retail/sales/routes.js';
import { searchRouter } from '../modules/search/routes.js';
import { settingsRouter } from '../modules/settings/routes.js';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/admin', adminRouter);

apiRouter.use(requireAuth);

apiRouter.use('/ai', aiRouter);
apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/sales', requireCategoryModule('sales'), salesRouter);
apiRouter.use('/gst', gstRouter);
apiRouter.use('/accounting', accountingRouter);
apiRouter.use('/crm', crmRouter);
apiRouter.use('/inventory', inventoryRouter);
apiRouter.use('/hospital', requireCategoryModule('hospital'), hospitalRouter);
apiRouter.use('/hr-payroll', hrPayrollRouter);
apiRouter.use('/more-modules', moreModulesRouter);
apiRouter.use('/settings', settingsRouter);
apiRouter.use('/search', searchRouter);
apiRouter.use('/platform-admin', requirePlatformOwner, platformAdminRouter);
