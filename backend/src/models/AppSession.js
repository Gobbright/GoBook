import { Schema, model } from 'mongoose';

const appSessionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'AppUser', required: true, index: true },
  sessionIdHash: { type: String, required: true, unique: true, index: true },
  deviceIdHash: { type: String, trim: true, default: '', index: true },
  deviceType: { type: String, enum: ['mobile', 'desktop'], required: true, index: true },
  userAgent: { type: String, trim: true, default: '' },
  ipAddress: { type: String, trim: true, default: '' },
  revokedAt: { type: Date, default: null, index: true },
  lastSeenAt: { type: Date, default: Date.now, index: true },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

appSessionSchema.index(
  { userId: 1, deviceType: 1, revokedAt: 1 },
  { unique: true, partialFilterExpression: { revokedAt: null } },
);
appSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AppSession = model('AppSession', appSessionSchema);
