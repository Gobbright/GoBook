import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Mail, Printer, Search, Share2 } from 'lucide-react';

import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';
import { listModuleRecords } from '../../../../../services/moduleRecordsService.js';

const DATE_FILTERS = ['All Dates', 'Today', 'This Week', 'This Month'];
const TYPE_FILTERS = ['All Types', 'Guest Folio', 'Hotel Guest Bill', 'Restaurant Bill', 'Checkout Bill', 'Payment Receipt'];
const STATUS_FILTERS = ['All Status', 'PAID', 'PARTIAL', 'PENDING', 'CANCELLED'];
const PAYMENT_FILTERS = ['All Payments', 'Paid', 'Partial', 'Unpaid', 'Room Charge'];

function money(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0));
}

function chargeAmount(charge) {
  if (charge.amount !== undefined) return Number(charge.amount || 0);
  return Number(charge.qty || 0) * Number(charge.rate || 0);
}

function invoiceStatus(data, total, paid, balance) {
  const status = String(data.paymentStatus || data.status || '').toUpperCase();
  if (['CANCELLED', 'PAID', 'PARTIAL', 'PENDING'].includes(status)) return status;
  if (status === 'RECEIVED') return 'PAID';
  if (balance <= 0 && total > 0) return 'PAID';
  if (paid > 0 && balance > 0) return 'PARTIAL';
  return 'PENDING';
}

function summarizeCharges(charges = []) {
  return charges.reduce((acc, charge) => {
    const label = charge.category || charge.description || 'Other Charges';
    acc[label] = (acc[label] || 0) + chargeAmount(charge);
    return acc;
  }, {});
}

