import { useEffect, useMemo, useState } from 'react';
import { CreditCard, FileText, Plus, RotateCcw, Search } from 'lucide-react';

import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';
import { createModuleRecord, listModuleRecords } from '../../../../../services/moduleRecordsService.js';

const DATE_FILTERS = ['Today', 'This Week', 'All Dates'];
const PAYMENT_METHODS = ['Cash', 'Card', 'UPI', 'Bank Transfer', 'Online Payment', 'Room Deposit', 'Credit'];
const METHOD_FILTERS = ['All Methods', ...PAYMENT_METHODS];
const STATUS_FILTERS = ['All Status', 'RECEIVED', 'PARTIAL', 'REVERSED'];

const EMPTY_FORM = {
  guest: '',
  room: '',
  invoice: '',
  totalAmount: 0,
  alreadyPaid: 0,
  amount: 0,
  method: 'UPI',
  referenceNumber: '',
  paymentDate: '',
  notes: '',
  split: { Cash: '', UPI: '', Card: '' },
};

function money(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0));
}

function normalizePayment(record) {
  const data = record.data || {};
  return {
    id: record._id,
    rawData: data,
    paymentId: data.paymentId || data.receiptNo || '',
    guest: data.guest || data.guestName || '',
    room: data.room || data.roomNumber || '',
    invoice: data.invoice || data.invoiceNo || data.billNo || '',
    method: data.method || data.paymentMethod || data.mode || '',
    amount: Number(data.amount || 0),
    status: data.status || 'RECEIVED',
    referenceNumber: data.referenceNumber || data.reference || '',
    paymentDate: data.paymentDate || data.date || '',
    notes: data.notes || '',
  };
}

function chargeAmount(charge) {
  if (charge.amount !== undefined) return Number(charge.amount || 0);
  return Number(charge.qty || 0) * Number(charge.rate || 0);
}

function normalizeInvoice(record, source) {
  const data = record.data || {};
  const charges = Array.isArray(data.charges) ? data.charges : [];
  const total = Number(data.grandTotal || data.total || data.amount || charges.reduce((sum, charge) => sum + chargeAmount(charge), 0));
  const paid = Number(data.paid || data.advancePaid || data.paidAmount || 0);
  const balance = Number(data.balance ?? Math.max(0, total - paid));
  return {
    id: record._id,
    invoice: data.invoiceNo || data.billNo || data.folioNo || `${source}-${record._id?.slice?.(-4) || '0000'}`,
    guest: data.guestName || data.guest || '',
    room: data.roomNumber || data.room || '',
    total,
    paid,
    balance,
  };
}

