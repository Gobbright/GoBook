import { Invoice } from '../../../../models/Invoice.js';
import { httpError } from '../../../../utils/httpError.js';

const DOCTYPE = 'delivery-challan';

// GET /api/sales/challans/next-number?prefix=DC
export async function getNextChallanNumber(req, res, next) {
  try {
    const { prefix = 'DC' } = req.query;
    const last = await Invoice.findOne(
      { businessId: req.user.businessId, documentType: DOCTYPE, number: new RegExp(`^${prefix}-`, 'i') },
      { number: 1 },
      { sort: { createdAt: -1 } },
    );
    let seq = 1;
    if (last) {
      const parts = last.number.split('-');
      const n = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(n)) seq = n + 1;
    }
    res.json({ number: `${prefix}-${String(seq).padStart(4, '0')}` });
  } catch (err) {
    next(err);
  }
}

// GET /api/sales/challans
export async function listChallans(req, res, next) {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const filter = { userId: req.user.id, documentType: DOCTYPE };
    if (search) {
      filter.$or = [
        { number: new RegExp(search, 'i') },
        { 'customer.name': new RegExp(search, 'i') },
      ];
    }

    const [data, total] = await Promise.all([
      Invoice.find(filter)
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .lean(),
      Invoice.countDocuments(filter),
    ]);

    res.json({ data, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
}

// GET /api/sales/challans/:id
export async function getChallan(req, res, next) {
  try {
    const doc = await Invoice.findOne({ _id: req.params.id, userId: req.user.id, documentType: DOCTYPE }).lean();
    if (!doc) return next(httpError(404, 'Delivery challan not found'));
    res.json(doc);
  } catch (err) {
    next(err);
  }
}

// POST /api/sales/challans
export async function createChallan(req, res, next) {
  try {
    const doc = await Invoice.create({ ...req.body, userId: req.user.id, businessId: req.user.businessId, documentType: DOCTYPE });
    res.status(201).json(doc);
  } catch (err) {
    if (err.code === 11000) return next(httpError(409, `Challan number "${req.body.number}" already exists`));
    next(err);
  }
}

// PUT /api/sales/challans/:id
export async function updateChallan(req, res, next) {
  try {
    const doc = await Invoice.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id, documentType: DOCTYPE },
      { $set: { ...req.body, documentType: DOCTYPE } },
      { new: true, runValidators: false },
    ).lean();
    if (!doc) return next(httpError(404, 'Delivery challan not found'));
    res.json(doc);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/sales/challans/:id
export async function deleteChallan(req, res, next) {
  try {
    const doc = await Invoice.findOneAndDelete({ _id: req.params.id, userId: req.user.id, documentType: DOCTYPE }).lean();
    if (!doc) return next(httpError(404, 'Delivery challan not found'));
    res.json({ message: 'Delivery challan deleted successfully' });
  } catch (err) {
    next(err);
  }
}
