import { Schema, model } from 'mongoose';

const whatsAppContactGroupSchema = new Schema({
  businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: '' },
  contactCount: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: ['Active', 'Archived'], default: 'Active' },
}, { timestamps: true });

whatsAppContactGroupSchema.index({ businessId: 1, name: 1 }, { unique: true });
export const WhatsAppContactGroup = model('WhatsAppContactGroup', whatsAppContactGroupSchema);
