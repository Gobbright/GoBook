import { CATEGORIES } from '../../constants/categories.js';
import { env } from '../../config/env.js';
import { AppUser } from '../../models/AppUser.js';
import { BusinessSettings } from '../../models/BusinessSettings.js';
import { SubscriptionPayment } from '../../models/SubscriptionPayment.js';
import { createAdminNotification } from '../../services/adminNotifications.js';
import { RazorpayWebhookEvent } from '../../models/RazorpayWebhookEvent.js';
import { completePaidSignup } from '../../services/registrationPayments.js';
import { createRazorpayCustomer, createRazorpayOrder, createRazorpayRefund, fetchRazorpayOrder, fetchRazorpayPayment, isRazorpayPaymentsEnabled, verifyCheckoutSignature, verifyWebhookSignature } from '../../services/razorpay.js';
import { sendSubscriptionInvoice } from '../../services/subscriptionInvoice.js';
import { ensureSubscriptionInvoicePdf } from '../../services/subscriptionInvoice.js';
import { getActivePlan, getPlansForCategory, planPublicView } from '../../services/subscriptionPlans.js';
import { TRIAL_DAYS, trialEndDate } from '../../services/trialWindow.js';
import { findStoredFile, pipeStoredFile, safeFilename } from '../../services/gridfsStorage.js';
import { createLoginSession } from '../../services/appSessions.js';
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

export async function getCurrentUserSubscriptionReceipts(req, res, next) {
  try {
    const payments = await SubscriptionPayment.find({
      userId: req.user.id,
      purpose: 'subscription',
      status: 'successful',
    })
      .sort({ paidAt: -1, createdAt: -1 })
      .select('invoiceNumber invoicePdfFileId planName tier amount currency paidAt createdAt subscriptionExpiresAt')
      .lean();

    res.json({
      receipts: payments.map((payment) => ({
        id: payment._id,
        invoiceNumber: payment.invoiceNumber || '',
        planName: payment.planName || payment.tier || 'Subscription',
        amount: payment.amount,
        currency: payment.currency,
        paidAt: payment.paidAt || payment.createdAt,
        downloadUrl: `/subscriptions/receipts/${payment._id}/download`,
        ready: Boolean(payment.invoicePdfFileId),
      })),
    });
  } catch (error) {
    next(error);
  }
}

export async function downloadCurrentUserSubscriptionReceipt(req, res, next) {
  try {
    const payment = await SubscriptionPayment.findOne({
      _id: req.params.paymentId,
      userId: req.user.id,
      purpose: 'subscription',
      status: 'successful',
    });
    if (!payment) return next(httpError(404, 'Subscription receipt not found'));

    const ensured = await ensureSubscriptionInvoicePdf(payment._id);
    const file = await findStoredFile(ensured.invoicePdfFileId, { 'metadata.userId': ensured.userId });
    if (!file) return next(httpError(404, 'Receipt PDF is not available'));

    res.setHeader('Content-Type', file.contentType || 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename(file.filename || `${ensured.invoiceNumber || 'subscription-receipt'}.pdf`)}"`);
    return pipeStoredFile(file._id, res);
  } catch (error) {
    next(error);
  }
}


const VERIFICATION_ORDER_TTL_MS = 30 * 60 * 1000;

function verificationAmountPaise() {
  const value = Number(env.razorpay.verificationAmountPaise);
  // Razorpay Orders do not support a zero-value payment. ?1 is the minimum
  // supported authorization used here and is immediately refunded after capture.
  return Number.isInteger(value) && value >= 100 ? value : 100;
}

function verificationCheckout(transaction, user) {
  return {
    keyId: env.razorpay.keyId,
    orderId: transaction.razorpayOrderId,
    amount: transaction.amountPaise,
    currency: transaction.currency,
    purpose: 'payment_method_verification',
    displayAmount: transaction.amount,
    planName: 'Payment method verification',
    prefill: { name: user.name, email: user.email, contact: user.phone },
  };
}

async function claimVerificationTransaction(transaction, paymentData = {}, signature = '') {
  const claimed = await SubscriptionPayment.findOneAndUpdate(
    { _id: transaction._id, purpose: 'payment_method_verification', status: { $in: ['pending', 'failed'] } },
    { $set: { status: 'processing', razorpayPaymentId: paymentData.id || '', razorpaySignature: signature } },
    { new: true },
  );
  if (claimed) return claimed;
  const completed = await SubscriptionPayment.findById(transaction._id);
  if (completed?.status === 'successful' && completed.userId) return completed;
  throw httpError(409, 'Payment verification is already being processed. Please try again shortly.');
}

