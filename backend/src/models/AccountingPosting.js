import { Schema, model } from 'mongoose';

const postingLineSchema = new Schema({
  accountName: { type: String, required: true, trim: true },
  group:       { type: String, required: true, trim: true },
  side:        { type: String, enum: ['debit', 'credit'], required: true },
  amount:      { type: Number, required: true, min: 0 },
  costCenter:  { type: String, default: '', trim: true },
}, { _id: false });

const accountingPostingSchema = new Schema({
  userId:          { type: Schema.Types.ObjectId, ref: 'AppUser', required: true, index: true },
  businessId:      { type: Schema.Types.ObjectId, ref: 'Business', index: true },
  sourceType:      { type: String, required: true, trim: true },
  sourceId:        { type: Schema.Types.ObjectId, required: true, index: true },
  sourceNumber:    { type: String, default: '', trim: true },
  date:            { type: String, default: '' },
  narration:       { type: String, default: '', trim: true },
  journalEntryNos: [{ type: String, trim: true }],
  cashBookVchNos:  [{ type: String, trim: true }],
  bankBookVchNos:  [{ type: String, trim: true }],
  voucherIds:      [{ type: Schema.Types.ObjectId, ref: 'AccountingVoucher' }],
  lines:           [postingLineSchema],
}, { timestamps: true });

accountingPostingSchema.index({ userId: 1, sourceType: 1, sourceId: 1 }, { unique: true });

export const AccountingPosting = model('AccountingPosting', accountingPostingSchema);
