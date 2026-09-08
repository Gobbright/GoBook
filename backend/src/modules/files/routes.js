import { Router } from 'express';
import { findStoredFile, pipeStoredFile } from '../../services/gridfsStorage.js';
import { httpError } from '../../utils/httpError.js';

export const publicFilesRouter = Router();

publicFilesRouter.get('/logos/:id', async (req, res, next) => {
  try {
    const file = await findStoredFile(req.params.id, { 'metadata.kind': 'business-logo' });
    if (!file) return next(httpError(404, 'Logo not found'));
    res.setHeader('Content-Type', file.contentType || 'image/png');
    res.setHeader('Content-Length', String(file.length || 0));
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    pipeStoredFile(file._id, res);
  } catch (error) {
    next(error);
  }
});

publicFilesRouter.get('/payment-qrs/:id', async (req, res, next) => {
  try {
    const file = await findStoredFile(req.params.id, { 'metadata.kind': 'payment-qr' });
    if (!file) return next(httpError(404, 'Payment QR image not found'));
    res.setHeader('Content-Type', file.contentType || 'image/png');
    res.setHeader('Content-Length', String(file.length || 0));
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    pipeStoredFile(file._id, res);
  } catch (error) {
    next(error);
  }
});
