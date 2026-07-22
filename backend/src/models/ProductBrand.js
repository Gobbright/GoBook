import { Schema, model } from 'mongoose';

const productBrandSchema = new Schema({
  userId:      { type: Schema.Types.ObjectId, ref: 'AppUser', required: true, index: true },
  name:        { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: '' },
  status:      { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
}, { timestamps: true });

productBrandSchema.index({ userId: 1, name: 1 }, { unique: true });

export const ProductBrand = model('ProductBrand', productBrandSchema);
