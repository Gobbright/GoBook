import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, FileText, Plus, RotateCcw, Search, XCircle } from 'lucide-react';

import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';
import { createModuleRecord, listModuleRecords, updateModuleRecord } from '../../../../../services/moduleRecordsService.js';

const REFUND_REASONS = ['Reservation Cancellation', 'Restaurant Cancellation', 'Overpayment', 'Deposit Refund', 'Service Cancellation', 'Billing Correction'];
const REFUND_METHODS = ['Cash', 'Card', 'UPI', 'Bank Transfer', 'Online Payment'];
const STATUS_FILTERS = ['All Status', 'PENDING', 'APPROVED', 'COMPLETED', 'REJECTED'];

const EMPTY_FORM = {
  guest: '',
  invoice: '',
  originalAmount: 0,
  paidAmount: 0,
  reason: 'Reservation Cancellation',
  amount: 0,
  method: 'UPI',
  referenceNumber: '',
  notes: '',
};

function money(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0));
}

function normalizeRefund(record) {
  const data = record.data || {};
  return {
    id: record._id,
    rawData: data,
    refundId: data.refundId || data.refundNo || '',
    guest: data.guest || data.guestName || '',
    invoice: data.invoice || data.invoiceNo || '',
    amount: Number(data.amount || data.refundAmount || 0),
    status: data.status || 'PENDING',
    reason: data.reason || data.refundReason || '',
    method: data.method || data.refundMethod || '',
    referenceNumber: data.referenceNumber || '',
    requestedBy: data.requestedBy || 'Reception',
    approvedBy: data.approvedBy || '',
    notes: data.notes || '',
  };
}

