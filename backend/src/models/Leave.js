import { Schema, model } from 'mongoose';

const leaveSchema = new Schema({
  userId:     { type: Schema.Types.ObjectId, ref: 'AppUser', required: true, index: true },
  leaveId:    { type: String, required: true, trim: true },
  name:       { type: String, required: true, trim: true },
  empId:      { type: String, required: true, trim: true },
  dept:       { type: String, default: '', trim: true },
  type:       { type: String, enum: ['Casual Leave', 'Sick Leave', 'Annual Leave', 'Unpaid Leave', 'Comp Off', 'Maternity Leave', 'Paternity Leave'], default: 'Casual Leave' },
  from:       { type: String, required: true },
  to:         { type: String, required: true },
  days:       { type: Number, default: 1 },
  status:     { type: String, enum: ['Approved', 'Pending', 'Rejected'], default: 'Pending' },
  applied:    { type: String, default: '' },
  reason:     { type: String, default: '' },
  recordedBy: { type: String, default: '', trim: true },
  attachment: {
    originalName: { type: String, default: '', trim: true },
    fileName:     { type: String, default: '', trim: true },
    url:          { type: String, default: '', trim: true },
    size:         { type: Number, default: 0 },
    mimeType:     { type: String, default: '', trim: true },
    uploadedAt:   { type: Date },
  },
}, { timestamps: true });

leaveSchema.index({ userId: 1, leaveId: 1 }, { unique: true });
leaveSchema.index({ userId: 1, status: 1 });
leaveSchema.index({ userId: 1, empId: 1 });
leaveSchema.index({ userId: 1, createdAt: -1 });

export const Leave = model('Leave', leaveSchema);
