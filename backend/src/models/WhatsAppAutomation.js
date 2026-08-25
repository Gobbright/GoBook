import { Schema, model } from 'mongoose';

const automationStepSchema = new Schema({
  type: { type: String, enum: ['Trigger', 'Condition', 'Action', 'Exit'], required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: '' },
}, { _id: false });

const whatsAppAutomationSchema = new Schema({
  userId:      { type: Schema.Types.ObjectId, ref: 'AppUser', required: true, index: true },
  name:        { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: '' },
  trigger:     { type: String, required: true, trim: true },
  triggerGroup: { type: String, trim: true, default: '' },
  action:      { type: String, required: true, trim: true, default: 'Send WhatsApp' },
  templateName: { type: String, trim: true, default: '' },
  status:      { type: String, enum: ['Active', 'Inactive', 'Draft'], default: 'Draft' },
  runs:        { type: Number, default: 0, min: 0 },
  successful:  { type: Number, default: 0, min: 0 },
  failed:      { type: Number, default: 0, min: 0 },
  lastRunAt:   { type: Date, default: null },
  steps:       { type: [automationStepSchema], default: [] },
}, { timestamps: true });

whatsAppAutomationSchema.index({ userId: 1, name: 1 }, { unique: true });

export const WhatsAppAutomation = model('WhatsAppAutomation', whatsAppAutomationSchema);
