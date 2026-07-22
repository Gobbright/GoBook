import { Schema, model } from 'mongoose';

export const VOUCHER_TYPES = [
  'Sales',
  'Purchase',
  'Sales Return',
  'Purchase Return',
  'Receipt',
  'Payment',
  'Contra',
  'Journal',
  'Debit Note',
  'Credit Note',
  'Stock Journal',
  'GST Adjustment',
  'Opening Balance',
];

const voucherLineSchema = new Schema({
  ledgerId:      { type: Schema.Types.ObjectId, ref: 'LedgerAccount' },
  ledgerName:    { type: String, required: true, trim: true },
  ledgerGroup:   { type: String, default: '', trim: true },
  side:          { type: String, enum: ['debit', 'credit'], required: true },
  amount:        { type: Number, required: true, min: 0 },
  billRef:       { type: String, default: '', trim: true },
  costCenter:    { type: String, default: '', trim: true },
  narration:     { type: String, default: '', trim: true },
}, { _id: true });

const accountingVoucherSchema = new Schema({
  userId:       { type: Schema.Types.ObjectId, ref: 'AppUser', required: true, index: true },
  businessId:   { type: Schema.Types.ObjectId, ref: 'Business', index: true },
  voucherType:  { type: String, enum: VOUCHER_TYPES, required: true, index: true },
  voucherNo:    { type: String, required: true, trim: true },
  financialYear:{ type: String, required: true, trim: true, index: true },
  date:         { type: String, required: true, trim: true, index: true },
  partyName:    { type: String, default: '', trim: true },
  referenceNo:  { type: String, default: '', trim: true },
  narration:    { type: String, default: '', trim: true },
  status:       { type: String, enum: ['Draft', 'Posted', 'Cancelled'], default: 'Posted', index: true },
  sourceType:   { type: String, default: '', trim: true, index: true },
  sourceId:     { type: Schema.Types.ObjectId, index: true },
  sourceNumber: { type: String, default: '', trim: true },
  debitTotal:   { type: Number, default: 0 },
  creditTotal:  { type: Number, default: 0 },
  lines:        { type: [voucherLineSchema], default: [] },
  createdBy:    { type: Schema.Types.ObjectId, ref: 'AppUser' },
  updatedBy:    { type: Schema.Types.ObjectId, ref: 'AppUser' },
  postedAt:     { type: Date },
  cancelledAt:  { type: Date },
}, { timestamps: true });

accountingVoucherSchema.index({ userId: 1, financialYear: 1, voucherType: 1, voucherNo: 1 }, { unique: true });
accountingVoucherSchema.index(
  { userId: 1, sourceType: 1, sourceId: 1 },
  { unique: true, sparse: true },
);
accountingVoucherSchema.index({ userId: 1, date: -1, voucherType: 1 });

export const AccountingVoucher = model('AccountingVoucher', accountingVoucherSchema);
