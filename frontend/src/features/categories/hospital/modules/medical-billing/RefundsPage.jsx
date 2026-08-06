import { useMemo, useState } from 'react';
import { ArrowRightLeft, CheckCircle2, Search, ShieldCheck, X } from 'lucide-react';

import { createAccountingVoucher, getNextVoucherNumber } from '../../../../../services/accountingService.js';
import { useModuleRecords } from '../../../shared/recordUi/useModuleRecords.js';

const REASONS = ['Service cancelled', 'Duplicate payment', 'Billing error', 'Procedure cancelled', 'Excess payment', 'Other'];
const REFUND_METHODS = ['Original Payment Method', 'Cash', 'UPI', 'Card', 'Bank Transfer', 'Insurance', 'Other'];
const INPUT = 'border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] text-[#111827] outline-none focus:border-blue-500 font-[inherit] bg-white';

function money(value) {
  return `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function refundNo(records) {
  const max = records.reduce((highest, record) => {
    const n = Number(String(record.data?.refundNo || '').replace(/\D/g, ''));
    return Number.isFinite(n) ? Math.max(highest, n) : highest;
  }, 300);
  return `REF-${String(max + 1).padStart(3, '0')}`;
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
    total,
    paid,
    balance: Number(data.balance ?? Math.max(0, total - paid)),
    paymentMethod: data.paymentMethod || data.paymentMode || 'Original Payment Method',
    status: data.status || 'Paid',
    raw: data,
  };
}

function normalizePayment(record) {
  const data = record.data || {};
  return {
    id: record._id,
    receiptNo: data.receiptNo || '',
    invoiceNo: data.invoiceNo || '',
    invoiceId: data.invoiceId || '',
    invoiceSource: data.invoiceSource || '',
    patient: data.patientName || '',
    method: data.method || data.mode || '',
    amount: Number(data.amount || 0),
    refundedAmount: Number(data.refundedAmount || 0),
    referenceNo: data.referenceNo || '',
    raw: data,
  };
}

function refundAmount(record) {
  return Number(record.data?.amount || 0);
}

function Button({ children, onClick, tone = 'white', disabled = false }) {
  const tones = {
    green: 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700',
    red: 'border-red-100 bg-red-50 text-red-700 hover:bg-red-100',
    white: 'border-[#dbe4ef] bg-white text-[#374151] hover:bg-gray-50',
  };
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md border px-3 text-[13px] font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${tones[tone]}`}>
      {children}
    </button>
  );
}

