import { Schema, model } from 'mongoose';

const productSubcategorySchema = new Schema({
  userId:       { type: Schema.Types.ObjectId, ref: 'AppUser', required: true, index: true },
  categoryId:   { type: Schema.Types.ObjectId, ref: 'ProductCategory', default: null },
  categoryName: { type: String, trim: true, default: '' },
  name:         { type: String, required: true, trim: true },
  description:  { type: String, trim: true, default: '' },
  status:       { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
}, { timestamps: true });

productSubcategorySchema.index({ userId: 1, name: 1 }, { unique: true });
productSubcategorySchema.index({ userId: 1, categoryName: 1 });

export const ProductSubcategory = model('ProductSubcategory', productSubcategorySchema);