function invoiceDate(invoice) {
  const value = invoice?.rawData?.billDate || invoice?.rawData?.invoiceDate || invoice?.rawData?.createdAt || new Date().toISOString();
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

function safeFileName(value) {
  return String(value || 'invoice').replace(/[\\/:*?"<>|]+/g, '-');
}

function normalizePayment(record) {
  const data = record.data || {};
  return {
    id: record._id,
    rawData: data,
    receiptNo: data.receiptNo || data.paymentId || '',
    invoice: data.invoice || data.invoiceNo || data.billNo || '',
    guest: data.guestName || data.guest || '',
    room: data.roomNumber || data.room || '',
    method: data.method || data.paymentMethod || data.mode || '',
    amount: Number(data.amount || data.paymentAmount || 0),
    status: data.status || 'RECEIVED',
    date: data.paymentDate || data.date || data.createdAt || '',
    reference: data.referenceNumber || data.reference || '',
  };
}

function sameText(left, right) {
  return String(left || '').trim().toLowerCase() === String(right || '').trim().toLowerCase();
}

function findLinkedPayments(invoice, payments) {
  if (invoice.sourceKind === 'payment') return [];
  return payments.filter((payment) => {
    if (String(payment.status).toUpperCase() === 'REVERSED') return false;
    const invoiceMatch = invoice.invoiceNo && payment.invoice && sameText(payment.invoice, invoice.invoiceNo);
    const guestRoomMatch = invoice.guest && invoice.room && sameText(payment.guest, invoice.guest) && sameText(payment.room, invoice.room);
    return invoiceMatch || guestRoomMatch;
  });
}

function stayKey(invoice) {
  return `${String(invoice.guest || '').trim().toLowerCase()}::${String(invoice.room || '').trim().toLowerCase()}`;
}

function hideLinkedSourceBills(invoices) {
  const checkoutStayKeys = new Set(
    invoices
      .filter((invoice) => invoice.sourceKind === 'checkout' && invoice.guest && invoice.room)
      .map(stayKey),
  );
  return invoices.filter((invoice) => {
    if (invoice.sourceKind === 'checkout' || invoice.sourceKind === 'payment') return true;
    return !checkoutStayKeys.has(stayKey(invoice));
  });
}

function normalizeInvoice(record, source, payments = []) {
  const data = record.data || {};
  const rawCharges = Array.isArray(data.charges) ? data.charges : [];
  const fallbackAmount = Number(data.total || data.grandTotal || data.amount || data.paymentAmount || 0);
  const charges = rawCharges.length
    ? rawCharges
    : fallbackAmount > 0
      ? [{
        description: source.chargeLabel || data.description || data.notes || source.type,
        category: source.category || source.type,
        qty: 1,
        rate: fallbackAmount,
        amount: fallbackAmount,
      }]
      : [];
  const subtotal = Number(data.subtotal || charges.reduce((sum, charge) => sum + chargeAmount(charge), 0));
  const discount = Number(data.discount || 0);
  const gst = Number(data.tax || data.gst || 0);
  const grandTotal = Number(data.grandTotal || data.total || data.amount || Math.max(0, subtotal - discount + gst));
  const invoiceNo = data.invoiceNo || data.billNo || data.folioNo || data.receiptNo || data.paymentId || `${source.prefix}-${record._id?.slice?.(-4) || '0000'}`;
  const invoice = {
    id: record._id,
    rawData: data,
    invoiceNo,
    type: data.billType || source.type,
    guest: data.guestName || data.guest || 'Walk-in',
    room: data.roomNumber || data.room || '',
    mobile: data.mobile || data.phone || '',
    gstin: data.gstin || 'XXXXXXXXXXXXXX',
    charges,
    groupedCharges: summarizeCharges(charges),
    subtotal,
    discount,
    gst,
    grandTotal,
    sourceKind: source.kind || 'bill',
    payments: [],
  };
  const linkedPayments = findLinkedPayments(invoice, payments);
  const checkoutPaid = data.outstanding !== undefined
    ? Math.max(0, grandTotal - Number(data.outstanding || 0))
    : Number(data.paymentAmount || 0);
  const embeddedPaid = source.kind === 'payment' ? grandTotal : source.kind === 'checkout' ? checkoutPaid : Number(data.paid || data.advancePaid || data.paidAmount || 0);
  const linkedPaid = linkedPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const paid = source.kind === 'payment' ? grandTotal : embeddedPaid + linkedPaid;
  const balance = source.kind === 'payment' ? 0 : Math.max(0, grandTotal - paid);
  return {
    ...invoice,
    paid,
    balance,
    payments: linkedPayments,
    status: invoiceStatus(data, grandTotal, paid, balance),
    payment: data.paymentMethod || data.payment || data.mode || (balance <= 0 ? 'Paid' : paid > 0 ? 'Partial' : 'Unpaid'),
  };
}

function Badge({ status }) {
  const tone = {
    PAID: 'bg-emerald-100 text-emerald-700',
    PARTIAL: 'bg-amber-100 text-amber-700',
    PENDING: 'bg-blue-100 text-blue-700',
    CANCELLED: 'bg-rose-100 text-rose-700',
  };
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${tone[status] || tone.PENDING}`}>{status}</span>;
}

function ProfessionalInvoiceDocument({ invoice }) {
  const chargeLines = invoice.charges.length
    ? invoice.charges
    : Object.entries(invoice.groupedCharges).map(([description, amount]) => ({ description, category: 'Charge', qty: 1, rate: amount, amount }));

  return (
    <div style={{ width: 794, minHeight: 1123, background: '#ffffff', color: '#0f172a', fontFamily: 'Inter, Arial, sans-serif', padding: 42 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 28, borderBottom: '2px solid #0f172a', paddingBottom: 24 }}>
        <div>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: 0 }}>GoBook Hotel</div>
          <div style={{ marginTop: 8, color: '#475569', fontSize: 13, lineHeight: 1.6 }}>
            Business Management Hotel<br />
            Main Block, City Center<br />
            GSTIN: {invoice.gstin}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 26, fontWeight: 800, textTransform: 'uppercase' }}>Tax Invoice</div>
          <div style={{ marginTop: 10, color: '#475569', fontSize: 13, lineHeight: 1.8 }}>
            Invoice No: <strong style={{ color: '#0f172a' }}>{invoice.invoiceNo}</strong><br />
            Invoice Date: <strong style={{ color: '#0f172a' }}>{invoiceDate(invoice)}</strong><br />
            Status: <strong style={{ color: '#0f172a' }}>{invoice.status}</strong>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginTop: 28 }}>
        <div style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: 18 }}>
          <div style={{ color: '#2563eb', fontSize: 12, fontWeight: 800, textTransform: 'uppercase' }}>Bill To</div>
          <div style={{ marginTop: 10, fontSize: 20, fontWeight: 800 }}>{invoice.guest}</div>
          <div style={{ marginTop: 8, color: '#475569', fontSize: 13, lineHeight: 1.7 }}>
            Mobile: {invoice.mobile || '-'}<br />
            Room: {invoice.room || '-'}<br />
            Bill Type: {invoice.type}
          </div>
        </div>
        <div style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: 18 }}>
          <div style={{ color: '#2563eb', fontSize: 12, fontWeight: 800, textTransform: 'uppercase' }}>Payment Summary</div>
          <div style={{ marginTop: 12, display: 'grid', gap: 8, fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Payment Mode</span><strong>{invoice.payment}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Payment Records</span><strong>{invoice.payments.length}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Paid Amount</span><strong>{money(invoice.paid)}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Balance Due</span><strong>{money(invoice.balance)}</strong></div>
          </div>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 30, fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#f1f5f9', color: '#334155' }}>
            <th style={{ padding: 12, textAlign: 'left', border: '1px solid #e2e8f0' }}>Description</th>
            <th style={{ padding: 12, textAlign: 'left', border: '1px solid #e2e8f0' }}>Category</th>
            <th style={{ padding: 12, textAlign: 'right', border: '1px solid #e2e8f0' }}>Qty</th>
            <th style={{ padding: 12, textAlign: 'right', border: '1px solid #e2e8f0' }}>Rate</th>
            <th style={{ padding: 12, textAlign: 'right', border: '1px solid #e2e8f0' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {chargeLines.length ? chargeLines.map((charge, index) => {
            const qty = Number(charge.qty || 1);
            const amount = chargeAmount(charge);
            const rate = Number(charge.rate || amount / qty || 0);
            return (
              <tr key={`${charge.description || charge.category}-${index}`}>
                <td style={{ padding: 12, border: '1px solid #e2e8f0' }}>{charge.description || charge.category || 'Hotel Charge'}</td>
                <td style={{ padding: 12, border: '1px solid #e2e8f0', color: '#475569' }}>{charge.category || invoice.type}</td>
                <td style={{ padding: 12, border: '1px solid #e2e8f0', textAlign: 'right' }}>{qty}</td>
                <td style={{ padding: 12, border: '1px solid #e2e8f0', textAlign: 'right' }}>{money(rate)}</td>
                <td style={{ padding: 12, border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 700 }}>{money(amount)}</td>
              </tr>
            );
          }) : (
            <tr>
              <td colSpan={5} style={{ padding: 18, border: '1px solid #e2e8f0', textAlign: 'center', color: '#64748b' }}>No charge lines available.</td>
            </tr>
          )}
        </tbody>
      </table>

      {invoice.payments.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 10 }}>Payment Receipts</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#334155' }}>
                <th style={{ padding: 10, textAlign: 'left', border: '1px solid #e2e8f0' }}>Receipt</th>
                <th style={{ padding: 10, textAlign: 'left', border: '1px solid #e2e8f0' }}>Method</th>
                <th style={{ padding: 10, textAlign: 'left', border: '1px solid #e2e8f0' }}>Reference</th>
                <th style={{ padding: 10, textAlign: 'right', border: '1px solid #e2e8f0' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.payments.map((payment) => (
                <tr key={payment.id}>
                  <td style={{ padding: 10, border: '1px solid #e2e8f0' }}>{payment.receiptNo || '-'}</td>
                  <td style={{ padding: 10, border: '1px solid #e2e8f0' }}>{payment.method || '-'}</td>
                  <td style={{ padding: 10, border: '1px solid #e2e8f0' }}>{payment.reference || '-'}</td>
                  <td style={{ padding: 10, border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 700 }}>{money(payment.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 26 }}>
        <div style={{ width: 310, display: 'grid', gap: 10, fontSize: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal</span><strong>{money(invoice.subtotal)}</strong></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Discount</span><strong>-{money(invoice.discount)}</strong></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>GST</span><strong>{money(invoice.gst)}</strong></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #0f172a', paddingTop: 12, fontSize: 20 }}><span style={{ fontWeight: 800 }}>Grand Total</span><strong>{money(invoice.grandTotal)}</strong></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}><span>Paid</span><strong>{money(invoice.paid)}</strong></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: invoice.balance > 0 ? '#dc2626' : '#16a34a' }}><span>Balance</span><strong>{money(invoice.balance)}</strong></div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 28, marginTop: 60, alignItems: 'end' }}>
        <div style={{ color: '#475569', fontSize: 12, lineHeight: 1.6 }}>
          Thank you for choosing GoBook Hotel. This is a computer-generated invoice for hotel billing records.
        </div>
        <div style={{ textAlign: 'center', borderTop: '1px solid #0f172a', paddingTop: 10, fontSize: 13, fontWeight: 700 }}>
          Authorized Signatory
        </div>
      </div>
    </div>
  );
}

export function BillsInvoicesPage() {
  const invoicePdfRef = useRef(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('All Dates');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [paymentFilter, setPaymentFilter] = useState('All Payments');
  const [selectedId, setSelectedId] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    const sources = [
      { moduleKey: 'hotel/billing/new-bill', type: 'Hotel Guest Bill', prefix: 'INV' },
      { moduleKey: 'hotel/billing/guest-billing', type: 'Guest Folio', prefix: 'FOLIO' },
      { moduleKey: 'hotel/restaurant-pos/billing', type: 'Restaurant Bill', prefix: 'RES' },
      { moduleKey: 'hotel/front-desk/check-out', type: 'Checkout Bill', prefix: 'CHK', kind: 'checkout', chargeLabel: 'Final Checkout Bill', category: 'Checkout' },
      { moduleKey: 'hotel/billing/payments', type: 'Payment Receipt', prefix: 'PAY', kind: 'payment', chargeLabel: 'Payment Received', category: 'Payment' },
    ];

    Promise.all([
      listModuleRecords('hotel/billing/payments').then((res) => (res.records || []).map(normalizePayment)).catch(() => []),
      Promise.all(sources.map((source) => listModuleRecords(source.moduleKey)
        .then((res) => ({ source, records: res.records || [] }))
        .catch(() => ({ source, records: [] })))),
    ])
      .then(([payments, groups]) => {
        if (!active) return;
        const merged = groups.flatMap(({ source, records }) => records.map((record) => normalizeInvoice(record, source, payments)));
        const visibleInvoices = hideLinkedSourceBills(merged);
        setInvoices(visibleInvoices);
        if (visibleInvoices.length) setSelectedId(visibleInvoices[0].id);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const filteredInvoices = useMemo(() => {
    const query = search.trim().toLowerCase();
    return invoices.filter((invoice) => {
      const matchesSearch = !query || [invoice.invoiceNo, invoice.guest, invoice.room, invoice.mobile].some((value) => String(value).toLowerCase().includes(query));
      const matchesType = typeFilter === 'All Types' || invoice.type === typeFilter;
      const matchesStatus = statusFilter === 'All Status' || invoice.status === statusFilter;
      const matchesPayment = paymentFilter === 'All Payments' || String(invoice.payment).toLowerCase().includes(paymentFilter.replace('Unpaid', 'pending').toLowerCase()) || (paymentFilter === 'Unpaid' && invoice.status === 'PENDING');
      const matchesDate = dateFilter === 'All Dates' || true;
      return matchesSearch && matchesType && matchesStatus && matchesPayment && matchesDate;
    });
  }, [dateFilter, invoices, paymentFilter, search, statusFilter, typeFilter]);

  const selectedInvoice = invoices.find((invoice) => invoice.id === selectedId) || filteredInvoices[0] || null;

  function notify(action) {
    if (!selectedInvoice) return;
    setMessage(`${action} prepared for ${selectedInvoice.invoiceNo}.`);
  }

  async function downloadPdf() {
    if (!selectedInvoice || !invoicePdfRef.current) return;
    setMessage(`Preparing PDF for ${selectedInvoice.invoiceNo}...`);
    try {
      const module = await import('html2pdf.js');
      const html2pdf = module.default || module;
      await html2pdf()
        .set({
          filename: `${safeFileName(selectedInvoice.invoiceNo)}-${safeFileName(selectedInvoice.guest)}.pdf`,
          margin: 0,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            scrollX: 0,
            scrollY: 0,
            windowWidth: 794,
            windowHeight: 1123,
          },
          jsPDF: { unit: 'px', format: [794, 1123], orientation: 'portrait' },
        })
        .from(invoicePdfRef.current)
        .save();
      setMessage(`PDF downloaded for ${selectedInvoice.invoiceNo}.`);
    } catch (error) {
      console.error(error);
      setMessage('Unable to download PDF. Please try again.');
    }
  }

  function printInvoice() {
    if (!selectedInvoice || !invoicePdfRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setMessage('Print window was blocked by the browser.');
      return;
    }
    printWindow.document.write(`<!doctype html><html><head><title>${selectedInvoice.invoiceNo}</title></head><body style="margin:0;background:#fff;">${invoicePdfRef.current.innerHTML}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    setMessage(`Print view opened for ${selectedInvoice.invoiceNo}.`);
  }

  function handleInvoiceAction(label) {
    if (label === 'PDF') {
      downloadPdf();
      return;
    }
    if (label === 'Print') {
      printInvoice();
      return;
    }
    notify(label);
  }

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-7">
      <section className="mb-5">
        <p className="m-0 text-[12px] font-semibold uppercase tracking-wide text-blue-700">Billing</p>
        <h1 className="m-0 mt-1 text-[28px] font-bold text-slate-950">Bills & Invoices</h1>
        <p className="m-0 mt-2 text-sm text-slate-500">Historical invoice documents for viewing, reprinting, sharing, and payment status tracking.</p>
      </section>

      {message && <p className="mb-4 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-[13px] text-blue-700">{message}</p>}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_430px]">
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="grid gap-3 border-b border-slate-100 p-4 xl:grid-cols-[minmax(260px,1fr)_150px_160px_160px_170px]">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Invoice / Guest / Room / Mobile" className="w-full rounded-md border border-slate-200 bg-white py-2 pl-9 pr-3 text-[13px] outline-none focus:border-blue-500" />
            </div>
            <SelectDropdown value={dateFilter} onChange={setDateFilter} options={DATE_FILTERS} />
            <SelectDropdown value={typeFilter} onChange={setTypeFilter} options={TYPE_FILTERS} />
            <SelectDropdown value={statusFilter} onChange={setStatusFilter} options={STATUS_FILTERS} />
            <SelectDropdown value={paymentFilter} onChange={setPaymentFilter} options={PAYMENT_FILTERS} />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead>
                <tr className="text-[12px] uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3">Invoice</th>
                  <th className="px-5 py-3">Guest</th>
                  <th className="px-5 py-3">Room</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-5 py-10 text-center text-[13px] text-slate-500">Loading invoices...</td></tr>
                ) : filteredInvoices.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-10 text-center text-[13px] text-slate-500">No invoices found.</td></tr>
                ) : filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} onClick={() => setSelectedId(invoice.id)} className={`cursor-pointer border-t border-slate-100 hover:bg-slate-50 ${selectedInvoice?.id === invoice.id ? 'bg-blue-50/60' : ''}`}>
                    <td className="px-5 py-4 font-bold text-slate-900">{invoice.invoiceNo}</td>
                    <td className="px-5 py-4 text-slate-700">{invoice.guest}</td>
                    <td className="px-5 py-4 text-slate-700">{invoice.room || '-'}</td>
                    <td className="px-5 py-4 text-slate-700">{invoice.type}</td>
                    <td className="px-5 py-4 font-bold text-slate-900">{money(invoice.grandTotal)}</td>
                    <td className="px-5 py-4"><Badge status={invoice.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="rounded-lg border border-slate-200 bg-white p-5">
          {!selectedInvoice ? (
            <p className="m-0 rounded-md bg-slate-50 p-4 text-[13px] text-slate-500">Select an invoice to view details.</p>
          ) : (
            <>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="m-0 text-[12px] font-bold uppercase tracking-wide text-blue-700">Invoice</p>
                  <h2 className="m-0 mt-1 text-[22px] font-bold text-slate-950">{selectedInvoice.invoiceNo}</h2>
                </div>
                <Badge status={selectedInvoice.status} />
              </div>

              <div className="mb-4 grid grid-cols-2 gap-2">
                <button type="button" onClick={downloadPdf} className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-3 py-2.5 text-[13px] font-bold text-white shadow-sm hover:bg-blue-700">
                  <Download size={15} />
                  Download PDF
                </button>
                <button type="button" onClick={printInvoice} className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2.5 text-[13px] font-bold text-slate-700 hover:border-blue-300 hover:text-blue-700">
                  <Printer size={15} />
                  Print
                </button>
              </div>

              <div className="rounded-md bg-slate-50 p-4">
                <h3 className="m-0 text-[16px] font-bold text-slate-950">GoBook Hotel</h3>
                <p className="m-0 mt-1 text-[13px] text-slate-500">GSTIN: {selectedInvoice.gstin}</p>
              </div>

              <div className="my-4 grid grid-cols-2 gap-3 text-[13px]">
                <div className="rounded-md border border-slate-200 p-3">
                  <div className="text-[12px] font-bold uppercase text-slate-500">Guest</div>
                  <div className="mt-1 font-bold text-slate-950">{selectedInvoice.guest}</div>
                </div>
                <div className="rounded-md border border-slate-200 p-3">
                  <div className="text-[12px] font-bold uppercase text-slate-500">Room</div>
                  <div className="mt-1 font-bold text-slate-950">{selectedInvoice.room || '-'}</div>
                </div>
              </div>

              <div className="space-y-3 border-y border-slate-100 py-4 text-[13px]">
                {Object.keys(selectedInvoice.groupedCharges).length === 0 ? (
                  <p className="m-0 text-slate-500">No charge lines available.</p>
                ) : Object.entries(selectedInvoice.groupedCharges).map(([label, amount]) => (
                  <div key={label} className="flex justify-between gap-3">
                    <span className="text-slate-600">{label}</span>
                    <strong className="text-slate-950">{money(amount)}</strong>
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-3 text-[13px]">
                <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><strong>{money(selectedInvoice.subtotal)}</strong></div>
                <div className="flex justify-between"><span className="text-slate-500">Discount</span><strong>-{money(selectedInvoice.discount)}</strong></div>
                <div className="flex justify-between"><span className="text-slate-500">GST</span><strong>{money(selectedInvoice.gst)}</strong></div>
                <div className="border-t border-slate-100 pt-3 flex justify-between text-[18px]"><span className="font-bold text-slate-950">Grand Total</span><strong>{money(selectedInvoice.grandTotal)}</strong></div>
                <div className="flex justify-between"><span className="text-slate-500">Paid</span><strong>{money(selectedInvoice.paid)}</strong></div>
                <div className="flex justify-between"><span className="text-slate-500">Balance</span><strong>{money(selectedInvoice.balance)}</strong></div>
              </div>

              {selectedInvoice.payments.length > 0 && (
                <div className="mt-5 rounded-md border border-emerald-100 bg-emerald-50 p-3">
                  <h3 className="m-0 text-[13px] font-bold text-emerald-800">Linked Payments</h3>
                  <div className="mt-3 space-y-2">
                    {selectedInvoice.payments.map((payment) => (
                      <div key={payment.id} className="flex justify-between gap-3 rounded-md bg-white px-3 py-2 text-[12px]">
                        <span className="text-slate-600">{payment.receiptNo || payment.method || 'Payment'} - {payment.method || '-'}</span>
                        <strong className="text-slate-950">{money(payment.amount)}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-5 rounded-md bg-blue-50 p-3 text-[13px] font-bold text-blue-700">
                Payment Status: {selectedInvoice.status}
              </div>

              <div className="mt-5 grid grid-cols-4 gap-2">
                {[
                  ['Print', Printer],
                  ['PDF', Download],
                  ['Email', Mail],
                  ['Share', Share2],
                ].map(([label, Icon]) => (
                  <button key={label} type="button" onClick={() => handleInvoiceAction(label)} className="inline-flex items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-2 text-[12px] font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700">
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
        </aside>
      </section>

      {selectedInvoice && (
        <div className="pointer-events-none fixed left-0 top-0 -z-10 h-[1123px] w-[794px] overflow-hidden bg-white">
          <div ref={invoicePdfRef}>
            <ProfessionalInvoiceDocument invoice={selectedInvoice} />
          </div>
        </div>
      )}
    </div>
  );
}
