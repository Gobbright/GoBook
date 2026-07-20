import { Schema, model } from 'mongoose';

const salesRecordSchema = new Schema({
  userId:   { type: Schema.Types.ObjectId, ref: 'AppUser', required: true, index: true },
  date:     { type: String, required: true },
  number:   { type: String, required: true, trim: true },
  customer: { type: String, trim: true, default: '' },
  person:   { type: String, trim: true, default: '' },
  amount:   { type: Number, default: 0, min: 0 },
  status:   { type: String, trim: true, default: 'Pending' },
  type:     { type: String, enum: ['quotation', 'order', 'invoice'], default: 'quotation' },
}, { timestamps: true });

salesRecordSchema.index({ userId: 1, number: 1 }, { unique: true });
salesRecordSchema.index({ userId: 1, type: 1, status: 1, createdAt: -1 });

export const SalesRecord = model('SalesRecord', salesRecordSchema);
