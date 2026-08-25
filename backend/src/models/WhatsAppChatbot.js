import { Schema, model } from 'mongoose';

const chatbotNodeSchema = new Schema({
  nodeId:       { type: String, required: true, trim: true },
  type:         { type: String, enum: ['Start', 'Message', 'Condition', 'Handoff', 'End'], required: true },
  title:        { type: String, required: true, trim: true },
  messageType:  { type: String, enum: ['Text', 'Image', 'Video', 'Document', 'Audio'], default: 'Text' },
  message:      { type: String, trim: true, default: '' },
  quickReplies: { type: [String], default: [] },
  nextStep:     { type: String, trim: true, default: '' },
  x:            { type: Number, default: 0 },
  y:            { type: Number, default: 0 },
}, { _id: false });

const whatsAppChatbotSchema = new Schema({
  userId:      { type: Schema.Types.ObjectId, ref: 'AppUser', required: true, index: true },
  name:        { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: '' },
  language:    { type: String, trim: true, default: 'English' },
  status:      { type: String, enum: ['Active', 'Inactive', 'Draft'], default: 'Draft' },
  nodes:       { type: [chatbotNodeSchema], default: [] },
  handoff:     {
    enabled: { type: Boolean, default: true },
    team:    { type: String, trim: true, default: '' },
  },
  analytics:   {
    sessions:   { type: Number, default: 0, min: 0 },
    completed:  { type: Number, default: 0, min: 0 },
    handedOff:  { type: Number, default: 0, min: 0 },
    lastUsedAt: { type: Date, default: null },
  },
}, { timestamps: true });

whatsAppChatbotSchema.index({ userId: 1, name: 1 }, { unique: true });

export const WhatsAppChatbot = model('WhatsAppChatbot', whatsAppChatbotSchema);
