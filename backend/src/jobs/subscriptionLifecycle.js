import { AppUser } from '../models/AppUser.js';
import { AdminNotification } from '../models/AdminNotification.js';
import { SubscriptionPayment } from '../models/SubscriptionPayment.js';
import { createAdminNotification } from '../services/adminNotifications.js';
import { sendSubscriptionInvoice } from '../services/subscriptionInvoice.js';
import { buildBrandedEmail, sendMail } from '../utils/mailer.js';

function addYears(value, years) {
  const date = new Date(value);
  date.setFullYear(date.getFullYear() + years);
  return date;
}

function dateKey(value = new Date()) {
  return new Date(value).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

export async function backfillSubscriptionExpiries() {
  const users = await AppUser.find({
    subscriptionPlan: { $nin: ['', null] },
    $or: [{ subscriptionStartDate: { $exists: false } }, { subscriptionExpiresAt: { $exists: false } }],
  }).select('_id createdAt subscriptionStartDate subscriptionExpiresAt subscriptionStatus status').lean();
  if (!users.length) return 0;
  const operations = users.map((user) => {
    const start = user.subscriptionStartDate || user.createdAt || new Date();
    const expires = user.subscriptionExpiresAt || addYears(start, 1);
    const expired = expires <= new Date();
    return {
      updateOne: {
        filter: { _id: user._id },
        update: { $set: {
          subscriptionStartDate: start,
          subscriptionExpiresAt: expires,
          subscriptionStatus: expired ? 'expired' : 'active',
          ...(expired && user.status === 'Active' ? { status: 'Expired' } : {}),
        } },
      },
    };
  });
  await AppUser.bulkWrite(operations, { ordered: false });
  return operations.length;
}

async function createExpiryReminder(user, days) {
  const key = `subscription-expiry:${days}:${user._id}:${dateKey(user.subscriptionExpiresAt)}`;
  const existed = await AdminNotification.exists({ dedupeKey: key });
  await createAdminNotification({
    dedupeKey: key,
    type: days === 0 ? 'subscription_expired' : `expiry_${days}day`,
    title: days === 0 ? 'Subscription expired' : `Subscription expires in ${days} day${days === 1 ? '' : 's'}`,
    message: `${user.businessName || user.name} - ${user.email}`,
    relatedUser: user.businessName || user.name,
    userId: user._id,
    businessId: user.businessId,
    metadata: { expiresAt: user.subscriptionExpiresAt, daysRemaining: days },
  });
  if (existed || !user.email) return;
  const html = buildBrandedEmail({
    title: days === 0 ? 'Your GoBooks subscription has expired' : `Your GoBooks subscription expires in ${days} day${days === 1 ? '' : 's'}`,
    greeting: `Hello ${user.name},`,
    intro: days === 0
      ? 'Your one-year GoBooks subscription has reached its expiry date.'
      : `Your one-year GoBooks subscription expires on ${new Date(user.subscriptionExpiresAt).toLocaleDateString('en-IN')}.`,
    notice: 'Please contact GoBooks support or renew your package to avoid interruption.',
    badge: days === 0 ? 'Expired' : 'Renewal reminder',
  });
  await sendMail({ to: user.email, subject: days === 0 ? 'GoBooks subscription expired' : `GoBooks renewal reminder - ${days} day${days === 1 ? '' : 's'} left`, html }).catch(() => {});
}

export async function runSubscriptionLifecycle() {
  const backfilled = await backfillSubscriptionExpiries();
  const now = new Date();
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + 31);
  const users = await AppUser.find({
    subscriptionPlan: { $nin: ['', null] },
    subscriptionExpiresAt: { $lte: horizon },
    subscriptionStatus: { $ne: 'cancelled' },
  }).select('name email businessName businessId subscriptionExpiresAt subscriptionStatus status').lean();

  let expired = 0;
  let reminded = 0;
  for (const user of users) {
    const remainingMs = new Date(user.subscriptionExpiresAt).getTime() - now.getTime();
    const days = Math.max(0, Math.ceil(remainingMs / 86400000));
    if (remainingMs <= 0) {
      await AppUser.updateOne({ _id: user._id }, { $set: { subscriptionStatus: 'expired', status: 'Expired' } });
      await createExpiryReminder(user, 0);
      expired += 1;
    } else if ([30, 7, 1].includes(days)) {
      await createExpiryReminder(user, days);
      reminded += 1;
    }
  }

  const retryPayments = await SubscriptionPayment.find({
    status: 'successful',
    $or: [
      { invoiceEmailStatus: { $exists: false } },
      { invoiceEmailStatus: { $in: ['', 'pending', 'failed'] } },
      { invoiceEmailStatus: 'sending', updatedAt: { $lt: new Date(Date.now() - 30 * 60 * 1000) } },
    ],
  }).select('_id invoiceEmailStatus').limit(25).lean();
  for (const payment of retryPayments) {
    if (payment.invoiceEmailStatus === 'sending') {
      await SubscriptionPayment.updateOne({ _id: payment._id }, { $set: { invoiceEmailStatus: 'failed' } });
    }
    await sendSubscriptionInvoice(payment._id);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [registrations, paymentSummary] = await Promise.all([
    AppUser.countDocuments({ createdAt: { $gte: today } }),
    SubscriptionPayment.aggregate([
      { $match: { status: 'successful', paidAt: { $gte: today } } },
      { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: '$amount' } } },
    ]),
  ]);
  const payments = paymentSummary[0] || { count: 0, revenue: 0 };
  await createAdminNotification({
    dedupeKey: `daily-report:${dateKey()}`,
    type: 'daily_report',
    title: 'Daily platform report',
    message: `${registrations} registrations, ${payments.count} successful payments, INR ${Number(payments.revenue).toLocaleString('en-IN')} revenue`,
    metadata: { registrations, payments: payments.count, revenue: payments.revenue, backfilled, expired, reminded },
  });
  return { backfilled, expired, reminded, invoiceRetries: retryPayments.length, registrations, payments: payments.count, revenue: payments.revenue };
}
