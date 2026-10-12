import { Schema, model } from 'mongoose';

const schema = new Schema({
  email: { type: String, required: true, unique: true },
  otpHash: { type: String, select: false },
  otpExpiresAt: Date,
  otpAttempts: { type: Number, default: 0 },
  sentAt: Date,
  windowStartedAt: Date,
  sendCount: { type: Number, default: 0 },
  signupTokenHash: { type: String, select: false },
  signupExpiresAt: Date,
  deviceLoginUserId: { type: Schema.Types.ObjectId, ref: 'AppUser' },
  deviceLoginType: { type: String, enum: ['', 'mobile', 'desktop'], default: '' },
  deviceLoginIdHash: { type: String, trim: true, default: '' },
  cleanupAt: { type: Date, required: true },
});
schema.index({ cleanupAt: 1 }, { expireAfterSeconds: 0 });

export const PendingEmailLogin = model('PendingEmailLogin', schema);
