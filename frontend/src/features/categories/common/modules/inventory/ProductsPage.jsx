import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Calendar, ChevronLeft, Clock, ClipboardList, IndianRupee, Info, Laptop, Package, Percent, Save, ScanLine, ShieldCheck, Tag, User, Wrench } from 'lucide-react';

import { api } from '../../../../../services/api.js';
import { formatCurrency } from '../../../../../utils/formatCurrency.js';
import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';
import { useCurrentUser } from '../../../../../hooks/useCurrentUser.js';
import { useFocusTrap } from '../../../../../hooks/useFocusTrap.js';
import { useListKeyboardNav } from '../../../../../hooks/useListKeyboardNav.js';

// Left/Right arrow key roving focus for a row of pill-toggle buttons, so
// Item Type / Item Group / Stock Tracking behave like a native radio group.
function handleToggleArrowKeys(e, onSelectIndex) {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  e.preventDefault();
  const buttons = Array.from(e.currentTarget.querySelectorAll('button'));
  const idx = buttons.indexOf(document.activeElement);
  if (idx === -1) return;
  const nextIdx = e.key === 'ArrowRight' ? (idx + 1) % buttons.length : (idx - 1 + buttons.length) % buttons.length;
  buttons[nextIdx].focus();
  onSelectIndex(nextIdx);
}

const TH = 'text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-5 py-3 border-b border-[#edf2f7]';
const TD = 'px-5 py-3.5 border-b border-[#f3f4f6] text-[13px]';
const INPUT = 'border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] w-full outline-none focus:border-blue-500 font-[inherit]';
const LABEL = 'block text-[12px] font-medium text-[#374151] mb-1';
const TOGGLE_WRAP = 'flex rounded-md border border-[#dbe4ef] overflow-hidden';
const toggleBtnClass = (active) => `flex-1 py-1.5 text-[12.5px] border-0 cursor-pointer font-[inherit] transition-colors ${active ? 'bg-blue-600 text-white font-semibold' : 'bg-white text-[#374151] hover:bg-gray-50'}`;

const Kbd = ({ children }) => (
  <kbd className="px-1.5 py-0.5 rounded border border-[#dbe4ef] bg-[#f8fafc] text-[11px] font-mono leading-none text-[#374151]">{children}</kbd>
);

function ShortcutsHint({ items, className = '' }) {
  return (
    <div className={`hidden md:flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-[#536173] ${className}`}>
      {items.map(([keys, label]) => (
        <span key={label} className="inline-flex items-center gap-1.5">
          <span className="inline-flex items-center gap-0.5">
            {keys.map((k) => <Kbd key={k}>{k}</Kbd>)}
          </span>
          {label}
        </span>
      ))}
    </div>
  );
}

const GST_RATES = [0, 5, 12, 18, 28];
const UNITS = ['Nos', 'Pcs', 'Piece', 'Kg', 'Gm', 'Box', 'Case', 'Carton', 'Bottle', 'Ltr', 'Mtr', 'Set'];
const ITEM_TYPES = ['Product', 'Service'];
const PRODUCT_MASTER_TABS = ['General', 'Units', 'Barcode', 'Pricing', 'Tax', 'Inventory', 'Advanced', 'Branch', 'Settings'];
const PRODUCT_TYPES = ['Standard', 'Serialized', 'Service', 'Matrix'];
const PREPARATION_TYPES = ['Trade As Is', 'Bulk', 'Repack', 'Assembly', 'Kit', 'Combo Pack', 'Ingredient', 'Packing Material', 'Parent', 'Child'];
const BARCODE_TYPES = ['EAN-13', 'EAN-8', 'UPC-A', 'UPC-E', 'Code 128', 'QR Code'];
const TAX_TYPES = ['Tax Exclusive', 'Tax Inclusive'];
const SELL_BY_OPTIONS = ['Unit', 'Weight'];
const PRICE_LIST_NAMES = ['Retail', 'Wholesale', 'Distributor', 'Online', 'Special Customer'];
const SIZE_PRESETS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
const MODEL_PRESETS = ['Standard', 'Basic', 'Premium', 'Pro', 'Max'];
const ELECTRONICS_RETAIL_SUBCATEGORY = 'electronics-technology';
const FASHION_RETAIL_SUBCATEGORY = 'fashion-lifestyle';
const FOOD_GROCERY_RETAIL_SUBCATEGORY = 'food-grocery';
const HOME_LIVING_RETAIL_SUBCATEGORY = 'home-living';
const SPECIALTY_PERSONAL_RETAIL_SUBCATEGORY = 'specialty-personal-needs';
const BUSINESS_SPECIALTY_RETAIL_SUBCATEGORY = 'business-specialty-retail';
const ELECTRONICS_CATEGORY_PRESETS = [
  'Mobiles',
  'Laptops & Computers',
  'Televisions',
  'Home Appliances',
  'Audio & Video',
  'IT Accessories',
  'Electronic Accessories',
  'Spare Parts',
];
const ELECTRONICS_MODEL_PRESETS = ['Crystal UHD 4K', 'QLED 4K Vision AI', 'OLED', 'Pro', 'Max'];
const ELECTRONICS_SUBCATEGORIES = ['Laptops', 'Mobiles', 'Televisions', 'Desktop PCs', 'Printers', 'Accessories', 'Home Appliances', 'Audio'];
const ELECTRONICS_PRODUCT_TYPES = ['Standard', 'Serialized', 'Bundle'];
const ELECTRONICS_PROCESSORS = ['Intel Core i3', 'Intel Core i5', 'Intel Core i7', 'Intel Core i9', 'AMD Ryzen 3', 'AMD Ryzen 5', 'AMD Ryzen 7', 'Apple M-series'];
const ELECTRONICS_RAM = ['4 GB', '6 GB', '8 GB', '16 GB', '32 GB', '64 GB'];
const ELECTRONICS_STORAGE = ['128 GB SSD', '256 GB SSD', '512 GB SSD', '1 TB SSD', '1 TB HDD', '2 TB HDD'];
const ELECTRONICS_DISPLAY = ['14" FHD', '15.6" FHD', '24" FHD', '32" HD', '43" 4K', '55" 4K', '65" 4K'];
const ELECTRONICS_OS = ['Windows 11', 'Windows 10', 'macOS', 'Android', 'iOS', 'Linux', 'No OS'];
const ELECTRONICS_WARRANTY_PERIODS = ['No Warranty', '6 Months', '12 Months', '24 Months', '36 Months'];
const ELECTRONICS_WARRANTY_TYPES = ['Carry-in', 'On-site', 'Replacement', 'Brand Warranty', 'Seller Warranty'];
const FASHION_CATEGORY_PRESETS = ['Fashion & Apparel', 'Footwear', 'Bags & Luggage', 'Jewellery & Accessories', 'Lifestyle Accessories'];
const FASHION_SUBCATEGORIES = ["Men's Shirts", "Women's Wear", 'T-Shirts', 'Jeans', 'Ethnic Wear', 'Footwear', 'Bags', 'Accessories'];
const FASHION_GENDERS = ['Men', 'Women', 'Unisex', 'Kids', 'Boys', 'Girls'];
const FASHION_COLLECTIONS = ['Summer 2026', 'Winter 2026', 'Spring 2026', 'Festive 2026', 'Regular'];
const FASHION_MATERIALS = ['Cotton', 'Denim', 'Linen', 'Polyester', 'Silk', 'Wool', 'Leather', 'Rayon'];
const FASHION_PATTERNS = ['Solid', 'Printed', 'Striped', 'Checked', 'Embroidered', 'Plain'];
const FOOD_GROCERY_PRODUCT_TYPES = ['Packaged Food', 'Edible Oil', 'Grocery Staples', 'Fresh Produce', 'Dairy & Eggs', 'Bakery', 'Beverages', 'Frozen Food', 'Personal Care', 'Household'];
const FOOD_GROCERY_SUBCATEGORIES = ['Grocery & Staples', 'Fruits & Vegetables', 'Meat & Seafood', 'Dairy & Eggs', 'Bakery & Confectionery', 'Beverages', 'Snacks', 'General Stores'];
const FOOD_GROCERY_PACK_TYPES = ['Bag', 'Box', 'Bottle', 'Can', 'Carton', 'Jar', 'Packet', 'Pouch', 'Tin', 'Tray'];
const FOOD_GROCERY_COUNTRIES = ['India', 'United States', 'United Kingdom', 'China', 'Sri Lanka', 'UAE', 'Singapore'];
const FOOD_GROCERY_VARIANT_ATTRIBUTES = ['Pack Size', 'Size', 'Flavor', 'Type'];
const FOOD_GROCERY_PACK_SIZES = ['250 ml', '500 ml', '1 Litre', '2 Litre', '5 Litre', '250 gm', '500 gm', '1 Kg', '5 Kg', '10 Kg'];
const HOME_LIVING_CATEGORIES = ['Home & Living'];
const HOME_LIVING_SUBCATEGORIES = ['Furniture', 'Home Decor', 'Kitchen & Dining', 'Bedding & Furnishing', 'Storage & Organization', 'Lighting'];
const HOME_LIVING_BRANDS = ['Godrej Interio', 'Nilkamal', 'Urban Ladder', 'Pepperfry', 'IKEA', 'Wakefit'];
const HOME_LIVING_DIMENSIONS = ['160 cm x 80 cm x 75 cm', '180 cm x 90 cm x 75 cm', '200 cm x 100 cm x 75 cm'];
const HOME_LIVING_COLORS = ['Brown', 'Black', 'White', 'Natural', 'Walnut', 'Grey'];
const HOME_LIVING_MATERIALS = ['Wood', 'Engineered Wood', 'Metal', 'Glass', 'Marble', 'Fabric'];
const HOME_LIVING_FINISHES = ['Matte', 'Glossy', 'Laminate', 'Polished', 'Textured'];
const HOME_LIVING_VARIANT_ATTRIBUTES = [
  { key: 'size', label: 'Size / Dimensions', options: HOME_LIVING_DIMENSIONS },
  { key: 'colour', label: 'Color', options: HOME_LIVING_COLORS },
  { key: 'material', label: 'Material', options: HOME_LIVING_MATERIALS },
  { key: 'pattern', label: 'Finish', options: HOME_LIVING_FINISHES },
];
const SPECIALTY_PERSONAL_CATEGORIES = ['Specialty & Personal Needs'];
const SPECIALTY_PERSONAL_SUBCATEGORIES = ['Beauty & Personal Care', 'Health & Wellness', 'Baby Care', 'Pet Supplies', 'Gifts & Lifestyle', 'Opticals'];
const SPECIALTY_PERSONAL_BRANDS = ['Himalaya', 'Dabur', 'Mamaearth', 'Patanjali', 'Lakme', 'Nivea'];
const SPECIALTY_PERSONAL_WARRANTIES = ['No Warranty', '7 Days', '15 Days', '1 Month', '3 Months', '6 Months', '1 Year'];
const SPECIALTY_PERSONAL_SUPPLIERS = ['Himalaya Wellness Company', 'Dabur India Ltd.', 'Mamaearth Pvt. Ltd.', 'Nivea India Pvt. Ltd.'];
const SPECIALTY_PERSONAL_COUNTRIES = ['India', 'China', 'United States', 'UAE', 'Thailand', 'Singapore'];
const SPECIALTY_PERSONAL_TYPES = ['Cream', 'Lotion', 'Oil', 'Powder', 'Spray', 'Gel'];
const SPECIALTY_PERSONAL_PATTERNS = ['Regular', 'Premium', 'Herbal', 'Organic', 'Sensitive'];
const SPECIALTY_PERSONAL_AGE_GROUPS = ['Infant', 'Kids', 'Teen', 'Adult', 'Senior'];
const SPECIALTY_PERSONAL_VARIANT_ATTRIBUTES = [
  { key: 'size', label: 'Size / Dimensions', options: ['Small', 'Medium', 'Large', '50 ml', '100 ml', '250 ml', '500 ml'] },
  { key: 'colour', label: 'Color', options: ['Black', 'White', 'Brown', 'Blue', 'Pink', 'Natural'] },
  { key: 'type', label: 'Type', options: SPECIALTY_PERSONAL_TYPES },
  { key: 'material', label: 'Material', options: ['Cotton', 'Plastic', 'Steel', 'Glass', 'Silicone', 'Herbal'] },
  { key: 'pattern', label: 'Pattern', options: SPECIALTY_PERSONAL_PATTERNS },
  { key: 'ageGroup', label: 'Age Group', options: SPECIALTY_PERSONAL_AGE_GROUPS },
];
const BUSINESS_SPECIALTY_CATEGORIES = ['Business & Specialty Retail'];
const BUSINESS_SPECIALTY_SUBCATEGORIES = ['Office Supplies', 'Stationery', 'Packaging', 'Industrial Supplies', 'Professional Tools', 'Specialty Goods'];
const BUSINESS_SPECIALTY_VARIANT_ATTRIBUTES = [
  { key: 'size', label: 'Size / Dimensions' },
  { key: 'colour', label: 'Color' },
  { key: 'type', label: 'Type' },
  { key: 'material', label: 'Material' },
  { key: 'pattern', label: 'Pattern' },
  { key: 'quality', label: 'Quality' },
  { key: 'ageGroup', label: 'Age Group' },
  { key: 'other', label: 'Other' },
];
const ELECTRONICS_VARIANT_ATTRIBUTES = [
  { key: 'processor', label: 'Processor', options: ELECTRONICS_PROCESSORS },
  { key: 'ram', label: 'RAM', options: ELECTRONICS_RAM },
  { key: 'storage', label: 'Storage', options: ELECTRONICS_STORAGE },
  { key: 'colour', label: 'Color', options: ['Black', 'Silver', 'Grey', 'White', 'Blue', 'Gold'] },
  { key: 'display', label: 'Display Size', options: ELECTRONICS_DISPLAY },
  { key: 'graphics', label: 'Graphics', options: ['Integrated', 'Intel Iris Xe', 'NVIDIA RTX 3050', 'NVIDIA RTX 4060', 'AMD Radeon'] },
  { key: 'operatingSystem', label: 'Operating System', options: ELECTRONICS_OS },
];
const DEFAULT_ELECTRONICS_VARIANT_ATTRIBUTES = ['processor', 'ram', 'storage', 'colour'];
const DEFAULT_BRANCH_SETTINGS = [
  { branch: 'Main Warehouse', active: true, mrp: '', sellingPrice: '', stock: '', salesAllowed: true, purchaseAllowed: true },
];

// Each business category gets its own set of item groups. Textile/Electronics
// (retail) keep their existing dedicated UI further down; every other group
// here is rendered generically from GROUP_FIELDS + FIELD_DEFS below.
const CATEGORY_ITEM_GROUPS = {
  retail: ['General', 'Textile', 'Electronics'],
  hospital: ['General', 'Pharma'],
  school: ['General', 'Books', 'Uniform'],
  hotel: ['General', 'Perishable'],
  manufacturing: ['General', 'RawMaterial', 'FinishedGood'],
  construction: ['General', 'Material', 'Equipment'],
  automobile: ['General', 'SparePart'],
  ngo: ['General', 'DonatedGoods'],
  finance: ['General'],
};

const GROUP_LABELS = {
  General: 'General',
  Textile: 'Textile',
  Electronics: 'Electronics',
  Pharma: 'Pharma',
  Books: 'Books',
  Uniform: 'Uniform',
  Perishable: 'F&B / Perishable',
  RawMaterial: 'Raw Material',
  FinishedGood: 'Finished Good',
  Material: 'Material',
  Equipment: 'Equipment',
  SparePart: 'Spare Part',
  DonatedGoods: 'Donated Goods',
};

// Fields owned by each non-retail group, rendered generically. Textile/
// Electronics are excluded here since they keep their existing hardcoded UI.
const GROUP_FIELDS = {
  Pharma: ['batchNumber', 'expiryDate', 'manufacturer', 'prescriptionRequired'],
  Books: ['author', 'publisher', 'classGrade', 'edition'],
  Uniform: ['size'],
  Perishable: ['expiryDate', 'storageType'],
  RawMaterial: ['batchLotNo', 'gradeSpec', 'supplier'],
  FinishedGood: ['gradeSpec', 'warrantyPeriod'],
  Material: ['gradeSpec', 'unitWeight'],
  Equipment: ['modelNumber', 'serialNumber'],
  SparePart: ['partNumber', 'compatibleModel', 'warrantyPeriod'],
  DonatedGoods: ['donorName', 'condition'],
};
const ALL_GROUP_EXTRA_FIELDS = [...new Set(['size', 'fabric', 'material', 'colour', 'type', 'gender', 'collection', 'pattern', 'modelNumber', 'warrantyPeriod', 'warrantyType', 'serialNumber', 'processor', 'ram', 'storage', 'display', 'operatingSystem', ...Object.values(GROUP_FIELDS).flat()])];

const FIELD_DEFS = {
  size: { label: 'Size' },
  modelNumber: { label: 'Model Number' },
  warrantyPeriod: { label: 'Warranty Period' },
  warrantyType: { label: 'Warranty Type' },
  serialNumber: { label: 'Serial Number' },
  batchNumber: { label: 'Batch Number' },
  expiryDate: { label: 'Expiry Date', type: 'date' },
  manufacturer: { label: 'Manufacturer' },
  prescriptionRequired: { label: 'Prescription Required', type: 'toggle' },
  author: { label: 'Author' },
  publisher: { label: 'Publisher' },
  classGrade: { label: 'Class / Grade' },
  edition: { label: 'Edition' },
  storageType: { label: 'Storage Type', type: 'select', options: ['Chilled', 'Frozen', 'Dry'] },
  batchLotNo: { label: 'Batch / Lot No.' },
  gradeSpec: { label: 'Grade / Specification' },
  supplier: { label: 'Supplier' },
  unitWeight: { label: 'Unit Weight' },
  partNumber: { label: 'Part Number' },
  compatibleModel: { label: 'Compatible Vehicle / Model' },
  donorName: { label: 'Donor Name' },
  condition: { label: 'Condition', type: 'select', options: ['New', 'Used', 'Refurbished'] },
};

const EMPTY_FORM = {
  description: '', productDescription: '', itemType: 'Product', code: '', hsn: '', category: '', brand: '', itemGroup: 'General',
  shortName: '', aliasCode: '', subCategory: '', productType: 'Standard', serviceType: '', estimatedTime: '', technician: '', serviceWarranty: false, preparationType: 'Trade As Is', imageUrl: '',
  applicableFor: '', deliverable: '',
  serviceMode: 'On-site', serviceArea: '', additionalCharges: '', preferredDate: '', preferredTime: '', specialInstructions: '',
  staffProfessional: '', ageGroup: '', preparationNotes: '', requirementsFromCustomer: '', repeatableService: '', afterServiceSupport: '', coverageDetails: '',
  size: '', fabric: '', material: '', colour: '', type: '', gender: '', collection: '', pattern: '', modelFamily: '', modelNumber: '', warrantyPeriod: '', warrantyType: '', serialNumber: '',
  processor: '', ram: '', storage: '', display: '', graphics: '', operatingSystem: '',
  batchNumber: '', expiryDate: '', manufacturer: '', prescriptionRequired: false,
  author: '', publisher: '', classGrade: '', edition: '',
  storageType: '', batchLotNo: '', gradeSpec: '', supplier: '', unitWeight: '',
  partNumber: '', compatibleModel: '', donorName: '', condition: '',
  unit: 'Nos', baseUnit: 'Nos', salesUnit: 'Nos', purchaseUnit: 'Nos', conversionQty: 1, conversionToUnit: 'Nos',
  isWeighable: false, sellBy: 'Unit', packingRows: [],
  barcodeType: 'EAN-13', barcode: '', upc: '', ean: '', manufacturerPartNumber: '',
  purchasePrice: '', landingCost: '', mrp: '', rate: '', minSellingPrice: '', priceLists: [],
  gstRate: 18, taxType: 'Tax Exclusive',
  trackInventory: true, stock: 0, openingStockValue: '', reorderLevel: 0, minStockLevel: 0, maxStockLevel: '', safetyStock: '', warehouse: 'Main Warehouse',
  batchTracking: false, expiryTracking: false, expiryRequired: false, shelfLifeMonths: '', expiryAlertDays: '',
  serialTracking: false, serialRequired: false,
  branchSettings: DEFAULT_BRANCH_SETTINGS,
  salesAllowed: true, allowRateEdit: true, allowDiscount: true, maxDiscount: '', allowNegativeStock: false, salesReturnAllowed: true, transferOutAllowed: true,
  purchaseAllowed: true, preferredSupplier: '', leadTimeDays: '', minOrderQty: '', maxOrderQty: '', supplierMappings: [],
  variants: [], variantAttributes: [], bundleItems: [], bundleDiscountType: 'Percentage', bundleDiscount: '', status: 'Active',
};

function genBarcode() {
  return Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join('');
}

function blankBundleItem() {
  return { productId: '', productName: '', sku: '', qty: 1, unitPrice: 0 };
}

function optionName(value) {
  return String(value?.name ?? value?.label ?? value ?? '').trim();
}

function optionNames(values = []) {
  return [...new Set((Array.isArray(values) ? values : []).map(optionName).filter(Boolean))].sort();
}

function formatINR(v) { return '₹ ' + Number(v).toLocaleString('en-IN'); }

function variantDisplayName(variant = {}) {
  return String(variant.size || variant.modelName || variant.modelCode || variant.storage || variant.ram || variant.colour || variant.type || variant.material || variant.pattern || variant.quality || variant.ageGroup || variant.other || variant.barcode || '').trim();
}

function retailSubcategoryMatches(user = {}, expectedSlug = '', expectedLabel = '') {
  const subcategory = String(user?.retailSubcategory || '').trim().toLowerCase();
  return user?.category === 'retail' && (subcategory === expectedSlug || subcategory === expectedLabel.toLowerCase());
}

function isElectronicsRetailAccount(user = {}) {
  return retailSubcategoryMatches(user, ELECTRONICS_RETAIL_SUBCATEGORY, 'Electronics & Technology');
}

function isFashionRetailAccount(user = {}) {
  return retailSubcategoryMatches(user, FASHION_RETAIL_SUBCATEGORY, 'Fashion & Lifestyle')
    || retailSubcategoryMatches(user, FASHION_RETAIL_SUBCATEGORY, 'Fashion & Style');
}

function isFoodGroceryRetailAccount(user = {}) {
  return retailSubcategoryMatches(user, FOOD_GROCERY_RETAIL_SUBCATEGORY, 'Food & Grocery');
}

function isHomeLivingRetailAccount(user = {}) {
  return retailSubcategoryMatches(user, HOME_LIVING_RETAIL_SUBCATEGORY, 'Home & Living');
}

function isSpecialtyPersonalRetailAccount(user = {}) {
  return retailSubcategoryMatches(user, SPECIALTY_PERSONAL_RETAIL_SUBCATEGORY, 'Specialty & Personal Needs');
}

function isBusinessSpecialtyRetailAccount(user = {}) {
  return retailSubcategoryMatches(user, BUSINESS_SPECIALTY_RETAIL_SUBCATEGORY, 'Business & Specialty Retail');
}

function electronicsFormDefaults() {
  return {
    itemGroup: 'Electronics',
    category: 'Electronics',
    productType: 'Serialized',
    unit: 'Nos',
    baseUnit: 'Nos',
    salesUnit: 'Nos',
    purchaseUnit: 'Nos',
    serialTracking: true,
    variantAttributes: DEFAULT_ELECTRONICS_VARIANT_ATTRIBUTES,
    variants: [{
      size: '',
      modelName: '',
      modelCode: '',
      processor: '',
      ram: '',
      storage: '',
      colour: '',
      display: '',
      graphics: '',
      operatingSystem: '',
      barcode: '',
      purchasePrice: 0,
      mrp: 0,
      rate: 0,
      stock: 0,
      minStockLevel: 0,
    }],
  };
}

function fashionFormDefaults() {
  return {
    itemGroup: 'Textile',
    category: 'Fashion & Apparel',
    productType: 'Standard',
    unit: 'Piece',
    baseUnit: 'Piece',
    salesUnit: 'Piece',
    purchaseUnit: 'Piece',
    gstRate: 5,
    serialTracking: false,
    batchTracking: false,
    variants: [],
  };
}

function foodGroceryFormDefaults() {
  return {
    itemGroup: 'General',
    category: 'Food & Grocery',
    subCategory: 'Grocery & Staples',
    productType: 'Packaged Food',
    unit: 'Kg',
    baseUnit: 'Kg',
    salesUnit: 'Kg',
    purchaseUnit: 'Kg',
    type: 'Bag',
    condition: 'India',
    gstRate: 5,
    trackInventory: true,
    batchTracking: true,
    expiryTracking: true,
    serialTracking: false,
    variants: [],
  };
}

function homeLivingFormDefaults() {
  return {
    itemGroup: 'General',
    category: 'Home & Living',
    subCategory: 'Furniture',
    brand: '',
    productType: 'Standard',
    unit: 'Piece',
    baseUnit: 'Piece',
    salesUnit: 'Piece',
    purchaseUnit: 'Piece',
    description: '',
    productDescription: '',
    barcode: '',
    hsn: '',
    purchasePrice: '',
    rate: '',
    mrp: '',
    gstRate: 18,
    taxType: 'Tax Exclusive',
    stock: 0,
    minStockLevel: 0,
    reorderLevel: 0,
    warrantyPeriod: '',
    supplier: '',
    condition: '',
    leadTimeDays: '',
    trackInventory: true,
    serialTracking: false,
    batchTracking: false,
    variants: [],
  };
}

function specialtyPersonalFormDefaults() {
  return {
    itemGroup: 'General',
    category: 'Specialty & Personal Needs',
    subCategory: '',
    brand: '',
    productType: 'Standard',
    unit: '',
    baseUnit: '',
    salesUnit: '',
    purchaseUnit: '',
    description: '',
    productDescription: '',
    barcode: '',
    hsn: '',
    purchasePrice: '',
    rate: '',
    mrp: '',
    gstRate: 18,
    taxType: 'Tax Exclusive',
    stock: 0,
    minStockLevel: 0,
    reorderLevel: 0,
    warrantyPeriod: '',
    supplier: '',
    condition: '',
    leadTimeDays: 0,
    trackInventory: true,
    serialTracking: false,
    batchTracking: false,
    variants: [],
  };
}

function businessSpecialtyFormDefaults() {
  return {
    ...specialtyPersonalFormDefaults(),
    category: 'Business & Specialty Retail',
    variantAttributes: [],
  };
}

function compactJoin(values = []) {
  return values.filter(Boolean).join(' · ');
}

function electronicsItemTypeLabel(type) {
  return 'Device';
}

