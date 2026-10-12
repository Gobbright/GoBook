import mongoose from 'mongoose';

import { env } from '../../config/env.js';
import { Customer } from '../../models/Customer.js';
import { Invoice } from '../../models/Invoice.js';
import { OnlineOrder } from '../../models/OnlineOrder.js';
import { OnlineStoreSettings } from '../../models/OnlineStoreSettings.js';
import { Product } from '../../models/Product.js';
import { StockOut } from '../../models/StockOut.js';
import { postInvoiceAccounting, reverseAccountingPosting } from '../../services/accountingPostings.js';
import { httpError } from '../../utils/httpError.js';
import { businessSettingsForInvoice } from '../retail/sales/shared/invoiceBusinessSettings.js';

const THEMES = ['classic', 'modern', 'minimal', 'retail', 'fashion', 'grocery', 'electronics'];

function slugify(value) {
  return String(value || 'store')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'store';
}

async function uniqueSlug(base, userId) {
  const clean = slugify(base);
  for (let index = 0; index < 50; index += 1) {
    const slug = index ? `${clean}-${index + 1}` : clean;
    const existing = await OnlineStoreSettings.findOne({ slug, userId: { $ne: userId } }).select('_id').lean();
    if (!existing) return slug;
  }
  return `${clean}-${Date.now().toString(36)}`;
}

function settingsView(settings) {
  return {
    id: settings._id,
    featureEnabled: env.onlineStoreEnabled,
    enabled: Boolean(settings.enabled),
    storeName: settings.storeName || '',
    slug: settings.slug || '',
    tagline: settings.tagline || '',
    phone: settings.phone || '',
    email: settings.email || '',
    address: settings.address || '',
    orderMode: settings.orderMode || 'inquiry',
    theme: settings.theme || {},
    publicUrl: settings.slug ? `/store/${settings.slug}` : '',
    createdAt: settings.createdAt,
    updatedAt: settings.updatedAt,
  };
}

async function ensureSettings(req) {
  const userId = req.user.id;
  let settings = await OnlineStoreSettings.findOne({ userId });
  if (settings) return settings;
  const fallbackName = req.user.businessName || req.user.email || 'GoBook Store';
  settings = await OnlineStoreSettings.create({
    userId,
    businessId: req.user.businessId || undefined,
    storeName: fallbackName,
    slug: await uniqueSlug(fallbackName, userId),
    enabled: false,
  });
  return settings;
}

function productView(product) {
  return {
    id: product._id,
    code: product.code,
    name: product.onlineStore?.title || product.description,
    description: product.onlineStore?.description || product.productDescription || '',
    category: product.category || '',
    brand: product.brand || '',
    rate: Number(product.rate || 0),
    mrp: Number(product.mrp || 0),
    stock: Number(product.stock || 0),
    imageUrl: product.onlineStore?.imageUrl || product.imageUrl || '',
    showOnline: Boolean(product.onlineStore?.showOnline),
    featured: Boolean(product.onlineStore?.featured),
    sortOrder: Number(product.onlineStore?.sortOrder || 0),
  };
}

async function nextStockOutNo(userId) {
  const last = await StockOut.findOne({ userId }, { stockOutNo: 1 }, { sort: { createdAt: -1 } }).lean();
  const lastNumber = Number(String(last?.stockOutNo || '').split('-').pop()) || 0;
  return `SOUT-${new Date().getFullYear()}-${String(lastNumber + 1).padStart(3, '0')}`;
}

async function reduceStockForOrder(order) {
  if (order.stockReducedAt) return;
  for (const item of order.items || []) {
    const product = await Product.findOne({ _id: item.productId, userId: order.userId });
    if (!product) throw httpError(404, `Product not found for ${item.name}`);
    const qty = Number(item.qty || 0);
    const nextStock = Number(product.stock || 0) - qty;
    if (nextStock < 0 && !product.allowNegativeStock) {
      throw httpError(409, `Insufficient stock for ${product.description}. Available ${product.stock || 0}, required ${qty}`);
    }
    await Product.updateOne({ _id: product._id }, { $inc: { stock: -qty } });
    await StockOut.create({
      userId: order.userId,
      stockOutNo: await nextStockOutNo(order.userId),
      date: new Date(),
      productId: product._id,
      productName: product.description,
      to: order.customerName,
      itemCount: 1,
      totalQty: qty,
      totalValue: Number(item.amount || 0),
      status: 'Completed',
      sourceType: 'online-order',
      sourceId: order._id,
      sourceNo: order.orderNo,
    });
  }
  order.stockReducedAt = new Date();
}

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '').slice(-10);
}

