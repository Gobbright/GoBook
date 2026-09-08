import { Schema, model } from 'mongoose';

const productCategorySchema = new Schema({
  userId:      { type: Schema.Types.ObjectId, ref: 'AppUser', required: true, index: true },
  name:        { type: String, required: true, trim: true },
  subCategories: { type: [String], default: [] },
  description: { type: String, trim: true, default: '' },
  status:      { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
}, { timestamps: true });

productCategorySchema.index({ userId: 1, name: 1 }, { unique: true });

export const ProductCategory = model('ProductCategory', productCategorySchema);
