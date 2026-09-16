import { getInvoiceLayoutSettings } from '../../../../../../utils/invoiceLayoutSettings.js';
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

function itemName(item = {}) {
  const description = cleanPrintableItemText(item.description || item.name || item.productName || '');
  const model = cleanPrintableItemText(item.size || item.modelName || item.modelNumber || '');
  if (!description) return model || '-';
  if (!model || description.toLowerCase().includes(model.toLowerCase())) return description;
  return `${description} ${model}`;
}

function itemDescriptionLines(item = {}) {
  const lines = [
    itemName(item),
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

function bankRowsForInvoice(bizSettings = {}, docExtra = {}) {
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
  const fillerHeight = Math.max(14, 58 - visibleItems.reduce((sum, item) => sum + 5 + Math.max(0, itemDescriptionLines(item).length - 1) * 3.4, 0));
  const bankRows = bankRowsForInvoice(bizSettings, docExtra);
  const layoutOptions = getInvoiceLayoutSettings(bizSettings, docExtra.invoicePrintFormat || bizSettings.invoicePrintFormat);
  const showLogo = layoutOptions.invoiceShowLogo !== false;
  const showAmountWords = layoutOptions.invoiceShowAmountWords !== false;
  const showBankDetails = layoutOptions.invoiceShowBankDetails !== false;
  const showPaymentQr = layoutOptions.invoiceShowPaymentQr !== false;
  const showNotes = layoutOptions.invoiceShowNotes !== false;
  const showTerms = layoutOptions.invoiceShowTerms !== false;
  const showSignature = layoutOptions.invoiceShowSignature !== false;
  const showGoBookBranding = layoutOptions.invoiceShowGoBookBranding !== false;
  const isThermal80 = (docExtra.invoicePrintFormat || bizSettings.invoicePrintFormat) === 'thermal80';
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

  const receiptContent = (
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
          {customerGstin && <p>GSTIN: {customerGstin}</p>}
          {customer.phone && <p>Mobile: {customer.phone}</p>}
          {customerAddress.slice(0, 2).map((line) => <p key={line}>{line}</p>)}
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
                    <strong>{itemName(item)}</strong>
                    {(item.hsn || item.hsnCode || item.sac) && <span>HSN: {item.hsn || item.hsnCode || item.sac}</span>}
                    {showGst && line.gstRate ? <span>GST: {line.gstRate}%</span> : null}
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
          <div><span>Subtotal</span><b>{formatAmount(taxableTotal)}</b></div>
          {taxRows.map((row) => <div key={row.label}><span>{row.label}</span><b>{formatAmount(row.amount)}</b></div>)}
          {roundOff ? <div><span>Round Off</span><b>{formatAmount(roundOff)}</b></div> : null}
          <div className="erp-receipt-grand"><span>Total</span><b>{formatAmount(finalTotal)}</b></div>
        </div>

        {showAmountWords && (
          <div className="erp-receipt-words">
            <span>Amount in words</span>
            <strong>{numberToWords(finalTotal)}</strong>
          </div>
        )}

        {(showBankDetails && visibleBankRows.length > 0) && (
          <div className="erp-receipt-bank">
            <strong>Bank Details</strong>
            {visibleBankRows.map(([label, value]) => <p key={label}>{label}: {value}</p>)}
          </div>
        )}

        {showPaymentQr && qrSrc && (
          <div className="erp-receipt-qr">
            <img src={qrSrc} alt="UPI Payment QR Code" crossOrigin="anonymous" />
            <span>Scan to Pay</span>
          </div>
        )}

        {showTerms && termLines.length > 0 && (
          <div className="erp-receipt-note">
            <strong>Terms</strong>
            {termLines.map((line) => <p key={line}>{line}</p>)}
          </div>
        )}

        {showNotes && noteLines.length > 0 && (
          <div className="erp-receipt-note">
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

  const normalContent = (
    <div className={`pdf-render erp-invoice-preview${pdfMode ? ' erp-pdf-mode' : ''}`}>
      <section className="invoice-page erp-invoice-page">
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
            <table className="erp-items-table">
              <colgroup>
                <col className="erp-col-sn" />
                <col className="erp-col-desc" />
                <col className="erp-col-hsn" />
                <col className="erp-col-gst" />
                <col className="erp-col-qty" />
                <col className="erp-col-uqc" />
                <col className="erp-col-price" />
                <col className="erp-col-price-gst" />
                <col className="erp-col-amount" />
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
                {visibleItems.map((item, index) => {
                  const line = lineCalc(item);
                  const lines = itemDescriptionLines(item);
                  const unit = String(item.unit || item.uqc || 'NOS').toUpperCase();
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
                      <td className="erp-cell-center erp-nowrap">{item.hsn || item.hsnCode || item.sac || ''}</td>
                      <td className="erp-cell-center erp-nowrap">{showGst ? `${line.gstRate || 0}%` : ''}</td>
                      <td className="erp-cell-center erp-nowrap">{formatQty(line.qty)}</td>
                      <td className="erp-cell-center erp-nowrap">{unit}</td>
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
                  <td />
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
                    <td />
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
                  {visibleBankRows.length > 0 && (
                    <>
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
                    </>
                  )}
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
      </section>
    </div>
  );

  const revision = JSON.stringify({ config, customer, docMeta, docExtra, items, charges, totals, terms, notes, supplyType, bizSettings, paymentMethod });
  const content = (
    <InvoicePdfSurface revision={revision} filename={pdfFilename}
      download={downloadAsPdf} print={printInvoice}
      onDownloaded={onPdfDownloaded} onPrinted={onPdfPrinted} onReady={onPdfReady}>
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
