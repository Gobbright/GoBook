import { Schema, model } from 'mongoose';

const pendingGoogleLoginSchema = new Schema({
  email:        { type: String, required: true, trim: true, lowercase: true, unique: true },
  googleId:     { type: String, required: true, trim: true, select: false },
  googleProfile: { type: Schema.Types.Mixed, required: true, select: false },
  otpHash:      { type: String, required: true, select: false },
  otpExpiresAt: { type: Date, required: true, select: false },
  otpAttempts:  { type: Number, select: false, default: 0 },
}, { timestamps: true });

pendingGoogleLoginSchema.index({ otpExpiresAt: 1 }, { expireAfterSeconds: 0 });

export const PendingGoogleLogin = model('PendingGoogleLogin', pendingGoogleLoginSchema);
