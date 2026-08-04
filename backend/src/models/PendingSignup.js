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
  subscriptionPlan: { type: String, enum: ['starter', 'professional', 'enterprise'], required: true },
  subscriptionAmount: { type: Number, required: true },
  otpHash:      { type: String, required: true, select: false },
  otpExpiresAt: { type: Date, required: true, select: false },
  otpAttempts:  { type: Number, select: false, default: 0 },
}, { timestamps: true });

pendingSignupSchema.index({ otpExpiresAt: 1 }, { expireAfterSeconds: 0 });

export const PendingSignup = model('PendingSignup', pendingSignupSchema);
