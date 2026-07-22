import ExcelJS from 'exceljs';
import multer from 'multer';

import { Product } from '../../../models/Product.js';
import { StockIn } from '../../../models/StockIn.js';
import { StockOut } from '../../../models/StockOut.js';
import { httpError } from '../../../utils/httpError.js';

export const uploadProductsFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/\.xlsx$/i.test(file.originalname)) cb(null, true);
    else cb(httpError(400, 'Only .xlsx files are supported'));
  },
});

const FIELD_ALIASES = {
  'product name': 'description',
  description: 'description',
  name: 'description',
  'item name': 'description',
  item: 'description',
  sku: 'code',
  code: 'code',
  'product code': 'code',
  'product id': 'code',
  'item code': 'code',
  category: 'category',
  unit: 'unit',
  uom: 'unit',
  rate: 'rate',
  price: 'rate',
  'sale price': 'rate',
  'sales price': 'rate',
  'sale rate': 'rate',
  'selling price': 'rate',
  mrp: 'rate',
  gst: 'gstRate',
  'gst rate': 'gstRate',
  tax: 'gstRate',
  'tax rate': 'gstRate',
  stock: 'stock',
  quantity: 'stock',
  qty: 'stock',
  'opening stock': 'stock',
  'current stock': 'stock',
  'current qty': 'stock',
  'current quantity': 'stock',
  'min stock': 'minStockLevel',
  'min stock level': 'minStockLevel',
  'minimum stock': 'minStockLevel',
  'reorder level': 'minStockLevel',
  hsn: 'hsn',
  'hsn code': 'hsn',
  'hsn sac': 'hsn',
  sac: 'hsn',
  barcode: 'barcode',
  'bar code': 'barcode',
  'barcode no': 'barcode',
  'barcode number': 'barcode',
  status: 'status',
};

function normalizeHeader(value) {
  if (value == null) return null;
  const text = typeof value === 'object' ? (value.richText?.map((r) => r.text).join('') ?? value.text ?? '') : String(value);
  const key = text
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return FIELD_ALIASES[key] ?? null;
}

function cellValue(value) {
  if (value == null) return '';
  if (typeof value === 'object') {
    if ('result' in value) return value.result ?? '';
    if (Array.isArray(value.richText)) return value.richText.map((r) => r.text).join('');
    if ('text' in value) return value.text ?? '';
  }
  return value;
}

