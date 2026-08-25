import { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
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
import { getInvoicePrintTemplate, setInvoicePrintTemplate } from './invoiceTemplatePreference.js';
import { CalculatorPopup } from './CalculatorPopup.jsx';
import { MOBILE_ADD_ITEM_EVENT } from '../../../../../../components/layout/MobileBottomNav.jsx';
import { SelectDropdown } from '../../../../../../components/forms/SelectDropdown.jsx';
import { AutocompleteInput } from '../../../../../../components/forms/AutocompleteInput.jsx';

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

// ── Constants ────────────────────────────────────────────────────────────────

const UNITS = ['Nos', 'Pcs', 'Kg', 'Gm', 'Mt', 'Sq.ft', 'Ltr', 'Box', 'Bag', 'Set', 'Pair', 'Hrs', 'Days'];
const GST_RATES = [0, 5, 12, 18, 28];
const BUSINESS_STATE = 'Tamil Nadu';

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
  const discountAmt = gross * (item.discount / 100);
  const taxable     = gross - discountAmt;
  const gstAmt      = taxable * (item.gstRate / 100);
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

function addDaysInput(dateInput, days) {
  const d = dateInput ? new Date(`${dateInput}T00:00:00`) : new Date();
  const offset = Number.isFinite(Number(days)) ? Number(days) : 0;
  d.setDate(d.getDate() + offset);
  return formatDateInput(d);
}

function electronicsNote(product = {}) {
  if (product.itemGroup !== 'Electronics') return '';
  const lines = [];
  if (product.modelNumber) lines.push(`Model: ${product.modelNumber}`);
  if (product.warrantyPeriod) lines.push(`Warranty: ${product.warrantyPeriod}`);
  if (product.serialNumber) lines.push(`Serial/IMEI: ${product.serialNumber}`);
  return lines.join('\n');
}

function normalizeProduct(product = {}) {
  const description = product.description || product.name || product.productName || '';
  const productDescription = product.productDescription
    || product.itemDescription
    || product.lineDescription
    || product.details
    || product.note
    || product.remark
    || electronicsNote(product)
    || '';
  return {
    ...product,
    _id: product._id ?? product.id ?? description,
    id: product.id ?? product._id ?? description,
    description,
    barcode: product.barcode || '',
    code: product.code || product.sku || '',
    hsn: product.hsn ?? '',
    itemType: product.itemType === 'Service' ? 'Service' : 'Product',
    unit: product.unit || 'Nos',
    rate: Number(product.rate ?? product.sellingPrice ?? product.price ?? 0),
    gstRate: Number(product.gstRate ?? product.taxRate ?? product.gstPercentage ?? product.gst ?? product.taxPercent ?? 18),
    productDescription,
  };
}

function variantDisplayName(variant = {}) {
  return String(variant.size || variant.modelName || '').trim();
}

function productWithSelectedVariant(product = {}, variant = {}) {
  const selectedVariantName = variantDisplayName(variant);
  if (!selectedVariantName) return product;
  return {
    ...product,
    __selectedVariantName: selectedVariantName,
    rate: Number(variant.rate) > 0 ? Number(variant.rate) : product.rate,
  };
}

function productVariantSearchLabel(product = {}, variant = {}) {
  const name = variantDisplayName(variant);
  return name ? `${name} - ${product.description || product.name || 'Product'}` : '';
}

function variantColumnLabel(product = {}) {
  return product?.itemGroup === 'Textile' ? 'Size' : 'Model Name';
}

function findVariantByValue(variants = [], value = '') {
  const needle = String(value || '').trim();
  return variants.find((variant) => variantDisplayName(variant) === needle);
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
  return products.find((product) => productId && String(product._id || product.id) === productId)
    || products.find((product) => code && text(product.code) === code)
    || products.find((product) => description && text(product.description) === description)
    || null;
}

function enrichItemsWithProductDescriptions(items = [], products = []) {
  return items.map((item) => {
    if (String(item.itemDescription || '').trim()) return item;
    const product = findCatalogProductForItem(products, item);
    return product?.productDescription ? { ...item, itemDescription: product.productDescription } : item;
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
  const best = (matches) => matches.find((p) => String(p.productDescription || '').trim()) || matches[0];
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
  const best = (matches) => matches.find((p) => String(p.productDescription || '').trim()) || matches[0];
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

// Sales documents keep the existing unknown-barcode flow. Purchase Entry
// handles unknown products as draft rows and creates them when saved.
function openAddProductForBarcode(barcode) {
  window.open(`/products?newBarcode=${encodeURIComponent(barcode)}`, '_blank');
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
        if (!window.BarcodeDetector) {
          const video = videoRef.current;
          if (!video) return;
          const reader = new BrowserMultiFormatReader(createZxingHints(), {
            delayBetweenScanAttempts: 120,
            delayBetweenScanSuccess: 700,
          });
          const controls = await reader.decodeFromConstraints(
            {
              video: {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
              audio: false,
            },
            video,
            (result) => {
              const value = String(result?.getText?.() || '').trim();
              const now = Date.now();
              const repeatedTooSoon = lastScanRef.current.value === value && now - lastScanRef.current.at < 1300;
              if (value && !repeatedTooSoon) {
                lastScanRef.current = { value, at: now };
                onDetectedRef.current(value);
              }
            },
          );
          if (cancelled) {
            controls.stop();
            return;
          }
          zxingControlsRef.current = controls;
          setCameraReady(true);
          return;
        }

        const supportedFormats = await window.BarcodeDetector.getSupportedFormats?.();
        const preferredFormats = ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code'];
        const formats = Array.isArray(supportedFormats)
          ? preferredFormats.filter((format) => supportedFormats.includes(format))
          : preferredFormats;
        const detector = new window.BarcodeDetector(formats.length ? { formats } : undefined);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
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
              const value = String(codes?.[0]?.rawValue || '').trim();
              const now = Date.now();
              const repeatedTooSoon = lastScanRef.current.value === value && now - lastScanRef.current.at < 1300;
              if (value && !repeatedTooSoon) {
                lastScanRef.current = { value, at: now };
                onDetectedRef.current(value);
              }
            } catch {
              setCameraError('Unable to read from camera. Try better light or a clearer barcode.');
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
    linkedPurchaseOrderId: '', linkedPurchaseOrderNo: '', vendorInvoiceNo: '', purchaseOrderTotal: '',
    vehicleNumber: '', driverName: '', transporter: '',
    transporterId: '', distanceKm: '', ewbSupplyType: 'outward',
    irnNumber: '', ackNumber: '', ackDate: '',
  });

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const initialLinkedPurchaseOrderId = useRef(getInitialLinkedPurchaseOrderId());
  const autoAppliedPurchaseOrderId = useRef('');
  const [bizSettings, setBizSettings] = useState({});
  const bizState = bizSettings.state || BUSINESS_STATE;
  const nextItemId = useRef(1001);
  const nextChargeId = useRef(2000);
  const [invoiceLoading, setInvoiceLoading] = useState(Boolean(invoiceId));
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [bulkGstRate, setBulkGstRate] = useState(18);

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
  const [printTemplate, setPrintTemplate] = useState(() => getInvoicePrintTemplate());
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
  const [productSearch, setProductSearch]       = useState('');
  const [mobileScreen, setMobileScreen] = useState('invoice');
  const [mobileProductQuery, setMobileProductQuery] = useState('');
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [barcodeScanStatus, setBarcodeScanStatus] = useState('');
  const [unknownBarcode, setUnknownBarcode] = useState('');

  useEffect(() => {
    function handleMobileAddItem() { setMobileScreen('items'); }
    window.addEventListener(MOBILE_ADD_ITEM_EVENT, handleMobileAddItem);
    return () => window.removeEventListener(MOBILE_ADD_ITEM_EVENT, handleMobileAddItem);
  }, []);
  const [quickItem, setQuickItem] = useState({ itemType: 'Product', hsn: '', qty: 1, unit: 'Nos', rate: 0, discount: 0, gstRate: 18 });
  const [showPhoneDrop, setShowPhoneDrop]       = useState(false);
  const [showAddCustomer, setShowAddCustomer]   = useState(false);
  const [newCustomerForm, setNewCustomerForm]   = useState(() => emptyCustomer());
  const [customerSaving, setCustomerSaving]       = useState(false);
  const [customerSaveError, setCustomerSaveError] = useState('');

  useEffect(() => {
    setInvoicePrintTemplate(printTemplate);
  }, [printTemplate]);
const [customFields, setCustomFields]         = useState([]);
  const [recurring, setRecurring]               = useState({ enabled: false, frequency: 'monthly', endAfter: '', endDate: '' });
  const [showAddDiscount, setShowAddDiscount]   = useState(false);
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

  const quickDraftItem = useMemo(() => {
    const query = String(productSearch || '').trim();
    if (!query) return null;
    const matched = findProductByExactEntry(products, query);
    const normalized = matched ? normalizeProduct(matched) : null;
    return {
      id: '__quick_draft__',
      productId: normalized?.id || null,
      productCode: normalized?.code || '',
      barcode: normalized?.barcode || '',
      itemType: normalized?.itemType || quickItem.itemType || 'Product',
      description: normalized?.description || query,
      itemDescription: normalized?.productDescription || '',
      hsn: quickItem.hsn || normalized?.hsn || '',
      size: normalized?.__selectedVariantName || '',
      qty: Number(quickItem.qty) || 1,
      unit: quickItem.unit || normalized?.unit || 'Nos',
      rate: Number(quickItem.rate || normalized?.rate) || 0,
      discount: Number(quickItem.discount) || 0,
      gstRate: Number(quickItem.gstRate ?? normalized?.gstRate ?? 0),
    };
  }, [productSearch, products, quickItem]);

  const effectiveItems = useMemo(
    () => (quickDraftItem ? [...items, quickDraftItem] : items),
    [items, quickDraftItem],
  );

  function validate() {
    const errs = {};
    const effectiveCustomer = getEffectiveCustomer();

    // ── Common (all document types) ──────────────────────────────────────────
    if (!effectiveCustomer.name.trim())
      errs.customerName = `${config.partyNameLabel.replace(' *', '')} is required`;
    if (!docMeta.number.trim())
      errs.invoiceNumber = `${config.title} number cannot be empty`;
    if (!docMeta.date)
      errs.invoiceDate = `${config.dateLabel} is required`;
    const hasValidItem = documentType === 'purchase-entry'
      ? effectiveItems.some((it) => it.description && Number(it.qty) > 0 && Number(it.rate) > 0)
      : effectiveItems.some((it) => it.description && Number(it.qty) > 0);
    if (!hasValidItem) {
      errs.items = documentType === 'purchase-entry'
        ? 'Add at least one item with a name, qty > 0, and rate > 0'
        : 'Add at least one item with a description and qty > 0';
    }
    effectiveItems.forEach((it, idx) => {
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

  const totals = useMemo(() => {
    const acc = { subtotal: 0, discount: 0, taxable: 0, totalGst: 0, grandTotal: 0, gstByRate: {} };
    effectiveItems.forEach((item) => {
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
    const balanceDue   = finalTotal - (Number(advanceAmt) || 0);

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
  }, [effectiveItems, charges, addDiscount, tds, tcs, advanceAmt, config.showGst, documentType, manualQuotationTotal]);

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
      const productId = item.productId ?? item.product?._id ?? item.product?.id ?? null;
      const matchedProduct = productId
        ? products.find((product) => String(product._id || product.id) === String(productId))
        : null;
      return {
        id: index + 1,
        itemType: item.itemType === 'Service' || matchedProduct?.itemType === 'Service' ? 'Service' : 'Product',
        productId,
        productCode: item.productCode || item.code || matchedProduct?.code || '',
        description: lineItemDescription(item) || matchedProduct?.description || '',
        itemDescription: item.itemDescription ?? item.lineDescription ?? item.details ?? item.note ?? item.remark ?? '',
        hsn: item.hsn || matchedProduct?.hsn || '',
        qty: Number(item.qty) || 1,
        unit: item.unit || matchedProduct?.unit || 'Nos',
        rate: Number(item.rate ?? matchedProduct?.rate) || 0,
        discount: Number(item.discount) || 0,
        gstRate: Number(item.gstRate ?? matchedProduct?.gstRate) || 0,
      };
    }));
    setCharges(Array.isArray(po.charges) ? po.charges.map((charge, index) => ({ id: 2000 + index, ...charge })) : []);
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
      return next;
    }));
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
            description: '',
            itemDescription: '',
            hsn: '',
            size: '',
            qty: 1,
            unit: 'Nos',
            rate: 0,
            discount: 0,
            gstRate: 18,
          }
        : item,
    ));
  }

  function applyGstRateToAllItems() {
    const rate = Number(bulkGstRate) || 0;
    setItems((prev) => prev.map((item) => ({ ...item, gstRate: rate })));
    // Also carry the rate onto whatever's currently being typed in the quick-add
    // row (not yet a real item) — otherwise committing it afterward falls back
    // to the product's own catalog rate, silently ignoring this bulk choice.
    setQuickItem((prev) => ({ ...prev, gstRate: rate }));
  }

  function addItem() {
    const id = nextItemId.current++;
    setItems((prev) => [...prev, { id, productId: null, productCode: '', itemType: 'Product', description: '', itemDescription: '', hsn: '', qty: 1, unit: 'Nos', rate: 0, discount: 0, gstRate: 18 }]);
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

    const columns = ['description', 'itemDescription', 'hsn', 'qty', 'unit', 'rate', 'discount', ...(config.showGst ? ['gstRate'] : [])];
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
              description: normalized.description,
              itemDescription: normalized.productDescription || item.itemDescription || '',
              hsn: normalized.hsn,
              size: normalized.__selectedVariantName || '',
              unit: normalized.unit,
              rate: normalized.rate,
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
      && String(item.size || '') === String(normalized.__selectedVariantName || '')
    ));

    if (existing) {
      setItems((prev) => prev.map((item) => (
        item.id === existing.id
          ? {
              ...item,
              qty: Number(item.qty || 0) + 1,
              itemDescription: item.itemDescription || normalized.productDescription || '',
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
    setItems((prev) => [...prev, { id, productId: null, productCode: '', itemType: 'Product', description: '', itemDescription: '', hsn: '', qty: 1, unit: 'Nos', rate: 0, discount: 0, gstRate: 18 }]);
    window.setTimeout(() => selectProduct(id, normalized), 0);
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

  async function resolveProductByScan(query) {
    const local = findProductByScan(products, query);
    if (local && String(local.productDescription || '').trim()) return local;

    try {
      const [salesData, invData] = await Promise.allSettled([
        api.listProducts(query),
        api.invListProducts({ search: query, page: 1, limit: 20 }),
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
      return match ? mergeScannedProduct(match) : local;
    } catch (err) {
      console.warn('Unable to resolve scanned product', err);
      return null;
    }
  }

  async function handleCameraBarcodeDetected(code) {
    const value = String(code || '').trim();
    if (!value) return;

    setBarcodeScanStatus(`Scanning ${value}...`);
    setUnknownBarcode('');
    setMobileProductQuery(value);

    const product = await resolveProductByScan(value);
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
    const wanted = itemType === 'Service' ? 'Service' : 'Product';
    return products.filter((p) => (p.itemType === 'Service' ? 'Service' : 'Product') === wanted);
  }

  function productSearchOptions(itemType) {
    const seen = new Set();
    const options = [];
    for (const product of productsOfType(itemType)) {
      const description = String(product.description || '').trim();
      if (description && !seen.has(description)) {
        seen.add(description);
        options.push({ value: description, label: description, badge: product.itemType === 'Service' ? 'Service' : 'Product' });
      }
      for (const variant of product.variants || []) {
        const label = productVariantSearchLabel(product, variant);
        if (!label || seen.has(label)) continue;
        seen.add(label);
        options.push({ value: label, label, badge: variantColumnLabel(product) });
      }
    }
    return options;
  }

  function setQuickItemType(type) {
    setQuickItem((prev) => ({ ...prev, itemType: type, hsn: '', rate: 0 }));
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
    const chosen = findProductByExactEntry(products, value);
    if (chosen && String(chosen.productDescription || '').trim()) {
      selectProduct(itemId, chosen);
      return true;
    }

    const scanned = await resolveProductByScan(value);
    if (scanned) {
      selectProduct(itemId, scanned);
      return true;
    }

    if (chosen) {
      selectProduct(itemId, chosen);
      return true;
    }

    return false;
  }

  async function addProductFromSearch(rawQuery = productSearch) {
    const query = String(rawQuery || '').trim();
    if (!query) return;

    const localScanMatch = isLikelyBarcodeScan(query) ? findProductByScan(products, query) : null;
    if (documentType !== 'purchase-entry' && !localScanMatch && isLikelyBarcodeScan(query)) {
      // Open synchronously (before any await) — mobile browsers silently
      // block window.open() once a promise/await has broken the chain back
      // to the user's tap/keypress.
      openAddProductForBarcode(query);
      setProductSearch('');
      return;
    }

    const chosen = localScanMatch || await resolveProductByScan(query);
    const target = items.find((item) => !item.description);

    if (chosen) {
      addProductToBill(chosen);
    } else if (target) {
      updateItem(target.id, 'description', query);
    } else {
      setItems((prev) => [...prev, { id: nextItemId.current++, productId: null, productCode: '', itemType: 'Product', description: query, itemDescription: '', hsn: '', qty: 1, unit: 'Nos', rate: 0, discount: 0, gstRate: 18 }]);
    }

    setProductSearch('');
    clearError('items');
  }

  function updateQuickItem(field, value) {
    setQuickItem((prev) => ({ ...prev, [field]: ['qty', 'rate', 'discount', 'gstRate'].includes(field) ? Number(value) : value }));
  }

  function resetQuickItem() {
    setQuickItem((prev) => ({ itemType: prev.itemType || 'Product', hsn: '', qty: 1, unit: 'Nos', rate: 0, discount: 0, gstRate: Number(prev.gstRate ?? 18) }));
  }

  function prefillQuickItemFromProduct(value) {
    const chosen = findProductByExactEntry(products, value);
    if (!chosen) return;
    const normalized = normalizeProduct(chosen);
    setQuickItem((prev) => ({
      ...prev,
      itemType: normalized.itemType || prev.itemType,
      hsn: normalized.hsn || prev.hsn,
      unit: normalized.unit || prev.unit || 'Nos',
      rate: Number(normalized.rate) || prev.rate || 0,
      gstRate: Number(normalized.gstRate ?? prev.gstRate ?? 18),
    }));
  }

  async function addQuickItem(rawQuery = productSearch) {
    const query = String(rawQuery || '').trim();
    if (!query) {
      document.querySelector('[data-fkey="product"]')?.focus();
      return;
    }

    const exact = findProductByExactEntry(products, query);
    const localScanMatch = !exact && isLikelyBarcodeScan(query) ? findProductByScan(products, query) : null;
    if (documentType !== 'purchase-entry' && !exact && !localScanMatch && isLikelyBarcodeScan(query)) {
      // Open synchronously (before any await) — mobile browsers silently
      // block window.open() once a promise/await has broken the chain back
      // to the user's tap/keypress, which left the barcode just sitting in
      // the field with nothing visibly happening.
      openAddProductForBarcode(query);
      setProductSearch('');
      return;
    }

    const chosen = exact || localScanMatch || await resolveProductByScan(query);
    const normalized = chosen ? normalizeProduct(chosen) : null;
    const id = nextItemId.current++;
    setItems((prev) => [...prev, {
      id,
      productId: normalized?.id || null,
      productCode: normalized?.code || '',
      barcode: normalized?.barcode || '',
      itemType: normalized?.itemType || quickItem.itemType || 'Product',
      description: normalized?.description || query,
      itemDescription: normalized?.productDescription || '',
      hsn: quickItem.hsn || normalized?.hsn || '',
      size: normalized?.__selectedVariantName || '',
      qty: Number(quickItem.qty) || 1,
      unit: quickItem.unit || normalized?.unit || 'Nos',
      rate: Number(quickItem.rate || normalized?.rate) || 0,
      discount: Number(quickItem.discount) || 0,
      gstRate: Number(quickItem.gstRate ?? normalized?.gstRate ?? 0),
    }]);
    setProductSearch('');
    resetQuickItem();
    clearError('items');
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

  function buildPayload(customerOverride) {
    const effectiveCustomer = customerOverride || getEffectiveCustomer();
    const paidAmount = selectedPayment && selectedPayment !== 'credit'
      ? Math.min(Number(advanceAmt) || 0, totals.finalTotal || 0)
      : Number(advanceAmt) || 0;
    const extra = documentType === 'purchase-entry'
      ? {
        ...docExtra,
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
      items: enrichItemsWithProductDescriptions(effectiveItems, products),
      shipping: { sameAsBilling: sameShipping, ...shipping },
      charges,
      additionalDiscount: addDiscount,
      tds,
      tcs,
      advanceReceived: paidAmount,
      paymentMethod: selectedPayment ? (PAYMENT_METHODS.find((m) => m.id === selectedPayment)?.label ?? '') : '',
      totals,
      notes,
      internalNotes,
      terms,
      customFields,
      recurring,
      extra,
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

  const NEW_ROUTES = {
    invoice: '/billing/invoice/new', 'bill-of-supply': '/billing/bill-of-supply/new', quotation: '/billing/quotation/new',
    'purchase-order': '/billing/purchase-order/new', 'purchase-entry': '/billing/purchase-entry/new', 'credit-note': '/billing/credit-note/new',
    'debit-note': '/billing/debit-note/new', 'sales-return': '/billing/sales-return/new', 'supplier-return': '/billing/supplier-return/new',
    'delivery-challan': '/billing/delivery-challan/new', 'e-invoice': '/billing/e-invoice/new', 'e-way-bill': '/billing/e-way-bill/new',
    'pharmacy-bill': '/billing/pharmacy-bill/new',
  };

  async function saveDocumentPayload(payload, id = invoiceId) {
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

  async function handleSave({ openPreview, autoPrint } = {}) {
    setSaveError('');
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setTimeout(() => document.querySelector('[data-validation-error]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
      return;
    }
    setErrors({});
    if (openPreview && autoPrint) {
      setAutoPrintPreview(true);
      setPreviewRedirectOnClose(true);
      setShowPreview(true);
    }
    setSaveLoading(true);
    try {
      const rememberedCustomer = await rememberCustomerForPhone(getEffectiveCustomer());
      const payload = buildPayload(rememberedCustomer);
      const savedDoc = await saveDocumentPayload(payload);
      if (savedDoc?._id) setSavedInvoiceId(savedDoc._id);

      // Create a Payment record if a method other than Credit is selected
      if (['invoice', 'bill-of-supply', 'pharmacy-bill'].includes(effectiveDocumentType) && selectedPayment && selectedPayment !== 'credit' && savedDoc?._id) {
        const rawPayAmt = Number(paymentData.amount) || totals.finalTotal;
        const payAmt = Math.min(rawPayAmt, totals.finalTotal);
        if (payAmt > 0) {
          const m = PAYMENT_METHODS.find((x) => x.id === selectedPayment);
          await api.recordPayment(savedDoc._id, {
            amount:    payAmt,
            date:      paymentData.date || new Date().toISOString().slice(0, 10),
            method:    m?.method ?? 'Cash',
            reference: paymentData.utrNumber || paymentData.chequeNo || '',
            notes:     paymentData.notes || '',
          });
        }
      }

      if (openPreview) {
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

  function handlePrintBill() {
    setSaveError('');
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setTimeout(() => document.querySelector('[data-validation-error]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
      return;
    }

    setErrors({});
    flushSync(() => {
      setAutoPrintPreview(false);
      setPreviewRedirectOnClose(false);
      setShowPreview(true);
    });
    window.focus();
    window.print();
    setShowPrintConfirm(true);
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
    const next = selectedPayment === id ? null : id;
    setSelectedPayment(next);
    if (next && next !== 'credit') {
      const defaultAmt = String(Math.max(0, totals.finalTotal));
      setPaymentData((p) => ({ ...p, amount: p.amount || defaultAmt }));
      setAdvanceAmt((a) => a || defaultAmt);
    } else {
      setAdvanceAmt('0');
    }
  }

  const filteredCustomers = customers.filter((c) =>
    !customerQuery ||
    (c.name || '').toLowerCase().includes(customerQuery.toLowerCase()) ||
    (c.gstin || '').toLowerCase().includes(customerQuery.toLowerCase()) ||
    (c.phone || '').toLowerCase().includes(customerQuery.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(customerQuery.toLowerCase()),
  );

  const gstinValid = customer.gstin.length === 15;

  const phoneDigits = customer.phone.replace(/\D/g, '');
  const matchingByPhone = phoneDigits.length >= 3
    ? customers.filter((c) => (c.phone || '').replace(/\D/g, '').includes(phoneDigits))
    : [];

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
        if (active) setBizSettings(biz);
      } catch (err) {
        console.warn('Unable to load business settings', err);
      }

      try {
        const [salesData, invData] = await Promise.allSettled([
          api.listProducts(),
          api.invListProducts(),
        ]);
        const salesRows = salesData.status === 'fulfilled'
          ? (Array.isArray(salesData.value) ? salesData.value : salesData.value?.data)
          : [];
        const invRows = invData.status === 'fulfilled'
          ? (Array.isArray(invData.value) ? invData.value : invData.value?.data)
          : [];
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
        if (active) setProducts([]);
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
          if (documentType === 'credit-note')           next = await api.getCreditNoteNextNumber();
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
      setItems((Array.isArray(invoice.items) ? invoice.items : []).map((item, index) => ({ id: item.id ?? index + 1, itemType: item.itemType === 'Service' ? 'Service' : 'Product', ...item })));
      setCharges(Array.isArray(invoice.charges) ? invoice.charges : []);
      setAddDiscount(invoice.additionalDiscount ?? { type: 'percent', value: '' });
      setTds(invoice.tds ?? { enabled: false, section: '194C', rate: 2 });
      setTcs(invoice.tcs ?? { enabled: false, rate: 1 });
      setAdvanceAmt(invoice.advanceReceived != null ? String(invoice.advanceReceived) : '');
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
        linkedPurchaseOrderId: '', linkedPurchaseOrderNo: '', vendorInvoiceNo: '', purchaseOrderTotal: '',
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
      keyboardMode,
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
        const { addProductToBill, addQuickItem, resolveProductByScan, products } = shortcutState.current;
        const localScanMatch = isLikelyBarcodeScan(value) ? findProductByScan(products, value) : null;
        if (!localScanMatch && isLikelyBarcodeScan(value)) {
          if (documentType === 'purchase-entry') {
            addQuickItem(value);
          } else {
            // Keep the existing barcode workflow for sales documents.
            openAddProductForBarcode(value);
          }
        } else {
          (localScanMatch ? Promise.resolve(localScanMatch) : resolveProductByScan(value)).then((product) => {
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
      if (!shortcutState.current?.keyboardMode) return;
      if (captureScannerInput(e)) return;

      const { showPreview, previewRedirectOnClose, saveLoading, handleSave, handlePrintBill, addItem } = shortcutState.current;
      const mod = e.ctrlKey || e.metaKey;

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

      if (mod && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        if (!saveLoading) handlePrintBill();
        return;
      }

      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        addItem();
        return;
      }

      if (e.altKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        window.location.assign(LIST_ROUTES[documentType] ?? '/billing/invoice');
        return;
      }

      // Function-key shortcuts (no modifier) — actions vary by documentType
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === 'F1')  { e.preventDefault(); toggleQuickItemType(); return; }
        if (e.key === 'F2')  { e.preventDefault(); if (!saveLoading) handleSave(); return; }
        if (e.key === 'F3')  { e.preventDefault(); setAutoPrintPreview(false); setShowPreview(true); return; }
        if (e.key === 'F4')  { e.preventDefault(); if (!saveLoading) handlePrintBill(); return; }
        if (e.key === 'F5')  { e.preventDefault(); document.querySelector('[data-fkey="party"]')?.focus(); return; }
        if (e.key === 'F6')  { e.preventDefault(); document.querySelector('[data-fkey="product"]')?.focus(); return; }
        if (e.key === 'F9')  { e.preventDefault(); setShowCalculator((v) => !v); return; }
        if (e.key === 'F10') { e.preventDefault(); window.location.assign('/business-settings'); return; }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displayItems = useMemo(
    () => enrichItemsWithProductDescriptions(effectiveItems, products),
    [effectiveItems, products],
  );
  const receivedAmount = Number(paymentData.amount) || 0;
  const changeAmount = Math.max(0, receivedAmount - (totals.finalTotal || 0));
  const posDate = docMeta.date ? docMeta.date.split('-').reverse().join('-') : '';
  const posTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const mobileProductResults = useMemo(() => {
    const query = normalizeScanText(mobileProductQuery);
    const rows = products;
    if (!query) return rows.slice(0, 18);
    return rows.filter((product) => {
      const haystack = [
        product.description,
        product.code,
        product.barcode,
        product.hsn,
        product.brand,
        product.category,
        ...(product.variants || []).map(variantDisplayName),
      ].map(normalizeScanText).join(' ');
      return haystack.includes(query);
    }).slice(0, 18);
  }, [mobileProductQuery, products]);

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

  // ── JSX ──────────────────────────────────────────────────────────────────────

  return (
    <div className={`billing-v2 p-4 md:p-7 ${isRetailPosInvoice ? 'billing-pos-screen' : ''}`}>
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
              className="border border-[#dbe4ef] rounded-md px-2.5 py-1 text-[13px] font-semibold text-[#111827] w-32 outline-none focus:border-blue-500 font-[inherit]"
              value={docMeta.number}
              onChange={(e) => updateMeta('number', e.target.value)}
              onBlur={() => setNumberEditing(false)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); setNumberEditing(false); } }}
            />
          ) : (
            <button
              type="button"
              onClick={() => setNumberEditing(true)}
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#111827] bg-white border border-[#dbe4ef] rounded-md px-2.5 py-1 cursor-pointer font-[inherit]"
              title="Click to edit document number"
            >
              {docMeta.number || '—'}
              <Pencil size={11} className="text-[#94a3b8]" />
            </button>
          )}

          <label className="inline-flex items-center gap-1.5 border border-[#dbe4ef] rounded-md px-2.5 py-1.5 text-[13px] text-[#374151] bg-white cursor-pointer">
            <Calendar size={13} className="text-[#94a3b8]" />
            <input type="date" value={docMeta.date} onChange={(e) => updateMeta('date', e.target.value)} className="border-0 bg-transparent outline-none text-[13px] font-[inherit]" />
          </label>

          <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-[#dbe4ef] rounded-md text-[13px] text-[#374151] bg-white">
            <SelectDropdown
              value={printTemplate}
              onChange={setPrintTemplate}
              className="min-w-28"
              buttonClassName="!border-0 !p-0 bg-transparent text-[13px] font-semibold text-[#111827] outline-none font-[inherit]"
              options={[{ value: 'modern', label: 'Modern' }, { value: 'classic', label: 'Classic' }]}
            />
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

      {/* ── Validation Error Banner ── */}
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
              placeholder="Scan barcode or search product (SKU, Name, Code)"
              value={productSearch}
              onChange={(v) => {
                setProductSearch(v);
                prefillQuickItemFromProduct(v);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  addQuickItem(e.currentTarget.value);
                }
              }}
              options={productSearchOptions(quickItem.itemType)}
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
            <button type="button" onClick={openNewCustomerForm} title={`Add ${partyKindLower}`}>+</button>
          </div>
        </section>
      )}

      <div className="billing-workspace">

      {/* ── Customer / Billing / Shipping ── */}
      <div className="col-span-full bg-white border border-[#dfe7f1] rounded-lg p-6 mb-4">
        <div className={`grid grid-cols-1 gap-6 ${config.showPayment ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>

          {/* Customer */}
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-semibold text-[#111827] flex items-center gap-1.5">
              {partyKind} <span className="text-red-500">*</span>
              <span className="hidden md:inline text-[10px] font-bold text-blue-600 bg-blue-50 rounded px-1.5 py-0.5">F5</span>
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
                  className="w-full border border-[#dbe4ef] rounded-md pl-8 pr-3 py-2.5 text-[13px] text-[#111827] outline-none focus:border-blue-500 font-[inherit]"
                  placeholder={`Type name / phone / GSTIN and press Enter`}
                  value={showCustomerDrop ? customerQuery : getEffectiveCustomer().name}
                  onFocus={() => {
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
                    if (e.key === 'Enter' && filteredCustomers[0]) {
                      e.preventDefault();
                      selectCustomer(filteredCustomers[0]);
                    }
                  }}
                />
                <button
                  type="button"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded border border-[#dbe4ef] bg-white text-blue-600 font-bold cursor-pointer"
                  onClick={openNewCustomerForm}
                  title={`Add ${partyKindLower}`}
                >
                  +
                </button>
              </div>

              {showCustomerDrop && (
                <div className="billing-customer-dropdown">
                  {filteredCustomers.length === 0 ? (
                    <div className="billing-customer-empty">No {partyKindLower}s found</div>
                  ) : (
                    filteredCustomers.slice(0, 8).map((c) => (
                      <button
                        key={c._id || c.id || c.phone || c.name}
                        type="button"
                        onMouseDown={() => selectCustomer(c)}
                      >
                        <span>{c.name}</span>
                        <small>{[c.gstin, c.phone, c.city].filter(Boolean).join(' · ')}</small>
                      </button>
                    ))
                  )}
                  <button
                    type="button"
                    className="billing-customer-add-row"
                    onMouseDown={openNewCustomerForm}
                  >
                    <UserPlus size={13} /> Add New {partyKind}
                  </button>
                </div>
              )}
            </div>
            <div className="text-[12px] text-[#536173] flex flex-col gap-0.5 mt-1">
              <div>Phone: {getEffectiveCustomer().phone || '-'} &nbsp;&nbsp; Email: {getEffectiveCustomer().email || '-'}</div>
              <div>GSTIN: {getEffectiveCustomer().gstin || '-'}</div>
              <div>State: {getEffectiveCustomer().state || BUSINESS_STATE}</div>
            </div>
          </div>

          {/* Billing Address */}
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-semibold text-[#111827]">Billing Address</label>
            <button
              type="button"
              onClick={openCustomerEditor}
              className="text-left border border-dashed border-[#dbe4ef] rounded-lg p-3 min-h-[84px] hover:border-blue-400 cursor-pointer bg-[#fafbfe] font-[inherit] flex items-start justify-between gap-2"
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
              <div className="border border-dashed border-[#dbe4ef] rounded-lg p-3 min-h-[84px] bg-[#fafbfe] text-[13px] text-[#94a3b8] flex items-center">Same as billing address</div>
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

        <button
          type="button"
          onClick={() => setShowMoreDetails((v) => !v)}
          className="mt-4 pt-3 border-t border-[#edf2f7] w-full flex items-center justify-between gap-2 text-[13px] font-semibold text-[#374151] cursor-pointer bg-transparent border-0 border-t font-[inherit]"
        >
          More Details
          <ChevronDown size={14} className={`text-[#94a3b8] transition-transform ${showMoreDetails ? 'rotate-180' : ''}`} />
        </button>

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
            <h3 className="m-0 text-[15px] font-semibold mb-4">Original Invoice Reference</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className={cx.field}>
                <label className={cx.label}>Original Invoice No. <span className="text-[10px] text-amber-600 font-normal ml-1">(recommended)</span></label>
                <input data-fkey="ref-invoice" className={errors.originalInvoiceNo ? 'border border-amber-400 bg-amber-50 rounded-md px-3 py-2 text-[13px] text-[#111827] w-full outline-none font-[inherit]' : cx.input} placeholder="e.g. INV-0001" value={docExtra.originalInvoiceNo} onChange={(e) => { updateExtra('originalInvoiceNo', e.target.value); clearError('originalInvoiceNo'); }} />
                {errors.originalInvoiceNo && <p className="text-[11px] text-amber-700 flex items-center gap-1">⚠ {errors.originalInvoiceNo}</p>}
              </div>
              <div className={cx.field}>
                <label className={cx.label}>Original Invoice Date <span className="text-[10px] text-[#94a3b8] font-normal ml-1">(optional)</span></label>
                <input className={cx.input} type="date" value={docExtra.originalInvoiceDate} onChange={(e) => updateExtra('originalInvoiceDate', e.target.value)} />
              </div>
              <div className={cx.field}>
                <label className={cx.label}>{config.reasonLabel} <span className="text-red-500 ml-0.5">*</span></label>
                <input data-fkey="reason" className={errors.reason ? cx.inputError : cx.input} placeholder="Reason for issuing this note" value={docExtra.reason} onChange={(e) => { updateExtra('reason', e.target.value); clearError('reason'); }} />
                {errors.reason && <p className="text-[11px] text-red-600 flex items-center gap-1">⚠ {errors.reason}</p>}
              </div>
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
        <div className="billing-items-panel px-6 py-5 border-b border-[#edf2f7]">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="flex flex-col gap-2">
              <h3 className="m-0 flex items-center gap-2 text-[13px] font-bold uppercase tracking-normal text-[#0f172a]">
                Products
                <span className="hidden md:inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold normal-case text-blue-700">F1</span>
              </h3>
              <div className="flex items-center gap-2">
                {['Product', 'Service'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={`min-w-[70px] rounded-md border px-3.5 py-1.5 text-[12px] font-semibold font-[inherit] cursor-pointer transition-colors ${
                      quickItem.itemType === type
                        ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-[0_0_0_1px_rgba(37,99,235,0.12)]'
                        : 'border-[#dbe4ef] bg-white text-[#374151] hover:border-blue-200 hover:bg-[#f8fafc]'
                    }`}
                    onClick={() => setQuickItemType(type)}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            {config.showGst && (
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-[12px] font-medium text-[#0f172a]" htmlFor="bulk-gst-rate">Tax</label>
                <SelectDropdown
                  value={bulkGstRate}
                  onChange={(v) => setBulkGstRate(Number(v))}
                  buttonClassName="min-w-[76px] !px-3 !py-2 border border-[#dbe4ef] rounded-md text-[12px] font-medium text-[#111827] bg-white outline-none focus:border-blue-500 font-[inherit]"
                  options={GST_RATES.map((rate) => ({ value: rate, label: `${rate}%` }))}
                />
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-md border border-[#dbe4ef] bg-white px-4 py-2 text-[12px] font-semibold text-blue-700 cursor-pointer hover:border-blue-200 hover:bg-blue-50 font-[inherit]"
                  onClick={applyGstRateToAllItems}
                >
                  Apply to all items
                </button>
              </div>
            )}
          </div>

          <div className="billing-product-detail-row">
            <div className="billing-product-field billing-product-name-field">
              <label>Product <span className="max-md:hidden">F6</span></label>
              <div className="relative">
                <AutocompleteInput
                  data-fkey="product"
                  dropDirection="down"
                  placeholder="Scan / Type product name or code and press Enter"
                  value={productSearch}
                  onChange={(v) => {
                    setProductSearch(v);
                    prefillQuickItemFromProduct(v);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.stopPropagation();
                      addQuickItem(e.currentTarget.value);
                    }
                  }}
                  options={productSearchOptions(quickItem.itemType)}
                />
                <button type="button" className="billing-product-scan-btn" onClick={openBarcodeScanner} title="Scan barcode">
                  <Barcode size={15} />
                </button>
                <button type="button" className="billing-product-add-btn" onClick={() => addQuickItem()} title="Add selected product">+</button>
              </div>
            </div>
            <div className="billing-product-field">
              <label>HSN / SAC</label>
              <input
                placeholder={quickItem.itemType === 'Service' ? 'SAC' : 'HSN'}
                value={quickItem.hsn}
                onChange={(e) => updateQuickItem('hsn', e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addQuickItem(); } }}
              />
            </div>
            <div className="billing-product-field">
              <label>Qty</label>
              <input
                min="0"
                type="number"
                value={quickItem.qty}
                onChange={(e) => updateQuickItem('qty', e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addQuickItem(); } }}
              />
            </div>
            <div className="billing-product-field">
              <label>Unit</label>
              <SelectDropdown
                value={quickItem.unit}
                onChange={(v) => updateQuickItem('unit', v)}
                options={UNITS}
              />
            </div>
            <div className="billing-product-field">
              <label>Rate (₹)</label>
              <input
                min="0"
                type="number"
                value={quickItem.rate}
                onChange={(e) => updateQuickItem('rate', e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addQuickItem(); } }}
              />
            </div>
            <div className="billing-product-field">
              <label>Discount (%)</label>
              <input
                min="0"
                max="100"
                type="number"
                value={quickItem.discount}
                onChange={(e) => updateQuickItem('discount', e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addQuickItem(); } }}
              />
            </div>
            {config.showGst && (
              <div className="billing-product-field">
                <label>Tax (%)</label>
                <input
                  min="0"
                  type="number"
                  value={quickItem.gstRate}
                  onChange={(e) => updateQuickItem('gstRate', e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addQuickItem(); } }}
                />
              </div>
            )}
            <button type="button" className="billing-add-item-inline-btn" onClick={() => addQuickItem()}>
              Add Item <span>↵</span>
            </button>
          </div>

          {effectiveItems.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-12 border border-dashed border-[#dbe4ef] rounded-lg bg-[#fafbfe]">
              <ShoppingCart size={36} className="text-[#cbd5e1]" />
              <div className="text-[14px] font-semibold text-[#536173]">No items added yet</div>
              <div className="text-[12.5px] text-[#94a3b8]">Scan barcode or type product name and press Enter to add</div>
            </div>
          )}

          {effectiveItems.length > 0 && (
          <div className="md:hidden flex flex-col gap-3">
            {effectiveItems.map((item, idx) => {
              const line = calcLine(item);
              const matchedProduct = findCatalogProductForItem(products, item);
              const variants = matchedProduct?.variants || [];
              const isService = (matchedProduct?.itemType || item.itemType) === 'Service';
              const selectedVariant = findVariantByValue(variants, item.size);
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
                            if (e.key !== 'Enter') return;
                            const value = e.currentTarget.value.trim();
                            if (!value) return;
                            e.preventDefault();
                            await handleRowProductEntry(item.id, value);
                            clearError('items');
                          }}
                          options={productSearchOptions(item.itemType)}
                        />
                        <div className="flex items-center gap-1 mt-0.5">
                          {['Product', 'Service'].map((type) => (
                            <button
                              key={type}
                              type="button"
                              className={`px-2 py-0.5 rounded-full text-[10px] border cursor-pointer font-[inherit] ${item.itemType === type ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-[#dbe4ef] text-[#536173]'}`}
                              onClick={() => updateItem(item.id, 'itemType', type)}
                            >
                              {type}
                            </button>
                          ))}
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
                        buttonClassName={`w-full border ${errors[`item_size_${idx}`] ? 'border-red-400 bg-red-50' : 'border-[#dbe4ef]'} rounded px-2.5 py-2 text-[13px] text-[#111827] font-[inherit] outline-none bg-white focus:border-blue-500`}
                        value={item.size || ''}
                        onChange={(v) => {
                          selectItemVariant(item.id, matchedProduct, v);
                          setErrors((p) => { const n = { ...p }; delete n[`item_size_${idx}`]; return n; });
                        }}
                        placeholder="—"
                        options={variants.map(variantDisplayName)}
                      />
                      {selectedVariant && (
                        <span className={`text-[11px] font-medium ${stockTextClass(selectedVariant.stock, selectedVariant.minStockLevel)}`}>
                          {selectedVariant.stock} in stock
                        </span>
                      )}
                    </div>
                  )}
                  {!variants.length && matchedProduct && !isService && (
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
                      <input className="w-full border border-[#dbe4ef] rounded px-2.5 py-2 text-[13px] text-[#111827] font-[inherit] outline-none focus:border-blue-500" value={item.hsn} onChange={(e) => updateItem(item.id, 'hsn', e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold uppercase text-[#94a3b8]">Unit</label>
                      <AutocompleteInput value={item.unit} onChange={(v) => updateItem(item.id, 'unit', v)} options={UNITS} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold uppercase text-[#94a3b8]">Qty</label>
                      <input className={`w-full border ${errors[`item_qty_${idx}`] ? 'border-red-400 bg-red-50' : 'border-[#dbe4ef]'} rounded px-2.5 py-2 text-[13px] text-right font-[inherit] outline-none focus:border-blue-500`} min="0" type="number" value={item.qty} onChange={(e) => { updateItem(item.id, 'qty', e.target.value); setErrors((p) => { const n = { ...p }; delete n[`item_qty_${idx}`]; return n; }); }} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold uppercase text-[#94a3b8]">Rate (₹)</label>
                      <input className={`w-full border ${errors[`item_rate_${idx}`] ? 'border-red-400 bg-red-50' : 'border-[#dbe4ef]'} rounded px-2.5 py-2 text-[13px] text-right font-[inherit] outline-none focus:border-blue-500`} min="0" type="number" value={item.rate} onChange={(e) => { updateItem(item.id, 'rate', e.target.value); setErrors((p) => { const n = { ...p }; delete n[`item_rate_${idx}`]; return n; }); }} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold uppercase text-[#94a3b8]">Discount %</label>
                      <input className="w-full border border-[#dbe4ef] rounded px-2.5 py-2 text-[13px] text-right font-[inherit] outline-none focus:border-blue-500" min="0" max="100" type="number" value={item.discount ?? 0} onChange={(e) => updateItem(item.id, 'discount', e.target.value)} />
                    </div>
                    {config.showGst && (
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold uppercase text-[#94a3b8]">Tax %</label>
                        <AutocompleteInput inputClassName="billing-gst-rate-input" type="number" min="0" value={String(item.gstRate ?? 0)} onChange={(v) => updateItem(item.id, 'gstRate', v)} options={GST_RATES.map(String)} />
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
                  {(config.showGst ? [
                    { w: '5%',  label: '#',                 align: 'center' },
                    { w: '15%', label: 'Product Name',      align: 'left' },
                    { w: '8%',  label: 'Size / Model Name', align: 'left' },
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
                    { w: '20%', label: 'Product Name',      align: 'left' },
                    { w: '9%',  label: 'Size / Model Name', align: 'left' },
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
                                if (e.key !== 'Enter') return;
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
                              {['Product', 'Service'].map((type) => (
                                <button
                                  key={type}
                                  type="button"
                                  className={`px-2 py-0.5 rounded-full text-[10px] border cursor-pointer font-[inherit] ${item.itemType === type ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-[#dbe4ef] text-[#536173]'}`}
                                  onClick={() => updateItem(item.id, 'itemType', type)}
                                >
                                  {type}
                                </button>
                              ))}
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

                      <td className="border-t border-[#edf2f7] py-2 px-2 align-top">
                        {(() => {
                          const matchedProduct = findCatalogProductForItem(products, item);
                          const variants = matchedProduct?.variants || [];
                          const isService = (matchedProduct?.itemType || item.itemType) === 'Service';

                          if (!variants.length) {
                            if (!matchedProduct || isService) {
                              return <span className="text-[13px] text-[#9ca3af] pt-1.5 block">—</span>;
                            }
                            const stock = Number(matchedProduct.stock || 0);
                            return (
                              <span className={`text-[12px] font-medium pt-1.5 block ${stockTextClass(stock, matchedProduct.minStockLevel)}`}>
                                {stock} in stock
                              </span>
                            );
                          }

                          const selected = findVariantByValue(variants, item.size);
                          const label = variantColumnLabel(matchedProduct);
                          return (
                            <>
                              <SelectDropdown
                                data-row={idx}
                                data-col="size"
                                buttonClassName={`w-full border ${errors[`item_size_${idx}`] ? 'border-red-400 bg-red-50' : 'border-[#dbe4ef]'} rounded px-2 py-1.5 text-[13px] text-[#111827] font-[inherit] outline-none bg-white focus:border-blue-500`}
                                value={item.size || ''}
                                onChange={(v) => {
                                  selectItemVariant(item.id, matchedProduct, v);
                                  setErrors((p) => { const n = { ...p }; delete n[`item_size_${idx}`]; return n; });
                                }}
                                placeholder="—"
                                options={variants.map(variantDisplayName)}
                              />
                              {selected && (
                                <div className={`mt-1 text-[11px] font-medium ${stockTextClass(selected.stock, selected.minStockLevel)}`}>
                                  {label}: {selected.stock} in stock
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </td>

                      <td className="border-t border-[#edf2f7] py-2 px-2 align-top">
                        <textarea
                          data-row={idx}
                          data-col="itemDescription"
                          className="w-full border border-[#dbe4ef] rounded px-2 py-1.5 text-[13px] text-[#111827] font-[inherit] outline-none focus:border-blue-500 min-w-0 resize-y"
                          placeholder="One point per line..."
                          rows={2}
                          value={item.itemDescription ?? ''}
                          onChange={(e) => updateItem(item.id, 'itemDescription', e.target.value)}
                        />
                      </td>

                      <td className="border-t border-[#edf2f7] py-2 px-2 align-top">
                        <input data-row={idx} data-col="hsn" className="w-full border border-[#dbe4ef] rounded px-2 py-1.5 text-[13px] text-[#111827] font-[inherit] outline-none focus:border-blue-500 min-w-0" placeholder={item.itemType === 'Service' ? 'SAC' : 'HSN'} value={item.hsn} onChange={(e) => updateItem(item.id, 'hsn', e.target.value)} />
                      </td>
                      <td className="border-t border-[#edf2f7] py-2 px-2 align-top">
                        <input data-row={idx} data-col="qty" className={`w-full border ${errors[`item_qty_${idx}`] ? 'border-red-400 bg-red-50' : 'border-[#dbe4ef]'} rounded px-2 py-1.5 text-[13px] text-right font-[inherit] outline-none focus:border-blue-500 min-w-0`} min="0" type="number" value={item.qty} onChange={(e) => { updateItem(item.id, 'qty', e.target.value); setErrors((p) => { const n = { ...p }; delete n[`item_qty_${idx}`]; return n; }); }} />
                      </td>
                      <td className="border-t border-[#edf2f7] py-2 px-2 align-top">
                        <AutocompleteInput data-row={idx} data-col="unit" value={item.unit} onChange={(v) => updateItem(item.id, 'unit', v)} options={UNITS} />
                      </td>
                      <td className="border-t border-[#edf2f7] py-2 px-2 align-top">
                        <input data-row={idx} data-col="rate" className={`w-full border ${errors[`item_rate_${idx}`] ? 'border-red-400 bg-red-50' : 'border-[#dbe4ef]'} rounded px-2 py-1.5 text-[13px] text-right font-[inherit] outline-none focus:border-blue-500 min-w-0`} min="0" type="number" value={item.rate} onChange={(e) => { updateItem(item.id, 'rate', e.target.value); setErrors((p) => { const n = { ...p }; delete n[`item_rate_${idx}`]; return n; }); }} />
                      </td>
                      <td className="border-t border-[#edf2f7] py-2 px-2 align-top">
                        <input data-row={idx} data-col="discount" className="w-full border border-[#dbe4ef] rounded px-2 py-1.5 text-[13px] text-right font-[inherit] outline-none focus:border-blue-500 min-w-0" min="0" max="100" type="number" value={item.discount ?? 0} onChange={(e) => updateItem(item.id, 'discount', e.target.value)} />
                      </td>
                      {config.showGst && (
                        <td className="border-t border-[#edf2f7] py-2 px-2 align-top">
                          {isRetailPosInvoice ? (
                            <span className="billing-pos-tax-label">18%</span>
                          ) : (
                            <AutocompleteInput data-row={idx} data-col="gstRate" inputClassName="billing-gst-rate-input" type="number" min="0" value={String(item.gstRate ?? 0)} onChange={(v) => updateItem(item.id, 'gstRate', v)} options={GST_RATES.map(String)} />
                          )}
                        </td>
                      )}
                      {config.showGst && (
                        <td className="border-t border-[#edf2f7] py-2 px-2 align-top text-right text-[13px] text-[#536173] pt-3">{formatCurrency(line.gstAmt)}</td>
                      )}
                      <td className="border-t border-[#edf2f7] py-2 px-2 align-top text-right text-[13px] font-semibold text-[#111827] pt-3">{formatCurrency(isRetailPosInvoice ? line.taxable : (config.showGst ? line.total : line.taxable))}</td>
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
              <button type="button" onClick={() => setShowAddDiscount((v) => !v)}><Tag size={17} /> Apply Discount <span className="hidden md:inline">(F5)</span></button>
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
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-[#edf2f7] pt-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] text-[#94a3b8] font-medium">Total Items</span>
              <span className="text-[15px] font-semibold text-[#111827]">{effectiveItems.length}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] text-[#94a3b8] font-medium">Total Qty</span>
              <span className="text-[15px] font-semibold text-[#111827]">{effectiveItems.reduce((s, it) => s + (Number(it.qty) || 0), 0)}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] text-[#94a3b8] font-medium">Total Tax</span>
              <span className="text-[15px] font-semibold text-[#111827]">{formatCurrency(totals.totalGst)}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] text-[#94a3b8] font-medium">Round Off</span>
              <span className="text-[15px] font-semibold text-[#111827]">{formatCurrency(totals.roundOff)}</span>
            </div>
          </div>

        </div>

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
        <div className="px-6 py-5 border-b border-[#edf2f7]">
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
                        <SelectDropdown buttonClassName={`${cx.select} bg-white`} value={charge.gstRate} onChange={(v) => updateCharge(charge.id, 'gstRate', Number(v))} options={GST_RATES.map((r) => ({ value: r, label: `${r}%` }))} />
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
          <h3>Quick Add Product</h3>
          <div className="billing-pos-quick-grid">
            <div className="billing-pos-quick-search">
              <AutocompleteInput
                dropDirection="down"
                placeholder="Scan barcode or type product name and press Enter"
                value={productSearch}
                onChange={(v) => {
                  setProductSearch(v);
                  prefillQuickItemFromProduct(v);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    addQuickItem(e.currentTarget.value);
                  }
                }}
                options={productSearchOptions(quickItem.itemType)}
              />
              <button type="button" onClick={openBarcodeScanner} title="Scan barcode"><Barcode size={18} /></button>
            </div>
            <label><span>Qty</span><input type="number" min="0" value={quickItem.qty} onChange={(e) => updateQuickItem('qty', e.target.value)} /></label>
            <label><span>Rate</span><input type="number" min="0" value={quickItem.rate} onChange={(e) => updateQuickItem('rate', e.target.value)} /></label>
            <label><span>Discount %</span><input type="number" min="0" max="100" value={quickItem.discount} onChange={(e) => updateQuickItem('discount', e.target.value)} /></label>
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

            {selectedPayment && selectedPayment !== 'credit' && (() => {
              const amount = Number(paymentData.amount) || 0;
              const balance = Math.max(0, totals.finalTotal);
              const due = Math.max(0, balance - amount);
              const extra = Math.max(0, amount - balance);
              return (
                <div className="billing-payment-details">
                  <label>{isRetailPosInvoice ? 'Received Amount' : 'Amount Received'}</label>
                  <div className="billing-payment-amount-row">
                    <input
                      type="number"
                      min="0"
                      placeholder={`₹ ${balance.toFixed(0)}`}
                      value={paymentData.amount}
                      onChange={(e) => {
                        updatePayment('amount', e.target.value);
                        setAdvanceAmt(e.target.value);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        updatePayment('amount', String(balance));
                        setAdvanceAmt(String(balance));
                      }}
                    >
                      Full
                    </button>
                  </div>
                  <div className="billing-payment-balance">
                    <span>Balance</span>
                    <strong>{formatCurrency(due)}</strong>
                  </div>
                  {extra > 0 && (
                    <div className="billing-payment-change">
                      <span>{isRetailPosInvoice ? 'Change Amount' : 'Extra Received'}</span>
                      <strong>{formatCurrency(extra)}</strong>
                    </div>
                  )}

                  {['upi', 'bank', 'card'].includes(selectedPayment) && (
                    <input
                      className="billing-payment-ref"
                      placeholder={selectedPayment === 'upi' ? 'UPI Ref / UTR (optional)' : 'UTR / Transaction No.'}
                      value={paymentData.utrNumber}
                      onChange={(e) => updatePayment('utrNumber', e.target.value)}
                    />
                  )}

                </div>
              );
            })()}

            {selectedPayment === 'credit' && (
              <div className="billing-payment-details">
                <div className="billing-payment-credit-fields">
                  <label>
                    <span>Paid Amount</span>
                    <input value="0.00" readOnly />
                  </label>
                  <label>
                    <span>Balance</span>
                    <input className="billing-balance-due-input" value={formatCurrency(totals.finalTotal)} readOnly />
                  </label>
                </div>
              </div>
            )}
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
            <button type="button" title="Print (F3)" onClick={() => { if (!saveLoading) handlePrintBill(); }} className="flex flex-col items-center gap-1 py-2 rounded-lg border border-[#dbe4ef] text-[#374151] cursor-pointer bg-white hover:bg-gray-50 font-[inherit]">
              <Printer size={15} />
              <span className="text-[10px] font-medium">Print</span>
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
              className="flex flex-col items-center gap-1 py-2 rounded-lg border border-[#dbe4ef] text-[#374151] cursor-pointer bg-white hover:bg-gray-50 font-[inherit]"
            >
              <span className="text-[#25D366]">
                <WhatsAppIcon size={16} />
              </span>
              <span className="text-[10px] font-medium">WhatsApp</span>
            </button>
            <button type="button" title="Email" onClick={() => setShowEmailModal(true)} className="flex flex-col items-center gap-1 py-2 rounded-lg border border-[#dbe4ef] text-[#374151] cursor-pointer bg-white hover:bg-gray-50 font-[inherit]">
              <Mail size={15} />
              <span className="text-[10px] font-medium">Email</span>
            </button>
            <button
              type="button"
              title="Download PDF"
              onClick={() => { setDownloadPdfMode(true); setAutoPrintPreview(false); setShowPreview(true); }}
              className="flex flex-col items-center gap-1 py-2 rounded-lg border border-[#dbe4ef] text-[#374151] cursor-pointer bg-white hover:bg-gray-50 font-[inherit]"
            >
              <Download size={15} />
              <span className="text-[10px] font-medium">PDF</span>
            </button>
            <button
              type="button"
              title="Send SMS"
              onClick={() => {
                const c = getEffectiveCustomer();
                const text = encodeURIComponent(`${config.title} ${docMeta.number} — ${formatCurrency(totals.finalTotal)}`);
                window.open(`sms:${c.phone || ''}?body=${text}`, '_self');
              }}
              className="flex flex-col items-center gap-1 py-2 rounded-lg border border-[#dbe4ef] text-[#374151] cursor-pointer bg-white hover:bg-gray-50 font-[inherit]"
            >
              <Smartphone size={15} />
              <span className="text-[10px] font-medium">SMS</span>
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
              ['F5', 'Discount', Tag, () => setShowAddDiscount((v) => !v)],
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
          <div className="billing-mobile-search">
            <Search size={16} />
            <input
              autoComplete="off"
              placeholder="Search product / scan barcode"
              value={mobileProductQuery}
              onChange={(e) => setMobileProductQuery(e.target.value)}
            />
            <button
              type="button"
              title="Scan barcode"
              onClick={openBarcodeScanner}
            >
              <Barcode size={18} />
            </button>
          </div>
          <div className="billing-mobile-categories">
            {['Product', 'Service'].map((type) => (
              <button
                key={type}
                type="button"
                className={quickItem.itemType === type ? 'active' : ''}
                onClick={() => setQuickItem((prev) => ({ ...prev, itemType: type }))}
              >
                {type === 'Product' ? 'Products' : 'Services'}
              </button>
            ))}
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
                  onClick={() => {
                    addProductToBill(normalized);
                    setMobileProductQuery('');
                    setMobileScreen('invoice');
                  }}
                >
                  <span className="billing-mobile-product-thumb"><Package size={20} /></span>
                  <span className="billing-mobile-product-main">
                    <strong>{normalized.description || 'Unnamed item'}</strong>
                    <small>{normalized.code || normalized.barcode || normalized.hsn || '-'}</small>
                    <b>{formatCurrency(normalized.rate || 0)}</b>
                    <em>Stock: {Number(product.stock || 0)} {normalized.unit}</em>
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
            <label>
              <span>Paid Amount</span>
              <input
                type="number"
                min="0"
                value={paymentData.amount}
                onChange={(e) => {
                  updatePayment('amount', e.target.value);
                  setAdvanceAmt(e.target.value);
                }}
              />
            </label>
            <div className="billing-mobile-balance">
              <span>Balance</span>
              <strong>{formatCurrency(Math.max(0, totals.finalTotal - (Number(paymentData.amount) || 0)))}</strong>
            </div>
          </div>
          <button type="button" className="billing-mobile-save-btn" onClick={() => handleSave()}>
            Save & Close
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

          {documentType === 'purchase-entry' && (
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
          bizSettings={bizSettings}
          shipping={shipping}
          sameShipping={sameShipping}
          tds={tds}
          tcs={tcs}
          advanceAmt={advanceAmt}
          paymentMethod={selectedPayment ? (PAYMENT_METHODS.find((m) => m.id === selectedPayment)?.label ?? '') : ''}
          addDiscount={addDiscount}
          autoPrint={autoPrintPreview}
          downloadAsPdf={downloadPdfMode}
          pdfMode={downloadPdfMode}
          invoiceNumber={docMeta.number}
          printTemplate={printTemplate}
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
        <div style={{ position: 'fixed', left: 0, top: 0, width: '794px', pointerEvents: 'none', zIndex: 50 }}>
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
            bizSettings={bizSettings}
            shipping={shipping}
            sameShipping={sameShipping}
            tds={tds}
            tcs={tcs}
            advanceAmt={advanceAmt}
            paymentMethod={selectedPayment ? (PAYMENT_METHODS.find((m) => m.id === selectedPayment)?.label ?? '') : ''}
            addDiscount={addDiscount}
            invoiceNumber={docMeta.number}
            pdfMode
            printTemplate={printTemplate}
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
