import { Schema, model } from 'mongoose';

const attendanceLocationSchema = new Schema({
  latitude:  { type: Number, default: null },
  longitude: { type: Number, default: null },
  accuracy:  { type: Number, default: null },
  capturedAt: { type: Date },
  mapUrl:    { type: String, default: '', trim: true },
  address:   { type: String, default: '', trim: true },
  street:    { type: String, default: '', trim: true },
  area:      { type: String, default: '', trim: true },
  city:      { type: String, default: '', trim: true },
  district:  { type: String, default: '', trim: true },
  state:     { type: String, default: '', trim: true },
  postcode:  { type: String, default: '', trim: true },
  country:   { type: String, default: '', trim: true },
  provider:  { type: String, default: '', trim: true },
}, { _id: false });

const attendanceSchema = new Schema({
  userId:     { type: Schema.Types.ObjectId, ref: 'AppUser', required: true, index: true },
  employeeId: { type: String, required: true, trim: true },
  name:       { type: String, required: true, trim: true },
  dept:       { type: String, default: '', trim: true },
  date:       { type: String, required: true, trim: true },
  checkIn:    { type: String, default: '--' },
  checkOut:   { type: String, default: '--' },
  checkInLocation:  { type: attendanceLocationSchema, default: null },
  checkOutLocation: { type: attendanceLocationSchema, default: null },
  hours:      { type: String, default: '--' },
  shift:      { type: String, default: '', trim: true },
  remarks:    { type: String, default: '', trim: true },
  status:     { type: String, enum: ['Present', 'Late', 'Absent', 'On Leave', 'WFH', 'On Duty', 'Half Day', 'Weekly Off', 'Holiday'], default: 'Absent' },
}, { timestamps: true });

attendanceSchema.index({ userId: 1, date: 1, dept: 1 });
attendanceSchema.index({ userId: 1, date: 1, status: 1 });
attendanceSchema.index({ userId: 1, employeeId: 1, date: 1 }, { unique: true });

export const Attendance = model('Attendance', attendanceSchema);