async function ensureCustomerForOrder(order) {
  if (order.customerId) return order.customerId;
  const name = String(order.customerName || '').trim();
  const phone = String(order.customerPhone || '').trim();
  const email = String(order.customerEmail || '').trim().toLowerCase();
  const phoneDigits = normalizePhone(phone);
  const or = [];
  if (phoneDigits) or.push({ phone: new RegExp(`${phoneDigits}$`) });
  if (email) or.push({ email });
  if (!or.length && name) or.push({ name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });

  let customer = or.length ? await Customer.findOne({ userId: order.userId, $or: or }) : null;
  if (customer) {
    const fill = {};
    if (!customer.phone && phone) fill.phone = phone;
    if (!customer.email && email) fill.email = email;
    if (!customer.address && order.deliveryAddress) fill.address = order.deliveryAddress;
    if (Object.keys(fill).length) await Customer.updateOne({ _id: customer._id }, { $set: fill });
  } else {
    customer = await Customer.create({
      userId: order.userId,
      name: name || phone || 'Online Customer',
      phone,
      email,
      address: String(order.deliveryAddress || '').trim(),
      status: 'Active',
    });
  }
  order.customerId = customer._id;
  return customer._id;
}

async function nextOnlineInvoiceNumber(userId) {
  const last = await Invoice.findOne(
    { userId, documentType: 'invoice', number: /^ONL-/i },
    { number: 1 },
    { sort: { createdAt: -1 } },
  ).lean();
  const lastNumber = Number(String(last?.number || '').split('-').pop()) || 0;
  return `ONL-${String(lastNumber + 1).padStart(4, '0')}`;
}

async function createInvoiceForOrder(req, order) {
  if (order.invoiceId) return order.invoiceId;
  const products = await Product.find({ _id: { $in: (order.items || []).map((item) => item.productId) }, userId: order.userId }).lean();
  const productMap = new Map(products.map((product) => [String(product._id), product]));
  const items = (order.items || []).map((item) => {
    const product = productMap.get(String(item.productId));
    return {
      productId: item.productId,
      productCode: item.code || product?.code || '',
      description: item.name || product?.description || '',
      itemDescription: 'Online store order',
      itemType: 'Product',
      productType: product?.productType || 'Standard',
      hsn: product?.hsn || '',
      unit: product?.unit || 'Nos',
      qty: Number(item.qty || 1),
      rate: Number(item.rate || 0),
      discount: 0,
      discountType: 'percent',
      gstRate: Number(product?.gstRate || 0),
    };
  });
  const subtotal = Number(order.subtotal || order.grandTotal || 0);
  const payloadBase = {
    number: await nextOnlineInvoiceNumber(order.userId),
    documentType: 'invoice',
    customer: {
      name: order.customerName || '',
      phone: order.customerPhone || '',
      email: order.customerEmail || '',
      address: order.deliveryAddress || '',
    },
    meta: {
      date: new Date().toISOString().slice(0, 10),
      dueDate: '',
      poRef: order.orderNo,
      paymentTerms: '0',
    },
    items,
    shipping: {
      sameAsBilling: false,
      address: order.deliveryAddress || '',
    },
    charges: [],
    additionalDiscount: { type: 'percent', value: '' },
    advanceReceived: 0,
    notes: `Created from online order ${order.orderNo}`,
    internalNotes: `Online order ID: ${order._id}`,
    extra: {
      source: 'online-store',
      onlineOrderId: String(order._id),
      onlineOrderNo: order.orderNo,
      customerId: order.customerId ? String(order.customerId) : '',
      stockHandledByOnlineOrder: true,
    },
    totals: {
      subTotal: subtotal,
      taxableAmount: subtotal,
      taxTotal: 0,
      grandTotal: Number(order.grandTotal || subtotal),
      finalTotal: Number(order.grandTotal || subtotal),
    },
  };
  const businessSettingsSnapshot = await businessSettingsForInvoice(req, { ...payloadBase, userId: order.userId });
  let lastError;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const payload = attempt ? { ...payloadBase, number: await nextOnlineInvoiceNumber(order.userId) } : payloadBase;
    try {
      const invoice = await Invoice.create({
        ...payload,
        userId: order.userId,
        businessId: order.businessId || req.user.businessId,
        branch: '',
        businessSettingsSnapshot,
      });
      try {
        await postInvoiceAccounting(invoice, req.user);
      } catch (error) {
        await reverseAccountingPosting({ userId: order.userId, sourceType: 'invoice', sourceId: invoice._id }).catch(() => {});
        await Invoice.deleteOne({ _id: invoice._id, userId: order.userId });
        throw error;
      }
      order.invoiceId = invoice._id;
      order.invoiceNo = invoice.number;
      return invoice._id;
    } catch (error) {
      lastError = error;
      if (error.code !== 11000) throw error;
    }
  }
  throw lastError || httpError(409, 'Unable to create invoice number for online order');
}