function parseSheetNumber(value) {
  if (typeof value === 'number') return value;
  const text = String(cellValue(value) ?? '')
    .replace(/₹/g, '')
    .replace(/,/g, '')
    .replace(/%/g, '')
    .trim();
  if (!text) return NaN;
  return Number(text);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function findProductForImport(userId, { code, barcode, description, hsn }) {
  const or = [];
  if (code) or.push({ code });
  if (barcode) or.push({ barcode });
  if (description && hsn) {
    or.push({
      description: new RegExp(`^${escapeRegExp(description)}$`, 'i'),
      hsn,
    });
  }
  if (!or.length) return null;
  return Product.findOne({ userId, $or: or }).lean();
}

function normalizeProductPayload(body = {}) {
  const payload = {};

  if ('description' in body) payload.description = String(body.description ?? '').trim();
  if ('code' in body) payload.code = String(body.code ?? '').trim().toUpperCase();
  if ('hsn' in body) payload.hsn = String(body.hsn ?? '').trim();
  if ('category' in body) payload.category = String(body.category ?? '').trim();
  if ('brand' in body) payload.brand = String(body.brand ?? '').trim();
  if ('unit' in body) payload.unit = String(body.unit ?? '').trim() || 'Nos';
  if ('barcode' in body) payload.barcode = String(body.barcode ?? '').trim();
  if ('status' in body) payload.status = String(body.status ?? '').trim() || 'Active';

  if ('rate' in body) payload.rate = Number(body.rate);
  if ('stock' in body) payload.stock = Number(body.stock);
  if ('minStockLevel' in body) payload.minStockLevel = Number(body.minStockLevel);
  if ('gstRate' in body) payload.gstRate = Number(body.gstRate);

  return payload;
}

function validateProductPayload(payload, { partial = false } = {}) {
  if (!partial || 'description' in payload) {
    if (!payload.description) return 'Product name is required';
  }

  if (!partial || 'code' in payload) {
    if (!payload.code) return 'Product ID / code is required';
  }

  if (!partial || 'rate' in payload) {
    if (!Number.isFinite(payload.rate) || payload.rate < 0) return 'Valid sale price is required';
  }

  if ('stock' in payload && (!Number.isFinite(payload.stock) || payload.stock < 0)) {
    return 'Stock must be 0 or more';
  }

  if ('minStockLevel' in payload && (!Number.isFinite(payload.minStockLevel) || payload.minStockLevel < 0)) {
    return 'Minimum stock level must be 0 or more';
  }

  if ('gstRate' in payload && ![0, 5, 12, 18, 28].includes(payload.gstRate)) {
    return 'GST rate must be one of 0, 5, 12, 18, 28';
  }

  if ('status' in payload && !['Active', 'Inactive'].includes(payload.status)) {
    return 'Status must be Active or Inactive';
  }

  return '';
}

async function nextStockInNo(userId) {
  const last = await StockIn.findOne({ userId }, { stockInNo: 1 }, { sort: { createdAt: -1 } });
  let seq = 1;
  if (last) {
    const parts = last.stockInNo.split('-');
    const n = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(n)) seq = n + 1;
  }
  return `SIN-${new Date().getFullYear()}-${String(seq).padStart(3, '0')}`;
}

async function nextStockOutNo(userId) {
  const last = await StockOut.findOne({ userId }, { stockOutNo: 1 }, { sort: { createdAt: -1 } });
  let seq = 1;
  if (last) {
    const parts = last.stockOutNo.split('-');
    const n = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(n)) seq = n + 1;
  }
  return `SOUT-${new Date().getFullYear()}-${String(seq).padStart(3, '0')}`;
}

