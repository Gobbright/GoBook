import { Schema, model } from 'mongoose';

const attendanceCorrectionSchema = new Schema({
  ownerUserId: { type: Schema.Types.ObjectId, ref: 'AppUser', required: true, index: true },
  employeeId:  { type: String, required: true, trim: true },
  name:        { type: String, required: true, trim: true },
  dept:        { type: String, default: '', trim: true },
  date:        { type: String, required: true, trim: true },
  checkIn:     { type: String, default: '', trim: true },
  checkOut:    { type: String, default: '', trim: true },
  reason:      { type: String, required: true, trim: true },
  status:      { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  reviewedBy:  { type: String, default: '', trim: true },
  reviewedAt:  { type: Date },
}, { timestamps: true });

attendanceCorrectionSchema.index({ ownerUserId: 1, status: 1, date: 1 });
attendanceCorrectionSchema.index({ ownerUserId: 1, employeeId: 1, date: 1 });
attendanceCorrectionSchema.index({ ownerUserId: 1, createdAt: -1 });

export const AttendanceCorrection = model('AttendanceCorrection', attendanceCorrectionSchema);