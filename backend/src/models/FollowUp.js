import { Schema, model } from 'mongoose';

const followUpSchema = new Schema({
  userId:    { type: Schema.Types.ObjectId, ref: 'AppUser', required: true, index: true },
  person:    { type: String, required: true, trim: true },
  regarding: { type: String, trim: true, default: '' },
  date:      { type: String, default: '' },
  time:      { type: String, default: '' },
  status:    { type: String, default: 'Pending', enum: ['Pending', 'Done', 'Overdue'] },
  owner:     { type: String, trim: true, default: '' },
}, { timestamps: true });

export const FollowUp = model('FollowUp', followUpSchema);
