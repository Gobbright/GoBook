import multer from 'multer';
import { Types } from 'mongoose';

import { DATA_COLLECTIONS, DATA_COLLECTIONS_BY_KEY } from './registry.js';
import { httpError } from '../../utils/httpError.js';
import { branchForNewRecord, branchScopedAggregateMatch, branchScopedQuery } from '../../utils/branchScope.js';

export const uploadBackupFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/\.json$/i.test(file.originalname)) cb(null, true);
    else cb(httpError(400, 'Only GoBook .json backup files are supported'));
  },
});

const PERIOD_MONTHS = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};

function ownerValue(req, ownerField) {
  return ownerField === 'businessId' ? req.user.businessId : req.user.id;
}

function ownerQuery(req, collection) {
  return { [collection.ownerField]: ownerValue(req, collection.ownerField) };
}

function removeSensitiveFields(doc, collection) {
  const clean = { ...doc };
  delete clean.__v;
  for (const field of collection.sensitiveFields || []) delete clean[field];
  if (collection.key === 'businessSettings') {
    delete clean.gspClientSecret;
    delete clean.gspPassword;
    delete clean.emailSmtpPass;
  }
  return clean;
}

function normalizeCollectionKeys(value) {
  const keys = Array.isArray(value) ? value : String(value || 'all').split(',');
  const filtered = keys.map((key) => key.trim()).filter(Boolean);
  if (filtered.length === 0 || filtered.includes('all')) return DATA_COLLECTIONS.map((collection) => collection.key);
  return filtered;
}

function parseBackup(buffer) {
  try {
    return JSON.parse(buffer.toString('utf8'));
  } catch {
    throw httpError(400, 'Invalid backup JSON file');
  }
}

function monthName(month) {
  return Object.keys(PERIOD_MONTHS).find((key) => PERIOD_MONTHS[key] === month);
}

function dateWindow(yearValue, monthValue) {
  const year = Number(yearValue);
  const month = monthValue === '' || monthValue == null ? null : Number(monthValue) - 1;
  if (!Number.isInteger(year) || year < 2000 || year > 2100) throw httpError(400, 'Valid year is required');
  if (month !== null && (!Number.isInteger(month) || month < 0 || month > 11)) throw httpError(400, 'Valid month is required');

  const start = new Date(Date.UTC(year, month ?? 0, 1));
  const end = month === null ? new Date(Date.UTC(year + 1, 0, 1)) : new Date(Date.UTC(year, month + 1, 1));
  const yyyyMm = month === null ? String(year) : `${year}-${String(month + 1).padStart(2, '0')}`;
  const yyyyMmDdStart = month === null ? `${year}-01-01` : `${yyyyMm}-01`;
  const yyyyMmDdEnd = month === null ? `${year + 1}-01-01` : `${end.getUTCFullYear()}-${String(end.getUTCMonth() + 1).padStart(2, '0')}-01`;
  const selectedMonthName = month === null ? null : monthName(month);
  const monthText = selectedMonthName ? `${selectedMonthName[0].toUpperCase()}${selectedMonthName.slice(1)} ${year}` : null;

  return { start, end, yyyyMmDdStart, yyyyMmDdEnd, monthText, year: String(year) };
}

function dateClauseForField(model, field, window) {
  if (field === 'period' || field === 'month') {
    return window.monthText ? { [field]: window.monthText } : { [field]: new RegExp(`\\b${window.year}$`) };
  }

  const schemaType = model.schema.path(field);
  if (schemaType?.instance === 'Date') return { [field]: { $gte: window.start, $lt: window.end } };
  return { [field]: { $gte: window.yyyyMmDdStart, $lt: window.yyyyMmDdEnd } };
}

function deleteDateQuery(collection, window) {
  const clauses = (collection.dateFields || ['createdAt']).map((field) => dateClauseForField(collection.model, field, window));
  return clauses.length === 1 ? clauses[0] : { $or: clauses };
}

async function applyOwner(doc, req, collection) {
  const next = { ...doc };
  next[collection.ownerField] = ownerValue(req, collection.ownerField);
  if (collection.model.schema.path('businessId') && req.user.businessId) next.businessId = req.user.businessId;
  if (collection.model.schema.path('createdBy')) next.createdBy = req.user.id;
  if (collection.model.schema.path('updatedBy')) next.updatedBy = req.user.id;
  if (collection.model.schema.path('branch')) next.branch = await branchForNewRecord(req, next.branch);
  delete next.__v;
  for (const field of collection.sensitiveFields || []) delete next[field];
  return next;
}

