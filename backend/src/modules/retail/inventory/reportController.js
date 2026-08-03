import { Product } from '../../../models/Product.js';
import { StockIn } from '../../../models/StockIn.js';
import { StockOut } from '../../../models/StockOut.js';
import { Types } from 'mongoose';
import { itemTypeCond, productRefCondition, resolveProductRefs } from './itemTypeFilter.js';

function escapeRegex(str) {
  return String(str ?? '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function applyDateRange(filter, dateFrom, dateTo) {
  if (!dateFrom && !dateTo) return;
  filter.date = {};
  if (dateFrom) filter.date.$gte = new Date(`${dateFrom}T00:00:00.000Z`);
  if (dateTo) filter.date.$lte = new Date(`${dateTo}T23:59:59.999Z`);
}

function movementLabel(row, fallback) {
  if (row.sourceNo) return row.sourceNo;
  return fallback;
}

function objectId(id) {
  return Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : id;
}

async function totalsByProduct(Model, userId, dateRange = null) {
  const match = { userId: objectId(userId), status: 'Completed' };
  if (dateRange) match.date = dateRange;
  return Model.aggregate([
    { $match: match },
    { $group: { _id: { $ifNull: ['$productId', '$productName'] }, qty: { $sum: '$totalQty' }, value: { $sum: '$totalValue' }, count: { $sum: 1 } } },
  ]);
}

// GET /api/inventory/reports/summary
export async function getStockSummary(req, res, next) {
  try {
    const { search, category, status = 'all', itemType, page = 1, limit = 50 } = req.query;
    const userId = req.user.id;
    const filter = { userId, itemType: itemTypeCond(itemType) };

    if (search) {
      filter.$or = [
        { description: new RegExp(escapeRegex(search), 'i') },
        { code: new RegExp(escapeRegex(search), 'i') },
        { barcode: new RegExp(escapeRegex(search), 'i') },
        { hsn: new RegExp(escapeRegex(search), 'i') },
      ];
    }
    if (category && category !== 'All Categories') filter.category = category;
    if (status === 'low') {
      filter.status = 'Active';
      filter.stock = { $gt: 0 };
      filter.$expr = { $lte: ['$stock', '$minStockLevel'] };
    } else if (status === 'out') {
      filter.status = 'Active';
      filter.stock = 0;
    } else if (status === 'active') {
      filter.status = 'Active';
    } else if (status === 'inactive') {
      filter.status = 'Inactive';
    }

    const skip = (Number(page) - 1) * Number(limit);
    const aggregateUserId = objectId(userId);
    const [products, total, stats, stockInTotals, stockOutTotals] = await Promise.all([
      Product.find(filter).sort({ description: 1 }).skip(skip).limit(Number(limit)).lean(),
      Product.countDocuments(filter),
      Product.aggregate([
        { $match: { userId: aggregateUserId, itemType: itemTypeCond(itemType) } },
        {
          $group: {
            _id: null,
            totalProducts: { $sum: 1 },
            activeProducts: { $sum: { $cond: [{ $eq: ['$status', 'Active'] }, 1, 0] } },
            totalQty: { $sum: '$stock' },
            totalValue: { $sum: { $multiply: ['$stock', '$rate'] } },
            outOfStock: { $sum: { $cond: [{ $and: [{ $eq: ['$status', 'Active'] }, { $eq: ['$stock', 0] }] }, 1, 0] } },
            lowStock: {
              $sum: {
                $cond: [
                  { $and: [{ $eq: ['$status', 'Active'] }, { $gt: ['$stock', 0] }, { $lte: ['$stock', '$minStockLevel'] }] },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),
      totalsByProduct(StockIn, userId),
      totalsByProduct(StockOut, userId),
    ]);

    const inMap = new Map(stockInTotals.map((row) => [String(row._id ?? '').toLowerCase(), row]));
    const outMap = new Map(stockOutTotals.map((row) => [String(row._id ?? '').toLowerCase(), row]));
    const data = products.map((product) => {
      const idKey = String(product._id ?? '').toLowerCase();
      const nameKey = String(product.description ?? '').toLowerCase();
      const stockIn = inMap.get(idKey) ?? inMap.get(nameKey) ?? {};
      const stockOut = outMap.get(idKey) ?? outMap.get(nameKey) ?? {};
      const currentStock = Number(product.stock || 0);
      const minStock = Number(product.minStockLevel || 0);
      return {
        ...product,
        stockInQty: stockIn.qty ?? 0,
        stockOutQty: stockOut.qty ?? 0,
        stockValue: currentStock * Number(product.rate || 0),
        stockStatus: currentStock <= 0 ? 'Out of Stock' : currentStock <= minStock ? 'Low Stock' : 'In Stock',
      };
    });

    res.json({
      data,
      total,
      page: Number(page),
      limit: Number(limit),
      stats: stats[0] ?? { totalProducts: 0, activeProducts: 0, totalQty: 0, totalValue: 0, lowStock: 0, outOfStock: 0 },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/inventory/reports/ledger
export async function getStockLedger(req, res, next) {
  try {
    const { search, type = 'all', dateFrom, dateTo, itemType, page = 1, limit = 50 } = req.query;
    const userId = req.user.id;
    const refs = await resolveProductRefs(Product, userId, itemType);
    const refCond = productRefCondition(refs);
    const inFilter = { userId, ...refCond };
    const outFilter = { userId, ...refCond };
    applyDateRange(inFilter, dateFrom, dateTo);
    applyDateRange(outFilter, dateFrom, dateTo);

    if (search) {
      const re = new RegExp(escapeRegex(search), 'i');
      inFilter.$and = [{ $or: [{ productName: re }, { stockInNo: re }, { supplier: re }, { sourceNo: re }] }];
      outFilter.$and = [{ $or: [{ productName: re }, { stockOutNo: re }, { to: re }, { sourceNo: re }] }];
    }

    const inAggregateFilter = { ...inFilter, userId: objectId(userId), status: 'Completed' };
    const outAggregateFilter = { ...outFilter, userId: objectId(userId), status: 'Completed' };

    const [stockInRows, stockOutRows, stockInTotal, stockOutTotal, inTotals, outTotals] = await Promise.all([
      type === 'out' ? [] : StockIn.find(inFilter).sort({ date: -1, createdAt: -1 }).lean(),
      type === 'in' ? [] : StockOut.find(outFilter).sort({ date: -1, createdAt: -1 }).lean(),
      type === 'out' ? 0 : StockIn.countDocuments(inFilter),
      type === 'in' ? 0 : StockOut.countDocuments(outFilter),
      type === 'out' ? [] : StockIn.aggregate([{ $match: inAggregateFilter }, { $group: { _id: null, qty: { $sum: '$totalQty' }, value: { $sum: '$totalValue' } } }]),
      type === 'in' ? [] : StockOut.aggregate([{ $match: outAggregateFilter }, { $group: { _id: null, qty: { $sum: '$totalQty' }, value: { $sum: '$totalValue' } } }]),
    ]);

    const entries = [
      ...stockInRows.map((row) => ({
        _id: `in-${row._id}`,
        rawId: row._id,
        direction: 'in',
        date: row.date,
        number: row.stockInNo,
        sourceNo: movementLabel(row, row.stockInNo),
        productName: row.productName,
        party: row.supplier,
        qtyIn: row.status === 'Completed' ? row.totalQty : 0,
        qtyOut: 0,
        value: row.totalValue,
        status: row.status,
        sourceType: row.sourceType,
      })),
      ...stockOutRows.map((row) => ({
        _id: `out-${row._id}`,
        rawId: row._id,
        direction: 'out',
        date: row.date,
        number: row.stockOutNo,
        sourceNo: movementLabel(row, row.stockOutNo),
        productName: row.productName,
        party: row.to,
        qtyIn: 0,
        qtyOut: row.status === 'Completed' ? row.totalQty : 0,
        value: row.totalValue,
        status: row.status,
        sourceType: row.sourceType,
      })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    const start = (Number(page) - 1) * Number(limit);
    const data = entries.slice(start, start + Number(limit));

    res.json({
      data,
      total: type === 'in' ? stockInTotal : type === 'out' ? stockOutTotal : stockInTotal + stockOutTotal,
      page: Number(page),
      limit: Number(limit),
      stats: {
        totalInQty: inTotals[0]?.qty ?? 0,
        totalOutQty: outTotals[0]?.qty ?? 0,
        totalInValue: inTotals[0]?.value ?? 0,
        totalOutValue: outTotals[0]?.value ?? 0,
      },
    });
  } catch (err) {
    next(err);
  }
}
