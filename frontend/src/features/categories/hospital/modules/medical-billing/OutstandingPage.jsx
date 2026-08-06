import { useMemo, useState } from 'react';
import { Eye, MessageCircle, Search, Wallet, X } from 'lucide-react';

import { createAccountingVoucher, getNextVoucherNumber } from '../../../../../services/accountingService.js';
import { useModuleRecords } from '../../../shared/recordUi/useModuleRecords.js';

const AGING_FILTERS = ['All', '0-7 Days', '8-30 Days', '31-60', '60+'];
const PAYMENT_METHODS = ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Insurance', 'Other'];
const INPUT = 'border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] text-[#111827] outline-none focus:border-blue-500 font-[inherit] bg-white';

function money(value) {
  return `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function daysOld(value) {
  const date = new Date(value || today());
  if (Number.isNaN(date.getTime())) return 0;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((start - date) / 86400000));
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
  const insuranceDue = Math.max(0, Number(data.insurance || 0) - Number(data.insuranceReceived || 0));
  const patientDue = Math.max(0, Number(data.balance ?? total - paid) - insuranceDue);
  return {
    id: record._id,
    source: kind === 'pharmacy' ? 'hospital/pharmacy-billing' : 'hospital/billing',
    invoiceNo: data.billNo || data.invoiceNo || (kind === 'pharmacy' ? 'PH-DRAFT' : 'INV-DRAFT'),
    patient: data.patientName || data.customer?.name || 'Walk-in',
    mobile: data.mobile || data.phone || data.customer?.phone || '',
    type: kind === 'pharmacy' ? 'Pharmacy' : data.billType || 'OPD',
    total,
    paid,
    due: Math.max(0, Number(data.balance ?? total - paid)),
    patientDue,
    insuranceDue,
    status: statusOf(data),
    date: data.date || record.createdAt || today(),
    age: daysOld(data.dueDate || data.date || record.createdAt),
    raw: data,
  };
}

function inAging(invoice, filter) {
  if (filter === 'All') return true;
  if (filter === '0-7 Days') return invoice.age <= 7;
  if (filter === '8-30 Days') return invoice.age >= 8 && invoice.age <= 30;
  if (filter === '31-60') return invoice.age >= 31 && invoice.age <= 60;
  return invoice.age > 60;
}

function Button({ children, onClick, tone = 'white', disabled = false }) {
  const tones = {
    blue: 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700',
    green: 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700',
    white: 'border-[#dbe4ef] bg-white text-[#374151] hover:bg-gray-50',
  };
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md border px-3 text-[13px] font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${tones[tone]}`}>
      {children}
    </button>
  );
}

function ReceivePaymentModal({ invoice, payments, onClose, onReceive }) {
  const nextReceipt = receiptNo(payments);
  const [amount, setAmount] = useState(invoice.due);
  const [method, setMethod] = useState('UPI');
  const [referenceNo, setReferenceNo] = useState('');

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-[#f7f7f8] p-5 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="m-0 text-[16px] font-extrabold uppercase text-[#111827]">Receive Payment</h2>
          <button type="button" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#dbe4ef] bg-white text-[#334155] cursor-pointer"><X size={16} /></button>
        </div>
        <div className="mb-5 text-[13px] font-semibold leading-7">
          <div>Patient: {invoice.patient}</div>
          <div>Invoice: {invoice.invoiceNo}</div>
          <div>Receipt: {nextReceipt}</div>
        </div>
        <div className="mb-5 max-w-md text-[13px]">
          <div className="flex justify-between py-1"><span>Invoice Total</span><strong>{money(invoice.total)}</strong></div>
          <div className="flex justify-between py-1"><span>Already Paid</span><strong>{money(invoice.paid)}</strong></div>
          <div className="my-2 h-px bg-[#111827]" />
          <div className="flex justify-between py-1 text-[15px] font-extrabold"><span>Balance</span><strong>{money(invoice.due)}</strong></div>
        </div>
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <label><span className="mb-1 block text-[12px] font-extrabold uppercase text-[#536173]">Amount</span><input className={`${INPUT} w-full`} min="1" max={invoice.due} type="number" value={amount} onChange={(event) => setAmount(Number(event.target.value))} /></label>
          <label><span className="mb-1 block text-[12px] font-extrabold uppercase text-[#536173]">Payment Method</span><select className={`${INPUT} w-full`} value={method} onChange={(event) => setMethod(event.target.value)}>{PAYMENT_METHODS.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="md:col-span-2"><span className="mb-1 block text-[12px] font-extrabold uppercase text-[#536173]">Reference No.</span><input className={`${INPUT} w-full`} value={referenceNo} onChange={(event) => setReferenceNo(event.target.value)} /></label>
        </div>
        <div className="flex flex-wrap justify-between gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button tone="green" disabled={!amount || amount <= 0 || amount > invoice.due} onClick={() => onReceive({ invoice, receiptNo: nextReceipt, amount, method, referenceNo })}>Receive {money(amount)}</Button>
        </div>
      </div>
    </div>
  );
}

function InvoicePanel({ invoice, onClose }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="m-0 text-[16px] font-extrabold text-[#071936]">Invoice #{invoice.invoiceNo}</h2>
          <button type="button" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#dbe4ef] bg-white text-[#334155] cursor-pointer"><X size={16} /></button>
        </div>
        <div className="grid gap-3 text-[13px] sm:grid-cols-2">
          <div className="rounded-md bg-[#f8fbff] p-3"><strong>{invoice.patient}</strong><div>{invoice.mobile || '-'}</div><div>{invoice.type}</div></div>
          <div className="rounded-md bg-[#f8fbff] p-3"><div>Total: <strong>{money(invoice.total)}</strong></div><div>Paid: <strong>{money(invoice.paid)}</strong></div><div>Due: <strong>{money(invoice.due)}</strong></div></div>
        </div>
      </div>
    </div>
  );
}

