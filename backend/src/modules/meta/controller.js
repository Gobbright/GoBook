import mongoose from 'mongoose';
import { createHmac } from 'node:crypto';
import { AppUser } from '../../models/AppUser.js';
import { MetaOAuthState, MetaConnection, MetaDeletionRequest, MetaSubjectGuard } from '../../models/MetaIntegration.js';
import { httpError } from '../../utils/httpError.js';
import { metaConfig, requireMetaConfig } from './config.js';
import { hash, randomReference, verifySignedRequest, encryptToken, cookieValue, stateCookieName } from './security.js';
import { exchangeAndVerify } from './graph.js';

const TEN_MINUTES = 600000;
const NINETY_DAYS = 90 * 86400000;
const cookieOptions = { httpOnly: true, secure: true, sameSite: 'lax', path: '/auth/meta/callback' };
const subjectKey = (config, id) => createHmac('sha256', config.encryptionKey).update('meta-subject:' + id).digest('hex');

export async function businessOwner(userId, expectedBusinessId) {
  const actor = await AppUser.findById(userId).select('businessId accountType status').lean();
  if (!actor || actor.status !== 'Active') throw httpError(403, 'An active business owner account is required');
  if (actor.accountType !== 'owner' || !actor.businessId) throw httpError(403, 'Only the business owner can manage the Meta connection');
  if (expectedBusinessId && String(actor.businessId) !== String(expectedBusinessId)) throw httpError(403, 'Business authorization changed. Start again.');
  return actor;
}

async function ensureGuard(config, metaUserId) {
  const id = subjectKey(config, metaUserId);
  try {
    await MetaSubjectGuard.updateOne({ _id: id }, { $setOnInsert: { revokedBefore: new Date(0), revision: 0, expiresAt: new Date(Date.now() + NINETY_DAYS) } }, { upsert: true });
  } catch (error) { if (error.code !== 11000) throw error; }
  return id;
}

async function ensureBusinessGuard(businessId) {
  const id = 'business:' + String(businessId);
  try {
    await MetaSubjectGuard.updateOne({ _id: id }, { $setOnInsert: {
      revokedBefore: new Date(0), revision: 0, expiresAt: new Date(Date.now() + NINETY_DAYS),
    } }, { upsert: true });
  } catch (error) { if (error.code !== 11000) throw error; }
  return id;
}

export async function startConnection(req, res) {
  const config = requireMetaConfig();
  // This endpoint is proxied on the frontend origin so its host-only browser cookie
  // is available on the canonical callback. A different origin cannot start a flow.
  if (req.headers.origin !== config.publicOrigin) throw httpError(403, 'Open WhatsApp settings on ' + config.publicOrigin);
  const actor = await businessOwner(req.user.id);
  const mode = req.body?.mode;
  if (!['embedded', 'redirect'].includes(mode)) throw httpError(400, 'Invalid connection mode');
  const pending = await MetaOAuthState.countDocuments({ userId: actor._id, expiresAt: { $gt: new Date() } });
  if (pending >= 10) throw httpError(429, 'Too many connection attempts. Please retry in ten minutes.');
  const state = randomReference();
  const browser = randomReference();
  await MetaOAuthState.create({ stateHash: hash(state), browserHash: hash(browser), userId: actor._id, businessId: actor.businessId, mode, expiresAt: new Date(Date.now() + TEN_MINUTES) });
  res.cookie(stateCookieName(state), browser, { ...cookieOptions, maxAge: TEN_MINUTES });
  const url = new URL('https://www.facebook.com/' + config.graphVersion + '/dialog/oauth');
  url.search = new URLSearchParams({ client_id: config.appId, config_id: config.configId,
    redirect_uri: config.callbackUrl, response_type: 'code', state }).toString();
  res.json({ state, appId: config.appId, configId: config.configId, graphVersion: config.graphVersion, callbackUrl: config.callbackUrl, authorizeUrl: url.toString() });
}