async function activateTrialAfterVerification(transaction, paymentData = {}, signature = '') {
  const claimed = await claimVerificationTransaction(transaction, paymentData, signature);
  const existing = await AppUser.findById(claimed.userId);
  if (!existing) throw httpError(404, 'User not found for payment verification');
  if (claimed.status === 'successful') return existing;

  try {
    let customerId = existing.razorpayCustomerId;
    if (!customerId) {
      const customer = await createRazorpayCustomer({ name: existing.name, email: existing.email, contact: existing.phone || undefined, fail_existing: '0' });
      customerId = customer.id;
    }
    const now = new Date();
    const activated = await AppUser.findOneAndUpdate(
      {
        _id: existing._id,
        paymentMethodVerified: { $ne: true },
        $or: [{ trialClaimedAt: null }, { trialClaimedAt: { $exists: false } }],
      },
      {
        $set: {
          paymentMethodVerified: true,
          paymentMethodVerifiedAt: now,
          paymentMethodVerificationPaymentId: paymentData.id || claimed.razorpayPaymentId,
          paymentMethodVerificationOrderId: claimed.razorpayOrderId,
          razorpayCustomerId: customerId || '',
          subscriptionStatus: 'trial',
          billingStatus: 'TRIAL_ACTIVE',
          subscriptionStartDate: now,
          subscriptionExpiresAt: undefined,
          trialStartedAt: now,
          trialEndsAt: trialEndDate(now),
          status: 'Active',
        },
        $setOnInsert: { trialClaimedAt: now },
      },
      { new: true },
    );
    // $setOnInsert cannot set a value during an update, so set the immutable
    // trial marker only in the same one-time conditional transition.
    const user = activated || await AppUser.findById(existing._id);
    if (!activated || !user?.paymentMethodVerified || user.paymentMethodVerificationOrderId !== claimed.razorpayOrderId) {
      throw httpError(409, 'This account has already used its trial or cannot be activated.');
    }
    await AppUser.updateOne({ _id: user._id, trialClaimedAt: null }, { $set: { trialClaimedAt: now } });

    Object.assign(claimed, {
      status: 'successful', razorpayPaymentId: paymentData.id || claimed.razorpayPaymentId,
      method: paymentData.method || '', bank: paymentData.bank || '', wallet: paymentData.wallet || '',
      vpa: paymentData.vpa || '', paidAt: paymentData.created_at ? new Date(paymentData.created_at * 1000) : now,
    });
    await claimed.save();

    try {
      const refund = await createRazorpayRefund(claimed.razorpayPaymentId, { amount: claimed.amountPaise, notes: { purpose: 'trial_payment_method_verification' } });
      claimed.refundStatus = refund.status === 'processed' ? 'processed' : 'requested';
      claimed.razorpayRefundId = refund.id || '';
      claimed.refundRequestedAt = now;
      if (refund.status === 'processed') claimed.refundedAt = now;
      await claimed.save();
      await AppUser.updateOne({ _id: user._id }, { $set: { paymentMethodVerificationRefundId: claimed.razorpayRefundId } });
    } catch {
      await SubscriptionPayment.updateOne({ _id: claimed._id }, { $set: { refundStatus: 'failed', refundRequestedAt: now } });
    }
    return AppUser.findById(user._id);
  } catch (error) {
    await SubscriptionPayment.updateOne({ _id: claimed._id, status: 'processing' }, { $set: { status: 'pending' } }).catch(() => {});
    throw error;
  }
}

