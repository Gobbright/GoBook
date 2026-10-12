import mongoose from 'mongoose';
import multer from 'multer';

import { AppUser } from '../../models/AppUser.js';
import { Business } from '../../models/Business.js';
import { SubscriptionPayment } from '../../models/SubscriptionPayment.js';
import { GRIDFS_FILES_COLLECTION, findStoredFile, hasExpectedFileSignature, pipeStoredFile, safeFilename, storeBuffer } from '../../services/gridfsStorage.js';
import { httpError } from '../../utils/httpError.js';

const ALLOWED_FILE = /^(application\/pdf|image\/(jpeg|png|gif|webp)|video\/(mp4|webm|quicktime|x-matroska))$/i;
const SENSITIVE_EXPORT_FIELD = /(password|secret|token|otp|signature|private.?key|api.?key|salt)/i;
const NON_EXPORTABLE_COLLECTIONS = new Set(['gobookFiles.chunks']);
const BACKUP_OWNER_FIELDS = ['businessId', 'userId', 'ownerUserId', 'parentUserId', 'createdBy', 'updatedBy', 'uploadedBy', 'assignedTo'];
const BACKUP_FILE_COLLECTION = 'gobookFiles.files';
const BACKUP_CHUNK_COLLECTION = 'gobookFiles.chunks';
const { EJSON } = mongoose.mongo.BSON;

export const adminStorageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => callback(ALLOWED_FILE.test(file.mimetype) ? null : httpError(400, 'Only PDF, image, and video files are allowed'), ALLOWED_FILE.test(file.mimetype)),
});
export const adminBackupUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const ok = /json/i.test(file.mimetype || '') || /\.json$/i.test(file.originalname || '');
    callback(ok ? null : httpError(400, 'Only JSON backup files are allowed'), ok);
  },
});

function formatFile(file) {
  return {
    id: file._id,
    filename: file.filename,
    contentType: file.contentType || 'application/octet-stream',
    size: Number(file.length || 0),
    uploadedAt: file.uploadDate,
    kind: file.metadata?.kind || 'other',
    category: file.metadata?.category || '',
    businessId: file.metadata?.businessId || null,
    userId: file.metadata?.userId || null,
  };
}

let tenantUsageCache = { expiresAt: 0, usage: new Map() };

async function getTenantDocumentUsage(collections, users, businesses) {
  if (tenantUsageCache.expiresAt > Date.now()) return tenantUsageCache.usage;
  const businessIds = new Set(businesses.map((business) => String(business._id)));
  const userToBusiness = new Map(users.filter((user) => user.businessId).map((user) => [String(user._id), String(user.businessId)]));
  const usage = new Map([['platform', { databaseBytes: 0, databaseDocuments: 0 }]]);
  for (const business of businesses) usage.set(String(business._id), { databaseBytes: 0, databaseDocuments: 0 });

  const excluded = new Set([GRIDFS_FILES_COLLECTION, 'gobookFiles.chunks']);
  const groupsByCollection = await Promise.all(collections
    .filter(({ name }) => !excluded.has(name) && !name.startsWith('system.'))
    .map(async ({ name }) => {
      const ownerExpression = name === 'businesses'
        ? '$_id'
        : { $ifNull: ['$businessId', { $ifNull: ['$userId', '$ownerUserId'] }] };
      return mongoose.connection.db.collection(name).aggregate([
        { $project: { ownerId: ownerExpression, bytes: { $bsonSize: '$$ROOT' } } },
        { $group: { _id: '$ownerId', databaseBytes: { $sum: '$bytes' }, databaseDocuments: { $sum: 1 } } },
      ], { allowDiskUse: false }).toArray().catch(() => []);
    }));

  for (const groups of groupsByCollection) {
    for (const group of groups) {
      const ownerId = String(group._id || '');
      const businessId = businessIds.has(ownerId) ? ownerId : userToBusiness.get(ownerId);
      const key = businessId || 'platform';
      const current = usage.get(key) || { databaseBytes: 0, databaseDocuments: 0 };
      current.databaseBytes += Number(group.databaseBytes || 0);
      current.databaseDocuments += Number(group.databaseDocuments || 0);
      usage.set(key, current);
    }
  }
  tenantUsageCache = { expiresAt: Date.now() + 60000, usage };
  return usage;
}

