import { useMemo, useState } from 'react';
import { Banknote, CreditCard, Download, Mail, Printer, Search, Send, Wallet, X } from 'lucide-react';

import { ExportButtons } from '../../../../../components/forms/ExportButtons.jsx';
import { createAccountingVoucher, getNextVoucherNumber } from '../../../../../services/accountingService.js';
import { useModuleRecords } from '../../../shared/recordUi/useModuleRecords.js';

const DATE_FILTERS = ['Today', 'This Week', 'This Month', 'All Dates'];
const METHOD_FILTERS = ['Payment Method', 'Cash', 'UPI', 'Card', 'Bank Transfer', 'Insurance', 'Other'];
const STATUS_FILTERS = ['Status', 'Completed', 'Failed', 'Refunded'];
const PAYMENT_METHODS = ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Insurance', 'Other'];
const INPUT = 'border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] text-[#111827] outline-none focus:border-blue-500 font-[inherit] bg-white';

function money(value) {
  return `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function receiptNo(records) {
  const max = records.reduce((highest, record) => {
    const n = Number(String(record.data?.receiptNo || '').replace(/\D/g, ''));
    return Number.isFinite(n) ? Math.max(highest, n) : highest;
  }, 198);
  return `REC-${String(max + 1).padStart(3, '0')}`;
}

function statusOf(data = {}) {
  if (data.status === 'Cancelled') return 'Cancelled';
  if (data.status === 'Draft') return 'Draft';
  const total = Number(data.total ?? data.payable ?? data.amount ?? 0);
  const paid = Number(data.paidAmount ?? (data.status === 'Paid' ? total : 0));
  const balance = Number(data.balance ?? Math.max(0, total - paid));
  if (balance <= 0 && total > 0) return 'Paid';
  if (paid > 0) return 'Partial';
  return data.status || 'Unpaid';
}

function normalizeInvoice(record, kind) {
  const data = record.data || {};
  const total = Number(data.payable ?? data.total ?? data.amount ?? 0);
  const paid = Number(data.paidAmount ?? (data.status === 'Paid' ? total : 0));
  return {
    id: record._id,
    source: kind === 'pharmacy' ? 'hospital/pharmacy-billing' : 'hospital/billing',
    invoiceNo: data.billNo || data.invoiceNo || (kind === 'pharmacy' ? 'PH-DRAFT' : 'INV-DRAFT'),
    patient: data.patientName || data.customer?.name || 'Walk-in',
    mobile: data.mobile || data.phone || data.customer?.phone || '',
    type: kind === 'pharmacy' ? 'Pharmacy' : data.billType || 'OPD',
    total,
    paid,
    balance: Number(data.balance ?? Math.max(0, total - paid)),
    status: statusOf(data),
    raw: data,
  };
}

function paymentFromRecord(record) {
  const data = record.data || {};
  return {
    id: record._id,
    receiptNo: data.receiptNo || 'REC-DRAFT',
    invoiceNo: data.invoiceNo || data.referenceNo || '-',
    invoiceId: data.invoiceId || '',
    source: data.invoiceSource || '',
    patient: data.patientName || 'Patient',
    mobile: data.mobile || '',
    method: data.method || data.mode || 'Cash',
    amount: Number(data.amount || 0),
    status: data.status || 'Completed',
    date: data.date || record.createdAt || today(),
    cashier: data.cashier || 'Cashier',
    referenceNo: data.referenceNo || '',
  };
}

function isInDateFilter(dateValue, filter) {
  if (filter === 'All Dates') return true;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (filter === 'Today') return date >= start;
  if (filter === 'This Week') {
    const weekStart = new Date(start);
    weekStart.setDate(start.getDate() - start.getDay());
    return date >= weekStart;
  }
  if (filter === 'This Month') return date.getMonth() === start.getMonth() && date.getFullYear() === start.getFullYear();
  return true;
}

function collectionByMethod(payments) {
  return PAYMENT_METHODS.reduce((acc, method) => {
    acc[method] = payments.filter((payment) => payment.status === 'Completed' && payment.method === method).reduce((sum, payment) => sum + payment.amount, 0);
    return acc;
  }, {});
}

function Button({ children, onClick, tone = 'white', disabled = false, className = '' }) {
  const tones = {
    blue: 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700',
    green: 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700',
    white: 'border-[#dbe4ef] bg-white text-[#374151] hover:bg-gray-50',
  };
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md border px-3 text-[13px] font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${tones[tone]} ${className}`}>
      {children}
    </button>
  );
}

