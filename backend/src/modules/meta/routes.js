import express, { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { startConnection, oauthCallback, connectionStatus, disconnectConnection, platformCallback, deletionStatus } from './controller.js';

const wrap = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
function headers(_req, res, next) {
  res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow' });
  next();
}
function safeError(error, req, res, _next) {
  const status = Number.isInteger(error.statusCode) ? error.statusCode : (error.type === 'entity.too.large' ? 413 : 500);
  if (status >= 500) console.warn('[meta] request could not be completed');
  const message = status >= 500 ? 'Meta integration is unavailable. Please retry or contact support.'
    : error.type === 'entity.parse.failed' ? 'Invalid request body' : error.message;
  if (req.path === '/auth/meta/callback' && req.accepts('html')) {
    const escaped = String(message).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
    return res.status(status).type('html').send('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>GoBook Suite - WhatsApp connection</title><body><main><h1>GoBook Suite</h1><h2>WhatsApp connection could not finish</h2><p>' + escaped + '</p><a href="https://www.gobooksuite.com/whatsapp/settings">Return to WhatsApp settings</a></main></body></html>');
  }
  res.status(status).json({ message });
}

export const metaPublicRouter = Router();
metaPublicRouter.use(headers, express.urlencoded({ extended: false, limit: '24kb' }), express.json({ limit: '24kb' }));
metaPublicRouter.post('/auth/meta/start', requireAuth, wrap(startConnection));
metaPublicRouter.get('/auth/meta/callback', wrap(oauthCallback));
metaPublicRouter.post('/auth/meta/callback', wrap(oauthCallback));
metaPublicRouter.post('/meta/deauthorize', wrap((req, res) => platformCallback(req, res, false)));
metaPublicRouter.post('/meta/data-deletion', wrap((req, res) => platformCallback(req, res, true)));
metaPublicRouter.get('/meta/deletion-status/:confirmationCode', wrap(deletionStatus));
metaPublicRouter.use(safeError);

export const metaApiRouter = Router();
metaApiRouter.use(headers, requireAuth);
metaApiRouter.get('/connection', wrap(connectionStatus));
metaApiRouter.delete('/connection', wrap(disconnectConnection));
metaApiRouter.use(safeError);
