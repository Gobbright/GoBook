import { useMemo } from 'react';
import { documentConfigs } from '../documentConfigs.js';
import { DocumentPreviewModal } from './DocumentPreviewModal.jsx';

export function calcDocumentTotals(items = [], charges = [], additionalDiscount, tds, tcs, advanceReceived, showGst = true) {
  const acc = { subtotal: 0, discount: 0, taxable: 0, totalGst: 0, grandTotal: 0, gstByRate: {} };

  items.forEach((item) => {
    const gross = (Number(item.qty) || 0) * (Number(item.rate) || 0);
    const discountAmt = gross * ((Number(item.discount) || 0) / 100);
    const taxable = gross - discountAmt;
    const gstAmt = showGst ? taxable * ((Number(item.gstRate) || 0) / 100) : 0;
    const rate = Number(item.gstRate) || 0;

    acc.subtotal += gross;
    acc.discount += discountAmt;
    acc.taxable += taxable;
    acc.totalGst += gstAmt;
    acc.grandTotal += taxable + gstAmt;
    if (!acc.gstByRate[rate]) acc.gstByRate[rate] = { taxable: 0, gst: 0 };
    acc.gstByRate[rate].taxable += taxable;
    acc.gstByRate[rate].gst += gstAmt;
  });

  const chargesSubtotal = charges.reduce((sum, charge) => sum + (Number(charge.amount) || 0), 0);
  const chargesGst = showGst
    ? charges.reduce((sum, charge) => sum + (Number(charge.amount) || 0) * ((Number(charge.gstRate) || 0) / 100), 0)
    : 0;

  const preDisc = showGst
    ? acc.grandTotal + chargesSubtotal + chargesGst
    : acc.taxable + chargesSubtotal;
  const addDiscAmt = additionalDiscount?.value
    ? (additionalDiscount.type === 'percent'
      ? preDisc * (Number(additionalDiscount.value) / 100)
      : Math.min(Number(additionalDiscount.value), preDisc))
    : 0;
  const invoiceTotal = preDisc - addDiscAmt;
  const tdsAmt = tds?.enabled ? acc.taxable * ((Number(tds.rate) || 0) / 100) : 0;
  const tcsAmt = tcs?.enabled ? invoiceTotal * ((Number(tcs.rate) || 0) / 100) : 0;
  const netPayable = invoiceTotal - tdsAmt + tcsAmt;
  const roundOff = Math.round(netPayable) - netPayable;
  const finalTotal = Math.round(netPayable);
  const balanceDue = finalTotal - (Number(advanceReceived) || 0);

  return { ...acc, chargesSubtotal, chargesGst, preDisc, addDiscAmt, invoiceTotal, tdsAmt, tcsAmt, netPayable, roundOff, finalTotal, balanceDue };
}

export function DocumentPdfDownload({ doc, bizSettings, onDone }) {
  const documentType = doc.documentType || 'invoice';
  const config = documentConfigs[documentType] ?? documentConfigs.invoice;
  const docMeta = {
    ...doc.meta,
    number: doc.number,
    date: doc.meta?.date || doc.date || doc.createdAt,
  };
  const totals = useMemo(() => calcDocumentTotals(
    doc.items || [],
    doc.charges || [],
    doc.additionalDiscount,
    doc.tds,
    doc.tcs,
    doc.advanceReceived,
    config.showGst,
  ), [doc, config.showGst]);

  return (
    <div style={{ position: 'fixed', left: 0, top: 0, width: '794px', pointerEvents: 'none', zIndex: 50 }}>
      <DocumentPreviewModal
        embedded
        config={config}
        customer={doc.customer || {}}
        docMeta={docMeta}
        docExtra={doc.extra || {}}
        items={doc.items || []}
        charges={doc.charges || []}
        totals={totals}
        notes={doc.notes || ''}
        terms={doc.terms || ''}
        supplyType={doc.supplyType || 'intrastate'}
        bizSettings={bizSettings}
        shipping={doc.shipping || {}}
        sameShipping={doc.shipping?.sameAsBilling ?? true}
        tds={doc.tds}
        tcs={doc.tcs}
        advanceAmt={doc.advanceReceived || 0}
        paymentMethod={doc.paymentMethod || ''}
        addDiscount={doc.additionalDiscount}
        downloadAsPdf
        pdfMode
        invoiceNumber={docMeta.number}
        onPdfDownloaded={onDone}
      />
    </div>
  );
}