const EditIcon = () => (
  <svg fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const TrashIcon = () => (
  <svg fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14H6L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4h6v2"/>
  </svg>
);
const UploadIcon = () => (
  <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" x2="12" y1="3" y2="15"/>
  </svg>
);

function Field({ label, children, required = false, className = '' }) {
  return (
    <div className={className}>
      <label className={LABEL}>{label}{required ? ' *' : ''}</label>
      {children}
    </div>
  );
}

function FoodFieldBox({ label, children, required = false, className = '' }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-[10px] font-semibold text-[#0f172a]">{label}{required ? ' *' : ''}</label>
      {children}
    </div>
  );
}

function CompactFieldBox({ label, children, required = false, className = '' }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-[11px] font-semibold text-[#0f172a]">{label}{required ? ' *' : ''}</label>
      {children}
    </div>
  );
}

function Section({ title, children, className = '' }) {
  return (
    <section className={`border border-[#dbe4ef] rounded-lg p-3.5 bg-white ${className}`}>
      <h3 className="m-0 mb-3 text-[12px] font-bold uppercase text-[#0f2a66]">{title}</h3>
      {children}
    </section>
  );
}

function ToggleField({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-3 border border-[#dbe4ef] rounded-md px-3 py-2.5 cursor-pointer bg-white">
      <span className="text-[13px] font-medium text-[#374151]">{label}</span>
      <span
        className={`w-9 h-5 rounded-full transition-colors cursor-pointer flex-none ${checked ? 'bg-blue-600' : 'bg-[#dbe4ef]'}`}
        onClick={(event) => {
          event.preventDefault();
          onChange(!checked);
        }}
      >
        <span className={`block w-4 h-4 bg-white rounded-full mt-0.5 transition-transform ${checked ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
      </span>
    </label>
  );
}

export function ProductModal({ mode, initial, nextCode, initialBarcode = '', initialProductType = '', forceServiceMode = false, pageMode = false, categories, brands, subCategories = [], sizes, fabrics, colours, types, forceElectronicsRetail = false, forceFashionRetail = false, forceFoodGroceryRetail = false, forceHomeLivingRetail = false, forceSpecialtyPersonalRetail = false, forceBusinessSpecialtyRetail = false, onSave, onClose }) {
  const currentUser = useCurrentUser();
  const businessCategory = currentUser?.category || 'retail';
  const isRetail = businessCategory === 'retail';
  const isElectronicsRetail = forceElectronicsRetail || isElectronicsRetailAccount(currentUser);
  const isFashionRetail = forceFashionRetail || isFashionRetailAccount(currentUser);
  const isFoodGroceryRetail = forceFoodGroceryRetail || isFoodGroceryRetailAccount(currentUser);
  const isHomeLivingRetail = forceHomeLivingRetail || isHomeLivingRetailAccount(currentUser);
  const isSpecialtyPersonalRetail = forceSpecialtyPersonalRetail || isSpecialtyPersonalRetailAccount(currentUser);
  const isBusinessSpecialtyRetail = forceBusinessSpecialtyRetail || isBusinessSpecialtyRetailAccount(currentUser);
  const isSpecialtyRetail = isSpecialtyPersonalRetail || isBusinessSpecialtyRetail;
  const itemGroups = isElectronicsRetail ? ['Electronics'] : isFashionRetail ? ['Textile'] : isFoodGroceryRetail || isHomeLivingRetail || isSpecialtyRetail ? ['General'] : (CATEGORY_ITEM_GROUPS[businessCategory] || ['General']);
  const defaultForm = {
    ...EMPTY_FORM,
    ...(isElectronicsRetail ? electronicsFormDefaults() : {}),
    ...(isFashionRetail ? fashionFormDefaults() : {}),
    ...(isFoodGroceryRetail ? foodGroceryFormDefaults() : {}),
    ...(isHomeLivingRetail ? homeLivingFormDefaults() : {}),
    ...(isSpecialtyPersonalRetail ? specialtyPersonalFormDefaults() : {}),
    ...(isBusinessSpecialtyRetail ? businessSpecialtyFormDefaults() : {}),
    branchSettings: DEFAULT_BRANCH_SETTINGS.map((row) => ({ ...row })),
  };
  const categoryOptions = isElectronicsRetail
    ? [...new Set([...ELECTRONICS_CATEGORY_PRESETS, ...categories.filter((c) => c !== 'All Categories')])]
    : isFashionRetail
      ? [...new Set([...FASHION_CATEGORY_PRESETS, ...categories.filter((c) => c !== 'All Categories')])]
      : isFoodGroceryRetail
        ? [...new Set(['Food & Grocery', ...categories.filter((c) => c !== 'All Categories')])]
        : isHomeLivingRetail
          ? [...new Set([...HOME_LIVING_CATEGORIES, ...categories.filter((c) => c !== 'All Categories')])]
          : isSpecialtyPersonalRetail
            ? [...new Set([...SPECIALTY_PERSONAL_CATEGORIES, ...categories.filter((c) => c !== 'All Categories')])]
            : isBusinessSpecialtyRetail
              ? [...new Set([...BUSINESS_SPECIALTY_CATEGORIES, ...categories.filter((c) => c !== 'All Categories')])]
              : categories.filter((c) => c !== 'All Categories');
  const subCategoryOptions = isElectronicsRetail
    ? [...new Set([...subCategories, ...ELECTRONICS_SUBCATEGORIES])]
    : isFashionRetail
      ? [...new Set([...subCategories, ...FASHION_SUBCATEGORIES])]
      : isFoodGroceryRetail
        ? [...new Set([...FOOD_GROCERY_SUBCATEGORIES, ...subCategories])]
        : isHomeLivingRetail
          ? [...new Set([...HOME_LIVING_SUBCATEGORIES, ...subCategories])]
          : isSpecialtyPersonalRetail
            ? [...new Set([...SPECIALTY_PERSONAL_SUBCATEGORIES, ...subCategories])]
            : isBusinessSpecialtyRetail
              ? [...new Set([...BUSINESS_SPECIALTY_SUBCATEGORIES, ...subCategories])]
              : subCategories;
  const modelPresets = isElectronicsRetail ? ELECTRONICS_MODEL_PRESETS : MODEL_PRESETS;
  const electronicsServiceDefaults = isElectronicsRetail || forceServiceMode
        ? {
            category: '',
            subCategory: '',
            serviceType: '',
            type: '',
        estimatedTime: '',
        technician: '',
        serviceWarranty: '',
        warrantyPeriod: '',
      }
    : {};
  const [form, setForm] = useState(() => {
    if (mode === 'add') {
      const shouldStartAsService = forceServiceMode || initialProductType === 'Service';
      const initialTypeDefaults = shouldStartAsService
        ? {
            ...electronicsServiceDefaults,
            itemType: 'Service',
            productType: 'Service',
            category: isFashionRetail ? 'Fashion & Style' : isHomeLivingRetail ? 'Home & Living' : isSpecialtyPersonalRetail ? 'Specialty & Personal Needs' : isBusinessSpecialtyRetail ? 'Business & Specialty Retail' : electronicsServiceDefaults.category || '',
            serviceType: isHomeLivingRetail ? 'Home Service' : isSpecialtyPersonalRetail ? 'Personal Care' : isBusinessSpecialtyRetail ? 'Customization' : electronicsServiceDefaults.serviceType || '',
            type: isHomeLivingRetail ? 'Home Service' : isSpecialtyPersonalRetail ? 'Personal Care' : isBusinessSpecialtyRetail ? 'Customization' : electronicsServiceDefaults.type || '',
            trackInventory: false,
            stock: 0,
            minStockLevel: 0,
            variants: [],
          }
        : initialProductType === 'Standard'
          ? { productType: 'Standard', variants: [] }
          : {};
      return { ...defaultForm, ...initialTypeDefaults, code: nextCode ?? '', barcode: shouldStartAsService ? '' : initialBarcode || (isHomeLivingRetail || isSpecialtyRetail ? '' : genBarcode()) };
    }
    const initialGroup = isElectronicsRetail ? 'Electronics' : isFashionRetail ? 'Textile' : isFoodGroceryRetail || isHomeLivingRetail || isSpecialtyRetail ? 'General' : (itemGroups.includes(initial?.itemGroup) ? initial.itemGroup : 'General');
    return {
      ...defaultForm,
      ...initial,
      packingRows: initial?.packingRows ?? [],
      priceLists: initial?.priceLists ?? [],
      supplierMappings: initial?.supplierMappings ?? [],
      branchSettings: initial?.branchSettings?.length ? initial.branchSettings : DEFAULT_BRANCH_SETTINGS.map((row) => ({ ...row })),
      variants: initial?.variants ?? [],
      itemGroup: initialGroup,
    };
  });
  const [activeTab, setActiveTab] = useState('General');
  const [bulkVariantText, setBulkVariantText] = useState('');
  const [bulkVariantStock, setBulkVariantStock] = useState('0');
  const [bulkVariantMinStock, setBulkVariantMinStock] = useState('0');
  const [bundleProductOptions, setBundleProductOptions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const specialtyRetailCategoryLabel = isBusinessSpecialtyRetail ? 'Business & Specialty Retail' : 'Specialty & Personal Needs';
  const specialtyRetailVariantAttributes = isBusinessSpecialtyRetail ? BUSINESS_SPECIALTY_VARIANT_ATTRIBUTES : SPECIALTY_PERSONAL_VARIANT_ATTRIBUTES;
  const defaultSpecialtyVariantAttributes = ['size', 'colour', 'type'];
  const isService = form.itemType === 'Service';
  const shouldUseSpecialServiceForm = isService && (isFashionRetail || isHomeLivingRetail || isSpecialtyPersonalRetail || isBusinessSpecialtyRetail);
  const isTextile = isRetail && !isService && form.itemGroup === 'Textile';
  const isElectronics = isRetail && !isService && (form.itemGroup === 'Electronics' || isElectronicsRetail);
  const genericGroupFields = !isService ? (GROUP_FIELDS[form.itemGroup] || []) : [];
  const isMultiVariant = !isService && ((form.variants || []).length > 0 || (isSpecialtyRetail && form.productType === 'Matrix'));
  const variantKind = isTextile ? 'size' : 'model';
  const variantTotalStock = (form.variants || []).reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
  const itemTypeLabel = isElectronicsRetail ? 'Entry Type *' : 'Item Type *';
  const currentEntryName = isService ? (isElectronicsRetail ? 'Service / Repair' : 'Service') : (isElectronicsRetail ? 'Device' : 'Product');
  const useFullScreenEditor = (isElectronicsRetail || isFashionRetail || isFoodGroceryRetail || isHomeLivingRetail || isSpecialtyRetail) && !isService;
  const isSingleElectronicsProduct = useFullScreenEditor && !isMultiVariant && form.productType !== 'Bundle';
  const isBundleElectronicsProduct = useFullScreenEditor && form.productType === 'Bundle';
  const isSingleFashionProduct = isFashionRetail && useFullScreenEditor && !isMultiVariant && form.productType !== 'Bundle';
  const isVariantFoodGroceryProduct = isFoodGroceryRetail && useFullScreenEditor && isMultiVariant && form.productType !== 'Bundle';
  const selectedVariantAttributes = (form.variantAttributes || []).length ? form.variantAttributes : DEFAULT_ELECTRONICS_VARIANT_ATTRIBUTES;
  const submittedVariantAttributes = isHomeLivingRetail
    ? ((form.variantAttributes || []).length ? form.variantAttributes : ['size', 'colour'])
    : isSpecialtyRetail
      ? ((form.variantAttributes || []).length ? form.variantAttributes : (isBusinessSpecialtyRetail ? [] : defaultSpecialtyVariantAttributes))
      : selectedVariantAttributes;
  const activeVariantAttributes = ELECTRONICS_VARIANT_ATTRIBUTES.filter((attr) => selectedVariantAttributes.includes(attr.key));
  const nameInputRef = useRef(null);
  const modalRef = useFocusTrap({ active: !pageMode, onClose, initialFocusRef: nameInputRef });

  useEffect(() => {
    if (!forceServiceMode || form.itemType === 'Service') return;
    setForm((prev) => ({
      ...prev,
      ...electronicsServiceDefaults,
      itemType: 'Service',
      productType: 'Service',
      trackInventory: false,
      stock: 0,
      minStockLevel: 0,
      variants: [],
      barcode: '',
    }));
  }, [forceServiceMode, form.itemType]);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }
  function setRow(collection, idx, field, value) {
    setForm((f) => ({
      ...f,
      [collection]: (f[collection] || []).map((row, i) => (i === idx ? { ...row, [field]: value } : row)),
    }));
  }
  function addRow(collection, row) {
    setForm((f) => ({ ...f, [collection]: [...(f[collection] || []), row] }));
  }
  function removeRow(collection, idx) {
    setForm((f) => ({ ...f, [collection]: (f[collection] || []).filter((_, i) => i !== idx) }));
  }

  function selectItemType(type) {
    setForm((prev) => ({
      ...prev,
      itemType: type,
      stock: type === 'Service' ? 0 : prev.stock,
      minStockLevel: type === 'Service' ? 0 : prev.minStockLevel,
    }));
  }

  function setItemGroup(grp) {
    const ownedFields = grp === 'Textile'
      ? ['size', 'fabric', 'material', 'colour', 'type', 'gender', 'collection', 'pattern']
      : grp === 'Electronics'
        ? ['modelNumber', 'warrantyPeriod', 'warrantyType', 'serialNumber', 'processor', 'ram', 'storage', 'display', 'operatingSystem']
        : (GROUP_FIELDS[grp] || []);
    setForm((f) => {
      const cleared = {};
      for (const field of ALL_GROUP_EXTRA_FIELDS) {
        if (ownedFields.includes(field)) continue;
        cleared[field] = field === 'prescriptionRequired' ? false : '';
      }
      return { ...f, ...cleared, itemGroup: grp };
    });
  }

  function enableMultiSize() {
    setForm((f) => ({
      ...f,
      variants: (f.variants || []).length
        ? f.variants
        : [{
            size: f.itemGroup === 'Textile' ? f.size || '' : '',
            modelName: f.itemGroup === 'Textile' ? '' : f.modelFamily || f.modelNumber || '',
            modelCode: f.itemGroup === 'Textile' ? '' : f.modelNumber || '',
            processor: f.processor || '',
            ram: f.ram || '',
            storage: f.storage || '',
            colour: f.colour || '',
            display: f.display || '',
            graphics: f.graphics || '',
            operatingSystem: f.operatingSystem || '',
            barcode: f.barcode || '',
            purchasePrice: Number(f.purchasePrice) || 0,
            mrp: Number(f.mrp) || 0,
            rate: Number(f.rate) || 0,
            stock: Number(f.stock) || 0,
            minStockLevel: Number(f.minStockLevel) || 0,
          }],
    }));
  }

  function disableMultiSize() {
    setForm((f) => ({ ...f, variants: [] }));
  }

  function selectStockMode(idx) {
    if (idx === 0) disableMultiSize();
    else enableMultiSize();
  }

  function selectFoodGroceryVariantMode() {
    setForm((f) => ({
      ...f,
      variants: (f.variants || []).length
        ? f.variants
        : [{
            size: f.size || '500 ml',
            modelName: f.size || '500 ml',
            modelCode: f.code ? `${f.code}-500ML` : '',
            barcode: f.barcode || '',
            purchasePrice: Number(f.purchasePrice) || 0,
            mrp: Number(f.mrp) || 0,
            rate: Number(f.rate) || 0,
            stock: Number(f.stock) || 0,
            minStockLevel: Number(f.minStockLevel) || 0,
          }],
    }));
  }

  function blankHomeLivingVariant(index = 0, formState = form) {
    return {
      size: '',
      colour: '',
      material: '',
      pattern: '',
      modelName: '',
      modelCode: formState.code ? `${formState.code}-${index + 1}` : '',
      barcode: '',
      purchasePrice: Number(formState.purchasePrice) || 0,
      mrp: Number(formState.mrp) || 0,
      rate: Number(formState.rate) || 0,
      stock: 0,
      minStockLevel: Number(formState.minStockLevel) || 0,
    };
  }

  function selectHomeLivingVariantMode() {
    setForm((f) => ({
      ...f,
      productType: 'Matrix',
      variantAttributes: (f.variantAttributes || []).length ? f.variantAttributes : ['size', 'colour'],
      variants: (f.variants || []).length
        ? f.variants
        : [0, 1, 2].map((idx) => blankHomeLivingVariant(idx, f)),
    }));
  }

  function selectSpecialtyPersonalVariantMode() {
    setForm((f) => ({
      ...f,
      productType: 'Matrix',
      variantAttributes: (f.variantAttributes || []).length ? f.variantAttributes : defaultSpecialtyVariantAttributes,
      variants: f.variants || [],
    }));
  }

  function addSpecialtyPersonalVariant() {
    setForm((f) => ({
      ...f,
      productType: 'Matrix',
      variants: [
        ...(f.variants || []),
        {
          size: '',
          colour: '',
          type: '',
          material: '',
          pattern: '',
          quality: '',
          ageGroup: '',
          other: '',
          modelName: '',
          modelCode: f.code ? `${f.code}-${(f.variants || []).length + 1}` : '',
          barcode: '',
          purchasePrice: Number(f.purchasePrice) || 0,
          mrp: Number(f.mrp) || 0,
          rate: Number(f.rate) || 0,
          stock: 0,
          minStockLevel: Number(f.minStockLevel) || 0,
        },
      ],
    }));
  }

  function toggleSpecialtyPersonalVariantAttribute(key) {
    setForm((f) => {
      const current = (f.variantAttributes || []).length ? f.variantAttributes : (isBusinessSpecialtyRetail ? [] : defaultSpecialtyVariantAttributes);
      const next = current.includes(key) ? current.filter((item) => item !== key) : [...current, key];
      return { ...f, variantAttributes: next };
    });
  }

  function addHomeLivingVariant() {
    setForm((f) => ({
      ...f,
      variants: [...(f.variants || []), blankHomeLivingVariant((f.variants || []).length, f)],
    }));
  }

  function toggleHomeLivingVariantAttribute(key) {
    setForm((f) => {
      const current = (f.variantAttributes || []).length ? f.variantAttributes : ['size', 'colour'];
      const next = current.includes(key) ? current.filter((item) => item !== key) : [...current, key];
      return { ...f, variantAttributes: next };
    });
  }

  function activateBundleMode() {
    setForm((f) => ({
      ...f,
      productType: 'Bundle',
      variants: [],
      bundleItems: (f.bundleItems || []).length ? f.bundleItems : [blankBundleItem()],
    }));
  }

  function addVariantRow() {
    setForm((f) => ({
      ...f,
      variants: [...(f.variants || []), {
        size: '',
        modelName: f.itemGroup === 'Textile' ? '' : f.modelFamily || '',
        modelCode: '',
        processor: '',
        ram: '',
        storage: '',
        colour: '',
        display: '',
        graphics: '',
        operatingSystem: '',
        barcode: '',
        purchasePrice: Number(f.purchasePrice) || 0,
        mrp: Number(f.mrp) || 0,
        rate: Number(f.rate) || 0,
        stock: 0,
        minStockLevel: 0,
      }],
    }));
  }

  function addVariantNames(names = []) {
    const field = isTextile ? 'size' : 'modelName';
    const cleaned = names.map((name) => String(name || '').trim()).filter(Boolean);
    if (!cleaned.length) return;
    setForm((f) => {
      const existing = new Set((f.variants || []).map((v) => String(v[field] || '').trim().toLowerCase()).filter(Boolean));
      const rows = cleaned
        .filter((name) => {
          const key = name.toLowerCase();
          if (existing.has(key)) return false;
          existing.add(key);
          return true;
        })
        .map((name) => ({
          size: field === 'size' ? name : '',
          modelName: field === 'modelName' ? name : '',
          modelCode: '',
          processor: '',
          ram: '',
          storage: '',
          colour: '',
          display: '',
          graphics: '',
          operatingSystem: '',
          barcode: '',
          purchasePrice: Number(f.purchasePrice) || 0,
          mrp: Number(f.mrp) || 0,
          rate: Number(f.rate) || 0,
          stock: Number(bulkVariantStock) || 0,
          minStockLevel: Number(bulkVariantMinStock) || 0,
        }));
      return { ...f, variants: [...(f.variants || []), ...rows] };
    });
  }

  function addBulkVariants() {
    const names = bulkVariantText.split(/[\n,|/]+/);
    addVariantNames(names);
    setBulkVariantText('');
  }

  function generateVariantRows() {
    if (bulkVariantText.trim()) {
      addBulkVariants();
      return;
    }
    addVariantRow();
  }

  function toggleVariantAttribute(key) {
    setForm((f) => {
      const current = (f.variantAttributes || []).length ? f.variantAttributes : DEFAULT_ELECTRONICS_VARIANT_ATTRIBUTES;
      const next = current.includes(key) ? current.filter((item) => item !== key) : [...current, key];
      return { ...f, variantAttributes: next.length ? next : [key] };
    });
  }

  function addBundleItemRow() {
    addRow('bundleItems', blankBundleItem());
  }

  function updateBundleItem(idx, field, value) {
    setRow('bundleItems', idx, field, value);
  }

  function selectBundleProduct(idx, value) {
    const product = bundleProductOptions.find((item) => item.description === value || item.code === value);
    setForm((f) => ({
      ...f,
      bundleItems: (f.bundleItems || []).map((row, i) => {
        if (i !== idx) return row;
        if (!product) return { ...row, productName: value };
        return {
          ...row,
          productId: product._id || '',
          productName: product.description || value,
          sku: product.code || '',
          unitPrice: Number(product.rate) || 0,
        };
      }),
    }));
  }

  function renderSingleHomeLivingProductForm() {
    const pageClass = 'mx-auto flex w-full max-w-[1880px] flex-col gap-[10px] pb-[10px]';
    const sectionClass = 'border border-[#d6dde8] bg-white p-[15px]';
    const sectionTitleClass = 'mb-[15px] text-[14px] font-bold uppercase leading-none text-[#0f172a]';
    const labelClass = 'mb-[6px] block text-[13px] font-semibold leading-none text-[#0f172a]';
    const inputClass = 'h-8 w-full rounded-none border border-[#cfd8e6] bg-white px-[10px] text-[13px] font-normal leading-none text-[#0f172a] outline-none focus:border-blue-500 font-[inherit]';
    const requiredMark = <span className="text-red-500"> *</span>;
    const updateUnit = (value) => {
      setForm((prev) => ({
        ...prev,
        unit: value,
        baseUnit: value,
        salesUnit: value,
        purchaseUnit: value,
        conversionToUnit: value,
      }));
    };
    const productTypes = [
      { label: 'Single Product', helper: 'Add a product without variants', active: !isMultiVariant, action: () => { set('productType', 'Standard'); disableMultiSize(); } },
      { label: 'Product with Variants', helper: 'Add variants like Size, Color, Dimensions etc.', active: isMultiVariant, action: selectHomeLivingVariantMode },
    ];

    return (
      <div className={pageClass}>
        <section className={`${sectionClass} h-[86px] overflow-hidden`}>
          <div className="mb-[17px] text-[14px] font-bold uppercase leading-none text-[#0f172a]">Product Type</div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {productTypes.map((type, idx) => (
              <label key={type.label} className={`flex h-5 items-center gap-[10px] pr-6 text-[14px] font-semibold leading-none text-[#0f172a] ${idx === 0 ? 'md:border-r md:border-[#e2e8f0]' : ''}`}>
                <input className="h-[15px] w-[15px] accent-blue-600" type="radio" checked={type.active} onChange={type.action} />
                <span>{type.label}</span>
              </label>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-[10px] xl:grid-cols-[minmax(0,0.4fr)_minmax(0,0.3fr)_minmax(0,0.3fr)]">
          <div className="grid grid-cols-1 gap-[10px]">
            <section className={sectionClass}>
              <div className={sectionTitleClass}>Product Information</div>
              <div className="grid grid-cols-1 gap-[13px] md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className={labelClass}>Product Name{requiredMark}</label>
                  <input ref={nameInputRef} className={inputClass} value={form.description} onChange={(e) => set('description', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Brand{requiredMark}</label>
                  <input className={inputClass} placeholder="Enter brand" value={form.brand || ''} onChange={(e) => set('brand', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Category{requiredMark}</label>
                  <input className={inputClass} placeholder="Home & Living" value={form.category || 'Home & Living'} onChange={(e) => set('category', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Sub Category</label>
                  <input className={inputClass} placeholder="Enter sub category" value={form.subCategory || ''} onChange={(e) => set('subCategory', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Product Code</label>
                  <input className={inputClass} value={form.code || ''} onChange={(e) => set('code', e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Barcode</label>
                  <div className="grid grid-cols-[minmax(0,1fr)_92px]">
                    <input className={inputClass} value={form.barcode || ''} onChange={(e) => set('barcode', e.target.value)} />
                    <button type="button" className="inline-flex h-8 items-center justify-center gap-2 rounded-none border border-l-0 border-[#cfd8e6] bg-white px-3 text-[13px] font-semibold text-[#0f172a] hover:bg-[#f8fafc] font-[inherit]" onClick={() => set('barcode', genBarcode())}>
                      <ScanLine size={13} />
                      Scan
                    </button>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Description</label>
                  <textarea className={`${inputClass} min-h-[82px] resize-y py-[8px] leading-5`} value={form.productDescription || ''} onChange={(e) => set('productDescription', e.target.value)} />
                </div>
              </div>
            </section>
          </div>

          <div className="grid grid-cols-1 gap-[10px]">
            <section className={sectionClass}>
              <div className={sectionTitleClass}>Pricing</div>
              <div className="grid grid-cols-1 gap-[13px]">
                <div>
                  <label className={labelClass}>Purchase Price (Rs){requiredMark}</label>
                  <input className={inputClass} inputMode="decimal" value={form.purchasePrice} onChange={(e) => set('purchasePrice', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Selling Price (Rs){requiredMark}</label>
                  <input className={inputClass} inputMode="decimal" value={form.rate} onChange={(e) => set('rate', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>MRP (Rs)</label>
                  <input className={inputClass} inputMode="decimal" value={form.mrp} onChange={(e) => set('mrp', e.target.value)} />
                </div>
              </div>
            </section>

            <section className={sectionClass}>
              <div className={sectionTitleClass}>Inventory</div>
              <div className="mb-[13px] flex flex-wrap items-center gap-5 text-[14px] font-medium leading-none text-[#0f172a]">
                <span className="text-[13px] font-semibold">Stock Tracking</span>
                <label className="flex items-center gap-2">
                  <input className="h-[15px] w-[15px] accent-blue-600" type="radio" checked={!form.batchTracking} onChange={() => set('batchTracking', false)} />
                  Standard
                </label>
                <label className="flex items-center gap-2">
                  <input className="h-[15px] w-[15px] accent-blue-600" type="radio" checked={Boolean(form.batchTracking)} onChange={() => set('batchTracking', true)} />
                  Batch / Lot
                </label>
              </div>
              <div className="grid grid-cols-1 gap-[13px]">
                <div>
                  <label className={labelClass}>Unit{requiredMark}</label>
                  <input className={inputClass} placeholder="Enter unit" value={form.unit || 'Piece'} onChange={(e) => updateUnit(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Opening Stock</label>
                  <input className={`${inputClass} ${mode === 'edit' ? 'bg-[#f8fafc] text-[#94a3b8] cursor-not-allowed' : ''}`} type="number" min="0" value={form.stock} disabled={mode === 'edit'} onChange={(e) => set('stock', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Low Stock Alert</label>
                  <input className={inputClass} type="number" min="0" value={form.minStockLevel} onChange={(e) => set('minStockLevel', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Reorder Level</label>
                  <input className={inputClass} type="number" min="0" value={form.reorderLevel || ''} onChange={(e) => set('reorderLevel', e.target.value)} />
                </div>
              </div>
            </section>
          </div>

          <section className={`${sectionClass} min-h-[616px]`}>
            <div className={sectionTitleClass}>Tax & Other</div>
            <div className="grid grid-cols-1 gap-[13px] md:grid-cols-2">
              <div>
                <label className={labelClass}>HSN</label>
                <input className={inputClass} value={form.hsn || ''} onChange={(e) => set('hsn', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>GST</label>
                <input className={inputClass} inputMode="decimal" placeholder="Enter GST rate" value={form.gstRate} onChange={(e) => set('gstRate', e.target.value)} />
              </div>
              <div className="md:col-span-2 flex items-center gap-3">
                <span className="text-[13px] font-semibold leading-none text-[#0f172a]">Inclusive of Tax</span>
                <button type="button" className={`relative inline-flex h-5 w-9 items-center rounded-full border-0 transition-colors ${form.taxType === 'Tax Inclusive' ? 'bg-blue-600' : 'bg-[#cbd5e1]'}`} onClick={() => set('taxType', form.taxType === 'Tax Inclusive' ? 'Tax Exclusive' : 'Tax Inclusive')} aria-pressed={form.taxType === 'Tax Inclusive'}>
                  <span className={`block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${form.taxType === 'Tax Inclusive' ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  function renderHomeLivingVariantProductForm() {
    const pageClass = 'mx-auto flex w-full max-w-[1880px] flex-col gap-3 pb-3';
    const sectionClass = 'rounded-lg border border-[#dbe4ef] bg-white p-[15px] shadow-[0_1px_3px_rgba(15,23,42,0.04)]';
    const sectionTitleClass = 'mb-[15px] flex items-center gap-2 text-[13px] font-bold uppercase leading-none text-[#0f172a]';
    const labelClass = 'mb-[6px] block text-[12px] font-semibold leading-none text-[#0f172a]';
    const inputClass = 'h-9 w-full rounded-md border border-[#cfd8e6] bg-white px-[10px] text-[13px] font-normal leading-none text-[#0f172a] outline-none focus:border-blue-500 font-[inherit]';
    const tableInputClass = 'h-9 w-full rounded-md border border-[#cfd8e6] bg-white px-[10px] text-[12px] font-normal text-[#0f172a] outline-none focus:border-blue-500 font-[inherit]';
    const requiredMark = <span className="text-red-500"> *</span>;
    const selectedAttributes = (form.variantAttributes || []).length ? form.variantAttributes : ['size', 'colour'];
    const activeAttributes = HOME_LIVING_VARIANT_ATTRIBUTES.filter((attr) => selectedAttributes.includes(attr.key));
    const updateUnit = (value) => {
      setForm((prev) => ({
        ...prev,
        unit: value,
        baseUnit: value,
        salesUnit: value,
        purchaseUnit: value,
        conversionToUnit: value,
      }));
    };
    const productTypes = [
      { label: 'Single Product', helper: 'Add a product without variants', active: !isMultiVariant, action: () => { set('productType', 'Standard'); disableMultiSize(); } },
      { label: 'Product with Variants', helper: 'Add variants like Size, Color, Dimensions etc.', active: isMultiVariant, action: selectHomeLivingVariantMode },
    ];

    return (
      <div className={pageClass}>
        <section className="rounded-lg border border-[#dbe4ef] bg-white px-[15px] py-[10px] shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {productTypes.map((type, idx) => (
              <label key={type.label} className={`flex h-8 items-center gap-4 pr-6 ${idx === 0 ? 'md:border-r md:border-[#e2e8f0]' : ''}`}>
                <input className="h-[18px] w-[18px] accent-blue-600" type="radio" checked={type.active} onChange={type.action} />
                <span className="block text-[13px] font-bold leading-none text-[#0f172a]">{type.label}</span>
              </label>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <section className={sectionClass}>
            <div className={sectionTitleClass}>
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-[#0f172a] text-[11px] normal-case leading-none">i</span>
              Basic Information
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className={labelClass}>Product Name{requiredMark}</label>
                <input ref={nameInputRef} className={inputClass} value={form.description} onChange={(e) => set('description', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Category{requiredMark}</label>
                <input className={inputClass} placeholder="Home & Living" value={form.category || 'Home & Living'} onChange={(e) => set('category', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Sub Category{requiredMark}</label>
                <input className={inputClass} placeholder="Enter sub category" value={form.subCategory || ''} onChange={(e) => set('subCategory', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Brand</label>
                <input className={inputClass} placeholder="Enter brand" value={form.brand || ''} onChange={(e) => set('brand', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Barcode</label>
                <div className="grid grid-cols-[minmax(0,1fr)_80px] gap-2">
                  <input className={inputClass} value={form.barcode || ''} onChange={(e) => set('barcode', e.target.value)} />
                  <button type="button" className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[#cfd8e6] bg-[#f8fafc] px-3 text-[12px] font-semibold text-blue-600 hover:bg-blue-50 font-[inherit]" onClick={() => set('barcode', genBarcode())}>
                    <ScanLine size={14} />
                    Scan
                  </button>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Description</label>
                <textarea className={`${inputClass} min-h-[92px] resize-y py-[10px] leading-5`} value={form.productDescription || ''} onChange={(e) => set('productDescription', e.target.value)} />
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-3">
            <section className={sectionClass}>
              <div className={sectionTitleClass}>
                <Tag size={16} />
                Pricing & Tax
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <label className={labelClass}>Purchase Price (Rs){requiredMark}</label>
                  <input className={inputClass} inputMode="decimal" value={form.purchasePrice} onChange={(e) => set('purchasePrice', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Selling Price (Rs){requiredMark}</label>
                  <input className={inputClass} inputMode="decimal" value={form.rate} onChange={(e) => set('rate', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>MRP (Rs)</label>
                  <input className={inputClass} inputMode="decimal" value={form.mrp} onChange={(e) => set('mrp', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>HSN / SAC Code</label>
                  <input className={inputClass} value={form.hsn || ''} onChange={(e) => set('hsn', e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>GST Rate{requiredMark}</label>
                  <input className={inputClass} inputMode="decimal" placeholder="Enter GST rate" value={form.gstRate} onChange={(e) => set('gstRate', e.target.value)} />
                </div>
                <div className="md:col-span-3 flex items-center gap-3">
                  <span className="text-[13px] font-medium leading-none text-[#0f172a]">Inclusive of Tax</span>
                  <button type="button" className={`relative inline-flex h-5 w-9 items-center rounded-full border-0 transition-colors ${form.taxType === 'Tax Inclusive' ? 'bg-blue-600' : 'bg-[#cbd5e1]'}`} onClick={() => set('taxType', form.taxType === 'Tax Inclusive' ? 'Tax Exclusive' : 'Tax Inclusive')} aria-pressed={form.taxType === 'Tax Inclusive'}>
                    <span className={`block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${form.taxType === 'Tax Inclusive' ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              </div>
            </section>

            <section className={sectionClass}>
              <div className={sectionTitleClass}>
                <ClipboardList size={16} />
                Inventory
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <div>
                  <label className={labelClass}>Unit{requiredMark}</label>
                  <input className={inputClass} placeholder="Enter unit" value={form.unit || 'Piece'} onChange={(e) => updateUnit(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Opening Stock</label>
                  <input className={`${inputClass} ${mode === 'edit' ? 'bg-[#f8fafc] text-[#94a3b8] cursor-not-allowed' : ''}`} type="number" min="0" value={form.stock} disabled={mode === 'edit'} onChange={(e) => set('stock', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Low Stock Alert</label>
                  <input className={inputClass} type="number" min="0" value={form.minStockLevel} onChange={(e) => set('minStockLevel', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Reorder Level</label>
                  <input className={inputClass} type="number" min="0" value={form.reorderLevel || ''} onChange={(e) => set('reorderLevel', e.target.value)} />
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[304px_minmax(0,1fr)]">
          <section className={sectionClass}>
            <div className={sectionTitleClass}>
              <span className="text-[15px] leading-none">↔</span>
              Variant Attributes
            </div>
            <div className="mb-4 text-[12px] leading-5 text-[#334155]">Select attributes to create variants for this product</div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              {HOME_LIVING_VARIANT_ATTRIBUTES.map((attr) => (
                <label key={attr.key} className="flex items-center gap-3 text-[13px] font-medium text-[#0f172a]">
                  <input className="h-4 w-4 accent-blue-600" type="checkbox" checked={selectedAttributes.includes(attr.key)} onChange={() => toggleHomeLivingVariantAttribute(attr.key)} />
                  {attr.label}
                </label>
              ))}
            </div>
          </section>

          <section className={`${sectionClass} p-0`}>
            <div className="flex items-center justify-between px-[15px] py-3">
              <div className="flex items-center gap-2 text-[13px] font-bold uppercase leading-none text-[#0f172a]">
                <span className="text-[15px] leading-none">⌘</span>
                Variants ({form.variants.length})
              </div>
              <button type="button" className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-blue-200 bg-white px-4 text-[13px] font-semibold text-blue-600 hover:bg-blue-50 font-[inherit]" onClick={addHomeLivingVariant}>
                <span className="text-[20px] font-light leading-none">+</span>
                Add Variant
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] border-collapse text-[12px]">
                <thead className="bg-[#f8fafc]">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-[#0f172a]">#</th>
                    {activeAttributes.map((attr) => (
                      <th key={attr.key} className="px-3 py-3 text-left font-bold text-[#0f172a]">{attr.label}</th>
                    ))}
                    <th className="px-3 py-3 text-left font-bold text-[#0f172a]">SKU</th>
                    <th className="px-3 py-3 text-left font-bold text-[#0f172a]">Barcode</th>
                    <th className="px-3 py-3 text-left font-bold text-[#0f172a]">Purchase Price (Rs)</th>
                    <th className="px-3 py-3 text-left font-bold text-[#0f172a]">Selling Price (Rs)</th>
                    <th className="px-3 py-3 text-left font-bold text-[#0f172a]">Stock</th>
                    <th className="px-3 py-3 text-center font-bold text-[#0f172a]">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {form.variants.map((variant, idx) => (
                    <tr key={idx} className="border-t border-[#edf2f7]">
                      <td className="px-4 py-2 text-[13px] font-semibold text-[#0f172a]">{idx + 1}</td>
                      {activeAttributes.map((attr) => (
                        <td key={attr.key} className="px-3 py-2">
                          <input className={tableInputClass} value={variant[attr.key] || ''} onChange={(e) => updateVariant(idx, attr.key, e.target.value)} />
                        </td>
                      ))}
                      <td className="px-3 py-2">
                        <input className={tableInputClass} value={variant.modelCode || ''} onChange={(e) => updateVariant(idx, 'modelCode', e.target.value)} />
                      </td>
                      <td className="px-3 py-2">
                        <div className="grid grid-cols-[minmax(0,1fr)_34px]">
                          <input className={`${tableInputClass} rounded-r-none border-r-0`} value={variant.barcode || ''} onChange={(e) => updateVariant(idx, 'barcode', e.target.value)} />
                          <button type="button" className="inline-flex h-9 items-center justify-center rounded-r-md border border-[#cfd8e6] bg-white text-blue-600 hover:bg-blue-50" onClick={() => updateVariant(idx, 'barcode', genBarcode())}>
                            <ScanLine size={13} />
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <input className={tableInputClass} inputMode="decimal" value={variant.purchasePrice ?? ''} onChange={(e) => updateVariant(idx, 'purchasePrice', e.target.value)} />
                      </td>
                      <td className="px-3 py-2">
                        <input className={tableInputClass} inputMode="decimal" value={variant.rate ?? ''} onChange={(e) => updateVariant(idx, 'rate', e.target.value)} />
                      </td>
                      <td className="px-3 py-2">
                        <input className="h-9 w-[58px] rounded-md border border-[#cfd8e6] bg-white px-[10px] text-[12px] text-[#0f172a] outline-none focus:border-blue-500 font-[inherit]" type="number" min="0" value={variant.stock ?? 0} onChange={(e) => updateVariant(idx, 'stock', e.target.value)} />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-center gap-3">
                          <button type="button" className="inline-flex h-7 w-7 items-center justify-center rounded-md border-0 bg-transparent text-blue-600 hover:bg-blue-50" title="Edit variant">
                            <EditIcon />
                          </button>
                          <button type="button" className="inline-flex h-7 w-7 items-center justify-center rounded-md border-0 bg-transparent text-red-500 hover:bg-red-50" title="Remove variant" onClick={() => removeVariant(idx)}>
                            <TrashIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!form.variants.length && (
                    <tr>
                      <td colSpan={activeAttributes.length + 6} className="px-4 py-8 text-center text-[13px] text-[#64748b]">No variants added</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    );
  }

  function renderSingleSpecialtyPersonalProductForm() {
    const pageClass = 'mx-auto flex w-full max-w-[1880px] flex-col gap-[10px] pb-[10px]';
    const sectionClass = 'rounded-lg border border-[#dbe4ef] bg-white p-[15px] shadow-[0_1px_3px_rgba(15,23,42,0.04)]';
    const sectionTitleClass = 'mb-[14px] flex items-center gap-2 text-[13px] font-bold uppercase leading-none text-[#0f172a]';
    const labelClass = 'mb-[6px] block text-[12px] font-semibold leading-none text-[#0f172a]';
    const inputClass = 'h-8 w-full rounded-md border border-[#cfd8e6] bg-white px-[10px] text-[13px] font-normal text-[#0f172a] outline-none focus:border-blue-500 placeholder:text-[#73819a] font-[inherit]';
    const requiredMark = <span className="text-red-500"> *</span>;
    const updateUnit = (value) => {
      setForm((prev) => ({
        ...prev,
        unit: value,
        baseUnit: value,
        salesUnit: value,
        purchaseUnit: value,
        conversionToUnit: value,
      }));
    };
    const setStockTracking = (trackingMode) => {
      setForm((prev) => ({
        ...prev,
        batchTracking: trackingMode === 'batch',
        serialTracking: trackingMode === 'serial',
      }));
    };
    const productTypes = [
      { label: 'Single Product', helper: 'Add a product without variants', active: !isMultiVariant, action: () => { set('productType', 'Standard'); disableMultiSize(); } },
      { label: 'Product with Variants', helper: 'Add variants like Size, Color, Type etc.', active: isMultiVariant, action: selectSpecialtyPersonalVariantMode },
    ];

    return (
      <div className={pageClass}>
        <section className="rounded-lg border border-[#dbe4ef] bg-white px-[15px] py-[10px] shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {productTypes.map((type, idx) => (
              <label key={type.label} className={`flex h-10 items-center gap-4 pr-6 ${idx === 0 ? 'md:border-r md:border-[#e2e8f0]' : ''}`}>
                <input className="h-[18px] w-[18px] accent-blue-600" type="radio" checked={type.active} onChange={type.action} />
                <span>
                  <span className="block text-[13px] font-bold leading-none text-[#0f172a]">{type.label}</span>
                </span>
              </label>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-[10px] xl:grid-cols-[minmax(0,0.36fr)_minmax(0,0.32fr)_minmax(0,0.31fr)]">
          <section className={sectionClass}>
            <div className={sectionTitleClass}>
              <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full border border-[#0f172a] text-[12px] normal-case leading-none">i</span>
              Basic Information
            </div>
            <div className="grid grid-cols-1 gap-[13px] md:grid-cols-2">
              <div className="md:col-span-2">
                <label className={labelClass}>Product Name{requiredMark}</label>
                <input ref={nameInputRef} className={inputClass} placeholder="Enter product name" value={form.description} onChange={(e) => set('description', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Category{requiredMark}</label>
                <input className={inputClass} placeholder={specialtyRetailCategoryLabel} value={form.category || specialtyRetailCategoryLabel} onChange={(e) => set('category', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Sub Category{requiredMark}</label>
                <input className={inputClass} placeholder="Enter sub category" value={form.subCategory || ''} onChange={(e) => set('subCategory', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Brand</label>
                <input className={inputClass} placeholder="Enter brand" value={form.brand || ''} onChange={(e) => set('brand', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Product Code</label>
                <input className={inputClass} placeholder="e.g. 1001" value={form.code || ''} onChange={(e) => set('code', e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Barcode</label>
                <div className="grid grid-cols-[minmax(0,1fr)_86px]">
                  <input className={`${inputClass} rounded-r-none`} placeholder="Scan or enter barcode" value={form.barcode || ''} onChange={(e) => set('barcode', e.target.value)} />
                  <button type="button" className="inline-flex h-8 items-center justify-center gap-2 rounded-r-md border border-l-0 border-[#cfd8e6] bg-white px-3 text-[12px] font-semibold text-blue-600 hover:bg-blue-50 font-[inherit]" onClick={() => set('barcode', genBarcode())}>
                    <ScanLine size={13} />
                    Scan
                  </button>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Description</label>
                <textarea className={`${inputClass} min-h-[74px] resize-y py-[8px] leading-5`} placeholder="Enter product description" value={form.productDescription || ''} onChange={(e) => set('productDescription', e.target.value)} />
              </div>
            </div>
          </section>

          <section className={sectionClass}>
            <div className={sectionTitleClass}>
              <Tag size={18} />
              Pricing & Tax
            </div>
            <div className="grid grid-cols-1 gap-[13px] md:grid-cols-2">
              <div>
                <label className={labelClass}>Purchase Price (Rs){requiredMark}</label>
                <input className={inputClass} inputMode="decimal" placeholder="0.00" value={form.purchasePrice} onChange={(e) => set('purchasePrice', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Selling Price (Rs){requiredMark}</label>
                <input className={inputClass} inputMode="decimal" placeholder="0.00" value={form.rate} onChange={(e) => set('rate', e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>MRP (Rs)</label>
                <input className={inputClass} inputMode="decimal" placeholder="0.00" value={form.mrp} onChange={(e) => set('mrp', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>HSN / SAC Code</label>
                <input className={inputClass} placeholder="Enter HSN/SAC code" value={form.hsn || ''} onChange={(e) => set('hsn', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>GST Rate{requiredMark}</label>
                <input className={inputClass} inputMode="decimal" placeholder="Enter GST rate" value={form.gstRate} onChange={(e) => set('gstRate', e.target.value)} />
              </div>
              <div className="md:col-span-2 flex items-center gap-3">
                <span className="text-[13px] font-semibold leading-none text-[#0f172a]">Inclusive of Tax</span>
                <button type="button" className={`relative inline-flex h-5 w-9 items-center rounded-full border-0 transition-colors ${form.taxType === 'Tax Inclusive' ? 'bg-blue-600' : 'bg-[#cbd5e1]'}`} onClick={() => set('taxType', form.taxType === 'Tax Inclusive' ? 'Tax Exclusive' : 'Tax Inclusive')} aria-pressed={form.taxType === 'Tax Inclusive'}>
                  <span className={`block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${form.taxType === 'Tax Inclusive' ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>
          </section>

          <section className={sectionClass}>
            <div className={sectionTitleClass}>
              <Package size={18} />
              Inventory
            </div>
            <div className="grid grid-cols-1 gap-[13px]">
              <div>
                <label className={labelClass}>Unit{requiredMark}</label>
                <input className={inputClass} placeholder="Enter unit" value={form.unit || ''} onChange={(e) => updateUnit(e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Stock Tracking</label>
                <div className="flex flex-wrap items-center gap-6 pt-1 text-[13px] font-medium text-[#0f172a]">
                  <label className="flex items-center gap-2">
                  <input className="h-[15px] w-[15px] accent-blue-600" type="radio" checked={!form.batchTracking && !form.serialTracking} onChange={() => setStockTracking('standard')} />
                    Standard
                  </label>
                  <label className="flex items-center gap-2">
                    <input className="h-[15px] w-[15px] accent-blue-600" type="radio" checked={Boolean(form.batchTracking)} onChange={() => setStockTracking('batch')} />
                    Batch / Lot
                  </label>
                  <label className="flex items-center gap-2">
                    <input className="h-[15px] w-[15px] accent-blue-600" type="radio" checked={Boolean(form.serialTracking)} onChange={() => setStockTracking('serial')} />
                    Serial
                  </label>
                </div>
              </div>
              <div>
                <label className={labelClass}>Opening Stock</label>
                <input className={`${inputClass} ${mode === 'edit' ? 'bg-[#f8fafc] text-[#94a3b8] cursor-not-allowed' : ''}`} type="number" min="0" value={form.stock} disabled={mode === 'edit'} onChange={(e) => set('stock', e.target.value)} />
              </div>
              <div className="grid grid-cols-1 gap-[13px] md:grid-cols-2">
                <div>
                  <label className={labelClass}>Low Stock Alert</label>
                  <input className={inputClass} type="number" min="0" value={form.minStockLevel} onChange={(e) => set('minStockLevel', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Reorder Level</label>
                  <input className={inputClass} type="number" min="0" value={form.reorderLevel || 0} onChange={(e) => set('reorderLevel', e.target.value)} />
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className={sectionClass}>
          <div className={sectionTitleClass}>
            <ClipboardList size={18} />
            Additional Details
          </div>
          <div className="grid grid-cols-1 gap-[13px] md:grid-cols-4">
            <div>
              <label className={labelClass}>Warranty</label>
              <input className={inputClass} placeholder="Enter warranty" value={form.warrantyPeriod || ''} onChange={(e) => set('warrantyPeriod', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Supplier</label>
              <input className={inputClass} placeholder="Enter supplier" value={form.supplier || ''} onChange={(e) => { set('supplier', e.target.value); set('preferredSupplier', e.target.value); }} />
            </div>
            <div>
              <label className={labelClass}>Country of Origin</label>
              <input className={inputClass} placeholder="Enter country" value={form.condition || ''} onChange={(e) => set('condition', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Lead Time (Days)</label>
              <input className={inputClass} type="number" min="0" value={form.leadTimeDays || 0} onChange={(e) => set('leadTimeDays', e.target.value)} />
            </div>
          </div>
        </section>
      </div>
    );
  }

  function renderSpecialtyPersonalVariantProductForm() {
    const pageClass = 'mx-auto flex w-full max-w-[1880px] flex-col gap-3 pb-3';
    const sectionClass = 'rounded-lg border border-[#dbe4ef] bg-white p-[15px] shadow-[0_1px_3px_rgba(15,23,42,0.04)]';
    const sectionTitleClass = 'mb-[14px] flex items-center gap-2 text-[13px] font-bold uppercase leading-none text-[#0f172a]';
    const labelClass = 'mb-[6px] block text-[12px] font-semibold leading-none text-[#0f172a]';
    const inputClass = 'h-8 w-full rounded-md border border-[#cfd8e6] bg-white px-[10px] text-[13px] font-normal text-[#0f172a] outline-none focus:border-blue-500 placeholder:text-[#73819a] font-[inherit]';
    const tableInputClass = 'h-8 w-full rounded-md border border-[#cfd8e6] bg-white px-[10px] text-[12px] font-normal text-[#0f172a] outline-none focus:border-blue-500 font-[inherit]';
    const requiredMark = <span className="text-red-500"> *</span>;
    const selectedAttributes = (form.variantAttributes || []).length ? form.variantAttributes : (isBusinessSpecialtyRetail ? [] : defaultSpecialtyVariantAttributes);
    const activeAttributes = specialtyRetailVariantAttributes.filter((attr) => (selectedAttributes.length ? selectedAttributes : defaultSpecialtyVariantAttributes).includes(attr.key));
    const updateUnit = (value) => {
      setForm((prev) => ({ ...prev, unit: value, baseUnit: value, salesUnit: value, purchaseUnit: value, conversionToUnit: value }));
    };
    const setStockTracking = (trackingMode) => {
      setForm((prev) => ({ ...prev, batchTracking: trackingMode === 'batch', serialTracking: trackingMode === 'serial' }));
    };
  const productTypes = [
      { label: 'Single Product', helper: 'Add a product without variants', active: !isMultiVariant, action: () => { set('productType', 'Standard'); disableMultiSize(); } },
      { label: 'Product with Variants', helper: 'Add variants like Size, Color, Type etc.', active: isMultiVariant, action: selectSpecialtyPersonalVariantMode },
    ];

    return (
      <div className={pageClass}>
        <section className="rounded-lg border border-[#dbe4ef] bg-white px-[15px] py-[10px] shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {productTypes.map((type, idx) => (
              <label key={type.label} className={`flex h-10 items-center gap-4 pr-6 ${idx === 0 ? 'md:border-r md:border-[#e2e8f0]' : ''}`}>
                <input className="h-[18px] w-[18px] accent-blue-600" type="radio" checked={type.active} onChange={type.action} />
                <span>
                  <span className="block text-[13px] font-bold leading-none text-[#0f172a]">{type.label}</span>
                </span>
              </label>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,0.36fr)_minmax(0,0.31fr)_minmax(0,0.31fr)]">
          <section className={sectionClass}>
            <div className={sectionTitleClass}>
              <span className="inline-flex h-[17px] w-[17px] items-center justify-center rounded-full border border-[#0f172a] text-[11px] normal-case leading-none">i</span>
              Basic Information
            </div>
            <div className="grid grid-cols-1 gap-[13px] md:grid-cols-2">
              <div className="md:col-span-2">
                <label className={labelClass}>Product Name{requiredMark}</label>
                <input ref={nameInputRef} className={inputClass} placeholder="Enter product name" value={form.description} onChange={(e) => set('description', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Category{requiredMark}</label>
                <input className={inputClass} placeholder={specialtyRetailCategoryLabel} value={form.category || specialtyRetailCategoryLabel} onChange={(e) => set('category', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Sub Category{requiredMark}</label>
                <input className={inputClass} placeholder="Enter sub category" value={form.subCategory || ''} onChange={(e) => set('subCategory', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Brand</label>
                <input className={inputClass} placeholder="Enter brand" value={form.brand || ''} onChange={(e) => set('brand', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Product Code</label>
                <input className={inputClass} placeholder="e.g. 1001" value={form.code || ''} onChange={(e) => set('code', e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Barcode</label>
                <div className="grid grid-cols-[minmax(0,1fr)_86px]">
                  <input className={`${inputClass} rounded-r-none`} placeholder="Scan or enter barcode" value={form.barcode || ''} onChange={(e) => set('barcode', e.target.value)} />
                  <button type="button" className="inline-flex h-8 items-center justify-center gap-2 rounded-r-md border border-l-0 border-[#cfd8e6] bg-white px-3 text-[12px] font-semibold text-blue-600 hover:bg-blue-50 font-[inherit]" onClick={() => set('barcode', genBarcode())}>
                    <ScanLine size={13} />
                    Scan
                  </button>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Description</label>
                <textarea className={`${inputClass} min-h-[64px] resize-y py-[8px] leading-5`} placeholder="Enter product description" value={form.productDescription || ''} onChange={(e) => set('productDescription', e.target.value)} />
              </div>
            </div>
          </section>

          <section className={sectionClass}>
            <div className={sectionTitleClass}><Tag size={16} /> Pricing & Tax</div>
            <div className="grid grid-cols-1 gap-[13px] md:grid-cols-2">
              <div>
                <label className={labelClass}>Purchase Price (Rs){requiredMark}</label>
                <input className={inputClass} inputMode="decimal" placeholder="0.00" value={form.purchasePrice} onChange={(e) => set('purchasePrice', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Selling Price (Rs){requiredMark}</label>
                <input className={inputClass} inputMode="decimal" placeholder="0.00" value={form.rate} onChange={(e) => set('rate', e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>MRP (Rs)</label>
                <input className={inputClass} inputMode="decimal" placeholder="0.00" value={form.mrp} onChange={(e) => set('mrp', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>HSN / SAC Code</label>
                <input className={inputClass} placeholder="Enter HSN/SAC code" value={form.hsn || ''} onChange={(e) => set('hsn', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>GST Rate{requiredMark}</label>
                <input className={inputClass} inputMode="decimal" placeholder="Enter GST rate" value={form.gstRate} onChange={(e) => set('gstRate', e.target.value)} />
              </div>
              <div className="md:col-span-2 flex items-center gap-3">
                <span className="text-[13px] font-semibold leading-none text-[#0f172a]">Inclusive of Tax</span>
                <button type="button" className={`relative inline-flex h-5 w-9 items-center rounded-full border-0 transition-colors ${form.taxType === 'Tax Inclusive' ? 'bg-blue-600' : 'bg-[#cbd5e1]'}`} onClick={() => set('taxType', form.taxType === 'Tax Inclusive' ? 'Tax Exclusive' : 'Tax Inclusive')} aria-pressed={form.taxType === 'Tax Inclusive'}>
                  <span className={`block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${form.taxType === 'Tax Inclusive' ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>
          </section>

          <section className={sectionClass}>
            <div className={sectionTitleClass}><Package size={16} /> Inventory</div>
            <div className="grid grid-cols-1 gap-[13px]">
              <div>
                <label className={labelClass}>Unit{requiredMark}</label>
                <input className={inputClass} placeholder="Enter unit" value={form.unit || ''} onChange={(e) => updateUnit(e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Stock Tracking</label>
                <div className="flex flex-wrap items-center gap-6 pt-1 text-[13px] font-medium text-[#0f172a]">
                  {[
                    ['standard', 'Standard', !form.batchTracking && !form.serialTracking],
                    ['batch', 'Batch / Lot', Boolean(form.batchTracking)],
                    ['serial', 'Serial', Boolean(form.serialTracking)],
                  ].map(([key, label, checked]) => (
                    <label key={key} className="flex items-center gap-2">
                      <input className="h-[15px] w-[15px] accent-blue-600" type="radio" checked={checked} onChange={() => setStockTracking(key)} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-[13px] md:grid-cols-2">
                <div>
                  <label className={labelClass}>Opening Stock</label>
                  <input className={`${inputClass} ${mode === 'edit' ? 'bg-[#f8fafc] text-[#94a3b8] cursor-not-allowed' : ''}`} type="number" min="0" value={form.stock} disabled={mode === 'edit'} onChange={(e) => set('stock', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Low Stock Alert</label>
                  <input className={inputClass} type="number" min="0" value={form.minStockLevel} onChange={(e) => set('minStockLevel', e.target.value)} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Reorder Level</label>
                <input className={inputClass} type="number" min="0" value={form.reorderLevel || 0} onChange={(e) => set('reorderLevel', e.target.value)} />
              </div>
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[360px_minmax(0,1fr)]">
          <section className={sectionClass}>
            <div className={sectionTitleClass}>Variant Attributes</div>
            <div className="mb-4 text-[12px] leading-5 text-[#334155]">Select attributes to create variants for this product</div>
            <div className="grid grid-cols-2 gap-x-7 gap-y-4">
              {specialtyRetailVariantAttributes.map((attr) => (
                <label key={attr.key} className="flex items-center gap-3 text-[13px] font-medium text-[#0f172a]">
                  <input className="h-4 w-4 accent-blue-600" type="checkbox" checked={selectedAttributes.includes(attr.key)} onChange={() => toggleSpecialtyPersonalVariantAttribute(attr.key)} />
                  {attr.label}
                </label>
              ))}
            </div>
            <button type="button" className="mt-5 inline-flex h-8 items-center justify-center gap-2 rounded-md border border-blue-300 bg-white px-4 text-[12px] font-semibold text-blue-600 hover:bg-blue-50 font-[inherit]">
              <span className="text-[18px] font-light leading-none">+</span>
              Add Custom Attribute
            </button>
          </section>

          <section className={`${sectionClass} p-0`}>
            <div className="flex items-center justify-between px-[15px] py-3">
              <div className="text-[13px] font-bold uppercase leading-none text-[#0f172a]">Variants ({form.variants.length})</div>
              <button type="button" className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-blue-300 bg-white px-4 text-[12px] font-semibold text-blue-600 hover:bg-blue-50 font-[inherit]" onClick={addSpecialtyPersonalVariant}>
                <span className="text-[18px] font-light leading-none">+</span>
                Add Variant
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1020px] border-collapse text-[12px]">
                <thead className="bg-[#f8fafc]">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-[#0f172a]">#</th>
                    {activeAttributes.map((attr) => <th key={attr.key} className="px-3 py-3 text-left font-bold text-[#0f172a]">{attr.label}</th>)}
                    <th className="px-3 py-3 text-left font-bold text-[#0f172a]">SKU</th>
                    <th className="px-3 py-3 text-left font-bold text-[#0f172a]">Barcode</th>
                    <th className="px-3 py-3 text-left font-bold text-[#0f172a]">Purchase Price (Rs)</th>
                    <th className="px-3 py-3 text-left font-bold text-[#0f172a]">Selling Price (Rs)</th>
                    <th className="px-3 py-3 text-left font-bold text-[#0f172a]">Stock</th>
                    <th className="px-3 py-3 text-center font-bold text-[#0f172a]">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {form.variants.map((variant, idx) => (
                    <tr key={idx} className="border-t border-[#edf2f7]">
                      <td className="px-4 py-2 text-[13px] font-semibold">{idx + 1}</td>
                      {activeAttributes.map((attr) => (
                        <td key={attr.key} className="px-3 py-2">
                          <input className={tableInputClass} value={variant[attr.key] || ''} onChange={(e) => updateVariant(idx, attr.key, e.target.value)} />
                        </td>
                      ))}
                      <td className="px-3 py-2"><input className={tableInputClass} value={variant.modelCode || ''} onChange={(e) => updateVariant(idx, 'modelCode', e.target.value)} /></td>
                      <td className="px-3 py-2"><input className={tableInputClass} value={variant.barcode || ''} onChange={(e) => updateVariant(idx, 'barcode', e.target.value)} /></td>
                      <td className="px-3 py-2"><input className={tableInputClass} inputMode="decimal" value={variant.purchasePrice ?? ''} onChange={(e) => updateVariant(idx, 'purchasePrice', e.target.value)} /></td>
                      <td className="px-3 py-2"><input className={tableInputClass} inputMode="decimal" value={variant.rate ?? ''} onChange={(e) => updateVariant(idx, 'rate', e.target.value)} /></td>
                      <td className="px-3 py-2"><input className="h-8 w-[58px] rounded-md border border-[#cfd8e6] bg-white px-[10px] text-[12px] text-[#0f172a] outline-none focus:border-blue-500 font-[inherit]" type="number" min="0" value={variant.stock ?? 0} onChange={(e) => updateVariant(idx, 'stock', e.target.value)} /></td>
                      <td className="px-3 py-2 text-center"><button type="button" className="inline-flex h-7 w-7 items-center justify-center rounded-md border-0 bg-transparent text-red-500 hover:bg-red-50" onClick={() => removeVariant(idx)}><TrashIcon /></button></td>
                    </tr>
                  ))}
                  {!form.variants.length && (
                    <tr>
                      <td colSpan={activeAttributes.length + 6} className="px-4 py-9 text-center">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-500">
                          <Package size={22} />
                        </div>
                        <div className="text-[13px] font-bold text-[#0f172a]">No variants added yet</div>
                        <div className="mt-2 text-[12px] text-[#334155]">Add variants to manage different options for this product.</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <section className={sectionClass}>
          <div className={sectionTitleClass}><ClipboardList size={16} /> Additional Details</div>
          <div className="grid grid-cols-1 gap-[13px] md:grid-cols-4">
            <div><label className={labelClass}>Warranty</label><input className={inputClass} placeholder="Enter warranty" value={form.warrantyPeriod || ''} onChange={(e) => set('warrantyPeriod', e.target.value)} /></div>
            <div><label className={labelClass}>Supplier</label><input className={inputClass} placeholder="Enter supplier" value={form.supplier || ''} onChange={(e) => { set('supplier', e.target.value); set('preferredSupplier', e.target.value); }} /></div>
            <div><label className={labelClass}>Country of Origin</label><input className={inputClass} placeholder="Enter country" value={form.condition || ''} onChange={(e) => set('condition', e.target.value)} /></div>
            <div><label className={labelClass}>Lead Time (Days)</label><input className={inputClass} type="number" min="0" value={form.leadTimeDays || 0} onChange={(e) => set('leadTimeDays', e.target.value)} /></div>
          </div>
        </section>
      </div>
    );
  }

  function renderSingleFoodGroceryProductForm() {
    const sectionClass = 'rounded-md border border-[#d6dde8] bg-white p-3';
    const sectionTitleClass = 'mb-2.5 border-b border-[#edf2f7] pb-1.5 text-[11px] font-bold uppercase tracking-wide text-[#0f172a]';
    const fieldLabel = 'mb-1 block text-[10px] font-semibold text-[#0f172a]';
    const inputClass = 'h-8 w-full rounded-md border border-[#cfd8e6] bg-white px-2.5 text-[12px] text-[#111827] outline-none focus:border-blue-500 font-[inherit]';
    const updateUnit = (value) => {
      setForm((prev) => ({
        ...prev,
        unit: value,
        baseUnit: value,
        salesUnit: value,
        purchaseUnit: value,
        conversionToUnit: value,
      }));
    };
    const toggleClass = (active) => `relative inline-flex h-5 w-9 flex-none items-center rounded-full border-0 transition-colors ${active ? 'bg-red-500' : 'bg-[#cbd5e1]'}`;
    const FieldBox = FoodFieldBox;

    return (
      <div className="mx-auto flex w-full max-w-[1880px] flex-col gap-2.5 pb-2">
        <section className={sectionClass}>
          <div className={sectionTitleClass}>Product Type</div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <label className="flex items-center gap-2 text-[12px] font-medium text-[#111827]">
              <input type="radio" checked={!isMultiVariant} onChange={disableMultiSize} />
              <span>Single Product</span>
            </label>
            <label className="flex items-center gap-2 text-[12px] font-medium text-[#111827]">
              <input type="radio" checked={isMultiVariant} onChange={selectFoodGroceryVariantMode} />
              <span>Product with Variants</span>
            </label>
          </div>
        </section>

        <section className={sectionClass}>
          <div className={sectionTitleClass}>Basic Details</div>
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
            <FieldBox label="Product Name" required>
              <input ref={nameInputRef} className={inputClass} value={form.description} onChange={(e) => set('description', e.target.value)} />
            </FieldBox>
            <FieldBox label="Product Code">
              <input className={inputClass} value={form.code || ''} onChange={(e) => set('code', e.target.value)} />
            </FieldBox>
            <FieldBox label="HSN / SAC Code">
              <input className={inputClass} value={form.hsn || ''} onChange={(e) => set('hsn', e.target.value)} placeholder="Enter HSN/SAC code" />
            </FieldBox>
            <FieldBox label="Brand">
              <input className={inputClass} placeholder="Enter brand" value={form.brand || ''} onChange={(e) => set('brand', e.target.value)} />
            </FieldBox>
            <FieldBox label="Category">
              <input className={inputClass} placeholder="Enter category" value={form.subCategory || form.category || ''} onChange={(e) => { set('subCategory', e.target.value); set('category', e.target.value); }} />
            </FieldBox>
            <FieldBox label="SKU">
              <input className={inputClass} value={form.aliasCode || ''} onChange={(e) => set('aliasCode', e.target.value)} />
            </FieldBox>
            <FieldBox label="Unit">
              <input className={inputClass} placeholder="Enter unit" value={form.unit || ''} onChange={(e) => updateUnit(e.target.value)} />
            </FieldBox>
            <FieldBox label="Barcode">
              <div className="grid grid-cols-[minmax(0,1fr)_44px]">
                <input className={`${inputClass} rounded-r-none border-r-0`} value={form.barcode || ''} onChange={(e) => set('barcode', e.target.value)} />
                <button type="button" className="inline-flex h-8 items-center justify-center rounded-r-md border border-[#cfd8e6] bg-white text-[#536173] cursor-pointer hover:bg-[#f8fafc]" onClick={() => set('barcode', genBarcode())}>
                  <ScanLine size={15} />
                </button>
              </div>
            </FieldBox>
            <FieldBox label="Description" className="xl:col-span-2">
              <textarea className={`${inputClass} h-14 resize-y py-1.5`} value={form.productDescription || ''} onChange={(e) => set('productDescription', e.target.value)} />
            </FieldBox>
          </div>
        </section>

        <section className={sectionClass}>
          <div className={sectionTitleClass}>Pricing Details</div>
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
            <FieldBox label="Purchase Price (Rs)" required>
              <input className={inputClass} type="number" min="0" step="0.01" value={form.purchasePrice} onChange={(e) => set('purchasePrice', e.target.value)} />
            </FieldBox>
            <FieldBox label="Selling Price (Rs)" required>
              <input className={inputClass} type="number" min="0" step="0.01" value={form.rate} onChange={(e) => set('rate', e.target.value)} />
            </FieldBox>
            <FieldBox label="MRP (Rs)">
              <input className={inputClass} type="number" min="0" step="0.01" value={form.mrp} onChange={(e) => set('mrp', e.target.value)} />
            </FieldBox>
            <FieldBox label="Tax">
              <input className={inputClass} inputMode="decimal" placeholder="Enter GST rate" value={form.gstRate} onChange={(e) => set('gstRate', e.target.value)} />
            </FieldBox>
            <div className="flex items-center gap-3 xl:col-span-3">
              <span className={fieldLabel}>Inclusive of tax</span>
              <button type="button" className={toggleClass(form.taxType === 'Tax Inclusive')} onClick={() => set('taxType', form.taxType === 'Tax Inclusive' ? 'Tax Exclusive' : 'Tax Inclusive')} aria-pressed={form.taxType === 'Tax Inclusive'}>
                <span className={`block h-4 w-4 rounded-full bg-white transition-transform ${form.taxType === 'Tax Inclusive' ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>
        </section>

        <section className={sectionClass}>
          <div className={sectionTitleClass}>Stock Details</div>
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
            <FieldBox label="Opening Stock">
              <input className={`${inputClass} ${mode === 'edit' ? 'bg-[#f8fafc] text-[#94a3b8] cursor-not-allowed' : ''}`} type="number" min="0" step="0.01" value={form.stock} disabled={mode === 'edit'} onChange={(e) => set('stock', e.target.value)} />
            </FieldBox>
            <FieldBox label="Reorder Level">
              <input className={inputClass} type="number" min="0" step="0.01" value={form.reorderLevel || ''} onChange={(e) => { set('reorderLevel', e.target.value); set('minStockLevel', e.target.value); }} />
            </FieldBox>
            <FieldBox label="Low Stock Alert">
              <input className={inputClass} type="number" min="0" step="0.01" value={form.minStockLevel} onChange={(e) => set('minStockLevel', e.target.value)} />
            </FieldBox>
          </div>
        </section>
      </div>
    );
  }

  function renderFoodGroceryVariantProductForm() {
    const sectionClass = 'rounded-md border border-[#d6dde8] bg-white p-3';
    const sectionTitleClass = 'mb-2.5 text-[11px] font-bold uppercase tracking-wide text-[#0f172a]';
    const fieldLabel = 'mb-1 block text-[10px] font-semibold text-[#0f172a]';
    const inputClass = 'h-8 w-full rounded-md border border-[#cfd8e6] bg-white px-2.5 text-[12px] text-[#111827] outline-none focus:border-blue-500 font-[inherit]';
    const tableInputClass = 'h-7 w-full rounded-md border border-[#cfd8e6] bg-white px-2 text-[11px] text-[#111827] outline-none focus:border-blue-500 font-[inherit]';
    const variantRows = form.variants || [];
    const purchasePrice = Number(form.purchasePrice) || 0;
    const sellingPrice = Number(form.rate || variantRows.find((row) => Number(row.rate) > 0)?.rate) || 0;
    const marginPercent = sellingPrice > 0 ? ((sellingPrice - purchasePrice) / sellingPrice) * 100 : 0;
    const totalStock = variantRows.reduce((sum, row) => sum + (Number(row.stock) || 0), 0);
    const toggleClass = (active) => `relative inline-flex h-5 w-9 flex-none items-center rounded-full border-0 transition-colors ${active ? 'bg-red-500' : 'bg-[#cbd5e1]'}`;
    const updateUnit = (value) => {
      setForm((prev) => ({
        ...prev,
        unit: value,
        baseUnit: value,
        salesUnit: value,
        purchaseUnit: value,
        conversionToUnit: value,
      }));
    };
    const setStockTracking = (modeName) => {
      setForm((prev) => ({
        ...prev,
        batchTracking: modeName === 'batch',
        expiryTracking: modeName === 'batch',
        serialTracking: modeName === 'serial',
      }));
    };
    const FieldBox = FoodFieldBox;
    const addFoodGroceryVariant = () => {
      setForm((prev) => {
        const nextIndex = (prev.variants || []).length + 1;
        return {
          ...prev,
          variants: [
            ...(prev.variants || []),
            {
              size: '',
              modelName: '',
              modelCode: prev.code ? `${prev.code}-${nextIndex}` : '',
              barcode: '',
              purchasePrice: Number(prev.purchasePrice) || 0,
              mrp: Number(prev.mrp) || 0,
              rate: Number(prev.rate) || 0,
              stock: 0,
              minStockLevel: Number(prev.minStockLevel) || 0,
            },
          ],
        };
      });
    };
    const generateFoodGroceryVariants = () => {
      const baseCode = String(form.code || 'GROC').trim();
      const defaults = ['500 ml', '1 Litre', '2 Litre'];
      setForm((prev) => ({
        ...prev,
        variants: defaults.map((size, idx) => ({
          size,
          modelName: size,
          modelCode: `${baseCode}-${size.toUpperCase().replace(/\s+/g, '').replace('LITRE', 'L')}`,
          barcode: idx === 0 ? prev.barcode || genBarcode() : genBarcode(),
          purchasePrice: Number(prev.purchasePrice) || 0,
          mrp: Number(prev.mrp) || 0,
          rate: Number(prev.rate) || 0,
          stock: 0,
          minStockLevel: Number(prev.minStockLevel) || 0,
        })),
      }));
    };

    return (
      <div className="mx-auto flex w-full max-w-[1880px] flex-col gap-2.5 pb-2">
        <section className={sectionClass}>
          <div className={sectionTitleClass}>Product Type</div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <label className="flex items-center gap-2 text-[12px] font-medium text-[#111827]">
              <input type="radio" checked={!isMultiVariant} onChange={disableMultiSize} />
              <span>Single Product</span>
            </label>
            <label className="flex items-center gap-2 text-[12px] font-semibold text-[#111827]">
              <input type="radio" checked={isMultiVariant} onChange={selectFoodGroceryVariantMode} />
              <span>Product with Variants</span>
            </label>
          </div>
        </section>

        <section className={sectionClass}>
          <div className={sectionTitleClass}>Basic Details</div>
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
            <FieldBox label="Product Name" required>
              <input ref={nameInputRef} className={inputClass} value={form.description} onChange={(e) => set('description', e.target.value)} />
            </FieldBox>
            <FieldBox label="Brand">
              <input className={inputClass} placeholder="Enter brand" value={form.brand || ''} onChange={(e) => set('brand', e.target.value)} />
            </FieldBox>
            <FieldBox label="Category">
              <input className={inputClass} placeholder="Enter category" value={form.subCategory || form.category || ''} onChange={(e) => { set('subCategory', e.target.value); set('category', e.target.value); }} />
            </FieldBox>
            <FieldBox label="Unit">
              <input className={inputClass} placeholder="Enter unit" value={form.unit || ''} onChange={(e) => updateUnit(e.target.value)} />
            </FieldBox>
            <FieldBox label="HSN / SAC Code">
              <input className={inputClass} value={form.hsn || ''} onChange={(e) => set('hsn', e.target.value)} />
            </FieldBox>
          </div>
        </section>

        <section className={sectionClass}>
          <div className={sectionTitleClass}>Variant Options</div>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[360px_minmax(0,1fr)_360px]">
            <div className="grid grid-cols-1 gap-2.5">
              <FieldBox label="Variant Attributes">
                <input className={inputClass} placeholder="Enter attribute" defaultValue="Size" />
              </FieldBox>
              <div>
                <label className={fieldLabel}>Values</label>
                <div className="flex min-h-8 flex-wrap gap-2">
                  {variantRows.map((variant, idx) => (
                    <button key={idx} type="button" className="inline-flex h-7 items-center gap-2 rounded-md border border-[#d6dde8] bg-white px-3 text-[12px] font-medium text-[#111827] cursor-pointer hover:bg-[#f8fafc] font-[inherit]" onClick={() => removeVariant(idx)}>
                      <span>{variant.modelName || variant.size || `Variant ${idx + 1}`}</span>
                      <span className="text-[#64748b]">x</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" className="h-8 rounded-md border border-red-300 bg-white px-3 text-[12px] font-semibold text-red-600 cursor-pointer hover:bg-red-50 font-[inherit]" onClick={addFoodGroceryVariant}>+ Add Attribute</button>
              <button type="button" className="h-8 rounded-md border border-red-300 bg-white px-4 text-[12px] font-semibold text-red-600 cursor-pointer hover:bg-red-50 font-[inherit]" onClick={generateFoodGroceryVariants}>+ Add</button>
            </div>
            <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-[12px] leading-5 text-[#243041]">
              Add attributes like Size, Color, Type etc. and their values to create variants.
            </div>
          </div>
        </section>

        <section className={sectionClass}>
          <div className={sectionTitleClass}>Variants</div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-[12px]">
              <thead>
                <tr className="bg-[#f8fafc]">
                  {['Variant', 'SKU', 'Barcode', 'Purchase Price (Rs)', 'Selling Price (Rs)', 'Stock', 'Actions'].map((heading) => (
                    <th key={heading} className="border border-[#dbe4ef] px-3 py-2 text-left font-bold text-[#0f172a]">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {variantRows.map((variant, idx) => (
                  <tr key={idx}>
                    <td className="border border-[#dbe4ef] px-3 py-1.5"><input className={tableInputClass} value={variant.modelName || variant.size || ''} onChange={(e) => { updateVariant(idx, 'modelName', e.target.value); updateVariant(idx, 'size', e.target.value); }} /></td>
                    <td className="border border-[#dbe4ef] px-3 py-1.5"><input className={tableInputClass} value={variant.modelCode || ''} onChange={(e) => updateVariant(idx, 'modelCode', e.target.value)} /></td>
                    <td className="border border-[#dbe4ef] px-3 py-1.5">
                      <div className="grid grid-cols-[minmax(0,1fr)_34px]">
                        <input className={`${tableInputClass} rounded-r-none border-r-0`} value={variant.barcode || ''} onChange={(e) => updateVariant(idx, 'barcode', e.target.value)} />
                        <button type="button" className="inline-flex h-7 items-center justify-center rounded-r-md border border-[#cfd8e6] bg-white text-[#536173] cursor-pointer hover:bg-[#f8fafc]" onClick={() => updateVariant(idx, 'barcode', genBarcode())}><ScanLine size={12} /></button>
                      </div>
                    </td>
                    <td className="border border-[#dbe4ef] px-3 py-1.5"><input className={tableInputClass} type="number" min="0" step="0.01" value={variant.purchasePrice ?? ''} onChange={(e) => updateVariant(idx, 'purchasePrice', e.target.value)} /></td>
                    <td className="border border-[#dbe4ef] px-3 py-1.5"><input className={tableInputClass} type="number" min="0" step="0.01" value={variant.rate ?? ''} onChange={(e) => updateVariant(idx, 'rate', e.target.value)} /></td>
                    <td className="border border-[#dbe4ef] px-3 py-1.5"><input className={tableInputClass} type="number" min="0" value={variant.stock ?? 0} onChange={(e) => updateVariant(idx, 'stock', e.target.value)} /></td>
                    <td className="border border-[#dbe4ef] px-3 py-1.5 text-center">
                      <button type="button" className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-100 bg-white text-red-500 cursor-pointer hover:bg-red-50" onClick={() => removeVariant(idx)}><TrashIcon /></button>
                    </td>
                  </tr>
                ))}
                {!variantRows.length && <tr><td colSpan={7} className="border border-[#dbe4ef] px-3 py-8 text-center text-[13px] text-[#536173]">No variants added</td></tr>}
              </tbody>
            </table>
          </div>
          <button type="button" className="mt-2.5 h-8 rounded-md border border-red-300 bg-white px-3 text-[12px] font-semibold text-red-600 cursor-pointer hover:bg-red-50 font-[inherit]" onClick={addFoodGroceryVariant}>+ Add Variant</button>
        </section>

        <section className={sectionClass}>
          <div className={sectionTitleClass}>Tax & Inventory</div>
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-4">
            <FieldBox label="GST Rate">
              <input className={inputClass} inputMode="decimal" placeholder="Enter GST rate" value={form.gstRate} onChange={(e) => set('gstRate', e.target.value)} />
            </FieldBox>
            <div className="flex items-end gap-3">
              <span className={`${fieldLabel} mb-2`}>Inclusive of Tax</span>
              <button type="button" className={toggleClass(form.taxType === 'Tax Inclusive')} onClick={() => set('taxType', form.taxType === 'Tax Inclusive' ? 'Tax Exclusive' : 'Tax Inclusive')} aria-pressed={form.taxType === 'Tax Inclusive'}>
                <span className={`block h-4 w-4 rounded-full bg-white transition-transform ${form.taxType === 'Tax Inclusive' ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <FieldBox label="Low Stock Alert">
              <input className={inputClass} type="number" min="0" value={form.minStockLevel} onChange={(e) => set('minStockLevel', e.target.value)} />
            </FieldBox>
            <FieldBox label="Reorder Level">
              <input className={inputClass} type="number" min="0" value={form.reorderLevel || ''} onChange={(e) => { set('reorderLevel', e.target.value); set('minStockLevel', e.target.value); }} />
            </FieldBox>
          </div>
        </section>
      </div>
    );
  }

  function renderSingleElectronicsProductForm() {
    const sectionClass = 'border border-[#d6dde8] bg-white px-3 py-3';
    const sectionTitleClass = 'mb-3 text-[11px] font-semibold uppercase tracking-wide text-[#243041]';
    const rowClass = 'grid grid-cols-[112px_minmax(0,1fr)] items-center gap-3 py-1.5';
    const compactInput = 'h-8 w-full rounded-none border border-[#cfd8e6] bg-white px-2 text-[12px] text-[#111827] outline-none focus:border-blue-500 font-[inherit]';
    const compactLabel = 'text-[12px] font-medium text-[#111827]';
    const productTypes = [
      { label: 'Single Product', active: !isMultiVariant && form.productType !== 'Bundle', action: () => { set('productType', 'Standard'); selectStockMode(0); } },
      { label: 'Product with Variants', active: isMultiVariant, action: () => { set('productType', 'Serialized'); selectStockMode(1); } },
      { label: 'Bundle / Kit', active: form.productType === 'Bundle', action: activateBundleMode },
    ];

    return (
      <div className="w-full bg-white">
        <div className={sectionClass}>
          <div className={sectionTitleClass}>Product Type</div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {productTypes.map((type) => (
              <label key={type.label} className="flex items-center gap-2 text-[12px] text-[#111827]">
                <input type="radio" checked={type.active} onChange={type.action} />
                <span>{type.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 py-3 xl:grid-cols-[1fr_0.9fr_1fr]">
          <div className={sectionClass}>
            <div className={sectionTitleClass}>Product Information</div>
            <div className="space-y-1">
              <div className={rowClass}>
                <label className={compactLabel}>Product Name *</label>
                <input ref={nameInputRef} className={compactInput} value={form.description} onChange={(e) => set('description', e.target.value)} />
              </div>
              <div className={rowClass}>
                <label className={compactLabel}>Brand *</label>
                <input className={compactInput} value={form.brand || ''} onChange={(e) => set('brand', e.target.value)} />
              </div>
              <div className={rowClass}>
                <label className={compactLabel}>Category *</label>
                <input className={compactInput} value={form.category || ''} onChange={(e) => set('category', e.target.value)} />
              </div>
              <div className={rowClass}>
                <label className={compactLabel}>Sub Category</label>
                <input className={compactInput} value={form.subCategory || ''} onChange={(e) => set('subCategory', e.target.value)} />
              </div>
              <div className="my-2 h-px bg-[#edf2f7]" />
              <div className={rowClass}>
                <label className={compactLabel}>Model No.</label>
                <input className={compactInput} value={form.modelNumber || ''} onChange={(e) => set('modelNumber', e.target.value)} />
              </div>
              <div className={rowClass}>
                <label className={compactLabel}>SKU</label>
                <input className={compactInput} value={form.code || ''} onChange={(e) => set('code', e.target.value)} />
              </div>
              <div className={rowClass}>
                <label className={compactLabel}>Barcode</label>
                <div className="grid grid-cols-[minmax(0,1fr)_72px]">
                  <input className={`${compactInput} border-r-0`} value={form.barcode} onChange={(e) => set('barcode', e.target.value)} />
                  <button type="button" className="inline-flex h-8 items-center justify-center gap-1 border border-[#cfd8e6] bg-white text-[11px] font-semibold text-[#243041] hover:bg-[#f8fafc] font-[inherit]" onClick={() => set('barcode', genBarcode())}>
                    <ScanLine size={13} />
                    Scan
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className={sectionClass}>
            <div className={sectionTitleClass}>Inventory</div>
            <div className="space-y-1">
              <div className="grid grid-cols-[112px_minmax(0,1fr)_minmax(0,1fr)] items-center gap-3 py-1.5">
                <label className={compactLabel}>Stock Tracking</label>
                <label className="flex items-center gap-2 text-[12px] font-medium text-[#111827]">
                  <input type="radio" checked={Boolean(form.serialTracking)} onChange={() => set('serialTracking', true)} />
                  Serial / IMEI
                </label>
                <label className="flex items-center gap-2 text-[12px] font-medium text-[#111827]">
                  <input type="radio" checked={!form.serialTracking} onChange={() => set('serialTracking', false)} />
                  Standard
                </label>
              </div>
              <div className={rowClass}>
                <label className={compactLabel}>Unit</label>
                <input className={compactInput} value={form.unit || ''} onChange={(e) => { set('unit', e.target.value); set('baseUnit', e.target.value); set('salesUnit', e.target.value); set('purchaseUnit', e.target.value); }} />
              </div>
              <div className={rowClass}>
                <label className={compactLabel}>{mode === 'add' ? 'Opening Stock' : 'Current Stock'}</label>
                <input className={`${compactInput} ${mode === 'edit' ? 'bg-[#f8fafc] text-[#94a3b8] cursor-not-allowed' : ''}`} type="number" min="0" value={form.stock} disabled={mode === 'edit'} onChange={(e) => set('stock', e.target.value)} />
              </div>
              <div className={rowClass}>
                <label className={compactLabel}>Low Stock Alert</label>
                <input className={compactInput} type="number" min="0" value={form.minStockLevel} onChange={(e) => set('minStockLevel', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div className={sectionClass}>
              <div className={sectionTitleClass}>Pricing</div>
              <div className="space-y-1">
                <div className={rowClass}>
                  <label className={compactLabel}>Purchase Price</label>
                  <input className={compactInput} type="number" min="0" step="0.01" value={form.purchasePrice} onChange={(e) => set('purchasePrice', e.target.value)} />
                </div>
                <div className={rowClass}>
                  <label className={compactLabel}>MRP</label>
                  <input className={compactInput} type="number" min="0" step="0.01" value={form.mrp} onChange={(e) => set('mrp', e.target.value)} />
                </div>
                <div className={rowClass}>
                  <label className={compactLabel}>Selling Price</label>
                  <input className={compactInput} type="number" min="0" step="0.01" value={form.rate} onChange={(e) => set('rate', e.target.value)} />
                </div>
              </div>
            </div>

            <div className={sectionClass}>
              <div className={sectionTitleClass}>Tax & Warranty</div>
              <div className="space-y-1">
                <div className="grid grid-cols-[112px_minmax(0,1fr)_70px_minmax(0,92px)] items-center gap-3 py-1.5">
                  <label className={compactLabel}>HSN</label>
                  <input className={compactInput} value={form.hsn || ''} onChange={(e) => set('hsn', e.target.value)} />
                  <label className={`${compactLabel} text-right`}>GST</label>
                  <input className={compactInput} inputMode="decimal" value={form.gstRate || ''} onChange={(e) => set('gstRate', e.target.value)} />
                </div>
                <div className={rowClass}>
                  <label className={compactLabel}>Warranty</label>
                  <input className={compactInput} value={form.warrantyPeriod || ''} onChange={(e) => set('warrantyPeriod', e.target.value)} />
                </div>
                <div className={rowClass}>
                  <label className={compactLabel}>Warranty Type</label>
                  <input className={compactInput} value={form.warrantyType || ''} onChange={(e) => set('warrantyType', e.target.value)} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderSingleFashionProductForm() {
    const sectionClass = 'border border-[#d6dde8] bg-white px-3 py-3';
    const sectionTitleClass = 'mb-2.5 text-[11px] font-bold uppercase tracking-wide text-[#0f172a]';
    const compactInput = 'h-8 w-full rounded-none border border-[#cfd8e6] bg-white px-2 text-[12px] text-[#111827] outline-none focus:border-blue-500 font-[inherit]';
    const compactButton = 'h-8 rounded-none border border-[#cfd8e6] bg-white px-2 text-[11px] font-semibold text-[#0f172a] hover:bg-[#f8fafc] font-[inherit]';
    const fieldLabel = 'mb-1 block text-[11px] font-semibold text-[#0f172a]';
    const productTypes = [
      { label: 'Single Product', active: !isMultiVariant && form.productType !== 'Bundle', action: () => { set('productType', 'Standard'); selectStockMode(0); } },
      { label: 'Product with Variants', active: isMultiVariant, action: () => { set('productType', 'Matrix'); selectStockMode(1); } },
    ];
    const updateUnit = (value) => {
      setForm((prev) => ({
        ...prev,
        unit: value,
        baseUnit: value,
        salesUnit: value,
        purchaseUnit: value,
        conversionToUnit: value,
      }));
    };
    const FieldBox = CompactFieldBox;

    return (
      <div className="mx-auto grid h-full w-full max-w-[1820px] grid-rows-[auto_minmax(0,1fr)_auto] gap-2 bg-white">
        <div className={sectionClass}>
          <div className={sectionTitleClass}>Product Type</div>
          <div className="grid grid-cols-1 gap-x-12 gap-y-2 md:grid-cols-2">
            {productTypes.map((type) => (
              <label key={type.label} className="flex items-center gap-2 text-[12px] font-medium text-[#111827]">
                <input type="radio" checked={type.active} onChange={type.action} />
                <span>{type.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid min-h-0 grid-cols-1 gap-2 xl:grid-cols-[1.2fr_0.9fr_0.9fr]">
          <div className="grid min-h-0 grid-rows-[auto_auto] gap-2">
            <div className={`${sectionClass} min-h-0`}>
              <div className={sectionTitleClass}>Product Information</div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <FieldBox label="Product Name" required className="md:col-span-2">
                  <input ref={nameInputRef} className={compactInput} value={form.description} onChange={(e) => set('description', e.target.value)} />
                </FieldBox>
                <FieldBox label="Brand" required>
                  <input className={compactInput} placeholder="Enter brand" value={form.brand || ''} onChange={(e) => set('brand', e.target.value)} />
                </FieldBox>
                <FieldBox label="Category" required>
                  <input className={compactInput} placeholder="Enter category" value={form.category || ''} onChange={(e) => set('category', e.target.value)} />
                </FieldBox>
                <FieldBox label="Sub Category">
                  <input className={compactInput} placeholder="Enter sub category" value={form.subCategory || ''} onChange={(e) => set('subCategory', e.target.value)} />
                </FieldBox>
                <FieldBox label="Product Code">
                  <input className={compactInput} value={form.code || ''} onChange={(e) => set('code', e.target.value)} />
                </FieldBox>
                <FieldBox label="Barcode" className="md:col-span-2">
                  <div className="grid grid-cols-[minmax(0,1fr)_74px]">
                    <input className={`${compactInput} border-r-0`} value={form.barcode || ''} onChange={(e) => set('barcode', e.target.value)} />
                    <button type="button" className={compactButton} onClick={() => set('barcode', genBarcode())}>
                      <span className="inline-flex items-center justify-center gap-1"><ScanLine size={12} />Scan</span>
                    </button>
                  </div>
                </FieldBox>
              </div>
            </div>

            <div className={sectionClass}>
              <div className={sectionTitleClass}>Product Attributes</div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <FieldBox label="Gender">
                  <input className={compactInput} placeholder="Enter gender" value={form.gender || ''} onChange={(e) => set('gender', e.target.value)} />
                </FieldBox>
                <FieldBox label="Collection">
                  <input className={compactInput} placeholder="Enter collection" value={form.collection || ''} onChange={(e) => set('collection', e.target.value)} />
                </FieldBox>
                <FieldBox label="Material">
                  <input className={compactInput} placeholder="Enter material" value={form.material || form.fabric || ''} onChange={(e) => { set('material', e.target.value); set('fabric', e.target.value); }} />
                </FieldBox>
                <FieldBox label="Pattern">
                  <input className={compactInput} placeholder="Enter pattern" value={form.pattern || ''} onChange={(e) => set('pattern', e.target.value)} />
                </FieldBox>
              </div>
            </div>
          </div>

          <div className="grid min-h-0 grid-rows-[auto_auto] gap-2">
            <div className={sectionClass}>
              <div className={sectionTitleClass}>Pricing</div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3 xl:grid-cols-1">
                <FieldBox label="Purchase Price" required>
                  <input className={compactInput} type="number" min="0" step="0.01" value={form.purchasePrice} onChange={(e) => set('purchasePrice', e.target.value)} />
                </FieldBox>
                <FieldBox label="MRP">
                  <input className={compactInput} type="number" min="0" step="0.01" value={form.mrp} onChange={(e) => set('mrp', e.target.value)} />
                </FieldBox>
                <FieldBox label="Selling Price">
                  <input className={compactInput} type="number" min="0" step="0.01" value={form.rate} onChange={(e) => set('rate', e.target.value)} />
                </FieldBox>
              </div>
            </div>

            <div className={sectionClass}>
              <div className={sectionTitleClass}>Inventory</div>
              <div className="mb-2 flex flex-wrap items-center gap-x-6 gap-y-1">
                <span className={fieldLabel}>Stock Tracking</span>
                <label className="flex items-center gap-2 text-[12px] font-medium text-[#111827]">
                  <input type="radio" checked={!form.batchTracking} onChange={() => { set('batchTracking', false); set('serialTracking', false); }} />
                  Standard
                </label>
                <label className="flex items-center gap-2 text-[12px] font-medium text-[#111827]">
                  <input type="radio" checked={Boolean(form.batchTracking)} onChange={() => { set('batchTracking', true); set('serialTracking', false); }} />
                  Batch / Lot
                </label>
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3 xl:grid-cols-1">
                <FieldBox label="Unit">
                  <input className={compactInput} placeholder="Enter unit" value={form.unit || ''} onChange={(e) => updateUnit(e.target.value)} />
                </FieldBox>
                <FieldBox label={mode === 'add' ? 'Opening Stock' : 'Current Stock'}>
                  <input className={`${compactInput} ${mode === 'edit' ? 'bg-[#f8fafc] text-[#94a3b8] cursor-not-allowed' : ''}`} type="number" min="0" value={form.stock} disabled={mode === 'edit'} onChange={(e) => set('stock', e.target.value)} />
                </FieldBox>
                <FieldBox label="Low Stock Alert">
                  <input className={compactInput} type="number" min="0" value={form.minStockLevel} onChange={(e) => set('minStockLevel', e.target.value)} />
                </FieldBox>
              </div>
            </div>
          </div>

          <div className="grid min-h-0 grid-rows-[auto] gap-2">
            <div className={sectionClass}>
              <div className={sectionTitleClass}>Tax & Other</div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <FieldBox label="HSN">
                  <input className={compactInput} value={form.hsn || ''} onChange={(e) => set('hsn', e.target.value)} />
                </FieldBox>
                <FieldBox label="GST">
                  <input className={compactInput} inputMode="decimal" placeholder="Enter GST rate" value={form.gstRate} onChange={(e) => set('gstRate', e.target.value)} />
                </FieldBox>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-[#d6dde8] bg-white px-3 py-2">
          <button type="button" onClick={onClose} className="h-9 rounded-md border border-[#d6dde8] bg-white px-4 text-[12px] font-semibold text-[#374151] cursor-pointer hover:bg-[#f8fafc] font-[inherit]">Cancel</button>
          <button type="submit" disabled={saving} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-blue-600 bg-blue-600 px-4 text-[12px] font-semibold text-white cursor-pointer hover:bg-blue-700 disabled:opacity-60 font-[inherit]">
            <Save size={13} />
            {saving ? 'Saving...' : 'Save Product'}
          </button>
        </div>
      </div>
    );
  }

  function renderFashionVariantProductForm() {
    const sectionClass = 'border border-[#d6dde8] bg-white px-3 py-3';
    const sectionTitleClass = 'mb-2.5 text-[11px] font-bold uppercase tracking-wide text-[#0f172a]';
    const compactInput = 'h-8 w-full rounded-none border border-[#cfd8e6] bg-white px-2 text-[12px] text-[#111827] outline-none focus:border-blue-500 font-[inherit]';
    const compactButton = 'inline-flex h-8 items-center justify-center gap-1.5 rounded-none border border-[#cfd8e6] bg-white px-3 text-[11px] font-semibold text-[#0f172a] hover:bg-[#f8fafc] font-[inherit]';
    const fieldLabel = 'mb-1 block text-[11px] font-semibold text-[#0f172a]';
    const productTypes = [
      { label: 'Single Product', active: !isMultiVariant && form.productType !== 'Bundle', action: () => { set('productType', 'Standard'); selectStockMode(0); } },
      { label: 'Product with Variants', active: isMultiVariant, action: () => { set('productType', 'Matrix'); selectStockMode(1); } },
    ];
    const variantRows = form.variants || [];
    const updateUnit = (value) => setForm((prev) => ({ ...prev, unit: value, baseUnit: value, salesUnit: value, purchaseUnit: value, conversionToUnit: value }));
    const FieldBox = CompactFieldBox;
    const addFashionVariant = () => {
      setForm((prev) => ({
        ...prev,
        productType: 'Matrix',
        variants: [
          ...(prev.variants || []),
          {
            size: '',
            modelName: '',
            modelCode: '',
            colour: '',
            barcode: '',
            purchasePrice: Number(prev.purchasePrice) || 0,
            mrp: Number(prev.mrp) || 0,
            rate: Number(prev.rate) || 0,
            stock: 0,
            minStockLevel: Number(prev.minStockLevel) || 0,
          },
        ],
      }));
    };
    const variantSku = (variant = {}, idx = 0) => String(variant.modelCode || `${form.code || ''}${form.code ? '-' : ''}${idx + 1}`).trim();

    return (
      <div className="mx-auto grid w-full max-w-[1820px] grid-cols-1 gap-2 bg-white pb-3">
        <div className={sectionClass}>
          <div className={sectionTitleClass}>Product Type</div>
          <div className="grid grid-cols-1 gap-x-12 gap-y-2 md:grid-cols-2">
            {productTypes.map((type) => (
              <label key={type.label} className="flex items-center gap-2 text-[12px] font-medium text-[#111827]">
                <input type="radio" checked={type.active} onChange={type.action} />
                <span>{type.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid min-h-0 grid-cols-1 gap-2 xl:grid-cols-[1.2fr_0.9fr_0.9fr]">
          <div className="grid min-h-0 grid-rows-[auto_auto] gap-2">
            <div className={sectionClass}>
              <div className={sectionTitleClass}>Product Information</div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <FieldBox label="Product Name" required className="md:col-span-2">
                  <input ref={nameInputRef} className={compactInput} value={form.description} onChange={(e) => set('description', e.target.value)} />
                </FieldBox>
                <FieldBox label="Brand" required>
                  <input className={compactInput} placeholder="Enter brand" value={form.brand || ''} onChange={(e) => set('brand', e.target.value)} />
                </FieldBox>
                <FieldBox label="Category" required>
                  <input className={compactInput} placeholder="Enter category" value={form.category || ''} onChange={(e) => set('category', e.target.value)} />
                </FieldBox>
                <FieldBox label="Sub Category">
                  <input className={compactInput} placeholder="Enter sub category" value={form.subCategory || ''} onChange={(e) => set('subCategory', e.target.value)} />
                </FieldBox>
                <FieldBox label="Product Code">
                  <input className={compactInput} value={form.code || ''} onChange={(e) => set('code', e.target.value)} />
                </FieldBox>
                <FieldBox label="Barcode" className="md:col-span-2">
                  <div className="grid grid-cols-[minmax(0,1fr)_74px]">
                    <input className={`${compactInput} border-r-0`} value={form.barcode || ''} onChange={(e) => set('barcode', e.target.value)} />
                    <button type="button" className={compactButton} onClick={() => set('barcode', genBarcode())}><ScanLine size={12} />Scan</button>
                  </div>
                </FieldBox>
              </div>
            </div>

            <div className={sectionClass}>
              <div className={sectionTitleClass}>Product Attributes</div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <FieldBox label="Gender"><input className={compactInput} placeholder="Enter gender" value={form.gender || ''} onChange={(e) => set('gender', e.target.value)} /></FieldBox>
                <FieldBox label="Collection"><input className={compactInput} placeholder="Enter collection" value={form.collection || ''} onChange={(e) => set('collection', e.target.value)} /></FieldBox>
                <FieldBox label="Material"><input className={compactInput} placeholder="Enter material" value={form.material || form.fabric || ''} onChange={(e) => { set('material', e.target.value); set('fabric', e.target.value); }} /></FieldBox>
                <FieldBox label="Pattern"><input className={compactInput} placeholder="Enter pattern" value={form.pattern || ''} onChange={(e) => set('pattern', e.target.value)} /></FieldBox>
              </div>
            </div>
          </div>

          <div className="grid min-h-0 grid-rows-[auto_auto] gap-2">
            <div className={sectionClass}>
              <div className={sectionTitleClass}>Pricing</div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3 xl:grid-cols-1">
                <FieldBox label="Purchase Price" required><input className={compactInput} type="number" min="0" step="0.01" value={form.purchasePrice} onChange={(e) => set('purchasePrice', e.target.value)} /></FieldBox>
                <FieldBox label="MRP"><input className={compactInput} type="number" min="0" step="0.01" value={form.mrp} onChange={(e) => set('mrp', e.target.value)} /></FieldBox>
                <FieldBox label="Selling Price"><input className={compactInput} type="number" min="0" step="0.01" value={form.rate} onChange={(e) => set('rate', e.target.value)} /></FieldBox>
              </div>
            </div>

            <div className={sectionClass}>
              <div className={sectionTitleClass}>Inventory</div>
              <div className="mb-2 flex flex-wrap items-center gap-x-6 gap-y-1">
                <span className={fieldLabel}>Stock Tracking</span>
                <label className="flex items-center gap-2 text-[12px] font-medium text-[#111827]"><input type="radio" checked={!form.batchTracking} onChange={() => { set('batchTracking', false); set('serialTracking', false); }} />Standard</label>
                <label className="flex items-center gap-2 text-[12px] font-medium text-[#111827]"><input type="radio" checked={Boolean(form.batchTracking)} onChange={() => { set('batchTracking', true); set('serialTracking', false); }} />Batch / Lot</label>
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-1">
                <FieldBox label="Unit"><input className={compactInput} placeholder="Enter unit" value={form.unit || ''} onChange={(e) => updateUnit(e.target.value)} /></FieldBox>
                <FieldBox label="Low Stock Alert"><input className={compactInput} type="number" min="0" value={form.minStockLevel} onChange={(e) => set('minStockLevel', e.target.value)} /></FieldBox>
              </div>
            </div>
          </div>

          <div className="grid min-h-0 grid-rows-[auto] gap-2">
            <div className={sectionClass}>
              <div className={sectionTitleClass}>Tax & Other</div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <FieldBox label="HSN"><input className={compactInput} value={form.hsn || ''} onChange={(e) => set('hsn', e.target.value)} /></FieldBox>
                <FieldBox label="GST"><input className={compactInput} inputMode="decimal" placeholder="Enter GST rate" value={form.gstRate} onChange={(e) => set('gstRate', e.target.value)} /></FieldBox>
              </div>
            </div>
          </div>
        </div>

        <div className={sectionClass}>
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className={sectionTitleClass}>Variants</div>
            <div className="flex gap-2">
              <button type="button" className={compactButton} onClick={addFashionVariant}>+ Add Variant</button>
            </div>
          </div>

          <div className="overflow-hidden border border-[#d6dde8]">
            <table className="w-full border-collapse text-[12px]">
              <thead className="bg-[#f1f5f9]">
                <tr>
                  <th className="border-b border-[#d6dde8] px-2 py-2 text-left font-semibold">#</th>
                  <th className="border-b border-[#d6dde8] px-2 py-2 text-left font-semibold">Size</th>
                  <th className="border-b border-[#d6dde8] px-2 py-2 text-left font-semibold">Color</th>
                  <th className="border-b border-[#d6dde8] px-2 py-2 text-left font-semibold">SKU</th>
                  <th className="border-b border-[#d6dde8] px-2 py-2 text-left font-semibold">Barcode</th>
                  <th className="border-b border-[#d6dde8] px-2 py-2 text-right font-semibold">Price</th>
                  <th className="border-b border-[#d6dde8] px-2 py-2 text-right font-semibold">Stock</th>
                  <th className="border-b border-[#d6dde8] px-2 py-2 text-center font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {variantRows.map((variant, idx) => (
                  <tr key={idx}>
                    <td className="border-b border-[#edf2f7] px-2 py-1.5">{idx + 1}</td>
                    <td className="border-b border-[#edf2f7] px-2 py-1.5"><input className={compactInput} value={variant.size || ''} onChange={(e) => updateVariant(idx, 'size', e.target.value)} /></td>
                    <td className="border-b border-[#edf2f7] px-2 py-1.5"><input className={compactInput} value={variant.colour || ''} onChange={(e) => updateVariant(idx, 'colour', e.target.value)} /></td>
                    <td className="border-b border-[#edf2f7] px-2 py-1.5"><input className={compactInput} value={variantSku(variant, idx)} onChange={(e) => updateVariant(idx, 'modelCode', e.target.value)} /></td>
                    <td className="border-b border-[#edf2f7] px-2 py-1.5">
                      <div className="grid grid-cols-[minmax(0,1fr)_34px]">
                        <input className={`${compactInput} border-r-0`} value={variant.barcode || ''} onChange={(e) => updateVariant(idx, 'barcode', e.target.value)} />
                        <button type="button" className="h-8 border border-[#cfd8e6] bg-white text-blue-600" onClick={() => updateVariant(idx, 'barcode', genBarcode())}><ScanLine size={12} className="mx-auto" /></button>
                      </div>
                    </td>
                    <td className="border-b border-[#edf2f7] px-2 py-1.5"><input className={`${compactInput} text-right`} type="number" min="0" step="0.01" value={variant.rate ?? ''} onChange={(e) => updateVariant(idx, 'rate', e.target.value)} /></td>
                    <td className="border-b border-[#edf2f7] px-2 py-1.5"><input className={`${compactInput} text-right`} type="number" min="0" value={variant.stock ?? 0} onChange={(e) => updateVariant(idx, 'stock', e.target.value)} /></td>
                    <td className="border-b border-[#edf2f7] px-2 py-1.5 text-center">
                      <button type="button" className="inline-flex h-7 w-7 items-center justify-center border border-[#d6dde8] bg-white text-red-500" onClick={() => removeVariant(idx)}><TrashIcon /></button>
                    </td>
                  </tr>
                ))}
                {!variantRows.length && <tr><td colSpan={8} className="px-3 py-6 text-center text-[12px] text-[#536173]">No variants added</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  function renderCompactVariantElectronicsProductForm() {
    const sectionClass = 'border border-[#d6dde8] bg-white px-3 py-3';
    const sectionTitleClass = 'mb-3 text-[11px] font-semibold uppercase tracking-wide text-[#243041]';
    const rowClass = 'grid grid-cols-[96px_minmax(0,1fr)] items-center gap-2 py-1.5';
    const compactInput = 'h-8 w-full rounded-none border border-[#cfd8e6] bg-white px-2 text-[12px] text-[#111827] outline-none focus:border-blue-500 font-[inherit]';
    const compactLabel = 'text-[12px] font-medium text-[#111827]';
    const productTypes = [
      { label: 'Single Product', active: !isMultiVariant && form.productType !== 'Bundle', action: () => { set('productType', 'Standard'); selectStockMode(0); } },
      { label: 'Product with Variants', active: isMultiVariant, action: () => { set('productType', 'Serialized'); selectStockMode(1); } },
      { label: 'Bundle / Kit', active: form.productType === 'Bundle', action: activateBundleMode },
    ];
    const primaryVariant = (form.variants || [])[0] || {};
    const setProductAndVariant = (field, value, variantField = field) => {
      set(field, value);
      updateVariant(0, variantField, value);
    };
    const variantRows = (form.variants || []).length ? form.variants : [primaryVariant];
    const setCompactVariant = (idx, field, value, productField = field) => {
      updateVariant(idx, field, value);
      if (idx === 0) set(productField, value);
    };
    const addCompactVariant = () => {
      setForm((f) => ({
        ...f,
        variants: [
          ...(f.variants || []),
          {
            size: '',
            modelName: '',
            modelCode: '',
            processor: '',
            ram: '',
            storage: '',
            colour: '',
            display: '',
            graphics: '',
            operatingSystem: '',
            barcode: '',
            purchasePrice: Number(f.purchasePrice) || 0,
            mrp: Number(f.mrp) || 0,
            rate: Number(f.rate) || 0,
            stock: 0,
            minStockLevel: Number(f.minStockLevel) || 0,
          },
        ],
      }));
    };

    return (
      <div className="w-full bg-white">
        <div className={sectionClass}>
          <div className={sectionTitleClass}>Product Type</div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {productTypes.map((type) => (
              <label key={type.label} className="flex items-center gap-2 text-[12px] text-[#111827]">
                <input type="radio" checked={type.active} onChange={type.action} />
                <span>{type.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 py-3 xl:grid-cols-[0.9fr_1.35fr_0.9fr]">
        <div className={sectionClass}>
          <div className={sectionTitleClass}>Product Information</div>
          <div className="space-y-1">
            <div className={rowClass}>
              <label className={compactLabel}>Product Name *</label>
              <input ref={nameInputRef} className={compactInput} value={form.description} onChange={(e) => set('description', e.target.value)} />
            </div>
            <div className={rowClass}>
              <label className={compactLabel}>Brand *</label>
              <input className={compactInput} value={form.brand || ''} onChange={(e) => set('brand', e.target.value)} />
            </div>
            <div className={rowClass}>
              <label className={compactLabel}>Category *</label>
              <input className={compactInput} value={form.category || ''} onChange={(e) => set('category', e.target.value)} />
            </div>
            <div className={rowClass}>
              <label className={compactLabel}>Sub Category</label>
              <input className={compactInput} value={form.subCategory || ''} onChange={(e) => set('subCategory', e.target.value)} />
            </div>
            <div className="my-2 h-px bg-[#edf2f7]" />
            <div className={rowClass}>
              <label className={compactLabel}>Model No.</label>
              <input className={compactInput} value={form.modelNumber || ''} onChange={(e) => setProductAndVariant('modelNumber', e.target.value, 'modelCode')} />
            </div>
            <div className={rowClass}>
              <label className={compactLabel}>SKU</label>
              <input className={compactInput} value={form.code || ''} onChange={(e) => set('code', e.target.value)} />
            </div>
            <div className={rowClass}>
              <label className={compactLabel}>Barcode</label>
              <div className="grid grid-cols-[minmax(0,1fr)_72px]">
                <input className={`${compactInput} border-r-0`} value={primaryVariant.barcode || form.barcode} onChange={(e) => setProductAndVariant('barcode', e.target.value)} />
                <button type="button" className="inline-flex h-8 items-center justify-center gap-1 border border-[#cfd8e6] bg-white text-[11px] font-semibold text-[#243041] hover:bg-[#f8fafc] font-[inherit]" onClick={() => setProductAndVariant('barcode', genBarcode())}>
                  <ScanLine size={13} />
                  Scan
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className={`${sectionClass} xl:row-span-3`}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className={sectionTitleClass.replace('mb-3 ', '')}>Variant</div>
            <button type="button" onClick={addCompactVariant} className="border border-[#cfd8e6] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#111827] hover:bg-[#f8fafc] font-[inherit]">
              + Add More
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-1">
            {variantRows.map((variant, idx) => (
              <div key={idx} className="border border-[#edf2f7] bg-[#fbfdff] px-2 py-2">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-[#536173]">Variant {idx + 1}</div>
                  {variantRows.length > 1 && (
                    <button type="button" onClick={() => removeVariant(idx)} className="border-0 bg-transparent px-1 text-[11px] font-semibold text-red-500 cursor-pointer font-[inherit]">
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-x-3 gap-y-1 md:grid-cols-2 xl:grid-cols-1">
                  <div className={rowClass}>
                    <label className={compactLabel}>Model No.</label>
                    <input className={compactInput} value={variant.modelCode || ''} onChange={(e) => setCompactVariant(idx, 'modelCode', e.target.value, 'modelNumber')} />
                  </div>
                  <div className={rowClass}>
                    <label className={compactLabel}>Variant SKU</label>
                    <input className={compactInput} value={variant.modelName || ''} onChange={(e) => setCompactVariant(idx, 'modelName', e.target.value)} />
                  </div>
                  <div className={rowClass}>
                    <label className={compactLabel}>Barcode</label>
                    <div className="grid grid-cols-[minmax(0,1fr)_72px]">
                      <input className={`${compactInput} border-r-0`} value={variant.barcode || ''} onChange={(e) => setCompactVariant(idx, 'barcode', e.target.value)} />
                      <button type="button" className="inline-flex h-8 items-center justify-center gap-1 border border-[#cfd8e6] bg-white text-[11px] font-semibold text-[#243041] hover:bg-[#f8fafc] font-[inherit]" onClick={() => setCompactVariant(idx, 'barcode', genBarcode())}>
                        <ScanLine size={13} />
                        Scan
                      </button>
                    </div>
                  </div>
                  <div className={rowClass}>
                    <label className={compactLabel}>Storage</label>
                    <input className={compactInput} value={variant.storage || ''} onChange={(e) => setCompactVariant(idx, 'storage', e.target.value)} />
                  </div>
                  <div className={rowClass}>
                    <label className={compactLabel}>RAM</label>
                    <input className={compactInput} value={variant.ram || ''} onChange={(e) => setCompactVariant(idx, 'ram', e.target.value)} />
                  </div>
                  <div className={rowClass}>
                    <label className={compactLabel}>Color</label>
                    <input className={compactInput} value={variant.colour || ''} onChange={(e) => setCompactVariant(idx, 'colour', e.target.value)} />
                  </div>
                  <div className={rowClass}>
                    <label className={compactLabel}>Stock Count</label>
                    <input className={compactInput} type="number" min="0" value={variant.stock ?? ''} onChange={(e) => setCompactVariant(idx, 'stock', e.target.value)} />
                  </div>
                  <div className={rowClass}>
                    <label className={compactLabel}>Purchase Price</label>
                    <input className={compactInput} type="number" min="0" step="0.01" value={variant.purchasePrice ?? ''} onChange={(e) => setCompactVariant(idx, 'purchasePrice', e.target.value)} />
                  </div>
                  <div className={rowClass}>
                    <label className={compactLabel}>MRP</label>
                    <input className={compactInput} type="number" min="0" step="0.01" value={variant.mrp ?? ''} onChange={(e) => setCompactVariant(idx, 'mrp', e.target.value)} />
                  </div>
                  <div className={rowClass}>
                    <label className={compactLabel}>Selling Price</label>
                    <input className={compactInput} type="number" min="0" step="0.01" value={variant.rate ?? ''} onChange={(e) => setCompactVariant(idx, 'rate', e.target.value)} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={sectionClass}>
          <div className={sectionTitleClass}>Inventory</div>
          <div className="space-y-1">
            <div className="grid grid-cols-[112px_minmax(0,1fr)_minmax(0,1fr)] items-center gap-3 py-1.5">
              <label className={compactLabel}>Stock Tracking</label>
              <label className="flex items-center gap-2 text-[12px] font-medium text-[#111827]">
                <input type="radio" checked={Boolean(form.serialTracking)} onChange={() => set('serialTracking', true)} />
                Serial / IMEI
              </label>
              <label className="flex items-center gap-2 text-[12px] font-medium text-[#111827]">
                <input type="radio" checked={!form.serialTracking} onChange={() => set('serialTracking', false)} />
                Standard
              </label>
            </div>
            <div className={rowClass}>
              <label className={compactLabel}>Unit</label>
              <input className={compactInput} value={form.unit || ''} onChange={(e) => { set('unit', e.target.value); set('baseUnit', e.target.value); set('salesUnit', e.target.value); set('purchaseUnit', e.target.value); }} />
            </div>
            <div className={rowClass}>
              <label className={compactLabel}>Total Stock</label>
              <input className={`${compactInput} bg-[#f8fafc] text-[#536173]`} type="number" min="0" value={variantTotalStock} readOnly />
            </div>
            <div className={rowClass}>
              <label className={compactLabel}>Low Stock Alert</label>
              <input className={compactInput} type="number" min="0" value={primaryVariant.minStockLevel ?? form.minStockLevel} onChange={(e) => setProductAndVariant('minStockLevel', e.target.value)} />
            </div>
          </div>
        </div>

        <div className={sectionClass}>
          <div className={sectionTitleClass}>Pricing</div>
          <div className="space-y-1">
            <div className={rowClass}>
              <label className={compactLabel}>Purchase Price</label>
              <input className={compactInput} type="number" min="0" step="0.01" value={primaryVariant.purchasePrice ?? form.purchasePrice} onChange={(e) => setProductAndVariant('purchasePrice', e.target.value)} />
            </div>
            <div className={rowClass}>
              <label className={compactLabel}>MRP</label>
              <input className={compactInput} type="number" min="0" step="0.01" value={primaryVariant.mrp ?? form.mrp} onChange={(e) => setProductAndVariant('mrp', e.target.value)} />
            </div>
            <div className={rowClass}>
              <label className={compactLabel}>Selling Price</label>
              <input className={compactInput} type="number" min="0" step="0.01" value={primaryVariant.rate ?? form.rate} onChange={(e) => setProductAndVariant('rate', e.target.value)} />
            </div>
          </div>
        </div>

        <div className={sectionClass}>
          <div className={sectionTitleClass}>Tax & Warranty</div>
          <div className="space-y-1">
            <div className="grid grid-cols-[112px_minmax(0,1fr)_70px_minmax(0,92px)] items-center gap-3 py-1.5">
              <label className={compactLabel}>HSN</label>
              <input className={compactInput} value={form.hsn || ''} onChange={(e) => set('hsn', e.target.value)} />
              <label className={`${compactLabel} text-right`}>GST</label>
              <input className={compactInput} inputMode="decimal" value={form.gstRate || ''} onChange={(e) => set('gstRate', e.target.value)} />
            </div>
            <div className={rowClass}>
              <label className={compactLabel}>Warranty</label>
              <input className={compactInput} value={form.warrantyPeriod || ''} onChange={(e) => set('warrantyPeriod', e.target.value)} />
            </div>
            <div className={rowClass}>
              <label className={compactLabel}>Warranty Type</label>
              <input className={compactInput} value={form.warrantyType || ''} onChange={(e) => set('warrantyType', e.target.value)} />
            </div>
          </div>
        </div>
        </div>
      </div>
    );
  }

  function renderElectronicsServiceForm() {
    const isFashionService = isFashionRetail && isService;
    const serviceInput = 'h-8 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[12px] font-medium text-[#0f172a] outline-none transition-colors focus:border-blue-500 focus:shadow-[inset_0_0_0_1px_#3b82f6] font-[inherit]';
    const serviceTextarea = `${serviceInput} min-h-14 py-2 resize-y`;
    const serviceLabel = 'mb-1 block text-[11px] font-semibold text-[#0f172a]';
    const serviceHelp = 'mt-1 text-[10.5px] font-medium text-[#64748b]';
    const serviceSection = 'rounded-lg border border-[#dbe4ef] bg-white p-3 shadow-sm';
    const serviceTitle = 'mb-2 flex items-center gap-2 text-[12px] font-extrabold uppercase text-[#0f172a]';
    const iconWrap = (tone) => `inline-flex h-6 w-6 items-center justify-center rounded-md ${tone}`;
    const serviceWarrantyText = form.serviceWarranty === true ? 'Yes' : form.serviceWarranty === false ? '' : form.serviceWarranty;
    const renderInputWithIcon = ({ icon: Icon, value, onChange, placeholder = '', type = 'text', inputMode }) => (
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" size={14} />
        <input className={`${serviceInput} pl-8`} type={type} inputMode={inputMode} value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      </div>
    );

    return (
      <div className="grid grid-cols-1 gap-2 xl:grid-cols-3">
        <section className={serviceSection}>
          <div className={serviceTitle}>
            <span className={iconWrap('bg-blue-50 text-blue-600')}><Package size={14} /></span>
            Service Information
          </div>
          <div className="grid grid-cols-1 gap-2">
            <div>
              <label className={serviceLabel}>Service Name *</label>
              <input ref={nameInputRef} className={serviceInput} value={form.description} onChange={(e) => set('description', e.target.value)} />
            </div>
            <div>
              <label className={serviceLabel}>Category *</label>
              {renderInputWithIcon({ icon: ClipboardList, value: form.category, onChange: (value) => set('category', value), placeholder: 'Enter category' })}
            </div>
            <div>
              <label className={serviceLabel}>Service Code</label>
              <input className={serviceInput} value={form.code || ''} onChange={(e) => set('code', e.target.value)} />
              <p className={serviceHelp}>Unique code for this service</p>
            </div>
            <div>
              <label className={serviceLabel}>Service Type *</label>
              {renderInputWithIcon({ icon: Wrench, value: form.serviceType || form.type, onChange: (value) => { set('serviceType', value); set('type', value); }, placeholder: 'Enter service type' })}
            </div>
            <div>
              <label className={serviceLabel}>SAC Code</label>
              <input className={serviceInput} value={form.hsn || ''} onChange={(e) => set('hsn', e.target.value)} />
              <p className={serviceHelp}>Service Accounting Code (SAC)</p>
            </div>
            <div>
              <label className={serviceLabel}>Description</label>
              <textarea className={serviceTextarea} value={form.productDescription || ''} onChange={(e) => set('productDescription', e.target.value)} />
            </div>
          </div>
        </section>

        <section className={serviceSection}>
          <div className={serviceTitle}>
            <span className={iconWrap('bg-violet-50 text-violet-600')}><Wrench size={14} /></span>
            Service Details
          </div>
          <div className="grid grid-cols-1 gap-2">
            {isFashionService ? (
              <>
                <div>
                  <label className={serviceLabel}>Service Sub Category *</label>
                  <input className={serviceInput} value={form.subCategory || ''} onChange={(e) => set('subCategory', e.target.value)} placeholder="Enter service sub category" />
                </div>
                <div>
                  <label className={serviceLabel}>Applicable For</label>
                  <input className={serviceInput} value={form.applicableFor || ''} onChange={(e) => set('applicableFor', e.target.value)} placeholder="Enter applicable garment" />
                </div>
                <div>
                  <label className={serviceLabel}>Gender</label>
                  <input className={serviceInput} value={form.gender || ''} onChange={(e) => set('gender', e.target.value)} placeholder="Enter gender" />
                </div>
                <div>
                  <label className={serviceLabel}>Fabric Type (Optional)</label>
                  <input className={serviceInput} value={form.fabric || ''} onChange={(e) => set('fabric', e.target.value)} placeholder="Cotton, Silk, Georgette, Linen" />
                </div>
                <div>
                  <label className={serviceLabel}>Estimated Time</label>
                  {renderInputWithIcon({ icon: Clock, value: form.estimatedTime, onChange: (value) => set('estimatedTime', value), placeholder: 'Enter estimated time' })}
                </div>
                <div>
                  <label className={serviceLabel}>Deliverable</label>
                  <input className={serviceInput} value={form.deliverable || ''} onChange={(e) => set('deliverable', e.target.value)} placeholder="Enter deliverable" />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className={serviceLabel}>Device Type</label>
                  {renderInputWithIcon({ icon: Laptop, value: form.subCategory, onChange: (value) => set('subCategory', value), placeholder: 'Enter device type' })}
                </div>
                <div>
                  <label className={serviceLabel}>Brand / Model</label>
                  <input className={serviceInput} value={form.brand || ''} onChange={(e) => set('brand', e.target.value)} />
                </div>
                <div>
                  <label className={serviceLabel}>Estimated Time</label>
                  {renderInputWithIcon({ icon: Clock, value: form.estimatedTime, onChange: (value) => set('estimatedTime', value), placeholder: 'Enter estimated time' })}
                </div>
                <div>
                  <label className={serviceLabel}>Technician</label>
                  {renderInputWithIcon({ icon: User, value: form.technician, onChange: (value) => set('technician', value), placeholder: 'Enter technician' })}
                </div>
              </>
            )}
          </div>
        </section>

        <div className="flex flex-col gap-2">
          <section className={serviceSection}>
            <div className={serviceTitle}>
              <span className={iconWrap('bg-emerald-50 text-emerald-600')}><Tag size={14} /></span>
              Pricing & Tax
            </div>
            <div className="grid grid-cols-1 gap-2">
              <div>
                <label className={serviceLabel}>Service Charge (Rs) *</label>
                <div className="relative">
                  <IndianRupee className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" size={13} />
                  <input className={`${serviceInput} pl-8`} type="number" min="0" step="0.01" value={form.rate} onChange={(e) => set('rate', e.target.value)} />
                </div>
              </div>
              <div>
                <label className={serviceLabel}>Discount (%)</label>
                <div className="relative">
                  <Percent className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" size={13} />
                  <input className={`${serviceInput} pl-8`} type="number" min="0" max="100" step="0.01" value={form.maxDiscount || ''} onChange={(e) => set('maxDiscount', e.target.value)} />
                </div>
              </div>
              <div>
                <label className={serviceLabel}>GST Rate *</label>
                <input className={serviceInput} inputMode="decimal" value={form.gstRate || ''} onChange={(e) => set('gstRate', e.target.value)} placeholder="Enter GST rate" />
              </div>
              <div>
                <label className={`${serviceLabel} flex items-center gap-1`}>Inclusive of Tax <Info size={12} className="text-[#64748b]" /></label>
                <button type="button" className={`relative mt-2 inline-flex h-5 w-9 items-center rounded-full border-0 transition-colors ${form.taxType === 'Tax Inclusive' ? 'bg-blue-600' : 'bg-[#cbd5e1]'}`} onClick={() => set('taxType', form.taxType === 'Tax Inclusive' ? 'Tax Exclusive' : 'Tax Inclusive')} aria-pressed={form.taxType === 'Tax Inclusive'}>
                  <span className={`block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${form.taxType === 'Tax Inclusive' ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>
          </section>

          <section className={serviceSection}>
            <div className={serviceTitle}>
              <span className={iconWrap('bg-orange-50 text-orange-600')}><ShieldCheck size={14} /></span>
              Warranty / After Service
            </div>
            <div className="grid grid-cols-1 gap-2">
              <div>
                <label className={serviceLabel}>Service Warranty</label>
                {renderInputWithIcon({ icon: ShieldCheck, value: serviceWarrantyText, onChange: (value) => set('serviceWarranty', value), placeholder: 'Enter Yes or No' })}
              </div>
              <div>
                <label className={serviceLabel}>Warranty Period</label>
                {renderInputWithIcon({ icon: Calendar, value: form.warrantyPeriod, onChange: (value) => set('warrantyPeriod', value), placeholder: 'Enter warranty period' })}
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  function renderHomeLivingServiceForm() {
    const serviceInput = 'h-9 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[12px] font-medium text-[#0f172a] outline-none transition-colors focus:border-blue-500 focus:shadow-[inset_0_0_0_1px_#3b82f6] font-[inherit]';
    const serviceTextarea = `${serviceInput} min-h-18 py-2 resize-y`;
    const serviceLabel = 'mb-1 block text-[11px] font-semibold text-[#0f172a]';
    const serviceHelp = 'mt-1 text-[10.5px] font-medium text-[#64748b]';
    const serviceSection = 'rounded-lg border border-[#dbe4ef] bg-white p-4 shadow-sm';
    const serviceTitle = 'mb-3 flex items-center gap-2 text-[12px] font-extrabold uppercase text-[#0f172a]';
    const iconWrap = (tone) => `inline-flex h-6 w-6 items-center justify-center rounded-md ${tone}`;
    const serviceWarrantyText = form.serviceWarranty === true ? 'Yes' : form.serviceWarranty === false ? 'No' : form.serviceWarranty;
    return (
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className={serviceSection}>
          <div className={serviceTitle}>
            <span className={iconWrap('bg-blue-50 text-blue-600')}><Package size={14} /></span>
            Service Information
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className={serviceLabel}>Service Name *</label>
              <input ref={nameInputRef} className={serviceInput} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Home Deep Cleaning" />
            </div>
            <div>
              <label className={serviceLabel}>Category *</label>
              <input className={serviceInput} value={form.category || ''} onChange={(e) => set('category', e.target.value)} placeholder="Home & Living" />
            </div>
            <div>
              <label className={serviceLabel}>Service Type *</label>
              <input className={serviceInput} value={form.serviceType || form.type || ''} onChange={(e) => { set('serviceType', e.target.value); set('type', e.target.value); }} placeholder="Home Service" />
            </div>
            <div>
              <label className={serviceLabel}>Service Code</label>
              <input className={serviceInput} value={form.code || ''} onChange={(e) => set('code', e.target.value)} placeholder="HSRV-001" />
              <p className={serviceHelp}>Unique code for this service</p>
            </div>
            <div>
              <label className={serviceLabel}>Estimated Time</label>
              <input className={serviceInput} value={form.estimatedTime || ''} onChange={(e) => set('estimatedTime', e.target.value)} placeholder="3 Hours" />
            </div>
            <div>
              <label className={serviceLabel}>SAC Code</label>
              <input className={serviceInput} value={form.hsn || ''} onChange={(e) => set('hsn', e.target.value)} placeholder="998533" />
              <p className={serviceHelp}>Service Accounting Code (SAC)</p>
            </div>
            <div>
              <label className={serviceLabel}>Description</label>
              <textarea className={serviceTextarea} value={form.productDescription || ''} onChange={(e) => set('productDescription', e.target.value)} placeholder="Professional service details..." />
            </div>
          </div>
        </section>

        <section className={serviceSection}>
          <div className={serviceTitle}>
            <span className={iconWrap('bg-violet-50 text-violet-600')}><Wrench size={14} /></span>
            Service Details
          </div>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className={serviceLabel}>Service Sub Category *</label>
              <input className={serviceInput} value={form.subCategory || ''} onChange={(e) => set('subCategory', e.target.value)} placeholder="Cleaning Services" />
            </div>
            <div>
              <label className={serviceLabel}>Service Mode</label>
              <div className="flex gap-5 py-1.5 text-[13px] font-medium text-[#0f172a]">
                {['On-site', 'In-store'].map((mode) => (
                  <label key={mode} className="inline-flex items-center gap-2">
                    <input type="radio" checked={(form.serviceMode || 'On-site') === mode} onChange={() => set('serviceMode', mode)} />
                    {mode}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className={serviceLabel}>Applicable For</label>
              <input className={serviceInput} value={form.applicableFor || ''} onChange={(e) => set('applicableFor', e.target.value)} placeholder="Residential" />
            </div>
            <div>
              <label className={serviceLabel}>Service Area</label>
              <input className={serviceInput} value={form.serviceArea || ''} onChange={(e) => set('serviceArea', e.target.value)} placeholder="Within City" />
            </div>
            <div>
              <label className={serviceLabel}>Additional Charges (Rs)</label>
              <input className={serviceInput} type="number" min="0" step="0.01" value={form.additionalCharges || ''} onChange={(e) => set('additionalCharges', e.target.value)} placeholder="0.00" />
              <p className={serviceHelp}>Any extra charges apart from service charge</p>
            </div>
          </div>
        </section>

        <section className={serviceSection}>
          <div className={serviceTitle}>
            <span className={iconWrap('bg-emerald-50 text-emerald-600')}><Tag size={14} /></span>
            Pricing & Tax
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className={serviceLabel}>Service Charge (Rs) *</label>
              <input className={serviceInput} type="number" min="0" step="0.01" value={form.rate} onChange={(e) => set('rate', e.target.value)} placeholder="1500.00" />
            </div>
            <div>
              <label className={serviceLabel}>Discount (%)</label>
              <input className={serviceInput} type="number" min="0" max="100" step="0.01" value={form.maxDiscount || ''} onChange={(e) => set('maxDiscount', e.target.value)} placeholder="0" />
              <p className={serviceHelp}>Discount on service charge</p>
            </div>
            <div>
              <label className={serviceLabel}>GST Rate *</label>
              <input className={serviceInput} inputMode="decimal" value={form.gstRate || ''} onChange={(e) => set('gstRate', e.target.value)} placeholder="18" />
            </div>
            <div>
              <label className={`${serviceLabel} flex items-center gap-1`}>Inclusive of Tax <Info size={12} className="text-[#64748b]" /></label>
              <button type="button" className={`relative mt-2 inline-flex h-5 w-9 items-center rounded-full border-0 transition-colors ${form.taxType === 'Tax Inclusive' ? 'bg-blue-600' : 'bg-[#cbd5e1]'}`} onClick={() => set('taxType', form.taxType === 'Tax Inclusive' ? 'Tax Exclusive' : 'Tax Inclusive')} aria-pressed={form.taxType === 'Tax Inclusive'}>
                <span className={`block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${form.taxType === 'Tax Inclusive' ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>
        </section>

        <section className={serviceSection}>
          <div className={serviceTitle}>
            <span className={iconWrap('bg-pink-50 text-pink-600')}><Clock size={14} /></span>
            Service Options
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className={serviceLabel}>Preferred Date (Optional)</label>
              <input className={serviceInput} type="date" value={form.preferredDate || ''} onChange={(e) => set('preferredDate', e.target.value)} />
            </div>
            <div>
              <label className={serviceLabel}>Preferred Time (Optional)</label>
              <input className={serviceInput} type="time" value={form.preferredTime || ''} onChange={(e) => set('preferredTime', e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className={serviceLabel}>Special Instructions (Optional)</label>
              <textarea className={serviceTextarea} value={form.specialInstructions || ''} onChange={(e) => set('specialInstructions', e.target.value)} placeholder="Any instructions for the service provider..." />
              <p className={serviceHelp}>E.g. Gate code, floor number, key collection details etc.</p>
            </div>
          </div>
        </section>

        <section className={`${serviceSection} xl:col-span-2`}>
          <div className={serviceTitle}>
            <span className={iconWrap('bg-orange-50 text-orange-600')}><ShieldCheck size={14} /></span>
            Service / After-Service
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className={serviceLabel}>Warranty / Guarantee</label>
              <input className={serviceInput} value={serviceWarrantyText} onChange={(e) => set('serviceWarranty', e.target.value)} placeholder="No" />
            </div>
            <div>
              <label className={serviceLabel}>Warranty Period</label>
              <input className={serviceInput} value={form.warrantyPeriod || ''} onChange={(e) => set('warrantyPeriod', e.target.value)} placeholder="-" />
            </div>
          </div>
        </section>
      </div>
    );
  }

  function renderSpecialtyPersonalServiceForm() {
    const serviceInput = 'h-9 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[12px] font-medium text-[#0f172a] outline-none transition-colors focus:border-blue-500 focus:shadow-[inset_0_0_0_1px_#3b82f6] font-[inherit]';
    const serviceTextarea = `${serviceInput} min-h-20 py-2 resize-y`;
    const serviceLabel = 'mb-1 block text-[11px] font-semibold text-[#0f172a]';
    const serviceHelp = 'mt-1 text-[10.5px] font-medium text-[#64748b]';
    const serviceSection = 'rounded-lg border border-[#dbe4ef] bg-white p-4 shadow-sm';
    const serviceTitle = 'mb-3 flex items-center gap-2 text-[12px] font-extrabold uppercase';
    const iconWrap = (tone) => `inline-flex h-6 w-6 items-center justify-center rounded-md ${tone}`;
    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <section className={serviceSection}>
            <div className={`${serviceTitle} text-blue-600`}>
              <span className={iconWrap('bg-blue-50 text-blue-600')}><Package size={14} /></span>
              Service Information
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className={serviceLabel}>Service Name *</label>
                <input ref={nameInputRef} className={serviceInput} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Hair Spa Treatment" />
              </div>
              <div>
                <label className={serviceLabel}>Category *</label>
                <SelectDropdown value={form.category || 'Specialty & Personal Needs'} onChange={(value) => set('category', value)} options={['Specialty & Personal Needs', ...categoryOptions]} />
              </div>
              <div>
                <label className={serviceLabel}>Service Code</label>
                <input className={serviceInput} value={form.code || ''} onChange={(e) => set('code', e.target.value)} placeholder="SPN-001" />
                <p className={serviceHelp}>Unique code for this service</p>
              </div>
              <div>
                <label className={serviceLabel}>Service Type *</label>
                <SelectDropdown value={form.serviceType || form.type || 'Personal Care'} onChange={(value) => { set('serviceType', value); set('type', value); }} options={['Personal Care', 'Beauty', 'Wellness', 'Repair', 'Consultation']} />
              </div>
              <div>
                <label className={serviceLabel}>SAC Code</label>
                <input className={serviceInput} value={form.hsn || ''} onChange={(e) => set('hsn', e.target.value)} placeholder="998716" />
                <p className={serviceHelp}>Service Accounting Code (SAC)</p>
              </div>
              <div>
                <label className={serviceLabel}>Description</label>
                <textarea className={serviceTextarea} value={form.productDescription || ''} onChange={(e) => set('productDescription', e.target.value)} placeholder="Nourishing hair spa with steam..." />
              </div>
            </div>
          </section>

          <section className={serviceSection}>
            <div className={`${serviceTitle} text-violet-600`}>
              <span className={iconWrap('bg-violet-50 text-violet-600')}><Wrench size={14} /></span>
              Service Details
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className={serviceLabel}>Service Sub Category *</label>
                <SelectDropdown value={form.subCategory || ''} onChange={(value) => set('subCategory', value)} options={['Salon & Beauty', 'Health & Wellness', 'Baby Care', 'Pet Care', 'Optical Services', 'Gift Services']} />
              </div>
              <div>
                <label className={serviceLabel}>Applicable For</label>
                <SelectDropdown value={form.applicableFor || ''} onChange={(value) => set('applicableFor', value)} options={['Women', 'Men', 'Unisex', 'Kids', 'Senior']} />
              </div>
              <div>
                <label className={serviceLabel}>Service Mode</label>
                <div className="flex flex-wrap gap-5 py-1.5 text-[13px] font-medium text-[#0f172a]">
                  {['In-store', 'At Home', 'Online'].map((mode) => (
                    <label key={mode} className="inline-flex items-center gap-2">
                      <input type="radio" checked={(form.serviceMode || 'In-store') === mode} onChange={() => set('serviceMode', mode)} />
                      {mode}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className={serviceLabel}>Estimated Time</label>
                <SelectDropdown value={form.estimatedTime || ''} onChange={(value) => set('estimatedTime', value)} options={['30 Minutes', '45 Minutes', '60 Minutes', '90 Minutes', '2 Hours']} />
              </div>
              <div>
                <label className={serviceLabel}>Staff / Professional</label>
                <SelectDropdown value={form.staffProfessional || ''} onChange={(value) => set('staffProfessional', value)} options={['Any Available', 'Senior Professional', 'Specialist', 'Trainee']} />
              </div>
              <div>
                <label className={serviceLabel}>Age Group (Optional)</label>
                <SelectDropdown value={form.ageGroup || ''} onChange={(value) => set('ageGroup', value)} options={['18 Years & Above', 'Kids', 'Teen', 'Adult', 'Senior']} />
              </div>
              <div>
                <label className={serviceLabel}>Preparation / Notes (Optional)</label>
                <input className={serviceInput} value={form.preparationNotes || ''} onChange={(e) => set('preparationNotes', e.target.value)} placeholder="Any preparation required before service" />
              </div>
            </div>
          </section>

          <section className={serviceSection}>
            <div className={`${serviceTitle} text-emerald-600`}>
              <span className={iconWrap('bg-emerald-50 text-emerald-600')}><Tag size={14} /></span>
              Pricing & Tax
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className={serviceLabel}>Service Charge (Rs) *</label>
                <div className="relative">
                  <IndianRupee className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" size={13} />
                  <input className={`${serviceInput} pl-8`} type="number" min="0" step="0.01" value={form.rate} onChange={(e) => set('rate', e.target.value)} placeholder="1200.00" />
                </div>
              </div>
              <div>
                <label className={serviceLabel}>Discount (%)</label>
                <div className="relative">
                  <Percent className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" size={13} />
                  <input className={`${serviceInput} pl-8`} type="number" min="0" max="100" step="0.01" value={form.maxDiscount || ''} onChange={(e) => set('maxDiscount', e.target.value)} />
                </div>
                <p className={serviceHelp}>Discount on service charge</p>
              </div>
              <div>
                <label className={serviceLabel}>GST Rate *</label>
                <SelectDropdown value={String(form.gstRate ?? '')} onChange={(value) => set('gstRate', value)} options={GST_RATES.map((rate) => ({ value: String(rate), label: `${rate}%` }))} />
              </div>
              <div>
                <label className={`${serviceLabel} flex items-center gap-1`}>Inclusive of Tax <Info size={12} className="text-[#64748b]" /></label>
                <button type="button" className={`relative mt-2 inline-flex h-5 w-9 items-center rounded-full border-0 transition-colors ${form.taxType === 'Tax Inclusive' ? 'bg-blue-600' : 'bg-[#cbd5e1]'}`} onClick={() => set('taxType', form.taxType === 'Tax Inclusive' ? 'Tax Exclusive' : 'Tax Inclusive')} aria-pressed={form.taxType === 'Tax Inclusive'}>
                  <span className={`block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${form.taxType === 'Tax Inclusive' ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <section className={serviceSection}>
            <div className={`${serviceTitle} text-pink-600`}>
              <span className={iconWrap('bg-pink-50 text-pink-600')}><Clock size={14} /></span>
              Service Options
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className={serviceLabel}>Preferred Date (Optional)</label>
                <input className={serviceInput} type="date" value={form.preferredDate || ''} onChange={(e) => set('preferredDate', e.target.value)} />
              </div>
              <div>
                <label className={serviceLabel}>Preferred Time (Optional)</label>
                <input className={serviceInput} type="time" value={form.preferredTime || ''} onChange={(e) => set('preferredTime', e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label className={serviceLabel}>Repeatable Service</label>
                <SelectDropdown value={form.repeatableService || ''} onChange={(value) => set('repeatableService', value)} options={['One Time', 'Weekly', 'Monthly', 'Quarterly']} />
              </div>
              <div className="md:col-span-2">
                <label className={serviceLabel}>Special Instructions (Optional)</label>
                <textarea className={serviceTextarea} value={form.specialInstructions || ''} onChange={(e) => set('specialInstructions', e.target.value)} placeholder="Any special instructions for the service provider..." />
                <p className={serviceHelp}>E.g. Bring own towel, avoid applying oil, etc.</p>
              </div>
            </div>
          </section>

          <section className={serviceSection}>
            <div className={`${serviceTitle} text-orange-600`}>
              <span className={iconWrap('bg-orange-50 text-orange-600')}><ShieldCheck size={14} /></span>
              Warranty / After Service
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className={serviceLabel}>After Service Support</label>
                <SelectDropdown value={form.afterServiceSupport || ''} onChange={(value) => { set('afterServiceSupport', value); set('serviceWarranty', value); }} options={['Yes', 'No']} />
              </div>
              <div>
                <label className={serviceLabel}>Warranty / Guarantee Period</label>
                <SelectDropdown value={form.warrantyPeriod || ''} onChange={(value) => set('warrantyPeriod', value)} options={['7 Days', '15 Days', '30 Days', '3 Months', '6 Months']} />
              </div>
              <div className="md:col-span-2">
                <label className={serviceLabel}>Coverage Details (Optional)</label>
                <textarea className={serviceTextarea} value={form.coverageDetails || ''} onChange={(e) => set('coverageDetails', e.target.value)} placeholder="What is covered under warranty / guarantee?" />
                <p className={serviceHelp}>E.g. Re-treatment if not satisfied, free touch-up, etc.</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  function renderBusinessSpecialtyServiceForm() {
    const serviceInput = 'h-9 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[12px] font-medium text-[#0f172a] outline-none transition-colors focus:border-blue-500 focus:shadow-[inset_0_0_0_1px_#3b82f6] font-[inherit]';
    const serviceTextarea = `${serviceInput} min-h-20 py-2 resize-y`;
    const serviceLabel = 'mb-1 block text-[11px] font-semibold text-[#0f172a]';
    const serviceHelp = 'mt-1 text-[10.5px] font-medium text-[#64748b]';
    const serviceSection = 'rounded-lg border border-[#dbe4ef] bg-white p-4 shadow-sm';
    const serviceTitle = 'mb-3 flex items-center gap-2 text-[12px] font-extrabold uppercase';
    const iconWrap = (tone) => `inline-flex h-6 w-6 items-center justify-center rounded-md ${tone}`;

    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <section className={serviceSection}>
            <div className={`${serviceTitle} text-blue-600`}>
              <span className={iconWrap('bg-blue-50 text-blue-600')}><Package size={14} /></span>
              Service Information
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className={serviceLabel}>Service Name *</label>
                <input ref={nameInputRef} className={serviceInput} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Product Customization Service" />
              </div>
              <div>
                <label className={serviceLabel}>Category *</label>
                <SelectDropdown value={form.category || 'Business & Specialty Retail'} onChange={(value) => set('category', value)} options={['Business & Specialty Retail', ...categoryOptions]} />
              </div>
              <div>
                <label className={serviceLabel}>Service Code</label>
                <input className={serviceInput} value={form.code || ''} onChange={(e) => set('code', e.target.value)} placeholder="BSR-001" />
                <p className={serviceHelp}>Unique code for this service</p>
              </div>
              <div>
                <label className={serviceLabel}>Service Type *</label>
                <SelectDropdown value={form.serviceType || form.type || 'Customization'} onChange={(value) => { set('serviceType', value); set('type', value); }} options={['Customization', 'Repair', 'Installation', 'Consultation', 'Packaging']} />
              </div>
              <div>
                <label className={serviceLabel}>SAC Code</label>
                <input className={serviceInput} value={form.hsn || ''} onChange={(e) => set('hsn', e.target.value)} placeholder="998729" />
                <p className={serviceHelp}>Service Accounting Code (SAC)</p>
              </div>
              <div>
                <label className={serviceLabel}>Description</label>
                <textarea className={serviceTextarea} value={form.productDescription || ''} onChange={(e) => set('productDescription', e.target.value)} placeholder="Customize products as per customer requirements including size, color, and design." />
              </div>
            </div>
          </section>

          <section className={serviceSection}>
            <div className={`${serviceTitle} text-violet-600`}>
              <span className={iconWrap('bg-violet-50 text-violet-600')}><Wrench size={14} /></span>
              Service Details
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className={serviceLabel}>Service Sub Category *</label>
                <SelectDropdown value={form.subCategory || ''} onChange={(value) => set('subCategory', value)} options={['Product Customization', 'Printing & Branding', 'Packaging Service', 'Repair Service', 'Installation Service']} />
              </div>
              <div>
                <label className={serviceLabel}>Applicable For</label>
                <SelectDropdown value={form.applicableFor || ''} onChange={(value) => set('applicableFor', value)} options={['All Products', 'Office Supplies', 'Stationery', 'Packaging', 'Professional Tools', 'Specialty Goods']} />
              </div>
              <div>
                <label className={serviceLabel}>Service Mode</label>
                <div className="flex flex-wrap gap-5 py-1.5 text-[13px] font-medium text-[#0f172a]">
                  {['In-store', 'At Customer Location'].map((mode) => (
                    <label key={mode} className="inline-flex items-center gap-2">
                      <input type="radio" checked={(form.serviceMode || 'In-store') === mode} onChange={() => set('serviceMode', mode)} />
                      {mode}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className={serviceLabel}>Estimated Time</label>
                <SelectDropdown value={form.estimatedTime || ''} onChange={(value) => set('estimatedTime', value)} options={['Same Day', '1 Day', '2 - 3 Days', '3 - 5 Days', '1 Week']} />
              </div>
              <div>
                <label className={serviceLabel}>Staff / Expert</label>
                <SelectDropdown value={form.staffProfessional || ''} onChange={(value) => set('staffProfessional', value)} options={['Assign Later', 'Any Available', 'Senior Expert', 'Specialist']} />
              </div>
              <div>
                <label className={serviceLabel}>Requirements from Customer (Optional)</label>
                <textarea className={serviceTextarea} value={form.requirementsFromCustomer || ''} onChange={(e) => set('requirementsFromCustomer', e.target.value)} placeholder="Design files, reference images, or specifications (if any)." />
                <p className={serviceHelp}>What customer needs to provide</p>
              </div>
            </div>
          </section>

          <section className={serviceSection}>
            <div className={`${serviceTitle} text-emerald-600`}>
              <span className={iconWrap('bg-emerald-50 text-emerald-600')}><Tag size={14} /></span>
              Pricing & Tax
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className={serviceLabel}>Service Charge (Rs) *</label>
                <div className="relative">
                  <IndianRupee className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" size={13} />
                  <input className={`${serviceInput} pl-8`} type="number" min="0" step="0.01" value={form.rate} onChange={(e) => set('rate', e.target.value)} placeholder="750.00" />
                </div>
              </div>
              <div>
                <label className={serviceLabel}>Discount (%)</label>
                <div className="relative">
                  <Percent className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" size={13} />
                  <input className={`${serviceInput} pl-8`} type="number" min="0" max="100" step="0.01" value={form.maxDiscount || ''} onChange={(e) => set('maxDiscount', e.target.value)} placeholder="5" />
                </div>
                <p className={serviceHelp}>Discount on service charge</p>
              </div>
              <div>
                <label className={serviceLabel}>GST Rate *</label>
                <SelectDropdown value={String(form.gstRate ?? '')} onChange={(value) => set('gstRate', value)} options={GST_RATES.map((rate) => ({ value: String(rate), label: `${rate}%` }))} />
              </div>
              <div>
                <label className={`${serviceLabel} flex items-center gap-1`}>Inclusive of Tax <Info size={12} className="text-[#64748b]" /></label>
                <button type="button" className={`relative mt-2 inline-flex h-5 w-9 items-center rounded-full border-0 transition-colors ${form.taxType === 'Tax Inclusive' ? 'bg-blue-600' : 'bg-[#cbd5e1]'}`} onClick={() => set('taxType', form.taxType === 'Tax Inclusive' ? 'Tax Exclusive' : 'Tax Inclusive')} aria-pressed={form.taxType === 'Tax Inclusive'}>
                  <span className={`block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${form.taxType === 'Tax Inclusive' ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <section className={serviceSection}>
            <div className={`${serviceTitle} text-amber-500`}>
              <span className={iconWrap('bg-amber-50 text-amber-500')}><Clock size={14} /></span>
              Service Options
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className={serviceLabel}>Preferred Date (Optional)</label>
                <input className={serviceInput} type="date" value={form.preferredDate || ''} onChange={(e) => set('preferredDate', e.target.value)} />
              </div>
              <div>
                <label className={serviceLabel}>Preferred Time (Optional)</label>
                <input className={serviceInput} type="time" value={form.preferredTime || ''} onChange={(e) => set('preferredTime', e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label className={serviceLabel}>Repeatable Service</label>
                <SelectDropdown value={form.repeatableService || ''} onChange={(value) => set('repeatableService', value)} options={['One Time', 'Weekly', 'Monthly', 'Quarterly', 'As Needed']} />
              </div>
              <div className="md:col-span-2">
                <label className={serviceLabel}>Special Instructions (Optional)</label>
                <textarea className={serviceTextarea} value={form.specialInstructions || ''} onChange={(e) => set('specialInstructions', e.target.value)} placeholder="Any special instructions for the service provider..." />
                <p className={serviceHelp}>E.g. Handle with care, specific packaging, etc.</p>
              </div>
            </div>
          </section>

          <section className={serviceSection}>
            <div className={`${serviceTitle} text-pink-600`}>
              <span className={iconWrap('bg-pink-50 text-pink-600')}><ShieldCheck size={14} /></span>
              Warranty / After Service
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className={serviceLabel}>After Service Support</label>
                <SelectDropdown value={form.afterServiceSupport || ''} onChange={(value) => { set('afterServiceSupport', value); set('serviceWarranty', value); }} options={['Yes', 'No']} />
              </div>
              <div>
                <label className={serviceLabel}>Warranty / Guarantee Period</label>
                <SelectDropdown value={form.warrantyPeriod || ''} onChange={(value) => set('warrantyPeriod', value)} options={['7 Days', '15 Days', '30 Days', '3 Months', '6 Months']} />
              </div>
              <div className="md:col-span-2">
                <label className={serviceLabel}>Coverage Details (Optional)</label>
                <textarea className={serviceTextarea} value={form.coverageDetails || ''} onChange={(e) => set('coverageDetails', e.target.value)} placeholder="What is covered under warranty / guarantee?" />
                <p className={serviceHelp}>E.g. Rework if customization is not as per specifications.</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  function renderElectronicsProductTypeCards({ className = '' } = {}) {
    return (
      <Section title="Product Type" className={className}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { label: 'Single Product', active: !isMultiVariant && form.productType !== 'Bundle', action: () => { set('productType', 'Standard'); selectStockMode(0); }, helper: 'Create one product with one SKU' },
            { label: 'Product with Variants', active: isMultiVariant, action: () => { set('productType', 'Serialized'); selectStockMode(1); }, helper: 'Create multiple models under one family' },
            { label: 'Bundle / Kit', active: form.productType === 'Bundle', action: activateBundleMode, helper: 'Create a kit made from products' },
          ].map((type) => (
            <button key={type.label} type="button" onClick={type.action} className={`min-h-[78px] rounded-lg border p-3 text-left cursor-pointer font-[inherit] ${type.active ? 'border-blue-500 bg-blue-50 shadow-[0_0_0_1px_rgba(37,99,235,0.18)]' : 'border-[#dbe4ef] bg-white hover:bg-[#f8fafc]'}`}>
              <span className={`mb-2 block h-4 w-4 rounded-full border ${type.active ? 'border-blue-600 bg-blue-600 ring-4 ring-blue-100' : 'border-[#94a3b8] bg-white'}`} />
              <span className="block text-[13px] font-bold text-[#111827]">{type.label}</span>
              <span className="mt-1 hidden sm:block text-[12px] leading-5 text-[#536173]">{type.helper}</span>
            </button>
          ))}
        </div>
      </Section>
    );
  }

  function renderVariantElectronicsProductForm() {
    if (isMultiVariant) return renderCompactVariantElectronicsProductForm();

    return (
      <div className="mx-auto grid w-full max-w-[1820px] grid-cols-1 gap-3">
        {renderElectronicsProductTypeCards()}

        <Section title="Basic Information (Product Family)">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Field label="Product Name" required>
              <input ref={nameInputRef} className={INPUT} value={form.description} onChange={(e) => set('description', e.target.value)} />
            </Field>
            <Field label="Brand" required>
              <input className={INPUT} value={form.brand || ''} onChange={(e) => set('brand', e.target.value)} />
            </Field>
            <Field label="Category" required>
              <input className={INPUT} value={form.category || ''} onChange={(e) => set('category', e.target.value)} />
            </Field>
            <Field label="Sub Category" required>
              <input className={INPUT} value={form.subCategory || ''} onChange={(e) => set('subCategory', e.target.value)} />
            </Field>
            <Field label="Model Family" required>
              <input className={INPUT} value={form.modelFamily || ''} onChange={(e) => set('modelFamily', e.target.value)} />
            </Field>
            <Field label="Description">
              <textarea className={`${INPUT} min-h-20 resize-y`} value={form.productDescription || ''} onChange={(e) => set('productDescription', e.target.value)} />
            </Field>
          </div>
        </Section>

        <Section title="Variant Attributes">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-4 items-start">
            <div className="flex flex-col gap-3">
              <p className="m-0 text-[13px] text-[#536173]">Select attributes used to differentiate variants of this product.</p>
              <div className="flex flex-wrap gap-2">
                {ELECTRONICS_VARIANT_ATTRIBUTES.map((attr) => (
                  <label key={attr.key} className={`flex min-w-30 items-center gap-2 rounded-md border px-3 py-2 text-[13px] font-semibold cursor-pointer ${selectedVariantAttributes.includes(attr.key) ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-[#dbe4ef] bg-white text-[#374151]'}`}>
                    <input type="checkbox" checked={selectedVariantAttributes.includes(attr.key)} onChange={() => toggleVariantAttribute(attr.key)} />
                    {attr.label}
                  </label>
                ))}
              </div>
              <button type="button" className="self-start px-3 py-2 text-[12px] font-semibold text-blue-600 bg-white border border-blue-200 rounded-md cursor-pointer hover:bg-blue-50 font-[inherit]" onClick={() => toggleVariantAttribute('graphics')}>
                + Add Custom Attribute
              </button>
            </div>
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-[12px] leading-5 text-[#374151]">
              These attributes will be used to create and manage variants of this product.
            </div>
          </div>
        </Section>

        <Section title="Variants">
          <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
            <button type="button" onClick={addVariantRow} className="px-3 py-2 text-[12px] font-semibold text-blue-600 bg-white border border-blue-200 rounded-md cursor-pointer hover:bg-blue-50 font-[inherit]">+ Add Variant</button>
            <button type="button" onClick={generateVariantRows} className="px-3 py-2 text-[12px] font-semibold text-white bg-blue-600 border border-blue-600 rounded-md cursor-pointer hover:bg-blue-700 font-[inherit]">Generate Variants</button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-[#dbe4ef]">
            <table className="w-full min-w-[1280px] border-collapse text-[12px]">
              <thead className="bg-[#f3f7fc] text-[#0f2a66]">
                <tr>
                  <th className="border-b border-r border-[#dbe4ef] px-3 py-2 text-left">Variant Code</th>
                  {activeVariantAttributes.map((attr) => (
                    <th key={attr.key} className="border-b border-r border-[#dbe4ef] px-3 py-2 text-left">{attr.label}</th>
                  ))}
                  <th className="border-b border-r border-[#dbe4ef] px-3 py-2 text-left">SKU (Auto)</th>
                  <th className="border-b border-r border-[#dbe4ef] px-3 py-2 text-left">Barcode</th>
                  <th className="border-b border-r border-[#dbe4ef] px-3 py-2 text-right">Cost Price</th>
                  <th className="border-b border-r border-[#dbe4ef] px-3 py-2 text-right">Selling Price</th>
                  <th className="border-b border-r border-[#dbe4ef] px-3 py-2 text-right">MRP</th>
                  <th className="border-b border-r border-[#dbe4ef] px-3 py-2 text-right">Stock Count</th>
                  <th className="border-b border-[#dbe4ef] px-3 py-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {(form.variants || []).map((v, idx) => (
                  <tr key={idx} className="bg-white hover:bg-blue-50/40">
                    <td className="border-b border-r border-[#edf2f7] px-2 py-2">
                      <input className={INPUT} value={v.modelCode || ''} onChange={(e) => updateVariant(idx, 'modelCode', e.target.value)} />
                    </td>
                    {activeVariantAttributes.map((attr) => (
                      <td key={attr.key} className="border-b border-r border-[#edf2f7] px-2 py-2">
                        <input className={INPUT} value={v[attr.key] || ''} onChange={(e) => updateVariant(idx, attr.key, e.target.value)} />
                      </td>
                    ))}
                    <td className="border-b border-r border-[#edf2f7] px-2 py-2">
                      <input className={INPUT} value={v.modelName || ''} onChange={(e) => updateVariant(idx, 'modelName', e.target.value)} />
                    </td>
                    <td className="border-b border-r border-[#edf2f7] px-2 py-2">
                      <input className={INPUT} value={v.barcode || ''} onChange={(e) => updateVariant(idx, 'barcode', e.target.value)} />
                    </td>
                    <td className="border-b border-r border-[#edf2f7] px-2 py-2">
                      <input className={INPUT} type="number" min="0" step="0.01" value={v.purchasePrice ?? ''} onChange={(e) => updateVariant(idx, 'purchasePrice', e.target.value)} />
                    </td>
                    <td className="border-b border-r border-[#edf2f7] px-2 py-2">
                      <input className={INPUT} type="number" min="0" step="0.01" value={v.rate ?? ''} onChange={(e) => updateVariant(idx, 'rate', e.target.value)} />
                    </td>
                    <td className="border-b border-r border-[#edf2f7] px-2 py-2">
                      <input className={INPUT} type="number" min="0" step="0.01" value={v.mrp ?? ''} onChange={(e) => updateVariant(idx, 'mrp', e.target.value)} />
                    </td>
                    <td className="border-b border-r border-[#edf2f7] px-2 py-2">
                      <input className={INPUT} type="number" min="0" value={v.stock} onChange={(e) => updateVariant(idx, 'stock', e.target.value)} />
                    </td>
                    <td className="border-b border-[#edf2f7] px-2 py-2 text-center">
                      <button type="button" onClick={() => removeVariant(idx)} className="w-9 h-9 inline-flex items-center justify-center rounded hover:bg-red-50 text-red-400 bg-transparent border border-[#dbe4ef] cursor-pointer" title="Remove variant">
                        <TrashIcon />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 rounded-md border border-green-100 bg-green-50 px-3 py-2 text-[12px] font-medium text-green-700">
            You can manage stock, pricing, and barcode for each variant individually.
          </div>
        </Section>
      </div>
    );
  }

  function renderBundleElectronicsProductForm() {
    const rows = (form.bundleItems || []).length ? form.bundleItems : [blankBundleItem()];
    const bundleTotal = rows.reduce((sum, row) => sum + ((Number(row.qty) || 0) * (Number(row.unitPrice) || 0)), 0);
    const sectionClass = 'border border-[#d6dde8] bg-white px-3 py-3';
    const sectionTitleClass = 'mb-3 text-[11px] font-semibold uppercase tracking-wide text-[#243041]';
    const rowClass = 'grid grid-cols-[132px_minmax(0,1fr)] items-center gap-3 py-1.5';
    const compactInput = 'h-8 w-full rounded-none border border-[#cfd8e6] bg-white px-2 text-[12px] text-[#111827] outline-none focus:border-blue-500 font-[inherit]';
    const compactLabel = 'text-[12px] font-medium text-[#111827]';

    return (
      <div className="w-full bg-white">
        <div className={sectionClass}>
          <div className={sectionTitleClass}>Product Type</div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {[
              { label: 'Single Product', active: false, action: () => { set('productType', 'Standard'); selectStockMode(0); } },
              { label: 'Product with Variants', active: false, action: () => { set('productType', 'Serialized'); selectStockMode(1); } },
              { label: 'Bundle / Kit', active: true, action: activateBundleMode },
            ].map((type) => (
              <label key={type.label} className="flex items-center gap-2 text-[12px] text-[#111827]">
                <input type="radio" checked={type.active} onChange={type.action} />
                <span>{type.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 py-3 xl:grid-cols-[0.82fr_1.22fr_0.82fr]">
          <div className={sectionClass}>
            <div className={sectionTitleClass}>Product Information</div>
            <div className="space-y-1">
              <div className={rowClass}>
                <label className={compactLabel}>Bundle Name *</label>
                <input ref={nameInputRef} className={compactInput} value={form.description} onChange={(e) => set('description', e.target.value)} />
              </div>
              <div className={rowClass}>
                <label className={compactLabel}>SKU</label>
                <input className={compactInput} value={form.code || ''} onChange={(e) => set('code', e.target.value)} />
              </div>
              <div className={rowClass}>
                <label className={compactLabel}>Barcode</label>
                <div className="grid grid-cols-[minmax(0,1fr)_72px]">
                  <input className={`${compactInput} border-r-0`} value={form.barcode} onChange={(e) => set('barcode', e.target.value)} />
                  <button type="button" className="inline-flex h-8 items-center justify-center gap-1 border border-[#cfd8e6] bg-white text-[11px] font-semibold text-[#243041] hover:bg-[#f8fafc] font-[inherit]" onClick={() => set('barcode', genBarcode())}>
                    <ScanLine size={13} />
                    Scan
                  </button>
                </div>
              </div>
              <div className={rowClass}>
                <label className={compactLabel}>Category</label>
                <input className={compactInput} value={form.category || ''} onChange={(e) => set('category', e.target.value)} />
              </div>
            </div>
          </div>

          <div className={sectionClass}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className={sectionTitleClass.replace('mb-3 ', '')}>Bundle Items</div>
              <button type="button" onClick={addBundleItemRow} className="border border-[#cfd8e6] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#111827] hover:bg-[#f8fafc] font-[inherit]">
                + Add Product
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse font-mono text-[12px] text-[#111827]">
                <thead>
                  <tr className="border-y border-[#111827]">
                    <th className="px-1 py-2 text-left font-medium">Product</th>
                    <th className="w-24 px-1 py-2 text-left font-medium">Qty</th>
                    <th className="w-32 px-1 py-2 text-left font-medium">Price</th>
                    <th className="w-10 px-1 py-2 text-center font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={idx}>
                      <td className="px-1 py-1.5">
                        <input className="h-7 w-full border-0 border-b border-transparent bg-transparent px-0 font-mono text-[12px] outline-none focus:border-black" value={row.productName || ''} onChange={(e) => updateBundleItem(idx, 'productName', e.target.value)} />
                      </td>
                      <td className="px-1 py-1.5">
                        <input className="h-7 w-full border-0 border-b border-transparent bg-transparent px-0 font-mono text-[12px] outline-none focus:border-black" type="number" min="0" value={row.qty} onChange={(e) => updateBundleItem(idx, 'qty', e.target.value)} />
                      </td>
                      <td className="px-1 py-1.5">
                        <input className="h-7 w-full border-0 border-b border-transparent bg-transparent px-0 font-mono text-[12px] outline-none focus:border-black" type="number" min="0" step="0.01" value={row.unitPrice} onChange={(e) => updateBundleItem(idx, 'unitPrice', e.target.value)} />
                      </td>
                      <td className="px-1 py-1.5 text-center">
                        {rows.length > 1 && (
                          <button type="button" onClick={() => removeRow('bundleItems', idx)} className="border-0 bg-transparent text-[11px] font-semibold text-red-500 cursor-pointer font-[inherit]" title="Remove item">x</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div className={sectionClass}>
              <div className={sectionTitleClass}>Pricing</div>
              <div className="space-y-1">
                <div className={rowClass}>
                  <label className={compactLabel}>Bundle Purchase Cost</label>
                  <input className={compactInput} type="number" min="0" step="0.01" value={bundleTotal.toFixed(2)} readOnly />
                </div>
                <div className={rowClass}>
                  <label className={compactLabel}>Bundle Selling Price</label>
                  <input className={compactInput} type="number" min="0" step="0.01" value={form.rate || ''} onChange={(e) => set('rate', e.target.value)} />
                </div>
                <div className={rowClass}>
                  <label className={compactLabel}>MRP</label>
                  <input className={compactInput} type="number" min="0" step="0.01" value={form.mrp || ''} onChange={(e) => set('mrp', e.target.value)} />
                </div>
              </div>
            </div>

            <div className={sectionClass}>
              <div className={sectionTitleClass}>Tax</div>
              <div className="space-y-1">
                <div className={rowClass}>
                  <label className={compactLabel}>HSN</label>
                  <input className={compactInput} value={form.hsn || ''} onChange={(e) => set('hsn', e.target.value)} />
                </div>
                <div className={rowClass}>
                  <label className={compactLabel}>GST</label>
                  <input className={compactInput} inputMode="decimal" value={form.gstRate || ''} onChange={(e) => set('gstRate', e.target.value)} />
                </div>
              </div>
            </div>

            <div className={sectionClass}>
              <div className={sectionTitleClass}>Inventory</div>
              <div className="space-y-1">
                <div className={rowClass}>
                  <label className={compactLabel}>Bundle Stock Method</label>
                  <div className="space-y-1">
                    <label className="flex items-center gap-2 text-[12px] font-medium text-[#111827]">
                      <input type="radio" checked={Boolean(form.trackInventory)} onChange={() => set('trackInventory', true)} />
                      Based on Components
                    </label>
                    <label className="flex items-center gap-2 text-[12px] font-medium text-[#111827]">
                      <input type="radio" checked={!form.trackInventory} onChange={() => set('trackInventory', false)} />
                      Fixed Stock
                    </label>
                  </div>
                </div>
                {!form.trackInventory && (
                  <div className={rowClass}>
                    <label className={compactLabel}>Bundle Stock</label>
                    <input className={compactInput} type="number" min="0" value={form.stock || 0} onChange={(e) => set('stock', e.target.value)} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  function updateVariant(idx, field, value) {
    setForm((f) => ({
      ...f,
      variants: (f.variants || []).map((v, i) => (i === idx ? { ...v, [field]: value } : v)),
    }));
  }

  function removeVariant(idx) {
    setForm((f) => ({ ...f, variants: (f.variants || []).filter((_, i) => i !== idx) }));
  }

  useEffect(() => {
    if (!isElectronicsRetail) return;
    setForm((prev) => (
      prev.itemGroup === 'Electronics' && prev.itemType === 'Product'
        ? prev
        : { ...prev, ...electronicsFormDefaults(), itemGroup: 'Electronics', itemType: 'Product' }
    ));
  }, [isElectronicsRetail]);

  useEffect(() => {
    if (!isFashionRetail) return;
    setForm((prev) => (
      prev.itemGroup === 'Textile' && prev.itemType === 'Product'
        ? prev
        : { ...prev, ...fashionFormDefaults(), itemGroup: 'Textile', itemType: 'Product' }
    ));
  }, [isFashionRetail]);

  useEffect(() => {
    if (!isHomeLivingRetail) return;
    setForm((prev) => (
      prev.category === 'Home & Living' && prev.itemType === 'Product'
        ? prev
        : { ...prev, ...homeLivingFormDefaults(), itemGroup: 'General', itemType: 'Product' }
    ));
  }, [isHomeLivingRetail]);

  useEffect(() => {
    if (!isSpecialtyPersonalRetail) return;
    setForm((prev) => (
      prev.category === 'Specialty & Personal Needs' && prev.itemType === 'Product'
        ? prev
        : { ...prev, ...specialtyPersonalFormDefaults(), itemGroup: 'General', itemType: 'Product' }
    ));
  }, [isSpecialtyPersonalRetail]);

  useEffect(() => {
    if (!isBusinessSpecialtyRetail) return;
    setForm((prev) => (
      prev.category === 'Business & Specialty Retail' && prev.itemType === 'Product'
        ? prev
        : { ...prev, ...businessSpecialtyFormDefaults(), itemGroup: 'General', itemType: 'Product' }
    ));
  }, [isBusinessSpecialtyRetail]);

  useEffect(() => {
    if (!useFullScreenEditor) return;
    let active = true;
    api.invListProducts({ page: 1, limit: 100 })
      .then((res) => {
        if (!active) return;
        const rows = Array.isArray(res?.data) ? res.data : [];
        setBundleProductOptions(rows.filter((item) => item.productType !== 'Bundle'));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [useFullScreenEditor]);

  useEffect(() => {
    if (form.productType !== 'Bundle' || (form.bundleItems || []).length) return;
    setForm((prev) => ({ ...prev, bundleItems: [blankBundleItem()] }));
  }, [form.productType, form.bundleItems]);

  useEffect(() => {
    if (mode !== 'add') return;
    if (nextCode) {
      setForm((prev) => ({ ...prev, code: prev.code || nextCode }));
      return;
    }

    let active = true;
    api.invProductNextCode(isService ? { itemType: 'Service' } : undefined)
      .then(({ code }) => {
        if (!active || !code) return;
        setForm((prev) => ({ ...prev, code: prev.code || code }));
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [mode, nextCode, isService]);

  async function handleSubmit(e, saveAndNew = false) {
    e?.preventDefault?.();
    if (!form.description.trim()) return setErr(`${isService ? 'Service' : 'Product'} name is required`);
    const isBundle = form.productType === 'Bundle';
    const variantRows = isMultiVariant ? form.variants.filter((v) => variantDisplayName(v)) : [];
    const firstVariantRate = variantRows.find((v) => Number(v.rate) > 0)?.rate;
    const bundleRowsForRate = isBundle ? (form.bundleItems || []).filter((row) => String(row.productName || row.sku || '').trim()) : [];
    const bundleTotalForRate = bundleRowsForRate.reduce((sum, row) => sum + ((Number(row.qty) || 0) * (Number(row.unitPrice) || 0)), 0);
    const bundleDiscountValue = Number(form.bundleDiscount) || 0;
    const bundleDiscountForRate = form.bundleDiscountType === 'Amount'
      ? Math.min(bundleDiscountValue, bundleTotalForRate)
      : (bundleTotalForRate * Math.min(bundleDiscountValue, 100)) / 100;
    const bundleSuggestedRate = Math.max(0, bundleTotalForRate - bundleDiscountForRate);
    const baseRate = Number(form.rate || (isBundle ? bundleSuggestedRate : firstVariantRate) || 0);
    if (form.rate && Number(form.rate) < 0) return setErr('Valid sale price is required');
    if ((!isMultiVariant || !firstVariantRate) && (!form.rate || Number(form.rate) < 0)) return setErr('Valid sale price is required');
    if (isBundle) {
      const bundleRows = (form.bundleItems || []).filter((row) => String(row.productName || row.sku || '').trim());
      if (!bundleRows.length) return setErr('Add at least one bundle item');
      if (bundleRows.some((row) => Number(row.qty) <= 0)) return setErr('Bundle item quantity must be more than 0');
      if (bundleRows.some((row) => Number(row.unitPrice) < 0)) return setErr('Bundle item price must be 0 or more');
    }
    if (isMultiVariant) {
      const rows = variantRows;
      if (!rows.length) return setErr(`Add at least one ${variantKind} row`);
      const keys = rows.map((v) => [
        v.size,
        v.modelName,
        v.modelCode,
        v.storage,
        v.ram,
        v.colour,
        v.material,
        v.pattern,
        v.type,
        v.quality,
        v.ageGroup,
        v.other,
        v.barcode,
      ].map((part) => String(part || '').trim().toLowerCase()).join('|'));
      if (new Set(keys).size !== keys.length) return setErr(`${variantKind === 'size' ? 'Size' : 'Model'} names must be unique`);
      if (rows.some((v) => Number(v.stock) < 0)) return setErr(`Stock quantity must be 0 or more for every ${variantKind}`);
      if (rows.some((v) => Number(v.rate) < 0)) return setErr(`Sale price must be 0 or more for every ${variantKind}`);
    }
    setSaving(true);
    setErr('');
    try {
      const payload = {
        ...form,
        itemType: isService ? 'Service' : 'Product',
        trackInventory: isFoodGroceryRetail && !isService ? true : form.trackInventory,
        code: form.code?.trim() || nextCode || '',
        rate: baseRate,
        stock: isService || isBundle ? 0 : (isMultiVariant ? variantTotalStock : Number(form.stock)),
        minStockLevel: isService ? 0 : Number(form.minStockLevel),
        variants: isMultiVariant
          ? form.variants
              .filter((v) => variantDisplayName(v))
              .map((v) => ({
                size: String(v.size || '').trim(),
                modelName: String(v.modelName || '').trim(),
                modelCode: String(v.modelCode || '').trim(),
                processor: String(v.processor || '').trim(),
                ram: String(v.ram || '').trim(),
                storage: String(v.storage || '').trim(),
                colour: String(v.colour || '').trim(),
                material: String(v.material || '').trim(),
                pattern: String(v.pattern || '').trim(),
                type: String(v.type || '').trim(),
                quality: String(v.quality || '').trim(),
                ageGroup: String(v.ageGroup || '').trim(),
                other: String(v.other || '').trim(),
                display: String(v.display || '').trim(),
                graphics: String(v.graphics || '').trim(),
                operatingSystem: String(v.operatingSystem || '').trim(),
                purchasePrice: Number(v.purchasePrice) || 0,
                mrp: Number(v.mrp) || 0,
                rate: Number(v.rate) || 0,
                barcode: String(v.barcode || '').trim(),
                stock: Number(v.stock) || 0,
                minStockLevel: Number(v.minStockLevel) || 0,
              }))
          : [],
        bundleItems: isBundle
          ? (form.bundleItems || [])
              .filter((row) => String(row.productName || row.sku || '').trim())
              .map((row) => {
                const qty = Number(row.qty) || 0;
                const unitPrice = Number(row.unitPrice) || 0;
                return {
                  productId: String(row.productId || '').trim(),
                  productName: String(row.productName || '').trim(),
                  sku: String(row.sku || '').trim(),
                  qty,
                  unitPrice,
                  total: qty * unitPrice,
                };
              })
          : [],
        bundleDiscountType: form.bundleDiscountType || 'Percentage',
        bundleDiscount: Number(form.bundleDiscount) || 0,
        gstRate: Number(form.gstRate),
        purchasePrice: isBundle ? bundleTotalForRate : Number(form.purchasePrice) || 0,
        landingCost: Number(form.landingCost) || 0,
        mrp: Number(form.mrp) || 0,
        minSellingPrice: Number(form.minSellingPrice) || 0,
        openingStockValue: Number(form.openingStockValue) || 0,
        reorderLevel: Number(form.reorderLevel) || 0,
        maxStockLevel: Number(form.maxStockLevel) || 0,
        safetyStock: Number(form.safetyStock) || 0,
        conversionQty: Number(form.conversionQty) || 1,
        shelfLifeMonths: Number(form.shelfLifeMonths) || 0,
        expiryAlertDays: Number(form.expiryAlertDays) || 0,
        leadTimeDays: Number(form.leadTimeDays) || 0,
        minOrderQty: Number(form.minOrderQty) || 0,
        maxOrderQty: Number(form.maxOrderQty) || 0,
        maxDiscount: Number(form.maxDiscount) || 0,
        modelFamily: form.modelFamily || '',
        variantAttributes: submittedVariantAttributes,
        processor: form.processor || '',
        ram: form.ram || '',
        storage: form.storage || '',
        display: form.display || '',
        graphics: form.graphics || '',
        operatingSystem: form.operatingSystem || '',
        warrantyType: form.warrantyType || '',
        material: form.material || form.fabric || '',
        gender: form.gender || '',
        collection: form.collection || '',
        pattern: form.pattern || '',
      };
      const result = mode === 'add' ? await api.invCreateProduct(payload) : await api.invUpdateProduct(initial._id, payload);
      onSave(result, { keepOpen: saveAndNew });
      if (saveAndNew && mode === 'add') {
        setForm({ ...defaultForm, code: '', barcode: genBarcode() });
        setActiveTab('General');
        requestAnimationFrame(() => nameInputRef.current?.focus());
      }
    } catch (e) {
      setErr(e.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  }

  const shellClass = pageMode
    ? 'min-h-screen bg-[#f8fafc]'
    : useFullScreenEditor
      ? 'fixed inset-0 bg-[#f8fafc] z-50 flex flex-col'
      : 'fixed inset-0 bg-black/40 flex items-center justify-center z-50';
  const panelClass = pageMode
    ? 'w-full bg-white flex flex-col'
    : useFullScreenEditor
      ? 'bg-[#f8fafc] w-full h-full flex flex-col'
      : 'bg-white rounded-xl shadow-2xl w-full max-w-130 mx-4 max-h-[90vh] flex flex-col';
  const headerClass = pageMode
    ? 'flex items-center justify-between px-4 py-3.5 md:px-7 border-b border-[#edf2f7] flex-none'
    : useFullScreenEditor
      ? (isSpecialtyRetail ? 'flex items-center justify-between bg-white px-4 py-1.5 flex-none' : 'flex items-center justify-between bg-white px-3 py-1.5 flex-none')
      : 'flex items-center justify-between px-6 py-3.5 border-b border-[#edf2f7] flex-none';

  return (
    <div className={shellClass} onClick={(e) => !pageMode && !useFullScreenEditor && e.target === e.currentTarget && onClose()}>
      <div ref={modalRef} role={pageMode ? undefined : 'dialog'} aria-modal={pageMode ? undefined : 'true'} className={panelClass}>
        <div className={headerClass}>
          <div className={isSpecialtyRetail && useFullScreenEditor ? 'flex items-center gap-3' : ''}>
            {useFullScreenEditor ? (
              <>
                <button type="button" onClick={onClose} className={isSpecialtyRetail ? 'inline-flex h-8 w-8 items-center justify-center rounded-full border-0 bg-[#f8fafc] text-[#0f172a] cursor-pointer hover:bg-[#eef2f7] font-[inherit]' : 'inline-flex h-7 items-center gap-1.5 rounded-md border-0 bg-transparent px-1 text-[12px] font-semibold text-[#111827] cursor-pointer hover:bg-[#f1f5f9] hover:text-blue-700 font-[inherit]'}>
                  <ChevronLeft size={isSpecialtyRetail ? 18 : 15} />
                  {!isSpecialtyRetail && 'Products'}
                </button>
                {isSpecialtyRetail && (
                  <div>
                    <h2 className="m-0 text-[18px] font-bold leading-none text-[#0f172a]">Add Product</h2>
                  </div>
                )}
              </>
            ) : (
              <h2 className="text-[16px] font-bold text-[#111827]">
                {mode === 'add' ? (isService ? 'Add Service' : isElectronicsRetail ? `Add ${currentEntryName}` : 'Add Item') : `Edit ${currentEntryName}`}
              </h2>
            )}
            {isElectronicsRetail && !useFullScreenEditor && <p className="m-0 mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-blue-600">Electronics & Technology</p>}
          </div>
          <div className="flex items-center gap-2">
            {useFullScreenEditor && (
              <>
              <button type="button" onClick={onClose} className={isSpecialtyRetail ? 'h-8 rounded-md border border-[#cfd8e6] bg-white px-4 text-[13px] font-semibold text-[#0f172a] cursor-pointer hover:bg-[#f8fafc] font-[inherit]' : 'h-7 rounded-md border border-[#d6dde8] bg-white px-3 text-[12px] font-semibold text-[#374151] cursor-pointer hover:bg-[#f8fafc] font-[inherit]'}>
                Cancel
              </button>
              <button type="submit" form="product-form" disabled={saving} className={isSpecialtyRetail ? 'inline-flex h-8 items-center gap-1.5 rounded-md border border-blue-600 bg-blue-600 px-4 text-[13px] font-semibold text-white cursor-pointer hover:bg-blue-700 disabled:opacity-60 font-[inherit]' : 'inline-flex h-7 items-center gap-1.5 rounded-md border border-blue-600 bg-blue-600 px-3 text-[12px] font-semibold text-white cursor-pointer hover:bg-blue-700 disabled:opacity-60 font-[inherit]'}>
                <Save size={isSpecialtyRetail ? 14 : 12} />
                {saving ? 'Saving...' : isBundleElectronicsProduct ? 'Save Bundle' : 'Save Product'}
              </button>
              </>
            )}
            <button type="button" onClick={onClose} className={pageMode ? 'inline-flex items-center gap-1.5 rounded-md border border-[#dbe4ef] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#374151] cursor-pointer hover:bg-[#f8fafc] font-[inherit]' : useFullScreenEditor ? 'hidden' : 'text-[#536173] hover:text-[#111827] bg-transparent border-0 cursor-pointer text-lg leading-none'}>
              {pageMode ? 'Back' : useFullScreenEditor ? 'Back' : 'x'}
            </button>
            {pageMode && (
              <button type="submit" form="product-form" disabled={saving} className="inline-flex items-center gap-1.5 rounded-md border border-blue-600 bg-blue-600 px-4 py-1.5 text-[12px] font-semibold text-white cursor-pointer hover:bg-blue-700 disabled:opacity-60 font-[inherit]">
                <Save size={13} />
                {saving ? 'Saving...' : mode === 'add' ? 'Add Service' : 'Save Service'}
              </button>
            )}
          </div>
        </div>
        <form id="product-form" onSubmit={handleSubmit} className={pageMode ? 'flex flex-col' : 'flex flex-col flex-1 min-h-0'}>
          <div className="hidden">
            <div className="flex gap-1.5 overflow-x-auto pb-3">
              {PRODUCT_MASTER_TABS.map((tab) => (
                <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`px-3 py-1.5 rounded-md border text-[12px] font-semibold whitespace-nowrap cursor-pointer font-[inherit] ${activeTab === tab ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-[#dbe4ef] text-[#374151] hover:bg-blue-50'}`}>{tab}</button>
              ))}
            </div>
          </div>
          {activeTab !== 'General' && (
            <div className="px-6 py-4 overflow-y-auto flex-1">
              {err && <div className="mb-3 px-3 py-2 bg-red-50 text-red-600 text-[12px] rounded-md">{err}</div>}
          {activeTab === 'Units' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Section title="Unit Configuration">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Base Unit"><input className={INPUT} value={form.baseUnit || ''} onChange={(e) => { set('baseUnit', e.target.value); set('unit', e.target.value); }} /></Field>
                  <Field label="Sales Unit"><input className={INPUT} value={form.salesUnit || ''} onChange={(e) => set('salesUnit', e.target.value)} /></Field>
                  <Field label="Purchase Unit"><input className={INPUT} value={form.purchaseUnit || ''} onChange={(e) => set('purchaseUnit', e.target.value)} /></Field>
                  <Field label="Conversion"><div className="grid grid-cols-[1fr_1.2fr] gap-2"><input className={INPUT} type="number" min="0" value={form.conversionQty} onChange={(e) => set('conversionQty', e.target.value)} /><input className={INPUT} value={form.conversionToUnit || ''} onChange={(e) => set('conversionToUnit', e.target.value)} /></div></Field>
                  <ToggleField label="Is Weighable" checked={Boolean(form.isWeighable)} onChange={(v) => set('isWeighable', v)} />
                  <Field label="Sell By"><input className={INPUT} value={form.sellBy || ''} onChange={(e) => set('sellBy', e.target.value)} /></Field>
                </div>
              </Section>
              <Section title="Packing Configuration">
                <div className="flex flex-col gap-2">
                  {(form.packingRows || []).map((row, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_80px_1fr_36px] gap-2">
                      <input className={INPUT} value={row.pack || ''} onChange={(e) => setRow('packingRows', idx, 'pack', e.target.value)} />
                      <input className={INPUT} type="number" min="0" value={row.quantity || ''} onChange={(e) => setRow('packingRows', idx, 'quantity', e.target.value)} />
                      <input className={INPUT} value={row.barcode || ''} onChange={(e) => setRow('packingRows', idx, 'barcode', e.target.value)} />
                      <button type="button" className="w-9 h-9 rounded border border-[#dbe4ef] text-red-400 bg-white cursor-pointer" onClick={() => removeRow('packingRows', idx)}><TrashIcon /></button>
                    </div>
                  ))}
                  <button type="button" className="px-3 py-2 rounded-md border border-blue-100 bg-blue-50 text-blue-700 text-[12px] font-semibold cursor-pointer font-[inherit]" onClick={() => addRow('packingRows', { pack: '', quantity: '', barcode: '' })}>+ Add Packing</button>
                </div>
              </Section>
            </div>
          )}

          {activeTab === 'Barcode' && (
            <Section title="Barcode / SKU">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="SKU / Item Code"><input className={INPUT} value={form.code || ''} onChange={(e) => set('code', e.target.value)} /></Field>
                <Field label="Barcode Type"><input className={INPUT} value={form.barcodeType || ''} onChange={(e) => set('barcodeType', e.target.value)} /></Field>
                <Field label="Barcode"><div className="flex gap-1.5"><input className={INPUT} value={form.barcode} onChange={(e) => set('barcode', e.target.value)} />{mode === 'add' && <button type="button" title="Generate Barcode" onClick={() => set('barcode', genBarcode())} className="px-2 border border-[#dbe4ef] rounded-md text-[#536173] hover:bg-gray-50 bg-white cursor-pointer text-[13px] font-semibold">Gen</button>}</div></Field>
                <Field label="UPC"><input className={INPUT} value={form.upc || ''} onChange={(e) => set('upc', e.target.value)} /></Field>
                <Field label="EAN"><input className={INPUT} value={form.ean || ''} onChange={(e) => set('ean', e.target.value)} /></Field>
                <Field label="Alias Code"><input className={INPUT} value={form.aliasCode || ''} onChange={(e) => set('aliasCode', e.target.value)} /></Field>
                <Field label="Manufacturer Part Number"><input className={INPUT} value={form.manufacturerPartNumber || ''} onChange={(e) => set('manufacturerPartNumber', e.target.value)} /></Field>
              </div>
            </Section>
          )}

          {activeTab === 'Pricing' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Section title="Main Pricing">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Purchase Price"><input className={INPUT} type="number" min="0" value={form.purchasePrice} onChange={(e) => set('purchasePrice', e.target.value)} /></Field>
                  <Field label="Landing Cost"><input className={INPUT} type="number" min="0" value={form.landingCost} onChange={(e) => set('landingCost', e.target.value)} /></Field>
                  <Field label="MRP"><input className={INPUT} type="number" min="0" value={form.mrp} onChange={(e) => set('mrp', e.target.value)} /></Field>
                  <Field label="Selling Price"><input className={INPUT} type="number" min="0" value={form.rate} onChange={(e) => set('rate', e.target.value)} /></Field>
                  <Field label="Minimum Selling Price"><input className={INPUT} type="number" min="0" value={form.minSellingPrice} onChange={(e) => set('minSellingPrice', e.target.value)} /></Field>
                </div>
              </Section>
              <Section title="Price Lists">
                <div className="flex flex-col gap-2">
                  {PRICE_LIST_NAMES.map((name) => {
                    const list = form.priceLists || [];
                    const idx = list.findIndex((p) => p.name === name);
                    const row = idx >= 0 ? list[idx] : {};
                    return <div key={name} className="grid grid-cols-[1fr_120px] gap-2 items-center"><span className="text-[13px] font-medium text-[#374151]">{name}</span><input className={INPUT} type="number" min="0" value={row.price || ''} onChange={(e) => idx >= 0 ? setRow('priceLists', idx, 'price', e.target.value) : addRow('priceLists', { name, price: e.target.value })} /></div>;
                  })}
                </div>
              </Section>
            </div>
          )}

          {activeTab === 'Tax' && (
            <Section title="GST / Tax">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label={isService ? 'SAC Code' : 'HSN Code'}><input className={INPUT} value={form.hsn || ''} onChange={(e) => set('hsn', e.target.value)} /></Field>
                <Field label="GST Rate"><input className={INPUT} inputMode="decimal" value={form.gstRate || ''} onChange={(e) => set('gstRate', e.target.value)} /></Field>
                <Field label="Tax Type"><input className={INPUT} value={form.taxType || ''} onChange={(e) => set('taxType', e.target.value)} /></Field>
                <div className="rounded-md bg-blue-50 border border-blue-100 p-3 text-[13px] text-blue-800">CGST: {Number(form.gstRate || 0) / 2}%</div>
                <div className="rounded-md bg-blue-50 border border-blue-100 p-3 text-[13px] text-blue-800">SGST: {Number(form.gstRate || 0) / 2}%</div>
                <div className="rounded-md bg-blue-50 border border-blue-100 p-3 text-[13px] text-blue-800">IGST: {Number(form.gstRate || 0)}%</div>
              </div>
            </Section>
          )}

          {activeTab === 'Inventory' && (
            <Section title="Inventory Configuration">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <ToggleField label="Track Inventory" checked={Boolean(form.trackInventory)} onChange={(v) => set('trackInventory', v)} />
                <Field label={mode === 'add' ? 'Opening Stock' : 'Current Stock'}><input className={`${INPUT} ${mode === 'edit' ? 'bg-[#f8fafc] text-[#94a3b8] cursor-not-allowed' : ''}`} type="number" min="0" value={form.stock} disabled={mode === 'edit'} onChange={(e) => set('stock', e.target.value)} /></Field>
                <Field label="Opening Stock Value"><input className={INPUT} type="number" min="0" value={form.openingStockValue} onChange={(e) => set('openingStockValue', e.target.value)} /></Field>
                <Field label="Reorder Level"><input className={INPUT} type="number" min="0" value={form.reorderLevel} onChange={(e) => set('reorderLevel', e.target.value)} /></Field>
                <Field label="Minimum Stock"><input className={INPUT} type="number" min="0" value={form.minStockLevel} onChange={(e) => set('minStockLevel', e.target.value)} /></Field>
                <Field label="Maximum Stock"><input className={INPUT} type="number" min="0" value={form.maxStockLevel} onChange={(e) => set('maxStockLevel', e.target.value)} /></Field>
                <Field label="Safety Stock"><input className={INPUT} type="number" min="0" value={form.safetyStock} onChange={(e) => set('safetyStock', e.target.value)} /></Field>
                <Field label="Warehouse"><input className={INPUT} value={form.warehouse || ''} onChange={(e) => set('warehouse', e.target.value)} /></Field>
              </div>
            </Section>
          )}

          {activeTab === 'Advanced' && (
            <Section title="Advanced Inventory / Matrix">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                <ToggleField label="Batch Tracking" checked={Boolean(form.batchTracking)} onChange={(v) => set('batchTracking', v)} />
                <ToggleField label="Expiry Tracking" checked={Boolean(form.expiryTracking)} onChange={(v) => set('expiryTracking', v)} />
                <ToggleField label="Serial Tracking" checked={Boolean(form.serialTracking)} onChange={(v) => set('serialTracking', v)} />
                <Field label="Shelf Life Months"><input className={INPUT} type="number" min="0" value={form.shelfLifeMonths} onChange={(e) => set('shelfLifeMonths', e.target.value)} /></Field>
                <Field label="Expiry Alert Days"><input className={INPUT} type="number" min="0" value={form.expiryAlertDays} onChange={(e) => set('expiryAlertDays', e.target.value)} /></Field>
                <Field label="Serial / IMEI Number"><input className={INPUT} value={form.serialNumber || ''} onChange={(e) => set('serialNumber', e.target.value)} /></Field>
              </div>
              {!isService && isRetail && <div className="mb-3"><label className={LABEL}>Stock Tracking</label><div className={TOGGLE_WRAP} onKeyDown={(e) => handleToggleArrowKeys(e, selectStockMode)}><button type="button" className={toggleBtnClass(!isMultiVariant)} onClick={() => selectStockMode(0)}>{isTextile ? 'Single Size' : 'Single Model'}</button><button type="button" className={toggleBtnClass(isMultiVariant)} onClick={() => selectStockMode(1)}>{isTextile ? 'Multiple Sizes' : 'Multiple Models'}</button></div></div>}
              {!isService && isMultiVariant && (
                <div className="flex flex-col gap-3">
                  <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3">
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_110px_110px_auto] gap-2 items-end">
                      <Field label={isTextile ? 'Add Sizes Once' : 'Add Models Once'}>
                        <textarea
                          className={`${INPUT} min-h-20 resize-y bg-white`}
                          value={bulkVariantText}
                          onChange={(e) => setBulkVariantText(e.target.value)}

                        />
                      </Field>
                      <Field label="Stock">
                        <input className={`${INPUT} bg-white`} type="number" min="0" value={bulkVariantStock} onChange={(e) => setBulkVariantStock(e.target.value)} />
                      </Field>
                      <Field label="Min Stock">
                        <input className={`${INPUT} bg-white`} type="number" min="0" value={bulkVariantMinStock} onChange={(e) => setBulkVariantMinStock(e.target.value)} />
                      </Field>
                      <button type="button" className="h-9 px-3 rounded-md border border-blue-600 bg-blue-600 text-white text-[12px] font-semibold cursor-pointer font-[inherit]" onClick={addBulkVariants}>Add All</button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(isTextile ? SIZE_PRESETS : MODEL_PRESETS).map((name) => (
                        <button key={name} type="button" className="px-2.5 py-1 rounded-full border border-blue-100 bg-white text-blue-700 text-[11px] font-semibold cursor-pointer font-[inherit]" onClick={() => addVariantNames([name])}>{name}</button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-[#374151]">{form.variants.length} {isTextile ? 'sizes' : 'models'} added</span>
                    <span className="text-[12px] text-[#536173]">Total stock: {variantTotalStock}</span>
                  </div>
                  <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                    {form.variants.map((v, idx) => (
                      <div key={idx} className="grid grid-cols-[1fr_90px_110px_36px] gap-2">
                        <input className={INPUT} value={isTextile ? (v.size || '') : (v.modelName || '')} onChange={(e) => updateVariant(idx, isTextile ? 'size' : 'modelName', e.target.value)} />
                        <input className={INPUT} type="number" min="0" value={v.stock} onChange={(e) => updateVariant(idx, 'stock', e.target.value)} />
                        <input className={INPUT} type="number" min="0" value={v.minStockLevel} onChange={(e) => updateVariant(idx, 'minStockLevel', e.target.value)} />
                        <button type="button" className="w-9 h-9 rounded border border-[#dbe4ef] text-red-400 bg-white cursor-pointer" onClick={() => removeVariant(idx)}><TrashIcon /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Section>
          )}

          {activeTab === 'Branch' && (
            <Section title="Outlet / Branch Settings">
              <div className="flex flex-col gap-2">{(form.branchSettings || []).map((row, idx) => <div key={idx} className="grid grid-cols-1 sm:grid-cols-[1.2fr_80px_110px_110px_90px_36px] gap-2 items-center"><input className={INPUT} value={row.branch || ''} onChange={(e) => setRow('branchSettings', idx, 'branch', e.target.value)} /><label className="flex items-center gap-2 text-[12px] text-[#374151]"><input type="checkbox" checked={Boolean(row.active)} onChange={(e) => setRow('branchSettings', idx, 'active', e.target.checked)} /> Active</label><input className={INPUT} type="number" min="0" value={row.mrp || ''} onChange={(e) => setRow('branchSettings', idx, 'mrp', e.target.value)} /><input className={INPUT} type="number" min="0" value={row.sellingPrice || ''} onChange={(e) => setRow('branchSettings', idx, 'sellingPrice', e.target.value)} /><input className={INPUT} type="number" min="0" value={row.stock || ''} onChange={(e) => setRow('branchSettings', idx, 'stock', e.target.value)} /><button type="button" className="w-9 h-9 rounded border border-[#dbe4ef] text-red-400 bg-white cursor-pointer" onClick={() => removeRow('branchSettings', idx)}><TrashIcon /></button></div>)}<button type="button" className="px-3 py-2 rounded-md border border-blue-100 bg-blue-50 text-blue-700 text-[12px] font-semibold cursor-pointer font-[inherit]" onClick={() => addRow('branchSettings', { branch: '', active: true, mrp: '', sellingPrice: '', stock: '', salesAllowed: true, purchaseAllowed: true })}>+ Add Branch</button></div>
            </Section>
          )}

          {activeTab === 'Settings' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Section title="Sales Configuration"><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><ToggleField label="Sales Allowed" checked={Boolean(form.salesAllowed)} onChange={(v) => set('salesAllowed', v)} /><ToggleField label="Allow Rate Edit" checked={Boolean(form.allowRateEdit)} onChange={(v) => set('allowRateEdit', v)} /><ToggleField label="Allow Discount" checked={Boolean(form.allowDiscount)} onChange={(v) => set('allowDiscount', v)} /><ToggleField label="Allow Negative Stock" checked={Boolean(form.allowNegativeStock)} onChange={(v) => set('allowNegativeStock', v)} /><ToggleField label="Sales Return Allowed" checked={Boolean(form.salesReturnAllowed)} onChange={(v) => set('salesReturnAllowed', v)} /><ToggleField label="Transfer Out Allowed" checked={Boolean(form.transferOutAllowed)} onChange={(v) => set('transferOutAllowed', v)} /><Field label="Maximum Discount (%)"><input className={INPUT} type="number" min="0" max="100" value={form.maxDiscount} onChange={(e) => set('maxDiscount', e.target.value)} /></Field></div></Section>
              <Section title="Purchase Configuration"><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><ToggleField label="Purchase Allowed" checked={Boolean(form.purchaseAllowed)} onChange={(v) => set('purchaseAllowed', v)} /><Field label="Preferred Supplier"><input className={INPUT} value={form.preferredSupplier || ''} onChange={(e) => set('preferredSupplier', e.target.value)} /></Field><Field label="Purchase UOM"><input className={INPUT} value={form.purchaseUnit || ''} onChange={(e) => set('purchaseUnit', e.target.value)} /></Field><Field label="Purchase Price"><input className={INPUT} type="number" min="0" value={form.purchasePrice} onChange={(e) => set('purchasePrice', e.target.value)} /></Field><Field label="Lead Time Days"><input className={INPUT} type="number" min="0" value={form.leadTimeDays} onChange={(e) => set('leadTimeDays', e.target.value)} /></Field><Field label="Minimum Order Qty"><input className={INPUT} type="number" min="0" value={form.minOrderQty} onChange={(e) => set('minOrderQty', e.target.value)} /></Field><Field label="Maximum Order Qty"><input className={INPUT} type="number" min="0" value={form.maxOrderQty} onChange={(e) => set('maxOrderQty', e.target.value)} /></Field></div></Section>
            </div>
          )}
            </div>
          )}
          {activeTab === 'General' && <div className={pageMode ? 'px-4 py-3 md:px-7' : useFullScreenEditor ? (isSingleFashionProduct ? 'px-4 py-2 overflow-hidden flex-1 min-h-0' : 'px-4 py-0 overflow-y-auto flex-1') : 'px-6 py-4 overflow-y-auto flex-1'}>
          {err && <div className="mb-3 px-3 py-2 bg-red-50 text-red-600 text-[12px] rounded-md">{err}</div>}
          {activeTab === 'General' && (shouldUseSpecialServiceForm ? (
            isBusinessSpecialtyRetail && isService
              ? renderBusinessSpecialtyServiceForm()
              : isSpecialtyPersonalRetail && isService
              ? renderSpecialtyPersonalServiceForm()
              : isHomeLivingRetail && isService
                ? renderHomeLivingServiceForm()
                : renderElectronicsServiceForm()
          ) : isHomeLivingRetail && !isService ? (
            isMultiVariant ? renderHomeLivingVariantProductForm() : renderSingleHomeLivingProductForm()
          ) : isBusinessSpecialtyRetail && !isService ? (
            isMultiVariant ? renderSpecialtyPersonalVariantProductForm() : renderSingleSpecialtyPersonalProductForm()
          ) : isSpecialtyPersonalRetail && !isService ? (
            isMultiVariant ? renderSpecialtyPersonalVariantProductForm() : renderSingleSpecialtyPersonalProductForm()
          ) : isFoodGroceryRetail && !isService ? (
            isVariantFoodGroceryProduct ? renderFoodGroceryVariantProductForm() : renderSingleFoodGroceryProductForm()
          ) : isFashionRetail && !isService ? (
            isSingleFashionProduct ? renderSingleFashionProductForm() : renderFashionVariantProductForm()
          ) : isElectronicsRetail && !isService ? (
            isBundleElectronicsProduct ? renderBundleElectronicsProductForm() : isSingleElectronicsProduct ? renderSingleElectronicsProductForm() : renderVariantElectronicsProductForm()
          ) : <div className={isElectronicsRetail && isService ? 'grid grid-cols-1 md:grid-cols-3 gap-3' : 'grid grid-cols-1 sm:grid-cols-2 gap-3'}>
            {false && (
            <div className="mx-auto grid w-full max-w-[1820px] grid-cols-1 gap-4">
              <div className="grid grid-cols-1 gap-4">
              <Section title="Product Type">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { label: 'Single Product', active: !isMultiVariant && form.productType !== 'Bundle', action: () => { set('productType', 'Standard'); selectStockMode(0); }, helper: 'Create one product with one SKU' },
                    { label: 'Product with Variants', active: isMultiVariant, action: () => { set('productType', 'Serialized'); selectStockMode(1); }, helper: 'Create multiple models under one family' },
                    { label: 'Bundle / Kit', active: form.productType === 'Bundle', action: () => { set('productType', 'Bundle'); selectStockMode(0); }, helper: 'Create a kit made from products' },
                  ].map((type) => (
                    <button key={type.label} type="button" onClick={type.action} className={`min-h-24 rounded-lg border p-3 text-left cursor-pointer font-[inherit] ${type.active ? 'border-blue-500 bg-blue-50 shadow-[0_0_0_1px_rgba(37,99,235,0.18)]' : 'border-[#dbe4ef] bg-white hover:bg-[#f8fafc]'}`}>
                      <span className={`mb-3 block h-4 w-4 rounded-full border ${type.active ? 'border-blue-600 bg-blue-600 ring-4 ring-blue-100' : 'border-[#94a3b8] bg-white'}`} />
                      <span className="block text-[13px] font-bold text-[#111827]">{type.label}</span>
                      <span className="mt-1 block text-[12px] leading-5 text-[#536173]">{type.helper}</span>
                    </button>
                  ))}
                </div>
              </Section>

              <Section title="Product Family">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Product Name" required className="sm:col-span-2">
                    <input ref={nameInputRef} className={INPUT} value={form.description} onChange={(e) => set('description', e.target.value)} />
                  </Field>
                  <Field label="Brand">
                    <input className={INPUT} value={form.brand || ''} onChange={(e) => set('brand', e.target.value)} />
                  </Field>
                  <Field label="Category">
                    <input className={INPUT} value={form.category || ''} onChange={(e) => set('category', e.target.value)} />
                  </Field>
                  <Field label="Sub Category">
                    <input className={INPUT} value={form.subCategory || ''} onChange={(e) => set('subCategory', e.target.value)} />
                  </Field>
                  <Field label="Model Family">
                    <input className={INPUT} value={form.modelFamily || ''} onChange={(e) => set('modelFamily', e.target.value)} />
                  </Field>
                  <Field label="Model No." className="hidden">
                    <input className={INPUT} value={form.modelNumber || ''} onChange={(e) => set('modelNumber', e.target.value)} />
                  </Field>
                  <Field label="SKU" className="hidden">
                    <input className={INPUT} value={form.code || ''} onChange={(e) => set('code', e.target.value)} />
                  </Field>
                  <Field label="Barcode" className="hidden">
                    <div className="grid grid-cols-[minmax(0,1fr)_80px] gap-2">
                      <input className={INPUT} value={form.barcode} onChange={(e) => set('barcode', e.target.value)} />
                      <button type="button" className="rounded-md border border-[#dbe4ef] bg-white text-[12px] font-semibold text-blue-700 cursor-pointer hover:bg-blue-50 font-[inherit]" onClick={() => set('barcode', genBarcode())}>Scan</button>
                    </div>
                  </Field>
                  <Field label="Description" className="md:col-span-2">
                    <textarea className={`${INPUT} min-h-20 resize-y`} value={form.productDescription || ''} onChange={(e) => set('productDescription', e.target.value)} />
                  </Field>
                </div>
              </Section>
              </div>

              {isMultiVariant && (
                <Section title="Variant Attributes">
                  <div className="flex flex-col gap-3">
                    <p className="m-0 text-[13px] text-[#536173]">Select attributes used to differentiate models.</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {ELECTRONICS_VARIANT_ATTRIBUTES.map((attr) => (
                        <label key={attr.key} className={`flex items-center gap-2 rounded-md border px-3 py-2 text-[13px] font-semibold cursor-pointer ${selectedVariantAttributes.includes(attr.key) ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-[#dbe4ef] bg-white text-[#374151]'}`}>
                          <input type="checkbox" checked={selectedVariantAttributes.includes(attr.key)} onChange={() => toggleVariantAttribute(attr.key)} />
                          {attr.label}
                        </label>
                      ))}
                    </div>
                    <button type="button" className="self-start px-3 py-1.5 text-[12px] font-medium text-blue-600 bg-blue-50 border border-blue-100 rounded-md cursor-pointer hover:bg-blue-100 font-[inherit]" onClick={() => toggleVariantAttribute('graphics')}>
                      + Add Custom Attribute
                    </button>
                  </div>
                </Section>
              )}

              <Section title="Variants">
                <div className="flex flex-col gap-3">
                  <div>
                    <label className={LABEL}>Model Creation</label>
                    <div className={TOGGLE_WRAP} onKeyDown={(e) => handleToggleArrowKeys(e, selectStockMode)}>
                      <button type="button" className={toggleBtnClass(!isMultiVariant)} onClick={() => selectStockMode(0)}>Single Model</button>
                      <button type="button" className={toggleBtnClass(isMultiVariant)} onClick={() => selectStockMode(1)}>Multiple Models</button>
                    </div>
                  </div>

                  {!isMultiVariant && (
                    <div className="rounded-md border border-[#dbe4ef] bg-[#f8fafc] px-3 py-2 text-[12px] text-[#536173]">
                      Use the Model No., Barcode, Selling Price, and Opening Stock fields for this one model.
                    </div>
                  )}

                  {isMultiVariant && (
                    <>
                      <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3">
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_110px_110px_auto] gap-2 items-end">
                          <Field label="Add Model Names Once">
                            <textarea
                              className={`${INPUT} min-h-20 resize-y bg-white`}
                              value={bulkVariantText}
                              onChange={(e) => setBulkVariantText(e.target.value)}

                            />
                          </Field>
                          <Field label="Stock">
                            <input className={`${INPUT} bg-white`} type="number" min="0" value={bulkVariantStock} onChange={(e) => setBulkVariantStock(e.target.value)} />
                          </Field>
                          <Field label="Min Stock">
                            <input className={`${INPUT} bg-white`} type="number" min="0" value={bulkVariantMinStock} onChange={(e) => setBulkVariantMinStock(e.target.value)} />
                          </Field>
                          <button type="button" className="h-9 px-3 rounded-md border border-blue-600 bg-blue-600 text-white text-[12px] font-semibold cursor-pointer font-[inherit]" onClick={addBulkVariants}>Add All</button>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {modelPresets.map((name) => (
                            <button key={name} type="button" className="px-2.5 py-1 rounded-full border border-blue-100 bg-white text-blue-700 text-[11px] font-semibold cursor-pointer font-[inherit]" onClick={() => addVariantNames([name])}>{name}</button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-semibold text-[#374151]">{form.variants.length} models added</span>
                        <span className="text-[12px] text-[#536173]">Total stock: {variantTotalStock}</span>
                      </div>

                      <div className="overflow-x-auto rounded-lg border border-[#dbe4ef]">
                        <table className="w-full min-w-[1100px] border-collapse text-[12px]">
                          <thead className="bg-[#f3f7fc] text-[#0f2a66]">
                            <tr>
                              <th className="border-b border-r border-[#dbe4ef] px-3 py-2 text-left">Variant Code</th>
                              {activeVariantAttributes.map((attr) => (
                                <th key={attr.key} className="border-b border-r border-[#dbe4ef] px-3 py-2 text-left">{attr.label}</th>
                              ))}
                              <th className="border-b border-r border-[#dbe4ef] px-3 py-2 text-left">SKU</th>
                              <th className="border-b border-r border-[#dbe4ef] px-3 py-2 text-left">Barcode</th>
                              <th className="border-b border-r border-[#dbe4ef] px-3 py-2 text-right">Cost Price</th>
                              <th className="border-b border-r border-[#dbe4ef] px-3 py-2 text-right">Selling Price</th>
                              <th className="border-b border-r border-[#dbe4ef] px-3 py-2 text-right">MRP</th>
                              <th className="border-b border-r border-[#dbe4ef] px-3 py-2 text-right">Stock Count</th>
                              <th className="border-b border-[#dbe4ef] px-3 py-2 text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {form.variants.map((v, idx) => (
                              <tr key={idx} className="bg-white hover:bg-blue-50/40">
                                <td className="border-b border-r border-[#edf2f7] px-2 py-2">
                                  <input className={INPUT} value={v.modelCode || ''} onChange={(e) => updateVariant(idx, 'modelCode', e.target.value)} />
                                </td>
                                {activeVariantAttributes.map((attr) => (
                                  <td key={attr.key} className="border-b border-r border-[#edf2f7] px-2 py-2">
                                    <input className={INPUT} value={v[attr.key] || ''} onChange={(e) => updateVariant(idx, attr.key, e.target.value)} />
                                  </td>
                                ))}
                                <td className="border-b border-r border-[#edf2f7] px-2 py-2">
                                  <input className={INPUT} value={v.modelName || ''} onChange={(e) => updateVariant(idx, 'modelName', e.target.value)} />
                                </td>
                                <td className="border-b border-r border-[#edf2f7] px-2 py-2">
                                  <input className={INPUT} value={v.barcode || ''} onChange={(e) => updateVariant(idx, 'barcode', e.target.value)} />
                                </td>
                                <td className="border-b border-r border-[#edf2f7] px-2 py-2">
                                  <input className={INPUT} type="number" min="0" step="0.01" value={v.purchasePrice ?? ''} onChange={(e) => updateVariant(idx, 'purchasePrice', e.target.value)} />
                                </td>
                                <td className="border-b border-r border-[#edf2f7] px-2 py-2">
                                  <input className={INPUT} type="number" min="0" step="0.01" value={v.rate ?? ''} onChange={(e) => updateVariant(idx, 'rate', e.target.value)} />
                                </td>
                                <td className="border-b border-r border-[#edf2f7] px-2 py-2">
                                  <input className={INPUT} type="number" min="0" step="0.01" value={v.mrp ?? ''} onChange={(e) => updateVariant(idx, 'mrp', e.target.value)} />
                                </td>
                                <td className="border-b border-r border-[#edf2f7] px-2 py-2">
                                  <input className={INPUT} type="number" min="0" value={v.stock} onChange={(e) => updateVariant(idx, 'stock', e.target.value)} />
                                </td>
                                <td className="border-b border-[#edf2f7] px-2 py-2 text-center">
                                  <button type="button" onClick={() => removeVariant(idx)} className="w-9 h-9 inline-flex items-center justify-center rounded hover:bg-red-50 text-red-400 bg-transparent border border-[#dbe4ef] cursor-pointer" title="Remove model">
                                    <TrashIcon />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={addVariantRow} className="px-3 py-1.5 text-[12px] font-medium text-blue-600 bg-blue-50 border border-blue-100 rounded-md cursor-pointer hover:bg-blue-100 font-[inherit]">+ Add Variant</button>
                        <button type="button" onClick={generateVariantRows} className="px-3 py-1.5 text-[12px] font-semibold text-white bg-blue-600 border border-blue-600 rounded-md cursor-pointer hover:bg-blue-700 font-[inherit]">Generate Variants</button>
                      </div>
                    </>
                  )}
                </div>
              </Section>

              {false && (<>
              <Section title="Technical Specifications">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Processor">
                    <input className={INPUT} value={form.processor || ''} onChange={(e) => set('processor', e.target.value)} />
                  </Field>
                  <Field label="RAM">
                    <input className={INPUT} value={form.ram || ''} onChange={(e) => set('ram', e.target.value)} />
                  </Field>
                  <Field label="Storage">
                    <input className={INPUT} value={form.storage || ''} onChange={(e) => set('storage', e.target.value)} />
                  </Field>
                  <Field label="Display">
                    <input className={INPUT} value={form.display || ''} onChange={(e) => set('display', e.target.value)} />
                  </Field>
                  <Field label="OS">
                    <input className={INPUT} value={form.operatingSystem || ''} onChange={(e) => set('operatingSystem', e.target.value)} />
                  </Field>
                  <Field label="Serial / IMEI Number">
                    <input className={INPUT} value={form.serialNumber || ''} onChange={(e) => set('serialNumber', e.target.value)} />
                  </Field>
                </div>
              </Section>

              <Section title="Pricing">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Purchase Price">
                    <input className={INPUT} type="number" min="0" step="0.01" value={form.purchasePrice} onChange={(e) => set('purchasePrice', e.target.value)} />
                  </Field>
                  <Field label="Landing Cost">
                    <input className={INPUT} type="number" min="0" step="0.01" value={form.landingCost} onChange={(e) => set('landingCost', e.target.value)} />
                  </Field>
                  <Field label="MRP">
                    <input className={INPUT} type="number" min="0" step="0.01" value={form.mrp} onChange={(e) => set('mrp', e.target.value)} />
                  </Field>
                  <Field label="Selling Price" required={!isMultiVariant}>
                    <input className={INPUT} type="number" min="0" step="0.01" value={form.rate} onChange={(e) => set('rate', e.target.value)} />
                  </Field>
                  <div className="sm:col-span-2 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-[13px] text-blue-900">
                    <span className="font-semibold">Margin</span>
                    <span className="ml-2">{formatINR(Math.max(0, Number(form.rate || 0) - Number(form.landingCost || form.purchasePrice || 0)))}</span>
                    <span className="ml-1 text-blue-700">
                      ({Number(form.rate || 0) > 0 ? (((Number(form.rate || 0) - Number(form.landingCost || form.purchasePrice || 0)) / Number(form.rate || 0)) * 100).toFixed(2) : '0.00'}%)
                    </span>
                  </div>
                </div>
              </Section>

              <Section title="Warranty">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Manufacturer Warranty">
                    <input className={INPUT} value={form.warrantyPeriod || ''} onChange={(e) => set('warrantyPeriod', e.target.value)} />
                  </Field>
                  <Field label="Warranty Type">
                    <input className={INPUT} value={form.warrantyType || ''} onChange={(e) => set('warrantyType', e.target.value)} />
                  </Field>
                </div>
              </Section>

              <Section title="Tax">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="HSN Code">
                    <input className={INPUT} value={form.hsn || ''} onChange={(e) => set('hsn', e.target.value)} />
                  </Field>
                  <Field label="GST Rate">
                    <input className={INPUT} inputMode="decimal" value={form.gstRate || ''} onChange={(e) => set('gstRate', e.target.value)} />
                  </Field>
                  {isMultiVariant ? (
                    <div className="sm:col-span-2 rounded-md border border-[#dbe4ef] bg-[#f8fafc] px-3 py-2 text-[13px] text-[#374151]">
                      Stock is maintained model-wise. Total stock: <span className="font-semibold text-[#111827]">{variantTotalStock}</span>
                    </div>
                  ) : (
                    <>
                      <Field label="Opening Stock">
                        <input className={`${INPUT} ${mode === 'edit' ? 'bg-[#f8fafc] text-[#94a3b8] cursor-not-allowed' : ''}`} type="number" min="0" value={form.stock} disabled={mode === 'edit'} onChange={(e) => set('stock', e.target.value)} />
                      </Field>
                      <Field label="Min. Stock Level">
                        <input className={INPUT} type="number" min="0" value={form.minStockLevel} onChange={(e) => set('minStockLevel', e.target.value)} />
                      </Field>
                    </>
                  )}
                </div>
              </Section>
              </>)}
            </div>
            )}
            {!isElectronicsRetail && (
              <div className="sm:col-span-2">
                <label className={LABEL}>{itemTypeLabel}</label>
                <div className={TOGGLE_WRAP} onKeyDown={(e) => handleToggleArrowKeys(e, (idx) => selectItemType(ITEM_TYPES[idx]))}>
                  {ITEM_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      className={toggleBtnClass(form.itemType === type)}
                      onClick={() => selectItemType(type)}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className={isElectronicsRetail && isService ? '' : 'sm:col-span-2'}>
              <label className={LABEL}>{isService ? (isElectronicsRetail ? 'Service / Repair Name *' : 'Service Name *') : isElectronicsRetail ? 'Device Name *' : 'Product Name *'}</label>
              <input ref={nameInputRef} className={INPUT} value={form.description} onChange={(e) => set('description', e.target.value)} />
            </div>
            <div className="hidden">
              <label className={LABEL}>Short Name</label>
              <input className={INPUT} value={form.shortName || ''} onChange={(e) => set('shortName', e.target.value)} />
            </div>
            <div className="hidden">
              <label className={LABEL}>Product Code / SKU *</label>
              <input className={INPUT} value={form.code || ''} onChange={(e) => set('code', e.target.value)} />
            </div>
            <div className="hidden">
              <label className={LABEL}>Alias Code</label>
              <input className={INPUT} value={form.aliasCode || ''} onChange={(e) => set('aliasCode', e.target.value)} />
            </div>
            <div className="hidden">
              <label className={LABEL}>Product Type</label>
              <input className={INPUT} value={form.productType || ''} onChange={(e) => { set('productType', e.target.value); if (e.target.value === 'Service') selectItemType('Service'); }} />
            </div>
            <div className="hidden">
              <label className={LABEL}>Preparation Type</label>
              <input className={INPUT} value={form.preparationType || ''} onChange={(e) => set('preparationType', e.target.value)} />
            </div>
            <div className="hidden">
              <label className={LABEL}>Sub Category</label>
              <input className={INPUT} value={form.subCategory || ''} onChange={(e) => set('subCategory', e.target.value)} />
            </div>
            <div className="hidden">
              <label className={LABEL}>Manufacturer</label>
              <input className={INPUT} value={form.manufacturer || ''} onChange={(e) => set('manufacturer', e.target.value)} />
            </div>
            <div className="hidden">
              <label className={LABEL}>Supplier</label>
              <input className={INPUT} value={form.supplier || ''} onChange={(e) => set('supplier', e.target.value)} />
            </div>
            <div className="hidden">
              <label className={LABEL}>Product Image URL</label>
              <input className={INPUT} value={form.imageUrl || ''} onChange={(e) => set('imageUrl', e.target.value)} />
            </div>
            <div className={isElectronicsRetail && isService ? 'md:col-span-2' : 'sm:col-span-2'}>
              <label className={LABEL}>Description</label>
              <textarea
                className={`${INPUT} min-h-9 focus:min-h-24 transition-[min-height] duration-150 resize-y`}
                rows={1}
                value={form.productDescription || ''}
                onChange={(e) => set('productDescription', e.target.value)}

              />
            </div>
            <div className={isElectronicsRetail && isService ? 'md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-3' : 'sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3'}>
              <div>
                <label className={LABEL}>{isService ? 'SAC Code' : 'HSN Code'}</label>
                <input className={INPUT} value={form.hsn || ''} onChange={(e) => set('hsn', e.target.value)} />
              </div>
              <div>
                <label className={LABEL}>Category</label>
                <input className={INPUT} value={form.category || ''} onChange={(e) => set('category', e.target.value)} />
              </div>
              <div>
                <label className={LABEL}>Brand</label>
                <input className={INPUT} value={form.brand || ''} onChange={(e) => set('brand', e.target.value)} />
              </div>
            </div>
            {!isService && itemGroups.length > 1 && !isElectronicsRetail && (
              <div className="sm:col-span-2">
                <label className={LABEL}>Item Group</label>
                <div className={TOGGLE_WRAP} onKeyDown={(e) => handleToggleArrowKeys(e, (idx) => setItemGroup(itemGroups[idx]))}>
                  {itemGroups.map((grp) => (
                    <button
                      key={grp}
                      type="button"
                      className={toggleBtnClass(form.itemGroup === grp)}
                      onClick={() => setItemGroup(grp)}
                    >
                      {GROUP_LABELS[grp] || grp}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {isTextile && (
              <>
                {!isMultiVariant && (
                  <div>
                    <label className={LABEL}>Size</label>
                    <input className={INPUT} value={form.size || ''} onChange={(e) => set('size', e.target.value)} />
                  </div>
                )}
                <div>
                  <label className={LABEL}>Fabric</label>
                  <input className={INPUT} value={form.fabric || ''} onChange={(e) => set('fabric', e.target.value)} />
                </div>
                <div>
                  <label className={LABEL}>Colour</label>
                  <input className={INPUT} value={form.colour || ''} onChange={(e) => set('colour', e.target.value)} />
                </div>
                <div>
                  <label className={LABEL}>Type</label>
                  <input className={INPUT} value={form.type || ''} onChange={(e) => set('type', e.target.value)} />
                </div>
              </>
            )}
            {isElectronics && (
              <>
                <div>
                  <label className={LABEL}>Model Number</label>
                  <input className={INPUT} value={form.modelNumber || ''} onChange={(e) => set('modelNumber', e.target.value)} />
                </div>
                <div>
                  <label className={LABEL}>Warranty Period</label>
                  <input className={INPUT} value={form.warrantyPeriod || ''} onChange={(e) => set('warrantyPeriod', e.target.value)} />
                </div>
                <div>
                  <label className={LABEL}>Serial / IMEI Number</label>
                  <input className={INPUT} value={form.serialNumber || ''} onChange={(e) => set('serialNumber', e.target.value)} />
                </div>
              </>
            )}
            {!isRetail && genericGroupFields.map((field) => {
              const def = FIELD_DEFS[field];
              if (!def) return null;
              if (def.type === 'toggle') {
                return (
                  <label key={field} className="flex items-center justify-between gap-3 border border-[#dbe4ef] rounded-md px-3 py-2.5 cursor-pointer">
                    <span className="text-[13px] font-medium text-[#374151]">{def.label}</span>
                    <div
                      className={`w-9 h-5 rounded-full transition-colors cursor-pointer flex-none ${form[field] ? 'bg-blue-600' : 'bg-[#dbe4ef]'}`}
                      onClick={() => set(field, !form[field])}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full mt-0.5 transition-transform ${form[field] ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                    </div>
                  </label>
                );
              }
              if (def.type === 'select') {
                return (
                  <div key={field}>
                    <label className={LABEL}>{def.label}</label>
                    <input className={INPUT} value={form[field] || ''} onChange={(e) => set(field, e.target.value)} />
                  </div>
                );
              }
              return (
                <div key={field}>
                  <label className={LABEL}>{def.label}</label>
                  <input
                    className={INPUT}
                    type={def.type === 'date' ? 'date' : 'text'}
                    value={form[field] || ''}
                    onChange={(e) => set(field, e.target.value)}

                  />
                </div>
              );
            })}
            <div>
              <label className={LABEL}>Unit</label>
              <input className={INPUT} value={form.unit || ''} onChange={(e) => set('unit', e.target.value)} />
            </div>
            <div>
              <label className={LABEL}>Sale Price (₹){isMultiVariant ? '' : ' *'}</label>
              <input className={INPUT} type="number" min="0" step="0.01" value={form.rate} onChange={(e) => set('rate', e.target.value)} />
            </div>
            <div>
              <label className={LABEL}>GST Rate (%)</label>
              <input className={INPUT} inputMode="decimal" value={form.gstRate || ''} onChange={(e) => set('gstRate', e.target.value)} />
            </div>
            {!isService && isRetail && (
              <div className="sm:col-span-2">
                <label className={LABEL}>Stock Tracking</label>
                <div className={TOGGLE_WRAP} onKeyDown={(e) => handleToggleArrowKeys(e, selectStockMode)}>
                  <button type="button" className={toggleBtnClass(!isMultiVariant)} onClick={() => selectStockMode(0)}>{isTextile ? 'Single Size' : 'Single Model'}</button>
                  <button type="button" className={toggleBtnClass(isMultiVariant)} onClick={() => selectStockMode(1)}>{isTextile ? 'Multiple Sizes' : 'Multiple Models'}</button>
                </div>
              </div>
            )}
            {!isService && !isMultiVariant && (
              <>
                <div>
                  <label className={LABEL}>{mode === 'add' ? 'Opening Stock' : 'Current Stock'}</label>
                  <input
                    className={`${INPUT} ${mode === 'edit' ? 'bg-[#f8fafc] text-[#94a3b8] cursor-not-allowed' : ''}`}
                    type="number"
                    min="0"
                    value={form.stock}
                    disabled={mode === 'edit'}
                    onChange={(e) => set('stock', e.target.value)}
                  />
                  {mode === 'edit' && (
                    <p className="text-[11px] text-[#94a3b8] mt-1">
                      Set once as opening stock. Add more via <a href="/billing/purchase-entry/new" className="text-blue-600 hover:underline">Purchase Entry</a> or correct via <a href="/stock-in" className="text-blue-600 hover:underline">Stock In / Out</a>.
                    </p>
                  )}
                </div>
                <div>
                  <label className={LABEL}>Min. Stock Level</label>
                  <input className={INPUT} type="number" min="0" value={form.minStockLevel} onChange={(e) => set('minStockLevel', e.target.value)} />
                </div>
              </>
            )}
            {!isService && isMultiVariant && (
              <div className="sm:col-span-2 border border-[#dbe4ef] rounded-md p-3">
                <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3 mb-3">
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_110px_110px_auto] gap-2 items-end">
                    <Field label={isTextile ? 'Add Sizes Once' : 'Add Models Once'}>
                      <textarea className={`${INPUT} min-h-20 resize-y bg-white`} value={bulkVariantText} onChange={(e) => setBulkVariantText(e.target.value)} />
                    </Field>
                    <Field label="Stock"><input className={`${INPUT} bg-white`} type="number" min="0" value={bulkVariantStock} onChange={(e) => setBulkVariantStock(e.target.value)} /></Field>
                    <Field label="Min Stock"><input className={`${INPUT} bg-white`} type="number" min="0" value={bulkVariantMinStock} onChange={(e) => setBulkVariantMinStock(e.target.value)} /></Field>
                    <button type="button" className="h-9 px-3 rounded-md border border-blue-600 bg-blue-600 text-white text-[12px] font-semibold cursor-pointer font-[inherit]" onClick={addBulkVariants}>Add All</button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(isTextile ? SIZE_PRESETS : modelPresets).map((name) => (
                      <button key={name} type="button" className="px-2.5 py-1 rounded-full border border-blue-100 bg-white text-blue-700 text-[11px] font-semibold cursor-pointer font-[inherit]" onClick={() => addVariantNames([name])}>{name}</button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] font-semibold text-[#374151]">{form.variants.length} {isTextile ? 'sizes' : 'models'} added</span>
                  <span className="text-[12px] text-[#536173]">Total stock: {variantTotalStock}</span>
                </div>
                <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                  {form.variants.map((v, idx) => (
                    <div key={idx} className={`grid ${isTextile ? 'grid-cols-[1fr_90px_110px_36px]' : 'grid-cols-2 sm:grid-cols-[1.6fr_100px_90px_110px_36px]'} gap-2`}>
                      <input className={INPUT} value={isTextile ? (v.size || '') : (v.modelName || '')} onChange={(e) => updateVariant(idx, isTextile ? 'size' : 'modelName', e.target.value)} />
                      {!isTextile && (
                        <input className={INPUT} type="number" min="0" step="0.01" value={v.rate ?? ''} onChange={(e) => updateVariant(idx, 'rate', e.target.value)} />
                      )}
                      <input className={INPUT} type="number" min="0" value={v.stock} onChange={(e) => updateVariant(idx, 'stock', e.target.value)} />
                      <input className={INPUT} type="number" min="0" value={v.minStockLevel} onChange={(e) => updateVariant(idx, 'minStockLevel', e.target.value)} />
                      <button type="button" onClick={() => removeVariant(idx)} className="w-9 h-9 flex items-center justify-center rounded hover:bg-red-50 text-red-400 bg-transparent border border-[#dbe4ef] cursor-pointer flex-none" title={`Remove ${variantKind}`}>
                        <TrashIcon />
                      </button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addVariantRow} className="mt-2 px-3 py-1.5 text-[12px] font-medium text-blue-600 bg-blue-50 border border-blue-100 rounded-md cursor-pointer hover:bg-blue-100 font-[inherit]">+ Add {isTextile ? 'Size' : 'Model'}</button>
                {mode === 'edit' && (
                  <p className="text-[11px] text-[#94a3b8] mt-2">
                    Quantities are set once as opening stock. Add more via <a href="/billing/purchase-entry/new" className="text-blue-600 hover:underline">Purchase Entry</a> or correct via <a href="/stock-in" className="text-blue-600 hover:underline">Stock In / Out</a>.
                  </p>
                )}
              </div>
            )}
            <div>
              <label className={LABEL}>Barcode</label>
              <div className="flex gap-1.5">
                <input className={INPUT} value={form.barcode} onChange={(e) => set('barcode', e.target.value)} />
                {mode === 'add' && (
                  <button type="button" title="Regenerate" onClick={() => set('barcode', genBarcode())} className="px-2 border border-[#dbe4ef] rounded-md text-[#536173] hover:bg-gray-50 bg-white cursor-pointer text-[16px] leading-none">↺</button>
                )}
              </div>
            </div>
            <div>
              <label className={LABEL}>Status</label>
              <input className={INPUT} value={form.status || ''} onChange={(e) => set('status', e.target.value)} />
            </div>
          </div>)}
          </div>}
          <div className={(useFullScreenEditor || pageMode) ? 'hidden' : 'flex flex-wrap items-center justify-between gap-3 border-t border-[#edf2f7] flex-none px-6 py-3.5'}>
            {!pageMode && !useFullScreenEditor && <ShortcutsHint items={[[['Esc'], 'Close'], [['Arrow keys'], 'Switch'], [['Tab'], 'Next field']]} />}
            <div className={useFullScreenEditor ? 'flex gap-2' : 'flex gap-3'}>
            <button type="button" onClick={onClose} className={useFullScreenEditor ? 'border-0 bg-transparent px-2 py-1 text-[12px] font-medium text-[#111827] cursor-pointer hover:text-blue-700 font-[inherit]' : 'px-4 py-2 text-[13px] font-medium text-[#374151] bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit]'}>Cancel</button>
            <button type="submit" disabled={saving} className={useFullScreenEditor ? 'border-0 bg-transparent px-2 py-1 text-[12px] font-medium text-[#111827] cursor-pointer hover:text-blue-700 font-[inherit] disabled:opacity-60' : 'px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit] disabled:opacity-60'}>
              {saving ? 'Saving...' : useFullScreenEditor ? (isBundleElectronicsProduct ? 'Save Bundle' : 'Save Product') : mode === 'add' ? `Add ${isService ? 'Service' : 'Item'}` : 'Save Changes'}
            </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ServiceFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const [serverUser, setServerUser] = useState(null);
  const [businessSettings, setBusinessSettings] = useState(null);
  const [categories, setCategories] = useState(['All Categories']);
  const [brands, setBrands] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [fabrics, setFabrics] = useState([]);
  const [colours, setColours] = useState([]);
  const [types, setTypes] = useState([]);
  const [initial, setInitial] = useState(null);
  const [nextCode, setNextCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isElectronicsRetail = isElectronicsRetailAccount(currentUser)
    || isElectronicsRetailAccount(serverUser)
    || businessSettings?.retailSubcategory === ELECTRONICS_RETAIL_SUBCATEGORY
    || businessSettings?.retailSubcategory === 'Electronics & Technology';
  const isFashionRetail = isFashionRetailAccount(currentUser)
    || isFashionRetailAccount(serverUser)
    || businessSettings?.retailSubcategory === FASHION_RETAIL_SUBCATEGORY
    || businessSettings?.retailSubcategory === 'Fashion & Lifestyle'
    || businessSettings?.retailSubcategory === 'Fashion & Style';
  const isFoodGroceryRetail = isFoodGroceryRetailAccount(currentUser)
    || isFoodGroceryRetailAccount(serverUser)
    || businessSettings?.retailSubcategory === FOOD_GROCERY_RETAIL_SUBCATEGORY
    || businessSettings?.retailSubcategory === 'Food & Grocery';
  const isHomeLivingRetail = isHomeLivingRetailAccount(currentUser)
    || isHomeLivingRetailAccount(serverUser)
    || businessSettings?.retailSubcategory === HOME_LIVING_RETAIL_SUBCATEGORY
    || businessSettings?.retailSubcategory === 'Home & Living';
  const isSpecialtyPersonalRetail = isSpecialtyPersonalRetailAccount(currentUser)
    || isSpecialtyPersonalRetailAccount(serverUser)
    || businessSettings?.retailSubcategory === SPECIALTY_PERSONAL_RETAIL_SUBCATEGORY
    || businessSettings?.retailSubcategory === 'Specialty & Personal Needs';
  const isBusinessSpecialtyRetail = isBusinessSpecialtyRetailAccount(currentUser)
    || isBusinessSpecialtyRetailAccount(serverUser)
    || businessSettings?.retailSubcategory === BUSINESS_SPECIALTY_RETAIL_SUBCATEGORY
    || businessSettings?.retailSubcategory === 'Business & Specialty Retail';

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([
      api.invProductCategories().catch(() => []),
      api.invProductBrands().catch(() => []),
      api.invProductSubcategories().catch(() => []),
      api.invProductSizes().catch(() => []),
      api.invProductFabrics().catch(() => []),
      api.invProductColours().catch(() => []),
      api.invProductTypes().catch(() => []),
      api.getMe().catch(() => null),
      api.getSettings().catch(() => null),
      id ? api.invGetProduct(id) : api.invProductNextCode({ itemType: 'Service' }).catch(() => ({ code: '' })),
    ])
      .then(([categoryRows, brandRows, subCategoryRows, sizeRows, fabricRows, colourRows, typeRows, me, settings, serviceOrCode]) => {
        if (!active) return;
        setCategories(['All Categories', ...optionNames(categoryRows)]);
        setBrands(optionNames(brandRows));
        setSubCategories(optionNames(subCategoryRows));
        setSizes(Array.isArray(sizeRows) ? sizeRows : []);
        setFabrics(Array.isArray(fabricRows) ? fabricRows : []);
        setColours(Array.isArray(colourRows) ? colourRows : []);
        setTypes(Array.isArray(typeRows) ? typeRows : []);
        setServerUser(me);
        setBusinessSettings(settings);
        if (id) {
          if (serviceOrCode?.itemType && serviceOrCode.itemType !== 'Service') {
            setError('This record is not a service.');
          } else {
            setInitial(serviceOrCode);
          }
        } else {
          setNextCode(serviceOrCode?.code || '');
        }
      })
      .catch((err) => {
        if (active) setError(err.message || 'Failed to load service form');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return <div className="min-h-screen bg-[#f8fafc] p-7 text-[13px] font-semibold text-[#536173]">Loading service form...</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f8fafc] p-7">
        <div className="mx-auto max-w-[720px] rounded-lg border border-red-100 bg-red-50 p-4 text-[13px] font-semibold text-red-700">{error}</div>
      </div>
    );
  }

  return (
    <ProductModal
      key={`${id || 'new'}-${initial?._id || ''}-${nextCode}`}
      pageMode
      mode={id ? 'edit' : 'add'}
      initial={id ? initial : null}
      nextCode={nextCode}
      initialProductType="Service"
      forceServiceMode
      categories={categories}
      brands={brands}
      subCategories={subCategories}
      sizes={sizes}
      fabrics={fabrics}
      colours={colours}
      types={types}
      forceElectronicsRetail={isElectronicsRetail}
      forceFashionRetail={isFashionRetail}
      forceFoodGroceryRetail={isFoodGroceryRetail}
      forceHomeLivingRetail={isHomeLivingRetail}
      forceSpecialtyPersonalRetail={isSpecialtyPersonalRetail}
      forceBusinessSpecialtyRetail={isBusinessSpecialtyRetail}
      onSave={() => navigate('/services')}
      onClose={() => navigate('/services')}
    />
  );
}

export function ProductsPage({ initialItemType = 'All Items', lockedItemType = '' } = {}) {
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const [serverUser, setServerUser] = useState(null);
  const [businessSettings, setBusinessSettings] = useState(null);
  const isElectronicsRetail = isElectronicsRetailAccount(currentUser)
    || isElectronicsRetailAccount(serverUser)
    || businessSettings?.retailSubcategory === ELECTRONICS_RETAIL_SUBCATEGORY
    || businessSettings?.retailSubcategory === 'Electronics & Technology';
  const isFashionRetail = isFashionRetailAccount(currentUser)
    || isFashionRetailAccount(serverUser)
    || businessSettings?.retailSubcategory === FASHION_RETAIL_SUBCATEGORY
    || businessSettings?.retailSubcategory === 'Fashion & Lifestyle'
    || businessSettings?.retailSubcategory === 'Fashion & Style';
  const isFoodGroceryRetail = isFoodGroceryRetailAccount(currentUser)
    || isFoodGroceryRetailAccount(serverUser)
    || businessSettings?.retailSubcategory === FOOD_GROCERY_RETAIL_SUBCATEGORY
    || businessSettings?.retailSubcategory === 'Food & Grocery';
  const isHomeLivingRetail = isHomeLivingRetailAccount(currentUser)
    || isHomeLivingRetailAccount(serverUser)
    || businessSettings?.retailSubcategory === HOME_LIVING_RETAIL_SUBCATEGORY
    || businessSettings?.retailSubcategory === 'Home & Living';
  const isSpecialtyPersonalRetail = isSpecialtyPersonalRetailAccount(currentUser)
    || isSpecialtyPersonalRetailAccount(serverUser)
    || businessSettings?.retailSubcategory === SPECIALTY_PERSONAL_RETAIL_SUBCATEGORY
    || businessSettings?.retailSubcategory === 'Specialty & Personal Needs';
  const isBusinessSpecialtyRetail = isBusinessSpecialtyRetailAccount(currentUser)
    || isBusinessSpecialtyRetailAccount(serverUser)
    || businessSettings?.retailSubcategory === BUSINESS_SPECIALTY_RETAIL_SUBCATEGORY
    || businessSettings?.retailSubcategory === 'Business & Specialty Retail';
  const isSpecialRetail = isElectronicsRetail || isFashionRetail || isFoodGroceryRetail || isHomeLivingRetail || isSpecialtyPersonalRetail || isBusinessSpecialtyRetail;
  const [search, setSearch]         = useState('');
  const [category, setCategory]     = useState('All Categories');
  const [itemType, setItemType]     = useState(initialItemType);
  const [categories, setCategories] = useState(['All Categories']);
  const [brands, setBrands]         = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [sizes, setSizes]           = useState([]);
  const [fabrics, setFabrics]       = useState([]);
  const [colours, setColours]       = useState([]);
  const [types, setTypes]           = useState([]);
  const [products, setProducts]     = useState([]);
  const [stats, setStats]           = useState(null);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [modal, setModal]           = useState(null); // null | { mode: 'add' } | { mode: 'edit', data: obj }
  const [importing, setImporting]   = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [scanCode, setScanCode] = useState('');
  const [scanMessage, setScanMessage] = useState('');
  const fileInputRef = useRef(null);
  const searchRef = useRef(null);

  const LIMIT = 5;
  const isServiceSection = lockedItemType === 'Service';
  const isProductSection = lockedItemType === 'Product';
  const isSpecialRetailProductList = isSpecialRetail && !isServiceSection;
  const pageTitle = isServiceSection ? 'Services' : isElectronicsRetail ? 'Electronics Inventory' : isFashionRetail ? 'Fashion Inventory' : isFoodGroceryRetail ? 'Food & Grocery Inventory' : isHomeLivingRetail ? 'Home & Living Inventory' : isSpecialtyPersonalRetail ? 'Specialty & Personal Needs Inventory' : isBusinessSpecialtyRetail ? 'Business & Specialty Retail Inventory' : 'Products';
  const pageSubtitle = isServiceSection
    ? 'Manage non-stock services, service codes, pricing, and tax'
    : isElectronicsRetail
    ? 'Manage devices, models, serial or IMEI details, warranty, stock, and pricing'
    : isFashionRetail
      ? 'Manage apparel, footwear, lifestyle products, attributes, stock, and pricing'
      : isFoodGroceryRetail
        ? 'Manage grocery products, packs, batches, expiry, stock, pricing, and tax'
        : isHomeLivingRetail
          ? 'Manage furniture, decor, kitchen, storage, stock, pricing, and tax'
          : isSpecialtyPersonalRetail
            ? 'Manage specialty and personal needs products, stock, pricing, and tax'
            : isBusinessSpecialtyRetail
              ? 'Manage business and specialty retail products, stock, pricing, and tax'
    : 'Manage stock products, pricing, tax, and inventory';
  const itemNameHeader = isServiceSection ? 'Service Name' : isElectronicsRetail ? 'Product / Device' : isFashionRetail ? 'Product / Style' : isFoodGroceryRetail || isHomeLivingRetail || isSpecialtyPersonalRetail || isBusinessSpecialtyRetail || isProductSection ? 'Product Name' : 'Item Name';
  const searchPlaceholder = isServiceSection ? 'Search services...' : isElectronicsRetail ? 'Search devices, brand, model, serial...' : isFashionRetail ? 'Search fashion products, brand, SKU...' : isFoodGroceryRetail ? 'Search grocery products, brand, barcode...' : isHomeLivingRetail ? 'Search furniture, decor, brand, barcode...' : isSpecialtyPersonalRetail ? 'Search specialty products, brand, barcode...' : isBusinessSpecialtyRetail ? 'Search business products, brand, barcode...' : 'Search products... (/)';
  const scanPlaceholder = isServiceSection ? 'Search service code and press Enter' : isElectronicsRetail ? 'Scan barcode, serial / IMEI, or item code and press Enter' : isFashionRetail ? 'Scan barcode, SKU, or product code and press Enter' : isFoodGroceryRetail || isHomeLivingRetail || isSpecialtyPersonalRetail || isBusinessSpecialtyRetail ? 'Scan barcode or product code and press Enter' : 'Scan barcode here and press Enter';
  const addButtonLabel = isServiceSection ? 'Add Service' : isElectronicsRetail ? 'Add Device' : 'Add Product';
  const itemTypeOptions = isElectronicsRetail
    ? [
        { value: 'All Items', label: 'All Devices' },
        { value: 'Product', label: 'Devices' },
      ]
    : isFashionRetail || isFoodGroceryRetail || isHomeLivingRetail || isSpecialtyPersonalRetail || isBusinessSpecialtyRetail
      ? [
          { value: 'All Items', label: 'All Products' },
          { value: 'Product', label: 'Products' },
        ]
    : ['All Items', 'Product', 'Service'];
  const visibleProductIds = products.map((product) => product._id).filter(Boolean);
  const selectedCount = selectedProductIds.length;
  const allVisibleSelected = visibleProductIds.length > 0 && visibleProductIds.every((id) => selectedProductIds.includes(id));
  const someVisibleSelected = visibleProductIds.some((id) => selectedProductIds.includes(id));

  function loadStats() {
    api.invProductStats().then(setStats).catch(() => {});
  }

  function loadCategories() {
    api.invProductCategories().then((cats) => setCategories(['All Categories', ...optionNames(cats)])).catch(() => {});
  }

  function loadBrands() {
    api.invProductBrands().then((rows) => setBrands(optionNames(rows))).catch(() => {});
  }

  function loadSubCategories() {
    api.invProductSubcategories().then((rows) => setSubCategories(optionNames(rows))).catch(() => {});
  }

  function loadSizes() {
    api.invProductSizes().then(setSizes).catch(() => {});
  }

  function loadFabrics() {
    api.invProductFabrics().then(setFabrics).catch(() => {});
  }

  function loadColours() {
    api.invProductColours().then(setColours).catch(() => {});
  }

  function loadTypes() {
    api.invProductTypes().then(setTypes).catch(() => {});
  }

  function loadProducts() {
    setLoading(true);
    setError('');
    const params = { page, limit: LIMIT };
    if (search) params.search = search;
    if (category !== 'All Categories') params.category = category;
    if (lockedItemType) params.itemType = lockedItemType;
    else if (isSpecialRetail || isProductSection) params.itemType = 'Product';
    else if (itemType !== 'All Items') params.itemType = itemType;
    api.invListProducts(params)
      .then((res) => {
        setProducts(res.data);
        setTotal(res.total);
        setSelectedProductIds([]);
        setBulkAction('');
      })
      .catch(() => setError('Failed to load products'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadStats();
    loadCategories();
    loadBrands();
    loadSubCategories();
    loadSizes();
    loadFabrics();
    loadColours();
    loadTypes();
    api.getMe().then(setServerUser).catch(() => setServerUser(null));
    api.getSettings().then(setBusinessSettings).catch(() => setBusinessSettings(null));
  }, []);

  useEffect(() => {
    setItemType(lockedItemType || initialItemType || 'Product');
    setSearch('');
    setCategory('All Categories');
    setPage(1);
    setProducts([]);
    setTotal(0);
    setSelectedProductIds([]);
    setBulkAction('');
  }, [lockedItemType, initialItemType]);

  useEffect(() => { loadProducts(); }, [search, category, itemType, page, lockedItemType, isSpecialRetail]); // eslint-disable-line react-hooks/exhaustive-deps

  // Arriving here from a billing screen's "unrecognized barcode" scan —
  // open the add form pre-filled so the product can be registered properly
  // (full details, not just the barcode) instead of dropping a bare line
  // item into that invoice.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const newBarcode = params.get('newBarcode');
    if (!newBarcode) return;
    if (isServiceSection) {
      navigate('/services/new');
      return;
    }
    setModal({ mode: 'add', nextCode: '', initialBarcode: newBarcode, forceServiceMode: isServiceSection });
    params.delete('newBarcode');
    const rest = params.toString();
    window.history.replaceState(null, '', rest ? `${window.location.pathname}?${rest}` : window.location.pathname);
  }, [isServiceSection, isElectronicsRetail, isFashionRetail, isHomeLivingRetail, isSpecialtyPersonalRetail, isBusinessSpecialtyRetail, navigate]);

  useEffect(() => {
    function handleListShortcut(e) {
      if (e.key !== '+' && e.code !== 'NumpadAdd') return;
      const tagName = e.target?.tagName;
      const isTypingTarget = e.target?.isContentEditable || tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT';
      if (isTypingTarget) return;
      e.preventDefault();
      openAddModal();
    }
    window.addEventListener('keydown', handleListShortcut);
    return () => window.removeEventListener('keydown', handleListShortcut);
  }, []);

  const { highlightedIndex } = useListKeyboardNav({
    rowCount: products.length,
    onOpen: (index) => {
      if (isServiceSection) {
        navigate(`/services/${products[index]._id}/edit`);
        return;
      }
      setModal({ mode: 'edit', data: products[index] });
    },
    searchRef,
  });

  function handleSave(_result, options = {}) {
    const wasEdit = modal?.mode === 'edit';
    if (!options.keepOpen) setModal(null);
    loadStats();
    loadCategories();
    loadBrands();
    loadSubCategories();
    loadSizes();
    loadFabrics();
    loadColours();
    loadTypes();

    if (wasEdit || options.keepOpen) {
      loadProducts();
      return;
    }

    setSearch('');
    setCategory('All Categories');
    setItemType(lockedItemType || 'Product');
    setPage(1);
    api.invListProducts({ page: 1, limit: LIMIT, itemType: lockedItemType || 'Product' })
      .then((res) => {
        setProducts(res.data);
        setTotal(res.total);
      })
      .catch(() => loadProducts());
  }

  function openAddModal() {
    if (isServiceSection) {
      navigate('/services/new');
      return;
    }
    setModal({ mode: 'add', nextCode: '', initialProductType: isServiceSection ? 'Service' : isElectronicsRetail || isFashionRetail || isHomeLivingRetail || isSpecialtyPersonalRetail || isBusinessSpecialtyRetail ? 'Standard' : '', forceServiceMode: isServiceSection });
  }

  function findProductByScan(rows = [], value = '') {
    const needle = String(value || '').trim().toLowerCase();
    const text = (input) => String(input || '').trim().toLowerCase();
    return rows.find((row) => text(row.barcode) === needle)
      || rows.find((row) => text(row.code) === needle)
      || rows.find((row) => text(row.serialNumber) === needle)
      || rows.find((row) => text(row.modelNumber) === needle)
      || rows.find((row) => (row.variants || []).some((variant) => text(variant.barcode) === needle || text(variant.modelName) === needle))
      || rows.find((row) => text(row.description) === needle)
      || null;
  }

  async function handleScanSubmit(e) {
    e.preventDefault();
    const code = scanCode.trim();
    if (!code) return;
    setScanMessage('');
    try {
      const result = await api.invListProducts({ search: code, page: 1, limit: 20, itemType: lockedItemType || 'Product' });
      const rows = Array.isArray(result?.data) ? result.data : [];
      const match = findProductByScan(rows, code);
      if (match) {
        setSearch(match.barcode || match.code || match.description || code);
        setCategory('All Categories');
        setItemType(lockedItemType || 'Product');
        setPage(1);
        setScanMessage(`Found product: ${match.description}`);
      } else {
        if (isServiceSection) {
          navigate('/services/new');
          setScanMessage('Add the new service details once to save it.');
          return;
        }
        setModal({ mode: 'add', nextCode: '', initialBarcode: isServiceSection ? '' : code, initialProductType: isServiceSection ? 'Service' : '', forceServiceMode: isServiceSection });
        setScanMessage('New barcode scanned. Add item details once to save it.');
      }
    } catch (err) {
      setScanMessage(err.message || 'Unable to scan item');
    } finally {
      setScanCode('');
    }
  }

  function handleImportFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPendingFile(file);
  }

  async function confirmImport() {
    const file = pendingFile;
    if (!file) return;
    setPendingFile(null);
    setImporting(true);
    setImportResult(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const result = await api.invImportProducts(formData, isServiceSection ? { itemType: 'Service' } : undefined);
      setImportResult(result);
      loadStats();
      loadCategories();
      loadBrands();
      loadSubCategories();
      loadSizes();
      loadFabrics();
      loadColours();
      loadTypes();
      loadProducts();
    } catch (e) {
      setImportResult({ error: e.message || 'Import failed' });
    } finally {
      setImporting(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this item?')) return;
    try {
      await api.invDeleteProduct(id);
      loadStats();
      const nextTotal = Math.max(0, total - 1);
      const nextTotalPages = Math.max(1, Math.ceil(nextTotal / LIMIT));
      setTotal(nextTotal);
      if (page > nextTotalPages) {
        setPage(nextTotalPages);
      } else {
        loadProducts();
      }
    } catch {
      alert('Failed to delete product');
    }
  }

  function toggleSelectProduct(id) {
    setSelectedProductIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  function toggleSelectVisibleProducts() {
    setSelectedProductIds((prev) => {
      if (allVisibleSelected) return prev.filter((id) => !visibleProductIds.includes(id));
      return [...new Set([...prev, ...visibleProductIds])];
    });
  }

  async function handleBulkAction(value = bulkAction) {
    if (!value) return;
    if (value === 'clear') {
      setSelectedProductIds([]);
      setBulkAction('');
      return;
    }
    if (value !== 'delete') return;
    if (!selectedProductIds.length) {
      alert('Select at least one product');
      setBulkAction('');
      return;
    }
    if (!window.confirm(`Delete ${selectedProductIds.length} selected product${selectedProductIds.length > 1 ? 's' : ''}?`)) {
      setBulkAction('');
      return;
    }
    setBulkDeleting(true);
    try {
      await Promise.all(selectedProductIds.map((id) => api.invDeleteProduct(id)));
      setSelectedProductIds([]);
      setBulkAction('');
      loadStats();
      const nextTotal = Math.max(0, total - selectedProductIds.length);
      const nextTotalPages = Math.max(1, Math.ceil(nextTotal / LIMIT));
      if (page > nextTotalPages) setPage(nextTotalPages);
      else loadProducts();
    } catch {
      alert('Failed to delete selected products');
    } finally {
      setBulkDeleting(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="p-7">
      {modal && (
        <ProductModal
          key={`${modal.mode}-${modal.forceServiceMode ? 'service' : 'product'}-${modal.initialProductType || ''}-${modal.initialBarcode || ''}-${modal.data?._id || ''}`}
          mode={modal.mode}
          initial={modal.mode === 'edit' ? modal.data : null}
          nextCode={modal.nextCode}
          initialBarcode={modal.initialBarcode || ''}
          initialProductType={modal.initialProductType || ''}
          forceServiceMode={Boolean(modal.forceServiceMode)}
          categories={categories}
          brands={brands}
          subCategories={subCategories}
          sizes={sizes}
          fabrics={fabrics}
          colours={colours}
          types={types}
          forceElectronicsRetail={isElectronicsRetail}
          forceFashionRetail={isFashionRetail}
          forceFoodGroceryRetail={isFoodGroceryRetail}
          forceHomeLivingRetail={isHomeLivingRetail}
          forceSpecialtyPersonalRetail={isSpecialtyPersonalRetail}
          forceBusinessSpecialtyRetail={isBusinessSpecialtyRetail}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {pendingFile && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={(e) => e.target === e.currentTarget && setPendingFile(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-100 mx-4 p-6">
            <h2 className="text-[16px] font-bold text-[#111827] mb-2">Import Products</h2>
            <p className="text-[13px] text-[#536173] mb-5">
              Import products from <span className="font-medium text-[#111827]">{pendingFile.name}</span>? Existing products with matching codes will be updated.
            </p>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setPendingFile(null)} className="px-4 py-2 text-[13px] font-medium text-[#374151] bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit]">No</button>
              <button type="button" onClick={confirmImport} className="px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit]">Yes, Import</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 mb-3">
        <div>
          <h1 className="m-0 text-[22px] font-bold text-[#111827]">{pageTitle}</h1>
          <p className="m-0 text-[13px] text-[#536173] mt-0.5">{pageSubtitle}</p>
        </div>
        <div className="flex gap-2">
          <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleImportFile} />
          <button
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-[#374151] bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit] disabled:opacity-60"
            type="button"
            disabled={importing}
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadIcon />
            {importing ? 'Importing...' : 'Import Excel'}
          </button>
          <button
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit]"
            type="button"
            title={`${addButtonLabel} (+)`}
            onClick={openAddModal}
          >
            <svg fill="none" height="14" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="14"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
            {addButtonLabel}
          </button>
        </div>
      </div>

      <ShortcutsHint
        items={[[['+'], 'Add Item'], [['/'], 'Search'], [['↑', '↓'], 'Navigate'], [['Enter'], 'Edit row']]}
        className="mb-5"
      />

      <form onSubmit={handleScanSubmit} className="mb-5 bg-white border border-[#dfe7f1] rounded-xl p-4 flex flex-col md:flex-row md:items-end gap-3">
        <div className="flex-1">
          <label className={LABEL}>{isServiceSection ? 'Search Service Code' : isElectronicsRetail ? 'Scan Barcode / Serial / IMEI' : isFashionRetail || isFoodGroceryRetail || isHomeLivingRetail || isSpecialtyPersonalRetail || isBusinessSpecialtyRetail ? 'Scan Barcode / Product Code' : 'Scan Item Barcode'}</label>
          <input
            className={INPUT}
            placeholder={scanPlaceholder}
            value={scanCode}
            onChange={(e) => setScanCode(e.target.value)}
            autoComplete="off"
          />
          {scanMessage && <div className="mt-1.5 text-[12px] text-blue-700">{scanMessage}</div>}
        </div>
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit]"
        >
          Scan / Add
        </button>
      </form>

      {importResult && (
        <div className={`mb-5 px-4 py-3 rounded-lg text-[13px] border ${importResult.error ? 'bg-red-50 border-red-100 text-red-700' : 'bg-green-50 border-green-100 text-green-700'}`}>
          {importResult.error ? (
            <div>{importResult.error}</div>
          ) : (
            <>
              <div className="font-medium">
                Import complete: {importResult.imported} added, {importResult.updated} updated
                {importResult.skipped > 0 && `, ${importResult.skipped} skipped`}.
              </div>
              {importResult.errors?.length > 0 && (
                <ul className="mt-1.5 list-disc pl-5 text-[12px]">
                  {importResult.errors.slice(0, 5).map((err, i) => <li key={i}>{err}</li>)}
                  {importResult.errors.length > 5 && <li>...and {importResult.errors.length - 5} more</li>}
                </ul>
              )}
            </>
          )}
          <button type="button" onClick={() => setImportResult(null)} className="mt-1.5 text-[12px] underline bg-transparent border-0 cursor-pointer p-0 text-inherit font-[inherit]">Dismiss</button>
        </div>
      )}

      <div className={`grid grid-cols-1 sm:grid-cols-2 ${lockedItemType || isSpecialRetailProductList ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} gap-4 mb-5`}>
        {[
          { label: isServiceSection ? 'Total Services' : isElectronicsRetail ? 'Total Devices' : 'Total Products', value: stats ? Number(isServiceSection ? stats.services || 0 : stats.products || 0).toLocaleString('en-IN') : '—', sub: 'Active', color: '#2563eb', bg: '#eff6ff', icon: <svg fill="none" height="20" stroke="#2563eb" strokeWidth="2" viewBox="0 0 24 24" width="20"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg> },
          !lockedItemType && !isSpecialRetailProductList && !isServiceSection ? { label: 'Services', value: stats ? Number(stats.services || 0).toLocaleString('en-IN') : '—', sub: 'Non-stock', color: '#0891b2', bg: '#ecfeff', icon: <svg fill="none" height="20" stroke="#0891b2" strokeWidth="2" viewBox="0 0 24 24" width="20"><path d="M4 7h16M4 12h16M4 17h10"/></svg> } : null,
          { label: isElectronicsRetail ? 'Low Stock Devices' : isFashionRetail || isFoodGroceryRetail || isHomeLivingRetail || isSpecialtyPersonalRetail || isBusinessSpecialtyRetail ? 'Low Stock Products' : 'Low Stock Items', value: stats ? stats.lowStock.toLocaleString('en-IN') : '—', sub: 'Alert', color: '#f59e0b', bg: '#fffbeb', icon: <svg fill="none" height="20" stroke="#f59e0b" strokeWidth="2" viewBox="0 0 24 24" width="20"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg> },
          { label: 'Total Value',         value: stats ? formatINR(stats.totalValue) : '—',                sub: 'Inventory Value', color: '#7c3aed', bg: '#f5f3ff', icon: <IndianRupee size={20} color="#7c3aed" /> },
        ].filter(Boolean).map((s) => (
          <div key={s.label} className="bg-white border border-[#dfe7f1] rounded-xl p-4 flex items-start justify-between gap-3">
            <div>
              <div className="text-xs text-[#536173] mb-1">{s.label}</div>
              <div className="text-[24px] font-bold leading-tight" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-[#536173] mt-1">{s.sub}</div>
            </div>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-none" style={{ background: s.bg }}>{s.icon}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-[#dfe7f1] rounded-xl">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[#edf2f7] flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#536173]" fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>
            <input ref={searchRef} className="border border-[#dbe4ef] rounded-md pl-8 pr-3 py-2 text-[13px] w-full outline-none focus:border-blue-500 font-[inherit]" placeholder={searchPlaceholder} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          {!isSpecialRetailProductList && !lockedItemType && (
            <SelectDropdown
              className="w-36 flex-none"
              value={itemType}
              onChange={(v) => { setItemType(v); setPage(1); }}
              options={itemTypeOptions}
            />
          )}
          <SelectDropdown
            className="w-40 flex-none"
            value={category}
            onChange={(v) => { setCategory(v); setPage(1); }}
            options={categories}
          />
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[12px] font-medium text-[#536173]">
              {selectedCount} selected
            </span>
            <select
              className="h-9 rounded-md border border-[#dbe4ef] bg-white px-3 text-[12px] font-medium text-[#111827] outline-none focus:border-blue-500 font-[inherit] disabled:opacity-60"
              value={bulkAction}
              disabled={bulkDeleting}
              onChange={(e) => {
                const value = e.target.value;
                setBulkAction(value);
                handleBulkAction(value);
              }}
            >
              <option value="">Actions</option>
              <option value="clear">Clear Selection</option>
              <option value="delete">Delete Selected</option>
            </select>
          </div>
        </div>

        {error && <div className="px-5 py-4 text-[13px] text-red-600">{error}</div>}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={TH}>
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    disabled={!visibleProductIds.length}
                    onChange={toggleSelectVisibleProducts}
                    title={someVisibleSelected && !allVisibleSelected ? 'Some products selected' : 'Select all visible products'}
                  />
                </th>
                <th className={TH}>{itemNameHeader}</th>
                {!lockedItemType && !isSpecialRetailProductList && <th className={TH}>Type</th>}
                <th className={TH}>{isSpecialRetailProductList ? 'HSN' : 'HSN / SAC'}</th>
                <th className={TH}>Category</th>
                <th className={TH}>Brand</th>
                <th className={TH}>Sale Price</th>
                <th className={TH}>GST</th>
                <th className={TH}>Stock</th>
                <th className={TH}>Status</th>
                <th className={TH}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={lockedItemType || isSpecialRetailProductList ? 10 : 11} className="px-5 py-8 text-center text-[13px] text-[#536173]">Loading...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={lockedItemType || isSpecialRetailProductList ? 10 : 11} className="px-5 py-8 text-center text-[13px] text-[#536173]">No items found</td></tr>
              ) : products.map((row, idx) => (
                <tr key={row._id} className={`hover:bg-gray-50 ${highlightedIndex === idx ? 'bg-[#eef4fd]' : ''}`}>
                  <td className={TD}>
                    <input
                      type="checkbox"
                      checked={selectedProductIds.includes(row._id)}
                      onChange={() => toggleSelectProduct(row._id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td className={`${TD} font-medium text-[#111827]`}>
                    <div>{row.description}</div>
                    {isElectronicsRetail && compactJoin([
                      row.modelNumber ? `Model: ${row.modelNumber}` : '',
                      row.serialNumber ? `Serial/IMEI: ${row.serialNumber}` : '',
                      row.warrantyPeriod ? `Warranty: ${row.warrantyPeriod}` : '',
                    ]) && (
                      <div className="mt-1 text-[11px] font-medium text-[#536173]">
                        {compactJoin([
                          row.modelNumber ? `Model: ${row.modelNumber}` : '',
                          row.serialNumber ? `Serial/IMEI: ${row.serialNumber}` : '',
                          row.warrantyPeriod ? `Warranty: ${row.warrantyPeriod}` : '',
                        ])}
                      </div>
                    )}
                    {Array.isArray(row.variants) && row.variants.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {row.variants.slice(0, 3).map((variant) => (
                          <span key={variant._id || variantDisplayName(variant)} className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-semibold text-slate-600">
                            {variantDisplayName(variant)}: {Number(variant.stock || 0)}
                          </span>
                        ))}
                        {row.variants.length > 3 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-semibold text-slate-600">+{row.variants.length - 3}</span>
                        )}
                      </div>
                    )}
                  </td>
                  {!lockedItemType && !isSpecialRetailProductList && (
                    <td className={TD}>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${row.itemType === 'Service' ? 'bg-cyan-100 text-cyan-700' : 'bg-blue-100 text-blue-700'}`}>{row.itemType || 'Product'}</span>
                    </td>
                  )}
                  <td className={`${TD} text-[#536173] font-mono`}>{row.hsn || '-'}</td>
                  <td className={`${TD} text-[#536173]`}>{row.category || '—'}</td>
                  <td className={`${TD} text-[#536173]`}>{row.brand || '—'}</td>
                  <td className={`${TD} font-medium text-[#111827]`}>{formatCurrency(row.rate)}</td>
                  <td className={`${TD} text-[#536173]`}>{Number(row.gstRate ?? 0)}%</td>
                  <td className={`${TD} text-[#111827]`}>{row.itemType === 'Service' ? '—' : row.stock}</td>
                  <td className={TD}>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${row.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{row.status}</span>
                  </td>
                  <td className={TD}>
                    <div className="flex items-center gap-1">
                      <button
                        className="w-7 h-7 flex items-center justify-center rounded hover:bg-yellow-50 text-yellow-500 bg-transparent border-0 cursor-pointer"
                        type="button"
                        title="Edit"
                        onClick={() => {
                          if (isServiceSection) {
                            navigate(`/services/${row._id}/edit`);
                            return;
                          }
                          setModal({ mode: 'edit', data: row });
                        }}
                      >
                        <EditIcon />
                      </button>
                      <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-50 text-red-400 bg-transparent border-0 cursor-pointer" type="button" title="Delete" onClick={() => handleDelete(row._id)}>
                        <TrashIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-[#edf2f7] flex flex-wrap justify-between gap-2 text-[13px] text-[#536173]">
          <span>Showing {products.length === 0 ? 0 : (page - 1) * LIMIT + 1} to {(page - 1) * LIMIT + products.length} of {total} entries</span>
          <div className="flex items-center gap-1 flex-wrap">
            <button className="px-2.5 py-1 rounded border border-[#dbe4ef] hover:bg-gray-50 text-[12px] bg-white font-[inherit] cursor-pointer disabled:opacity-40" type="button" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>←</button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
              <button key={p} className={`px-2.5 py-1 rounded text-[12px] font-[inherit] cursor-pointer border ${p === page ? 'bg-blue-600 text-white border-blue-600' : 'border-[#dbe4ef] hover:bg-gray-50 bg-white'}`} type="button" onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="px-2.5 py-1 rounded border border-[#dbe4ef] hover:bg-gray-50 text-[12px] bg-white font-[inherit] cursor-pointer disabled:opacity-40" type="button" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>→</button>
          </div>
        </div>
      </div>
    </div>
  );
}





