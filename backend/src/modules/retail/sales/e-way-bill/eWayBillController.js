import { Invoice } from '../../../../models/Invoice.js';
import {
  postInvoiceAccounting,
  reverseAccountingPosting,
} from '../../../../services/accountingPostings.js';
import { httpError } from '../../../../utils/httpError.js';
import { buildSalesAggregationPipeline, unwrapFacetResult } from '../shared/salesFilters.js';
import { branchForNewRecord, branchScopedAggregateMatch, branchScopedQuery } from '../../../../utils/branchScope.js';
import { withBusinessSettings } from '../shared/invoiceBusinessSettings.js';

const DOCTYPE = 'e-way-bill';

// GET /api/sales/e-way-bills/next-number?prefix=EWB
export async function getNextEWayBillNumber(req, res, next) {
  try {
    const { prefix = 'EWB' } = req.query;
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

// GET /api/sales/e-way-bills
export async function listEWayBills(req, res, next) {
  try {
    const { page = 1, limit = 50 } = req.query;
    const baseMatch = await branchScopedAggregateMatch(req, { model: Invoice, ownerField: 'userId' });
    const pipeline = buildSalesAggregationPipeline(req.query, req.user.id, DOCTYPE, { includePayment: false, baseMatch });
    const result = await Invoice.aggregate(pipeline);
    const { data, total } = unwrapFacetResult(result);

    res.json({ data, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
}

// GET /api/sales/e-way-bills/:id
export async function getEWayBill(req, res, next) {
  try {
    const doc = await Invoice.findOne(await branchScopedQuery(req, { model: Invoice, ownerField: 'userId' }, { _id: req.params.id, documentType: DOCTYPE })).lean();
    if (!doc) return next(httpError(404, 'E-Way Bill not found'));
    res.json(await withBusinessSettings(req, doc));
  } catch (err) {
    next(err);
  }
}

// POST /api/sales/e-way-bills
export async function createEWayBill(req, res, next) {
  try {
    const doc = await Invoice.create({ ...req.body, userId: req.user.id, businessId: req.user.businessId, branch: await branchForNewRecord(req, req.body.branch), documentType: DOCTYPE });
    await postInvoiceAccounting(doc, req.user);
    res.status(201).json(doc);
  } catch (err) {
    if (err.code === 11000) return next(httpError(409, `E-Way Bill number "${req.body.number}" already exists`));
    next(err);
  }
}

// PUT /api/sales/e-way-bills/:id
export async function updateEWayBill(req, res, next) {
  try {
    const updates = { ...req.body, documentType: DOCTYPE };
    if (req.body.branch !== undefined) updates.branch = await branchForNewRecord(req, req.body.branch);
    const doc = await Invoice.findOneAndUpdate(
      await branchScopedQuery(req, { model: Invoice, ownerField: 'userId' }, { _id: req.params.id, documentType: DOCTYPE }),
      { $set: updates },
      { new: true, runValidators: false },
    ).lean();
    if (!doc) return next(httpError(404, 'E-Way Bill not found'));
    await postInvoiceAccounting(doc, req.user);
    res.json(doc);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/sales/e-way-bills/:id
export async function deleteEWayBill(req, res, next) {
  try {
    const doc = await Invoice.findOneAndDelete(await branchScopedQuery(req, { model: Invoice, ownerField: 'userId' }, { _id: req.params.id, documentType: DOCTYPE })).lean();
    if (!doc) return next(httpError(404, 'E-Way Bill not found'));
    await reverseAccountingPosting({ userId: req.user.id, sourceType: 'invoice', sourceId: doc._id });
    res.json({ message: 'E-Way Bill deleted successfully' });
  } catch (err) {
    next(err);
  }
}
