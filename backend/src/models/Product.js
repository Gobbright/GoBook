import { Schema, model } from 'mongoose';

const productVariantSchema = new Schema({
  size:          { type: String, trim: true, required: true },
  stock:         { type: Number, default: 0, min: 0 },
  minStockLevel: { type: Number, default: 0, min: 0 },
}, { _id: true });

const productSchema = new Schema({
  userId:        { type: Schema.Types.ObjectId, ref: 'AppUser', required: true, index: true },
  code:          { type: String, required: true, trim: true, uppercase: true },
  description:   { type: String, required: true, trim: true },
  productDescription: { type: String, default: '' },
  itemType:      { type: String, enum: ['Product', 'Service'], default: 'Product', index: true },
  hsn:           { type: String, trim: true, default: '' },
  unit:          { type: String, trim: true, default: 'Nos' },
  rate:          { type: Number, required: true, min: 0 },
  gstRate:       { type: Number, default: 18, enum: [0, 5, 12, 18, 28] },
  category:      { type: String, trim: true, default: '' },
  brand:         { type: String, trim: true, default: '' },
  itemGroup:     { type: String, enum: ['General', 'Textile', 'Electronics'], default: 'General' },
  size:          { type: String, trim: true, default: '' },
  fabric:        { type: String, trim: true, default: '' },
  colour:        { type: String, trim: true, default: '' },
  type:          { type: String, trim: true, default: '' },
  modelNumber:   { type: String, trim: true, default: '' },
  warrantyPeriod: { type: String, trim: true, default: '' },
  serialNumber:  { type: String, trim: true, default: '' },
  stock:         { type: Number, default: 0, min: 0 },
  minStockLevel: { type: Number, default: 0, min: 0 },
  variants:      { type: [productVariantSchema], default: [] },
  barcode:       { type: String, trim: true, default: '' },
  status:        { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
}, { timestamps: true });

productSchema.index({ userId: 1, code: 1 }, { unique: true });
productSchema.index({ userId: 1, barcode: 1 });
productSchema.index({ userId: 1, description: 1, hsn: 1 });

export const Product = model('Product', productSchema);
