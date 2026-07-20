import { GstReconciliation } from '../../../models/GstReconciliation.js';
import { buildPurchaseReconciliationFromSales, parsePeriod } from '../../../services/gstFromSales.js';
import { httpError } from '../../../utils/httpError.js';
import { getActiveGstin } from '../../../utils/gst.js';

function mergeEntries(generatedEntries, savedEntries = []) {
  const savedByInvoice = new Map(savedEntries.map((entry) => [String(entry.invoiceNo || '').toLowerCase(), entry]));

  return generatedEntries.map((entry) => {
    const saved = savedByInvoice.get(String(entry.invoiceNo || '').toLowerCase());
    if (!saved) return entry;

    const itcGstr2b = Number(saved.itcGstr2b) || 0;
    const diff = (Number(entry.itcBooks) || 0) - itcGstr2b;
    return {
      ...entry,
      _id: saved._id,
      itcGstr2b,
      diff,
      status: Math.abs(diff) < 0.01 ? 'matched' : (itcGstr2b > 0 ? 'mismatch' : 'not_in_2b'),
      resolution: saved.resolution || 'none',
    };
  });
}

// GET /api/gst/reconciliation?period=May+2026&type=2b
export async function getReconciliation(req, res, next) {
  try {
    const { period, type = '2b' } = req.query;
    if (!period) return next(httpError(400, 'period is required'));
    if (!parsePeriod(period)) return next(httpError(400, 'period must be "Month YYYY" e.g. "May 2026"'));

    const gstin = await getActiveGstin(req.user.id);
    const [record, generated] = await Promise.all([
      GstReconciliation.findOne({ gstin, period, type }),
      buildPurchaseReconciliationFromSales({ userId: req.user.id, period, gstin, type }),
    ]);

    if (!record) {
      const created = await GstReconciliation.create({ gstin, period, type, entries: generated.entries });
      return res.json({ ...created.toObject(), source: 'sales' });
    }

    record.entries = mergeEntries(generated.entries, record.entries);
    await record.save();
    res.json({ ...record.toObject(), source: 'sales+saved' });
  } catch (err) {
    next(err);
  }
}

// PUT /api/gst/reconciliation
export async function saveReconciliation(req, res, next) {
  try {
    const { period, type = '2b', entries } = req.body;
    if (!period) return next(httpError(400, 'period is required'));

    const gstin = await getActiveGstin(req.user.id);
    const generated = await buildPurchaseReconciliationFromSales({ userId: req.user.id, period, gstin, type });
    const record = await GstReconciliation.findOneAndUpdate(
      { gstin, period, type },
      { $set: { entries: mergeEntries(generated.entries, entries ?? []), gstin, period, type } },
      { new: true, upsert: true, runValidators: false },
    ).lean();
    res.json(record);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/gst/reconciliation/entry/:entryId
export async function updateEntry(req, res, next) {
  try {
    const { entryId } = req.params;
    const { period, type = '2b', resolution } = req.body;
    if (!period) return next(httpError(400, 'period is required'));
    if (!['accepted', 'disputed', 'none'].includes(resolution)) {
      return next(httpError(400, 'resolution must be accepted, disputed, or none'));
    }

    const gstin = await getActiveGstin(req.user.id);
    let record = await GstReconciliation.findOne({ gstin, period, type });
    if (!record) {
      const generated = await buildPurchaseReconciliationFromSales({ userId: req.user.id, period, gstin, type });
      record = await GstReconciliation.create({ gstin, period, type, entries: generated.entries });
    }

    const entry = record.entries.id(entryId);
    if (!entry) return next(httpError(404, 'Entry not found'));

    entry.resolution = resolution;
    await record.save();
    res.json(record.toObject());
  } catch (err) {
    next(err);
  }
}
