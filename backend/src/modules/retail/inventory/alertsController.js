import { Product } from '../../../models/Product.js';

// GET /api/inventory/alerts/stats?itemType=
export async function getAlertStats(req, res, next) {
  try {
    const userId = req.user.id;
    const { itemType } = req.query;

    if (itemType === 'Service') {
      const totalServices = await Product.countDocuments({ userId, status: 'Active', itemType: 'Service' });
      return res.json({ lowStock: 0, outOfStock: 0, expiringSoon: 0, expired: 0, totalServices });
    }

    const [lowStock, outOfStock] = await Promise.all([
      Product.countDocuments({
        userId,
        status: 'Active',
        itemType: { $ne: 'Service' },
        stock: { $gt: 0 },
        $expr: { $lte: ['$stock', '$minStockLevel'] },
      }),
      Product.countDocuments({ userId, status: 'Active', itemType: { $ne: 'Service' }, stock: 0 }),
    ]);
    res.json({ lowStock, outOfStock, expiringSoon: 0, expired: 0 });
  } catch (err) {
    next(err);
  }
}

// GET /api/inventory/alerts?search=&page=&limit=&itemType=
export async function listAlerts(req, res, next) {
  try {
    const { search, itemType, page = 1, limit = 50 } = req.query;
    const userId = req.user.id;
    const skip = (Number(page) - 1) * Number(limit);

    if (itemType === 'Service') {
      const filter = { userId, status: 'Active', itemType: 'Service' };
      if (search) {
        filter.$or = [
          { description: new RegExp(search, 'i') },
          { code: new RegExp(search, 'i') },
        ];
      }
      const [products, total] = await Promise.all([
        Product.find(filter).sort({ description: 1 }).skip(skip).limit(Number(limit)).lean(),
        Product.countDocuments(filter),
      ]);
      const data = products.map((p) => ({ ...p, alertStatus: 'Not Tracked' }));
      return res.json({ data, total, page: Number(page), limit: Number(limit) });
    }

    const baseCondition = {
      userId,
      status: 'Active',
      itemType: { $ne: 'Service' },
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
