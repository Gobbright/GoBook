import { Router } from 'express';

import {
  createCustomer,
  getCollectionEntry,
  getDashboard,
  getReminders,
  getReports,
  listCustomers,
  updateCustomer,
  updateCustomerStatus,
  upsertCollection,
} from './financeController.js';

export const financeRouter = Router();

financeRouter.get('/dashboard', getDashboard);
financeRouter.get('/customers', listCustomers);
financeRouter.post('/customers', createCustomer);
financeRouter.put('/customers/:id', updateCustomer);
financeRouter.patch('/customers/:id/status', updateCustomerStatus);
financeRouter.get('/collections', getCollectionEntry);
financeRouter.put('/collections/:customerId', upsertCollection);
financeRouter.get('/reminders', getReminders);
financeRouter.get('/reports', getReports);


