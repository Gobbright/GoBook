import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import {
  createCurrentUserPaymentOrder,
  getPublicPlans,
  razorpayWebhook,
  recordRegistrationPaymentFailure,
  verifyCurrentUserPayment,
  verifyRegistrationPayment,
} from './subscriptionController.js';

export const subscriptionRouter = Router();
subscriptionRouter.get('/plans', getPublicPlans);
subscriptionRouter.post('/payment-order', requireAuth, createCurrentUserPaymentOrder);
subscriptionRouter.post('/verify-payment', requireAuth, verifyCurrentUserPayment);
subscriptionRouter.post('/verify-registration-payment', verifyRegistrationPayment);
subscriptionRouter.post('/registration-payment-failed', recordRegistrationPaymentFailure);
subscriptionRouter.post('/razorpay/webhook', razorpayWebhook);
