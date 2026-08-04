import { Schema, model } from 'mongoose';

const financeCustomerSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'AppUser', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  phone: { type: String, required: true, trim: true, maxlength: 20 },
  type: { type: String, enum: ['Loan', 'Chit', 'Deposit'], required: true },
  totalAmount: { type: Number, required: true, min: 0.01 },
  dailyCollectionAmount: { type: Number, required: true, min: 0.01 },
  startDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  status: { type: String, enum: ['Active', 'Finished'], default: 'Active', index: true },
  finishedAt: { type: Date, default: null },
}, { timestamps: true });

financeCustomerSchema.index({ userId: 1, phone: 1 }, { unique: true });
financeCustomerSchema.index({ userId: 1, status: 1, startDate: 1 });

export const FinanceCustomer = model('FinanceCustomer', financeCustomerSchema);
