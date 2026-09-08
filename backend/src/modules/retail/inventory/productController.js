import ExcelJS from 'exceljs';
import multer from 'multer';

import { Product } from '../../../models/Product.js';
import { ProductBrand } from '../../../models/ProductBrand.js';
import { ProductCategory } from '../../../models/ProductCategory.js';
import { StockIn } from '../../../models/StockIn.js';
import { StockOut } from '../../../models/StockOut.js';
import { httpError } from '../../../utils/httpError.js';
import { branchForNewRecord, branchScopedQuery } from '../../../utils/branchScope.js';

export const uploadProductsFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/\.xlsx$/i.test(file.originalname)) cb(null, true);
    else cb(httpError(400, 'Only .xlsx files are supported'));
  },
});

const FIELD_ALIASES = {
  'product name': 'description',
  'service name': 'description',
  description: 'description',
  name: 'description',
  'item name': 'description',
  item: 'description',
  'medicine name': 'description',
  medicine: 'description',
  'item type': 'itemType',
  type: 'itemType',
  'product type': 'itemType',
  'service type': 'serviceType',
  sku: 'code',
  code: 'code',
  'service code': 'code',
  'product code': 'code',
  'product id': 'code',
  'item code': 'code',
  'variant sku': 'variantSku',
  'variant code': 'variantSku',
  'style sku': 'variantSku',
  'variant barcode': 'variantBarcode',
  'variant bar code': 'variantBarcode',
  variant: 'variantName',
  'variant name': 'variantName',
  'variant value': 'variantName',
  values: 'variantName',
  value: 'variantName',
  'pack size': 'variantName',
  packsize: 'variantName',
  'variant size': 'variantName',
  category: 'category',
  'sub category': 'subCategory',
  'service sub category': 'subCategory',
  'service subcategory': 'subCategory',
  subcategory: 'subCategory',
  brand: 'brand',
  manufacturer: 'brand',
  'item group': 'itemGroup',
  group: 'itemGroup',
  size: 'size',
  fabric: 'fabric',
  material: 'material',
  colour: 'colour',
  color: 'colour',
  gender: 'gender',
  collection: 'collection',
  pattern: 'pattern',
  'fit type': 'type',
  fit: 'type',
  style: 'type',
  'model name': 'modelName',
  'model code': 'modelCode',
  'model number': 'modelNumber',
  model: 'modelNumber',
  warranty: 'warrantyPeriod',
  'warranty period': 'warrantyPeriod',
  'service warranty': 'serviceWarranty',
  'applicable for': 'applicableFor',
  applicable: 'applicableFor',
  deliverable: 'deliverable',
  delivery: 'deliverable',
  'service mode': 'serviceMode',
  mode: 'serviceMode',
  'service area': 'serviceArea',
  area: 'serviceArea',
  'additional charges': 'additionalCharges',
  'extra charges': 'additionalCharges',
  'preferred date': 'preferredDate',
  'preferred time': 'preferredTime',
  'special instructions': 'specialInstructions',
  instructions: 'specialInstructions',
  'staff professional': 'staffProfessional',
  'staff / professional': 'staffProfessional',
  staff: 'staffProfessional',
  professional: 'staffProfessional',
  'age group': 'ageGroup',
  'preparation notes': 'preparationNotes',
  preparation: 'preparationNotes',
  'requirements from customer': 'requirementsFromCustomer',
  'customer requirements': 'requirementsFromCustomer',
  requirements: 'requirementsFromCustomer',
  'repeatable service': 'repeatableService',
  'after service support': 'afterServiceSupport',
  'coverage details': 'coverageDetails',
  coverage: 'coverageDetails',
  'estimated time': 'estimatedTime',
  serial: 'serialNumber',
  'serial number': 'serialNumber',
  imei: 'serialNumber',
  unit: 'unit',
  uom: 'unit',
  rate: 'rate',
  price: 'rate',
  charge: 'rate',
  charges: 'rate',
  amount: 'rate',
  'sale price': 'rate',
  'sales price': 'rate',
  'sale rate': 'rate',
  'selling price': 'rate',
  'service charge': 'rate',
  'service charges': 'rate',
  'service rate': 'rate',
  'service price': 'rate',
  'service amount': 'rate',
  discount: 'maxDiscount',
  'purchase price': 'purchasePrice',
  'cost price': 'purchasePrice',
  mrp: 'mrp',
  gst: 'gstRate',
  'gst rate': 'gstRate',
  tax: 'gstRate',
  'tax rate': 'gstRate',
  stock: 'stock',
  quantity: 'stock',
  qty: 'stock',
  'opening stock': 'stock',
  'current stock': 'stock',
  'current qty': 'stock',
  'current quantity': 'stock',
  'min stock': 'minStockLevel',
  'min stock level': 'minStockLevel',
  'minimum stock': 'minStockLevel',
  'reorder level': 'minStockLevel',
  hsn: 'hsn',
  'hsn code': 'hsn',
  'hsn sac': 'hsn',
  sac: 'hsn',
  'sac code': 'hsn',
  'service description': 'productDescription',
  notes: 'productDescription',
  barcode: 'barcode',
  'bar code': 'barcode',
  'barcode no': 'barcode',
  'barcode number': 'barcode',
  status: 'status',
};

function normalizeHeader(value) {
  if (value == null) return null;
  const text = typeof value === 'object' ? (value.richText?.map((r) => r.text).join('') ?? value.text ?? '') : String(value);
  const key = text
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return FIELD_ALIASES[key] ?? null;
}

function cellValue(value) {
  if (value == null) return '';
  if (typeof value === 'object') {
    if ('result' in value) return value.result ?? '';
    if (Array.isArray(value.richText)) return value.richText.map((r) => r.text).join('');
    if ('text' in value) return value.text ?? '';
  }
  return value;
}

function parseSheetNumber(value) {
  if (typeof value === 'number') return value;
  const text = String(cellValue(value) ?? '')
    .replace(/₹/g, '')
    .replace(/,/g, '')
    .replace(/%/g, '')
    .trim();
  if (!text) return NaN;
  return Number(text);
}

function parseNumber(value, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) && next >= 0 ? next : fallback;
}

function cleanText(value) {
  return String(value ?? '').trim();
}