export async function createPaymentMethodVerificationOrder(req, res, next) {
    if (!(await isRazorpayPaymentsEnabled())) return next(httpError(503, 'Razorpay payments are currently disabled by the administrator.'));
  try {
    const user = await AppUser.findById(req.user.id);
    if (!user) return next(httpError(404, 'User not found'));
    if (user.paymentMethodVerified || user.trialClaimedAt) return next(httpError(409, 'Payment method is already verified for this account'));
    if (user.billingStatus !== 'PAYMENT_METHOD_VERIFICATION_PENDING') return next(httpError(409, 'Payment method verification is not available for this account state'));
    const existing = await SubscriptionPayment.findOne({ userId: user._id, purpose: 'payment_method_verification', status: 'pending', createdAt: { $gte: new Date(Date.now() - VERIFICATION_ORDER_TTL_MS) } }).sort({ createdAt: -1 }).lean();
    if (existing) return res.json({ checkout: verificationCheckout(existing, user) });
    const amountPaise = verificationAmountPaise();
    const order = await createRazorpayOrder({ amount: amountPaise, currency: 'INR', receipt: `verify_${String(user._id).slice(-12)}_${Date.now().toString().slice(-8)}`, notes: { user_id: String(user._id), purpose: 'payment_method_verification' } });
    const transaction = await SubscriptionPayment.create({
      purpose: 'payment_method_verification', email: user.email, customerName: user.name, businessName: user.businessName || user.name,
      phone: user.phone, category: user.category, amount: amountPaise / 100, amountPaise, currency: 'INR', status: 'pending', razorpayOrderId: order.id, userId: user._id, businessId: user.businessId,
    });
    res.status(201).json({ checkout: verificationCheckout(transaction.toObject(), user) });
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

function subscriptionEndDate(start) {
  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);
  return end;
}

function checkoutView(transaction, user, settings = {}) {
  return {
    keyId: env.razorpay.keyId,
    orderId: transaction.razorpayOrderId,
    amount: transaction.amountPaise,
    displayAmount: transaction.amount,
    currency: transaction.currency,
    planName: transaction.planName,
    category: transaction.category,
    prefill: { name: settings.accountHolderName || user.name, email: user.email, contact: user.phone },
  };
}

async function applySubscriptionPayment(transaction, paymentData = {}, signature = '') {
  const claimed = await SubscriptionPayment.findOneAndUpdate(
    { _id: transaction._id, status: { $in: ['pending', 'failed'] } },
    { $set: { status: 'processing', razorpayPaymentId: paymentData.id || transaction.razorpayPaymentId || '', razorpaySignature: signature } },
    { new: true },
  );
  if (!claimed) {
    const completed = await SubscriptionPayment.findById(transaction._id);
    if (completed?.status === 'successful' && completed.userId) return AppUser.findById(completed.userId);
    throw httpError(409, 'Payment is already being processed. Please try again in a moment.');
  }

  try {
    const user = await AppUser.findById(claimed.userId);
    if (!user) throw httpError(404, 'User not found for this payment');
    const startDate = new Date();
    if (!user.paymentMethodVerified) throw httpError(403, 'Verify a payment method before activating a subscription');
    user.subscriptionPlan = claimed.tier;
    user.subscriptionAmount = claimed.amount;
    user.subscriptionStatus = 'active';
    user.subscriptionStartDate = startDate;
    user.billingStatus = 'SUBSCRIPTION_ACTIVE';
    user.subscriptionExpiresAt = subscriptionEndDate(startDate);
    user.trialStartedAt = undefined;
    user.trialEndsAt = undefined;
    user.lastSubscriptionPaymentId = claimed._id;
    user.status = 'Active';
    await user.save();

    Object.assign(claimed, {
      status: 'successful',
      businessId: user.businessId,
      razorpayPaymentId: paymentData.id || claimed.razorpayPaymentId,
      method: paymentData.method || '',
      bank: paymentData.bank || '',
      wallet: paymentData.wallet || '',
      vpa: paymentData.vpa || '',
      paidAt: paymentData.created_at ? new Date(paymentData.created_at * 1000) : new Date(),
    });
    await claimed.save();
    await createAdminNotification({
      dedupeKey: `payment:${claimed._id}`,
      type: 'payment',
      title: 'Payment received',
      message: `${claimed.businessName} paid INR ${Number(claimed.amount).toLocaleString('en-IN')}`,
      relatedUser: claimed.businessName,
      userId: user._id,
      businessId: user.businessId,
      paymentId: claimed._id,
    }).catch(() => {});
    await sendSubscriptionInvoice(claimed._id);
    return user;
  } catch (error) {
    await SubscriptionPayment.updateOne({ _id: claimed._id }, { $set: { status: 'pending' } }).catch(() => {});
    throw error;
  }
}

export async function createCurrentUserPaymentOrder(req, res, next) {
  try {
    if (!(await isRazorpayPaymentsEnabled())) return next(httpError(503, 'Razorpay payments are currently disabled by the administrator.'));
    const user = await AppUser.findById(req.user.id);
    if (!user) return next(httpError(404, 'User not found'));
    if (!user.onboardingCompleted) return next(httpError(400, 'Complete onboarding before payment'));
    if (user.subscriptionStatus === 'trial' && user.trialEndsAt && new Date(user.trialEndsAt).getTime() > Date.now()) return next(httpError(409, 'Payment is available after your 15-day free trial ends.'));
    const tier = String(req.body.subscriptionPlan || user.subscriptionPlan || '').trim();
    const plan = await getActivePlan(user.category, tier);
    if (!plan) return next(httpError(400, 'The selected plan is not available'));
    if (plan.tier === 'free' || Number(plan.amount) <= 0) return next(httpError(400, 'The Free plan starts only through secure payment-method verification.'));
    const settings = await BusinessSettings.findOne({ userId: user._id }, { accountHolderName: 1 }).lean();

    const existing = await SubscriptionPayment.findOne({
      userId: user._id,
      status: 'pending',
      tier,
      amount: plan.amount,
      createdAt: { $gte: new Date(Date.now() - 30 * 60 * 1000) },
    }).sort({ createdAt: -1 }).lean();
    if (existing) return res.json({ checkout: checkoutView(existing, user, settings) });

    const amountPaise = Math.round(Number(plan.amount) * 100);
    const receipt = `sub_${String(user._id).slice(-12)}_${Date.now().toString().slice(-8)}`;
    const order = await createRazorpayOrder({
      amount: amountPaise,
      currency: 'INR',
      receipt,
      notes: {
        user_id: String(user._id),
        category: user.category,
        tier,
      },
    });
    const transaction = await SubscriptionPayment.create({
      email: user.email,
      customerName: user.name,
      businessName: user.businessName || user.name,
      phone: user.phone,
      category: user.category,
      tier,
      planName: plan.name,
      amount: plan.amount,
      amountPaise,
      currency: 'INR',
      status: 'pending',
      razorpayOrderId: order.id,
      userId: user._id,
      businessId: user.businessId,
    });
    res.json({ checkout: checkoutView(transaction.toObject(), user, settings) });
  } catch (error) {
    next(error);
  }
}

export async function verifyPaymentMethod(req, res, next) {
  try {
    const orderId = String(req.body.razorpay_order_id || '').trim();
    const paymentId = String(req.body.razorpay_payment_id || '').trim();
    const signature = String(req.body.razorpay_signature || '').trim();
    if (!orderId || !paymentId || !signature) return next(httpError(400, 'Complete payment verification details are required'));

    const transaction = await SubscriptionPayment.findOne({
      razorpayOrderId: orderId,
      userId: req.user.id,
      purpose: 'payment_method_verification',
    });
    if (!transaction) return next(httpError(404, 'Payment verification order not found'));
    if (!verifyCheckoutSignature({ orderId: transaction.razorpayOrderId, paymentId, signature })) {
      return next(httpError(400, 'Payment signature verification failed'));
    }
    const payment = await assertCapturedPayment(transaction, paymentId);
    const user = await activateTrialAfterVerification(transaction, payment, signature);
    res.status(201).json({ token: signToken(user, req.user.sessionId), user: toSafeUser(user), message: 'Payment method verified and trial activated' });
  } catch (error) {
    next(error);
  }
}

export async function verifyCurrentUserPayment(req, res, next) {
  try {
    const orderId = String(req.body.razorpay_order_id || '').trim();
    const paymentId = String(req.body.razorpay_payment_id || '').trim();
    const signature = String(req.body.razorpay_signature || '').trim();
    if (!orderId || !paymentId || !signature) return next(httpError(400, 'Complete payment verification details are required'));

    const transaction = await SubscriptionPayment.findOne({ razorpayOrderId: orderId, userId: req.user.id });
    if (!transaction) return next(httpError(404, 'Payment order not found'));
    if (!verifyCheckoutSignature({ orderId: transaction.razorpayOrderId, paymentId, signature })) {
      return next(httpError(400, 'Payment signature verification failed'));
    }
    const payment = await assertCapturedPayment(transaction, paymentId);
    const user = await applySubscriptionPayment(transaction, payment, signature);
    const receipt = await SubscriptionPayment.findOne({ _id: transaction._id }, { invoiceNumber: 1, invoicePdfFileId: 1 }).lean();
    res.status(201).json({
      token: signToken(user, req.user.sessionId),
      user: toSafeUser(user),
      message: 'Payment verified and subscription activated. Receipt has been emailed.',
      receipt: receipt ? {
        id: receipt._id,
        invoiceNumber: receipt.invoiceNumber || '',
        downloadUrl: `/subscriptions/receipts/${receipt._id}/download`,
        ready: Boolean(receipt.invoicePdfFileId),
      } : null,
    });
  } catch (error) {
    next(error);
  }
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
    const { sessionId, deviceType } = await createLoginSession(user, req);
    res.status(201).json({ token: signToken(user, sessionId), session: { deviceType }, user: toSafeUser(user), message: 'Payment verified and account created' });
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
    await RazorpayWebhookEvent.create({ eventId: eventId || undefined, event: String(event || ''), orderId, paymentId: payment?.id || '', signatureVerified: true }).catch(() => {});
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
        if (transaction.purpose === 'payment_method_verification') await activateTrialAfterVerification(transaction, verifiedPayment);
        else if (transaction.userId) await applySubscriptionPayment(transaction, verifiedPayment);
        else await completePaidSignup(transaction, verifiedPayment);
      }
    } else {
      await transaction.save();
    }
    res.json({ received: true });
  } catch (error) {
    next(error);
  }
}