function ReceivePaymentModal({ invoice, payments, onClose, onReceive }) {
  const nextReceipt = receiptNo(payments);
  const [amount, setAmount] = useState(Math.min(invoice.balance, 10000) || invoice.balance);
  const [method, setMethod] = useState('UPI');
  const [referenceNo, setReferenceNo] = useState('');
  const [cashier, setCashier] = useState('Cashier');

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-[#f7f7f8] p-5 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="m-0 text-[16px] font-extrabold uppercase text-[#111827]">Receive Payment</h2>
          <button type="button" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#dbe4ef] bg-white text-[#334155] cursor-pointer"><X size={16} /></button>
        </div>

        <div className="mb-6 text-[13px] font-semibold leading-7 text-[#111827]">
          <div>Patient: {invoice.patient}</div>
          <div>Invoice: {invoice.invoiceNo}</div>
          <div>Receipt: {nextReceipt}</div>
        </div>

        <div className="mb-6 max-w-md text-[13px]">
          <div className="flex justify-between py-1"><span>Invoice Total</span><strong>{money(invoice.total)}</strong></div>
          <div className="flex justify-between py-1"><span>Already Paid</span><strong>{money(invoice.paid)}</strong></div>
          <div className="my-2 h-px bg-[#111827]" />
          <div className="flex justify-between py-1 text-[15px] font-extrabold"><span>Balance</span><strong>{money(invoice.balance)}</strong></div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[12px] font-extrabold uppercase text-[#536173]">Amount</span>
            <input className={`${INPUT} w-full`} min="1" max={invoice.balance} type="number" value={amount} onChange={(event) => setAmount(Number(event.target.value))} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-extrabold uppercase text-[#536173]">Payment Method</span>
            <select className={`${INPUT} w-full`} value={method} onChange={(event) => setMethod(event.target.value)}>{PAYMENT_METHODS.map((item) => <option key={item}>{item}</option>)}</select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-extrabold uppercase text-[#536173]">Reference No.</span>
            <input className={`${INPUT} w-full`} value={referenceNo} onChange={(event) => setReferenceNo(event.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-extrabold uppercase text-[#536173]">Cashier</span>
            <input className={`${INPUT} w-full`} value={cashier} onChange={(event) => setCashier(event.target.value)} />
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button tone="green" disabled={!amount || amount <= 0 || amount > invoice.balance} onClick={() => onReceive({ invoice, receiptNo: nextReceipt, amount, method, referenceNo, cashier })}>
            Receive {money(amount)}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function HospitalPaymentsPage() {
  const serviceBills = useModuleRecords('hospital/billing');
  const pharmacyBills = useModuleRecords('hospital/pharmacy-billing');
  const payments = useModuleRecords('hospital/payments');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('Today');
  const [methodFilter, setMethodFilter] = useState('Payment Method');
  const [statusFilter, setStatusFilter] = useState('Status');
  const [receiveInvoice, setReceiveInvoice] = useState(null);
  const [invoiceQuery, setInvoiceQuery] = useState('');
  const [message, setMessage] = useState('');

  const invoices = useMemo(() => [
    ...serviceBills.records.map((record) => normalizeInvoice(record, 'service')),
    ...pharmacyBills.records.map((record) => normalizeInvoice(record, 'pharmacy')),
  ].filter((invoice) => invoice.status !== 'Cancelled'), [serviceBills.records, pharmacyBills.records]);

  const paymentRows = useMemo(() => payments.records.map(paymentFromRecord).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)), [payments.records]);

  const filteredPayments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return paymentRows.filter((payment) => {
      if (q && ![payment.receiptNo, payment.invoiceNo, payment.patient, payment.mobile].filter(Boolean).join(' ').toLowerCase().includes(q)) return false;
      if (!isInDateFilter(payment.date, dateFilter)) return false;
      if (methodFilter !== 'Payment Method' && payment.method !== methodFilter) return false;
      if (statusFilter !== 'Status' && payment.status !== statusFilter) return false;
      return true;
    });
  }, [paymentRows, search, dateFilter, methodFilter, statusFilter]);

  const todayPayments = useMemo(() => paymentRows.filter((payment) => isInDateFilter(payment.date, 'Today')), [paymentRows]);
  const methodTotals = useMemo(() => collectionByMethod(todayPayments), [todayPayments]);
  const todayTotal = todayPayments.filter((payment) => payment.status === 'Completed').reduce((sum, payment) => sum + payment.amount, 0);

  const invoiceMatches = useMemo(() => {
    const q = invoiceQuery.trim().toLowerCase();
    if (!q) return invoices.filter((invoice) => invoice.balance > 0).slice(0, 5);
    return invoices.filter((invoice) => invoice.balance > 0 && [invoice.invoiceNo, invoice.patient, invoice.mobile].filter(Boolean).join(' ').toLowerCase().includes(q)).slice(0, 6);
  }, [invoices, invoiceQuery]);

  const exportColumns = [
    { label: 'Receipt', value: (row) => row.receiptNo },
    { label: 'Invoice', value: (row) => row.invoiceNo },
    { label: 'Patient', value: (row) => row.patient },
    { label: 'Method', value: (row) => row.method },
    { label: 'Amount', value: (row) => money(row.amount) },
    { label: 'Status', value: (row) => row.status },
    { label: 'Cashier', value: (row) => row.cashier },
  ];

  async function postAccountingReceipt({ receiptNo: nextReceipt, invoice, amount, method }) {
    try {
      const date = today();
      const next = await getNextVoucherNumber('Receipt', date).catch(() => ({ voucherNo: nextReceipt }));
      await createAccountingVoucher({
        voucherType: 'Receipt',
        voucherNo: next.voucherNo || nextReceipt,
        date,
        partyName: invoice.patient,
        referenceNo: nextReceipt,
        narration: `Hospital payment received for ${invoice.invoiceNo}`,
        status: 'Posted',
        lines: [
          { ledgerName: method === 'Cash' ? 'Cash' : 'Bank', ledgerGroup: 'Current Assets', side: 'debit', amount, billRef: invoice.invoiceNo, costCenter: invoice.type, narration: nextReceipt },
          { ledgerName: 'Patient Receivables', ledgerGroup: 'Current Assets', side: 'credit', amount, billRef: invoice.invoiceNo, costCenter: invoice.type, narration: nextReceipt },
        ],
      });
      return true;
    } catch {
      return false;
    }
  }

  async function receivePayment(payload) {
    const { invoice, amount, method, referenceNo, cashier, receiptNo: nextReceipt } = payload;
    const nextPaid = Math.min(invoice.total, invoice.paid + Number(amount));
    const nextBalance = Math.max(0, invoice.total - nextPaid);
    const nextStatus = nextBalance <= 0 ? 'Paid' : 'Partial';
    const collection = invoice.source === 'hospital/billing' ? serviceBills : pharmacyBills;
    const accountingPosted = await postAccountingReceipt(payload);

    await payments.create({
      receiptNo: nextReceipt,
      invoiceNo: invoice.invoiceNo,
      invoiceId: invoice.id,
      invoiceSource: invoice.source,
      patientName: invoice.patient,
      mobile: invoice.mobile,
      method,
      amount: Number(amount),
      referenceNo,
      cashier,
      status: 'Completed',
      date: today(),
      accountingStatus: accountingPosted ? 'Posted' : 'Pending',
      name: `Receipt ${nextReceipt}`,
    });

    await collection.update(invoice.id, {
      ...invoice.raw,
      paidAmount: nextPaid,
      balance: nextBalance,
      status: nextStatus,
      paymentHistory: [...(invoice.raw.paymentHistory || []), { receiptNo: nextReceipt, date: today(), amount: Number(amount), method, referenceNo, cashier }],
    });

    setReceiveInvoice(null);
    setInvoiceQuery('');
    setMessage(`${nextReceipt} received for ${invoice.invoiceNo}. Accounting ${accountingPosted ? 'voucher posted' : 'posting pending'}.`);
  }

  return (
    <div className="p-3 md:p-4">
      <div className="mb-4 rounded-2xl border border-[#e5e7eb] bg-[#f7f7f8] p-5 md:p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="m-0 text-[18px] font-extrabold uppercase text-[#111827]">Payments</h1>
          <Button tone="blue" disabled={!invoiceMatches.length} onClick={() => setReceiveInvoice(invoiceMatches[0])}>Receive Payment</Button>
        </div>

        {message && <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-[13px] font-semibold text-green-700">{message}</div>}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          <div>
            <div className="mb-5 text-[13px] font-semibold text-[#111827]">Today's Collection</div>
            <div className="text-[24px] font-extrabold text-[#111827]">{money(todayTotal)}</div>
            <div className="my-4 h-px bg-[#111827]" />
            <div className="grid gap-2 text-[13px] font-semibold text-[#111827]">
              {['Cash', 'UPI', 'Card', 'Bank Transfer'].map((method) => (
                <div key={method} className="grid grid-cols-[110px_1fr]"><span>{method === 'Bank Transfer' ? 'Bank' : method}</span><strong>{money(methodTotals[method])}</strong></div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-[#dfe7f1] bg-white p-4">
            <div className="mb-3 flex items-center gap-2 text-[13px] font-extrabold text-[#071936]"><Wallet size={16} />Receive From Invoice</div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
              <input className={`${INPUT} w-full pl-8`} value={invoiceQuery} onChange={(event) => setInvoiceQuery(event.target.value)} placeholder="Search unpaid invoice / patient / mobile" />
            </div>
            <div className="mt-3 grid gap-2">
              {invoiceMatches.map((invoice) => (
                <button key={`${invoice.source}-${invoice.id}`} type="button" onClick={() => setReceiveInvoice(invoice)} className="grid gap-1 rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-left text-[13px] cursor-pointer hover:bg-blue-50 sm:grid-cols-[1fr_auto]">
                  <span><strong>{invoice.invoiceNo}</strong> - {invoice.patient}</span>
                  <strong className="text-blue-700">{money(invoice.balance)}</strong>
                </button>
              ))}
              {invoiceMatches.length === 0 && <div className="text-[13px] text-[#64748b]">No unpaid invoices found.</div>}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#e5e7eb] bg-[#f7f7f8] p-5 md:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-[240px] flex-1 max-w-xl">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
            <input className={`${INPUT} w-full pl-8`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Patient / Invoice / Receipt" />
          </div>
          <ExportButtons title="Payments" filename="hospital-payments" rows={filteredPayments} columns={exportColumns} />
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          <select className={INPUT} value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>{DATE_FILTERS.map((item) => <option key={item}>{item}</option>)}</select>
          <select className={INPUT} value={methodFilter} onChange={(event) => setMethodFilter(event.target.value)}>{METHOD_FILTERS.map((item) => <option key={item}>{item}</option>)}</select>
          <select className={INPUT} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>{STATUS_FILTERS.map((item) => <option key={item}>{item}</option>)}</select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead>
              <tr>
                {['Receipt', 'Invoice', 'Patient', 'Method', 'Amount', 'Cashier', 'Actions'].map((heading) => (
                  <th key={heading} className="px-3 py-2 text-left text-[12px] font-extrabold uppercase text-[#111827]">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.loading ? (
                <tr><td colSpan={7} className="px-3 py-10 text-center text-[13px] text-[#64748b]">Loading payments...</td></tr>
              ) : filteredPayments.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-10 text-center text-[13px] text-[#64748b]">No payments match your filters.</td></tr>
              ) : filteredPayments.map((payment) => (
                <tr key={payment.id} className="border-b border-[#e5e7eb] hover:bg-white">
                  <td className="px-3 py-3 text-[13px] font-bold text-blue-700">{payment.receiptNo}</td>
                  <td className="px-3 py-3 text-[13px]">{payment.invoiceNo}</td>
                  <td className="px-3 py-3 text-[13px] font-semibold text-[#111827]">{payment.patient}</td>
                  <td className="px-3 py-3 text-[13px]">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-white px-2 py-1 font-semibold text-[#374151]">
                      {payment.method === 'Cash' ? <Banknote size={13} /> : <CreditCard size={13} />}
                      {payment.method}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-[13px] font-extrabold text-[#111827]">{money(payment.amount)}</td>
                  <td className="px-3 py-3 text-[13px] text-[#64748b]">{payment.cashier}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <Button onClick={() => window.print()}><Printer size={13} />Print</Button>
                      <Button><Download size={13} />PDF</Button>
                      <Button disabled={!payment.mobile} onClick={() => window.open(`https://wa.me/${String(payment.mobile).replace(/\D/g, '')}?text=${encodeURIComponent(`Receipt ${payment.receiptNo}: ${money(payment.amount)}`)}`, '_blank', 'noopener')}><Send size={13} />WhatsApp</Button>
                      <Button><Mail size={13} />Email</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {receiveInvoice && <ReceivePaymentModal invoice={receiveInvoice} payments={payments.records} onClose={() => setReceiveInvoice(null)} onReceive={receivePayment} />}
    </div>
  );
}
