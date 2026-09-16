import { Invoice } from '../../../../models/Invoice.js';
import { SupplierReturnLock } from '../../../../models/SupplierReturnLock.js';
import { prepareSalesReturn, salesReturnDetails } from '../../../../services/salesReturns.js';
import { postInventoryForDocument, reverseInventoryForDocument } from '../../../../services/inventoryMovements.js';
import {
  postSalesReturnAccounting,
  reverseAccountingPosting,
} from '../../../../services/accountingPostings.js';
import {
  attachAccountingStatus,
  attachAccountingStatusList,
} from '../../../../services/salesAccountingStatus.js';
import { httpError } from '../../../../utils/httpError.js';

const DOCTYPE = 'sales-return';

function serializeReturn(handler) {
  return async (req, res, next) => {
    const key = `${req.user.id}:sales`;
    let locked = false;
    try {
      await SupplierReturnLock.create({ _id: key, expiresAt: new Date(Date.now() + 600000) });
      locked = true;
      await handler(req, res, next);
    } catch (err) {
      next(err.code === 11000 ? httpError(409, 'Another sales return is being saved. Please retry shortly.') : err);
    } finally {
      if (locked) await SupplierReturnLock.deleteOne({ _id: key });
    }
  };
}

export async function getSalesReturnInvoice(req, res, next) {
  try { res.json(await salesReturnDetails(req.user.id, req.params.invoiceId, req.query.excludeId)); }
  catch (err) { next(err); }
}

export async function listSalesReturnInvoices(req, res, next) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const filter = { userId: req.user.id, documentType: { $in: ['invoice', 'bill-of-supply', 'pharmacy-bill'] } };
    if (req.query.search) {
      const search = String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [{ number: new RegExp(search, 'i') }, { 'customer.name': new RegExp(search, 'i') }, { 'customer.phone': new RegExp(search, 'i') }];
    }
    if (req.query.date) {
      filter['meta.date'] = req.query.date;
    }
    res.json({ data: await Invoice.find(filter).sort({ createdAt: -1 }).skip((page - 1) * 50).limit(50).lean() });
  } catch (err) { next(err); }
}

// GET /api/sales/sales-returns/next-number?prefix=SR
export async function getNextSalesReturnNumber(req, res, next) {
  try {
    const { prefix = 'SR' } = req.query;
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

// GET /api/sales/sales-returns
export async function listSalesReturns(req, res, next) {
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

    res.json({ data: await attachAccountingStatusList(req.user.id, data), total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
}

// GET /api/sales/sales-returns/:id
export async function getSalesReturn(req, res, next) {
  try {
    const note = await Invoice.findOne({ _id: req.params.id, userId: req.user.id, documentType: DOCTYPE }).lean();
    if (!note) return next(httpError(404, 'Sales return not found'));
    res.json(await attachAccountingStatus(req.user.id, note));
  } catch (err) {
    next(err);
  }
}

async function createReturn(req, res, next) {
  try {
    const payload = await prepareSalesReturn(req.body, req.user.id);
    const note = await Invoice.create({ ...payload, userId: req.user.id, businessId: req.user.businessId, documentType: DOCTYPE });
    try {
      await postInventoryForDocument(note, req.user.id);
      await postSalesReturnAccounting(note, req.user);
    } catch (err) {
      await reverseInventoryForDocument(note, req.user.id).catch(() => {});
      await reverseAccountingPosting({ userId: req.user.id, sourceType: DOCTYPE, sourceId: note._id }).catch(() => {});
      await Invoice.deleteOne({ _id: note._id, userId: req.user.id });
      throw err;
    }
    res.status(201).json(await attachAccountingStatus(req.user.id, note.toObject()));
  } catch (err) {
    if (err.code === 11000) return next(httpError(409, `Sales return number "${req.body.number}" already exists`));
    next(err);
  }
}

async function updateReturn(req, res, next) {
  try {
    const existing = await Invoice.findOne({ _id: req.params.id, userId: req.user.id, documentType: DOCTYPE });
    if (!existing) return next(httpError(404, 'Sales return not found'));
    const payload = await prepareSalesReturn(req.body, req.user.id, existing._id);
    const nextDoc = new Invoice({
      ...existing.toObject(),
      ...payload,
      _id: existing._id,
      userId: existing.userId,
      businessId: existing.businessId,
      documentType: DOCTYPE,
    });

    await reverseInventoryForDocument(existing, req.user.id);
    try {
      await postInventoryForDocument(nextDoc, req.user.id);
    } catch (err) {
      await postInventoryForDocument(existing, req.user.id);
      throw err;
    }

    let note;
    try {
      await reverseAccountingPosting({ userId: req.user.id, sourceType: DOCTYPE, sourceId: existing._id }).catch(() => {});
      note = await Invoice.findOneAndUpdate(
        { _id: req.params.id, userId: req.user.id, documentType: DOCTYPE },
        { $set: { ...payload, userId: existing.userId, businessId: existing.businessId, documentType: DOCTYPE } },
        { new: true, runValidators: false },
      );
      await postSalesReturnAccounting(note, req.user);
    } catch (err) {
      await reverseInventoryForDocument(nextDoc, req.user.id);
      await postInventoryForDocument(existing, req.user.id);
      const { _id, __v, ...original } = existing.toObject();
      await Invoice.updateOne({ _id, userId: req.user.id }, { $set: original });
      await postSalesReturnAccounting(existing, req.user);
      throw err;
    }

    res.json(await attachAccountingStatus(req.user.id, note.toObject()));
  } catch (err) {
    next(err);
  }
}

async function deleteReturn(req, res, next) {
  try {
    const note = await Invoice.findOne({ _id: req.params.id, userId: req.user.id, documentType: DOCTYPE }).lean();
    if (!note) return next(httpError(404, 'Sales return not found'));
    try {
      await reverseInventoryForDocument(note, req.user.id);
      await reverseAccountingPosting({ userId: req.user.id, sourceType: DOCTYPE, sourceId: note._id });
      await Invoice.deleteOne({ _id: note._id, userId: req.user.id });
    } catch (err) {
      await postInventoryForDocument(note, req.user.id);
      await postSalesReturnAccounting(note, req.user);
      throw err;
    }
    res.json({ message: 'Sales return deleted successfully' });
  } catch (err) {
    next(err);
  }
}

export const createSalesReturn = serializeReturn(createReturn);
export const updateSalesReturn = serializeReturn(updateReturn);
export const deleteSalesReturn = serializeReturn(deleteReturn);
