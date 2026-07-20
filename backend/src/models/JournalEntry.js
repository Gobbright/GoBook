import { Schema, model } from 'mongoose';

const journalEntrySchema = new Schema({
  userId:      { type: Schema.Types.ObjectId, ref: 'AppUser', required: true, index: true },
  date:        { type: String, required: true, trim: true },
  entryNo:     { type: String, required: true, trim: true },
  particulars: { type: String, required: true, trim: true },
  debit:       { type: Number, required: true, min: 0 },
  credit:      { type: Number, required: true, min: 0 },
  status:      { type: String, enum: ['Draft', 'Posted'], default: 'Posted' },
}, { timestamps: true });

journalEntrySchema.index({ userId: 1, entryNo: 1 }, { unique: true });
journalEntrySchema.index({ userId: 1, date: -1, status: 1 });

export const JournalEntry = model('JournalEntry', journalEntrySchema);