async function createProductStockMovement(userId, product, qtyDiff, reason = 'Stock Adjustment') {
  const qty = Math.abs(Number(qtyDiff) || 0);
  if (!product || qty <= 0) return;
  if (qtyDiff > 0) {
    await StockIn.create({
      userId,
      stockInNo: await nextStockInNo(userId),
      date: new Date(),
      productId: product._id,
      productName: product.description,
      supplier: reason,
      itemCount: 1,
      totalQty: qty,
      totalValue: qty * product.rate,
      status: 'Completed',
      sourceType: reason === 'Initial Stock' ? 'product-opening' : 'product-adjustment',
      sourceId: product._id,
      sourceNo: product.code,
    });
  } else {
    await StockOut.create({
      userId,
      stockOutNo: await nextStockOutNo(userId),
      date: new Date(),
      productId: product._id,
      productName: product.description,
      to: reason,
      itemCount: 1,
      totalQty: qty,
      totalValue: qty * product.rate,
      status: 'Completed',
      sourceType: 'product-adjustment',
      sourceId: product._id,
      sourceNo: product.code,
    });
  }
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

// GET /api/inventory/products/stats
export async function getProductStats(req, res, next) {
  try {
    const userId = req.user.id;
    const [total, lowStock, outOfStock, valueResult] = await Promise.all([
      Product.countDocuments({ userId, status: 'Active' }),
      Product.countDocuments({ userId, status: 'Active', stock: { $gt: 0 }, $expr: { $lte: ['$stock', '$minStockLevel'] } }),
      Product.countDocuments({ userId, status: 'Active', stock: 0 }),
      Product.aggregate([
        { $match: { userId, status: 'Active' } },
        { $group: { _id: null, totalValue: { $sum: { $multiply: ['$rate', '$stock'] } } } },
      ]),
    ]);
    res.json({
      total,
      lowStock,
      outOfStock,
      totalValue: valueResult[0]?.totalValue ?? 0,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/inventory/products/next-code
export async function getNextProductCode(req, res, next) {
  try {
    const products = await Product.find({ userId: req.user.id }, { code: 1 }).lean();
    let max = 1000;
    products.forEach(({ code }) => {
      const n = parseInt(code, 10);
      if (!isNaN(n) && n > max) max = n;
    });
    res.json({ code: String(max + 1) });
  } catch (err) {
    next(err);
  }
}

// GET /api/inventory/products?search=&category=&page=&limit=
export async function listProducts(req, res, next) {
  try {
    const { search, category, page = 1, limit = 50 } = req.query;
    const filter = { userId: req.user.id };
    if (search) {
      filter.$or = [
        { description: new RegExp(search, 'i') },
        { code: new RegExp(search, 'i') },
        { barcode: new RegExp(search, 'i') },
        { hsn: new RegExp(search, 'i') },
      ];
    }
    if (category && category !== 'All Categories') filter.category = category;

    const skip = (Number(page) - 1) * Number(limit);
    const [products, total] = await Promise.all([
      Product.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(Number(limit)).lean(),
      Product.countDocuments(filter),
    ]);
    res.json({ data: products, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
}

// GET /api/inventory/products/categories
export async function getCategories(req, res, next) {
  try {
    const categories = await Product.distinct('category', { userId: req.user.id });
    res.json(categories.filter(Boolean).sort());
  } catch (err) {
    next(err);
  }
}

// GET /api/inventory/products/brands
export async function getBrands(req, res, next) {
  try {
    const brands = await Product.distinct('brand', { userId: req.user.id });
    res.json(brands.filter(Boolean).sort());
  } catch (err) {
    next(err);
  }
}

// GET /api/inventory/products/:id
export async function getProduct(req, res, next) {
  try {
    const product = await Product.findOne({ _id: req.params.id, userId: req.user.id }).lean();
    if (!product) return next(httpError(404, 'Product not found'));
    res.json(product);
  } catch (err) {
    next(err);
  }
}

// POST /api/inventory/products/import
export async function importProducts(req, res, next) {
  try {
    if (!req.file) return next(httpError(400, 'No file uploaded'));
    const userId = req.user.id;

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) return next(httpError(400, 'No worksheet found in file'));

    const headers = {};
    sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const field = normalizeHeader(cell.value);
      if (field) headers[colNumber] = field;
    });

    if (Object.keys(headers).length === 0) {
      return next(httpError(400, 'No recognizable columns found. Expected columns like Product Name, Code, Rate, etc.'));
    }

    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const errors = [];

    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
      const row = sheet.getRow(rowNumber);
      const record = {};
      for (const [colNumber, field] of Object.entries(headers)) {
        record[field] = cellValue(row.getCell(Number(colNumber)).value);
      }

      const description = String(record.description ?? '').trim();
      let code = String(record.code ?? '').trim().toUpperCase();
      const barcode = String(record.barcode ?? '').trim();
      const hsn = String(record.hsn ?? '').trim();
      if (!description && !code && !barcode) continue;

      const rate = parseSheetNumber(record.rate);
      if (!description || record.rate === '' || record.rate == null || !Number.isFinite(rate) || rate < 0) {
        skipped++;
        errors.push(`Row ${rowNumber}: missing or invalid required field (Product Name or Sale Price)`);
        continue;
      }

      const before = await findProductForImport(userId, { code, barcode, description, hsn });
      if (!code) code = before?.code || await generateNextProductCode(userId);

      const data = { userId, code, description, rate };
      if (record.category) data.category = String(record.category).trim();
      if (record.unit) data.unit = String(record.unit).trim();
      if (hsn) data.hsn = hsn;
      if (barcode) data.barcode = barcode;
      if (record.gstRate !== '') {
        const g = parseSheetNumber(record.gstRate);
        if ([0, 5, 12, 18, 28].includes(g)) data.gstRate = g;
      }
      if (record.stock !== '') {
        const s = parseSheetNumber(record.stock);
        if (Number.isFinite(s)) data.stock = Math.max(0, s);
      }
      if (record.minStockLevel !== '') {
        const m = parseSheetNumber(record.minStockLevel);
        if (Number.isFinite(m)) data.minStockLevel = Math.max(0, m);
      }
      if (record.status) {
        const st = String(record.status).trim().toLowerCase();
        if (st === 'active') data.status = 'Active';
        else if (st === 'inactive') data.status = 'Inactive';
      }

      try {
        const savedProduct = await Product.findOneAndUpdate(
          { userId, code: before?.code || code },
          { $set: data },
          { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
        );

        const isNew = !before;
        let stockQty;
        let supplier;

        if (isNew) {
          imported++;
          stockQty = data.stock ?? 0;
          supplier = 'Initial Stock';
        } else {
          updated++;
          stockQty = data.stock !== undefined ? data.stock - (before.stock ?? 0) : 0;
          supplier = 'Stock Adjustment';
        }

        if (stockQty !== 0) {
          try {
            await createProductStockMovement(userId, savedProduct, stockQty, supplier);
          } catch {
            // ignore stock movement logging failure; product import already succeeded
          }
        }
      } catch (err) {
        skipped++;
        errors.push(`Row ${rowNumber}: ${err.message}`);
      }
    }

    res.json({ imported, updated, skipped, errors });
  } catch (err) {
    next(err);
  }
}

// POST /api/inventory/products
export async function createProduct(req, res, next) {
  try {
    const userId = req.user.id;
    const payload = normalizeProductPayload(req.body);
    if (!payload.code) {
      payload.code = await generateNextProductCode(userId);
    }
    const validationError = validateProductPayload(payload);
    if (validationError) return next(httpError(400, validationError));
    let product;
    let attempts = 0;

    while (!product && attempts < 5) {
      attempts++;
      try {
        product = await Product.create({ ...payload, userId });
      } catch (err) {
        if (err.code !== 11000) throw err;
        payload.code = await generateNextProductCode(userId);
      }
    }

    if (!product) {
      return next(httpError(409, 'Unable to generate a unique product code. Please try again.'));
    }

    if (product.stock > 0) {
      createProductStockMovement(userId, product, product.stock, 'Initial Stock').catch(() => {});
    }

    res.status(201).json(product);
  } catch (err) {
    if (err.code === 11000) return next(httpError(409, `Product code "${req.body.code}" already exists`));
    next(err);
  }
}

// PUT /api/inventory/products/:id
export async function updateProduct(req, res, next) {
  try {
    const userId = req.user.id;
    const old = await Product.findOne({ _id: req.params.id, userId }).lean();
    const payload = normalizeProductPayload(req.body);
    const validationError = validateProductPayload(payload, { partial: true });
    if (validationError) return next(httpError(400, validationError));

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, userId },
      { $set: payload },
      { new: true, runValidators: true },
    ).lean();
    if (!product) return next(httpError(404, 'Product not found'));

    const stockDiff = (product.stock ?? 0) - (old?.stock ?? 0);
    if (stockDiff !== 0) {
      createProductStockMovement(userId, product, stockDiff, 'Stock Adjustment').catch(() => {});
    }

    res.json(product);
  } catch (err) {
    if (err.code === 11000) return next(httpError(409, `Product code "${req.body.code}" already exists`));
    next(err);
  }
}

// DELETE /api/inventory/products/:id
export async function deleteProduct(req, res, next) {
  try {
    const product = await Product.findOneAndDelete({ _id: req.params.id, userId: req.user.id }).lean();
    if (!product) return next(httpError(404, 'Product not found'));
    res.json({ message: 'Product deleted' });
  } catch (err) {
    next(err);
  }
}
