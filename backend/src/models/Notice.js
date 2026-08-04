import { Schema, model } from 'mongoose';

const noticeSchema = new Schema({
  ownerUserId: { type: Schema.Types.ObjectId, ref: 'AppUser', required: true, index: true },
  title:       { type: String, required: true, trim: true },
  message:     { type: String, required: true, trim: true },
  audience:    { type: String, enum: ['all', 'admin', 'hr', 'employee'], default: 'all' },
  status:      { type: String, enum: ['Published', 'Draft'], default: 'Published' },
  publishDate: { type: String, default: () => new Date().toISOString().slice(0, 10) },
}, { timestamps: true });

noticeSchema.index({ ownerUserId: 1, audience: 1, publishDate: -1 });
noticeSchema.index({ ownerUserId: 1, publishDate: -1, createdAt: -1 });

export const Notice = model('Notice', noticeSchema);