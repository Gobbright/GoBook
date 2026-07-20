import { Schema, model } from 'mongoose';

const documentSchema = new Schema({
  userId:     { type: Schema.Types.ObjectId, ref: 'AppUser', required: true, index: true },
  name:       { type: String, required: true, trim: true },
  employee:   { type: String, default: '', trim: true },
  empId:      { type: String, default: '', trim: true },
  category:   { type: String, enum: ['ID Proof', 'Address Proof', 'Certificates', 'Contracts', 'Other Documents'], default: 'Other Documents' },
  uploadedBy: { type: String, default: 'Super Admin', trim: true },
  uploadedOn: { type: String, default: '' },
  size:       { type: String, default: '' },
  filePath:   { type: String, default: '' },
  mimeType:   { type: String, default: 'application/pdf' },
}, { timestamps: true });

documentSchema.index({ category: 1 });
documentSchema.index({ empId: 1 });

export const HRDocument = model('HRDocument', documentSchema);
