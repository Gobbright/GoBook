import { Invoice } from '../../../../models/Invoice.js';
import {
  postInvoiceAccounting,
  reverseAccountingPosting,
} from '../../../../services/accountingPostings.js';
import { httpError } from '../../../../utils/httpError.js';

const DOCTYPE = 'e-invoice';

// GET /api/sales/e-invoices/next-number?prefix=EI
export async function getNextEInvoiceNumber(req, res, next) {
  try {
    const { prefix = 'EI' } = req.query;
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

// GET /api/sales/e-invoices
export async function listEInvoices(req, res, next) {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const filter = { userId: req.user.id, documentType: DOCTYPE };
    if (search) {
      filter.$or = [
        { number: new RegExp(search, 'i') },
        { 'customer.name': new RegExp(search, 'i') },
        { 'extra.irn': new RegExp(search, 'i') },
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

// GET /api/sales/e-invoices/:id
export async function getEInvoice(req, res, next) {
  try {
    const doc = await Invoice.findOne({ _id: req.params.id, userId: req.user.id, documentType: DOCTYPE }).lean();
    if (!doc) return next(httpError(404, 'E-Invoice not found'));
    res.json(doc);
  } catch (err) {
    next(err);
  }
}

// POST /api/sales/e-invoices
export async function createEInvoice(req, res, next) {
  try {
    const doc = await Invoice.create({ ...req.body, userId: req.user.id, businessId: req.user.businessId, documentType: DOCTYPE });
    await postInvoiceAccounting(doc, req.user);
    res.status(201).json(doc);
  } catch (err) {
    if (err.code === 11000) return next(httpError(409, `E-Invoice number "${req.body.number}" already exists`));
    next(err);
  }
}

// PUT /api/sales/e-invoices/:id
export async function updateEInvoice(req, res, next) {
  try {
    const doc = await Invoice.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id, documentType: DOCTYPE },
      { $set: { ...req.body, documentType: DOCTYPE } },
      { new: true, runValidators: false },
    ).lean();
    if (!doc) return next(httpError(404, 'E-Invoice not found'));
    await postInvoiceAccounting(doc, req.user);
    res.json(doc);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/sales/e-invoices/:id
export async function deleteEInvoice(req, res, next) {
  try {
    const doc = await Invoice.findOneAndDelete({ _id: req.params.id, userId: req.user.id, documentType: DOCTYPE }).lean();
    if (!doc) return next(httpError(404, 'E-Invoice not found'));
    await reverseAccountingPosting({ userId: req.user.id, sourceType: 'invoice', sourceId: doc._id });
    res.json({ message: 'E-Invoice deleted successfully' });
  } catch (err) {
    next(err);
  }
}
