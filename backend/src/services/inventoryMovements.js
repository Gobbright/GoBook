import { Types } from 'mongoose';

import { Product } from '../models/Product.js';
import { StockIn } from '../models/StockIn.js';
import { StockOut } from '../models/StockOut.js';
import { httpError } from '../utils/httpError.js';

function clean(value) {
  return String(value ?? '').trim();
}

function money(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function escapeRegex(str) {
  return clean(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function nextStockNo(Model, userId, field, prefix) {
  const last = await Model.findOne({ userId }, { [field]: 1 }, { sort: { createdAt: -1 } }).lean();
  let seq = 1;
  if (last?.[field]) {
    const n = parseInt(String(last[field]).split('-').pop(), 10);
    if (Number.isFinite(n)) seq = n + 1;
  }
  return `${prefix}-${new Date().getFullYear()}-${String(seq).padStart(3, '0')}`;
}

async function findProduct(userId, item) {
  const productId = item.productId && Types.ObjectId.isValid(String(item.productId))
    ? item.productId
    : null;
  if (productId) {
    const byId = await Product.findOne({ _id: productId, userId });
    if (byId) return byId;
  }

  const productCode = clean(item.productCode || item.code);
  if (productCode) {
    const byCode = await Product.findOne({ userId, code: productCode.toUpperCase() });
    if (byCode) return byCode;
  }

  const barcode = clean(item.barcode);
  if (barcode) {
    const byBarcode = await Product.findOne({ userId, barcode });
    if (byBarcode) return byBarcode;
  }

  const description = clean(item.description);
  if (!description) return null;
  return Product.findOne({ userId, description: new RegExp(`^${escapeRegex(description)}$`, 'i') });
}

async function collectMovableItems(invoice, userId) {
  const rows = [];
  for (const item of invoice.items ?? []) {
    const qty = Number(item.qty) || 0;
    if (qty <= 0) continue;
    const product = await findProduct(userId, item);
    if (!product) continue;
    rows.push({
      product,
      qty,
      rate: Number(item.rate ?? product.rate ?? 0) || 0,
      description: clean(item.description || product.description),
    });
  }
  return rows;
}

async function collectRowsFromMovements(movements, userId) {
  const rows = [];
  for (const movement of movements ?? []) {
    const qty = Number(movement.totalQty) || 0;
    if (qty <= 0) continue;
    let product = null;
    if (movement.productId && Types.ObjectId.isValid(String(movement.productId))) {
      product = await Product.findOne({ _id: movement.productId, userId });
    }
    if (!product && movement.productName) {
      product = await Product.findOne({
        userId,
        description: new RegExp(`^${escapeRegex(movement.productName)}$`, 'i'),
      });
    }
    if (!product) continue;
    rows.push({
      product,
      qty,
      rate: Number(movement.totalValue || 0) / qty,
      description: clean(movement.productName || product.description),
    });
  }
  return rows;
}

function inventoryMode(documentType) {
  if (['invoice', 'bill-of-supply', 'supplier-return'].includes(documentType)) return 'out';
  if (['purchase-entry', 'sales-return'].includes(documentType)) return 'in';
  return '';
}

async function applyRows(rows, direction, { allowNegative = false } = {}) {
  for (const row of rows) {
    const nextStock = Number(row.product.stock || 0) + direction * row.qty;
    if (!allowNegative && nextStock < 0) {
      throw httpError(409, `Insufficient stock for ${row.product.description}. Available ${row.product.stock || 0}, required ${row.qty}`);
    }
  }

  for (const row of rows) {
    await Product.updateOne(
      { _id: row.product._id },
      { $inc: { stock: direction * row.qty } },
    );
  }
}

export async function reverseInventoryForDocument(invoice, userId) {
  const mode = inventoryMode(invoice.documentType);
  if (!mode || !invoice?._id) return null;

  const sourceFilter = { userId, sourceType: invoice.documentType, sourceId: invoice._id };
  const existingMovements = mode === 'out'
    ? await StockOut.find(sourceFilter).lean()
    : await StockIn.find(sourceFilter).lean();
  if (!existingMovements.length) return { reversed: 0 };

  const rows = await collectRowsFromMovements(existingMovements, userId);
  if (rows.length > 0) {
    await applyRows(rows, mode === 'out' ? 1 : -1, { allowNegative: true });
  }

  await Promise.all([
    StockOut.deleteMany(sourceFilter),
    StockIn.deleteMany(sourceFilter),
  ]);
  return { reversed: rows.length };
}

export async function postInventoryForDocument(invoice, userId) {
  const mode = inventoryMode(invoice.documentType);
  if (!mode || !invoice?._id) return null;

  await reverseInventoryForDocument(invoice, userId);

  const rows = await collectMovableItems(invoice, userId);
  if (rows.length === 0) return { posted: false, reason: 'No matching inventory products found' };

  await applyRows(rows, mode === 'out' ? -1 : 1);
  const date = invoice.meta?.date ? new Date(invoice.meta.date) : new Date();

  if (mode === 'out') {
    for (const row of rows) {
      const stockOutNo = await nextStockNo(StockOut, userId, 'stockOutNo', 'SOUT');
      await StockOut.create({
        userId,
        stockOutNo,
        date,
        productId: row.product._id,
        productName: row.product.description,
        to: invoice.customer?.name || 'Customer',
        itemCount: 1,
        totalQty: row.qty,
        totalValue: money(row.qty * row.rate),
        status: 'Completed',
        sourceType: invoice.documentType,
        sourceId: invoice._id,
        sourceNo: invoice.number,
      });
    }
  } else {
    for (const row of rows) {
      const stockInNo = await nextStockNo(StockIn, userId, 'stockInNo', 'SIN');
      await StockIn.create({
        userId,
        stockInNo,
        date,
        productId: row.product._id,
        productName: row.product.description,
        supplier: invoice.customer?.name || 'Vendor',
        itemCount: 1,
        totalQty: row.qty,
        totalValue: money(row.qty * row.rate),
        status: 'Completed',
        sourceType: invoice.documentType,
        sourceId: invoice._id,
        sourceNo: invoice.number,
      });
    }
  }

  return {
    posted: true,
    itemCount: rows.length,
    totalQty: rows.reduce((sum, row) => sum + row.qty, 0),
    totalValue: money(rows.reduce((sum, row) => sum + row.qty * row.rate, 0)),
  };
}
