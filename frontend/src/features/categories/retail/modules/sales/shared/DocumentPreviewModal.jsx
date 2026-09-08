import { useEffect, useRef, useState } from 'react';
import {
  X,
} from 'lucide-react';

import { formatCurrency } from '../../../../../../utils/formatCurrency.js';
import { numberToWords } from '../../../../../../utils/numberToWords.js';
import { SERVER_ORIGIN } from '../../../../../../services/api.js';
import { useFocusTrap } from '../../../../../../hooks/useFocusTrap.js';

const btnOutline = 'inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium text-gray-700 bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit]';
const PAYMENT_LABELS = {
  cash: 'Cash',
  upi: 'UPI',
  card: 'Card',
  bank: 'Bank',
  credit: 'Credit',
};

// Fixed-height layout budget (mm) shared by the pagination math below and the
// CSS in index.css. Keep both in sync — this is what lets us pre-compute page
// breaks instead of measuring the DOM or slicing a rasterized screenshot.
const LAYOUT_MM = {
  contentHeight: 281, // 297 portrait page - 8 top margin - 8 bottom margin
  header: 34,
  divider: 2,
  addresses: 28,
  extraDetails: 8,
  tableHeader: 7,
  continuationHeader: 11,
  // Measured (not estimated) from the actual .invoice-summary + .invoice-bottom-grid
  // markup/CSS for a fully paid invoice (Payment Mode/Amount Received/Balance Due rows
  // showing) with 3 GST-rate rows in the tax table — the tallest realistic combination.
  // The previous value of 80 under-budgeted this by ~19mm, which is what let a fully
  // paid invoice's Bank Details card render past the page bottom and get cropped.
  footer: 82,
};

function fmtDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Item column is ~20% of a 190mm table; at 9px font that's roughly 2 lines
// worth of text before a row outgrows its fixed 8mm height, so the cap has
// to match the column width, not just look generous in isolation.
const ITEM_NAME_MAX_CHARS = 55;
const EXTRA_VALUE_MAX_CHARS = 60;
const NOTES_MAX_CHARS = 220;
const MODERN_ROW_MIN_HEIGHT_MM = 7;

