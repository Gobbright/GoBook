import { useEffect, useRef, useState } from 'react';
import {
  X,
} from 'lucide-react';

import { formatCurrency } from '../../../../../../utils/formatCurrency.js';
import { numberToWords } from '../../../../../../utils/numberToWords.js';
import { SERVER_ORIGIN } from '../../../../../../services/api.js';
import { useFocusTrap } from '../../../../../../hooks/useFocusTrap.js';

const btnOutline = 'inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium text-gray-700 bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit]';

// Fixed-height layout budget (mm) shared by the pagination math below and the
// CSS in index.css. Keep both in sync — this is what lets us pre-compute page
// breaks instead of measuring the DOM or slicing a rasterized screenshot.
const LAYOUT_MM = {
  contentHeight: 273, // 297 page - 12 top margin - 12 bottom margin
  header: 40,
  divider: 2,
  addresses: 34,
  extraDetails: 10,
  tableHeader: 7,
  row: 8,
  continuationHeader: 14,
  footer: 80,
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

// Truncate in JS rather than clamp with CSS overflow/max-height: html2canvas
// (used by the Download PDF button) mis-renders overflow:hidden combined
// with a constrained height inside a table cell, clipping text from the
// wrong edge. Plain, already-short text needs no overflow handling at all
// and renders identically under native print and html2canvas.
function truncateText(text, max) {
  if (!text || text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
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

function paginateRows(rowCount, hasExtraDetails) {
  const extra = hasExtraDetails ? LAYOUT_MM.extraDetails : 0;
  const firstNoFooter = Math.max(1, Math.floor(
    (LAYOUT_MM.contentHeight - LAYOUT_MM.header - LAYOUT_MM.divider - LAYOUT_MM.addresses - extra - LAYOUT_MM.tableHeader) / LAYOUT_MM.row,
  ));
  const firstWithFooter = Math.max(1, Math.floor(
    (LAYOUT_MM.contentHeight - LAYOUT_MM.header - LAYOUT_MM.divider - LAYOUT_MM.addresses - extra - LAYOUT_MM.tableHeader - LAYOUT_MM.footer) / LAYOUT_MM.row,
  ));
  const contNoFooter = Math.max(1, Math.floor(
    (LAYOUT_MM.contentHeight - LAYOUT_MM.continuationHeader - LAYOUT_MM.tableHeader) / LAYOUT_MM.row,
  ));
  const contWithFooter = Math.max(1, Math.floor(
    (LAYOUT_MM.contentHeight - LAYOUT_MM.continuationHeader - LAYOUT_MM.tableHeader - LAYOUT_MM.footer) / LAYOUT_MM.row,
  ));

  const pages = [];
  let start = 0;
  let pageIndex = 0;

  while (start < rowCount || pages.length === 0) {
    const isFirst = pageIndex === 0;
    const noFooterCap = isFirst ? firstNoFooter : contNoFooter;
    const withFooterCap = isFirst ? firstWithFooter : contWithFooter;
    const remaining = rowCount - start;
    const isLast = remaining <= withFooterCap;
    const capacity = isLast ? withFooterCap : noFooterCap;
    const count = isLast ? remaining : Math.min(capacity, remaining);
    const fillerRows = isLast ? Math.max(0, capacity - count) : 0;
    pages.push({ isFirst, isLast, start, count, fillerRows, pageNumber: pageIndex + 1 });
    start += count;
    pageIndex += 1;
    if (pageIndex > 200) break;
  }
  return pages;
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

function BankDetailsCard({ bizSettings }) {
  const bankRows = [
    ['Bank', bizSettings.bankName],
    ['A/C Name', bizSettings.accountHolderName],
    ['A/C No.', bizSettings.accountNumber],
    ['IFSC', bizSettings.ifscCode],
    ['Branch', bizSettings.bankBranch],
  ].filter(([, value]) => value);

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
        <div className="invoice-bank-empty">Add bank details in Business Settings</div>
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
    const canvas = await html2canvas(pageEls[i], {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 794,
    });
    if (i > 0) pdf.addPage('a4', 'portrait');
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.98), 'JPEG', 0, 0, pageWidth, pageHeight);
  }

  if (outputMode === 'datauristring') return pdf.output('datauristring');
  pdf.save(filename);
  return null;
}

function ItemRow({ item, sno, showGst, isIntrastate }) {
  const line = lineCalc(item);
  const gstRate = Number(item.gstRate) || 0;
  return (
    <tr>
      <td className="invoice-col-sno">{sno}</td>
      <td className="invoice-col-item">
        <div className="invoice-item-main">{truncateText(item.description, ITEM_NAME_MAX_CHARS) || '-'}</div>
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

function TableHead({ showGst }) {
  return (
    <thead>
      <tr>
        <th className="invoice-col-sno">S.No</th>
        <th className="invoice-col-item">Item Name</th>
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

  const shippingData = !sameShipping && (shipping?.address || shipping?.city || shipping?.state || shipping?.pincode)
    ? { name: customer.name, ...shipping }
    : customer;

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

  const itemColSpan = showGst ? 11 : 6;
  const pdfFilename = invoiceNumber
    ? `Invoice-${String(invoiceNumber).replace(/[\\/:*?"<>|]+/g, '-')}.pdf`
    : 'Invoice.pdf';

  const combinedRows = [
    ...visibleItems.map((item, i) => ({ kind: 'item', data: item, sno: i + 1 })),
    ...charges.map((charge) => ({ kind: 'charge', data: charge })),
  ];
  const pages = paginateRows(combinedRows.length, extraDetails.length > 0);
  const totalPages = pages.length;

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
      className={`${pdfMode ? 'pdf-render ' : ''}${embedded ? '' : 'fixed inset-0 z-50 bg-black/50 overflow-y-auto py-8 px-4 print:bg-white print:py-0 print:px-0 print:overflow-visible print:h-auto print:bottom-auto'}`}
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

      <div ref={previewRef} id="document-preview-print" className="invoice-pages-stack">
        {pages.map((page) => {
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
                    <AddressBlock title={config.partyToLabel || 'Bill To'} data={customer} />
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
                    {Array.from({ length: page.fillerRows }).map((_, rowIndex) => (
                      <tr key={`filler-${rowIndex}`} className="invoice-filler-row">
                        {Array.from({ length: itemColSpan }).map((__, colIndex) => (
                          <td key={colIndex}>&nbsp;</td>
                        ))}
                      </tr>
                    ))}
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
                            <td className="invoice-total-label">Round Off</td>
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
                          <>
                            <tr>
                              <td className="invoice-total-label">Amount Received</td>
                              <td className="invoice-total-value">- {formatCurrency(Number(advanceAmt))}</td>
                            </tr>
                            <tr>
                              <td className="invoice-total-label font-bold">Balance Due</td>
                              <td className="invoice-total-value font-bold">{formatCurrency(totals.balanceDue < 0 ? 0 : totals.balanceDue)}</td>
                            </tr>
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="invoice-amount-words">
                    <div className="invoice-amount-words-title">Amount in Words</div>
                    <div className="invoice-amount-words-value">
                      {numberToWords(totals.finalTotal)}
                    </div>
                  </div>

                  <div className="invoice-bottom-grid">
                    <BottomCard title="Notes">
                      <div className="whitespace-pre-wrap">
                        {truncateText(notes, NOTES_MAX_CHARS) || 'Payment instructions\nDelivery notes'}
                      </div>
                    </BottomCard>
                    <BottomCard title="Terms & Conditions">
                      <div className="whitespace-pre-wrap">
                        {truncateText(terms, NOTES_MAX_CHARS) || '1. Goods once sold will not be taken back.\n2. Subject to local jurisdiction.\n3. Please pay on or before due date.'}
                      </div>
                    </BottomCard>
                    <BankDetailsCard bizSettings={bizSettings} />
                    <BottomCard title="Authorized Signature" className="invoice-signature-card">
                      <div className="invoice-stamp-placeholder">Company Stamp</div>
                      <div className="invoice-signature-line">
                        For {bizSettings.businessName || 'Your Business'}
                      </div>
                    </BottomCard>
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