async function reverseStockForOrder(order) {
  if (!order.stockReducedAt) return;
  for (const item of order.items || []) {
    await Product.updateOne({ _id: item.productId, userId: order.userId }, { $inc: { stock: Number(item.qty || 0) } });
  }
  await StockOut.deleteMany({ userId: order.userId, sourceType: 'online-order', sourceId: order._id });
  order.stockReducedAt = null;
}

export async function getStoreSettings(req, res, next) {
  try {
    const settings = await ensureSettings(req);
    const [onlineProducts, pendingOrders] = await Promise.all([
      Product.countDocuments({ userId: req.user.id, status: 'Active', 'onlineStore.showOnline': true }),
      OnlineOrder.countDocuments({ userId: req.user.id, status: 'Pending' }),
    ]);
    res.json({ settings: settingsView(settings), stats: { onlineProducts, pendingOrders } });
  } catch (error) {
    next(error);
  }
}

export async function updateStoreSettings(req, res, next) {
  try {
    if (!env.onlineStoreEnabled) return next(httpError(403, 'Online Store Lite is disabled'));
    const settings = await ensureSettings(req);
    const payload = req.body || {};
    const update = {
      enabled: Boolean(payload.enabled),
      storeName: String(payload.storeName || settings.storeName || '').trim().slice(0, 120),
      tagline: String(payload.tagline || '').trim().slice(0, 180),
      phone: String(payload.phone || '').trim().slice(0, 30),
      email: String(payload.email || '').trim().toLowerCase().slice(0, 120),
      address: String(payload.address || '').trim().slice(0, 500),
      orderMode: payload.orderMode === 'cod' ? 'cod' : 'inquiry',
    };
    if (payload.slug !== undefined) update.slug = await uniqueSlug(payload.slug || update.storeName, req.user.id);
    if (payload.theme && typeof payload.theme === 'object') {
      update.theme = {
        name: THEMES.includes(payload.theme.name) ? payload.theme.name : settings.theme?.name || 'modern',
        primaryColor: String(payload.theme.primaryColor || settings.theme?.primaryColor || '#2563eb').slice(0, 20),
        logoUrl: String(payload.theme.logoUrl || '').trim().slice(0, 500),
        bannerImageUrl: String(payload.theme.bannerImageUrl || '').trim().slice(0, 500),
      };
    }
    const updated = await OnlineStoreSettings.findByIdAndUpdate(settings._id, { $set: update }, { new: true, runValidators: true });
    res.json({ settings: settingsView(updated) });
  } catch (error) {
    next(error);
  }
}

export async function listStoreProducts(req, res, next) {
  try {
    const products = await Product.find({ userId: req.user.id, status: 'Active', itemType: 'Product' })
      .sort({ 'onlineStore.showOnline': -1, description: 1 })
      .limit(500)
      .lean();
    res.json({ featureEnabled: env.onlineStoreEnabled, products: products.map(productView) });
  } catch (error) {
    next(error);
  }
}

