import { Schema, model } from 'mongoose';

const employeeSchema = new Schema({
  userId:      { type: Schema.Types.ObjectId, ref: 'AppUser', required: true, index: true },
  category:    { type: String, default: '', trim: true },
  employeeId:  { type: String, required: true, trim: true },
  name:        { type: String, required: true, trim: true },
  dept:        { type: String, default: '', trim: true },
  designation: { type: String, default: '', trim: true },
  email:       { type: String, default: '', trim: true },
  phone:       { type: String, default: '', trim: true },
  gender:      { type: String, enum: ['Male', 'Female', 'Other', ''], default: '' },
  dateOfBirth: { type: String, default: '', trim: true },
  bloodGroup:  { type: String, default: '', trim: true },
  address:     { type: String, default: '', trim: true },
  branch:      { type: String, default: '', trim: true },
  reportingManager: { type: String, default: '', trim: true },
  employmentType: { type: String, default: 'Full Time', trim: true },
  shift:       { type: String, default: '', trim: true },
  workLocation: { type: String, default: '', trim: true },
  emergencyContact: {
    name: { type: String, default: '', trim: true },
    relationship: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
  },
  status:      { type: String, enum: ['Active', 'Inactive', 'Probation', 'On Leave', 'Resigned', 'Terminated'], default: 'Active' },
  loginAccess: { type: Boolean, default: false },
  loginPassword: { type: String, default: '', trim: true },
  employeeRole: { type: String, enum: ['admin', 'hr', 'employee'], default: 'employee' },
  joinDate:    { type: String, default: '' },
  basicSalary: { type: Number, default: 0 },
  photo: {
    originalName: { type: String, default: '', trim: true },
    fileName:     { type: String, default: '', trim: true },
    url:          { type: String, default: '', trim: true },
    size:         { type: Number, default: 0 },
    mimeType:     { type: String, default: '', trim: true },
    uploadedAt:   { type: Date },
  },
}, { timestamps: true });

employeeSchema.index({ userId: 1, employeeId: 1 }, { unique: true });
employeeSchema.index({ userId: 1, status: 1, dept: 1 });
employeeSchema.index({ userId: 1, name: 1 });
employeeSchema.index({ userId: 1, createdAt: -1 });

export const Employee = model('Employee', employeeSchema);
