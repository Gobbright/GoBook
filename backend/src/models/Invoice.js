import { Schema, model } from 'mongoose';

const lineItemSchema = new Schema({
  productId:    { type: Schema.Types.ObjectId, ref: 'Product' },
  productCode:  { type: String, default: '', trim: true },
  barcode:      { type: String, default: '', trim: true },
  description: { type: String, default: '' },
  hsn:         { type: String, default: '' },
  qty:         { type: Number, default: 1 },
  unit:        { type: String, default: 'Nos' },
  rate:        { type: Number, default: 0 },
  discount:    { type: Number, default: 0 },
  gstRate:     { type: Number, default: 18 },
});

const chargeSchema = new Schema({
  label:   { type: String, default: '' },
  amount:  { type: String, default: '' },
  gstRate: { type: Number, default: 18 },
});

const customFieldSchema = new Schema({
  key:   { type: String, default: '' },
  value: { type: String, default: '' },
});

const invoiceSchema = new Schema({
  userId:       { type: Schema.Types.ObjectId, ref: 'AppUser', required: true, index: true },
  businessId:   { type: Schema.Types.ObjectId, ref: 'Business', index: true },
  number:       { type: String, required: true, trim: true },
  documentType: { type: String, default: 'invoice' },

  customer: {
    name:    { type: String, default: '' },
    gstin:   { type: String, default: '' },
    phone:   { type: String, default: '' },
    email:   { type: String, default: '' },
    address: { type: String, default: '' },
    city:    { type: String, default: '' },
    state:   { type: String, default: '' },
    pincode: { type: String, default: '' },
  },

  meta: {
    date:          { type: String, default: '' },
    dueDate:       { type: String, default: '' },
    poRef:         { type: String, default: '' },
    placeOfSupply: { type: String, default: '' },
    invoiceType:   { type: String, default: 'regular' },
    rcm:           { type: Boolean, default: false },
    paymentTerms:  { type: String, default: '30' },
  },

  supplyType: { type: String, default: 'intrastate' },
  items:      [lineItemSchema],

  shipping: {
    sameAsBilling: { type: Boolean, default: true },
    address: { type: String, default: '' },
    city:    { type: String, default: '' },
    state:   { type: String, default: '' },
    pincode: { type: String, default: '' },
  },

  charges: [chargeSchema],

  // Mixed to avoid conflict with Mongoose's reserved "type" keyword in sub-documents
  additionalDiscount: { type: Schema.Types.Mixed, default: { type: 'percent', value: '' } },

  tds: {
    enabled: { type: Boolean, default: false },
    section: { type: String, default: '194C' },
    rate:    { type: Number, default: 2 },
  },

  tcs: {
    enabled: { type: Boolean, default: false },
    rate:    { type: Number, default: 1 },
  },

  advanceReceived: { type: Number, default: 0 },
  paymentMethod:   { type: String, default: '', trim: true },
  notes:           { type: String, default: '' },
  internalNotes:   { type: String, default: '' },
  terms:           { type: String, default: '' },
  customFields:    [customFieldSchema],

  recurring: {
    enabled:   { type: Boolean, default: false },
    frequency: { type: String, default: 'monthly' },
    endAfter:  { type: String, default: '' },
    endDate:   { type: String, default: '' },
  },

  extra:   { type: Schema.Types.Mixed, default: {} },
  totals:  { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });

invoiceSchema.index({ userId: 1, number: 1 }, { unique: true });
// Sparse: only enforces uniqueness once businessId is populated, so it can't
// collide with pre-migration documents that don't have one yet.
invoiceSchema.index({ businessId: 1, documentType: 1, number: 1 }, { unique: true, sparse: true });
invoiceSchema.index({ userId: 1, documentType: 1, createdAt: -1 });
invoiceSchema.index({ userId: 1, 'customer.name': 1 });

export const Invoice = model('Invoice', invoiceSchema);
