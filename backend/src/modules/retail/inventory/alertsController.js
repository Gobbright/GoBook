import { Product } from '../../../models/Product.js';

// GET /api/inventory/alerts/stats
export async function getAlertStats(req, res, next) {
  try {
    const [lowStock, outOfStock] = await Promise.all([
      Product.countDocuments({
        status: 'Active',
        stock: { $gt: 0 },
        $expr: { $lte: ['$stock', '$minStockLevel'] },
      }),
      Product.countDocuments({ status: 'Active', stock: 0 }),
    ]);
    res.json({ lowStock, outOfStock, expiringSoon: 0, expired: 0 });
  } catch (err) {
    next(err);
  }
}

// GET /api/inventory/alerts?search=&page=&limit=
export async function listAlerts(req, res, next) {
  try {
    const { search, page = 1, limit = 50 } = req.query;

    const baseCondition = {
      status: 'Active',
      $or: [
        { stock: 0 },
        { stock: { $gt: 0 }, $expr: { $lte: ['$stock', '$minStockLevel'] } },
      ],
    };

    const filter = search
      ? {
          $and: [
            baseCondition,
            {
              $or: [
                { description: new RegExp(search, 'i') },
                { code: new RegExp(search, 'i') },
              ],
            },
          ],
        }
      : baseCondition;

    const skip = (Number(page) - 1) * Number(limit);
    const [products, total] = await Promise.all([
      Product.find(filter).sort({ stock: 1 }).skip(skip).limit(Number(limit)).lean(),
      Product.countDocuments(filter),
    ]);

    const data = products.map((p) => ({
      ...p,
      alertStatus: p.stock === 0 ? 'Out of Stock' : 'Low Stock',
    }));

    res.json({ data, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
}
