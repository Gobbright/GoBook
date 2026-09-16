import { Schema, model } from 'mongoose';

const whatsAppMessageLogSchema = new Schema({
  businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
  campaignId: { type: Schema.Types.ObjectId, ref: 'WhatsAppCampaign', index: true },
  direction: { type: String, enum: ['Inbound', 'Outbound'], required: true },
  contactName: { type: String, trim: true, default: '' },
  phone: { type: String, trim: true, default: '' },
  messageType: { type: String, enum: ['Text', 'Image', 'Video', 'Document', 'Template'], default: 'Text' },
  body: { type: String, trim: true, default: '' },
  status: { type: String, enum: ['Queued', 'Sent', 'Delivered', 'Read', 'Failed', 'Received'], default: 'Queued' },
  providerMessageId: { type: String, trim: true, default: '' },
  error: { type: String, trim: true, default: '' },
}, { timestamps: true });

whatsAppMessageLogSchema.index({ businessId: 1, createdAt: -1 });
export const WhatsAppMessageLog = model('WhatsAppMessageLog', whatsAppMessageLogSchema);
