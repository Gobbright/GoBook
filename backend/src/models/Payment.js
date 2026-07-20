import { Schema, model } from 'mongoose';

const paymentSchema = new Schema({
  userId:        { type: Schema.Types.ObjectId, ref: 'AppUser', required: true, index: true },
  invoiceId:     { type: Schema.Types.ObjectId, ref: 'Invoice', required: true, index: true },
  invoiceNumber: { type: String, default: '' },
  customerName:  { type: String, default: '' },
  amount:        { type: Number, required: true },
  date:          { type: String, default: '' },
  method:        { type: String, default: 'Cash', enum: ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Online'] },
  reference:     { type: String, default: '' },
  notes:         { type: String, default: '' },
}, { timestamps: true });

paymentSchema.index({ userId: 1, invoiceId: 1 });

export const Payment = model('Payment', paymentSchema);
