import { Invoice } from '../../../../models/Invoice.js';
import { Payment } from '../../../../models/Payment.js';
import { httpError } from '../../../../utils/httpError.js';
import {
  postPaymentAccounting,
  reverseAccountingPosting,
} from '../../../../services/accountingPostings.js';
import { getAccountingStatusForSource } from '../../../../services/salesAccountingStatus.js';
import { buildSalesAggregationPipeline, unwrapFacetResult } from '../shared/salesFilters.js';

function calcInvoiceTotal(inv) {
  const totals = inv.totals ?? {};
  const saved = Number(totals.finalTotal ?? totals.grandTotal ?? totals.total ?? totals.subTotal);
  if (Number.isFinite(saved) && saved > 0) return saved;

  let total = 0;
  for (const item of inv.items ?? []) {
    const gross    = (Number(item.qty) || 0) * (Number(item.rate) || 0);
    const taxable  = gross * (1 - (Number(item.discount) || 0) / 100);
    total += taxable + taxable * ((Number(item.gstRate) || 0) / 100);
  }
  for (const charge of inv.charges ?? []) {
    const amt = Number(charge.amount) || 0;
    total += amt + amt * ((Number(charge.gstRate) || 0) / 100);
  }
  return Math.round(total);
}

async function paymentSummary(invoice, userId, excludePaymentId = null) {
  const match = { invoiceId: invoice._id, userId };
  if (excludePaymentId) match._id = { $ne: excludePaymentId };
  const payments = await Payment.find(match).lean();
  const invoiceTotal = calcInvoiceTotal(invoice);
  const paymentTotal = payments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
  const totalPaid = payments.length > 0 ? paymentTotal : Math.max(0, Number(invoice.advanceReceived) || 0);
  const balance = Math.max(0, invoiceTotal - totalPaid);
  // Recordable balance ignores the advanceReceived fallback: advanceReceived is written to the
  // invoice at save time as a display convenience (invoice/PDF views read it directly), in the same
  // request that then records the matching Payment doc(s) here. Gating new payments on totalPaid
  // (which already folds advanceReceived in when no Payment rows exist yet) would reject that very
  // first payment as "exceeding" a balance the invoice's own creation just zeroed out.
  const recordableBalance = Math.max(0, invoiceTotal - paymentTotal);
  return { payments, invoiceTotal, totalPaid, balance, recordableBalance };
}

// GET /sales/invoices/:id/payments
export async function listPayments(req, res, next) {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, userId: req.user.id }).lean();
    if (!invoice) return next(httpError(404, 'Invoice not found'));

    const payments = await Payment.find({ invoiceId: req.params.id, userId: req.user.id })
      .sort({ createdAt: -1 })
      .lean();

    const invoiceTotal = calcInvoiceTotal(invoice);
    const paymentTotal = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const totalPaid    = payments.length > 0 ? paymentTotal : Math.max(0, Number(invoice.advanceReceived) || 0);
    const balance      = Math.max(0, invoiceTotal - totalPaid);

    const paymentsWithAccounting = await Promise.all(payments.map(async (payment) => ({
      ...payment,
      allocation: {
        invoiceId: payment.invoiceId,
        invoiceNumber: payment.invoiceNumber,
        amount: payment.amount,
      },
      accounting: await getAccountingStatusForSource({
        userId: req.user.id,
        sourceType: 'payment',
        sourceId: payment._id,
      }),
    })));

    res.json({ payments: paymentsWithAccounting, invoiceTotal, totalPaid, balance });
  } catch (err) {
    next(err);
  }
}

// POST /sales/invoices/:id/payments
export async function recordPayment(req, res, next) {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, userId: req.user.id }).lean();
    if (!invoice) return next(httpError(404, 'Invoice not found'));

    const { amount, date, method, reference, notes } = req.body;
    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) return next(httpError(400, 'Amount must be greater than 0'));
    const summary = await paymentSummary(invoice, req.user.id);
    if (amountNum > summary.recordableBalance + 0.01) {
      return next(httpError(400, `Payment exceeds balance due. Balance is ${summary.recordableBalance}`));
    }

    const payment = await Payment.create({
      userId:        req.user.id,
      invoiceId:     invoice._id,
      invoiceNumber: invoice.number,
      customerName:  invoice.customer?.name || '',
      amount:        amountNum,
      date:          date || new Date().toISOString().slice(0, 10),
      method:        method || 'Cash',
      reference:     reference || '',
      notes:         notes || '',
    });

    try {
      await postPaymentAccounting(payment, invoice, req.user);
    } catch (err) {
      await Payment.deleteOne({ _id: payment._id, userId: req.user.id });
      throw err;
    }

    res.status(201).json({
      ...payment.toObject(),
      allocation: { invoiceId: invoice._id, invoiceNumber: invoice.number, amount: payment.amount },
      accounting: await getAccountingStatusForSource({ userId: req.user.id, sourceType: 'payment', sourceId: payment._id }),
    });
  } catch (err) {
    next(err);
  }
}

// DELETE /sales/payments/:id
export async function deletePayment(req, res, next) {
  try {
    const payment = await Payment.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!payment) return next(httpError(404, 'Payment not found'));
    await reverseAccountingPosting({ userId: req.user.id, sourceType: 'payment', sourceId: payment._id });
    res.json({ message: 'Payment deleted' });
  } catch (err) {
    next(err);
  }
}

// GET /sales/invoices/outstanding
export async function listOutstanding(req, res, next) {
  try {
    const { documentType, page = 1, limit = 50 } = req.query;
    const baseDocumentType = documentType && documentType !== 'all'
      ? documentType
      : { $in: ['invoice', 'bill-of-supply'] };

    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndStr = weekEnd.toISOString().slice(0, 10);

    const pipeline = buildSalesAggregationPipeline(req.query, req.user.id, baseDocumentType, {
      includePayment: true,
      stats: {
        totalOutstanding: { $sum: { $cond: [{ $gt: ['$balance', 0] }, '$balance', 0] } },
        totalOverdue: { $sum: { $cond: [{ $eq: ['$payStatus', 'Overdue'] }, '$balance', 0] } },
        dueThisWeek: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $gt: ['$balance', 0] },
                  { $ne: [{ $ifNull: ['$meta.dueDate', ''] }, ''] },
                  { $lte: ['$meta.dueDate', weekEndStr] },
                  { $ne: ['$payStatus', 'Overdue'] },
                ],
              },
              '$balance',
              0,
            ],
          },
        },
      },
    });

    const result = await Invoice.aggregate(pipeline);
    const { data: rawRows, total, stats } = unwrapFacetResult(result, {
      stats: { defaultValue: { totalOutstanding: 0, totalOverdue: 0, dueThisWeek: 0 } },
    });

    const data = rawRows.map((inv) => ({
      id:            String(inv._id),
      number:        inv.number,
      documentType:  inv.documentType || 'invoice',
      date:          inv.meta?.date || '',
      dueDate:       inv.meta?.dueDate || '',
      customer:      inv.customer?.name || '-',
      customerPhone: inv.customer?.phone || '',
      invoiceTotal:  inv.invoiceTotal,
      totalPaid:     inv.totalPaid,
      balance:       inv.balance,
      status:        inv.payStatus,
      isOverdue:     inv.payStatus === 'Overdue',
    }));

    res.json({
      data,
      total,
      page: Number(page),
      limit: Number(limit),
      summary: {
        totalOutstanding: stats.totalOutstanding || 0,
        totalOverdue: stats.totalOverdue || 0,
        dueThisWeek: stats.dueThisWeek || 0,
      },
    });
  } catch (err) {
    next(err);
  }
}
