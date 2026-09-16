import { Types } from 'mongoose';
import { Invoice } from '../models/Invoice.js';
import { Product } from '../models/Product.js';
import { httpError } from '../utils/httpError.js';

const clean = (value) => String(value || '').trim().toLowerCase();
function purchaseDiscountPercent(purchase) {
  const value = Number(purchase.additionalDiscount?.value) || 0;
  if (purchase.additionalDiscount?.type === 'percent') return Math.min(100, Math.max(0, value));
  const itemTotal = (purchase.items || []).reduce((sum, item) => {
    const gross = Number(item.qty) * Number(item.rate);
    const discount = item.discountType === 'amount' ? Math.min(gross, Number(item.discount) || 0) : gross * (Number(item.discount) || 0) / 100;
    return sum + (gross - discount) * (1 + (Number(item.gstRate) || 0) / 100);
  }, 0);
  const total = itemTotal + (purchase.charges || []).reduce((sum, charge) => sum + Number(charge.amount || 0) * (1 + Number(charge.gstRate || 0) / 100), 0);
  return total > 0 ? Math.min(100, Math.max(0, value / total * 100)) : 0;
}
export function returnItemKey(item) {
  const gross = Number(item.rate) * Number(item.qty);
  const discountPercent = item.discountType === 'amount' ? (gross > 0 ? Number(item.discount || 0) / gross * 100 : 0) : Number(item.discount || 0);
  return JSON.stringify([clean(item.description), clean(item.size), clean(item.unit), Number(item.rate), Number(item.gstRate || 0), Math.round(discountPercent * 1e6) / 1e6]);
}

export function remainingPurchaseItems(purchase, returns = []) {
  // Quantity history remains valid for older returns with different discounts.
  const quantityKey = (item) => JSON.stringify([clean(item.description), clean(item.size), clean(item.unit), Number(item.rate), Number(item.gstRate || 0)]);
  const used = new Map();
  for (const note of returns) for (const item of note.items || []) {
    const key = quantityKey(item);
    used.set(key, (used.get(key) || 0) + Number(item.qty || 0));
  }
  return (purchase.items || []).map((item) => {
    const key = quantityKey(item);
    const returnedQty = Math.min(Number(item.qty), used.get(key) || 0);
    used.set(key, Math.max(0, (used.get(key) || 0) - returnedQty));
    return { ...item, purchasedQty: Number(item.qty), returnedQty, remainingQty: Math.max(0, Number(item.qty) - returnedQty) };
  });
}

export async function purchaseReturnDetails(userId, purchaseId, excludeId) {
  if (!Types.ObjectId.isValid(String(purchaseId))) throw httpError(400, 'Select an original purchase entry');
  const purchase = await Invoice.findOne({ _id: purchaseId, userId, documentType: 'purchase-entry' }).lean();
  if (!purchase) throw httpError(404, 'Purchase entry not found for this account');
  const filter = { userId, documentType: 'supplier-return', $or: [
    { 'extra.originalPurchaseId': String(purchase._id) },
    { 'extra.originalInvoiceNo': purchase.number },
  ] };
  if (excludeId && Types.ObjectId.isValid(String(excludeId))) filter._id = { $ne: excludeId };
  const returns = await Invoice.find(filter).lean();
  const overallDiscount = purchaseDiscountPercent(purchase);
  const items = remainingPurchaseItems(purchase, returns).map((item) => {
    const gross = Number(item.rate) * Number(item.qty);
    const lineDiscount = item.discountType === 'amount' ? (gross > 0 ? Number(item.discount || 0) / gross * 100 : 0) : Number(item.discount || 0);
    return { ...item, discountType: 'percent', discount: 100 - (100 - lineDiscount) * (1 - overallDiscount / 100) };
  });
  return { ...purchase, returnDiscountPercent: 0, items };
}

