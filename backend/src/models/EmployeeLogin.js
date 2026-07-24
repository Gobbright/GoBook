import { Schema, model } from 'mongoose';

const employeeLoginSchema = new Schema({
  ownerUserId:      { type: Schema.Types.ObjectId, ref: 'AppUser', required: true, index: true },
  employeeObjectId: { type: Schema.Types.ObjectId, ref: 'Employee', index: true },
  employeeId:       { type: String, trim: true, default: '' },
  name:             { type: String, required: true, trim: true },
  email:            { type: String, required: true, trim: true, lowercase: true },
  category:         { type: String, trim: true, default: '' },
  loginSlug:        { type: String, trim: true, default: '' },
  passwordHash:     { type: String, required: true, select: false },
  loginPassword:    { type: String, default: '', trim: true },
  role:             { type: String, enum: ['admin', 'hr', 'employee'], default: 'employee' },
  loginEnabled:     { type: Boolean, default: true },
  status:           { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
}, { timestamps: true });

employeeLoginSchema.index({ ownerUserId: 1, email: 1 }, { unique: true });
employeeLoginSchema.index({ ownerUserId: 1, employeeId: 1 }, { unique: true });
employeeLoginSchema.index({ ownerUserId: 1, role: 1 });
employeeLoginSchema.index({ ownerUserId: 1, category: 1 });

export const EmployeeLogin = model('EmployeeLogin', employeeLoginSchema);
