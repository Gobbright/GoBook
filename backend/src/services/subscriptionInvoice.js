import path from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';

import { SubscriptionPayment } from '../models/SubscriptionPayment.js';
import { AppUser } from '../models/AppUser.js';
import { createAdminNotification } from './adminNotifications.js';
import { storeBuffer } from './gridfsStorage.js';
import { buildBrandedEmail, escapeHtml, sendMail } from '../utils/mailer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = path.resolve(__dirname, '../../../frontend/public/gobook-logo-full.png');

function invoiceNumber(payment) {
  const date = payment.paidAt || payment.createdAt || new Date();
  const stamp = new Date(date).toISOString().slice(0, 10).replace(/-/g, '');
  return `GB-${stamp}-${String(payment._id).slice(-8).toUpperCase()}`;
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

function formatAmount(value) {
  return `INR ${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function createSubscriptionInvoicePdf(payment, user) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48, info: { Title: `GoBooks invoice ${payment.invoiceNumber}` } });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    if (existsSync(LOGO_PATH)) doc.image(LOGO_PATH, 48, 42, { fit: [150, 44] });
    else doc.fontSize(24).fillColor('#2563eb').text('GoBooks', 48, 48);
    doc.fontSize(20).fillColor('#0f172a').text('SUBSCRIPTION INVOICE', 330, 48, { width: 215, align: 'right' });
    doc.fontSize(9).fillColor('#64748b').text(`Invoice: ${payment.invoiceNumber}`, 330, 76, { width: 215, align: 'right' });
    doc.text(`Paid: ${formatDate(payment.paidAt || payment.createdAt)}`, 330, 91, { width: 215, align: 'right' });
    doc.moveTo(48, 120).lineTo(547, 120).strokeColor('#dbeafe').stroke();

    doc.fontSize(10).fillColor('#64748b').text('BILLED TO', 48, 145);
    doc.fontSize(13).fillColor('#0f172a').text(payment.customerName || user?.name || '', 48, 164);
    doc.fontSize(10).fillColor('#475569').text(payment.businessName || user?.businessName || '', 48, 184);
    doc.text(payment.email || user?.email || '', 48, 200);
    if (payment.phone) doc.text(payment.phone, 48, 216);

    doc.roundedRect(48, 260, 499, 44, 5).fill('#eff6ff');
    doc.fillColor('#1e3a8a').fontSize(10).text('PACKAGE', 62, 276);
    doc.text('TERM', 280, 276);
    doc.text('AMOUNT', 438, 276, { width: 95, align: 'right' });
    doc.fillColor('#0f172a').fontSize(11).text(`${payment.planName} (${payment.category})`, 62, 322, { width: 205 });
    doc.text('1 year', 280, 322);
    doc.text(formatAmount(payment.amount), 416, 322, { width: 117, align: 'right' });
    doc.moveTo(48, 350).lineTo(547, 350).strokeColor('#e2e8f0').stroke();
    doc.fontSize(12).fillColor('#0f172a').text('Total paid', 330, 374, { width: 95, align: 'right' });
    doc.fontSize(14).fillColor('#2563eb').text(formatAmount(payment.amount), 425, 372, { width: 108, align: 'right' });

    doc.fontSize(10).fillColor('#475569').text(`Subscription start: ${formatDate(user.subscriptionStartDate)}`, 48, 430);
    doc.text(`Subscription expiry: ${formatDate(user.subscriptionExpiresAt)}`, 48, 448);
    doc.text(`Razorpay payment ID: ${payment.razorpayPaymentId || '-'}`, 48, 466);
    doc.roundedRect(48, 515, 499, 65, 6).fill('#f8fafc');
    doc.fillColor('#334155').fontSize(10).text('Thank you for choosing GoBooks. Keep this invoice for your records. Payment was verified server-side with Razorpay.', 64, 535, { width: 465, lineGap: 4 });
    doc.fillColor('#94a3b8').fontSize(9).text('GoBooks | Secure billing, accounting, CRM, inventory, payroll and GST', 48, 770, { width: 499, align: 'center' });
    doc.end();
  });
}

export async function sendSubscriptionInvoice(paymentId, { force = false } = {}) {
  const invoiceStateFilter = force
    ? { invoiceEmailStatus: { $ne: 'sending' } }
    : { $or: [{ invoiceEmailStatus: { $exists: false } }, { invoiceEmailStatus: { $in: ['', 'pending', 'failed'] } }] };
  const claimed = await SubscriptionPayment.findOneAndUpdate(
    { _id: paymentId, status: 'successful', ...invoiceStateFilter },
    { $set: { invoiceEmailStatus: 'sending', invoiceEmailError: '' } },
    { new: true },
  );
  if (!claimed) return { skipped: true };

  try {
    const user = await AppUser.findById(claimed.userId).lean();
    if (!user) throw new Error('Subscription user was not found');
    claimed.invoiceNumber = claimed.invoiceNumber || invoiceNumber(claimed);
    const pdf = await createSubscriptionInvoicePdf(claimed, user);
    if (!claimed.invoicePdfFileId) {
      const stored = await storeBuffer({
        buffer: pdf,
        filename: `${claimed.invoiceNumber}.pdf`,
        contentType: 'application/pdf',
        metadata: { kind: 'subscription-invoice', paymentId: claimed._id, userId: user._id, businessId: user.businessId, category: claimed.category },
      });
      claimed.invoicePdfFileId = stored.id;
    }
    await claimed.save();
    const bodyHtml = `<div style="margin:18px 0;border:1px solid #dbeafe;border-radius:12px;overflow:hidden"><table role="presentation" width="100%" cellpadding="10" cellspacing="0"><tr><td style="color:#64748b">Invoice</td><td align="right" style="font-weight:700">${escapeHtml(claimed.invoiceNumber)}</td></tr><tr style="background:#f8fafc"><td style="color:#64748b">Package</td><td align="right" style="font-weight:700">${escapeHtml(claimed.planName)}</td></tr><tr><td style="color:#64748b">Amount paid</td><td align="right" style="font-weight:800;color:#2563eb">${escapeHtml(formatAmount(claimed.amount))}</td></tr><tr style="background:#f8fafc"><td style="color:#64748b">Valid until</td><td align="right" style="font-weight:700">${escapeHtml(formatDate(user.subscriptionExpiresAt))}</td></tr></table></div>`;
    const html = buildBrandedEmail({
      title: 'Payment successful - invoice attached',
      preheader: `${claimed.invoiceNumber} for your GoBooks subscription`,
      greeting: `Hello ${claimed.customerName},`,
      intro: 'Your Razorpay payment was verified and your GoBooks account is active for one year.',
      bodyHtml,
      notice: 'The PDF invoice is attached to this email. Please keep it for your records.',
      badge: 'Payment verified',
    });
    await sendMail({ to: claimed.email, subject: `GoBooks payment invoice ${claimed.invoiceNumber}`, html, attachments: [{ filename: `${claimed.invoiceNumber}.pdf`, content: pdf, contentType: 'application/pdf' }] });
    claimed.invoiceEmailStatus = 'sent';
    claimed.invoiceEmailSentAt = new Date();
    await claimed.save();
    await createAdminNotification({ dedupeKey: `invoice-sent:${claimed._id}`, type: 'invoice_sent', title: 'Invoice email sent', message: `${claimed.invoiceNumber} was emailed to ${claimed.email}`, relatedUser: claimed.businessName, userId: claimed.userId, businessId: claimed.businessId, paymentId: claimed._id });
    return { sent: true, invoiceNumber: claimed.invoiceNumber };
  } catch (error) {
    await SubscriptionPayment.updateOne({ _id: claimed._id }, { $set: { invoiceEmailStatus: 'failed', invoiceEmailError: String(error.message || error).slice(0, 500) } });
    await createAdminNotification({ dedupeKey: `invoice-failed:${claimed._id}`, type: 'invoice_failed', title: 'Invoice email needs retry', message: `Invoice email to ${claimed.email} failed: ${String(error.message || error).slice(0, 180)}`, relatedUser: claimed.businessName, userId: claimed.userId, businessId: claimed.businessId, paymentId: claimed._id });
    return { sent: false, error: error.message };
  }
}
