import { Schema, model } from 'mongoose';

const adminRecordSchema = new Schema({
  kind: { type: String, required: true, trim: true, index: true },
  group: { type: String, required: true, trim: true, index: true },
  title: { type: String, required: true, trim: true },
  status: { type: String, default: 'Active', trim: true },
  amount: { type: Number, default: 0 },
  target: { type: String, default: '', trim: true },
  notes: { type: String, default: '', trim: true },
  scheduledDate: { type: String, default: '' },
}, { timestamps: true });

adminRecordSchema.index({ kind: 1, createdAt: -1 });

export const AdminRecord = model('AdminRecord', adminRecordSchema);
