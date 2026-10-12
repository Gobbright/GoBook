import { Schema, model } from 'mongoose';

const onlineOrderItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  code: { type: String, trim: true, default: '' },
  name: { type: String, trim: true, required: true },
  qty: { type: Number, required: true, min: 1 },
  rate: { type: Number, required: true, min: 0 },
  amount: { type: Number, required: true, min: 0 },
}, { _id: true });

const onlineOrderSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'AppUser', required: true, index: true },
  businessId: { type: Schema.Types.ObjectId, ref: 'Business', index: true },
  storeSettingsId: { type: Schema.Types.ObjectId, ref: 'OnlineStoreSettings', required: true, index: true },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer', index: true },
  invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice', index: true },
  invoiceNo: { type: String, trim: true, default: '' },
  orderNo: { type: String, trim: true, required: true, index: true },
  status: { type: String, enum: ['Pending', 'Confirmed', 'Cancelled', 'Converted'], default: 'Pending', index: true },
  customerName: { type: String, trim: true, required: true },
  customerPhone: { type: String, trim: true, required: true },
  customerEmail: { type: String, trim: true, lowercase: true, default: '' },
  deliveryAddress: { type: String, trim: true, default: '' },
  notes: { type: String, trim: true, default: '' },
  items: { type: [onlineOrderItemSchema], default: [] },
  subtotal: { type: Number, default: 0, min: 0 },
  grandTotal: { type: Number, default: 0, min: 0 },
  source: { type: String, default: 'online-store' },
  stockReducedAt: { type: Date, default: null },
  confirmedAt: { type: Date, default: null },
  cancelledAt: { type: Date, default: null },
  convertedAt: { type: Date, default: null },
}, { timestamps: true });

onlineOrderSchema.index({ userId: 1, orderNo: 1 }, { unique: true });
onlineOrderSchema.index({ userId: 1, invoiceId: 1 }, { sparse: true });
onlineOrderSchema.index({ userId: 1, createdAt: -1 });

export const OnlineOrder = model('OnlineOrder', onlineOrderSchema);
