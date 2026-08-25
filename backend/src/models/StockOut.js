import { Schema, model } from 'mongoose';

const stockOutSchema = new Schema({
  userId:      { type: Schema.Types.ObjectId, ref: 'AppUser', required: true, index: true },
  branch:      { type: String, trim: true, default: '', index: true },
  stockOutNo:  { type: String, required: true, trim: true },
  date:        { type: Date, required: true },
  productId:   { type: Schema.Types.ObjectId, ref: 'Product' },
  productName: { type: String, default: '', trim: true },
  variantName: { type: String, default: '', trim: true },
  to:          { type: String, required: true, trim: true },
  itemCount:   { type: Number, default: 0, min: 0 },
  totalQty:   { type: Number, default: 0, min: 0 },
  totalValue: { type: Number, default: 0, min: 0 },
  status:     { type: String, enum: ['Pending', 'Completed'], default: 'Pending' },
  sourceType: { type: String, default: '', trim: true },
  sourceId:   { type: Schema.Types.ObjectId },
  sourceNo:   { type: String, default: '', trim: true },
}, { timestamps: true });

stockOutSchema.index({ userId: 1, stockOutNo: 1 }, { unique: true });
stockOutSchema.index({ userId: 1, date: -1 });
stockOutSchema.index({ userId: 1, productId: 1 });
stockOutSchema.index({ userId: 1, sourceType: 1, sourceId: 1 });

export const StockOut = model('StockOut', stockOutSchema);
