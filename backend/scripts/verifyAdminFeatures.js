import 'dotenv/config';
import mongoose from 'mongoose';

import { connectDatabase, disconnectDatabase } from '../src/services/database.js';
import { AdminNotification } from '../src/models/AdminNotification.js';
import { AppUser } from '../src/models/AppUser.js';
import { SubscriptionPayment } from '../src/models/SubscriptionPayment.js';
import { GRIDFS_FILES_COLLECTION } from '../src/services/gridfsStorage.js';
import { createSubscriptionInvoicePdf } from '../src/services/subscriptionInvoice.js';

try {
  await connectDatabase();
  const db = mongoose.connection.db;
  const [paidUsers, missingExpiry, successfulPayments, invoicesSent, failedInvoices, gridFiles, gridBytes, notifications, unread, collections] = await Promise.all([
    AppUser.countDocuments({ subscriptionPlan: { $nin: ['', null] } }),
    AppUser.countDocuments({ subscriptionPlan: { $nin: ['', null] }, $or: [{ subscriptionStartDate: { $exists: false } }, { subscriptionExpiresAt: { $exists: false } }] }),
    SubscriptionPayment.countDocuments({ status: 'successful' }),
    SubscriptionPayment.countDocuments({ status: 'successful', invoiceEmailStatus: 'sent' }),
    SubscriptionPayment.countDocuments({ status: 'successful', invoiceEmailStatus: 'failed' }),
    db.collection(GRIDFS_FILES_COLLECTION).countDocuments(),
    db.collection(GRIDFS_FILES_COLLECTION).aggregate([{ $group: { _id: null, bytes: { $sum: '$length' } } }]).toArray(),
    AdminNotification.countDocuments({ archived: false }),
    AdminNotification.countDocuments({ archived: false, read: false }),
    db.listCollections({}, { nameOnly: true }).toArray(),
  ]);
  let samplePdf = { tested: false };
  const payment = await SubscriptionPayment.findOne({ status: 'successful', userId: { $exists: true } }).sort({ paidAt: -1 });
  if (payment) {
    const user = await AppUser.findById(payment.userId).lean();
    if (user) {
      payment.invoiceNumber = payment.invoiceNumber || 'GB-VERIFY-PREVIEW';
      const pdf = await createSubscriptionInvoicePdf(payment, user);
      samplePdf = { tested: true, validPdfHeader: pdf.subarray(0, 4).toString() === '%PDF', bytes: pdf.length };
    }
  }
  const ok = missingExpiry === 0 && failedInvoices === 0 && invoicesSent === successfulPayments && (!samplePdf.tested || samplePdf.validPdfHeader);
  console.log(JSON.stringify({
    ok,
    subscriptions: { paidUsers, missingOneYearDates: missingExpiry },
    invoices: { successfulPayments, emailSent: invoicesSent, emailFailed: failedInvoices, generatedPdfCheck: samplePdf },
    storage: { gridFsFiles: gridFiles, gridFsBytes: gridBytes[0]?.bytes || 0, collectionsVisible: collections.length },
    notifications: { total: notifications, unread },
  }, null, 2));
  if (!ok) process.exitCode = 1;
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exitCode = 1;
} finally {
  await new Promise((resolve) => setTimeout(resolve, 250));
  await disconnectDatabase().catch(() => {});
  process.exit(process.exitCode || 0);
}
