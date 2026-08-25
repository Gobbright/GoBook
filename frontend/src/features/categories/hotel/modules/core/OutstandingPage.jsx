import { useEffect, useMemo, useState } from 'react';
import { Bell, Download, IndianRupee, Search, Wallet } from 'lucide-react';

import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';
import { createModuleRecord, listModuleRecords } from '../../../../../services/moduleRecordsService.js';

const AGE_FILTERS = ['All Ages', 'Current', '1-7 Days', '8-30 Days', '31-60 Days', '60+ Days'];
const ROOM_TYPES = ['All Room Types', 'Standard', 'Deluxe', 'Suite', 'Corporate'];
const STATUS_FILTERS = ['All Status', 'Pending', 'Partial', 'Overdue', 'Corporate'];

function money(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0));
}

const EMPTY_PAYMENT = { amount: '', method: 'UPI', reference: '' };

function normalizePayment(record) {
  const data = record.data || {};
  return {
    invoice: data.invoice || data.invoiceNo || data.billNo || '',
    guest: data.guest || data.guestName || '',
    room: data.room || data.roomNumber || '',
    amount: Number(data.amount || 0),
  };
}

function sameText(left, right) {
  return String(left || '').trim().toLowerCase() === String(right || '').trim().toLowerCase();
}

function normalizeInvoice(record, payments = [], source = {}) {
  const data = record.data || {};
  const total = Number(data.grandTotal || data.total || data.amount || 0);
  const invoice = data.invoiceNo || data.billNo || data.folioNo || `${source.prefix || 'INV'}-${record._id?.slice?.(-4) || '0000'}`;
  const guest = data.guestName || data.guest || 'Guest';
  const room = data.roomNumber || data.room || '-';
  const linkedPayments = payments.filter((payment) => (
    (payment.invoice && sameText(payment.invoice, invoice))
    || (source.kind !== 'checkout' && sameText(payment.guest, guest) && sameText(payment.room, room))
  ));
  const checkoutPaid = data.outstanding !== undefined
    ? Math.max(0, total - Number(data.outstanding || 0))
    : Number(data.paymentAmount || 0);
  const paid = (source.kind === 'checkout' ? checkoutPaid : Number(data.paid || data.advancePaid || data.paidAmount || 0)) + linkedPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const due = Math.max(0, total - paid);
  if (due <= 0) return null;
  return {
    id: record._id,
    guest,
    room,
    roomType: data.roomType || 'Deluxe',
    invoice,
    source: source.label || 'Bill',
    total,
    paid,
    age: data.age || (due > 50000 ? '31-60 Days' : 'Current'),
    status: paid > 0 ? 'Partial' : 'Pending',
    terms: data.paymentTerms || '',
  };
}

