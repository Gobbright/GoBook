import { Schema, model } from 'mongoose';

const financeCollectionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'AppUser', required: true, index: true },
  customerId: { type: Schema.Types.ObjectId, ref: 'FinanceCustomer', required: true, index: true },
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  amount: { type: Number, required: true, min: 0.01 },
}, { timestamps: true });

financeCollectionSchema.index({ userId: 1, customerId: 1, date: 1 }, { unique: true });
financeCollectionSchema.index({ userId: 1, date: 1 });

export const FinanceCollection = model('FinanceCollection', financeCollectionSchema);
