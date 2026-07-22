import { AccountingPosting } from '../models/AccountingPosting.js';
import { AccountingVoucher } from '../models/AccountingVoucher.js';

const SOURCE_BY_DOCUMENT_TYPE = {
  invoice: 'invoice',
  'bill-of-supply': 'invoice',
  'e-invoice': 'invoice',
  'e-way-bill': 'invoice',
  'purchase-entry': 'purchase-entry',
  'credit-note': 'credit-note',
  'debit-note': 'debit-note',
  'sales-return': 'sales-return',
  'supplier-return': 'supplier-return',
};

function sourceTypeForDocument(doc = {}) {
  return SOURCE_BY_DOCUMENT_TYPE[doc.documentType || 'invoice'] || '';
}

function toStatus(posting, vouchers = []) {
  const primaryVoucher = vouchers[0] || null;
  return {
    posted: Boolean(posting || primaryVoucher),
    sourceType: posting?.sourceType || primaryVoucher?.sourceType || '',
    sourceNumber: posting?.sourceNumber || primaryVoucher?.sourceNumber || '',
    voucherNo: primaryVoucher?.voucherNo || posting?.journalEntryNos?.[0] || '',
    voucherType: primaryVoucher?.voucherType || '',
    financialYear: primaryVoucher?.financialYear || '',
    voucherId: primaryVoucher?._id || posting?.voucherIds?.[0] || null,
    postedAt: primaryVoucher?.postedAt || posting?.createdAt || null,
  };
}

export async function getAccountingStatusForSource({ userId, sourceType, sourceId }) {
  if (!sourceType || !sourceId) return toStatus(null, []);
  const posting = await AccountingPosting.findOne({ userId, sourceType, sourceId }).lean();
  const voucherIds = posting?.voucherIds || [];
  const vouchers = voucherIds.length
    ? await AccountingVoucher.find({ userId, _id: { $in: voucherIds } }).lean()
    : await AccountingVoucher.find({ userId, sourceType, sourceId }).lean();
  return toStatus(posting, vouchers);
}

export async function attachAccountingStatus(userId, doc) {
  if (!doc) return doc;
  const sourceType = sourceTypeForDocument(doc);
  const accounting = await getAccountingStatusForSource({ userId, sourceType, sourceId: doc._id });
  return { ...doc, accounting };
}

export async function attachAccountingStatusList(userId, docs = []) {
  return Promise.all(docs.map((doc) => attachAccountingStatus(userId, doc)));
}