function Badge({ status }) {
  const tone = {
    Pending: 'bg-amber-100 text-amber-700',
    Partial: 'bg-blue-100 text-blue-700',
    Overdue: 'bg-rose-100 text-rose-700',
    Corporate: 'bg-indigo-100 text-indigo-700',
  };
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${tone[status] || tone.Pending}`}>{status}</span>;
}

export function OutstandingPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ageFilter, setAgeFilter] = useState('All Ages');
  const [roomTypeFilter, setRoomTypeFilter] = useState('All Room Types');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [paymentForm, setPaymentForm] = useState(EMPTY_PAYMENT);
  const [savingPayment, setSavingPayment] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      listModuleRecords('hotel/billing/new-bill').catch(() => ({ records: [] })),
      listModuleRecords('hotel/billing/guest-billing').catch(() => ({ records: [] })),
      listModuleRecords('hotel/front-desk/check-out').catch(() => ({ records: [] })),
      listModuleRecords('hotel/billing/payments').catch(() => ({ records: [] })),
    ]).then(([billRes, folioRes, checkoutRes, paymentRes]) => {
      if (!active) return;
      const payments = (paymentRes.records || []).map(normalizePayment);
      const mapped = [
        ...(billRes.records || []).map((record) => normalizeInvoice(record, payments, { label: 'Hotel Guest Bill', prefix: 'INV' })),
        ...(folioRes.records || []).map((record) => normalizeInvoice(record, payments, { label: 'Guest Folio', prefix: 'FOLIO' })),
        ...(checkoutRes.records || []).map((record) => normalizeInvoice(record, payments, { label: 'Checkout Bill', prefix: 'CHK', kind: 'checkout' })),
      ].filter(Boolean);
      setRecords(mapped);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records.filter((record) => {
      const matchesSearch = !query || [record.guest, record.room, record.invoice].some((value) => String(value).toLowerCase().includes(query));
      const matchesAge = ageFilter === 'All Ages' || record.age === ageFilter;
      const matchesRoomType = roomTypeFilter === 'All Room Types' || record.roomType === roomTypeFilter;
      const matchesStatus = statusFilter === 'All Status' || record.status === statusFilter;
      return matchesSearch && matchesAge && matchesRoomType && matchesStatus;
    });
  }, [ageFilter, records, roomTypeFilter, search, statusFilter]);

  const totalOutstanding = filteredRecords.reduce((sum, record) => sum + Math.max(0, Number(record.total || 0) - Number(record.paid || 0)), 0);
  const aging = AGE_FILTERS.slice(1).map((age) => ({
    age,
    amount: records.filter((record) => record.age === age).reduce((sum, record) => sum + Math.max(0, record.total - record.paid), 0),
  }));
  const corporate = records.filter((record) => record.status === 'Corporate');

  function notify(action, record) {
    setMessage(`${action} prepared for ${record.guest} - ${record.invoice}.`);
  }

  function openCollection(record) {
    const due = Math.max(0, record.total - record.paid);
    setSelectedRecord(record);
    setPaymentForm({ amount: String(due), method: 'UPI', reference: '' });
    setMessage('');
  }

  async function collectPayment(event) {
    event.preventDefault();
    if (!selectedRecord || Number(paymentForm.amount || 0) <= 0) return;
    setSavingPayment(true);
    const amount = Number(paymentForm.amount || 0);
    const receiptNo = `PAY-${Date.now().toString().slice(-6)}`;
    const payload = {
      receiptNo,
      paymentId: receiptNo,
      guestName: selectedRecord.guest,
      guest: selectedRecord.guest,
      roomNumber: selectedRecord.room,
      room: selectedRecord.room,
      invoiceNo: selectedRecord.invoice,
      invoice: selectedRecord.invoice,
      amount,
      method: paymentForm.method,
      paymentMethod: paymentForm.method,
      referenceNumber: paymentForm.reference,
      paymentDate: new Date().toISOString().slice(0, 10),
      status: amount >= Math.max(0, selectedRecord.total - selectedRecord.paid) ? 'RECEIVED' : 'PARTIAL',
    };
    try {
      await createModuleRecord('hotel/billing/payments', payload);
      setRecords((current) => current
        .map((record) => (record.id === selectedRecord.id ? { ...record, paid: record.paid + amount, status: record.paid + amount >= record.total ? 'Paid' : 'Partial' } : record))
        .filter((record) => Math.max(0, record.total - record.paid) > 0));
      setSelectedRecord(null);
      setPaymentForm(EMPTY_PAYMENT);
      setMessage(`${receiptNo} collected for ${selectedRecord.guest}.`);
    } catch (error) {
      setMessage(error.message || 'Unable to collect payment.');
    } finally {
      setSavingPayment(false);
    }
  }

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-7">
      <section className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="m-0 text-[12px] font-semibold uppercase tracking-wide text-blue-700">Billing</p>
          <h1 className="m-0 mt-1 text-[28px] font-bold text-slate-950">Outstanding</h1>
          <p className="m-0 mt-2 text-sm text-slate-500">Track unpaid guest, room, invoice, and corporate balances with aging.</p>
        </div>
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
          <div className="text-[12px] font-bold uppercase text-blue-700">Total Outstanding</div>
          <div className="text-2xl font-bold text-blue-900">{money(totalOutstanding)}</div>
        </div>
      </section>

      {message && <p className="mb-4 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-[13px] text-blue-700">{message}</p>}

      <section className="mb-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="grid gap-3 border-b border-slate-100 p-4 lg:grid-cols-[minmax(260px,1fr)_170px_190px_170px]">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Guest / Room / Invoice" className="w-full rounded-md border border-slate-200 bg-white py-2 pl-9 pr-3 text-[13px] outline-none focus:border-blue-500" />
            </div>
            <SelectDropdown value={ageFilter} onChange={setAgeFilter} options={AGE_FILTERS} />
            <SelectDropdown value={roomTypeFilter} onChange={setRoomTypeFilter} options={ROOM_TYPES} />
            <SelectDropdown value={statusFilter} onChange={setStatusFilter} options={STATUS_FILTERS} />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left text-sm">
              <thead>
                <tr className="text-[12px] uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3">Guest</th>
                  <th className="px-5 py-3">Room</th>
                  <th className="px-5 py-3">Invoice</th>
                  <th className="px-5 py-3">Total</th>
                  <th className="px-5 py-3">Paid</th>
                  <th className="px-5 py-3">Due</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="px-5 py-10 text-center text-[13px] text-slate-500">Loading outstanding balances...</td></tr>
                ) : filteredRecords.length === 0 ? (
                  <tr><td colSpan={8} className="px-5 py-10 text-center text-[13px] text-slate-500">No outstanding balances found.</td></tr>
                ) : filteredRecords.map((record, index) => {
                  const due = Math.max(0, record.total - record.paid);
                  return (
                    <tr key={`${record.invoice}-${index}`} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900">{record.guest}</div>
                        {record.terms && <div className="text-[12px] text-slate-500">Terms: {record.terms}</div>}
                      </td>
                      <td className="px-5 py-4 text-slate-700">{record.room}</td>
                      <td className="px-5 py-4 text-slate-700">{record.invoice}</td>
                      <td className="px-5 py-4 text-slate-700">{money(record.total)}</td>
                      <td className="px-5 py-4 text-slate-700">{money(record.paid)}</td>
                      <td className="px-5 py-4 font-bold text-slate-950">{money(due)}</td>
                      <td className="px-5 py-4"><Badge status={record.status} /></td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <button type="button" onClick={() => openCollection(record)} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700">
                            <Wallet size={13} />
                            Collect
                          </button>
                          <button type="button" onClick={() => notify('Reminder', record)} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700">
                            <Bell size={13} />
                            Remind
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="space-y-5">
          {selectedRecord && (
            <form onSubmit={collectPayment} className="rounded-lg border border-blue-200 bg-white p-5">
              <h2 className="m-0 text-[18px] font-bold text-slate-950">Collect Payment</h2>
              <p className="m-0 mt-1 text-[13px] text-slate-500">{selectedRecord.guest} | Room {selectedRecord.room} | {selectedRecord.invoice}</p>
              <div className="mt-4 space-y-3">
                <div className="flex justify-between text-[13px]"><span className="text-slate-500">Due</span><strong>{money(selectedRecord.total - selectedRecord.paid)}</strong></div>
                <input value={paymentForm.amount} onChange={(event) => setPaymentForm((current) => ({ ...current, amount: event.target.value }))} type="number" min="0" className="w-full rounded-md border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-blue-500" placeholder="Payment amount" />
                <SelectDropdown value={paymentForm.method} onChange={(method) => setPaymentForm((current) => ({ ...current, method }))} options={['UPI', 'Cash', 'Card', 'Bank Transfer']} />
                <input value={paymentForm.reference} onChange={(event) => setPaymentForm((current) => ({ ...current, reference: event.target.value }))} className="w-full rounded-md border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-blue-500" placeholder="Reference no." />
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setSelectedRecord(null)} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700">Cancel</button>
                  <button type="submit" disabled={savingPayment} className="rounded-md bg-blue-600 px-3 py-2 text-[13px] font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{savingPayment ? 'Saving...' : 'Save Payment'}</button>
                </div>
              </div>
            </form>
          )}

          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <IndianRupee size={18} className="text-blue-600" />
              <h2 className="m-0 text-[18px] font-bold text-slate-950">Aging</h2>
            </div>
            <div className="space-y-3">
              {aging.map((bucket) => (
                <div key={bucket.age} className="flex items-center justify-between rounded-md bg-slate-50 p-3 text-[13px]">
                  <span className="font-semibold text-slate-600">{bucket.age}</span>
                  <strong className="text-slate-950">{money(bucket.amount)}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="m-0 text-[18px] font-bold text-slate-950">Corporate Outstanding</h2>
            <div className="mt-4 space-y-3">
              {corporate.length === 0 ? (
                <p className="m-0 text-[13px] text-slate-500">No corporate outstanding found.</p>
              ) : corporate.map((record) => (
                <div key={record.invoice} className="rounded-md bg-indigo-50 p-3 text-[13px]">
                  <div className="font-bold text-indigo-900">{record.guest}</div>
                  <div className="mt-1 text-indigo-700">Outstanding: {money(record.total - record.paid)}</div>
                  <div className="text-indigo-700">{record.invoice}</div>
                  <div className="text-indigo-700">Payment Terms: {record.terms || '30 Days'}</div>
                </div>
              ))}
            </div>
          </section>

          <button type="button" onClick={() => setMessage('Outstanding report export prepared.')} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-blue-700">
            <Download size={15} />
            Export Report
          </button>
        </aside>
      </section>
    </div>
  );
}
