import { Schema, model } from 'mongoose';

const businessSettingsSchema = new Schema({
  userId:          { type: Schema.Types.ObjectId, ref: 'AppUser', required: true, unique: true, index: true },
  businessName:    { type: String, default: '' },
  businessEmail:   { type: String, default: '' },
  phone:           { type: String, default: '' },
  address:         { type: String, default: '' },
  gstin:           { type: String, default: '' },
  fyStart:         { type: String, default: '01 April' },
  currency:        { type: String, default: 'INR - Indian Rupee (₹)' },
  timezone:        { type: String, default: '(GMT +05:30) Asia/Kolkata' },
  dateFormat:      { type: String, default: 'DD MMM YYYY' },
  invoicePrefix:   { type: String, default: 'INV-' },
  emailNotifications:    { type: Boolean, default: true },
  smsNotifications:      { type: Boolean, default: true },
  whatsappNotifications: { type: Boolean, default: true },
  autoBackup:            { type: Boolean, default: true },
  maintainAuditLog:      { type: Boolean, default: true },
  logoUrl:               { type: String, default: '' },
  bankName:             { type: String, default: '' },
  accountHolderName:    { type: String, default: '' },
  accountNumber:        { type: String, default: '' },
  ifscCode:             { type: String, default: '' },
  bankBranch:           { type: String, default: '' },
  accountType:          { type: String, default: 'Savings' },
  city:                 { type: String, default: '' },
  state:                { type: String, default: 'Tamil Nadu' },
  pincode:              { type: String, default: '' },
  // GSP (GST Suvidha Provider) credentials for E-Way Bill API
  gspProvider:          { type: String, default: '' },
  gspClientId:          { type: String, default: '' },
  gspClientSecret:      { type: String, default: '' },
  gspUsername:          { type: String, default: '' },
  gspPassword:          { type: String, default: '' },
  gspSandbox:           { type: Boolean, default: true },
}, { timestamps: true });

export const BusinessSettings = model('BusinessSettings', businessSettingsSchema);
