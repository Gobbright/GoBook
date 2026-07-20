import { Schema, model } from 'mongoose';

const emailCampaignSchema = new Schema({
  name:    { type: String, required: true, trim: true },
  subject: { type: String, trim: true, default: '' },
  body:    { type: String, trim: true, default: '' },
  sentOn:  { type: String, default: '' },
  sent:    { type: Number, default: 0, min: 0 },
  opened:  { type: Number, default: 0, min: 0 },
  clicked: { type: Number, default: 0, min: 0 },
  bounced: { type: Number, default: 0, min: 0 },
  status:  { type: String, enum: ['Draft', 'Scheduled', 'Sent'], default: 'Draft' },
}, { timestamps: true });

export const EmailCampaign = model('EmailCampaign', emailCampaignSchema);
