import { Schema, model } from 'mongoose';

const whatsAppCampaignSchema = new Schema({
  name:      { type: String, required: true, trim: true },
  type:      { type: String, enum: ['Promotional', 'Transactional', 'Utility'], default: 'Promotional' },
  message:   { type: String, trim: true, default: '' },
  sent:      { type: Number, default: 0, min: 0 },
  delivered: { type: Number, default: 0, min: 0 },
  read:      { type: Number, default: 0, min: 0 },
  replied:   { type: Number, default: 0, min: 0 },
  status:    { type: String, enum: ['Draft', 'Active', 'Completed', 'Paused'], default: 'Draft' },
}, { timestamps: true });

export const WhatsAppCampaign = model('WhatsAppCampaign', whatsAppCampaignSchema);