// Truncate in JS rather than clamp with CSS overflow/max-height: html2canvas
// (used by the Download PDF button) mis-renders overflow:hidden combined
// with a constrained height inside a table cell, clipping text from the
// wrong edge. Plain, already-short text needs no overflow handling at all
// and renders identically under native print and html2canvas.
function truncateText(text, max) {
  const value = text == null ? '' : String(text);
  if (!value || value.length <= max) return value;
  text = value;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function lineItemExtraDescription(item = {}) {
  const base = item.itemDescription
    ?? item.lineDescription
    ?? item.details
    ?? item.note
    ?? item.remark
    ?? '';
  const electronicsLines = [
    item.modelNumber ? `Model: ${item.modelNumber}` : '',
  ];
  const seen = new Set();
  return [base, ...electronicsLines]
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

function lineItemDisplayName(item = {}) {
  const description = String(item.description || '').trim();
  const modelName = String(item.size || item.modelName || '').trim();
  if (!modelName) return description;
  if (!description) return modelName;
  return `${description} - ${modelName}`;
}

function trimOuterBlankLines(lines) {
  const next = [...lines];
  while (next.length > 0 && !next[0].trim()) next.shift();
  while (next.length > 0 && !next[next.length - 1].trim()) next.pop();
  return next;
}

function lineItemDescriptionBullets(item = {}) {
  return trimOuterBlankLines(String(lineItemExtraDescription(item) || '')
    .split(/\r?\n/));
}

function lineItemClassicDescriptionLines(item = {}) {
  return trimOuterBlankLines(String(lineItemExtraDescription(item) || '')
    .replace(/([^\r\n])\s+(?=\d+\.\s*\S)/g, '$1\n')
    .split(/\r?\n/));
}

function lineCalc(item) {
  const gross = (Number(item.qty) || 0) * (Number(item.rate) || 0);
  const discountValue = Number(item.discount) || 0;
  const discountType = item.discountType === 'amount' ? 'amount' : 'percent';
  const discountAmt = Math.min(gross, discountType === 'amount' ? discountValue : gross * (discountValue / 100));
  const taxable = gross - discountAmt;
  const gstAmt = taxable * ((Number(item.gstRate) || 0) / 100);
  return { gross, discountAmt, taxable, gstAmt, total: taxable + gstAmt };
}

function formatInvoiceTableCurrency(value) {
  return '₹ ' + Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatClassicAmount(value) {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatClassicDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB').replace(/\//g, '-');
}

function paymentMethodLabel(paymentMethod = '', paymentSplits = []) {
  const labels = (Array.isArray(paymentSplits) ? paymentSplits : [])
    .filter((split) => Number(split.amount) > 0)
    .map((split) => split.method || split.label || PAYMENT_LABELS[split.methodId || split.id] || split.methodId || split.id)
    .filter(Boolean)
    .map((label) => String(label).trim())
    .filter(Boolean);
  const uniqueLabels = [...new Set(labels)];
  return uniqueLabels.length > 0 ? uniqueLabels.join(' + ') : paymentMethod;
}

function classicTermsLines(terms, notes) {
  const fallback = 'Goods once sold will not be taken back.\nRate difference payable on overdue bill.\nSubject to Trichy Jurisdiction.';
  const text = String(terms || notes || fallback);
  return text
    .split(/\r?\n|(?=\s*-\s*[A-Za-z0-9])/)
    .map((line) => line.replace(/^\s*[-*\u2022]\s*/, '').trim())
    .filter(Boolean)
    .map((line) => truncateText(line, 135));
}

function classicCompactLines(text, max = 130) {
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => truncateText(line, max));
}

function wrappedLineCount(text, charsPerLine) {
  const value = String(text || '').trim();
  if (!value) return 0;
  return value
    .split(/\r?\n/)
    .reduce((sum, line) => sum + Math.max(1, Math.ceil(line.trim().length / charsPerLine)), 0);
}

function estimateModernRowHeight(row) {
  if (row.kind === 'charge') return MODERN_ROW_MIN_HEIGHT_MM;
  const item = row.data || {};
  const titleLines = wrappedLineCount(lineItemDisplayName(item), 24);
  const descriptionLines = lineItemDescriptionBullets(item)
    .reduce((sum, line) => sum + (line ? Math.max(1, Math.ceil(line.length / 20)) : 1), 0);
  return Math.max(MODERN_ROW_MIN_HEIGHT_MM, 2.5 + Math.max(titleLines, descriptionLines, 1) * 3.4);
}

function partyGstinFallback(data = {}, extra = {}) {
  return data?.gstin
    || data?.gstNumber
    || data?.gstNo
    || data?.gst_no
    || data?.vendorGstin
    || data?.vendorGstNumber
    || data?.vendorGstNo
    || data?.vendorGSTIN
    || extra?.vendorGstin
    || extra?.vendorGstNumber
    || extra?.vendorGstNo
    || extra?.vendorGSTIN
    || '';
}

function bankValue(source = {}, extra = {}, key, aliases = []) {
  return [key, ...aliases].reduce((found, field) => (
    found || source?.[field] || extra?.[field] || extra?.[`vendor${field.charAt(0).toUpperCase()}${field.slice(1)}`]
  ), '');
}

function bankRowsForDocument({ config = {}, customer = {}, docExtra = {}, bizSettings = {}, uppercaseLabels = false }) {
  const source = config.documentType === 'purchase-entry' ? customer : bizSettings;
  const extra = config.documentType === 'purchase-entry' ? docExtra : {};
  const rows = [
    [uppercaseLabels ? 'BANK NAME' : 'Bank', bankValue(source, extra, 'bankName', ['vendorBankName'])],
    [uppercaseLabels ? 'A/C NAME' : 'A/C Name', bankValue(source, extra, 'accountHolderName', ['accountName', 'vendorAccountHolderName', 'vendorAccountName'])],
    ['A/C No.', bankValue(source, extra, 'accountNumber', ['accountNo', 'vendorAccountNumber', 'vendorAccountNo'])],
    [uppercaseLabels ? 'IFSC CODE' : 'IFSC', bankValue(source, extra, 'ifscCode', ['ifsc', 'vendorIfscCode', 'vendorIfsc'])],
    ...(uppercaseLabels ? [] : [['Branch', bankValue(source, extra, 'bankBranch', ['branch', 'vendorBankBranch'])]]),
  ].filter(([, value]) => value);
  const emptyText = config.documentType === 'purchase-entry'
    ? 'Add vendor bank details in Vendor details'
    : 'Add bank details in Business Settings';
  return { rows, emptyText };
}

function paginateByHeight(rows, getCapacity, estimateRowHeight) {
  const pages = [];
  let start = 0;
  let pageIndex = 0;

  while (start < rows.length || pages.length === 0) {
    const remainingRows = rows.length - start;
    const heights = rows.slice(start).map(estimateRowHeight);
    const remainingHeight = heights.reduce((sum, height) => sum + height, 0);
    const isLastCandidate = remainingRows === 0 || remainingHeight <= getCapacity(pageIndex, true);
    const capacity = getCapacity(pageIndex, isLastCandidate);
    let used = 0;
    let count = 0;

    while (count < remainingRows) {
      const nextHeight = heights[count];
      if (count > 0 && used + nextHeight > capacity) break;
      used += nextHeight;
      count += 1;
      if (used >= capacity) break;
    }

    if (remainingRows > 0 && count === 0) count = 1;
    const isLast = start + count >= rows.length;
    pages.push({
      isFirst: pageIndex === 0,
      isLast,
      start,
      count,
      fillerHeight: Math.max(0, capacity - used),
      pageNumber: pageIndex + 1,
    });
    start += count;
    pageIndex += 1;
    if (pageIndex > 200) break;
  }

  return pages;
}

function BlankTableRow({ colSpan, height, singleCell = false }) {
  if (!height || height < 3) return null;
  return (
    <tr className="invoice-blank-fill-row" style={{ height: `${height}mm` }}>
      {singleCell ? (
        <td colSpan={colSpan}>&nbsp;</td>
      ) : (
        Array.from({ length: colSpan }).map((_, index) => (
          <td key={index}>&nbsp;</td>
        ))
      )}
    </tr>
  );
}

function tableColumnCount(showGst) {
  return showGst ? 9 : 6;
}

function paginateRows(rows, hasExtraDetails) {
  const extra = hasExtraDetails ? LAYOUT_MM.extraDetails : 0;
  return paginateByHeight(
    rows,
    (pageIndex, withFooter) => {
      const firstPageBase = LAYOUT_MM.header + LAYOUT_MM.divider + LAYOUT_MM.addresses + extra + LAYOUT_MM.tableHeader;
      const continuationBase = LAYOUT_MM.continuationHeader + LAYOUT_MM.tableHeader;
      const base = pageIndex === 0 ? firstPageBase : continuationBase;
      return Math.max(MODERN_ROW_MIN_HEIGHT_MM, LAYOUT_MM.contentHeight - base - (withFooter ? LAYOUT_MM.footer : 0));
    },
    estimateModernRowHeight,
  );
}

function InfoLine({ label, value }) {
  return (
    <div className="invoice-info-line">
      <span className="invoice-info-label">{label}</span>
      <span className="invoice-info-value wrap-break-word">{value || '-'}</span>
    </div>
  );
}

function BusinessLine({ children }) {
  if (!children) return null;
  return (
    <div className="invoice-business-line">
      <span className="wrap-break-word">{children}</span>
    </div>
  );
}

function AddressBlock({ title, data }) {
  return (
    <div className="invoice-address-card">
      <div className="invoice-address-inner">
        <div className="invoice-card-title-row">
          <div className="invoice-card-title">
            {title}
          </div>
        </div>
        <div className="invoice-address-copy">
          <div className="invoice-address-name">{data?.name || '-'}</div>
          {data?.company && data.company !== data.name && <div className="font-bold">{data.company}</div>}
          {data?.gstin && <div className="font-mono">GSTIN: {data.gstin}</div>}
          {data?.address && <div>{data.address}</div>}
          {(data?.city || data?.state || data?.pincode) && (
            <div>{[data.city, data.state, data.pincode].filter(Boolean).join(', ')}</div>
          )}
          {data?.phone && <div>Phone: {data.phone}</div>}
          {data?.email && <div>Email: {data.email}</div>}
        </div>
      </div>
    </div>
  );
}

function BottomCard({ title, children, className = '' }) {
  return (
    <div className={`invoice-bottom-card ${className}`}>
      <SectionLabel>{title}</SectionLabel>
      <div className="invoice-bottom-card-body">
        {children}
      </div>
    </div>
  );
}

function BankDetailsCard({ config, customer, docExtra, bizSettings }) {
  const { rows: bankRows, emptyText } = bankRowsForDocument({ config, customer, docExtra, bizSettings });

  return (
    <BottomCard title="Bank Details" className="invoice-bank-card">
      {bankRows.length > 0 ? (
        <div className="invoice-bank-details">
          {bankRows.map(([label, value]) => (
            <div key={label} className="invoice-bank-row">
              <span>{label}</span>
              <strong>{truncateText(value, 32)}</strong>
            </div>
          ))}
        </div>
      ) : (
        <div className="invoice-bank-empty">{emptyText}</div>
      )}
    </BottomCard>
  );
}

function TaxCell({ rate, amount }) {
  return (
    <>
      <td className="invoice-col-tax-rate invoice-money">{rate ? `${rate}%` : '-'}</td>
      <td className="invoice-col-tax-amount invoice-money">{formatInvoiceTableCurrency(amount)}</td>
    </>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="invoice-section-label">
      <span>{children}</span>
    </div>
  );
}

function nextFrame() {
  return new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
}

function shortDelay(ms = 80) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function waitForPdfPaint(el) {
  await nextFrame();
  await nextFrame();
  if (document.fonts?.ready) {
    await document.fonts.ready.catch(() => {});
  }
  const images = Array.from(el.querySelectorAll('img'));
  await Promise.all(images.map((img) => {
    if (img.complete && img.naturalWidth > 0) return Promise.resolve();
    if (typeof img.decode === 'function') return img.decode().catch(() => {});
    return new Promise((resolve) => {
      img.addEventListener('load', resolve, { once: true });
      img.addEventListener('error', resolve, { once: true });
    });
  }));
  await nextFrame();
  await shortDelay();
}

function canvasHasVisibleContent(canvas) {
  try {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return true;
    const { width, height } = canvas;
    const stepX = Math.max(1, Math.floor(width / 80));
    const stepY = Math.max(1, Math.floor(height / 110));
    const data = ctx.getImageData(0, 0, width, height).data;
    for (let y = 0; y < height; y += stepY) {
      for (let x = 0; x < width; x += stepX) {
        const idx = (y * width + x) * 4;
        const alpha = data[idx + 3];
        if (alpha > 0 && (data[idx] < 248 || data[idx + 1] < 248 || data[idx + 2] < 248)) return true;
      }
    }
    return false;
  } catch {
    return true;
  }
}

async function captureInvoicePage(html2canvas, pageEl, options) {
  const captureRoot = document.createElement('div');
  const captureStack = document.createElement('div');
  const clone = pageEl.cloneNode(true);
  const isClassic = pageEl.classList?.contains('invoice-classic-page');
  captureRoot.className = 'pdf-render pdf-capture-root';
  captureStack.className = `invoice-pages-stack${isClassic ? ' invoice-classic-stack' : ''}`;
  captureRoot.style.position = 'fixed';
  captureRoot.style.left = '0';
  captureRoot.style.top = '0';
  captureRoot.style.width = isClassic ? '210mm' : `${options.width}px`;
  captureRoot.style.height = isClassic ? '297mm' : `${options.height}px`;
  captureRoot.style.minHeight = isClassic ? '297mm' : `${options.height}px`;
  captureRoot.style.background = '#fff';
  captureRoot.style.pointerEvents = 'none';
  captureRoot.style.zIndex = '2147483647';
  captureRoot.style.visibility = 'visible';
  captureRoot.style.overflow = 'hidden';
  captureStack.style.width = isClassic ? '210mm' : `${options.width}px`;
  captureStack.style.minWidth = captureStack.style.width;
  captureStack.style.maxWidth = captureStack.style.width;
  captureStack.style.height = isClassic ? '297mm' : `${options.height}px`;
  captureStack.style.margin = '0';
  captureStack.style.padding = '0';
  captureStack.style.gap = '0';
  captureStack.style.overflow = 'hidden';
  clone.style.margin = '0';
  captureStack.appendChild(clone);
  captureRoot.appendChild(captureStack);
  document.body.appendChild(captureRoot);
  try {
    await waitForPdfPaint(captureRoot);
    const clonedCanvas = await html2canvas(clone, options);
    if (canvasHasVisibleContent(clonedCanvas)) return clonedCanvas;
    return await html2canvas(pageEl, options);
  } finally {
    captureRoot.remove();
  }
}

// Each `.invoice-page` is already laid out to be exactly one A4 page (see
// LAYOUT_MM / paginateRows), so we capture and place one page at a time —
// no blind pixel-slicing, no risk of cropping mid-row.
async function generateInvoicePdf(pageEls, filename, outputMode = 'save') {
  if (pageEls.length === 0) return null;
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);
  const isThermal = pageEls[0]?.classList?.contains('invoice-thermal-page');
  const firstRect = pageEls[0]?.getBoundingClientRect();
  const isLandscape = !isThermal && firstRect?.width > firstRect?.height;
  const firstHeight = isThermal && firstRect?.width
    ? Math.max(120, Math.ceil((firstRect.height / firstRect.width) * 80))
    : isLandscape ? 210 : 297;
  const pdf = new jsPDF({
    unit: 'mm',
    format: isThermal ? [80, firstHeight] : 'a4',
    orientation: isLandscape ? 'landscape' : 'portrait',
    compress: true,
  });

  for (let i = 0; i < pageEls.length; i += 1) {
    const pageEl = pageEls[i];
    const pageRect = pageEl.getBoundingClientRect();
    const pageWidthPx = Math.ceil(pageRect.width);
    const pageHeightPx = Math.ceil(pageRect.height);
    const pageWidth = isThermal ? 80 : isLandscape ? 297 : 210;
    const pageHeight = isThermal && pageRect.width
      ? Math.max(120, Math.ceil((pageRect.height / pageRect.width) * pageWidth))
      : isLandscape ? 210 : 297;
    const canvas = await captureInvoicePage(html2canvas, pageEl, {
      scale: 3,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: pageWidthPx,
      height: pageHeightPx,
      windowWidth: pageWidthPx,
      windowHeight: pageHeightPx,
      scrollX: 0,
      scrollY: 0,
    });
    if (i > 0) pdf.addPage(isThermal ? [pageWidth, pageHeight] : 'a4', isLandscape ? 'landscape' : 'portrait');
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pageWidth, pageHeight);
  }

  if (outputMode === 'datauristring') return pdf.output('datauristring');
  pdf.save(filename);
  return null;
}

