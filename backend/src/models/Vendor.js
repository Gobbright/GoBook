import { Schema, model } from 'mongoose';

const vendorSchema = new Schema({
  userId:   { type: Schema.Types.ObjectId, ref: 'AppUser', required: true, index: true },
  name:     { type: String, required: true, trim: true },
  contact:  { type: String, trim: true, default: '' },
  phone:    { type: String, trim: true, default: '' },
  email:    { type: String, trim: true, lowercase: true, default: '' },
  category: { type: String, trim: true, default: '' },
  status:   { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  gstin:    { type: String, trim: true, uppercase: true, default: '' },
  address:  { type: String, trim: true, default: '' },
}, { timestamps: true });

vendorSchema.index({ name: 'text', contact: 1 });

export const Vendor = model('Vendor', vendorSchema);
