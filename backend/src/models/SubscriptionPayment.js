import { Schema, model } from 'mongoose';
import { CATEGORIES } from '../constants/categories.js';

const subscriptionPaymentSchema = new Schema({
  email: { type: String, required: true, trim: true, lowercase: true, index: true },
  customerName: { type: String, required: true, trim: true },
  businessName: { type: String, required: true, trim: true },
  phone: { type: String, trim: true, default: '' },
  category: { type: String, enum: CATEGORIES, required: true },
  tier: { type: String, enum: ['basic', 'mid', 'advanced'], required: true },
  planName: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 1 },
  amountPaise: { type: Number, required: true, min: 100 },
  currency: { type: String, enum: ['INR'], default: 'INR' },
  status: { type: String, enum: ['pending', 'processing', 'successful', 'failed'], default: 'pending', index: true },
  razorpayOrderId: { type: String, required: true, unique: true, trim: true },
  razorpayPaymentId: { type: String, trim: true, default: '', index: true, sparse: true },
  razorpaySignature: { type: String, select: false, default: '' },
  method: { type: String, trim: true, default: '' },
  bank: { type: String, trim: true, default: '' },
  wallet: { type: String, trim: true, default: '' },
  vpa: { type: String, trim: true, default: '' },
  errorCode: { type: String, trim: true, default: '' },
  errorDescription: { type: String, trim: true, default: '' },
  paidAt: { type: Date }, failedAt: { type: Date },
  userId: { type: Schema.Types.ObjectId, ref: 'AppUser', index: true },
  businessId: { type: Schema.Types.ObjectId, ref: 'Business', index: true },
  webhookEventIds: [{ type: String, trim: true }],
  invoiceNumber: { type: String, trim: true, default: '', index: true },
  invoicePdfFileId: { type: Schema.Types.ObjectId },
  invoiceEmailStatus: { type: String, enum: ['', 'pending', 'sending', 'sent', 'failed'], default: 'pending', index: true },
  invoiceEmailSentAt: { type: Date },
  invoiceEmailError: { type: String, trim: true, default: '' },
}, { timestamps: true });
subscriptionPaymentSchema.index({ createdAt: -1 });
export const SubscriptionPayment = model('SubscriptionPayment', subscriptionPaymentSchema);
