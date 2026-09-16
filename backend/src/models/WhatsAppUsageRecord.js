import { Schema, model } from 'mongoose';

const whatsAppUsageRecordSchema = new Schema({
  businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
  date: { type: Date, required: true, index: true },
  sent: { type: Number, default: 0, min: 0 },
  delivered: { type: Number, default: 0, min: 0 },
  read: { type: Number, default: 0, min: 0 },
  failed: { type: Number, default: 0, min: 0 },
  conversations: { type: Number, default: 0, min: 0 },
  charge: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

whatsAppUsageRecordSchema.index({ businessId: 1, date: 1 }, { unique: true });
export const WhatsAppUsageRecord = model('WhatsAppUsageRecord', whatsAppUsageRecordSchema);