function Badge({ status }) {
  const tone = {
    RECEIVED: 'bg-emerald-100 text-emerald-700',
    PARTIAL: 'bg-amber-100 text-amber-700',
    REVERSED: 'bg-rose-100 text-rose-700',
  };
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${tone[status] || tone.RECEIVED}`}>{status}</span>;
}

export function HotelPaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('Today');
  const [methodFilter, setMethodFilter] = useState('All Methods');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      listModuleRecords('hotel/billing/payments').catch(() => ({ records: [] })),
      listModuleRecords('hotel/billing/new-bill').catch(() => ({ records: [] })),
      listModuleRecords('hotel/billing/guest-billing').catch(() => ({ records: [] })),
      listModuleRecords('hotel/restaurant-pos/billing').catch(() => ({ records: [] })),
    ])
      .then(([paymentRes, billRes, folioRes, restaurantRes]) => {
        if (!active) return;
        setPayments((paymentRes.records || []).map(normalizePayment));
        const invoiceRows = [
          ...(billRes.records || []).map((record) => normalizeInvoice(record, 'INV')),
          ...(folioRes.records || []).map((record) => normalizeInvoice(record, 'FOLIO')),
          ...(restaurantRes.records || []).map((record) => normalizeInvoice(record, 'RES')),
        ].filter((item) => item.guest || item.invoice);
        setInvoices(invoiceRows);
      })
      .catch(() => {
        if (active) setPayments([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const outstanding = Math.max(0, Number(form.totalAmount || 0) - Number(form.alreadyPaid || 0));
  const splitTotal = Object.values(form.split).reduce((sum, value) => sum + Number(value || 0), 0);
  const receivedAmount = splitTotal > 0 ? splitTotal : Number(form.amount || 0);
  const balance = Math.max(0, outstanding - receivedAmount);

  const filteredPayments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return payments.filter((payment) => {
      const matchesSearch = !query || [payment.paymentId, payment.guest, payment.invoice].some((value) => String(value).toLowerCase().includes(query));
      const matchesMethod = methodFilter === 'All Methods' || payment.method === methodFilter;
      const matchesStatus = statusFilter === 'All Status' || payment.status === statusFilter;
      const matchesDate = dateFilter === 'All Dates' || true;
      return matchesSearch && matchesMethod && matchesStatus && matchesDate;
    });
  }, [dateFilter, methodFilter, payments, search, statusFilter]);

  function updateSplit(method, value) {
    setForm((current) => ({ ...current, split: { ...current.split, [method]: value } }));
  }

  function selectInvoice(invoiceNo) {
    const invoice = invoices.find((item) => item.invoice === invoiceNo);
    setForm((current) => ({
      ...current,
      invoice: invoiceNo,
      guest: invoice?.guest || '',
      room: invoice?.room || '',
      totalAmount: invoice?.total || 0,
      alreadyPaid: invoice?.paid || 0,
      amount: invoice?.balance || 0,
    }));
  }

  async function receivePayment(event) {
    event.preventDefault();
    if (!form.guest || !form.invoice || receivedAmount <= 0) return;
    setSaving(true);
    setMessage('');
    const paymentId = `PAY-${String(1025 + payments.length).padStart(4, '0')}`;
    const payload = {
      paymentId,
      receiptNo: paymentId,
      guestName: form.guest,
      guest: form.guest,
      roomNumber: form.room,
      room: form.room,
      invoiceNo: form.invoice,
      amount: receivedAmount,
      method: splitTotal > 0 ? 'Split Payment' : form.method,
      split: form.split,
      referenceNumber: form.referenceNumber,
      paymentDate: form.paymentDate,
      notes: form.notes,
      totalAmount: Number(form.totalAmount || 0),
      alreadyPaid: Number(form.alreadyPaid || 0),
      outstandingBefore: outstanding,
      balance,
      status: balance > 0 ? 'PARTIAL' : 'RECEIVED',
    };
    try {
      const saved = await createModuleRecord('hotel/billing/payments', payload);
      setPayments((current) => [normalizePayment(saved.record || { _id: paymentId, data: payload }), ...current]);
      setForm({ ...EMPTY_FORM, alreadyPaid: Number(form.alreadyPaid || 0) + receivedAmount, amount: balance });
      setShowForm(false);
      setMessage(`${paymentId} received. Balance: ${money(balance)}.`);
    } catch (err) {
      setMessage(err.message || 'Unable to receive payment');
    } finally {
      setSaving(false);
    }
  }

  function reversePayment(payment) {
    setPayments((current) => current.map((item) => (item.id === payment.id ? { ...item, status: 'REVERSED' } : item)));
    setMessage(`${payment.paymentId} marked for reversal approval.`);
  }

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-7">
      <section className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="m-0 text-[12px] font-semibold uppercase tracking-wide text-blue-700">Billing</p>
          <h1 className="m-0 mt-1 text-[28px] font-bold text-slate-950">Payments</h1>
          <p className="m-0 mt-2 text-sm text-slate-500">Receive guest, invoice, advance, partial, and split payments with receipt history.</p>
        </div>
        <button type="button" onClick={() => setShowForm((value) => !value)} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-blue-700">
          <Plus size={16} />
          Receive Payment
        </button>
      </section>

      {message && <p className="mb-4 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-[13px] text-blue-700">{message}</p>}

      <section className="mb-5 rounded-lg border border-slate-200 bg-white">
        <div className="grid gap-3 border-b border-slate-100 p-4 lg:grid-cols-[minmax(260px,1fr)_170px_190px_170px]">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Guest / Invoice / Payment ID" className="w-full rounded-md border border-slate-200 bg-white py-2 pl-9 pr-3 text-[13px] outline-none focus:border-blue-500" />
          </div>
          <SelectDropdown value={dateFilter} onChange={setDateFilter} options={DATE_FILTERS} />
          <SelectDropdown value={methodFilter} onChange={setMethodFilter} options={METHOD_FILTERS} />
          <SelectDropdown value={statusFilter} onChange={setStatusFilter} options={STATUS_FILTERS} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead>
              <tr className="text-[12px] uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3">Payment ID</th>
                <th className="px-5 py-3">Guest</th>
                <th className="px-5 py-3">Invoice</th>
                <th className="px-5 py-3">Method</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-[13px] text-slate-500">Loading payments...</td></tr>
              ) : filteredPayments.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-[13px] text-slate-500">No payments found.</td></tr>
              ) : filteredPayments.map((payment) => (
                <tr key={payment.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-5 py-4 font-bold text-slate-900">{payment.paymentId || '-'}</td>
                  <td className="px-5 py-4 text-slate-700">{payment.guest || '-'}</td>
                  <td className="px-5 py-4 text-slate-700">{payment.invoice || '-'}</td>
                  <td className="px-5 py-4 text-slate-700">{payment.method || '-'}</td>
                  <td className="px-5 py-4 font-bold text-slate-900">{money(payment.amount)}</td>
                  <td className="px-5 py-4"><Badge status={payment.status} /></td>
                  <td className="px-5 py-4">
                    {payment.status !== 'REVERSED' && (
                      <button type="button" onClick={() => reversePayment(payment)} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:border-rose-300 hover:text-rose-700">
                        <RotateCcw size={13} />
                        Reverse
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {showForm && (
        <form onSubmit={receivePayment} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="mb-5 flex items-center gap-2">
              <CreditCard size={20} className="text-blue-600" />
              <h2 className="m-0 text-[18px] font-bold text-slate-950">Receive Payment</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div>
                <label className="mb-1 block text-[12px] font-bold uppercase text-slate-500">Guest</label>
                <input value={form.guest} readOnly className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-bold uppercase text-slate-500">Invoice</label>
                <SelectDropdown
                  value={form.invoice}
                  onChange={selectInvoice}
                  options={[{ label: 'Select invoice / folio', value: '' }, ...invoices.map((invoice) => ({ label: `${invoice.invoice} - ${invoice.guest} - ${money(invoice.balance)}`, value: invoice.invoice }))]}
                />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-bold uppercase text-slate-500">Room</label>
                <input value={form.room} readOnly className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-bold uppercase text-slate-500">Payment Date</label>
                <input value={form.paymentDate} onChange={(e) => setForm((current) => ({ ...current, paymentDate: e.target.value }))} className="w-full rounded-md border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-bold uppercase text-slate-500">Payment Amount</label>
                <input value={form.amount} onChange={(e) => setForm((current) => ({ ...current, amount: e.target.value }))} type="number" min="0" className="w-full rounded-md border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-bold uppercase text-slate-500">Payment Method</label>
                <SelectDropdown value={form.method} onChange={(method) => setForm((current) => ({ ...current, method }))} options={PAYMENT_METHODS} />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-bold uppercase text-slate-500">Reference Number</label>
                <input value={form.referenceNumber} onChange={(e) => setForm((current) => ({ ...current, referenceNumber: e.target.value }))} className="w-full rounded-md border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-blue-500" />
              </div>
            </div>

            <div className="mt-5 rounded-lg border border-slate-200 p-4">
              <h3 className="m-0 mb-3 flex items-center gap-2 text-[15px] font-bold text-slate-950">
                <FileText size={16} className="text-blue-600" />
                Split Payment
              </h3>
              <div className="grid gap-3 md:grid-cols-3">
                {['Cash', 'UPI', 'Card'].map((method) => (
                  <div key={method}>
                    <label className="mb-1 block text-[12px] font-bold uppercase text-slate-500">{method}</label>
                    <input value={form.split[method]} onChange={(e) => updateSplit(method, e.target.value)} type="number" min="0" className="w-full rounded-md border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-blue-500" />
                  </div>
                ))}
              </div>
            </div>

            <label className="mb-1 mt-4 block text-[12px] font-bold uppercase text-slate-500">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} rows={3} className="w-full resize-none rounded-md border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-blue-500" />
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-md border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-slate-700">Cancel</button>
              <button type="submit" disabled={saving} className="rounded-md bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-blue-700 disabled:opacity-60">Receive Payment</button>
            </div>
          </section>

          <aside className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="m-0 mb-4 text-[18px] font-bold text-slate-950">Invoice Balance</h2>
            <div className="space-y-3 text-[13px]">
              <div className="flex justify-between"><span className="text-slate-500">Total Amount</span><strong>{money(form.totalAmount)}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">Already Paid</span><strong>{money(form.alreadyPaid)}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">Outstanding</span><strong>{money(outstanding)}</strong></div>
              <div className="border-t border-slate-100 pt-3 flex justify-between"><span className="text-slate-500">Receiving</span><strong>{money(receivedAmount)}</strong></div>
              <div className="rounded-md bg-blue-50 p-3 flex justify-between text-[18px]"><span className="font-bold text-blue-700">Balance</span><strong className="text-blue-700">{money(balance)}</strong></div>
            </div>
          </aside>
        </form>
      )}
    </div>
  );
}
