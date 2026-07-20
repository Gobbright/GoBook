import { Gstr1 } from '../../../models/Gstr1.js';
import { buildGstr1FromSales, parsePeriod } from '../../../services/gstFromSales.js';
import { httpError } from '../../../utils/httpError.js';
import { getActiveGstin } from '../../../utils/gst.js';

// GET /api/gst/gstr1?period=May+2026&filingType=monthly
export async function getGstr1(req, res, next) {
  try {
    const { period, filingType = 'monthly' } = req.query;
    if (!period) return next(httpError(400, 'period is required'));
    if (!parsePeriod(period)) return next(httpError(400, 'period must be "Month YYYY" e.g. "May 2026"'));

    const gstin = await getActiveGstin(req.user.id);
    const record = await Gstr1.findOne({ gstin, period, filingType }).lean();
    if (record?.status === 'filed') return res.json(record);

    const generated = await buildGstr1FromSales({ userId: req.user.id, period, filingType, gstin });
    res.json(record
      ? { ...generated, ...record, b2b: generated.b2b, b2cs: generated.b2cs, hsn: generated.hsn, source: 'sales+draft' }
      : generated);
  } catch (err) {
    next(err);
  }
}

// PUT /api/gst/gstr1
export async function saveGstr1(req, res, next) {
  try {
    const { period, filingType = 'monthly', ...rest } = req.body;
    if (!period) return next(httpError(400, 'period is required'));

    const gstin = await getActiveGstin(req.user.id);
    const record = await Gstr1.findOneAndUpdate(
      { gstin, period, filingType },
      { $set: { ...rest, period, filingType, gstin } },
      { new: true, upsert: true, runValidators: false },
    ).lean();
    res.json(record);
  } catch (err) {
    next(err);
  }
}

// POST /api/gst/gstr1/file
export async function fileGstr1(req, res, next) {
  try {
    const { period, filingType = 'monthly' } = req.body;
    if (!period) return next(httpError(400, 'period is required'));

    const gstin = await getActiveGstin(req.user.id);
    const generated = await buildGstr1FromSales({ userId: req.user.id, period, filingType, gstin });
    const arn = `AA${Date.now().toString().slice(-10)}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const record = await Gstr1.findOneAndUpdate(
      { gstin, period, filingType },
      { $set: { ...generated, status: 'filed', arn, filedAt: new Date(), gstin, period, filingType } },
      { new: true, upsert: true, runValidators: false },
    ).lean();
    res.json(record);
  } catch (err) {
    next(err);
  }
}

// GET /api/gst/gstr1/auto-populate?period=May+2026&filingType=monthly
export async function autoPopulateGstr1(req, res, next) {
  try {
    const { period, filingType = 'monthly' } = req.query;
    if (!period) return next(httpError(400, 'period is required'));
    if (!parsePeriod(period)) return next(httpError(400, 'period must be "Month YYYY" e.g. "May 2026"'));

    const gstin = await getActiveGstin(req.user.id);
    const generated = await buildGstr1FromSales({ userId: req.user.id, period, filingType, gstin });
    res.json(generated);
  } catch (err) {
    next(err);
  }
}