async function listCollectionsWithStats() {
  const db = mongoose.connection.db;
  const collections = await db.listCollections({}, { nameOnly: true }).toArray();
  return Promise.all(collections.map(async ({ name, type }) => {
    const collection = db.collection(name);
    const [documents, stats] = await Promise.all([
      collection.estimatedDocumentCount().catch(() => 0),
      db.command({ collStats: name, scale: 1 }).catch(() => ({})),
    ]);
    return { name, type: type || 'collection', documents, dataSize: Number(stats.size || 0), storageSize: Number(stats.storageSize || 0), indexes: Number(stats.nindexes || 0) };
  }));
}

function safeExportValue(value, fieldName = '') {
  if (SENSITIVE_EXPORT_FIELD.test(fieldName)) return '[REDACTED]';
  if (value === null || value === undefined) return value;
  if (Buffer.isBuffer(value) || value?._bsontype === 'Binary') return '[BINARY OMITTED - use GridFS Files]';
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => safeExportValue(item));
  if (typeof value === 'object') {
    if (value._bsontype && typeof value.toString === 'function') return value.toString();
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, safeExportValue(item, key)]));
  }
  return value;
}

async function writeExportChunk(res, chunk) {
  if (res.destroyed) return false;
  if (!res.write(chunk)) {
    await new Promise((resolve) => {
      const done = () => {
        res.off('drain', done);
        res.off('close', done);
        resolve();
      };
      res.once('drain', done);
      res.once('close', done);
    });
  }
  return !res.destroyed;
}

function safeCollectionName(name) {
  return typeof name === 'string' && name && !name.startsWith('system.') && !name.includes('$');
}

function objectIdOrNull(value) {
  return mongoose.Types.ObjectId.isValid(value) ? new mongoose.Types.ObjectId(value) : null;
}

async function indexesForBackup(db, name) {
  const indexes = await db.collection(name).indexes().catch(() => []);
  return indexes.filter((index) => index.name !== '_id_').map(({ v, ns, ...index }) => index);
}

async function relatedBackupContext(db, userId) {
  const userObjectId = objectIdOrNull(userId);
  if (!userObjectId) throw httpError(400, 'Valid userId is required');

  const usersCollection = db.collection('appusers');
  const user = await usersCollection.findOne({ _id: userObjectId });
  if (!user) throw httpError(404, 'User not found');

  const businessObjectId = objectIdOrNull(user.businessId);
  const userQuery = {
    $or: [
      { _id: userObjectId },
      ...(businessObjectId ? [{ businessId: businessObjectId }] : []),
      { parentUserId: userObjectId },
    ],
  };
  const users = await usersCollection.find(userQuery).project({ _id: 1 }).toArray();
  const userIds = Array.from(new Map([userObjectId, ...users.map((item) => item._id)].map((id) => [String(id), id])).values());
  const userIdStrings = userIds.map(String);
  const businessIds = businessObjectId ? [businessObjectId] : [];

  return { user, userIds, userIdStrings, businessIds };
}

function backupQueryForCollection(name, context, fileIds = []) {
  const { userIds, userIdStrings, businessIds } = context;
  if (name === 'appusers') {
    return {
      $or: [
        { _id: { $in: userIds } },
        ...(businessIds.length ? [{ businessId: { $in: businessIds } }] : []),
        { parentUserId: { $in: userIds } },
      ],
    };
  }
  if (name === 'businesses') return businessIds.length ? { _id: { $in: businessIds } } : { _id: { $exists: false } };
  if (name === BACKUP_CHUNK_COLLECTION) return fileIds.length ? { files_id: { $in: fileIds } } : { files_id: { $exists: false } };

  const ownerMatches = BACKUP_OWNER_FIELDS.flatMap((field) => {
    const values = field === 'businessId' ? businessIds : userIds;
    const stringValues = field === 'businessId' ? businessIds.map(String) : userIdStrings;
    return values.length ? [{ [field]: { $in: values } }, { [field]: { $in: stringValues } }] : [];
  });
  return ownerMatches.length ? { $or: ownerMatches } : { _id: { $exists: false } };
}

async function documentsForBackup(db, name, query) {
  return db.collection(name).find(query).toArray();
}

