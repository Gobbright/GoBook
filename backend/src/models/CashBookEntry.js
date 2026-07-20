import { Schema, model } from 'mongoose';

const cashBookEntrySchema = new Schema({
  userId:      { type: Schema.Types.ObjectId, ref: 'AppUser', required: true, index: true },
  date:        { type: String, required: true, trim: true },
  particulars: { type: String, required: true, trim: true },
  vchType:     { type: String, required: true, trim: true },
  vchNo:       { type: String, required: true, trim: true },
  receipt:     { type: Number, default: 0, min: 0 },
  payment:     { type: Number, default: 0, min: 0 },
  balance:     { type: Number, default: 0 },
  sourceType:  { type: String, trim: true, default: '' },
  sourceId:    { type: Schema.Types.ObjectId, index: true },
  isAuto:      { type: Boolean, default: false },
}, { timestamps: true });

cashBookEntrySchema.index({ userId: 1, vchNo: 1 }, { unique: true });
cashBookEntrySchema.index({ userId: 1, date: -1, vchType: 1 });
cashBookEntrySchema.index({ userId: 1, sourceType: 1, sourceId: 1 });

export const CashBookEntry = model('CashBookEntry', cashBookEntrySchema);
