import { Schema, model } from 'mongoose';

const bankBookEntrySchema = new Schema({
  userId:      { type: Schema.Types.ObjectId, ref: 'AppUser', required: true, index: true },
  bank:        { type: String, required: true, trim: true },
  accountNo:   { type: String, trim: true, default: '' },
  ifsc:        { type: String, trim: true, uppercase: true, default: '' },
  accountType: { type: String, trim: true, default: 'Current Account' },
  date:        { type: String, required: true, trim: true },
  particulars: { type: String, required: true, trim: true },
  vchType:     { type: String, required: true, trim: true },
  vchNo:       { type: String, required: true, trim: true },
  deposit:     { type: Number, default: 0, min: 0 },
  withdrawal:  { type: Number, default: 0, min: 0 },
  balance:     { type: Number, default: 0 },
  sourceType:  { type: String, trim: true, default: '' },
  sourceId:    { type: Schema.Types.ObjectId, index: true },
  isAuto:      { type: Boolean, default: false },
  reconciled:  { type: Boolean, default: false, index: true },
  bankDate:    { type: String, trim: true, default: '' },
  bankReference: { type: String, trim: true, default: '' },
  reconciliationNotes: { type: String, trim: true, default: '' },
  reconciledAt: { type: Date },
}, { timestamps: true });

bankBookEntrySchema.index({ userId: 1, vchNo: 1 }, { unique: true });
bankBookEntrySchema.index({ userId: 1, bank: 1, date: -1 });
bankBookEntrySchema.index({ userId: 1, sourceType: 1, sourceId: 1 });

export const BankBookEntry = model('BankBookEntry', bankBookEntrySchema);
