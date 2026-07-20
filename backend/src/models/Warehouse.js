import { Schema, model } from 'mongoose';

const warehouseSchema = new Schema({
  userId:   { type: Schema.Types.ObjectId, ref: 'AppUser', required: true, index: true },
  name:     { type: String, required: true, trim: true },
  location: { type: String, trim: true, default: '' },
  manager:  { type: String, trim: true, default: '' },
  capacity: { type: Number, default: 0, min: 0 },
  utilized: { type: Number, default: 0, min: 0 },
  status:   { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
}, { timestamps: true });

export const Warehouse = model('Warehouse', warehouseSchema);
