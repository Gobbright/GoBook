import { Gstr3b } from '../../../models/Gstr3b.js';
import { postGstr3bAccounting } from '../../../services/gstAccounting.js';
import { buildGstr3bFromSales, mergeDraftGstr3b, parsePeriod } from '../../../services/gstFromSales.js';
import { httpError } from '../../../utils/httpError.js';
import { getActiveGstin } from '../../../utils/gst.js';

// GET /api/gst/gstr3b?period=May+2026
export async function getGstr3b(req, res, next) {
  try {
    const { period } = req.query;
    if (!period) return next(httpError(400, 'period is required'));
    if (!parsePeriod(period)) return next(httpError(400, 'period must be "Month YYYY" e.g. "May 2026"'));

    const userId = req.user.id;
    const gstin = await getActiveGstin(userId);
    const [record, generated] = await Promise.all([
      Gstr3b.findOne({ userId, gstin, period }).lean(),
      buildGstr3bFromSales({ userId, period, gstin }),
    ]);

    res.json(mergeDraftGstr3b(record, generated));
  } catch (err) {
    next(err);
  }
}

// PUT /api/gst/gstr3b
export async function saveGstr3b(req, res, next) {
  try {
    const { period, ...rest } = req.body;
    if (!period) return next(httpError(400, 'period is required'));

    const userId = req.user.id;
    const gstin = await getActiveGstin(userId);
    const generated = await buildGstr3bFromSales({ userId, period, gstin });
    const record = await Gstr3b.findOneAndUpdate(
      { userId, gstin, period },
      { $set: { ...rest, userId, outwardRows: generated.outwardRows, period, gstin } },
      { new: true, upsert: true, runValidators: false },
    ).lean();
    res.json(record);
  } catch (err) {
    next(err);
  }
}

// POST /api/gst/gstr3b/file
export async function fileGstr3b(req, res, next) {
  try {
    const { period } = req.body;
    if (!period) return next(httpError(400, 'period is required'));

    const userId = req.user.id;
    const gstin = await getActiveGstin(userId);
    const existing = await Gstr3b.findOne({ userId, gstin, period }).lean();
    const generated = await buildGstr3bFromSales({ userId, period, gstin });
    const draft = mergeDraftGstr3b(existing, generated);
    const arn = `AA${Date.now().toString().slice(-10)}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const record = await Gstr3b.findOneAndUpdate(
      { userId, gstin, period },
      { $set: { ...draft, userId, status: 'filed', arn, filedAt: new Date(), gstin, period } },
      { new: true, upsert: true, runValidators: false },
    ).lean();
    res.json(record);
  } catch (err) {
    next(err);
  }
}

// POST /api/gst/gstr3b/accounting-adjustment
export async function postGstr3bAccountingAdjustment(req, res, next) {
  try {
    const { period } = req.body;
    if (!period) return next(httpError(400, 'period is required'));
    if (!parsePeriod(period)) return next(httpError(400, 'period must be "Month YYYY" e.g. "May 2026"'));

    const gstin = await getActiveGstin(req.user.id);
    const result = await postGstr3bAccounting({ user: req.user, period, gstin });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}