// Per-category item groups and the extra fields each one owns. Used both to
// validate `itemGroup` and to clear out fields left over from a previously
// selected group when a product is edited into a different one.
const GROUP_FIELDS = {
  General:      [],
  Textile:      ['size', 'fabric', 'material', 'colour', 'type', 'gender', 'collection', 'pattern'],
  Electronics:  ['modelNumber', 'warrantyPeriod', 'warrantyType', 'serialNumber', 'processor', 'ram', 'storage', 'display', 'operatingSystem'],
  Pharma:       ['batchNumber', 'expiryDate', 'manufacturer', 'prescriptionRequired'],
  Books:        ['author', 'publisher', 'classGrade', 'edition'],
  Uniform:      ['size'],
  Perishable:   ['expiryDate', 'storageType'],
  RawMaterial:  ['batchLotNo', 'gradeSpec', 'supplier'],
  FinishedGood: ['gradeSpec', 'warrantyPeriod'],
  Material:     ['gradeSpec', 'unitWeight'],
  Equipment:    ['modelNumber', 'serialNumber'],
  SparePart:    ['partNumber', 'compatibleModel', 'warrantyPeriod'],
  DonatedGoods: ['donorName', 'condition'],
};
const ALL_GROUP_NAMES = Object.keys(GROUP_FIELDS);
const ALL_GROUP_EXTRA_FIELDS = [...new Set(Object.values(GROUP_FIELDS).flat())];

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function findProductForImport(userId, { code, barcode, description, hsn }) {
  const or = [];
  if (code) or.push({ code });
  if (barcode) or.push({ barcode });
  if (description && hsn) {
    or.push({
      description: new RegExp(`^${escapeRegExp(description)}$`, 'i'),
      hsn,
    });
  }
  if (!or.length) return null;
  return Product.findOne({ userId, $or: or }).lean();
}

async function findDuplicateProductName(userId, description, branch = '', excludeId = null) {
  const name = String(description ?? '').trim();
  if (!name) return null;

  const query = {
    userId,
    description: new RegExp(`^${escapeRegExp(name)}$`, 'i'),
  };
  if (excludeId) query._id = { $ne: excludeId };

  const normalizedBranch = String(branch ?? '').trim();
  if (normalizedBranch) {
    query.branch = normalizedBranch;
  } else {
    query.$or = [{ branch: '' }, { branch: { $exists: false } }];
  }

  return Product.findOne(query, { code: 1, description: 1, branch: 1 }).lean();
}

