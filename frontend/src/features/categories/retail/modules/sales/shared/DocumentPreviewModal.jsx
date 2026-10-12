import { getInvoiceLayoutSettings } from '../../../../../../utils/invoiceLayoutSettings.js';
import {
  INVOICE_DESIGN_ELEMENTS,
  getInvoiceDesignDimensions,
  getInvoiceDesignSettings,
  getInvoiceThermalTemplate,
} from '../../../../../../utils/invoiceDesignSettings.js';
import { InvoicePdfSurface } from './InvoicePdfSurface.jsx';
import { X } from 'lucide-react';

import { SERVER_ORIGIN } from '../../../../../../services/api.js';
import { useFocusTrap } from '../../../../../../hooks/useFocusTrap.js';
import { numberToWords } from '../../../../../../utils/numberToWords.js';

const btnOutline = 'inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium text-gray-700 bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit]';

function formatAmount(value) {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB').replace(/\//g, '-');
}

function formatTime(value) {
  if (!value) return '';
  const raw = value;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).replace(/\s/g, '').toLowerCase();
}

function fieldValue(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== '') || '';
}

function documentTitleForPreview(config = {}) {
  const configuredTitle = fieldValue(config.printTitle, config.title);
  const normalizedType = String(config.documentType || configuredTitle || '').toLowerCase();
  if (normalizedType.includes('quotation')) return 'QUOTATION';
  if (normalizedType.includes('invoice') || normalizedType.includes('bill-of-supply')) return 'TAX INVOICE';
  return configuredTitle ? String(configuredTitle).toUpperCase() : 'TAX INVOICE';
}

function initialsForName(name = '') {
  const initials = String(name || '')
    .split(/\s+/)
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 3)
    .join('');
  return initials || '';
}

function lineCalc(item = {}) {
  const qty = Number(item.qty) || 0;
  const rate = Number(item.rate) || 0;
  const gross = qty * rate;
  const discountValue = Number(item.discount) || 0;
  const discountType = item.discountType === 'amount' ? 'amount' : 'percent';
  const discountAmt = Math.min(gross, discountType === 'amount' ? discountValue : gross * (discountValue / 100));
  const taxable = gross - discountAmt;
  const gstRate = Number(item.gstRate) || 0;
  const gstAmt = taxable * (gstRate / 100);
  return { qty, rate, taxable, gstRate, gstAmt, total: taxable + gstAmt };
}

function cleanPrintableItemText(value = '') {
  return String(value || '')
    .split(/\s+-\s+/)
    .filter((part) => !/^(sku|barcode|stock)\s*:/i.test(part.trim()))
    .join(' - ')
    .trim();
}

function itemVariantText(item = {}) {
  return cleanPrintableItemText(item.size || item.modelName || item.modelNumber || '');
}

function purchaseVariantText(item = {}) {
  return [
    item.brand || item.other || item.variantBrand || '',
    itemVariantText(item),
    item.material || item.fabric || item.variantMaterial || '',
  ]
    .map((part) => cleanPrintableItemText(part))
    .filter(Boolean)
    .filter((part, index, arr) => arr.findIndex((value) => value.toLowerCase() === part.toLowerCase()) === index)
    .join(' / ');
}

function itemName(item = {}, { includeVariant = true } = {}) {
  const description = cleanPrintableItemText(item.description || item.name || item.productName || '');
  const model = itemVariantText(item);
  if (!description) return model || '-';
  if (!includeVariant || !model || description.toLowerCase().includes(model.toLowerCase())) return description;
  return `${description} ${model}`;
}

