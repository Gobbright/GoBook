import { Schema, model } from 'mongoose';
import { CATEGORIES } from '../constants/categories.js';

const subscriptionPlanSchema = new Schema({
  category: { type: String, enum: CATEGORIES, required: true, index: true },
  tier: { type: String, enum: ['basic', 'mid', 'advanced'], required: true },
  name: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 1, max: 10000000 },
  currency: { type: String, enum: ['INR'], default: 'INR' },
  billingPeriod: { type: String, enum: ['year'], default: 'year' },
  features: [{ type: String, trim: true }],
  enabled: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });
subscriptionPlanSchema.index({ category: 1, tier: 1 }, { unique: true });
export const SubscriptionPlan = model('SubscriptionPlan', subscriptionPlanSchema);
