import { useEffect, useMemo, useState } from 'react';
import { FileText, Mail, Plus, Search, Send, Share2 } from 'lucide-react';

import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';
import { createModuleRecord, listModuleRecords, updateModuleRecord } from '../../../../../services/moduleRecordsService.js';

const STATUS_FILTERS = ['All Status', 'DRAFT', 'SENT', 'ACCEPTED', 'CONVERTED', 'EXPIRED'];
const ROOM_TYPES = ['Standard', 'Deluxe', 'Suite', 'Family Room', 'Premium Suite'];
const VALIDITY_OPTIONS = ['7 Days', '15 Days', '30 Days', '45 Days'];

const EMPTY_SERVICE = { description: '', amount: 0 };
const EMPTY_FORM = {
  guestCompany: '',
  contact: '',
  checkIn: '',
  checkOut: '',
  rooms: '',
  roomType: 'Deluxe',
  services: [],
  discount: 0,
  tax: 0,
  validity: '15 Days',
  terms: '',
};

function money(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0));
}

function normalizeEstimate(record) {
  const data = record.data || {};
  const services = Array.isArray(data.services) ? data.services : [];
  const subtotal = Number(data.subtotal || services.reduce((sum, service) => sum + Number(service.amount || 0), 0));
  const discount = Number(data.discount || 0);
  const tax = Number(data.tax || 0);
  const total = Number(data.total || Math.max(0, subtotal - discount + tax));
  return {
    id: record._id,
    rawData: data,
    estimateNo: data.estimateNo || '',
    guestCompany: data.guestCompany || data.company || data.guest || '',
    contact: data.contact || '',
    stay: data.stay || `${data.rooms || 0} Rooms`,
    checkIn: data.checkIn || '',
    checkOut: data.checkOut || '',
    rooms: data.rooms || '',
    roomType: data.roomType || '',
    services,
    subtotal,
    discount,
    tax,
    total,
    validity: data.validity || '',
    terms: data.terms || '',
    status: data.status || 'DRAFT',
  };
}

