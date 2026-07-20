import { Router } from 'express';

import { createCustomer, deleteCustomer, importCustomers, listCustomers, updateCustomer } from './customerController.js';
import { createFollowUp, deleteFollowUp, listFollowUps, updateFollowUp } from './followUpController.js';
import { createLead, deleteLead, importLeads, listLeads, updateLead } from './leadController.js';
import { getLifecycle } from './lifecycleController.js';
import { uploadExcelFile } from '../../../utils/excelImport.js';

export const crmRouter = Router();

// Customers
crmRouter.get('/customers',      listCustomers);
crmRouter.post('/customers/import', uploadExcelFile.single('file'), importCustomers);
crmRouter.post('/customers',     createCustomer);
crmRouter.put('/customers/:id',  updateCustomer);
crmRouter.delete('/customers/:id', deleteCustomer);

// Leads
crmRouter.get('/leads',      listLeads);
crmRouter.post('/leads/import', uploadExcelFile.single('file'), importLeads);
crmRouter.post('/leads',     createLead);
crmRouter.put('/leads/:id',  updateLead);
crmRouter.delete('/leads/:id', deleteLead);

// Follow-ups
crmRouter.get('/follow-ups',      listFollowUps);
crmRouter.post('/follow-ups',     createFollowUp);
crmRouter.put('/follow-ups/:id',  updateFollowUp);
crmRouter.delete('/follow-ups/:id', deleteFollowUp);

// Lifecycle
crmRouter.get('/lifecycle', getLifecycle);
