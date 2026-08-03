import { StockOut } from '../../../models/StockOut.js';
import { Product } from '../../../models/Product.js';
import { httpError } from '../../../utils/httpError.js';
import { productRefCondition, resolveProductRefs } from './itemTypeFilter.js';

function monthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { $gte: start, $lte: end };
}

async function getNextStockOutNumberValue(userId) {
  const last = await StockOut.findOne({ userId }, { stockOutNo: 1 }, { sort: { createdAt: -1 } });
  let seq = 1;
  if (last) {
    const parts = last.stockOutNo.split('-');
    const n = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(n)) seq = n + 1;
  }
  const year = new Date().getFullYear();
  return `SOUT-${year}-${String(seq).padStart(3, '0')}`;
}

// GET /api/inventory/stock-out/next-number
export async function getNextStockOutNumber(req, res, next) {
  try {
    res.json({ number: await getNextStockOutNumberValue(req.user.id) });
  } catch (err) {
    next(err);
  }
}

// GET /api/inventory/stock-out/stats?itemType=
export async function getStockOutStats(req, res, next) {
  try {
    const userId = req.user.id;
    const { itemType } = req.query;
    const refCond = productRefCondition(await resolveProductRefs(Product, userId, itemType));
    const range = monthRange();
    const [result, pending] = await Promise.all([
      StockOut.aggregate([
        { $match: { userId, date: range, ...refCond } },
        {
          $group: {
            _id: null,
            count:      { $sum: 1 },
            totalItems: { $sum: '$itemCount' },
            totalValue: { $sum: '$totalValue' },
          },
        },
      ]),
      StockOut.countDocuments({ userId, status: 'Pending', ...refCond }),
    ]);
    const r = result[0] ?? { count: 0, totalItems: 0, totalValue: 0 };
    res.json({
      totalStockOut: r.count,
      totalItems:    r.totalItems,
      totalValue:    r.totalValue,
      pending,
    });
  } catch (err) {
    next(err);
  }
}

function applyDateRange(filter, dateFrom, dateTo) {
  if (!dateFrom && !dateTo) return;
  filter.date = {};
  if (dateFrom) filter.date.$gte = new Date(`${dateFrom}T00:00:00.000Z`);
  if (dateTo) filter.date.$lte = new Date(`${dateTo}T23:59:59.999Z`);
}

function escapeRegex(str) {
  return String(str ?? '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function findProductForEntry(entry) {
  if (entry.productId) {
    const byId = await Product.findOne({ _id: entry.productId, userId: entry.userId });
    if (byId) return byId;
  }
  const productName = String(entry.productName || '').trim();
  if (!productName || productName.includes(',')) return null;
  return Product.findOne({ userId: entry.userId, description: new RegExp(`^${escapeRegex(productName)}$`, 'i') });
}

async function adjustProductStockFromEntry(entry, direction, { allowNegative = false } = {}) {
  if (!entry || entry.sourceType || entry.status !== 'Completed') return;
  const totalQty = Number(entry.totalQty) || 0;
  if (totalQty <= 0) return;
  const product = await findProductForEntry(entry);
  if (!product) return;
  const nextStock = Number(product.stock || 0) + direction * totalQty;
  if (!allowNegative && nextStock < 0) {
    throw httpError(409, `Insufficient stock for ${product.description}. Available ${product.stock || 0}, required ${totalQty}`);
  }
  await Product.updateOne({ _id: product._id }, { $inc: { stock: direction * totalQty } });
}

// GET /api/inventory/stock-out?search=&dateFrom=&dateTo=&page=&limit=&itemType=
export async function listStockOut(req, res, next) {
  try {
    const { search, dateFrom, dateTo, itemType, page = 1, limit = 50 } = req.query;
    const userId = req.user.id;
    const refCond = productRefCondition(await resolveProductRefs(Product, userId, itemType));
    const filter = { userId, ...refCond };
    applyDateRange(filter, dateFrom, dateTo);
    if (search) {
      filter.$and = [{
        $or: [
          { stockOutNo: new RegExp(search, 'i') },
          { productName: new RegExp(search, 'i') },
          { to:         new RegExp(search, 'i') },
        ],
      }];
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      StockOut.find(filter).sort({ date: -1 }).skip(skip).limit(Number(limit)).lean(),
      StockOut.countDocuments(filter),
    ]);
    res.json({ data, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
}

// GET /api/inventory/stock-out/:id
export async function getStockOut(req, res, next) {
  try {
    const entry = await StockOut.findOne({ _id: req.params.id, userId: req.user.id }).lean();
    if (!entry) return next(httpError(404, 'Stock-out record not found'));
    res.json(entry);
  } catch (err) {
    next(err);
  }
}

// POST /api/inventory/stock-out
export async function createStockOut(req, res, next) {
  try {
    const userId = req.user.id;
    const stockOutNo = req.body.stockOutNo || await getNextStockOutNumberValue(userId);
    const existing = await StockOut.findOne({ userId, stockOutNo });
    if (existing) return next(httpError(409, `Stock-out record "${stockOutNo}" already exists`));
    const entry = await StockOut.create({
      ...req.body,
      stockOutNo,
      userId,
      date: req.body.date ? new Date(req.body.date) : new Date(),
      status: req.body.status || 'Completed',
    });
    try {
      await adjustProductStockFromEntry(entry, -1);
    } catch (err) {
      await StockOut.deleteOne({ _id: entry._id, userId: req.user.id });
      throw err;
    }
    res.status(201).json(entry);
  } catch (err) {
    next(err);
  }
}

// PUT /api/inventory/stock-out/:id
export async function updateStockOut(req, res, next) {
  try {
    const existing = await StockOut.findOne({ _id: req.params.id, userId: req.user.id });
    if (!existing) return next(httpError(404, 'Stock-out record not found'));
    if (existing.sourceType && existing.sourceId) {
      return next(httpError(409, 'Source-linked stock records must be updated from their original document'));
    }
    const nextEntry = { ...existing.toObject(), ...req.body, userId: req.user.id };
    await adjustProductStockFromEntry(existing, 1, { allowNegative: true });
    try {
      await adjustProductStockFromEntry(nextEntry, -1);
    } catch (err) {
      await adjustProductStockFromEntry(existing, -1);
      throw err;
    }
    let entry;
    try {
      entry = await StockOut.findOneAndUpdate(
        { _id: req.params.id, userId: req.user.id },
        { $set: req.body },
        { new: true, runValidators: true },
      ).lean();
    } catch (err) {
      await adjustProductStockFromEntry(nextEntry, 1, { allowNegative: true });
      await adjustProductStockFromEntry(existing, -1);
      throw err;
    }
    res.json(entry);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/inventory/stock-out/:id
export async function deleteStockOut(req, res, next) {
  try {
    const existing = await StockOut.findOne({ _id: req.params.id, userId: req.user.id });
    if (!existing) return next(httpError(404, 'Stock-out record not found'));
    if (existing.sourceType && existing.sourceId) {
      return next(httpError(409, 'Source-linked stock records must be deleted from their original document'));
    }
    const entry = await StockOut.findOneAndDelete({ _id: req.params.id, userId: req.user.id }).lean();
    await adjustProductStockFromEntry(entry, 1, { allowNegative: true });
    res.json({ message: 'Stock-out record deleted' });
  } catch (err) {
    next(err);
  }
}