async function importDocument(req, collection, originalDoc) {
  const doc = await applyOwner(originalDoc, req, collection);
  const id = doc._id && Types.ObjectId.isValid(doc._id) ? doc._id : null;

  if (collection.key === 'businessSettings') {
    delete doc._id;
    await collection.model.findOneAndUpdate(ownerQuery(req, collection), { $set: doc }, { upsert: true, runValidators: false });
    return 'updated';
  }

  if (id) {
    const owned = await collection.model.exists({ _id: id, ...ownerQuery(req, collection) });
    if (owned) {
      await collection.model.replaceOne({ _id: id, ...ownerQuery(req, collection) }, doc, { runValidators: false });
      return 'updated';
    }
    const taken = await collection.model.exists({ _id: id });
    if (taken) delete doc._id;
  } else {
    delete doc._id;
  }

  await collection.model.create(doc);
  return 'imported';
}

export async function getDataSummary(req, res, next) {
  try {
    const collections = await Promise.all(DATA_COLLECTIONS.map(async (collection) => {
      const query = await branchScopedQuery(req, collection);
      const summary = {
        key: collection.key,
        label: collection.label,
        count: await collection.model.countDocuments(query),
        deletable: collection.deletable !== false,
      };

      if (collection.key === 'moduleRecords') {
        summary.modules = await collection.model.aggregate([
          { $match: await branchScopedAggregateMatch(req, collection) },
          { $group: { _id: '$moduleKey', count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, key: '$_id', count: 1 } },
        ]);
      }

      return summary;
    }));
    res.json({ collections });
  } catch (err) {
    next(err);
  }
}

export async function exportData(req, res, next) {
  try {
    const keys = normalizeCollectionKeys(req.query.collections);
    const data = {};
    const summary = [];

    for (const key of keys) {
      const collection = DATA_COLLECTIONS_BY_KEY.get(key);
      if (!collection) continue;
      const records = await collection.model.find(await branchScopedQuery(req, collection)).lean();
      data[key] = records.map((record) => removeSensitiveFields(record, collection));
      summary.push({ key, label: collection.label, count: data[key].length });
    }

    const backup = {
      meta: {
        app: 'GoBook',
        version: 1,
        exportedAt: new Date().toISOString(),
        userId: req.user.id,
        businessId: req.user.businessId || '',
        category: req.user.category || '',
        collections: summary,
      },
      data,
    };

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="gobook-backup-${stamp}.json"`);
    res.json(backup);
  } catch (err) {
    next(err);
  }
}

export async function importData(req, res, next) {
  try {
    if (!req.file) return next(httpError(400, 'Backup file is required'));
    const backup = parseBackup(req.file.buffer);
    if (backup?.meta?.app !== 'GoBook' || !backup.data || typeof backup.data !== 'object') {
      return next(httpError(400, 'This is not a valid GoBook backup file'));
    }

    const requestedKeys = normalizeCollectionKeys(req.body.collections || Object.keys(backup.data));
    const replace = req.body.mode === 'replace';
    const result = { imported: 0, updated: 0, skipped: 0, deletedBeforeImport: 0, errors: [] };

    for (const key of requestedKeys) {
      const collection = DATA_COLLECTIONS_BY_KEY.get(key);
      const records = backup.data[key];
      if (!collection || !Array.isArray(records)) continue;

      if (replace && collection.deletable !== false) {
        const deleted = await collection.model.deleteMany(await branchScopedQuery(req, collection));
        result.deletedBeforeImport += deleted.deletedCount || 0;
      }

      for (const record of records) {
        try {
          const action = await importDocument(req, collection, record);
          result[action]++;
        } catch (err) {
          result.skipped++;
          result.errors.push(`${collection.label}: ${err.message}`);
        }
      }
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function deleteByPeriod(req, res, next) {
  try {
    const { year, month } = req.body;
    const keys = normalizeCollectionKeys(req.body.collections);
    const window = dateWindow(year, month);
    const result = { deleted: 0, collections: [] };

    for (const key of keys) {
      const collection = DATA_COLLECTIONS_BY_KEY.get(key);
      if (!collection || collection.deletable === false) continue;
      const query = { ...(await branchScopedQuery(req, collection)), ...deleteDateQuery(collection, window) };
      const deleted = await collection.model.deleteMany(query);
      const count = deleted.deletedCount || 0;
      result.deleted += count;
      result.collections.push({ key, label: collection.label, deleted: count });
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
}