export function RefundsPage() {
  const serviceBills = useModuleRecords('hospital/billing');
  const pharmacyBills = useModuleRecords('hospital/pharmacy-billing');
  const payments = useModuleRecords('hospital/payments');
  const refunds = useModuleRecords('hospital/refunds');
  const [search, setSearch] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [refundType, setRefundType] = useState('Partial');
  const [amount, setAmount] = useState(1000);
  const [reason, setReason] = useState('Service cancelled');
  const [method, setMethod] = useState('Original Payment Method');
  const [notes, setNotes] = useState('');
  const [requestedBy, setRequestedBy] = useState('Cashier');
  const [approvedBy, setApprovedBy] = useState('Manager');
  const [message, setMessage] = useState('');

  const invoices = useMemo(() => [
    ...serviceBills.records.map((record) => normalizeInvoice(record, 'service')),
    ...pharmacyBills.records.map((record) => normalizeInvoice(record, 'pharmacy')),
  ].filter((invoice) => invoice.paid > 0 && invoice.status !== 'Cancelled'), [serviceBills.records, pharmacyBills.records]);

  const paymentRows = useMemo(() => payments.records.map(normalizePayment), [payments.records]);
  const selectedInvoice = invoices.find((invoice) => `${invoice.source}:${invoice.id}` === selectedInvoiceId) || invoices[0] || null;
  const invoicePayments = selectedInvoice ? paymentRows.filter((payment) => (
    payment.invoiceId === selectedInvoice.id
    || payment.invoiceNo === selectedInvoice.invoiceNo
    || (!payment.invoiceId && payment.invoiceNo === selectedInvoice.invoiceNo)
  )) : [];
  const previouslyRefunded = selectedInvoice ? refunds.records
    .filter((record) => record.data?.invoiceNo === selectedInvoice.invoiceNo)
    .reduce((sum, record) => sum + refundAmount(record), 0) : 0;
  const totalPaid = selectedInvoice ? Math.max(selectedInvoice.paid, invoicePayments.reduce((sum, payment) => sum + payment.amount, 0)) : 0;
  const available = Math.max(0, totalPaid - previouslyRefunded);
  const refundAmountValue = refundType === 'Full' ? available : Number(amount || 0);
  const originalPayment = invoicePayments[0] || null;
  const nextRefundNo = refundNo(refunds.records);

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return invoices.slice(0, 6);
    return invoices.filter((invoice) => {
      const receiptText = paymentRows.filter((payment) => payment.invoiceNo === invoice.invoiceNo).map((payment) => payment.receiptNo).join(' ');
      return [invoice.invoiceNo, invoice.patient, invoice.mobile, receiptText].filter(Boolean).join(' ').toLowerCase().includes(q);
    }).slice(0, 8);
  }, [invoices, paymentRows, search]);

  async function postAccountingRefund(refundPayload) {
    try {
      const next = await getNextVoucherNumber('Payment', today()).catch(() => ({ voucherNo: refundPayload.refundNo }));
      await createAccountingVoucher({
        voucherType: 'Payment',
        voucherNo: next.voucherNo || refundPayload.refundNo,
        date: today(),
        partyName: refundPayload.patientName,
        referenceNo: refundPayload.refundNo,
        narration: `Refund processed for ${refundPayload.invoiceNo}`,
        status: 'Posted',
        lines: [
          { ledgerName: 'Patient Receivables', ledgerGroup: 'Current Assets', side: 'debit', amount: refundPayload.amount, billRef: refundPayload.invoiceNo, costCenter: 'Hospital Refund', narration: refundPayload.reason },
          { ledgerName: refundPayload.method === 'Cash' ? 'Cash' : 'Bank', ledgerGroup: 'Current Assets', side: 'credit', amount: refundPayload.amount, billRef: refundPayload.invoiceNo, costCenter: 'Hospital Refund', narration: refundPayload.reason },
        ],
      });
      return true;
    } catch {
      return false;
    }
  }

  async function processRefund() {
    if (!selectedInvoice) return;
    if (!reason.trim()) {
      window.alert('Refund reason is required.');
      return;
    }
    if (!approvedBy.trim()) {
      window.alert('Manager/Admin approval is required.');
      return;
    }
    if (refundAmountValue <= 0 || refundAmountValue > available) {
      window.alert('Refund amount must be within available paid amount.');
      return;
    }

    const refundMethod = method === 'Original Payment Method' ? originalPayment?.method || selectedInvoice.paymentMethod || 'Cash' : method;
    const refundPayload = {
      refundNo: nextRefundNo,
      refundTransactionId: `RFT-${nextRefundNo.replace(/\D/g, '')}`,
      invoiceNo: selectedInvoice.invoiceNo,
      invoiceId: selectedInvoice.id,
      invoiceSource: selectedInvoice.source,
      patientName: selectedInvoice.patient,
      mobile: selectedInvoice.mobile,
      totalPaid,
      previouslyRefunded,
      availableBeforeRefund: available,
      refundType,
      amount: refundAmountValue,
      reason,
      method: refundMethod,
      notes,
      requestedBy,
      approvedBy,
      originalReceiptNo: originalPayment?.receiptNo || '',
      originalPaymentMethod: originalPayment?.method || selectedInvoice.paymentMethod || '',
      status: 'Processed',
      date: today(),
      processedAt: new Date().toISOString(),
      name: `Refund ${nextRefundNo}`,
    };
    const accountingPosted = await postAccountingRefund(refundPayload);
    await refunds.create({ ...refundPayload, accountingStatus: accountingPosted ? 'Reversed' : 'Pending' });

    const nextPaid = Math.max(0, selectedInvoice.paid - refundAmountValue);
    const nextBalance = Math.max(0, selectedInvoice.total - nextPaid);
    const nextStatus = nextBalance <= 0 ? 'Paid' : nextPaid > 0 ? 'Partial' : 'Unpaid';
    const collection = selectedInvoice.source === 'hospital/billing' ? serviceBills : pharmacyBills;
    await collection.update(selectedInvoice.id, {
      ...selectedInvoice.raw,
      paidAmount: nextPaid,
      balance: nextBalance,
      status: nextStatus,
      refundHistory: [...(selectedInvoice.raw.refundHistory || []), refundPayload],
    });

    if (originalPayment) {
      await payments.update(originalPayment.id, {
        ...originalPayment.raw,
        refundedAmount: Number(originalPayment.refundedAmount || 0) + refundAmountValue,
        status: refundAmountValue >= originalPayment.amount ? 'Refunded' : originalPayment.raw.status || 'Completed',
      });
    }

    setMessage(`${nextRefundNo} processed. Accounting ${accountingPosted ? 'reversal posted' : 'reversal pending'}.`);
    setAmount(0);
  }

  return (
    <div className="p-3 md:p-4">
      <div className="rounded-2xl border border-[#e5e7eb] bg-[#f7f7f8] p-5 md:p-6">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h1 className="m-0 text-[18px] font-extrabold uppercase text-[#111827]">Refunds</h1>
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-white text-blue-600"><ArrowRightLeft size={17} /></span>
        </div>

        {message && <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-[13px] font-semibold text-green-700">{message}</div>}

        <div className="mb-6 max-w-xl">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
            <input className={`${INPUT} w-full pl-8`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search Invoice / Patient / Receipt" />
          </div>
          {searchResults.length > 0 && (
            <div className="mt-2 grid gap-2">
              {searchResults.map((invoice) => (
                <button key={`${invoice.source}-${invoice.id}`} type="button" onClick={() => setSelectedInvoiceId(`${invoice.source}:${invoice.id}`)} className={`grid gap-1 rounded-md border px-3 py-2 text-left text-[13px] cursor-pointer sm:grid-cols-[1fr_auto] ${selectedInvoice?.id === invoice.id && selectedInvoice?.source === invoice.source ? 'border-blue-600 bg-blue-50' : 'border-[#dbe4ef] bg-white hover:bg-blue-50'}`}>
                  <span><strong>{invoice.invoiceNo}</strong> - {invoice.patient}</span>
                  <strong>{money(invoice.paid)}</strong>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mb-8 h-px max-w-xl bg-[#111827]" />

        {selectedInvoice ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,520px)_minmax(260px,1fr)]">
            <div>
              <div className="mb-6 text-[14px] font-semibold leading-7 text-[#111827]">
                <div>Invoice: {selectedInvoice.invoiceNo}</div>
                <div>Patient: {selectedInvoice.patient}</div>
              </div>

              <div className="mb-6 max-w-md text-[13px]">
                <div className="flex justify-between py-1"><span>Total Paid</span><strong>{money(totalPaid)}</strong></div>
                <div className="flex justify-between py-1"><span>Previously Refunded</span><strong>{money(previouslyRefunded)}</strong></div>
                <div className="flex justify-between py-1 text-[15px] font-extrabold"><span>Available to Refund</span><strong>{money(available)}</strong></div>
              </div>

              <div className="mb-5">
                <div className="mb-2 text-[13px] font-semibold text-[#111827]">Refund Type</div>
                <label className="mb-1 flex items-center gap-2 text-[13px]"><input type="radio" checked={refundType === 'Partial'} onChange={() => setRefundType('Partial')} />Partial</label>
                <label className="flex items-center gap-2 text-[13px]"><input type="radio" checked={refundType === 'Full'} onChange={() => setRefundType('Full')} />Full</label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label><span className="mb-1 block text-[12px] font-extrabold uppercase text-[#536173]">Refund Amount</span><input className={`${INPUT} w-full`} disabled={refundType === 'Full'} min="0" max={available} type="number" value={refundType === 'Full' ? available : amount} onChange={(event) => setAmount(Number(event.target.value))} /></label>
                <label><span className="mb-1 block text-[12px] font-extrabold uppercase text-[#536173]">Reason *</span><select className={`${INPUT} w-full`} value={reason} onChange={(event) => setReason(event.target.value)}>{REASONS.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label><span className="mb-1 block text-[12px] font-extrabold uppercase text-[#536173]">Refund Method</span><select className={`${INPUT} w-full`} value={method} onChange={(event) => setMethod(event.target.value)}>{REFUND_METHODS.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label><span className="mb-1 block text-[12px] font-extrabold uppercase text-[#536173]">Requested By</span><input className={`${INPUT} w-full`} value={requestedBy} onChange={(event) => setRequestedBy(event.target.value)} /></label>
                <label><span className="mb-1 block text-[12px] font-extrabold uppercase text-[#536173]">Approved By</span><input className={`${INPUT} w-full`} value={approvedBy} onChange={(event) => setApprovedBy(event.target.value)} /></label>
                <label className="md:col-span-2"><span className="mb-1 block text-[12px] font-extrabold uppercase text-[#536173]">Notes</span><textarea className={`${INPUT} min-h-20 w-full`} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
              </div>

              <div className="mt-6 flex justify-end">
                <Button tone="green" disabled={!available || refundAmountValue <= 0 || refundAmountValue > available} onClick={processRefund}>
                  Process Refund
                </Button>
              </div>
            </div>

            <aside className="rounded-lg border border-[#dfe7f1] bg-white p-4">
              <div className="mb-3 flex items-center gap-2 text-[13px] font-extrabold text-[#071936]"><ShieldCheck size={16} />Refund Control</div>
              <div className="grid gap-2 text-[13px] text-[#374151]">
                <div className="flex items-start gap-2"><CheckCircle2 size={15} className="mt-0.5 text-green-600" />Cashier request is recorded.</div>
                <div className="flex items-start gap-2"><CheckCircle2 size={15} className="mt-0.5 text-green-600" />Manager/Admin approval is required.</div>
                <div className="flex items-start gap-2"><CheckCircle2 size={15} className="mt-0.5 text-green-600" />Original receipt and payment method are linked.</div>
                <div className="flex items-start gap-2"><CheckCircle2 size={15} className="mt-0.5 text-green-600" />Accounting reversal is attempted automatically.</div>
              </div>
              <div className="mt-4 rounded-md bg-[#f8fbff] p-3 text-[12px] font-semibold text-[#64748b]">
                Original payment: {originalPayment?.receiptNo || 'Not linked'}<br />
                Method: {originalPayment?.method || selectedInvoice.paymentMethod || '-'}
              </div>
            </aside>
          </div>
        ) : (
          <div className="rounded-md border border-[#dbe4ef] bg-white px-4 py-8 text-center text-[13px] text-[#64748b]">Search and select a paid invoice or receipt to process refund.</div>
        )}
      </div>
    </div>
  );
}