function normalizeProductPayload(body = {}) {
  const payload = {};

  if ('description' in body) payload.description = String(body.description ?? '').trim();
  if ('shortName' in body) payload.shortName = cleanText(body.shortName);
  if ('aliasCode' in body) payload.aliasCode = cleanText(body.aliasCode);
  if ('productDescription' in body) payload.productDescription = String(body.productDescription ?? '');
  if ('itemType' in body) {
    const type = String(body.itemType ?? '').trim().toLowerCase();
    payload.itemType = type === 'service' ? 'Service' : 'Product';
  }
  if ('productType' in body) payload.productType = cleanText(body.productType) || 'Standard';
  if ('serviceType' in body) payload.serviceType = cleanText(body.serviceType);
  if ('estimatedTime' in body) payload.estimatedTime = cleanText(body.estimatedTime);
  if ('technician' in body) payload.technician = cleanText(body.technician);
  if ('applicableFor' in body) payload.applicableFor = cleanText(body.applicableFor);
  if ('deliverable' in body) payload.deliverable = cleanText(body.deliverable);
  if ('serviceMode' in body) payload.serviceMode = cleanText(body.serviceMode);
  if ('serviceArea' in body) payload.serviceArea = cleanText(body.serviceArea);
  if ('additionalCharges' in body) payload.additionalCharges = parseNumber(body.additionalCharges);
  if ('preferredDate' in body) {
    const parsed = body.preferredDate ? new Date(body.preferredDate) : null;
    payload.preferredDate = parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
  }
  if ('preferredTime' in body) payload.preferredTime = cleanText(body.preferredTime);
  if ('specialInstructions' in body) payload.specialInstructions = String(body.specialInstructions ?? '').trim();
  if ('staffProfessional' in body) payload.staffProfessional = cleanText(body.staffProfessional);
  if ('ageGroup' in body) payload.ageGroup = cleanText(body.ageGroup);
  if ('preparationNotes' in body) payload.preparationNotes = String(body.preparationNotes ?? '').trim();
  if ('requirementsFromCustomer' in body) payload.requirementsFromCustomer = String(body.requirementsFromCustomer ?? '').trim();
  if ('repeatableService' in body) payload.repeatableService = cleanText(body.repeatableService);
  if ('afterServiceSupport' in body) payload.afterServiceSupport = cleanText(body.afterServiceSupport);
  if ('coverageDetails' in body) payload.coverageDetails = String(body.coverageDetails ?? '').trim();
  if ('serviceWarranty' in body) {
    payload.serviceWarranty = typeof body.serviceWarranty === 'string'
      ? body.serviceWarranty.trim().toLowerCase() === 'yes'
      : Boolean(body.serviceWarranty);
  }
  if ('modelFamily' in body) payload.modelFamily = cleanText(body.modelFamily);
  if ('variantAttributes' in body) {
    payload.variantAttributes = (Array.isArray(body.variantAttributes) ? body.variantAttributes : [])
      .map(cleanText)
      .filter(Boolean);
  }
  if ('bundleDiscountType' in body) payload.bundleDiscountType = cleanText(body.bundleDiscountType) || 'Percentage';
  if ('preparationType' in body) payload.preparationType = cleanText(body.preparationType) || 'Trade As Is';
  if ('code' in body) payload.code = String(body.code ?? '').trim().toUpperCase();
  if ('hsn' in body) payload.hsn = String(body.hsn ?? '').trim();
  if ('category' in body) payload.category = String(body.category ?? '').trim();
  if ('subCategory' in body) payload.subCategory = cleanText(body.subCategory);
  if ('brand' in body) payload.brand = String(body.brand ?? '').trim();
  if ('imageUrl' in body) payload.imageUrl = cleanText(body.imageUrl);
  if ('itemGroup' in body) {
    const grp = String(body.itemGroup ?? '').trim();
    payload.itemGroup = ALL_GROUP_NAMES.includes(grp) ? grp : 'General';
  }
  if ('size' in body) payload.size = String(body.size ?? '').trim();
  if ('fabric' in body) payload.fabric = String(body.fabric ?? '').trim();
  if ('material' in body) payload.material = cleanText(body.material);
  if ('colour' in body) payload.colour = String(body.colour ?? '').trim();
  if ('type' in body) payload.type = String(body.type ?? '').trim();
  if ('gender' in body) payload.gender = cleanText(body.gender);
  if ('collection' in body) payload.collection = cleanText(body.collection);
  if ('pattern' in body) payload.pattern = cleanText(body.pattern);
  if ('modelNumber' in body) payload.modelNumber = String(body.modelNumber ?? '').trim();
  if ('warrantyPeriod' in body) payload.warrantyPeriod = String(body.warrantyPeriod ?? '').trim();
  if ('warrantyType' in body) payload.warrantyType = cleanText(body.warrantyType);
  if ('serialNumber' in body) payload.serialNumber = String(body.serialNumber ?? '').trim();
  if ('processor' in body) payload.processor = cleanText(body.processor);
  if ('ram' in body) payload.ram = cleanText(body.ram);
  if ('storage' in body) payload.storage = cleanText(body.storage);
  if ('display' in body) payload.display = cleanText(body.display);
  if ('operatingSystem' in body) payload.operatingSystem = cleanText(body.operatingSystem);
  if ('batchNumber' in body) payload.batchNumber = String(body.batchNumber ?? '').trim();
  if ('expiryDate' in body) {
    const parsed = body.expiryDate ? new Date(body.expiryDate) : null;
    payload.expiryDate = parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
  }
  if ('manufacturer' in body) payload.manufacturer = String(body.manufacturer ?? '').trim();
  if ('prescriptionRequired' in body) payload.prescriptionRequired = Boolean(body.prescriptionRequired);
  if ('author' in body) payload.author = String(body.author ?? '').trim();
  if ('publisher' in body) payload.publisher = String(body.publisher ?? '').trim();
  if ('classGrade' in body) payload.classGrade = String(body.classGrade ?? '').trim();
  if ('edition' in body) payload.edition = String(body.edition ?? '').trim();
  if ('storageType' in body) payload.storageType = String(body.storageType ?? '').trim();
  if ('batchLotNo' in body) payload.batchLotNo = String(body.batchLotNo ?? '').trim();
  if ('gradeSpec' in body) payload.gradeSpec = String(body.gradeSpec ?? '').trim();
  if ('supplier' in body) payload.supplier = String(body.supplier ?? '').trim();
  if ('unitWeight' in body) payload.unitWeight = String(body.unitWeight ?? '').trim();
  if ('partNumber' in body) payload.partNumber = String(body.partNumber ?? '').trim();
  if ('compatibleModel' in body) payload.compatibleModel = String(body.compatibleModel ?? '').trim();
  if ('donorName' in body) payload.donorName = String(body.donorName ?? '').trim();
  if ('condition' in body) payload.condition = String(body.condition ?? '').trim();
  if ('unit' in body) payload.unit = String(body.unit ?? '').trim() || 'Nos';
  if ('baseUnit' in body) payload.baseUnit = cleanText(body.baseUnit) || payload.unit || 'Nos';
  if ('salesUnit' in body) payload.salesUnit = cleanText(body.salesUnit) || payload.unit || 'Nos';
  if ('purchaseUnit' in body) payload.purchaseUnit = cleanText(body.purchaseUnit) || payload.unit || 'Nos';
  if ('conversionToUnit' in body) payload.conversionToUnit = cleanText(body.conversionToUnit) || payload.unit || 'Nos';
  if ('sellBy' in body) payload.sellBy = cleanText(body.sellBy) || 'Unit';
  if ('barcodeType' in body) payload.barcodeType = cleanText(body.barcodeType) || 'EAN-13';
  if ('upc' in body) payload.upc = cleanText(body.upc);
  if ('ean' in body) payload.ean = cleanText(body.ean);
  if ('manufacturerPartNumber' in body) payload.manufacturerPartNumber = cleanText(body.manufacturerPartNumber);
  if ('barcode' in body) payload.barcode = String(body.barcode ?? '').trim();
  if ('status' in body) payload.status = String(body.status ?? '').trim() || 'Active';

  if ('rate' in body) payload.rate = Number(body.rate);
  if ('purchasePrice' in body) payload.purchasePrice = parseNumber(body.purchasePrice);
  if ('landingCost' in body) payload.landingCost = parseNumber(body.landingCost);
  if ('mrp' in body) payload.mrp = parseNumber(body.mrp);
  if ('minSellingPrice' in body) payload.minSellingPrice = parseNumber(body.minSellingPrice);
  if ('openingStockValue' in body) payload.openingStockValue = parseNumber(body.openingStockValue);
  if ('reorderLevel' in body) payload.reorderLevel = parseNumber(body.reorderLevel);
  if ('maxStockLevel' in body) payload.maxStockLevel = parseNumber(body.maxStockLevel);
  if ('safetyStock' in body) payload.safetyStock = parseNumber(body.safetyStock);
  if ('conversionQty' in body) payload.conversionQty = parseNumber(body.conversionQty, 1);
  if ('shelfLifeMonths' in body) payload.shelfLifeMonths = parseNumber(body.shelfLifeMonths);
  if ('expiryAlertDays' in body) payload.expiryAlertDays = parseNumber(body.expiryAlertDays);
  if ('leadTimeDays' in body) payload.leadTimeDays = parseNumber(body.leadTimeDays);
  if ('minOrderQty' in body) payload.minOrderQty = parseNumber(body.minOrderQty);
  if ('maxOrderQty' in body) payload.maxOrderQty = parseNumber(body.maxOrderQty);
  if ('maxDiscount' in body) payload.maxDiscount = parseNumber(body.maxDiscount);
  if ('bundleDiscount' in body) payload.bundleDiscount = parseNumber(body.bundleDiscount);
  if ('stock' in body) payload.stock = Number(body.stock);
  if ('minStockLevel' in body) payload.minStockLevel = Number(body.minStockLevel);
  if ('gstRate' in body) payload.gstRate = Number(body.gstRate);
  if ('taxType' in body) payload.taxType = cleanText(body.taxType) || 'Tax Exclusive';
  for (const boolField of ['isWeighable', 'trackInventory', 'batchTracking', 'expiryTracking', 'expiryRequired', 'serialTracking', 'serialRequired', 'salesAllowed', 'allowRateEdit', 'allowDiscount', 'allowNegativeStock', 'salesReturnAllowed', 'transferOutAllowed', 'purchaseAllowed']) {
    if (boolField in body) payload[boolField] = Boolean(body[boolField]);
  }
  if ('warehouse' in body) payload.warehouse = cleanText(body.warehouse) || 'Main Warehouse';
  if ('preferredSupplier' in body) payload.preferredSupplier = cleanText(body.preferredSupplier);

  if ('packingRows' in body) {
    payload.packingRows = (Array.isArray(body.packingRows) ? body.packingRows : [])
      .map((row) => ({
        pack: cleanText(row?.pack),
        quantity: parseNumber(row?.quantity),
        barcode: cleanText(row?.barcode),
      }))
      .filter((row) => row.pack || row.barcode || row.quantity > 0);
  }

  if ('priceLists' in body) {
    payload.priceLists = (Array.isArray(body.priceLists) ? body.priceLists : [])
      .map((row) => ({
        name: cleanText(row?.name),
        price: parseNumber(row?.price),
      }))
      .filter((row) => row.name || row.price > 0);
  }

  if ('branchSettings' in body) {
    payload.branchSettings = (Array.isArray(body.branchSettings) ? body.branchSettings : [])
      .map((row) => ({
        branch: cleanText(row?.branch),
        active: row?.active !== false,
        mrp: parseNumber(row?.mrp),
        sellingPrice: parseNumber(row?.sellingPrice),
        stock: parseNumber(row?.stock),
        salesAllowed: row?.salesAllowed !== false,
        purchaseAllowed: row?.purchaseAllowed !== false,
      }))
      .filter((row) => row.branch || row.mrp > 0 || row.sellingPrice > 0 || row.stock > 0);
  }

  if ('supplierMappings' in body) {
    payload.supplierMappings = (Array.isArray(body.supplierMappings) ? body.supplierMappings : [])
      .map((row) => ({
        supplier: cleanText(row?.supplier),
        purchasePrice: parseNumber(row?.purchasePrice),
        leadTimeDays: parseNumber(row?.leadTimeDays),
      }))
      .filter((row) => row.supplier || row.purchasePrice > 0 || row.leadTimeDays > 0);
  }

  if ('bundleItems' in body) {
    payload.bundleItems = (Array.isArray(body.bundleItems) ? body.bundleItems : [])
      .map((row) => {
        const qty = parseNumber(row?.qty, 1);
        const unitPrice = parseNumber(row?.unitPrice);
        const productId = cleanText(row?.productId);
        return {
          ...(productId && /^[a-f\d]{24}$/i.test(productId) ? { productId } : {}),
          productName: cleanText(row?.productName),
          sku: cleanText(row?.sku),
          qty,
          unitPrice,
          total: parseNumber(row?.total) || qty * unitPrice,
        };
      })
      .filter((row) => row.productId || row.productName || row.sku);
  }

  if ('variants' in body) {
    const rawVariants = Array.isArray(body.variants) ? body.variants : [];
    payload.variants = rawVariants
      .map((v) => {
        const size = String(v?.size ?? '').trim();
        const modelName = String(v?.modelName ?? v?.model ?? '').trim();
        return {
          size,
          modelName,
          modelCode: cleanText(v?.modelCode),
          processor: cleanText(v?.processor),
          ram: cleanText(v?.ram),
          storage: cleanText(v?.storage),
          colour: cleanText(v?.colour),
          type: cleanText(v?.type),
          material: cleanText(v?.material),
          pattern: cleanText(v?.pattern),
          quality: cleanText(v?.quality),
          ageGroup: cleanText(v?.ageGroup),
          other: cleanText(v?.other),
          display: cleanText(v?.display),
          graphics: cleanText(v?.graphics),
          operatingSystem: cleanText(v?.operatingSystem),
          purchasePrice: Number(v?.purchasePrice) || 0,
          mrp: Number(v?.mrp) || 0,
          rate: Number(v?.rate) || 0,
          barcode: String(v?.barcode ?? '').trim(),
          stock: Number(v?.stock),
          minStockLevel: Number(v?.minStockLevel) || 0,
        };
      })
      .filter((v) => v.size || v.modelName || v.modelCode || v.colour || v.type || v.material || v.pattern || v.quality || v.ageGroup || v.other || v.barcode);

    if (payload.variants.length) {
      payload.stock = payload.variants.reduce((sum, v) => sum + (Number.isFinite(v.stock) ? v.stock : 0), 0);
      payload.minStockLevel = payload.variants.reduce((sum, v) => sum + v.minStockLevel, 0);
    }
  }

  if (payload.itemType === 'Service') {
    payload.stock = 0;
    payload.minStockLevel = 0;
    payload.variants = [];
  }

  if (payload.itemGroup) {
    const keepFields = new Set(GROUP_FIELDS[payload.itemGroup] || []);
    for (const field of ALL_GROUP_EXTRA_FIELDS) {
      if (keepFields.has(field)) continue;
      payload[field] = field === 'expiryDate' ? null : field === 'prescriptionRequired' ? false : '';
    }
  }

  return payload;
}

