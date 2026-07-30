import { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  Calendar, CheckCircle2, Lock,
  Pencil, Phone, Plus, RefreshCw, Search,
  Tag, Trash2, User, UserPlus, X,
} from 'lucide-react';
import { formatCurrency } from '../../../../../../utils/formatCurrency.js';
import { numberToWords } from '../../../../../../utils/numberToWords.js';
import { api, SERVER_ORIGIN } from '../../../../../../services/api.js';
import { documentConfigs } from '../documentConfigs.js';
import { DocumentPreviewModal } from './DocumentPreviewModal.jsx';
import { getInvoicePrintTemplate, setInvoicePrintTemplate } from './invoiceTemplatePreference.js';

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

const TDS_SECTIONS = [
  { code: '194C', label: '194C — Payment to Contractors',              rate: 2  },
  { code: '194J', label: '194J — Professional / Technical Fee',        rate: 10 },
  { code: '194I', label: '194I — Rent',                                rate: 10 },
  { code: '194H', label: '194H — Commission / Brokerage',              rate: 5  },
  { code: '194A', label: '194A — Interest (non-securities)',            rate: 10 },
  { code: '194M', label: '194M — Contractor / Professional (Indiv.)',  rate: 5  },
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

const RECURRING_FREQ = [
  { value: 'weekly',       label: 'Every Week' },
  { value: 'fortnightly',  label: 'Every 2 Weeks' },
  { value: 'monthly',      label: 'Every Month' },
  { value: 'quarterly',    label: 'Every Quarter' },
  { value: 'halfyearly',   label: 'Every 6 Months' },
  { value: 'yearly',       label: 'Every Year' },
];

const PAYMENT_METHODS = [
  { id: 'cash',   label: 'Cash',   emoji: '💵', color: '#16a34a', method: 'Cash'          },
  { id: 'upi',    label: 'UPI',    emoji: '📱', color: '#2563eb', method: 'UPI'           },
  { id: 'card',   label: 'Card',   emoji: '💳', color: '#7c3aed', method: 'Online'        },
  { id: 'bank',   label: 'Bank',   emoji: '🏦', color: '#0891b2', method: 'Bank Transfer' },
  { id: 'cheque', label: 'Cheque', emoji: '🧾', color: '#d97706', method: 'Cheque'        },
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
    gstin: customer.gstin || '',
    phone: customer.phone || '',
    email: customer.email || '',
    address: customer.address || '',
    city: customer.city || '',
    state: customer.state || BUSINESS_STATE,
    pincode: customer.pincode || '',
  };
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

function normalizeProduct(product = {}) {
  const description = product.description || product.name || product.productName || '';
  const productDescription = product.productDescription
    || product.itemDescription
    || product.lineDescription
    || product.details
    || product.note
    || product.remark
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

function QuickProductModal({ barcode, onSave, onClose }) {
  const [form, setForm] = useState({
    barcode: barcode || '',
    description: '',
    productDescription: '',
    hsn: '',
    unit: 'Nos',
    rate: '',
    gstRate: 18,
    stock: 0,
    status: 'Active',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.description.trim()) return setError('Product name is required');
    if (form.rate === '' || Number(form.rate) < 0) return setError('Valid sale price is required');
    setSaving(true);
    setError('');
    try {
      const saved = await api.invCreateProduct({
        ...form,
        rate: Number(form.rate),
        gstRate: Number(form.gstRate),
        stock: Number(form.stock) || 0,
        minStockLevel: 0,
      });
      onSave(saved);
    } catch (err) {
      setError(err.message || 'Unable to save product');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-130 mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#edf2f7]">
          <div>
            <h2 className="text-[16px] font-bold text-[#111827] m-0">Add Scanned Product</h2>
            <p className="text-[12px] text-[#536173] m-0 mt-1">Save once, then this barcode will add automatically next time.</p>
          </div>
          <button type="button" onClick={onClose} className="text-[#536173] hover:text-[#111827] bg-transparent border-0 cursor-pointer text-lg leading-none">x</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4">
          {error && <div className="mb-3 px-3 py-2 bg-red-50 text-red-600 text-[12px] rounded-md">{error}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className={cx.field}>
              <label className={cx.label}>Barcode</label>
              <input className={cx.input} value={form.barcode} onChange={(e) => set('barcode', e.target.value)} />
            </div>
            <div className={cx.field}>
              <label className={cx.label}>Unit</label>
              <select className={cx.select} value={form.unit} onChange={(e) => set('unit', e.target.value)}>
                {UNITS.map((unit) => <option key={unit}>{unit}</option>)}
              </select>
            </div>
            <div className={`${cx.field} sm:col-span-2`}>
              <label className={cx.label}>Product Name *</label>
              <input className={cx.input} value={form.description} onChange={(e) => set('description', e.target.value)} autoFocus />
            </div>
            <div className={`${cx.field} sm:col-span-2`}>
              <label className={cx.label}>Description</label>
              <textarea
                className={`${cx.input} min-h-20 resize-y`}
                value={form.productDescription}
                onChange={(e) => set('productDescription', e.target.value)}
                placeholder="Line by line description for invoice"
              />
            </div>
            <div className={cx.field}>
              <label className={cx.label}>HSN / SAC</label>
              <input className={cx.input} value={form.hsn} onChange={(e) => set('hsn', e.target.value)} />
            </div>
            <div className={cx.field}>
              <label className={cx.label}>Sale Price *</label>
              <input className={cx.input} type="number" min="0" step="0.01" value={form.rate} onChange={(e) => set('rate', e.target.value)} />
            </div>
            <div className={cx.field}>
              <label className={cx.label}>GST Rate</label>
              <select className={cx.select} value={form.gstRate} onChange={(e) => set('gstRate', e.target.value)}>
                {GST_RATES.map((rate) => <option key={rate} value={rate}>{rate}%</option>)}
              </select>
            </div>
            <div className={cx.field}>
              <label className={cx.label}>Opening Stock</label>
              <input className={cx.input} type="number" min="0" value={form.stock} onChange={(e) => set('stock', e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-5">
            <button type="button" className={cx.btnOutline} onClick={onClose}>Cancel</button>
            <button type="submit" className={cx.btnPrimary} disabled={saving}>{saving ? 'Saving...' : 'Save & Add'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function CreateDocumentPage({ documentType = 'invoice', invoiceId }) {
  const _baseConfig = documentConfigs[documentType] ?? documentConfigs.invoice;
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

  const [items, setItems]               = useState([{ id: 1000, productId: null, productCode: '', itemType: 'Product', description: '', itemDescription: '', hsn: '', qty: 1, unit: 'Nos', rate: 0, discount: 0, gstRate: 18 }]);
  const [supplyType, setSupplyType]     = useState('intrastate');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [paymentData, setPaymentData]   = useState({ chequeNo: '',
    amount: '', date: defaultInvoiceDate, notes: '',
    upiId: '', customerPhone: '', amountReceived: '',
    utrNumber: '', bankName: '', creditDays: defaultPaymentTerms,
  });

  const [customer, setCustomer] = useState({
    name: '', gstin: '', phone: '', email: '', address: '', city: '', state: BUSINESS_STATE, pincode: '',
  });

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
  const [quickProductBarcode, setQuickProductBarcode] = useState('');
  const [bulkGstRate, setBulkGstRate] = useState(18);

  const [notes, setNotes]   = useState('Thank you for your business! Payment should be made within the due date.');
  const [terms, setTerms]   = useState(
    '1. Payment due within 30 days of invoice date.\n2. Late payment charges @ 2% per month applicable.\n3. Goods once sold will not be taken back.\n4. Subject to Mumbai jurisdiction.',
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
  const [showPhoneDrop, setShowPhoneDrop]       = useState(false);
  const [showAddCustomer, setShowAddCustomer]   = useState(false);
  const [newCustomerForm, setNewCustomerForm]   = useState({
    _id: '', id: '', name: '', gstin: '', phone: '', email: '', address: '', city: '', state: BUSINESS_STATE, pincode: '',
  });
  const [customerSaving, setCustomerSaving]       = useState(false);
  const [customerSaveError, setCustomerSaveError] = useState('');

  useEffect(() => {
    setInvoicePrintTemplate(printTemplate);
  }, [printTemplate]);
const [customFields, setCustomFields]         = useState([]);
  const [recurring, setRecurring]               = useState({ enabled: false, frequency: 'monthly', endAfter: '', endDate: '' });
  const [showAddDiscount, setShowAddDiscount]   = useState(false);
  const [showTdsTcs, setShowTdsTcs]             = useState(false);
  const [errors, setErrors]                     = useState({});

  function clearError(key) {
    setErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
  }

  function getEffectiveCustomer() {
    const hasInvoiceCustomerDraft = documentType === 'invoice' && Object.entries(newCustomerForm).some(([key, value]) => {
      if (key === 'state' && value === BUSINESS_STATE) return false;
      return String(value || '').trim();
    });
    if (hasInvoiceCustomerDraft) {
      return {
        ...customer,
        ...newCustomerForm,
        state: newCustomerForm.state || customer.state || BUSINESS_STATE,
      };
    }
    return customer;
  }

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
      ? items.some((it) => it.description && Number(it.qty) > 0 && Number(it.rate) > 0)
      : items.some((it) => it.description && Number(it.qty) > 0);
    if (!hasValidItem) {
      errs.items = documentType === 'purchase-entry'
        ? 'Add at least one item with a name, qty > 0, and rate > 0'
        : 'Add at least one item with a description and qty > 0';
    }
    items.forEach((it, idx) => {
      if (it.description && !(Number(it.qty) > 0)) errs[`item_qty_${idx}`] = 'Required';
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
    items.forEach((item) => {
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
  }, [items, charges, addDiscount, tds, tcs, advanceAmt, config.showGst, documentType, manualQuotationTotal]);

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
    setCustomer({
      _id: normalized._id,
      id: normalized.id,
      name: normalized.name,
      gstin: normalized.gstin,
      phone: normalized.phone,
      email: normalized.email,
      address: normalized.address,
      city: normalized.city,
      state: normalized.state,
      pincode: normalized.pincode,
    });
    setNewCustomerForm({
      _id: normalized._id || '',
      id: normalized.id || '',
      name: normalized.name,
      gstin: normalized.gstin,
      phone: normalized.phone,
      email: normalized.email,
      address: normalized.address,
      city: normalized.city,
      state: normalized.state,
      pincode: normalized.pincode,
    });
    if (config.showGst) setSupplyType(normalized.state === bizState ? 'intrastate' : 'interstate');
    clearError('customerName');
    if (normalized.gstin) clearError('customerGstin');
    setShowCustomerDrop(false);
    setCustomerQuery('');
  }

  function clearCustomer() {
    setCustomer({ name: '', gstin: '', phone: '', email: '', address: '', city: '', state: BUSINESS_STATE, pincode: '' });
    setNewCustomerForm({ _id: '', id: '', name: '', gstin: '', phone: '', email: '', address: '', city: '', state: BUSINESS_STATE, pincode: '' });
    setShowAddCustomer(false);
    setCustomerSaveError('');
    if (config.showGst) setSupplyType('intrastate');
  }

  function openCustomerEditor() {
    const effective = normalizeCustomer(getEffectiveCustomer());
    setNewCustomerForm({
      _id: effective._id || customer._id || '',
      id: effective.id || customer.id || '',
      name: effective.name,
      gstin: effective.gstin,
      phone: effective.phone,
      email: effective.email,
      address: effective.address,
      city: effective.city,
      state: effective.state,
      pincode: effective.pincode,
    });
    setCustomerSaveError('');
    setShowCustomerDrop(false);
    setShowAddCustomer(true);
  }

  function openNewCustomerForm() {
    setNewCustomerForm({ _id: '', id: '', name: customerQuery || '', gstin: '', phone: '', email: '', address: '', city: '', state: BUSINESS_STATE, pincode: '' });
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
      const saved = customerId
        ? await api.updateCustomer(customerId, payload)
        : await api.createCustomer(payload);
      const normalized = normalizeCustomer(saved);
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

  function applyGstRateToAllItems() {
    const rate = Number(bulkGstRate) || 0;
    setItems((prev) => prev.map((item) => ({ ...item, gstRate: rate })));
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
      (normalized.id && item.productId === normalized.id)
      || (normalized.code && item.productCode === normalized.code)
      || (normalized.barcode && item.barcode === normalized.barcode)
      || (!normalized.code && !normalized.barcode && item.description === normalized.description)
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
    const chosen = await resolveProductByScan(query);
    const target = items.find((item) => !item.description);

    if (chosen) {
      addProductToBill(chosen);
    } else if (isLikelyBarcodeScan(query)) {
      // Matches the hardware-scanner listener below: an unmatched barcode-like
      // scan should prompt to save it as a real product, not get dropped in
      // as a free-text line item — otherwise it never becomes recognizable
      // on a later scan.
      setQuickProductBarcode(query);
    } else if (target) {
      updateItem(target.id, 'description', query);
    } else {
      setItems((prev) => [...prev, { id: nextItemId.current++, productId: null, productCode: '', itemType: 'Product', description: query, itemDescription: '', hsn: '', qty: 1, unit: 'Nos', rate: 0, discount: 0, gstRate: 18 }]);
    }

    setProductSearch('');
    clearError('items');
  }

  function handleQuickProductSaved(product) {
    const normalized = normalizeProduct(product);
    setProducts((prev) => {
      const id = normalized._id || normalized.id;
      const exists = prev.some((p) => (p._id || p.id) === id || (normalized.code && p.code === normalized.code));
      return exists ? prev.map((p) => ((p._id || p.id) === id ? normalized : p)) : [normalized, ...prev];
    });
    addProductToBill(normalized);
    setQuickProductBarcode('');
    setProductSearch('');
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
    return {
      number: docMeta.number,
      documentType: effectiveDocumentType,
      customer: effectiveCustomer,
      meta: docMeta,
      supplyType: config.showGst && effectiveCustomer.state
        ? (effectiveCustomer.state === bizState ? 'intrastate' : 'interstate')
        : supplyType,
      items: enrichItemsWithProductDescriptions(items, products),
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
      extra: docExtra,
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

  function updateTds(field, value) {
    setTds((p) => {
      const next = { ...p, [field]: value };
      if (field === 'section') {
        const sec = TDS_SECTIONS.find((s) => s.code === value);
        if (sec) next.rate = sec.rate;
      }
      return next;
    });
  }

  function addCustomField() { setCustomFields((prev) => [...prev, { id: Date.now(), key: '', value: '' }]); }
  function updateCustomField(id, field, value) { setCustomFields((prev) => prev.map((f) => f.id === id ? { ...f, [field]: value } : f)); }
  function removeCustomField(id) { setCustomFields((prev) => prev.filter((f) => f.id !== id)); }

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
        const customerData = await api.listCustomers();
        if (active) {
          const rows = Array.isArray(customerData) ? customerData : customerData?.data;
          setCustomers(Array.isArray(rows) ? rows.map(normalizeCustomer) : []);
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
  }, [documentType]);

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
      setCustomer({
        name: invoice.customer?.name || '',
        gstin: invoice.customer?.gstin || '',
        phone: invoice.customer?.phone || '',
        email: invoice.customer?.email || '',
        address: invoice.customer?.address || '',
        city: invoice.customer?.city || '',
        state: invoice.customer?.state || BUSINESS_STATE,
        pincode: invoice.customer?.pincode || '',
      });
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
      resolveProductByScan,
      setQuickProductBarcode,
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
        const { addProductToBill, resolveProductByScan, setQuickProductBarcode } = shortcutState.current;
        resolveProductByScan(value).then((product) => {
          if (product) {
            addProductToBill(product);
          } else if (isLikelyBarcodeScan(value)) {
            setQuickProductBarcode(value);
          }
        });
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

      // Function-key shortcuts (no modifier) — actions vary by documentType
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const NEW_ROUTES = { invoice: '/billing/invoice/new', 'bill-of-supply': '/billing/bill-of-supply/new', quotation: '/billing/quotation/new', 'purchase-order': '/billing/purchase-order/new', 'purchase-entry': '/billing/purchase-entry/new', 'credit-note': '/billing/credit-note/new', 'debit-note': '/billing/debit-note/new', 'sales-return': '/billing/sales-return/new', 'supplier-return': '/billing/supplier-return/new', 'delivery-challan': '/billing/delivery-challan/new', 'e-invoice': '/billing/e-invoice/new', 'e-way-bill': '/billing/e-way-bill/new', 'pharmacy-bill': '/billing/pharmacy-bill/new' };
        const F7_FKEY = { invoice: null, 'bill-of-supply': null, quotation: 'valid-till', 'purchase-order': 'expected-delivery', 'purchase-entry': null, 'credit-note': 'ref-invoice', 'debit-note': 'ref-invoice', 'sales-return': 'ref-invoice', 'supplier-return': 'ref-invoice', 'delivery-challan': 'vehicle', 'e-invoice': 'irn', 'e-way-bill': 'vehicle' };
        if (e.key === 'F1')  { e.preventDefault(); window.location.assign(NEW_ROUTES[documentType] ?? '/billing/invoice/new'); return; }
        if (e.key === 'F2')  { e.preventDefault(); if (!saveLoading) handleSave(); return; }
        if (e.key === 'F3')  { e.preventDefault(); setAutoPrintPreview(false); setShowPreview(true); return; }
        if (e.key === 'F4')  { e.preventDefault(); if (!saveLoading) handlePrintBill(); return; }
        if (e.key === 'F5')  { e.preventDefault(); addItem(); return; }
        if (e.key === 'F6')  { e.preventDefault(); document.querySelector('[data-fkey="party"]')?.focus(); return; }
        if (e.key === 'F7')  { e.preventDefault(); const f7k = F7_FKEY[documentType]; if (f7k) { document.querySelector(`[data-fkey="${f7k}"]`)?.focus(); } else { setShowAddDiscount((v) => !v); } return; }
        if (e.key === 'F8')  { e.preventDefault(); window.location.assign(LIST_ROUTES[documentType] ?? '/billing/invoice'); return; }
        if (e.key === 'F10') { e.preventDefault(); window.location.assign('/dashboard'); return; }
        if (e.key === 'F11') { e.preventDefault(); window.location.assign('/business-settings'); return; }
        if (e.key === 'F12') { e.preventDefault(); window.location.assign(LIST_ROUTES[documentType] ?? '/billing/invoice'); }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displayItems = useMemo(
    () => enrichItemsWithProductDescriptions(items, products),
    [items, products],
  );

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
    <div className="billing-v2 p-4 md:p-7 pb-32">
      {quickProductBarcode && (
        <QuickProductModal
          barcode={quickProductBarcode}
          onSave={handleQuickProductSaved}
          onClose={() => {
            setQuickProductBarcode('');
            setProductSearch('');
          }}
        />
      )}

      {/* ── Page Header ── */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-6">
        <div className="flex flex-col gap-1">
          <nav className="flex items-center gap-1 text-[13px] text-[#536173] flex-wrap">
            <a className="text-blue-600 no-underline hover:underline" href="/dashboard">Home</a>
            <span>›</span><span>Sales</span><span>›</span>
            <a className="text-blue-600 no-underline hover:underline" href={LIST_ROUTES[documentType] ?? '/billing/invoice'}>{documentType === 'invoice' ? 'Bills' : `${config.title}s`}</a>
            <span>›</span><span>{invoiceId ? `Edit ${config.title}` : `New ${config.title}`}</span>
          </nav>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="m-0 text-[22px] font-bold">{config.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <label className="inline-flex items-center gap-2 px-3 py-2 border border-[#dbe4ef] rounded-md text-[13px] text-[#374151] bg-white">
            <span className="text-[#536173] font-medium">Template</span>
            <select
              value={printTemplate}
              onChange={(event) => setPrintTemplate(event.target.value)}
              className="border-0 bg-transparent text-[13px] font-semibold text-[#111827] outline-none font-[inherit]"
            >
              <option value="modern">Modern</option>
              <option value="classic">Classic</option>
            </select>
          </label>
          <button className={cx.btnOutline} type="button" onClick={() => window.location.assign(LIST_ROUTES[documentType] ?? '/billing/invoice')} title="Open list page">
            <svg fill="none" height="15" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="15"><line x1="8" x2="21" y1="6" y2="6" /><line x1="8" x2="21" y1="12" y2="12" /><line x1="8" x2="21" y1="18" y2="18" /><line x1="3" x2="3.01" y1="6" y2="6" /><line x1="3" x2="3.01" y1="12" y2="12" /><line x1="3" x2="3.01" y1="18" y2="18" /></svg>
            View List
          </button>
          <button className={cx.btnOutline} type="button" disabled={saveLoading} onClick={handlePrintBill} title="Print Bill (Ctrl+P)">
            <svg fill="none" height="15" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="15"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" /><rect height="8" width="12" x="6" y="14" /></svg>
            {saveLoading ? 'Saving...' : 'Print'}
          </button>
          <button className={cx.btnOutline} type="button" onClick={() => { setAutoPrintPreview(false); setShowPreview(true); }} title="Preview PDF">
            <svg fill="none" height="15" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="15"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
            Preview PDF
          </button>
          <button className={cx.btnPrimary} type="button" disabled={saveLoading} onClick={() => handleSave()} title={`${config.buttonText} (Ctrl+S)`}>
            <svg fill="none" height="15" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="15"><line x1="22" x2="11" y1="2" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
            {saveLoading ? 'Saving…' : config.buttonText}
          </button>
        </div>
        {saveError && (
          <div className="mt-3 rounded-md bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">{saveError}</div>
        )}
      </div>

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

      {/* ── Bill Type selector (invoice only) ── */}
      {documentType === 'invoice' && (
        <div className="billing-bill-type-selector bg-white border border-[#dfe7f1] rounded-lg p-5 mb-4">
          <div className="text-[13px] font-semibold text-[#374151] mb-3">Bill Type</div>
          <div className="flex flex-col sm:flex-row gap-3">
            <label className={`flex items-start gap-3 flex-1 border rounded-lg p-3.5 cursor-pointer transition-all ${billType === 'with-gst' ? 'border-blue-500 bg-blue-50/60' : 'border-[#dfe7f1] hover:border-blue-300 hover:bg-gray-50'}`}>
              <input type="radio" name="billType" value="with-gst" checked={billType === 'with-gst'} onChange={() => setBillType('with-gst')} className="mt-0.5 accent-blue-600 w-4 h-4 flex-none" />
              <div>
                <div className={`text-[13.5px] font-semibold ${billType === 'with-gst' ? 'text-blue-700' : 'text-[#111827]'}`}>With GST <span className="font-normal text-[12px]">(Tax Invoice)</span></div>
                <div className="text-[11.5px] text-[#536173] mt-0.5">Issue a GST tax invoice</div>
              </div>
            </label>
            <label className={`flex items-start gap-3 flex-1 border rounded-lg p-3.5 cursor-pointer transition-all ${billType === 'without-gst' ? 'border-blue-500 bg-blue-50/60' : 'border-[#dfe7f1] hover:border-blue-300 hover:bg-gray-50'}`}>
              <input type="radio" name="billType" value="without-gst" checked={billType === 'without-gst'} onChange={() => setBillType('without-gst')} className="mt-0.5 accent-blue-600 w-4 h-4 flex-none" />
              <div>
                <div className={`text-[13.5px] font-semibold ${billType === 'without-gst' ? 'text-blue-700' : 'text-[#111827]'}`}>Without GST <span className="font-normal text-[12px]">(Standard Invoice)</span></div>
                <div className="text-[11.5px] text-[#536173] mt-0.5">Issue a standard invoice</div>
              </div>
            </label>
            <div className="flex items-center gap-2 px-3.5 py-3 rounded-lg border border-blue-100 bg-blue-50 text-[11.5px] text-blue-600 sm:max-w-[180px]">
              <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14" className="flex-none"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
              <span>You can change this anytime before {invoiceId ? 'updating' : 'saving'} the bill.</span>
            </div>
          </div>
        </div>
      )}

      <div className="billing-workspace">
      <div className={`billing-quick-strip ${config.showPurchaseOrderLink ? 'billing-quick-strip-po' : ''}`}>
        <div className="billing-quick-customer billing-quick-party-field">
          <label>{partyKind} <span>*</span></label>
          <div
            className="billing-customer-picker"
            tabIndex={-1}
            onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setShowCustomerDrop(false); }}
          >
            <div className="billing-customer-search-line">
              <Search size={14} />
              <input
                data-fkey="party"
                placeholder={`Search ${partyKindLower} by name, phone, GSTIN...`}
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
        </div>

        <div className="billing-selected-customer billing-quick-party-card">
          <div>
            <strong>{getEffectiveCustomer().name || `Select ${partyKind}`}</strong>
            <div className="billing-selected-actions">
              {(getEffectiveCustomer().name || customer.name) && (
                <button type="button" onClick={openCustomerEditor} title={`Edit ${partyKindLower}`}>
                  <Pencil size={12} />
                </button>
              )}
              <span className="billing-credit-badge">Credit</span>
            </div>
          </div>
          <p>GSTIN: {getEffectiveCustomer().gstin || '-'}</p>
          <p>{[getEffectiveCustomer().phone, getEffectiveCustomer().email].filter(Boolean).join(' · ') || 'Phone / email not added'}</p>
          <p>{[getEffectiveCustomer().address, getEffectiveCustomer().city, getEffectiveCustomer().state, getEffectiveCustomer().pincode].filter(Boolean).join(', ') || `Outstanding: ${formatCurrency(0)}`}</p>
        </div>

        {config.showPurchaseOrderLink && (
          <>
            <div className="billing-quick-field billing-quick-po-field">
              <label>Match PO</label>
              <select
                value={docExtra.linkedPurchaseOrderId}
                onChange={(e) => applyPurchaseOrder(e.target.value)}
              >
                <option value="">Select purchase order</option>
                {purchaseOrders.map((po) => {
                  const id = po._id || po.id;
                  return (
                    <option key={id} value={id}>
                      {po.number} - {po.customer?.name || 'Vendor'} - {formatCurrency(calcDocumentTotal(po))}
                    </option>
                  );
                })}
              </select>
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
          </>
        )}

        <div className="billing-quick-field billing-quick-number-field">
          <label>{documentNumberLabel}</label>
          <input value={docMeta.number} onChange={(e) => updateMeta('number', e.target.value)} />
        </div>
        <div className="billing-quick-field billing-quick-date-field">
          <label>{config.dateLabel}</label>
          <input type="date" value={docMeta.date} onChange={(e) => updateMeta('date', e.target.value)} />
        </div>
        {config.showPurchaseOrderLink && (
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
        )}
      </div>

      {/* ── Document Card ── */}
      <div className="billing-document-card bg-white border border-[#dfe7f1] rounded-lg">

        {/* ── Parties + Meta ── */}
        <div className="billing-party-strip grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 border-b border-[#edf2f7]">

          {/* Bill From */}
          <div className="flex flex-col gap-2">
            <div className="text-xs font-semibold uppercase text-[#536173] tracking-wide mb-1">Bill From</div>
            <div className="flex items-start gap-3">
              {bizSettings.logoUrl ? (
                <img src={`${SERVER_ORIGIN}${bizSettings.logoUrl}`} alt="logo" className="w-12 h-12 rounded-lg object-contain border border-[#dbe4ef] flex-none" />
              ) : (
                <div className="w-12 h-12 rounded-lg border-2 border-dashed border-[#dbe4ef] flex flex-col items-center justify-center flex-none gap-0.5">
                  <svg fill="none" height="16" stroke="#94a3b8" strokeWidth="1.5" viewBox="0 0 24 24" width="16"><rect height="18" rx="2" ry="2" width="18" x="3" y="3" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                  <span className="text-[9px] text-[#94a3b8] font-medium">LOGO</span>
                </div>
              )}
              <div>
                <div className="text-base font-bold text-[#111827]">{bizSettings.businessName || '—'}</div>
                {bizSettings.gstin && <div className="text-[12px] text-[#374151] font-mono">GSTIN: {bizSettings.gstin}</div>}
              </div>
            </div>
            {bizSettings.address && <div className="text-[13px] text-[#374151]">{bizSettings.address}</div>}
            {(bizSettings.city || bizSettings.state || bizSettings.pincode) && (
              <div className="text-[13px] text-[#374151]">
                {[bizSettings.city, bizSettings.state, bizSettings.pincode].filter(Boolean).join(', ')}
              </div>
            )}
            {(bizSettings.businessEmail || bizSettings.phone) && (
              <div className="text-[13px] text-[#536173]">
                {[bizSettings.businessEmail, bizSettings.phone].filter(Boolean).join(' · ')}
              </div>
            )}
            <a href="/business-settings" className="text-[12px] text-blue-600 text-left hover:underline p-0 mt-1">Edit Business Profile →</a>
          </div>

          {/* Bill To — with customer search */}
          <div className="flex flex-col gap-3">
            <div className="text-xs font-semibold uppercase text-[#536173] tracking-wide mb-1">{config.partyToLabel}</div>

            {documentType === 'invoice' ? (
              <>
                {/* Phone-based customer lookup */}
                <div className={cx.field}>
                  <label className={cx.label}>{partyPhoneLabel} <span className="text-[10px] text-[#94a3b8] font-normal ml-1">(optional)</span></label>
                  <div
                    className="relative"
                    tabIndex={-1}
                    onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setShowPhoneDrop(false); }}
                  >
                    <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none" />
                    <input
                      className="border border-[#dbe4ef] rounded-md pl-8 pr-3 py-2 text-[13px] text-[#111827] w-full outline-none focus:border-blue-500 font-[inherit]"
                      placeholder={`Enter phone number to find ${partyKindLower}`}
                      value={customer.phone}
                      onFocus={() => setShowPhoneDrop(true)}
                      onChange={(e) => { updateInvoiceCustomerField('phone', e.target.value); setShowPhoneDrop(true); }}
                    />
                    {showPhoneDrop && matchingByPhone.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-white border border-[#dde6f2] rounded-lg shadow-lg py-1 max-h-56 overflow-y-auto">
                        {matchingByPhone.map((c) => (
                          <button
                            key={c._id ?? c.phone}
                            type="button"
                            className="w-full flex flex-col gap-0.5 px-4 py-2.5 text-left hover:bg-[#f8fafc] cursor-pointer border-0 bg-transparent font-[inherit]"
                            onMouseDown={() => { selectCustomer(c); setShowPhoneDrop(false); }}
                          >
                            <span className="text-[13px] font-medium text-[#111827]">{c.name}</span>
                            <span className="text-[11px] text-[#94a3b8] font-mono">{c.phone} · {c.city}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] text-[#94a3b8]">Matching {partyKindLower} details fill in automatically.</span>
                </div>

                <div className="flex flex-col gap-2.5">
                    <div className="grid grid-cols-1 gap-2.5 items-end">
                      <div className={cx.field}>
                        <label className={cx.label}>{config.partyNameLabel}</label>
                        <input data-fkey="party" className={errors.customerName ? cx.inputError : cx.input} placeholder={`Type ${partyKindLower} name`} value={newCustomerForm.name} onChange={(e) => updateNewCustomer('name', e.target.value)} />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2.5 border border-[#edf2f7] rounded-lg p-3.5 bg-[#fafbfe]">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className={cx.field}>
                        <label className={cx.label}>GSTIN</label>
                        <input className={cx.input} maxLength={15} placeholder="15-digit GSTIN" value={newCustomerForm.gstin} onChange={(e) => updateNewCustomer('gstin', e.target.value.toUpperCase())} />
                      </div>
                      <div className={cx.field}>
                        <label className={cx.label}>Email</label>
                        <input className={cx.input} placeholder={`${partyKindLower}@email.com`} type="email" value={newCustomerForm.email} onChange={(e) => updateNewCustomer('email', e.target.value)} />
                      </div>
                    </div>
                    <div className={cx.field}>
                      <label className={cx.label}>{partyKind} Address</label>
                      <input className={cx.input} placeholder="Street / Building / Area" value={newCustomerForm.address} onChange={(e) => updateNewCustomer('address', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className={cx.field}>
                        <label className={cx.label}>City</label>
                        <input className={cx.input} placeholder="City" value={newCustomerForm.city} onChange={(e) => updateNewCustomer('city', e.target.value)} />
                      </div>
                      <div className={cx.field}>
                        <label className={cx.label}>State</label>
                        <select className={cx.select} value={newCustomerForm.state} onChange={(e) => updateNewCustomer('state', e.target.value)}>
                          {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className={cx.field}>
                        <label className={cx.label}>PIN Code</label>
                        <input className={cx.input} maxLength={6} placeholder="400000" value={newCustomerForm.pincode} onChange={(e) => updateNewCustomer('pincode', e.target.value)} />
                      </div>
                    </div>
                    {customerSaveError && <div className="text-[12px] text-red-600">{customerSaveError}</div>}
                    <div className="flex items-center gap-2 mt-1">
                      {!customer.name && (
                      <button type="button" className={cx.btnPrimary} disabled={customerSaving} onClick={handleCreateCustomer}>
                        {customerSaving ? 'Saving…' : `Save ${partyKind}`}
                      </button>
                      )}
                      {(customer.name || newCustomerForm.name) && (
                        <button type="button" className={cx.btnOutline} onClick={clearCustomer}>
                          Clear
                        </button>
                      )}
                    </div>
                    </div>
                  </div>
              </>
            ) : (
            <>
            {/* Customer name with search dropdown */}
            <div className={cx.field}>
              <label className={cx.label}>{config.partyNameLabel}</label>
              <div
                className="relative"
                tabIndex={-1}
                onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setShowCustomerDrop(false); }}
              >
                <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none" />
                <input
                  data-fkey="party"
                  className={`border ${errors.customerName ? 'border-red-400 bg-red-50 focus:border-red-500' : 'border-[#dbe4ef] focus:border-blue-500'} rounded-md pl-8 pr-3 py-2 text-[13px] text-[#111827] w-full outline-none font-[inherit]`}
                  placeholder={partySearchPlaceholder}
                  value={customerQuery || customer.name}
                  onFocus={() => { setShowCustomerDrop(true); setCustomerQuery(''); }}
                  onChange={(e) => { setCustomerQuery(e.target.value); updateCustomer('name', e.target.value); clearError('customerName'); }}
                />

                {showCustomerDrop && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-white border border-[#dde6f2] rounded-lg shadow-lg py-1 max-h-56 overflow-y-auto">
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-[#f1f5f9]">
                      <Search size={12} className="text-[#94a3b8] flex-none" />
                      <input
                        className="flex-1 text-[13px] outline-none font-[inherit] text-[#111827]"
                        placeholder="Search by name or GSTIN…"
                        value={customerQuery}
                        onChange={(e) => { setCustomerQuery(e.target.value); updateCustomer('name', e.target.value); clearError('customerName'); }}
                      />
                    </div>
                    {filteredCustomers.length === 0 ? (
                      <div className="px-4 py-3 text-[13px] text-[#536173]">No {partyKindLower}s found</div>
                    ) : (
                      filteredCustomers.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className="w-full flex flex-col gap-0.5 px-4 py-2.5 text-left hover:bg-[#f8fafc] cursor-pointer border-0 bg-transparent font-[inherit]"
                          onMouseDown={() => selectCustomer(c)}
                        >
                          <span className="text-[13px] font-medium text-[#111827]">{c.name}</span>
                          <span className="text-[11px] text-[#94a3b8] font-mono">{c.gstin} · {c.city}</span>
                        </button>
                      ))
                    )}
                    <div className="border-t border-[#edf2f7] mt-1 pt-1">
                      <button type="button" className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] text-blue-600 font-medium hover:bg-blue-50 cursor-pointer border-0 bg-transparent font-[inherit]">
                        <UserPlus size={13} /> Add New {partyKind}
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {errors.customerName && (
                <p className="text-[11px] text-red-600 flex items-center gap-1 mt-0.5"><span>⚠</span> {errors.customerName}</p>
              )}
            </div>

            {/* Phone + GSTIN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className={cx.field}>
                <label className={cx.label}>Phone</label>
                <input className={cx.input} placeholder="+91 XXXXX XXXXX" value={customer.phone} onChange={(e) => updateCustomer('phone', e.target.value)} />
              </div>
              <div className={cx.field}>
                <label className={cx.label}>
                  GSTIN{' '}
                  {documentType === 'e-invoice'
                    ? <span className="text-red-500 ml-0.5">*</span>
                    : <span className="text-[10px] text-[#94a3b8] font-normal ml-1">(optional — required for B2B)</span>}
                </label>
                <div className="relative">
                  <input
                    className={`${errors.customerGstin ? cx.inputError : cx.input} pr-8 ${gstinValid ? 'border-green-400' : ''}`}
                    maxLength={15}
                    placeholder="15-digit GSTIN"
                    value={customer.gstin}
                    onChange={(e) => updateCustomer('gstin', e.target.value.toUpperCase())}
                  />
                  {gstinValid && <CheckCircle2 size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-green-500 pointer-events-none" />}
                </div>
                {gstinValid && (
                  <button type="button" className="text-[11px] text-blue-600 text-left cursor-pointer hover:underline bg-transparent border-0 font-[inherit] p-0 flex items-center gap-1">
                    <RefreshCw size={10} /> Fetch from GST Portal
                  </button>
                )}
                {errors.customerGstin && (
                  <p className="text-[11px] text-red-600 flex items-center gap-1">⚠ {errors.customerGstin}</p>
                )}
              </div>
            </div>

            <div className={cx.field}>
              <label className={cx.label}>Email <span className="text-[10px] text-[#94a3b8] font-normal ml-1">(optional)</span></label>
              <input className={cx.input} placeholder={`${partyKindLower}@email.com`} type="email" value={customer.email} onChange={(e) => updateCustomer('email', e.target.value)} />
            </div>

            <div className={cx.field}>
              <label className={cx.label}>{partyKind} Address <span className="text-[10px] text-[#94a3b8] font-normal ml-1">(optional)</span></label>
              <input className={cx.input} placeholder="Street / Building / Area" value={customer.address} onChange={(e) => updateCustomer('address', e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className={cx.field}>
                <label className={cx.label}>City</label>
                <input className={cx.input} placeholder="City" value={customer.city} onChange={(e) => updateCustomer('city', e.target.value)} />
              </div>
              <div className={cx.field}>
                <label className={cx.label}>State</label>
                <select className={cx.select} value={customer.state} onChange={(e) => updateCustomer('state', e.target.value)}>
                  {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className={cx.field}>
                <label className={cx.label}>PIN Code</label>
                <input className={cx.input} maxLength={6} placeholder="400000" value={customer.pincode} onChange={(e) => updateCustomer('pincode', e.target.value)} />
              </div>
            </div>
            </>
            )}

            {/* Shipping toggle */}
            <label className="flex items-center gap-2 cursor-pointer mt-1">
              <input
                checked={!sameShipping}
                className="w-4 h-4 rounded border-[#dbe4ef] accent-blue-600"
                type="checkbox"
                onChange={(e) => setSameShipping(!e.target.checked)}
              />
              <span className="text-[13px] text-[#374151]">Ship to a different address</span>
            </label>

            {config.showDeliveryAddress && (
              <div className={cx.field}>
                <label className={cx.label}>Delivery Address</label>
                <input className={cx.input} placeholder="Delivery location (if different from billing)" value={docExtra.deliveryAddress} onChange={(e) => updateExtra('deliveryAddress', e.target.value)} />
              </div>
            )}
          </div>

          {/* Invoice Meta */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="inline-block text-xs font-bold uppercase text-blue-700 bg-[#eef5ff] rounded-md px-2.5 py-1.5">{config.title}</span>
              {documentType === 'e-way-bill' && (
                <a
                  href="https://ewaybillgst.gov.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 no-underline"
                >
                  <svg fill="none" height="12" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="12"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
                  Open EWB Portal →
                </a>
              )}
            </div>

            <div className={cx.field}>
              <label className={cx.label}>{config.title} No. <span className="text-red-500 ml-0.5">*</span></label>
              <input className={errors.invoiceNumber ? cx.inputError : cx.input} value={docMeta.number} onChange={(e) => { updateMeta('number', e.target.value); clearError('invoiceNumber'); }} />
              {errors.invoiceNumber && <p className="text-[11px] text-red-600 flex items-center gap-1"><span>⚠</span> {errors.invoiceNumber}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className={cx.field}>
                <label className={cx.label}>{config.dateLabel} <span className="text-red-500 ml-0.5">*</span></label>
                <input className={errors.invoiceDate ? cx.inputError : cx.input} type="date" value={docMeta.date} onChange={(e) => { updateMeta('date', e.target.value); clearError('invoiceDate'); }} />
                {errors.invoiceDate && <p className="text-[11px] text-red-600 flex items-center gap-1"><span>⚠</span> {errors.invoiceDate}</p>}
              </div>
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
            </div>

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
                {/* Invoice Type */}
                <div className={cx.field}>
                  <label className={cx.label}>Invoice Type</label>
                  <select className={cx.select} value={docMeta.invoiceType} onChange={(e) => updateMeta('invoiceType', e.target.value)}>
                    {INVOICE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>

                {/* Payment Terms */}
                <div className={cx.field}>
                  <label className={cx.label}>Payment Terms</label>
                  <select className={cx.select} value={docMeta.paymentTerms} onChange={(e) => updateMeta('paymentTerms', e.target.value)}>
                    {PAYMENT_TERMS_LIST.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>

                {/* Place of Supply + GST Type */}
                <div className={cx.field}>
                  <label className={cx.label}>Place of Supply</label>
                  <select className={cx.select} value={docMeta.placeOfSupply} onChange={(e) => updateMeta('placeOfSupply', e.target.value)}>
                    {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className={cx.field}>
                  <label className={cx.label}>GST Type</label>
                  <div className="flex rounded-md border border-[#dbe4ef] overflow-hidden">
                    <button className={cx.toggleBtn(supplyType === 'intrastate')} type="button" onClick={() => setSupplyType('intrastate')}>Intrastate</button>
                    <button className={cx.toggleBtn(supplyType === 'interstate')} type="button" onClick={() => setSupplyType('interstate')}>Interstate</button>
                  </div>
                </div>

                {/* RCM toggle */}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className={cx.field}><label className={cx.label}>ACK Number</label><input className={cx.input} placeholder="ACK No." value={docExtra.ackNumber} onChange={(e) => updateExtra('ackNumber', e.target.value)} /></div>
                  <div className={cx.field}><label className={cx.label}>ACK Date</label><input className={cx.input} type="date" value={docExtra.ackDate} onChange={(e) => updateExtra('ackDate', e.target.value)} /></div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Shipping Address (when different) ── */}
        {!sameShipping && (
          <div className="px-6 py-5 border-b border-[#edf2f7] bg-[#fafbfe]">
            <h3 className="m-0 text-[15px] font-semibold mb-4">Shipping Address</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div className={cx.field}>
                <label className={cx.label}>Street / Building</label>
                <input className={cx.input} placeholder="Shipping address" value={shipping.address} onChange={(e) => setShipping((p) => ({ ...p, address: e.target.value }))} />
              </div>
              <div className={cx.field}>
                <label className={cx.label}>City</label>
                <input className={cx.input} placeholder="City" value={shipping.city} onChange={(e) => setShipping((p) => ({ ...p, city: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className={cx.field}>
                <label className={cx.label}>State</label>
                <select className={cx.select} value={shipping.state} onChange={(e) => setShipping((p) => ({ ...p, state: e.target.value }))}>
                  {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className={cx.field}>
                <label className={cx.label}>PIN Code</label>
                <input className={cx.input} maxLength={6} placeholder="400000" value={shipping.pincode} onChange={(e) => setShipping((p) => ({ ...p, pincode: e.target.value }))} />
              </div>
            </div>
          </div>
        )}

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
                <div className={cx.field}><label className={cx.label}>Supply Type</label><select className={cx.select} value={docExtra.ewbSupplyType} onChange={(e) => updateExtra('ewbSupplyType', e.target.value)}><option value="outward">Outward</option><option value="inward">Inward</option></select></div>
              </div>
            )}
          </div>
        )}

        {/* ── Items & Services ── */}
        <div className="billing-items-panel px-6 py-5 border-b border-[#edf2f7]">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h3 className="m-0 text-[15px] font-semibold">Items &amp; Services</h3>
            {config.showGst && (
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-[12px] font-medium text-[#536173]" htmlFor="bulk-gst-rate">GST for whole bill</label>
                <select
                  id="bulk-gst-rate"
                  className="border border-[#dbe4ef] rounded-md px-2.5 py-1.5 text-[13px] text-[#111827] bg-white outline-none focus:border-blue-500 font-[inherit]"
                  value={bulkGstRate}
                  onChange={(e) => setBulkGstRate(Number(e.target.value))}
                >
                  {GST_RATES.map((rate) => <option key={rate} value={rate}>{rate}%</option>)}
                </select>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-md cursor-pointer hover:bg-blue-100 font-[inherit]"
                  onClick={applyGstRateToAllItems}
                >
                  Apply to all items
                </button>
              </div>
            )}
          </div>

          <div className="billing-product-search">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7c8aa5]" />
              <input
                className="w-full border border-blue-300 rounded-lg pl-9 pr-12 py-3 text-[14px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-[inherit]"
                list="billing-product-search-options"
                placeholder="Search product by name, barcode, HSN, SKU, brand..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    addProductFromSearch(e.currentTarget.value);
                  }
                }}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-md border border-[#dbe4ef] bg-white text-blue-600 font-bold cursor-pointer"
                onClick={addProductFromSearch}
                title="Add selected product"
              >
                +
              </button>
              <datalist id="billing-product-search-options">
                {products.map((p) => (
                  <option
                    key={p._id ?? p.id ?? p.description}
                    value={p.description}
                    label={[p.itemType || 'Product', p.code, p.barcode].filter(Boolean).join(' - ')}
                  />
                ))}
              </datalist>
            </div>
            {config.showGst && (
              <button
                type="button"
                className="billing-add-new-item-btn"
                onClick={() => {
                  setBulkGstRate(18);
                  setItems((prev) => prev.map((item) => ({ ...item, gstRate: 18 })));
                }}
              >
                Apply 18% GST
              </button>
            )}
            <div className="billing-search-hint">Type to search product. Press Enter to add item. Scan barcode to add faster.</div>
          </div>

          {products.length > 0 && (
            <datalist id="billing-product-options">
              {products.map((p) => (
                  <option
                  key={p._id ?? p.id ?? p.description}
                  value={p.description}
                  label={[p.itemType || 'Product', p.code, p.barcode].filter(Boolean).join(' - ')}
                />
              ))}
            </datalist>
          )}

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {(config.showGst ? [
                    { w: '5%',  label: 'S.No',             align: 'center' },
                    { w: '17%', label: 'Item Name', align: 'left' },
                    { w: '17%', label: 'Description', align: 'left' },
                    { w: '9%',  label: 'HSN / SAC',        align: 'left' },
                    { w: '7%',  label: 'Qty',               align: 'right' },
                    { w: '10%', label: 'Unit',              align: 'left' },
                    { w: '9%',  label: 'Rate (₹)',          align: 'right' },
                    { w: '7%',  label: 'Disc %',            align: 'right' },
                    { w: '8%',  label: 'Taxable',           align: 'right' },
                    { w: '6%',  label: 'GST %',             align: 'left' },
                    { w: '8%',  label: 'Tax Amt',           align: 'right' },
                    { w: '9%',  label: 'Total (₹)',         align: 'right' },
                    { w: '5%',  label: '',                  align: 'center' },
                  ] : [
                    { w: '5%',  label: 'S.No',             align: 'center' },
                    { w: '25%', label: 'Item Name', align: 'left' },
                    { w: '25%', label: 'Description', align: 'left' },
                    { w: '12%', label: 'HSN / SAC',        align: 'left' },
                    { w: '9%',  label: 'Qty',               align: 'right' },
                    { w: '10%', label: 'Unit',              align: 'left' },
                    { w: '12%', label: 'Rate (₹)',          align: 'right' },
                    { w: '8%',  label: 'Disc %',            align: 'right' },
                    { w: '14%', label: 'Amount (₹)',        align: 'right' },
                    { w: '5%',  label: '',                  align: 'center' },
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
                {items.map((item, idx) => {
                  const line = calcLine(item);

                  return (
                    <tr key={item.id}>
                      <td className="border-t border-[#edf2f7] py-2 px-2 align-top text-center text-[#536173] text-xs pt-3">{idx + 1}</td>

                      {/* Existing product suggestions live in the item-name input while preserving manual entry. */}
                      <td className="border-t border-[#edf2f7] py-2 px-2 align-top">
                        {allowManualItemDescription ? (
                          <>
                            <input
                              data-row={idx}
                              data-col="description"
                              className={`w-full border ${!item.description && errors.items ? 'border-red-400 bg-red-50' : 'border-[#dbe4ef]'} rounded px-2 py-1.5 text-[13px] text-[#111827] font-[inherit] outline-none bg-white focus:border-blue-500`}
                              list="billing-product-options"
                              placeholder="Type item name..."
                              value={item.description}
                              onChange={(e) => {
                                const value = e.target.value;
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
                            />
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
                          <select
                            data-row={idx}
                            data-col="description"
                            className={`w-full border ${!item.description && errors.items ? 'border-red-400 bg-red-50' : 'border-[#dbe4ef]'} rounded px-2 py-1.5 text-[13px] text-[#111827] font-[inherit] outline-none bg-white focus:border-blue-500`}
                            value={item.description}
                            onChange={(e) => {
                              const chosen = findProductByScan(products, e.target.value);
                              if (chosen) {
                                selectProduct(item.id, chosen);
                              } else {
                                updateItem(item.id, 'description', '');
                              }
                              clearError('items');
                            }}
                          >
                            <option value="">Select product...</option>
                            {products.map((p) => (
                              <option key={p._id ?? p.id} value={p.description}>{p.description}</option>
                            ))}
                          </select>
                        )}
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
                        <input data-row={idx} data-col="unit" className="w-full border border-[#dbe4ef] rounded px-2 py-1.5 text-[13px] font-[inherit] outline-none bg-white" list="sales-unit-options" value={item.unit} onChange={(e) => updateItem(item.id, 'unit', e.target.value)} />
                      </td>
                      <td className="border-t border-[#edf2f7] py-2 px-2 align-top">
                        <input data-row={idx} data-col="rate" className={`w-full border ${errors[`item_rate_${idx}`] ? 'border-red-400 bg-red-50' : 'border-[#dbe4ef]'} rounded px-2 py-1.5 text-[13px] text-right font-[inherit] outline-none focus:border-blue-500 min-w-0`} min="0" type="number" value={item.rate} onChange={(e) => { updateItem(item.id, 'rate', e.target.value); setErrors((p) => { const n = { ...p }; delete n[`item_rate_${idx}`]; return n; }); }} />
                      </td>
                      <td className="border-t border-[#edf2f7] py-2 px-2 align-top">
                        <input data-row={idx} data-col="discount" className="w-full border border-[#dbe4ef] rounded px-2 py-1.5 text-[13px] text-right font-[inherit] outline-none focus:border-blue-500 min-w-0" max="100" min="0" type="number" value={item.discount} onChange={(e) => updateItem(item.id, 'discount', e.target.value)} />
                      </td>
                      {config.showGst && (
                        <>
                          <td className="border-t border-[#edf2f7] py-2 px-2 align-top text-right text-[13px] font-medium text-[#374151] pt-3">{formatCurrency(line.taxable)}</td>
                          <td className="border-t border-[#edf2f7] py-2 px-2 align-top">
                            <input data-row={idx} data-col="gstRate" className="billing-gst-rate-input w-full border border-[#dbe4ef] rounded px-2 py-1.5 text-[13px] font-[inherit] outline-none bg-white" list="sales-gst-rate-options" min="0" type="number" value={item.gstRate ?? 0} onChange={(e) => updateItem(item.id, 'gstRate', e.target.value)} />
                          </td>
                          <td className="border-t border-[#edf2f7] py-2 px-2 align-top text-right text-[13px] font-medium text-[#374151] pt-3">{formatCurrency(line.gstAmt)}</td>
                        </>
                      )}
                      <td className="border-t border-[#edf2f7] py-2 px-2 align-top text-right text-[13px] font-semibold text-[#111827] pt-3">{formatCurrency(config.showGst ? line.total : line.taxable)}</td>
                      <td className="border-t border-[#edf2f7] py-2 px-2 align-top text-center">
                        {items.length > 1 && (
                          <button className="w-7 h-7 text-red-400 bg-transparent border-0 text-lg cursor-pointer rounded hover:bg-red-50 hover:text-red-700 font-[inherit]" title="Remove" type="button" onClick={() => removeItem(item.id)}>×</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <datalist id="sales-unit-options">
              {UNITS.map((u) => <option key={u} value={u} />)}
            </datalist>
            <datalist id="sales-gst-rate-options">
              {GST_RATES.map((r) => <option key={r} value={r} />)}
            </datalist>
          </div>

          <button
            type="button"
            className="mt-3 flex items-center gap-1.5 text-[13px] text-blue-600 font-medium border border-dashed border-blue-200 rounded-md px-3 py-2 bg-blue-50/40 hover:bg-blue-50 cursor-pointer font-[inherit]"
            onClick={addItem}
            title="Add another item (Alt+N)"
          >
            <Plus size={14} /> Add Item
          </button>
          {errors.items && (
            <p className="mt-2 text-[11px] text-red-600 flex items-center gap-1.5">
              <svg fill="none" height="12" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="12"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
              {errors.items}
            </p>
          )}

        </div>

        {/* ── Additional Charges ── */}
        <div className="px-6 py-5 border-b border-[#edf2f7]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="m-0 text-[14px] font-semibold text-[#374151]">Additional Charges</h3>
            <div className="flex items-center gap-2 flex-wrap">
              {CHARGE_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className="text-[12px] text-[#536173] border border-[#dbe4ef] rounded-md px-2.5 py-1 bg-white hover:bg-gray-50 cursor-pointer font-[inherit] transition-colors"
                  onClick={() => addCharge(p)}
                >
                  + {p.label}
                </button>
              ))}
              <button
                type="button"
                className="flex items-center gap-1 text-[12px] text-blue-600 border border-blue-200 rounded-md px-2.5 py-1 bg-blue-50 hover:bg-blue-100 cursor-pointer font-[inherit] transition-colors"
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
                        <select className={`${cx.select} bg-white`} value={charge.gstRate} onChange={(e) => updateCharge(charge.id, 'gstRate', Number(e.target.value))}>
                          {GST_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
                        </select>
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
        <div className="billing-lower-details grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8 p-6">

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

            {/* Bank Details */}
            {config.showPayment && (bizSettings.bankName || bizSettings.accountNumber || bizSettings.ifscCode) && (
              <div className="flex flex-col gap-2">
                <div className={cx.sectionTitle}>Bank Details</div>
                <div className="flex flex-col gap-2 bg-[#fafbfe] border border-[#edf2f7] rounded-lg px-4 py-3">
                  {[
                    ['Bank Name', bizSettings.bankName],
                    ['Account Holder Name', bizSettings.accountHolderName],
                    ['Account No.', bizSettings.accountNumber],
                    ['IFSC Code', bizSettings.ifscCode],
                    ['Account Type', bizSettings.accountType],
                    ['Branch', bizSettings.bankBranch],
                  ].filter(([, v]) => v).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-[13px]">
                      <span className="text-[#536173]">{k}</span>
                      <span className="font-medium">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Fields */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className={cx.sectionTitle}>Custom Fields</div>
                <button type="button" className="flex items-center gap-1 text-[12px] text-blue-600 hover:underline cursor-pointer bg-transparent border-0 font-[inherit]" onClick={addCustomField}>
                  <Plus size={11} /> Add Field
                </button>
              </div>
              {customFields.length > 0 && (
                <div className="flex flex-col gap-2">
                  {customFields.map((f) => (
                    <div key={f.id} className="grid grid-cols-[1fr_1fr_28px] gap-2 items-center">
                      <input className={cx.input} placeholder="Field name" value={f.key} onChange={(e) => updateCustomField(f.id, 'key', e.target.value)} />
                      <input className={cx.input} placeholder="Value" value={f.value} onChange={(e) => updateCustomField(f.id, 'value', e.target.value)} />
                      <button type="button" className="w-7 h-7 flex items-center justify-center text-[#94a3b8] hover:text-red-500 cursor-pointer bg-transparent border-0 rounded font-[inherit]" onClick={() => removeCustomField(f.id)}><X size={13} /></button>
                    </div>
                  ))}
                </div>
              )}
              {customFields.length === 0 && (
                <div className="text-[12px] text-[#94a3b8]">Add custom fields like Project Code, Contract No., PAN, etc.</div>
              )}
            </div>

            {/* Recurring Invoice */}
            <div className="flex flex-col gap-3 bg-[#fafbfe] border border-[#edf2f7] rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-[#536173]" />
                    <span className="text-[13px] font-semibold text-[#374151]">Recurring Invoice</span>
                  </div>
                  <div className="text-[11px] text-[#94a3b8] mt-0.5 ml-5">Auto-generate this invoice on a schedule</div>
                </div>
                <div
                  className={`w-10 h-5 rounded-full transition-colors cursor-pointer flex-none ${recurring.enabled ? 'bg-blue-600' : 'bg-[#dbe4ef]'}`}
                  onClick={() => setRecurring((p) => ({ ...p, enabled: !p.enabled }))}
                >
                  <div className={`w-4 h-4 bg-white rounded-full mt-0.5 transition-transform ${recurring.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
              </div>
              {recurring.enabled && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className={cx.field}>
                    <label className={cx.label}>Frequency</label>
                    <select className={cx.select} value={recurring.frequency} onChange={(e) => setRecurring((p) => ({ ...p, frequency: e.target.value }))}>
                      {RECURRING_FREQ.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </div>
                  <div className={cx.field}>
                    <label className={cx.label}>End After (invoices)</label>
                    <input className={cx.input} min="1" placeholder="e.g. 12" type="number" value={recurring.endAfter} onChange={(e) => setRecurring((p) => ({ ...p, endAfter: e.target.value }))} />
                  </div>
                  <div className={cx.field}>
                    <label className={cx.label}>Or End Date</label>
                    <input className={cx.input} type="date" value={recurring.endDate} onChange={(e) => setRecurring((p) => ({ ...p, endDate: e.target.value }))} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT column — Tax Summary + Totals + Signature */}
          <div className="flex flex-col gap-4">

            {/* Tax Summary */}
            {config.showGst && (
              <>
                <div className={cx.sectionTitle}>Tax Summary</div>
                <div className="overflow-x-auto">
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
              </>
            )}

            {/* Totals breakdown */}
            <div className="flex flex-col gap-1 text-[13px]">

              <div className="flex justify-between py-1.5 border-b border-[#f3f4f6]">
                <span className="text-[#536173]">Subtotal</span><span>{formatCurrency(totals.subtotal)}</span>
              </div>

              {totals.discount > 0 && (
                <div className="flex justify-between py-1.5 border-b border-[#f3f4f6] text-red-600">
                  <span>Line Discounts</span><span>− {formatCurrency(totals.discount)}</span>
                </div>
              )}

              {config.showGst && (
                <div className="flex justify-between py-1.5 border-b border-[#f3f4f6]">
                  <span className="text-[#536173]">Taxable Amount</span><span>{formatCurrency(totals.taxable)}</span>
                </div>
              )}

              {/* GST breakdown */}
              {config.showGst && (
                supplyType === 'intrastate'
                  ? Object.entries(totals.gstByRate).flatMap(([rate, data]) => [
                      <div key={`cgst-${rate}`} className="flex justify-between py-1 border-b border-[#f3f4f6] text-[#536173]">
                        <span>CGST @ {Number(rate) / 2}%</span><span>{formatCurrency(data.gst / 2)}</span>
                      </div>,
                      <div key={`sgst-${rate}`} className="flex justify-between py-1 border-b border-[#f3f4f6] text-[#536173]">
                        <span>SGST @ {Number(rate) / 2}%</span><span>{formatCurrency(data.gst / 2)}</span>
                      </div>,
                    ])
                  : Object.entries(totals.gstByRate).map(([rate, data]) => (
                      <div key={rate} className="flex justify-between py-1 border-b border-[#f3f4f6] text-[#536173]">
                        <span>IGST @ {rate}%</span><span>{formatCurrency(data.gst)}</span>
                      </div>
                    ))
              )}

              {/* Charges */}
              {totals.chargesSubtotal > 0 && (
                <div className="flex justify-between py-1.5 border-b border-[#f3f4f6]">
                  <span className="text-[#536173]">Additional Charges</span><span>{formatCurrency(totals.chargesSubtotal)}</span>
                </div>
              )}
              {config.showGst && totals.chargesGst > 0 && (
                <div className="flex justify-between py-1 border-b border-[#f3f4f6] text-[#536173]">
                  <span>GST on Charges</span><span>{formatCurrency(totals.chargesGst)}</span>
                </div>
              )}

              {/* Additional Discount toggle */}
              <div className="flex justify-between py-1.5 border-b border-[#f3f4f6] items-center">
                <button
                  type="button"
                  className="flex items-center gap-1 text-[13px] text-blue-600 cursor-pointer bg-transparent border-0 font-[inherit] p-0 hover:underline"
                  onClick={() => setShowAddDiscount((v) => !v)}
                >
                  <Tag size={12} />
                  {showAddDiscount ? 'Remove' : 'Add'} Additional Discount
                </button>
                {totals.addDiscAmt > 0 && <span className="text-red-600">− {formatCurrency(totals.addDiscAmt)}</span>}
              </div>
              {showAddDiscount && (
                <div className="flex gap-2 py-2 border-b border-[#f3f4f6]">
                  <div className="flex rounded-md border border-[#dbe4ef] overflow-hidden text-[12px] flex-none">
                    <button className={cx.toggleBtn(addDiscount.type === 'percent')} type="button" style={{ padding: '6px 10px' }} onClick={() => setAddDiscount((p) => ({ ...p, type: 'percent' }))}>%</button>
                    <button className={cx.toggleBtn(addDiscount.type === 'flat')} type="button" style={{ padding: '6px 10px' }} onClick={() => setAddDiscount((p) => ({ ...p, type: 'flat' }))}>₹</button>
                  </div>
                  <input
                    className={cx.input}
                    min="0"
                    placeholder={addDiscount.type === 'percent' ? 'Discount %' : 'Discount ₹'}
                    type="number"
                    value={addDiscount.value}
                    onChange={(e) => setAddDiscount((p) => ({ ...p, value: e.target.value }))}
                  />
                </div>
              )}

              {/* TDS / TCS toggle */}
              <div className="flex justify-between py-1.5 border-b border-[#f3f4f6] items-center">
                <button
                  type="button"
                  className="flex items-center gap-1 text-[13px] text-blue-600 cursor-pointer bg-transparent border-0 font-[inherit] p-0 hover:underline"
                  onClick={() => setShowTdsTcs((v) => !v)}
                >
                  {showTdsTcs ? 'Hide' : 'Add'} TDS / TCS
                </button>
              </div>
              {showTdsTcs && (
                <div className="border border-[#edf2f7] rounded-lg p-3 mb-1 flex flex-col gap-3">
                  {/* TDS */}
                  <div>
                    <label className="flex items-center justify-between cursor-pointer mb-2">
                      <span className="text-[13px] font-medium text-[#374151]">TDS Deduction</span>
                      <div className={`w-9 h-4.5 rounded-full transition-colors cursor-pointer ${tds.enabled ? 'bg-blue-600' : 'bg-[#dbe4ef]'}`} onClick={() => setTds((p) => ({ ...p, enabled: !p.enabled }))}>
                        <div className={`w-3.5 h-3.5 bg-white rounded-full mt-px transition-transform ${tds.enabled ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                      </div>
                    </label>
                    {tds.enabled && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className={cx.field}>
                          <label className={cx.label}>TDS Section</label>
                          <select className={cx.select} value={tds.section} onChange={(e) => updateTds('section', e.target.value)}>
                            {TDS_SECTIONS.map((s) => <option key={s.code} value={s.code}>{s.label}</option>)}
                          </select>
                        </div>
                        <div className={cx.field}>
                          <label className={cx.label}>Rate (%)</label>
                          <input className={cx.input} min="0" step="0.01" type="number" value={tds.rate} onChange={(e) => updateTds('rate', Number(e.target.value))} />
                        </div>
                        <div className="col-span-2 flex justify-between text-[12px] text-[#536173] bg-[#fafbfe] rounded px-2 py-1.5">
                          <span>TDS on taxable ({formatCurrency(totals.taxable)} × {tds.rate}%)</span>
                          <span className="font-semibold text-red-600">− {formatCurrency(totals.tdsAmt)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* TCS */}
                  <div className="border-t border-[#edf2f7] pt-3">
                    <label className="flex items-center justify-between cursor-pointer mb-2">
                      <span className="text-[13px] font-medium text-[#374151]">TCS Collection</span>
                      <div className={`w-9 h-4.5 rounded-full transition-colors cursor-pointer ${tcs.enabled ? 'bg-blue-600' : 'bg-[#dbe4ef]'}`} onClick={() => setTcs((p) => ({ ...p, enabled: !p.enabled }))}>
                        <div className={`w-3.5 h-3.5 bg-white rounded-full mt-px transition-transform ${tcs.enabled ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                      </div>
                    </label>
                    {tcs.enabled && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className={cx.field}>
                          <label className={cx.label}>TCS Rate (%)</label>
                          <input className={cx.input} min="0" step="0.01" type="number" value={tcs.rate} onChange={(e) => setTcs((p) => ({ ...p, rate: Number(e.target.value) }))} />
                        </div>
                        <div className="flex items-end">
                          <div className="text-[12px] text-[#536173] bg-[#fafbfe] rounded px-2 py-1.5 w-full">
                            TCS: <span className="font-semibold text-[#374151]">+ {formatCurrency(totals.tcsAmt)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Round off */}
              {Math.abs(totals.roundOff) >= 0.01 && (
                <div className="flex justify-between py-1.5 border-b border-[#f3f4f6] text-[#536173]">
                  <span>Round Off</span><span>{totals.roundOff > 0 ? '+' : ''}{formatCurrency(totals.roundOff)}</span>
                </div>
              )}

              {/* Grand Total */}
              {documentType === 'quotation' && (
                <div className="py-2 border-b border-[#f3f4f6]">
                  <label className="mb-1 flex items-center justify-between text-[12px] font-medium text-[#536173]">
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
              <div className="flex justify-between items-center text-base font-bold pt-2 mt-1 border-t-2 border-[#111827]">
                <span>Total Amount</span><span>{formatCurrency(totals.finalTotal)}</span>
              </div>

              {/* ── Payment Method ── */}
              {config.showPayment && (
                <div className="pt-3 mt-1 border-t border-[#f3f4f6]">
                  <div className="text-[11px] font-semibold uppercase text-[#536173] tracking-wide mb-2">Payment</div>

                  {/* Method tiles — 3 per row */}
                  <div className="grid grid-cols-3 gap-1.5 mb-2">
                    {PAYMENT_METHODS.map((m) => {
                      const active = selectedPayment === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => selectPaymentMethod(m.id)}
                          className="flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg border text-[10px] font-semibold cursor-pointer transition-all font-[inherit] leading-tight"
                          style={active
                            ? { background: m.color, borderColor: m.color, color: '#fff' }
                            : { borderColor: '#dbe4ef', color: '#536173', background: '#fff' }
                          }
                        >
                          <span className="text-[15px] leading-none">{m.emoji}</span>
                          <span>{m.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Contextual inputs */}
                  {selectedPayment && selectedPayment !== 'credit' && (() => {
                    const amtNum  = Number(paymentData.amount) || 0;
                    const balance = Math.max(0, totals.finalTotal);
                    const change  = amtNum > balance ? amtNum - balance : 0;
                    return (
                      <div className="flex flex-col gap-1.5">
                        {/* Amount row */}
                        <div className="flex gap-1">
                          <input
                            className="border border-[#dbe4ef] rounded px-2 py-1.5 text-[13px] text-right outline-none focus:border-blue-500 font-[inherit] flex-1 min-w-0"
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
                            className="text-[10px] px-2 py-1.5 rounded border border-[#dbe4ef] bg-[#fafbfe] hover:bg-gray-100 cursor-pointer font-[inherit] whitespace-nowrap text-[#374151]"
                            onClick={() => {
                              updatePayment('amount', String(balance));
                              setAdvanceAmt(String(balance));
                            }}
                          >
                            Full
                          </button>
                        </div>

                        {/* Cash change */}
                        {selectedPayment === 'cash' && change > 0 && (
                          <div className="text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1">
                            Return change: ₹{change.toLocaleString('en-IN')}
                          </div>
                        )}

                        {/* UPI reference */}
                        {selectedPayment === 'upi' && (
                          <input
                            className="border border-[#dbe4ef] rounded px-2 py-1.5 text-[12px] outline-none focus:border-blue-500 font-[inherit] w-full"
                            placeholder="UPI Ref / UTR (optional)"
                            value={paymentData.utrNumber}
                            onChange={(e) => updatePayment('utrNumber', e.target.value)}
                          />
                        )}

                        {/* Bank UTR */}
                        {selectedPayment === 'bank' && (
                          <input
                            className="border border-[#dbe4ef] rounded px-2 py-1.5 text-[12px] outline-none focus:border-blue-500 font-[inherit] w-full"
                            placeholder="UTR / Transaction No."
                            value={paymentData.utrNumber}
                            onChange={(e) => updatePayment('utrNumber', e.target.value)}
                          />
                        )}

                        {/* Cheque */}
                        {selectedPayment === 'cheque' && (
                          <div className="flex gap-1">
                            <input
                              className="border border-[#dbe4ef] rounded px-2 py-1.5 text-[12px] outline-none focus:border-blue-500 font-[inherit] flex-1 min-w-0"
                              placeholder="Cheque No."
                              value={paymentData.chequeNo}
                              onChange={(e) => updatePayment('chequeNo', e.target.value)}
                            />
                            <input
                              className="border border-[#dbe4ef] rounded px-2 py-1.5 text-[12px] outline-none focus:border-blue-500 font-[inherit] flex-1 min-w-0"
                              placeholder="Bank"
                              value={paymentData.bankName}
                              onChange={(e) => updatePayment('bankName', e.target.value)}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Credit info */}
                  {selectedPayment === 'credit' && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-[11px] text-amber-800">
                      Will appear in <strong>Receivables</strong> as unpaid.
                      {docMeta.dueDate && <> Due: <strong>{docMeta.dueDate}</strong></>}
                    </div>
                  )}

                  {/* Nothing selected hint */}
                  {!selectedPayment && (
                    <div className="text-[11px] text-[#94a3b8] text-center py-0.5">
                      No selection = saved as credit
                    </div>
                  )}
                </div>
              )}

              {/* Generate Bill */}
              <button
                type="button"
                className="flex justify-center items-center gap-2 text-[15px] font-bold mt-3 bg-blue-600 text-white rounded-lg px-3 py-2.5 w-full border-0 cursor-pointer hover:bg-blue-700 font-[inherit] disabled:opacity-60"
                disabled={saveLoading}
                onClick={() => handleSave({ openPreview: true })}
              >
                <svg fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" x2="8" y1="13" y2="13" /><line x1="16" x2="8" y1="17" y2="17" /></svg>
                {saveLoading ? 'Generating…' : 'Generate Bill'}
              </button>
            </div>

            {/* Signature */}
            <div className="mt-4 pt-4 border-t border-[#edf2f7] text-center">
              <div className="text-xs text-[#536173] mb-8">Authorised Signatory</div>
              <div className="border-b border-[#111827] mx-auto w-40 mb-2" />
              <div className="text-[13px] font-medium">GoBook Enterprises</div>
            </div>
          </div>
        </div>


      </div>

      <aside className="billing-summary-card">
        <div className="billing-summary-title">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-blue-600">
            <svg fill="none" height="15" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="15"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </span>
          Invoice Summary
        </div>

        <div className="billing-summary-lines">
          <div><span>Subtotal</span><strong>{formatCurrency(totals.subtotal)}</strong></div>
          {totals.discount > 0 && <div className="text-green-700"><span>Discount</span><strong>- {formatCurrency(totals.discount)}</strong></div>}
          <div><span>Taxable Amount</span><strong>{formatCurrency(totals.taxable)}</strong></div>
          {config.showGst && supplyType === 'intrastate' && Object.entries(totals.gstByRate).flatMap(([rate, data]) => [
            <div key={`side-cgst-${rate}`}><span>CGST @ {Number(rate) / 2}%</span><strong>{formatCurrency(data.gst / 2)}</strong></div>,
            <div key={`side-sgst-${rate}`}><span>SGST @ {Number(rate) / 2}%</span><strong>{formatCurrency(data.gst / 2)}</strong></div>,
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
          <div className="text-[12px] font-bold uppercase tracking-wide text-blue-700">Total Amount</div>
          <div className="text-[30px] font-extrabold text-blue-700 leading-tight">{formatCurrency(totals.finalTotal)}</div>
          <div className="mt-2 text-[11px] text-[#536173]">
            <span className="font-semibold text-[#334155]">Amount in words</span><br />
            {numberToWords(totals.finalTotal)}
          </div>
        </div>

        {config.showPayment && (
          <div className="billing-payment-panel">
            <div className="billing-summary-subtitle">Payment Method</div>
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
                  <label>Amount Received</label>
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
                      <span>Extra Received</span>
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

                  {selectedPayment === 'cheque' && (
                    <div className="billing-payment-cheque">
                      <input
                        placeholder="Cheque No."
                        value={paymentData.chequeNo}
                        onChange={(e) => updatePayment('chequeNo', e.target.value)}
                      />
                      <input
                        placeholder="Bank"
                        value={paymentData.bankName}
                        onChange={(e) => updatePayment('bankName', e.target.value)}
                      />
                    </div>
                  )}
                </div>
              );
            })()}

            {selectedPayment === 'credit' && (
              <div className="billing-payment-details">
                <div className="billing-payment-balance">
                  <span>Balance Due</span>
                  <strong>{formatCurrency(totals.finalTotal)}</strong>
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

      </aside>
      </div>

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
              <select className={cx.select} value={newCustomerForm.state} onChange={(e) => updateNewCustomer('state', e.target.value)}>
                {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className={cx.field}>
              <label className={cx.label}>PIN Code</label>
              <input className={cx.input} maxLength={6} placeholder="620001" value={newCustomerForm.pincode} onChange={(e) => updateNewCustomer('pincode', e.target.value)} />
            </div>
          </div>

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

      {/* ── F-Key Shortcut Bar ── */}
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

      <div
        className="fixed bottom-0 left-0 right-0 md:left-60 z-30 select-none hidden md:block"
        style={{ background: '#062844', borderTop: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 -4px 16px rgba(0,0,0,0.25)' }}
      >
        <div className="flex items-stretch" style={{ height: 50 }}>
          {((() => {
            const newRoute = ({ invoice: '/billing/invoice/new', 'bill-of-supply': '/billing/bill-of-supply/new', quotation: '/billing/quotation/new', 'purchase-order': '/billing/purchase-order/new', 'purchase-entry': '/billing/purchase-entry/new', 'credit-note': '/billing/credit-note/new', 'debit-note': '/billing/debit-note/new', 'sales-return': '/billing/sales-return/new', 'supplier-return': '/billing/supplier-return/new', 'delivery-challan': '/billing/delivery-challan/new', 'e-invoice': '/billing/e-invoice/new', 'e-way-bill': '/billing/e-way-bill/new' })[documentType] ?? '/billing/invoice/new';
            const f1Label  = ({ invoice: 'New Bill', 'bill-of-supply': 'New BOS', quotation: 'New Quote', 'purchase-order': 'New PO', 'purchase-entry': 'New PE', 'credit-note': 'New Credit', 'debit-note': 'New Debit', 'sales-return': 'New Return', 'supplier-return': 'New Return', 'delivery-challan': 'New Challan', 'e-invoice': 'New E-Inv', 'e-way-bill': 'New EWB' })[documentType] ?? 'New';
            const f6Label  = ({ invoice: 'Party', 'bill-of-supply': 'Party', quotation: 'Party', 'purchase-order': 'Vendor', 'purchase-entry': 'Vendor', 'credit-note': 'Party', 'debit-note': 'Party', 'sales-return': 'Party', 'supplier-return': 'Vendor', 'delivery-challan': 'Consignee', 'e-invoice': 'Party', 'e-way-bill': 'Consignee' })[documentType] ?? 'Party';
            const f7Label  = ({ invoice: 'Discount', 'bill-of-supply': 'Discount', quotation: 'Valid Till', 'purchase-order': 'Delivery', 'purchase-entry': 'Linked PO', 'credit-note': 'Ref Invoice', 'debit-note': 'Ref Invoice', 'sales-return': 'Ref Invoice', 'supplier-return': 'Ref Invoice', 'delivery-challan': 'Vehicle', 'e-invoice': 'IRN No.', 'e-way-bill': 'Vehicle' })[documentType] ?? 'Extra';
            const f7fkey   = ({ invoice: null, 'bill-of-supply': null, quotation: 'valid-till', 'purchase-order': 'expected-delivery', 'purchase-entry': null, 'credit-note': 'ref-invoice', 'debit-note': 'ref-invoice', 'sales-return': 'ref-invoice', 'supplier-return': 'ref-invoice', 'delivery-challan': 'vehicle', 'e-invoice': 'irn', 'e-way-bill': 'vehicle' })[documentType];
            return [
              { key: 'F1',  label: f1Label,   action: () => window.location.assign(newRoute) },
              { key: 'F2',  label: 'Save',     action: () => { if (!saveLoading) handleSave(); } },
              { key: 'F3',  label: 'Preview',  action: () => { setAutoPrintPreview(false); setShowPreview(true); } },
              { key: 'F4',  label: 'Print',    action: () => { if (!saveLoading) handlePrintBill(); } },
              { key: 'F5',  label: 'Add Item', action: () => addItem() },
              { key: 'F6',  label: f6Label,    action: () => document.querySelector('[data-fkey="party"]')?.focus() },
              { key: 'F7',  label: f7Label,    action: () => { if (f7fkey) { document.querySelector(`[data-fkey="${f7fkey}"]`)?.focus(); } else { setShowAddDiscount((v) => !v); } } },
              { key: 'F8',  label: 'View List', action: () => window.location.assign(LIST_ROUTES[documentType] ?? '/billing/invoice') },
              { key: 'F10', label: 'Home',     action: () => window.location.assign('/dashboard') },
              { key: 'F11', label: 'Settings', action: () => window.location.assign('/business-settings') },
              { key: 'F12', label: 'Close',    action: () => window.location.assign(LIST_ROUTES[documentType] ?? '/billing/invoice') },
            ];
          })()).map(({ key, label, action }, idx, arr) => (
            <button
              key={key}
              type="button"
              onClick={action}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 px-0.5 min-w-0 font-[inherit] border-0 bg-transparent cursor-pointer transition-colors"
              style={{ borderRight: idx < arr.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              onMouseDown={(e) => { e.currentTarget.style.background = 'rgba(59,130,246,0.3)'; }}
              onMouseUp={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
            >
              <span
                className="rounded-sm text-white"
                style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', background: '#1d4ed8', paddingInline: 5, lineHeight: '16px' }}
              >
                {key}
              </span>
              <span style={{ fontSize: 11, color: 'rgba(200,223,242,0.9)', lineHeight: 1.2, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