function backupFileName(user) {
  const label = String(user.businessName || user.name || user.email || user._id || 'user')
    .replace(/[^a-z0-9._-]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'user';
  return `gobooks-user-backup-${label}-${new Date().toISOString().slice(0, 10)}.json`;
}

export async function exportUserMongoBackup(req, res, next) {
  try {
    const db = mongoose.connection.db;
    const context = await relatedBackupContext(db, req.params.userId);
    const collectionNames = (await db.listCollections({}, { nameOnly: true }).toArray())
      .map(({ name }) => name)
      .filter(safeCollectionName)
      .filter((name) => name !== BACKUP_CHUNK_COLLECTION)
      .sort();

    const collections = [];
    let gridFsFileIds = [];
    for (const name of collectionNames) {
      const documents = await documentsForBackup(db, name, backupQueryForCollection(name, context));
      if (name === BACKUP_FILE_COLLECTION) gridFsFileIds = documents.map((document) => document._id);
      if (documents.length) {
        collections.push({ name, indexes: await indexesForBackup(db, name), documents });
      }
    }

    if (gridFsFileIds.length) {
      const chunks = await documentsForBackup(db, BACKUP_CHUNK_COLLECTION, backupQueryForCollection(BACKUP_CHUNK_COLLECTION, context, gridFsFileIds));
      if (chunks.length) collections.push({ name: BACKUP_CHUNK_COLLECTION, indexes: await indexesForBackup(db, BACKUP_CHUNK_COLLECTION), documents: chunks });
    }

    const documentCount = collections.reduce((sum, collection) => sum + collection.documents.length, 0);
    const payload = {
      format: 'gobook-user-mongodb-backup',
      version: 1,
      exportedAt: new Date(),
      database: db.databaseName,
      userId: context.user._id,
      businessId: context.user.businessId || null,
      documentCount,
      collections,
    };

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${backupFileName(context.user)}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(EJSON.stringify(payload, { relaxed: false }));
  } catch (error) {
    next(error);
  }
}

async function bulkRestoreDocuments(db, name, documents) {
  if (!documents.length) return { insertedOrUpdated: 0 };
  const collection = db.collection(name);
  let insertedOrUpdated = 0;
  for (let index = 0; index < documents.length; index += 500) {
    const chunk = documents.slice(index, index + 500);
    const operations = chunk.map((document) => ({
      replaceOne: {
        filter: { _id: document._id },
        replacement: document,
        upsert: true,
      },
    }));
    const result = await collection.bulkWrite(operations, { ordered: false });
    insertedOrUpdated += Number(result.upsertedCount || 0) + Number(result.modifiedCount || 0) + Number(result.matchedCount || 0);
  }
  return { insertedOrUpdated };
}

export async function importUserMongoBackup(req, res, next) {
  try {
    if (!req.file?.buffer) return next(httpError(400, 'Backup JSON file is required'));
    const backup = EJSON.parse(req.file.buffer.toString('utf8'), { relaxed: false });
    if (backup?.format !== 'gobook-user-mongodb-backup' || !Array.isArray(backup.collections)) {
      return next(httpError(400, 'Invalid GoBooks user MongoDB backup file'));
    }

    const db = mongoose.connection.db;
    const backupUsers = backup.collections.find((collection) => collection.name === 'appusers')?.documents || [];
    const backupBusinesses = backup.collections.find((collection) => collection.name === 'businesses')?.documents || [];
    const backupUserIds = backupUsers.map((user) => user._id).filter(Boolean);
    const backupBusinessIds = [
      backup.businessId,
      ...backupBusinesses.map((business) => business._id),
      ...backupUsers.map((user) => user.businessId),
    ].filter(Boolean);
    const backupEmails = backupUsers
      .map((user) => String(user.email || '').trim().toLowerCase())
      .filter(Boolean);
    const duplicateBackupEmails = backupEmails.filter((email, index) => backupEmails.indexOf(email) !== index);
    if (duplicateBackupEmails.length) {
      const uniqueDuplicates = [...new Set(duplicateBackupEmails)];
      return next(httpError(400, `Backup has duplicate user email${uniqueDuplicates.length > 1 ? 's' : ''}: ${uniqueDuplicates.slice(0, 5).join(', ')}`));
    }
    if (backupEmails.length) {
      const existingUsers = await db.collection('appusers')
        .find({ email: { $in: backupEmails } })
        .project({ email: 1, name: 1, businessName: 1 })
        .toArray();
      if (existingUsers.length) {
        const emails = existingUsers.map((user) => user.email).filter(Boolean);
        return next(httpError(409, `Import blocked. User email already exists: ${emails.slice(0, 5).join(', ')}${emails.length > 5 ? ` and ${emails.length - 5} more` : ''}`));
      }
    }
    if (backupUserIds.length) {
      const existingUserById = await db.collection('appusers')
        .find({ _id: { $in: backupUserIds } })
        .project({ email: 1, name: 1 })
        .limit(5)
        .toArray();
      if (existingUserById.length) {
        const labels = existingUserById.map((user) => user.email || user.name || String(user._id));
        return next(httpError(409, `Import blocked. Backup user already exists: ${labels.join(', ')}`));
      }
    }
    if (backupBusinessIds.length) {
      const existingBusiness = await db.collection('businesses')
        .find({ _id: { $in: backupBusinessIds } })
        .project({ name: 1 })
        .limit(5)
        .toArray();
      if (existingBusiness.length) {
        const labels = existingBusiness.map((business) => business.name || String(business._id));
        return next(httpError(409, `Import blocked. Backup business already exists: ${labels.join(', ')}`));
      }
    }

    const summary = [];
    const collections = [...backup.collections].sort((a, b) => {
      if (a.name === BACKUP_CHUNK_COLLECTION) return 1;
      if (b.name === BACKUP_CHUNK_COLLECTION) return -1;
      return 0;
    });

    for (const collection of collections) {
      if (!safeCollectionName(collection.name)) continue;
      const documents = Array.isArray(collection.documents) ? collection.documents : [];
      const result = await bulkRestoreDocuments(db, collection.name, documents);
      const indexes = Array.isArray(collection.indexes) ? collection.indexes.filter((index) => index?.key) : [];
      if (indexes.length) await db.collection(collection.name).createIndexes(indexes).catch(() => null);
      summary.push({ name: collection.name, documents: documents.length, restored: result.insertedOrUpdated });
    }

    res.json({
      imported: true,
      sourceDatabase: backup.database || '',
      userId: backup.userId || null,
      businessId: backup.businessId || null,
      collections: summary,
      documents: summary.reduce((sum, item) => sum + item.documents, 0),
    });
  } catch (error) {
    next(error);
  }
}

export async function exportStorageCollections(req, res, next) {
  try {
    const db = mongoose.connection.db;
    const requested = String(req.query.collection || '').trim();
    const available = (await db.listCollections({}, { nameOnly: true }).toArray())
      .map(({ name }) => name)
      .filter((name) => !name.startsWith('system.') && !NON_EXPORTABLE_COLLECTIONS.has(name))
      .sort();
    if (requested && !available.includes(requested)) return next(httpError(404, 'Database collection not found or cannot be exported'));

    const names = requested ? [requested] : available;
    const date = new Date().toISOString().slice(0, 10);
    const baseName = requested.replace(/[^a-z0-9._-]/gi, '_') || 'all-collections';
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="gobooks-${baseName}-${date}.json"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');

    await writeExportChunk(res, `{"exportedAt":${JSON.stringify(new Date().toISOString())},"database":${JSON.stringify(db.databaseName)},"securityNote":"Sensitive fields are redacted and GridFS binary chunks are excluded.","collections":[`);
    let firstCollection = true;
    for (const name of names) {
      if (!(await writeExportChunk(res, `${firstCollection ? '' : ','}{"name":${JSON.stringify(name)},"documents":[`))) return;
      firstCollection = false;
      let firstDocument = true;
      const cursor = db.collection(name).find({}).batchSize(100);
      for await (const document of cursor) {
        const json = JSON.stringify(safeExportValue(document));
        if (!(await writeExportChunk(res, `${firstDocument ? '' : ','}${json}`))) {
          await cursor.close();
          return;
        }
        firstDocument = false;
      }
      if (!(await writeExportChunk(res, ']}'))) return;
    }
    res.end(']}');
  } catch (error) {
    if (res.headersSent) {
      res.destroy(error);
      return;
    }
    next(error);
  }
}

export async function getStorageOverview(_req, res, next) {
  try {
    const db = mongoose.connection.db;
    const filesCollection = db.collection(GRIDFS_FILES_COLLECTION);
    const [dbStats, files, businesses, users, collections] = await Promise.all([
      db.command({ dbStats: 1, scale: 1 }),
      filesCollection.find({}).sort({ uploadDate: -1 }).toArray(),
      Business.find({}).select('name category').lean(),
      AppUser.find({ status: /^active$/i }).select('name email businessName businessId').lean(),
      listCollectionsWithStats(),
    ]);
    const tenantUsage = await getTenantDocumentUsage(collections, users, businesses);
    const usersByBusiness = new Map();
    for (const user of users) {
      const key = String(user.businessId || 'platform');
      const group = usersByBusiness.get(key) || { userCount: 0, ownerUserId: null, ownerName: '', ownerEmail: '' };
      group.userCount += 1;
      if (!group.ownerUserId) group.ownerUserId = user._id;
      if (!group.ownerName) group.ownerName = user.name || user.businessName || '';
      if (!group.ownerEmail) group.ownerEmail = user.email || '';
      usersByBusiness.set(key, group);
    }
    const byBusinessMap = new Map();
    const byTypeMap = new Map();
    for (const business of businesses) {
      const databaseUsage = tenantUsage.get(String(business._id)) || {};
      const linkedUsers = usersByBusiness.get(String(business._id)) || {};
      if (!linkedUsers.ownerUserId || !linkedUsers.userCount) continue;
      byBusinessMap.set(String(business._id), { businessId: business._id, businessName: business.name, category: business.category, userCount: linkedUsers.userCount || 0, ownerUserId: linkedUsers.ownerUserId || null, ownerName: linkedUsers.ownerName || '', ownerEmail: linkedUsers.ownerEmail || '', files: 0, fileBytes: 0, databaseBytes: databaseUsage.databaseBytes || 0, databaseDocuments: databaseUsage.databaseDocuments || 0, bytes: databaseUsage.databaseBytes || 0 });
    }
    for (const file of files) {
      const businessId = String(file.metadata?.businessId || '');
      const businessKey = businessId || 'platform';
      const current = byBusinessMap.get(businessKey);
      if (!current) continue;
      current.files += 1;
      current.fileBytes += Number(file.length || 0);
      current.bytes = current.databaseBytes + current.fileBytes;
      byBusinessMap.set(businessKey, current);
      const kind = file.metadata?.kind || 'other';
      const type = byTypeMap.get(kind) || { kind, files: 0, bytes: 0 };
      type.files += 1;
      type.bytes += Number(file.length || 0);
      byTypeMap.set(kind, type);
    }
    const configuredLimitMb = Number(process.env.MONGODB_STORAGE_LIMIT_MB || 0);
    const hasConfiguredLimit = Number.isFinite(configuredLimitMb) && configuredLimitMb > 0;
    const capacitySize = hasConfiguredLimit ? configuredLimitMb * 1024 * 1024 : Number(dbStats.fsTotalSize || 0);
    const capacityUsed = hasConfiguredLimit ? Number(dbStats.totalSize || (Number(dbStats.storageSize || 0) + Number(dbStats.indexSize || 0))) : Number(dbStats.fsUsedSize || 0);
    res.json({
      generatedAt: new Date().toISOString(),
      database: {
        name: db.databaseName,
        dataSize: Number(dbStats.dataSize || 0),
        storageSize: Number(dbStats.storageSize || 0),
        indexSize: Number(dbStats.indexSize || 0),
        totalSize: Number(dbStats.totalSize || (Number(dbStats.storageSize || 0) + Number(dbStats.indexSize || 0))),
        capacitySize,
        capacityUsed,
        freeSize: Math.max(0, capacitySize - capacityUsed),
        capacitySource: hasConfiguredLimit ? 'configured_database_quota' : 'mongodb_filesystem',
        collections: Number(dbStats.collections || collections.length),
        objects: Number(dbStats.objects || 0),
      },
      gridfs: { bucket: 'gobookFiles', files: files.length, bytes: files.reduce((sum, file) => sum + Number(file.length || 0), 0), byType: [...byTypeMap.values()] },
      businesses: [...byBusinessMap.values()].sort((a, b) => b.bytes - a.bytes),
      collections: collections.sort((a, b) => b.storageSize - a.storageSize),
      recentFiles: files.slice(0, 20).map(formatFile),
    });
  } catch (error) {
    next(error);
  }
}

export async function listStorageFiles(req, res, next) {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 1000);
    const kind = String(req.query.kind || '').trim();
    const query = kind && kind !== 'all' ? { 'metadata.kind': kind } : {};
    const files = await mongoose.connection.db.collection(GRIDFS_FILES_COLLECTION).find(query).sort({ uploadDate: -1 }).limit(limit).toArray();
    res.json({ count: files.length, files: files.map(formatFile) });
  } catch (error) {
    next(error);
  }
}

