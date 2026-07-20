import { Warehouse } from '../../../models/Warehouse.js';
import { httpError } from '../../../utils/httpError.js';

// GET /api/inventory/warehouses/stats
export async function getWarehouseStats(req, res, next) {
  try {
    const userId = req.user.id;
    const result = await Warehouse.aggregate([
      { $match: { userId, status: 'Active' } },
      {
        $group: {
          _id:            null,
          count:          { $sum: 1 },
          totalCapacity:  { $sum: '$capacity' },
          totalUtilized:  { $sum: '$utilized' },
        },
      },
    ]);
    const r = result[0] ?? { count: 0, totalCapacity: 0, totalUtilized: 0 };
    res.json({
      total:          r.count,
      totalCapacity:  r.totalCapacity,
      totalUtilized:  r.totalUtilized,
      utilization:    r.totalCapacity > 0 ? (r.totalUtilized / r.totalCapacity) * 100 : 0,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/inventory/warehouses?search=&page=&limit=
export async function listWarehouses(req, res, next) {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const filter = { userId: req.user.id };
    if (search) {
      filter.$or = [
        { name:     new RegExp(search, 'i') },
        { location: new RegExp(search, 'i') },
      ];
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [warehouses, total] = await Promise.all([
      Warehouse.find(filter).sort({ name: 1 }).skip(skip).limit(Number(limit)).lean(),
      Warehouse.countDocuments(filter),
    ]);
    res.json({ data: warehouses, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
}

// GET /api/inventory/warehouses/:id
export async function getWarehouse(req, res, next) {
  try {
    const wh = await Warehouse.findOne({ _id: req.params.id, userId: req.user.id }).lean();
    if (!wh) return next(httpError(404, 'Warehouse not found'));
    res.json(wh);
  } catch (err) {
    next(err);
  }
}

// POST /api/inventory/warehouses
export async function createWarehouse(req, res, next) {
  try {
    const wh = await Warehouse.create({ ...req.body, userId: req.user.id });
    res.status(201).json(wh);
  } catch (err) {
    next(err);
  }
}

// PUT /api/inventory/warehouses/:id
export async function updateWarehouse(req, res, next) {
  try {
    const wh = await Warehouse.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: req.body },
      { new: true, runValidators: true },
    ).lean();
    if (!wh) return next(httpError(404, 'Warehouse not found'));
    res.json(wh);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/inventory/warehouses/:id
export async function deleteWarehouse(req, res, next) {
  try {
    const wh = await Warehouse.findOneAndDelete({ _id: req.params.id, userId: req.user.id }).lean();
    if (!wh) return next(httpError(404, 'Warehouse not found'));
    res.json({ message: 'Warehouse deleted' });
  } catch (err) {
    next(err);
  }
}
