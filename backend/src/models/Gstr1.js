import { Schema, model } from 'mongoose';

const b2bSchema = new Schema({
  gstin:     { type: String, default: '' },
  name:      { type: String, default: '' },
  invoiceNo: { type: String, default: '' },
  date:      { type: String, default: '' },
  value:     { type: Number, default: 0 },
  taxable:   { type: Number, default: 0 },
  rate:      { type: Number, default: 18 },
  cgst:      { type: Number, default: 0 },
  sgst:      { type: Number, default: 0 },
  igst:      { type: Number, default: 0 },
}, { _id: true });

const b2csSchema = new Schema({
  state:   { type: String, default: '' },
  type:    { type: String, default: 'Intrastate' },
  taxable: { type: Number, default: 0 },
  rate:    { type: Number, default: 18 },
  cgst:    { type: Number, default: 0 },
  sgst:    { type: Number, default: 0 },
  igst:    { type: Number, default: 0 },
}, { _id: true });

const hsnSchema = new Schema({
  hsn:     { type: String, default: '' },
  desc:    { type: String, default: '' },
  uqc:     { type: String, default: 'OTH' },
  qty:     { type: Number, default: 0 },
  value:   { type: Number, default: 0 },
  taxable: { type: Number, default: 0 },
  rate:    { type: Number, default: 18 },
  cgst:    { type: Number, default: 0 },
  sgst:    { type: Number, default: 0 },
  igst:    { type: Number, default: 0 },
}, { _id: true });

const gstr1Schema = new Schema({
  gstin:       { type: String, default: '27ZZZZZ9999A1Z5' },
  period:      { type: String, required: true },
  filingType:  { type: String, enum: ['monthly', 'quarterly'], default: 'monthly' },
  status:      { type: String, enum: ['draft', 'filed'], default: 'draft' },
  b2b:         { type: [b2bSchema], default: [] },
  b2cs:        { type: [b2csSchema], default: [] },
  hsn:         { type: [hsnSchema], default: [] },
  arn:         { type: String },
  filedAt:     { type: Date },
}, { timestamps: true });

gstr1Schema.index({ gstin: 1, period: 1, filingType: 1 }, { unique: true });

export const Gstr1 = model('Gstr1', gstr1Schema);
