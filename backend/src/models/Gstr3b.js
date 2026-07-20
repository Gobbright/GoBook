import { Schema, model } from 'mongoose';

const taxRowSchema = new Schema({
  key:     { type: String },
  label:   { type: String },
  taxable: { type: Number, default: 0 },
  cgst:    { type: Number, default: 0 },
  sgst:    { type: Number, default: 0 },
  igst:    { type: Number, default: 0 },
  cess:    { type: Number, default: 0 },
}, { _id: false });

const itcRowSchema = new Schema({
  key:   { type: String },
  label: { type: String },
  cgst:  { type: Number, default: 0 },
  sgst:  { type: Number, default: 0 },
  igst:  { type: Number, default: 0 },
  cess:  { type: Number, default: 0 },
}, { _id: false });

const gstr3bSchema = new Schema({
  gstin:        { type: String, default: '27ZZZZZ9999A1Z5' },
  period:       { type: String, required: true },
  status:       { type: String, enum: ['draft', 'filed'], default: 'draft' },
  outwardRows:  { type: [taxRowSchema], default: [] },
  itcAvailable: { type: [itcRowSchema], default: [] },
  itcReversed:  { type: [itcRowSchema], default: [] },
  lateFeeCgst:  { type: Number, default: 0 },
  lateFeeSgst:  { type: Number, default: 0 },
  accountingVoucherId: { type: Schema.Types.ObjectId, ref: 'AccountingVoucher' },
  accountingVoucherNo: { type: String, default: '' },
  accountingPostedAt:  { type: Date },
  arn:          { type: String },
  filedAt:      { type: Date },
}, { timestamps: true });

gstr3bSchema.index({ gstin: 1, period: 1 }, { unique: true });

export const Gstr3b = model('Gstr3b', gstr3bSchema);
