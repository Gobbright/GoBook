import multer from 'multer';

import { findStoredFile, hasExpectedFileSignature, pipeStoredFile, safeFilename, storeBuffer, toObjectId } from '../../services/gridfsStorage.js';
import { httpError } from '../../utils/httpError.js';

const ALLOWED_FILE = /^(application\/pdf|image\/(jpeg|png|gif|webp))$/i;

export const moduleRecordFileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => callback(ALLOWED_FILE.test(file.mimetype) ? null : httpError(400, 'Only PDF, JPG, and PNG files are allowed'), ALLOWED_FILE.test(file.mimetype)),
});

function formatFile(file) {
  return {
    id: file._id,
    filename: file.filename,
    contentType: file.contentType || 'application/octet-stream',
    size: Number(file.length || 0),
  };
}

// POST /api/module-records/files  (multipart/form-data)
export async function uploadModuleRecordFile(req, res, next) {
  try {
    if (!req.file) return next(httpError(400, 'Select a PDF, JPG, or PNG file'));
    if (!hasExpectedFileSignature(req.file.buffer, req.file.mimetype)) return next(httpError(400, 'File content does not match its declared PDF or image type'));
    const stored = await storeBuffer({
      buffer: req.file.buffer,
      filename: req.file.originalname,
      contentType: req.file.mimetype,
      metadata: { kind: 'module-record-file', userId: req.user.id, businessId: req.user.businessId, moduleKey: String(req.body.moduleKey || '').slice(0, 120) },
    });
    const file = await findStoredFile(stored.id);
    res.status(201).json({ file: formatFile(file) });
  } catch (error) {
    next(error);
  }
}

// GET /api/module-records/files/:id
export async function viewModuleRecordFile(req, res, next) {
  try {
    const file = await findStoredFile(req.params.id, { 'metadata.kind': 'module-record-file', 'metadata.userId': toObjectId(req.user.id) });
    if (!file) return next(httpError(404, 'File not found'));
    res.setHeader('Content-Type', file.contentType || 'application/octet-stream');
    res.setHeader('Content-Length', String(file.length || 0));
    res.setHeader('Content-Disposition', `inline; filename="${safeFilename(file.filename)}"`);
    pipeStoredFile(file._id, res);
  } catch (error) {
    next(error);
  }
}