function ItemRow({ item, sno, showGst, isIntrastate }) {
  const line = lineCalc(item);
  const gstRate = Number(item.gstRate) || 0;
  const descriptionBullets = lineItemDescriptionBullets(item);
  return (
    <tr>
      <td className="invoice-col-sno">{sno}</td>
      <td className="invoice-col-item">
        <div className="invoice-item-main">{truncateText(lineItemDisplayName(item), ITEM_NAME_MAX_CHARS) || '-'}</div>
      </td>
      <td className="invoice-col-description">
        {descriptionBullets.length > 0 ? (
          <ul className="invoice-description-list">
            {descriptionBullets.map((description, index) => (
              <li className={description ? '' : 'invoice-description-list-blank'} key={`${description}-${index}`}>{description || '\u00a0'}</li>
            ))}
          </ul>
        ) : (
          <div className="invoice-item-main">-</div>
        )}
      </td>
      {showGst && <td className="invoice-col-hsn font-mono">{item.hsn || '-'}</td>}
      <td className="invoice-col-qty">{Number(item.qty) || 0}</td>
      <td className="invoice-col-rate invoice-money">{formatInvoiceTableCurrency(Number(item.rate) || 0)}</td>
      <td className="invoice-col-taxable invoice-money">{formatInvoiceTableCurrency(line.taxable)}</td>
      {showGst && (
        <>
          <TaxCell rate={isIntrastate ? gstRate / 2 : 0} amount={isIntrastate ? line.gstAmt / 2 : 0} />
          <TaxCell rate={isIntrastate ? gstRate / 2 : 0} amount={isIntrastate ? line.gstAmt / 2 : 0} />
        </>
      )}
      <td className="invoice-col-total invoice-money font-bold">{formatInvoiceTableCurrency(showGst ? line.total : line.taxable)}</td>
    </tr>
  );
}

function ChargeRow({ charge, showGst, isIntrastate }) {
  const amount = Number(charge.amount) || 0;
  const gstRate = Number(charge.gstRate) || 0;
  const gst = amount * (gstRate / 100);
  return (
    <tr>
      <td className="invoice-col-sno">-</td>
      <td className="invoice-col-item italic">{charge.label || 'Additional Charge'}</td>
      <td className="invoice-col-description">-</td>
      {showGst && <td className="invoice-col-hsn">-</td>}
      <td className="invoice-col-qty" />
      <td className="invoice-col-rate" />
      <td className="invoice-col-taxable invoice-money">{formatInvoiceTableCurrency(amount)}</td>
      {showGst && (
        <>
          <TaxCell rate={isIntrastate ? gstRate / 2 : 0} amount={isIntrastate ? gst / 2 : 0} />
          <TaxCell rate={isIntrastate ? gstRate / 2 : 0} amount={isIntrastate ? gst / 2 : 0} />
        </>
      )}
      <td className="invoice-col-total invoice-money font-bold">{formatInvoiceTableCurrency(amount + (showGst ? gst : 0))}</td>
    </tr>
  );
}

