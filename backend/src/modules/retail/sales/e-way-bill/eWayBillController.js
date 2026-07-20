import { Invoice } from '../../../../models/Invoice.js';
import { BusinessSettings } from '../../../../models/BusinessSettings.js';
import { generateEWayBillViaGSP } from '../../../../services/gsp.js';
import {
  postInvoiceAccounting,
  reverseAccountingPosting,
} from '../../../../services/accountingPostings.js';
import { httpError } from '../../../../utils/httpError.js';

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

// GET /api/sales/e-way-bills/:id
export async function getEWayBill(req, res, next) {
  try {
    const doc = await Invoice.findOne({ _id: req.params.id, userId: req.user.id, documentType: DOCTYPE }).lean();
    if (!doc) return next(httpError(404, 'E-Way Bill not found'));
    res.json(doc);
  } catch (err) {
    next(err);
  }
}

// POST /api/sales/e-way-bills
export async function createEWayBill(req, res, next) {
  try {
    const doc = await Invoice.create({ ...req.body, userId: req.user.id, businessId: req.user.businessId, documentType: DOCTYPE });
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
    const doc = await Invoice.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id, documentType: DOCTYPE },
      { $set: { ...req.body, documentType: DOCTYPE } },
      { new: true, runValidators: false },
    ).lean();
    if (!doc) return next(httpError(404, 'E-Way Bill not found'));
    await postInvoiceAccounting(doc, req.user);
    res.json(doc);
  } catch (err) {
    next(err);
  }
}

// POST /api/sales/e-way-bills/gsp-generate
export async function generateViaGSP(req, res, next) {
  try {
    const bizSettings = await BusinessSettings.findOne({ userId: req.user.id }).lean() ?? {};

    if (!bizSettings.gspProvider) {
      return next(httpError(400, 'GSP provider not configured. Please go to Business Settings → GSP Integration and add your credentials.'));
    }
    if (!bizSettings.gspClientId || !bizSettings.gspClientSecret || !bizSettings.gspUsername || !bizSettings.gspPassword) {
      return next(httpError(400, 'GSP credentials are incomplete. Please fill all fields in Business Settings → GSP Integration.'));
    }
    if (!bizSettings.gstin) {
      return next(httpError(400, 'Your business GSTIN is not set. Please update it in Business Settings before generating an E-Way Bill.'));
    }

    const credentials = {
      provider:     bizSettings.gspProvider,
      clientId:     bizSettings.gspClientId,
      clientSecret: bizSettings.gspClientSecret,
      username:     bizSettings.gspUsername,
      password:     bizSettings.gspPassword,
      gstin:        bizSettings.gstin,
      sandbox:      bizSettings.gspSandbox,
    };

    const result = await generateEWayBillViaGSP(credentials, req.body, bizSettings);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/sales/e-way-bills/:id
export async function deleteEWayBill(req, res, next) {
  try {
    const doc = await Invoice.findOneAndDelete({ _id: req.params.id, userId: req.user.id, documentType: DOCTYPE }).lean();
    if (!doc) return next(httpError(404, 'E-Way Bill not found'));
    await reverseAccountingPosting({ userId: req.user.id, sourceType: 'invoice', sourceId: doc._id });
    res.json({ message: 'E-Way Bill deleted successfully' });
  } catch (err) {
    next(err);
  }
}
