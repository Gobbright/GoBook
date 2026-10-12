import { Schema, model } from 'mongoose';

// Metadata only: do not persist raw webhook bodies or payment credentials.
const razorpayWebhookEventSchema = new Schema({
  eventId: { type: String, trim: true, unique: true, sparse: true },
  event: { type: String, trim: true, default: '', index: true },
  orderId: { type: String, trim: true, default: '', index: true },
  paymentId: { type: String, trim: true, default: '', index: true },
  refundId: { type: String, trim: true, default: '', index: true },
  transactionId: { type: Schema.Types.ObjectId, ref: 'SubscriptionPayment', index: true },
  signatureVerified: { type: Boolean, required: true },
  processingStatus: { type: String, enum: ['received', 'processed', 'ignored', 'failed'], default: 'received' },
  error: { type: String, trim: true, default: '' },
}, { timestamps: true });

export const RazorpayWebhookEvent = model('RazorpayWebhookEvent', razorpayWebhookEventSchema);