function Badge({ status }) {
  const tone = {
    PENDING: 'bg-amber-100 text-amber-700',
    APPROVED: 'bg-blue-100 text-blue-700',
    COMPLETED: 'bg-emerald-100 text-emerald-700',
    REJECTED: 'bg-rose-100 text-rose-700',
  };
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${tone[status] || tone.PENDING}`}>{status}</span>;
}

export function RefundsPage() {
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    listModuleRecords('hotel/billing/refunds')
      .then((res) => {
        if (!active) return;
        setRefunds((res.records || []).map(normalizeRefund));
      })
      .catch(() => {
        if (active) setRefunds([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const filteredRefunds = useMemo(() => {
    const query = search.trim().toLowerCase();
    return refunds.filter((refund) => {
      const matchesSearch = !query || [refund.refundId, refund.guest, refund.invoice].some((value) => String(value).toLowerCase().includes(query));
      const matchesStatus = statusFilter === 'All Status' || refund.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [refunds, search, statusFilter]);

  const largeRefunds = refunds.filter((refund) => refund.amount >= 25000 && refund.status === 'PENDING');

  async function submitRefund(event) {
    event.preventDefault();
    if (!form.guest || !form.invoice || !form.amount) return;
    setSaving(true);
    setMessage('');
    const refundId = `REF-${String(1025 + refunds.length).padStart(4, '0')}`;
    const payload = {
      refundId,
      guestName: form.guest,
      invoiceNo: form.invoice,
      originalAmount: Number(form.originalAmount || 0),
      paidAmount: Number(form.paidAmount || 0),
      reason: form.reason,
      amount: Number(form.amount || 0),
      method: form.method,
      referenceNumber: form.referenceNumber,
      notes: form.notes,
      requestedBy: 'Reception',
      status: Number(form.amount || 0) >= 25000 ? 'PENDING' : 'APPROVED',
    };
    try {
      const saved = await createModuleRecord('hotel/billing/refunds', payload);
      setRefunds((current) => [normalizeRefund(saved.record || { _id: refundId, data: payload }), ...current]);
      setForm(EMPTY_FORM);
      setShowForm(false);
      setMessage(`${refundId} submitted for ${payload.status === 'PENDING' ? 'manager approval' : 'refund processing'}.`);
    } catch (err) {
      setMessage(err.message || 'Unable to submit refund');
    } finally {
      setSaving(false);
    }
  }

  async function updateRefund(refund, status) {
    const payload = {
      ...refund.rawData,
      status,
      approvedBy: status === 'APPROVED' || status === 'COMPLETED' ? 'Manager' : refund.approvedBy,
    };
    try {
      await updateModuleRecord(refund.id, payload);
      setRefunds((current) => current.map((item) => (item.id === refund.id ? normalizeRefund({ _id: refund.id, data: payload }) : item)));
      setMessage(`${refund.refundId} ${status.toLowerCase()}.`);
    } catch (err) {
      setMessage(err.message || 'Unable to update refund');
    }
  }

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-7">
      <section className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="m-0 text-[12px] font-semibold uppercase tracking-wide text-blue-700">Billing</p>
          <h1 className="m-0 mt-1 text-[28px] font-bold text-slate-950">Refunds</h1>
          <p className="m-0 mt-2 text-sm text-slate-500">Manage guest refunds from cancellations, overpayments, deposit returns, service reversals, and billing corrections.</p>
        </div>
        <button type="button" onClick={() => setShowForm((value) => !value)} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-blue-700">
          <Plus size={16} />
          New Refund
        </button>
      </section>

      {message && <p className="mb-4 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-[13px] text-blue-700">{message}</p>}

      <section className="mb-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="grid gap-3 border-b border-slate-100 p-4 md:grid-cols-[minmax(260px,1fr)_180px]">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Invoice / Guest / Refund ID" className="w-full rounded-md border border-slate-200 bg-white py-2 pl-9 pr-3 text-[13px] outline-none focus:border-blue-500" />
            </div>
            <SelectDropdown value={statusFilter} onChange={setStatusFilter} options={STATUS_FILTERS} />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead>
                <tr className="text-[12px] uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3">Refund ID</th>
                  <th className="px-5 py-3">Guest</th>
                  <th className="px-5 py-3">Invoice</th>
                  <th className="px-5 py-3">Reason</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-5 py-10 text-center text-[13px] text-slate-500">Loading refunds...</td></tr>
                ) : filteredRefunds.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-10 text-center text-[13px] text-slate-500">No refunds found.</td></tr>
                ) : filteredRefunds.map((refund) => (
                  <tr key={refund.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-5 py-4 font-bold text-slate-900">{refund.refundId || '-'}</td>
                    <td className="px-5 py-4 text-slate-700">{refund.guest || '-'}</td>
                    <td className="px-5 py-4 text-slate-700">{refund.invoice || '-'}</td>
                    <td className="px-5 py-4 text-slate-700">{refund.reason || '-'}</td>
                    <td className="px-5 py-4 font-bold text-slate-900">{money(refund.amount)}</td>
                    <td className="px-5 py-4"><Badge status={refund.status} /></td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        {refund.status === 'PENDING' && (
                          <>
                            <button type="button" onClick={() => updateRefund(refund, 'APPROVED')} className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[12px] font-semibold text-emerald-700">
                              <CheckCircle2 size={13} />
                              Approve
                            </button>
                            <button type="button" onClick={() => updateRefund(refund, 'REJECTED')} className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-[12px] font-semibold text-rose-700">
                              <XCircle size={13} />
                              Reject
                            </button>
                          </>
                        )}
                        {refund.status === 'APPROVED' && (
                          <button type="button" onClick={() => updateRefund(refund, 'COMPLETED')} className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-[12px] font-semibold text-blue-700">
                            <RotateCcw size={13} />
                            Refund
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="space-y-5">
          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="mb-3 flex items-center gap-2">
              <FileText size={18} className="text-blue-600" />
              <h2 className="m-0 text-[18px] font-bold text-slate-950">Approval Queue</h2>
            </div>
            {largeRefunds.length === 0 ? (
              <p className="m-0 text-[13px] text-slate-500">No large refunds awaiting approval.</p>
            ) : largeRefunds.map((refund) => (
              <div key={refund.id} className="rounded-md bg-amber-50 p-3 text-[13px]">
                <div className="font-bold text-amber-900">{refund.refundId} - {money(refund.amount)}</div>
                <div className="mt-1 text-amber-700">Requested By: {refund.requestedBy}</div>
                <div className="text-amber-700">Approved By: Manager</div>
              </div>
            ))}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="m-0 text-[18px] font-bold text-slate-950">Workflow</h2>
            <div className="mt-4 space-y-2 text-[13px] text-slate-600">
              <div>Refund Request</div>
              <div>Verify Original Payment</div>
              <div>Approval</div>
              <div className="rounded-md bg-blue-50 px-3 py-2 font-bold text-blue-700">Refund</div>
              <div>Payment Record Updated</div>
              <div>Invoice / Folio Adjusted</div>
            </div>
          </section>
        </aside>
      </section>

      {showForm && (
        <form onSubmit={submitRefund} className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="m-0 mb-5 text-[18px] font-bold text-slate-950">New Refund</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="mb-1 block text-[12px] font-bold uppercase text-slate-500">Guest</label>
              <input value={form.guest} onChange={(e) => setForm((current) => ({ ...current, guest: e.target.value }))} className="w-full rounded-md border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-bold uppercase text-slate-500">Invoice</label>
              <input value={form.invoice} onChange={(e) => setForm((current) => ({ ...current, invoice: e.target.value }))} className="w-full rounded-md border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-bold uppercase text-slate-500">Original Amount</label>
              <input value={form.originalAmount} onChange={(e) => setForm((current) => ({ ...current, originalAmount: e.target.value }))} type="number" min="0" className="w-full rounded-md border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-bold uppercase text-slate-500">Paid Amount</label>
              <input value={form.paidAmount} onChange={(e) => setForm((current) => ({ ...current, paidAmount: e.target.value }))} type="number" min="0" className="w-full rounded-md border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-bold uppercase text-slate-500">Refund Reason *</label>
              <SelectDropdown value={form.reason} onChange={(reason) => setForm((current) => ({ ...current, reason }))} options={REFUND_REASONS} />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-bold uppercase text-slate-500">Refund Amount *</label>
              <input value={form.amount} onChange={(e) => setForm((current) => ({ ...current, amount: e.target.value }))} type="number" min="0" className="w-full rounded-md border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-bold uppercase text-slate-500">Refund Method</label>
              <SelectDropdown value={form.method} onChange={(method) => setForm((current) => ({ ...current, method }))} options={REFUND_METHODS} />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-bold uppercase text-slate-500">Reference Number</label>
              <input value={form.referenceNumber} onChange={(e) => setForm((current) => ({ ...current, referenceNumber: e.target.value }))} className="w-full rounded-md border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-blue-500" />
            </div>
          </div>
          <label className="mb-1 mt-4 block text-[12px] font-bold uppercase text-slate-500">Notes</label>
          <textarea value={form.notes} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} rows={3} className="w-full resize-none rounded-md border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-blue-500" />
          <button type="submit" disabled={saving} className="mt-5 rounded-md bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-blue-700 disabled:opacity-60">Submit for Approval</button>
        </form>
      )}
    </div>
  );
}
