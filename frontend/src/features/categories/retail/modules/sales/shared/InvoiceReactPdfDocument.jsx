import React from 'react';
import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import {
  INVOICE_DESIGN_ELEMENTS,
  getInvoiceDesignDimensions,
  getInvoiceBlockOrder,
  getInvoiceDesignSettings,
  getInvoiceThermalTemplate,
} from '../../../../../../utils/invoiceDesignSettings.js';

const BORDER = '0.7 solid #111';
const LIGHT_BORDER = '0.45 solid #777';

const styles = StyleSheet.create({
  page: { padding: 13, fontSize: 8.8, fontFamily: 'Helvetica', color: '#050505', backgroundColor: '#fff' },
  sheet: { border: BORDER, height: 816 },
  titleBar: { height: 23, borderBottom: BORDER, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  title: { fontSize: 12.8, fontFamily: 'Helvetica-Bold' },
  copy: { position: 'absolute', right: 7, top: 7, fontSize: 7.2, fontStyle: 'italic' },
  top: { flexDirection: 'row', height: 195, borderBottom: BORDER },
  partyColumn: { width: '42%', borderRight: BORDER },
  companyBlock: { height: 111, borderBottom: BORDER, padding: 5, flexDirection: 'row' },
  logo: { width: 70, height: 70, objectFit: 'contain', marginRight: 7 },
  logoFallback: { width: 70, height: 70, marginRight: 7, border: '0.5 solid #aaa', alignItems: 'center', justifyContent: 'center' },
  companyText: { flex: 1, minWidth: 0 },
  bold: { fontFamily: 'Helvetica-Bold' },
  tiny: { fontSize: 7.8, lineHeight: 1.05 },
  customerBlock: { padding: 4, flex: 1 },
  blockLabel: { fontFamily: 'Helvetica-Bold', textDecoration: 'underline', marginBottom: 2, fontSize: 8.5 },
  customerName: { fontFamily: 'Helvetica-Bold', fontSize: 8.8 },
  customerInfoRow: { flexDirection: 'row', marginTop: 2 },
  customerInfoLabel: { width: 58, fontSize: 8.4 },
  customerInfoColon: { width: 7, fontSize: 8.4 },
  customerInfoValue: { flex: 1, fontSize: 8.4 },
  metaColumn: { width: '58%', flexDirection: 'column' },
  metaTop: { height: 86, flexDirection: 'row' },
  metaHalf: { width: '50%', paddingTop: 4, paddingHorizontal: 4 },
  transaction: { flex: 1, paddingHorizontal: 4, paddingTop: 3 },
  deliveryRow: { flexDirection: 'row', height: 20, alignItems: 'flex-end' },
  transactionTitle: { fontFamily: 'Helvetica-Bold', fontSize: 9.4, marginBottom: 2 },
  metaRow: { flexDirection: 'row', marginBottom: 2 },
  metaLabel: { width: 70, fontSize: 9.4 },
  colon: { width: 8, textAlign: 'center', fontSize: 9.4 },
  metaValue: { flex: 1, textAlign: 'left', fontFamily: 'Helvetica-Bold', fontSize: 9.4 },
  metaValueRight: { flex: 1, textAlign: 'right', fontFamily: 'Helvetica-Bold', fontSize: 9.4 },
  transRow: { flexDirection: 'row', marginBottom: 2 },
  transLeft: { width: '47%', fontSize: 9.4 },
  transEq: { width: '7%', textAlign: 'center', fontFamily: 'Helvetica-Bold', fontSize: 9.4 },
  transVal: { width: '46%', textAlign: 'right', fontSize: 9.4 },
  transValBold: { width: '46%', textAlign: 'right', fontSize: 9.4, fontFamily: 'Helvetica-Bold', borderTop: BORDER },
  itemsTable: { height: 276, borderBottom: BORDER },
  itemsTableFullPage: { height: 368 },
  itemsHeader: { flexDirection: 'row', height: 26, borderBottom: BORDER },
  itemRows: {},
  bodyRow: { flexDirection: 'row', minHeight: 25.5 },
  itemBlank: { flexDirection: 'row', flex: 1 },
  th: { padding: 2, borderRight: BORDER, fontFamily: 'Helvetica-Bold', textAlign: 'center', justifyContent: 'center', fontSize: 8.2 },
  cell: { padding: 3, borderRight: BORDER, fontSize: 8.8 },
  noRight: { borderRight: 0 },
  sn: { width: '3.8%' },
  desc: { width: '41.5%' },
  purchaseDesc: { width: '29.7%' },
  variant: { width: '17%' },
  hsn: { width: '7%' },
  gst: { width: '4%' },
  qty: { width: '7.5%' },
  uqc: { width: '5.2%' },
  price: { width: '8.5%' },
  priceGst: { width: '8.5%' },
  amount: { width: '14%' },
  descLine: { marginBottom: 1 },
  right: { textAlign: 'right' },
  center: { textAlign: 'center' },
  itemTitle: { fontFamily: 'Helvetica-Bold', fontSize: 8.9 },
  itemSub: { fontSize: 8.6, marginTop: 1 },
  bottomTaxLabels: { position: 'absolute', bottom: 4, right: 4, alignItems: 'flex-end' },
  summary: { flexDirection: 'row', height: 62, borderBottom: BORDER },
  taxBox: { width: '68.5%', borderRight: BORDER, padding: 5 },
  totalBox: { width: '31.5%' },
  taxTitle: { fontSize: 10, marginBottom: 6 },
  taxHeader: { flexDirection: 'row', borderBottom: LIGHT_BORDER, paddingBottom: 4, fontFamily: 'Helvetica-Bold' },
  taxRow: { flexDirection: 'row', paddingTop: 6 },
  taxCol: { width: '20%', textAlign: 'center', fontSize: 8.8 },
  totalLine: { flexDirection: 'row', height: 32, borderBottom: BORDER },
  totalLabel: { width: '58%', padding: 5, fontSize: 8.8 },
  totalValue: { width: '42%', padding: 5, textAlign: 'right', fontSize: 8.8 },
  grandLine: { flexDirection: 'row', flex: 1 },
  grandLabel: { width: '58%', padding: 5, fontFamily: 'Helvetica-Bold', fontSize: 8.8 },
  grandValue: { width: '42%', padding: 5, textAlign: 'right', fontFamily: 'Helvetica-Bold', fontSize: 8.8 },
  words: { height: 34, borderBottom: BORDER, padding: 4 },
  underline: { textDecoration: 'underline' },
  bottom: { height: 150, borderBottom: BORDER },
  bottomTop: { flexDirection: 'row', height: 80 },
  bottomLower: { flexDirection: 'row', flex: 1 },
  bank: { width: '38%', padding: 5 },
  qrBlock: { width: '24%', padding: 5, alignItems: 'center' },
  bottomSpacer: { width: '38%', padding: 5 },
  termsBlock: { width: '50%', padding: 5 },
  notesBlock: { width: '50%', padding: 5 },
  bankRow: { flexDirection: 'row', marginBottom: 2 },
  bankHeading: { fontSize: 8.7, fontFamily: 'Helvetica-Bold', textDecoration: 'underline' },
  bankLabel: { width: 58, fontSize: 8.8, fontFamily: 'Helvetica-Bold' },
  bankValue: { fontSize: 8.8 },
  qrTitle: { textAlign: 'center', fontFamily: 'Helvetica-Bold', textDecoration: 'underline', fontSize: 8.8 },
  qr: { width: 64, height: 64, objectFit: 'contain', marginTop: 3 },
  terms: { marginTop: 3 },
  sectionHeading: { fontSize: 7.8, fontFamily: 'Helvetica-Bold', textDecoration: 'underline' },
  sectionLine: { fontSize: 7.8, lineHeight: 1.1 },
  footer: { flexDirection: 'row', height: 25 },
  footerCell: { width: '33.33%', padding: 5, fontSize: 8.4, fontFamily: 'Helvetica-Bold' },
  footerCenter: { textAlign: 'center', fontFamily: 'Helvetica' },
  footerRight: { textAlign: 'right' },
  receiptPage: { padding: 8, fontSize: 7.5, fontFamily: 'Helvetica', color: '#111', backgroundColor: '#fff' },
  receiptHeader: { alignItems: 'center', borderBottom: LIGHT_BORDER, paddingBottom: 5, marginBottom: 5 },
  receiptLogo: { width: 34, height: 34, objectFit: 'contain', marginBottom: 3 },
  receiptBusiness: { fontFamily: 'Helvetica-Bold', fontSize: 10, textAlign: 'center', marginBottom: 2 },
  receiptText: { fontSize: 7, textAlign: 'center', lineHeight: 1.15 },
  receiptTitle: { fontFamily: 'Helvetica-Bold', fontSize: 8.5, textAlign: 'center', marginBottom: 5 },
  receiptSection: { borderBottom: LIGHT_BORDER, paddingBottom: 5, marginBottom: 5 },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 4, marginBottom: 2 },
  receiptLabel: { color: '#444', fontSize: 7 },
  receiptValue: { fontFamily: 'Helvetica-Bold', fontSize: 7, textAlign: 'right', flex: 1 },
  receiptPartyName: { fontFamily: 'Helvetica-Bold', fontSize: 7.5, marginTop: 2 },
  receiptTableHeader: { flexDirection: 'row', borderBottom: LIGHT_BORDER, paddingBottom: 3, marginBottom: 2 },
  receiptTableRow: { flexDirection: 'row', paddingVertical: 2 },
  receiptItem: { width: '43%', paddingRight: 3 },
  receiptQty: { width: '13%', textAlign: 'right' },
  receiptRate: { width: '20%', textAlign: 'right' },
  receiptAmt: { width: '24%', textAlign: 'right' },
  receiptItemName: { fontFamily: 'Helvetica-Bold', fontSize: 7.2 },
  receiptItemSub: { fontSize: 6.6, color: '#444' },
  receiptTotals: { borderTop: LIGHT_BORDER, paddingTop: 5, marginTop: 4 },
  receiptAfterTotals: { marginTop: 8 },
  receiptGrand: { fontFamily: 'Helvetica-Bold', fontSize: 8.5 },
  receiptWords: { fontSize: 6.8, lineHeight: 1.15 },
  receiptQr: { width: 52, height: 52, objectFit: 'contain', alignSelf: 'center', marginTop: 4 },
  receiptFooter: { textAlign: 'center', fontSize: 6.8, marginTop: 6 },
  normalOptionalArea: { height: 184, borderBottom: BORDER, flexDirection: 'row', flexWrap: 'wrap' },
  normalOptionalFull: { width: '100%', padding: 4, borderBottom: LIGHT_BORDER },
  normalOptionalHalf: { width: '50%', padding: 5 },
  normalOptionalQr: { width: '25%', padding: 5, alignItems: 'center' },
  normalOptionalBlankFull: { width: '100%', minHeight: 28, borderBottom: LIGHT_BORDER },
  normalOptionalBlankHalf: { width: '50%', minHeight: 50 },
  normalOptionalBlankQr: { width: '25%', minHeight: 70 },
  receiptBlank: { height: 34 },
  receiptQrBlank: { height: 58 },
  receiptFooterBlank: { height: 14 },
});

