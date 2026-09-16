import { Schema, model } from 'mongoose';

const phoneNumberSchema = new Schema({
  displayName: { type: String, trim: true, required: true },
  phoneNumber: { type: String, trim: true, required: true },
  phoneNumberId: { type: String, trim: true, default: '' },
  verificationStatus: { type: String, enum: ['Pending', 'Verified', 'Failed'], default: 'Pending' },
  qualityRating: { type: String, enum: ['Green', 'Yellow', 'Red', 'Unknown'], default: 'Unknown' },
  status: { type: String, enum: ['Active', 'Paused', 'Disconnected'], default: 'Active' },
}, { _id: true, timestamps: true });

const whatsAppProviderProfileSchema = new Schema({
  businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, unique: true, index: true },
  ownerUserId: { type: Schema.Types.ObjectId, ref: 'AppUser', required: true, index: true },
  onboardingStatus: { type: String, enum: ['Not Started', 'In Progress', 'Completed', 'Needs Attention'], default: 'Not Started' },
  metaVerificationStatus: { type: String, enum: ['Not Started', 'Pending', 'Verified', 'Rejected'], default: 'Not Started' },
  accountStatus: { type: String, enum: ['Active', 'Pending', 'Suspended', 'Disconnected'], default: 'Pending' },
  waba: {
    name: { type: String, trim: true, default: '' },
    wabaId: { type: String, trim: true, default: '' },
    businessManagerId: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['Not Connected', 'Pending', 'Connected', 'Restricted'], default: 'Not Connected' },
  },
  phoneNumbers: { type: [phoneNumberSchema], default: [] },
  api: {
    apiKey: { type: String, trim: true, default: '' },
    accessToken: { type: String, select: false, default: '' },
    tokenLastFour: { type: String, trim: true, default: '' },
    tokenExpiresAt: { type: Date },
    status: { type: String, enum: ['Not Configured', 'Active', 'Expired', 'Revoked'], default: 'Not Configured' },
    lastRotatedAt: { type: Date },
  },
  webhook: {
    verifyToken: { type: String, select: false, default: '' },
    url: { type: String, trim: true, default: '' },
    subscribedEvents: { type: [String], default: ['messages', 'message_template_status_update'] },
    status: { type: String, enum: ['Not Configured', 'Verified', 'Error'], default: 'Not Configured' },
  },
  plan: {
    name: { type: String, trim: true, default: 'Starter' },
    monthlyMessageLimit: { type: Number, min: 0, default: 1000 },
    status: { type: String, enum: ['Active', 'Past Due', 'Cancelled', 'Trial'], default: 'Trial' },
    renewalDate: { type: Date },
  },
  settings: {
    timezone: { type: String, trim: true, default: 'Asia/Kolkata' },
    optOutKeyword: { type: String, trim: true, default: 'STOP' },
    defaultCountryCode: { type: String, trim: true, default: '91' },
  },
}, { timestamps: true });

export const WhatsAppProviderProfile = model('WhatsAppProviderProfile', whatsAppProviderProfileSchema);
