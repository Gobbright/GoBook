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

function variantName(variant = {}) {
  return clean(variant.size || variant.modelName);
}

function findProductVariant(product, value) {
  const name = clean(value);
  if (!name) return null;
  return (product?.variants ?? []).find((variant) => variantName(variant) === name) || null;
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

async function generateNextProductCode(userId) {
  const products = await Product.find({ userId }, { code: 1 }).lean();
  const existingCodes = new Set(products.map((p) => String(p.code ?? '').trim().toUpperCase()));
  let max = 1000;
  products.forEach(({ code }) => {
    const n = parseInt(code, 10);
    if (!isNaN(n) && n > max) max = n;
  });
  let candidate = max + 1;
  while (existingCodes.has(String(candidate))) {
    candidate++;
  }
  return String(candidate);
}

// A direct Purchase Entry is often how a brand-new product first enters the
// catalog (no matching Purchase Order to have introduced it already), so
// unlike other inbound/outbound documents it creates the Product on the fly
// instead of silently skipping the line.
async function createProductFromItem(userId, item) {
  const description = clean(item.description);
  if (!description) return null;
  if (item.itemType === 'Service') return null;
  const code = await generateNextProductCode(userId);
  try {
    return await Product.create({
      userId,
      code,
      description,
      hsn: clean(item.hsn),
      unit: clean(item.unit) || 'Nos',
      rate: Number(item.rate) || 0,
      gstRate: [0, 5, 12, 18, 28].includes(Number(item.gstRate)) ? Number(item.gstRate) : 18,
      stock: 0,
      status: 'Active',
    });
  } catch (err) {
    if (err.code === 11000) return Product.findOne({ userId, description: new RegExp(`^${escapeRegex(description)}$`, 'i') });
    throw err;
  }
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
    if (item.itemType === 'Service') continue;
    let product = await findProduct(userId, item);
    if (!product && invoice.documentType === 'purchase-entry') {
      product = await createProductFromItem(userId, item);
    }
    if (!product) continue;
    if (product.itemType === 'Service') continue;
    rows.push({
      product,
      qty,
      rate: Number(item.rate ?? product.rate ?? 0) || 0,
      description: clean(item.description || product.description),
      variantName: clean(item.size),
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
      variantName: clean(movement.variantName),
    });
  }
  return rows;
}

function inventoryMode(documentType) {
  if (['invoice', 'bill-of-supply', 'supplier-return', 'pharmacy-bill'].includes(documentType)) return 'out';
  if (['purchase-entry', 'sales-return'].includes(documentType)) return 'in';
  return '';
}

async function applyRows(rows, direction, { allowNegative = false } = {}) {
  for (const row of rows) {
    const nextStock = Number(row.product.stock || 0) + direction * row.qty;
    if (!allowNegative && nextStock < 0) {
      throw httpError(409, `Insufficient stock for ${row.product.description}. Available ${row.product.stock || 0}, required ${row.qty}`);
    }
    const variant = findProductVariant(row.product, row.variantName);
    if (variant) {
      const nextVariantStock = Number(variant.stock || 0) + direction * row.qty;
      if (!allowNegative && nextVariantStock < 0) {
        throw httpError(409, `Insufficient stock for ${row.product.description} (${row.variantName}). Available ${variant.stock || 0}, required ${row.qty}`);
      }
    }
  }

  for (const row of rows) {
    const variant = findProductVariant(row.product, row.variantName);
    if (variant) {
      const matchBy = clean(variant.size) ? { 'variant.size': clean(variant.size) } : { 'variant.modelName': clean(variant.modelName) };
      await Product.updateOne(
        { _id: row.product._id },
        { $inc: { stock: direction * row.qty, 'variants.$[variant].stock': direction * row.qty } },
        { arrayFilters: [matchBy] },
      );
    } else {
      await Product.updateOne(
        { _id: row.product._id },
        { $inc: { stock: direction * row.qty } },
      );
    }
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
        variantName: row.variantName,
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
        variantName: row.variantName,
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