export async function updateStoreProduct(req, res, next) {
  try {
    if (!env.onlineStoreEnabled) return next(httpError(403, 'Online Store Lite is disabled'));
    const product = await Product.findOne({ _id: req.params.id, userId: req.user.id });
    if (!product) return next(httpError(404, 'Product not found'));
    const payload = req.body || {};
    product.onlineStore = {
      ...product.onlineStore,
      showOnline: Boolean(payload.showOnline),
      featured: Boolean(payload.featured),
      title: String(payload.title || '').trim().slice(0, 160),
      description: String(payload.description || '').trim().slice(0, 1000),
      imageUrl: String(payload.imageUrl || '').trim().slice(0, 500),
      sortOrder: Number(payload.sortOrder || 0),
    };
    await product.save();
    res.json({ product: productView(product.toObject()) });
  } catch (error) {
    next(error);
  }
}

function orderView(order) {
  return {
    id: order._id,
    orderNo: order.orderNo,
    status: order.status,
    customerId: order.customerId || '',
    invoiceId: order.invoiceId || '',
    invoiceNo: order.invoiceNo || '',
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerEmail: order.customerEmail || '',
    deliveryAddress: order.deliveryAddress || '',
    items: order.items || [],
    subtotal: order.subtotal,
    grandTotal: order.grandTotal,
    stockReducedAt: order.stockReducedAt,
    confirmedAt: order.confirmedAt,
    convertedAt: order.convertedAt,
    createdAt: order.createdAt,
  };
}

export async function listOnlineOrders(req, res, next) {
  try {
    const orders = await OnlineOrder.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(500).lean();
    res.json({ featureEnabled: env.onlineStoreEnabled, orders: orders.map(orderView) });
  } catch (error) {
    next(error);
  }
}

export async function updateOnlineOrderStatus(req, res, next) {
  try {
    if (!env.onlineStoreEnabled) return next(httpError(403, 'Online Store Lite is disabled'));
    const status = String(req.body?.status || '');
    if (!['Pending', 'Confirmed', 'Cancelled', 'Converted'].includes(status)) return next(httpError(400, 'Invalid order status'));
    const order = await OnlineOrder.findOne({ _id: req.params.id, userId: req.user.id });
    if (!order) return next(httpError(404, 'Online order not found'));
    if (order.status === 'Cancelled' && status !== 'Cancelled') return next(httpError(409, 'Cancelled online orders cannot be changed'));
    if (order.invoiceId && status === 'Cancelled') return next(httpError(409, 'Converted online orders cannot be cancelled here. Manage the invoice from Sales.'));
    if (status === 'Confirmed') {
      await ensureCustomerForOrder(order);
      await reduceStockForOrder(order);
      order.confirmedAt = order.confirmedAt || new Date();
    } else if (status === 'Cancelled') {
      await reverseStockForOrder(order);
      order.cancelledAt = order.cancelledAt || new Date();
    } else if (status === 'Converted') {
      await ensureCustomerForOrder(order);
      await reduceStockForOrder(order);
      await createInvoiceForOrder(req, order);
      order.confirmedAt = order.confirmedAt || new Date();
      order.convertedAt = order.convertedAt || new Date();
    }
    order.status = status;
    await order.save();
    res.json({ order: orderView(order.toObject()) });
  } catch (error) {
    next(error);
  }
}

export async function getOnlineStoreReports(req, res, next) {
  try {
    const userId = req.user.id;
    const [summary, topProducts] = await Promise.all([
      OnlineOrder.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        { $group: { _id: '$status', count: { $sum: 1 }, revenue: { $sum: '$grandTotal' } } },
      ]),
      OnlineOrder.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId), status: { $in: ['Confirmed', 'Converted'] } } },
        { $unwind: '$items' },
        { $group: { _id: '$items.productId', name: { $first: '$items.name' }, qty: { $sum: '$items.qty' }, revenue: { $sum: '$items.amount' } } },
        { $sort: { qty: -1 } },
        { $limit: 8 },
      ]),
    ]);
    const totals = summary.reduce((acc, row) => {
      acc[row._id] = { count: row.count, revenue: row.revenue };
      acc.totalOrders += row.count;
      acc.totalRevenue += row.revenue;
      return acc;
    }, { totalOrders: 0, totalRevenue: 0 });
    res.json({ featureEnabled: env.onlineStoreEnabled, totals, topProducts });
  } catch (error) {
    next(error);
  }
}

