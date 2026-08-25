import { AppUser } from '../models/AppUser.js';
import { Business } from '../models/Business.js';
import { BusinessSettings } from '../models/BusinessSettings.js';
import { PendingSignup } from '../models/PendingSignup.js';
import { SubscriptionPayment } from '../models/SubscriptionPayment.js';
import { env } from '../config/env.js';
import { httpError } from '../utils/httpError.js';
import { createRazorpayOrder } from './razorpay.js';
import { getActivePlan } from './subscriptionPlans.js';
import { createAdminNotification } from './adminNotifications.js';
import { sendSubscriptionInvoice } from './subscriptionInvoice.js';

const CHECKOUT_MINUTES = 30;

export async function createRegistrationOrder(pending) {
  const plan = await getActivePlan(pending.category, pending.subscriptionPlan);
  if (!plan) throw httpError(400, 'The selected plan is no longer available');

  if (pending.razorpayOrderId) {
    const existing = await SubscriptionPayment.findOne({ razorpayOrderId: pending.razorpayOrderId }).lean();
    if (existing?.status === 'pending'
      && existing.amount === plan.amount
      && existing.email === pending.email
      && existing.category === pending.category
      && existing.tier === pending.subscriptionPlan) {
      return checkoutView(existing, pending);
    }
  }

  const amountPaise = Math.round(Number(plan.amount) * 100);
  const receipt = `signup_${String(pending._id).slice(-12)}_${Date.now().toString().slice(-8)}`;
  const order = await createRazorpayOrder({
    amount: amountPaise,
    currency: 'INR',
    receipt,
    notes: {
      signup_id: String(pending._id),
      category: pending.category,
      tier: pending.subscriptionPlan,
    },
  });

  const transaction = await SubscriptionPayment.create({
    email: pending.email,
    customerName: pending.name,
    businessName: pending.businessName,
    phone: pending.phone,
    category: pending.category,
    tier: pending.subscriptionPlan,
    planName: plan.name,
    amount: plan.amount,
    amountPaise,
    currency: 'INR',
    status: 'pending',
    razorpayOrderId: order.id,
  });

  pending.subscriptionAmount = plan.amount;
  pending.razorpayOrderId = order.id;
  pending.otpVerifiedAt = new Date();
  pending.otpExpiresAt = new Date(Date.now() + CHECKOUT_MINUTES * 60 * 1000);
  await pending.save();
  return checkoutView(transaction.toObject(), pending);
}

function checkoutView(transaction, pending) {
  return {
    keyId: env.razorpay.keyId,
    orderId: transaction.razorpayOrderId,
    amount: transaction.amountPaise,
    displayAmount: transaction.amount,
    currency: transaction.currency,
    planName: transaction.planName,
    category: transaction.category,
    prefill: { name: pending.name, email: pending.email, contact: pending.phone },
  };
}

function subscriptionEndDate(start) {
  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);
  return end;
}

// Activates an account without Razorpay checkout, for when PAYMENT_REQUIRED=false.
export async function completeFreeSignup(pending) {
  const existing = await AppUser.findOne({ email: pending.email });
  if (existing) {
    const startDate = new Date();
    existing.subscriptionPlan = pending.subscriptionPlan;
    existing.subscriptionAmount = pending.subscriptionAmount;
    existing.subscriptionStatus = 'active';
    existing.subscriptionStartDate = startDate;
    existing.subscriptionExpiresAt = subscriptionEndDate(startDate);
    existing.status = 'Active';
    await existing.save();
    await BusinessSettings.findOneAndUpdate(
      { userId: existing._id },
      { $setOnInsert: { userId: existing._id, businessName: existing.businessName, businessEmail: existing.email, phone: existing.phone || '', gstin: pending.gstin } },
      { upsert: true, setDefaultsOnInsert: true },
    );
    await PendingSignup.deleteOne({ _id: pending._id });
    await createAdminNotification({ dedupeKey: `new-user:${existing._id}`, type: 'new_user', title: 'New user registration', message: `${existing.businessName} account was created (payment skipped)`, relatedUser: existing.businessName, userId: existing._id, businessId: existing.businessId }).catch(() => {});
    return existing;
  }

  const business = await Business.create({ name: pending.businessName, category: pending.category });
  const startDate = new Date();
  const user = await AppUser.create({
    name: pending.name, email: pending.email, password: pending.password,
    businessId: business._id, businessName: pending.businessName,
    category: pending.category, phone: pending.phone, role: 'Super Admin',
    googleId: pending.googleId || '', authProvider: pending.authProvider || 'email',
    googleProfile: pending.googleProfile,
    lastLogin: new Date().toISOString(), subscriptionPlan: pending.subscriptionPlan,
    subscriptionAmount: pending.subscriptionAmount, subscriptionStatus: 'active',
    subscriptionStartDate: startDate, subscriptionExpiresAt: subscriptionEndDate(startDate),
    onboardingCompleted: true, emailVerified: true,
  });
  await BusinessSettings.create({
    userId: user._id, businessName: pending.businessName, businessEmail: pending.email,
    phone: pending.phone, gstin: pending.gstin,
  });
  await PendingSignup.deleteOne({ _id: pending._id });
  await createAdminNotification({ dedupeKey: `new-user:${user._id}`, type: 'new_user', title: 'New user registration', message: `${user.businessName} account was created (payment skipped)`, relatedUser: user.businessName, userId: user._id, businessId: user.businessId }).catch(() => {});
  return user;
}

