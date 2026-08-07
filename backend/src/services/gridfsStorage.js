import mongoose from 'mongoose';

export const GRIDFS_BUCKET = 'gobookFiles';
export const GRIDFS_FILES_COLLECTION = `${GRIDFS_BUCKET}.files`;

function bucket() {
  if (!mongoose.connection.db) throw new Error('Database is not connected');
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: GRIDFS_BUCKET });
}

export function toObjectId(value) {
  if (!value || !mongoose.Types.ObjectId.isValid(value)) return undefined;
  return new mongoose.Types.ObjectId(value);
}

export function safeFilename(value = 'file') {
  return String(value).replace(/[\\/\r\n\0"]/g, '_').slice(0, 180) || 'file';
}

export function hasExpectedFileSignature(buffer, contentType = '') {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return false;
  const type = String(contentType).toLowerCase();
  const ascii = buffer.subarray(0, 16).toString('ascii');
  const hex = buffer.subarray(0, 12).toString('hex');
  if (type === 'application/pdf') return ascii.startsWith('%PDF-');
  if (type === 'image/png') return hex.startsWith('89504e470d0a1a0a');
  if (type === 'image/jpeg') return hex.startsWith('ffd8ff');
  if (type === 'image/gif') return ascii.startsWith('GIF87a') || ascii.startsWith('GIF89a');
  if (type === 'image/webp') return ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP';
  if (type === 'video/webm' || type === 'video/x-matroska') return hex.startsWith('1a45dfa3');
  if (type === 'video/mp4' || type === 'video/quicktime') return ascii.slice(4, 8) === 'ftyp';
  return false;
}

export async function storeBuffer({ buffer, filename, contentType = 'application/octet-stream', metadata = {} }) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) throw new Error('A non-empty file buffer is required');
  const normalizedMetadata = { ...metadata };
  for (const key of ['userId', 'businessId', 'paymentId']) {
    const objectId = toObjectId(normalizedMetadata[key]);
    if (objectId) normalizedMetadata[key] = objectId;
    else delete normalizedMetadata[key];
  }
  return new Promise((resolve, reject) => {
    const stream = bucket().openUploadStream(safeFilename(filename), { contentType, metadata: normalizedMetadata });
    stream.once('error', reject);
    stream.once('finish', () => resolve({ id: stream.id, filename: stream.filename, length: stream.length, uploadDate: stream.uploadDate }));
    stream.end(buffer);
  });
}

export async function findStoredFile(id, filter = {}) {
  const objectId = toObjectId(id);
  if (!objectId || !mongoose.connection.db) return null;
  return mongoose.connection.db.collection(GRIDFS_FILES_COLLECTION).findOne({ _id: objectId, ...filter });
}

export function pipeStoredFile(id, res) {
  return bucket().openDownloadStream(toObjectId(id)).pipe(res);
}

export async function deleteStoredFile(id) {
  const objectId = toObjectId(id);
  if (!objectId) return;
  await bucket().delete(objectId);
}
