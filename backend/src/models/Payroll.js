import { Schema, model } from 'mongoose';

const payrollSchema = new Schema({
  userId:      { type: Schema.Types.ObjectId, ref: 'AppUser', required: true, index: true },
  employeeId:  { type: String, required: true, trim: true },
  name:        { type: String, required: true, trim: true },
  dept:        { type: String, default: '', trim: true },
  month:       { type: String, required: true, trim: true },
  basic:       { type: Number, default: 0 },
  allowances:  { type: Number, default: 0 },
  deductions:  { type: Number, default: 0 },
  net:         { type: Number, default: 0 },
  status:      { type: String, enum: ['Paid', 'Pending'], default: 'Pending' },
}, { timestamps: true });

payrollSchema.index({ userId: 1, month: 1, dept: 1 });
payrollSchema.index({ userId: 1, employeeId: 1, month: 1 }, { unique: true });

export const Payroll = model('Payroll', payrollSchema);
