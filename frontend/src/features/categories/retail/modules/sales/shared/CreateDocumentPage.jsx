import { useEffect, useMemo, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import {
  Document as PdfDocument,
  Page as PdfPage,
  Rect as PdfRect,
  StyleSheet as PdfStyleSheet,
  Svg as PdfSvg,
  Text as PdfText,
  View as PdfView,
  pdf,
} from '@react-pdf/renderer';
import {
  ArrowLeft, ArrowRightLeft, Barcode, Camera, Calendar, CheckCircle2, ChevronDown, Download, Eye, FileCheck, FileMinus,
  FilePlus, FileText, ClipboardList, Lock, Mail, Menu, Package,
  Pencil, Phone, Pill, Plus, Printer, Receipt, RefreshCw, Route, Save, Search, Send,
  ShoppingCart, Smartphone, Tag, Trash2, Truck, User, UserPlus, X, Zap,
} from 'lucide-react';
import { formatCurrency } from '../../../../../../utils/formatCurrency.js';
import { numberToWords } from '../../../../../../utils/numberToWords.js';
import { api, SERVER_ORIGIN } from '../../../../../../services/api.js';
import { useKeyboardMode } from '../../../../../../app/KeyboardModeContext.jsx';
import { documentConfigs } from '../documentConfigs.js';
import { DocumentPreviewModal } from './DocumentPreviewModal.jsx';
import { SupplierReturnPurchase } from './SupplierReturnPurchase.jsx';
import { SalesReturnInvoice } from './SalesReturnInvoice.jsx';
import { CalculatorPopup } from './CalculatorPopup.jsx';
import { MOBILE_ADD_ITEM_EVENT } from '../../../../../../components/layout/MobileBottomNav.jsx';
import { SelectDropdown } from '../../../../../../components/forms/SelectDropdown.jsx';
import { AutocompleteInput } from '../../../../../../components/forms/AutocompleteInput.jsx';
import { ProductModal } from '../../../../common/modules/inventory/ProductsPage.jsx';

const DOC_ICON_MAP = {
  ArrowRightLeft, ClipboardList, FileCheck, FileMinus, FilePlus, FileText,
  Pill, Receipt, Route, ShoppingCart, Truck, Zap,
};

function DocIcon({ name, ...props }) {
  const Icon = DOC_ICON_MAP[name] || Receipt;
  return <Icon {...props} />;
}

function WhatsAppIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 3.4a8.47 8.47 0 0 0-7.28 12.8L3.7 20.6l4.52-1.03a8.48 8.48 0 1 0 3.82-16.17Zm0 1.65a6.82 6.82 0 0 1 5.8 10.4 6.8 6.8 0 0 1-8.98 2.48l-.36-.18-2.7.61.63-2.6-.22-.39A6.82 6.82 0 0 1 12.04 5.05Zm-2.86 3.5c-.15 0-.4.05-.61.3-.22.25-.8.78-.8 1.9 0 1.13.82 2.22.93 2.37.12.15 1.6 2.56 3.96 3.49 1.96.77 2.36.62 2.78.58.43-.04 1.37-.56 1.56-1.1.2-.54.2-1 .14-1.1-.06-.1-.22-.16-.46-.28-.24-.12-1.38-.68-1.6-.76-.21-.08-.37-.12-.53.12-.15.24-.61.76-.75.91-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.95-1.2-.72-.64-1.2-1.44-1.35-1.68-.14-.24-.02-.37.11-.49.12-.11.25-.28.37-.42.12-.15.16-.25.24-.41.08-.16.04-.3-.02-.42-.06-.12-.53-1.28-.73-1.75-.19-.46-.38-.4-.53-.41h-.45Z" />
    </svg>
  );
}

const PURCHASE_LABEL_CODE39_PATTERNS = {
  0: 'nnnwwnwnn', 1: 'wnnwnnnnw', 2: 'nnwwnnnnw', 3: 'wnwwnnnnn', 4: 'nnnwwnnnw',
  5: 'wnnwwnnnn', 6: 'nnwwwnnnn', 7: 'nnnwnnwnw', 8: 'wnnwnnwnn', 9: 'nnwwnnwnn',
  A: 'wnnnnwnnw', B: 'nnwnnwnnw', C: 'wnwnnwnnn', D: 'nnnnwwnnw', E: 'wnnnwwnnn',
  F: 'nnwnwwnnn', G: 'nnnnnwwnw', H: 'wnnnnwwnn', I: 'nnwnnwwnn', J: 'nnnnwwwnn',
  K: 'wnnnnnnww', L: 'nnwnnnnww', M: 'wnwnnnnwn', N: 'nnnnwnnww', O: 'wnnnwnnwn',
  P: 'nnwnwnnwn', Q: 'nnnnnnwww', R: 'wnnnnnwwn', S: 'nnwnnnwwn', T: 'nnnnwnwwn',
  U: 'wwnnnnnnw', V: 'nwwnnnnnw', W: 'wwwnnnnnn', X: 'nwnnwnnnw', Y: 'wwnnwnnnn',
  Z: 'nwwnwnnnn', '-': 'nwnnnnwnw', '.': 'wwnnnnwnn', ' ': 'nwwnnnwnn', '$': 'nwnwnwnnn',
  '/': 'nwnwnnnwn', '+': 'nwnnnwnwn', '%': 'nnnwnwnwn', '*': 'nwnnwnwnn',
};

const MM_TO_PT = 72 / 25.4;
const mm = (value) => value * MM_TO_PT;
const BARCODE_LABEL_PAGE_SIZE = [mm(80), mm(24)];

function normalizePurchaseLabelBarcode(value) {
  const raw = String(value || '').trim().toUpperCase();
  return raw.replace(/[^0-9A-Z ./$+%-]/g, '-').slice(0, 32) || 'NO-CODE';
}

function code39BarRects(value, height = 34) {
  const encoded = `*${normalizePurchaseLabelBarcode(value)}*`;
  const bars = [];
  let x = 10;
  const narrow = 1;
  const wide = 2.15;

  encoded.split('').forEach((char, charIndex) => {
    const pattern = PURCHASE_LABEL_CODE39_PATTERNS[char] || PURCHASE_LABEL_CODE39_PATTERNS['-'];
    pattern.split('').forEach((part, index) => {
      const width = part === 'w' ? wide : narrow;
      if (index % 2 === 0) bars.push({ key: `${charIndex}-${index}`, x, y: 0, width, height });
      x += width;
    });
    x += narrow;
  });
  return { bars, width: x + 10, height };
}

function PurchaseLabelBarcode({ value, height = 34 }) {
  const { bars, width } = code39BarRects(value, height);
  return (
    <svg width="260" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: 'block', shapeRendering: 'crispEdges' }}>
      {bars.map((bar) => <rect key={bar.key} x={bar.x} y={bar.y} width={bar.width} height={bar.height} fill="#111827" />)}
    </svg>
  );
}

function PurchaseLabelPdfBarcode({ value }) {
  const height = 32;
  const { bars, width } = code39BarRects(value, height);
  return (
    <PdfSvg width={mm(31)} height={mm(8)} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {bars.map((bar) => (
        <PdfRect key={bar.key} x={bar.x} y={bar.y} width={bar.width} height={bar.height} fill="#111827" />
      ))}
    </PdfSvg>
  );
}

const purchaseBarcodePdfStyles = PdfStyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    paddingTop: mm(2),
    paddingRight: mm(2),
    paddingBottom: mm(2),
    paddingLeft: mm(2),
  },
  label: {
    width: mm(35),
    height: mm(18.5),
    borderWidth: 0.75,
    borderColor: '#cbd5e1',
    borderRadius: 0,
    padding: mm(1.2),
    color: '#111827',
    fontFamily: 'Helvetica',
    overflow: 'hidden',
  },
  labelGap: {
    marginRight: mm(3),
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    minHeight: mm(4.8),
  },
  titleWrap: {
    flexGrow: 1,
    flexShrink: 1,
    paddingRight: mm(1),
  },
  name: {
    fontSize: 6.4,
    fontWeight: 700,
    lineHeight: 1.05,
  },
  meta: {
    marginTop: mm(0.2),
    color: '#475569',
    fontSize: 4.8,
    lineHeight: 1.05,
  },
  price: {
    flexShrink: 0,
    fontSize: 6.4,
    fontWeight: 700,
    lineHeight: 1,
  },
  barcode: {
    alignItems: 'center',
    marginTop: mm(0.8),
  },
  code: {
    marginTop: mm(0.4),
    color: '#475569',
    width: '70%',
    alignSelf: 'center',
    fontSize: 6.5,
    letterSpacing: 0.35,
    lineHeight: 1,
    textAlign: 'center',
  },
});

function PurchaseBarcodePdfDocument({ rows = [] }) {
  return (
    <PdfDocument title="Purchase Barcode Labels">
      {chunkPurchaseBarcodePages(rows).map((pageRows, pageIndex) => (
        <PdfPage key={`barcode-pdf-page-${pageIndex}`} size={BARCODE_LABEL_PAGE_SIZE} style={purchaseBarcodePdfStyles.page}>
          {pageRows.map((row, rowIndex) => {
            const barcodeVal = row.barcode || '';
            const price = purchaseLabelPrice(row);
            return (
              <PdfView key={row.printKey || `${pageIndex}-${rowIndex}`} style={[purchaseBarcodePdfStyles.label, rowIndex === 0 && pageRows.length > 1 ? purchaseBarcodePdfStyles.labelGap : null]}>
                <PdfView style={purchaseBarcodePdfStyles.top}>
                  <PdfView style={purchaseBarcodePdfStyles.titleWrap}>
                    <PdfText style={purchaseBarcodePdfStyles.name}>{row.description || '-'}</PdfText>
                    <PdfText style={purchaseBarcodePdfStyles.meta}>{purchaseLabelVariantText(row)}</PdfText>
                  </PdfView>
                  {price ? <PdfText style={purchaseBarcodePdfStyles.price}>{price}</PdfText> : null}
                </PdfView>
                <PdfView style={purchaseBarcodePdfStyles.barcode}>
                  <PurchaseLabelPdfBarcode value={barcodeVal} />
                  <PdfText style={purchaseBarcodePdfStyles.code}>{normalizePurchaseLabelBarcode(barcodeVal)}</PdfText>
                </PdfView>
              </PdfView>
            );
          })}
        </PdfPage>
      ))}
    </PdfDocument>
  );
}

// ── Constants ────────────────────────────────────────────────────────────────

const UNITS = ['Nos', 'Pcs', 'Kg', 'Gm', 'Mt', 'Sq.ft', 'Ltr', 'Box', 'Bag', 'Set', 'Pair', 'Hrs', 'Days'];
const GST_RATES = [0, 5, 12, 18, 28];
const BUSINESS_STATE = 'Tamil Nadu';
const ELECTRONICS_RETAIL_SUBCATEGORY = 'electronics-technology';
const FASHION_RETAIL_SUBCATEGORY = 'fashion-lifestyle';
const SIZE_PRESETS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
const FASHION_MATERIALS = ['Cotton', 'Denim', 'Linen', 'Polyester', 'Silk', 'Wool', 'Leather', 'Rayon'];
const SALES_ITEM_FILTER_OPTIONS = [
  { value: 'Product', label: 'Product' },
  { value: 'Service', label: 'Service' },
];

const INDIAN_STATES = [
  'Andaman & Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar',
  'Chandigarh', 'Chhattisgarh', 'Dadra & Nagar Haveli', 'Daman & Diu', 'Delhi',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu & Kashmir', 'Jharkhand',
  'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra',
  'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal',
];

const INVOICE_TYPES = [
  { value: 'regular',       label: 'Regular — B2B (Registered)' },
  { value: 'b2c',           label: 'B2C (Unregistered Buyer)' },
  { value: 'export-wop',    label: 'Export — Without Payment of Tax' },
  { value: 'export-wp',     label: 'Export — With Payment of Tax' },
  { value: 'sez-wp',        label: 'SEZ Supply — With Tax' },
  { value: 'sez-wop',       label: 'SEZ Supply — Without Tax' },
  { value: 'deemed-export', label: 'Deemed Export' },
];

const PAYMENT_TERMS_LIST = [
  { value: 'immediate', label: 'Due on Receipt' },
  { value: '7',         label: 'Net 7 Days' },
  { value: '15',        label: 'Net 15 Days' },
  { value: '30',        label: 'Net 30 Days' },
  { value: '45',        label: 'Net 45 Days' },
  { value: '60',        label: 'Net 60 Days' },
  { value: '90',        label: 'Net 90 Days' },
];

const CHARGE_PRESETS = [
  { label: 'Freight',           gstRate: 5  },
  { label: 'Packing',           gstRate: 18 },
  { label: 'Insurance',         gstRate: 18 },
  { label: 'Loading/Unloading', gstRate: 18 },
];

const PAYMENT_METHODS = [
  { id: 'cash',   label: 'Cash',   emoji: '💵', color: '#16a34a', method: 'Cash'          },
  { id: 'upi',    label: 'UPI',    emoji: '📱', color: '#2563eb', method: 'UPI'           },
  { id: 'card',   label: 'Card',   emoji: '💳', color: '#7c3aed', method: 'Online'        },
  { id: 'bank',   label: 'Bank',   emoji: '🏦', color: '#0891b2', method: 'Bank Transfer' },
  { id: 'credit', label: 'Credit', emoji: '📅', color: '#dc2626', method: null            },
];

function partyKindFromLabel(label = '') {
  if (/vendor|supplier/i.test(label)) return 'Vendor';
  if (/consignee/i.test(label)) return 'Consignee';
  if (/quote/i.test(label)) return 'Party';
  if (/patient/i.test(label)) return 'Patient';
  return 'Customer';
}