export async function getPublicStore(req, res, next) {
  try {
    if (!env.onlineStoreEnabled) return next(httpError(404, 'Online store is not available'));
    const settings = await OnlineStoreSettings.findOne({ slug: String(req.params.slug || '').toLowerCase(), enabled: true }).lean();
    if (!settings) return next(httpError(404, 'Online store not found'));
    const products = await Product.find({ userId: settings.userId, status: 'Active', 'onlineStore.showOnline': true })
      .sort({ 'onlineStore.sortOrder': 1, description: 1 })
      .limit(200)
      .lean();
    res.json({ store: settingsView(settings), products: products.map(productView) });
  } catch (error) {
    next(error);
  }
}

export async function getPublicProduct(req, res, next) {
  try {
    if (!env.onlineStoreEnabled) return next(httpError(404, 'Online store is not available'));
    const settings = await OnlineStoreSettings.findOne({ slug: String(req.params.slug || '').toLowerCase(), enabled: true }).lean();
    if (!settings) return next(httpError(404, 'Online store not found'));
    const product = await Product.findOne({ _id: req.params.productId, userId: settings.userId, status: 'Active', 'onlineStore.showOnline': true }).lean();
    if (!product) return next(httpError(404, 'Product not found'));
    res.json({ store: settingsView(settings), product: productView(product) });
  } catch (error) {
    next(error);
  }
}

export async function createPublicOrder(req, res, next) {
  try {
    if (!env.onlineStoreEnabled) return next(httpError(404, 'Online store is not available'));
    const settings = await OnlineStoreSettings.findOne({ slug: String(req.params.slug || '').toLowerCase(), enabled: true });
    if (!settings) return next(httpError(404, 'Online store not found'));
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) return next(httpError(400, 'Add at least one item to place an order'));
    const customerName = String(req.body.customerName || '').trim();
    const customerPhone = String(req.body.customerPhone || '').trim();
    if (!customerName || !customerPhone) return next(httpError(400, 'Customer name and phone are required'));

    const productIds = items.map((item) => item.productId).filter((id) => mongoose.Types.ObjectId.isValid(id));
    const products = await Product.find({ _id: { $in: productIds }, userId: settings.userId, status: 'Active', 'onlineStore.showOnline': true }).lean();
    const productMap = new Map(products.map((product) => [String(product._id), product]));
    const orderItems = items.map((item) => {
      const product = productMap.get(String(item.productId));
      if (!product) return null;
      const qty = Math.max(1, Math.min(Number(item.qty) || 1, 999));
      const rate = Number(product.rate || 0);
      return { productId: product._id, code: product.code, name: product.description, qty, rate, amount: qty * rate };
    }).filter(Boolean);
    if (!orderItems.length) return next(httpError(400, 'Selected products are not available online'));
    const subtotal = orderItems.reduce((sum, item) => sum + item.amount, 0);
    const orderCount = await OnlineOrder.countDocuments({ userId: settings.userId });
    const order = await OnlineOrder.create({
      userId: settings.userId,
      businessId: settings.businessId,
      storeSettingsId: settings._id,
      orderNo: `OS-${String(orderCount + 1).padStart(5, '0')}`,
      customerName,
      customerPhone,
      customerEmail: String(req.body.customerEmail || '').trim().toLowerCase(),
      deliveryAddress: String(req.body.deliveryAddress || '').trim(),
      notes: String(req.body.notes || '').trim(),
      items: orderItems,
      subtotal,
      grandTotal: subtotal,
    });
    await ensureCustomerForOrder(order);
    await order.save();
    res.status(201).json({ order: orderView(order.toObject()) });
  } catch (error) {
    next(error);
  }
}