function Badge({ status }) {
  const tone = {
    DRAFT: 'bg-slate-100 text-slate-700',
    SENT: 'bg-blue-100 text-blue-700',
    ACCEPTED: 'bg-emerald-100 text-emerald-700',
    CONVERTED: 'bg-indigo-100 text-indigo-700',
    EXPIRED: 'bg-rose-100 text-rose-700',
  };
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${tone[status] || tone.DRAFT}`}>{status}</span>;
}

export function EstimatesPage() {
  const [estimates, setEstimates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [draftService, setDraftService] = useState(EMPTY_SERVICE);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    listModuleRecords('hotel/billing/estimates')
      .then((res) => {
        if (!active) return;
        setEstimates((res.records || []).map(normalizeEstimate));
      })
      .catch(() => {
        if (active) setEstimates([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const filteredEstimates = useMemo(() => {
    const query = search.trim().toLowerCase();
    return estimates.filter((estimate) => {
      const matchesSearch = !query || [estimate.estimateNo, estimate.guestCompany].some((value) => String(value).toLowerCase().includes(query));
      const matchesStatus = statusFilter === 'All Status' || estimate.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [estimates, search, statusFilter]);

  const subtotal = form.services.reduce((sum, service) => sum + Number(service.amount || 0), 0);
  const estimatedTotal = Math.max(0, subtotal - Number(form.discount || 0) + Number(form.tax || 0));

  function addService() {
    if (!draftService.description || !draftService.amount) return;
    setForm((current) => ({ ...current, services: [...current.services, draftService] }));
    setDraftService(EMPTY_SERVICE);
  }

  async function saveEstimate(status) {
    if (!form.guestCompany || form.services.length === 0) return;
    setSaving(true);
    setMessage('');
    const estimateNo = `EST-${String(1025 + estimates.length).padStart(4, '0')}`;
    const payload = {
      ...form,
      estimateNo,
      stay: `${Math.max(1, Number(form.rooms || 1))} Rooms`,
      subtotal,
      total: estimatedTotal,
      status,
    };
    try {
      const saved = await createModuleRecord('hotel/billing/estimates', payload);
      setEstimates((current) => [normalizeEstimate(saved.record || { _id: estimateNo, data: payload }), ...current]);
      setShowForm(false);
      setMessage(`${estimateNo} ${status === 'SENT' ? 'sent' : 'saved as draft'}.`);
    } catch (err) {
      setMessage(err.message || 'Unable to save estimate');
    } finally {
      setSaving(false);
    }
  }

  async function updateEstimate(estimate, status) {
    const payload = { ...estimate.rawData, status };
    try {
      await updateModuleRecord(estimate.id, payload);
      setEstimates((current) => current.map((item) => (item.id === estimate.id ? normalizeEstimate({ _id: estimate.id, data: payload }) : item)));
      setMessage(`${estimate.estimateNo} ${status.toLowerCase()}.`);
    } catch (err) {
      setMessage(err.message || 'Unable to update estimate');
    }
  }

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-7">
      <section className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="m-0 text-[12px] font-semibold uppercase tracking-wide text-blue-700">Billing</p>
          <h1 className="m-0 mt-1 text-[28px] font-bold text-slate-950">Estimates</h1>
          <p className="m-0 mt-2 text-sm text-slate-500">Pre-stay quotations for corporate bookings, groups, conferences, events, weddings, and long stays.</p>
        </div>
        <button type="button" onClick={() => setShowForm((value) => !value)} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-blue-700">
          <Plus size={16} />
          New Estimate
        </button>
      </section>

      {message && <p className="mb-4 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-[13px] text-blue-700">{message}</p>}

      <section className="mb-5 rounded-lg border border-slate-200 bg-white">
        <div className="grid gap-3 border-b border-slate-100 p-4 md:grid-cols-[minmax(260px,1fr)_180px]">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Estimate / Guest / Company" className="w-full rounded-md border border-slate-200 bg-white py-2 pl-9 pr-3 text-[13px] outline-none focus:border-blue-500" />
          </div>
          <SelectDropdown value={statusFilter} onChange={setStatusFilter} options={STATUS_FILTERS} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead>
              <tr className="text-[12px] uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3">Estimate No</th>
                <th className="px-5 py-3">Guest / Company</th>
                <th className="px-5 py-3">Stay</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-[13px] text-slate-500">Loading estimates...</td></tr>
              ) : filteredEstimates.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-[13px] text-slate-500">No estimates found.</td></tr>
              ) : filteredEstimates.map((estimate) => (
                <tr key={estimate.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-5 py-4 font-bold text-slate-900">{estimate.estimateNo || '-'}</td>
                  <td className="px-5 py-4 text-slate-700">{estimate.guestCompany || '-'}</td>
                  <td className="px-5 py-4 text-slate-700">{estimate.stay || '-'}</td>
                  <td className="px-5 py-4 font-bold text-slate-900">{money(estimate.total)}</td>
                  <td className="px-5 py-4"><Badge status={estimate.status} /></td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      {estimate.status === 'SENT' && <button type="button" onClick={() => updateEstimate(estimate, 'ACCEPTED')} className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[12px] font-semibold text-emerald-700">Accept</button>}
                      {estimate.status === 'ACCEPTED' && <button type="button" onClick={() => updateEstimate(estimate, 'CONVERTED')} className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-[12px] font-semibold text-blue-700">Convert</button>}
                      <button type="button" onClick={() => setMessage(`${estimate.estimateNo} PDF/share prepared.`)} className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700">Share</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {showForm && (
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="m-0 mb-5 text-[18px] font-bold text-slate-950">New Hotel Estimate</h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="mb-1 block text-[12px] font-bold uppercase text-slate-500">Guest / Company</label>
                <input value={form.guestCompany} onChange={(e) => setForm((current) => ({ ...current, guestCompany: e.target.value }))} className="w-full rounded-md border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-bold uppercase text-slate-500">Contact</label>
                <input value={form.contact} onChange={(e) => setForm((current) => ({ ...current, contact: e.target.value }))} className="w-full rounded-md border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-bold uppercase text-slate-500">Check-in</label>
                <input value={form.checkIn} onChange={(e) => setForm((current) => ({ ...current, checkIn: e.target.value }))} className="w-full rounded-md border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-bold uppercase text-slate-500">Check-out</label>
                <input value={form.checkOut} onChange={(e) => setForm((current) => ({ ...current, checkOut: e.target.value }))} className="w-full rounded-md border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-bold uppercase text-slate-500">Rooms</label>
                <input value={form.rooms} onChange={(e) => setForm((current) => ({ ...current, rooms: e.target.value }))} type="number" min="1" className="w-full rounded-md border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-bold uppercase text-slate-500">Room Type</label>
                <SelectDropdown value={form.roomType} onChange={(roomType) => setForm((current) => ({ ...current, roomType }))} options={ROOM_TYPES} />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-bold uppercase text-slate-500">Validity</label>
                <SelectDropdown value={form.validity} onChange={(validity) => setForm((current) => ({ ...current, validity }))} options={VALIDITY_OPTIONS} />
              </div>
            </div>

            <div className="my-5 border-t border-slate-100" />
            <h3 className="m-0 mb-3 text-[15px] font-bold text-slate-950">Services</h3>
            <div className="mb-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_110px]">
              <input value={draftService.description} onChange={(e) => setDraftService((current) => ({ ...current, description: e.target.value }))} placeholder="Service description" className="rounded-md border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-blue-500" />
              <input value={draftService.amount} onChange={(e) => setDraftService((current) => ({ ...current, amount: e.target.value }))} type="number" min="0" placeholder="Amount" className="rounded-md border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-blue-500" />
              <button type="button" onClick={addService} className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[13px] font-semibold text-blue-700">Add</button>
            </div>
            <div className="space-y-2">
              {form.services.map((service, index) => (
                <div key={`${service.description}-${index}`} className="flex justify-between rounded-md bg-slate-50 p-3 text-[13px]">
                  <span className="font-semibold text-slate-700">{service.description}</span>
                  <strong>{money(service.amount)}</strong>
                </div>
              ))}
            </div>
            <label className="mb-1 mt-4 block text-[12px] font-bold uppercase text-slate-500">Terms</label>
            <textarea value={form.terms} onChange={(e) => setForm((current) => ({ ...current, terms: e.target.value }))} rows={3} className="w-full resize-none rounded-md border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-blue-500" />
          </div>

          <aside className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="m-0 mb-4 text-[18px] font-bold text-slate-950">Estimate Summary</h2>
            <div className="space-y-3 text-[13px]">
              <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><strong>{money(subtotal)}</strong></div>
              <div className="grid grid-cols-[1fr_120px] items-center gap-3">
                <span className="text-slate-500">Discount</span>
                <input value={form.discount} onChange={(e) => setForm((current) => ({ ...current, discount: e.target.value }))} type="number" min="0" className="rounded-md border border-slate-200 px-3 py-2 text-right text-[13px] outline-none focus:border-blue-500" />
              </div>
              <div className="grid grid-cols-[1fr_120px] items-center gap-3">
                <span className="text-slate-500">Tax</span>
                <input value={form.tax} onChange={(e) => setForm((current) => ({ ...current, tax: e.target.value }))} type="number" min="0" className="rounded-md border border-slate-200 px-3 py-2 text-right text-[13px] outline-none focus:border-blue-500" />
              </div>
              <div className="border-t border-slate-100 pt-3 flex justify-between text-[18px]"><span className="font-bold text-slate-950">Estimated Total</span><strong>{money(estimatedTotal)}</strong></div>
            </div>
            <div className="mt-5 grid gap-3">
              <button type="button" disabled={saving} onClick={() => saveEstimate('DRAFT')} className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700 disabled:opacity-60">
                <FileText size={15} />
                Save Draft
              </button>
              <button type="button" disabled={saving} onClick={() => saveEstimate('SENT')} className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                <Send size={15} />
                Send Estimate
              </button>
              <button type="button" onClick={() => setMessage('Estimate conversion will create a reservation after acceptance.')} className="inline-flex items-center justify-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-[13px] font-semibold text-emerald-700">
                <Mail size={15} />
                Convert to Reservation
              </button>
              <button type="button" onClick={() => setMessage('Estimate PDF/share prepared.')} className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-slate-700">
                <Share2 size={15} />
                PDF / Share
              </button>
            </div>
          </aside>
        </section>
      )}

      <section className="mt-5 rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="m-0 text-[15px] font-bold text-slate-950">Estimate Workflow</h3>
        <p className="m-0 mt-2 text-[13px] text-slate-500">Estimate - Send to Guest / Company - Accepted - Convert to Reservation - Check-in - Actual Charges - Final Bill.</p>
      </section>
    </div>
  );
}
