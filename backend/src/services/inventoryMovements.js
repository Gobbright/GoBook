import { Types } from 'mongoose';

import { BusinessSettings } from '../models/BusinessSettings.js';
import { Product } from '../models/Product.js';
import { ProductBrand } from '../models/ProductBrand.js';
import { StockIn } from '../models/StockIn.js';
import { StockOut } from '../models/StockOut.js';
import { httpError } from '../utils/httpError.js';

function clean(value) {
  return String(value ?? '').trim();
}

function plain(value = {}) {
  return typeof value?.toObject === 'function' ? value.toObject() : value;
}

function money(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function escapeRegex(str) {
  return clean(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function ensureProductBrands(userId, ...sources) {
  const names = new Set();
  for (const source of sources) {
    if (!source) continue;
    names.add(clean(source.brand));
    names.add(clean(source.other));
    names.add(clean(source.variantBrand));
    for (const variant of source.variants || []) {
      names.add(clean(variant.other));
      names.add(clean(variant.brand));
    }
  }
  await Promise.all([...names].filter(Boolean).map((name) => ProductBrand.updateOne(
    { userId, name },
    { $setOnInsert: { userId, name, status: 'Active' } },
    { upsert: true },
  )));
}

function variantName(variant = {}) {
  return clean(variant.size || variant.modelName);
}

function uniqueTextParts(parts = []) {
  const seen = new Set();
  return parts
    .map((part) => clean(part))
    .filter((part) => {
      if (!part) return false;
      const key = part.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function currentBarcodePeriod(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${month}${year}`;
}

function ean13CheckDigit(first12Digits) {
  const sum = String(first12Digits)
    .slice(0, 12)
    .split('')
    .reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
  return String((10 - (sum % 10)) % 10);
}

function hashToDigits(text, length = 4) {
  let hash = 5381;
  const str = String(text || '');
  for (let i = 0; i < str.length; i += 1) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  let digits = String(hash);
  while (digits.length < length) {
    hash = ((hash << 5) + hash + 1) >>> 0;
    digits += String(hash);
  }
  return digits.slice(0, length);
}

function productBarcodeIdentity(value = {}) {
  return [
    value.code,
    value.productCode,
    value.description,
    value.name,
    value.productName,
    value.category,
    value.subCategory,
    value.itemGroup,
    value.productType,
    value.hsn,
    value.unit,
  ]
    .map((part) => clean(part).toLowerCase())
    .filter(Boolean)
    .join('|');
}

function variantBarcodeIdentity(value = {}) {
  return [
    value.brand,
    value.other,
    value.variantBrand,
    value.size,
    value.modelName,
    value.modelCode,
    value.modelNumber,
    value.material,
    value.fabric,
    value.variantMaterial,
    value.colour,
    value.color,
    value.pattern,
    value.type,
    value.quality,
    value.ageGroup,
    value.gender,
    value.collection,
    value.processor,
    value.ram,
    value.storage,
    value.display,
    value.graphics,
    value.operatingSystem,
  ]
    .map((part) => clean(part).toLowerCase())
    .filter(Boolean)
    .join('|');
}

function generateBarcode(value = {}) {
  const productIdentity = productBarcodeIdentity(value) || clean(value.description || value.name || value.productName);
  const variantIdentity = variantBarcodeIdentity(value) || 'base';
  const first12Digits = `${hashToDigits(`${productIdentity}|prefix`, 4)}${currentBarcodePeriod()}${hashToDigits(`${productIdentity}|series`, 2)}${hashToDigits(`${variantIdentity}|variant`, 2)}`;
  return `${first12Digits}${ean13CheckDigit(first12Digits)}`;
}

function isFashionRetailSubcategory(value) {
  const normalized = clean(value).toLowerCase();
  return ['fashion-lifestyle', 'fashion & lifestyle', 'fashion & style'].includes(normalized);
}

async function shouldGeneratePurchaseBarcodes(invoice, userId) {
  if (invoice.documentType !== 'purchase-entry') return false;
  const snapshotSubcategory = invoice.businessSettingsSnapshot?.retailSubcategory
    || invoice.businessSettings?.retailSubcategory;
  if (snapshotSubcategory) return isFashionRetailSubcategory(snapshotSubcategory);
  const settings = await BusinessSettings.findOne({ userId }, { retailSubcategory: 1 }).lean();
  return isFashionRetailSubcategory(settings?.retailSubcategory);
}

function variantDisplayName(variant = {}) {
  const base = clean(variant.size || variant.modelName || variant.modelCode || variant.barcode);
  const attributes = uniqueTextParts([
    variant.colour || variant.color,
    variant.type,
    variant.material,
    variant.pattern,
    variant.ageGroup,
    variant.quality,
    variant.other,
    variant.ram,
    variant.storage,
    variant.processor,
    variant.display,
    variant.operatingSystem,
  ].filter((part) => clean(part).toLowerCase() !== base.toLowerCase()));
  return uniqueTextParts([base, ...attributes]).join(' - ');
}

function findProductVariant(product, value, attrs = {}) {
  const name = clean(value);
  const brand = clean(attrs.brand).toLowerCase();
  const material = clean(attrs.material).toLowerCase();
  if (brand || material) {
    const size = name.toLowerCase();
    const attrMatch = (product?.variants ?? []).find((variant) => (
      (!size || clean(variant.size || variant.modelName).toLowerCase() === size || clean(variantDisplayName(variant)).toLowerCase() === size)
      && (!brand || clean(variant.other).toLowerCase() === brand)
      && (!material || clean(variant.material).toLowerCase() === material)
    ));
    if (attrMatch) return attrMatch;
  }
  if (!name) return null;
  const normalizedName = name.toLowerCase();
  return (product?.variants ?? []).find((variant) => clean(variantDisplayName(variant)).toLowerCase() === normalizedName)
    || (product?.variants ?? []).find((variant) => clean(variantName(variant)).toLowerCase() === normalizedName)
    || null;
}

function itemHasVariantAttrs(item = {}) {
  return Boolean(clean(item.size || item.modelName || item.modelNumber || item.variant?.size || item.variant?.modelName)
    || clean(item.brand || item.other || item.variantBrand || item.variant?.other || item.variant?.brand)
    || clean(item.material || item.fabric || item.variantMaterial || item.variant?.material || item.variant?.fabric)
    || clean(item.barcode || item.variant?.barcode));
}

function buildVariantFromItem(item = {}, qty = 0, { generateMissingBarcode = true } = {}) {
  const rate = Number(item.rate) || 0;
  const size = clean(item.size || item.modelName || item.modelNumber || item.variant?.size || item.variant?.modelName);
  const brand = clean(item.brand || item.other || item.variantBrand || item.variant?.other || item.variant?.brand);
  const material = clean(item.material || item.fabric || item.variantMaterial || item.variant?.material || item.variant?.fabric);
  const barcode = clean(item.barcode || item.variant?.barcode)
    || (generateMissingBarcode ? generateBarcode({
      ...item,
      size,
      modelName: size || clean(item.description),
      other: brand,
      brand,
      material,
      fabric: material,
    }) : '');
  return {
    size,
    modelName: clean(item.description),
    other: brand,
    material,
    barcode,
    rate,
    purchasePrice: rate,
    stock: Math.max(0, Number(qty) || 0),
  };
}

async function addMissingProductVariantFromItem(product, item, qty = 0, { generateMissingBarcode = true } = {}) {
  if (!product || !itemHasVariantAttrs(item)) return { product, variant: null, created: false };
  const itemSize = clean(item.size || item.modelName || item.modelNumber || item.variant?.size || item.variant?.modelName);
  const itemBrand = clean(item.brand || item.other || item.variantBrand || item.variant?.other || item.variant?.brand);
  const itemMaterial = clean(item.material || item.fabric || item.variantMaterial || item.variant?.material || item.variant?.fabric);
  const existing = findProductVariant(product, itemSize, { brand: itemBrand, material: itemMaterial });
  if (existing) {
    await ensureProductBrands(product.userId, product, item, existing);
    if (generateMissingBarcode && !clean(existing.barcode) && itemHasVariantAttrs(item)) {
      const barcode = generateBarcode({
        ...plain(product),
        ...plain(existing),
        ...item,
        size: existing.size || itemSize,
        modelName: existing.modelName || itemSize || product.description,
        other: existing.other || itemBrand,
        brand: existing.other || itemBrand || product.brand,
        material: existing.material || itemMaterial,
      });
      await Product.updateOne(
        { _id: product._id, 'variants._id': existing._id },
        { $set: { 'variants.$.barcode': barcode } },
      );
      const refreshed = await Product.findById(product._id);
      const updatedVariant = findProductVariant(refreshed, itemSize, { brand: itemBrand, material: itemMaterial });
      return { product: refreshed || product, variant: updatedVariant || { ...existing, barcode }, created: false };
    }
    return { product, variant: existing, created: false };
  }

  const variant = buildVariantFromItem(item, qty, { generateMissingBarcode });
  await Product.updateOne(
    { _id: product._id },
    {
      $set: {
        itemGroup: product.itemGroup === 'General' ? 'Textile' : product.itemGroup,
        brand: product.brand || variant.other,
        size: product.size || variant.size,
        material: product.material || variant.material,
        fabric: product.fabric || variant.material,
        rate: Number(product.rate) > 0 ? product.rate : variant.rate,
        purchasePrice: Number(product.purchasePrice) > 0 ? product.purchasePrice : variant.purchasePrice,
      },
      $inc: { stock: Number(qty) || 0 },
      $push: { variants: variant },
    },
  );
  const refreshed = await Product.findById(product._id);
  await ensureProductBrands(product.userId, refreshed || product, item, variant);
  const createdVariant = findProductVariant(refreshed, itemSize, { brand: itemBrand, material: itemMaterial });
  return { product: refreshed || product, variant: createdVariant || variant, created: true };
}

async function nextStockNo(Model, userId, field, prefix) {
  const last = await Model.findOne({ userId }, { [field]: 1 }, { sort: { createdAt: -1 } }).lean();
  let seq = 1;
  if (last?.[field]) {
    const n = parseInt(String(last[field]).split('-').pop(), 10);
    if (Number.isFinite(n)) seq = n + 1;
  }
  return `${prefix}-${new Date().getFullYear()}-${String(seq).padStart(3, '0')}`;
}

async function generateNextProductCode(userId) {
  const products = await Product.find({ userId }, { code: 1 }).lean();
  const existingCodes = new Set(products.map((p) => String(p.code ?? '').trim().toUpperCase()));
  let max = 1000;
  products.forEach(({ code }) => {
    const n = parseInt(code, 10);
    if (!isNaN(n) && n > max) max = n;
  });
  let candidate = max + 1;
  while (existingCodes.has(String(candidate))) {
    candidate++;
  }
  return String(candidate);
}

// A direct Purchase Entry is often how a brand-new product first enters the
// catalog (no matching Purchase Order to have introduced it already), so
// unlike other inbound/outbound documents it creates the Product on the fly
// instead of silently skipping the line.
async function createProductFromItem(userId, item, qty = 0, { generateMissingBarcode = true } = {}) {
  const description = clean(item.description);
  if (!description) return null;
  if (item.itemType === 'Service') return null;
  const code = await generateNextProductCode(userId);
  const openingQty = Math.max(0, Number(qty) || 0);
  const rate = Number(item.rate) || 0;
  const size = clean(item.size);
  const brand = clean(item.brand);
  const material = clean(item.material);
  const barcode = clean(item.barcode);
  const variants = size || brand || material || barcode
    ? [buildVariantFromItem(item, openingQty, { generateMissingBarcode })]
    : [];
  const productBarcode = variants.length
    ? ''
    : barcode || (generateMissingBarcode ? generateBarcode({ ...item, description, brand, size, material, fabric: material }) : '');
  try {
    const product = await Product.create({
      userId,
      code,
      description,
      hsn: clean(item.hsn),
      unit: clean(item.unit) || 'Nos',
      rate,
      purchasePrice: rate,
      gstRate: [0, 5, 12, 18, 28].includes(Number(item.gstRate)) ? Number(item.gstRate) : 18,
      stock: openingQty,
      openingStockValue: money(openingQty * rate),
      itemGroup: variants.length ? 'Textile' : 'General',
      brand,
      size,
      material,
      fabric: material,
      barcode: productBarcode,
      variants,
      status: 'Active',
    });
    await ensureProductBrands(userId, product, item);
    return product;
  } catch (err) {
    if (err.code === 11000) return Product.findOne({ userId, description: new RegExp(`^${escapeRegex(description)}$`, 'i') });
    throw err;
  }
}

async function findProduct(userId, item) {
  const productId = item.productId && Types.ObjectId.isValid(String(item.productId))
    ? item.productId
    : null;
  if (productId) {
    const byId = await Product.findOne({ _id: productId, userId });
    if (byId) return byId;
  }

  const productCode = clean(item.productCode || item.code);
  if (productCode) {
    const byCode = await Product.findOne({ userId, code: productCode.toUpperCase() });
    if (byCode) return byCode;
  }

  const barcode = clean(item.barcode);
  if (barcode) {
    const byBarcode = await Product.findOne({ userId, barcode });
    if (byBarcode) return byBarcode;
    const byVariantBarcode = await Product.findOne({ userId, 'variants.barcode': barcode });
    if (byVariantBarcode) return byVariantBarcode;
  }

  const description = clean(item.description);
  if (!description) return null;
  return Product.findOne({ userId, description: new RegExp(`^${escapeRegex(description)}$`, 'i') });
}

async function collectMovableItems(invoice, userId, { generatePurchaseBarcodes = true } = {}) {
  const rows = [];
  for (const item of invoice.items ?? []) {
    const qty = Number(item.qty) || 0;
    if (qty <= 0) continue;
    if (item.itemType === 'Service') continue;
    let product = await findProduct(userId, item);
    let createdFromPurchaseEntry = false;
    if (!product && invoice.documentType === 'purchase-entry') {
      product = await createProductFromItem(userId, item, qty, { generateMissingBarcode: generatePurchaseBarcodes });
      createdFromPurchaseEntry = Boolean(product);
    }
    if (!product) {
      if (inventoryMode(invoice.documentType) === 'out') {
        throw httpError(400, `${clean(item.description) || 'Invoice item'} is not linked to an inventory product. Select the product from inventory before saving.`);
      }
      continue;
    }
    if (product.itemType === 'Service') continue;
    await ensureProductBrands(userId, product, item);
    const itemVariantName = clean(item.size || item.modelName || item.modelNumber || item.variant?.size || item.variant?.modelName);
    const itemVariantBrand = clean(item.brand || item.other || item.variantBrand || item.variant?.other || item.variant?.brand);
    const itemVariantMaterial = clean(item.material || item.fabric || item.variantMaterial || item.variant?.material || item.variant?.fabric);
    let matchedVariant = findProductVariant(product, itemVariantName, { brand: itemVariantBrand, material: itemVariantMaterial });
    let createdVariantFromPurchaseEntry = false;
    if (!matchedVariant && invoice.documentType === 'purchase-entry') {
      const result = await addMissingProductVariantFromItem(product, item, qty, { generateMissingBarcode: generatePurchaseBarcodes });
      product = result.product;
      matchedVariant = result.variant;
      createdVariantFromPurchaseEntry = result.created;
    }
    if (generatePurchaseBarcodes && invoice.documentType === 'purchase-entry' && !matchedVariant && !clean(product.barcode)) {
      const barcode = generateBarcode({
        ...plain(product),
        ...item,
        description: clean(item.description || product.description),
      });
      await Product.updateOne({ _id: product._id }, { $set: { barcode } });
      product = await Product.findById(product._id) || product;
    }
    rows.push({
      product,
      qty,
      rate: Number(item.rate ?? product.rate ?? 0) || 0,
      description: clean(item.description || product.description),
      variantName: matchedVariant ? variantDisplayName(matchedVariant) : itemVariantName,
      variantBrand: itemVariantBrand,
      variantMaterial: itemVariantMaterial,
      skipStockApply: createdFromPurchaseEntry || createdVariantFromPurchaseEntry,
    });
  }
  return rows;
}

async function collectRowsFromMovements(movements, userId) {
  const rows = [];
  for (const movement of movements ?? []) {
    const qty = Number(movement.totalQty) || 0;
    if (qty <= 0) continue;
    let product = null;
    if (movement.productId && Types.ObjectId.isValid(String(movement.productId))) {
      product = await Product.findOne({ _id: movement.productId, userId });
    }
    if (!product && movement.productName) {
      product = await Product.findOne({
        userId,
        description: new RegExp(`^${escapeRegex(movement.productName)}$`, 'i'),
      });
    }
    if (!product) continue;
    rows.push({
      product,
      qty,
      rate: Number(movement.totalValue || 0) / qty,
      description: clean(movement.productName || product.description),
      variantName: clean(movement.variantName),
    });
  }
  return rows;
}

function inventoryMode(documentType) {
  if (['invoice', 'bill-of-supply', 'supplier-return', 'pharmacy-bill'].includes(documentType)) return 'out';
  if (['purchase-entry', 'sales-return'].includes(documentType)) return 'in';
  return '';
}

async function applyRows(rows, direction, { allowNegative = false } = {}) {
  for (const row of rows) {
    if (row.skipStockApply) continue;
    const nextStock = Number(row.product.stock || 0) + direction * row.qty;
    if (!allowNegative && nextStock < 0) {
      throw httpError(409, `Insufficient stock for ${row.product.description}. Available ${row.product.stock || 0}, required ${row.qty}`);
    }
    const variant = findProductVariant(row.product, row.variantName, { brand: row.variantBrand, material: row.variantMaterial });
    if (variant) {
      const nextVariantStock = Number(variant.stock || 0) + direction * row.qty;
      if (!allowNegative && nextVariantStock < 0) {
        throw httpError(409, `Insufficient stock for ${row.product.description} (${row.variantName}). Available ${variant.stock || 0}, required ${row.qty}`);
      }
    }
  }

  for (const row of rows) {
    if (row.skipStockApply) continue;
    const variant = findProductVariant(row.product, row.variantName, { brand: row.variantBrand, material: row.variantMaterial });
    if (variant) {
      await Product.updateOne(
        { _id: row.product._id },
        { $inc: { stock: direction * row.qty, 'variants.$[variant].stock': direction * row.qty } },
        { arrayFilters: [{ 'variant._id': variant._id }] },
      );
    } else {
      await Product.updateOne(
        { _id: row.product._id },
        { $inc: { stock: direction * row.qty } },
      );
    }
  }
}

export async function reverseInventoryForDocument(invoice, userId) {
  const mode = inventoryMode(invoice.documentType);
  if (!mode || !invoice?._id) return null;

  const sourceFilter = { userId, sourceType: invoice.documentType, sourceId: invoice._id };
  const existingMovements = mode === 'out'
    ? await StockOut.find(sourceFilter).lean()
    : await StockIn.find(sourceFilter).lean();
  if (!existingMovements.length) return { reversed: 0 };

  const rows = await collectRowsFromMovements(existingMovements, userId);
  if (rows.length > 0) {
    await applyRows(rows, mode === 'out' ? 1 : -1, { allowNegative: true });
  }

  await Promise.all([
    StockOut.deleteMany(sourceFilter),
    StockIn.deleteMany(sourceFilter),
  ]);
  return { reversed: rows.length };
}

export async function postInventoryForDocument(invoice, userId) {
  const mode = inventoryMode(invoice.documentType);
  if (!mode || !invoice?._id) return null;

  await reverseInventoryForDocument(invoice, userId);

  const generatePurchaseBarcodes = await shouldGeneratePurchaseBarcodes(invoice, userId);
  const rows = await collectMovableItems(invoice, userId, { generatePurchaseBarcodes });
  if (rows.length === 0) return { posted: false, reason: 'No matching inventory products found' };

  await applyRows(rows, mode === 'out' ? -1 : 1);
  const date = invoice.meta?.date ? new Date(invoice.meta.date) : new Date();

  if (mode === 'out') {
    for (const row of rows) {
      const stockOutNo = await nextStockNo(StockOut, userId, 'stockOutNo', 'SOUT');
      await StockOut.create({
        userId,
        stockOutNo,
        date,
        productId: row.product._id,
        productName: row.product.description,
        variantName: row.variantName,
        to: invoice.customer?.name || 'Customer',
        itemCount: 1,
        totalQty: row.qty,
        totalValue: money(row.qty * row.rate),
        status: 'Completed',
        sourceType: invoice.documentType,
        sourceId: invoice._id,
        sourceNo: invoice.number,
      });
    }
  } else {
    for (const row of rows) {
      const stockInNo = await nextStockNo(StockIn, userId, 'stockInNo', 'SIN');
      await StockIn.create({
        userId,
        stockInNo,
        date,
        productId: row.product._id,
        productName: row.product.description,
        variantName: row.variantName,
        supplier: invoice.customer?.name || 'Vendor',
        itemCount: 1,
        totalQty: row.qty,
        totalValue: money(row.qty * row.rate),
        status: 'Completed',
        sourceType: invoice.documentType,
        sourceId: invoice._id,
        sourceNo: invoice.number,
      });
    }
  }

  return {
    posted: true,
    itemCount: rows.length,
    totalQty: rows.reduce((sum, row) => sum + row.qty, 0),
    totalValue: money(rows.reduce((sum, row) => sum + row.qty * row.rate, 0)),
  };
}
