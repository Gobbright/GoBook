import { Schema, model } from 'mongoose';

const employeeSchema = new Schema({
  userId:      { type: Schema.Types.ObjectId, ref: 'AppUser', required: true, index: true },
  employeeId:  { type: String, required: true, trim: true },
  name:        { type: String, required: true, trim: true },
  dept:        { type: String, default: '', trim: true },
  designation: { type: String, default: '', trim: true },
  email:       { type: String, default: '', trim: true },
  phone:       { type: String, default: '', trim: true },
  gender:      { type: String, enum: ['Male', 'Female', 'Other'], default: 'Male' },
  status:      { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  joinDate:    { type: String, default: '' },
  basicSalary: { type: Number, default: 0 },
}, { timestamps: true });

employeeSchema.index({ userId: 1, employeeId: 1 }, { unique: true });
employeeSchema.index({ userId: 1, status: 1, dept: 1 });
employeeSchema.index({ userId: 1, name: 1 });

export const Employee = model('Employee', employeeSchema);
