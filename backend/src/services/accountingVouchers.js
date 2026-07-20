import { AccountingVoucher, VOUCHER_TYPES } from '../models/AccountingVoucher.js';
import { BusinessSettings } from '../models/BusinessSettings.js';
import { LedgerAccount } from '../models/LedgerAccount.js';
import { httpError } from '../utils/httpError.js';

const DEFAULT_LEDGER_GROUP = 'Indirect Expenses';
const VOUCHER_PREFIX = {
  Sales: 'SAL',
  Purchase: 'PUR',
  Receipt: 'RCT',
  Payment: 'PAY',
  Contra: 'CON',
  Journal: 'JRN',
  'Debit Note': 'DBN',
  'Credit Note': 'CRN',
  'Stock Journal': 'STJ',
  'GST Adjustment': 'GST',
  'Opening Balance': 'OB',
};

function money(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function cleanText(value) {
  return String(value ?? '').trim();
}

function fyStartMonth(fyStart = '01 April') {
  const monthName = String(fyStart).trim().split(/\s+/).pop() || 'April';
  const monthIndex = new Date(`${monthName} 1, 2000`).getMonth();
  return Number.isFinite(monthIndex) && monthIndex >= 0 ? monthIndex : 3;
}

function financialYearOf(dateValue, fyStart = '01 April') {
  const date = new Date(dateValue || new Date());
  const month = Number.isNaN(date.getTime()) ? new Date().getMonth() : date.getMonth();
  const year = Number.isNaN(date.getTime()) ? new Date().getFullYear() : date.getFullYear();
  const startMonth = fyStartMonth(fyStart);
  const startYear = month >= startMonth ? year : year - 1;
  return `${startYear}-${String(startYear + 1).slice(-2)}`;
}

async function getFinancialYear(userId, dateValue) {
  const settings = await BusinessSettings.findOne({ userId }).lean();
  return financialYearOf(dateValue, settings?.fyStart);
}

function normalizeLines(lines = []) {
  return lines
    .map((line) => ({
      ledgerId: line.ledgerId || undefined,
      ledgerName: cleanText(line.ledgerName || line.accountName || line.name),
      ledgerGroup: cleanText(line.ledgerGroup || line.group),
      side: line.side,
      amount: money(line.amount),
      billRef: cleanText(line.billRef),
      costCenter: cleanText(line.costCenter),
      narration: cleanText(line.narration),
    }))
    .filter((line) => line.ledgerName && ['debit', 'credit'].includes(line.side) && line.amount > 0);
}

function totalsOf(lines) {
  return {
    debitTotal: money(lines.filter((line) => line.side === 'debit').reduce((sum, line) => sum + line.amount, 0)),
    creditTotal: money(lines.filter((line) => line.side === 'credit').reduce((sum, line) => sum + line.amount, 0)),
  };
}

function assertVoucherPayload(payload, options = {}) {
  if (!VOUCHER_TYPES.includes(payload.voucherType)) throw httpError(400, 'Invalid voucher type');
  if (!payload.date) throw httpError(400, 'Voucher date is required');
  if (!payload.voucherNo) throw httpError(400, 'Voucher number is required');
  if (payload.lines.length < 2) throw httpError(400, 'At least two voucher lines are required');

  const { debitTotal, creditTotal } = totalsOf(payload.lines);
  if (payload.status !== 'Draft' || options.requireBalancedDraft) {
    if (Math.abs(debitTotal - creditTotal) >= 0.01) {
      throw httpError(400, 'Voucher debit and credit totals must match');
    }
  }
}

async function ensureLedger(userId, line) {
  const group = line.ledgerGroup || DEFAULT_LEDGER_GROUP;
  const result = await LedgerAccount.findOneAndUpdate(
    { userId, name: line.ledgerName },
    { $setOnInsert: { userId, name: line.ledgerName, group, opening: 0, debit: 0, credit: 0, color: '#2563eb' } },
    { new: true, upsert: true, runValidators: true },
  ).lean();
  line.ledgerId = line.ledgerId || result._id;
  line.ledgerGroup = line.ledgerGroup || result.group;
  return line;
}

async function applyLines(userId, lines, multiplier = 1) {
  for (const line of lines) {
    await LedgerAccount.updateOne(
      { userId, name: line.ledgerName },
      { $inc: { [line.side]: money(line.amount * multiplier) } },
    );
  }
}

export async function getNextVoucherNo(userId, voucherType, dateValue = new Date().toISOString().slice(0, 10)) {
  if (!VOUCHER_TYPES.includes(voucherType)) throw httpError(400, 'Invalid voucher type');
  const prefix = VOUCHER_PREFIX[voucherType] || 'VCH';
  const financialYear = await getFinancialYear(userId, dateValue);
  const fyShort = financialYear.split('-').map((part) => part.slice(-2)).join('-');
  const last = await AccountingVoucher.findOne(
    { userId, financialYear, voucherType, voucherNo: new RegExp(`^${prefix}-${fyShort}-`, 'i') },
    { voucherNo: 1 },
    { sort: { createdAt: -1 } },
  ).lean();
  let seq = 1;
  if (last?.voucherNo) {
    const n = Number(String(last.voucherNo).split('-').pop());
    if (Number.isFinite(n)) seq = n + 1;
  }
  return `${prefix}-${fyShort}-${String(seq).padStart(5, '0')}`;
}

export async function normalizeVoucherPayload(body, reqUser, existing = null) {
  const lines = normalizeLines(body.lines);
  for (const line of lines) await ensureLedger(reqUser.id, line);
  const totals = totalsOf(lines);
  const date = cleanText(body.date || existing?.date || new Date().toISOString().slice(0, 10));
  const dateChanged = existing && body.date && body.date !== existing.date;
  const financialYear = body.financialYear
    || (dateChanged ? await getFinancialYear(reqUser.id, date) : existing?.financialYear)
    || await getFinancialYear(reqUser.id, date);
  return {
    userId: reqUser.id,
    businessId: reqUser.businessId || body.businessId || existing?.businessId,
    voucherType: body.voucherType || existing?.voucherType || 'Journal',
    voucherNo: cleanText(body.voucherNo || existing?.voucherNo),
    financialYear,
    date,
    partyName: cleanText(body.partyName),
    referenceNo: cleanText(body.referenceNo),
    narration: cleanText(body.narration),
    status: body.status || existing?.status || 'Posted',
    sourceType: cleanText(body.sourceType),
    sourceId: body.sourceId || undefined,
    sourceNumber: cleanText(body.sourceNumber),
    ...totals,
    lines,
    updatedBy: reqUser.id,
    postedAt: body.status === 'Draft' ? existing?.postedAt : (existing?.postedAt || new Date()),
  };
}

export async function createAccountingVoucher(body, reqUser, options = {}) {
  const payload = await normalizeVoucherPayload(body, reqUser);
  if (!payload.voucherNo) payload.voucherNo = await getNextVoucherNo(reqUser.id, payload.voucherType, payload.date);
  assertVoucherPayload(payload, options);

  const postToLedger = options.postToLedger !== false;
  if (postToLedger && payload.status === 'Posted') await applyLines(reqUser.id, payload.lines, 1);

  try {
    return AccountingVoucher.create({ ...payload, createdBy: reqUser.id });
  } catch (err) {
    if (postToLedger && payload.status === 'Posted') await applyLines(reqUser.id, payload.lines, -1);
    throw err;
  }
}

export async function updateAccountingVoucher(id, body, reqUser, options = {}) {
  const existing = await AccountingVoucher.findOne({ _id: id, userId: reqUser.id });
  if (!existing) throw httpError(404, 'Voucher not found');
  if (existing.sourceType && existing.sourceId && !options.allowSourceMutation) {
    throw httpError(409, 'Source-linked vouchers must be updated from their original document');
  }
  const postToLedger = options.postToLedger !== false;
  const oldLines = existing.lines.map((line) => line.toObject ? line.toObject() : line);
  const oldStatus = existing.status;
  if (postToLedger && oldStatus === 'Posted') await applyLines(reqUser.id, oldLines, -1);

  const payload = await normalizeVoucherPayload(body, reqUser, existing);
  assertVoucherPayload(payload, options);

  try {
    if (postToLedger && payload.status === 'Posted') await applyLines(reqUser.id, payload.lines, 1);
    Object.assign(existing, payload);
    return existing.save();
  } catch (err) {
    if (postToLedger && payload.status === 'Posted') await applyLines(reqUser.id, payload.lines, -1);
    if (postToLedger && oldStatus === 'Posted') await applyLines(reqUser.id, oldLines, 1);
    throw err;
  }
}

export async function deleteAccountingVoucher(id, reqUser) {
  const voucher = await AccountingVoucher.findOne({ _id: id, userId: reqUser.id });
  if (!voucher) throw httpError(404, 'Voucher not found');
  if (voucher.sourceType && voucher.sourceId) {
    throw httpError(409, 'Source-linked vouchers must be deleted from their original document');
  }
  if (voucher.status === 'Posted') await applyLines(reqUser.id, voucher.lines, -1);
  await voucher.deleteOne();
  return voucher;
}

export async function reverseSourceVoucher({ userId, sourceType, sourceId, postToLedger = true }) {
  const voucher = await AccountingVoucher.findOne({ userId, sourceType, sourceId });
  if (!voucher) return null;
  if (postToLedger && voucher.status === 'Posted') await applyLines(userId, voucher.lines, -1);
  await voucher.deleteOne();
  return voucher;
}

export async function upsertSourceVoucher(body, reqUser, options = {}) {
  if (!body.sourceType || !body.sourceId) {
    throw httpError(400, 'Source voucher requires sourceType and sourceId');
  }
  await reverseSourceVoucher({
    userId: reqUser.id,
    sourceType: body.sourceType,
    sourceId: body.sourceId,
    postToLedger: options.postToLedger !== false,
  });
  return createAccountingVoucher(body, reqUser, options);
}

export { VOUCHER_TYPES };
