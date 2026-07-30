import { Router } from 'express';

import { createCampaign as createEmailCampaign, deleteCampaign as deleteEmailCampaign, listCampaigns as listEmailCampaigns, sendCampaignNow, updateCampaign as updateEmailCampaign } from './emailController.js';
import { getAiInsights, getReportsSummary } from './insightsController.js';
import { createSalesRecord, deleteSalesRecord, getNextNumber, listSalesRecords, updateSalesRecord } from './salesRecordController.js';
import { createVendor, deleteVendor, importVendors, listVendors, updateVendor } from './vendorController.js';
import { createCampaign as createWACampaign, deleteCampaign as deleteWACampaign, listCampaigns as listWACampaigns, updateCampaign as updateWACampaign } from './whatsappController.js';
import { uploadExcelFile } from '../../../utils/excelImport.js';

export const moreModulesRouter = Router();

// Vendors
moreModulesRouter.get('/vendors',      listVendors);
moreModulesRouter.post('/vendors/import', uploadExcelFile.single('file'), importVendors);
moreModulesRouter.post('/vendors',     createVendor);
moreModulesRouter.put('/vendors/:id',  updateVendor);
moreModulesRouter.delete('/vendors/:id', deleteVendor);

// WhatsApp Campaigns
moreModulesRouter.get('/whatsapp-campaigns',      listWACampaigns);
moreModulesRouter.post('/whatsapp-campaigns',     createWACampaign);
moreModulesRouter.put('/whatsapp-campaigns/:id',  updateWACampaign);
moreModulesRouter.delete('/whatsapp-campaigns/:id', deleteWACampaign);

// Email Campaigns
moreModulesRouter.get('/email-campaigns',      listEmailCampaigns);
moreModulesRouter.post('/email-campaigns',     createEmailCampaign);
moreModulesRouter.put('/email-campaigns/:id',  updateEmailCampaign);
moreModulesRouter.delete('/email-campaigns/:id', deleteEmailCampaign);
moreModulesRouter.post('/email-campaigns/:id/send', sendCampaignNow);

// Sales Records (quotations, orders, invoices)
moreModulesRouter.get('/sales-records/next-number', getNextNumber);
moreModulesRouter.get('/sales-records',      listSalesRecords);
moreModulesRouter.post('/sales-records',     createSalesRecord);
moreModulesRouter.put('/sales-records/:id',  updateSalesRecord);
moreModulesRouter.delete('/sales-records/:id', deleteSalesRecord);

// AI Assistant / Reports insights
moreModulesRouter.get('/ai-insights',     getAiInsights);
moreModulesRouter.get('/reports-summary', getReportsSummary);