function validateProductPayload(payload, { partial = false } = {}) {
  if (!partial || 'description' in payload) {
    if (!payload.description) return 'Product name is required';
  }

  if (!partial || 'code' in payload) {
    if (!payload.code) return 'Product ID / code is required';
  }

  if (!partial || 'rate' in payload) {
    if (!Number.isFinite(payload.rate) || payload.rate < 0) return 'Valid sale price is required';
  }

  if ('stock' in payload && (!Number.isFinite(payload.stock) || payload.stock < 0)) {
    return 'Stock must be 0 or more';
  }

  if ('minStockLevel' in payload && (!Number.isFinite(payload.minStockLevel) || payload.minStockLevel < 0)) {
    return 'Minimum stock level must be 0 or more';
  }

  if ('variants' in payload && payload.variants.length) {
    const seen = new Set();
    for (const v of payload.variants) {
      const label = v.size || v.modelName;
      if (!label) return 'Each model row needs a model or size name';
      if (!Number.isFinite(v.stock) || v.stock < 0) return `Stock for "${label}" must be 0 or more`;
      if (!Number.isFinite(v.minStockLevel) || v.minStockLevel < 0) return `Min stock level for "${label}" must be 0 or more`;
      if (!Number.isFinite(v.rate) || v.rate < 0) return `Sale price for "${label}" must be 0 or more`;
      const key = `${String(v.size || '').trim().toLowerCase()}|${String(v.modelName || '').trim().toLowerCase()}`;
      if (seen.has(key)) return `Duplicate model "${label}"`;
      seen.add(key);
    }
  }

  if ('gstRate' in payload && ![0, 5, 12, 18, 28].includes(payload.gstRate)) {
    return 'GST rate must be one of 0, 5, 12, 18, 28';
  }

  if ('itemType' in payload && !['Product', 'Service'].includes(payload.itemType)) {
    return 'Item type must be Product or Service';
  }

  if ('status' in payload && !['Active', 'Inactive'].includes(payload.status)) {
    return 'Status must be Active or Inactive';
  }

  return '';
}

async function nextStockInNo(userId) {
  const last = await StockIn.findOne({ userId }, { stockInNo: 1 }, { sort: { createdAt: -1 } });
  let seq = 1;
  if (last) {
    const parts = last.stockInNo.split('-');
    const n = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(n)) seq = n + 1;
  }
  return `SIN-${new Date().getFullYear()}-${String(seq).padStart(3, '0')}`;
}

async function nextStockOutNo(userId) {
  const last = await StockOut.findOne({ userId }, { stockOutNo: 1 }, { sort: { createdAt: -1 } });
  let seq = 1;
  if (last) {
    const parts = last.stockOutNo.split('-');
    const n = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(n)) seq = n + 1;
  }
  return `SOUT-${new Date().getFullYear()}-${String(seq).padStart(3, '0')}`;
}

