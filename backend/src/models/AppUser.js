import { Schema, model } from 'mongoose';

import { CATEGORIES } from '../constants/categories.js';

const appUserSchema = new Schema({
  name:         { type: String, required: true, trim: true },
  email:        { type: String, required: true, trim: true, lowercase: true },
  password:     { type: String, select: false },
  googleId:     { type: String, trim: true, default: '' },
  authProvider: { type: String, enum: ['email', 'google'], default: 'email' },
  emailVerified: { type: Boolean, default: false },
  emailVerificationOtpHash: { type: String, select: false, default: '' },
  emailVerificationOtpExpiresAt: { type: Date, select: false },
  emailVerificationOtpAttempts: { type: Number, select: false, default: 0 },
  googleProfile: {
    subject:       { type: String, trim: true, default: '' },
    email:         { type: String, trim: true, lowercase: true, default: '' },
    emailVerified: { type: Boolean, default: false },
    name:          { type: String, trim: true, default: '' },
    givenName:     { type: String, trim: true, default: '' },
    familyName:    { type: String, trim: true, default: '' },
    picture:       { type: String, trim: true, default: '' },
    locale:        { type: String, trim: true, default: '' },
    hostedDomain:  { type: String, trim: true, default: '' },
    issuer:        { type: String, trim: true, default: '' },
    audience:      { type: String, trim: true, default: '' },
    authorizedParty: { type: String, trim: true, default: '' },
    lastSyncedAt:  { type: Date },
  },
  businessId:   { type: Schema.Types.ObjectId, ref: 'Business', index: true },
  businessName: { type: String, trim: true, default: '' },
  category:     { type: String, enum: CATEGORIES, default: 'retail' },
  subscriptionPlan: { type: String, enum: ['', 'starter', 'professional', 'enterprise'], default: '' },
  subscriptionAmount: { type: Number, default: 0 },
  onboardingCompleted: { type: Boolean, default: false },
  role:         { type: String, trim: true, default: 'Sales Executive' },
  branch:       { type: String, trim: true, default: '' },
  phone:        { type: String, trim: true, default: '' },
  status:       { type: String, enum: ['Active', 'Inactive', 'Blocked', 'Deleted', 'Expired'], default: 'Active' },
  lastLogin:    { type: String, default: '' },
  isPlatformOwner: { type: Boolean, default: false },
  resetOtpHash: { type: String, select: false, default: '' },
  resetOtpExpiresAt: { type: Date, select: false },
  resetOtpAttempts: { type: Number, select: false, default: 0 },
}, { timestamps: true });

appUserSchema.index({ email: 1 }, { unique: true });
appUserSchema.index({ googleId: 1 }, { sparse: true });

export const AppUser = model('AppUser', appUserSchema);

