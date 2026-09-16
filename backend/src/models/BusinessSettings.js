import { Schema, model } from 'mongoose';

import { RETAIL_SUBCATEGORIES } from '../constants/categories.js';

const invoiceLayoutSchema = new Schema({
  invoiceShowLogo: Boolean,
  invoiceShowAmountWords: Boolean,
  invoiceShowBankDetails: Boolean,
  invoiceShowPaymentQr: Boolean,
  invoiceShowNotes: Boolean,
  invoiceShowTerms: Boolean,
  invoiceShowSignature: Boolean,
  invoiceShowGoBookBranding: Boolean,
}, { _id: false });

const businessSettingsSchema = new Schema({
  invoiceLayoutSettings: {
    normal: { type: invoiceLayoutSchema, default: undefined },
    thermal80: { type: invoiceLayoutSchema, default: undefined },
  },
  userId:          { type: Schema.Types.ObjectId, ref: 'AppUser', required: true, unique: true, index: true },
  businessName:    { type: String, default: '' },
  retailSubcategory: { type: String, enum: ['', ...RETAIL_SUBCATEGORIES], default: '' },
  businessEmail:   { type: String, default: '' },
  phone:           { type: String, default: '' },
  address:         { type: String, default: '' },
  gstin:           { type: String, default: '' },
  fyStart:         { type: String, default: '01 April' },
  currency:        { type: String, default: 'INR - Indian Rupee (₹)' },
  timezone:        { type: String, default: '(GMT +05:30) Asia/Kolkata' },
  lastReminderRunDate: { type: String, default: '' },
  dateFormat:      { type: String, default: 'DD MMM YYYY' },
  invoicePrefix:   { type: String, default: 'INV-' },
  financeReceiptPrefix: { type: String, default: 'FIN-' },
  financeBillFooter:    { type: String, default: 'Thank you for your payment.' },
  emailNotifications:    { type: Boolean, default: true },
  smsNotifications:      { type: Boolean, default: true },
  whatsappNotifications: { type: Boolean, default: true },
  autoBackup:            { type: Boolean, default: true },
  maintainAuditLog:      { type: Boolean, default: true },
  logoUrl:               { type: String, default: '' },
  logoFileId:            { type: Schema.Types.ObjectId },
  paymentQrUrl:          { type: String, default: '' },
  paymentQrFileId:       { type: Schema.Types.ObjectId },
  invoiceShowLogo:       { type: Boolean, default: true },
  invoiceShowAmountWords: { type: Boolean, default: true },
  invoiceShowBankDetails: { type: Boolean, default: true },
  invoiceShowPaymentQr:  { type: Boolean, default: true },
  invoiceShowNotes:      { type: Boolean, default: true },
  invoiceShowTerms:      { type: Boolean, default: true },
  invoiceShowSignature:  { type: Boolean, default: true },
  invoiceShowGoBookBranding: { type: Boolean, default: true },
  invoicePrintFormat:    { type: String, enum: ['normal', 'thermal80'], default: 'normal' },
  bankName:             { type: String, default: '' },
  accountHolderName:    { type: String, default: '' },
  accountNumber:        { type: String, default: '' },
  ifscCode:             { type: String, default: '' },
  bankBranch:           { type: String, default: '' },
  accountType:          { type: String, default: 'Savings' },
  city:                 { type: String, default: '' },
  state:                { type: String, default: 'Tamil Nadu' },
  pincode:              { type: String, default: '' },
  // Hospital's own outgoing email account, used to send appointment reminders
  // as the hospital instead of the platform's shared mailbox.
  emailSmtpHost:        { type: String, default: '' },
  emailSmtpPort:        { type: Number, default: 587 },
  emailSmtpSecure:      { type: Boolean, default: false },
  emailSmtpUser:        { type: String, default: '' },
  emailSmtpPass:        { type: String, default: '', select: false },
}, { timestamps: true });

export const BusinessSettings = model('BusinessSettings', businessSettingsSchema);