export async function uploadStorageFile(req, res, next) {
  try {
    if (!req.file) return next(httpError(400, 'Select a PDF, image, or video file'));
    if (!hasExpectedFileSignature(req.file.buffer, req.file.mimetype)) return next(httpError(400, 'File content does not match its declared PDF, image, or video type'));
    const businessId = String(req.body.businessId || '').trim();
    const business = businessId ? await Business.findById(businessId).lean() : null;
    if (businessId && !business) return next(httpError(400, 'Selected business was not found'));
    const stored = await storeBuffer({
      buffer: req.file.buffer,
      filename: req.file.originalname,
      contentType: req.file.mimetype,
      metadata: { kind: String(req.body.kind || 'admin-upload').slice(0, 60), category: String(req.body.category || '').slice(0, 60), businessId: business?._id },
    });
    const file = await findStoredFile(stored.id);
    res.status(201).json({ file: formatFile(file) });
  } catch (error) {
    next(error);
  }
}

export async function downloadStorageFile(req, res, next) {
  try {
    const file = await findStoredFile(req.params.id);
    if (!file) return next(httpError(404, 'Stored file not found'));
    res.setHeader('Content-Type', file.contentType || 'application/octet-stream');
    res.setHeader('Content-Length', String(file.length || 0));
    res.setHeader('Content-Disposition', `${req.query.inline === '1' ? 'inline' : 'attachment'}; filename="${safeFilename(file.filename)}"`);
    pipeStoredFile(file._id, res);
  } catch (error) {
    next(error);
  }
}

