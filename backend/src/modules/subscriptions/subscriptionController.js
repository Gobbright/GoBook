import { CATEGORIES } from '../../constants/categories.js';
import { SubscriptionPayment } from '../../models/SubscriptionPayment.js';
import { completePaidSignup } from '../../services/registrationPayments.js';
import { fetchRazorpayOrder, fetchRazorpayPayment, verifyCheckoutSignature, verifyWebhookSignature } from '../../services/razorpay.js';
import { getPlansForCategory, planPublicView } from '../../services/subscriptionPlans.js';
import { httpError } from '../../utils/httpError.js';
import { signToken, toSafeUser } from '../auth/authController.js';

export async function getPublicPlans(req, res, next) {
  try {
    const category = String(req.query.category || '').trim().toLowerCase();
    if (!CATEGORIES.includes(category)) return next(httpError(400, 'Select a valid business category'));
    const plans = await getPlansForCategory(category);
    res.json({ category, plans: plans.map(planPublicView) });
  } catch (error) {
    next(error);
  }
}

async function assertCapturedPayment(transaction, paymentId) {
  const [payment, order] = await Promise.all([
    fetchRazorpayPayment(paymentId),
    fetchRazorpayOrder(transaction.razorpayOrderId),
  ]);
  const valid = payment.id === paymentId
    && payment.order_id === transaction.razorpayOrderId
    && payment.status === 'captured'
    && Number(payment.amount) === transaction.amountPaise
    && payment.currency === transaction.currency
    && order.id === transaction.razorpayOrderId
    && order.status === 'paid'
    && Number(order.amount_paid) === transaction.amountPaise;
  if (!valid) throw httpError(400, 'Payment is not captured for the expected order amount');
  return payment;
}

export async function verifyRegistrationPayment(req, res, next) {
  try {
    const orderId = String(req.body.razorpay_order_id || '').trim();
    const paymentId = String(req.body.razorpay_payment_id || '').trim();
    const signature = String(req.body.razorpay_signature || '').trim();
    if (!orderId || !paymentId || !signature) return next(httpError(400, 'Complete payment verification details are required'));

    const transaction = await SubscriptionPayment.findOne({ razorpayOrderId: orderId });
    if (!transaction) return next(httpError(404, 'Payment order not found'));
    if (!verifyCheckoutSignature({ orderId: transaction.razorpayOrderId, paymentId, signature })) {
      return next(httpError(400, 'Payment signature verification failed'));
    }

    const payment = await assertCapturedPayment(transaction, paymentId);
    const user = await completePaidSignup(transaction, payment, signature);
    res.status(201).json({ token: signToken(user), user: toSafeUser(user), message: 'Payment verified and account created' });
  } catch (error) {
    next(error);
  }
}

export async function recordRegistrationPaymentFailure(req, res, next) {
  try {
    const orderId = String(req.body.orderId || '').trim();
    if (!orderId) return next(httpError(400, 'Order ID is required'));
    const error = req.body.error || {};
    await SubscriptionPayment.updateOne(
      { razorpayOrderId: orderId, status: 'pending' },
      { $set: { status: 'failed', errorCode: String(error.code || '').slice(0, 100), errorDescription: String(error.description || 'Payment failed').slice(0, 500), failedAt: new Date() } },
    );
    res.json({ recorded: true });
  } catch (error) {
    next(error);
  }
}

export async function razorpayWebhook(req, res, next) {
  try {
    const rawBody = req.rawBody;
    const signature = String(req.get('x-razorpay-signature') || '');
    if (!rawBody || !verifyWebhookSignature(rawBody, signature)) return next(httpError(400, 'Invalid webhook signature'));

    const eventId = String(req.get('x-razorpay-event-id') || '');
    const event = req.body?.event;
    const payment = req.body?.payload?.payment?.entity;
    const order = req.body?.payload?.order?.entity;
    const orderId = payment?.order_id || order?.id || '';
    if (!orderId) return res.json({ received: true });

    const transaction = await SubscriptionPayment.findOne({ razorpayOrderId: orderId });
    if (!transaction || (eventId && transaction.webhookEventIds.includes(eventId))) return res.json({ received: true });
    if (eventId) transaction.webhookEventIds.addToSet(eventId);

    if (event === 'payment.failed') {
      transaction.status = transaction.status === 'successful' ? 'successful' : 'failed';
      transaction.razorpayPaymentId = payment?.id || transaction.razorpayPaymentId;
      transaction.errorCode = payment?.error_code || '';
      transaction.errorDescription = payment?.error_description || '';
      transaction.failedAt = new Date();
      await transaction.save();
      return res.json({ received: true });
    }

    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentId = payment?.id || transaction.razorpayPaymentId;
      if (paymentId) {
        const verifiedPayment = await assertCapturedPayment(transaction, paymentId);
        await transaction.save();
        await completePaidSignup(transaction, verifiedPayment);
      }
    } else {
      await transaction.save();
    }
    res.json({ received: true });
  } catch (error) {
    next(error);
  }
}
