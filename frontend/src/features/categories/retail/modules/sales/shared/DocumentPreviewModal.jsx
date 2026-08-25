import { Fragment, useEffect, useRef, useState } from 'react';
import {
  X,
} from 'lucide-react';

import { formatCurrency } from '../../../../../../utils/formatCurrency.js';
import { numberToWords } from '../../../../../../utils/numberToWords.js';
import { api, SERVER_ORIGIN } from '../../../../../../services/api.js';
import { useFocusTrap } from '../../../../../../hooks/useFocusTrap.js';

const btnOutline = 'inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium text-gray-700 bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit]';

// Fixed-height layout budget (mm) shared by the pagination math below and the
// CSS in index.css. Keep both in sync — this is what lets us pre-compute page
// breaks instead of measuring the DOM or slicing a rasterized screenshot.
const LAYOUT_MM = {
  contentHeight: 281, // 297 page - 8 top margin - 8 bottom margin
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
const CLASSIC_ROW_MIN_HEIGHT_MM = 7.2;
const CLASSIC_LAYOUT_MM = {
  contentHeight: 283,
  firstHeader: 66,
  continuationHeader: 12,
  tableHeader: 8.2,
  subtotal: 5.6,
  taxRow: 8.6,
  uqc: 11.8,
  totalLine: 5.4,
  summary: 35,
  words: 0,
  bottom: 45,
  footer: 8.5,
};

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
  return item.itemDescription
    ?? item.lineDescription
    ?? item.details
    ?? item.note
    ?? item.remark
    ?? '';
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
  const discountAmt = gross * ((Number(item.discount) || 0) / 100);
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
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB').replace(/\//g, '-');
}

function classicPaymentPendingText(docMeta = {}) {
  const base = docMeta.dueDate || docMeta.date;
  if (!base) return 'Payment pending.';
  const target = new Date(base);
  if (Number.isNaN(target.getTime())) return 'Payment pending.';
  const today = new Date();
  const diff = Math.max(0, Math.ceil((target.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0)) / 86400000));
  return diff > 0 ? `Payment pending by ${diff} Days.` : 'Payment pending.';
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

