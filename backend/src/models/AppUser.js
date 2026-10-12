import { Schema, model } from 'mongoose';

import { CATEGORIES, RETAIL_SUBCATEGORIES } from '../constants/categories.js';

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
  retailSubcategory: { type: String, enum: ['', ...RETAIL_SUBCATEGORIES], default: '' },
  subscriptionPlan: { type: String, enum: ['', 'starter', 'professional', 'enterprise', 'basic', 'mid', 'advanced'], default: '' },
  subscriptionAmount: { type: Number, default: 0 },
  subscriptionStatus: { type: String, enum: ['', 'trial', 'active', 'expired', 'cancelled'], default: '' },
  subscriptionStartDate: { type: Date },
  billingStatus: { type: String, enum: ['PAYMENT_METHOD_VERIFICATION_PENDING', 'TRIAL_ACTIVE', 'TRIAL_EXPIRED', 'SUBSCRIPTION_PENDING', 'SUBSCRIPTION_ACTIVE', 'SUBSCRIPTION_EXPIRED', 'PAYMENT_FAILED', 'active', 'trial', 'expired', 'pending'], default: 'PAYMENT_METHOD_VERIFICATION_PENDING', index: true },
  subscriptionExpiresAt: { type: Date },
  trialStartedAt: { type: Date },
  trialEndsAt: { type: Date },
  lastSubscriptionPaymentId: { type: Schema.Types.ObjectId, ref: 'SubscriptionPayment' },
  // Razorpay references only; never store UPI, card, bank, CVV, or credentials.
  paymentMethodVerified: { type: Boolean, default: false },
  paymentMethodVerifiedAt: { type: Date },
  trialClaimedAt: { type: Date, immutable: true },
  razorpayCustomerId: { type: String, trim: true, default: '', index: true, sparse: true },
  paymentMethodVerificationPaymentId: { type: String, trim: true, default: '', index: true, sparse: true },
  paymentMethodVerificationOrderId: { type: String, trim: true, default: '', index: true, sparse: true },
  paymentMethodVerificationRefundId: { type: String, trim: true, default: '', index: true, sparse: true },
  onboardingCompleted: { type: Boolean, default: false },
  accountType:  { type: String, enum: ['owner', 'member'], default: 'owner', index: true },
  parentUserId: { type: Schema.Types.ObjectId, ref: 'AppUser', index: true },
  permissions: {
    modules: { type: [String], default: [] },
    actions: {
      view:   { type: Boolean, default: true },
      create: { type: Boolean, default: true },
      edit:   { type: Boolean, default: true },
      delete: { type: Boolean, default: false },
      export: { type: Boolean, default: false },
      manageUsers: { type: Boolean, default: false },
    },
  },
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
appUserSchema.index({ businessId: 1, accountType: 1 });

export const AppUser = model('AppUser', appUserSchema);
