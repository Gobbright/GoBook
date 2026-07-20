import { Schema, model } from 'mongoose';

const leadSchema = new Schema({
  userId:  { type: Schema.Types.ObjectId, ref: 'AppUser', required: true, index: true },
  name:    { type: String, required: true, trim: true },
  company: { type: String, trim: true, default: '' },
  email:   { type: String, trim: true, lowercase: true, default: '' },
  phone:   { type: String, trim: true, default: '' },
  source:  { type: String, trim: true, default: 'Website' },
  status:  { type: String, default: 'New', enum: ['New', 'Contacted', 'In Progress', 'Qualified', 'Converted'] },
  owner:   { type: String, trim: true, default: '' },
}, { timestamps: true });

leadSchema.index({ name: 'text', company: 1 });

export const Lead = model('Lead', leadSchema);
