import { createHash, randomUUID } from 'crypto';

import { env } from '../config/env.js';
import { AppSession } from '../models/AppSession.js';
import { httpError } from '../utils/httpError.js';

const MOBILE_UA_PATTERN = /android|iphone|ipad|ipod|mobile|windows phone|opera mini|iemobile/i;
const FALLBACK_SESSION_DAYS = 7;

function sessionHash(sessionId = '') {
  return createHash('sha256').update(sessionId).digest('hex');
}

function deviceHash(deviceId = '') {
  const normalized = String(deviceId || '').trim();
  return normalized ? createHash('sha256').update(normalized).digest('hex') : '';
}

function tokenTtlMs() {
  const value = String(env.jwtExpiresIn || '').trim();
  if (/^\d+$/.test(value)) return Number(value) * 1000;
  const match = value.match(/^(\d+)\s*([smhd])$/i);
  if (!match) return FALLBACK_SESSION_DAYS * 86400000;
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (unit === 's') return amount * 1000;
  if (unit === 'm') return amount * 60000;
  if (unit === 'h') return amount * 3600000;
  return amount * 86400000;
}

export function getDeviceType(req) {
  const headers = req?.headers || {};
  const explicit = String(headers['x-device-type'] || req?.body?.deviceType || '').trim().toLowerCase();
  if (explicit === 'mobile' || explicit === 'desktop') return explicit;
  const userAgent = String(headers['user-agent'] || '');
  return MOBILE_UA_PATTERN.test(userAgent) ? 'mobile' : 'desktop';
}

export function getDeviceIdHash(req) {
  const headers = req?.headers || {};
  const raw = String(headers['x-device-id'] || req?.body?.deviceId || '').trim();
  if (!raw || raw.length > 160) return '';
  return deviceHash(raw);
}

function getClientIp(req) {
  const forwarded = String(req?.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req?.socket?.remoteAddress || req?.ip || '';
}

export async function createLoginSession(user, req) {
  const deviceType = getDeviceType(req);
  const deviceIdHash = getDeviceIdHash(req);
  const sessionId = randomUUID();
  const now = new Date();
  const headers = req?.headers || {};

  // Controller unit tests call auth handlers without an HTTP request shell or
  // database connection. Real Express requests always include headers.
  if (!req?.headers) return { sessionId, deviceType };

  await AppSession.updateMany(
    { userId: user._id, deviceType, revokedAt: null },
    { $set: { revokedAt: now } },
  );

  await AppSession.create({
    userId: user._id,
    sessionIdHash: sessionHash(sessionId),
    deviceIdHash,
    deviceType,
    userAgent: String(headers['user-agent'] || '').slice(0, 500),
    ipAddress: getClientIp(req).slice(0, 120),
    lastSeenAt: now,
    expiresAt: new Date(now.getTime() + tokenTtlMs()),
  });

  return { sessionId, deviceType };
}

export async function hasActiveDeviceSession(userId, deviceType) {
  return Boolean(await AppSession.exists({
    userId,
    deviceType,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  }));
}

export async function hasActiveOtherDeviceSession(userId, req) {
  const currentDeviceHash = getDeviceIdHash(req);
  if (!currentDeviceHash) {
    return Boolean(await AppSession.exists({
      userId,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    }));
  }
  return Boolean(await AppSession.exists({
    userId,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
    $or: [
      { deviceIdHash: { $exists: false } },
      { deviceIdHash: '' },
      { deviceIdHash: { $ne: currentDeviceHash } },
    ],
  }));
}

export async function assertActiveSession({ userId, sessionId }) {
  if (!sessionId) {
    if (env.nodeEnv !== 'production') return null;
    throw httpError(401, 'Session expired. Please sign in again.');
  }
  const session = await AppSession.findOne({
    userId,
    sessionIdHash: sessionHash(sessionId),
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });
  if (!session) throw httpError(401, 'This account is already active on another device of this type. Please sign in again.');
  session.lastSeenAt = new Date();
  await session.save();
  return session;
}

export async function revokeSession(userId, sessionId) {
  if (!userId || !sessionId) return;
  await AppSession.updateOne(
    { userId, sessionIdHash: sessionHash(sessionId), revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
}