export async function oauthCallback(req, res) {
  const config = requireMetaConfig();
  const input = req.method === 'POST' ? req.body : req.query;
  const state = input?.state;
  if (typeof state !== 'string' || !/^[a-f0-9]{64}$/.test(state)) throw httpError(400, 'Invalid or missing OAuth state. Start again from WhatsApp settings.');
  const browser = cookieValue(req, stateCookieName(state));
  if (!/^[a-f0-9]{64}$/.test(browser)) throw httpError(400, 'OAuth browser session is missing. Start again from WhatsApp settings.');
  const mode = req.method === 'POST' ? 'embedded' : 'redirect';
  if (mode === 'embedded' && req.headers.origin !== config.publicOrigin) throw httpError(403, 'Invalid callback origin');
  const attempt = await MetaOAuthState.findOneAndDelete({
    stateHash: hash(state), browserHash: hash(browser), mode, expiresAt: { $gt: new Date() },
  }).lean();
  res.clearCookie(stateCookieName(state), cookieOptions);
  if (!attempt) throw httpError(400, 'OAuth state expired or was already used. Start again from WhatsApp settings.');
  await businessOwner(attempt.userId, attempt.businessId);
  if (input.error || input.error_reason || input.denied_scopes) return res.redirect(303, config.settingsUrl + '?meta_error=denied');
  if (typeof input.code !== 'string' || !input.code || input.code.length > 8192) return res.redirect(303, config.settingsUrl + '?meta_error=missing_code');
  try {
    const authorization = await exchangeAndVerify(config, input.code, mode, {
      wabaId: typeof input.waba_id === 'string' ? input.waba_id : '',
      phoneNumberId: typeof input.phone_number_id === 'string' ? input.phone_number_id : '',
    });
    await businessOwner(attempt.userId, attempt.businessId);
    const guardId = await ensureGuard(config, authorization.metaUserId);
    const businessGuardId = await ensureBusinessGuard(attempt.businessId);
    const { token, ...account } = authorization;
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const guard = await MetaSubjectGuard.findOneAndUpdate({ _id: guardId }, {
          $inc: { revision: 1 }, $set: { expiresAt: new Date(Date.now() + NINETY_DAYS) },
        }, { new: true, session });
        const businessGuard = await MetaSubjectGuard.findOneAndUpdate({ _id: businessGuardId }, { $inc: { revision: 1 } }, { new: true, session });
        if (attempt.createdAt <= businessGuard.revokedBefore) throw httpError(409, 'Connection was removed. Start again.');
        if (attempt.createdAt <= guard.revokedBefore) throw httpError(409, 'Authorization was revoked. Start again.');
        await MetaConnection.findOneAndUpdate({ businessId: attempt.businessId }, { $set: {
          ...account, ownerUserId: attempt.userId, status: 'connected',
          tokenEncrypted: encryptToken(token, config.encryptionKey, attempt.businessId),
          connectedAt: new Date(), disconnectedAt: null,
          // Explicit nulls clear expiry dates when replacing a previously expiring token.
          tokenExpiresAt: account.tokenExpiresAt || null, dataAccessExpiresAt: account.dataAccessExpiresAt || null,
        } }, { upsert: true, new: true, runValidators: true, session });
      });
    } finally { await session.endSession(); }
    console.info('[meta] connection completed');
    return res.redirect(303, config.settingsUrl + '?connected=true');
  } catch (error) {
    console.warn('[meta] connection failed'); // Never log provider error objects.
    const reason = error.code === 11000 ? 'asset_in_use' : error.statusCode === 403 ? 'permissions' : error.statusCode === 400 ? 'assets' : 'connection_failed';
    return res.redirect(303, config.settingsUrl + '?meta_error=' + reason);
  }
}

export async function connectionStatus(req, res) {
  const actor = await businessOwner(req.user.id);
  const connection = await MetaConnection.findOne({ businessId: actor.businessId })
    .select('status wabaId wabaName phoneNumberId displayPhoneNumber verifiedName phoneStatus connectedAt tokenExpiresAt dataAccessExpiresAt').lean();
  let configured = true;
  try { requireMetaConfig(); } catch { configured = false; }
  const expired = [connection?.tokenExpiresAt, connection?.dataAccessExpiresAt].some((value) => value && new Date(value) <= new Date());
  res.json({ configured, connection: connection ? { ...connection, status: expired && connection.status === 'connected' ? 'expired' : connection.status } : null });
}

