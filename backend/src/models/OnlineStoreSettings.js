import { Schema, model } from 'mongoose';

const themeSchema = new Schema({
  name: { type: String, enum: ['classic', 'modern', 'minimal', 'retail', 'fashion', 'grocery', 'electronics'], default: 'modern' },
  primaryColor: { type: String, trim: true, default: '#2563eb' },
  logoUrl: { type: String, trim: true, default: '' },
  bannerImageUrl: { type: String, trim: true, default: '' },
}, { _id: false });

const onlineStoreSettingsSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'AppUser', required: true },
  businessId: { type: Schema.Types.ObjectId, ref: 'Business', index: true },
  enabled: { type: Boolean, default: false, index: true },
  storeName: { type: String, trim: true, default: '' },
  slug: { type: String, trim: true, lowercase: true },
  tagline: { type: String, trim: true, default: '' },
  phone: { type: String, trim: true, default: '' },
  email: { type: String, trim: true, lowercase: true, default: '' },
  address: { type: String, trim: true, default: '' },
  orderMode: { type: String, enum: ['inquiry', 'cod'], default: 'inquiry' },
  theme: { type: themeSchema, default: () => ({}) },
}, { timestamps: true });

onlineStoreSettingsSchema.index({ slug: 1 }, { unique: true, sparse: true });
onlineStoreSettingsSchema.index({ userId: 1 }, { unique: true });

export const OnlineStoreSettings = model('OnlineStoreSettings', onlineStoreSettingsSchema);
