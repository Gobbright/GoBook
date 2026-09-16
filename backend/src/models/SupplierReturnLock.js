import { Schema, model } from 'mongoose';

const schema = new Schema({
  _id: String,
  expiresAt: { type: Date, required: true },
});
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const SupplierReturnLock = model('SupplierReturnLock', schema);