function estimateClassicRowHeight(row) {
  if (row.kind === 'charge') return CLASSIC_ROW_MIN_HEIGHT_MM;
  const item = row.data || {};
  const titleLines = wrappedLineCount(lineItemDisplayName(item), 70);
  const descriptionLines = lineItemClassicDescriptionLines(item)
    .reduce((sum, line) => sum + (line ? Math.max(1, Math.ceil(line.length / 70)) : 1), 0);
  return Math.max(CLASSIC_ROW_MIN_HEIGHT_MM, 2.4 + (titleLines * 3.5) + (descriptionLines * 3.5));
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

function BlankTableRow({ colSpan, height }) {
  if (!height || height < 3) return null;
  return (
    <tr className="invoice-blank-fill-row" style={{ height: `${height}mm` }}>
      {Array.from({ length: colSpan }).map((_, index) => (
        <td key={index}>&nbsp;</td>
      ))}
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

function classicFooterHeight({ hasRows, taxRateCount, hasRoundOff }) {
  return (hasRows ? CLASSIC_LAYOUT_MM.subtotal : 0)
    + (taxRateCount * CLASSIC_LAYOUT_MM.taxRow)
    + CLASSIC_LAYOUT_MM.uqc
    + (hasRoundOff ? CLASSIC_LAYOUT_MM.totalLine : 0)
    + CLASSIC_LAYOUT_MM.totalLine
    + CLASSIC_LAYOUT_MM.summary
    + CLASSIC_LAYOUT_MM.words
    + CLASSIC_LAYOUT_MM.bottom
    + CLASSIC_LAYOUT_MM.footer;
}

function paginateClassicRows(rows, { taxRateCount, hasRoundOff }) {
  const finalHeight = classicFooterHeight({ hasRows: rows.length > 0, taxRateCount, hasRoundOff });
  return paginateByHeight(
    rows,
    (pageIndex, withFooter) => {
      const base = (pageIndex === 0 ? CLASSIC_LAYOUT_MM.firstHeader : CLASSIC_LAYOUT_MM.continuationHeader) + CLASSIC_LAYOUT_MM.tableHeader;
      return Math.max(CLASSIC_ROW_MIN_HEIGHT_MM, CLASSIC_LAYOUT_MM.contentHeight - base - (withFooter ? finalHeight : 0));
    },
    estimateClassicRowHeight,
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
}

// Each `.invoice-page` is already laid out to be exactly one A4 page (see
// LAYOUT_MM / paginateRows), so we capture and place one page at a time —
// no blind pixel-slicing, no risk of cropping mid-row.
async function renderPdf(pageEls, filename, outputMode = 'save') {
  if (pageEls.length === 0) return null;
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  const pageWidth = 210;
  const pageHeight = 297;

  for (let i = 0; i < pageEls.length; i += 1) {
    const pageEl = pageEls[i];
    const pageRect = pageEl.getBoundingClientRect();
    const pageWidthPx = Math.ceil(pageRect.width);
    const pageHeightPx = Math.ceil(pageRect.height);
    const canvas = await html2canvas(pageEl, {
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
    if (i > 0) pdf.addPage('a4', 'portrait');
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

function ClassicField({ label, value, strong = false }) {
  return (
    <div className="invoice-classic-field">
      <span>{label}</span>
      <b>:</b>
      <strong className={strong ? 'invoice-classic-emphasis' : ''}>{value || '-'}</strong>
    </div>
  );
}

function ClassicLineRow({ row, index, showGst }) {
  const item = row.kind === 'item' ? row.data : null;
  const charge = row.kind === 'charge' ? row.data : null;
  const line = item
    ? lineCalc(item)
    : {
      taxable: Number(charge?.amount) || 0,
      gstAmt: (Number(charge?.amount) || 0) * ((Number(charge?.gstRate) || 0) / 100),
    };
  const gstRate = Number(item?.gstRate ?? charge?.gstRate) || 0;
  const qty = item ? Number(item.qty) || 0 : '';
  const unit = item?.unit || 'NOS';
  const priceWithGst = showGst && qty ? (line.taxable + line.gstAmt) / qty : Number(item?.rate || charge?.amount) || 0;
  const descriptionLines = lineItemClassicDescriptionLines(item || {});

  return (
    <tr>
      <td className="classic-col-sno">{index + 1})</td>
      <td className="classic-col-desc">
        <div className="invoice-classic-item-title">{truncateText(item ? lineItemDisplayName(item) : charge?.label || 'Additional Charge', 82)}</div>
        {descriptionLines.length > 0 && (
          <div className="invoice-classic-item-sub">
            {descriptionLines.map((line, lineIndex) => (
              <div className="invoice-classic-item-sub-line" key={`${line}-${lineIndex}`}>{line || '\u00a0'}</div>
            ))}
          </div>
        )}
      </td>
      {showGst && <td className="classic-col-hsn">{item?.hsn || '-'}</td>}
      {showGst && <td className="classic-col-gst">{gstRate ? `${gstRate}%` : '-'}</td>}
      <td className="classic-col-qty">{qty}</td>
      <td className="classic-col-uqc">{qty ? String(unit).toUpperCase() : ''}</td>
      <td className="classic-col-price">{qty ? formatClassicAmount(Number(item.rate) || 0) : ''}</td>
      {showGst && <td className="classic-col-price-gst">{qty ? formatClassicAmount(priceWithGst) : ''}</td>}
      <td className="classic-col-amount">{formatClassicAmount(line.taxable)}</td>
    </tr>
  );
}

function ClassicSummaryBlock({
  totals, taxRateRows, isIntrastate, showGst, paymentMethod,
  advanceAmt, addDiscount, tds, tcs,
}) {
  const totalTax = (Number(totals.totalGst) || 0) + (Number(totals.chargesGst) || 0);
  return (
    <div className="invoice-classic-summary">
      <div className="invoice-classic-tax-summary">
        <h3>Tax Summary</h3>
        {showGst && taxRateRows.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>GST</th>
                <th>Taxable</th>
                <th>CGST</th>
                <th>SGST</th>
                <th>IGST</th>
                <th>Total Tax</th>
              </tr>
            </thead>
            <tbody>
              {taxRateRows.map(([rate, val]) => (
                <tr key={rate}>
                  <td>{rate}%</td>
                  <td>{formatClassicAmount(val.taxable)}</td>
                  <td>{formatClassicAmount(isIntrastate ? val.gst / 2 : 0)}</td>
                  <td>{formatClassicAmount(isIntrastate ? val.gst / 2 : 0)}</td>
                  <td>{formatClassicAmount(isIntrastate ? 0 : val.gst)}</td>
                  <td>{formatClassicAmount(val.gst)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No tax applicable</p>
        )}
        <div className="invoice-classic-summary-words">
          <span>Amount Chargeable (In Words)</span>
          <strong>{numberToWords(totals.finalTotal)}</strong>
        </div>
      </div>

      <table className="invoice-classic-payment-summary">
        <tbody>
          <tr><td>Subtotal</td><td>{formatClassicAmount(totals.subtotal)}</td></tr>
          {totals.discount > 0 && <tr><td>Discount</td><td>- {formatClassicAmount(totals.discount)}</td></tr>}
          {totals.chargesSubtotal > 0 && <tr><td>Other Charges</td><td>{formatClassicAmount(totals.chargesSubtotal)}</td></tr>}
          {showGst && totalTax > 0 && <tr><td>Tax</td><td>{formatClassicAmount(totalTax)}</td></tr>}
          {totals.addDiscAmt > 0 && <tr><td>Discount{addDiscount?.type === 'percent' && addDiscount.value ? ` (${addDiscount.value}%)` : ''}</td><td>- {formatClassicAmount(totals.addDiscAmt)}</td></tr>}
          {tds?.enabled && totals.tdsAmt > 0 && <tr><td>TDS ({tds.rate}%)</td><td>- {formatClassicAmount(totals.tdsAmt)}</td></tr>}
          {tcs?.enabled && totals.tcsAmt > 0 && <tr><td>TCS ({tcs.rate}%)</td><td>+ {formatClassicAmount(totals.tcsAmt)}</td></tr>}
          {Math.abs(totals.roundOff) >= 0.01 && <tr><td>{totals.manualTotalOverride ? 'Manual Total Adjustment' : 'Round Off'}</td><td>{totals.roundOff > 0 ? '+' : ''}{formatClassicAmount(totals.roundOff)}</td></tr>}
          <tr className="invoice-classic-payment-grand"><td>Grand Total</td><td>{formatClassicAmount(totals.finalTotal)}</td></tr>
          {paymentMethod && <tr><td>Payment Mode</td><td>{paymentMethod}</td></tr>}
          {Number(advanceAmt) > 0 && (
            totals.balanceDue <= 0 ? (
              <tr className="invoice-classic-payment-due"><td>Paid in Full</td><td>{formatClassicAmount(Number(advanceAmt))}</td></tr>
            ) : (
              <>
                <tr><td>Amount Received</td><td>- {formatClassicAmount(Number(advanceAmt))}</td></tr>
                <tr className="invoice-classic-payment-due"><td>Balance Due</td><td>{formatClassicAmount(totals.balanceDue)}</td></tr>
              </>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}

function DocumentClassicTemplate({
  config, customer, docMeta, docExtra, items, charges, totals,
  notes, terms, supplyType, bizSettings, paymentMethod, showGst,
  advanceAmt, addDiscount, tds, tcs,
}) {
  const [oldBalance, setOldBalance] = useState(0);

  // "Old Balance" = whatever this customer already owed from other unpaid
  // invoices, before this one. Excludes this invoice's own row (matched by
  // number) so editing an already-saved, partly-paid invoice doesn't double
  // count its own outstanding balance into "old".
  useEffect(() => {
    let active = true;
    const customerName = String(customer?.name || '').trim();
    if (!customerName) {
      setOldBalance(0);
      return undefined;
    }
    api.listOutstanding({ customer: customerName, limit: 200 })
      .then((res) => {
        if (!active) return;
        const rows = Array.isArray(res?.data) ? res.data : [];
        const ownBalance = rows.find((row) => row.number === docMeta.number)?.balance || 0;
        const total = Math.max(0, (Number(res?.summary?.totalOutstanding) || 0) - Number(ownBalance));
        setOldBalance(total);
      })
      .catch(() => { if (active) setOldBalance(0); });
    return () => { active = false; };
  }, [customer?.name, docMeta.number]);

  const visibleItems = items.filter((item) => item.description || Number(item.rate) > 0);
  const combinedRows = [
    ...visibleItems.map((item) => ({ kind: 'item', data: item })),
    ...charges.map((charge) => ({ kind: 'charge', data: charge })),
  ];
  const isIntrastate = supplyType === 'intrastate';
  const taxRateRows = Object.entries(totals.gstByRate || {}).filter(([, val]) => val.taxable > 0);
  const totalQty = visibleItems.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  const qtyByUnit = visibleItems.reduce((acc, item) => {
    const unit = String(item.unit || 'NOS').toUpperCase();
    acc[unit] = (acc[unit] || 0) + (Number(item.qty) || 0);
    return acc;
  }, {});
  const { rows: bankRows, emptyText: bankEmptyText } = bankRowsForDocument({
    config,
    customer,
    docExtra,
    bizSettings,
    uppercaseLabels: true,
  });
  const title = config.printTitle || config.title || 'Tax Invoice';
  const customerAddress = [
    customer.address,
    [customer.city, customer.state].filter(Boolean).join(', '),
    customer.pincode ? `PIN :${customer.pincode}` : '',
  ].filter(Boolean);
  const businessAddress = [
    bizSettings.address,
    [bizSettings.city, bizSettings.state].filter(Boolean).join(', '),
    bizSettings.pincode,
  ].filter(Boolean).join(', ');
  const hasRoundOff = Math.abs(totals.roundOff) >= 0.01;
  const classicPages = paginateClassicRows(combinedRows, { taxRateCount: taxRateRows.length, hasRoundOff });
  const totalPages = classicPages.length;

  return (
    <>
      {classicPages.map((page) => {
        const pageRows = combinedRows.slice(page.start, page.start + page.count);
        return (
      <section key={page.pageNumber} className="invoice-page invoice-classic-page">
        <div className="invoice-classic-outer">
          <div className="invoice-classic-title-row">
            <span />
            <strong>{title}</strong>
            <em>Original for Recipient (Page {page.pageNumber}/{totalPages})</em>
          </div>

          {page.isFirst ? (
            <>
              <div className="invoice-classic-top-grid">
                <div className="invoice-classic-business">
                  {bizSettings.logoUrl && (
                    <img src={`${SERVER_ORIGIN}${bizSettings.logoUrl}`} alt="logo" className="invoice-classic-logo" />
                  )}
                  <div>
                    <h2>{bizSettings.businessName || 'Your Business'}</h2>
                    <p>{businessAddress || '-'}</p>
                    {bizSettings.phone && <p>{bizSettings.phone}</p>}
                    {bizSettings.businessEmail && <p>{bizSettings.businessEmail}</p>}
                    {showGst && bizSettings.gstin && <h3>GSTIN: {bizSettings.gstin}</h3>}
                  </div>
                </div>

                <div className="invoice-classic-meta-grid">
                  <div>
                    <ClassicField label="Invoice No." value={docMeta.number} strong />
                    <ClassicField label="P.O. No." value={docMeta.poRef || docExtra.poNo || docExtra.purchaseOrderNo} />
                    <ClassicField label="Challan No." value={docExtra.challanNo} />
                    <ClassicField label="Bill Pay Status" value={`Due ${formatClassicAmount(Math.max(0, totals.balanceDue || totals.finalTotal))}`} strong />
                    <ClassicField label="Bill Credit" value={docMeta.paymentTerms ? `${docMeta.paymentTerms} Days` : '-'} />
                    <ClassicField label="Operator" value={docExtra.operator || docExtra.salesperson || '-'} />
                    <ClassicField label="Delivery By" value={docExtra.deliveryBy || docExtra.transporter || 'By Hand'} />
                  </div>
                  <div>
                    <ClassicField label="Invoice Date" value={formatClassicDate(docMeta.date)} strong />
                    <ClassicField label="P.O. Date" value={formatClassicDate(docExtra.poDate)} />
                    <ClassicField label="Pay. Mode" value={paymentMethod || '-'} />
                    <ClassicField label="Salesman" value={docExtra.salesperson || docExtra.salesman || '-'} />
                    <ClassicField label="Due Date" value={formatClassicDate(docMeta.dueDate)} />
                    <ClassicField label="LR No." value={docExtra.lrNo} />
                  </div>
                </div>
              </div>

              <div className="invoice-classic-party-grid">
                <div className="invoice-classic-customer">
                  <div className="invoice-classic-section-caption">{config.partyToLabel || 'Customer'}</div>
                  <h2>{customer.name || '-'}</h2>
                  {customer.gstin && <p>GSTIN : {customer.gstin}</p>}
                  {customerAddress.map((line) => <p key={line}>{line}</p>)}
                  {customer.gstType && <p>GST Type :{customer.gstType}</p>}
                  {docMeta.placeOfSupply && <p>POS : {docMeta.placeOfSupply}</p>}
                  {customer.phone && <h3>Mobile : {customer.phone}</h3>}
                </div>
                <div className="invoice-classic-ledger">
                  <div className="invoice-classic-ledger-heading">Last Transaction:</div>
                  <p>{classicPaymentPendingText(docMeta)}</p>
                  <div className="invoice-classic-ledger-row"><span>Old Balance</span><b>=</b><strong>{formatClassicAmount(oldBalance)}</strong></div>
                  <div className="invoice-classic-ledger-row"><span>Adding this Invoice Amount</span><b>=</b><strong>+{formatClassicAmount(totals.finalTotal)}</strong></div>
                  <div className="invoice-classic-ledger-row invoice-classic-ledger-total"><span>New Balance after this Invoice</span><b>=</b><strong>{formatClassicAmount(oldBalance + totals.finalTotal)}</strong></div>
                </div>
              </div>
            </>
          ) : (
            <div className="invoice-classic-continuation-row">
              <strong>{bizSettings.businessName || 'Your Business'}</strong>
              <span>{title} #{docMeta.number}</span>
              <b>Page {page.pageNumber} of {totalPages}</b>
            </div>
          )}

          <table className={`invoice-classic-table${showGst ? '' : ' invoice-classic-table-no-gst'}`}>
            <thead>
              <tr>
                <th className="classic-col-sno">S/N</th>
                <th className="classic-col-desc">Description Of Goods / Service</th>
                {showGst && <th className="classic-col-hsn">HSN/SAC</th>}
                {showGst && <th className="classic-col-gst">GST</th>}
                <th className="classic-col-qty">Billed<br />Quantity</th>
                <th className="classic-col-uqc">UQC</th>
                <th className="classic-col-price">Price</th>
                {showGst && <th className="classic-col-price-gst">Price With<br />GST</th>}
                <th className="classic-col-amount">Amount</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row, index) => <ClassicLineRow key={`${row.kind}-${page.start + index}`} row={row} index={page.start + index} showGst={showGst} />)}
              {page.isLast && combinedRows.length > 0 && (
                <tr className="invoice-classic-subtotal-row">
                  <td className="classic-col-sno" />
                  <td className="classic-col-desc" />
                  {showGst && <td className="classic-col-hsn" />}
                  {showGst && <td className="classic-col-gst" />}
                  <td className="classic-col-qty">{totalQty || ''}</td>
                  <td className="classic-col-uqc" />
                  <td className="classic-col-price" />
                  {showGst && <td className="classic-col-price-gst" />}
                  <td className="classic-col-amount">{formatClassicAmount(totals.taxable || totals.invoiceTotal)}</td>
                </tr>
              )}
              {page.isLast && showGst && taxRateRows.map(([rate, val]) => (
                <tr key={`tax-${rate}`} className="invoice-classic-tax-inline">
                  <td className="classic-col-sno" />
                  <td className="classic-col-desc"><div>CGST @ {Number(rate) / 2}%</div><div>SGST @ {Number(rate) / 2}%</div></td>
                  {showGst && <td className="classic-col-hsn" />}
                  {showGst && <td className="classic-col-gst" />}
                  <td className="classic-col-qty" />
                  <td className="classic-col-uqc" />
                  <td className="classic-col-price" />
                  {showGst && <td className="classic-col-price-gst" />}
                  <td className="classic-col-amount">{formatClassicAmount(isIntrastate ? val.gst / 2 : 0)}<br />{formatClassicAmount(isIntrastate ? val.gst / 2 : 0)}</td>
                </tr>
              ))}
              {page.isLast && (
                <tr className="invoice-classic-uqc-row">
                  <td />
                  <td>
                    <div className="invoice-classic-qty-summary">
                      <b>UQC</b><b>Quantity</b>
                      {Object.entries(qtyByUnit).map(([unit, qty]) => (
                        <Fragment key={unit}>
                          <span>{unit} :</span>
                          <span>{qty}</span>
                        </Fragment>
                      ))}
                    </div>
                  </td>
                  {showGst && <td />}
                  {showGst && <td />}
                  <td />
                  <td />
                  <td />
                  {showGst && <td />}
                  <td />
                </tr>
              )}
              <BlankTableRow colSpan={tableColumnCount(showGst)} height={page.fillerHeight} />
              {page.isLast && hasRoundOff && (
                <tr className="invoice-classic-total-line">
                  <td colSpan={showGst ? 8 : 5}>Roundup</td>
                  <td>{formatClassicAmount(totals.roundOff)}</td>
                </tr>
              )}
              {page.isLast && (
                <tr className="invoice-classic-grand-total">
                  <td colSpan={showGst ? 8 : 5}>Grand Total</td>
                  <td>{formatClassicAmount(totals.finalTotal)}</td>
                </tr>
              )}
            </tbody>
          </table>

          {page.isLast && (
            <>
              <ClassicSummaryBlock
                totals={totals}
                taxRateRows={taxRateRows}
                isIntrastate={isIntrastate}
                showGst={showGst}
                paymentMethod={paymentMethod}
                advanceAmt={advanceAmt}
                addDiscount={addDiscount}
                tds={tds}
                tcs={tcs}
              />

              <div className="invoice-classic-bottom">
                <div className="invoice-classic-bank">
                  <h3>Bank Details:</h3>
                  {bankRows.length > 0 ? bankRows.map(([label, value]) => (
                    <p key={label}><b>{label}</b><span>:</span>{value}</p>
                  )) : <p>{bankEmptyText}</p>}
                </div>
                <div className="invoice-classic-qr">
                  <h3>UPI Payment QR Code</h3>
                  <img src="/upi-payment-qr.jpg" alt="UPI Payment QR Code" />
                </div>
                <div className="invoice-classic-terms">
                  <h3>Terms & Condition:</h3>
                  <ul>
                    {classicTermsLines(terms, notes).map((line, index) => (
                      <li key={`${line}-${index}`}>{line}</li>
                    ))}
                  </ul>
                </div>
                <div className="invoice-classic-declaration">
                  <h3>Declaration:</h3>
                  <p>Subject to Trichy Jurisdiction.</p>
                  <p>Goods sold as bill.</p>
                  <p>Prices are approved from customer side.</p>
                  <p>Material has been delivered with this invoice copy.</p>
                </div>
                <div className="invoice-classic-sign">
                  <strong>For {bizSettings.businessName || 'Your Business'}</strong>
                  <b>Authorized Signatory</b>
                </div>
              </div>

              <div className="invoice-classic-footer">
                <strong>Buyer Seal And Signature</strong>
                <span>This is a Computer Generated TAX INVOICE</span>
                <strong />
              </div>
            </>
          )}
            </div>
      </section>
        );
      })}
    </>
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
  tds, tcs, advanceAmt, paymentMethod = '', addDiscount, autoPrint = false, embedded = false, onClose,
  downloadAsPdf = false, pdfMode = false, invoiceNumber = '', onPdfReady = null, onPdfDownloaded = null,
  printTemplate = 'modern',
}) {
  const didAutoPrint = useRef(false);
  const didDownload = useRef(false);
  const didPdfReady = useRef(false);
  const previewRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const modalRef = useFocusTrap({ active: !embedded, onClose });
  const showGst = Boolean(config.showGst);
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
  const isClassicTemplate = printTemplate === 'classic';

  useEffect(() => {
    if (!autoPrint) {
      didAutoPrint.current = false;
      return;
    }
    if (didAutoPrint.current) return;
    didAutoPrint.current = true;
    const timer = window.setTimeout(() => {
      window.focus();
      window.print();
    }, 600);
    return () => window.clearTimeout(timer);
  }, [autoPrint]);

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
      .then(() => renderPdf(Array.from(el.querySelectorAll('.invoice-page')), pdfFilename, 'save'))
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
    if (!onPdfReady || didPdfReady.current) return;
    didPdfReady.current = true;
    const el = previewRef.current;
    if (!el) return;
    waitForPdfPaint(el)
      .then(() => renderPdf(Array.from(el.querySelectorAll('.invoice-page')), pdfFilename, 'datauristring'))
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
      className={`${(pdfMode || downloading || downloadAsPdf) ? 'pdf-render ' : ''}${embedded ? '' : 'fixed inset-0 z-50 bg-black/50 overflow-y-auto py-8 px-4 print:bg-white print:py-0 print:px-0 print:overflow-visible print:h-auto print:bottom-auto'}`}
    >
      {downloading && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center print:hidden">
          <div className="bg-white rounded-xl px-8 py-6 flex flex-col items-center gap-3 shadow-xl">
            <svg className="animate-spin" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5"><circle cx="12" cy="12" r="10" strokeOpacity=".25"/><path d="M12 2a10 10 0 0 1 10 10" /></svg>
            <span className="text-[15px] font-medium text-gray-700">Preparing PDF...</span>
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

      <div ref={previewRef} id="document-preview-print" className={`invoice-pages-stack${isClassicTemplate ? ' invoice-classic-stack' : ''}`}>
        {isClassicTemplate ? (
          <DocumentClassicTemplate
            config={config}
            customer={partyCustomer}
            docMeta={docMeta}
            docExtra={docExtra}
            items={items}
            charges={charges}
            totals={totals}
            notes={notes}
            terms={terms}
            supplyType={supplyType}
            bizSettings={bizSettings}
            paymentMethod={paymentMethod}
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
                        {paymentMethod && (
                          <tr>
                            <td className="invoice-total-label">Payment Mode</td>
                            <td className="invoice-total-value">{paymentMethod}</td>
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
