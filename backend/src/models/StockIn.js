import { Schema, model } from 'mongoose';

const stockInSchema = new Schema({
  userId:      { type: Schema.Types.ObjectId, ref: 'AppUser', required: true, index: true },
  branch:      { type: String, trim: true, default: '', index: true },
  stockInNo:   { type: String, required: true, trim: true },
  date:        { type: Date, required: true },
  productId:   { type: Schema.Types.ObjectId, ref: 'Product' },
  productName: { type: String, default: '', trim: true },
  variantName: { type: String, default: '', trim: true },
  supplier:    { type: String, required: true, trim: true },
  itemCount:   { type: Number, default: 0, min: 0 },
  totalQty:   { type: Number, default: 0, min: 0 },
  totalValue: { type: Number, default: 0, min: 0 },
  status:     { type: String, enum: ['Pending', 'Completed'], default: 'Pending' },
  sourceType: { type: String, default: '', trim: true },
  sourceId:   { type: Schema.Types.ObjectId },
  sourceNo:   { type: String, default: '', trim: true },
}, { timestamps: true });

stockInSchema.index({ userId: 1, stockInNo: 1 }, { unique: true });
stockInSchema.index({ userId: 1, date: -1 });
stockInSchema.index({ userId: 1, productId: 1 });
stockInSchema.index({ userId: 1, sourceType: 1, sourceId: 1 });

export const StockIn = model('StockIn', stockInSchema);
