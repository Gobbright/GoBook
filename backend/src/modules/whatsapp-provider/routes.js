import { Router } from 'express';
import { addNumber, connectAccount, createGroup, createMessage, getOverview, getProfile, listCustomers, rotateCredentials, saveProfile, saveWebhook, verifyNumber } from './controller.js';

export const whatsAppProviderRouter = Router();
whatsAppProviderRouter.get('/overview', getOverview);
whatsAppProviderRouter.get('/profile', getProfile);
whatsAppProviderRouter.put('/profile', saveProfile);
whatsAppProviderRouter.post('/accounts', connectAccount);
whatsAppProviderRouter.post('/numbers', addNumber);
whatsAppProviderRouter.post('/numbers/:numberId/verify', verifyNumber);
whatsAppProviderRouter.post('/credentials/rotate', rotateCredentials);
whatsAppProviderRouter.put('/webhook', saveWebhook);
whatsAppProviderRouter.get('/customers', listCustomers);
whatsAppProviderRouter.post('/contact-groups', createGroup);
whatsAppProviderRouter.post('/messages', createMessage);
