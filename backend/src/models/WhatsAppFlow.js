import { Schema, model } from 'mongoose';

const flowNodeSchema = new Schema({
  nodeId:       { type: String, required: true, trim: true },
  type:         { type: String, enum: ['Start', 'Message', 'Question', 'Condition', 'Reminder', 'Wait', 'Success', 'End'], required: true },
  title:        { type: String, required: true, trim: true },
  messageType:  { type: String, enum: ['Text', 'Image', 'Video', 'Document', 'Audio'], default: 'Text' },
  message:      { type: String, trim: true, default: '' },
  variableName: { type: String, trim: true, default: '' },
  buttons:      { type: [String], default: [] },
  nextStep:     { type: String, trim: true, default: '' },
  x:            { type: Number, default: 0 },
  y:            { type: Number, default: 0 },
}, { _id: false });

const whatsAppFlowSchema = new Schema({
  userId:      { type: Schema.Types.ObjectId, ref: 'AppUser', required: true, index: true },
  name:        { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: '' },
  category:    { type: String, enum: ['Lead Generation', 'Customer Support', 'Booking & Appointment', 'Feedback', 'Others'], default: 'Others' },
  status:      { type: String, enum: ['Published', 'Draft', 'Inactive'], default: 'Draft' },
  nodes:       { type: [flowNodeSchema], default: [] },
  analytics:   {
    starts:      { type: Number, default: 0, min: 0 },
    completions: { type: Number, default: 0, min: 0 },
    lastUsedAt:  { type: Date, default: null },
  },
}, { timestamps: true });

whatsAppFlowSchema.index({ userId: 1, name: 1 }, { unique: true });

export const WhatsAppFlow = model('WhatsAppFlow', whatsAppFlowSchema);
