import { Schema, model } from 'mongoose';

const adminNotificationSchema = new Schema({
  dedupeKey: { type: String, required: true, unique: true, trim: true, index: true },
  type: { type: String, required: true, trim: true, index: true },
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  relatedUser: { type: String, trim: true, default: '' },
  userId: { type: Schema.Types.ObjectId, ref: 'AppUser', index: true },
  businessId: { type: Schema.Types.ObjectId, ref: 'Business', index: true },
  paymentId: { type: Schema.Types.ObjectId, ref: 'SubscriptionPayment', index: true },
  read: { type: Boolean, default: false, index: true },
  archived: { type: Boolean, default: false, index: true },
  metadata: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });

adminNotificationSchema.index({ archived: 1, createdAt: -1 });

export const AdminNotification = model('AdminNotification', adminNotificationSchema);