function itemDescriptionLines(item = {}, options = {}) {
  const lines = [
    itemName(item, options),
    item.itemDescription || item.lineDescription || item.details || item.note || item.remark || '',
  ];
  const seen = new Set();
  return lines
    .flatMap((part) => String(part || '').split(/\r?\n/))
    .map((line) => cleanPrintableItemText(line))
    .filter((line) => {
      if (!line) return false;
      const key = line.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function formatQty(value) {
  const numeric = Number(value) || 0;
  return Number.isInteger(numeric) ? String(numeric) : numeric.toLocaleString('en-IN', { maximumFractionDigits: 3 });
}

function taxGroupsForInvoice({ totals = {}, items = [], charges = [] }) {
  const byRate = totals.gstByRate && Object.keys(totals.gstByRate).length
    ? Object.fromEntries(Object.entries(totals.gstByRate).map(([rate, value]) => [rate, { ...value }]))
    : items.reduce((acc, item) => {
      const line = lineCalc(item);
      if (!line.taxable) return acc;
      if (!acc[line.gstRate]) acc[line.gstRate] = { taxable: 0, gst: 0 };
      acc[line.gstRate].taxable += line.taxable;
      acc[line.gstRate].gst += line.gstAmt;
      return acc;
    }, {});
  charges.forEach((charge) => {
    const amount = Number(charge.amount) || 0;
    const rate = Number(charge.gstRate) || 0;
    if (!amount) return;
    if (!byRate[rate]) byRate[rate] = { taxable: 0, gst: 0 };
    byRate[rate].taxable += amount;
    byRate[rate].gst += amount * (rate / 100);
  });
  return byRate;
}

function taxRowsForInvoice({ totals = {}, items = [], charges = [], supplyType = 'intrastate', showGst = true }) {
  if (!showGst) return [];
  const interstate = supplyType === 'interstate';
  return Object.entries(taxGroupsForInvoice({ totals, items, charges }))
    .filter(([, value]) => Number(value.gst) > 0)
    .flatMap(([rate, value]) => {
      const gst = Number(value.gst) || 0;
      const numericRate = Number(rate) || 0;
      if (interstate) return [{ label: `IGST @ ${numericRate}%`, amount: gst }];
      return [
        { label: `CGST @ ${numericRate / 2}%`, amount: gst / 2 },
        { label: `SGST @ ${numericRate / 2}%`, amount: gst / 2 },
      ];
    });
}

function bankRowsForInvoice(bizSettings = {}, docExtra = {}, documentType = '', customer = {}) {
  if (documentType === 'purchase-entry') {
    return [
      ['BANK NAME', fieldValue(docExtra.vendorBankName, customer.bankName, docExtra.bankName)],
      ['A/C NAME', fieldValue(docExtra.vendorAccountHolderName, customer.accountHolderName, docExtra.accountHolderName, docExtra.accountName)],
      ['A/C No.', fieldValue(docExtra.vendorAccountNumber, customer.accountNumber, docExtra.accountNumber, docExtra.accountNo)],
      ['IFSC CODE', fieldValue(docExtra.vendorIfscCode, customer.ifscCode, docExtra.ifscCode, docExtra.ifsc)],
      ['BRANCH', fieldValue(docExtra.vendorBankBranch, customer.bankBranch, docExtra.bankBranch)],
    ].filter(([, value]) => value);
  }

  return [
    ['BANK NAME', fieldValue(bizSettings.bankName, docExtra.bankName)],
    ['A/C NAME', fieldValue(bizSettings.accountHolderName, bizSettings.accountName, docExtra.accountName)],
    ['A/C No.', fieldValue(bizSettings.accountNumber, bizSettings.accountNo, docExtra.accountNumber)],
    ['IFSC CODE', fieldValue(bizSettings.ifscCode, bizSettings.ifsc, docExtra.ifscCode)],
  ].filter(([, value]) => value);
}

function compactLines(text, fallback = []) {
  const value = fieldValue(text, fallback.join('\n'));
  return String(value)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function InfoRow({ label, value, strong = false, align = 'left', className = '' }) {
  return (
    <div className={`erp-info-row ${className}`}>
      <span className="erp-info-label">{label}</span>
      <span className="erp-info-separator">:</span>
      <span className={`erp-info-value ${strong ? 'erp-info-strong' : ''} ${align === 'right' ? 'erp-info-right' : ''}`}>{value || ''}</span>
    </div>
  );
}

function BalanceRow({ label, marker = '=', value, strong = false, underline = false }) {
  return (
    <div className={`erp-balance-row ${strong ? 'erp-balance-strong' : ''}`}>
      <span>{label}</span>
      <b>{marker}</b>
      <strong className={underline ? 'erp-balance-underlined' : ''}>{value || ''}</strong>
    </div>
  );
}

function addressLines(source = {}, fallback = []) {
  const direct = [
    source.address,
    [source.city, source.state].filter(Boolean).join(' - '),
    source.pincode ? `PIN : ${source.pincode}` : '',
  ].filter(Boolean);
  return direct.length ? direct : fallback;
}

export function DocumentPreviewModal({
  config = {},
  customer = {},
  docMeta = {},
  docExtra = {},
  items = [],
  charges = [],
  totals = {},
  terms = '',
  notes = '',
  supplyType = 'intrastate',
  bizSettings = {},
  paymentMethod = '',
  embedded = false,
  onClose,
  autoPrint = false,
  downloadAsPdf = false,
  printInvoice = false,
  pdfMode = false,
  invoiceNumber = '',
  onPdfReady = null,
  onPdfDownloaded = null,
  onPdfPrinted = null,
}) {
  const modalRef = useFocusTrap({ active: !embedded, onClose });

  const businessName = fieldValue(bizSettings.businessName);
  const previewTitle = documentTitleForPreview(config);
  const isSupplierReturn = config.documentType === 'supplier-return';
  const isSalesReturn = config.documentType === 'sales-return';
  const isPurchaseDocument = ['purchase-entry', 'purchase-order'].includes(config.documentType);
  const isReturn = isSupplierReturn || isSalesReturn;
  const returnReference = isReturn && <div style={{ padding: '8px', fontSize: '11px', borderBottom: '1px solid #ddd' }}>
    <strong>{isSupplierReturn ? 'Purchase' : 'Original invoice'}: {docExtra.originalInvoiceNo || '-'} · {formatDate(docExtra.originalInvoiceDate)}</strong>
    {isSupplierReturn && docExtra.vendorInvoiceNo && <div>Supplier invoice: {docExtra.vendorInvoiceNo}</div>}
    <div>Return reason: {docExtra.reason || '-'}</div>
    <div>{isSupplierReturn ? 'Supplier' : 'Customer'} ledger adjustment. No cash or bank refund recorded by this document.</div>
  </div>;
  const logoSrc = bizSettings.logoUrl ? `${SERVER_ORIGIN}${bizSettings.logoUrl}` : '';
  const businessDescription = fieldValue(
    bizSettings.description,
    bizSettings.tagline,
  );
  const businessAddress = addressLines(bizSettings);
  const customerAddress = addressLines(customer);
  const customerGstin = fieldValue(
    customer.gstin,
    customer.gstNumber,
    customer.gstNo,
    customer.gst_no,
    docExtra.customerGstin,
    docExtra.customerGstNumber,
    docExtra.gstin,
  );
  const dueAmount = Math.max(0, Number(totals.balanceDue ?? totals.finalTotal ?? 0));
  const oldBalance = Number(docExtra.oldBalance ?? docMeta.oldBalance ?? 0) || 0;
  const invoiceAmount = Number(totals.finalTotal ?? dueAmount ?? 0) || 0;
  const newBalance = Number(docExtra.newBalance ?? docMeta.newBalance ?? (oldBalance + invoiceAmount)) || 0;
  const showGst = config.showGst !== false;
  const visibleItems = (Array.isArray(items) ? items : []).filter((item) => item.description || item.name || Number(item.rate) > 0);
  const taxRows = taxRowsForInvoice({ totals, items: visibleItems, charges, supplyType, showGst });
  const taxSummary = showGst ? Object.entries(taxGroupsForInvoice({ totals, items: visibleItems, charges }))
    .sort(([a], [b]) => Number(a) - Number(b)) : [];
  const taxableTotal = Number(totals.taxable ?? totals.subtotal ?? visibleItems.reduce((sum, item) => sum + lineCalc(item).taxable, 0)) || 0;
  const finalTotal = Number(totals.finalTotal ?? taxableTotal + taxRows.reduce((sum, row) => sum + row.amount, 0)) || 0;
  const roundOff = Number(totals.roundOff ?? Math.round(finalTotal) - finalTotal) || 0;
  const descriptionOptions = { includeVariant: !isPurchaseDocument && config.documentType !== 'invoice' };
  const fillerHeight = Math.max(14, 58 - visibleItems.reduce((sum, item) => sum + 5 + Math.max(0, itemDescriptionLines(item, descriptionOptions).length - 1) * 3.4, 0));
  const bankRows = bankRowsForInvoice(bizSettings, docExtra, config.documentType, customer);
  const printFormat = docExtra.invoicePrintFormat || bizSettings.invoicePrintFormat || 'normal';
  const showLogo = true;
  const showAmountWords = true;
  const showBankDetails = true;
  const showPaymentQr = true;
  const showNotes = true;
  const showTerms = true;
  const showSignature = true;
  const showGoBookBranding = true;
  const isThermal80 = printFormat === 'thermal80';
  const thermalTemplate = getInvoiceThermalTemplate(bizSettings) || docExtra.invoiceThermalTemplate || 'standard';
  const isBoxedThermalTemplate = thermalTemplate === 'boxed';
  const visibleBankRows = showBankDetails ? bankRows : [];
  const qrSrc = fieldValue(
    bizSettings.paymentQrUrl ? `${SERVER_ORIGIN}${bizSettings.paymentQrUrl}` : '',
    bizSettings.upiQrUrl ? `${SERVER_ORIGIN}${bizSettings.upiQrUrl}` : '',
    docExtra.paymentQrUrl,
    '/upi-payment-qr.jpg',
  );
  const stampSrc = fieldValue(
    bizSettings.stampUrl ? `${SERVER_ORIGIN}${bizSettings.stampUrl}` : '',
    bizSettings.companyStampUrl ? `${SERVER_ORIGIN}${bizSettings.companyStampUrl}` : '',
    bizSettings.signatureStampUrl ? `${SERVER_ORIGIN}${bizSettings.signatureStampUrl}` : '',
    docExtra.stampUrl,
  );
  const termLines = compactLines(terms || docExtra.terms || docExtra.invoiceTerms);
  const noteLines = compactLines(notes || docExtra.notes || docExtra.invoiceNotes || docMeta.notes || bizSettings.invoiceNotes);
  const pdfFilename = invoiceNumber
    ? `Invoice-${String(invoiceNumber).replace(/[\\/:*?"<>|]+/g, '-')}.pdf`
    : 'Invoice.pdf';
  const pdfItems = visibleItems.map((item, index) => {
    const line = lineCalc(item);
    const lines = itemDescriptionLines(item, descriptionOptions);
    const qty = line.qty || 1;
    return {
      key: item.id || item._id || `${item.description}-${index}`,
      title: lines[0] || '-',
      lines,
      variant: isPurchaseDocument ? purchaseVariantText(item) : '',
      hsn: item.hsn || item.hsnCode || item.sac || '',
      gst: showGst ? `${line.gstRate || 0}%` : '',
      qty: formatQty(line.qty),
      unit: String(item.unit || item.uqc || 'NOS').toUpperCase(),
      rate: line.rate,
      priceWithGst: showGst ? line.total / qty : line.rate,
      amount: line.taxable,
    };
  });
  const pdfTaxSummary = taxSummary.map(([rate, value]) => {
    const gst = Number(value.gst) || 0;
    const interstate = supplyType === 'interstate';
    return {
      rate: Number(rate),
      taxable: value.taxable,
      cgst: interstate ? 0 : gst / 2,
      sgst: interstate ? 0 : gst / 2,
      totalTax: gst,
    };
  });
  const pdfData = {
    printFormat,
    invoicePrintFormat: printFormat,
    invoiceThermalTemplate: thermalTemplate,
    invoiceDesignSettings: bizSettings.invoiceDesignSettings,
    isThermal80,
    previewTitle,
    businessName,
    businessDescription,
    businessAddress,
    bizPhone: fieldValue(bizSettings.phone),
    bizEmail: fieldValue(bizSettings.businessEmail, bizSettings.email),
    bizGstin: bizSettings.gstin || '',
    customerName: fieldValue(customer.name),
    customerAddress,
    customerGstin,
    customerPhone: fieldValue(customer.phone, customer.mobile),
    placeOfSupply: fieldValue(docMeta.placeOfSupply, customer.state),
    deliveryBy: fieldValue(docExtra.deliveryBy, docExtra.transporter),
    lrNo: fieldValue(docExtra.lrNo),
    initials: initialsForName(businessName),
    logoSrc,
    qrSrc,
    visibleItems: pdfItems,
    isPurchaseDocument,
    taxRows,
    taxSummary: pdfTaxSummary,
    visibleBankRows,
    taxableTotal,
    roundOff,
    finalTotal,
    oldBalance,
    newBalance,
    amountWords: numberToWords(finalTotal),
    termLines,
    noteLines,
    showLogo,
    showAmountWords,
    showBankDetails,
    showPaymentQr,
    showTerms,
    showNotes,
    showSignature,
    showGoBookBranding,
    leftMeta: [
      { label: isReturn ? 'Return No.' : 'Invoice No.', value: fieldValue(docMeta.number) },
      { label: 'P.O. No.', value: fieldValue(docMeta.poRef, docExtra.poNo) },
      { label: 'Challan No.', value: fieldValue(docExtra.challanNo) },
      { label: isReturn ? 'Settlement' : 'Bill Pay Status', value: isReturn ? `${isSupplierReturn ? 'Supplier' : 'Customer'} ledger` : fieldValue(docMeta.paymentStatus, docExtra.paymentStatus, dueAmount > 0 ? `Due ${formatAmount(dueAmount)}` : 'Paid') },
      { label: 'Bill Credit', value: fieldValue(docMeta.paymentTerms ? `${docMeta.paymentTerms} Days` : '', docExtra.creditDays ? `${docExtra.creditDays} Days` : '') },
      { label: 'Location', value: fieldValue(docExtra.location) },
    ],
    rightMeta: [
      { label: isReturn ? 'Return Date' : 'Invoice Date', value: [formatDate(docMeta.date), fieldValue(docExtra.invoiceTime, docExtra.time, docMeta.time)].filter(Boolean).join(' ') },
      { label: 'P.O. Date', value: formatDate(docMeta.poDate || docExtra.poDate) },
      { label: 'Pay. Mode', value: fieldValue(paymentMethod) },
      { label: 'Salesman', value: fieldValue(docExtra.salesman) },
      { label: 'Due Date', value: formatDate(docMeta.dueDate) },
      { label: 'Operator', value: fieldValue(docExtra.operator) },
    ],
  };

  const receiptDesign = getInvoiceDesignSettings(bizSettings, printFormat);
  const receiptElements = receiptDesign.elements;
  const { width: receiptDesignWidth, height: receiptDesignHeight } = getInvoiceDesignDimensions(printFormat);
  const designedPageIsThermal = printFormat === 'thermal80';
  const receiptSectionVisible = (key) => {
    if (designedPageIsThermal && ['bank', 'paymentQr', 'terms'].includes(key)) return false;
    const element = receiptElements[key];
    if (!element?.visible) return false;
    if (key === 'bank') return visibleBankRows.length > 0;
    if (key === 'paymentQr') return Boolean(qrSrc);
    if (key === 'terms') return termLines.length > 0;
    if (key === 'notes') return noteLines.length > 0;
    return true;
  };
  const receiptBoxStyle = (key) => {
    const element = receiptElements[key];
    return {
      position: 'absolute',
      left: `${element.x / receiptDesignWidth * 100}%`,
      top: `${element.y / receiptDesignHeight * 100}%`,
      width: `${element.w / receiptDesignWidth * 100}%`,
      height: `${element.h / receiptDesignHeight * 100}%`,
      zIndex: element.z || 1,
      overflow: 'hidden',
      boxSizing: 'border-box',
    };
  };
  const receiptBlockStyle = {
    color: '#111',
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: designedPageIsThermal ? '7.5pt' : '10pt',
    lineHeight: 1.18,
    overflowWrap: 'anywhere',
  };
  const renderDesignedReceiptSection = (key) => {
    if (!receiptSectionVisible(key)) return null;
    const common = { key, style: { ...receiptBoxStyle(key), ...receiptBlockStyle } };
    if (key === 'header') {
      return (
        <div {...common} style={{ ...common.style, textAlign: 'center', display: 'grid', justifyItems: 'center', alignContent: 'start', gap: '0.7mm' }}>
          {logoSrc && <img src={logoSrc} alt="" style={{ width: designedPageIsThermal ? '14mm' : '24mm', height: designedPageIsThermal ? '14mm' : '24mm', objectFit: 'contain' }} />}
          <strong style={{ display: 'block', fontSize: designedPageIsThermal ? '10pt' : '18pt', lineHeight: 1.05, textTransform: 'uppercase' }}>{businessName}</strong>
          {businessDescription && <span>{businessDescription}</span>}
          {businessAddress.slice(0, 3).map((line) => <span key={line}>{line}</span>)}
          {bizSettings.phone && <span>Phone: {bizSettings.phone}</span>}
          {bizSettings.gstin && <span>GSTIN: {bizSettings.gstin}</span>}
        </div>
      );
    }
    if (key === 'title') {
      return <div {...common} style={{ ...common.style, display: 'grid', placeItems: 'center', borderTop: '0.25mm dashed #222', borderBottom: '0.25mm dashed #222', fontWeight: 800, fontSize: designedPageIsThermal ? '9pt' : '16pt', textAlign: 'center', textTransform: 'uppercase' }}>{previewTitle}</div>;
    }
    if (key === 'meta') {
      return (
        <div {...common} style={{ ...common.style, display: 'grid', gap: '1mm', borderBottom: '0.25mm dashed #222' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '4mm' }}><span>No</span><b>{fieldValue(docMeta.number, invoiceNumber)}</b></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '4mm' }}><span>Date</span><b>{[formatDate(docMeta.date), formatTime(docMeta.date || docMeta.time)].filter(Boolean).join(' ')}</b></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '4mm' }}><span>Pay</span><b>{fieldValue(paymentMethod, docMeta.paymentStatus)}</b></div>
        </div>
      );
    }
    if (key === 'party') {
      return (
        <div {...common} style={{ ...common.style, display: 'grid', gap: '0.8mm', borderBottom: '0.25mm dashed #222' }}>
          <strong style={{ textTransform: 'uppercase' }}>{isSupplierReturn ? 'Supplier' : 'Customer'}</strong>
          <span>{fieldValue(customer.name, 'Walk-in Customer')}</span>
          {customer.phone || customer.mobile ? <span>{fieldValue(customer.phone, customer.mobile)}</span> : null}
        </div>
      );
    }
    if (key === 'items') {
      return (
        <div {...common}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: designedPageIsThermal ? '7.1pt' : '9.5pt' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', borderBottom: '0.25mm solid #222' }}>Item</th>
                <th style={{ width: '8mm', textAlign: 'center', borderBottom: '0.25mm solid #222' }}>Qty</th>
                <th style={{ width: '14mm', textAlign: 'right', borderBottom: '0.25mm solid #222' }}>Rate</th>
                <th style={{ width: '15mm', textAlign: 'right', borderBottom: '0.25mm solid #222' }}>Amt</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((item, index) => {
                const line = lineCalc(item);
                return (
                  <tr key={item.id || item._id || `${item.description}-${index}`}>
                    <td style={{ paddingTop: '1mm', verticalAlign: 'top' }}><strong>{itemName(item, descriptionOptions)}</strong></td>
                    <td style={{ paddingTop: '1mm', textAlign: 'center', verticalAlign: 'top' }}>{formatQty(line.qty)}</td>
                    <td style={{ paddingTop: '1mm', textAlign: 'right', verticalAlign: 'top' }}>{formatAmount(line.rate)}</td>
                    <td style={{ paddingTop: '1mm', textAlign: 'right', verticalAlign: 'top' }}>{formatAmount(line.taxable)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }
    if (key === 'totals') {
      return (
        <div {...common} style={{ ...common.style, display: 'grid', gap: '1mm', borderTop: '0.25mm dashed #222', borderBottom: '0.25mm dashed #222' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal</span><b>{formatAmount(finalTotal - roundOff)}</b></div>
          {roundOff ? <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Round Off</span><b>{formatAmount(roundOff)}</b></div> : null}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '0.25mm solid #222', paddingTop: '1mm', fontSize: designedPageIsThermal ? '9pt' : '13pt', fontWeight: 800 }}><span>Total</span><b>{formatAmount(finalTotal)}</b></div>
        </div>
      );
    }
    if (key === 'amountWords') {
      return <div {...common}><span>Amount in words</span><br /><strong>{numberToWords(finalTotal)}</strong></div>;
    }
    if (key === 'bank') {
      return <div {...common}><strong>Bank Details</strong>{visibleBankRows.map(([label, value]) => <div key={label}>{label}: {value}</div>)}</div>;
    }
    if (key === 'paymentQr') {
      return <div {...common} style={{ ...common.style, display: 'grid', justifyItems: 'center', textAlign: 'center' }}><img src={qrSrc} alt="UPI Payment QR Code" crossOrigin="anonymous" style={{ width: designedPageIsThermal ? '24mm' : '34mm', height: designedPageIsThermal ? '24mm' : '34mm', objectFit: 'contain' }} /><span>Scan to Pay</span></div>;
    }
    if (key === 'terms') {
      return <div {...common}><strong>Terms</strong>{termLines.map((line) => <div key={line}>{line}</div>)}</div>;
    }
    if (key === 'notes') {
      return <div {...common}><strong>Notes</strong>{noteLines.map((line) => <div key={line}>{line}</div>)}</div>;
    }
    if (key === 'signature') {
      return <div {...common} style={{ ...common.style, display: 'grid', alignContent: 'end', justifyItems: 'end', textAlign: 'right' }}>{stampSrc && <img src={stampSrc} alt="" style={{ width: designedPageIsThermal ? '18mm' : '28mm', height: designedPageIsThermal ? '18mm' : '28mm', objectFit: 'contain' }} />}<span>Authorized Signatory</span></div>;
    }
    if (key === 'footer') {
      return <div {...common} style={{ ...common.style, textAlign: 'center', fontSize: '7pt' }}>This is a Computer Generated {previewTitle}</div>;
    }
    return null;
  };

  const standardReceiptContent = (
    <div className={`pdf-render erp-invoice-preview erp-receipt-preview${pdfMode ? ' erp-pdf-mode' : ''}`}>
      <section className="erp-receipt-page">
        <div className="erp-receipt-header">
          {showLogo && logoSrc && <img src={logoSrc} alt="" />}
          <h1>{businessName}</h1>
          {businessDescription && <p>{businessDescription}</p>}
          {businessAddress.map((line) => <p key={line}>{line}</p>)}
          {bizSettings.phone && <p>Phone: {bizSettings.phone}</p>}
          {bizSettings.gstin && (
            <p>{bizSettings.gstin ? `GSTIN: ${bizSettings.gstin}` : ''}</p>
          )}
        </div>

        <div className="erp-receipt-title">{previewTitle}</div>

        <div className="erp-receipt-meta">
          <div><span>No</span><b>{fieldValue(docMeta.number, invoiceNumber)}</b></div>
          <div><span>Date</span><b>{[formatDate(docMeta.date), formatTime(docMeta.date || docMeta.time)].filter(Boolean).join(' ')}</b></div>
          <div><span>Pay</span><b>{fieldValue(paymentMethod, docMeta.paymentStatus)}</b></div>
        </div>

        <div className="erp-receipt-party">
          <strong>{isSupplierReturn ? 'Supplier' : 'Customer'}</strong>
          <p>{fieldValue(customer.name, 'Walk-in Customer')}</p>
        </div>

        {returnReference}
        <table className="erp-receipt-items">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Amt</th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.map((item, index) => {
              const line = lineCalc(item);
              return (
                <tr key={item.id || item._id || `${item.description}-${index}`}>
                  <td>
                    <strong>{itemName(item, descriptionOptions)}</strong>
                  </td>
                  <td>{formatQty(line.qty)}</td>
                  <td>{formatAmount(line.rate)}</td>
                  <td>{formatAmount(line.taxable)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="erp-receipt-totals">
          <div><span>Subtotal</span><b>{formatAmount(finalTotal - roundOff)}</b></div>
          {roundOff ? <div><span>Round Off</span><b>{formatAmount(roundOff)}</b></div> : null}
          <div className="erp-receipt-grand"><span>Total</span><b>{formatAmount(finalTotal)}</b></div>
        </div>

        {showAmountWords && (
          <div className="erp-receipt-words">
            <span>Amount in words</span>
            <strong>{numberToWords(finalTotal)}</strong>
          </div>
        )}

        {showNotes && noteLines.length > 0 && (
          <div className="erp-receipt-note erp-receipt-after-total">
            <strong>Notes</strong>
            {noteLines.map((line) => <p key={line}>{line}</p>)}
          </div>
        )}

        {showSignature && (
          <div className="erp-receipt-sign">
            {stampSrc && <img src={stampSrc} alt="" />}
            <span>Authorized Signatory</span>
          </div>
        )}

        {showGoBookBranding && <div className="erp-receipt-footer">This is a Computer Generated {previewTitle}</div>}
      </section>
    </div>
  );

  const boxedReceiptContent = (
    <div className={`pdf-render erp-invoice-preview erp-receipt-preview${pdfMode ? ' erp-pdf-mode' : ''}`}>
      <section className="erp-receipt-page">
        <div style={{ border: '0.35mm solid #777', padding: '4mm', minHeight: '132mm', height: 'auto', overflow: 'visible', boxSizing: 'border-box' }}>
          <div style={{ textAlign: 'center', marginBottom: '4mm' }}>
            <strong style={{ display: 'block', fontSize: '10pt', lineHeight: 1.15 }}>{businessName || 'GoBook'}</strong>
            {businessAddress.slice(0, 2).map((line) => <div key={line} style={{ fontSize: '7.5pt', lineHeight: 1.2 }}>{line}</div>)}
            {bizSettings.phone && <div style={{ fontSize: '7.5pt', lineHeight: 1.2 }}>Phone: {bizSettings.phone}</div>}
          </div>

          <div style={{ textAlign: 'center', fontSize: '11pt', fontWeight: 700, letterSpacing: '0.2px', marginBottom: '3mm' }}>{previewTitle}</div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '3mm', fontSize: '8pt', marginBottom: '3mm' }}>
            <span>Invoice#: {fieldValue(docMeta.number, invoiceNumber)}</span>
            <span>Date: {formatDate(docMeta.date)}</span>
          </div>

          <div style={{ borderTop: '0.25mm dashed #333', borderBottom: '0.25mm dashed #333', padding: '1.5mm 0', marginBottom: '2mm' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '7.5pt' }}>
              <thead>
                <tr>
                  <th style={{ width: '6mm', textAlign: 'left', fontWeight: 400 }}>#</th>
                  <th style={{ textAlign: 'left', fontWeight: 400 }}>Item</th>
                  <th style={{ width: '13mm', textAlign: 'right', fontWeight: 400 }}>Qty</th>
                  <th style={{ width: '16mm', textAlign: 'right', fontWeight: 400 }}>Rate</th>
                  <th style={{ width: '17mm', textAlign: 'right', fontWeight: 400 }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((item, index) => {
                  const line = lineCalc(item);
                  return (
                    <tr key={item.id || item._id || `${item.description}-${index}`}>
                      <td style={{ paddingTop: '1.2mm', verticalAlign: 'top' }}>{index + 1}</td>
                      <td style={{ paddingTop: '1.2mm', verticalAlign: 'top' }}>{itemName(item, descriptionOptions)}</td>
                      <td style={{ paddingTop: '1.2mm', textAlign: 'right', verticalAlign: 'top' }}>{formatQty(line.qty)}</td>
                      <td style={{ paddingTop: '1.2mm', textAlign: 'right', verticalAlign: 'top' }}>{formatAmount(line.rate)}</td>
                      <td style={{ paddingTop: '1.2mm', textAlign: 'right', verticalAlign: 'top' }}>{formatAmount(line.taxable)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ borderBottom: '0.25mm solid #333', paddingBottom: '2mm', marginBottom: '2mm', fontSize: '8pt' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Sub Total</span><span>{formatAmount(taxableTotal)}</span></div>
            {taxRows.map((row) => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between' }}><span>{row.label}</span><span>{formatAmount(row.amount)}</span></div>
            ))}
            {roundOff ? <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Round Off</span><span>{formatAmount(roundOff)}</span></div> : null}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '0.35mm solid #333', padding: '1mm 0 2.5mm', fontWeight: 800 }}>
            <span style={{ fontSize: '14pt' }}>TOTAL</span>
            <span style={{ fontSize: '14pt' }}>{formatAmount(finalTotal)}</span>
          </div>

          <div style={{ textAlign: 'center', marginTop: '7mm', fontSize: '12pt' }}>Thank you!</div>
          {showGoBookBranding && <div className="erp-receipt-footer">This is a Computer Generated {previewTitle}</div>}
        </div>
      </section>
    </div>
  );

  const receiptContent = isBoxedThermalTemplate ? boxedReceiptContent : standardReceiptContent;

  const normalContent = (
    <div className={`pdf-render erp-invoice-preview${pdfMode ? ' erp-pdf-mode' : ''}`}>
      <section className="invoice-page erp-invoice-page erp-custom-normal-page" style={{ position: 'relative', padding: 0 }}>
        {INVOICE_DESIGN_ELEMENTS
          .slice()
          .sort((a, b) => (receiptElements[a.key]?.z || 0) - (receiptElements[b.key]?.z || 0))
          .map((item) => renderDesignedReceiptSection(item.key))}
        <div style={{ display: 'none' }}>
        <div className="erp-top-section">
          <div className="erp-title-row">
            <div className="erp-title-spacer" />
            <h1>{previewTitle}</h1>
            <div className="erp-copy-text">Original for Recipient</div>
          </div>

          <div className="erp-main-grid">
            <div className="erp-left-column">
              <div className={`erp-company-block${showLogo ? '' : ' erp-no-logo'}`}>
                {showLogo && (
                  <div className="erp-logo-box">
                    {logoSrc ? (
                      <img src={logoSrc} alt="" />
                    ) : (
                      <div className="erp-logo-fallback">
                        <strong>{initialsForName(businessName)}</strong>
                      </div>
                    )}
                  </div>
                )}
                <div className="erp-company-copy">
                  <h2>{businessName}</h2>
                  <p className="erp-company-description">{businessDescription}</p>
                  {businessAddress.map((line) => <p key={line}>{line}</p>)}
                  <p>{fieldValue(bizSettings.phone)}</p>
                  <p>{fieldValue(bizSettings.businessEmail, bizSettings.email)}</p>
                  <h3>{bizSettings.gstin ? `GSTIN: ${bizSettings.gstin}` : ''}</h3>
                </div>
              </div>

              <div className="erp-customer-block">
                <div className="erp-section-label">Customer</div>
                <h2>{fieldValue(customer.name)}</h2>
                {customerAddress.map((line) => <p key={line}>{line}</p>)}
                <div className="erp-customer-info">
                  <InfoRow label="GSTIN" value={customerGstin} />
                  <InfoRow label="POS" value={fieldValue(docMeta.placeOfSupply, customer.state ? `${customer.state}${docExtra.stateCode ? ` [State Code : ${docExtra.stateCode}]` : ''}` : '')} />
                  <InfoRow label="Mobile" value={fieldValue(customer.phone, customer.mobile)} strong />
                </div>
              </div>
            </div>

            <div className="erp-info-column erp-center-column">
              <div className="erp-info-top">
                <InfoRow label={isReturn ? 'Return No.' : 'Invoice No.'} value={fieldValue(docMeta.number)} strong />
                <InfoRow label="P.O. No." value={fieldValue(docMeta.poRef, docExtra.poNo)} />
                <InfoRow label="Challan No." value={fieldValue(docExtra.challanNo)} />
                <InfoRow label={isReturn ? 'Settlement' : 'Bill Pay Status'} value={isReturn ? `${isSupplierReturn ? 'Supplier' : 'Customer'} ledger` : fieldValue(docMeta.paymentStatus, docExtra.paymentStatus, dueAmount > 0 ? `Due ${formatAmount(dueAmount)}` : 'Paid')} strong />
                <InfoRow label="Bill Credit" value={fieldValue(docMeta.paymentTerms ? `${docMeta.paymentTerms} Days` : '', docExtra.creditDays ? `${docExtra.creditDays} Days` : '')} />
                <InfoRow label="Location" value={fieldValue(docExtra.location)} />
              </div>

              <div className="erp-info-lower">
                <InfoRow label="Delivery By" value={fieldValue(docExtra.deliveryBy, docExtra.transporter)} />
                <div className="erp-last-transaction">Last Transaction:</div>
                <div className="erp-closing-balance">Closing Balance : <strong>(Debit) {formatAmount(newBalance)}</strong></div>
                <BalanceRow label="Old Balance" value={`(Debit) ${formatAmount(oldBalance)}`} />
                <BalanceRow label="Adding this Invoice Amount" marker="" value={invoiceAmount ? `+${formatAmount(invoiceAmount)}` : ''} underline />
                <BalanceRow label="New Balance after this Invoice" value={`(Debit) ${formatAmount(newBalance)}`} strong />
              </div>
            </div>

            <div className="erp-info-column erp-right-column">
              <div className="erp-info-top">
                <InfoRow label={isReturn ? 'Return Date' : 'Invoice Date'} value={[formatDate(docMeta.date), fieldValue(docExtra.invoiceTime, docExtra.time, docMeta.time)].filter(Boolean).join(' ')} strong align="right" />
                <InfoRow label="P.O. Date" value={formatDate(docMeta.poDate || docExtra.poDate)} align="right" />
                <InfoRow label="Pay. Mode" value={fieldValue(paymentMethod)} align="right" />
                <InfoRow label="Salesman" value={fieldValue(docExtra.salesman)} align="right" />
                <InfoRow label="Due Date" value={formatDate(docMeta.dueDate)} align="right" />
                <InfoRow label="Operator" value={fieldValue(docExtra.operator)} align="right" />
                <div className="erp-operator-phone">{fieldValue(docExtra.operatorPhone, docExtra.operatorMobile)}</div>
              </div>

              <div className="erp-info-lower">
                <InfoRow label="LR No." value={fieldValue(docExtra.lrNo)} />
              </div>
            </div>
          </div>
        </div>

        {returnReference}
        <div className="erp-body-section">
          <div className="erp-items-wrap">
            <table className={`erp-items-table${isPurchaseDocument ? ' erp-items-table-purchase' : ''}`}>
              <colgroup>
                <col className="erp-col-sn" />
                <col className="erp-col-desc" />
                {isPurchaseDocument && <col className="erp-col-variant" />}
                <col className="erp-col-hsn" />
                <col className="erp-col-gst" />
                <col className="erp-col-qty" />
                {!isPurchaseDocument && <col className="erp-col-uqc" />}
                <col className="erp-col-price" />
                <col className="erp-col-price-gst" />
                <col className="erp-col-amount" />
              </colgroup>
              <thead>
                <tr>
                  <th>S/N</th>
                  <th>Description Of Goods / Service</th>
                  {isPurchaseDocument && <th>Brand / Size / Material</th>}
                  <th>HSN/SAC</th>
                  <th>GST</th>
                  <th>Billed<br />Quantity</th>
                  {!isPurchaseDocument && <th>UQC</th>}
                  <th>Price</th>
                  <th>Price With<br />GST</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((item, index) => {
                  const line = lineCalc(item);
                  const lines = itemDescriptionLines(item, descriptionOptions);
                  const unit = String(item.unit || item.uqc || 'NOS').toUpperCase();
                  const variant = purchaseVariantText(item);
                  const qty = line.qty || 1;
                  const priceWithGst = showGst ? line.total / qty : line.rate;
                  return (
                    <tr key={item.id || item._id || `${item.description}-${index}`} className="erp-item-row">
                      <td className="erp-cell-center">{index + 1})</td>
                      <td className="erp-description-cell">
                        <div className="erp-item-title">{lines[0] || '-'}</div>
                        {lines.slice(1).map((lineText, lineIndex) => (
                          <div className="erp-item-subline" key={`${lineText}-${lineIndex}`}>{lineText}</div>
                        ))}
                      </td>
                      {isPurchaseDocument && <td className="erp-cell-center erp-nowrap">{variant || '-'}</td>}
                      <td className="erp-cell-center erp-nowrap">{item.hsn || item.hsnCode || item.sac || ''}</td>
                      <td className="erp-cell-center erp-nowrap">{showGst ? `${line.gstRate || 0}%` : ''}</td>
                      <td className="erp-cell-center erp-nowrap">{formatQty(line.qty)}</td>
                      {!isPurchaseDocument && <td className="erp-cell-center erp-nowrap">{unit}</td>}
                      <td className="erp-money-cell">{formatAmount(line.rate)}</td>
                      <td className="erp-money-cell">{formatAmount(priceWithGst)}</td>
                      <td className="erp-money-cell erp-amount-cell">{formatAmount(line.taxable)}</td>
                    </tr>
                  );
                })}
                <tr className="erp-filler-row">
                  <td style={{ height: `${fillerHeight}mm` }} />
                  <td className="erp-filler-description" />
                  <td />
                  <td />
                  <td />
                  {isPurchaseDocument && <td />}
                  {!isPurchaseDocument && <td />}
                  <td />
                  <td />
                  <td className="erp-money-cell erp-taxable-total">{formatAmount(taxableTotal)}</td>
                </tr>
                {taxRows.map((row) => (
                  <tr className="erp-tax-row" key={row.label}>
                    <td />
                    <td className="erp-tax-label">{row.label}</td>
                    <td />
                    <td />
                    <td />
                    {isPurchaseDocument && <td />}
                    {!isPurchaseDocument && <td />}
                    <td />
                    <td />
                    <td className="erp-money-cell erp-amount-cell">{formatAmount(row.amount)}</td>
                  </tr>
                ))}
              </tbody>

            </table>
          </div>

          <div className="erp-summary-totals">
          <div className="erp-summary-left">
          {showGst && taxSummary.length > 0 && (
            <section className="erp-tax-summary">
              <h3>TAX SUMMARY</h3>
              <table>
                <thead><tr><th>GST</th><th>Taxable</th><th>CGST</th><th>SGST</th><th>Total Tax</th></tr></thead>
                <tbody>
                  {taxSummary.map(([rate, value]) => {
                    const gst = Number(value.gst) || 0;
                    const interstate = supplyType === 'interstate';
                    return <tr key={rate}>
                      <td>{Number(rate)}%</td><td>{formatAmount(value.taxable)}</td>
                      <td>{formatAmount(interstate ? 0 : gst / 2)}</td>
                      <td>{formatAmount(interstate ? 0 : gst / 2)}</td>
                      <td>{formatAmount(gst)}</td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </section>
          )}

          </div>
          <div className="erp-summary-right">
            <div><span>Roundup</span><span>{formatAmount(roundOff)}</span></div>
            <div className="erp-summary-grand"><span>Grand Total</span><span>{formatAmount(finalTotal)}</span></div>
          </div>
          </div>

          {showAmountWords && (
            <div className="erp-amount-words">
              <span>Amount Chargeable (In Words)</span>
              <strong>{numberToWords(finalTotal)}</strong>
            </div>
          )}

          <div className="erp-bottom-section">
            <div className="erp-bottom-main">
              {showBankDetails && (
                <div className="erp-bank-block">
                  <h3>Bank Details:</h3>
                  <div className="erp-bank-rows">
                    {visibleBankRows.map(([label, value]) => (
                      <div className="erp-bank-row" key={label}>
                        <span>{label}</span>
                        <b>:</b>
                        <strong>{value}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {showPaymentQr && qrSrc && (
                <div className="erp-qr-block">
                  <>
                    <h3>UPI Payment QR Code</h3>
                    <img src={qrSrc} alt="UPI Payment QR Code" crossOrigin="anonymous" />
                  </>
                </div>
              )}

              {showTerms && termLines.length > 0 && (
                <div className="erp-terms-block">
                  <h3>Terms & Condition:</h3>
                  {termLines.map((line) => <p key={line}>{line}</p>)}
                </div>
              )}

              {showNotes && noteLines.length > 0 && (
                <div className="erp-notes-block">
                  <h3>Notes:</h3>
                  {noteLines.map((line) => <p key={line}>{line}</p>)}
                </div>
              )}

              {showSignature && (
                <div className="erp-signature-block">
                  {stampSrc && <img src={stampSrc} alt="" className="erp-stamp-img" />}
                </div>
              )}
            </div>

            <div className="erp-footer-bar">
              <div>{showSignature ? 'Buyer Seal And Signature' : ''}</div>
              <div>{showGoBookBranding ? 'This is a Computer Generated TAX INVOICE' : ''}</div>
              <div>{showSignature ? 'Authorized Signatory' : ''}</div>
            </div>
          </div>
        </div>
        </div>
      </section>
    </div>
  );

  const revision = JSON.stringify({ config, customer, docMeta, docExtra, items, charges, totals, terms, notes, supplyType, bizSettings, paymentMethod });
  const content = (
    <InvoicePdfSurface revision={revision} filename={pdfFilename}
      download={downloadAsPdf} print={printInvoice || autoPrint}
      onDownloaded={onPdfDownloaded} onPrinted={onPdfPrinted} onReady={onPdfReady}
      pdfData={pdfData}>
      {isThermal80 ? receiptContent : normalContent}
    </InvoicePdfSurface>
  );

  if (embedded) return content;

  return (
    <div className="fixed inset-0 z-[100] bg-[#0f172a]/70 overflow-auto p-6 print:static print:bg-white print:p-0" role="dialog" aria-modal="true" ref={modalRef}>
      <div className="mx-auto mb-3 flex max-w-[210mm] items-center justify-end gap-2 print:hidden">
        <button type="button" className={btnOutline} onClick={onClose}>
          <X size={14} /> Close
        </button>
      </div>
      {content}
    </div>
  );
}
