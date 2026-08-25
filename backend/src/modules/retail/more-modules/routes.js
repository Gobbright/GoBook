import { Router } from 'express';

import { createCampaign as createEmailCampaign, deleteCampaign as deleteEmailCampaign, listCampaigns as listEmailCampaigns, sendCampaignNow, updateCampaign as updateEmailCampaign } from './emailController.js';
import { downloadReport, getAiInsights, getReportRecords, getReportsSummary } from './insightsController.js';
import { createSalesRecord, deleteSalesRecord, getNextNumber, listSalesRecords, updateSalesRecord } from './salesRecordController.js';
import { createVendor, deleteVendor, importVendors, listVendors, updateVendor } from './vendorController.js';
import { createCampaign as createWACampaign, deleteCampaign as deleteWACampaign, listCampaigns as listWACampaigns, updateCampaign as updateWACampaign } from './whatsappController.js';
import { createTemplate as createWATemplate, deleteTemplate as deleteWATemplate, duplicateTemplate as duplicateWATemplate, listTemplates as listWATemplates, updateTemplate as updateWATemplate } from './templateController.js';
import { createAutomation as createWAAutomation, deleteAutomation as deleteWAAutomation, duplicateAutomation as duplicateWAAutomation, listAutomations as listWAAutomations, updateAutomation as updateWAAutomation } from './automationController.js';
import { createChatbot as createWAChatbot, deleteChatbot as deleteWAChatbot, duplicateChatbot as duplicateWAChatbot, listChatbots as listWAChatbots, updateChatbot as updateWAChatbot } from './chatbotController.js';
import { createFlow as createWAFlow, deleteFlow as deleteWAFlow, duplicateFlow as duplicateWAFlow, listFlows as listWAFlows, updateFlow as updateWAFlow } from './flowController.js';
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

// WhatsApp Templates
moreModulesRouter.get('/whatsapp-templates',      listWATemplates);
moreModulesRouter.post('/whatsapp-templates',     createWATemplate);
moreModulesRouter.put('/whatsapp-templates/:id',  updateWATemplate);
moreModulesRouter.post('/whatsapp-templates/:id/duplicate', duplicateWATemplate);
moreModulesRouter.delete('/whatsapp-templates/:id', deleteWATemplate);

// WhatsApp Automations
moreModulesRouter.get('/whatsapp-automations',      listWAAutomations);
moreModulesRouter.post('/whatsapp-automations',     createWAAutomation);
moreModulesRouter.put('/whatsapp-automations/:id',  updateWAAutomation);
moreModulesRouter.post('/whatsapp-automations/:id/duplicate', duplicateWAAutomation);
moreModulesRouter.delete('/whatsapp-automations/:id', deleteWAAutomation);

// WhatsApp Chatbots
moreModulesRouter.get('/whatsapp-chatbots',      listWAChatbots);
moreModulesRouter.post('/whatsapp-chatbots',     createWAChatbot);
moreModulesRouter.put('/whatsapp-chatbots/:id',  updateWAChatbot);
moreModulesRouter.post('/whatsapp-chatbots/:id/duplicate', duplicateWAChatbot);
moreModulesRouter.delete('/whatsapp-chatbots/:id', deleteWAChatbot);

// WhatsApp Flows
moreModulesRouter.get('/whatsapp-flows',      listWAFlows);
moreModulesRouter.post('/whatsapp-flows',     createWAFlow);
moreModulesRouter.put('/whatsapp-flows/:id',  updateWAFlow);
moreModulesRouter.post('/whatsapp-flows/:id/duplicate', duplicateWAFlow);
moreModulesRouter.delete('/whatsapp-flows/:id', deleteWAFlow);

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
moreModulesRouter.get('/reports-records', getReportRecords);
moreModulesRouter.get('/reports-download', downloadReport);
