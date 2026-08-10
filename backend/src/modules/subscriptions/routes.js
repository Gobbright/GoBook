import { Router } from 'express';
import { getPublicPlans, razorpayWebhook, recordRegistrationPaymentFailure, verifyRegistrationPayment } from './subscriptionController.js';

export const subscriptionRouter = Router();
subscriptionRouter.get('/plans', getPublicPlans);
subscriptionRouter.post('/verify-registration-payment', verifyRegistrationPayment);
subscriptionRouter.post('/registration-payment-failed', recordRegistrationPaymentFailure);
subscriptionRouter.post('/razorpay/webhook', razorpayWebhook);
