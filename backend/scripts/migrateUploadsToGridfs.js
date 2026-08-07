import 'dotenv/config';
import path from 'path';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

import { connectDatabase, disconnectDatabase } from '../src/services/database.js';
import { BusinessSettings } from '../src/models/BusinessSettings.js';
import { HRDocument } from '../src/models/Document.js';
import { AppUser } from '../src/models/AppUser.js';
import { storeBuffer } from '../src/services/gridfsStorage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = path.resolve(__dirname, '..');

function contentType(filename, fallback = 'application/octet-stream') {
  const extension = path.extname(filename).toLowerCase();
  return ({ '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime' })[extension] || fallback;
}

async function migrateLogos() {
  const settingsRows = await BusinessSettings.find({ logoFileId: { $exists: false }, logoUrl: /^\/uploads\/logos\// }).lean();
  let migrated = 0;
  for (const settings of settingsRows) {
    const relative = String(settings.logoUrl).replace(/^\//, '');
    const source = path.join(BACKEND_ROOT, relative);
    if (!existsSync(source)) continue;
    const user = await AppUser.findById(settings.userId).select('businessId').lean();
    const stored = await storeBuffer({ buffer: await readFile(source), filename: path.basename(source), contentType: contentType(source, 'image/png'), metadata: { kind: 'business-logo', userId: settings.userId, businessId: user?.businessId, migratedFrom: relative } });
    await BusinessSettings.updateOne({ _id: settings._id }, { $set: { logoFileId: stored.id, logoUrl: `/api/files/logos/${stored.id}` } });
    migrated += 1;
  }
  return migrated;
}

async function migrateDocuments() {
  const documents = await HRDocument.find({ gridFsFileId: { $exists: false }, filePath: { $nin: ['', null] } }).lean();
  let migrated = 0;
  for (const document of documents) {
    const source = path.join(BACKEND_ROOT, 'uploads', 'documents', path.basename(document.filePath));
    if (!existsSync(source)) continue;
    const user = await AppUser.findById(document.userId).select('businessId').lean();
    const stored = await storeBuffer({ buffer: await readFile(source), filename: document.name || path.basename(source), contentType: contentType(source, document.mimeType), metadata: { kind: 'hr-document', userId: document.userId, businessId: user?.businessId, category: document.category, migratedFrom: document.filePath } });
    await HRDocument.updateOne({ _id: document._id }, { $set: { gridFsFileId: stored.id } });
    migrated += 1;
  }
  return migrated;
}

try {
  await connectDatabase();
  const [logos, documents] = await Promise.all([migrateLogos(), migrateDocuments()]);
  console.log(JSON.stringify({ ok: true, migrated: { logos, documents }, legacyFilesRetainedForRecovery: true }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exitCode = 1;
} finally {
  await disconnectDatabase().catch(() => {});
  process.exit(process.exitCode || 0);
}
