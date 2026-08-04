import { Schema, model } from 'mongoose';

const holidaySchema = new Schema({
  ownerUserId: { type: Schema.Types.ObjectId, ref: 'AppUser', required: true, index: true },
  name:        { type: String, required: true, trim: true },
  date:        { type: String, required: true, trim: true },
  type:        { type: String, enum: ['Public', 'Optional', 'Company'], default: 'Company' },
  description: { type: String, default: '', trim: true },
}, { timestamps: true });

holidaySchema.index({ ownerUserId: 1, date: 1 }, { unique: true });

export const Holiday = model('Holiday', holidaySchema);