function normalizedRetailSubcategory(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isFashionRetailSubcategory(value = '') {
  const normalized = normalizedRetailSubcategory(value);
  return normalized === FASHION_RETAIL_SUBCATEGORY
    || normalized === 'fashion-and-lifestyle'
    || normalized === 'fashion-and-style';
}

function cleanPartyNameLabel(label = '') {
  return label.replace(/\*/g, '').trim();
}

function lineItemDescription(item = {}) {
  return item.description
    || item.productName
    || item.name
    || item.itemName
    || item.product?.description
    || item.product?.name
    || item.product?.productName
    || item.productCode
    || item.code
    || '';
}

function normalizeInvoiceLineItem(item = {}, index = 0) {
  const variant = item.variant || item.productVariant || {};
  return {
    id: item.id ?? index + 1,
    itemType: item.itemType === 'Service' ? 'Service' : 'Product',
    ...item,
    description: lineItemDescription(item),
    size: item.size || item.modelName || item.modelNumber || variant.size || variant.modelName || '',
    brand: item.brand || item.other || item.variantBrand || variant.other || variant.brand || '',
    material: item.material || item.fabric || item.variantMaterial || variant.material || variant.fabric || '',
    barcode: item.barcode || variant.barcode || '',
  };
}

function getInitialLinkedPurchaseOrderId() {
  const query = window.location.search.slice(1);
  return new URLSearchParams(query).get('po') || '';
}

// ── CSS helpers ──────────────────────────────────────────────────────────────

const cx = {
  field:       'flex flex-col gap-1',
  label:       'text-xs text-[#536173] font-medium',
  input:       'border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] text-[#111827] w-full outline-none focus:border-blue-500 font-[inherit]',
  inputError:  'border border-red-400 bg-red-50 rounded-md px-3 py-2 text-[13px] text-[#111827] w-full outline-none focus:border-red-500 font-[inherit]',
  select:      'border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] text-[#111827] w-full outline-none bg-white font-[inherit]',
  btnOutline:  'inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium text-gray-700 bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit]',
  btnPrimary:  'inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium text-white bg-blue-600 border border-blue-600 rounded-md cursor-pointer hover:bg-blue-700 font-[inherit]',
  sectionTitle:'text-xs font-semibold uppercase text-[#536173] tracking-wide',
  toggleBtn:   (on) => `flex-1 py-2 text-[13px] border-0 cursor-pointer font-[inherit] transition-colors ${on ? 'text-white bg-blue-600' : 'text-[#536173] bg-white hover:bg-gray-50'}`,
};

// ── Pure helpers ─────────────────────────────────────────────────────────────

function calcLine(item) {
  const gross       = item.qty * item.rate;
  const discountValue = Number(item.discount) || 0;
  const discountAmt = Math.min(gross, gross * (discountValue / 100));
  const taxable     = gross - discountAmt;
  const gstAmt      = taxable * ((Number(item.gstRate) || 0) / 100);
  return { gross, discountAmt, taxable, gstAmt, total: taxable + gstAmt };
}

function calcDocumentTotal(doc = {}) {
  if (doc.totals?.finalTotal != null) return Number(doc.totals.finalTotal) || 0;
  if (doc.totals?.grandTotal != null) return Number(doc.totals.grandTotal) || 0;
  let total = 0;
  (doc.items || []).forEach((item) => {
    const line = calcLine({
      qty: Number(item.qty) || 0,
      rate: Number(item.rate) || 0,
      discount: Number(item.discount) || 0,
      discountType: 'percent',
      gstRate: Number(item.gstRate) || 0,
    });
    total += line.total;
  });
  (doc.charges || []).forEach((charge) => {
    const amount = Number(charge.amount) || 0;
    total += amount + amount * ((Number(charge.gstRate) || 0) / 100);
  });
  return Math.round(total);
}

function normalizeCustomer(customer = {}) {
  return {
    _id: customer._id ?? customer.id,
    id: customer.id ?? customer._id,
    name: customer.name || '',
    gstin: customer.gstin
      || customer.gstNumber
      || customer.gstNo
      || customer.gst_no
      || customer.vendorGstin
      || customer.vendorGstNumber
      || customer.vendorGstNo
      || customer.vendorGSTIN
      || '',
    phone: customer.phone || '',
    email: customer.email || '',
    address: customer.address || '',
    city: customer.city || '',
    state: customer.state || BUSINESS_STATE,
    pincode: customer.pincode || '',
    bankName: customer.bankName || '',
    accountHolderName: customer.accountHolderName || '',
    accountNumber: customer.accountNumber || '',
    ifscCode: customer.ifscCode || '',
    bankBranch: customer.bankBranch || '',
  };
}

function emptyCustomer(name = '') {
  return {
    _id: '', id: '', name, gstin: '', phone: '', email: '', address: '',
    city: '', state: BUSINESS_STATE, pincode: '',
    bankName: '', accountHolderName: '', accountNumber: '', ifscCode: '', bankBranch: '',
  };
}

function mergeParties(primary = [], fallback = []) {
  const seen = new Set();
  return [...primary, ...fallback].map(normalizeCustomer).filter((party) => {
    const key = String(party.gstin || party.phone || party.name || '').trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function phoneKey(phone) {
  return String(phone || '').replace(/\D/g, '').slice(-10);
}

function customerPayload(customer) {
  const payload = { ...normalizeCustomer(customer) };
  delete payload._id;
  delete payload.id;
  return payload;
}

function formatDateInput(date = new Date()) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function comparableDateInput(value) {
  if (!value) return '';
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const dmy = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw : formatDateInput(parsed);
}

function addDaysInput(dateInput, days) {
  const d = dateInput ? new Date(`${dateInput}T00:00:00`) : new Date();
  const offset = Number.isFinite(Number(days)) ? Number(days) : 0;
  d.setDate(d.getDate() + offset);
  return formatDateInput(d);
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
    value.productName,
    value.name,
    value.category,
    value.subCategory,
    value.itemGroup,
    value.productType,
    value.hsn,
    value.unit,
  ]
    .map((part) => String(part ?? '').trim().toLowerCase())
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
    .map((part) => String(part ?? '').trim().toLowerCase())
    .filter(Boolean)
    .join('|');
}

function generatePurchaseBarcode(value = {}) {
  const productIdentity = productBarcodeIdentity(value);
  const variantIdentity = variantBarcodeIdentity(value) || 'base';
  const first12Digits = `${hashToDigits(`${productIdentity}|prefix`, 4)}${currentBarcodePeriod()}${hashToDigits(`${productIdentity}|series`, 2)}${hashToDigits(`${variantIdentity}|variant`, 2)}`;
  return `${first12Digits}${ean13CheckDigit(first12Digits)}`;
}

function withPurchaseBarcodes(items = []) {
  return (Array.isArray(items) ? items : []).map((item) => {
    if (item.itemType === 'Service' || item.barcode) return item;
    return { ...item, barcode: generatePurchaseBarcode(item) };
  });
}

function purchaseLabelVariantText(item = {}) {
  return [
    item.brand || item.other || item.variantBrand,
    item.size || item.modelName,
    item.colour || item.color,
    item.type,
    item.pattern,
    item.productCode || item.code,
  ]
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(' / ') || `SKU: ${item.productCode || item.code || '-'}`;
}

function purchaseLabelPrice(item = {}) {
  const price = Number(item.rate || item.mrp || item.purchasePrice || 0);
  return Number.isFinite(price) && price > 0 ? `Rs. ${price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '';
}

function purchaseBarcodePrintRows(items = []) {
  return (Array.isArray(items) ? items : [])
    .filter((item) => item.itemType !== 'Service' && item.barcode)
    .flatMap((item, itemIndex) => {
      const qty = Math.max(1, Math.floor(Number(item.qty) || 1));
      return Array.from({ length: qty }, (_, copyIndex) => ({
        ...item,
        printKey: `${item.id || item.productCode || item.description || itemIndex}-${copyIndex}`,
        description: lineItemDescription(item),
      }));
    });
}

function chunkPurchaseBarcodePages(rows = [], perPage = 2) {
  const pages = [];
  for (let index = 0; index < rows.length; index += perPage) {
    pages.push(rows.slice(index, index + perPage));
  }
  return pages;
}

function electronicsNote(product = {}) {
  if (product.itemGroup !== 'Electronics') return '';
  const lines = [];
  if (product.modelNumber) lines.push(`Model: ${product.modelNumber}`);
  if (product.serialNumber) lines.push(`Serial/IMEI: ${product.serialNumber}`);
  return lines.join('\n');
}

function appendUniqueLines(...parts) {
  const seen = new Set();
  return parts
    .flatMap((part) => String(part || '').split(/\r?\n/))
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false;
      if (/^warranty\s*:/i.test(line)) return false;
      const key = line.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join('\n');
}

function bundleNote(product = {}) {
  if (product.productType !== 'Bundle') return '';
  const rows = Array.isArray(product.bundleItems) ? product.bundleItems : [];
  if (!rows.length) return '';
  return rows
    .map((row, index) => {
      const name = row.productName || row.description || row.name || row.sku || '';
      const qty = Number(row.qty) || 0;
      const sku = row.sku ? ` (${row.sku})` : '';
      return name ? `${index + 1}. ${name}${sku} x ${qty || 1}` : '';
    })
    .filter(Boolean)
    .join('\n');
}

function normalizeProduct(product = {}) {
  product = product || {};
  const description = product.description || product.name || product.productName || '';
  const savedProductDescription = product.productDescription
    || product.itemDescription
    || product.lineDescription
    || product.details
    || product.note
    || product.remark
    || '';
  const productDescription = product.productType === 'Bundle'
    ? appendUniqueLines(savedProductDescription, bundleNote(product))
    : savedProductDescription;
  return {
    ...product,
    _id: product._id ?? product.id ?? description,
    id: product.id ?? product._id ?? description,
    description,
    barcode: product.barcode || '',
    code: product.code || product.sku || '',
    hsn: product.hsn ?? '',
    itemType: product.itemType === 'Service' ? 'Service' : 'Product',
    productType: product.productType || 'Standard',
    bundleItems: Array.isArray(product.bundleItems) ? product.bundleItems : [],
    bundleDiscountType: product.bundleDiscountType || 'Percentage',
    bundleDiscount: Number(product.bundleDiscount) || 0,
    unit: product.unit || 'Nos',
    rate: Number(product.rate ?? product.sellingPrice ?? product.price ?? 0),
    gstRate: Number(product.gstRate ?? product.taxRate ?? product.gstPercentage ?? product.gst ?? product.taxPercent ?? 18),
    size: product.size || product.modelName || '',
    brand: product.brand || '',
    material: product.material || product.fabric || '',
    modelNumber: product.modelNumber || '',
    warrantyPeriod: product.warrantyPeriod || '',
    warrantyType: product.warrantyType || '',
    serialNumber: product.serialNumber || '',
    productDescription,
  };
}

function uniqueTextParts(parts = []) {
  const seen = new Set();
  return parts
    .map((part) => String(part || '').trim())
    .filter((part) => {
      if (!part) return false;
      const key = part.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function variantBaseName(variant = {}) {
  return String(variant.size || variant.modelName || variant.modelCode || variant.barcode || '').trim();
}

function variantDisplayName(variant = {}) {
  const base = variantBaseName(variant);
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
  ].filter((part) => String(part || '').trim().toLowerCase() !== base.toLowerCase()));
  return uniqueTextParts([base, ...attributes]).join(' - ');
}

function variantShortLabel(variant = {}) {
  const base = variantBaseName(variant);
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
  ].filter((part) => String(part || '').trim().toLowerCase() !== base.toLowerCase()));
  return uniqueTextParts([base, ...attributes.slice(0, 2)]).join(' - ');
}

function variantModelLabel(variant = {}) {
  return String(variant.modelCode || variant.modelNumber || variantBaseName(variant) || '').trim();
}

function variantDropdownOption(variant = {}) {
  const main = String(variant.size || variant.modelName || variant.modelCode || variant.barcode || '').trim() || 'Variant';
  const detail = uniqueTextParts([
    variant.other,
    variant.material,
    variant.colour || variant.color,
    variant.type,
    variant.pattern,
    variant.ram,
    variant.storage,
  ].filter((part) => String(part || '').trim().toLowerCase() !== main.toLowerCase())).join(' · ');
  const label = detail ? `${main} - ${detail}` : main;
  const meta = uniqueTextParts([
    Number(variant.stock) > 0 ? `${Number(variant.stock)} stk` : '',
    Number(variant.rate) > 0 ? `₹${Number(variant.rate)}` : '',
  ]).join(' · ');
  return {
    value: variantDisplayName(variant),
    label,
    labelNode: (
      <span className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-semibold text-[#0f172a]">{main}</span>
          {detail && <span className="block truncate text-[11px] font-medium text-[#64748b]">{detail}</span>}
        </span>
        {meta && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">{meta}</span>}
      </span>
    ),
  };
}

function hasProductVariants(product = {}) {
  product = product || {};
  return Array.isArray(product.variants) && product.variants.some((variant) => variantDisplayName(variant));
}

function singleProductVariant(product = {}) {
  product = product || {};
  const variants = Array.isArray(product.variants)
    ? product.variants.filter((variant) => variantDisplayName(variant))
    : [];
  return variants.length === 1 ? variants[0] : null;
}

function productBillingSize(product = {}) {
  product = product || {};
  if (product.__selectedVariantName) return product.__selectedVariantName;
  const singleVariant = singleProductVariant(product);
  if (singleVariant) return singleVariant.size || singleVariant.modelName || variantDisplayName(singleVariant);
  if (hasProductVariants(product)) return '';
  return product.size || product.modelName || '';
}

function productBillingBrand(product = {}) {
  product = product || {};
  const singleVariant = singleProductVariant(product);
  if (singleVariant) return singleVariant.other || product.brand || '';
  if (product.__selectedVariantName || !hasProductVariants(product)) return product.brand || '';
  return '';
}

function productBillingMaterial(product = {}) {
  product = product || {};
  const singleVariant = singleProductVariant(product);
  if (singleVariant) return singleVariant.material || product.material || product.fabric || '';
  if (product.__selectedVariantName || !hasProductVariants(product)) return product.material || product.fabric || '';
  return '';
}

function productBillingRate(product = {}) {
  product = product || {};
  const singleVariant = singleProductVariant(product);
  if (!product.__selectedVariantName && singleVariant && Number(singleVariant.rate) > 0) return Number(singleVariant.rate);
  return Number(product.rate) || 0;
}

function bestProductMatch(matches = []) {
  return matches.find(hasProductVariants)
    || matches.find((p) => String(p.productDescription || '').trim())
    || matches[0]
    || null;
}

function productWithSelectedVariant(product = {}, variant = {}) {
  const selectedVariantName = variantDisplayName(variant);
  if (!selectedVariantName) return product;
  return {
    ...product,
    __selectedVariantName: selectedVariantName,
    barcode: variant.barcode || product.barcode || '',
    code: variant.modelCode || product.code || product.sku || '',
    modelNumber: variant.modelCode || product.modelNumber || '',
    brand: variant.other || product.brand || '',
    material: variant.material || product.material || product.fabric || '',
    rate: Number(variant.rate) > 0 ? Number(variant.rate) : product.rate,
  };
}

function productVariantSearchLabel(product = {}, variant = {}) {
  const name = variantDisplayName(variant);
  return name ? `${product.description || product.name || 'Product'} / ${name}` : '';
}

function variantColumnLabel(product = {}) {
  return product?.itemGroup === 'Textile' ? 'Size' : 'Model Name';
}

function findVariantByValue(variants = [], value = '') {
  const needle = String(value || '').trim();
  const normalizedNeedle = needle.toLowerCase();
  return variants.find((variant) => variantDisplayName(variant) === needle)
    || variants.find((variant) => uniqueTextParts([
      variantBaseName(variant),
      variant.size,
      variant.modelName,
      variant.modelCode,
      variant.barcode,
      variant.colour || variant.color,
      variant.type,
      variant.material,
      variant.pattern,
      variant.ageGroup,
      variant.quality,
      variant.other,
    ]).some((part) => part.toLowerCase() === normalizedNeedle));
}

function variantAttrOptions(variants = [], field) {
  return uniqueTextParts(variants.map((variant) => {
    if (field === 'brand') return variant.other;
    if (field === 'material') return variant.material;
    return variant[field];
  }));
}

function findVariantByFashionAttrs(variants = [], attrs = {}) {
  const size = String(attrs.size || '').trim().toLowerCase();
  const brand = String(attrs.brand || '').trim().toLowerCase();
  const material = String(attrs.material || '').trim().toLowerCase();
  return variants.find((variant) => (
    (!size || String(variant.size || variant.modelName || '').trim().toLowerCase() === size)
    && (!brand || String(variant.other || '').trim().toLowerCase() === brand)
    && (!material || String(variant.material || '').trim().toLowerCase() === material)
  )) || null;
}

function stockTextClass(stock, minStockLevel) {
  if (stock <= 0) return 'text-red-600';
  if (minStockLevel && stock <= minStockLevel) return 'text-orange-600';
  return 'text-green-700';
}

function findCatalogProductForItem(products = [], item = {}) {
  const text = (value) => String(value || '').trim().toLowerCase();
  const productId = item.productId ? String(item.productId) : '';
  const code = text(item.productCode || item.code);
  const description = text(item.description);
  return bestProductMatch(products.filter((product) => productId && String(product._id || product.id) === productId))
    || bestProductMatch(products.filter((product) => code && text(product.code) === code))
    || bestProductMatch(products.filter((product) => description && text(product.description) === description));
}

function productBillingTypeLabel(product = {}) {
  if (product.productType === 'Bundle') return 'Bundle / Kit';
  if (product.itemType === 'Service') return 'Service';
  return 'Product';
}

function productBundleSearchTerms(product = {}) {
  return (Array.isArray(product.bundleItems) ? product.bundleItems : [])
    .flatMap((row) => [row.productName, row.sku])
    .filter(Boolean);
}

function bundleItemCount(product = {}) {
  return Array.isArray(product.bundleItems) ? product.bundleItems.filter((row) => row.productName || row.sku).length : 0;
}

function textDropdownOptions(values = []) {
  const seen = new Set();
  return values
    .map((value) => String(value ?? '').trim())
    .filter((value) => {
      if (!value) return false;
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 50);
}

function enrichItemsWithProductDescriptions(items = [], products = []) {
  return items.map((item) => {
    if (String(item.itemDescription || '').trim()) return item;
    const product = findCatalogProductForItem(products, item);
    return product?.productDescription ? { ...item, itemDescription: product.productDescription } : item;
  });
}

function catalogVariantForItem(product = {}, item = {}) {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  if (!variants.length) return null;
  const text = (value) => String(value || '').trim().toLowerCase();
  const size = text(item.size || item.modelName || item.modelNumber);
  const barcode = text(item.barcode);
  const rate = Number(item.rate) || 0;
  return variants.find((variant) => barcode && text(variant.barcode) === barcode && (!size || text(variant.size || variant.modelName) === size))
    || variants.find((variant) => size && text(variant.size || variant.modelName) === size && (!rate || Number(variant.rate) === rate))
    || variants.find((variant) => size && text(variant.size || variant.modelName) === size)
    || null;
}

function hydrateItemsWithCatalogVariantAttrs(items = [], products = []) {
  if (!Array.isArray(items) || !items.length || !Array.isArray(products) || !products.length) return items;
  return items.map((item) => {
    if (item.itemType === 'Service') return item;
    if (item.brand && item.material) return item;
    const product = findCatalogProductForItem(products, item);
    if (!product) return item;
    const variant = catalogVariantForItem(product, item) || {};
    const nextBrand = item.brand || item.other || item.variantBrand || variant.other || variant.brand || product.brand || '';
    const nextMaterial = item.material || item.fabric || item.variantMaterial || variant.material || variant.fabric || product.material || product.fabric || '';
    const nextSize = item.size || item.modelName || item.modelNumber || variant.size || variant.modelName || '';
    const nextBarcode = item.barcode || variant.barcode || '';
    if (nextBrand === item.brand && nextMaterial === item.material && nextSize === item.size && nextBarcode === item.barcode) return item;
    return {
      ...item,
      brand: nextBrand,
      material: nextMaterial,
      size: nextSize,
      barcode: nextBarcode,
    };
  });
}

function normalizePurchaseFashionItemsForSave(items = [], products = []) {
  if (!Array.isArray(items)) return [];
  return hydrateItemsWithCatalogVariantAttrs(items, products).map((item) => {
    if (item.itemType === 'Service') return item;
    const variant = item.variant || item.productVariant || {};
    const brand = item.brand || item.other || item.variantBrand || variant.other || variant.brand || '';
    const material = item.material || item.fabric || item.variantMaterial || variant.material || variant.fabric || '';
    const size = item.size || item.modelName || item.modelNumber || variant.size || variant.modelName || '';
    const barcode = item.barcode || variant.barcode || '';
    return {
      ...item,
      brand,
      material,
      size,
      barcode,
      other: item.other || brand,
      fabric: item.fabric || material,
    };
  });
}

function normalizeScanText(value = '') {
  let text = String(value || '').trim();
  if (text.length > 2 && text.startsWith('*') && text.endsWith('*')) {
    text = text.slice(1, -1);
  }
  return text.trim().toLowerCase();
}

function findProductByScan(products = [], query = '') {
  const needle = normalizeScanText(query);
  if (!needle) return null;
  const text = (value) => normalizeScanText(value);
  const best = bestProductMatch;
  const variantMatches = [];
  for (const product of products) {
    for (const variant of product.variants || []) {
      const name = variantDisplayName(variant);
      if (!name) continue;
      const combined = productVariantSearchLabel(product, variant);
      if (text(name).includes(needle) || text(combined) === needle) {
        variantMatches.push(productWithSelectedVariant(product, variant));
      }
    }
  }
  if (variantMatches.length) return best(variantMatches);
  const matchers = [
    (p) => text(p.barcode) === needle,
    (p) => text(p.code) === needle,
    (p) => text(p.hsn) === needle,
    (p) => text(p.description) === needle,
    (p) => text(p.barcode).includes(needle),
    (p) => text(p.code).includes(needle),
    (p) => text(p.hsn).includes(needle),
    (p) => text(p.description).includes(needle),
  ];
  for (const matches of matchers.map((matcher) => products.filter(matcher))) {
    if (matches.length) return best(matches);
  }
  return null;
}

function findProductByExactEntry(products = [], query = '') {
  const needle = normalizeScanText(query);
  if (!needle) return null;
  const text = (value) => normalizeScanText(value);
  const best = bestProductMatch;
  const variantMatches = [];
  for (const product of products) {
    for (const variant of product.variants || []) {
      const name = variantDisplayName(variant);
      if (!name) continue;
      const combined = productVariantSearchLabel(product, variant);
      if (text(name) === needle || text(combined) === needle) {
        variantMatches.push(productWithSelectedVariant(product, variant));
      }
    }
  }
  if (variantMatches.length) return best(variantMatches);
  const matchers = [
    (p) => text(p.description) === needle,
    (p) => text(p.code) === needle,
    (p) => text(p.barcode) === needle,
  ];
  for (const matches of matchers.map((matcher) => products.filter(matcher))) {
    if (matches.length) return best(matches);
  }
  return null;
}

function isLikelyBarcodeScan(value = '') {
  const text = String(value || '').trim();
  return text.length >= 4 && !/\s/.test(text);
}

// Sales documents send unknown barcodes to product creation in the current tab.
// Purchase Entry handles unknown products as draft rows and creates them when saved.
function openAddProductForBarcode(barcode) {
  const url = `/products?newBarcode=${encodeURIComponent(barcode)}`;
  window.location.assign(url);
}

const CAMERA_BARCODE_FORMATS = [
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.CODE_93,
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.ITF,
  BarcodeFormat.CODABAR,
  BarcodeFormat.QR_CODE,
];

function createZxingHints() {
  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, CAMERA_BARCODE_FORMATS);
  hints.set(DecodeHintType.TRY_HARDER, true);
  return hints;
}

function MobileBarcodeScanner({ open, onClose, onDetected, status, unknownCode, onAddUnknown, scannedItems = [], total = 0 }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const zxingControlsRef = useRef(null);
  const frameRef = useRef(0);
  const detectingRef = useRef(false);
  const lastScanRef = useRef({ value: '', at: 0 });
  const onDetectedRef = useRef(onDetected);
  const [cameraError, setCameraError] = useState('');
  const [cameraReady, setCameraReady] = useState(false);

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    if (!open) return undefined;

    let cancelled = false;

    async function startScanner() {
      setCameraError('');
      setCameraReady(false);

      if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        setCameraError('Camera scanning needs HTTPS or localhost.');
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Camera access is not available in this browser.');
        return;
      }

      try {
        const video = videoRef.current;
        if (!video) return;
        const handleDetected = (rawValue) => {
          const value = String(rawValue || '').trim();
          const now = Date.now();
          const repeatedTooSoon = lastScanRef.current.value === value && now - lastScanRef.current.at < 1300;
          if (value && !repeatedTooSoon) {
            lastScanRef.current = { value, at: now };
            onDetectedRef.current(value);
          }
        };
        const constraints = {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
            focusMode: { ideal: 'continuous' },
          },
          audio: false,
        };

        try {
          const reader = new BrowserMultiFormatReader(createZxingHints(), {
            delayBetweenScanAttempts: 100,
            delayBetweenScanSuccess: 700,
          });
          const controls = await reader.decodeFromConstraints(
            constraints,
            video,
            (result) => handleDetected(result?.getText?.()),
          );
          if (cancelled) {
            controls.stop();
            return;
          }
          zxingControlsRef.current = controls;
          setCameraReady(true);
          return;
        } catch (zxingErr) {
          if (!window.BarcodeDetector) throw zxingErr;
        }

        const supportedFormats = await window.BarcodeDetector.getSupportedFormats?.();
        const preferredFormats = ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code'];
        const formats = Array.isArray(supportedFormats)
          ? preferredFormats.filter((format) => supportedFormats.includes(format))
          : preferredFormats;
        const detector = new window.BarcodeDetector(formats.length ? { formats } : undefined);
        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        setCameraReady(true);

        async function scanFrame() {
          if (cancelled) return;
          const currentVideo = videoRef.current;
          if (currentVideo?.readyState >= 2 && !detectingRef.current) {
            detectingRef.current = true;
            try {
              const codes = await detector.detect(currentVideo);
              handleDetected(codes?.[0]?.rawValue);
            } catch {
              // Keep scanning; native BarcodeDetector can miss frames while autofocus settles.
            } finally {
              detectingRef.current = false;
            }
          }
          frameRef.current = window.requestAnimationFrame(scanFrame);
        }

        scanFrame();
      } catch (err) {
        if (err?.name === 'NotAllowedError') {
          setCameraError('Camera permission was blocked.');
        } else if (err?.name === 'NotFoundError') {
          setCameraError('No camera was found on this device.');
        } else {
          setCameraError('Unable to start camera scanner.');
        }
      }
    }

    startScanner();

    return () => {
      cancelled = true;
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      zxingControlsRef.current?.stop();
      zxingControlsRef.current = null;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      detectingRef.current = false;
      lastScanRef.current = { value: '', at: 0 };
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      <button type="button" className="billing-barcode-backdrop" aria-label="Close scanner" onClick={onClose} />
      <div className="billing-barcode-scanner" role="dialog" aria-modal="true">
        <div className="billing-barcode-topbar">
          <button type="button" onClick={onClose} title="Close scanner"><X size={20} /></button>
          <strong>Scan Barcode</strong>
          <span />
        </div>
        <div className="billing-barcode-camera">
          <video ref={videoRef} muted playsInline />
          <div className="billing-barcode-frame">
            <span />
            <span />
            <span />
            <span />
          </div>
          {!cameraReady && !cameraError && (
            <div className="billing-barcode-state">
              <Camera size={28} />
              <strong>Starting camera...</strong>
            </div>
          )}
          {cameraError && (
            <div className="billing-barcode-state error">
              <Barcode size={28} />
              <strong>{cameraError}</strong>
            </div>
          )}
        </div>
        <div className="billing-barcode-footer">
          <div className="billing-barcode-status-row">
            <div>
              <span>{status || 'Align barcode inside the frame'}</span>
              {unknownCode && <strong>{unknownCode}</strong>}
            </div>
            {unknownCode ? (
              <button type="button" onClick={onAddUnknown}>
                <Plus size={16} />
                Add Product
              </button>
            ) : (
              <button type="button" onClick={onClose}>
                <CheckCircle2 size={16} />
                View Bill
              </button>
            )}
          </div>
          {scannedItems.length > 0 && (
            <div className="billing-barcode-cart">
              <div className="billing-barcode-cart-head">
                <span>Bill Items</span>
                <strong>{formatCurrency(total)}</strong>
              </div>
              <div className="billing-barcode-cart-list">
                {scannedItems.slice(-5).reverse().map((item) => (
                  <div className="billing-barcode-cart-row" key={item.id || item.productId || item.description}>
                    <span>
                      <strong>{item.description || 'Unnamed item'}</strong>
                      <small>{item.productCode || item.barcode || item.hsn || '-'}</small>
                    </span>
                    <b>{Number(item.qty || 0)} x {formatCurrency(Number(item.rate || 0))}</b>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function CreateDocumentPage({ documentType = 'invoice', invoiceId }) {
  const { keyboardMode } = useKeyboardMode();
  const _baseConfig = documentConfigs[documentType] ?? documentConfigs.invoice;
  const isRetailPosInvoice = false;
  const defaultInvoiceDate = formatDateInput();
  const defaultPaymentTerms = '30';
  const defaultDueDate = addDaysInput(defaultInvoiceDate, defaultPaymentTerms);

  // ── Core state ──
  const [billType, setBillType]         = useState('with-gst');
  const config = (documentType === 'invoice' && billType === 'without-gst')
    ? { ..._baseConfig, showGst: false, title: 'Bill of Supply' }
    : _baseConfig;
  const effectiveDocumentType = (documentType === 'invoice' && billType === 'without-gst') ? 'bill-of-supply' : documentType;
  const allowManualItemDescription = true;
  const partyLabel = cleanPartyNameLabel(config.partyNameLabel);
  const partyKind = partyKindFromLabel(config.partyNameLabel);
  const partyKindLower = partyKind.toLowerCase();
  const partySearchPlaceholder = `Search or enter ${partyKindLower} name`;
  const partyPhoneLabel = `${partyKind} Phone`;
  const partyDetailsText = `${partyKind} details will be used automatically in this bill.`;
  const documentNumberLabel = `${config.title} No.`;

  const [items, setItems]               = useState([]);
  const [supplyType, setSupplyType]     = useState('intrastate');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [paymentData, setPaymentData]   = useState({ chequeNo: '',
    amount: '', date: defaultInvoiceDate, notes: '',
    upiId: '', customerPhone: '', amountReceived: '',
    utrNumber: '', bankName: '', creditDays: defaultPaymentTerms,
  });
  const [paymentSplits, setPaymentSplits] = useState([]);
  const paymentSplitTotal = paymentSplits.reduce((sum, split) => sum + (Number(split.amount) || 0), 0);
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
  const [showPaymentMethodPopup, setShowPaymentMethodPopup] = useState(false);

  const [customer, setCustomer] = useState(() => emptyCustomer());

  const [docMeta, setDocMeta] = useState({
    number: `${_baseConfig.prefix}-0001`,
    date: defaultInvoiceDate,
    dueDate: defaultDueDate,
    poRef: '',
    placeOfSupply: 'Tamil Nadu',
    invoiceType: 'regular',
    rcm: false,
    paymentTerms: defaultPaymentTerms,
  });

  const [docExtra, setDocExtra] = useState({
    validTill: '', expectedDelivery: '', deliveryAddress: '',
    originalInvoiceNo: '', originalInvoiceDate: '', reason: '',
    costCenter: '',
    linkedPurchaseOrderId: '', linkedPurchaseOrderNo: '', vendorInvoiceNo: '', vendorInvoiceAmount: '', purchaseOrderTotal: '',
    vehicleNumber: '', driverName: '', transporter: '',
    transporterId: '', distanceKm: '', ewbSupplyType: 'outward',
    irnNumber: '', ackNumber: '', ackDate: '',
  });

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [masterProductBrands, setMasterProductBrands] = useState([]);
  const [fashionSizeRows, setFashionSizeRows] = useState([]);
  const [inlineProductModal, setInlineProductModal] = useState(null);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [salesReturnInvoices, setSalesReturnInvoices] = useState([]);
  const [salesReturnInvoiceLoading, setSalesReturnInvoiceLoading] = useState(false);
  const [salesReturnInvoiceError, setSalesReturnInvoiceError] = useState('');
  const initialLinkedPurchaseOrderId = useRef(getInitialLinkedPurchaseOrderId());
  const autoAppliedPurchaseOrderId = useRef('');
  const [bizSettings, setBizSettings] = useState({});
  const billPrintFormat = docExtra.invoicePrintFormat || bizSettings.invoicePrintFormat || 'normal';
  const bizState = bizSettings.state || BUSINESS_STATE;
  const previewBizSettings = useMemo(
    () => ({
      ...bizSettings,
      invoicePrintFormat: billPrintFormat || 'normal',
    }),
    [bizSettings, billPrintFormat],
  );
  const isElectronicsRetail = bizSettings.retailSubcategory === ELECTRONICS_RETAIL_SUBCATEGORY;
  const isFashionRetail = isFashionRetailSubcategory(bizSettings.retailSubcategory);
  const isPurchaseDocument = ['purchase-entry', 'purchase-order'].includes(documentType);
  const isPurchaseFashionDocument = isPurchaseDocument && isFashionRetail;
  const canCreateDevicesInline = isElectronicsRetail && ['purchase-entry', 'purchase-order'].includes(documentType);
  const canOpenProductCreationFromQuickEntry = canCreateDevicesInline && !['purchase-entry', 'purchase-order'].includes(documentType);
  const nextItemId = useRef(1001);
  const nextChargeId = useRef(2000);
  const [invoiceLoading, setInvoiceLoading] = useState(Boolean(invoiceId));
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [inventoryConfirmOptions, setInventoryConfirmOptions] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [bulkGstRate, setBulkGstRate] = useState('');

  const [notes, setNotes]   = useState('Thank you for your business! Payment should be made within the due date.');
  const [terms, setTerms]   = useState(
    '1. Payment due within 30 days of invoice date.\n2. Late payment charges @ 2% per month applicable.\n3. Goods once sold will not be taken back.\n4. Subject to Trichy Jurisdiction.',
  );
  const [internalNotes, setInternalNotes] = useState('');

  // ── Shipping ──
  const [sameShipping, setSameShipping] = useState(true);
  const [shipping, setShipping]         = useState({ address: '', city: '', state: 'Tamil Nadu', pincode: '' });

  // ── Additional charges ──
  const [charges, setCharges] = useState([]);

  // ── Discounts / deductions ──
  const [addDiscount, setAddDiscount] = useState({ type: 'percent', value: '' });
  const [tds, setTds]                 = useState({ enabled: false, section: '194C', rate: 2 });
  const [tcs, setTcs]                 = useState({ enabled: false, rate: 1 });
  const [advanceAmt, setAdvanceAmt]   = useState('');
  const [manualQuotationTotal, setManualQuotationTotal] = useState('');

  // ── UI state ──
  const [showPreview, setShowPreview]           = useState(false);
  const [autoPrintPreview, setAutoPrintPreview] = useState(false);
  const [downloadPdfMode, setDownloadPdfMode]   = useState(false);
  const [numberEditing, setNumberEditing] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [showPrintConfirm, setShowPrintConfirm] = useState(false);
  const [previewRedirectOnClose, setPreviewRedirectOnClose] = useState(false);
  const [showEmailModal, setShowEmailModal]     = useState(false);
  const [emailTo, setEmailTo]                   = useState('');
  const [emailSending, setEmailSending]         = useState(false);
  const [emailResult, setEmailResult]           = useState(null);
  const [emailPdfMode, setEmailPdfMode]         = useState(false);
  const emailPdfResolve                         = useRef(null);
  const [savedInvoiceId, setSavedInvoiceId]     = useState(invoiceId || null);
  const [showCustomerDrop, setShowCustomerDrop] = useState(false);
  const [customerQuery, setCustomerQuery]       = useState('');
  const [highlightedCustomerIndex, setHighlightedCustomerIndex] = useState(-1);
  const customerOptionRefs = useRef([]);
  const [productSearch, setProductSearch]       = useState('');
  const [salesItemFilter, setSalesItemFilter]   = useState('Product');
  const [mobileScreen, setMobileScreen] = useState('invoice');
  const [mobileProductQuery, setMobileProductQuery] = useState('');
  const mobileProductInputRef = useRef(null);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [barcodeScanStatus, setBarcodeScanStatus] = useState('');
  const [unknownBarcode, setUnknownBarcode] = useState('');
  const [purchaseBarcodePrintJob, setPurchaseBarcodePrintJob] = useState(null);
  const purchaseBarcodePrintRowsToPrint = useMemo(
    () => purchaseBarcodePrintJob?.rows || [],
    [purchaseBarcodePrintJob],
  );

  useEffect(() => {
    function handleMobileAddItem() { setMobileScreen('items'); }
    window.addEventListener(MOBILE_ADD_ITEM_EVENT, handleMobileAddItem);
    return () => window.removeEventListener(MOBILE_ADD_ITEM_EVENT, handleMobileAddItem);
  }, []);

  useEffect(() => {
    if (!purchaseBarcodePrintRowsToPrint.length) return undefined;
    let cancelled = false;
    let objectUrl = '';
    let printFrame = null;

    const finishPrint = () => {
      if (cancelled) return;
      setPurchaseBarcodePrintJob(null);
    };
    const waitForPrintClose = () => {
      window.setTimeout(() => {
        window.addEventListener('focus', finishPrint, { once: true });
        window.addEventListener('afterprint', finishPrint, { once: true });
        printFrame?.contentWindow?.addEventListener?.('afterprint', finishPrint, { once: true });
      }, 500);
    };

    pdf(<PurchaseBarcodePdfDocument rows={purchaseBarcodePrintRowsToPrint} />)
      .toBlob()
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        printFrame = document.createElement('iframe');
        printFrame.title = 'Purchase barcode labels';
        printFrame.style.position = 'fixed';
        printFrame.style.left = '-12000px';
        printFrame.style.top = '0';
        printFrame.style.width = '1px';
        printFrame.style.height = '1px';
        printFrame.style.border = '0';
        printFrame.onload = () => {
          if (cancelled) return;
          window.setTimeout(() => {
            if (cancelled) return;
            waitForPrintClose();
            try {
              printFrame.contentWindow.focus();
              printFrame.contentWindow.print();
            } catch {
              window.open(objectUrl, '_blank', 'noopener,noreferrer');
            }
          }, 350);
        };
        printFrame.src = objectUrl;
        document.body.appendChild(printFrame);
      })
      .catch((err) => {
        alert(err.message || 'Unable to prepare barcode labels. Save without barcode printing or try again.');
        setPurchaseBarcodePrintJob(null);
      });

    return () => {
      cancelled = true;
      if (printFrame?.parentNode) printFrame.parentNode.removeChild(printFrame);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [purchaseBarcodePrintRowsToPrint, purchaseBarcodePrintJob, documentType]);
  const [quickItem, setQuickItem] = useState({ itemType: 'Product', productType: 'Standard', itemDescription: '', hsn: '', qty: 1, unit: 'Nos', rate: 0, discount: 0, discountType: 'percent', gstRate: '' });
  const [quickPickerSelections, setQuickPickerSelections] = useState({ brand: [], size: [], material: [] });
  const [quickVariantDraft, setQuickVariantDraft] = useState(null);
  const [brandPicker, setBrandPicker] = useState(null);
  const [manualProductBrands, setManualProductBrands] = useState([]);
  const brandPickerRef = useRef(null);
  const brandPickerSearchRef = useRef(null);
  const [showPhoneDrop, setShowPhoneDrop]       = useState(false);
  const [showAddCustomer, setShowAddCustomer]   = useState(false);
  const [newCustomerForm, setNewCustomerForm]   = useState(() => emptyCustomer());
  const [customerSaving, setCustomerSaving]       = useState(false);
  const [customerSaveError, setCustomerSaveError] = useState('');

const [customFields, setCustomFields]         = useState([]);
  const [recurring, setRecurring]               = useState({ enabled: false, frequency: 'monthly', endAfter: '', endDate: '' });
  const [errors, setErrors]                     = useState({});

  function clearError(key) {
    setErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
  }

  function getEffectiveCustomer() {
    const hasPartyDraft = Object.entries(newCustomerForm).some(([key, value]) => {
      if (key === 'state' && value === BUSINESS_STATE) return false;
      return String(value || '').trim();
    });
    const draftName = String(newCustomerForm.name || '').trim();
    const customerName = String(customer.name || '').trim();
    const draftMatchesCustomer = !draftName || !customerName || draftName === customerName;
    const shouldUsePartyDraft = hasPartyDraft && (documentType === 'invoice' || showAddCustomer || draftMatchesCustomer);
    if (shouldUsePartyDraft) {
      return {
        ...customer,
        ...newCustomerForm,
        state: newCustomerForm.state || customer.state || BUSINESS_STATE,
      };
    }
    return customer;
  }

  const pendingQuickItem = useMemo(() => {
    const query = String(productSearch || '').trim();
    if (!query) return null;
    const filterRows = productsOfType(salesItemFilter);
    const chosen = findProductByExactEntry(filterRows, query) || findProductByScan(filterRows, query);
    const normalized = chosen ? normalizeProduct(chosen) : null;
    const description = normalized?.description || query;
    if (!description) return null;
    return {
      id: 'quick-draft',
      productId: normalized?.id || null,
      productCode: normalized?.code || '',
      barcode: normalized?.barcode || '',
      itemType: normalized?.itemType || (salesItemFilter === 'Service' ? 'Service' : quickItem.itemType || 'Product'),
      productType: normalized?.productType || 'Standard',
      description,
      itemDescription: quickItem.itemDescription || normalized?.productDescription || '',
      modelNumber: normalized?.modelNumber || '',
      warrantyPeriod: normalized?.warrantyPeriod || '',
      hsn: quickItem.hsn || normalized?.hsn || '',
      size: quickItem.size || productBillingSize(normalized) || '',
      qty: Number(quickItem.qty) || 1,
      unit: quickItem.unit || normalized?.unit || 'Nos',
      rate: Number(quickItem.rate || productBillingRate(normalized)) || 0,
      discount: Number(quickItem.discount) || 0,
      discountType: 'percent',
      gstRate: Number(quickItem.gstRate ?? normalized?.gstRate ?? 0),
      __pendingQuick: true,
    };
  }, [productSearch, products, quickItem, salesItemFilter]);

  const effectiveItems = useMemo(
    () => hydrateItemsWithCatalogVariantAttrs(items, products),
    [items, products],
  );

  function validate(itemsToValidate = effectiveItems) {
    const errs = {};
    if (documentType === 'supplier-return') {
      if (!docExtra.originalPurchaseId) errs.originalInvoiceNo = 'Select the original purchase entry';
      if (!docExtra.reason?.trim()) errs.reason = 'Reason for return is required';
      if (docExtra.originalInvoiceDate && docMeta.date < docExtra.originalInvoiceDate) errs.invoiceDate = 'Return date cannot precede purchase date';
    }
    if (documentType === 'sales-return') {
      if (!docExtra.originalSalesId) errs.originalInvoiceNo = 'Select the original sales invoice';
      if (!docExtra.reason?.trim()) errs.reason = 'Reason for return is required';
      if (docExtra.originalInvoiceDate && docMeta.date < docExtra.originalInvoiceDate) errs.invoiceDate = 'Return date cannot precede sales invoice date';
    }
    const effectiveCustomer = getEffectiveCustomer();

    // ── Common (all document types) ──────────────────────────────────────────
    if (!effectiveCustomer.name.trim())
      errs.customerName = `${config.partyNameLabel.replace(' *', '')} is required`;
    if (!docMeta.number.trim())
      errs.invoiceNumber = `${config.title} number cannot be empty`;
    if (!docMeta.date)
      errs.invoiceDate = `${config.dateLabel} is required`;
    const hasValidItem = documentType === 'purchase-entry'
      ? itemsToValidate.some((it) => it.description && Number(it.qty) > 0 && Number(it.rate) > 0)
      : itemsToValidate.some((it) => it.description && Number(it.qty) > 0);
    if (!hasValidItem) {
      errs.items = documentType === 'purchase-entry'
        ? 'Add at least one item with a name, qty > 0, and rate > 0'
        : 'Add at least one item with a description and qty > 0';
    }
    itemsToValidate.forEach((it, idx) => {
      if (it.description && !(Number(it.qty) > 0)) errs[`item_qty_${idx}`] = 'Required';
      if (it.description) {
        const matchedProduct = findCatalogProductForItem(products, it);
        if (matchedProduct?.variants?.length > 0 && !String(it.size || '').trim()) {
          errs[`item_size_${idx}`] = `Select a ${variantColumnLabel(matchedProduct).toLowerCase()}`;
        }
      }
      if (documentType === 'purchase-entry') {
        // A direct Purchase Entry may create the Product on the fly (see
        // inventoryMovements.js), so a missing rate would silently stock a
        // ₹0 item — require it explicitly here instead.
        if (it.description && !(Number(it.rate) > 0)) errs[`item_rate_${idx}`] = 'Required';
      } else if (it.description && Number(it.rate) < 0) {
        errs[`item_rate_${idx}`] = 'Invalid';
      }
    });

    if (documentType === 'purchase-entry' && !docExtra.vendorInvoiceNo.trim())
      errs.vendorInvoiceNo = 'Vendor invoice number is required for purchase entry';
    if (documentType === 'purchase-entry' && docExtra.vendorInvoiceAmount !== '' && (!Number.isFinite(Number(docExtra.vendorInvoiceAmount)) || Number(docExtra.vendorInvoiceAmount) < 0))
      errs.vendorInvoiceAmount = 'Vendor invoice amount must be 0 or more';

    // ── Credit Note ──────────────────────────────────────────────────────────
    if (documentType === 'credit-note') {
      if (!docExtra.reason.trim())
        errs.reason = 'Reason for credit is required';
      if (!docExtra.originalInvoiceNo.trim())
        errs.originalInvoiceNo = 'Original invoice number should be referenced for GST compliance';
    }

    // ── Debit Note ───────────────────────────────────────────────────────────
    if (documentType === 'debit-note') {
      if (!docExtra.reason.trim())
        errs.reason = 'Reason for debit is required';
      if (!docExtra.originalInvoiceNo.trim())
        errs.originalInvoiceNo = 'Original invoice number should be referenced for GST compliance';
    }

    // ── E-Invoice ────────────────────────────────────────────────────────────
    // GSTIN of buyer is mandatory for IRN generation on the GST portal
    if (documentType === 'e-invoice' && !effectiveCustomer.gstin.trim())
      errs.customerGstin = 'Buyer GSTIN is mandatory for E-Invoice (required for IRN generation)';

    // ── E-Way Bill ───────────────────────────────────────────────────────────
    // Rule 138 of CGST Rules: vehicle, transporter, and distance are required
    if (documentType === 'e-way-bill') {
      if (!docExtra.vehicleNumber.trim())
        errs.vehicleNumber = 'Vehicle number is required (CGST Rule 138)';
      if (!docExtra.transporter.trim())
        errs.transporter = 'Transporter name is required for E-Way Bill';
      if (!docExtra.distanceKm || Number(docExtra.distanceKm) <= 0)
        errs.distanceKm = 'Distance (KM) must be greater than 0';
    }

    return errs;
  }

  // ── Totals ──────────────────────────────────────────────────────────────────

  function calculateTotalsForItems(sourceItems = effectiveItems) {
    const acc = { subtotal: 0, discount: 0, taxable: 0, totalGst: 0, grandTotal: 0, gstByRate: {} };
    sourceItems.forEach((item) => {
      const line = calcLine(item);
      acc.subtotal   += line.gross;
      acc.discount   += line.discountAmt;
      acc.taxable    += line.taxable;
      acc.totalGst   += line.gstAmt;
      acc.grandTotal += line.total;
      if (!acc.gstByRate[item.gstRate]) acc.gstByRate[item.gstRate] = { taxable: 0, gst: 0 };
      acc.gstByRate[item.gstRate].taxable += line.taxable;
      acc.gstByRate[item.gstRate].gst     += line.gstAmt;
    });

    const chargesSubtotal = charges.reduce((s, c) => s + (Number(c.amount) || 0), 0);
    const chargesGst      = config.showGst
      ? charges.reduce((s, c) => s + (Number(c.amount) || 0) * (c.gstRate / 100), 0)
      : 0;

    const preDisc = config.showGst
      ? acc.grandTotal + chargesSubtotal + chargesGst
      : acc.taxable + chargesSubtotal;

    const addDiscAmt = addDiscount.value
      ? (addDiscount.type === 'percent'
          ? preDisc * (Number(addDiscount.value) / 100)
          : Math.min(Number(addDiscount.value), preDisc))
      : 0;

    const invoiceTotal = preDisc - addDiscAmt;
    const tdsAmt       = tds.enabled ? acc.taxable * (tds.rate / 100) : 0;
    const tcsAmt       = tcs.enabled ? invoiceTotal * (tcs.rate / 100) : 0;
    const netPayable   = invoiceTotal - tdsAmt + tcsAmt;
    const calculatedFinalTotal = Math.round(netPayable);
    const manualTotalValue = Number(manualQuotationTotal);
    const manualTotalOverride = documentType === 'quotation'
      && manualQuotationTotal !== ''
      && Number.isFinite(manualTotalValue)
      && manualTotalValue >= 0;
    const finalTotal   = manualTotalOverride ? manualTotalValue : calculatedFinalTotal;
    const roundOff     = finalTotal - netPayable;
    const receivedForBalance = paymentSplitTotal || Number(advanceAmt) || 0;
    const balanceDue   = finalTotal - receivedForBalance;

    return {
      ...acc,
      chargesSubtotal,
      chargesGst,
      preDisc,
      addDiscAmt,
      invoiceTotal,
      tdsAmt,
      tcsAmt,
      netPayable,
      roundOff,
      calculatedFinalTotal,
      finalTotal,
      manualTotalOverride,
      manualTotal: manualTotalOverride ? manualTotalValue : null,
      balanceDue,
    };
  }

  const totals = useMemo(() => calculateTotalsForItems(effectiveItems), [effectiveItems, charges, addDiscount, tds, tcs, advanceAmt, paymentSplitTotal, config.showGst, documentType, manualQuotationTotal]);
  const oldCreditBalance = Math.max(0, Number(docExtra.oldBalance) || 0);
  const receivedNow = Math.max(0, Number(paymentSplitTotal || advanceAmt) || 0);
  const currentInvoiceBalance = Math.max(0, (Number(totals.finalTotal) || 0) - receivedNow);
  const customerBalanceAfterInvoice = Math.round((oldCreditBalance + currentInvoiceBalance) * 100) / 100;

  const purchaseEntryMatch = useMemo(() => {
    if (documentType !== 'purchase-entry') return null;
    const poTotal = Number(docExtra.purchaseOrderTotal) || 0;
    const peTotal = totals.finalTotal || 0;
    const difference = peTotal - poTotal;
    return {
      poTotal,
      peTotal,
      difference,
      matched: poTotal > 0 && Math.abs(difference) < 1,
    };
  }, [docExtra.purchaseOrderTotal, documentType, totals.finalTotal]);

  const vendorInvoiceAmountMatch = useMemo(() => {
    if (documentType !== 'purchase-entry') return null;
    if (docExtra.vendorInvoiceAmount === '' || docExtra.vendorInvoiceAmount == null) return null;
    const vendorAmount = Number(docExtra.vendorInvoiceAmount);
    if (!Number.isFinite(vendorAmount) || vendorAmount < 0) return null;
    const entryAmount = totals.finalTotal || 0;
    const difference = entryAmount - vendorAmount;
    return {
      vendorAmount,
      entryAmount,
      difference,
      matched: Math.abs(difference) < 0.01,
    };
  }, [docExtra.vendorInvoiceAmount, documentType, totals.finalTotal]);

  // Re-evaluate GST type whenever the business state loads from settings
  useEffect(() => {
    if (!config.showGst || !bizSettings.state) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupplyType(customer.state === bizSettings.state ? 'intrastate' : 'interstate');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bizSettings.state]);

  useEffect(() => {
    if (documentType !== 'purchase-entry' || invoiceId || purchaseOrders.length === 0) return;
    const poId = initialLinkedPurchaseOrderId.current;
    if (!poId || autoAppliedPurchaseOrderId.current === poId) return;
    const exists = purchaseOrders.some((po) => (po._id || po.id) === poId);
    if (!exists) return;
    autoAppliedPurchaseOrderId.current = poId;
    applyPurchaseOrder(poId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentType, invoiceId, purchaseOrders]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  function updateCustomer(field, value) {
    setCustomer((p) => ({ ...p, [field]: value }));
    if (field === 'state' && config.showGst) {
      setSupplyType(value === bizState ? 'intrastate' : 'interstate');
    }
  }

  function selectCustomer(c) {
    const normalized = normalizeCustomer(c);
    setCustomer(normalized);
    setNewCustomerForm({ ...emptyCustomer(), ...normalized, _id: normalized._id || '', id: normalized.id || '' });
    if (config.showGst) setSupplyType(normalized.state === bizState ? 'intrastate' : 'interstate');
    clearError('customerName');
    if (normalized.gstin) clearError('customerGstin');
    setShowCustomerDrop(false);
    setCustomerQuery('');
  }

  function clearCustomer() {
    setCustomer(emptyCustomer());
    setNewCustomerForm(emptyCustomer());
    setShowAddCustomer(false);
    setCustomerSaveError('');
    if (config.showGst) setSupplyType('intrastate');
  }

  function openCustomerEditor() {
    const effective = normalizeCustomer(getEffectiveCustomer());
    setNewCustomerForm({
      ...emptyCustomer(),
      ...effective,
      _id: effective._id || customer._id || '',
      id: effective.id || customer.id || '',
    });
    setCustomerSaveError('');
    setShowCustomerDrop(false);
    setShowAddCustomer(true);
  }

  function openNewCustomerForm() {
    setNewCustomerForm(emptyCustomer(customerQuery || ''));
    setCustomerSaveError('');
    setShowCustomerDrop(false);
    setShowAddCustomer(true);
  }

  function focusPartyField() {
    const field = document.querySelector('[data-fkey="party"]');
    field?.focus();
    field?.select?.();
  }

  function openNewCustomerFormFromPointer(event) {
    event.preventDefault();
    event.stopPropagation();
    openNewCustomerForm();
  }

  function focusPartyFieldFromPointer(event) {
    event.preventDefault();
    event.stopPropagation();
    focusPartyField();
  }

  function updateNewCustomer(field, value) {
    setNewCustomerForm((p) => ({ ...p, [field]: value }));
    if (field === 'name' && value.trim()) clearError('customerName');
    if (field === 'gstin' && value.trim()) clearError('customerGstin');
  }

  function updateInvoiceCustomerField(field, value) {
    updateCustomer(field, value);
    updateNewCustomer(field, value);
  }

  async function handleCreateCustomer() {
    if (!newCustomerForm.name.trim()) {
      setCustomerSaveError(`${partyLabel} is required`);
      return;
    }
    setCustomerSaving(true);
    setCustomerSaveError('');
    try {
      const customerId = newCustomerForm._id || newCustomerForm.id || customer._id || customer.id;
      const payload = customerPayload(newCustomerForm);
      let saved;
      if (partyKind === 'Vendor') {
        if (customerId) {
          try {
            saved = await api.updateVendor(customerId, payload);
          } catch (err) {
            if (!/not found/i.test(err.message || '')) throw err;
            saved = await api.createVendor(payload);
          }
        } else {
          saved = await api.createVendor(payload);
        }
      } else {
        saved = customerId
          ? await api.updateCustomer(customerId, payload)
          : await api.createCustomer(payload);
      }
      const normalized = normalizeCustomer({ ...saved, ...payload, _id: saved?._id || saved?.id || customerId });
      setCustomers((prev) => {
        const savedId = normalized._id || normalized.id;
        const exists = savedId && prev.some((c) => (c._id || c.id) === savedId);
        return exists
          ? prev.map((c) => ((c._id || c.id) === savedId ? normalized : c))
          : [...prev, normalized];
      });
      selectCustomer(normalized);
      setShowAddCustomer(false);
    } catch (err) {
      setCustomerSaveError(err.message || 'Unable to save customer');
    } finally {
      setCustomerSaving(false);
    }
  }

  async function rememberCustomerForPhone(customerData) {
    const normalized = normalizeCustomer(customerData);
    if (partyKind === 'Vendor') return normalized;
    const digits = phoneKey(normalized.phone);
    if (!normalized.name.trim() || digits.length < 10) return normalized;

    try {
      const localMatch = customers.find((c) => phoneKey(c.phone) === digits);
      const remoteRows = localMatch ? [] : await api.listCustomers(digits);
      const remoteMatch = (Array.isArray(remoteRows) ? remoteRows : remoteRows?.data || [])
        .map(normalizeCustomer)
        .find((c) => phoneKey(c.phone) === digits);
      const match = localMatch ? normalizeCustomer(localMatch) : remoteMatch;

      if (match?._id || match?.id) {
        const id = match._id || match.id;
        const merged = {
          ...match,
          ...Object.fromEntries(Object.entries(normalized).filter(([, value]) => String(value || '').trim())),
          phone: normalized.phone,
        };
        const updated = normalizeCustomer(await api.updateCustomer(id, customerPayload(merged)));
        setCustomers((prev) => {
          const exists = prev.some((c) => (c._id || c.id) === (updated._id || updated.id));
          return exists
            ? prev.map((c) => ((c._id || c.id) === (updated._id || updated.id) ? updated : c))
            : [...prev, updated];
        });
        return updated;
      }

      const created = normalizeCustomer(await api.createCustomer(customerPayload(normalized)));
      setCustomers((prev) => [...prev, created]);
      return created;
    } catch (err) {
      console.warn('Unable to remember customer for phone lookup', err);
      return normalized;
    }
  }

  async function ensurePurchaseVendorMaster(customerData) {
    if (partyKind !== 'Vendor') return null;
    const normalized = normalizeCustomer(customerData);
    const name = String(normalized.name || customerQuery || '').trim();
    if (!name) return normalized;

    const keyFor = (party) => String(party.gstin || party.phone || party.name || '').trim().toLowerCase();
    const lookupKey = keyFor({ ...normalized, name });
    const localMatch = customers.find((party) => keyFor(party) === lookupKey);
    if (localMatch?._id || localMatch?.id) return normalizeCustomer(localMatch);

    try {
      const payload = customerPayload({ ...normalized, name });
      const saved = normalizeCustomer(await api.createVendor(payload));
      setCustomers((prev) => mergeParties([saved], prev));
      return saved;
    } catch (err) {
      if (!/already exists|duplicate|409/i.test(err.message || '')) {
        console.warn('Unable to create vendor master from purchase entry', err);
      }
      return { ...normalized, name };
    }
  }

  async function ensurePurchaseBrandMasters(saveItems = []) {
    const brandNames = uniqueTextParts(saveItems.flatMap((item) => [item.brand, item.other, item.variantBrand]));
    if (!brandNames.length) return;
    await Promise.allSettled(brandNames.map(async (name) => {
      try {
        await api.invCreateBrand({ name, status: 'Active' });
      } catch (err) {
        if (!/already exists|duplicate|409/i.test(err.message || '')) throw err;
      }
    }));
    setManualProductBrands((prev) => uniqueTextParts([...prev, ...brandNames]));
  }

  async function ensurePurchaseMasters(saveItems = [], customerData = getEffectiveCustomer()) {
    if (documentType !== 'purchase-entry') return customerData;
    const [vendorResult] = await Promise.allSettled([
      ensurePurchaseVendorMaster(customerData),
      ensurePurchaseBrandMasters(saveItems),
    ]);
    return vendorResult.status === 'fulfilled' && vendorResult.value
      ? vendorResult.value
      : customerData;
  }

  function updateMeta(field, value)  {
    setDocMeta((p) => {
      const next = { ...p, [field]: value };
      if (field === 'date' && config.showDueDate) {
        next.dueDate = addDaysInput(value, next.paymentTerms || defaultPaymentTerms);
      }
      if (field === 'paymentTerms' && config.showDueDate) {
        next.dueDate = addDaysInput(next.date, value || defaultPaymentTerms);
      }
      return next;
    });
    if (field === 'date') {
      setPaymentData((p) => ({ ...p, date: value }));
    }
  }
  function updateExtra(field, value) { setDocExtra((p) => ({ ...p, [field]: value })); }
  function updatePayment(field, value){ setPaymentData((p) => ({ ...p, [field]: value })); }
  function updateSinglePayment(field, value) {
    updatePayment(field, value);
    if (field === 'amount') {
      setAdvanceAmt(value);
      if (selectedPayment && selectedPayment !== 'credit') {
        setPaymentSplits([{ id: selectedPayment, amount: value, reference: paymentData.utrNumber || paymentData.chequeNo || '' }]);
      }
    }
    if (['utrNumber', 'chequeNo'].includes(field) && selectedPayment && selectedPayment !== 'credit') {
      setPaymentSplits((prev) => {
        const amount = paymentData.amount || String(Math.max(0, totals.finalTotal));
        const next = prev.filter((split) => split.id !== selectedPayment);
        return [{ id: selectedPayment, amount, reference: value }, ...next].filter((split) => split.id !== 'credit');
      });
    }
  }

  function applyPurchaseOrder(poId) {
    const po = purchaseOrders.find((order) => (order._id || order.id) === poId);
    if (!po) {
      setDocExtra((prev) => ({
        ...prev,
        linkedPurchaseOrderId: '',
        linkedPurchaseOrderNo: '',
        purchaseOrderTotal: '',
      }));
      return;
    }

    setCustomer(normalizeCustomer(po.customer || {}));
    setDocMeta((prev) => ({ ...prev, poRef: po.number || prev.poRef }));
    setDocExtra((prev) => ({
      ...prev,
      linkedPurchaseOrderId: po._id || po.id,
      linkedPurchaseOrderNo: po.number || '',
      purchaseOrderTotal: calcDocumentTotal(po),
    }));
    setSupplyType(po.supplyType || supplyType);
    setItems((Array.isArray(po.items) ? po.items : []).map((item, index) => {
      const normalizedLine = normalizeInvoiceLineItem(item, index);
      const productId = item.productId ?? item.product?._id ?? item.product?.id ?? null;
      const matchedProduct = productId
        ? products.find((product) => String(product._id || product.id) === String(productId))
        : null;
      return {
        id: index + 1,
        itemType: item.itemType === 'Service' || matchedProduct?.itemType === 'Service' ? 'Service' : 'Product',
        productId,
        productCode: item.productCode || item.code || matchedProduct?.code || '',
        description: normalizedLine.description || matchedProduct?.description || '',
        itemDescription: item.itemDescription ?? item.lineDescription ?? item.details ?? item.note ?? item.remark ?? '',
        hsn: item.hsn || matchedProduct?.hsn || '',
        size: normalizedLine.size,
        brand: normalizedLine.brand,
        material: normalizedLine.material,
        barcode: normalizedLine.barcode,
        qty: Number(item.qty) || 1,
        unit: item.unit || matchedProduct?.unit || 'Nos',
        rate: Number(item.rate ?? matchedProduct?.rate) || 0,
        discount: Number(item.discount) || 0,
        discountType: 'percent',
        gstRate: Number(item.gstRate ?? matchedProduct?.gstRate) || 0,
      };
    }));
    setCharges(Array.isArray(po.charges) ? po.charges.map((charge, index) => ({ id: 2000 + index, ...charge })) : []);
  }

  async function loadSalesReturnInvoicesByDate(date) {
    if (documentType !== 'sales-return') return;
    setSalesReturnInvoices([]);
    setSalesReturnInvoiceError('');
    if (!date) return;
    setSalesReturnInvoiceLoading(true);
    try {
      const res = await api.listInvoices({
        dateFrom: date,
        dateTo: date,
        limit: 200,
      });
      let rows = Array.isArray(res?.data) ? res.data : [];
      if (rows.length === 0) {
        const fallback = await api.listInvoices({ limit: 500 });
        const selectedDate = comparableDateInput(date);
        rows = (Array.isArray(fallback?.data) ? fallback.data : [])
          .filter((invoice) => comparableDateInput(invoice.meta?.date || invoice.date || invoice.createdAt) === selectedDate);
      }
      setSalesReturnInvoices(rows);
    } catch (err) {
      console.warn('Unable to load invoices for sales return', err);
      setSalesReturnInvoiceError('Unable to load invoices for this date');
    } finally {
      setSalesReturnInvoiceLoading(false);
    }
  }

  function applySalesReturnInvoice(invoice) {
    if (!invoice) return;
    const sourceItems = Array.isArray(invoice.items) ? invoice.items : [];
    const mappedItems = sourceItems.map((item, index) => {
      const normalizedLine = normalizeInvoiceLineItem(item, index);
      return ({
      id: index + 1,
      productId: item.productId ?? item.product?._id ?? item.product?.id ?? null,
      productCode: item.productCode || item.code || '',
      barcode: normalizedLine.barcode,
      itemType: item.itemType === 'Service' ? 'Service' : 'Product',
      description: normalizedLine.description,
      itemDescription: item.itemDescription ?? item.lineDescription ?? item.details ?? item.note ?? item.remark ?? '',
      hsn: item.hsn || '',
      size: normalizedLine.size,
      brand: normalizedLine.brand,
      material: normalizedLine.material,
      qty: Number(item.qty) || 1,
      unit: item.unit || 'Nos',
      rate: Number(item.rate) || 0,
      discount: Number(item.discount) || 0,
      discountType: 'percent',
      gstRate: item.gstRate === '' || item.gstRate == null ? '' : Number(item.gstRate) || 0,
    });
    });

    setCustomer(normalizeCustomer(invoice.customer || {}));
    setSupplyType(invoice.supplyType || supplyType);
    setItems(mappedItems);
    nextItemId.current = mappedItems.length + 1;
    setCharges(Array.isArray(invoice.charges) ? invoice.charges.map((charge, index) => ({ id: 2000 + index, ...charge })) : []);
    setAddDiscount(invoice.additionalDiscount ?? { type: 'percent', value: '' });
    setDocExtra((prev) => ({
      ...prev,
      originalInvoiceNo: invoice.number || '',
      originalInvoiceDate: invoice.meta?.date || prev.originalInvoiceDate,
    }));
    clearError('originalInvoiceNo');
    clearError('items');
  }

  function updateItem(id, field, value) {
    setItems((prev) => prev.map((item) =>
      item.id === id
        ? { ...item, [field]: ['qty', 'rate', 'discount', 'gstRate'].includes(field) ? Number(value) : value }
        : item,
    ));
  }

  function selectItemVariant(itemId, product, value) {
    const variants = product?.variants || [];
    const selected = findVariantByValue(variants, value);
    setItems((prev) => prev.map((item) => {
      if (item.id !== itemId) return item;
      const next = { ...item, size: value };
      if (selected && Number(selected.rate) > 0) next.rate = Number(selected.rate);
      if (selected) {
        next.size = selected.size || selected.modelName || value;
        next.brand = selected.other || item.brand || '';
        next.material = selected.material || item.material || '';
        next.barcode = selected.barcode || item.barcode || '';
      }
      return next;
    }));
  }

  function updateItemFashionVariant(itemId, product, field, value) {
    const variants = product?.variants || [];
    setItems((prev) => prev.map((item) => {
      if (item.id !== itemId) return item;
      const next = { ...item, [field]: value };
      const selected = findVariantByFashionAttrs(variants, {
        size: field === 'size' ? value : next.size,
        brand: field === 'brand' ? value : next.brand,
        material: field === 'material' ? value : next.material,
      });
      if (selected) {
        next.size = selected.size || selected.modelName || next.size || '';
        next.brand = selected.other || next.brand || '';
        next.material = selected.material || next.material || '';
        next.barcode = selected.barcode || next.barcode || '';
        if (Number(selected.rate) > 0) next.rate = Number(selected.rate);
      }
      return next;
    }));
  }

  function openBrandPicker({ mode, itemId = null, product = null, options = [], value = '' }) {
    const mergedOptions = textDropdownOptions([
      value,
      ...(Array.isArray(options) ? options : []),
      product?.brand,
      ...inlineProductBrands,
    ]);
    const selected = value ? [value] : [];
    const highlighted = Math.max(0, mergedOptions.findIndex((option) => String(option).trim().toLowerCase() === String(value).trim().toLowerCase()));
    setBrandPicker({ type: 'brand', mode, itemId, product, options: mergedOptions, value, selected, highlighted, query: '' });
  }

  function openSizePicker({ mode, itemId = null, product = null, options = [], value = '' }) {
    const mergedOptions = textDropdownOptions([
      value,
      ...(Array.isArray(options) ? options : []),
      ...allFashionSizeOptions,
    ]);
    const selected = value ? [value] : [];
    const highlighted = Math.max(0, mergedOptions.findIndex((option) => String(option).trim().toLowerCase() === String(value).trim().toLowerCase()));
    setBrandPicker({ type: 'size', mode, itemId, product, options: mergedOptions, value, selected, highlighted, query: '' });
  }

  function openMaterialPicker({ mode, itemId = null, product = null, options = [], value = '' }) {
    const mergedOptions = textDropdownOptions([
      value,
      ...(Array.isArray(options) ? options : []),
      product?.material,
      product?.fabric,
      ...(product?.variants || []).map((variant) => variant.material),
      ...allFashionMaterialOptions,
    ]);
    const selected = value ? [value] : [];
    const highlighted = Math.max(0, mergedOptions.findIndex((option) => String(option).trim().toLowerCase() === String(value).trim().toLowerCase()));
    setBrandPicker({ type: 'material', mode, itemId, product, options: mergedOptions, value, selected, highlighted, query: '' });
  }

  function pickerTypeLabel(type) {
    if (type === 'size') return 'size';
    if (type === 'material') return 'material';
    return 'brand';
  }

  function toggleBrandPickerValue(value, refocusSearch = false) {
    setBrandPicker((prev) => {
      if (!prev) return prev;
      const exists = prev.selected.some((item) => String(item).trim().toLowerCase() === String(value).trim().toLowerCase());
      return {
        ...prev,
        selected: exists ? prev.selected.filter((item) => String(item).trim().toLowerCase() !== String(value).trim().toLowerCase()) : [...prev.selected, value],
        query: '',
        highlighted: 0,
      };
    });
    if (refocusSearch) {
      window.setTimeout(() => {
        brandPickerSearchRef.current?.focus();
        brandPickerSearchRef.current?.select?.();
      }, 0);
    }
  }

  function moveBrandPickerHighlight(delta) {
    setBrandPicker((prev) => {
      const filteredOptions = brandPickerFilteredOptions(prev);
      if (!filteredOptions.length) return prev;
      const current = Number.isFinite(prev.highlighted) ? prev.highlighted : 0;
      const highlighted = Math.min(filteredOptions.length - 1, Math.max(0, current + delta));
      return { ...prev, highlighted };
    });
  }

  function brandPickerFilteredOptions(picker = brandPicker) {
    if (!picker) return [];
    const query = String(picker.query || '').trim().toLowerCase();
    if (!query) return picker.options || [];
    return (picker.options || []).filter((option) => String(option || '').toLowerCase().includes(query));
  }

  function brandPickerManualValue(picker = brandPicker) {
    if (!picker) return '';
    const query = String(picker.query || '').trim();
    if (!query) return '';
    const exists = (picker.options || []).some((option) => String(option || '').trim().toLowerCase() === query.toLowerCase());
    const selected = (picker.selected || []).some((option) => String(option || '').trim().toLowerCase() === query.toLowerCase());
    return exists || selected ? '' : query;
  }

  function handleBrandPickerKeyDown(event) {
    if (!brandPicker) return;
    const target = event.target;
    const tagName = target?.tagName;
    const isSearchInput = target?.dataset?.brandPickerSearch === 'true';
    const shouldUseNativeControl = tagName === 'BUTTON'
      || target?.type === 'checkbox'
      || (tagName === 'INPUT' && !isSearchInput)
      || tagName === 'SELECT'
      || tagName === 'TEXTAREA';
    if (shouldUseNativeControl) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      event.stopPropagation();
      moveBrandPickerHighlight(1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      moveBrandPickerHighlight(-1);
      return;
    }
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      const manualValue = brandPickerManualValue();
      const option = brandPickerFilteredOptions()[brandPicker.highlighted || 0] || manualValue;
      if (option) toggleBrandPickerValue(option, Boolean(manualValue && option === manualValue));
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setBrandPicker(null);
    }
  }

  function focusNextBrandColumn(mode, itemId) {
    window.setTimeout(() => {
      if (mode === 'quick') {
        document.querySelector('[data-fkey="quick-size"]')?.focus();
        return;
      }
      const rowIndex = items.findIndex((item) => item.id === itemId);
      if (rowIndex >= 0) document.querySelector(`[data-row="${rowIndex}"][data-col="size"]`)?.focus();
    }, 60);
  }

  function confirmBrandPicker() {
    if (!brandPicker) return;
    const manualValue = brandPickerManualValue();
    const selected = uniqueTextParts([
      ...(brandPicker.selected.length ? brandPicker.selected : (brandPicker.value ? [brandPicker.value] : [])),
      manualValue,
    ]);
    if (!selected.length) {
      setBrandPicker(null);
      return;
    }
    if (brandPicker.type === 'material') {
      const [firstMaterial, ...extraMaterials] = selected;
      if (brandPicker.mode === 'quick') {
        setQuickPickerSelections((prev) => ({ ...prev, material: selected }));
        updateQuickFashionVariant('material', firstMaterial);
      } else if (brandPicker.itemId) {
        updateItemFashionVariant(brandPicker.itemId, brandPicker.product, 'material', firstMaterial);
        if (extraMaterials.length) {
          setItems((prev) => {
            const sourceIndex = prev.findIndex((item) => item.id === brandPicker.itemId);
            if (sourceIndex < 0) return prev;
            const source = prev[sourceIndex];
            const additions = extraMaterials.map((material) => ({
              ...source,
              id: nextItemId.current++,
              material,
              barcode: '',
            }));
            return [
              ...prev.slice(0, sourceIndex + 1),
              ...additions,
              ...prev.slice(sourceIndex + 1),
            ];
          });
        }
      }
      setBrandPicker(null);
      window.setTimeout(() => {
        if (brandPicker.mode === 'quick') document.querySelector('[data-fkey="quick-hsn"]')?.focus();
        else {
          const rowIndex = items.findIndex((item) => item.id === brandPicker.itemId);
          if (rowIndex >= 0) document.querySelector(`[data-row="${rowIndex}"][data-col="hsn"]`)?.focus();
        }
      }, 60);
      return;
    }
    if (brandPicker.type === 'size') {
      const [firstSize, ...extraSizes] = selected;
      if (brandPicker.mode === 'quick') {
        setQuickPickerSelections((prev) => ({ ...prev, size: selected }));
        updateQuickFashionVariant('size', firstSize);
      } else if (brandPicker.itemId) {
        updateItemFashionVariant(brandPicker.itemId, brandPicker.product, 'size', firstSize);
        if (extraSizes.length) {
          setItems((prev) => {
            const sourceIndex = prev.findIndex((item) => item.id === brandPicker.itemId);
            if (sourceIndex < 0) return prev;
            const source = prev[sourceIndex];
            const additions = extraSizes.map((size) => ({
              ...source,
              id: nextItemId.current++,
              size,
              barcode: '',
            }));
            return [
              ...prev.slice(0, sourceIndex + 1),
              ...additions,
              ...prev.slice(sourceIndex + 1),
            ];
          });
        }
      }
      setBrandPicker(null);
      window.setTimeout(() => {
        if (brandPicker.mode === 'quick') document.querySelector('[data-fkey="quick-material"]')?.focus();
        else {
          const rowIndex = items.findIndex((item) => item.id === brandPicker.itemId);
          if (rowIndex >= 0) document.querySelector(`[data-row="${rowIndex}"][data-col="material"]`)?.focus();
        }
      }, 60);
      return;
    }
    const [firstBrand, ...extraBrands] = selected;
    if (brandPicker.mode === 'quick') {
      setQuickPickerSelections((prev) => ({ ...prev, brand: selected }));
      updateQuickFashionVariant('brand', firstBrand);
    } else if (brandPicker.itemId) {
      updateItemFashionVariant(brandPicker.itemId, brandPicker.product, 'brand', firstBrand);
      if (extraBrands.length) {
        setItems((prev) => {
          const sourceIndex = prev.findIndex((item) => item.id === brandPicker.itemId);
          if (sourceIndex < 0) return prev;
          const source = prev[sourceIndex];
          const additions = extraBrands.map((brand) => ({
            ...source,
            id: nextItemId.current++,
            brand,
            size: '',
            material: source.material || '',
            barcode: '',
          }));
          return [
            ...prev.slice(0, sourceIndex + 1),
            ...additions,
            ...prev.slice(sourceIndex + 1),
          ];
        });
      }
    }
    setBrandPicker(null);
    focusNextBrandColumn(brandPicker.mode, brandPicker.itemId);
  }

  function clearItemFields(id) {
    setItems((prev) => prev.map((item) =>
      item.id === id
        ? {
            ...item,
            productId: null,
            productCode: '',
            barcode: '',
            itemType: 'Product',
            productType: 'Standard',
            description: '',
            itemDescription: '',
            hsn: '',
            size: '',
            qty: 1,
            unit: 'Nos',
            rate: 0,
            discount: 0,
            discountType: 'percent',
            gstRate: '',
          }
        : item,
    ));
  }

  function applyQuickValuesToAllItems() {
    const hasDiscount = String(addDiscount.value || '').trim() !== '';
    const hasTax = String(bulkGstRate || '').trim() !== '';
    const nextValues = {
      ...(hasDiscount ? { discount: Number(addDiscount.value) || 0, discountType: 'percent' } : {}),
      ...(hasTax ? { gstRate: Number(bulkGstRate) || 0 } : {}),
    };
    if (!hasDiscount && !hasTax) return;
    setItems((prev) => prev.map((item) => ({ ...item, ...nextValues })));
    // Also carry the rate onto whatever's currently being typed in the quick-add
    // row (not yet a real item) — otherwise committing it afterward falls back
    // to the product's own catalog rate, silently ignoring this bulk choice.
    setQuickItem((prev) => ({ ...prev, ...nextValues }));
  }

  function addItem() {
    const id = nextItemId.current++;
    setItems((prev) => [...prev, { id, productId: null, productCode: '', itemType: 'Product', productType: 'Standard', description: '', itemDescription: '', hsn: '', qty: 1, unit: 'Nos', rate: 0, discount: 0, discountType: 'percent', gstRate: '' }]);
  }

  function removeItem(id) { setItems((prev) => prev.filter((item) => item.id !== id)); }

  // Enter advances through a row's fields (then to the next row, adding one if
  // needed); Arrow Up/Down jump to the same column in the adjacent row. Arrow
  // keys are skipped on <select> cells so their native option-cycling still works.
  function handleItemKeyDown(e) {
    const cell = e.target;
    const row = Number(cell.dataset.row);
    const col = cell.dataset.col;
    if (Number.isNaN(row) || !col) return;

    const columns = isPurchaseFashionDocument
      ? ['description', 'brand', 'size', 'material', 'hsn', 'qty', 'unit', 'rate', ...(config.showGst ? ['gstRate'] : [])]
      : ['description', 'itemDescription', 'hsn', 'size', 'qty', 'unit', 'rate', 'discount', ...(config.showGst ? ['gstRate'] : [])];
    const colIndex = columns.indexOf(col);
    const isDescriptionTextarea = cell.tagName === 'TEXTAREA' && col === 'itemDescription';

    function focusCell(targetRow, targetCol) {
      document.querySelector(`[data-row="${targetRow}"][data-col="${targetCol}"]`)?.focus();
    }

    if (e.key === 'Enter') {
      if (isDescriptionTextarea) return;
      e.preventDefault();
      const nextCol = columns[colIndex + 1];
      if (nextCol) {
        focusCell(row, nextCol);
      } else if (row + 1 < items.length) {
        focusCell(row + 1, columns[0]);
      } else {
        addItem();
        requestAnimationFrame(() => focusCell(row + 1, columns[0]));
      }
      return;
    }

    if (cell.tagName === 'INPUT' && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      focusCell(e.key === 'ArrowDown' ? row + 1 : row - 1, col);
    }
  }

  function selectProduct(itemId, product) {
    const normalized = normalizeProduct(product);
    setItems((prev) => {
      return prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              productId: normalized.id,
              productCode: normalized.code || '',
              barcode: normalized.barcode || '',
              itemType: normalized.itemType || 'Product',
              productType: normalized.productType || 'Standard',
              description: normalized.description,
              itemDescription: normalized.productDescription || item.itemDescription || '',
              modelNumber: normalized.modelNumber || '',
              warrantyPeriod: normalized.warrantyPeriod || '',
              hsn: normalized.hsn,
              size: productBillingSize(normalized),
              brand: productBillingBrand(normalized),
              material: productBillingMaterial(normalized),
              unit: normalized.unit,
              rate: productBillingRate(normalized),
              gstRate: normalized.gstRate,
            }
          : item,
      );
    });
    setErrors((prev) => {
      const next = { ...prev };
      delete next.items;
      return next;
    });
  }

  function addProductToBill(product) {
    const normalized = normalizeProduct(product);
    const existing = items.find((item) => (
      ((normalized.id && item.productId === normalized.id)
        || (normalized.code && item.productCode === normalized.code)
        || (normalized.barcode && item.barcode === normalized.barcode)
        || (!normalized.code && !normalized.barcode && item.description === normalized.description))
      && String(item.size || '') === String(productBillingSize(normalized) || '')
    ));

    if (existing) {
      setItems((prev) => prev.map((item) => (
        item.id === existing.id
          ? {
              ...item,
              qty: Number(item.qty || 0) + 1,
              itemDescription: item.itemDescription || normalized.productDescription || '',
              modelNumber: item.modelNumber || normalized.modelNumber || '',
              warrantyPeriod: item.warrantyPeriod || normalized.warrantyPeriod || '',
            }
          : item
      )));
      return;
    }

    const target = items.find((item) => !item.description);
    if (target) {
      selectProduct(target.id, normalized);
      return;
    }

    const id = nextItemId.current++;
    setItems((prev) => [...prev, { id, productId: null, productCode: '', itemType: 'Product', productType: 'Standard', description: '', itemDescription: '', hsn: '', qty: 1, unit: 'Nos', rate: 0, discount: 0, discountType: 'percent', gstRate: '' }]);
    window.setTimeout(() => selectProduct(id, normalized), 0);
  }

  function openInlineDeviceCreator({ barcode = '', targetItemId = null } = {}) {
    if (!canCreateDevicesInline) return false;
    setInlineProductModal({
      barcode,
      targetItemId,
      initialProductType: 'Serialized',
    });
    return true;
  }

  function handleInlineProductSave(result, options = {}) {
    const normalized = mergeScannedProduct(result);
    if (inlineProductModal?.targetItemId) {
      selectProduct(inlineProductModal.targetItemId, normalized);
    } else {
      addProductToBill(normalized);
    }
    if (!options.keepOpen) setInlineProductModal(null);
  }

  function mergeScannedProduct(product) {
    const normalized = normalizeProduct(product);
    setProducts((prev) => {
      const id = normalized._id || normalized.id;
      const exists = prev.some((p) => (
        (id && String(p._id || p.id) === String(id))
        || (normalized.code && p.code === normalized.code)
        || (normalized.barcode && p.barcode === normalized.barcode)
      ));
      if (!exists) return [normalized, ...prev];
      return prev.map((p) => {
        const same = (id && String(p._id || p.id) === String(id))
          || (normalized.code && p.code === normalized.code)
          || (normalized.barcode && p.barcode === normalized.barcode);
        return same
          ? { ...p, ...normalized, productDescription: normalized.productDescription || p.productDescription || '' }
          : p;
      });
    });
    return normalized;
  }

  function productMatchesItemFilter(product, itemType = 'All Items') {
    if (itemType === 'All Items') return true;
    const normalizedType = product?.itemType === 'Service' ? 'Service' : 'Product';
    return normalizedType === itemType;
  }

  async function resolveProductByScan(query, itemType = 'All Items') {
    const local = findProductByScan(products, query);
    if (local && !productMatchesItemFilter(local, itemType)) return null;
    if (local && String(local.productDescription || '').trim()) return local;

    try {
      const [salesData, invData] = await Promise.allSettled([
        api.listProducts({ search: query, itemType }),
        api.invListProducts({ search: query, itemType, page: 1, limit: 20 }),
      ]);
      const salesRows = salesData.status === 'fulfilled'
        ? (Array.isArray(salesData.value) ? salesData.value : salesData.value?.data)
        : [];
      const invRows = invData.status === 'fulfilled'
        ? (Array.isArray(invData.value) ? invData.value : invData.value?.data)
        : [];
      const rows = [
        ...(Array.isArray(invRows) ? invRows : []),
        ...(Array.isArray(salesRows) ? salesRows : []),
        ...(local ? [local] : []),
      ].map(normalizeProduct);
      const match = findProductByScan(rows, query);
      if (match && !productMatchesItemFilter(match, itemType)) return null;
      return match ? mergeScannedProduct(match) : local;
    } catch (err) {
      console.warn('Unable to resolve scanned product', err);
      return local;
    }
  }

  async function handleCameraBarcodeDetected(code) {
    const value = String(code || '').trim();
    if (!value) return;

    setBarcodeScanStatus(`Scanning ${value}...`);
    setUnknownBarcode('');
    setMobileProductQuery(value);

    const product = await resolveProductByScan(value, salesItemFilter);
    if (product) {
      const normalized = normalizeProduct(product);
      const existingItem = items.find((item) => (
        (normalized.id && item.productId === normalized.id)
        || (normalized.code && item.productCode === normalized.code)
        || (normalized.barcode && item.barcode === normalized.barcode)
        || (!normalized.code && !normalized.barcode && item.description === normalized.description)
      ));
      const nextQty = existingItem ? Number(existingItem.qty || 0) + 1 : 1;
      addProductToBill(normalized);
      setBarcodeScanStatus(`${normalized.description || value} added - Qty ${nextQty}`);
      setUnknownBarcode('');
      return;
    }

    setBarcodeScanStatus('Product not found');
    setUnknownBarcode(value);
  }

  function openBarcodeScanner() {
    setBarcodeScanStatus('');
    setUnknownBarcode('');
    setShowBarcodeScanner(true);
  }

  function productsOfType(itemType) {
    if (itemType === 'All Items') return products;
    const wanted = itemType === 'Service' ? 'Service' : 'Product';
    return products.filter((p) => (p.itemType === 'Service' ? 'Service' : 'Product') === wanted);
  }

  function productSearchOptions(itemType) {
    const optionByDescription = new Map();
    for (const product of productsOfType(itemType)) {
      const description = String(product.description || '').trim();
      if (!description) continue;
      const variants = (product.variants || []).map(variantDisplayName).filter(Boolean);
      const variantLabel = variantColumnLabel(product).toLowerCase();
      const option = {
        value: description,
        label: description,
        badge: product.productType === 'Bundle' ? 'Bundle / Kit' : variants.length ? `${variants.length} ${variantLabel}${variants.length > 1 ? 's' : ''}` : productBillingTypeLabel(product),
        searchText: [
          description,
          product.code,
          product.barcode,
          product.hsn,
          product.brand,
          product.category,
          product.modelNumber,
          product.serialNumber,
          product.warrantyPeriod,
          product.serviceType,
          product.technician,
          product.productType,
          ...productBundleSearchTerms(product),
          ...variants,
          ...variants.map((variant) => `${variant} ${description}`),
        ].filter(Boolean).join(' '),
      };
      const existing = optionByDescription.get(description);
      if (!existing || (variants.length && !existing.variantCount)) {
        optionByDescription.set(description, { ...option, variantCount: variants.length });
      }
    }
    return Array.from(optionByDescription.values()).map(({ variantCount: _variantCount, ...option }) => option);
  }

  function setQuickItemType(type) {
    setSalesItemFilter(type);
    if (type === 'Product' || type === 'Service') {
      setQuickItem((prev) => ({ ...prev, itemType: type, hsn: '', rate: 0 }));
    } else {
      setQuickItem((prev) => ({ ...prev, itemType: 'Product', hsn: '', rate: 0 }));
    }
  }

  function toggleQuickItemType() {
    setQuickItem((prev) => ({
      ...prev,
      itemType: prev.itemType === 'Service' ? 'Product' : 'Service',
      hsn: '',
      rate: 0,
    }));
  }

  async function handleRowProductEntry(itemId, value) {
    const item = items.find((row) => row.id === itemId);
    const rowItemType = item?.itemType || 'All Items';
    const rowProducts = productsOfType(rowItemType);
    const chosen = findProductByExactEntry(rowProducts, value);
    if (chosen && String(chosen.productDescription || '').trim()) {
      selectProduct(itemId, chosen);
      return true;
    }

    const scanned = await resolveProductByScan(value, rowItemType);
    if (scanned) {
      selectProduct(itemId, scanned);
      return true;
    }

    if (chosen) {
      selectProduct(itemId, chosen);
      return true;
    }

    if (canOpenProductCreationFromQuickEntry && isLikelyBarcodeScan(value)) {
      openInlineDeviceCreator({ barcode: value, targetItemId: itemId });
      return true;
    }

    return false;
  }

  function isProductCommitKey(event) {
    if (event.key === 'Enter' || event.key === 'NumpadEnter') return true;
    return event.key === 'Tab' && window.matchMedia?.('(max-width: 767px)').matches;
  }

  async function addProductFromSearch(rawQuery = productSearch) {
    const query = String(rawQuery || '').trim();
    if (!query) return;

    const localScanMatch = isLikelyBarcodeScan(query) ? findProductByScan(products, query) : null;
    if (canOpenProductCreationFromQuickEntry && !localScanMatch && isLikelyBarcodeScan(query)) {
      openInlineDeviceCreator({ barcode: query });
      setProductSearch('');
      return;
    }

    if (!['purchase-entry', 'purchase-order'].includes(documentType) && !localScanMatch && isLikelyBarcodeScan(query)) {
      // Open synchronously (before any await) — mobile browsers silently
      // block window.open() once a promise/await has broken the chain back
      // to the user's tap/keypress.
      openAddProductForBarcode(query);
      setProductSearch('');
      return;
    }

    const chosen = localScanMatch || await resolveProductByScan(query, salesItemFilter);
    const target = items.find((item) => !item.description);

    if (chosen) {
      addProductToBill(chosen);
    } else if (target) {
      updateItem(target.id, 'description', query);
    } else {
      setItems((prev) => [...prev, { id: nextItemId.current++, productId: null, productCode: '', itemType: 'Product', productType: 'Standard', description: query, itemDescription: '', hsn: '', qty: 1, unit: 'Nos', rate: 0, discount: 0, discountType: 'percent', gstRate: '' }]);
    }

    setProductSearch('');
    clearError('items');
  }

  function updateQuickItem(field, value) {
    setQuickItem((prev) => ({ ...prev, [field]: ['qty', 'rate', 'discount', 'gstRate'].includes(field) ? Number(value) : value }));
  }

  function selectQuickItemVariant(product, value) {
    const selected = findVariantByValue(product?.variants || [], value);
    setQuickItem((prev) => ({
      ...prev,
      size: selected ? (selected.size || selected.modelName || value) : value,
      brand: selected?.other || prev.brand || '',
      material: selected?.material || prev.material || '',
      barcode: selected?.barcode || prev.barcode || '',
      rate: selected && Number(selected.rate) > 0 ? Number(selected.rate) : prev.rate,
    }));
  }

  function updateQuickFashionVariant(field, value) {
    const variants = quickMatchedProduct?.variants || [];
    setQuickItem((prev) => {
      const next = { ...prev, [field]: value };
      const selected = findVariantByFashionAttrs(variants, {
        size: field === 'size' ? value : next.size,
        brand: field === 'brand' ? value : next.brand,
        material: field === 'material' ? value : next.material,
      });
      if (!selected) return next;
      return {
        ...next,
        size: selected.size || selected.modelName || next.size || '',
        brand: selected.other || next.brand || '',
        material: selected.material || next.material || '',
        barcode: selected.barcode || next.barcode || '',
        rate: Number(selected.rate) > 0 ? Number(selected.rate) : next.rate,
      };
    });
  }

  function focusQuickItemField(field) {
    requestAnimationFrame(() => {
      const selector = field === 'product' ? '[data-fkey="product"]' : `[data-fkey="quick-${field}"]`;
      const target = document.querySelector(selector);
      target?.focus();
      target?.select?.();
    });
  }

  function handleQuickItemStep(e) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    e.stopPropagation();
    addQuickItem();
  }

  function resetQuickItem() {
    setQuickItem((prev) => ({ itemType: prev.itemType || 'Product', productType: 'Standard', itemDescription: '', hsn: '', size: '', brand: '', material: '', barcode: '', qty: 1, unit: 'Nos', rate: 0, discount: 0, discountType: 'percent', gstRate: '' }));
    setQuickPickerSelections({ brand: [], size: [], material: [] });
  }

  function prefillQuickItemFromProduct(value) {
    const chosen = findProductByExactEntry(productsOfType(salesItemFilter), value);
    if (!chosen) return;
    const normalized = normalizeProduct(chosen);
    setQuickItem((prev) => ({
      ...prev,
      itemType: normalized.itemType || prev.itemType,
      productType: normalized.productType || 'Standard',
      itemDescription: prev.itemDescription || normalized.productDescription || '',
      hsn: normalized.hsn || prev.hsn,
      size: productBillingSize(normalized) || prev.size || '',
      brand: productBillingBrand(normalized) || prev.brand || '',
      material: productBillingMaterial(normalized) || prev.material || '',
      barcode: normalized.barcode || prev.barcode || '',
      unit: normalized.unit || prev.unit || 'Nos',
      rate: productBillingRate(normalized) || prev.rate || 0,
      gstRate: prev.gstRate ?? '',
    }));
  }

  function applyQuickProductSelection(value) {
    prefillQuickItemFromProduct(value);
    focusQuickItemField('itemDescription');
  }

  function updateProductSearch(value) {
    setProductSearch(value);
    if (!String(value || '').trim()) {
      resetQuickItem();
      return;
    }
    prefillQuickItemFromProduct(value);
  }

  async function handleQuickProductEntry(value) {
    const query = String(value || '').trim();
    if (!query) return;

    const filterRows = productsOfType(salesItemFilter);
    const exact = findProductByExactEntry(filterRows, query);
    const localScanMatch = !exact && isLikelyBarcodeScan(query) ? findProductByScan(filterRows, query) : null;
    if (canOpenProductCreationFromQuickEntry && !exact && !localScanMatch && isLikelyBarcodeScan(query)) {
      openInlineDeviceCreator({ barcode: query });
      setProductSearch('');
      return;
    }

    if (!['purchase-entry', 'purchase-order'].includes(documentType) && !exact && !localScanMatch && isLikelyBarcodeScan(query)) {
      openAddProductForBarcode(query);
      setProductSearch('');
      return;
    }

    const scanned = exact ? null : (localScanMatch || await resolveProductByScan(query, salesItemFilter));
    const chosen = exact || scanned;

    if (chosen) {
      const normalized = normalizeProduct(chosen);
      setProductSearch(normalized.__selectedVariantName ? productVariantSearchLabel(normalized, { modelName: normalized.__selectedVariantName }) : normalized.description);
      setQuickItem((prev) => ({
        ...prev,
        itemType: normalized.itemType || prev.itemType,
        productType: normalized.productType || 'Standard',
        hsn: normalized.hsn || prev.hsn,
        size: productBillingSize(normalized) || prev.size || '',
        brand: productBillingBrand(normalized) || prev.brand || '',
        material: productBillingMaterial(normalized) || prev.material || '',
        barcode: normalized.barcode || prev.barcode || '',
        unit: normalized.unit || prev.unit || 'Nos',
        rate: productBillingRate(normalized) || prev.rate || 0,
        gstRate: prev.gstRate ?? '',
      }));
    }

    focusQuickItemField('itemDescription');
  }

  async function addQuickItem(rawQuery = productSearch) {
    const query = String(rawQuery || '').trim();
    if (!query) {
      document.querySelector('[data-fkey="product"]')?.focus();
      return;
    }

    const filterRows = productsOfType(salesItemFilter);
    const exact = findProductByExactEntry(filterRows, query);
    const localScanMatch = !exact && isLikelyBarcodeScan(query) ? findProductByScan(filterRows, query) : null;
    if (canOpenProductCreationFromQuickEntry && !exact && !localScanMatch && isLikelyBarcodeScan(query)) {
      openInlineDeviceCreator({ barcode: query });
      setProductSearch('');
      return;
    }

    if (!['purchase-entry', 'purchase-order'].includes(documentType) && !exact && !localScanMatch && isLikelyBarcodeScan(query)) {
      // Open synchronously (before any await) — mobile browsers silently
      // block window.open() once a promise/await has broken the chain back
      // to the user's tap/keypress, which left the barcode just sitting in
      // the field with nothing visibly happening.
      openAddProductForBarcode(query);
      setProductSearch('');
      return;
    }

    const chosen = exact || localScanMatch || await resolveProductByScan(query, salesItemFilter);
    const normalized = chosen ? normalizeProduct(chosen) : null;
    const selectedBrands = quickPickerSelections.brand.length ? quickPickerSelections.brand : [quickItem.brand || normalized?.brand || ''];
    const selectedSizes = quickPickerSelections.size.length ? quickPickerSelections.size : [quickItem.size || productBillingSize(normalized) || ''];
    const selectedMaterials = quickPickerSelections.material.length ? quickPickerSelections.material : [quickItem.material || productBillingMaterial(normalized) || ''];
    if (isPurchaseFashionDocument && (selectedBrands.length > 1 || selectedSizes.length > 1 || selectedMaterials.length > 1)) {
      const rowCount = Math.max(selectedBrands.length, selectedSizes.length, selectedMaterials.length);
      const rows = Array.from({ length: rowCount }, (_, index) => buildQuickPurchaseItem(normalized, {
        description: normalized?.description || query,
        brand: selectedBrands[index] ?? selectedBrands[0] ?? quickItem.brand ?? normalized?.brand ?? '',
        size: selectedSizes[index] ?? selectedSizes[0] ?? quickItem.size ?? productBillingSize(normalized) ?? '',
        material: selectedMaterials[index] ?? selectedMaterials[0] ?? quickItem.material ?? productBillingMaterial(normalized) ?? '',
        barcode: quickItem.barcode || normalized?.barcode || '',
        hsn: quickItem.hsn || normalized?.hsn || '',
        qty: Number(quickItem.qty) || 1,
        unit: quickItem.unit || normalized?.unit || 'Nos',
        rate: Number(quickItem.rate || productBillingRate(normalized)) || 0,
      }));
      setItems((prev) => [...prev, ...rows]);
      setBrandPicker(null);
      setProductSearch('');
      resetQuickItem();
      focusQuickItemField('product');
      clearError('items');
      return;
    }
    const rows = [buildQuickPurchaseItem(normalized, {
      brand: selectedBrands[0] || '',
      size: selectedSizes[0] || '',
      material: selectedMaterials[0] || '',
      barcode: quickItem.barcode || normalized?.barcode || '',
    })];
    setItems((prev) => [...prev, ...rows]);
    setProductSearch('');
    resetQuickItem();
    focusQuickItemField('product');
    clearError('items');
  }

  function buildQuickPurchaseItem(normalized, overrides = {}) {
    return {
      id: nextItemId.current++,
      productId: normalized?.id || null,
      productCode: normalized?.code || '',
      barcode: overrides.barcode ?? quickItem.barcode ?? normalized?.barcode ?? '',
      itemType: normalized?.itemType || (salesItemFilter === 'Service' ? 'Service' : quickItem.itemType || 'Product'),
      productType: normalized?.productType || quickItem.productType || 'Standard',
      description: overrides.description ?? normalized?.description ?? productSearch,
      itemDescription: overrides.itemDescription ?? quickItem.itemDescription ?? normalized?.productDescription ?? '',
      modelNumber: normalized?.modelNumber || '',
      warrantyPeriod: normalized?.warrantyPeriod || '',
      hsn: overrides.hsn ?? quickItem.hsn ?? normalized?.hsn ?? '',
      size: overrides.size ?? quickItem.size ?? productBillingSize(normalized) ?? '',
      brand: overrides.brand ?? quickItem.brand ?? productBillingBrand(normalized) ?? '',
      material: overrides.material ?? quickItem.material ?? productBillingMaterial(normalized) ?? '',
      qty: Number(overrides.qty ?? quickItem.qty) || 1,
      unit: overrides.unit ?? quickItem.unit ?? normalized?.unit ?? 'Nos',
      rate: Number(overrides.rate ?? quickItem.rate ?? productBillingRate(normalized)) || 0,
      discount: Number(quickItem.discount) || 0,
      discountType: 'percent',
      gstRate: Number(quickItem.gstRate ?? normalized?.gstRate ?? 0),
    };
  }

  function updateQuickVariantDraftRow(rowId, field, value) {
    setQuickVariantDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        rows: prev.rows.map((row) => (
          row.id === rowId
            ? { ...row, [field]: ['qty', 'rate'].includes(field) ? Number(value) : value }
            : row
        )),
      };
    });
  }

  function removeQuickVariantDraftRow(rowId) {
    setQuickVariantDraft((prev) => {
      if (!prev) return prev;
      const rows = prev.rows.filter((row) => row.id !== rowId);
      return rows.length ? { ...prev, rows } : null;
    });
  }

  function confirmQuickVariantDraft() {
    if (!quickVariantDraft?.rows?.length) return;
    if (quickVariantDraft.reviewMode === 'save') {
      const reviewedItems = items.map((item) => {
        const reviewed = quickVariantDraft.rows.find((row) => row.itemId === item.id);
        if (!reviewed) return item;
        return {
          ...item,
          brand: reviewed.brand || '',
          size: reviewed.size || '',
          material: reviewed.material || '',
          hsn: reviewed.hsn || item.hsn || '',
          qty: Number(reviewed.qty) || 1,
          unit: reviewed.unit || 'Nos',
          rate: Number(reviewed.rate) || 0,
        };
      });
      const draftErrors = validate(reviewedItems);
      if (Object.keys(draftErrors).length > 0) {
        setErrors(draftErrors);
        setQuickVariantDraft(null);
        setItems(reviewedItems);
        setTimeout(() => document.querySelector('[data-validation-error]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
        return;
      }
      setItems(reviewedItems);
      const options = quickVariantDraft.saveOptions || {};
      setQuickVariantDraft(null);
      handleSave({ ...options, variantReviewConfirmed: true, itemsOverride: reviewedItems });
      return;
    }
    const rows = quickVariantDraft.rows.map((row) => buildQuickPurchaseItem(quickVariantDraft.normalized, {
      description: row.description || quickVariantDraft.normalized?.description || quickVariantDraft.query,
      brand: row.brand || '',
      size: row.size || '',
      material: row.material || '',
      barcode: row.barcode || '',
      hsn: row.hsn || '',
      qty: Number(row.qty) || 1,
      unit: row.unit || 'Nos',
      rate: Number(row.rate) || 0,
    }));
    setItems((prev) => [...prev, ...rows]);
    setQuickVariantDraft(null);
    setProductSearch('');
    resetQuickItem();
    focusQuickItemField('product');
    clearError('items');
  }

  function openFinalVariantReview(saveOptions = {}) {
    const rows = items
      .filter((item) => item.description)
      .map((item) => ({
        id: `final-variant-${item.id}`,
        itemId: item.id,
        description: item.description,
        brand: item.brand || '',
        size: item.size || '',
        material: item.material || '',
        hsn: item.hsn || '',
        qty: Number(item.qty) || 1,
        unit: item.unit || 'Nos',
        rate: Number(item.rate) || 0,
      }));
    if (!rows.length) return false;
    setQuickVariantDraft({
      reviewMode: 'save',
      saveOptions,
      query: '',
      brandOptions: uniqueTextParts(rows.map((row) => row.brand)),
      sizeOptions: uniqueTextParts(rows.map((row) => row.size)).filter((size) => isAllowedFashionSize(size, rows.map((row) => row.description))),
      rows,
    });
    return true;
  }

  function addCharge(preset) {
    const id = nextChargeId.current++;
    const charge = preset
      ? { id, label: preset.label, amount: '', gstRate: preset.gstRate }
      : { id, label: '', amount: '', gstRate: 18 };
    setCharges((prev) => [...prev, charge]);
  }

  function updateCharge(id, field, value) {
    setCharges((prev) => prev.map((c) => c.id === id ? { ...c, [field]: value } : c));
  }

  function removeCharge(id) { setCharges((prev) => prev.filter((c) => c.id !== id)); }

  function buildPayload(customerOverride, itemsOverride = effectiveItems, totalsOverride = totals) {
    const effectiveCustomer = customerOverride || getEffectiveCustomer();
    const activeSplits = paymentSplits.filter((split) => split.id !== 'credit' && Number(split.amount) > 0);
    const splitPaidAmount = activeSplits.reduce((sum, split) => sum + (Number(split.amount) || 0), 0);
    const paidAmount = activeSplits.length
      ? Math.min(splitPaidAmount, totals.finalTotal || 0)
      : selectedPayment && selectedPayment !== 'credit'
        ? Math.min(Number(advanceAmt) || 0, totals.finalTotal || 0)
      : Number(advanceAmt) || 0;
    const extra = documentType === 'purchase-entry'
      ? {
        ...docExtra,
        vendorInvoiceAmount: docExtra.vendorInvoiceAmount === '' ? '' : Number(docExtra.vendorInvoiceAmount) || 0,
        vendorBankName: effectiveCustomer.bankName || docExtra.vendorBankName || '',
        vendorAccountHolderName: effectiveCustomer.accountHolderName || docExtra.vendorAccountHolderName || '',
        vendorAccountNumber: effectiveCustomer.accountNumber || docExtra.vendorAccountNumber || '',
        vendorIfscCode: effectiveCustomer.ifscCode || docExtra.vendorIfscCode || '',
        vendorBankBranch: effectiveCustomer.bankBranch || docExtra.vendorBankBranch || '',
      }
      : docExtra;
    return {
      number: docMeta.number,
      documentType: effectiveDocumentType,
      customer: effectiveCustomer,
      meta: docMeta,
      supplyType: config.showGst && effectiveCustomer.state
        ? (effectiveCustomer.state === bizState ? 'intrastate' : 'interstate')
        : supplyType,
      items: enrichItemsWithProductDescriptions(itemsOverride, products),
      shipping: { sameAsBilling: sameShipping, ...shipping },
      charges,
      additionalDiscount: addDiscount,
      tds,
      tcs,
      advanceReceived: paidAmount,
      paymentMethod: currentPaymentMethodLabel(activeSplits),
      paymentSplits: activeSplits.map((split) => {
        const method = PAYMENT_METHODS.find((m) => m.id === split.id);
        return {
          methodId: split.id,
          method: method?.label || split.id,
          amount: Number(split.amount) || 0,
          reference: split.reference || '',
        };
      }),
      totals: totalsOverride,
      notes,
      internalNotes,
      terms,
      customFields,
      recurring,
      extra: {
        ...extra,
        invoicePrintFormat: billPrintFormat,
      },
    };
  }

  const LIST_ROUTES = {
    invoice:            '/billing/invoice',
    'bill-of-supply':   '/billing/bill-of-supply',
    quotation:          '/billing/quotation',
    'purchase-order':   '/billing/purchase-order',
    'purchase-entry':   '/billing/purchase-entry',
    'credit-note':      '/billing/credit-note',
    'debit-note':       '/billing/debit-note',
    'sales-return':     '/billing/sales-return',
    'supplier-return':  '/billing/supplier-return',
    proforma:           '/billing/proforma',
    'delivery-challan': '/billing/delivery-challan',
    'e-invoice':        '/billing/e-invoice',
    'e-way-bill':       '/billing/e-way-bill',
    'pharmacy-bill':    '/billing/pharmacy-bill',
  };
  const currentListRoute = LIST_ROUTES[documentType] ?? '/billing/invoice';

  const NEW_ROUTES = {
    invoice: '/billing/invoice/new', 'bill-of-supply': '/billing/bill-of-supply/new', quotation: '/billing/quotation/new',
    'purchase-order': '/billing/purchase-order/new', 'purchase-entry': '/billing/purchase-entry/new', 'credit-note': '/billing/credit-note/new',
    'debit-note': '/billing/debit-note/new', 'sales-return': '/billing/sales-return/new', 'supplier-return': '/billing/supplier-return/new',
    'delivery-challan': '/billing/delivery-challan/new', 'e-invoice': '/billing/e-invoice/new', 'e-way-bill': '/billing/e-way-bill/new',
    'pharmacy-bill': '/billing/pharmacy-bill/new',
  };

  async function saveDocumentPayload(payload, id = invoiceId) {
    if (documentType === 'sales-return') return id ? api.updateSalesReturn(id, payload) : api.createSalesReturn(payload);
    if (documentType === 'supplier-return') return id ? api.updateSupplierReturn(id, payload) : api.createSupplierReturn(payload);
    if (id) {
      if (documentType === 'credit-note')           return api.updateCreditNote(id, payload);
      if (documentType === 'debit-note')            return api.updateDebitNote(id, payload);
      if (documentType === 'delivery-challan')      return api.updateChallan(id, payload);
      if (documentType === 'e-invoice')             return api.updateEInvoice(id, payload);
      if (documentType === 'e-way-bill')            return api.updateEWayBill(id, payload);
      return api.updateInvoice(id, payload);
    }

    if (documentType === 'credit-note')             return api.createCreditNote(payload);
    if (documentType === 'debit-note')              return api.createDebitNote(payload);
    if (documentType === 'delivery-challan')        return api.createChallan(payload);
    if (documentType === 'e-invoice')               return api.createEInvoice(payload);
    if (documentType === 'e-way-bill')              return api.createEWayBill(payload);
    return api.createInvoice(payload);
  }

  async function handleSave({
    openPreview,
    autoPrint,
    inventoryConfirmed = false,
    variantReviewConfirmed = false,
    itemsOverride = null,
    barcodePrintHandled = false,
  } = {}) {
    setSaveError('');
    const rawSaveItems = itemsOverride || effectiveItems;
    let saveItems = isPurchaseFashionDocument
      ? normalizePurchaseFashionItemsForSave(rawSaveItems, products)
      : rawSaveItems;
    if (documentType === 'purchase-entry' && isPurchaseFashionDocument) saveItems = withPurchaseBarcodes(saveItems);
    const saveTotals = itemsOverride ? calculateTotalsForItems(saveItems) : totals;
    const validationErrors = validate(saveItems);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setTimeout(() => document.querySelector('[data-validation-error]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
      return;
    }
    setErrors({});
    if (isPurchaseFashionDocument && !variantReviewConfirmed && documentType !== 'purchase-entry') {
      if (openFinalVariantReview({ openPreview, autoPrint, inventoryConfirmed })) return;
    }
    const vendorAmountMismatch = documentType === 'purchase-entry' && docExtra.vendorInvoiceAmount !== '' && docExtra.vendorInvoiceAmount != null
      ? (() => {
          const vendorAmount = Number(docExtra.vendorInvoiceAmount);
          if (!Number.isFinite(vendorAmount) || vendorAmount < 0) return null;
          const entryAmount = saveTotals.finalTotal || 0;
          const difference = entryAmount - vendorAmount;
          return { vendorAmount, entryAmount, difference, matched: Math.abs(difference) < 0.01 };
        })()
      : null;
    if (!inventoryConfirmed && vendorAmountMismatch && !vendorAmountMismatch.matched) {
      const shouldSave = window.confirm(
        `Vendor invoice amount and entry amount are different.\n\nVendor invoice amount: ${formatCurrency(vendorAmountMismatch.vendorAmount)}\nOur entry amount: ${formatCurrency(vendorAmountMismatch.entryAmount)}\nDifference: ${formatCurrency(Math.abs(vendorAmountMismatch.difference))}\n\nDo you want to save like this?`,
      );
      if (!shouldSave) return;
    }
    if (documentType === 'purchase-entry' && isPurchaseFashionDocument && !inventoryConfirmed) {
      setInventoryConfirmOptions({ openPreview, autoPrint });
      return;
    }
    if (documentType === 'purchase-entry' && isPurchaseFashionDocument && !barcodePrintHandled) {
      const labelRows = purchaseBarcodePrintRows(saveItems);
      if (labelRows.length && window.confirm('Print barcode labels now?\n\nOK = Print labels only and return to entry\nCancel = Save now without barcode printing')) {
        setPurchaseBarcodePrintJob({
          layout: 'thermal80',
          rows: labelRows,
        });
        return;
      }
    }
    if (openPreview && autoPrint) {
      setAutoPrintPreview(false);
      setPreviewRedirectOnClose(true);
      setShowPreview(false);
    }
    setSaveLoading(true);
    try {
      const preparedCustomer = await ensurePurchaseMasters(saveItems, getEffectiveCustomer());
      const rememberedCustomer = await rememberCustomerForPhone(preparedCustomer);
      const payload = buildPayload(rememberedCustomer, saveItems, saveTotals);
      const savedDoc = await saveDocumentPayload(payload);
      if (savedDoc?._id) setSavedInvoiceId(savedDoc._id);

      // Create a Payment record if a method other than Credit is selected
      if (['invoice', 'bill-of-supply', 'pharmacy-bill'].includes(effectiveDocumentType) && selectedPayment && selectedPayment !== 'credit' && savedDoc?._id) {
        const activeSplits = paymentSplits.filter((split) => split.id !== 'credit' && Number(split.amount) > 0);
        const rows = activeSplits.length
          ? activeSplits
          : [{ id: selectedPayment, amount: Number(paymentData.amount) || totals.finalTotal, reference: paymentData.utrNumber || paymentData.chequeNo || '' }];
        let remaining = totals.finalTotal;
        for (const split of rows) {
          const payAmt = Math.min(Number(split.amount) || 0, remaining);
          if (!(payAmt > 0)) continue;
          const m = PAYMENT_METHODS.find((x) => x.id === split.id);
          await api.recordPayment(savedDoc._id, {
            amount:    payAmt,
            date:      paymentData.date || new Date().toISOString().slice(0, 10),
            method:    m?.method ?? 'Cash',
            reference: split.reference || paymentData.utrNumber || paymentData.chequeNo || '',
            notes:     paymentData.notes || '',
          });
          remaining -= payAmt;
          if (remaining <= 0) break;
        }
      }

      if (openPreview && autoPrint) {
        setAutoPrintPreview(false);
        setPreviewRedirectOnClose(true);
        setShowPreview(true);
      } else if (openPreview) {
        if (!autoPrint) setAutoPrintPreview(false);
        setPreviewRedirectOnClose(true);
        setShowPreview(true);
      } else {
        window.location.assign(LIST_ROUTES[documentType] ?? '/billing/invoice');
      }
    } catch (err) {
      setSaveError(err.message || 'Unable to save');
    } finally {
      setSaveLoading(false);
    }
  }

  function handleMobilePaymentSave(event) {
    event?.preventDefault();
    event?.stopPropagation();
    if (saveLoading) return;
    document.activeElement?.blur?.();
    handleSave();
  }

  function handlePrintBill() {
    setSaveError('');
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setTimeout(() => document.querySelector('[data-validation-error]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
      return;
    }

    setErrors({});
    setAutoPrintPreview(true);
    setPreviewRedirectOnClose(false);
    setShowPreview(true);
  }

  function generateEmailPdf() {
    return new Promise((resolve) => {
      emailPdfResolve.current = resolve;
      setEmailPdfMode(true);
    });
  }

  async function handleSendEmail() {
    if (!emailTo.trim()) return;
    setEmailSending(true);
    setEmailResult(null);
    try {
      const rememberedCustomer = await rememberCustomerForPhone(getEffectiveCustomer());
      const payload = buildPayload(rememberedCustomer);
      let docId = savedInvoiceId || invoiceId;
      if (!docId) {
        const saved = await saveDocumentPayload(payload);
        docId = saved._id;
        if (docId) setSavedInvoiceId(docId);
      } else {
        await saveDocumentPayload(payload, docId);
      }
      const pdfBase64 = await generateEmailPdf();
      await api.sendInvoiceEmail(docId, { toEmail: emailTo.trim(), ...(pdfBase64 ? { pdfBase64 } : {}) });
      setEmailResult({ ok: true, msg: `Email with PDF sent to ${emailTo.trim()}` });
    } catch (err) {
      setEmailResult({ ok: false, msg: err.message || 'Failed to send email' });
    } finally {
      setEmailSending(false);
      setEmailPdfMode(false);
    }
  }

  function selectPaymentMethod(id) {
    const next = id;
    setSelectedPayment(next);
    if (next !== 'credit') {
      const defaultAmt = String(Math.max(0, totals.finalTotal));
      setPaymentData((p) => ({ ...p, amount: p.amount || defaultAmt }));
      setAdvanceAmt((a) => a || defaultAmt);
      setPaymentSplits([{ id: next, amount: paymentData.amount || defaultAmt, reference: paymentData.utrNumber || paymentData.chequeNo || '' }]);
      setShowPaymentMethodPopup(true);
    } else {
      setShowPaymentPopup(false);
      setShowPaymentMethodPopup(true);
      setPaymentData((p) => ({ ...p, amount: '', utrNumber: '', chequeNo: '' }));
      setAdvanceAmt('0');
      setPaymentSplits([]);
    }
  }

  function syncPaymentSplitTotal(rows) {
    const total = rows.reduce((sum, split) => sum + (Number(split.amount) || 0), 0);
    const value = total ? String(total) : '';
    setAdvanceAmt(value);
    setPaymentData((prev) => ({ ...prev, amount: value }));
  }

  function updatePaymentSplit(methodId, field, value) {
    setSelectedPayment((prev) => prev || methodId);
    setPaymentSplits((prev) => {
      const exists = prev.some((split) => split.id === methodId);
      const rows = (exists ? prev : [...prev, { id: methodId, amount: '', reference: '' }])
        .map((split) => (split.id === methodId ? { ...split, [field]: value } : split))
        .filter((split) => split.id !== 'credit' && (String(split.amount || '').trim() !== '' || String(split.reference || '').trim() !== ''));
      syncPaymentSplitTotal(rows);
      return rows;
    });
  }

  function fillPaymentSplit(methodId) {
    const paidByOthers = paymentSplits.reduce((sum, split) => split.id === methodId ? sum : sum + (Number(split.amount) || 0), 0);
    updatePaymentSplit(methodId, 'amount', String(Math.max(0, totals.finalTotal - paidByOthers)));
  }

  function openMultiplePayment() {
    const defaultAmt = String(Math.max(0, totals.finalTotal));
    if (!paymentSplits.length && selectedPayment && selectedPayment !== 'credit') {
      setPaymentSplits([{ id: selectedPayment, amount: paymentData.amount || defaultAmt, reference: paymentData.utrNumber || paymentData.chequeNo || '' }]);
    }
    setShowPaymentMethodPopup(false);
    setShowPaymentPopup(true);
  }

  function currentPaymentMethodLabel(splits = paymentSplits) {
    const splitLabels = (Array.isArray(splits) ? splits : [])
      .filter((split) => split.id !== 'credit' && Number(split.amount) > 0)
      .map((split) => PAYMENT_METHODS.find((m) => m.id === split.id)?.label || split.id)
      .filter(Boolean);
    const uniqueLabels = [...new Set(splitLabels)];
    if (uniqueLabels.length > 0) return uniqueLabels.join(' + ');
    return selectedPayment ? (PAYMENT_METHODS.find((m) => m.id === selectedPayment)?.label ?? '') : '';
  }

  const selectedPaymentMethod = PAYMENT_METHODS.find((method) => method.id === selectedPayment);
  const paymentMethodPopup = showPaymentMethodPopup && selectedPaymentMethod ? (
    <div
      className="billing-payment-popup-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setShowPaymentMethodPopup(false);
      }}
    >
      <div className="billing-payment-popup" role="dialog" aria-modal="true" aria-label={`${selectedPaymentMethod.label} payment`}>
        <div className="billing-payment-popup-header">
          <div>
            <strong>{selectedPaymentMethod.label} Payment</strong>
            <span>Total {formatCurrency(totals.finalTotal)}</span>
          </div>
          <button type="button" onClick={() => setShowPaymentMethodPopup(false)} aria-label="Close payment popup">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3 p-4">
          {selectedPayment !== 'credit' && (
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">Amount</span>
              <input type="number" min="0" className={cx.input} value={paymentData.amount} onChange={(e) => updateSinglePayment('amount', e.target.value)} />
            </label>
          )}
          {selectedPayment === 'upi' && (
            <>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">UPI ID</span>
                <input className={cx.input} placeholder="name@upi" value={paymentData.upiId} onChange={(e) => updateSinglePayment('upiId', e.target.value)} />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">UPI Ref / UTR</span>
                <input className={cx.input} placeholder="UPI Ref / UTR" value={paymentData.utrNumber} onChange={(e) => updateSinglePayment('utrNumber', e.target.value)} />
              </label>
            </>
          )}
          {selectedPayment === 'card' && (
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">Card Transaction No.</span>
              <input className={cx.input} placeholder="Transaction No." value={paymentData.utrNumber} onChange={(e) => updateSinglePayment('utrNumber', e.target.value)} />
            </label>
          )}
          {selectedPayment === 'bank' && (
            <>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">Bank Name</span>
                <input className={cx.input} placeholder="Bank name" value={paymentData.bankName} onChange={(e) => updateSinglePayment('bankName', e.target.value)} />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">UTR / Transaction No.</span>
                <input className={cx.input} placeholder="UTR / Transaction No." value={paymentData.utrNumber} onChange={(e) => updateSinglePayment('utrNumber', e.target.value)} />
              </label>
            </>
          )}
          {selectedPayment === 'credit' && (
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">Credit Days</span>
              <input type="number" min="0" className={cx.input} value={paymentData.creditDays} onChange={(e) => updateSinglePayment('creditDays', e.target.value)} />
            </label>
          )}
        </div>

        <div className="billing-payment-popup-footer">
          <div>
            <span>{selectedPayment === 'credit' ? 'Credit Days' : 'Received'}</span>
            <strong>{selectedPayment === 'credit' ? `${paymentData.creditDays || 0} days` : formatCurrency(Number(paymentData.amount) || 0)}</strong>
          </div>
          {selectedPayment !== 'credit' && (
            <div>
              <span>Total Balance</span>
              <strong>{formatCurrency(customerBalanceAfterInvoice)}</strong>
            </div>
          )}
          <button type="button" onClick={() => setShowPaymentMethodPopup(false)}>Done</button>
        </div>
      </div>
    </div>
  ) : null;

  const filteredCustomers = customers.filter((c) =>
    !customerQuery ||
    (c.name || '').toLowerCase().includes(customerQuery.toLowerCase()) ||
    (c.gstin || '').toLowerCase().includes(customerQuery.toLowerCase()) ||
    (c.phone || '').toLowerCase().includes(customerQuery.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(customerQuery.toLowerCase()),
  );
  const visibleCustomers = filteredCustomers.slice(0, 8);

  useEffect(() => {
    if (!showCustomerDrop) {
      setHighlightedCustomerIndex(-1);
      return;
    }
    setHighlightedCustomerIndex(visibleCustomers.length ? 0 : -1);
  }, [customerQuery, showCustomerDrop, visibleCustomers.length]);

  useEffect(() => {
    if (!showCustomerDrop || highlightedCustomerIndex < 0) return;
    customerOptionRefs.current[highlightedCustomerIndex]?.scrollIntoView({ block: 'nearest' });
  }, [showCustomerDrop, highlightedCustomerIndex]);

  const gstinValid = customer.gstin.length === 15;

  const phoneDigits = customer.phone.replace(/\D/g, '');
  const matchingByPhone = phoneDigits.length >= 3
    ? customers.filter((c) => (c.phone || '').replace(/\D/g, '').includes(phoneDigits))
    : [];
  const balanceCustomerName = String(customer.name || '').trim();
  const balanceCustomerPhone = String(customer.phone || '').trim();
  const balanceCustomerGstin = String(customer.gstin || '').trim();

  useEffect(() => {
    if (documentType !== 'invoice') return;
    const digits = phoneDigits.slice(-10);
    if (digits.length < 10) return;
    const match = customers.find((c) => (c.phone || '').replace(/\D/g, '').slice(-10) === digits);
    if (match && ['name', 'gstin', 'email', 'address', 'city', 'state', 'pincode'].some((field) => (match[field] || '') !== (customer[field] || ''))) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      selectCustomer(match);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phoneDigits, customers, documentType]);

  useEffect(() => {
    if (documentType !== 'invoice') return undefined;
    const digits = phoneDigits.slice(-10);
    if (digits.length < 10) return undefined;
    if (customers.some((c) => phoneKey(c.phone) === digits)) return undefined;

    let active = true;
    async function findCustomerByPhone() {
      try {
        const result = await api.listCustomers(digits);
        if (!active) return;
        const rows = Array.isArray(result) ? result : result?.data;
        const match = (Array.isArray(rows) ? rows : [])
          .map(normalizeCustomer)
          .find((c) => phoneKey(c.phone) === digits);
        if (!match) return;
        setCustomers((prev) => prev.some((c) => phoneKey(c.phone) === digits) ? prev : [...prev, match]);
        if (!customer.name.trim()) selectCustomer(match);
      } catch (err) {
        console.warn('Unable to find customer by phone', err);
      }
    }
    findCustomerByPhone();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phoneDigits, documentType]);

  useEffect(() => {
    if (!['invoice', 'bill-of-supply', 'pharmacy-bill'].includes(effectiveDocumentType)) return undefined;
    if (!balanceCustomerName) {
      setDocExtra((prev) => ({ ...prev, oldBalance: 0, newBalance: currentInvoiceBalance }));
      return undefined;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        const result = await api.listOutstanding({ customer: balanceCustomerName, limit: 1000 });
        if (!active) return;
        const rows = Array.isArray(result?.data) ? result.data : [];
        const normalizedPhone = balanceCustomerPhone.replace(/\D/g, '').slice(-10);
        const oldBalance = rows
          .filter((row) => String(row.id || row._id || '') !== String(invoiceId || ''))
          .filter((row) => {
            if (!normalizedPhone && !balanceCustomerGstin) return true;
            const rowPhone = String(row.customerPhone || '').replace(/\D/g, '').slice(-10);
            return (normalizedPhone && rowPhone === normalizedPhone) || !rowPhone;
          })
          .reduce((sum, row) => sum + (Number(row.balance) || 0), 0);
        const roundedOldBalance = Math.round(oldBalance * 100) / 100;
        const currentBalance = Math.max(0, (Number(totals.finalTotal) || 0) - Math.max(0, Number(paymentSplitTotal || advanceAmt) || 0));
        setDocExtra((prev) => ({
          ...prev,
          oldBalance: roundedOldBalance,
          newBalance: Math.round((roundedOldBalance + currentBalance) * 100) / 100,
        }));
      } catch (err) {
        console.warn('Unable to load customer old balance', err);
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [effectiveDocumentType, balanceCustomerName, balanceCustomerPhone, balanceCustomerGstin, invoiceId, totals.finalTotal, currentInvoiceBalance, paymentSplitTotal, advanceAmt]);

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const customerData = partyKind === 'Vendor'
          ? await Promise.allSettled([api.listVendors(), api.listCustomers()])
          : await api.listCustomers();
        if (active) {
          if (partyKind === 'Vendor') {
            const [vendorResult, customerResult] = customerData;
            const vendorData = vendorResult.status === 'fulfilled' ? vendorResult.value : null;
            const legacyCustomerData = customerResult.status === 'fulfilled' ? customerResult.value : null;
            const vendorRows = Array.isArray(vendorData) ? vendorData : vendorData?.vendors || vendorData?.data;
            const legacyRows = Array.isArray(legacyCustomerData) ? legacyCustomerData : legacyCustomerData?.data;
            setCustomers(mergeParties(Array.isArray(vendorRows) ? vendorRows : [], Array.isArray(legacyRows) ? legacyRows : []));
          } else {
            const rows = Array.isArray(customerData) ? customerData : customerData?.data;
            setCustomers(Array.isArray(rows) ? rows.map(normalizeCustomer) : []);
          }
        }
      } catch (err) {
        console.warn('Unable to load customers', err);
        if (active) setCustomers([]);
      }

      try {
        const biz = await api.getSettings();
        if (active && !invoiceId) {
          setBizSettings(biz);
        }
      } catch (err) {
        console.warn('Unable to load business settings', err);
      }

      try {
        const rows = await api.invProductSizes();
        if (active) setFashionSizeRows(Array.isArray(rows) ? rows : []);
      } catch (err) {
        console.warn('Unable to load product sizes', err);
        if (active) setFashionSizeRows([]);
      }

      try {
        const [salesData, invData, brandData, productBrandData] = await Promise.allSettled([
          api.listProducts(),
          api.invListProducts(),
          api.invListBrands({ limit: 1000 }),
          api.invProductBrands(),
        ]);
        const salesRows = salesData.status === 'fulfilled'
          ? (Array.isArray(salesData.value) ? salesData.value : salesData.value?.data)
          : [];
        const invRows = invData.status === 'fulfilled'
          ? (Array.isArray(invData.value) ? invData.value : invData.value?.data)
          : [];
        const brandRows = brandData.status === 'fulfilled'
          ? (Array.isArray(brandData.value) ? brandData.value : brandData.value?.data)
          : [];
        const productBrandRows = productBrandData.status === 'fulfilled' ? productBrandData.value : [];
        if (active) {
          setMasterProductBrands(uniqueTextParts([
            ...(Array.isArray(brandRows) ? brandRows : []),
            ...(Array.isArray(productBrandRows) ? productBrandRows : []),
          ].map((row) => row?.name ?? row?.label ?? row)));
        }
        const sales = Array.isArray(salesRows) ? salesRows.map(normalizeProduct).filter((p) => p.description) : [];
        const inv   = Array.isArray(invRows)   ? invRows.map(normalizeProduct).filter((p) => p.description)   : [];
        const merged = [...sales];
        inv.forEach((product) => {
          const index = merged.findIndex((salesProduct) => (
            (salesProduct.code && product.code && salesProduct.code === product.code)
            || salesProduct.description === product.description
          ));
          if (index >= 0) {
            merged[index] = {
              ...merged[index],
              ...product,
              variants: hasProductVariants(product) ? product.variants : (merged[index].variants || []),
              productDescription: product.productDescription || merged[index].productDescription || '',
              hsn: product.hsn ?? merged[index].hsn ?? '',
            };
          } else {
            merged.push({ ...product, hsn: product.hsn ?? '' });
          }
        });
        if (active) setProducts(merged);
      } catch (err) {
        console.warn('Unable to load products', err);
        if (active) {
          setProducts([]);
          setMasterProductBrands([]);
        }
      }

      if (documentType === 'purchase-entry') {
        try {
          const poData = await api.listInvoices({ documentType: 'purchase-order', limit: 500 });
          if (active) setPurchaseOrders(Array.isArray(poData.data) ? poData.data : []);
        } catch (err) {
          console.warn('Unable to load purchase orders', err);
          if (active) setPurchaseOrders([]);
        }
      }
    }

    loadData();
    return () => { active = false; };
  }, [documentType, partyKind]);

  useEffect(() => {
    if (!invoiceId) {
      async function loadNextNumber() {
        try {
          let next;
          if (documentType === 'sales-return')         next = await api.getSalesReturnNextNumber();
          else if (documentType === 'supplier-return') next = await api.getSupplierReturnNextNumber();
          else if (documentType === 'credit-note')     next = await api.getCreditNoteNextNumber();
          else if (documentType === 'debit-note')       next = await api.getDebitNoteNextNumber();
          else if (documentType === 'delivery-challan') next = await api.getChallanNextNumber();
          else if (documentType === 'e-invoice')        next = await api.getEInvoiceNextNumber();
          else if (documentType === 'e-way-bill')       next = await api.getEWayBillNextNumber();
          else                                          next = await api.getNextNumber(config.prefix);
          if (next?.number) updateMeta('number', next.number);
        } catch (err) {
          console.warn('Unable to load next number', err);
        }
      }
      loadNextNumber();
      return;
    }

    function hydrateInvoice(invoice) {
      if (documentType === 'invoice') {
        setBillType(invoice.documentType === 'bill-of-supply' ? 'without-gst' : 'with-gst');
      }
      setCustomer(normalizeCustomer(invoice.customer || {}));
      setDocMeta({
        number: invoice.number || `${config.prefix}-0001`,
        date: invoice.meta?.date || defaultInvoiceDate,
        dueDate: invoice.meta?.dueDate || addDaysInput(invoice.meta?.date || defaultInvoiceDate, invoice.meta?.paymentTerms || defaultPaymentTerms),
        poRef: invoice.meta?.poRef || '',
        placeOfSupply: invoice.meta?.placeOfSupply || BUSINESS_STATE,
        invoiceType: invoice.meta?.invoiceType || 'regular',
        rcm: invoice.meta?.rcm || false,
        paymentTerms: invoice.meta?.paymentTerms || defaultPaymentTerms,
      });
      setSupplyType(invoice.supplyType || 'intrastate');
      setItems((Array.isArray(invoice.items) ? invoice.items : []).map(normalizeInvoiceLineItem));
      setCharges(Array.isArray(invoice.charges) ? invoice.charges : []);
      setAddDiscount(invoice.additionalDiscount ?? { type: 'percent', value: '' });
      setTds(invoice.tds ?? { enabled: false, section: '194C', rate: 2 });
      setTcs(invoice.tcs ?? { enabled: false, rate: 1 });
      setAdvanceAmt(invoice.advanceReceived != null ? String(invoice.advanceReceived) : '');
      setPaymentSplits(Array.isArray(invoice.paymentSplits) ? invoice.paymentSplits.map((split) => ({
        id: split.methodId || PAYMENT_METHODS.find((method) => method.label === split.method)?.id || 'cash',
        amount: split.amount === 0 ? '' : String(split.amount || ''),
        reference: split.reference || '',
      })) : []);
      setManualQuotationTotal(invoice.totals?.manualTotalOverride ? String(invoice.totals.finalTotal ?? invoice.totals.manualTotal ?? '') : '');
      setNotes(invoice.notes || '');
      setInternalNotes(invoice.internalNotes || '');
      setTerms(invoice.terms || '');
      setCustomFields(Array.isArray(invoice.customFields) ? invoice.customFields : []);
      setRecurring(invoice.recurring ?? { enabled: false, frequency: 'monthly', endAfter: '', endDate: '' });
      setSameShipping(invoice.shipping?.sameAsBilling !== false);
      setShipping({
        address: invoice.shipping?.address || '',
        city: invoice.shipping?.city || '',
        state: invoice.shipping?.state || BUSINESS_STATE,
        pincode: invoice.shipping?.pincode || '',
      });
      setDocExtra({
        validTill: '', expectedDelivery: '', deliveryAddress: '',
        originalInvoiceNo: '', originalInvoiceDate: '', reason: '',
        costCenter: '',
        linkedPurchaseOrderId: '', linkedPurchaseOrderNo: '', vendorInvoiceNo: '', vendorInvoiceAmount: '', purchaseOrderTotal: '',
        vehicleNumber: '', driverName: '', transporter: '',
        transporterId: '', distanceKm: '', ewbSupplyType: 'outward',
        irnNumber: '', ackNumber: '', ackDate: '',
        ...(invoice.extra ?? {}),
      });
    }

    async function loadInvoice() {
      setInvoiceLoading(true);
      setLoadError('');
      try {
        let invoice;
        if (documentType === 'credit-note')           invoice = await api.getCreditNote(invoiceId);
        else if (documentType === 'debit-note')       invoice = await api.getDebitNote(invoiceId);
        else if (documentType === 'delivery-challan') invoice = await api.getChallan(invoiceId);
        else if (documentType === 'e-invoice')        invoice = await api.getEInvoice(invoiceId);
        else if (documentType === 'e-way-bill')       invoice = await api.getEWayBill(invoiceId);
        else                                          invoice = await api.getInvoice(invoiceId);
        hydrateInvoice(invoice);
        const docBizSettings = invoice.businessSettings || invoice.businessSettingsSnapshot;
        if (docBizSettings) {
          setBizSettings(docBizSettings);
        } else if (invoice.branch) {
          const branchSettings = await api.getSettings({ branch: invoice.branch });
          setBizSettings(branchSettings);
        }
      } catch (err) {
        setLoadError(err.message || 'Unable to load document');
      } finally {
        setInvoiceLoading(false);
      }
    }

    loadInvoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId]);

  // Refresh invoice number when bill type switches on a new document
  useEffect(() => {
    if (invoiceId) return;
    api.getNextNumber(config.prefix)
      .then((res) => { if (res?.number) updateMeta('number', res.number); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.prefix]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  // Stash the latest values in a ref so the listener (registered once) always
  // sees fresh state/handlers without needing to re-bind on every keystroke.
  const shortcutState = useRef(null);
  const scannerState = useRef({ value: '', startedAt: 0, lastAt: 0 });
  useEffect(() => {
    shortcutState.current = {
      showPreview,
      previewRedirectOnClose,
      saveLoading,
      handleSave,
      handlePrintBill,
      addItem,
      addProductToBill,
      addQuickItem,
      resolveProductByScan,
      products,
      salesItemFilter,
      keyboardMode,
      focusPartyField,
      showItemTypeControls,
    };
  });

  useEffect(() => {
    function resetScanner() {
      scannerState.current = { value: '', startedAt: 0, lastAt: 0 };
    }

    function captureScannerInput(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return false;

      const now = Date.now();
      const scanner = scannerState.current;
      const key = e.key;
      const isSubmitKey = key === 'Enter' || key === 'Tab';

      if (isSubmitKey) {
        const value = scanner.value.trim();
        const duration = scanner.lastAt && scanner.startedAt ? scanner.lastAt - scanner.startedAt : 0;
        const averageInterval = value.length > 1 ? duration / (value.length - 1) : duration;
        const looksLikeScannerInput = value.length >= 4 && (averageInterval <= 60 || (value.length >= 8 && duration <= 900));
        resetScanner();
        if (!looksLikeScannerInput) return false;

        e.preventDefault();
        e.stopPropagation();
        const { addProductToBill, addQuickItem, resolveProductByScan, products, salesItemFilter } = shortcutState.current;
        const scanProducts = products.filter((product) => productMatchesItemFilter(product, salesItemFilter));
        const localScanMatch = isLikelyBarcodeScan(value) ? findProductByScan(scanProducts, value) : null;
        if (!localScanMatch && isLikelyBarcodeScan(value)) {
          if (['purchase-entry', 'purchase-order'].includes(documentType)) {
            addQuickItem(value);
          } else {
            // Keep the existing barcode workflow for sales documents.
            openAddProductForBarcode(value);
          }
        } else {
          (localScanMatch ? Promise.resolve(localScanMatch) : resolveProductByScan(value, salesItemFilter)).then((product) => {
            if (product) addProductToBill(product);
          });
        }
        return true;
      }

      if (key.length !== 1) {
        if (now - scanner.lastAt > 120) resetScanner();
        return false;
      }

      if (now - scanner.lastAt > 120) {
        scanner.value = '';
        scanner.startedAt = now;
      } else if (!scanner.startedAt) {
        scanner.startedAt = now;
      }

      scanner.value += key;
      scanner.lastAt = now;

      if (scanner.value.length > 64) resetScanner();
      return false;
    }

    function handleKeyDown(e) {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        if (!shortcutState.current?.saveLoading) handlePrintBill();
        return;
      }

      if (!shortcutState.current?.keyboardMode) return;
      const isAddPartyKey = (e.key === '+' || e.code === 'NumpadAdd') && !e.ctrlKey && !e.metaKey && !e.altKey;
      if (isAddPartyKey) {
        const tagName = e.target?.tagName;
        const isTypingTarget = e.target?.isContentEditable || tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT';
        if (!isTypingTarget || e.target?.dataset?.fkey === 'party') {
          e.preventDefault();
          shortcutState.current.focusPartyField();
        }
        return;
      }
      if (captureScannerInput(e)) return;

      const { showPreview, previewRedirectOnClose, saveLoading, handleSave, handlePrintBill, addItem, showItemTypeControls } = shortcutState.current;

      if (e.key === 'Escape') {
        if (showPreview) {
          setShowPreview(false);
          if (previewRedirectOnClose) {
            window.location.assign(LIST_ROUTES[documentType] ?? '/billing/invoice');
          }
        }
        return;
      }

      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (!saveLoading) handleSave();
        return;
      }

      if (mod && e.key === 'Enter') {
        e.preventDefault();
        if (!saveLoading) handleSave();
        return;
      }

      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        addItem();
        return;
      }

      if (e.altKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        window.location.assign(currentListRoute);
        return;
      }

      // Function-key shortcuts (no modifier) — actions vary by documentType
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === 'F2')  { e.preventDefault(); if (!saveLoading) handleSave(); return; }
        if (e.key === 'F3')  { e.preventDefault(); setAutoPrintPreview(false); setShowPreview(true); return; }
        if (e.key === 'F4')  { e.preventDefault(); if (!saveLoading) handlePrintBill(); return; }
        if (e.key === 'F6')  { e.preventDefault(); document.querySelector('[data-fkey="product"]')?.focus(); return; }
        if (e.key === 'F9')  { e.preventDefault(); setShowCalculator((v) => !v); return; }
        if (e.key === 'F10') { e.preventDefault(); window.location.assign('/business-settings'); return; }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentListRoute, keyboardMode, saveLoading]);

  const displayItems = useMemo(
    () => enrichItemsWithProductDescriptions(effectiveItems, products),
    [effectiveItems, products],
  );

  const inlineProductCategories = useMemo(
    () => ['All Categories', ...new Set(products.map((product) => product.category).filter(Boolean))],
    [products],
  );
  const inlineProductBrands = useMemo(
    () => uniqueTextParts([
      ...masterProductBrands,
      ...products.flatMap((product) => [
        product.brand,
        ...(product.variants || []).map((variant) => variant.other),
      ]),
      ...manualProductBrands,
    ]),
    [products, masterProductBrands, manualProductBrands],
  );
  const fashionSizeBlocklist = useMemo(
    () => new Set(products.flatMap((product) => [
      product.description,
      product.name,
      product.productName,
      product.code,
      product.sku,
      product.barcode,
    ]).map((value) => String(value || '').trim().toLowerCase()).filter(Boolean)),
    [products],
  );
  function isAllowedFashionSize(value, extraBlocked = []) {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) return false;
    if (fashionSizeBlocklist.has(normalized)) return false;
    return !extraBlocked.some((item) => String(item || '').trim().toLowerCase() === normalized);
  }
  const inlineProductSizes = useMemo(
    () => uniqueTextParts(products.flatMap((product) => [
        product.size,
        ...(product.variants || []).map((variant) => variant.size),
      ])).filter((size) => isAllowedFashionSize(size)),
    [products, fashionSizeBlocklist],
  );
  const inlineProductColours = useMemo(
    () => [...new Set(products.map((product) => product.colour).filter(Boolean))],
    [products],
  );
  const inlineProductTypes = useMemo(
    () => [...new Set(products.map((product) => product.type).filter(Boolean))],
    [products],
  );
  const receivedAmount = Number(paymentData.amount) || 0;
  const changeAmount = Math.max(0, receivedAmount - (totals.finalTotal || 0));
  const posDate = docMeta.date ? docMeta.date.split('-').reverse().join('-') : '';
  const posTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const mobileProductResults = useMemo(() => {
    const query = normalizeScanText(mobileProductQuery);
    const rows = productsOfType(salesItemFilter);
    if (!query) return rows.slice(0, 18);
    return rows.filter((product) => {
      const haystack = [
        product.description,
        product.code,
        product.barcode,
        product.hsn,
        product.brand,
        product.category,
        product.serviceType,
        product.technician,
        product.productType,
        ...productBundleSearchTerms(product),
        ...(product.variants || []).map(variantDisplayName),
      ].map(normalizeScanText).join(' ');
      return haystack.includes(query);
    }).slice(0, 18);
  }, [mobileProductQuery, products, salesItemFilter]);

  function focusMobileProductSearch() {
    window.setTimeout(() => mobileProductInputRef.current?.focus(), 60);
  }

  function addMobileProduct(product) {
    addProductToBill(normalizeProduct(product));
    setMobileProductQuery('');
    setMobileScreen('items');
    focusMobileProductSearch();
  }

  async function submitMobileProductEntry(rawQuery = mobileProductQuery) {
    const query = String(rawQuery || '').trim();
    const chosen = mobileProductResults[0];
    if (chosen) {
      addMobileProduct(chosen);
      return;
    }
    if (!query) return;
    const scanned = await resolveProductByScan(query, salesItemFilter);
    if (scanned) {
      addMobileProduct(scanned);
      return;
    }
    if (canOpenProductCreationFromQuickEntry && isLikelyBarcodeScan(query)) {
      setMobileProductQuery('');
      openAddProductForBarcode(query);
      return;
    }
    setItems((prev) => [...prev, { id: nextItemId.current++, productId: null, productCode: '', itemType: salesItemFilter === 'Service' ? 'Service' : 'Product', productType: 'Standard', description: query, itemDescription: '', hsn: '', qty: 1, unit: 'Nos', rate: 0, discount: 0, discountType: 'percent', gstRate: '' }]);
    setMobileProductQuery('');
    focusMobileProductSearch();
  }

  async function handleMobileProductSubmit(event) {
    event?.preventDefault();
    event?.stopPropagation();
    await submitMobileProductEntry(mobileProductInputRef.current?.value ?? mobileProductQuery);
  }

  async function handleMobileProductKeyDown(event) {
    if (!['Enter', 'Tab', 'NumpadEnter'].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    await submitMobileProductEntry(event.currentTarget.value);
  }

  const quickMatchedProduct = useMemo(() => {
    if (!productSearch) return null;
    const rows = productsOfType(salesItemFilter);
    return findProductByExactEntry(rows, productSearch) || findProductByScan(rows, productSearch);
  }, [productSearch, products, salesItemFilter]);
  const quickProductVariants = quickMatchedProduct?.productType === 'Bundle' ? [] : (quickMatchedProduct?.variants || []);
  const allFashionSizeOptions = useMemo(() => uniqueTextParts([
    ...inlineProductSizes,
    ...fashionSizeRows.map((row) => row?.name ?? row?.label ?? row),
    ...SIZE_PRESETS,
  ]).filter((size) => isAllowedFashionSize(size)), [fashionSizeRows, inlineProductSizes, fashionSizeBlocklist]);
  const allFashionMaterialOptions = FASHION_MATERIALS;
  const quickVariantLabel = isElectronicsRetail ? 'Model' : variantColumnLabel(quickMatchedProduct);
  const quickVariantPlaceholder = quickMatchedProduct?.productType === 'Bundle' ? 'Kit' : quickProductVariants.length ? 'Select' : '-';
  const quickProductLabel = 'Product / Service';
  const quickProductPlaceholder = isElectronicsRetail
    ? 'Scan / Type product, service, model, serial or code'
    : 'Scan / Type product or service name';
  const showItemTypeControls = true;
  const useSalesReferenceUi = false;
  const posTaxableAmount = Math.max(0, totals.subtotal - totals.discount - totals.addDiscAmt);
  const posHalfGst = totals.totalGst / 2;

  useEffect(() => {
    if (!brandPicker) return;
    window.setTimeout(() => {
      brandPickerSearchRef.current?.focus();
      brandPickerSearchRef.current?.select?.();
    }, 0);
  }, [brandPicker?.type, brandPicker?.mode, brandPicker?.itemId]);

  useEffect(() => {
    if (!brandPicker) return;
    const option = document.querySelector(`[data-brand-picker-option="${brandPicker.highlighted || 0}"]`);
    option?.scrollIntoView({ block: 'nearest' });
  }, [brandPicker?.highlighted, brandPicker]);

  useEffect(() => {
    if (!useSalesReferenceUi) return;
    setCustomer((prev) => (prev.name ? prev : { ...prev, name: 'Walk-in Customer' }));
  }, [useSalesReferenceUi]);

  if (invoiceLoading) {
    return (
      <div className="p-4 md:p-7">
        <div className="rounded-lg border border-[#dfe7f1] bg-white p-6 text-sm text-[#374151]">Loading invoice…</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-4 md:p-7">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">{loadError}</div>
      </div>
    );
  }

  if (useSalesReferenceUi) {
    return (
      <div className="document-print-host billing-v2 w-full p-4 md:p-5">
        {showCalculator && <CalculatorPopup onClose={() => setShowCalculator(false)} />}

        <section className="sales-reference-shell flex min-h-[calc(100vh-150px)] w-full max-w-none flex-col overflow-hidden rounded-xl border border-[#dbe4ef] bg-[#f8fbff] shadow-sm">
          <div className="sales-reference-actionbar flex flex-col gap-3 border-b border-[#e5edf7] bg-white px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3 pr-5">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <ShoppingCart size={24} />
                </span>
                <div>
                  <h1 className="m-0 text-[20px] font-bold uppercase leading-tight text-[#071936]">Sales / POS</h1>
                  <p className="m-0 mt-0.5 text-[13px] font-semibold text-[#536173]">Electronics and technology billing</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setNumberEditing(true)}
                className="inline-flex h-12 items-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-4 text-[14px] font-bold text-[#0f2757] shadow-sm"
                title="Edit bill number"
              >
                <Receipt size={17} className="text-blue-600" />
                Bill #{String(docMeta.number || '0001').replace(/\D/g, '').padStart(6, '0')}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => window.location.assign(LIST_ROUTES[documentType] ?? '/billing/invoice')}
                className="inline-flex h-12 items-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-5 text-[14px] font-bold text-[#0f2757] shadow-sm"
                title="Open list page (Alt+V)"
              >
                View List <span className="rounded bg-[#eef4ff] px-2 py-1 text-[11px] text-blue-700">Alt+V</span>
              </button>
              <button
                type="button"
                onClick={() => { setAutoPrintPreview(false); setShowPreview(true); }}
                className="inline-flex h-12 items-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-5 text-[14px] font-bold text-[#0f2757] shadow-sm"
                title="Preview bill (F3)"
              >
                <Eye size={17} />
                Preview <span className="rounded bg-[#eef4ff] px-2 py-1 text-[11px] text-blue-700">F3</span>
              </button>
              <button
                type="button"
                onClick={() => handleSave()}
                disabled={saveLoading}
                className="inline-flex h-12 items-center gap-2 rounded-md border border-blue-600 bg-blue-600 px-5 text-[14px] font-bold text-white shadow-sm disabled:opacity-60"
                title="Save Bill (F2)"
              >
                <Send size={17} />
                {saveLoading ? 'Saving...' : 'Save Bill'} <span className="rounded bg-blue-500 px-2 py-1 text-[11px] text-white">F2</span>
              </button>
            </div>
          </div>

          <div className="sales-reference-customer-panel bg-white px-4 py-4">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_1fr_1fr]">
              <section className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-[13px] font-semibold uppercase text-[#111827]">
                  Customer <span className="text-red-500">*</span>
                  <button type="button" onClick={focusPartyField} className="inline-flex h-6 w-7 items-center justify-center rounded border border-blue-200 bg-blue-50 text-[14px] font-semibold text-blue-600">+</button>
                </label>
                <div className="relative">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                  <input
                    data-fkey="party"
                    className="h-10 w-full rounded-md border border-[#dbe4ef] bg-white pl-8 pr-10 text-[13px] text-[#111827] outline-none focus:border-blue-500"
                    placeholder="Type name / phone / GSTIN and press Enter"
                    value={getEffectiveCustomer().name}
                    onChange={(e) => {
                      updateCustomer('name', e.target.value);
                      updateNewCustomer('name', e.target.value);
                      clearError('customerName');
                    }}
                  />
                  <button type="button" onClick={focusPartyField} className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded border border-[#dbe4ef] bg-white text-[14px] font-semibold text-blue-600">+</button>
                </div>
                <div className="mt-1 flex flex-col gap-1 text-[12px] text-[#536173]">
                  <div>Phone: {getEffectiveCustomer().phone || '-'} &nbsp;&nbsp; Email: {getEffectiveCustomer().email || '-'}</div>
                  <div>GSTIN: {getEffectiveCustomer().gstin || '-'}</div>
                  <div>State: {getEffectiveCustomer().state || BUSINESS_STATE}</div>
                </div>
              </section>

              <section className="flex flex-col gap-2">
                <label className="text-[13px] font-semibold uppercase text-[#111827]">Billing Address</label>
                <div className="relative">
                  <textarea
                    className="min-h-[92px] w-full resize-y rounded-lg border border-dashed border-[#dbe4ef] bg-[#fafbfe] px-3 py-3 pr-9 text-[13px] text-[#374151] outline-none focus:border-blue-500"
                    placeholder="Click to add billing address"
                    value={getEffectiveCustomer().address || ''}
                    onChange={(e) => updateCustomer('address', e.target.value)}
                  />
                  <Pencil size={14} className="pointer-events-none absolute right-3 top-3 text-[#94a3b8]" />
                </div>
              </section>

              <section className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[13px] font-semibold uppercase text-[#111827]">Shipping Address</label>
                  <label className="flex items-center gap-1.5 text-[11px] font-medium uppercase text-[#536173]">
                    <input type="checkbox" className="h-3.5 w-3.5 accent-blue-600" checked={sameShipping} onChange={(e) => setSameShipping(e.target.checked)} />
                    Same as billing
                  </label>
                </div>
                {sameShipping ? (
                  <div className="flex min-h-[92px] items-center rounded-lg border border-dashed border-[#dbe4ef] bg-[#fafbfe] px-3 text-[13px] text-[#94a3b8]">Same as billing address</div>
                ) : (
                  <textarea
                    className="min-h-[92px] w-full resize-y rounded-lg border border-dashed border-[#dbe4ef] bg-[#fafbfe] px-3 py-3 text-[13px] text-[#374151] outline-none focus:border-blue-500"
                    placeholder="Click to add shipping address"
                    value={shipping.address}
                    onChange={(e) => setShipping((p) => ({ ...p, address: e.target.value }))}
                  />
                )}
              </section>
            </div>
          </div>
          <div className="sales-common-workspace grid grid-cols-1 gap-4 bg-[#f8fbff] p-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="sales-reference-card bg-white p-4 shadow-sm">
              <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="w-full max-w-[220px]">
                  <label className="mb-1.5 block text-[12px] font-semibold uppercase text-[#0f172a]">Item Type</label>
                  <SelectDropdown
                    value={salesItemFilter}
                    onChange={setQuickItemType}
                    buttonClassName="!h-10 !rounded-md !border-[#dbe4ef] !bg-white !px-3 !text-[13px]"
                    options={SALES_ITEM_FILTER_OPTIONS}
                  />
                </div>
                <div className="billing-bulk-controls">
                  <div className="billing-bulk-field billing-discount-field">
                    <label htmlFor="overall-discount">Discount</label>
                    <div className="billing-discount-control">
                      <input
                        id="overall-discount"
                        data-fkey="overall-discount"
                        className="billing-bulk-input"
                        type="number"
                        min="0"
                        max={addDiscount.type === 'percent' ? '100' : undefined}
                        value={addDiscount.value}
                        onChange={(e) => setAddDiscount((prev) => ({ ...prev, value: e.target.value }))}
                        placeholder="0"
                      />
                      <SelectDropdown
                        value={addDiscount.type || 'percent'}
                        onChange={(v) => setAddDiscount((prev) => ({ ...prev, type: v }))}
                        buttonClassName="billing-discount-type"
                        options={[{ value: 'percent', label: '%' }, { value: 'amount', label: 'Amt' }]}
                      />
                    </div>
                  </div>
                  {config.showGst && (
                    <>
                      <div className="billing-bulk-field billing-tax-field">
                        <label htmlFor="bulk-gst-rate">Tax</label>
                        <input
                          id="bulk-gst-rate"
                          className="billing-bulk-input"
                          type="number"
                          min="0"
                          value={bulkGstRate}
                          onChange={(e) => setBulkGstRate(e.target.value)}
                          placeholder="%"
                        />
                      </div>
                      <button
                        type="button"
                        className="billing-apply-all-btn"
                        onClick={applyQuickValuesToAllItems}
                      >
                        Apply to all items
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="sales-product-entry-grid grid grid-cols-[minmax(190px,1fr)_minmax(170px,.9fr)_86px_150px_64px_82px_82px_150px_74px_52px] items-end gap-3">
                <div className="flex flex-col gap-2">
                  <label className="text-[12px] font-semibold uppercase text-[#0f172a]">{quickProductLabel} <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700">F6</span></label>
                  <div className="relative">
                    <AutocompleteInput
                      data-fkey="product"
                      dropDirection="down"
                      placeholder={quickProductPlaceholder}
                      value={productSearch}
                      onChange={updateProductSearch}
                      onSelect={(v) => applyQuickProductSelection(v)}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.stopPropagation();
                          await addQuickItem(e.currentTarget.value);
                        }
                      }}
                      options={productSearchOptions(salesItemFilter)}
                      inputClassName="!h-10 !rounded-md !border-[#dbe4ef] !bg-white !pr-3 !text-[13px] !font-[inherit] focus:!border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[12px] font-semibold uppercase text-[#0f172a]">Description</label>
                  <input
                    className="h-10 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] outline-none focus:border-blue-500"
                    data-fkey="quick-itemDescription"
                    placeholder="Item description"
                    value={quickItem.itemDescription || ''}
                    onChange={(e) => updateQuickItem('itemDescription', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        focusQuickItemField('hsn');
                      }
                    }}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[12px] font-semibold uppercase text-[#0f172a]">HSN / SAC</label>
                  <AutocompleteInput className="w-full" inputClassName="!h-10 !rounded-md !border-[#dbe4ef] !bg-white !px-3 !text-[13px] focus:!border-blue-500" data-fkey="quick-hsn" placeholder={quickItem.itemType === 'Service' ? 'SAC' : 'HSN'} value={quickItem.hsn} onChange={(v) => updateQuickItem('hsn', v)} onKeyDown={(e) => handleQuickItemStep(e, quickProductVariants.length ? 'model' : 'qty')} />
                </div>

                {quickProductVariants.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <label className="text-[12px] font-semibold uppercase text-[#0f172a]">{quickVariantLabel}</label>
                    <SelectDropdown data-fkey="quick-model" value={quickItem.size || ''} onChange={(v) => { selectQuickItemVariant(quickMatchedProduct, v); focusQuickItemField('qty'); }} placeholder={quickVariantPlaceholder} buttonClassName="!h-10 !rounded-md !border-[#dbe4ef] !bg-white !px-3 !text-[13px]" selectedLabelClassName="text-left whitespace-nowrap overflow-hidden text-ellipsis" optionLabelClassName="w-full min-w-0" menuClassName="!w-72 !right-auto" searchable allowCustom customLabel="Manual size" options={quickProductVariants.map(variantDropdownOption)} />
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <label className="text-[12px] font-semibold uppercase text-[#0f172a]">Qty</label>
                  <AutocompleteInput className="w-full" inputClassName="!h-10 !rounded-md !border-[#dbe4ef] !bg-white !px-3 !text-[13px] focus:!border-blue-500" data-fkey="quick-qty" min="0" type="number" value={String(quickItem.qty ?? '')} onChange={(v) => updateQuickItem('qty', v)} onKeyDown={(e) => handleQuickItemStep(e, 'unit')} />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[12px] font-semibold uppercase text-[#0f172a]">Unit</label>
                  <AutocompleteInput className="w-full" inputClassName="!h-10 !rounded-md !border-[#dbe4ef] !bg-white !px-3 !text-[13px] focus:!border-blue-500" data-fkey="quick-unit" value={quickItem.unit} onChange={(v) => updateQuickItem('unit', v)} onKeyDown={(e) => handleQuickItemStep(e, 'rate')} />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[12px] font-semibold uppercase text-[#0f172a]">Rate</label>
                  <AutocompleteInput className="w-full" inputClassName="!h-10 !rounded-md !border-[#dbe4ef] !bg-white !px-3 !text-[13px] focus:!border-blue-500" data-fkey="quick-rate" min="0" type="number" value={String(quickItem.rate ?? '')} onChange={(v) => updateQuickItem('rate', v)} onKeyDown={(e) => handleQuickItemStep(e, 'discount')} />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[12px] font-semibold uppercase text-[#0f172a]">Discount %</label>
                  <AutocompleteInput className="w-full" inputClassName="!h-10 !rounded-md !border-[#dbe4ef] !bg-white !px-3 !text-[13px] focus:!border-blue-500" data-fkey="quick-discount" min="0" max="100" type="number" value={String(quickItem.discount ?? '')} onChange={(v) => updateQuickItem('discount', v)} onKeyDown={(e) => handleQuickItemStep(e, config.showGst ? 'gstRate' : 'add')} />
                </div>

                {config.showGst && (
                  <div className="flex flex-col gap-2">
                    <label className="text-[12px] font-semibold uppercase text-[#0f172a]">Tax (%)</label>
                    <AutocompleteInput className="w-full" inputClassName="!h-10 !rounded-md !border-[#dbe4ef] !bg-white !px-3 !text-[13px] focus:!border-blue-500" data-fkey="quick-gstRate" min="0" type="number" value={String(quickItem.gstRate ?? '')} onChange={(v) => updateQuickItem('gstRate', v)} onKeyDown={(e) => handleQuickItemStep(e, 'add')} />
                  </div>
                )}

                <button data-fkey="quick-add" type="button" className="flex h-10 items-center justify-center rounded-md bg-blue-600 text-white shadow-sm" onClick={() => addQuickItem()} title="Add item">
                  <ArrowLeft size={16} className="rotate-180" />
                </button>
              </div>

              <div className="mt-3 min-h-[300px] rounded-lg border border-dashed border-[#dbe4ef] bg-[#fafbfe]">
                {effectiveItems.length > 0 && (
                  <div className="divide-y divide-[#edf2f7] bg-white">
                    {effectiveItems.map((item, idx) => {
                      const line = calcLine(item);
                      return (
                        <div key={item.id || idx} className="grid grid-cols-[36px_minmax(0,1fr)_80px_90px_110px_40px] items-center gap-3 px-4 py-3 text-[13px]">
                          <span className="text-[#94a3b8]">#{idx + 1}</span>
                          <span className="min-w-0">
                            <strong className="block truncate text-[#111827]">{item.description || 'Unnamed item'}</strong>
                            <small className="text-[#64748b]">{item.productCode || item.barcode || item.hsn || '-'}</small>
                          </span>
                          <span className="text-right">{Number(item.qty || 0)} {item.unit || ''}</span>
                          <span className="text-right">{formatCurrency(Number(item.rate || 0))}</span>
                          <strong className="text-right">{formatCurrency(line.total)}</strong>
                          <button type="button" className="h-8 w-8 rounded-md border border-[#fee2e2] bg-white text-red-500" onClick={() => removeItem(item.id)}><X size={15} /></button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </section>

            <aside className="flex flex-col gap-4">
              <div className="sales-reference-card bg-white p-6 shadow-sm">
                <h2 className="m-0 mb-6 text-[13px] font-semibold uppercase text-[#0f172a]">Bill Summary</h2>
                <div className="space-y-5 text-[14px] font-semibold text-[#334155]">
                  <div className="flex items-center justify-between"><span>Subtotal</span><strong>{formatCurrency(totals.subtotal)}</strong></div>
                  <div className="flex items-center justify-between"><span>Discount</span><strong>{formatCurrency(totals.discount + totals.addDiscAmt)}</strong></div>
                  <div className="flex items-center justify-between"><span>Taxable Amount</span><strong>{formatCurrency(posTaxableAmount)}</strong></div>
                  <div className="flex items-center justify-between"><span>CGST (9%)</span><strong>{formatCurrency(posHalfGst)}</strong></div>
                  <div className="flex items-center justify-between"><span>SGST (9%)</span><strong>{formatCurrency(posHalfGst)}</strong></div>
                </div>
                <div className="mt-6 flex items-center justify-between border-t border-[#dbe4ef] pt-6 text-blue-700">
                  <span className="text-[14px] font-semibold uppercase">Total</span>
                  <strong className="text-[28px] leading-none">{formatCurrency(totals.finalTotal)}</strong>
                </div>
                {['invoice', 'bill-of-supply', 'pharmacy-bill'].includes(effectiveDocumentType) && (
                  <div className="mt-5 space-y-3 rounded-lg border border-amber-100 bg-amber-50 p-3 text-[13px] font-semibold text-amber-900">
                    <div className="flex items-center justify-between">
                      <span>Old Credit Balance</span>
                      <strong>{formatCurrency(oldCreditBalance)}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>This Invoice Balance</span>
                      <strong>{formatCurrency(currentInvoiceBalance)}</strong>
                    </div>
                    <div className="flex items-center justify-between border-t border-amber-200 pt-2 text-[14px]">
                      <span>Total Balance</span>
                      <strong>{formatCurrency(customerBalanceAfterInvoice)}</strong>
                    </div>
                  </div>
                )}
              </div>

              <div className="sales-reference-card bg-white p-6 shadow-sm">
                <h3 className="m-0 mb-4 text-[13px] font-semibold uppercase text-[#0f172a]">Payment Method</h3>
                <div className="grid grid-cols-3 gap-3">
                  {PAYMENT_METHODS.filter((m) => ['cash', 'upi', 'card'].includes(m.id)).map((m) => (
                    <button key={m.id} type="button" onClick={() => selectPaymentMethod(m.id)} className={`inline-flex min-h-[52px] items-center justify-center gap-2 rounded-md border text-[13px] font-semibold ${selectedPayment === m.id ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-[#dbe4ef] bg-white text-[#0f2757]'}`}>
                      <FileText size={17} className={m.id === 'cash' ? 'text-green-600' : 'text-blue-600'} />
                      {m.label}
                    </button>
                  ))}
                </div>
                {selectedPayment && (
                  <button type="button" onClick={() => setShowPaymentMethodPopup(true)} className="mt-4 inline-flex min-h-[42px] w-full items-center justify-between rounded-md border border-blue-100 bg-blue-50 px-3 text-[12px] font-semibold text-blue-700">
                    <span>{PAYMENT_METHODS.find((method) => method.id === selectedPayment)?.label || 'Payment'} details</span>
                    <strong>{selectedPayment === 'credit' ? `${paymentData.creditDays || 0} days` : formatCurrency(Number(paymentData.amount) || 0)}</strong>
                  </button>
                )}
                <button type="button" onClick={openMultiplePayment} className="mt-4 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-md border border-[#dbe4ef] bg-white text-[13px] font-semibold text-[#0f2757] hover:border-blue-300 hover:text-blue-700">
                  <FileText size={17} className="text-blue-600" />
                  Multiple Payment
                </button>
                <button type="button" disabled={saveLoading} onClick={() => handleSave()} className="mt-6 inline-flex h-14 w-full items-center justify-center gap-3 rounded-lg border border-blue-600 bg-blue-600 px-5 text-[16px] font-semibold text-white shadow-sm disabled:opacity-60">
                  <Send size={19} />
                  Pay {formatCurrency(totals.finalTotal)}
                  <span className="ml-auto rounded bg-blue-500 px-2 py-1 text-[11px]">F10</span>
                </button>
              </div>
            </aside>
          </div>
          <div className="sales-reference-notes-grid grid grid-cols-1 gap-4 bg-[#f8fbff] px-4 pb-4 lg:grid-cols-2">
            <section className="sales-reference-card bg-white p-4 shadow-sm">
              <h2 className="m-0 mb-3 text-[13px] font-semibold uppercase text-[#0f172a]">Notes</h2>
              <textarea
                data-fkey="notes"
                className="min-h-[92px] w-full resize-y rounded-md border border-[#dbe4ef] bg-white px-3 py-2.5 text-[13px] text-[#111827] outline-none focus:border-blue-500"
                placeholder={`Notes visible to ${partyKindLower} on this document...`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </section>

            <section className="sales-reference-card bg-white p-4 shadow-sm">
              <h2 className="m-0 mb-3 text-[13px] font-semibold uppercase text-[#0f172a]">Terms & Conditions</h2>
              <textarea
                className="min-h-[92px] w-full resize-y rounded-md border border-[#dbe4ef] bg-white px-3 py-2.5 text-[13px] text-[#111827] outline-none focus:border-blue-500"
                placeholder="Payment terms, delivery conditions..."
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
              />
            </section>
          </div>
        </section>
        <MobileBarcodeScanner
          open={showBarcodeScanner}
          onClose={() => setShowBarcodeScanner(false)}
          onDetected={handleCameraBarcodeDetected}
          status={barcodeScanStatus}
          unknownCode={unknownBarcode}
          scannedItems={displayItems}
          total={totals.finalTotal}
          onAddUnknown={() => {
            if (!unknownBarcode) return;
            setShowBarcodeScanner(false);
            openAddProductForBarcode(unknownBarcode);
          }}
        />

        {paymentMethodPopup}

        {showPaymentPopup && (
          <div className="billing-payment-popup-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowPaymentPopup(false); }}>
            <div className="billing-payment-popup" role="dialog" aria-modal="true" aria-label="Multiple payment">
              <div className="billing-payment-popup-header">
                <div><strong>Split Payment</strong><span>Total {formatCurrency(totals.finalTotal)}</span></div>
                <button type="button" onClick={() => setShowPaymentPopup(false)} aria-label="Close payment popup"><X size={16} /></button>
              </div>
              <div className="billing-payment-popup-rows">
                {PAYMENT_METHODS.filter((method) => method.id !== 'credit').map((method) => {
                  const split = paymentSplits.find((row) => row.id === method.id) || {};
                  return (
                    <div key={method.id} className="billing-payment-popup-row">
                      <label>{method.label}</label>
                      <input type="number" min="0" placeholder="0" value={split.amount || ''} onChange={(e) => updatePaymentSplit(method.id, 'amount', e.target.value)} />
                      <button type="button" onClick={() => fillPaymentSplit(method.id)}>Full</button>
                    </div>
                  );
                })}
              </div>
              <div className="billing-payment-popup-footer">
                <div><span>Received</span><strong>{formatCurrency(paymentSplitTotal)}</strong></div>
                <div><span>Balance / Credit</span><strong>{formatCurrency(customerBalanceAfterInvoice)}</strong></div>
                <button type="button" onClick={() => setShowPaymentPopup(false)}>Done</button>
              </div>
            </div>
          </div>
        )}

        {showPreview && (
          <DocumentPreviewModal
            config={config}
            customer={getEffectiveCustomer()}
            docMeta={docMeta}
            docExtra={docExtra}
            items={displayItems}
            charges={charges}
            totals={totals}
            notes={notes}
            terms={terms}
            supplyType={supplyType}
            bizSettings={previewBizSettings}
            shipping={shipping}
            sameShipping={sameShipping}
            tds={tds}
            tcs={tcs}
            advanceAmt={advanceAmt}
            paymentMethod={currentPaymentMethodLabel()}
            paymentSplits={paymentSplits}
            addDiscount={addDiscount}
            autoPrint={autoPrintPreview}
            downloadAsPdf={downloadPdfMode}
            pdfMode={downloadPdfMode}
            invoiceNumber={docMeta.number}
            onClose={() => {
              setShowPreview(false);
              setAutoPrintPreview(false);
              setDownloadPdfMode(false);
              if (previewRedirectOnClose) {
                window.location.assign(LIST_ROUTES[documentType] ?? '/billing/invoice');
              }
            }}
          />
        )}
      </div>
    );
  }

  // ── JSX ──────────────────────────────────────────────────────────────────────

  return (
    <div className={`document-print-host billing-v2 p-4 md:p-7 ${isRetailPosInvoice ? 'billing-pos-screen' : ''} ${isElectronicsRetail && documentType === 'invoice' ? 'electronics-sales-common-page' : ''}`}>
      {purchaseBarcodePrintRowsToPrint.length > 0 && (
        <div className={`barcode-print-area barcode-print-${purchaseBarcodePrintJob?.layout || 'thermal80'}`}>
          <div className="barcode-print-sheet barcode-print-pages">
            {chunkPurchaseBarcodePages(purchaseBarcodePrintRowsToPrint).map((pageRows, pageIndex) => (
              <div className="barcode-print-page" key={`barcode-page-${pageIndex}`}>
                {pageRows.map((row) => {
                  const barcodeVal = row.barcode || '';
                  return (
                    <div className="barcode-label-card" key={row.printKey}>
                      <div className="barcode-label-main">
                        <div className="barcode-label-top">
                          <div>
                            <div className="barcode-label-name">{row.description}</div>
                            <div className="barcode-label-meta">{purchaseLabelVariantText(row)}</div>
                          </div>
                          {purchaseLabelPrice(row) && <div className="barcode-label-price">{purchaseLabelPrice(row)}</div>}
                        </div>
                        <PurchaseLabelBarcode value={barcodeVal} height={38} />
                        <div className="barcode-label-code">{normalizePurchaseLabelBarcode(barcodeVal)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
      {inlineProductModal && (
        <ProductModal
          mode="add"
          initial={null}
          nextCode=""
          initialBarcode={inlineProductModal.barcode || ''}
          initialProductType={inlineProductModal.initialProductType || 'Serialized'}
          categories={inlineProductCategories}
          brands={inlineProductBrands}
          sizes={inlineProductSizes}
          fabrics={[]}
          colours={inlineProductColours}
          types={inlineProductTypes}
          forceElectronicsRetail
          onSave={handleInlineProductSave}
          onClose={() => setInlineProductModal(null)}
        />
      )}
      {isRetailPosInvoice && (
        <header className="billing-pos-header">
          <div className="billing-pos-brand">
            <button type="button" aria-label="Open menu"><Menu size={28} /></button>
            <span className="billing-pos-logo">GoBook</span>
            <strong>Billing</strong>
          </div>
          <div className="billing-pos-meta">
            <button type="button" onClick={() => setNumberEditing(true)}>
              <strong>{docMeta.number || `${config.prefix}-0001`}</strong>
              <span>{config.title}</span>
            </button>
            <button type="button" onClick={() => setBillType((t) => (t === 'with-gst' ? 'without-gst' : 'with-gst'))} className={billType === 'with-gst' ? 'is-on' : ''}>
              GST {billType === 'with-gst' ? 'ON' : 'OFF'}
            </button>
            <label>
              <strong>{posDate}</strong>
              <span>{posTime}</span>
            </label>
          </div>
          <div className="billing-pos-user">
            <span className={keyboardMode ? 'is-on' : ''}>Keyboard Mode {keyboardMode ? 'ON' : 'OFF'}</span>
            <User size={30} />
            <div>
              <strong>Fradrick A</strong>
              <small>Retail Store</small>
            </div>
            <ChevronDown size={18} />
          </div>
        </header>
      )}
      {/* ── Page Header ── */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="m-0 text-[19px] font-bold uppercase tracking-wide text-[#111827]">{config.title}</h1>

          {documentType === 'invoice' && (
            <button
              type="button"
              onClick={() => setBillType((t) => (t === 'with-gst' ? 'without-gst' : 'with-gst'))}
              title="Click to toggle GST on this bill"
              className={`inline-flex items-center gap-1.5 text-[12px] font-semibold rounded-full px-3 py-1 cursor-pointer border font-[inherit]
                ${billType === 'with-gst' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-[#f1f5f9] border-[#dbe4ef] text-[#64748b]'}`}
            >
              <CheckCircle2 size={12} />
              {billType === 'with-gst' ? 'With GST' : 'Without GST'}
            </button>
          )}

          {numberEditing ? (
            <input
              autoFocus
              className="billing-doc-number-field border border-[#dbe4ef] rounded-md px-2.5 py-1 text-[13px] font-semibold text-[#111827] w-32 outline-none focus:border-blue-500 font-[inherit]"
              value={docMeta.number}
              onChange={(e) => updateMeta('number', e.target.value)}
              onBlur={() => setNumberEditing(false)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); setNumberEditing(false); } }}
            />
          ) : (
            <button
              type="button"
              onClick={() => setNumberEditing(true)}
              className="billing-doc-number-field inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#111827] bg-white border border-[#dbe4ef] rounded-md px-2.5 py-1 cursor-pointer font-[inherit]"
              title="Click to edit document number"
            >
              {docMeta.number || '—'}
              <Pencil size={11} className="text-[#94a3b8]" />
            </button>
          )}

          <label className="billing-doc-date-field inline-flex items-center gap-1.5 border border-[#dbe4ef] rounded-md px-2.5 py-1 text-[13px] text-[#374151] bg-white cursor-pointer">
            <Calendar size={13} className="text-[#94a3b8]" />
            <input type="date" value={docMeta.date} onChange={(e) => updateMeta('date', e.target.value)} className="min-w-0 w-full border-0 bg-transparent outline-none text-[13px] font-[inherit]" />
          </label>

        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button className={cx.btnOutline} type="button" onClick={() => window.location.assign(LIST_ROUTES[documentType] ?? '/billing/invoice')} title="Open list page (Alt+V)">
            View List
            <span className="hidden md:inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">Alt+V</span>
          </button>
          <button
            className="inline-flex h-10 items-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-4 text-[13px] font-bold text-[#0f172a] shadow-sm hover:bg-[#f8fafc] cursor-pointer font-[inherit]"
            type="button"
            onClick={() => { setAutoPrintPreview(false); setShowPreview(true); }}
            title="Preview (F3)"
          >
            <Eye size={17} />
            Preview
            <span className="hidden md:inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">F3</span>
          </button>
          <button
            className="billing-header-save-btn inline-flex h-10 items-center gap-2 rounded-md border border-blue-700 bg-blue-600 px-5 text-[13px] font-bold text-white shadow-[0_8px_18px_rgba(37,99,235,0.28)] hover:bg-blue-700 cursor-pointer disabled:cursor-not-allowed disabled:opacity-70 font-[inherit]"
            type="button"
            disabled={saveLoading}
            onClick={() => handleSave()}
            title="Save Bill (F2)"
          >
            <Send size={17} />
            {saveLoading ? 'Saving…' : 'Save Bill'}
            <span className="hidden md:inline-flex items-center rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-bold text-white">F2</span>
          </button>
        </div>
        {saveError && (
          <div className="w-full mt-1 rounded-md bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">{saveError}</div>
        )}
      </div>

      {showCalculator && <CalculatorPopup onClose={() => setShowCalculator(false)} />}

      {brandPicker && (
        <div
          ref={brandPickerRef}
          tabIndex={-1}
          onKeyDown={handleBrandPickerKeyDown}
          className="fixed bottom-6 right-6 z-[9999] w-[280px] overflow-hidden rounded-lg border border-[#9db8e3] bg-white shadow-2xl outline-none ring-2 ring-blue-500/20"
        >
          <div className="flex items-center justify-between border-b border-[#dbe7fb] bg-blue-600 px-3 py-2">
            <div className="min-w-0">
              <div className="text-[12px] font-black uppercase tracking-wide text-white">{pickerTypeLabel(brandPicker.type)} List</div>
              <div className="truncate text-[11px] font-medium text-blue-100">{brandPicker.selected.length ? `${brandPicker.selected.length} selected` : `Select ${pickerTypeLabel(brandPicker.type)}`}</div>
            </div>
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded border border-blue-400 bg-blue-500 text-[16px] font-bold text-white hover:bg-blue-700"
              onClick={() => setBrandPicker(null)}
              title="Close"
            >
              ×
            </button>
          </div>
          <div className="border-b border-[#edf2f7] bg-[#f8fbff] p-2">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
              <input
                ref={brandPickerSearchRef}
                data-brand-picker-search="true"
                className="h-9 w-full rounded-md border border-[#dbe4ef] bg-white pl-8 pr-3 text-[13px] font-semibold text-[#111827] outline-none focus:border-blue-500"
                placeholder={`Search or type ${pickerTypeLabel(brandPicker.type)}...`}
                value={brandPicker.query || ''}
                onChange={(e) => setBrandPicker((prev) => prev ? { ...prev, query: e.target.value, highlighted: 0 } : prev)}
                onKeyDown={(e) => {
                  if (['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(e.key)) return;
                  e.stopPropagation();
                }}
              />
            </div>
            {brandPicker.selected.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {brandPicker.selected.map((item) => (
                  <button
                    key={item}
                    type="button"
                    tabIndex={-1}
                    className="inline-flex max-w-full items-center gap-1 rounded-full border border-blue-200 bg-white px-2 py-1 text-[11px] font-bold text-blue-800"
                    onClick={() => toggleBrandPickerValue(item, true)}
                    title={`Remove ${item}`}
                  >
                    <span className="truncate">{item}</span>
                    <X size={12} />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="max-h-64 overflow-y-auto p-2">
            {brandPickerManualValue() && (
              <button
                type="button"
                tabIndex={-1}
                data-brand-picker-option={0}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => toggleBrandPickerValue(brandPickerManualValue(), true)}
                className="mb-1 flex w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-blue-600 bg-blue-50 px-3 py-2 text-left text-[13px] font-semibold text-blue-950 hover:bg-blue-100"
              >
                <span className="truncate">Add "{brandPickerManualValue()}"</span>
                <Plus size={14} />
              </button>
            )}
            {brandPickerFilteredOptions().length ? brandPickerFilteredOptions().map((option, index) => {
              const active = brandPicker.selected.some((item) => String(item).trim().toLowerCase() === String(option).trim().toLowerCase());
              const highlighted = index === (brandPicker.highlighted || 0);
              return (
                <button
                  key={option}
                  type="button"
                  tabIndex={-1}
                  data-brand-picker-option={index}
                  onMouseEnter={() => setBrandPicker((prev) => prev ? { ...prev, highlighted: index } : prev)}
                  onClick={() => toggleBrandPickerValue(option, true)}
                  className={`mb-1 flex w-full cursor-pointer items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-[13px] font-semibold font-[inherit] ${highlighted ? 'border-blue-600 bg-blue-200 text-blue-950' : active ? 'border-blue-500 bg-blue-100 text-blue-900' : 'border-[#edf2f7] bg-white text-[#111827] hover:bg-blue-50'}`}
                >
                  <span className="truncate">{option}</span>
                  {active && <CheckCircle2 size={14} className="shrink-0" />}
                </button>
              );
            }) : !brandPickerManualValue() ? (
              <div className="rounded-md border border-dashed border-[#dbe4ef] bg-[#f8fafc] px-3 py-4 text-center text-[12px] font-semibold text-[#64748b]">
                No {pickerTypeLabel(brandPicker.type)} found.
              </div>
            ) : null}
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-[#edf2f7] bg-[#f8fbff] px-3 py-2">
            <button
              type="button"
              className="rounded-md border border-[#dbe4ef] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#536173] hover:bg-slate-50"
              onKeyDown={(e) => e.stopPropagation()}
              onClick={() => setBrandPicker((prev) => prev ? { ...prev, selected: [] } : prev)}
            >
              Clear
            </button>
            <button
              type="button"
              className="rounded-md border border-blue-600 bg-blue-600 px-4 py-1.5 text-[12px] font-bold text-white hover:bg-blue-700"
              onKeyDown={(e) => e.stopPropagation()}
              onClick={confirmBrandPicker}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* ── Validation Error Banner ── */}
      {quickVariantDraft && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-6xl overflow-hidden rounded-xl border border-[#dbe4ef] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[#edf2f7] bg-[#f8fbff] px-5 py-4">
              <div>
                <h2 className="m-0 text-[18px] font-extrabold text-[#0f172a]">{quickVariantDraft.reviewMode === 'save' ? 'Review Purchase Items' : 'Selected Purchase Variants'}</h2>
                <p className="m-0 mt-1 text-[13px] text-[#536173]">{quickVariantDraft.reviewMode === 'save' ? 'Edit the selected rows here, then continue saving.' : 'Only your selected brand and size rows are shown here. Edit them before adding to the entry.'}</p>
              </div>
              <button type="button" className="flex h-9 w-9 items-center justify-center rounded-md border border-[#dbe4ef] bg-white text-[18px] font-bold text-[#536173] hover:bg-slate-50" onClick={() => setQuickVariantDraft(null)}>&times;</button>
            </div>
            <div className="max-h-[62vh] overflow-auto p-5">
              <table className="w-full min-w-[980px] border-collapse text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[#edf2f7] bg-[#f8fafc] text-[11px] uppercase text-[#536173]">
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Product</th>
                    <th className="px-3 py-2">Brand</th>
                    <th className="px-3 py-2">Size</th>
                    <th className="px-3 py-2">Material</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2">Unit</th>
                    <th className="px-3 py-2 text-right">Rate</th>
                    <th className="px-3 py-2 text-center">Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {quickVariantDraft.rows.map((row, index) => {
                    const brandOptions = uniqueTextParts([row.brand, ...(quickVariantDraft.brandOptions || [])]);
                    const sizeOptions = uniqueTextParts([row.size, ...(quickVariantDraft.sizeOptions || [])])
                      .filter((option) => isAllowedFashionSize(option, [row.description, quickVariantDraft.query]));
                    return (
                      <tr key={row.id} className="border-b border-[#edf2f7]">
                        <td className="px-3 py-2 text-[#64748b]">{index + 1}</td>
                        <td className="px-3 py-2 font-semibold text-[#0f172a]">{row.description || quickVariantDraft.query}</td>
                        <td className="px-3 py-2">
                          <select className="h-9 w-full rounded-md border border-[#dbe4ef] bg-white px-2 text-[13px] outline-none focus:border-blue-500" value={row.brand || ''} onChange={(e) => updateQuickVariantDraftRow(row.id, 'brand', e.target.value)}>
                            {brandOptions.length ? brandOptions.map((option) => <option key={option} value={option}>{option}</option>) : <option value="">Brand</option>}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <select className="h-9 w-full rounded-md border border-[#dbe4ef] bg-white px-2 text-[13px] outline-none focus:border-blue-500" value={row.size || ''} onChange={(e) => updateQuickVariantDraftRow(row.id, 'size', e.target.value)}>
                            {sizeOptions.length ? sizeOptions.map((option) => <option key={option} value={option}>{option}</option>) : <option value="">Size</option>}
                          </select>
                        </td>
                        <td className="px-3 py-2"><input className="h-9 w-full rounded-md border border-[#dbe4ef] px-2 text-[13px] outline-none focus:border-blue-500" value={row.material || ''} onChange={(e) => updateQuickVariantDraftRow(row.id, 'material', e.target.value)} /></td>
                        <td className="px-3 py-2"><input className="h-9 w-20 rounded-md border border-[#dbe4ef] px-2 text-right text-[13px] outline-none focus:border-blue-500" type="number" min="0" value={row.qty} onChange={(e) => updateQuickVariantDraftRow(row.id, 'qty', e.target.value)} /></td>
                        <td className="px-3 py-2"><input className="h-9 w-24 rounded-md border border-[#dbe4ef] px-2 text-[13px] outline-none focus:border-blue-500" value={row.unit || ''} onChange={(e) => updateQuickVariantDraftRow(row.id, 'unit', e.target.value)} /></td>
                        <td className="px-3 py-2"><input className="h-9 w-24 rounded-md border border-[#dbe4ef] px-2 text-right text-[13px] outline-none focus:border-blue-500" type="number" min="0" value={row.rate} onChange={(e) => updateQuickVariantDraftRow(row.id, 'rate', e.target.value)} /></td>
                        <td className="px-3 py-2 text-center"><button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-100 bg-red-50 text-[16px] font-bold text-red-500 hover:bg-red-100" onClick={() => removeQuickVariantDraftRow(row.id)} title="Remove row">&times;</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf2f7] bg-white px-5 py-4">
              <div className="text-[13px] font-semibold text-[#536173]">{quickVariantDraft.rows.length} selected row(s)</div>
              <div className="flex items-center gap-2">
                <button type="button" className="rounded-md border border-[#dbe4ef] bg-white px-4 py-2 text-[13px] font-semibold text-[#536173] hover:bg-slate-50" onClick={() => setQuickVariantDraft(null)}>Back to Entry</button>
                <button type="button" className="rounded-md border border-blue-600 bg-blue-600 px-5 py-2 text-[13px] font-bold text-white hover:bg-blue-700 disabled:opacity-60" disabled={!quickVariantDraft.rows.length} onClick={confirmQuickVariantDraft}>{quickVariantDraft.reviewMode === 'save' ? 'Continue Save' : 'Add Selected to Entry'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {inventoryConfirmOptions && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-5xl overflow-hidden rounded-xl border border-[#dbe4ef] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[#edf2f7] bg-[#f8fbff] px-5 py-4">
              <div>
                <h2 className="m-0 text-[18px] font-extrabold text-[#0f172a]">Add Purchase Items to Inventory</h2>
                <p className="m-0 mt-1 text-[13px] text-[#536173]">Review the purchase entry rows before they are added to the product list and stock.</p>
              </div>
              <button type="button" className="flex h-9 w-9 items-center justify-center rounded-md border border-[#dbe4ef] bg-white text-[18px] font-bold text-[#536173] hover:bg-slate-50" onClick={() => setInventoryConfirmOptions(null)}>×</button>
            </div>
            <div className="max-h-[60vh] overflow-auto p-5">
              <table className="w-full min-w-[820px] border-collapse text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[#edf2f7] bg-[#f8fafc] text-[11px] uppercase text-[#536173]">
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Product</th>
                    <th className="px-3 py-2">Brand</th>
                    <th className="px-3 py-2">Size</th>
                    <th className="px-3 py-2">Material</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2">Unit</th>
                    <th className="px-3 py-2 text-right">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {displayItems.filter((item) => item.description).map((item, index) => (
                    <tr key={item.id || index} className="border-b border-[#edf2f7]">
                      <td className="px-3 py-2 text-[#64748b]">{index + 1}</td>
                      <td className="px-3 py-2 font-semibold text-[#0f172a]">{item.description}</td>
                      <td className="px-3 py-2">{item.brand || '-'}</td>
                      <td className="px-3 py-2">{item.size || '-'}</td>
                      <td className="px-3 py-2">{item.material || '-'}</td>
                      <td className="px-3 py-2 text-right">{Number(item.qty || 0)}</td>
                      <td className="px-3 py-2">{item.unit || 'Nos'}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(Number(item.rate) || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf2f7] bg-white px-5 py-4">
              <div className="text-[13px] font-semibold text-[#536173]">{displayItems.filter((item) => item.description).length} item(s) ready for inventory</div>
              <div className="flex items-center gap-2">
                <button type="button" className="rounded-md border border-[#dbe4ef] bg-white px-4 py-2 text-[13px] font-semibold text-[#536173] hover:bg-slate-50" onClick={() => setInventoryConfirmOptions(null)}>Back to Entry</button>
                <button
                  type="button"
                  className="rounded-md border border-blue-600 bg-blue-600 px-5 py-2 text-[13px] font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                  disabled={saveLoading}
                  onClick={() => {
                    const options = inventoryConfirmOptions || {};
                    setInventoryConfirmOptions(null);
                    handleSave({ ...options, inventoryConfirmed: true, variantReviewConfirmed: true });
                  }}
                >
                  Add Inventory
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {Object.keys(errors).length > 0 && (
        <div data-validation-error className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3.5 flex items-start gap-3">
          <svg className="flex-none text-red-500 mt-0.5" fill="none" height="16" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="16">
            <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
          </svg>
          <div className="flex flex-col gap-1">
            <div className="text-[13px] font-semibold text-red-700">Please fix the following before saving:</div>
            <ul className="m-0 pl-0 list-none flex flex-col gap-0.5">
              {errors.customerName     && <li className="text-[12px] text-red-600">• {errors.customerName}</li>}
              {errors.invoiceNumber   && <li className="text-[12px] text-red-600">• {errors.invoiceNumber}</li>}
              {errors.invoiceDate     && <li className="text-[12px] text-red-600">• {errors.invoiceDate}</li>}
              {errors.items           && <li className="text-[12px] text-red-600">• {errors.items}</li>}
              {errors.reason          && <li className="text-[12px] text-red-600">• {errors.reason}</li>}
              {errors.originalInvoiceNo && <li className="text-[12px] text-amber-700">• {errors.originalInvoiceNo}</li>}
              {errors.customerGstin   && <li className="text-[12px] text-red-600">• {errors.customerGstin}</li>}
              {errors.vendorInvoiceNo && <li className="text-[12px] text-red-600">• {errors.vendorInvoiceNo}</li>}
              {errors.vendorInvoiceAmount && <li className="text-[12px] text-red-600">• {errors.vendorInvoiceAmount}</li>}
              {errors.vehicleNumber   && <li className="text-[12px] text-red-600">• {errors.vehicleNumber}</li>}
              {errors.transporter     && <li className="text-[12px] text-red-600">• {errors.transporter}</li>}
              {errors.distanceKm      && <li className="text-[12px] text-red-600">• {errors.distanceKm}</li>}
              {errors.validTill       && <li className="text-[12px] text-amber-700">• {errors.validTill}</li>}
              {errors.expectedDelivery && <li className="text-[12px] text-amber-700">• {errors.expectedDelivery}</li>}
            </ul>
          </div>
        </div>
      )}


      {config.showPurchaseOrderLink && (
        <div className="billing-quick-strip billing-quick-strip-po mb-4">
          <div className="billing-quick-field billing-quick-po-field">
            <label>Match PO</label>
            <SelectDropdown
              value={docExtra.linkedPurchaseOrderId}
              onChange={applyPurchaseOrder}
              options={[
                { value: '', label: 'Select purchase order' },
                ...purchaseOrders.map((po) => {
                  const id = po._id || po.id;
                  return { value: id, label: `${po.number} - ${po.customer?.name || 'Vendor'} - ${formatCurrency(calcDocumentTotal(po))}` };
                }),
              ]}
            />
          </div>
          <div className="billing-quick-field billing-quick-vendor-invoice-field">
            <label>Vendor Invoice No. <span>*</span></label>
            <input
              className={errors.vendorInvoiceNo ? 'border-red-400 bg-red-50' : ''}
              placeholder="Vendor invoice number"
              value={docExtra.vendorInvoiceNo}
              onChange={(e) => { updateExtra('vendorInvoiceNo', e.target.value); clearError('vendorInvoiceNo'); }}
            />
          </div>
          <div className="billing-quick-field billing-quick-vendor-invoice-field">
            <label>Vendor Invoice Amount</label>
            <input
              className={errors.vendorInvoiceAmount ? 'border-red-400 bg-red-50' : ''}
              type="number"
              min="0"
              step="0.01"
              placeholder="Vendor invoice total"
              value={docExtra.vendorInvoiceAmount}
              onChange={(e) => { updateExtra('vendorInvoiceAmount', e.target.value); clearError('vendorInvoiceAmount'); }}
            />
          </div>
          {vendorInvoiceAmountMatch && (
            <div className={`billing-po-match-row ${vendorInvoiceAmountMatch.matched ? 'matched' : 'mismatch'}`}>
              <strong>{vendorInvoiceAmountMatch.matched ? 'Vendor amount matched' : 'Vendor amount mismatch'}</strong>
              <span>Vendor: {formatCurrency(vendorInvoiceAmountMatch.vendorAmount)}</span>
              <span>Entry: {formatCurrency(vendorInvoiceAmountMatch.entryAmount)}</span>
              <span>Difference: {formatCurrency(Math.abs(vendorInvoiceAmountMatch.difference))}</span>
            </div>
          )}
          <div className={`billing-po-match-row ${purchaseEntryMatch?.matched ? 'matched' : 'mismatch'}`}>
            {purchaseOrders.length === 0 ? (
              <span>No purchase orders found. Create a purchase order first to match it here.</span>
            ) : docExtra.linkedPurchaseOrderId ? (
              <>
                <strong>{purchaseEntryMatch?.matched ? 'Matched' : 'Mismatch'}</strong>
                <span>PO: {formatCurrency(purchaseEntryMatch?.poTotal || 0)}</span>
                <span>PE: {formatCurrency(purchaseEntryMatch?.peTotal || 0)}</span>
                <span>Difference: {formatCurrency(purchaseEntryMatch?.difference || 0)}</span>
              </>
            ) : (
              <span>Select an existing purchase order to auto-fill vendor, items, and amount for matching.</span>
            )}
          </div>
        </div>
      )}

      {isRetailPosInvoice && (
        <section className="billing-pos-command-row">
          <div className="billing-pos-search">
            <Search size={25} />
            <AutocompleteInput
              data-fkey="product"
              dropDirection="down"
              placeholder="Scan barcode or search product / service"
              value={productSearch}
              onChange={updateProductSearch}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  addQuickItem(e.currentTarget.value);
                }
              }}
              options={productSearchOptions(salesItemFilter)}
            />
            <button type="button" onClick={() => addQuickItem()} title="Add product (F3)"><span className="hidden md:inline">F3</span><span className="md:hidden">+</span></button>
          </div>

          <div className="billing-pos-customer-card">
            <User size={28} />
            <div>
              <span>Customer</span>
              <SelectDropdown
                value={getEffectiveCustomer().name || 'Walk-in Customer'}
                onChange={(value) => {
                  const selected = customers.find((c) => c.name === value);
                  if (selected) selectCustomer(selected);
                  else setCustomer((prev) => ({ ...prev, name: value }));
                }}
                buttonClassName="billing-pos-customer-select"
                options={[
                  { value: 'Walk-in Customer', label: 'Walk-in Customer' },
                  ...customers.map((c) => ({ value: c.name, label: c.name })),
                ]}
              />
            </div>
            <button type="button" onMouseDown={focusPartyFieldFromPointer} onClick={focusPartyField} title={`Focus ${partyKindLower} field (+)`}>+</button>
          </div>
        </section>
      )}

      <div className="billing-workspace">

      {/* ── Customer / Billing / Shipping ── */}
      <div className="col-span-full bg-white border border-[#dfe7f1] rounded-lg px-4 py-3 mb-3">
        <div className={`grid grid-cols-1 gap-4 ${config.showPayment ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>

          {/* Customer */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-[#111827]">
              {partyKind} <span className="text-red-500">*</span>
            </label>
            <div
              className="billing-customer-picker relative"
              tabIndex={-1}
              onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setShowCustomerDrop(false); }}
            >
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none" />
                <input
                  data-fkey="party"
                  className="h-9 w-full border border-[#dbe4ef] rounded-sm bg-white pl-8 pr-9 text-[12.5px] text-[#111827] outline-none focus:border-blue-500 font-[inherit]"
                  placeholder={`Search by name, phone or GSTIN`}
                  value={showCustomerDrop ? customerQuery : getEffectiveCustomer().name}
                  onFocus={() => {
                    setCustomerQuery(getEffectiveCustomer().name || '');
                    setShowCustomerDrop(true);
                  }}
                  onClick={() => {
                    setCustomerQuery(getEffectiveCustomer().name || '');
                    setShowCustomerDrop(true);
                  }}
                  onChange={(e) => {
                    const value = e.target.value;
                    const lower = value.trim().toLowerCase();
                    setCustomerQuery(value);
                    if (!value.trim()) {
                      clearCustomer();
                      setCustomerQuery('');
                      setShowCustomerDrop(true);
                      return;
                    }
                    updateCustomer('name', value);
                    updateNewCustomer('name', value);
                    clearError('customerName');
                    setShowCustomerDrop(true);

                    const exact = customers.find((c) =>
                      (c.name || '').toLowerCase() === lower ||
                      (c.gstin || '').toLowerCase() === lower ||
                      (c.phone || '').toLowerCase() === lower,
                    );
                    if (exact) selectCustomer(exact);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === '+' || e.code === 'NumpadAdd') {
                      e.preventDefault();
                      focusPartyField();
                      return;
                    }
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setShowCustomerDrop(true);
                      setHighlightedCustomerIndex((index) => Math.min(visibleCustomers.length - 1, index < 0 ? 0 : index + 1));
                      return;
                    }
                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setShowCustomerDrop(true);
                      setHighlightedCustomerIndex((index) => Math.max(0, index < 0 ? visibleCustomers.length - 1 : index - 1));
                      return;
                    }
                    if (e.key === 'Enter' && visibleCustomers.length) {
                      e.preventDefault();
                      selectCustomer(visibleCustomers[Math.max(0, highlightedCustomerIndex)]);
                    }
                  }}
                />
                <button
                  type="button"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-sm border border-[#dbe4ef] bg-white text-blue-600 font-bold cursor-pointer leading-none"
                  onMouseDown={focusPartyFieldFromPointer}
                  onClick={focusPartyField}
                  title={`Focus ${partyKindLower} field (+)`}
                >
                  +
                </button>
              </div>

              {showCustomerDrop && (
                <>
                <button
                  type="button"
                  className="billing-customer-backdrop"
                  aria-label={`Close ${partyKindLower} list`}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    setShowCustomerDrop(false);
                  }}
                />
                <div className="billing-customer-dropdown">
                  <div className="billing-customer-dropdown-head">
                    <div>
                      <strong>Select {partyKind}</strong>
                      <span>{visibleCustomers.length ? `${visibleCustomers.length} matching ${partyKindLower}s` : `Search ${partyKindLower}s`}</span>
                    </div>
                    <button type="button" onPointerDown={(event) => { event.preventDefault(); setShowCustomerDrop(false); }} aria-label={`Close ${partyKindLower} list`}>
                      <X size={18} />
                    </button>
                  </div>
                  {visibleCustomers.length === 0 ? (
                    <div className="billing-customer-empty">No {partyKindLower}s found</div>
                  ) : (
                    visibleCustomers.map((c, index) => (
                      <button
                        key={c._id || c.id || c.phone || c.name}
                        ref={(node) => { customerOptionRefs.current[index] = node; }}
                        type="button"
                        className={index === highlightedCustomerIndex ? 'is-highlighted' : ''}
                        onMouseEnter={() => setHighlightedCustomerIndex(index)}
                        onClick={() => selectCustomer(c)}
                      >
                        <span>{c.name}</span>
                        <small>{[c.gstin, c.phone, c.city].filter(Boolean).join(' · ')}</small>
                      </button>
                    ))
                  )}
                  <button
                    type="button"
                    className="billing-customer-add-row"
                    onClick={openNewCustomerForm}
                  >
                    <UserPlus size={13} /> Add New {partyKind}
                  </button>
                </div>
                </>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-7 gap-y-1 text-[11px] font-semibold text-[#64748b]">
              <span>Phone: <b className="font-semibold text-[#94a3b8]">{getEffectiveCustomer().phone || '-'}</b></span>
              <span>Email: <b className="font-semibold text-[#94a3b8]">{getEffectiveCustomer().email || '-'}</b></span>
              <span>GSTIN: <b className="font-semibold text-[#94a3b8]">{getEffectiveCustomer().gstin || '-'}</b></span>
              <span>State: <b className="font-semibold text-[#475569]">{getEffectiveCustomer().state || BUSINESS_STATE}</b></span>
            </div>
          </div>

          {/* Billing Address */}
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-semibold text-[#111827]">Billing Address</label>
            <button
              type="button"
              onClick={openCustomerEditor}
              className="text-left border border-dashed border-[#dbe4ef] rounded-md px-3 py-2 min-h-[46px] hover:border-blue-400 cursor-pointer bg-[#fafbfe] font-[inherit] flex items-center justify-between gap-2"
            >
              {getEffectiveCustomer().address || getEffectiveCustomer().city ? (
                <span className="text-[13px] text-[#374151]">{[getEffectiveCustomer().address, getEffectiveCustomer().city, getEffectiveCustomer().state, getEffectiveCustomer().pincode].filter(Boolean).join(', ')}</span>
              ) : (
                <span className="text-[13px] text-[#94a3b8]">Click to add billing address</span>
              )}
              <Pencil size={13} className="flex-none text-[#94a3b8]" />
            </button>
          </div>

          {/* Shipping Address */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <label className="text-[13px] font-semibold text-[#111827]">Shipping Address</label>
              <label className="flex items-center gap-1.5 text-[11px] text-[#536173] cursor-pointer">
                <input type="checkbox" className="w-3.5 h-3.5 accent-blue-600" checked={sameShipping} onChange={(e) => setSameShipping(e.target.checked)} />
                Same as billing
              </label>
            </div>
            {sameShipping ? (
              <div className="border border-dashed border-[#dbe4ef] rounded-md px-3 py-2 min-h-[46px] bg-[#fafbfe] text-[13px] text-[#94a3b8] flex items-center">Same as billing address</div>
            ) : (
              <div className="flex flex-col gap-2 border border-[#dbe4ef] rounded-lg p-3 bg-white">
                <input className={cx.input} placeholder="Street / Building" value={shipping.address} onChange={(e) => setShipping((p) => ({ ...p, address: e.target.value }))} />
                <div className="grid grid-cols-2 gap-2">
                  <input className={cx.input} placeholder="City" value={shipping.city} onChange={(e) => setShipping((p) => ({ ...p, city: e.target.value }))} />
                  <input className={cx.input} maxLength={6} placeholder="PIN Code" value={shipping.pincode} onChange={(e) => setShipping((p) => ({ ...p, pincode: e.target.value }))} />
                </div>
                <SelectDropdown buttonClassName={cx.select} value={shipping.state} onChange={(v) => setShipping((p) => ({ ...p, state: v }))} options={INDIAN_STATES} />
              </div>
            )}
          </div>

        </div>

        <div className="mt-3 border-t border-[#edf2f7] pt-2">
          <button
            type="button"
            onClick={() => setShowMoreDetails((v) => !v)}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#374151] cursor-pointer bg-transparent border-0 p-0 font-[inherit]"
          >
            More Details
            <ChevronDown size={14} className={`text-[#94a3b8] transition-transform ${showMoreDetails ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {showMoreDetails && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {config.showDueDate && (
              <div className={cx.field}>
                <label className={cx.label}>Due Date <span className="text-[10px] text-[#94a3b8] font-normal ml-1">(optional)</span></label>
                <input className={cx.input} type="date" value={docMeta.dueDate} onChange={(e) => updateMeta('dueDate', e.target.value)} />
              </div>
            )}
            {config.showValidTill && (
              <div className={cx.field}>
                <label className={cx.label}>Valid Till <span className="text-[10px] text-amber-600 font-normal ml-1">(recommended)</span></label>
                <input data-fkey="valid-till" className={errors.validTill ? cx.inputError : cx.input} type="date" value={docExtra.validTill} onChange={(e) => { updateExtra('validTill', e.target.value); clearError('validTill'); }} />
                {errors.validTill && <p className="text-[11px] text-amber-700 flex items-center gap-1">⚠ {errors.validTill}</p>}
              </div>
            )}
            {config.showExpectedDelivery && (
              <div className={cx.field}>
                <label className={cx.label}>Expected Delivery <span className="text-[10px] text-amber-600 font-normal ml-1">(recommended)</span></label>
                <input data-fkey="expected-delivery" className={errors.expectedDelivery ? cx.inputError : cx.input} type="date" value={docExtra.expectedDelivery} onChange={(e) => { updateExtra('expectedDelivery', e.target.value); clearError('expectedDelivery'); }} />
                {errors.expectedDelivery && <p className="text-[11px] text-amber-700 flex items-center gap-1">⚠ {errors.expectedDelivery}</p>}
              </div>
            )}
            {config.showDeliveryAddress && (
              <div className={cx.field}>
                <label className={cx.label}>Delivery Address</label>
                <input className={cx.input} placeholder="Delivery location (if different from billing)" value={docExtra.deliveryAddress} onChange={(e) => updateExtra('deliveryAddress', e.target.value)} />
              </div>
            )}
            <div className={cx.field}>
              <label className={cx.label}>PO / Reference No. <span className="text-[10px] text-[#94a3b8] font-normal ml-1">(optional)</span></label>
              <input className={cx.input} placeholder="PO or reference number" value={docMeta.poRef} onChange={(e) => updateMeta('poRef', e.target.value)} />
            </div>
            <div className={cx.field}>
              <label className={cx.label}>Cost Center <span className="text-[10px] text-[#94a3b8] font-normal ml-1">(optional)</span></label>
              <input className={cx.input} placeholder="Branch, department, or project" value={docExtra.costCenter} onChange={(e) => updateExtra('costCenter', e.target.value)} />
            </div>
            {config.showGst && (
              <>
                <div className={cx.field}>
                  <label className={cx.label}>Invoice Type</label>
                  <SelectDropdown buttonClassName={cx.select} value={docMeta.invoiceType} onChange={(v) => updateMeta('invoiceType', v)} options={INVOICE_TYPES} />
                </div>
                <div className={cx.field}>
                  <label className={cx.label}>Payment Terms</label>
                  <SelectDropdown buttonClassName={cx.select} value={docMeta.paymentTerms} onChange={(v) => updateMeta('paymentTerms', v)} options={PAYMENT_TERMS_LIST} />
                </div>
                <div className={cx.field}>
                  <label className={cx.label}>Place of Supply</label>
                  <SelectDropdown buttonClassName={cx.select} value={docMeta.placeOfSupply} onChange={(v) => updateMeta('placeOfSupply', v)} options={INDIAN_STATES} />
                </div>
                <div className={cx.field}>
                  <label className={cx.label}>GST Type</label>
                  <div className="flex rounded-md border border-[#dbe4ef] overflow-hidden">
                    <button className={cx.toggleBtn(supplyType === 'intrastate')} type="button" onClick={() => setSupplyType('intrastate')}>Intrastate</button>
                    <button className={cx.toggleBtn(supplyType === 'interstate')} type="button" onClick={() => setSupplyType('interstate')}>Interstate</button>
                  </div>
                </div>
                <label className="flex items-center justify-between cursor-pointer bg-[#fafbfe] rounded-md border border-[#edf2f7] px-3 py-2.5">
                  <div>
                    <div className="text-[13px] font-medium text-[#374151]">Reverse Charge (RCM)</div>
                    <div className="text-[11px] text-[#536173]">Tax payable by recipient</div>
                  </div>
                  <div
                    className={`w-10 h-5 rounded-full transition-colors cursor-pointer flex-none ${docMeta.rcm ? 'bg-blue-600' : 'bg-[#dbe4ef]'}`}
                    onClick={() => updateMeta('rcm', !docMeta.rcm)}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full mt-0.5 transition-transform ${docMeta.rcm ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                </label>
              </>
            )}
            {config.showIRN && (
              <>
                <div className={cx.field}>
                  <label className={cx.label}>IRN Number <span className="text-[10px] text-[#94a3b8] font-normal ml-1">(optional — paste after generation)</span></label>
                  <input data-fkey="irn" className={cx.input} placeholder="64-character IRN from IRP" value={docExtra.irnNumber} onChange={(e) => updateExtra('irnNumber', e.target.value)} />
                </div>
                <div className={cx.field}><label className={cx.label}>ACK Number</label><input className={cx.input} placeholder="ACK No." value={docExtra.ackNumber} onChange={(e) => updateExtra('ackNumber', e.target.value)} /></div>
                <div className={cx.field}><label className={cx.label}>ACK Date</label><input className={cx.input} type="date" value={docExtra.ackDate} onChange={(e) => updateExtra('ackDate', e.target.value)} /></div>
              </>
            )}
            {documentType === 'e-way-bill' && (
              <a
                href="https://ewaybillgst.gov.in"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 no-underline w-fit"
              >
                <svg fill="none" height="12" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="12"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
                Open EWB Portal →
              </a>
            )}
          </div>
        )}
      </div>

      {/* ── Document Card ── */}
      <div className="billing-document-card bg-white border border-[#dfe7f1] rounded-lg">


        {/* ── Original Invoice Ref (credit / debit notes) ── */}
        {config.showOriginalRef && (
          <div className="px-6 py-5 border-b border-[#edf2f7]">
            <h3 className="m-0 text-[15px] font-semibold mb-4">{documentType === 'supplier-return' ? 'Purchase Reference & Return Reason' : documentType === 'sales-return' ? 'Sales Invoice Reference & Return Reason' : 'Original Invoice Reference'}</h3>
            {documentType === 'sales-return' && <SalesReturnInvoice invoiceId={docExtra.originalSalesId} returnId={invoiceId} onSelect={(invoice) => {
              setCustomer(normalizeCustomer(invoice.customer || {}));
              setSupplyType(invoice.supplyType || 'intrastate');
              setItems(invoice.items.filter((item) => item.remainingQty > 0).map((item, index) => ({ ...normalizeInvoiceLineItem(item, index), id: index + 1, qty: item.remainingQty,
                discount: item.discountType === 'amount' ? (Number(item.rate) * Number(item.qty) > 0 ? Number(item.discount) / (Number(item.rate) * Number(item.qty)) * 100 : 0) : Number(item.discount || 0), discountType: 'percent' })));
              nextItemId.current = invoice.items.length + 1;
              setCharges([]);
              setAddDiscount({ type: 'percent', value: invoice.returnDiscountPercent || '' });
              setTds((prev) => ({ ...prev, enabled: false }));
              setTcs((prev) => ({ ...prev, enabled: false }));
              setDocExtra((prev) => ({ ...prev, originalSalesId: invoice._id, originalInvoiceNo: invoice.number, originalInvoiceDate: invoice.meta?.date || '' }));
              clearError('originalInvoiceNo');
              clearError('items');
            }} />}
            {documentType === 'supplier-return' && <SupplierReturnPurchase purchaseId={docExtra.originalPurchaseId} returnId={invoiceId} onSelect={(purchase) => {
              setCustomer(normalizeCustomer(purchase.customer || {}));
              setSupplyType(purchase.supplyType || 'intrastate');
              setItems(purchase.items.filter((item) => item.remainingQty > 0).map((item, index) => ({ ...normalizeInvoiceLineItem(item, index), id: index + 1, qty: item.remainingQty,
                discount: item.discountType === 'amount' ? (Number(item.rate) * Number(item.qty) > 0 ? Number(item.discount) / (Number(item.rate) * Number(item.qty)) * 100 : 0) : Number(item.discount || 0), discountType: 'percent' })));
              nextItemId.current = purchase.items.length + 1;
              setCharges([]);
              setAddDiscount({ type: 'percent', value: purchase.returnDiscountPercent || '' });
              setTds((prev) => ({ ...prev, enabled: false }));
              setTcs((prev) => ({ ...prev, enabled: false }));
              setDocExtra((prev) => ({ ...prev, originalPurchaseId: purchase._id, originalInvoiceNo: purchase.number, originalInvoiceDate: purchase.meta?.date || '', vendorInvoiceNo: purchase.extra?.vendorInvoiceNo || '' }));
              clearError('originalInvoiceNo');
              clearError('items');
            }} />}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {documentType === 'sales-return' ? (
                <div className={cx.field}>
                  <label className={cx.label}>{config.reasonLabel} <span className="text-red-500 ml-0.5">*</span></label>
                  <input data-fkey="reason" className={errors.reason ? cx.inputError : cx.input} placeholder="Reason for return" value={docExtra.reason} onChange={(e) => { updateExtra('reason', e.target.value); clearError('reason'); }} />
                  {errors.reason && <p className="text-[11px] text-red-600 flex items-center gap-1">! {errors.reason}</p>}
                </div>
              ) : (
                <>
              {documentType !== 'supplier-return' && (
                <>
              <div className={cx.field}>
                <label className={cx.label}>Original Invoice No. <span className="text-[10px] text-amber-600 font-normal ml-1">(recommended)</span></label>
                <input readOnly={documentType === 'supplier-return'} data-fkey="ref-invoice" className={errors.originalInvoiceNo ? 'border border-amber-400 bg-amber-50 rounded-md px-3 py-2 text-[13px] text-[#111827] w-full outline-none font-[inherit]' : cx.input} placeholder="e.g. INV-0001" value={docExtra.originalInvoiceNo} onChange={(e) => { updateExtra('originalInvoiceNo', e.target.value); clearError('originalInvoiceNo'); }} />
                {errors.originalInvoiceNo && <p className="text-[11px] text-amber-700 flex items-center gap-1">⚠ {errors.originalInvoiceNo}</p>}
              </div>
                </>
              )}
              <div className={`${cx.field} ${documentType === 'supplier-return' ? 'hidden' : ''}`}>
                <label className={cx.label}>Original Invoice Date <span className="text-[10px] text-[#94a3b8] font-normal ml-1">(optional)</span></label>
                <input readOnly={documentType === 'supplier-return'} className={cx.input} type="date" value={docExtra.originalInvoiceDate} onChange={(e) => updateExtra('originalInvoiceDate', e.target.value)} />
              </div>
              <div className={`${cx.field} ${documentType === 'supplier-return' ? 'sm:col-span-3' : ''}`}>
                <label className={cx.label}>{config.reasonLabel} <span className="text-red-500 ml-0.5">*</span></label>
                <input data-fkey="reason" className={errors.reason ? cx.inputError : cx.input} placeholder="Reason for issuing this note" value={docExtra.reason} onChange={(e) => { updateExtra('reason', e.target.value); clearError('reason'); }} />
                {errors.reason && <p className="text-[11px] text-red-600 flex items-center gap-1">⚠ {errors.reason}</p>}
              </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Transport Details ── */}
        {config.showTransport && (
          <div className="px-6 py-5 border-b border-[#edf2f7]">
            <h3 className="m-0 text-[15px] font-semibold mb-3">Transport Details</h3>
            {config.showEWayBillFields && (
              <div className="mb-4 flex items-start gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
                <svg className="flex-none text-blue-500 mt-0.5" fill="none" height="15" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="15"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                <div className="text-[12.5px] text-blue-800 leading-snug">
                  Fill the details below and save this record. Then visit the{' '}
                  <a href="https://ewaybillgst.gov.in" target="_blank" rel="noopener noreferrer" className="font-semibold underline text-blue-700">
                    official EWB portal
                  </a>
                  {' '}to generate your E-Way Bill number, and paste it back here.
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className={cx.field}>
                <label className={cx.label}>Vehicle Number {config.showEWayBillFields && <span className="text-red-500 ml-0.5">*</span>}</label>
                <input data-fkey="vehicle" className={errors.vehicleNumber ? cx.inputError : cx.input} placeholder="TN 01 AB 1234" value={docExtra.vehicleNumber} onChange={(e) => { updateExtra('vehicleNumber', e.target.value); clearError('vehicleNumber'); }} />
                {errors.vehicleNumber && <p className="text-[11px] text-red-600 flex items-center gap-1">⚠ {errors.vehicleNumber}</p>}
              </div>
              <div className={cx.field}>
                <label className={cx.label}>Driver Name <span className="text-[10px] text-[#94a3b8] font-normal ml-1">(optional)</span></label>
                <input className={cx.input} placeholder="Driver's name" value={docExtra.driverName} onChange={(e) => updateExtra('driverName', e.target.value)} />
              </div>
              <div className={cx.field}>
                <label className={cx.label}>Transporter {config.showEWayBillFields && <span className="text-red-500 ml-0.5">*</span>}</label>
                <input data-fkey="transporter" className={errors.transporter ? cx.inputError : cx.input} placeholder="Transport company name" value={docExtra.transporter} onChange={(e) => { updateExtra('transporter', e.target.value); clearError('transporter'); }} />
                {errors.transporter && <p className="text-[11px] text-red-600 flex items-center gap-1">⚠ {errors.transporter}</p>}
              </div>
            </div>
            {config.showEWayBillFields && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                <div className={cx.field}>
                  <label className={cx.label}>Transporter GSTIN <span className="text-[10px] text-[#94a3b8] font-normal ml-1">(optional)</span></label>
                  <input className={cx.input} maxLength={15} placeholder="15-digit GSTIN" value={docExtra.transporterId} onChange={(e) => updateExtra('transporterId', e.target.value.toUpperCase())} />
                </div>
                <div className={cx.field}>
                  <label className={cx.label}>Distance (KM) <span className="text-red-500 ml-0.5">*</span></label>
                  <input data-fkey="distance" className={errors.distanceKm ? cx.inputError : cx.input} min="0" placeholder="0" type="number" value={docExtra.distanceKm} onChange={(e) => { updateExtra('distanceKm', e.target.value); clearError('distanceKm'); }} />
                  {errors.distanceKm && <p className="text-[11px] text-red-600 flex items-center gap-1">⚠ {errors.distanceKm}</p>}
                </div>
                <div className={cx.field}><label className={cx.label}>Supply Type</label><SelectDropdown buttonClassName={cx.select} value={docExtra.ewbSupplyType} onChange={(v) => updateExtra('ewbSupplyType', v)} options={[{ value: 'outward', label: 'Outward' }, { value: 'inward', label: 'Inward' }]} /></div>
              </div>
            )}
          </div>
        )}

        {/* ── Items & Services ── */}
        {documentType === 'supplier-return' || documentType === 'sales-return' ? (
          <div className="px-6 py-5 border-b border-[#edf2f7] overflow-x-auto">
            <h3 className="mb-3 text-sm font-semibold">Items to return</h3>
            <table className="w-full text-left text-sm"><thead><tr><th>Item / variant</th><th>Return quantity</th><th>{documentType === 'supplier-return' ? 'Purchase rate' : 'Invoice rate'}</th><th>Discount %</th><th>GST %</th><th /></tr></thead>
              <tbody>{items.filter((item) => item.description).map((item) => <tr key={item.id}>
                <td className="py-3">{item.description} {item.size}</td>
                <td><input aria-label={`Return quantity for ${item.description}`} className="w-24 rounded border border-slate-200 p-2" type="number" min="0.001" step="any" value={item.qty} onChange={(event) => updateItem(item.id, 'qty', event.target.value)} /></td>
                <td>{formatCurrency(item.rate)}</td><td>{Number(item.discount || 0).toFixed(2)}</td><td>{item.gstRate}</td>
                <td><button type="button" className="text-red-600" onClick={() => removeItem(item.id)}>Remove</button></td>
              </tr>)}</tbody>
            </table>
            {!items.some((item) => item.description) && documentType !== 'supplier-return' && <p className="text-sm text-slate-500">Select an original sales invoice above to load returnable items.</p>}
            {errors.items && <p role="alert" className="text-sm text-red-600">{errors.items}</p>}
          </div>
        ) : <div className="billing-items-panel px-6 py-5 border-b border-[#edf2f7]">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="w-full max-w-[220px]">
              <label className="mb-1.5 block text-[12px] font-semibold uppercase text-[#0f172a]">Item Type</label>
              <SelectDropdown
                value={salesItemFilter}
                onChange={setQuickItemType}
                buttonClassName="!h-10 !rounded-md !border-[#dbe4ef] !bg-white !px-3 !text-[13px]"
                options={SALES_ITEM_FILTER_OPTIONS}
              />
            </div>
            <div className="billing-bulk-controls md:ml-auto">
              <div className="billing-bulk-field billing-discount-field">
                <label htmlFor="overall-discount">Discount</label>
                <div className="billing-discount-control">
                  <input
                    id="overall-discount"
                    data-fkey="overall-discount"
                    className="billing-bulk-input"
                    type="number"
                    min="0"
                    max={addDiscount.type === 'percent' ? '100' : undefined}
                    value={addDiscount.value}
                    onChange={(e) => setAddDiscount((prev) => ({ ...prev, value: e.target.value }))}
                    placeholder="0"
                  />
                  <SelectDropdown
                    value={addDiscount.type || 'percent'}
                    onChange={(v) => setAddDiscount((prev) => ({ ...prev, type: v }))}
                    buttonClassName="billing-discount-type"
                    options={[{ value: 'percent', label: '%' }, { value: 'amount', label: 'Amt' }]}
                  />
                </div>
              </div>
              {config.showGst && (
                <>
                  <div className="billing-bulk-field billing-tax-field">
                    <label htmlFor="bulk-gst-rate">Tax</label>
                    <input
                      id="bulk-gst-rate"
                      className="billing-bulk-input"
                      type="number"
                      min="0"
                      value={bulkGstRate}
                      onChange={(e) => setBulkGstRate(e.target.value)}
                      placeholder="%"
                    />
                  </div>
                  <button
                    type="button"
                    className="billing-apply-all-btn"
                    onClick={applyQuickValuesToAllItems}
                  >
                    Apply to all items
                  </button>
                </>
              )}
            </div>
          </div>

          <div className={`billing-product-detail-row ${isPurchaseFashionDocument ? 'purchase-fashion-grid' : ''} ${quickProductVariants.length > 0 ? 'has-model' : 'no-model'} ${config.showGst ? 'has-tax' : 'no-tax'}`}>
            <div className="billing-product-field billing-product-name-field">
              <label>{quickProductLabel} <span className="max-md:hidden">F6</span></label>
              <div className="billing-quick-product-entry">
                <AutocompleteInput
                  data-fkey="product"
                  className="min-w-0"
                  dropDirection="down"
                  enterKeyHint="done"
                  inputMode="search"
                  placeholder={quickProductPlaceholder}
                  value={productSearch}
                  onChange={updateProductSearch}
                  dropdownClassName="billing-product-suggestions-dropdown"
                  onSelect={(v) => applyQuickProductSelection(v)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.stopPropagation();
                      await addQuickItem(e.currentTarget.value);
                    }
                  }}
                  options={productSearchOptions(salesItemFilter)}
                />
                <button
                  type="button"
                  className="billing-quick-enter-btn"
                  onClick={() => addQuickItem(productSearch)}
                  title="Enter"
                >
                  Enter
                </button>
              </div>
            </div>
            {isPurchaseFashionDocument ? (
              <>
                <div className="billing-product-field">
                  <label>Brand</label>
                  <button
                    type="button"
                    data-fkey="quick-brand"
                    className="flex h-full w-full items-center justify-between gap-2 border-0 bg-white px-3 text-left text-[13px] text-[#111827] outline-none font-[inherit] hover:bg-blue-50 focus:bg-blue-50"
                    onClick={() => openBrandPicker({
                      mode: 'quick',
                      product: quickMatchedProduct,
                      value: quickItem.brand || '',
                      options: uniqueTextParts([...inlineProductBrands, ...variantAttrOptions(quickProductVariants, 'brand')]),
                    })}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter' && e.key !== ' ') return;
                      e.preventDefault();
                      e.stopPropagation();
                      openBrandPicker({
                        mode: 'quick',
                        product: quickMatchedProduct,
                        value: quickItem.brand || '',
                        options: uniqueTextParts([...inlineProductBrands, ...variantAttrOptions(quickProductVariants, 'brand')]),
                      });
                    }}
                  >
                    <span className={`truncate ${quickItem.brand ? '' : 'text-[#94a3b8]'}`}>{quickItem.brand || 'Brand'}</span>
                    <span className="text-[#64748b]">&rsaquo;</span>
                  </button>
                </div>
                <div className="billing-product-field">
                  <label>Size</label>
                  <button
                    type="button"
                    data-fkey="quick-size"
                    className="flex h-full w-full items-center justify-between gap-2 border-0 bg-white px-3 text-left text-[13px] text-[#111827] outline-none font-[inherit] hover:bg-blue-50 focus:bg-blue-50"
                    onClick={() => openSizePicker({
                      mode: 'quick',
                      product: quickMatchedProduct,
                      value: quickItem.size || '',
                      options: allFashionSizeOptions,
                    })}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter' && e.key !== ' ') return;
                      e.preventDefault();
                      e.stopPropagation();
                      openSizePicker({
                        mode: 'quick',
                        product: quickMatchedProduct,
                        value: quickItem.size || '',
                        options: allFashionSizeOptions,
                      });
                    }}
                  >
                    <span className={`truncate ${quickItem.size ? '' : 'text-[#94a3b8]'}`}>{quickItem.size || 'Size'}</span>
                    <span className="text-[#64748b]">&rsaquo;</span>
                  </button>
                </div>
                <div className="billing-product-field">
                  <label>Material</label>
                  <button
                    type="button"
                    data-fkey="quick-material"
                    className="flex h-full w-full items-center justify-between gap-2 border-0 bg-white px-3 text-left text-[13px] text-[#111827] outline-none font-[inherit] hover:bg-blue-50 focus:bg-blue-50"
                    onClick={() => openMaterialPicker({
                      mode: 'quick',
                      product: quickMatchedProduct,
                      value: quickItem.material || '',
                      options: variantAttrOptions(quickProductVariants, 'material'),
                    })}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter' && e.key !== ' ') return;
                      e.preventDefault();
                      e.stopPropagation();
                      openMaterialPicker({
                        mode: 'quick',
                        product: quickMatchedProduct,
                        value: quickItem.material || '',
                        options: variantAttrOptions(quickProductVariants, 'material'),
                      });
                    }}
                  >
                    <span className={`truncate ${quickItem.material ? '' : 'text-[#94a3b8]'}`}>{quickItem.material || 'Material'}</span>
                    <span className="text-[#64748b]">&rsaquo;</span>
                  </button>
                </div>
              </>
            ) : (
            <div className="billing-product-field">
              <label>Description</label>
              <input
                data-fkey="quick-itemDescription"
                placeholder="Item description"
                value={quickItem.itemDescription || ''}
                onChange={(e) => updateQuickItem('itemDescription', e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    focusQuickItemField('hsn');
                  }
                }}
              />
            </div>
            )}
            <div className="billing-product-field">
              <label>HSN / SAC</label>
              <AutocompleteInput
                data-fkey="quick-hsn"
                placeholder={quickItem.itemType === 'Service' ? 'SAC' : 'HSN'}
                value={quickItem.hsn}
                onChange={(v) => updateQuickItem('hsn', v)}
                onKeyDown={(e) => handleQuickItemStep(e, quickProductVariants.length ? 'model' : 'qty')}
              />
            </div>
            {!isPurchaseFashionDocument && quickProductVariants.length > 0 && (
              <div className="billing-product-field">
                <label>{quickVariantLabel}</label>
                <SelectDropdown
                  data-fkey="quick-model"
                  value={quickItem.size || ''}
                  onChange={(v) => {
                    selectQuickItemVariant(quickMatchedProduct, v);
                    focusQuickItemField('qty');
                  }}
                  placeholder={quickVariantPlaceholder}
                  selectedLabelClassName="text-left whitespace-nowrap overflow-hidden text-ellipsis"
                  optionLabelClassName="w-full min-w-0"
                  menuClassName="!w-72 !right-auto"
                  searchable
                  allowCustom
                  customLabel="Manual size"
                  options={quickProductVariants.map(variantDropdownOption)}
                />
              </div>
            )}
            <div className="billing-product-field">
              <label>Qty</label>
              <AutocompleteInput
                data-fkey="quick-qty"
                min="0"
                type="number"
                value={String(quickItem.qty ?? '')}
                onChange={(v) => updateQuickItem('qty', v)}
                onKeyDown={(e) => handleQuickItemStep(e, 'unit')}
              />
            </div>
            <div className="billing-product-field">
              <label>Unit</label>
              <AutocompleteInput
                data-fkey="quick-unit"
                value={quickItem.unit}
                onChange={(v) => updateQuickItem('unit', v)}
                onKeyDown={(e) => handleQuickItemStep(e, 'rate')}
              />
            </div>
            <div className="billing-product-field">
              <label>Rate (₹)</label>
              <AutocompleteInput
                data-fkey="quick-rate"
                min="0"
                type="number"
                value={String(quickItem.rate ?? '')}
                onChange={(v) => updateQuickItem('rate', v)}
                onKeyDown={(e) => handleQuickItemStep(e, 'discount')}
              />
            </div>
            {config.showGst && isPurchaseFashionDocument && (
              <div className="billing-product-field">
                <label>Tax (%)</label>
                <AutocompleteInput
                  data-fkey="quick-gstRate"
                  min="0"
                  type="number"
                  value={String(quickItem.gstRate ?? '')}
                  onChange={(v) => updateQuickItem('gstRate', v)}
                  onKeyDown={(e) => handleQuickItemStep(e, 'add')}
                />
              </div>
            )}
            {!isPurchaseFashionDocument && <div className="billing-product-field billing-product-discount-field">
              <label>Discount %</label>
              <AutocompleteInput
                data-fkey="quick-discount"
                min="0"
                max="100"
                type="number"
                value={String(quickItem.discount ?? '')}
                onChange={(v) => updateQuickItem('discount', v)}
                onKeyDown={(e) => handleQuickItemStep(e, config.showGst ? 'gstRate' : 'add')}
              />
            </div>}
            {config.showGst && !isPurchaseFashionDocument && (
              <div className="billing-product-field">
                <label>Tax (%)</label>
                <AutocompleteInput
                  data-fkey="quick-gstRate"
                  min="0"
                  type="number"
                  value={String(quickItem.gstRate ?? '')}
                  onChange={(v) => updateQuickItem('gstRate', v)}
                  onKeyDown={(e) => handleQuickItemStep(e, 'add')}
                />
              </div>
            )}
            <button data-fkey="quick-add" type="button" className="billing-add-item-inline-btn billing-add-item-icon-btn" onClick={() => addQuickItem()} title="Add item">
              Add Item <span>↵</span>
            </button>
          </div>

          {effectiveItems.length === 0 && (
            <div className="py-12 border border-dashed border-[#dbe4ef] rounded-lg bg-[#fafbfe]" />
          )}

          {effectiveItems.length > 0 && (
          <div className="md:hidden flex flex-col gap-3">
            {effectiveItems.map((item, idx) => {
              const line = calcLine(item);
              const matchedProduct = findCatalogProductForItem(products, item);
              const variants = matchedProduct?.variants || [];
              const isService = (matchedProduct?.itemType || item.itemType) === 'Service';
              const variantLabel = variantColumnLabel(matchedProduct);

              return (
                <div key={item.id} className="border border-[#dbe4ef] rounded-lg p-3.5 bg-white flex flex-col gap-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11px] font-semibold text-[#94a3b8] pt-1.5">#{idx + 1}</span>
                    <button
                      className="w-7 h-7 flex-none text-red-400 bg-transparent border-0 text-lg cursor-pointer rounded hover:bg-red-50 hover:text-red-700 font-[inherit]"
                      title="Remove"
                      type="button"
                      onClick={() => {
                        if (item.id === '__quick_draft__') {
                          setProductSearch('');
                          resetQuickItem();
                        } else {
                          removeItem(item.id);
                        }
                      }}
                    >
                      ×
                    </button>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold uppercase text-[#94a3b8]">Product Name</label>
                    {allowManualItemDescription ? (
                      <>
                        <AutocompleteInput
                          dropDirection="down"
                          inputClassName={`${!item.description && errors.items ? 'border-red-400 bg-red-50' : ''}`}
                          enterKeyHint="done"
                          inputMode="search"
                          placeholder="Type item name..."
                          value={item.description}
                          onChange={(value) => {
                            if (!value) {
                              clearItemFields(item.id);
                              clearError('items');
                              return;
                            }
                            const chosen = findProductByExactEntry(products, value);
                            if (chosen) {
                              selectProduct(item.id, chosen);
                            } else {
                              updateItem(item.id, 'description', value);
                            }
                            clearError('items');
                          }}
                          onKeyDown={async (e) => {
                            if (!isProductCommitKey(e)) return;
                            const value = e.currentTarget.value.trim();
                            if (!value) return;
                            e.preventDefault();
                            e.stopPropagation();
                            await handleRowProductEntry(item.id, value);
                            clearError('items');
                          }}
                          options={productSearchOptions(item.itemType)}
                        />
                        <div className="flex items-center gap-1 mt-0.5">
                          {(matchedProduct?.productType === 'Bundle' || item.productType === 'Bundle') && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] border border-green-200 bg-green-50 text-green-700 font-semibold">
                              Bundle / Kit{bundleItemCount(matchedProduct) ? `: ${bundleItemCount(matchedProduct)} items` : ''}
                            </span>
                          )}
                        </div>
                      </>
                    ) : (
                      <SelectDropdown
                        buttonClassName={`w-full border ${!item.description && errors.items ? 'border-red-400 bg-red-50' : 'border-[#dbe4ef]'} rounded px-2.5 py-2 text-[13px] text-[#111827] font-[inherit] outline-none bg-white focus:border-blue-500`}
                        value={item.description}
                        onChange={(v) => {
                          const chosen = findProductByScan(products, v);
                          if (chosen) {
                            selectProduct(item.id, chosen);
                          } else {
                            updateItem(item.id, 'description', '');
                          }
                          clearError('items');
                        }}
                        placeholder="Select product..."
                        options={productSearchOptions(item.itemType)}
                      />
                    )}
                  </div>

                  {variants.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold uppercase text-[#94a3b8]">{variantLabel}</label>
                      <SelectDropdown
                        buttonClassName={`w-full border ${errors[`item_size_${idx}`] ? 'border-red-400 bg-red-50' : 'border-[#dbe4ef]'} rounded px-2.5 py-2 text-[13px] text-[#111827] font-[inherit] outline-none bg-[#f8fafc] focus:border-blue-500 opacity-100 cursor-default`}
                        value={item.size || ''}
                        onChange={(v) => {
                          selectItemVariant(item.id, matchedProduct, v);
                          setErrors((p) => { const n = { ...p }; delete n[`item_size_${idx}`]; return n; });
                        }}
                        disabled={!['purchase-entry', 'purchase-order'].includes(documentType)}
                        hideChevron={!['purchase-entry', 'purchase-order'].includes(documentType)}
                        placeholder="—"
                        selectedLabelClassName="text-left whitespace-nowrap overflow-hidden text-ellipsis"
                        optionLabelClassName="w-full min-w-0"
                        menuClassName="!w-72 !right-auto"
                        searchable
                        allowCustom
                        customLabel="Manual size"
                        options={variants.map(variantDropdownOption)}
                      />
                    </div>
                  )}
                  {!variants.length && matchedProduct?.productType === 'Bundle' && (
                    <span className="text-[12px] font-medium text-green-700">{bundleItemCount(matchedProduct) || 'Kit'} bundle items</span>
                  )}
                  {!variants.length && matchedProduct && matchedProduct.productType !== 'Bundle' && !isService && (
                    <span className={`text-[12px] font-medium ${stockTextClass(Number(matchedProduct.stock || 0), matchedProduct.minStockLevel)}`}>{Number(matchedProduct.stock || 0)} in stock</span>
                  )}

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold uppercase text-[#94a3b8]">Description</label>
                    <textarea
                      className="w-full border border-[#dbe4ef] rounded px-2.5 py-2 text-[13px] text-[#111827] font-[inherit] outline-none focus:border-blue-500 resize-y"
                      placeholder="One point per line..."
                      rows={2}
                      value={item.itemDescription ?? ''}
                      onChange={(e) => updateItem(item.id, 'itemDescription', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold uppercase text-[#94a3b8]">{item.itemType === 'Service' ? 'SAC' : 'HSN'}</label>
                      <AutocompleteInput value={item.hsn} onChange={(v) => updateItem(item.id, 'hsn', v)} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold uppercase text-[#94a3b8]">Unit</label>
                      <AutocompleteInput value={item.unit} onChange={(v) => updateItem(item.id, 'unit', v)} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold uppercase text-[#94a3b8]">Qty</label>
                      <AutocompleteInput inputClassName={`!text-right ${errors[`item_qty_${idx}`] ? 'border-red-400 bg-red-50' : ''}`} min="0" type="number" value={String(item.qty ?? '')} onChange={(v) => { updateItem(item.id, 'qty', v); setErrors((p) => { const n = { ...p }; delete n[`item_qty_${idx}`]; return n; }); }} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold uppercase text-[#94a3b8]">Rate (₹)</label>
                      <AutocompleteInput inputClassName={`!text-right ${errors[`item_rate_${idx}`] ? 'border-red-400 bg-red-50' : ''}`} min="0" type="number" value={String(item.rate ?? '')} onChange={(v) => { updateItem(item.id, 'rate', v); setErrors((p) => { const n = { ...p }; delete n[`item_rate_${idx}`]; return n; }); }} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold uppercase text-[#94a3b8]">Discount %</label>
                      <AutocompleteInput inputClassName="!text-right" min="0" max="100" type="number" value={String(item.discount ?? 0)} onChange={(v) => updateItem(item.id, 'discount', v)} />
                    </div>
                    {config.showGst && (
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold uppercase text-[#94a3b8]">Tax %</label>
                        <AutocompleteInput inputClassName="billing-gst-rate-input !text-right" type="number" min="0" value={String(item.gstRate ?? 0)} onChange={(v) => updateItem(item.id, 'gstRate', v)} />
                      </div>
                    )}
                    {config.showGst && (
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold uppercase text-[#94a3b8]">Tax (₹)</label>
                        <div className="px-2.5 py-2 text-[13px] text-[#536173] text-right">{formatCurrency(line.gstAmt)}</div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-[#f3f4f6]">
                    <span className="text-[11px] text-[#94a3b8]">Amount</span>
                    <span className="text-[15px] font-bold text-[#111827]">{formatCurrency(config.showGst ? line.total : line.taxable)}</span>
                  </div>
                </div>
              );
            })}
          </div>
          )}

          {effectiveItems.length > 0 && (
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {(isPurchaseFashionDocument ? [
                    { w: '4%',  label: '#',                 align: 'center' },
                    { w: '15%', label: 'Product / Service', align: 'left' },
                    { w: '12%', label: 'Brand',             align: 'left' },
                    { w: '10%', label: 'Size',              align: 'left' },
                    { w: '13%', label: 'Material',          align: 'left' },
                    { w: '10%', label: 'HSN / SAC',         align: 'left' },
                    { w: '6%',  label: 'Qty',               align: 'right' },
                    { w: '7%',  label: 'Unit',              align: 'left' },
                    { w: '7%',  label: 'Rate',              align: 'right' },
                    ...(config.showGst ? [
                      { w: '6%',  label: 'Tax %',             align: 'right' },
                      { w: '7%',  label: 'Tax (₹)',           align: 'right' },
                    ] : []),
                    { w: '3%',  label: '',                  align: 'center' },
                  ] : config.showGst ? [
                    { w: '5%',  label: '#',                 align: 'center' },
                    { w: '15%', label: 'Product / Service', align: 'left' },
                    { w: '8%',  label: isElectronicsRetail ? 'Model' : 'Size / Model Name', align: 'left' },
                    { w: '16%', label: 'Description', align: 'left' },
                    { w: '8%',  label: 'HSN / SAC',        align: 'left' },
                    { w: '6%',  label: 'Qty',               align: 'right' },
                    { w: '8%',  label: 'Unit',              align: 'left' },
                    { w: '7%',  label: 'Rate (₹)',          align: 'right' },
                    { w: '6%',  label: 'Discount %',         align: 'right' },
                    { w: '6%',  label: 'Tax %',             align: 'left' },
                    { w: '7%',  label: 'Tax (₹)',           align: 'right' },
                    { w: '8%',  label: 'Amount (₹)',        align: 'right' },
                    { w: '4%',  label: '',                  align: 'center' },
                  ] : [
                    { w: '5%',  label: '#',                 align: 'center' },
                    { w: '20%', label: 'Product / Service', align: 'left' },
                    { w: '9%',  label: isElectronicsRetail ? 'Model' : 'Size / Model Name', align: 'left' },
                    { w: '22%', label: 'Description', align: 'left' },
                    { w: '11%', label: 'HSN / SAC',        align: 'left' },
                    { w: '8%',  label: 'Qty',               align: 'right' },
                    { w: '9%',  label: 'Unit',              align: 'left' },
                    { w: '9%',  label: 'Rate (₹)',          align: 'right' },
                    { w: '7%',  label: 'Discount %',         align: 'right' },
                    { w: '11%', label: 'Amount (₹)',        align: 'right' },
                    { w: '4%',  label: '',                  align: 'center' },
                  ]).map((col, i) => (
                    <th
                      key={i}
                      className={`text-xs font-semibold uppercase text-[#536173] pb-2 px-2 whitespace-nowrap overflow-hidden text-ellipsis ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                      style={{ width: col.w }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody onKeyDown={handleItemKeyDown}>
                {effectiveItems.map((item, idx) => {
                  const line = calcLine(item);
                  const matchedProductForRow = findCatalogProductForItem(products, item);

                  return (
                    <tr key={item.id}>
                      <td className="border-t border-[#edf2f7] py-2 px-2 align-top text-center text-[#536173] text-xs pt-3">{idx + 1}</td>

                      {/* Existing product suggestions live in the item-name input while preserving manual entry. */}
                      <td className="border-t border-[#edf2f7] py-2 px-2 align-top">
                        {allowManualItemDescription ? (
                          <>
                            <AutocompleteInput
                              data-row={idx}
                              data-col="description"
                              dropDirection="down"
                              inputClassName={`min-w-0 ${!item.description && errors.items ? 'border-red-400 bg-red-50' : ''}`}
                              enterKeyHint="done"
                              inputMode="search"
                              placeholder="Type item name..."
                              value={item.description}
                              onChange={(value) => {
                                if (!value) {
                                  clearItemFields(item.id);
                                  clearError('items');
                                  return;
                                }
                                const chosen = findProductByExactEntry(products, value);
                                if (chosen) {
                                  selectProduct(item.id, chosen);
                                } else {
                                  updateItem(item.id, 'description', value);
                                }
                                clearError('items');
                              }}
                              onKeyDown={async (e) => {
                                if (!isProductCommitKey(e)) return;
                                const value = e.currentTarget.value.trim();
                                if (!value) return;
                                e.preventDefault();
                                e.stopPropagation();
                                const found = await handleRowProductEntry(item.id, value);
                                if (!found) {
                                  const next = document.querySelector(`[data-row="${idx}"][data-col="itemDescription"]`);
                                  next?.focus();
                                }
                                clearError('items');
                              }}
                              options={productSearchOptions(item.itemType)}
                            />
                            {isRetailPosInvoice && (
                              <div className="billing-pos-product-sku">
                                SKU: {item.productCode || item.code || item.barcode || '-'}
                              </div>
                            )}
                            <div className="mt-1.5 flex items-center gap-1">
                              {(matchedProductForRow?.productType === 'Bundle' || item.productType === 'Bundle') && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] border border-green-200 bg-green-50 text-green-700 font-semibold">
                                  Bundle / Kit{bundleItemCount(matchedProductForRow) ? `: ${bundleItemCount(matchedProductForRow)} items` : ''}
                                </span>
                              )}
                            </div>
                          </>
                        ) : (
                          <SelectDropdown
                            data-row={idx}
                            data-col="description"
                            buttonClassName={`w-full border ${!item.description && errors.items ? 'border-red-400 bg-red-50' : 'border-[#dbe4ef]'} rounded px-2 py-1.5 text-[13px] text-[#111827] font-[inherit] outline-none bg-white focus:border-blue-500`}
                            value={item.description}
                            onChange={(v) => {
                              const chosen = findProductByScan(products, v);
                              if (chosen) {
                                selectProduct(item.id, chosen);
                              } else {
                                updateItem(item.id, 'description', '');
                              }
                              clearError('items');
                            }}
                            placeholder="Select product..."
                            options={productSearchOptions(item.itemType)}
                          />
                        )}
                      </td>

                      {isPurchaseFashionDocument && (() => {
                        const matchedProduct = matchedProductForRow;
                        const variants = matchedProduct?.variants || [];
                        const brandOptions = uniqueTextParts([...inlineProductBrands, ...variantAttrOptions(variants, 'brand')]);
                        const sizeOptions = allFashionSizeOptions;
                        const materialOptions = allFashionMaterialOptions;
                        const fieldClass = 'w-full border border-[#dbe4ef] rounded px-2 py-1.5 text-[13px] text-[#111827] font-[inherit] outline-none bg-[#f8fafc] focus:border-blue-500';
                        return (
                          <>
                            <td className="border-t border-[#edf2f7] py-2 px-2 align-top">
                              <button
                                type="button"
                                data-row={idx}
                                data-col="brand"
                                className={`${fieldClass} flex items-center justify-between gap-2 text-left hover:bg-blue-50 focus:bg-blue-50`}
                                onClick={() => openBrandPicker({
                                  mode: 'item',
                                  itemId: item.id,
                                  product: matchedProduct,
                                  value: item.brand || '',
                                  options: brandOptions,
                                })}
                                onKeyDown={(e) => {
                                  if (e.key !== 'Enter' && e.key !== ' ') return;
                                  e.preventDefault();
                                  e.stopPropagation();
                                  openBrandPicker({
                                    mode: 'item',
                                    itemId: item.id,
                                    product: matchedProduct,
                                    value: item.brand || '',
                                    options: brandOptions,
                                  });
                                }}
                              >
                                <span className={`truncate ${item.brand ? '' : 'text-[#94a3b8]'}`}>{item.brand || 'Brand'}</span>
                                <span className="text-[#64748b]">&rsaquo;</span>
                              </button>
                            </td>
                            <td className="border-t border-[#edf2f7] py-2 px-2 align-top">
                              <button
                                type="button"
                                data-row={idx}
                                data-col="size"
                                className={`${fieldClass} ${errors[`item_size_${idx}`] ? 'border-red-400 bg-red-50' : ''} flex items-center justify-between gap-2 text-left hover:bg-blue-50 focus:bg-blue-50`}
                                onClick={() => {
                                  openSizePicker({
                                    mode: 'item',
                                    itemId: item.id,
                                    product: matchedProduct,
                                    value: item.size || '',
                                    options: sizeOptions,
                                  });
                                  setErrors((p) => { const n = { ...p }; delete n[`item_size_${idx}`]; return n; });
                                }}
                                onKeyDown={(e) => {
                                  if (e.key !== 'Enter' && e.key !== ' ') return;
                                  e.preventDefault();
                                  e.stopPropagation();
                                  openSizePicker({
                                    mode: 'item',
                                    itemId: item.id,
                                    product: matchedProduct,
                                    value: item.size || '',
                                    options: sizeOptions,
                                  });
                                  setErrors((p) => { const n = { ...p }; delete n[`item_size_${idx}`]; return n; });
                                }}
                              >
                                <span className={`truncate ${item.size ? '' : 'text-[#94a3b8]'}`}>{item.size || 'Size'}</span>
                                <span className="text-[#64748b]">&rsaquo;</span>
                              </button>
                            </td>
                            <td className="border-t border-[#edf2f7] py-2 px-2 align-top">
                              <button
                                type="button"
                                data-row={idx}
                                data-col="material"
                                className={`${fieldClass} flex items-center justify-between gap-2 text-left hover:bg-blue-50 focus:bg-blue-50`}
                                onClick={() => openMaterialPicker({
                                  mode: 'item',
                                  itemId: item.id,
                                  product: matchedProduct,
                                  value: item.material || '',
                                  options: materialOptions,
                                })}
                                onKeyDown={(e) => {
                                  if (e.key !== 'Enter' && e.key !== ' ') return;
                                  e.preventDefault();
                                  e.stopPropagation();
                                  openMaterialPicker({
                                    mode: 'item',
                                    itemId: item.id,
                                    product: matchedProduct,
                                    value: item.material || '',
                                    options: materialOptions,
                                  });
                                }}
                              >
                                <span className={`truncate ${item.material ? '' : 'text-[#94a3b8]'}`}>{item.material || 'Material'}</span>
                                <span className="text-[#64748b]">&rsaquo;</span>
                              </button>
                            </td>
                          </>
                        );
                      })()}

                      {!isPurchaseFashionDocument && <td className="border-t border-[#edf2f7] py-2 px-2 align-top">
                        {(() => {
                          const matchedProduct = findCatalogProductForItem(products, item);
                          const variants = matchedProduct?.variants || [];
                          const isService = (matchedProduct?.itemType || item.itemType) === 'Service';

                          if (!variants.length) {
                            if (!matchedProduct || isService) {
                              return <span className="text-[13px] text-[#9ca3af] pt-1.5 block">—</span>;
                            }
                            if (matchedProduct.productType === 'Bundle') {
                              return (
                                <span className="text-[12px] font-medium pt-1.5 block text-green-700">
                                  {bundleItemCount(matchedProduct) || 'Kit'} bundle items
                                </span>
                              );
                            }
                            const stock = Number(matchedProduct.stock || 0);
                            return (
                              <span className={`text-[12px] font-medium pt-1.5 block ${stockTextClass(stock, matchedProduct.minStockLevel)}`}>
                                {stock} in stock
                              </span>
                            );
                          }

                          return (
                            <>
                              <SelectDropdown
                                data-row={idx}
                                data-col="size"
                                buttonClassName={`w-full border ${errors[`item_size_${idx}`] ? 'border-red-400 bg-red-50' : 'border-[#dbe4ef]'} rounded px-2 py-1.5 text-[13px] text-[#111827] font-[inherit] outline-none bg-[#f8fafc] focus:border-blue-500 opacity-100 cursor-default`}
                                value={item.size || ''}
                                onChange={(v) => {
                                  selectItemVariant(item.id, matchedProduct, v);
                                  setErrors((p) => { const n = { ...p }; delete n[`item_size_${idx}`]; return n; });
                                }}
                                disabled={!['purchase-entry', 'purchase-order'].includes(documentType)}
                                hideChevron={!['purchase-entry', 'purchase-order'].includes(documentType)}
                                placeholder="—"
                                selectedLabelClassName="text-left whitespace-nowrap overflow-hidden text-ellipsis"
                                optionLabelClassName="w-full min-w-0"
                                menuClassName="!w-72 !right-auto"
                                searchable
                                allowCustom
                                customLabel="Manual size"
                                options={variants.map(variantDropdownOption)}
                              />
                            </>
                          );
                        })()}
                      </td>}

                      {!isPurchaseFashionDocument && <td className="border-t border-[#edf2f7] py-2 px-2 align-top">
                        <textarea
                          data-row={idx}
                          data-col="itemDescription"
                          className="w-full border border-[#dbe4ef] rounded px-2 py-1.5 text-[13px] text-[#111827] font-[inherit] outline-none focus:border-blue-500 min-w-0 resize-y"
                          placeholder="One point per line..."
                          rows={2}
                          value={item.itemDescription ?? ''}
                          onChange={(e) => updateItem(item.id, 'itemDescription', e.target.value)}
                        />
                      </td>}

                      <td className="border-t border-[#edf2f7] py-2 px-2 align-top">
                        <AutocompleteInput
                          data-row={idx}
                          data-col="hsn"
                          inputClassName="min-w-0 !px-2 !py-1.5"
                          placeholder={item.itemType === 'Service' ? 'SAC' : 'HSN'}
                          value={item.hsn}
                          onChange={(v) => updateItem(item.id, 'hsn', v)}
                        />
                      </td>
                      <td className="border-t border-[#edf2f7] py-2 px-2 align-top">
                        <AutocompleteInput
                          data-row={idx}
                          data-col="qty"
                          inputClassName={`min-w-0 !px-2 !py-1.5 !text-right ${errors[`item_qty_${idx}`] ? 'border-red-400 bg-red-50' : ''}`}
                          min="0"
                          type="number"
                          value={String(item.qty ?? '')}
                          onChange={(v) => {
                            updateItem(item.id, 'qty', v);
                            setErrors((p) => { const n = { ...p }; delete n[`item_qty_${idx}`]; return n; });
                          }}
                        />
                      </td>
                      <td className="border-t border-[#edf2f7] py-2 px-2 align-top">
                        <AutocompleteInput data-row={idx} data-col="unit" value={item.unit} onChange={(v) => updateItem(item.id, 'unit', v)} />
                      </td>
                      <td className="border-t border-[#edf2f7] py-2 px-2 align-top">
                        <AutocompleteInput
                          data-row={idx}
                          data-col="rate"
                          inputClassName={`min-w-0 !px-2 !py-1.5 !text-right ${errors[`item_rate_${idx}`] ? 'border-red-400 bg-red-50' : ''}`}
                          min="0"
                          type="number"
                          value={String(item.rate ?? '')}
                          onChange={(v) => {
                            updateItem(item.id, 'rate', v);
                            setErrors((p) => { const n = { ...p }; delete n[`item_rate_${idx}`]; return n; });
                          }}
                        />
                      </td>
                      {config.showGst && isPurchaseFashionDocument && (
                        <td className="border-t border-[#edf2f7] py-2 px-2 align-top">
                          <AutocompleteInput
                            data-row={idx}
                            data-col="gstRate"
                            inputClassName="billing-gst-rate-input !px-2 !py-1.5 !text-right"
                            type="number"
                            min="0"
                            value={String(item.gstRate ?? 0)}
                            onChange={(v) => updateItem(item.id, 'gstRate', v)}
                          />
                        </td>
                      )}
                      {config.showGst && isPurchaseFashionDocument && (
                        <td className="border-t border-[#edf2f7] py-2 px-2 align-top text-right text-[13px] text-[#536173] pt-3">{formatCurrency(line.gstAmt)}</td>
                      )}
                      {!isPurchaseFashionDocument && <td className="border-t border-[#edf2f7] py-2 px-2 align-top">
                        <AutocompleteInput
                          data-row={idx}
                          data-col="discount"
                          inputClassName="min-w-0 !px-2 !py-1.5 !text-right"
                          min="0"
                          max="100"
                          type="number"
                          value={String(item.discount ?? 0)}
                          onChange={(v) => updateItem(item.id, 'discount', v)}
                        />
                      </td>}
                      {config.showGst && !isPurchaseFashionDocument && (
                        <td className="border-t border-[#edf2f7] py-2 px-2 align-top">
                          {isRetailPosInvoice ? (
                            <span className="billing-pos-tax-label">18%</span>
                          ) : (
                            <AutocompleteInput
                              data-row={idx}
                              data-col="gstRate"
                              inputClassName="billing-gst-rate-input !px-2 !py-1.5 !text-right"
                              type="number"
                              min="0"
                              value={String(item.gstRate ?? 0)}
                              onChange={(v) => updateItem(item.id, 'gstRate', v)}
                            />
                          )}
                        </td>
                      )}
                      {config.showGst && !isPurchaseFashionDocument && (
                        <td className="border-t border-[#edf2f7] py-2 px-2 align-top text-right text-[13px] text-[#536173] pt-3">{formatCurrency(line.gstAmt)}</td>
                      )}
                      {!isPurchaseFashionDocument && <td className="border-t border-[#edf2f7] py-2 px-2 align-top text-right text-[13px] font-semibold text-[#111827] pt-3">{formatCurrency(isRetailPosInvoice ? line.taxable : (config.showGst ? line.total : line.taxable))}</td>}
                      <td className="border-t border-[#edf2f7] py-2 px-2 align-top text-center">
                        <button
                          className="w-7 h-7 text-red-400 bg-transparent border-0 text-lg cursor-pointer rounded hover:bg-red-50 hover:text-red-700 font-[inherit]"
                          title="Remove"
                          type="button"
                          onClick={() => {
                            if (item.id === '__quick_draft__') {
                              setProductSearch('');
                              resetQuickItem();
                            } else {
                              removeItem(item.id);
                            }
                          }}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          )}

          <button
            type="button"
            className="mt-3 flex items-center gap-1.5 text-[13px] text-blue-600 font-medium border border-dashed border-blue-200 rounded-md px-3 py-2 bg-blue-50/40 hover:bg-blue-50 cursor-pointer font-[inherit]"
            onClick={addItem}
            title="Add another item (Alt+N)"
          >
            <Plus size={14} /> Add Item
          </button>
          {isRetailPosInvoice && (
            <div className="billing-pos-cart-controls">
              <button type="button" onClick={() => document.querySelector('[data-fkey="product"]')?.focus()}><Plus size={18} /> Add Product <span className="hidden md:inline">(F3)</span></button>
              <button type="button" onClick={() => setItems([])}><Trash2 size={17} /> Clear Cart</button>
              <span />
              <button type="button" onClick={() => document.querySelector('[data-fkey="notes"]')?.focus()}><FileText size={17} /> Add Note</button>
            </div>
          )}
          {errors.items && (
            <p className="mt-2 text-[11px] text-red-600 flex items-center gap-1.5">
              <svg fill="none" height="12" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="12"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
              {errors.items}
            </p>
          )}

          {/* ── Item Summary Strip ── */}
        </div>}

        {/* ── Tax Summary ── */}
        {config.showGst && Object.keys(totals.gstByRate).length > 0 && (
          <div className="px-6 py-5 border-b border-[#edf2f7]">
            <div className={cx.sectionTitle}>Tax Summary</div>
            <div className="overflow-x-auto mt-2">
              <table className="w-full border-collapse text-xs border border-[#edf2f7] rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-[#f8fafc]">
                    <th className="text-left text-[#536173] px-2.5 py-2 font-semibold">GST Rate</th>
                    <th className="text-right text-[#536173] px-2.5 py-2 font-semibold">Taxable</th>
                    {supplyType === 'intrastate' ? (
                      <><th className="text-right text-[#536173] px-2.5 py-2 font-semibold">CGST</th><th className="text-right text-[#536173] px-2.5 py-2 font-semibold">SGST</th></>
                    ) : (
                      <th className="text-right text-[#536173] px-2.5 py-2 font-semibold">IGST</th>
                    )}
                    <th className="text-right text-[#536173] px-2.5 py-2 font-semibold">Total Tax</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(totals.gstByRate).map(([rate, data]) => (
                    <tr key={rate} className="border-t border-[#edf2f7]">
                      <td className="px-2.5 py-2">{rate}%</td>
                      <td className="px-2.5 py-2 text-right">{formatCurrency(data.taxable)}</td>
                      {supplyType === 'intrastate' ? (
                        <><td className="px-2.5 py-2 text-right">{formatCurrency(data.gst / 2)}</td><td className="px-2.5 py-2 text-right">{formatCurrency(data.gst / 2)}</td></>
                      ) : (
                        <td className="px-2.5 py-2 text-right">{formatCurrency(data.gst)}</td>
                      )}
                      <td className="px-2.5 py-2 text-right font-semibold">{formatCurrency(data.gst)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="billing-mobile-save-proceed-row md:hidden flex items-center gap-2 px-6 py-4 border-b border-[#edf2f7]">
          <button type="button" className={`flex-1 justify-center ${cx.btnPrimary}`} disabled={saveLoading} onClick={() => handleSave()} title={`${config.buttonText} (F2)`}>
            {saveLoading ? 'Saving…' : config.buttonText}
          </button>
          <button type="button" className="billing-mobile-proceed-btn !mt-0 !w-auto flex-1" onClick={() => setMobileScreen('payment')}>
            Proceed to Payment
          </button>
        </div>

        {/* ── Additional Charges ── */}
        {documentType !== 'supplier-return' && documentType !== 'sales-return' && <div className="px-6 py-5 border-b border-[#edf2f7]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
            <h3 className="m-0 text-[14px] font-semibold text-[#374151]">Additional Charges</h3>
            <div className="flex items-center gap-1.5 flex-wrap">
              {CHARGE_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className="text-[11px] sm:text-[12px] text-[#536173] border border-[#dbe4ef] rounded-md px-2 py-1 bg-white hover:bg-gray-50 cursor-pointer font-[inherit] transition-colors"
                  onClick={() => addCharge(p)}
                >
                  + {p.label}
                </button>
              ))}
              <button
                type="button"
                className="flex items-center gap-1 text-[11px] sm:text-[12px] text-blue-600 border border-blue-200 rounded-md px-2 py-1 bg-blue-50 hover:bg-blue-100 cursor-pointer font-[inherit] transition-colors"
                onClick={() => addCharge(null)}
              >
                <Plus size={11} /> Custom Charge
              </button>
            </div>
          </div>

          {charges.length === 0 ? (
            <div className="text-[13px] text-[#94a3b8] text-center py-4 border border-dashed border-[#e2e8f0] rounded-md bg-[#fafbfe]">
              No additional charges. Use the buttons above to add freight, packing, or custom charges.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {charges.map((charge) => {
                const chargeGst = (Number(charge.amount) || 0) * (charge.gstRate / 100);
                const chargeTotal = (Number(charge.amount) || 0) + (config.showGst ? chargeGst : 0);
                return (
                  <div key={charge.id} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_160px_120px_120px_120px_36px] gap-3 items-center bg-[#fafbfe] border border-[#edf2f7] rounded-lg px-4 py-2.5">
                    <input
                      className={`${cx.input} bg-white`}
                      placeholder="Charge description (e.g. Freight)"
                      value={charge.label}
                      onChange={(e) => updateCharge(charge.id, 'label', e.target.value)}
                    />
                    <div className={cx.field}>
                      <label className={cx.label}>Amount (₹)</label>
                      <input
                        className={`${cx.input} bg-white`}
                        min="0"
                        placeholder="0"
                        type="number"
                        value={charge.amount}
                        onChange={(e) => updateCharge(charge.id, 'amount', e.target.value)}
                      />
                    </div>
                    {config.showGst && (
                      <div className={cx.field}>
                        <label className={cx.label}>GST %</label>
                        <input
                          className={`${cx.input} bg-white`}
                          min="0"
                          type="number"
                          value={charge.gstRate}
                          onChange={(e) => updateCharge(charge.id, 'gstRate', Number(e.target.value))}
                        />
                      </div>
                    )}
                    {config.showGst && (
                      <div className="text-right">
                        <div className="text-[11px] text-[#94a3b8] mb-0.5">Tax</div>
                        <div className="text-[13px] text-[#374151]">{formatCurrency(chargeGst)}</div>
                      </div>
                    )}
                    <div className="text-right">
                      <div className="text-[11px] text-[#94a3b8] mb-0.5">Total</div>
                      <div className="text-[13px] font-semibold text-[#111827]">{formatCurrency(chargeTotal)}</div>
                    </div>
                    <button className="w-7 h-7 flex items-center justify-center text-red-400 bg-transparent border-0 cursor-pointer rounded hover:bg-red-50 hover:text-red-700 font-[inherit]" type="button" onClick={() => removeCharge(charge.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        }
        {/* ── Footer: Notes + Totals ── */}
        <div className="billing-lower-details grid grid-cols-1 gap-8 p-6">

          {/* LEFT column */}
          <div className="flex flex-col gap-5">

            {/* Notes to Customer */}
            <div className="flex flex-col gap-2">
              <div className={cx.sectionTitle}>Notes to {partyKind}</div>
              <textarea data-fkey="notes" className="w-full border border-[#dbe4ef] rounded-md px-3 py-2.5 text-[13px] font-[inherit] resize-y outline-none focus:border-blue-500" placeholder={`Notes visible to ${partyKindLower} on this document...`} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            {/* Terms & Conditions */}
            <div className="flex flex-col gap-2">
              <div className={cx.sectionTitle}>Terms &amp; Conditions</div>
              <textarea className="w-full border border-[#dbe4ef] rounded-md px-3 py-2.5 text-[13px] font-[inherit] resize-y outline-none focus:border-blue-500" placeholder="Payment terms, delivery conditions…" rows={5} value={terms} onChange={(e) => setTerms(e.target.value)} />
            </div>

            {/* Internal Notes */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5">
                <Lock size={11} className="text-[#536173]" />
                <div className={cx.sectionTitle}>Internal Notes</div>
                <span className="text-[10px] text-[#94a3b8] font-normal normal-case tracking-normal">(not shown on invoice)</span>
              </div>
              <textarea className="w-full border border-[#dbe4ef] rounded-md px-3 py-2.5 text-[13px] font-[inherit] resize-y outline-none focus:border-blue-500 bg-[#fdfcf7]" placeholder="Internal notes, reminders, or instructions for your team…" rows={2} value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} />
            </div>
          </div>
        </div>


      </div>

      {isRetailPosInvoice && (
        <section className="billing-pos-quick-add">
          <h3>Quick Add Product / Service</h3>
          <div className="billing-pos-quick-grid">
            <div className="billing-pos-quick-search">
              <AutocompleteInput
                dropDirection="down"
                placeholder="Scan barcode or type product / service name and press Enter"
                value={productSearch}
                onChange={updateProductSearch}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    addQuickItem(e.currentTarget.value);
                  }
                }}
                options={productSearchOptions(salesItemFilter)}
              />
            </div>
            <label><span>Qty</span><AutocompleteInput type="number" min="0" value={String(quickItem.qty ?? '')} onChange={(v) => updateQuickItem('qty', v)} /></label>
            <label><span>Rate</span><AutocompleteInput type="number" min="0" value={String(quickItem.rate ?? '')} onChange={(v) => updateQuickItem('rate', v)} /></label>
            <label>
              <span>Discount %</span>
              <AutocompleteInput type="number" min="0" max="100" value={String(quickItem.discount ?? '')} onChange={(v) => updateQuickItem('discount', v)} />
            </label>
            <button type="button" onClick={() => addQuickItem()}><Plus size={20} /> Add</button>
          </div>
        </section>
      )}

      <aside className="billing-summary-card">
        <div className="billing-summary-title">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-blue-600">
            <svg fill="none" height="15" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="15"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </span>
          Invoice Summary
        </div>

        <div className="billing-summary-lines">
          {isRetailPosInvoice && <div><span>Items</span><strong>{effectiveItems.length}</strong></div>}
          <div><span>Subtotal</span><strong>{formatCurrency(totals.subtotal)}</strong></div>
          {(isRetailPosInvoice || totals.discount > 0) && (
            <div className={totals.discount > 0 ? 'text-green-700' : ''}>
              <span>Discount</span><strong>- {formatCurrency(totals.discount)}</strong>
            </div>
          )}
          <div><span>Taxable Amount</span><strong>{formatCurrency(totals.taxable)}</strong></div>
          {config.showGst && supplyType === 'intrastate' && Object.entries(totals.gstByRate).flatMap(([rate, data]) => [
            <div key={`side-cgst-${rate}`}><span>{isRetailPosInvoice ? 'CGST (9%)' : `CGST @ ${Number(rate) / 2}%`}</span><strong>{formatCurrency(data.gst / 2)}</strong></div>,
            <div key={`side-sgst-${rate}`}><span>{isRetailPosInvoice ? 'SGST (9%)' : `SGST @ ${Number(rate) / 2}%`}</span><strong>{formatCurrency(data.gst / 2)}</strong></div>,
          ])}
          {config.showGst && supplyType !== 'intrastate' && Object.entries(totals.gstByRate).map(([rate, data]) => (
            <div key={`side-igst-${rate}`}><span>IGST @ {rate}%</span><strong>{formatCurrency(data.gst)}</strong></div>
          ))}
          {totals.chargesSubtotal > 0 && <div><span>Additional Charges</span><strong>{formatCurrency(totals.chargesSubtotal)}</strong></div>}
          {totals.addDiscAmt > 0 && <div className="text-green-700"><span>Additional Discount</span><strong>- {formatCurrency(totals.addDiscAmt)}</strong></div>}
          {Math.abs(totals.roundOff) >= 0.01 && <div><span>{totals.manualTotalOverride ? 'Manual Total Adjustment' : 'Round Off'}</span><strong>{totals.roundOff > 0 ? '+' : ''}{formatCurrency(totals.roundOff)}</strong></div>}
        </div>

        {documentType === 'quotation' && (
          <div className="mt-3 border-t border-[#edf2f7] pt-3">
            <label className="mb-1 flex items-center justify-between text-[12px] font-semibold text-[#536173]">
              <span>Manual Total Value</span>
              {manualQuotationTotal !== '' && (
                <button
                  type="button"
                  className="border-0 bg-transparent p-0 text-[12px] font-[inherit] text-blue-600 hover:underline cursor-pointer"
                  onClick={() => setManualQuotationTotal('')}
                >
                  Use calculated
                </button>
              )}
            </label>
            <input
              className={cx.input}
              min="0"
              placeholder={String(totals.calculatedFinalTotal)}
              step="0.01"
              type="number"
              value={manualQuotationTotal}
              onChange={(e) => setManualQuotationTotal(e.target.value)}
            />
          </div>
        )}

        <div className="billing-total-box">
          <div className="text-[12px] font-bold uppercase tracking-wide text-blue-700">Grand Total</div>
          <div className="text-[30px] font-extrabold text-blue-700 leading-tight">{formatCurrency(totals.finalTotal)}</div>
          <div className="mt-2 text-[11px] text-[#536173]">
            <span className="font-semibold text-[#334155]">Amount in words</span><br />
            {numberToWords(totals.finalTotal)}
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-[#dbe4ef] bg-white p-3">
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#536173]">Bill Layout</label>
          <SelectDropdown
            buttonClassName="h-10 rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] text-[#111827]"
            value={billPrintFormat}
            onChange={(value) => updateExtra('invoicePrintFormat', value)}
            options={[
              { value: 'normal', label: 'Normal Bill' },
              { value: 'thermal80', label: '80mm Bill' },
            ]}
          />
        </div>

        {config.showPayment && (
          <div className="billing-payment-panel">
            <div className="billing-summary-subtitle">{isRetailPosInvoice ? 'Payment' : 'Payment Method'}</div>
            <div className="billing-payment-grid">
              {PAYMENT_METHODS.map((m) => {
                const active = selectedPayment === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    className={active ? 'active' : ''}
                    onClick={() => selectPaymentMethod(m.id)}
                    style={active ? { '--pay-color': m.color } : undefined}
                  >
                    <span>{m.emoji}</span>
                    {m.label}
                  </button>
                );
              })}
            </div>

            {selectedPayment && (
              <button type="button" className="billing-payment-summary-chip" onClick={() => setShowPaymentMethodPopup(true)}>
                <span>{PAYMENT_METHODS.find((method) => method.id === selectedPayment)?.label || 'Payment'} details</span>
                <strong>{selectedPayment === 'credit' ? `${paymentData.creditDays || 0} days` : formatCurrency(Number(paymentData.amount) || 0)}</strong>
              </button>
            )}

            <button type="button" className="billing-payment-summary-chip" onClick={openMultiplePayment}>
              <span>Multiple Payment</span>
              <strong>Received {formatCurrency(paymentSplitTotal)}</strong>
            </button>

          </div>
        )}

        <button
          type="button"
          className="billing-generate-btn"
          disabled={saveLoading}
          onClick={() => handleSave({ openPreview: true })}
        >
          <svg fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          {saveLoading ? 'Generating...' : `Generate ${config.title}`}
        </button>

        <div className="mt-3 pt-3 border-t border-[#edf2f7]">
          <div className="text-[11px] font-semibold uppercase text-[#536173] tracking-wide mb-2">Quick Actions</div>
          <div className="grid grid-cols-5 gap-1.5">
            <button type="button" title="Print (F3)" onClick={() => { if (!saveLoading) handlePrintBill(); }} className="flex min-w-0 flex-col items-center gap-1 rounded-lg border border-[#dbe4ef] bg-white px-1 py-2 font-[inherit] text-[#374151] cursor-pointer hover:bg-gray-50">
              <Printer size={15} />
              <span className="text-[9.5px] leading-3 font-medium whitespace-nowrap">Print</span>
            </button>
            <button
              type="button"
              title="Share on WhatsApp"
              onClick={() => {
                const c = getEffectiveCustomer();
                const text = encodeURIComponent(`${config.title} ${docMeta.number} — ${formatCurrency(totals.finalTotal)}`);
                const phone = String(c.phone || '').replace(/\D/g, '');
                window.open(`https://wa.me/${phone}?text=${text}`, '_blank', 'noopener');
              }}
              className="flex min-w-0 flex-col items-center gap-1 rounded-lg border border-[#dbe4ef] bg-white px-1 py-2 font-[inherit] text-[#374151] cursor-pointer hover:bg-gray-50"
            >
              <span className="text-[#25D366]">
                <WhatsAppIcon size={16} />
              </span>
              <span className="text-[9px] leading-3 font-medium whitespace-nowrap">WhatsApp</span>
            </button>
            <button type="button" title="Email" onClick={() => setShowEmailModal(true)} className="flex min-w-0 flex-col items-center gap-1 rounded-lg border border-[#dbe4ef] bg-white px-1 py-2 font-[inherit] text-[#374151] cursor-pointer hover:bg-gray-50">
              <Mail size={15} />
              <span className="text-[9.5px] leading-3 font-medium whitespace-nowrap">Email</span>
            </button>
            <button
              type="button"
              title="Download PDF"
              onClick={() => { setDownloadPdfMode(true); setAutoPrintPreview(false); setShowPreview(true); }}
              className="flex min-w-0 flex-col items-center gap-1 rounded-lg border border-[#dbe4ef] bg-white px-1 py-2 font-[inherit] text-[#374151] cursor-pointer hover:bg-gray-50"
            >
              <Download size={15} />
              <span className="text-[9.5px] leading-3 font-medium whitespace-nowrap">PDF</span>
            </button>
            <button
              type="button"
              title="Send SMS"
              onClick={() => {
                const c = getEffectiveCustomer();
                const text = encodeURIComponent(`${config.title} ${docMeta.number} — ${formatCurrency(totals.finalTotal)}`);
                window.open(`sms:${c.phone || ''}?body=${text}`, '_self');
              }}
              className="flex min-w-0 flex-col items-center gap-1 rounded-lg border border-[#dbe4ef] bg-white px-1 py-2 font-[inherit] text-[#374151] cursor-pointer hover:bg-gray-50"
            >
              <Smartphone size={15} />
              <span className="text-[9.5px] leading-3 font-medium whitespace-nowrap">SMS</span>
            </button>
          </div>
        </div>

        {isRetailPosInvoice && (
          <div className="billing-pos-payment-actions">
            <button
              type="button"
              className="billing-pos-save-print"
              disabled={saveLoading}
              onClick={() => handleSave({ openPreview: true, autoPrint: true })}
            >
              <Printer size={24} />
              {saveLoading ? 'SAVING...' : <>SAVE & PRINT <span className="hidden md:inline">(F10)</span></>}
            </button>
            <button type="button" className="billing-pos-more-actions">
              <span>•••</span>
              More Actions
              <ChevronDown size={16} />
            </button>
          </div>
        )}

      </aside>

      </div>

      {isRetailPosInvoice && (
        <footer className="billing-pos-footer">
          <div className="billing-pos-shortcuts">
            {[
              ['F2', 'Customer', User, () => document.querySelector('[data-fkey="party"]')?.focus()],
              ['F3', 'Search', Search, () => document.querySelector('[data-fkey="product"]')?.focus()],
              ['F4', 'Qty', Plus, addItem],
              ['F5', 'Discount', Tag, () => document.querySelector('[data-fkey="overall-discount"]')?.focus()],
              ['PAY', 'Payment', FileText, () => selectPaymentMethod(selectedPayment || 'cash')],
              ['HOLD', 'Hold', Receipt, () => setSaveError('Bill held locally for this session.')],
              ['F9', 'Save', Save, () => { if (!saveLoading) handleSave(); }],
              ['F10', 'Print', Printer, () => { if (!saveLoading) handlePrintBill(); }],
              ['ESC', 'Cancel', X, () => setItems([])],
            ].map(([key, label, Icon, action]) => (
              <button key={key} type="button" onClick={action}>
                <strong>{key}</strong>
                <Icon size={24} />
                <span>{label}</span>
              </button>
            ))}
          </div>
          <div className="billing-pos-status">
            <span>Last Bill: #10257</span>
            <i />
            <span>Last Amount: ₹ 2,340.00</span>
            <b>Barcode: Connected</b>
            <b>Printer: Thermal 80mm</b>
            <button type="button"><Printer size={18} /> Open Cash Drawer</button>
          </div>
        </footer>
      )}

      <section className={`billing-mobile-screen ${mobileScreen === 'items' ? 'active' : ''}`} aria-hidden={mobileScreen !== 'items'}>
        <div className="billing-mobile-screen-bar">
          <button type="button" onClick={() => setMobileScreen('invoice')}><ArrowLeft size={20} /></button>
          <strong>Add Item</strong>
          <span />
        </div>
        <div className="billing-mobile-screen-body">
          <form className="billing-mobile-search" onSubmit={handleMobileProductSubmit}>
            <Search size={16} />
            <input
              ref={mobileProductInputRef}
              autoComplete="off"
              enterKeyHint="search"
              inputMode="search"
              placeholder="Search product or service"
              type="search"
              value={mobileProductQuery}
              onChange={(e) => setMobileProductQuery(e.target.value)}
              onKeyDown={handleMobileProductKeyDown}
            />
            <button
              type="submit"
              title="Add selected product"
              aria-label="Add selected product"
            >
              <Plus size={18} />
            </button>
            <button
              type="button"
              title="Scan barcode"
              onClick={openBarcodeScanner}
            >
              <Barcode size={18} />
            </button>
          </form>
          <div className="mb-3">
            <SelectDropdown
              value={salesItemFilter}
              onChange={setQuickItemType}
              buttonClassName="!h-10 !w-full !rounded-md !border-[#dbe4ef] !bg-white !px-3 !text-[13px]"
              options={SALES_ITEM_FILTER_OPTIONS}
            />
          </div>
          <div className="billing-mobile-product-list">
            {mobileProductResults.length === 0 ? (
              <div className="billing-mobile-empty-list">
                <ShoppingCart size={42} />
                <strong>No items found</strong>
                <span>Try another product name or code</span>
              </div>
            ) : mobileProductResults.map((product) => {
              const normalized = normalizeProduct(product);
              return (
                <button
                  key={normalized.id || normalized.description}
                  type="button"
                  className="billing-mobile-product-card"
                  onClick={() => addMobileProduct(normalized)}
                >
                  <span className="billing-mobile-product-thumb"><Package size={20} /></span>
                  <span className="billing-mobile-product-main">
                    <strong>{normalized.description || 'Unnamed item'}</strong>
                    <small>{normalized.code || normalized.barcode || normalized.hsn || '-'}</small>
                    <b>{formatCurrency(normalized.rate || 0)}</b>
                    <em>{normalized.itemType === 'Service' ? 'Service' : `Stock: ${Number(product.stock || 0)} ${normalized.unit}`}</em>
                  </span>
                  <span className="billing-mobile-plus"><Plus size={18} /></span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className={`billing-mobile-screen ${mobileScreen === 'payment' ? 'active' : ''}`} aria-hidden={mobileScreen !== 'payment'}>
        <div className="billing-mobile-screen-bar">
          <button type="button" onClick={() => setMobileScreen('invoice')}><ArrowLeft size={20} /></button>
          <strong>Payment</strong>
          <span />
        </div>
        <div className="billing-mobile-screen-body">
          <div className="billing-mobile-amount-card">
            <span>Amount to Pay</span>
            <strong>{formatCurrency(totals.finalTotal)}</strong>
            <small>{numberToWords(totals.finalTotal)}</small>
          </div>
          <div className="billing-mobile-payment-card">
            <h3>Payment Mode</h3>
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m.id}
                type="button"
                className={selectedPayment === m.id ? 'active' : ''}
                onClick={() => selectPaymentMethod(m.id)}
              >
                <span>{m.label}</span>
                <b />
              </button>
            ))}
          </div>
          <div className="billing-mobile-payment-card">
            <h3>Payment Details</h3>
            {selectedPayment && (
              <button type="button" className="billing-payment-summary-chip" onClick={() => setShowPaymentMethodPopup(true)}>
                <span>{PAYMENT_METHODS.find((method) => method.id === selectedPayment)?.label || 'Payment'} details</span>
                <strong>{selectedPayment === 'credit' ? `${paymentData.creditDays || 0} days` : formatCurrency(Number(paymentData.amount) || 0)}</strong>
              </button>
            )}
            {selectedPayment && selectedPayment !== 'credit' && (
              <div className="billing-mobile-balance">
                <span>Total Balance</span>
                <strong>{formatCurrency(customerBalanceAfterInvoice)}</strong>
              </div>
            )}
            <button type="button" className="billing-payment-summary-chip" onClick={openMultiplePayment}>
              <span>Multiple Payment</span>
              <strong>Received {formatCurrency(paymentSplitTotal)}</strong>
            </button>
          </div>
          <button
            type="button"
            className="billing-mobile-save-btn"
            disabled={saveLoading}
            onClick={handleMobilePaymentSave}
            onTouchEnd={handleMobilePaymentSave}
          >
            {saveLoading ? 'Saving...' : 'Save & Close'}
          </button>
        </div>
      </section>

      <MobileBarcodeScanner
        open={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onDetected={handleCameraBarcodeDetected}
        status={barcodeScanStatus}
        unknownCode={unknownBarcode}
        scannedItems={displayItems}
        total={totals.finalTotal}
        onAddUnknown={() => {
          if (!unknownBarcode) return;
          setShowBarcodeScanner(false);
          openAddProductForBarcode(unknownBarcode);
        }}
      />

      {showAddCustomer && (
        <div className="app-form-modal bg-white border border-[#dfe7f1] p-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="m-0 text-[18px] font-bold text-[#0f172a]">{newCustomerForm._id || newCustomerForm.id ? `Edit ${partyKind}` : `Add ${partyKind}`}</h2>
              <p className="m-0 mt-1 text-[12px] text-[#64748b]">{partyDetailsText}</p>
            </div>
            <button type="button" className="border-0 bg-transparent cursor-pointer text-[#64748b]" onClick={() => setShowAddCustomer(false)} title="Close">
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className={cx.field}>
              <label className={cx.label}>{config.partyNameLabel}</label>
              <input data-fkey="party-add" className={errors.customerName ? cx.inputError : cx.input} placeholder={`${partyKind} name`} value={newCustomerForm.name} onChange={(e) => updateNewCustomer('name', e.target.value)} />
            </div>
            <div className={cx.field}>
              <label className={cx.label}>Phone</label>
              <input className={cx.input} placeholder="+91 XXXXX XXXXX" value={newCustomerForm.phone} onChange={(e) => updateNewCustomer('phone', e.target.value)} />
            </div>
            <div className={cx.field}>
              <label className={cx.label}>GSTIN</label>
              <input className={cx.input} maxLength={15} placeholder="15-digit GSTIN" value={newCustomerForm.gstin} onChange={(e) => updateNewCustomer('gstin', e.target.value.toUpperCase())} />
            </div>
            <div className={cx.field}>
              <label className={cx.label}>Email</label>
              <input className={cx.input} placeholder={`${partyKindLower}@email.com`} type="email" value={newCustomerForm.email} onChange={(e) => updateNewCustomer('email', e.target.value)} />
            </div>
          </div>

          <div className={`${cx.field} mt-3`}>
            <label className={cx.label}>{partyKind} Address</label>
            <input className={cx.input} placeholder="Street / Building / Area" value={newCustomerForm.address} onChange={(e) => updateNewCustomer('address', e.target.value)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
            <div className={cx.field}>
              <label className={cx.label}>City</label>
              <input className={cx.input} placeholder="City" value={newCustomerForm.city} onChange={(e) => updateNewCustomer('city', e.target.value)} />
            </div>
            <div className={cx.field}>
              <label className={cx.label}>State</label>
              <SelectDropdown buttonClassName={cx.select} value={newCustomerForm.state} onChange={(v) => updateNewCustomer('state', v)} options={INDIAN_STATES} />
            </div>
            <div className={cx.field}>
              <label className={cx.label}>PIN Code</label>
              <input className={cx.input} maxLength={6} placeholder="620001" value={newCustomerForm.pincode} onChange={(e) => updateNewCustomer('pincode', e.target.value)} />
            </div>
          </div>

          {partyKind === 'Vendor' && (
            <div className="mt-4">
              <div className={cx.sectionTitle}>Vendor Bank Details</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className={cx.field}>
                  <label className={cx.label}>Bank Name</label>
                  <input className={cx.input} placeholder="Bank name" value={newCustomerForm.bankName} onChange={(e) => updateNewCustomer('bankName', e.target.value)} />
                </div>
                <div className={cx.field}>
                  <label className={cx.label}>A/C Name</label>
                  <input className={cx.input} placeholder="Account holder name" value={newCustomerForm.accountHolderName} onChange={(e) => updateNewCustomer('accountHolderName', e.target.value)} />
                </div>
                <div className={cx.field}>
                  <label className={cx.label}>A/C No.</label>
                  <input className={cx.input} placeholder="Account number" value={newCustomerForm.accountNumber} onChange={(e) => updateNewCustomer('accountNumber', e.target.value)} />
                </div>
                <div className={cx.field}>
                  <label className={cx.label}>IFSC</label>
                  <input className={cx.input} placeholder="IFSC code" value={newCustomerForm.ifscCode} onChange={(e) => updateNewCustomer('ifscCode', e.target.value.toUpperCase())} />
                </div>
                <div className={`${cx.field} sm:col-span-2`}>
                  <label className={cx.label}>Branch</label>
                  <input className={cx.input} placeholder="Branch name" value={newCustomerForm.bankBranch} onChange={(e) => updateNewCustomer('bankBranch', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {customerSaveError && <div className="mt-3 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-[12px] text-red-600">{customerSaveError}</div>}

          <div className="flex justify-end gap-2 mt-5">
            <button type="button" className={cx.btnOutline} onClick={() => setShowAddCustomer(false)}>Cancel</button>
            <button type="button" className={cx.btnPrimary} disabled={customerSaving} onClick={handleCreateCustomer}>
              {customerSaving ? 'Saving...' : (newCustomerForm._id || newCustomerForm.id ? `Update ${partyKind}` : `Save ${partyKind}`)}
            </button>
          </div>
        </div>
      )}

      {paymentMethodPopup}

      {showPaymentPopup && (
        <div
          className="billing-payment-popup-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowPaymentPopup(false);
          }}
        >
          <div className="billing-payment-popup" role="dialog" aria-modal="true" aria-label="Multiple payment">
            <div className="billing-payment-popup-header">
              <div>
                <strong>Payment</strong>
                <span>Total {formatCurrency(totals.finalTotal)}</span>
              </div>
              <button type="button" onClick={() => setShowPaymentPopup(false)} aria-label="Close payment popup">
                <X size={16} />
              </button>
            </div>

            <div className="billing-payment-popup-rows">
              {PAYMENT_METHODS.filter((method) => method.id !== 'credit').map((method) => {
                const split = paymentSplits.find((row) => row.id === method.id) || {};
                return (
                  <div key={method.id} className="billing-payment-popup-row">
                    <label>{method.label}</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={split.amount || ''}
                      onChange={(e) => updatePaymentSplit(method.id, 'amount', e.target.value)}
                    />
                    <button type="button" onClick={() => fillPaymentSplit(method.id)}>Full</button>
                    {['upi', 'bank', 'card'].includes(method.id) && (
                      <input
                        className="billing-payment-popup-ref"
                        placeholder={method.id === 'upi' ? 'UPI Ref / UTR (optional)' : 'UTR / Transaction No.'}
                        value={split.reference || ''}
                        onChange={(e) => updatePaymentSplit(method.id, 'reference', e.target.value)}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="billing-payment-popup-footer">
              <div>
                <span>Received</span>
                <strong>{formatCurrency(paymentSplitTotal)}</strong>
              </div>
              <div>
                <span>Balance / Credit</span>
                <strong>{formatCurrency(customerBalanceAfterInvoice)}</strong>
              </div>
              {paymentSplitTotal > totals.finalTotal && (
                <div className="billing-payment-popup-change">
                  <span>{isRetailPosInvoice ? 'Change' : 'Extra Received'}</span>
                  <strong>{formatCurrency(paymentSplitTotal - totals.finalTotal)}</strong>
                </div>
              )}
              <button type="button" onClick={() => setShowPaymentPopup(false)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {showPreview && (
        <DocumentPreviewModal
          config={config}
          customer={getEffectiveCustomer()}
          docMeta={docMeta}
          docExtra={docExtra}
          items={displayItems}
          charges={charges}
          totals={totals}
          notes={notes}
          terms={terms}
          supplyType={supplyType}
          bizSettings={previewBizSettings}
          shipping={shipping}
          sameShipping={sameShipping}
          tds={tds}
          tcs={tcs}
          advanceAmt={advanceAmt}
          paymentMethod={currentPaymentMethodLabel()}
          paymentSplits={paymentSplits}
          addDiscount={addDiscount}
          autoPrint={autoPrintPreview}
          downloadAsPdf={downloadPdfMode}
          pdfMode={downloadPdfMode}
          invoiceNumber={docMeta.number}
          onClose={() => {
            setShowPreview(false);
            setAutoPrintPreview(false);
            setDownloadPdfMode(false);
            if (previewRedirectOnClose) {
              window.location.assign(LIST_ROUTES[documentType] ?? '/billing/invoice');
            }
          }}
        />
      )}

      {/* Hidden preview used only to generate PDF for email attachment */}
      {emailPdfMode && (
        <div className="pdf-download-stage">
          <DocumentPreviewModal
            embedded
            config={config}
            customer={getEffectiveCustomer()}
            docMeta={docMeta}
            docExtra={docExtra}
            items={displayItems}
            charges={charges}
            totals={totals}
            notes={notes}
            terms={terms}
            supplyType={supplyType}
            bizSettings={previewBizSettings}
            shipping={shipping}
            sameShipping={sameShipping}
            tds={tds}
            tcs={tcs}
            advanceAmt={advanceAmt}
            paymentMethod={currentPaymentMethodLabel()}
            paymentSplits={paymentSplits}
            addDiscount={addDiscount}
            invoiceNumber={docMeta.number}
            pdfMode
            onPdfReady={(base64) => {
              setEmailPdfMode(false);
              if (emailPdfResolve.current) {
                emailPdfResolve.current(base64);
                emailPdfResolve.current = null;
              }
            }}
          />
        </div>
      )}

      {/* ── Email Modal ── */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 print:hidden">
          <div className="w-full max-w-sm rounded-xl border border-[#dfe7f1] bg-white shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="font-semibold text-[15px] text-[#111827]">Send Invoice by Email (PDF Attachment)</div>
              <button type="button" className="text-gray-400 hover:text-gray-600 border-0 bg-transparent cursor-pointer" onClick={() => setShowEmailModal(false)}>
                <svg fill="none" height="18" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <label className="block text-xs font-medium text-[#536173] mb-1">Send To</label>
            <input
              type="email"
              className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] w-full outline-none focus:border-blue-500 font-[inherit] mb-4"
              placeholder={`${partyKindLower}@email.com`}
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              disabled={emailSending}
            />
            {emailResult && (
              <div className={`text-[13px] rounded-md px-3 py-2 mb-3 ${emailResult.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                {emailResult.msg}
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <button type="button" className={cx.btnOutline} onClick={() => setShowEmailModal(false)} disabled={emailSending}>Cancel</button>
              <button
                type="button"
                className={cx.btnPrimary}
                disabled={emailSending || !emailTo.trim()}
                onClick={handleSendEmail}
              >
                {emailPdfMode ? 'Preparing PDF…' : emailSending ? 'Sending…' : 'Send with PDF'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPrintConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 px-4 print:hidden">
          <div className="w-full max-w-sm rounded-lg border border-[#dfe7f1] bg-white shadow-xl">
            <div className="border-b border-[#edf2f7] px-5 py-4">
              <div className="text-[15px] font-semibold text-[#111827]">Was the bill printed?</div>
              <div className="mt-1 text-[12px] text-[#536173]">
                Save it to the invoice list only if the print was completed.
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4">
              <button type="button" className={cx.btnOutline} onClick={() => setShowPrintConfirm(false)}>
                No, Keep Draft
              </button>
              <button
                type="button"
                className={cx.btnPrimary}
                disabled={saveLoading}
                onClick={() => {
                  setShowPrintConfirm(false);
                  handleSave();
                }}
              >
                {saveLoading ? 'Saving...' : 'Yes, Save Bill'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}