export async function getDailyReports(req, res, next) {
  try {
    const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 365);
    const from = new Date();
    from.setDate(from.getDate() - days + 1);
    from.setHours(0, 0, 0, 0);
    const [payments, users, files] = await Promise.all([
      SubscriptionPayment.aggregate([
        { $match: { createdAt: { $gte: from } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } }, payments: { $sum: 1 }, successfulPayments: { $sum: { $cond: [{ $eq: ['$status', 'successful'] }, 1, 0] } }, revenue: { $sum: { $cond: [{ $eq: ['$status', 'successful'] }, '$amount', 0] } } } },
      ]),
      AppUser.aggregate([{ $match: { createdAt: { $gte: from } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } }, registrations: { $sum: 1 } } }]),
      mongoose.connection.db.collection(GRIDFS_FILES_COLLECTION).aggregate([{ $match: { uploadDate: { $gte: from } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$uploadDate', timezone: 'Asia/Kolkata' } }, files: { $sum: 1 }, uploadedBytes: { $sum: '$length' } } }]).toArray(),
    ]);
    const byDate = new Map();
    for (let i = 0; i < days; i += 1) {
      const date = new Date(from);
      date.setDate(from.getDate() + i);
      const key = date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      byDate.set(key, { date: key, registrations: 0, payments: 0, successfulPayments: 0, revenue: 0, files: 0, uploadedBytes: 0 });
    }
    for (const group of [...payments, ...users, ...files]) Object.assign(byDate.get(group._id) || {}, group);
    res.json({ from, days, reports: [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date)) });
  } catch (error) {
    next(error);
  }
}

export async function listStorageBusinesses(_req, res, next) {
  try {
    const businesses = await Business.find({}).sort({ name: 1 }).select('name category').lean();
    res.json({ businesses });
  } catch (error) {
    next(error);
  }
}
