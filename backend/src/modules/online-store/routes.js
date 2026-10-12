import { Router } from 'express';

import {
  createPublicOrder,
  getPublicStore,
  getPublicProduct,
  getOnlineStoreReports,
  getStoreSettings,
  listOnlineOrders,
  listStoreProducts,
  updateOnlineOrderStatus,
  updateStoreProduct,
  updateStoreSettings,
} from './onlineStoreController.js';

export const onlineStoreRouter = Router();
export const publicOnlineStoreRouter = Router();

onlineStoreRouter.get('/settings', getStoreSettings);
onlineStoreRouter.put('/settings', updateStoreSettings);
onlineStoreRouter.get('/products', listStoreProducts);
onlineStoreRouter.put('/products/:id', updateStoreProduct);
onlineStoreRouter.get('/orders', listOnlineOrders);
onlineStoreRouter.patch('/orders/:id/status', updateOnlineOrderStatus);
onlineStoreRouter.get('/reports', getOnlineStoreReports);

publicOnlineStoreRouter.get('/:slug', getPublicStore);
publicOnlineStoreRouter.get('/:slug/products/:productId', getPublicProduct);
publicOnlineStoreRouter.post('/:slug/orders', createPublicOrder);
