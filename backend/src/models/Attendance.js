import { Schema, model } from 'mongoose';

const attendanceSchema = new Schema({
  userId:     { type: Schema.Types.ObjectId, ref: 'AppUser', required: true, index: true },
  employeeId: { type: String, required: true, trim: true },
  name:       { type: String, required: true, trim: true },
  dept:       { type: String, default: '', trim: true },
  date:       { type: String, required: true, trim: true },
  checkIn:    { type: String, default: '--' },
  checkOut:   { type: String, default: '--' },
  hours:      { type: String, default: '--' },
  status:     { type: String, enum: ['Present', 'Late', 'Absent', 'On Leave'], default: 'Absent' },
}, { timestamps: true });

attendanceSchema.index({ userId: 1, date: 1, dept: 1 });
attendanceSchema.index({ userId: 1, employeeId: 1, date: 1 }, { unique: true });

export const Attendance = model('Attendance', attendanceSchema);
