import { createHash, createHmac, randomBytes, timingSafeEqual, createCipheriv, createDecipheriv } from 'node:crypto';
import { httpError } from '../../utils/httpError.js';

export const hash = (value) => createHash('sha256').update(value).digest('hex');
export const randomReference = () => randomBytes(32).toString('hex');

export function verifySignedRequest(value, secret, now = Date.now()) {
  const invalid = () => httpError(400, 'Invalid Meta signed request');
  if (!secret) throw httpError(503, 'Meta callbacks are not configured');
  if (typeof value !== 'string' || value.length > 16384) throw invalid();
  const parts = value.split('.');
  if (parts.length !== 2 || parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))) throw invalid();
  const signature = Buffer.from(parts[0], 'base64url');
  const expected = createHmac('sha256', secret).update(parts[1]).digest();
  if (signature.length !== expected.length || !timingSafeEqual(signature, expected)) throw invalid();
  let payload;
  try { payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')); } catch { throw invalid(); }
  if (!payload || payload.algorithm !== 'HMAC-SHA256' || typeof payload.user_id !== 'string' ||
      !/^\d{1,40}$/.test(payload.user_id) || !Number.isInteger(payload.issued_at) || payload.issued_at <= 0 ||
      payload.issued_at * 1000 > now + 300000) throw invalid();
  // Do not reject older signed callbacks: Meta may retry delivery. Replays are idempotent.
  return payload;
}

export function encryptToken(token, keyHex, businessId) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(keyHex, 'hex'), iv);
  cipher.setAAD(Buffer.from(String(businessId)));
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.');
}

export function decryptToken(value, keyHex, businessId) {
  const [version, iv, tag, ciphertext] = value.split('.');
  if (version !== 'v1' || !iv || !tag || !ciphertext) throw new Error('Invalid encrypted Meta credential');
  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(keyHex, 'hex'), Buffer.from(iv, 'base64url'));
  decipher.setAAD(Buffer.from(String(businessId)));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64url')), decipher.final()]).toString('utf8');
}

export function stateCookieName(state) { return '__Secure-gobook_meta_' + hash(state).slice(0, 16); }
export function cookieValue(req, name) {
  const match = (req.headers.cookie || '').split(';').map((item) => item.trim()).find((item) => item.startsWith(name + '='));
  return match ? match.slice(name.length + 1) : '';
}