export async function completePaidSignup(transaction, paymentData = {}, signature = '') {
  if (transaction.status === 'successful' && transaction.userId) {
    const existingUser = await AppUser.findById(transaction.userId);
    if (existingUser) {
      await sendSubscriptionInvoice(transaction._id).catch(() => {});
      return existingUser;
    }
  }

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

  const pending = await PendingSignup.findOne({ email: claimed.email }).select('+password');
  if (!pending || pending.razorpayOrderId !== claimed.razorpayOrderId || !pending.otpVerifiedAt) {
    await SubscriptionPayment.updateOne({ _id: claimed._id }, { $set: { status: 'pending' } });
    throw httpError(410, 'Signup session expired. Contact support with your payment ID.');
  }

  let business;
  try {
    const existing = await AppUser.findOne({ email: pending.email });
    if (existing) {
      const startDate = new Date();
      existing.subscriptionPlan = claimed.tier;
      existing.subscriptionAmount = claimed.amount;
      existing.subscriptionStatus = 'active';
      existing.subscriptionStartDate = startDate;
      existing.subscriptionExpiresAt = subscriptionEndDate(startDate);
      existing.lastSubscriptionPaymentId = claimed._id;
      existing.status = 'Active';
      await existing.save();
      await BusinessSettings.findOneAndUpdate(
        { userId: existing._id },
        { $setOnInsert: { userId: existing._id, businessName: existing.businessName, businessEmail: existing.email, phone: existing.phone || '', gstin: pending.gstin } },
        { upsert: true, setDefaultsOnInsert: true },
      );
      claimed.status = 'successful';
      claimed.userId = existing._id;
      claimed.businessId = existing.businessId;
      claimed.paidAt = claimed.paidAt || new Date();
      await claimed.save();
      await PendingSignup.deleteOne({ _id: pending._id });
      await createAdminNotification({ dedupeKey: `payment:${claimed._id}`, type: 'payment', title: 'Payment received', message: `${claimed.businessName} paid INR ${Number(claimed.amount).toLocaleString('en-IN')}`, relatedUser: claimed.businessName, userId: existing._id, businessId: existing.businessId, paymentId: claimed._id }).catch(() => {});
      await sendSubscriptionInvoice(claimed._id);
      return existing;
    }

    business = await Business.create({ name: pending.businessName, category: pending.category });
    const startDate = new Date();
    const user = await AppUser.create({
      name: pending.name, email: pending.email, password: pending.password,
      businessId: business._id, businessName: pending.businessName,
      category: pending.category, phone: pending.phone, role: 'Super Admin',
      googleId: pending.googleId || '', authProvider: pending.authProvider || 'email',
      googleProfile: pending.googleProfile,
      lastLogin: new Date().toISOString(), subscriptionPlan: pending.subscriptionPlan,
      subscriptionAmount: claimed.amount, subscriptionStatus: 'active',
      subscriptionStartDate: startDate, subscriptionExpiresAt: subscriptionEndDate(startDate),
      lastSubscriptionPaymentId: claimed._id, onboardingCompleted: true, emailVerified: true,
    });
    await BusinessSettings.create({
      userId: user._id, businessName: pending.businessName, businessEmail: pending.email,
      phone: pending.phone, gstin: pending.gstin,
    });

    Object.assign(claimed, {
      status: 'successful', userId: user._id, businessId: business._id,
      razorpayPaymentId: paymentData.id || claimed.razorpayPaymentId,
      method: paymentData.method || '', bank: paymentData.bank || '',
      wallet: paymentData.wallet || '', vpa: paymentData.vpa || '',
      paidAt: paymentData.created_at ? new Date(paymentData.created_at * 1000) : new Date(),
    });
    await claimed.save();
    await PendingSignup.deleteOne({ _id: pending._id });
    await createAdminNotification({ dedupeKey: `new-user:${user._id}`, type: 'new_user', title: 'New user registration', message: `${user.businessName} account was created after verified payment`, relatedUser: user.businessName, userId: user._id, businessId: user.businessId, paymentId: claimed._id }).catch(() => {});
    await createAdminNotification({ dedupeKey: `payment:${claimed._id}`, type: 'payment', title: 'Payment received', message: `${claimed.businessName} paid INR ${Number(claimed.amount).toLocaleString('en-IN')}`, relatedUser: claimed.businessName, userId: user._id, businessId: user.businessId, paymentId: claimed._id }).catch(() => {});
    await sendSubscriptionInvoice(claimed._id);
    return user;
  } catch (error) {
    await SubscriptionPayment.updateOne({ _id: claimed._id }, { $set: { status: 'pending' } }).catch(() => {});
    if (business?._id && !(await AppUser.exists({ businessId: business._id }))) {
      await Business.deleteOne({ _id: business._id }).catch(() => {});
    }
    throw error;
  }
}
