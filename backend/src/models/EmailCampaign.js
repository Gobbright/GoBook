import { Schema, model } from 'mongoose';

const emailCampaignSchema = new Schema({
  userId:  { type: Schema.Types.ObjectId, ref: 'AppUser', required: true, index: true },
  name:    { type: String, required: true, trim: true },
  subject: { type: String, trim: true, default: '' },
  body:    { type: String, trim: true, default: '' },
  campaignType: { type: String, trim: true, default: 'Promotional' },
  description: { type: String, trim: true, default: '' },
  tags: { type: String, trim: true, default: '' },
  audienceType: { type: String, trim: true, default: 'Customers' },
  audienceName: { type: String, trim: true, default: 'Customers' },
  fromName: { type: String, trim: true, default: '' },
  fromEmail: { type: String, trim: true, lowercase: true, default: '' },
  previewText: { type: String, trim: true, default: '' },
  openTracking: { type: Boolean, default: true },
  clickTracking: { type: Boolean, default: true },
  utmTracking: { type: Boolean, default: true },
  recipients: [{
    email:  { type: String, required: true, trim: true, lowercase: true },
    status: { type: String, enum: ['Pending', 'Sent', 'Failed'], default: 'Pending' },
    sentAt: { type: Date },
    error:  { type: String, default: '' },
  }],
  scheduledAt: { type: Date },
  sentOn:  { type: String, default: '' },
  sent:    { type: Number, default: 0, min: 0 },
  opened:  { type: Number, default: 0, min: 0 },
  clicked: { type: Number, default: 0, min: 0 },
  bounced: { type: Number, default: 0, min: 0 },
  status:  { type: String, enum: ['Draft', 'Scheduled', 'Sending', 'Sent', 'Failed'], default: 'Draft' },
}, { timestamps: true });

export const EmailCampaign = model('EmailCampaign', emailCampaignSchema);
