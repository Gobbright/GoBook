import { Schema, model } from 'mongoose';

import { CATEGORIES } from '../constants/categories.js';

const pendingSignupSchema = new Schema({
  name:         { type: String, required: true, trim: true },
  email:        { type: String, required: true, trim: true, lowercase: true, unique: true },
  password:     { type: String, required: true, select: false },
  businessName: { type: String, required: true, trim: true },
  category:     { type: String, enum: CATEGORIES, required: true },
  phone:        { type: String, required: true, trim: true },
  gstin:        { type: String, trim: true, default: '' },
  googleId:     { type: String, trim: true, default: '' },
  authProvider: { type: String, enum: ['email', 'google'], default: 'email' },
  googleProfile: { type: Schema.Types.Mixed, default: undefined },
  subscriptionPlan: { type: String, enum: ['basic', 'mid', 'advanced'], required: true },
  subscriptionAmount: { type: Number, required: true },
  otpVerifiedAt: { type: Date },
  razorpayOrderId: { type: String, trim: true, default: '' },
  otpHash:      { type: String, required: true, select: false },
  otpExpiresAt: { type: Date, required: true, select: false },
  otpAttempts:  { type: Number, select: false, default: 0 },
}, { timestamps: true });

pendingSignupSchema.index({ otpExpiresAt: 1 }, { expireAfterSeconds: 0 });

export const PendingSignup = model('PendingSignup', pendingSignupSchema);
