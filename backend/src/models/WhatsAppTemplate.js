import { Schema, model } from 'mongoose';

const buttonSchema = new Schema({
  label: { type: String, trim: true, default: '' },
  type: { type: String, enum: ['Quick Reply', 'URL Button', 'Phone Button'], default: 'Quick Reply' },
}, { _id: false });

const whatsAppTemplateSchema = new Schema({
  userId:   { type: Schema.Types.ObjectId, ref: 'AppUser', required: true, index: true },
  name:     { type: String, required: true, trim: true },
  category: { type: String, enum: ['Marketing', 'Utility', 'Authentication'], default: 'Utility' },
  language: { type: String, trim: true, default: 'English' },
  status:   { type: String, enum: ['Approved', 'Pending', 'Rejected', 'Disabled'], default: 'Pending' },
  header:   { type: String, trim: true, default: '' },
  body:     { type: String, required: true, trim: true },
  footer:   { type: String, trim: true, default: '' },
  buttons:  { type: [buttonSchema], default: [] },
}, { timestamps: true });

whatsAppTemplateSchema.index({ userId: 1, name: 1 }, { unique: true });

export const WhatsAppTemplate = model('WhatsAppTemplate', whatsAppTemplateSchema);