export function validateReturnLines(items, available) {
  if (!Array.isArray(items) || !items.length) throw httpError(400, 'Add at least one returned item');
  const balances = new Map();
  for (const item of available) {
    const key = returnItemKey(item);
    balances.set(key, (balances.get(key) || 0) + item.remainingQty);
  }
  for (const item of items) {
    const qty = Number(item.qty);
    if (!Number.isFinite(qty) || qty <= 0) throw httpError(400, 'Return quantities must be greater than zero');
    for (const field of ['rate', 'gstRate', 'discount']) {
      if (!Number.isFinite(Number(item[field] || 0)) || Number(item[field] || 0) < 0) throw httpError(400, `Invalid item ${field}`);
    }
    if (Number(item.gstRate || 0) > 100 || (item.discountType !== 'amount' && Number(item.discount || 0) > 100)) throw httpError(400, 'Invalid tax or discount percentage');
    const key = returnItemKey(item);
    if (!balances.has(key)) throw httpError(400, `${item.description}: item, variant, rate and GST must match the selected purchase`);
    const remaining = balances.get(key);
    if (qty > remaining + 0.000001) throw httpError(409, `${item.description}: only ${remaining} units remain returnable`);
    balances.set(key, remaining - qty);
  }
}

export async function prepareSupplierReturn(body, userId, excludeId) {
  if (!String(body.number || '').trim()) throw httpError(400, 'Return number is required');
  if (!String(body.extra?.reason || '').trim()) throw httpError(400, 'Reason for return is required');
  const purchase = await purchaseReturnDetails(userId, body.extra?.originalPurchaseId, excludeId);
  const date = body.meta?.date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !Number.isFinite(Date.parse(date))) throw httpError(400, 'A valid return date is required');
  if (new Date(date).toISOString().slice(0, 10) !== date) throw httpError(400, 'A valid return date is required');
  if (purchase.meta?.date && date < purchase.meta.date) throw httpError(400, 'Return date cannot precede the purchase date');
  if (clean(body.customer?.name) !== clean(purchase.customer?.name)) throw httpError(400, 'Supplier must match the selected purchase');
  validateReturnLines(body.items, purchase.items);
  const items = [];
  for (const item of body.items) {
    const source = purchase.items.find((row) => returnItemKey(row) === returnItemKey(item));
    const qty = Number(item.qty);
    // Retain the purchase discount per unit when making a partial return.
    const discount = source.discountType === 'amount'
      ? (Number(source.rate) * Number(source.qty) > 0 ? Number(source.discount || 0) / (Number(source.rate) * Number(source.qty)) * 100 : 0)
      : Number(source.discount || 0);
    let productId = source.productId;
    if (source.itemType !== 'Service') {
      const product = await Product.findOne({ userId, ...(productId ? { _id: productId } : source.productCode ? { code: source.productCode } : { description: source.description }) }).lean();
      if (!product) throw httpError(400, `${source.description}: inventory product is missing; restore it before returning stock`);
      productId = product._id;
    }
    items.push({ ...source, productId, qty, discount, discountType: 'percent', _id: undefined });
  }
  // Returns settle against the supplier ledger. Payments and unrelated charges
  // must not turn this stock return into an unrecorded cash refund.
  if ((body.charges || []).some((c) => Number(c.amount)) || body.tds?.enabled || body.tcs?.enabled) {
    throw httpError(400, 'Supplier returns use original item rates and discounts; remove extra charges, TDS and TCS');
  }
  let taxable = 0;
  let totalGst = 0;
  for (const item of items) {
    const gross = item.qty * Number(item.rate);
    const base = gross - (item.discountType === 'amount' ? Math.min(gross, item.discount) : gross * item.discount / 100);
    taxable += base;
    totalGst += base * Number(item.gstRate || 0) / 100;
  }
  const addDiscAmt = 0;
  const netPayable = taxable + totalGst - addDiscAmt;
  const finalTotal = Math.round(netPayable);
  return { ...body, documentType: 'supplier-return', customer: purchase.customer, items,
    supplyType: purchase.supplyType, branch: purchase.branch,
    charges: [], additionalDiscount: { type: 'percent', value: purchase.returnDiscountPercent }, tds: { enabled: false }, tcs: { enabled: false },
    advanceReceived: 0, paymentMethod: '', paymentSplits: [],
    totals: { taxable, totalGst, addDiscAmt, netPayable, finalTotal, roundOff: finalTotal - netPayable, balanceDue: finalTotal },
    extra: { ...body.extra, originalPurchaseId: String(purchase._id), originalInvoiceNo: purchase.number,
      originalInvoiceDate: purchase.meta?.date, vendorInvoiceNo: purchase.extra?.vendorInvoiceNo || '' },
  };
}