async function createProductStockMovement(userId, product, qtyDiff, reason = 'Stock Adjustment') {
  const qty = Math.abs(Number(qtyDiff) || 0);
  if (!product || qty <= 0) return;
  if (qtyDiff > 0) {
    await StockIn.create({
      userId,
      stockInNo: await nextStockInNo(userId),
      date: new Date(),
      productId: product._id,
      productName: product.description,
      supplier: reason,
      itemCount: 1,
      totalQty: qty,
      totalValue: qty * product.rate,
      status: 'Completed',
      sourceType: reason === 'Initial Stock' ? 'product-opening' : 'product-adjustment',
      sourceId: product._id,
      sourceNo: product.code,
    });
  } else {
    await StockOut.create({
      userId,
      stockOutNo: await nextStockOutNo(userId),
      date: new Date(),
      productId: product._id,
      productName: product.description,
      to: reason,
      itemCount: 1,
      totalQty: qty,
      totalValue: qty * product.rate,
      status: 'Completed',
      sourceType: 'product-adjustment',
      sourceId: product._id,
      sourceNo: product.code,
    });
  }
}

// Stock is only ever set as Opening Stock at product creation. After that,
// quantity must flow through a proper movement — Purchase Entry (inbound)
// or Stock In/Stock Out (manual corrections) — never a silent edit on the
// product record itself, so this strips any stock the client tried to slip
// into a product update and preserves the existing per-variant quantities.
function stripStockFromUpdatePayload(payload) {
  return payload;
}

