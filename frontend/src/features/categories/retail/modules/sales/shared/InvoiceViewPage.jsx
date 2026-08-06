import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Download, Printer, Send, Wallet, Trash2, IndianRupee } from 'lucide-react';
import { api } from '../../../../../../services/api.js';
import { SelectDropdown } from '../../../../../../components/forms/SelectDropdown.jsx';
import { documentConfigs } from '../documentConfigs.js';
import { DocumentPreviewModal } from './DocumentPreviewModal.jsx';
import { RecordPaymentModal } from './RecordPaymentModal.jsx';
import { ShareModal } from './ShareModal.jsx';
import { getInvoicePrintTemplate, setInvoicePrintTemplate } from './invoiceTemplatePreference.js';

function fmt(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function calcTotals(items = [], charges = [], additionalDiscount, tds, tcs, advanceReceived, showGst = true) {
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

function applySavedTotalOverride(calculatedTotals, savedTotals) {
  if (!savedTotals?.manualTotalOverride) return calculatedTotals;
  const finalTotal = Number(savedTotals.finalTotal ?? savedTotals.manualTotal);
  if (!Number.isFinite(finalTotal) || finalTotal < 0) return calculatedTotals;
  return {
    ...calculatedTotals,
    calculatedFinalTotal: savedTotals.calculatedFinalTotal ?? calculatedTotals.finalTotal,
    finalTotal,
    manualTotal: finalTotal,
    manualTotalOverride: true,
    roundOff: finalTotal - calculatedTotals.netPayable,
    balanceDue: calculatedTotals.balanceDue + (finalTotal - calculatedTotals.finalTotal),
  };
}

function normalizeProduct(product = {}) {
  const description = product.description || product.name || product.productName || '';
  return {
    ...product,
    _id: product._id ?? product.id ?? description,
    id: product.id ?? product._id ?? description,
    description,
    code: product.code || product.sku || '',
    productDescription: product.productDescription
      || product.itemDescription
      || product.lineDescription
      || product.details
      || product.note
      || product.remark
      || '',
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

export function InvoiceViewPage({ invoiceId, documentType = 'invoice' }) {
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bizSettings, setBizSettings] = useState({});
  const [payments, setPayments] = useState([]);
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [downloadPdfMode, setDownloadPdfMode] = useState(false);
  const [printTemplate, setPrintTemplate] = useState(() => getInvoicePrintTemplate());
  const [products, setProducts] = useState([]);

  const config = documentConfigs[documentType] ?? documentConfigs.invoice;
  const listRoute = ({
    invoice: '/billing/invoice',
    'bill-of-supply': '/billing/bill-of-supply',
    quotation: '/billing/quotation',
    'purchase-order': '/billing/purchase-order',
    'purchase-entry': '/billing/purchase-entry',
    'credit-note': '/billing/credit-note',
    'debit-note': '/billing/debit-note',
    'sales-return': '/billing/sales-return',
    proforma: '/billing/proforma',
    'delivery-challan': '/billing/delivery-challan',
    'e-invoice': '/billing/e-invoice',
    'e-way-bill': '/billing/e-way-bill',
    'pharmacy-bill': '/billing/pharmacy-bill',
  })[documentType] ?? '/billing/invoice';

  useEffect(() => {
    api.getSettings().then(setBizSettings).catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    api.invListProducts()
      .then((res) => {
        const rows = Array.isArray(res) ? res : res?.data;
        if (active) setProducts(Array.isArray(rows) ? rows.map(normalizeProduct) : []);
      })
      .catch(() => {
        if (active) setProducts([]);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = documentType === 'credit-note'
          ? await api.getCreditNote(invoiceId)
          : await api.getInvoice(invoiceId);
        if (active) setInvoice(data);
      } catch (err) {
        if (active) setError(err.message || 'Unable to load document');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [invoiceId, documentType]);

  async function loadPayments() {
    if (!['invoice', 'bill-of-supply', 'pharmacy-bill'].includes(documentType)) return;
    try {
      const res = await api.listPayments(invoiceId);
      setPayments(res.payments ?? []);
      setPaymentSummary({ invoiceTotal: res.invoiceTotal, totalPaid: res.totalPaid, balance: res.balance });
    } catch {
      // Payment history should not block invoice rendering.
    }
  }

  useEffect(() => { loadPayments(); }, [invoiceId, documentType]);

  useEffect(() => {
    setInvoicePrintTemplate(printTemplate);
  }, [printTemplate]);

  async function handleDeletePayment(paymentId) {
    if (!window.confirm('Delete this payment record?')) return;
    setDeletingId(paymentId);
    try {
      await api.deletePayment(paymentId);
      await loadPayments();
    } catch (err) {
      alert(err.message || 'Failed to delete payment');
    } finally {
      setDeletingId(null);
    }
  }

  const totals = useMemo(() => {
    if (!invoice) return null;
    const calculated = calcTotals(
      invoice.items || [],
      invoice.charges || [],
      invoice.additionalDiscount,
      invoice.tds,
      invoice.tcs,
      invoice.advanceReceived,
      config.showGst,
    );
    return applySavedTotalOverride(calculated, invoice.totals);
  }, [invoice, config.showGst]);

  const displayItems = useMemo(
    () => enrichItemsWithProductDescriptions(invoice?.items || [], products),
    [invoice?.items, products],
  );

  if (loading) {
    return (
      <div className="p-4 md:p-7">
        <div className="bg-white border border-[#dfe7f1] rounded-lg p-8 text-sm text-[#374151]">Loading...</div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="p-4 md:p-7">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-sm text-red-700">{error || 'Document not found'}</div>
      </div>
    );
  }

  const docMeta = {
    ...invoice.meta,
    number: invoice.number,
    date: invoice.meta?.date || invoice.date || invoice.createdAt,
  };
  const accounting = invoice.accounting || {};

  return (
    <div className="p-4 md:p-7 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 print:hidden">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => { window.location.assign(listRoute); }}
            className="inline-flex items-center gap-1.5 text-[13px] text-[#536173] hover:text-[#111827] bg-transparent border-0 cursor-pointer font-[inherit] transition-colors"
          >
            <ArrowLeft size={14} />
            Back
          </button>
          <span className="text-[#dfe7f1]">|</span>
          <h1 className="m-0 text-[18px] font-bold text-[#111827]">{invoice.number}</h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <label className="inline-flex items-center gap-2 px-3 py-2 border border-[#dbe4ef] rounded-md text-[13px] text-[#374151] bg-white">
            <span className="text-[#536173] font-medium">Template</span>
            <SelectDropdown
              value={printTemplate}
              onChange={setPrintTemplate}
              buttonClassName="border-0 bg-transparent text-[13px] font-semibold text-[#111827] outline-none font-[inherit]"
              options={[{ value: 'modern', label: 'Modern' }, { value: 'classic', label: 'Classic' }]}
            />
          </label>
          <button type="button" onClick={() => setShowShareModal(true)} className="inline-flex items-center gap-1.5 px-3 py-2 border border-[#dbe4ef] rounded-md text-[13px] text-[#374151] bg-white hover:bg-gray-50 transition-colors">
            <Send size={13} className="text-[#94a3b8]" />
            Send
          </button>
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-3 py-2 border border-[#dbe4ef] rounded-md text-[13px] text-[#374151] bg-white hover:bg-gray-50 transition-colors">
            <Printer size={13} className="text-[#94a3b8]" />
            Print
          </button>
          <button type="button" onClick={() => setDownloadPdfMode(true)} className="inline-flex items-center gap-1.5 px-3 py-2 border border-[#dbe4ef] rounded-md text-[13px] text-[#374151] bg-white hover:bg-gray-50 transition-colors">
            <Download size={13} className="text-[#94a3b8]" />
            Download PDF
          </button>
        </div>
      </div>

      <div className="mb-5 rounded-xl border border-[#dfe7f1] bg-white px-5 py-4 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className={`mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full ${accounting.posted ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
              <CheckCircle2 size={17} />
            </span>
            <div>
              <div className="text-[13px] font-semibold text-[#111827]">
                {accounting.posted ? 'Accounting Posted' : 'Accounting Pending'}
              </div>
              <div className="text-[12px] text-[#536173] mt-0.5">
                {accounting.posted
                  ? `${accounting.voucherType || 'Voucher'} ${accounting.voucherNo || '-'}${accounting.financialYear ? ` | FY ${accounting.financialYear}` : ''}`
                  : 'This document has not created an accounting voucher yet.'}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-[#536173]">
            {invoice.extra?.costCenter && (
              <span className="rounded-md bg-blue-50 px-2 py-1 font-semibold text-blue-700">Cost Center: {invoice.extra.costCenter}</span>
            )}
            {accounting.voucherNo && (
              <a className="rounded-md border border-[#dbe4ef] px-2 py-1 font-semibold text-[#374151] no-underline hover:bg-gray-50" href="/vouchers">View in Accounting</a>
            )}
          </div>
        </div>
      </div>

      <DocumentPreviewModal
        embedded
        config={config}
        customer={invoice.customer || {}}
        docMeta={docMeta}
        docExtra={invoice.extra || {}}
        items={displayItems}
        charges={invoice.charges || []}
        totals={totals}
        notes={invoice.notes || ''}
        terms={invoice.terms || ''}
        supplyType={invoice.supplyType || 'intrastate'}
        bizSettings={bizSettings}
        shipping={invoice.shipping || {}}
        sameShipping={invoice.shipping?.sameAsBilling ?? true}
        tds={invoice.tds}
        tcs={invoice.tcs}
        advanceAmt={invoice.advanceReceived || 0}
        paymentMethod={invoice.paymentMethod || ''}
        addDiscount={invoice.additionalDiscount}
        downloadAsPdf={downloadPdfMode}
        pdfMode={downloadPdfMode}
        invoiceNumber={docMeta.number}
        printTemplate={printTemplate}
        onPdfDownloaded={() => setDownloadPdfMode(false)}
      />

      {/* ── Payment History (invoice + bill-of-supply) ── */}
      {['invoice', 'bill-of-supply', 'pharmacy-bill'].includes(documentType) && (
        <div className="mt-6 bg-white border border-[#dfe7f1] rounded-xl overflow-hidden print:hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#edf2f7]">
            <div className="flex items-center gap-2">
              <Wallet size={16} className="text-blue-600" />
              <span className="text-[15px] font-semibold text-[#111827]">Payment History</span>
            </div>
            <button
              type="button"
              onClick={() => setShowPaymentModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-[13px] font-semibold rounded-md hover:bg-blue-700 border-0 cursor-pointer font-[inherit]"
            >
              <IndianRupee size={13} />
              Record Payment
            </button>
          </div>

          {/* Summary cards */}
          {paymentSummary && (
            <div className="grid grid-cols-3 gap-px bg-[#edf2f7]">
              {[
                { label: 'Invoice Total', value: paymentSummary.invoiceTotal, color: '#111827' },
                { label: 'Total Received', value: paymentSummary.totalPaid, color: '#15803d' },
                { label: 'Balance Due', value: paymentSummary.balance, color: paymentSummary.balance > 0 ? '#b45309' : '#15803d' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white px-5 py-3.5 text-center">
                  <div className="text-[11px] uppercase font-semibold text-[#536173] tracking-wide mb-1">{label}</div>
                  <div className="text-[16px] font-bold" style={{ color }}>{fmt(value)}</div>
                </div>
              ))}
            </div>
          )}

          {/* Payments table */}
          {payments.length === 0 ? (
            <div className="py-10 text-center text-[13px] text-[#94a3b8]">No payments recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#f8fafc]">
                    {['Date', 'Allocated To', 'Amount', 'Voucher', 'Method', 'Reference', 'Notes', ''].map((h, i) => (
                      <th key={i} className={`text-xs font-semibold uppercase tracking-wide text-[#536173] px-4 py-3 ${i >= 1 && i <= 2 ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p._id} className="border-t border-[#edf2f7] hover:bg-[#fafbfe]">
                      <td className="px-4 py-3 text-[13px] text-[#374151]">{fmtDate(p.date)}</td>
                      <td className="px-4 py-3 text-[13px] text-[#374151]">
                        <span className="font-semibold">{p.allocation?.invoiceNumber || invoice.number}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-[13px] font-bold text-green-700">{fmt(p.amount)}</td>
                      <td className="px-4 py-3 text-[13px] text-[#536173]">
                        {p.accounting?.posted ? (
                          <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700">{p.accounting.voucherNo}</span>
                        ) : (
                          <span className="text-[#b0bec5]">Pending</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700">{p.method}</span>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-[#536173]">{p.reference || <span className="text-[#b0bec5]">—</span>}</td>
                      <td className="px-4 py-3 text-[13px] text-[#536173]">{p.notes || <span className="text-[#b0bec5]">—</span>}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          disabled={deletingId === p._id}
                          onClick={() => handleDeletePayment(p._id)}
                          className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-50 text-[#94a3b8] hover:text-red-600 transition-colors bg-transparent border-0 cursor-pointer ml-auto disabled:opacity-40"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showPaymentModal && invoice && (
        <RecordPaymentModal
          invoice={{
            id: invoice._id ?? invoice.id,
            number: invoice.number,
            customer: invoice.customer,
            balance: paymentSummary?.balance ?? 0,
            invoiceTotal: paymentSummary?.invoiceTotal ?? 0,
          }}
          onClose={() => setShowPaymentModal(false)}
          onSaved={() => { setShowPaymentModal(false); loadPayments(); }}
        />
      )}
      {showShareModal && invoice && (
        <ShareModal
          doc={{
            id: invoice._id ?? invoice.id,
            number: invoice.number,
            customer: invoice.customer,
            total: totals?.finalTotal ?? invoice.totals?.finalTotal ?? invoice.totals?.grandTotal ?? 0,
          }}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}