export function OutstandingPage() {
  const serviceBills = useModuleRecords('hospital/billing');
  const pharmacyBills = useModuleRecords('hospital/pharmacy-billing');
  const payments = useModuleRecords('hospital/payments');
  const [search, setSearch] = useState('');
  const [aging, setAging] = useState('All');
  const [receiveInvoice, setReceiveInvoice] = useState(null);
  const [viewInvoice, setViewInvoice] = useState(null);
  const [message, setMessage] = useState('');

  const outstanding = useMemo(() => [
    ...serviceBills.records.map((record) => normalizeInvoice(record, 'service')),
    ...pharmacyBills.records.map((record) => normalizeInvoice(record, 'pharmacy')),
  ].filter((invoice) => invoice.due > 0 && !['Cancelled', 'Draft'].includes(invoice.status)), [serviceBills.records, pharmacyBills.records]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return outstanding.filter((invoice) => {
      if (q && ![invoice.patient, invoice.invoiceNo, invoice.mobile].filter(Boolean).join(' ').toLowerCase().includes(q)) return false;
      return inAging(invoice, aging);
    });
  }, [outstanding, search, aging]);

  const totals = useMemo(() => ({
    total: outstanding.reduce((sum, invoice) => sum + invoice.due, 0),
    patient: outstanding.reduce((sum, invoice) => sum + invoice.patientDue, 0),
    insurance: outstanding.reduce((sum, invoice) => sum + invoice.insuranceDue, 0),
  }), [outstanding]);

  async function postAccountingReceipt({ receiptNo: nextReceipt, invoice, amount, method }) {
    try {
      const next = await getNextVoucherNumber('Receipt', today()).catch(() => ({ voucherNo: nextReceipt }));
      await createAccountingVoucher({
        voucherType: 'Receipt',
        voucherNo: next.voucherNo || nextReceipt,
        date: today(),
        partyName: invoice.patient,
        referenceNo: nextReceipt,
        narration: `Outstanding received for ${invoice.invoiceNo}`,
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
    const { invoice, amount, method, referenceNo, receiptNo: nextReceipt } = payload;
    const nextPaid = Math.min(invoice.total, invoice.paid + Number(amount));
    const nextDue = Math.max(0, invoice.total - nextPaid);
    const nextStatus = nextDue <= 0 ? 'Paid' : 'Partial';
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
      cashier: 'Cashier',
      status: 'Completed',
      date: today(),
      accountingStatus: accountingPosted ? 'Posted' : 'Pending',
      name: `Receipt ${nextReceipt}`,
    });

    await collection.update(invoice.id, {
      ...invoice.raw,
      paidAmount: nextPaid,
      balance: nextDue,
      status: nextStatus,
      paymentHistory: [...(invoice.raw.paymentHistory || []), { receiptNo: nextReceipt, date: today(), amount: Number(amount), method, referenceNo }],
    });

    setReceiveInvoice(null);
    setMessage(nextDue <= 0 ? `${invoice.invoiceNo} fully paid and marked PAID.` : `${nextReceipt} received. Balance updated.`);
  }

  function sendReminder(invoice) {
    const phone = String(invoice.mobile || '').replace(/\D/g, '');
    const text = encodeURIComponent(`Reminder: ${invoice.invoiceNo} has outstanding balance ${money(invoice.due)}.`);
    if (phone) window.open(`https://wa.me/${phone}?text=${text}`, '_blank', 'noopener');
    else setMessage(`Reminder prepared for ${invoice.patient}, but no mobile number is available.`);
  }

  return (
    <div className="p-3 md:p-4">
      <div className="rounded-2xl border border-[#e5e7eb] bg-[#f7f7f8] p-5 md:p-6">
        <h1 className="m-0 mb-7 text-[18px] font-extrabold uppercase text-[#111827]">Outstanding</h1>
        {message && <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-[13px] font-semibold text-green-700">{message}</div>}

        <div className="mb-6 grid gap-5 sm:grid-cols-3">
          <div><div className="mb-2 text-[13px] font-semibold text-[#111827]">Total Outstanding</div><div className="text-[24px] font-extrabold">{money(totals.total)}</div></div>
          <div><div className="mb-2 text-[13px] font-semibold text-[#111827]">Patients Due</div><div className="text-[20px] font-extrabold">{money(totals.patient)}</div></div>
          <div><div className="mb-2 text-[13px] font-semibold text-[#111827]">Insurance Due</div><div className="text-[20px] font-extrabold">{money(totals.insurance)}</div></div>
        </div>

        <div className="mb-6 h-px max-w-3xl bg-[#111827]" />

        <div className="mb-4 max-w-xl">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
            <input className={`${INPUT} w-full pl-8`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Patient / Invoice" />
          </div>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {AGING_FILTERS.map((item) => (
            <button key={item} type="button" onClick={() => setAging(item)} className={`min-h-9 rounded-md border px-3 text-[13px] font-semibold cursor-pointer ${aging === item ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-[#dbe4ef] bg-white text-[#374151]'}`}>{item}</button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse">
            <thead>
              <tr>{['Patient', 'Invoice', 'Total', 'Paid', 'Due', 'Aging', 'Actions'].map((heading) => <th key={heading} className="px-3 py-2 text-left text-[12px] font-extrabold uppercase text-[#111827]">{heading}</th>)}</tr>
            </thead>
            <tbody>
              {serviceBills.loading || pharmacyBills.loading ? (
                <tr><td colSpan={7} className="px-3 py-10 text-center text-[13px] text-[#64748b]">Loading outstanding...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-10 text-center text-[13px] text-[#64748b]">No outstanding invoices.</td></tr>
              ) : filtered.map((invoice) => (
                <tr key={`${invoice.source}-${invoice.id}`} className="border-b border-[#e5e7eb] hover:bg-white">
                  <td className="px-3 py-3 text-[13px] font-semibold text-[#111827]">{invoice.patient}</td>
                  <td className="px-3 py-3 text-[13px] font-bold text-blue-700">{invoice.invoiceNo}</td>
                  <td className="px-3 py-3 text-[13px]">{money(invoice.total)}</td>
                  <td className="px-3 py-3 text-[13px]">{money(invoice.paid)}</td>
                  <td className="px-3 py-3 text-[13px] font-extrabold text-[#b45309]">{money(invoice.due)}</td>
                  <td className="px-3 py-3 text-[13px]">{invoice.age} days</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <Button tone="green" onClick={() => setReceiveInvoice(invoice)}><Wallet size={13} />Receive Payment</Button>
                      <Button onClick={() => setViewInvoice(invoice)}><Eye size={13} />View Invoice</Button>
                      <Button onClick={() => sendReminder(invoice)}><MessageCircle size={13} />Send Reminder</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {receiveInvoice && <ReceivePaymentModal invoice={receiveInvoice} payments={payments.records} onClose={() => setReceiveInvoice(null)} onReceive={receivePayment} />}
      {viewInvoice && <InvoicePanel invoice={viewInvoice} onClose={() => setViewInvoice(null)} />}
    </div>
  );
}