const money = (value) => Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const clean = (value) => (value === undefined || value === null ? '' : String(value));

function MetaRow({ label, value }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.colon}>:</Text>
      <Text style={styles.metaValue}>{clean(value)}</Text>
    </View>
  );
}

function MetaRowRight({ label, value }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.colon}>:</Text>
      <Text style={styles.metaValueRight}>{clean(value)}</Text>
    </View>
  );
}

function CustomerInfo({ label, value, bold = false }) {
  if (!value) return null;
  return (
    <View style={styles.customerInfoRow}>
      <Text style={styles.customerInfoLabel}>{label}</Text>
      <Text style={styles.customerInfoColon}>:</Text>
      <Text style={[styles.customerInfoValue, bold ? styles.bold : null]}>{clean(value)}</Text>
    </View>
  );
}

function BankRow({ label, value }) {
  if (!value) return null;
  return (
    <View style={styles.bankRow}>
      <Text style={styles.bankLabel}>{label}</Text>
      <Text style={styles.bankValue}>: {clean(value)}</Text>
    </View>
  );
}

export function InvoiceReactPdfDocument({ data }) {
  const d = data || {};
  const items = d.visibleItems || [];
  const taxRows = d.taxRows || [];
  const taxSummary = d.taxSummary || [];
  const bankRows = d.visibleBankRows || [];
  const bottomOnNextPage = items.length >= 9;
  const isThermal80 = d.isThermal80 || d.printFormat === 'thermal80' || d.invoicePrintFormat === 'thermal80';
  const thermalTemplate = d.invoiceThermalTemplate || getInvoiceThermalTemplate(d) || 'standard';
  const isPurchaseDocument = Boolean(d.isPurchaseDocument);
  const descStyle = isPurchaseDocument ? styles.purchaseDesc : styles.desc;
  const printFormat = isThermal80 ? 'thermal80' : 'normal';
  const design = getInvoiceDesignSettings({
    invoicePrintFormat: printFormat,
    invoiceDesignSettings: d.invoiceDesignSettings,
  }, printFormat);
  const normalTemplate = isThermal80 ? '' : (design.template || d.invoiceNormalTemplate || 'professional');
  const designDimensions = getInvoiceDesignDimensions(printFormat);
  const pageSize = isThermal80 ? { width: 226.77, height: 455 } : 'A4';
  const pagePadding = isThermal80 ? 8 : 13;
  const customPageWidth = isThermal80 ? 226.77 : 595.28;
  const customBodyWidth = customPageWidth - pagePadding * 2;
  const customBodyHeight = isThermal80 ? Math.max(430, designDimensions.height * (customBodyWidth / designDimensions.width)) : 816;
  const normalOptionalBlockOrder = ['amountWords', 'bank', 'paymentQr', 'terms', 'notes', 'signature', 'footer'];
  const thermalOptionalBlockOrder = ['amountWords', 'notes', 'signature', 'footer'];
  const optionalBlockOrder = isThermal80 ? thermalOptionalBlockOrder : normalOptionalBlockOrder;
  const displayNewBalance = Number(d.newBalance ?? ((Number(d.oldBalance) || 0) + (Number(d.finalTotal) || 0))) || 0;

  function customSectionVisible(key) {
    if (isThermal80 && ['bank', 'paymentQr', 'terms'].includes(key)) return false;
    const element = design.elements[key];
    if (!element?.visible) return false;
    if (key === 'bank') return bankRows.length > 0;
    if (key === 'paymentQr') return Boolean(d.showPaymentQr && d.qrSrc);
    if (key === 'terms') return Boolean(d.showTerms && (d.termLines || []).length);
    if (key === 'notes') return Boolean(d.showNotes && (d.noteLines || []).length);
    if (key === 'amountWords') return d.showAmountWords !== false;
    if (key === 'signature') return d.showSignature !== false;
    if (key === 'footer') return d.showGoBookBranding !== false;
    return true;
  }

  function customBoxStyle(key, extra = {}) {
    const element = design.elements[key];
    return {
      position: 'absolute',
      left: (element.x / designDimensions.width) * customBodyWidth,
      top: (element.y / designDimensions.height) * customBodyHeight,
      width: (element.w / designDimensions.width) * customBodyWidth,
      height: (element.h / designDimensions.height) * customBodyHeight,
      overflow: 'hidden',
      zIndex: element.z || 1,
      ...extra,
    };
  }

  const customText = { fontSize: isThermal80 ? 7 : 9, lineHeight: 1.18 };
  const customSmall = { fontSize: isThermal80 ? 6.4 : 8, lineHeight: 1.15 };
  const a4Box = isThermal80 ? {} : { border: LIGHT_BORDER, backgroundColor: '#fff' };
  const a4HeaderCell = { padding: 3, borderRight: LIGHT_BORDER, fontFamily: 'Helvetica-Bold', backgroundColor: '#f3f4f6' };
  const a4Cell = { padding: 3, borderTop: LIGHT_BORDER, borderRight: LIGHT_BORDER };

  function renderCustomSection(key) {
    if (!customSectionVisible(key)) return null;
    if (key === 'header') {
      return (
        <View key={key} style={customBoxStyle(key, { ...a4Box, alignItems: 'center', padding: isThermal80 ? 3 : 6 })}>
          {d.showLogo && d.logoSrc ? <Image src={d.logoSrc} style={{ width: isThermal80 ? 28 : 44, height: isThermal80 ? 28 : 44, objectFit: 'contain', marginBottom: 2 }} /> : null}
          <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: isThermal80 ? 9.4 : 12.5, textAlign: 'center' }}>{d.businessName || 'GoBook'}</Text>
          {d.businessDescription ? <Text style={[customSmall, { textAlign: 'center' }]}>{d.businessDescription}</Text> : null}
          {(d.businessAddress || []).slice(0, isThermal80 ? 3 : 4).map((line) => <Text key={line} style={[customSmall, { textAlign: 'center' }]}>{line}</Text>)}
          {d.bizPhone ? <Text style={[customSmall, { textAlign: 'center' }]}>Phone: {d.bizPhone}</Text> : null}
          {d.bizGstin ? <Text style={[customSmall, { textAlign: 'center' }]}>GSTIN: {d.bizGstin}</Text> : null}
        </View>
      );
    }
    if (key === 'title') {
      return <View key={key} style={customBoxStyle(key, { alignItems: 'center', justifyContent: 'center', border: LIGHT_BORDER, backgroundColor: isThermal80 ? '#fff' : '#f8fafc' })}><Text style={{ fontFamily: 'Helvetica-Bold', fontSize: isThermal80 ? 8.8 : 15 }}>{d.previewTitle || 'TAX INVOICE'}</Text></View>;
    }
    if (key === 'meta') {
      return (
        <View key={key} style={customBoxStyle(key, { ...a4Box, padding: isThermal80 ? 4 : 7 })}>
          <View style={styles.receiptRow}><Text style={customText}>No</Text><Text style={[customText, styles.bold]}>{clean(d.leftMeta?.[0]?.value)}</Text></View>
          <View style={styles.receiptRow}><Text style={customText}>Date</Text><Text style={[customText, styles.bold]}>{clean(d.rightMeta?.[0]?.value)}</Text></View>
          <View style={styles.receiptRow}><Text style={customText}>Payment</Text><Text style={[customText, styles.bold]}>{clean(d.rightMeta?.[2]?.value)}</Text></View>
          {!isThermal80 ? <View style={styles.receiptRow}><Text style={customText}>GSTIN</Text><Text style={[customText, styles.bold]}>{clean(d.bizGstin)}</Text></View> : null}
        </View>
      );
    }
    if (key === 'party') {
      return (
        <View key={key} style={customBoxStyle(key, { ...a4Box, padding: isThermal80 ? 4 : 7 })}>
          <Text style={[customText, styles.bold]}>{d.customerName ? 'Customer' : 'Customer'}</Text>
          <Text style={[customText, styles.bold]}>{d.customerName || 'Walk-in Customer'}</Text>
          {d.customerPhone ? <Text style={customSmall}>Mobile: {d.customerPhone}</Text> : null}
          {d.customerGstin ? <Text style={customSmall}>GSTIN: {d.customerGstin}</Text> : null}
        </View>
      );
    }
    if (key === 'items') {
      return (
        <View key={key} style={customBoxStyle(key, { border: LIGHT_BORDER })}>
          <View style={{ flexDirection: 'row', borderBottom: LIGHT_BORDER }}>
            <Text style={[customSmall, a4HeaderCell, { width: '8%', textAlign: 'center' }]}>#</Text>
            <Text style={[customSmall, a4HeaderCell, { width: '42%' }]}>Item</Text>
            <Text style={[customSmall, a4HeaderCell, { width: '12%', textAlign: 'right' }]}>Qty</Text>
            <Text style={[customSmall, a4HeaderCell, { width: '18%', textAlign: 'right' }]}>Rate</Text>
            <Text style={[customSmall, { ...a4HeaderCell, borderRightWidth: 0 }, { width: '20%', textAlign: 'right' }]}>Amount</Text>
          </View>
          {items.slice(0, isThermal80 ? 8 : 14).map((item, i) => (
            <View key={item.key || i} style={{ flexDirection: 'row', minHeight: isThermal80 ? 12 : 18 }}>
              <Text style={[customSmall, a4Cell, { width: '8%', textAlign: 'center' }]}>{i + 1}</Text>
              <View style={[a4Cell, { width: '42%' }]}>
                <Text style={[customSmall, styles.bold]}>{item.title || '-'}</Text>
                {(item.lines || []).slice(1, 2).map((line, lineIndex) => <Text style={customSmall} key={`${line}-${lineIndex}`}>{line}</Text>)}
              </View>
              <Text style={[customSmall, a4Cell, { width: '12%', textAlign: 'right' }]}>{item.qty || ''}</Text>
              <Text style={[customSmall, a4Cell, { width: '18%', textAlign: 'right' }]}>{money(item.rate)}</Text>
              <Text style={[customSmall, { ...a4Cell, borderRightWidth: 0 }, { width: '20%', textAlign: 'right' }]}>{money(item.amount)}</Text>
            </View>
          ))}
          {Array.from({ length: Math.max(0, (isThermal80 ? 4 : 8) - items.length) }).map((_, index) => (
            <View key={`blank-${index}`} style={{ flexDirection: 'row', minHeight: isThermal80 ? 10 : 16 }}>
              <Text style={[customSmall, a4Cell, { width: '8%' }]} />
              <Text style={[customSmall, a4Cell, { width: '42%' }]} />
              <Text style={[customSmall, a4Cell, { width: '12%' }]} />
              <Text style={[customSmall, a4Cell, { width: '18%' }]} />
              <Text style={[customSmall, { ...a4Cell, borderRightWidth: 0 }, { width: '20%' }]} />
            </View>
          ))}
        </View>
      );
    }
    if (key === 'totals') {
      return (
        <View key={key} style={customBoxStyle(key, { ...a4Box, padding: isThermal80 ? 4 : 7 })}>
          <View style={styles.receiptRow}><Text style={customText}>Subtotal</Text><Text style={customText}>{money(d.taxableTotal ?? ((Number(d.finalTotal) || 0) - (Number(d.roundOff) || 0)))}</Text></View>
          {!isThermal80 && (d.taxRows || []).slice(0, 4).map((row) => <View key={row.label} style={styles.receiptRow}><Text style={customText}>{row.label}</Text><Text style={customText}>{money(row.amount)}</Text></View>)}
          {Number(d.roundOff) ? <View style={styles.receiptRow}><Text style={customText}>Round Off</Text><Text style={customText}>{money(d.roundOff)}</Text></View> : null}
          <View style={[styles.receiptRow, { borderTop: LIGHT_BORDER, paddingTop: 3, marginTop: 3 }]}><Text style={[customText, styles.bold]}>Total</Text><Text style={[customText, styles.bold]}>{money(d.finalTotal)}</Text></View>
        </View>
      );
    }
    if (key === 'amountWords') {
      return <View key={key} style={customBoxStyle(key, { padding: 3 })}><Text style={customSmall}>Amount in words</Text><Text style={[customSmall, styles.bold]}>{d.amountWords}</Text></View>;
    }
    if (key === 'bank') {
      return <View key={key} style={customBoxStyle(key, { padding: 3 })}><Text style={[customSmall, styles.bold]}>Bank Details</Text>{bankRows.map(([label, value]) => <Text key={label} style={customSmall}>{label}: {clean(value)}</Text>)}</View>;
    }
    if (key === 'paymentQr') {
      return <View key={key} style={customBoxStyle(key, { alignItems: 'center', padding: 2 })}><Image src={d.qrSrc} style={{ width: isThermal80 ? 48 : 62, height: isThermal80 ? 48 : 62, objectFit: 'contain' }} /><Text style={customSmall}>Scan to Pay</Text></View>;
    }
    if (key === 'terms') {
      return <View key={key} style={customBoxStyle(key, { padding: 3 })}><Text style={[customSmall, styles.bold]}>Terms</Text>{(d.termLines || []).slice(0, 4).map((line, i) => <Text key={`${line}-${i}`} style={customSmall}>{i + 1}. {line}</Text>)}</View>;
    }
    if (key === 'notes') {
      return <View key={key} style={customBoxStyle(key, { padding: 3 })}><Text style={[customSmall, styles.bold]}>Notes</Text>{(d.noteLines || []).slice(0, 4).map((line, i) => <Text key={`${line}-${i}`} style={customSmall}>{line}</Text>)}</View>;
    }
    if (key === 'signature') {
      return <View key={key} style={customBoxStyle(key, { justifyContent: 'flex-end', alignItems: 'flex-end', padding: 3 })}><Text style={customSmall}>Authorized Signatory</Text></View>;
    }
    if (key === 'footer') {
      return <View key={key} style={customBoxStyle(key, { alignItems: 'center', justifyContent: 'center' })}><Text style={customSmall}>This is a Computer Generated {d.previewTitle || 'TAX INVOICE'}</Text></View>;
    }
    return null;
  }

  function renderThermalOptionalBlock(key) {
    const blankStyle = key === 'paymentQr' ? styles.receiptQrBlank : (key === 'signature' || key === 'footer' ? styles.receiptFooterBlank : styles.receiptBlank);
    if (key === 'amountWords' && d.showAmountWords) {
      return (
        <View key={key} style={[styles.receiptSection, styles.receiptAfterTotals]}>
          <Text style={styles.receiptLabel}>Amount in words</Text>
          <Text style={styles.receiptWords}>{d.amountWords}</Text>
        </View>
      );
    }
    if (key === 'bank' && d.showBankDetails !== false) {
      return (
        <View key={key} style={[styles.receiptSection, d.showAmountWords ? null : styles.receiptAfterTotals]}>
          <Text style={styles.bold}>Bank Details</Text>
          {bankRows.map(([label, value]) => <Text key={label} style={styles.receiptText}>{label}: {clean(value)}</Text>)}
        </View>
      );
    }
    if (key === 'paymentQr' && d.showPaymentQr && d.qrSrc) {
      return <Image key={key} src={d.qrSrc} style={styles.receiptQr} />;
    }
    if (key === 'terms' && d.showTerms) {
      return (d.termLines || []).slice(0, 4).map((line, i) => <Text key={`${key}-${line}-${i}`} style={styles.receiptWords}>{i + 1}. {line}</Text>);
    }
    if (key === 'notes' && d.showNotes) {
      return (d.noteLines || []).slice(0, 4).map((line, i) => <Text key={`${key}-${line}-${i}`} style={styles.receiptWords}>{line}</Text>);
    }
    if (key === 'signature' && d.showSignature) {
      return <Text key={key} style={styles.receiptFooter}>Authorized Signatory</Text>;
    }
    if (key === 'footer' && d.showGoBookBranding) {
      return <Text key={key} style={styles.receiptFooter}>This is a Computer Generated {d.previewTitle || 'TAX INVOICE'}</Text>;
    }
    return <View key={key} style={blankStyle} />;
  }

  function renderNormalOptionalBlock(key) {
    if (key === 'amountWords' && d.showAmountWords) {
      return <View key={key} style={[styles.normalOptionalFull, styles.words]}><Text style={styles.sectionLine}>Amount Chargeable (In Words)</Text><Text style={[styles.sectionLine, styles.bold]}>{d.amountWords}</Text></View>;
    }
    if (key === 'bank' && d.showBankDetails !== false) {
      return <View key={key} style={styles.normalOptionalHalf}><Text style={styles.bankHeading}>Bank Details:</Text>{bankRows.map(([label, value]) => <BankRow key={label} label={label} value={value} />)}</View>;
    }
    if (key === 'paymentQr' && d.showPaymentQr && d.qrSrc) {
      return <View key={key} style={styles.normalOptionalQr}><Text style={styles.qrTitle}>UPI Payment QR Code</Text><Image src={d.qrSrc} style={styles.qr} /></View>;
    }
    if (key === 'terms' && d.showTerms) {
      return <View key={key} style={styles.normalOptionalHalf}><Text style={styles.sectionHeading}>Terms & Condition:</Text>{(d.termLines || []).slice(0, 5).map((line, i) => <Text key={`${line}-${i}`} style={styles.sectionLine}>{i + 1}. {line}</Text>)}</View>;
    }
    if (key === 'notes' && d.showNotes) {
      return <View key={key} style={styles.normalOptionalHalf}><Text style={styles.sectionHeading}>Notes:</Text>{(d.noteLines || []).slice(0, 4).map((line, i) => <Text key={`${line}-${i}`} style={styles.sectionLine}>{line}</Text>)}</View>;
    }
    if (key === 'amountWords' || key === 'footer' || key === 'signature') {
      return <View key={key} style={styles.normalOptionalBlankFull} />;
    }
    if (key === 'paymentQr') {
      return <View key={key} style={styles.normalOptionalBlankQr} />;
    }
    return <View key={key} style={styles.normalOptionalBlankHalf} />;
  }

  if (isThermal80) {
    const thermalNoteLines = d.showNotes ? (d.noteLines || []) : [];
    const receiptItemLines = items.reduce((sum, item) => sum + Math.max(1, (item.lines || []).length), 0);
    const receiptHeight = Math.max(280, 150 + items.length * 12 + receiptItemLines * 8 + thermalNoteLines.length * 8);

    if (thermalTemplate === 'boxed') {
      return (
        <Document title={d.filename || 'Invoice'}>
          <Page size={{ width: 226.77, height: Math.max(390, 168 + items.length * 13 + taxRows.length * 10) }} style={styles.receiptPage} wrap={false}>
            <View style={{ border: LIGHT_BORDER, padding: 12, minHeight: 350 }}>
              <View style={{ alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 10.5 }}>{d.businessName || 'GoBook'}</Text>
                {(d.businessAddress || []).slice(0, 2).map((line) => <Text key={line} style={styles.receiptText}>{line}</Text>)}
                {d.bizPhone ? <Text style={styles.receiptText}>Phone: {d.bizPhone}</Text> : null}
              </View>

              <Text style={{ textAlign: 'center', fontSize: 11.5, marginBottom: 9 }}>{d.previewTitle || 'TAX INVOICE'}</Text>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontSize: 7.8 }}>Invoice#: {clean(d.leftMeta?.[0]?.value)}</Text>
                <Text style={{ fontSize: 7.8 }}>Date: {clean(d.rightMeta?.[0]?.value)}</Text>
              </View>

              <View style={{ borderTop: LIGHT_BORDER, borderBottom: LIGHT_BORDER, paddingVertical: 5, marginBottom: 6 }}>
                <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                  <Text style={{ width: '8%', fontSize: 7.4 }}>#</Text>
                  <Text style={{ width: '40%', fontSize: 7.4 }}>Item</Text>
                  <Text style={{ width: '14%', fontSize: 7.4, textAlign: 'right' }}>Qty</Text>
                  <Text style={{ width: '18%', fontSize: 7.4, textAlign: 'right' }}>Rate</Text>
                  <Text style={{ width: '20%', fontSize: 7.4, textAlign: 'right' }}>Amount</Text>
                </View>
                {items.map((item, i) => (
                  <View key={item.key || i} style={{ flexDirection: 'row', paddingTop: 2 }}>
                    <Text style={{ width: '8%', fontSize: 7.4 }}>{i + 1}</Text>
                    <Text style={{ width: '40%', fontSize: 7.4 }}>{item.title || '-'}</Text>
                    <Text style={{ width: '14%', fontSize: 7.4, textAlign: 'right' }}>{item.qty || ''}</Text>
                    <Text style={{ width: '18%', fontSize: 7.4, textAlign: 'right' }}>{money(item.rate)}</Text>
                    <Text style={{ width: '20%', fontSize: 7.4, textAlign: 'right' }}>{money(item.amount)}</Text>
                  </View>
                ))}
              </View>

              <View style={{ borderBottom: LIGHT_BORDER, paddingBottom: 6, marginBottom: 6 }}>
                <View style={styles.receiptRow}><Text style={styles.receiptText}>Sub Total</Text><Text style={styles.receiptText}>{money(d.taxableTotal)}</Text></View>
                {taxRows.map((row) => <View key={row.label} style={styles.receiptRow}><Text style={styles.receiptText}>{row.label}</Text><Text style={styles.receiptText}>{money(row.amount)}</Text></View>)}
                {Number(d.roundOff) ? <View style={styles.receiptRow}><Text style={styles.receiptText}>Round Off</Text><Text style={styles.receiptText}>{money(d.roundOff)}</Text></View> : null}
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderBottom: LIGHT_BORDER, paddingBottom: 8 }}>
                <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 14 }}>TOTAL</Text>
                <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 14 }}>{money(d.finalTotal)}</Text>
              </View>

              <Text style={{ textAlign: 'center', fontSize: 12, marginTop: 18 }}>Thank you!</Text>
              {d.showGoBookBranding ? <Text style={styles.receiptFooter}>This is a Computer Generated {d.previewTitle || 'TAX INVOICE'}</Text> : null}
            </View>
          </Page>
        </Document>
      );
    }

    return (
      <Document title={d.filename || 'Invoice'}>
        <Page size={{ width: 226.77, height: receiptHeight }} style={styles.receiptPage} wrap={false}>
          <View style={styles.receiptHeader}>
            {d.showLogo && d.logoSrc ? <Image src={d.logoSrc} style={styles.receiptLogo} /> : null}
            <Text style={styles.receiptBusiness}>{d.businessName || 'GoBook'}</Text>
            {d.businessDescription ? <Text style={styles.receiptText}>{d.businessDescription}</Text> : null}
            {(d.businessAddress || []).slice(0, 4).map((line) => <Text key={line} style={styles.receiptText}>{line}</Text>)}
            {d.bizPhone ? <Text style={styles.receiptText}>Phone: {d.bizPhone}</Text> : null}
            {d.bizGstin ? <Text style={styles.receiptText}>GSTIN: {d.bizGstin}</Text> : null}
          </View>

          <Text style={styles.receiptTitle}>{d.previewTitle || 'TAX INVOICE'}</Text>

          <View style={styles.receiptSection}>
            <View style={styles.receiptRow}><Text style={styles.receiptLabel}>No</Text><Text style={styles.receiptValue}>{clean(d.leftMeta?.[0]?.value)}</Text></View>
            <View style={styles.receiptRow}><Text style={styles.receiptLabel}>Date</Text><Text style={styles.receiptValue}>{clean(d.rightMeta?.[0]?.value)}</Text></View>
            <View style={styles.receiptRow}><Text style={styles.receiptLabel}>Payment</Text><Text style={styles.receiptValue}>{clean(d.rightMeta?.[2]?.value)}</Text></View>
          </View>

          <View style={styles.receiptSection}>
            <Text style={styles.receiptLabel}>Customer</Text>
            <Text style={styles.receiptPartyName}>{d.customerName || 'Walk-in Customer'}</Text>
          </View>

          <View style={styles.receiptTableHeader}>
            <Text style={[styles.receiptItem, styles.bold]}>Item</Text>
            <Text style={[styles.receiptQty, styles.bold]}>Qty</Text>
            <Text style={[styles.receiptRate, styles.bold]}>Rate</Text>
            <Text style={[styles.receiptAmt, styles.bold]}>Amt</Text>
          </View>
          {items.map((item, i) => (
            <View style={styles.receiptTableRow} key={item.key || i}>
              <View style={styles.receiptItem}>
                <Text style={styles.receiptItemName}>{item.title || '-'}</Text>
                {(item.lines || []).slice(1).map((line, lineIndex) => <Text style={styles.receiptItemSub} key={`${line}-${lineIndex}`}>{line}</Text>)}
              </View>
              <Text style={styles.receiptQty}>{item.qty || ''}</Text>
              <Text style={styles.receiptRate}>{money(item.rate)}</Text>
              <Text style={styles.receiptAmt}>{money(item.amount)}</Text>
            </View>
          ))}

          <View style={styles.receiptTotals}>
            <View style={styles.receiptRow}><Text>Subtotal</Text><Text>{money((Number(d.finalTotal) || 0) - (Number(d.roundOff) || 0))}</Text></View>
            {Number(d.roundOff) ? <View style={styles.receiptRow}><Text>Round Off</Text><Text>{money(d.roundOff)}</Text></View> : null}
            <View style={styles.receiptRow}><Text style={styles.receiptGrand}>Total</Text><Text style={styles.receiptGrand}>{money(d.finalTotal)}</Text></View>
          </View>

          {optionalBlockOrder.map((key) => renderThermalOptionalBlock(key))}
        </Page>
      </Document>
    );
  }

  if (normalTemplate !== 'professional') {
    return (
      <Document title={d.filename || 'Invoice'}>
        <Page size="A4" style={styles.page} wrap={false}>
          <View style={{ position: 'relative', width: customBodyWidth, height: customBodyHeight, border: BORDER }}>
            {INVOICE_DESIGN_ELEMENTS
              .slice()
              .sort((a, b) => (design.elements[a.key]?.z || 0) - (design.elements[b.key]?.z || 0))
              .map((item) => renderCustomSection(item.key))}
          </View>
        </Page>
      </Document>
    );
  }

  const summarySection = (
    <>
      <View style={styles.summary}>
        <View style={styles.taxBox}>
          <Text style={styles.taxTitle}>TAX SUMMARY</Text>
          <View style={styles.taxHeader}><Text style={styles.taxCol}>GST</Text><Text style={styles.taxCol}>Taxable</Text><Text style={styles.taxCol}>CGST</Text><Text style={styles.taxCol}>SGST</Text><Text style={styles.taxCol}>Total Tax</Text></View>
          {(taxSummary.length ? taxSummary : [{ rate: 0, taxable: d.taxableTotal, cgst: 0, sgst: 0, totalTax: 0 }]).map((row) => (
            <View key={row.rate} style={styles.taxRow}><Text style={styles.taxCol}>{row.rate}%</Text><Text style={styles.taxCol}>{money(row.taxable)}</Text><Text style={styles.taxCol}>{money(row.cgst)}</Text><Text style={styles.taxCol}>{money(row.sgst)}</Text><Text style={styles.taxCol}>{money(row.totalTax)}</Text></View>
          ))}
        </View>
        <View style={styles.totalBox}>
          <View style={styles.totalLine}><Text style={styles.totalLabel}>Roundup</Text><Text style={styles.totalValue}>{money(d.roundOff)}</Text></View>
          <View style={styles.grandLine}><Text style={styles.grandLabel}>Grand Total</Text><Text style={styles.grandValue}>{money(d.finalTotal)}</Text></View>
        </View>
      </View>

    </>
  );

  const bottomSection = (
    <>
      <View style={styles.normalOptionalArea}>
        {optionalBlockOrder.map((key) => renderNormalOptionalBlock(key))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerCell}>{d.showSignature ? 'Buyer Seal And Signature' : ''}</Text>
        <Text style={[styles.footerCell, styles.footerCenter]}>{d.showGoBookBranding ? 'This is a Computer Generated TAX INVOICE' : ''}</Text>
        <Text style={[styles.footerCell, styles.footerRight]}>{d.showSignature ? 'Authorized Signatory' : ''}</Text>
      </View>
    </>
  );

  return (
    <Document title={d.filename || 'Invoice'}>
      <Page size="A4" style={styles.page} wrap={false}>
        <View style={styles.sheet}>
          <View style={styles.titleBar}>
            <Text style={styles.title}>{d.previewTitle || 'TAX INVOICE'}</Text>
            <Text style={styles.copy}>{bottomOnNextPage ? 'Original for Recipient (Page 1/2)' : 'Original for Recipient (Page 1/1)'}</Text>
          </View>

          <View style={styles.top}>
            <View style={styles.partyColumn}>
              <View style={styles.companyBlock}>
                {d.showLogo && d.logoSrc ? <Image src={d.logoSrc} style={styles.logo} /> : d.showLogo ? <View style={styles.logoFallback}><Text style={styles.bold}>{d.initials || ''}</Text></View> : null}
                <View style={styles.companyText}>
                  <Text style={[styles.bold, { fontSize: 15, lineHeight: 1.05 }]}>{d.businessName || 'FLASHY\nENTERPRISES'}</Text>
                  {(d.businessDescription ? [d.businessDescription] : []).map((line) => <Text key={line} style={styles.tiny}>{line}</Text>)}
                  {(d.businessAddress || []).slice(0, 4).map((line) => <Text key={line} style={styles.tiny}>{line}</Text>)}
                  {d.bizPhone ? <Text style={styles.tiny}>{d.bizPhone}</Text> : null}
                  {d.bizEmail ? <Text style={styles.tiny}>{d.bizEmail}</Text> : null}
                  {d.bizGstin ? <Text style={{ fontSize: 8.9, marginTop: 2 }}>GSTIN: {d.bizGstin}</Text> : null}
                </View>
              </View>
              <View style={styles.customerBlock}>
                <Text style={styles.blockLabel}>Customer</Text>
                <Text style={styles.customerName}>{d.customerName || ''}</Text>
                {(d.customerAddress || []).slice(0, 4).map((line) => <Text key={line} style={styles.tiny}>{line}</Text>)}
                <CustomerInfo label="GSTIN" value={d.customerGstin} />
                <CustomerInfo label="POS" value={d.placeOfSupply || 'Tamil Nadu'} />
                <CustomerInfo label="Mobile" value={d.customerPhone} bold />
              </View>
            </View>

            <View style={styles.metaColumn}>
              <View style={styles.metaTop}>
                <View style={styles.metaHalf}>{(d.leftMeta || []).slice(0, 7).map((row) => <MetaRow key={row.label} label={row.label} value={row.value} />)}</View>
                <View style={styles.metaHalf}>{(d.rightMeta || []).slice(0, 7).map((row) => <MetaRowRight key={row.label} label={row.label} value={row.value} />)}</View>
              </View>
              <View style={styles.transaction}>
                <View style={styles.deliveryRow}>
                  <Text style={[styles.metaLabel, { width: 70 }]}>Delivery By</Text><Text style={styles.colon}>:</Text><Text style={{ flex: 1, fontSize: 9.4 }}>{d.deliveryBy || ''}</Text>
                  <Text style={[styles.metaLabel, { width: 48 }]}>LR No.</Text><Text style={styles.colon}>:</Text><Text style={{ flex: 1, fontSize: 9.4 }}>{d.lrNo || ''}</Text>
                </View>
                <Text style={styles.transactionTitle}>Last Transaction:</Text>
                <View style={styles.transRow}><Text style={styles.transLeft}>Closing Balance : (Debit) {money(displayNewBalance)}</Text></View>
                <View style={styles.transRow}><Text style={styles.transLeft}>Old Balance</Text><Text style={styles.transEq}>=</Text><Text style={styles.transVal}>(Debit) {money(d.oldBalance || 0)}</Text></View>
                <View style={styles.transRow}><Text style={styles.transLeft}>Adding this Invoice Amount</Text><Text style={styles.transEq}>=</Text><Text style={styles.transVal}>+{money(d.finalTotal)}</Text></View>
                <View style={styles.transRow}><Text style={[styles.transLeft, styles.bold]}>New Balance after this Invoice</Text><Text style={styles.transEq}>=</Text><Text style={styles.transValBold}>(Debit) {money(displayNewBalance)}</Text></View>
                <Text style={[styles.bold, { fontSize: 9.4 }]}>Invoice</Text>
              </View>
            </View>
          </View>

          <View style={[styles.itemsTable, bottomOnNextPage ? styles.itemsTableFullPage : null]}>
            <View style={styles.itemsHeader}>
              <Text style={[styles.th, styles.sn]}>S/{'\n'}N</Text>
              <Text style={[styles.th, descStyle]}>Description Of Goods / Service</Text>
              {isPurchaseDocument ? <Text style={[styles.th, styles.variant]}>Brand / Size /{'\n'}Material</Text> : null}
              <Text style={[styles.th, styles.hsn]}>HSN/SAC</Text>
              <Text style={[styles.th, styles.gst]}>GST</Text>
              <Text style={[styles.th, styles.qty]}>Billed{'\n'}Quantity</Text>
              {!isPurchaseDocument ? <Text style={[styles.th, styles.uqc]}>UQC</Text> : null}
              <Text style={[styles.th, styles.price]}>Price</Text>
              <Text style={[styles.th, styles.priceGst]}>Price With{'\n'}GST</Text>
              <Text style={[styles.th, styles.amount, styles.noRight]}>Amount</Text>
            </View>
            <View style={styles.itemRows}>
              {items.map((item, i) => (
                <View style={styles.bodyRow} key={item.key || i}>
                  <Text style={[styles.cell, styles.sn]}>{i + 1})</Text>
                  <View style={[styles.cell, descStyle]}>
                    <Text style={styles.itemTitle}>{item.title || '-'}</Text>
                    {(item.lines || []).slice(1).map((line, lineIndex) => <Text style={styles.itemSub} key={`${line}-${lineIndex}`}>{line}</Text>)}
                  </View>
                  {isPurchaseDocument ? <Text style={[styles.cell, styles.variant, styles.center]}>{item.variant || '-'}</Text> : null}
                  <Text style={[styles.cell, styles.hsn, styles.center]}>{item.hsn || ''}</Text>
                  <Text style={[styles.cell, styles.gst, styles.center]}>{item.gst || ''}</Text>
                  <Text style={[styles.cell, styles.qty, styles.center]}>{item.qty || ''}</Text>
                  {!isPurchaseDocument ? <Text style={[styles.cell, styles.uqc, styles.center]}>{item.unit || ''}</Text> : null}
                  <Text style={[styles.cell, styles.price, styles.right]}>{money(item.rate)}</Text>
                  <Text style={[styles.cell, styles.priceGst, styles.right]}>{money(item.priceWithGst)}</Text>
                  <Text style={[styles.cell, styles.amount, styles.noRight, styles.right, styles.bold]}>{money(item.amount)}</Text>
                </View>
              ))}
            </View>
            <View style={styles.itemBlank}>
              <View style={[styles.cell, styles.sn]} />
              <View style={[styles.cell, descStyle, { position: 'relative' }]}>
                <View style={styles.bottomTaxLabels}>{taxRows.map((row) => <Text key={row.label}>{row.label}</Text>)}</View>
              </View>
              {isPurchaseDocument ? <View style={[styles.cell, styles.variant]} /> : null}
              <View style={[styles.cell, styles.hsn]} />
              <View style={[styles.cell, styles.gst]} />
              <View style={[styles.cell, styles.qty]} />
              {!isPurchaseDocument ? <View style={[styles.cell, styles.uqc]} /> : null}
              <View style={[styles.cell, styles.price]} />
              <View style={[styles.cell, styles.priceGst]} />
              <View style={[styles.cell, styles.amount, styles.noRight, { justifyContent: 'flex-end' }]}>
                <Text style={styles.right}>{money(d.taxableTotal)}</Text>
                {taxRows.map((row) => <Text key={row.label} style={styles.right}>{money(row.amount)}</Text>)}
              </View>
            </View>
          </View>

          {summarySection}
          {!bottomOnNextPage && bottomSection}
        </View>
      </Page>
      {bottomOnNextPage && (
        <Page size="A4" style={styles.page} wrap={false}>
          <View style={styles.sheet}>
            {bottomSection}
          </View>
        </Page>
      )}
    </Document>
  );
}
