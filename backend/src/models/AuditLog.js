import { Schema, model } from 'mongoose';

const auditLogSchema = new Schema({
  businessId:  { type: Schema.Types.ObjectId, ref: 'Business', index: true },
  action:      { type: String, enum: ['create', 'update', 'delete'], required: true },
  modelName:   { type: String, required: true, index: true },
  documentId:  { type: Schema.Types.ObjectId },
  documentLabel: { type: String, default: '' },
  performedBy: {
    userId: { type: Schema.Types.ObjectId },
    email:  { type: String, default: '' },
  },
  meta:        { type: Schema.Types.Mixed },
  performedAt: { type: Date, default: Date.now, index: true },
}, {
  // Read by the global audit plugin (auditPlugin.js) to skip auditing writes
  // to this collection itself — otherwise logging a write would recursively
  // trigger another log entry forever.
  excludeFromAudit: true,
});

auditLogSchema.index({ businessId: 1, performedAt: -1 });
auditLogSchema.index({ businessId: 1, modelName: 1, performedAt: -1 });

export const AuditLog = model('AuditLog', auditLogSchema);