async function generateNextProductCode(userId, itemType = 'Product') {
  const products = await Product.find({ userId }, { code: 1 }).lean();
  const existingCodes = new Set(products.map((p) => String(p.code ?? '').trim().toUpperCase()));
  if (itemType === 'Service') {
    let max = 0;
    products.forEach(({ code }) => {
      const match = String(code ?? '').trim().toUpperCase().match(/^SRV-(\d+)$/);
      if (!match) return;
      const n = Number(match[1]);
      if (Number.isFinite(n) && n > max) max = n;
    });
    let candidate = max + 1;
    let code = `SRV-${String(candidate).padStart(3, '0')}`;
    while (existingCodes.has(code)) {
      candidate++;
      code = `SRV-${String(candidate).padStart(3, '0')}`;
    }
    return code;
  }
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

// GET /api/inventory/products/stats
export async function getProductStats(req, res, next) {
  try {
    const userId = req.user.id;
    const [total, products, services, lowStock, outOfStock, valueResult] = await Promise.all([
      Product.countDocuments({ userId, status: 'Active' }),
      Product.countDocuments({ userId, status: 'Active', itemType: { $ne: 'Service' } }),
      Product.countDocuments({ userId, status: 'Active', itemType: 'Service' }),
      Product.countDocuments({ userId, status: 'Active', itemType: { $ne: 'Service' }, stock: { $gt: 0 }, $expr: { $lte: ['$stock', '$minStockLevel'] } }),
      Product.countDocuments({ userId, status: 'Active', itemType: { $ne: 'Service' }, stock: 0 }),
      Product.aggregate([
        { $match: { userId, status: 'Active', itemType: { $ne: 'Service' } } },
        { $group: { _id: null, totalValue: { $sum: { $multiply: ['$rate', '$stock'] } } } },
      ]),
    ]);
    res.json({
      total,
      products,
      services,
      lowStock,
      outOfStock,
      totalValue: valueResult[0]?.totalValue ?? 0,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/inventory/products/next-code
export async function getNextProductCode(req, res, next) {
  try {
    if (req.query.itemType === 'Service') {
      const code = await generateNextProductCode(req.user.id, 'Service');
      res.json({ code });
      return;
    }
    const products = await Product.find({ userId: req.user.id }, { code: 1 }).lean();
    let max = 1000;
    products.forEach(({ code }) => {
      const n = parseInt(code, 10);
      if (!isNaN(n) && n > max) max = n;
    });
    res.json({ code: String(max + 1) });
  } catch (err) {
    next(err);
  }
}

// GET /api/inventory/products?search=&category=&page=&limit=
export async function listProducts(req, res, next) {
  try {
    const { search, category, itemType, page = 1, limit = 50 } = req.query;
    const filter = await branchScopedQuery(req, { model: Product, ownerField: 'userId' });
    if (search) {
      filter.$or = [
        { description: new RegExp(search, 'i') },
        { code: new RegExp(search, 'i') },
        { barcode: new RegExp(search, 'i') },
        { hsn: new RegExp(search, 'i') },
        { brand: new RegExp(search, 'i') },
        { category: new RegExp(search, 'i') },
        { modelNumber: new RegExp(search, 'i') },
        { serialNumber: new RegExp(search, 'i') },
        { warrantyPeriod: new RegExp(search, 'i') },
        { 'variants.size': new RegExp(search, 'i') },
        { 'variants.modelName': new RegExp(search, 'i') },
        { 'variants.modelCode': new RegExp(search, 'i') },
        { 'variants.colour': new RegExp(search, 'i') },
        { 'variants.color': new RegExp(search, 'i') },
        { 'variants.type': new RegExp(search, 'i') },
        { 'variants.material': new RegExp(search, 'i') },
        { 'variants.pattern': new RegExp(search, 'i') },
        { 'variants.quality': new RegExp(search, 'i') },
        { 'variants.ageGroup': new RegExp(search, 'i') },
        { 'variants.other': new RegExp(search, 'i') },
        { 'variants.barcode': new RegExp(search, 'i') },
      ];
    }
    if (category && category !== 'All Categories') filter.category = category;
    if (itemType && itemType !== 'All Items') {
      filter.itemType = itemType === 'Service' ? 'Service' : { $ne: 'Service' };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [products, total] = await Promise.all([
      Product.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(Number(limit)).lean(),
      Product.countDocuments(filter),
    ]);
    res.json({ data: products, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
}

// GET /api/inventory/products/categories
export async function getCategories(req, res, next) {
  try {
    const userId = req.user.id;
    // Source from the Categories master list first, so a category added
    // there shows up immediately — not only after a product uses it — then
    // fold in any legacy free-text categories already on products that
    // never got added to the master list, so nothing disappears.
    const [defined, usedOnProducts] = await Promise.all([
      ProductCategory.find({ userId, status: 'Active' }, { name: 1 }).lean(),
      Product.distinct('category', { userId }),
    ]);
    const names = new Set(defined.map((c) => c.name));
    for (const name of usedOnProducts) {
      if (name) names.add(name);
    }
    res.json([...names].sort());
  } catch (err) {
    next(err);
  }
}

// GET /api/inventory/products/subcategories
export async function getSubCategories(req, res, next) {
  try {
    const userId = req.user.id;
    const [defined, usedOnProducts] = await Promise.all([
      ProductCategory.find({ userId, status: 'Active' }, { subCategories: 1 }).lean(),
      Product.distinct('subCategory', { userId }),
    ]);
    const names = new Set();
    for (const category of defined) {
      for (const name of category.subCategories || []) {
        if (name) names.add(name);
      }
    }
    for (const name of usedOnProducts) {
      if (name) names.add(name);
    }
    res.json([...names].filter(Boolean).sort());
  } catch (err) {
    next(err);
  }
}

// GET /api/inventory/products/brands
export async function getBrands(req, res, next) {
  try {
    const userId = req.user.id;
    const [defined, usedOnProducts] = await Promise.all([
      ProductBrand.find({ userId, status: 'Active' }, { name: 1 }).lean(),
      Product.distinct('brand', { userId }),
    ]);
    const names = new Set(defined.map((brand) => brand.name));
    for (const name of usedOnProducts) {
      if (name) names.add(name);
    }
    res.json([...names].filter(Boolean).sort());
  } catch (err) {
    next(err);
  }
}

// GET /api/inventory/products/sizes
export async function getSizes(req, res, next) {
  try {
    const sizes = await Product.distinct('size', { userId: req.user.id });
    res.json(sizes.filter(Boolean).sort());
  } catch (err) {
    next(err);
  }
}

// GET /api/inventory/products/fabrics
export async function getFabrics(req, res, next) {
  try {
    const fabrics = await Product.distinct('fabric', { userId: req.user.id });
    res.json(fabrics.filter(Boolean).sort());
  } catch (err) {
    next(err);
  }
}

// GET /api/inventory/products/colours
export async function getColours(req, res, next) {
  try {
    const colours = await Product.distinct('colour', { userId: req.user.id });
    res.json(colours.filter(Boolean).sort());
  } catch (err) {
    next(err);
  }
}

// GET /api/inventory/products/types
export async function getTypes(req, res, next) {
  try {
    const types = await Product.distinct('type', { userId: req.user.id });
    res.json(types.filter(Boolean).sort());
  } catch (err) {
    next(err);
  }
}

// GET /api/inventory/products/:id
export async function getProduct(req, res, next) {
  try {
    const product = await Product.findOne(await branchScopedQuery(req, { model: Product, ownerField: 'userId' }, { _id: req.params.id })).lean();
    if (!product) return next(httpError(404, 'Product not found'));
    res.json(product);
  } catch (err) {
    next(err);
  }
}

function importBaseKey(record = {}) {
  return [
    cleanText(record.description).toLowerCase(),
    cleanText(record.brand).toLowerCase(),
    cleanText(record.category).toLowerCase(),
    cleanText(record.subCategory).toLowerCase(),
    cleanText(record.hsn).toLowerCase(),
  ].join('|');
}

function hasVariantColumns(record = {}) {
  return Boolean(
    cleanText(record.variantName)
      || cleanText(record.size)
      || cleanText(record.colour)
      || cleanText(record.material)
      || cleanText(record.type)
      || cleanText(record.modelName)
      || cleanText(record.modelCode)
      || cleanText(record.variantSku)
      || cleanText(record.variantBarcode),
  );
}

function hasExplicitVariantColumns(record = {}) {
  return Boolean(
    cleanText(record.variantName)
      || cleanText(record.variantSku)
      || cleanText(record.variantBarcode),
  );
}

function normalizeImportedProductData(record = {}, { code, barcode, rate, forcedItemType = '' } = {}) {
  const data = {
    code: cleanText(code || record.code).toUpperCase(),
    description: cleanText(record.description),
    rate,
  };
  if (forcedItemType === 'Service') data.itemType = 'Service';
  if (record.itemType) {
    const t = cleanText(record.itemType).toLowerCase();
    data.itemType = t === 'service' ? 'Service' : 'Product';
  }
  if (record.category) data.category = cleanText(record.category);
  if (record.productDescription) data.productDescription = String(record.productDescription ?? '').trim();
  if (record.subCategory) data.subCategory = cleanText(record.subCategory);
  if (record.brand) data.brand = cleanText(record.brand);
  if (record.serviceType) data.serviceType = cleanText(record.serviceType);
  if (record.estimatedTime) data.estimatedTime = cleanText(record.estimatedTime);
  if (record.technician) data.technician = cleanText(record.technician);
  if (record.applicableFor) data.applicableFor = cleanText(record.applicableFor);
  if (record.deliverable) data.deliverable = cleanText(record.deliverable);
  if (record.serviceMode) data.serviceMode = cleanText(record.serviceMode);
  if (record.serviceArea) data.serviceArea = cleanText(record.serviceArea);
  if (record.additionalCharges !== '') {
    const additionalCharges = parseSheetNumber(record.additionalCharges);
    if (Number.isFinite(additionalCharges)) data.additionalCharges = Math.max(0, additionalCharges);
  }
  if (record.preferredDate) {
    const parsed = new Date(record.preferredDate);
    if (!Number.isNaN(parsed.getTime())) data.preferredDate = parsed;
  }
  if (record.preferredTime) data.preferredTime = cleanText(record.preferredTime);
  if (record.specialInstructions) data.specialInstructions = String(record.specialInstructions ?? '').trim();
  if (record.staffProfessional) data.staffProfessional = cleanText(record.staffProfessional);
  if (record.ageGroup) data.ageGroup = cleanText(record.ageGroup);
  if (record.preparationNotes) data.preparationNotes = String(record.preparationNotes ?? '').trim();
  if (record.requirementsFromCustomer) data.requirementsFromCustomer = String(record.requirementsFromCustomer ?? '').trim();
  if (record.repeatableService) data.repeatableService = cleanText(record.repeatableService);
  if (record.afterServiceSupport) data.afterServiceSupport = cleanText(record.afterServiceSupport);
  if (record.coverageDetails) data.coverageDetails = String(record.coverageDetails ?? '').trim();
  if (record.serviceWarranty) {
    data.serviceWarranty = cleanText(record.serviceWarranty).toLowerCase() === 'yes';
  }
  if (record.itemGroup) {
    const g = cleanText(record.itemGroup).toLowerCase();
    if (g === 'textile') data.itemGroup = 'Textile';
    else if (g === 'electronics') data.itemGroup = 'Electronics';
    else data.itemGroup = 'General';
  }
  if (record.size) data.size = cleanText(record.size);
  if (record.fabric) data.fabric = cleanText(record.fabric);
  if (record.material) data.material = cleanText(record.material);
  if (record.colour) data.colour = cleanText(record.colour);
  if (record.type) data.type = cleanText(record.type);
  if (record.gender) data.gender = cleanText(record.gender);
  if (record.collection) data.collection = cleanText(record.collection);
  if (record.pattern) data.pattern = cleanText(record.pattern);
  if (record.modelNumber) data.modelNumber = cleanText(record.modelNumber);
  if (record.warrantyPeriod) data.warrantyPeriod = cleanText(record.warrantyPeriod);
  if (record.serialNumber) data.serialNumber = cleanText(record.serialNumber);
  if (record.unit) data.unit = cleanText(record.unit);
  if (record.hsn) data.hsn = cleanText(record.hsn);
  if (barcode) data.barcode = cleanText(barcode);
  if (record.gstRate !== '') {
    const g = parseSheetNumber(record.gstRate);
    if ([0, 5, 12, 18, 28].includes(g)) data.gstRate = g;
  }
  if (record.purchasePrice !== '') {
    const purchasePrice = parseSheetNumber(record.purchasePrice);
    if (Number.isFinite(purchasePrice)) data.purchasePrice = Math.max(0, purchasePrice);
  }
  if (record.maxDiscount !== '') {
    const maxDiscount = parseSheetNumber(record.maxDiscount);
    if (Number.isFinite(maxDiscount)) data.maxDiscount = Math.max(0, maxDiscount);
  }
  if (record.mrp !== '') {
    const mrp = parseSheetNumber(record.mrp);
    if (Number.isFinite(mrp)) data.mrp = Math.max(0, mrp);
  }
  if (data.itemType !== 'Service' && record.stock !== '') {
    const s = parseSheetNumber(record.stock);
    if (Number.isFinite(s)) data.stock = Math.max(0, s);
  }
  if (data.itemType !== 'Service' && record.minStockLevel !== '') {
    const m = parseSheetNumber(record.minStockLevel);
    if (Number.isFinite(m)) data.minStockLevel = Math.max(0, m);
  }
  if (data.itemType === 'Service') {
    data.stock = 0;
    data.minStockLevel = 0;
    data.variants = [];
  }
  if (record.status) {
    const st = cleanText(record.status).toLowerCase();
    if (st === 'active') data.status = 'Active';
    else if (st === 'inactive') data.status = 'Inactive';
  }
  return data;
}

function importedVariantFromRecord(record = {}, idx = 0, { codeIsVariant = false, barcodeIsVariant = false } = {}) {
  const rate = parseSheetNumber(record.rate);
  const purchasePrice = parseSheetNumber(record.purchasePrice);
  const mrp = parseSheetNumber(record.mrp);
  const stock = parseSheetNumber(record.stock);
  const minStockLevel = parseSheetNumber(record.minStockLevel);
  const variantName = cleanText(record.variantName);
  const modelName = cleanText(variantName || record.modelName || record.modelNumber || record.size || record.type);
  return {
    size: cleanText(record.size || variantName),
    modelName,
    modelCode: cleanText(record.variantSku || record.modelCode || (codeIsVariant ? record.code : '')),
    colour: cleanText(record.colour),
    type: cleanText(record.type),
    material: cleanText(record.material),
    pattern: cleanText(record.pattern),
    quality: cleanText(record.quality),
    ageGroup: cleanText(record.ageGroup),
    other: cleanText(record.other),
    barcode: cleanText(record.variantBarcode || (barcodeIsVariant ? record.barcode : '')),
    purchasePrice: Number.isFinite(purchasePrice) ? Math.max(0, purchasePrice) : 0,
    mrp: Number.isFinite(mrp) ? Math.max(0, mrp) : 0,
    rate: Number.isFinite(rate) ? Math.max(0, rate) : 0,
    stock: Number.isFinite(stock) ? Math.max(0, stock) : 0,
    minStockLevel: Number.isFinite(minStockLevel) ? Math.max(0, minStockLevel) : 0,
    _importOrder: idx,
  };
}

async function saveImportedProduct({ userId, data, before }) {
  const savedProduct = await Product.findOneAndUpdate(
    { userId, code: before?.code || data.code },
    { $set: data },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );

  const isNew = !before;
  const stockQty = isNew ? (data.stock ?? 0) : (data.stock !== undefined ? data.stock - (before.stock ?? 0) : 0);

  if (savedProduct.itemType !== 'Service' && stockQty !== 0) {
    try {
      await createProductStockMovement(userId, savedProduct, stockQty, isNew ? 'Initial Stock' : 'Stock Adjustment');
    } catch {
      // ignore stock movement logging failure; product import already succeeded
    }
  }

  return isNew;
}

// POST /api/inventory/products/import
export async function importProducts(req, res, next) {
  try {
    if (!req.file) return next(httpError(400, 'No file uploaded'));
    const userId = req.user.id;
    const forcedItemType = String(req.query.itemType || '').trim() === 'Service' ? 'Service' : '';

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) return next(httpError(400, 'No worksheet found in file'));

    const headers = {};
    sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const field = normalizeHeader(cell.value);
      if (field) headers[colNumber] = field;
    });

    if (Object.keys(headers).length === 0) {
      return next(httpError(400, `No recognizable columns found. Expected columns like ${forcedItemType === 'Service' ? 'Service Name, Service Code, Service Charge, SAC Code' : 'Product Name, Code, Rate'}, etc.`));
    }

    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const errors = [];
    const rows = [];

    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
      const row = sheet.getRow(rowNumber);
      const record = {};
      for (const [colNumber, field] of Object.entries(headers)) {
        record[field] = cellValue(row.getCell(Number(colNumber)).value);
      }

      if (forcedItemType === 'Service' && !record.itemType) record.itemType = 'Service';
      const description = String(record.description ?? '').trim();
      const code = String(record.code ?? '').trim().toUpperCase();
      const barcode = String(record.barcode ?? '').trim();
      const hsn = String(record.hsn ?? '').trim();
      if (!description && !code && !barcode) continue;

      const rate = parseSheetNumber(record.rate);
      if (!description || record.rate === '' || record.rate == null || !Number.isFinite(rate) || rate < 0) {
        skipped++;
        errors.push(`Row ${rowNumber}: missing or invalid required field (${forcedItemType === 'Service' ? 'Service Name or Service Charge' : 'Product Name or Sale Price'})`);
        continue;
      }

      rows.push({ rowNumber, record: { ...record, code, barcode, hsn }, rate });
    }

    const duplicateVariantKeys = new Map();
    if (forcedItemType !== 'Service') {
      for (const row of rows) {
        if (!hasVariantColumns(row.record)) continue;
        const key = importBaseKey(row.record);
        duplicateVariantKeys.set(key, (duplicateVariantKeys.get(key) || 0) + 1);
      }
    }

    const processed = new Set();
    for (let idx = 0; idx < rows.length; idx++) {
      if (processed.has(idx)) continue;
      const { rowNumber, record, rate } = rows[idx];
      const groupKey = importBaseKey(record);
      const explicitVariantImport = hasExplicitVariantColumns(record);
      const isGroupedVariant = forcedItemType !== 'Service' && hasVariantColumns(record) && (duplicateVariantKeys.get(groupKey) > 1 || explicitVariantImport);

      if (isGroupedVariant) {
        const groupIndexes = rows
          .map((row, rowIdx) => ({ row, rowIdx }))
          .filter(({ row, rowIdx }) => !processed.has(rowIdx) && importBaseKey(row.record) === groupKey && hasVariantColumns(row.record));
        const groupRows = groupIndexes.map(({ row }) => row);
        const codes = [...new Set(groupRows.map(({ record: r }) => cleanText(r.code).toUpperCase()).filter(Boolean))];
        const barcodes = [...new Set(groupRows.map(({ record: r }) => cleanText(r.barcode)).filter(Boolean))];
        const codeIsVariant = codes.length > 1 || Boolean(cleanText(record.variantSku)) || explicitVariantImport;
        const barcodeIsVariant = barcodes.length > 1 || Boolean(cleanText(record.variantBarcode)) || explicitVariantImport;
        const before = await findProductForImport(userId, {
          code: codeIsVariant ? '' : cleanText(record.code).toUpperCase(),
          barcode: barcodeIsVariant ? '' : cleanText(record.barcode),
          description: cleanText(record.description),
          hsn: cleanText(record.hsn),
        });
        const parentCode = !codeIsVariant && cleanText(record.code)
          ? cleanText(record.code).toUpperCase()
          : before?.code || await generateNextProductCode(userId);
        const parentBarcode = !barcodeIsVariant ? cleanText(record.barcode) : '';
        const data = normalizeImportedProductData(record, { code: parentCode, barcode: parentBarcode, rate });
        data.itemType = 'Product';
        data.productType = data.itemGroup === 'Electronics' ? 'Serialized' : 'Matrix';
        data.variants = groupRows.map((row, variantIdx) => {
          const variant = importedVariantFromRecord(row.record, variantIdx, { codeIsVariant, barcodeIsVariant });
          delete variant._importOrder;
          return variant;
        });
        data.stock = data.variants.reduce((sum, variant) => sum + (Number(variant.stock) || 0), 0);
        data.minStockLevel = data.variants.reduce((sum, variant) => sum + (Number(variant.minStockLevel) || 0), 0);
        data.rate = data.variants.find((variant) => Number(variant.rate) > 0)?.rate || data.rate;
        data.purchasePrice = data.variants.find((variant) => Number(variant.purchasePrice) > 0)?.purchasePrice || data.purchasePrice || 0;
        data.mrp = data.variants.find((variant) => Number(variant.mrp) > 0)?.mrp || data.mrp || 0;

        try {
          const wasNew = await saveImportedProduct({ userId, data, before });
          if (wasNew) imported++;
          else updated++;
          groupIndexes.forEach(({ rowIdx }) => processed.add(rowIdx));
        } catch (err) {
          skipped += groupRows.length;
          errors.push(`Rows ${groupRows.map((row) => row.rowNumber).join(', ')}: ${err.message}`);
          groupIndexes.forEach(({ rowIdx }) => processed.add(rowIdx));
        }
        continue;
      }

      const before = await findProductForImport(userId, { code: record.code, barcode: record.barcode, description: record.description, hsn: record.hsn });
      const importItemType = forcedItemType || (cleanText(record.itemType).toLowerCase() === 'service' ? 'Service' : 'Product');
      const code = record.code || before?.code || await generateNextProductCode(userId, importItemType);
      const data = normalizeImportedProductData(record, { code, barcode: record.barcode, rate, forcedItemType });
      try {
        const wasNew = await saveImportedProduct({ userId, data, before });
        if (wasNew) imported++;
        else updated++;
        processed.add(idx);
      } catch (err) {
        skipped++;
        errors.push(`Row ${rowNumber}: ${err.message}`);
      }
    }

    if (imported === 0 && updated === 0 && skipped === 0 && sheet.rowCount > 1) {
      errors.push(`No usable rows found. Recognized columns: ${Object.values(headers).join(', ') || 'none'}. Make sure the sheet has a "Medicine Name" (or "Product Name") column with a "Price" column, and that data starts on row 2.`);
    }

    res.json({ imported, updated, skipped, errors });
  } catch (err) {
    next(err);
  }
}

// POST /api/inventory/products
export async function createProduct(req, res, next) {
  try {
    const userId = req.user.id;
    const payload = normalizeProductPayload(req.body);
    if (!payload.code) {
      payload.code = await generateNextProductCode(userId, payload.itemType);
    }
    const validationError = validateProductPayload(payload);
    if (validationError) return next(httpError(400, validationError));
    const branch = await branchForNewRecord(req, req.body.branch);
    const duplicate = await findDuplicateProductName(userId, payload.description, branch);
    if (duplicate) {
      return next(httpError(409, `Product "${payload.description}" already exists`));
    }

    let product;
    let attempts = 0;

    while (!product && attempts < 5) {
      attempts++;
      try {
        product = await Product.create({ ...payload, userId, branch });
      } catch (err) {
        if (err.code !== 11000) throw err;
        payload.code = await generateNextProductCode(userId, payload.itemType);
      }
    }

    if (!product) {
      return next(httpError(409, 'Unable to generate a unique product code. Please try again.'));
    }

    if (product.itemType !== 'Service' && product.stock > 0) {
      createProductStockMovement(userId, product, product.stock, 'Initial Stock').catch(() => {});
    }

    res.status(201).json(product);
  } catch (err) {
    if (err.code === 11000) return next(httpError(409, `Product code "${req.body.code}" already exists`));
    next(err);
  }
}

// PUT /api/inventory/products/:id
export async function updateProduct(req, res, next) {
  try {
    const userId = req.user.id;
    const old = await Product.findOne(await branchScopedQuery(req, { model: Product, ownerField: 'userId' }, { _id: req.params.id })).lean();
    if (!old) return next(httpError(404, 'Product not found'));

    const payload = normalizeProductPayload(req.body);
    const validationError = validateProductPayload(payload, { partial: true });
    if (validationError) return next(httpError(400, validationError));
    stripStockFromUpdatePayload(payload);
    const branch = Object.prototype.hasOwnProperty.call(req.body, 'branch')
      ? await branchForNewRecord(req, req.body.branch)
      : old.branch || await branchForNewRecord(req);
    const nextDescription = payload.description ?? old.description;
    const duplicate = await findDuplicateProductName(userId, nextDescription, branch, req.params.id);
    if (duplicate) {
      return next(httpError(409, `Product "${nextDescription}" already exists`));
    }

    const product = await Product.findOneAndUpdate(
      await branchScopedQuery(req, { model: Product, ownerField: 'userId' }, { _id: req.params.id }),
      { $set: { ...payload, branch } },
      { new: true, runValidators: true },
    ).lean();
    if (!product) return next(httpError(404, 'Product not found'));

    res.json(product);
  } catch (err) {
    if (err.code === 11000) return next(httpError(409, `Product code "${req.body.code}" already exists`));
    next(err);
  }
}

// DELETE /api/inventory/products/:id
export async function deleteProduct(req, res, next) {
  try {
    const product = await Product.findOneAndDelete(await branchScopedQuery(req, { model: Product, ownerField: 'userId' }, { _id: req.params.id })).lean();
    if (!product) return next(httpError(404, 'Product not found'));
    res.json({ message: 'Product deleted' });
  } catch (err) {
    next(err);
  }
}
