import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import {
  createPaymentMethodVerificationOrder,
  createCurrentUserPaymentOrder,
  downloadCurrentUserSubscriptionReceipt,
  getCurrentUserSubscriptionReceipts,
  getPublicPlans,
  razorpayWebhook,
  recordRegistrationPaymentFailure,
  verifyCurrentUserPayment,
  verifyPaymentMethod,
  verifyRegistrationPayment,
} from './subscriptionController.js';

export const subscriptionRouter = Router();
subscriptionRouter.get('/plans', getPublicPlans);
subscriptionRouter.get('/receipts', requireAuth, getCurrentUserSubscriptionReceipts);
subscriptionRouter.get('/receipts/:paymentId/download', requireAuth, downloadCurrentUserSubscriptionReceipt);
subscriptionRouter.post('/payment-order', requireAuth, createCurrentUserPaymentOrder);
subscriptionRouter.post('/payment-method-verification/order', requireAuth, createPaymentMethodVerificationOrder);
subscriptionRouter.post('/payment-method-verification/verify', requireAuth, verifyPaymentMethod);
subscriptionRouter.post('/verify-payment', requireAuth, verifyCurrentUserPayment);
subscriptionRouter.post('/verify-registration-payment', verifyRegistrationPayment);
subscriptionRouter.post('/registration-payment-failed', recordRegistrationPaymentFailure);
subscriptionRouter.post('/razorpay/webhook', razorpayWebhook);
