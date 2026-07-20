import { SalesRecord } from '../../../models/SalesRecord.js';
import { httpError } from '../../../utils/httpError.js';

async function nextNumber(type, userId) {
  const prefixes = { quotation: 'QT', order: 'OR', invoice: 'SR' };
  const prefix = prefixes[type] ?? 'SR';
  const yr = new Date().getFullYear();
  const last = await SalesRecord.findOne({ userId, type }, { number: 1 }, { sort: { createdAt: -1 } });
  let seq = 1;
  if (last) {
    const parts = last.number.split('-');
    const n = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(n)) seq = n + 1;
  }
  return `${prefix}-${yr}-${String(seq).padStart(3, '0')}`;
}

// GET /api/more-modules/sales-records?type=&status=&search=
export async function listSalesRecords(req, res, next) {
  try {
    const { type, status, search } = req.query;
    const filter = { userId: req.user.id };
    if (type && type !== 'all') filter.type = type;
    if (status && status !== 'All Status') filter.status = status;
    if (search) {
      filter.$or = [
        { customer: new RegExp(search, 'i') },
        { number: new RegExp(search, 'i') },
        { person: new RegExp(search, 'i') },
      ];
    }
    const records = await SalesRecord.find(filter).sort({ createdAt: -1 }).lean();
    const totalAmount = records.reduce((a, r) => a + (r.amount || 0), 0);
    const quotations  = records.filter((r) => r.type === 'quotation').length;
    const orders      = records.filter((r) => r.type === 'order').length;
    const invoices    = records.filter((r) => r.type === 'invoice').length;
    const outstanding = records.filter((r) => ['Pending', 'Partially Paid'].includes(r.status)).reduce((a, r) => a + (r.amount || 0), 0);
    res.json({ records, stats: { total: records.length, quotations, orders, invoices, totalAmount, outstanding } });
  } catch (err) {
    next(err);
  }
}

// GET /api/more-modules/sales-records/next-number?type=quotation
export async function getNextNumber(req, res, next) {
  try {
    const number = await nextNumber(req.query.type ?? 'quotation', req.user.id);
    res.json({ number });
  } catch (err) {
    next(err);
  }
}

// POST /api/more-modules/sales-records
export async function createSalesRecord(req, res, next) {
  try {
    const userId = req.user.id;
    const body = { ...req.body, userId };
    if (!body.number) body.number = await nextNumber(body.type ?? 'quotation', userId);
    const record = await SalesRecord.create(body);
    res.status(201).json(record);
  } catch (err) {
    if (err.code === 11000) return next(httpError(409, 'Record number already exists'));
    next(err);
  }
}

// PUT /api/more-modules/sales-records/:id
export async function updateSalesRecord(req, res, next) {
  try {
    const record = await SalesRecord.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: req.body },
      { new: true, runValidators: true },
    ).lean();
    if (!record) return next(httpError(404, 'Sales record not found'));
    res.json(record);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/more-modules/sales-records/:id
export async function deleteSalesRecord(req, res, next) {
  try {
    const record = await SalesRecord.findOneAndDelete({ _id: req.params.id, userId: req.user.id }).lean();
    if (!record) return next(httpError(404, 'Sales record not found'));
    res.json({ message: 'Sales record deleted' });
  } catch (err) {
    next(err);
  }
}
