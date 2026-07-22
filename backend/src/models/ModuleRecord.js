import { Schema, model } from 'mongoose';

const moduleRecordSchema = new Schema({
  userId:    { type: Schema.Types.ObjectId, ref: 'AppUser', required: true, index: true },
  moduleKey: { type: String, required: true, trim: true, index: true },
  data:      { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });

moduleRecordSchema.index({ userId: 1, moduleKey: 1, createdAt: -1 });

export const ModuleRecord = model('ModuleRecord', moduleRecordSchema);
