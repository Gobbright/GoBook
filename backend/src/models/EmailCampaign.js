import { Schema, model } from 'mongoose';

const emailCampaignSchema = new Schema({
  userId:  { type: Schema.Types.ObjectId, ref: 'AppUser', required: true, index: true },
  name:    { type: String, required: true, trim: true },
  subject: { type: String, trim: true, default: '' },
  body:    { type: String, trim: true, default: '' },
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
  status:  { type: String, enum: ['Draft', 'Scheduled', 'Sent'], default: 'Draft' },
}, { timestamps: true });

export const EmailCampaign = model('EmailCampaign', emailCampaignSchema);
