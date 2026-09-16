import { Schema, model } from 'mongoose';

const whatsAppCampaignSchema = new Schema({
  userId:    { type: Schema.Types.ObjectId, ref: 'AppUser', required: true, index: true },
  name:      { type: String, required: true, trim: true },
  businessId: { type: Schema.Types.ObjectId, ref: 'Business', index: true },
  templateId: { type: Schema.Types.ObjectId, ref: 'WhatsAppTemplate' },
  contactGroupId: { type: Schema.Types.ObjectId, ref: 'WhatsAppContactGroup' },
  messageType: { type: String, enum: ['Text', 'Image', 'Video', 'Document', 'Template'], default: 'Text' },
  mediaUrl: { type: String, trim: true, default: '' },
  scheduledAt: { type: Date },
  type:      { type: String, enum: ['Promotional', 'Transactional', 'Utility'], default: 'Promotional' },
  message:   { type: String, trim: true, default: '' },
  sent:      { type: Number, default: 0, min: 0 },
  delivered: { type: Number, default: 0, min: 0 },
  read:      { type: Number, default: 0, min: 0 },
  replied:   { type: Number, default: 0, min: 0 },
  status:    { type: String, enum: ['Draft', 'Active', 'Completed', 'Paused'], default: 'Draft' },
  failed:    { type: Number, default: 0, min: 0 },
}, { timestamps: true });

export const WhatsAppCampaign = model('WhatsAppCampaign', whatsAppCampaignSchema);
