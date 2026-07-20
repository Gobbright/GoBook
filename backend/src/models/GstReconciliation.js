import { Schema, model } from 'mongoose';

const entrySchema = new Schema({
  supplier:     { type: String, default: '' },
  gstin:        { type: String, default: '' },
  invoiceNo:    { type: String, default: '' },
  date:         { type: String, default: '' },
  invoiceValue: { type: Number, default: 0 },
  itcBooks:     { type: Number, default: 0 },
  itcGstr2b:    { type: Number, default: 0 },
  diff:         { type: Number, default: 0 },
  status:       { type: String, enum: ['matched', 'mismatch', 'not_in_2b', 'not_in_books'], default: 'matched' },
  resolution:   { type: String, enum: ['none', 'accepted', 'disputed'], default: 'none' },
}, { _id: true });

const reconSchema = new Schema({
  gstin:   { type: String, default: '27ZZZZZ9999A1Z5' },
  period:  { type: String, required: true },
  type:    { type: String, enum: ['2a', '2b'], default: '2b' },
  entries: { type: [entrySchema], default: [] },
}, { timestamps: true });

reconSchema.index({ gstin: 1, period: 1, type: 1 }, { unique: true });

export const GstReconciliation = model('GstReconciliation', reconSchema);
