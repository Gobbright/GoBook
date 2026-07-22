import { Invoice } from '../../../../models/Invoice.js';
import { postInventoryForDocument, reverseInventoryForDocument } from '../../../../services/inventoryMovements.js';
import {
  postSupplierReturnAccounting,
  reverseAccountingPosting,
} from '../../../../services/accountingPostings.js';
import {
  attachAccountingStatus,
  attachAccountingStatusList,
} from '../../../../services/salesAccountingStatus.js';
import { httpError } from '../../../../utils/httpError.js';

const DOCTYPE = 'supplier-return';

// GET /api/sales/supplier-returns/next-number?prefix=SPR
export async function getNextSupplierReturnNumber(req, res, next) {
  try {
    const { prefix = 'SPR' } = req.query;
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

// GET /api/sales/supplier-returns
export async function listSupplierReturns(req, res, next) {
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

// GET /api/sales/supplier-returns/:id
export async function getSupplierReturn(req, res, next) {
  try {
    const note = await Invoice.findOne({ _id: req.params.id, userId: req.user.id, documentType: DOCTYPE }).lean();
    if (!note) return next(httpError(404, 'Supplier return not found'));
    res.json(await attachAccountingStatus(req.user.id, note));
  } catch (err) {
    next(err);
  }
}

// POST /api/sales/supplier-returns
// Goods physically leave stock on a supplier return (going back to the vendor),
// so this also posts inventory movements, mirroring how a sales return brings stock back in.
export async function createSupplierReturn(req, res, next) {
  try {
    const note = await Invoice.create({ ...req.body, userId: req.user.id, businessId: req.user.businessId, documentType: DOCTYPE });
    try {
      await postInventoryForDocument(note, req.user.id);
      await postSupplierReturnAccounting(note, req.user);
    } catch (err) {
      await reverseInventoryForDocument(note, req.user.id).catch(() => {});
      await reverseAccountingPosting({ userId: req.user.id, sourceType: DOCTYPE, sourceId: note._id }).catch(() => {});
      await Invoice.deleteOne({ _id: note._id, userId: req.user.id });
      throw err;
    }
    res.status(201).json(await attachAccountingStatus(req.user.id, note.toObject()));
  } catch (err) {
    if (err.code === 11000) return next(httpError(409, `Supplier return number "${req.body.number}" already exists`));
    next(err);
  }
}

// PUT /api/sales/supplier-returns/:id
export async function updateSupplierReturn(req, res, next) {
  try {
    const existing = await Invoice.findOne({ _id: req.params.id, userId: req.user.id, documentType: DOCTYPE });
    if (!existing) return next(httpError(404, 'Supplier return not found'));
    const nextDoc = new Invoice({
      ...existing.toObject(),
      ...req.body,
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
      note = await Invoice.findOneAndUpdate(
        { _id: req.params.id, userId: req.user.id, documentType: DOCTYPE },
        { $set: { ...req.body, documentType: DOCTYPE } },
        { new: true, runValidators: false },
      );
    } catch (err) {
      await reverseInventoryForDocument(nextDoc, req.user.id);
      await postInventoryForDocument(existing, req.user.id);
      throw err;
    }

    await postSupplierReturnAccounting(note, req.user);
    res.json(await attachAccountingStatus(req.user.id, note.toObject()));
  } catch (err) {
    next(err);
  }
}

// DELETE /api/sales/supplier-returns/:id
export async function deleteSupplierReturn(req, res, next) {
  try {
    const note = await Invoice.findOneAndDelete({ _id: req.params.id, userId: req.user.id, documentType: DOCTYPE }).lean();
    if (!note) return next(httpError(404, 'Supplier return not found'));
    await reverseInventoryForDocument(note, req.user.id);
    await reverseAccountingPosting({ userId: req.user.id, sourceType: DOCTYPE, sourceId: note._id });
    res.json({ message: 'Supplier return deleted successfully' });
  } catch (err) {
    next(err);
  }
}
