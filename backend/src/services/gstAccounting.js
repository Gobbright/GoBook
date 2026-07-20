import { BusinessSettings } from '../models/BusinessSettings.js';
import { Gstr3b } from '../models/Gstr3b.js';
import { upsertSourceVoucher } from './accountingVouchers.js';
import { buildGstr3bFromSales, mergeDraftGstr3b } from './gstFromSales.js';
import { httpError } from '../utils/httpError.js';

function money(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function sum(rows = [], field) {
  return money(rows.reduce((total, row) => total + (Number(row[field]) || 0), 0));
}

function periodDate(period) {
  const [monthName, yearText] = String(period || '').trim().split(/\s+/);
  const date = new Date(`${monthName} 1, ${yearText}`);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  const voucherDate = new Date(date.getFullYear(), date.getMonth() + 1, 20);
  const year = voucherDate.getFullYear();
  const month = String(voucherDate.getMonth() + 1).padStart(2, '0');
  const day = String(voucherDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calculateGstr3bPayment(draft = {}) {
  const output = {
    cgst: sum(draft.outwardRows, 'cgst'),
    sgst: sum(draft.outwardRows, 'sgst'),
    igst: sum(draft.outwardRows, 'igst'),
  };
  const available = {
    cgst: sum(draft.itcAvailable, 'cgst'),
    sgst: sum(draft.itcAvailable, 'sgst'),
    igst: sum(draft.itcAvailable, 'igst'),
  };
  const reversed = {
    cgst: sum(draft.itcReversed, 'cgst'),
    sgst: sum(draft.itcReversed, 'sgst'),
    igst: sum(draft.itcReversed, 'igst'),
  };
  const netItc = {
    cgst: Math.max(0, money(available.cgst - reversed.cgst)),
    sgst: Math.max(0, money(available.sgst - reversed.sgst)),
    igst: Math.max(0, money(available.igst - reversed.igst)),
  };
  const utilized = {
    cgst: Math.min(output.cgst, netItc.cgst),
    sgst: Math.min(output.sgst, netItc.sgst),
    igst: Math.min(output.igst, netItc.igst),
  };
  const cash = {
    cgst: Math.max(0, money(output.cgst - utilized.cgst)),
    sgst: Math.max(0, money(output.sgst - utilized.sgst)),
    igst: Math.max(0, money(output.igst - utilized.igst)),
  };
  const lateFee = money((Number(draft.lateFeeCgst) || 0) + (Number(draft.lateFeeSgst) || 0));
  return {
    output,
    netItc,
    utilized,
    cash,
    lateFee,
    outputTotal: money(output.cgst + output.sgst + output.igst),
    itcUtilizedTotal: money(utilized.cgst + utilized.sgst + utilized.igst),
    cashTaxTotal: money(cash.cgst + cash.sgst + cash.igst),
    bankPaymentTotal: money(cash.cgst + cash.sgst + cash.igst + lateFee),
  };
}

export async function postGstr3bAccounting({ user, period, gstin }) {
  const existing = await Gstr3b.findOne({ gstin, period });
  const generated = await buildGstr3bFromSales({ userId: user.id, period, gstin });
  const draft = mergeDraftGstr3b(existing?.toObject(), generated);
  const payment = calculateGstr3bPayment(draft);
  if (payment.outputTotal <= 0 && payment.lateFee <= 0) {
    throw httpError(400, 'No GST liability found for this period');
  }

  const settings = await BusinessSettings.findOne({ userId: user.id }).lean();
  const bankLedger = settings?.bankName || 'Bank';
  const lines = [
    { ledgerName: 'Output GST', ledgerGroup: 'Current Liabilities', side: 'debit', amount: payment.outputTotal, billRef: period, costCenter: 'GST' },
    { ledgerName: 'Input GST', ledgerGroup: 'Current Assets', side: 'credit', amount: payment.itcUtilizedTotal, billRef: period, costCenter: 'GST' },
    { ledgerName: bankLedger, ledgerGroup: 'Bank Accounts', side: 'credit', amount: payment.bankPaymentTotal, billRef: period, costCenter: 'GST' },
  ];
  if (payment.lateFee > 0) {
    lines.push({ ledgerName: 'GST Late Fee', ledgerGroup: 'Indirect Expenses', side: 'debit', amount: payment.lateFee, billRef: period, costCenter: 'GST' });
  }

  const record = existing || await Gstr3b.create({ ...draft, gstin, period });
  const voucher = await upsertSourceVoucher({
    businessId: user.businessId,
    voucherType: 'GST Adjustment',
    date: periodDate(period),
    partyName: 'GST Department',
    referenceNo: period,
    narration: `GST adjustment and payment for ${period}`,
    status: 'Posted',
    sourceType: 'gst-adjustment',
    sourceId: record._id,
    sourceNumber: period,
    lines,
  }, user);

  const updated = await Gstr3b.findOneAndUpdate(
    { _id: record._id },
    {
      $set: {
        ...draft,
        gstin,
        period,
        accountingVoucherId: voucher._id,
        accountingVoucherNo: voucher.voucherNo,
        accountingPostedAt: new Date(),
      },
    },
    { new: true, runValidators: false },
  ).lean();

  return { record: updated, voucher, payment };
}