function ThermalInfoLine({ label, value }) {
  return (
    <div className="thermal-info-line">
      <span>{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  );
}

function ThermalTotalLine({ label, value, strong = false }) {
  return (
    <div className={`thermal-total-line${strong ? ' thermal-total-line-strong' : ''}`}>
      <span>{label}</span>
      <strong>{formatCurrency(value || 0)}</strong>
    </div>
  );
}

function ClassicField({ label, value, strong = false }) {
  return (
    <div className="invoice-classic-field">
      <span>{label}</span>
      <b>:</b>
      <strong className={strong ? 'invoice-classic-emphasis' : ''}>{value || '-'}</strong>
    </div>
  );
}

function classicAddressLines(source = {}) {
  return [
    source.address,
    [source.city, source.state].filter(Boolean).join(' - '),
    source.pincode ? `PIN : ${source.pincode}` : '',
  ].filter(Boolean);
}

function ClassicA4TaxInvoiceTemplate({
  config, customer, docMeta, docExtra, items, charges, totals,
  notes, terms, supplyType, bizSettings, paymentMethod, showGst,
  advanceAmt, addDiscount, tds, tcs,
}) {
  const visibleItems = items.filter((item) => item.description || Number(item.rate) > 0).slice(0, 7);
  const paddedItems = Array.from({ length: 7 }).map((_, index) => visibleItems[index] || null);
  const rowHeights = [11, 11, 9.5, 10.5, 10.5, 10.5, 8.5];
  const isIntrastate = supplyType === 'intrastate';
  const businessName = bizSettings.businessName || 'KING TECH SOLUTIONS';
  const customerName = customer.name || '';
  const businessAddress = classicAddressLines({
    address: bizSettings.address || 'NO.30,KUDIBISHA NAGAR, TENNUR, TRICHY',
    city: bizSettings.city || 'TRICHY',
    state: bizSettings.state || 'Tamil Nadu',
    pincode: bizSettings.pincode || '620017',
  });
  const customerAddress = classicAddressLines({
    address: customer.address || '',
    city: customer.city || '',
    state: customer.state || '',
    pincode: customer.pincode || '',
  });
  const bankRows = bankRowsForDocument({ config, customer, docExtra, bizSettings, uppercaseLabels: true }).rows;
  const paymentLabel = paymentMethodLabel(paymentMethod, []);
  const totalTax = (Number(totals.totalGst) || 0) + (Number(totals.chargesGst) || 0);
  const cgst = showGst && isIntrastate ? totalTax / 2 : 0;
  const sgst = showGst && isIntrastate ? totalTax / 2 : 0;
  const oldBalance = Number(docExtra.oldBalance ?? docMeta.oldBalance ?? 0) || 0;
  const newBalance = Number(docExtra.newBalance ?? docMeta.newBalance ?? (oldBalance + (Number(totals.finalTotal) || 0) - (Number(advanceAmt) || 0))) || 0;
  const dueAmount = Math.max(0, Number(totals.balanceDue ?? totals.finalTotal) || 0);
  const invoiceTime = docExtra.invoiceTime || docMeta.invoiceTime || docExtra.time || '';
  const operatorPhone = docExtra.operatorPhone || docExtra.operatorMobile || docExtra.mobile || '';
  const logoSrc = bizSettings.logoUrl ? `${SERVER_ORIGIN}${bizSettings.logoUrl}` : '';
  const qrSrc = bizSettings.paymentQrUrl ? `${SERVER_ORIGIN}${bizSettings.paymentQrUrl}` : '/upi-payment-qr.jpg';
  const noteLines = classicCompactLines(notes, 135);
  const termLines = classicCompactLines(terms, 135);

  return (
    <section className="invoice-page invoice-classic-page">
      <div className="invoice-classic-outer">
        <div className="invoice-classic-title-row">
          <span />
          <strong>CREDIT TAX INVOICE</strong>
          <em>Original for Recipient (Page 1/1)</em>
        </div>

        <div className="invoice-classic-info">
          <div className="invoice-classic-seller">
            <div className="invoice-classic-seller-head">
              <div className="invoice-classic-logo-box">
                {logoSrc && <img src={logoSrc} alt="" />}
              </div>
              <div className="invoice-classic-seller-copy">
                <h2>{businessName}</h2>
                {businessAddress.map((line) => <p key={line}>{line}</p>)}
                {bizSettings.phone && <p>Mobile : {bizSettings.phone}</p>}
                {bizSettings.businessEmail && <p>{bizSettings.businessEmail}</p>}
                {showGst && <h3>GSTIN : {bizSettings.gstin || '33AAQFK9910M1ZT'}</h3>}
              </div>
            </div>

            <div className="invoice-classic-customer">
              <div className="invoice-classic-section-caption">Customer</div>
              {customerName && <h2>{customerName}</h2>}
              {customerAddress.map((line) => <p key={line}>{line}</p>)}
              {customer.gstin && (
                <>
                  <p>GSTIN : {customer.gstin}</p>
                  <p>POS : {docMeta.placeOfSupply || customer.state || 'Tamil Nadu'} [State Code : {docExtra.stateCode || '33'}]</p>
                </>
              )}
              {customer.phone && <p>Mobile : {customer.phone}</p>}
            </div>
          </div>

          <div className="invoice-classic-meta">
            <div className="invoice-classic-meta-left">
              <ClassicField label="Invoice No." value={docMeta.number} strong />
              <ClassicField label="P.O. No." value={docMeta.poRef || docExtra.poNo} />
              <ClassicField label="Challan No" value={docExtra.challanNo} />
              <ClassicField label="Bill Pay Status" value={dueAmount > 0 ? `Due ${formatClassicAmount(dueAmount)}` : 'Paid'} strong />
              <ClassicField label="Bill Credit" value={docMeta.paymentTerms ? `${docMeta.paymentTerms} Days` : docExtra.creditDays ? `${docExtra.creditDays} Days` : '-'} />
              <ClassicField label="Location" value={docExtra.location || bizSettings.city || 'TRICHY'} />
              <div className="invoice-classic-delivery-gap" />
              <ClassicField label="Delivery By" value={docExtra.deliveryBy || docExtra.transporter || 'By Hand'} />
              <div className="invoice-classic-last-transaction">Last Transaction:</div>
              <div className="invoice-classic-pending-line">{docExtra.paymentPendingText || `Payment pending by ${docMeta.paymentTerms || docExtra.creditDays || 0} Days.`}</div>
              <div className="invoice-classic-balance-line">
                <span>Closing Balance</span><b>:</b><strong>{docExtra.closingBalance || `(Debit) ${formatClassicAmount(newBalance)}`}</strong>
              </div>
              <div className="invoice-classic-ledger-row">
                <span>Old Balance</span><b>=</b><strong>{oldBalance ? `(Debit) ${formatClassicAmount(oldBalance)}` : '-'}</strong>
              </div>
              <div className="invoice-classic-ledger-row invoice-classic-ledger-add">
                <span>Adding this Invoice Amount</span><b />
                <strong>{totals.finalTotal ? `+${formatClassicAmount(totals.finalTotal)}` : '-'}</strong>
              </div>
              <div className="invoice-classic-ledger-row invoice-classic-ledger-total">
                <span>New Balance after this Invoice</span><b>=</b><strong>{`(Debit) ${formatClassicAmount(newBalance)}`}</strong>
              </div>
            </div>
            <div className="invoice-classic-meta-right">
              <div className="invoice-classic-date-row">
                <ClassicField label="Invoice Date" value={formatClassicDate(docMeta.date)} strong />
                {invoiceTime && <span>{invoiceTime}</span>}
              </div>
              <ClassicField label="P.O. Date" value={formatClassicDate(docMeta.poDate || docExtra.poDate)} />
              <ClassicField label="Pay. Mode" value={paymentLabel || 'Credit'} />
              <ClassicField label="Salesman" value={docExtra.salesman} />
              <ClassicField label="Due Date" value={formatClassicDate(docMeta.dueDate)} />
              <ClassicField label="Operator" value={docExtra.operator} />
              {operatorPhone && <div className="invoice-classic-operator-phone">{operatorPhone}</div>}
              <ClassicField label="LR No." value={docExtra.lrNo} />
            </div>
          </div>
        </div>

        <table className="invoice-classic-table">
          <colgroup>
            <col className="classic-col-sno" />
            <col className="classic-col-desc" />
            <col className="classic-col-hsn" />
            <col className="classic-col-gst" />
            <col className="classic-col-qty" />
            <col className="classic-col-uqc" />
            <col className="classic-col-price" />
            <col className="classic-col-price-gst" />
            <col className="classic-col-amount" />
          </colgroup>
          <thead>
            <tr>
              <th>S/N</th>
              <th>Description Of Goods / Service</th>
              <th>HSN/SAC</th>
              <th>GST</th>
              <th>Billed<br />Quantity</th>
              <th>UQC</th>
              <th>Price</th>
              <th>Price With<br />GST</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {paddedItems.map((item, index) => {
              const line = item ? lineCalc(item) : null;
              const descLines = item ? lineItemClassicDescriptionLines(item) : [];
              return (
                <tr key={item?.id || item?.description || `blank-${index}`} className="invoice-classic-item-row" style={{ height: `${rowHeights[index]}mm` }}>
                  <td>{item ? `${index + 1})` : ''}</td>
                  <td>
                    {item && (
                      <>
                        <div className="invoice-classic-item-title">{lineItemDisplayName(item)}</div>
                        {descLines.map((lineText, lineIndex) => <span key={`${lineText}-${lineIndex}`} className="invoice-classic-item-sub-line">{lineText}</span>)}
                      </>
                    )}
                  </td>
                  <td>{item?.hsn || ''}</td>
                  <td>{item && showGst ? `${Number(item.gstRate) || 0}%` : ''}</td>
                  <td>{item ? Number(item.qty) || 0 : ''}</td>
                  <td>{item?.unit || item?.uqc || (item ? 'NOS' : '')}</td>
                  <td>{item ? formatClassicAmount(Number(item.rate) || 0) : ''}</td>
                  <td>{item ? formatClassicAmount(showGst ? line.total / (Number(item.qty) || 1) : Number(item.rate) || 0) : ''}</td>
                  <td>{item ? formatClassicAmount(showGst ? line.total : line.taxable) : ''}</td>
                </tr>
              );
            })}
            <tr className="invoice-classic-tax-inline">
              <td />
              <td>CGST @ 9%</td>
              <td /><td /><td /><td /><td /><td />
              <td>{formatClassicAmount(cgst)}</td>
            </tr>
            <tr className="invoice-classic-tax-inline">
              <td />
              <td>SGST @ 9%</td>
              <td /><td /><td /><td /><td /><td />
              <td>{formatClassicAmount(sgst)}</td>
            </tr>
            <tr className="invoice-classic-uqc-row">
              <td />
              <td />
              <td /><td /><td /><td /><td /><td /><td />
            </tr>
            <tr className="invoice-classic-total-line">
              <td colSpan={6} />
              <td colSpan={3}>
                <div className="invoice-classic-total-wide">
                  <span>Roundup</span>
                  <strong>{formatClassicAmount(totals.roundOff)}</strong>
                </div>
              </td>
            </tr>
            <tr className="invoice-classic-grand-total">
              <td colSpan={6} />
              <td colSpan={3}>
                <div className="invoice-classic-total-wide">
                  <span>Grand Total</span>
                  <strong>{formatClassicAmount(totals.finalTotal)}</strong>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div className="invoice-classic-words">
          <span>Amount Chargeable (In Words)</span>
          <strong>{numberToWords(totals.finalTotal)}</strong>
        </div>

        <div className="invoice-classic-bottom">
          <div className="invoice-classic-bank">
            <h3>Bank Details:</h3>
            {(bankRows.length ? bankRows : [
              ['BANK NAME', 'HDFC BANK'],
              ['A/C NAME', businessName],
              ['A/C No.', '50200064095452'],
              ['IFSC CODE', 'HDFC0000058'],
            ]).slice(0, 4).map(([label, value]) => <p key={label}><b>{label}</b><span>:</span>{value}</p>)}
          </div>
          <div className="invoice-classic-qr">
            <h3>UPI Payment QR Code</h3>
            <div className="invoice-classic-qr-box">
              {qrSrc && <img src={qrSrc} alt="UPI Payment QR Code" />}
            </div>
          </div>
          {noteLines.length > 0 && (
            <div className="invoice-classic-notes">
              <h3>Notes:</h3>
              {noteLines.slice(0, 3).map((line) => <p key={`note-${line}`}>{line}</p>)}
            </div>
          )}
          <div className="invoice-classic-terms">
            <h3>Terms & Condition:</h3>
            {(termLines.length > 0 ? termLines : [
              'Warranty And Claims: All warranties/Claims of the products will be covered by respective manufacturer/service centers as per their terms and conditions.',
              'Rate Difference Pay on Overdue Bill: 24 % on value of Invoice.',
            ]).slice(0, 4).map((line) => <p key={`term-${line}`}>{line}</p>)}
          </div>
          <div className="invoice-classic-sign">
            <strong>For {businessName}</strong>
            <b>Authorized Signatory</b>
          </div>
        </div>

        <div className="invoice-classic-footer">
          <strong>Buyer Seal And Signature</strong>
          <span>This is a Computer Generated TAX INVOICE</span>
          <strong>Authorized Signatory</strong>
        </div>
      </div>
    </section>
  );
}

function Thermal80Template({
  config, customer, docMeta, docExtra, items, charges, totals,
  notes, terms, supplyType, bizSettings, paymentMethod, showGst,
  advanceAmt, addDiscount, tds, tcs,
}) {
  const visibleItems = items.filter((item) => item.description || Number(item.rate) > 0);
  const isIntrastate = supplyType === 'intrastate';
  const taxRateRows = Object.entries(totals.gstByRate || {}).filter(([, val]) => val.taxable > 0);
  const title = config.printTitle || config.title || 'Tax Invoice';
  const businessAddress = [
    bizSettings.address,
    [bizSettings.city, bizSettings.state, bizSettings.pincode].filter(Boolean).join(', '),
  ].filter(Boolean).join(', ');
  const customerAddress = [
    customer.address,
    [customer.city, customer.state, customer.pincode].filter(Boolean).join(', '),
  ].filter(Boolean).join(', ');
  const totalTax = (Number(totals.totalGst) || 0) + (Number(totals.chargesGst) || 0);
  const hasCharges = charges.some((charge) => Number(charge.amount) > 0);

  return (
    <section className="invoice-page invoice-thermal-page">
      <header className="thermal-header">
        {bizSettings.logoUrl && (
          <img src={`${SERVER_ORIGIN}${bizSettings.logoUrl}`} alt="logo" className="thermal-logo" />
        )}
        <h1>{bizSettings.businessName || 'Your Business'}</h1>
        {businessAddress && <p>{businessAddress}</p>}
        {bizSettings.phone && <p>Phone: {bizSettings.phone}</p>}
        {bizSettings.businessEmail && <p>{bizSettings.businessEmail}</p>}
        {showGst && bizSettings.gstin && <p>GSTIN: {bizSettings.gstin}</p>}
      </header>

      <div className="thermal-divider" />

      <div className="thermal-title">{title}</div>
      <div className="thermal-info-grid">
        <ThermalInfoLine label="Invoice No" value={docMeta.number} />
        <ThermalInfoLine label="Date" value={fmtDate(docMeta.date)} />
        {docMeta.paymentTerms && <ThermalInfoLine label="Terms" value={`${docMeta.paymentTerms} Days`} />}
        {showGst && docMeta.placeOfSupply && <ThermalInfoLine label="Place" value={docMeta.placeOfSupply} />}
      </div>

      <div className="thermal-party">
        <div className="thermal-section-title">{config.partyToLabel || 'Customer'}</div>
        <strong>{customer.name || 'Walk-in Customer'}</strong>
        {customer.phone && <span>{customer.phone}</span>}
        {showGst && customer.gstin && <span>GSTIN: {customer.gstin}</span>}
        {customerAddress && <span>{customerAddress}</span>}
      </div>

      <table className={`thermal-items-table${showGst ? '' : ' thermal-items-table-no-gst'}`}>
        <thead>
          <tr>
            <th>#</th>
            <th>Item</th>
            {showGst && <th>GST</th>}
            <th>Qty</th>
            <th>Rate</th>
            <th>Amt</th>
          </tr>
        </thead>
        <tbody>
          {visibleItems.map((item, index) => {
            const line = lineCalc(item);
            const gstRate = Number(item.gstRate) || 0;
            return (
              <tr key={item.id || `${item.description}-${index}`}>
                <td>{index + 1}</td>
                <td>
                  <div className="thermal-item-name">{lineItemDisplayName(item) || '-'}</div>
                  <div className="thermal-item-meta">
                    {showGst && item.hsn ? `HSN: ${item.hsn}` : ''}
                    {item.unit ? `${showGst && item.hsn ? ' | ' : ''}${item.unit}` : ''}
                  </div>
                </td>
                {showGst && <td>{gstRate ? `${gstRate}%` : '-'}</td>}
                <td>{Number(item.qty) || 0}</td>
                <td>{formatClassicAmount(Number(item.rate) || 0)}</td>
                <td>{formatClassicAmount(showGst ? line.total : line.taxable)}</td>
              </tr>
            );
          })}
          {charges.filter((charge) => Number(charge.amount) > 0).map((charge, index) => {
            const amount = Number(charge.amount) || 0;
            const gstRate = Number(charge.gstRate) || 0;
            const gst = amount * (gstRate / 100);
            return (
              <tr key={charge.id || `${charge.label}-${index}`}>
                <td>-</td>
                <td><div className="thermal-item-name">{charge.label || 'Additional Charge'}</div></td>
                {showGst && <td>{gstRate ? `${gstRate}%` : '-'}</td>}
                <td />
                <td>{formatClassicAmount(amount)}</td>
                <td>{formatClassicAmount(amount + (showGst ? gst : 0))}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="thermal-totals">
        <ThermalTotalLine label="Subtotal" value={totals.subtotal} />
        {totals.discount > 0 && <ThermalTotalLine label="Item Discount" value={-totals.discount} />}
        {hasCharges && <ThermalTotalLine label="Other Charges" value={totals.chargesSubtotal} />}
        {showGst && totalTax > 0 && <ThermalTotalLine label="GST" value={totalTax} />}
        {totals.addDiscAmt > 0 && (
          <ThermalTotalLine
            label={`Discount${addDiscount?.type === 'percent' && addDiscount.value ? ` (${addDiscount.value}%)` : ''}`}
            value={-totals.addDiscAmt}
          />
        )}
        {tds?.enabled && totals.tdsAmt > 0 && <ThermalTotalLine label={`TDS (${tds.rate}%)`} value={-totals.tdsAmt} />}
        {tcs?.enabled && totals.tcsAmt > 0 && <ThermalTotalLine label={`TCS (${tcs.rate}%)`} value={totals.tcsAmt} />}
        {Math.abs(totals.roundOff) >= 0.01 && <ThermalTotalLine label={totals.manualTotalOverride ? 'Adjustment' : 'Round Off'} value={totals.roundOff} />}
        <ThermalTotalLine label="Grand Total" value={totals.finalTotal} strong />
        {paymentMethod && <ThermalInfoLine label="Payment" value={paymentMethod} />}
        {Number(advanceAmt) > 0 && <ThermalTotalLine label="Paid" value={Number(advanceAmt)} />}
        {Number(advanceAmt) > 0 && totals.balanceDue > 0 && <ThermalTotalLine label="Balance" value={totals.balanceDue} strong />}
      </div>

      {showGst && taxRateRows.length > 0 && (
        <div className="thermal-tax-summary">
          <div className="thermal-section-title">Tax Summary</div>
          {taxRateRows.map(([rate, val]) => (
            <div className="thermal-tax-row" key={rate}>
              <span>{rate}%</span>
              <span>Taxable {formatCurrency(val.taxable)}</span>
              <span>
                {isIntrastate
                  ? `CGST ${formatCurrency(val.gst / 2)} SGST ${formatCurrency(val.gst / 2)}`
                  : `IGST ${formatCurrency(val.gst)}`}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="thermal-words">
        <span>Amount in words</span>
        <strong>{numberToWords(totals.finalTotal)}</strong>
      </div>

      {(notes || terms) && (
        <div className="thermal-notes">
          {notes && <p>{truncateText(notes, 160)}</p>}
          {terms && <p>{truncateText(terms, 160)}</p>}
        </div>
      )}

      {docExtra.irnNumber && <div className="thermal-irn">IRN: {truncateText(docExtra.irnNumber, 90)}</div>}

      <footer className="thermal-footer">
        <strong>Thank you</strong>
        <span>This is a computer generated invoice.</span>
        <span>Generated by GoBook</span>
      </footer>
    </section>
  );
}

function TableHead({ showGst }) {
  return (
    <thead>
      <tr>
        <th className="invoice-col-sno">S.No</th>
        <th className="invoice-col-item">Item Name</th>
        <th className="invoice-col-description">Description</th>
        {showGst && <th className="invoice-col-hsn"><span className="invoice-th-stack">HSN/SAC</span></th>}
        <th className="invoice-col-qty">Qty</th>
        <th className="invoice-col-rate">Rate</th>
        <th className="invoice-col-taxable"><span className="invoice-th-stack">Taxable<br />Amount</span></th>
        {showGst && (
          <>
            <th className="invoice-col-tax-rate">CGST %</th>
            <th className="invoice-col-tax-amount"><span className="invoice-th-stack">CGST<br />Amount</span></th>
            <th className="invoice-col-tax-rate">SGST %</th>
            <th className="invoice-col-tax-amount"><span className="invoice-th-stack">SGST<br />Amount</span></th>
          </>
        )}
        <th className="invoice-col-total">Total</th>
      </tr>
    </thead>
  );
}

export function DocumentPreviewModal({
  config, customer, docMeta, docExtra, items, charges, totals,
  notes, terms, supplyType, bizSettings, shipping, sameShipping,
  tds, tcs, advanceAmt, paymentMethod = '', paymentSplits = [], addDiscount, autoPrint = false, embedded = false, onClose,
  downloadAsPdf = false, printInvoice = false, pdfMode = false, invoiceNumber = '', onPdfReady = null, onPdfDownloaded = null, onPdfPrinted = null,
  printTemplate = 'classic',
  printStylesActive = false,
}) {
  const didAutoPrint = useRef(false);
  const didDownload = useRef(false);
  const didPrint = useRef(false);
  const didPdfReady = useRef(false);
  const previewRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const modalRef = useFocusTrap({ active: !embedded, onClose });
  const showGst = Boolean(config.showGst);
  const displayPaymentMethod = paymentMethodLabel(paymentMethod, paymentSplits);
  const visibleItems = items.filter((item) => item.description || Number(item.rate) > 0);
  const hasTaxSummary = showGst && Object.values(totals.gstByRate || {}).some((val) => val.taxable > 0);
  const isIntrastate = supplyType === 'intrastate';

  const secondDate = config.showDueDate
    ? { label: 'Due Date', value: fmtDate(docMeta.dueDate) }
    : config.showValidTill
      ? { label: 'Valid Till', value: fmtDate(docExtra.validTill) }
      : config.showExpectedDelivery
        ? { label: 'Expected Delivery', value: fmtDate(docExtra.expectedDelivery) }
        : null;

  const partyCustomer = {
    ...customer,
    gstin: partyGstinFallback(customer, docExtra),
  };

  const shippingData = !sameShipping && (shipping?.address || shipping?.city || shipping?.state || shipping?.pincode)
    ? { name: partyCustomer.name, ...shipping }
    : partyCustomer;

  const extraDetails = [
    { show: docMeta.poRef, label: 'PO Ref', value: docMeta.poRef },
    { show: config.showOriginalRef && docExtra.originalInvoiceNo, label: 'Original Inv No', value: docExtra.originalInvoiceNo },
    { show: config.showOriginalRef && docExtra.originalInvoiceDate, label: 'Original Inv Date', value: fmtDate(docExtra.originalInvoiceDate) },
    { show: config.reasonLabel && docExtra.reason, label: config.reasonLabel, value: docExtra.reason },
    { show: config.showDeliveryAddress && docExtra.deliveryAddress, label: 'Delivery Address', value: docExtra.deliveryAddress },
    { show: config.showTransport && docExtra.vehicleNumber, label: 'Vehicle No', value: docExtra.vehicleNumber },
    { show: config.showTransport && docExtra.transporter, label: 'Transporter', value: docExtra.transporter },
    { show: config.showIRN && docExtra.irnNumber, label: 'IRN', value: docExtra.irnNumber },
    { show: config.showIRN && docExtra.ackNumber, label: 'Ack No', value: docExtra.ackNumber },
  ].filter((d) => d.show);

  const pdfFilename = invoiceNumber
    ? `Invoice-${String(invoiceNumber).replace(/[\\/:*?"<>|]+/g, '-')}.pdf`
    : 'Invoice.pdf';

  const combinedRows = [
    ...visibleItems.map((item, i) => ({ kind: 'item', data: item, sno: i + 1 })),
    ...charges.map((charge) => ({ kind: 'charge', data: charge })),
  ];
  const pages = paginateRows(combinedRows, extraDetails.length > 0);
  const totalPages = pages.length;
  const isThermalTemplate = false;
  const isPdfOnlyRender = pdfMode || downloading || downloadAsPdf || Boolean(onPdfReady);
  const useClassicTemplate = printTemplate === 'classic';

  useEffect(() => {
    if ((embedded && !printStylesActive) || isPdfOnlyRender) return undefined;
    document.body.classList.add('document-preview-printing');
    if (isThermalTemplate) document.body.classList.add('document-preview-thermal');
    return () => {
      document.body.classList.remove('document-preview-printing');
      document.body.classList.remove('document-preview-thermal');
    };
  }, [embedded, isPdfOnlyRender, isThermalTemplate, printStylesActive]);

  useEffect(() => {
    if (!downloadAsPdf) {
      didDownload.current = false;
      return;
    }
    if (didDownload.current) return;
    didDownload.current = true;
    const el = previewRef.current;
    if (!el) return;
    setDownloading(true);
    waitForPdfPaint(el)
      .then(() => generateInvoicePdf(Array.from(el.querySelectorAll('.invoice-page')), pdfFilename, 'save'))
      .then(() => {
        setDownloading(false);
        if (onPdfDownloaded) onPdfDownloaded();
        if (onClose) onClose();
      }).catch(() => {
        setDownloading(false);
        if (onPdfDownloaded) onPdfDownloaded();
      });
  }, [downloadAsPdf, pdfFilename, onClose, onPdfDownloaded]);

  useEffect(() => {
    const shouldPrint = autoPrint || printInvoice;
    if (!shouldPrint) {
      didAutoPrint.current = false;
      didPrint.current = false;
      return;
    }
    if (didAutoPrint.current || didPrint.current) return;
    didAutoPrint.current = autoPrint;
    didPrint.current = printInvoice;
    const el = previewRef.current;
    if (!el) {
      if (onPdfPrinted) onPdfPrinted();
      return;
    }
    waitForPdfPaint(el)
      .then(() => {
        window.print();
        if (onPdfPrinted) onPdfPrinted();
        if (autoPrint && onClose) onClose();
      })
      .catch(() => {
        if (onPdfPrinted) onPdfPrinted();
      });
  }, [autoPrint, printInvoice, pdfFilename, onClose, onPdfPrinted]);

  useEffect(() => {
    if (!onPdfReady || didPdfReady.current) return;
    didPdfReady.current = true;
    const el = previewRef.current;
    if (!el) return;
    waitForPdfPaint(el)
      .then(() => generateInvoicePdf(Array.from(el.querySelectorAll('.invoice-page')), pdfFilename, 'datauristring'))
      .then((dataUri) => {
        const base64 = dataUri.split(',')[1];
        onPdfReady(base64);
      })
      .catch(() => onPdfReady(null));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onPdfReady]);

  return (
    <div
      ref={embedded ? undefined : modalRef}
      role={embedded ? undefined : 'dialog'}
      aria-modal={embedded ? undefined : true}
      className={`document-preview-print-modal ${isPdfOnlyRender ? 'pdf-render ' : ''}${embedded ? '' : 'fixed inset-0 z-50 bg-black/50 overflow-y-auto py-8 px-4 print:bg-white print:py-0 print:px-0 print:overflow-visible print:h-auto print:bottom-auto'}`}
    >
      {downloading && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center print:hidden">
          <div className="bg-white rounded-xl px-8 py-6 flex flex-col items-center gap-3 shadow-xl">
            <svg className="animate-spin" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5"><circle cx="12" cy="12" r="10" strokeOpacity=".25"/><path d="M12 2a10 10 0 0 1 10 10" /></svg>
            <span className="text-[15px] font-medium text-gray-700">{downloadAsPdf || onPdfReady ? 'Preparing PDF...' : 'Preparing print...'}</span>
          </div>
        </div>
      )}
      {!embedded && (
        <div className="max-w-5xl mx-auto flex items-center justify-end gap-2 mb-3 print:hidden">
          <button type="button" className={btnOutline} onClick={onClose}>
            <X size={14} /> Close
          </button>
        </div>
      )}

      <div ref={previewRef} id={isPdfOnlyRender ? undefined : 'document-preview-print'} className={`invoice-print-root invoice-pages-stack${useClassicTemplate ? ' invoice-classic-stack' : ''}`}>
        {useClassicTemplate ? (
          <ClassicA4TaxInvoiceTemplate
            config={config}
            customer={partyCustomer}
            docMeta={docMeta}
            docExtra={docExtra}
            items={visibleItems}
            charges={charges}
            totals={totals}
            notes={notes}
            terms={terms}
            supplyType={supplyType}
            bizSettings={bizSettings}
            paymentMethod={displayPaymentMethod}
            showGst={showGst}
            advanceAmt={advanceAmt}
            addDiscount={addDiscount}
            tds={tds}
            tcs={tcs}
          />
        ) : pages.map((page) => {
          const pageRows = combinedRows.slice(page.start, page.start + page.count);
          return (
            <section key={page.pageNumber} className="invoice-page">
              {page.isFirst ? (
                <>
                  <div className="invoice-header">
                    <div className="invoice-header-grid">
                      <div className="invoice-company-block">
                        {bizSettings.logoUrl && (
                          <img src={`${SERVER_ORIGIN}${bizSettings.logoUrl}`} alt="logo" className="invoice-company-logo object-contain flex-none" />
                        )}
                        <div className="invoice-company-copy">
                          <div className="invoice-company-name">{bizSettings.businessName || 'Your Business'}</div>
                          <div className="invoice-business-lines">
                            {config.showGst && <BusinessLine>{bizSettings.gstin ? `GSTIN: ${bizSettings.gstin}` : ''}</BusinessLine>}
                            <BusinessLine>
                              {[
                                bizSettings.address,
                                [bizSettings.city, bizSettings.state, bizSettings.pincode].filter(Boolean).join(', '),
                              ].filter(Boolean).join(', ')}
                            </BusinessLine>
                            <BusinessLine>{bizSettings.phone}</BusinessLine>
                            <BusinessLine>{bizSettings.businessEmail}</BusinessLine>
                            <BusinessLine>{bizSettings.website || bizSettings.businessWebsite}</BusinessLine>
                          </div>
                        </div>
                      </div>

                      <div className="invoice-title-panel">
                        <div className="invoice-title">
                          {config.printTitle || config.title}
                        </div>
                        <div className="invoice-copy-label">
                          Original for Recipient{totalPages > 1 ? ` · Page 1 of ${totalPages}` : ''}
                        </div>
                        <div className="invoice-info-panel">
                          <InfoLine label="Invoice No" value={docMeta.number} />
                          <InfoLine label="Invoice Date" value={fmtDate(docMeta.date)} />
                          {secondDate && <InfoLine label={secondDate.label} value={secondDate.value} />}
                          {showGst && <InfoLine label="Place of Supply" value={docMeta.placeOfSupply} />}
                          <InfoLine label="Payment Terms" value={docMeta.paymentTerms ? `${docMeta.paymentTerms} Days` : '-'} />
                          {showGst && <InfoLine label="Reverse Charge" value="No" />}
                          {config.showTransport && <InfoLine label="Transport Mode" value={docExtra.transporter || docExtra.vehicleNumber || '-'} />}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="invoice-divider" />

                  <div className="invoice-addresses">
                    <AddressBlock title={config.partyToLabel || 'Bill To'} data={partyCustomer} />
                    <AddressBlock title="Ship To" data={shippingData} />
                  </div>

                  {extraDetails.length > 0 && (
                    <div className="invoice-extra">
                      <div className="invoice-extra-grid">
                        {extraDetails.map(({ label, value }) => (
                          <div key={label} className="invoice-extra-cell">
                            <div className="invoice-extra-label">{label}</div>
                            <div className="invoice-extra-value wrap-break-word">{truncateText(value, EXTRA_VALUE_MAX_CHARS)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="invoice-continuation-header">
                  <span className="invoice-continuation-name">{bizSettings.businessName || 'Your Business'}</span>
                  <span className="invoice-continuation-meta">{config.printTitle || config.title} #{docMeta.number}</span>
                  <span className="invoice-continuation-page">Page {page.pageNumber} of {totalPages}</span>
                </div>
              )}

              <div className="invoice-items">
                <table className={`invoice-product-table${showGst ? '' : ' invoice-product-table--no-gst'}`}>
                  <TableHead showGst={showGst} />
                  <tbody>
                    {pageRows.map((row, i) => (row.kind === 'item'
                      ? <ItemRow key={`item-${page.start + i}`} item={row.data} sno={row.sno} showGst={showGst} isIntrastate={isIntrastate} />
                      : <ChargeRow key={`charge-${page.start + i}`} charge={row.data} showGst={showGst} isIntrastate={isIntrastate} />))}
                    <BlankTableRow colSpan={showGst ? 12 : 6} height={page.fillerHeight} />
                  </tbody>
                </table>
              </div>

              {page.isLast && (
                <>
                  <div className="invoice-summary">
                    <div className="invoice-summary-left">
                      {hasTaxSummary ? (
                        <div className="invoice-tax-card">
                          <div className="invoice-tax-card-title">Tax Summary</div>
                          <table className="invoice-tax-table">
                            <thead>
                              <tr>
                                <th className="text-left">GST</th>
                                <th>Taxable Amount</th>
                                <th>CGST</th>
                                <th>SGST</th>
                                <th>IGST</th>
                                <th>Total Tax</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(totals.gstByRate).filter(([, val]) => val.taxable > 0).map(([rate, val]) => (
                                <tr key={rate}>
                                  <td className="text-left font-semibold">{rate}%</td>
                                  <td>{formatCurrency(val.taxable)}</td>
                                  <td>{formatCurrency(isIntrastate ? val.gst / 2 : 0)}</td>
                                  <td>{formatCurrency(isIntrastate ? val.gst / 2 : 0)}</td>
                                  <td>{formatCurrency(isIntrastate ? 0 : val.gst)}</td>
                                  <td className="font-bold">{formatCurrency(val.gst)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="invoice-tax-card invoice-tax-card-empty" />
                      )}

                      <div className="invoice-amount-words">
                        <div className="invoice-amount-words-title">Amount in Words</div>
                        <div className="invoice-amount-words-value">
                          {numberToWords(totals.finalTotal)}
                        </div>
                      </div>
                    </div>

                    <table className="invoice-total-card">
                      <tbody>
                        <tr>
                          <td className="invoice-total-label">Subtotal</td>
                          <td className="invoice-total-value">{formatCurrency(totals.subtotal)}</td>
                        </tr>
                        {totals.discount > 0 && (
                          <tr>
                            <td className="invoice-total-label">Discount</td>
                            <td className="invoice-total-value">- {formatCurrency(totals.discount)}</td>
                          </tr>
                        )}
                        {totals.chargesSubtotal > 0 && (
                          <tr>
                            <td className="invoice-total-label">Other Charges</td>
                            <td className="invoice-total-value">{formatCurrency(totals.chargesSubtotal)}</td>
                          </tr>
                        )}
                        {showGst && (totals.totalGst + totals.chargesGst) > 0 && (
                          <tr>
                            <td className="invoice-total-label">Tax</td>
                            <td className="invoice-total-value">{formatCurrency(totals.totalGst + totals.chargesGst)}</td>
                          </tr>
                        )}
                        {totals.addDiscAmt > 0 && (
                          <tr>
                            <td className="invoice-total-label">Discount{addDiscount?.type === 'percent' && addDiscount.value ? ` (${addDiscount.value}%)` : ''}</td>
                            <td className="invoice-total-value">- {formatCurrency(totals.addDiscAmt)}</td>
                          </tr>
                        )}
                        {tds?.enabled && totals.tdsAmt > 0 && (
                          <tr>
                            <td className="invoice-total-label">TDS ({tds.rate}%)</td>
                            <td className="invoice-total-value">- {formatCurrency(totals.tdsAmt)}</td>
                          </tr>
                        )}
                        {tcs?.enabled && totals.tcsAmt > 0 && (
                          <tr>
                            <td className="invoice-total-label">TCS ({tcs.rate}%)</td>
                            <td className="invoice-total-value">+ {formatCurrency(totals.tcsAmt)}</td>
                          </tr>
                        )}
                        {Math.abs(totals.roundOff) >= 0.01 && (
                          <tr>
                            <td className="invoice-total-label">{totals.manualTotalOverride ? 'Manual Total Adjustment' : 'Round Off'}</td>
                            <td className="invoice-total-value">{totals.roundOff > 0 ? '+' : ''}{formatCurrency(totals.roundOff)}</td>
                          </tr>
                        )}
                        <tr className="invoice-grand-total-row">
                          <td className="invoice-grand-total-label">Grand Total</td>
                          <td className="invoice-grand-total-value">{formatCurrency(totals.finalTotal)}</td>
                        </tr>
                        {displayPaymentMethod && (
                          <tr>
                            <td className="invoice-total-label">Payment Mode</td>
                            <td className="invoice-total-value">{displayPaymentMethod}</td>
                          </tr>
                        )}
                        {Number(advanceAmt) > 0 && (
                          totals.balanceDue <= 0 ? (
                            <tr>
                              <td className="invoice-total-label font-bold">Paid in Full</td>
                              <td className="invoice-total-value font-bold">{formatCurrency(Number(advanceAmt))}</td>
                            </tr>
                          ) : (
                            <>
                              <tr>
                                <td className="invoice-total-label">Amount Received</td>
                                <td className="invoice-total-value">- {formatCurrency(Number(advanceAmt))}</td>
                              </tr>
                              <tr>
                                <td className="invoice-total-label font-bold">Balance Due</td>
                                <td className="invoice-total-value font-bold">{formatCurrency(totals.balanceDue)}</td>
                              </tr>
                            </>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="invoice-bottom-grid">
                    <BottomCard title="Notes">
                      <div className="whitespace-pre-wrap">
                        {truncateText(notes, NOTES_MAX_CHARS) || 'Payment instructions\nDelivery notes'}
                      </div>
                    </BottomCard>
                    <BottomCard title="Terms & Conditions">
                      <div className="whitespace-pre-wrap">
                        {truncateText(terms, NOTES_MAX_CHARS) || '1. Goods once sold will not be taken back.\n2. Subject to Trichy Jurisdiction.\n3. Please pay on or before due date.'}
                      </div>
                    </BottomCard>
                    <BankDetailsCard config={config} customer={partyCustomer} docExtra={docExtra} bizSettings={bizSettings} />
                    <BottomCard title="Authorized Signature" className="invoice-signature-card">
                      <div className="invoice-stamp-placeholder">Company Stamp</div>
                      <div className="invoice-signature-line">
                        For {bizSettings.businessName || 'Your Business'}
                      </div>
                    </BottomCard>
                  </div>

                  <div className="invoice-brand-footer">
                    <span>Invoice generated by <strong>GoBook</strong></span>
                    <span>This is a computer generated invoice.</span>
                    <span className="invoice-brand-url">www.gobooksuite.com</span>
                  </div>
                </>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