export async function disconnectConnection(req, res) {
  const actor = await businessOwner(req.user.id);
  // Explicit removal deletes connection data locally; the user can also revoke
  // the integration in Meta Business Integrations. This does not call Graph.
  const guardId = await ensureBusinessGuard(actor.businessId);
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await MetaSubjectGuard.updateOne({ _id: guardId }, {
        $max: { revokedBefore: new Date() }, $inc: { revision: 1 },
        $set: { expiresAt: new Date(Date.now() + NINETY_DAYS) },
      }, { session });
      await MetaOAuthState.deleteMany({ businessId: actor.businessId }, { session });
      await MetaConnection.deleteOne({ businessId: actor.businessId }, { session });
    });
  } finally { await session.endSession(); }
  res.json({ message: 'WhatsApp disconnected and saved Meta connection data removed from GoBook Suite.' });
}

export async function platformCallback(req, res, deletion) {
  const config = metaConfig();
  if (!/^[a-fA-F0-9]{64}$/.test(config.encryptionKey)) throw httpError(503, 'Meta callbacks are not configured');
  const payload = verifySignedRequest(req.body?.signed_request, config.appSecret);
  const requestHash = hash(req.body.signed_request);
  if (deletion) {
    const existing = await MetaDeletionRequest.findOne({ requestHash }).lean();
    if (existing) return res.json({ url: config.publicOrigin + '/data-deletion-status/' + existing.confirmationCode, confirmation_code: existing.confirmationCode });
  }
  const guardId = await ensureGuard(config, payload.user_id);
  const cutoff = new Date(payload.issued_at * 1000 + 999);
  const session = await mongoose.startSession();
  let confirmationCode = randomReference();
  try {
    await session.withTransaction(async () => {
      await MetaSubjectGuard.updateOne({ _id: guardId }, {
        $max: { revokedBefore: cutoff }, $inc: { revision: 1 }, $set: { expiresAt: new Date(Date.now() + NINETY_DAYS) },
      }, { session });
      const filter = { metaUserId: payload.user_id, connectedAt: { $lte: cutoff } };
      if (deletion) {
        // All data fetched from Meta lives in this collection. Customer-created
        // campaigns, contacts, invoices and login accounts are separate.
        await MetaConnection.deleteMany(filter, { session });
        const record = await MetaDeletionRequest.findOneAndUpdate({ requestHash }, { $setOnInsert: {
          confirmationCode, status: 'completed', completedAt: new Date(), expiresAt: new Date(Date.now() + NINETY_DAYS),
        } }, { upsert: true, new: true, session });
        confirmationCode = record.confirmationCode;
      } else {
        await MetaConnection.updateMany(filter, { $set: { status: 'disconnected', disconnectedAt: new Date() },
          $unset: { tokenEncrypted: 1, tokenExpiresAt: 1, dataAccessExpiresAt: 1, scopes: 1 } }, { session });
      }
    });
  } finally { await session.endSession(); }
  console.info(deletion ? '[meta] data deletion completed' : '[meta] deauthorization completed');
  if (deletion) return res.json({ url: config.publicOrigin + '/data-deletion-status/' + confirmationCode, confirmation_code: confirmationCode });
  res.status(200).json({ success: true });
}

export async function deletionStatus(req, res) {
  const code = req.params.confirmationCode;
  if (!/^[a-f0-9]{64}$/.test(code)) throw httpError(404, 'Deletion reference not found');
  const record = await MetaDeletionRequest.findOne({ confirmationCode: code, expiresAt: { $gt: new Date() } }).select('confirmationCode status completedAt -_id').lean();
  if (!record) throw httpError(404, 'Deletion reference not found or expired');
  res.json(record);
}
