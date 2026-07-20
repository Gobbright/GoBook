import { Schema, model } from 'mongoose';

const customerSchema = new Schema({
  userId:  { type: Schema.Types.ObjectId, ref: 'AppUser', required: true, index: true },
  name:    { type: String, required: true, trim: true },
  gstin:   { type: String, trim: true, uppercase: true, default: '' },
  phone:   { type: String, trim: true, default: '' },
  email:   { type: String, trim: true, lowercase: true, default: '' },
  address: { type: String, trim: true, default: '' },
  city:    { type: String, trim: true, default: '' },
  state:   { type: String, trim: true, default: '' },
  pincode: { type: String, trim: true, default: '' },
  status:  { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  sales:   { type: Number, default: 0, min: 0 },
}, { timestamps: true });

customerSchema.index({ name: 'text', gstin: 1 });

export const Customer = model('Customer', customerSchema);
