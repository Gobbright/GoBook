import { Schema, model } from 'mongoose';

const ledgerAccountSchema = new Schema({
  userId:  { type: Schema.Types.ObjectId, ref: 'AppUser', required: true, index: true },
  name:    { type: String, required: true, trim: true },
  group:   { type: String, required: true, trim: true },
  opening: { type: Number, default: 0 },
  debit:   { type: Number, default: 0 },
  credit:  { type: Number, default: 0 },
  color:   { type: String, default: '#2563eb' },
}, { timestamps: true });

ledgerAccountSchema.index({ userId: 1, name: 1 }, { unique: true });
ledgerAccountSchema.index({ userId: 1, group: 1 });

export const LedgerAccount = model('LedgerAccount', ledgerAccountSchema);
