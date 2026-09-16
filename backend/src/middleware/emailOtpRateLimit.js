import { createHash } from 'node:crypto';
import { Schema, model } from 'mongoose';
import { httpError } from '../utils/httpError.js';

const schema = new Schema({
  _id: String,
  count: { type: Number, default: 0 },
  expiresAt: Date,
});
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const EmailOtpRequestLimit = model('EmailOtpRequestLimit', schema);

export async function emailOtpRateLimit(req, _res, next) {
  try {
    const hour = Math.floor(Date.now() / 3600000);
    const addressHash = createHash('sha256').update(req.ip || req.socket?.remoteAddress || 'unknown').digest('hex');
    const counter = await EmailOtpRequestLimit.findOneAndUpdate(
      { _id: `${addressHash}:${hour}` },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((hour + 2) * 3600000) } },
      { upsert: true, new: true },
    );
    if (counter.count > 20) throw httpError(429, 'Too many OTP requests. Please try again later.');
    next();
  } catch (err) {
    if (err.code === 11000) return next(httpError(429, 'Please try again in a moment.'));
    next(err);
  }
}
