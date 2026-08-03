import { Invoice } from '../../../../models/Invoice.js';
import {
  postCreditNoteAccounting,
  reverseAccountingPosting,
} from '../../../../services/accountingPostings.js';
import {
  attachAccountingStatus,
  attachAccountingStatusList,
} from '../../../../services/salesAccountingStatus.js';
import { httpError } from '../../../../utils/httpError.js';
import { buildSalesAggregationPipeline, unwrapFacetResult } from '../shared/salesFilters.js';

const DOCTYPE = 'credit-note';

// GET /api/sales/credit-notes/next-number?prefix=CRN
export async function getNextCreditNoteNumber(req, res, next) {
  try {
    const { prefix = 'CRN' } = req.query;
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

// GET /api/sales/credit-notes
export async function listCreditNotes(req, res, next) {
  try {
    const { page = 1, limit = 50 } = req.query;
    const pipeline = buildSalesAggregationPipeline(req.query, req.user.id, DOCTYPE, { includePayment: false });
    const result = await Invoice.aggregate(pipeline);
    const { data, total } = unwrapFacetResult(result);

    res.json({ data: await attachAccountingStatusList(req.user.id, data), total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
}

// GET /api/sales/credit-notes/:id
export async function getCreditNote(req, res, next) {
  try {
    const note = await Invoice.findOne({ _id: req.params.id, userId: req.user.id, documentType: DOCTYPE }).lean();
    if (!note) return next(httpError(404, 'Credit note not found'));
    res.json(await attachAccountingStatus(req.user.id, note));
  } catch (err) {
    next(err);
  }
}

// POST /api/sales/credit-notes
export async function createCreditNote(req, res, next) {
  try {
    const note = await Invoice.create({ ...req.body, userId: req.user.id, businessId: req.user.businessId, documentType: DOCTYPE });
    await postCreditNoteAccounting(note, req.user);
    res.status(201).json(await attachAccountingStatus(req.user.id, note.toObject()));
  } catch (err) {
    if (err.code === 11000) return next(httpError(409, `Credit note number "${req.body.number}" already exists`));
    next(err);
  }
}

// PUT /api/sales/credit-notes/:id
export async function updateCreditNote(req, res, next) {
  try {
    const note = await Invoice.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id, documentType: DOCTYPE },
      { $set: { ...req.body, documentType: DOCTYPE } },
      { new: true, runValidators: false },
    ).lean();
    if (!note) return next(httpError(404, 'Credit note not found'));
    await postCreditNoteAccounting(note, req.user);
    res.json(await attachAccountingStatus(req.user.id, note));
  } catch (err) {
    next(err);
  }
}

// DELETE /api/sales/credit-notes/:id
export async function deleteCreditNote(req, res, next) {
  try {
    const note = await Invoice.findOneAndDelete({ _id: req.params.id, userId: req.user.id, documentType: DOCTYPE }).lean();
    if (!note) return next(httpError(404, 'Credit note not found'));
    await reverseAccountingPosting({ userId: req.user.id, sourceType: 'credit-note', sourceId: note._id });
    res.json({ message: 'Credit note deleted successfully' });
  } catch (err) {
    next(err);
  }
}
