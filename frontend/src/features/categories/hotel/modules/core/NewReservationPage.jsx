import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Minus, Plus, Search } from 'lucide-react';

import { AutocompleteInput } from '../../../../../components/forms/AutocompleteInput.jsx';
import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';
import { createModuleRecord, listModuleRecords, updateModuleRecord } from '../../../../../services/moduleRecordsService.js';
import { money, PageHeader, RATE_PLANS, ReservationShell, ROOM_TYPES } from './ReservationShared.jsx';

const PURPOSES = ['Leisure', 'Business', 'Wedding', 'Conference', 'Medical', 'Other'];
const PAYMENT_POLICIES = ['Pay at Hotel', 'Advance Payment', 'Fully Paid', 'Corporate Billing'];
const CANCELLATION_POLICIES = ['24 Hours Before Arrival', '48 Hours Before Arrival', 'Non-refundable', 'Free cancellation'];
const COMPANIES = ['Individual Guest', 'Corporate', 'Travel Agent'];

function todayConfirmationNo() {
  const stamp = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  return `RES-${stamp.slice(2)}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function daysBetween(start, end) {
  const from = new Date(start);
  const to = new Date(end);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 1;
  return Math.max(1, Math.round((to - from) / 86400000));
}

function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold text-slate-600">{label}{required && <span className="text-red-500"> *</span>}</span>
      {children}
    </label>
  );
}

function Input({ value, onChange, type = 'text', min, placeholder }) {
  return (
    <input
      type={type}
      min={min}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 w-full rounded border border-slate-200 bg-white px-3 text-[13px] outline-none focus:border-blue-500"
    />
  );
}

function StepTitle({ step, title }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <span className="grid h-6 w-6 place-items-center rounded-full bg-blue-600 text-[12px] font-bold text-white">{step}</span>
      <h2 className="m-0 text-[14px] font-bold text-slate-950">{title}</h2>
    </div>
  );
}

function Counter({ label, value, setValue, min = 0 }) {
  return (
    <div>
      <span className="mb-1.5 block text-[11px] font-semibold text-slate-600">{label}</span>
      <div className="inline-flex h-9 overflow-hidden rounded border border-slate-200 bg-white">
        <button type="button" onClick={() => setValue(Math.max(min, Number(value) - 1))} className="grid w-9 place-items-center text-slate-600 hover:bg-slate-50"><Minus size={13} /></button>
        <input value={value} readOnly className="w-10 border-x border-slate-200 text-center text-[13px] font-bold outline-none" />
        <button type="button" onClick={() => setValue(Number(value) + 1)} className="grid w-9 place-items-center text-slate-600 hover:bg-slate-50"><Plus size={13} /></button>
      </div>
    </div>
  );
}

export function NewReservationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const editId = new URLSearchParams(location.search).get('edit');
  const [guestOptions, setGuestOptions] = useState([]);
  const [guestMode, setGuestMode] = useState('existing');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    confirmationNo: todayConfirmationNo(),
    guestName: '',
    checkInDate: '',
    checkOutDate: '',
    checkInTime: '14:00',
    checkOutTime: '11:00',
    adults: 2,
    children: 1,
    rooms: 1,
    roomType: '',
    ratePlan: '',
    purpose: 'Leisure',
    company: '',
    roomNo: '',
    rateType: 'Per Night',
    ratePerNight: '',
    discountPercent: 0,
    paymentPolicy: 'Pay at Hotel',
    cancellationPolicy: '24 Hours Before Arrival',
    earlyCheckIn: 'Not Required',
    notes: '',
    specialRequests: '',
  });

  useEffect(() => {
    let active = true;
    Promise.all([
      listModuleRecords('hotel/guests/list').catch(() => ({ records: [] })),
      listModuleRecords('hotel/guests/registration').catch(() => ({ records: [] })),
      listModuleRecords('hotel/reservations/list').catch(() => ({ records: [] })),
    ]).then(([listRes, registrationRes, reservationsRes]) => {
      if (!active) return;
      const names = [...(listRes.records || []), ...(registrationRes.records || [])]
        .map((record) => record.data?.guestName || record.data?.name || `${record.data?.firstName || ''} ${record.data?.lastName || ''}`.trim())
        .filter(Boolean);
      setGuestOptions([...new Set(names)].sort());
      if (editId) {
        const reservation = (reservationsRes.records || []).find((record) => record._id === editId);
        const data = reservation?.data || {};
        if (reservation) {
          setForm((current) => ({
            ...current,
            confirmationNo: data.reservationNo || data.confirmationNo || current.confirmationNo,
            guestName: data.guestName || data.guest || '',
            checkInDate: data.checkInDate || '',
            checkOutDate: data.checkOutDate || '',
            checkInTime: data.checkInTime || '14:00',
            checkOutTime: data.checkOutTime || '11:00',
            adults: Number(data.adults || 1),
            children: Number(data.children || 0),
            rooms: Number(data.rooms || 1),
            roomType: data.roomType || '',
            ratePlan: data.ratePlan || '',
            purpose: data.purpose || 'Leisure',
            company: data.company || '',
            roomNo: data.availableRoom || data.roomNumber || data.room || '',
            rateType: data.rateType || 'Per Night',
            ratePerNight: data.ratePerNight || '',
            discountPercent: data.discountPercent || 0,
            paymentPolicy: data.paymentPolicy || 'Pay at Hotel',
            cancellationPolicy: data.cancellationPolicy || '24 Hours Before Arrival',
            earlyCheckIn: data.earlyCheckIn || 'Not Required',
            notes: data.notes || '',
            specialRequests: data.specialRequests || '',
          }));
        }
      }
    });
    return () => { active = false; };
  }, [editId]);

  const pricing = useMemo(() => {
    const nights = daysBetween(form.checkInDate, form.checkOutDate);
    const roomCharge = nights * Number(form.rooms || 1) * Number(form.ratePerNight || 0);
    const discount = roomCharge * (Number(form.discountPercent || 0) / 100);
    const tax = Math.max(0, (roomCharge - discount) * 0.12);
    return { nights, roomCharge, discount, tax, total: Math.max(0, roomCharge - discount + tax) };
  }, [form]);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function checkAvailability() {
    const params = new URLSearchParams();
    if (form.checkInDate) params.set('checkIn', form.checkInDate);
    if (form.checkOutDate) params.set('checkOut', form.checkOutDate);
    if (form.roomType) params.set('roomType', form.roomType);
    params.set('guests', String(Number(form.adults || 0) + Number(form.children || 0)));
    params.set('rooms', String(form.rooms || 1));
    navigate(`/hotel/reservations/availability?${params.toString()}`);
  }

  async function saveReservation(status = 'Confirmed') {
    setSaving(true);
    setMessage('');
    try {
      const payload = {
        reservationNo: form.confirmationNo,
        confirmationNo: form.confirmationNo,
        guestName: form.guestName,
        availableRoom: form.roomNo,
        roomNumber: form.roomNo,
        roomType: form.roomType,
        ratePlan: form.ratePlan,
        checkInDate: form.checkInDate,
        checkOutDate: form.checkOutDate,
        checkInTime: form.checkInTime,
        checkOutTime: form.checkOutTime,
        adults: form.adults,
        children: form.children,
        rooms: form.rooms,
        nights: pricing.nights,
        bookingSource: 'Walk-in',
        rateType: form.rateType,
        estimatedTotal: pricing.total,
        amount: pricing.total,
        status,
      };
      if (editId) await updateModuleRecord(editId, payload);
      else await createModuleRecord('hotel/reservations/list', payload);
      if (status === 'Draft') setMessage('Reservation saved as draft.');
      else navigate('/hotel/reservations/list');
    } catch (err) {
      setMessage(err.message || 'Unable to save reservation');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ReservationShell>
      <form onSubmit={(event) => { event.preventDefault(); saveReservation('Confirmed'); }}>
        <PageHeader title={editId ? 'Edit Reservation' : 'New Reservation'} subtitle={editId ? 'Update reservation details' : 'Create a new room reservation'}>
          <div className="text-[11px] text-slate-500">Home <span className="mx-2">›</span> Reservations <span className="mx-2">›</span> New Reservation</div>
          <button type="button" onClick={() => saveReservation('Draft')} disabled={saving} className="h-9 rounded border border-blue-200 bg-white px-4 text-[12px] font-bold text-blue-700 hover:bg-blue-50">Save as Draft</button>
          <button type="button" onClick={checkAvailability} className="h-9 rounded bg-blue-600 px-4 text-[12px] font-bold text-white hover:bg-blue-700">Check Availability</button>
        </PageHeader>

        {message && <p className="mb-4 rounded border border-blue-100 bg-blue-50 px-3 py-2 text-[13px] text-blue-700">{message}</p>}

        <section className="grid gap-4 xl:grid-cols-[1fr_1.1fr_1.35fr]">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <StepTitle step="1" title="Guest Information" />
            <div className="mb-3 flex gap-5 text-[12px] font-semibold text-slate-700">
              <label className="flex items-center gap-2"><input type="radio" checked={guestMode === 'existing'} onChange={() => setGuestMode('existing')} /> Existing Guest</label>
              <label className="flex items-center gap-2"><input type="radio" checked={guestMode === 'new'} onChange={() => setGuestMode('new')} /> New Guest</label>
            </div>
              <Field label="Guest Search" required>
              <AutocompleteInput value={form.guestName} onChange={(value) => update('guestName', value)} options={guestOptions} placeholder="Search by name, mobile, email or Guest ID..." icon={<Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />} />
            </Field>
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase text-slate-500">Selected Guest</div>
                  <div className="mt-1 flex items-center gap-2"><strong>{form.guestName || 'No guest selected'}</strong>{form.guestName && <span className="rounded bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">EXISTING</span>}</div>
                  <div className="mt-1 text-[12px] text-slate-500">{form.guestName ? 'Guest profile selected for this reservation.' : 'Search an existing guest or create a new guest profile.'}</div>
                </div>
                <Link to="/hotel/guests/registration" className="shrink-0 text-[12px] font-bold text-blue-600 no-underline">Register Guest</Link>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <Counter label="No. of Adults" value={form.adults} setValue={(value) => update('adults', value)} min={1} />
              <Counter label="No. of Children" value={form.children} setValue={(value) => update('children', value)} />
              <Counter label="No. of Rooms" value={form.rooms} setValue={(value) => update('rooms', value)} min={1} />
            </div>
            <div className="mt-3 text-center text-[11px] font-semibold text-slate-500">Child Ages: 8</div>
            {guestMode === 'new' && <Link to="/hotel/guests/registration" className="mt-4 block rounded bg-blue-50 px-3 py-2 text-center text-[12px] font-bold text-blue-700 no-underline">Open Guest Registration</Link>}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <StepTitle step="2" title="Stay Details" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Check-in Date" required><Input type="date" value={form.checkInDate} onChange={(value) => update('checkInDate', value)} /></Field>
              <Field label="Check-out Date" required><Input type="date" value={form.checkOutDate} onChange={(value) => update('checkOutDate', value)} /></Field>
              <Field label="Check-in Time"><Input type="time" value={form.checkInTime} onChange={(value) => update('checkInTime', value)} /></Field>
              <Field label="Check-out Time"><Input type="time" value={form.checkOutTime} onChange={(value) => update('checkOutTime', value)} /></Field>
                <Field label="Nights"><input value={pricing.nights} readOnly className="h-10 w-full rounded border border-slate-200 bg-slate-50 px-3 text-[13px] font-bold text-slate-700" /></Field>
              <Field label="Purpose of Visit"><SelectDropdown value={form.purpose} onChange={(value) => update('purpose', value)} options={PURPOSES} /></Field>
              <div className="sm:col-span-2"><Field label="Corporate / Company"><SelectDropdown value={form.company} onChange={(value) => update('company', value)} options={COMPANIES} /></Field></div>
              <div className="sm:col-span-2">
                <Field label="Special Requests">
                  <textarea value={form.specialRequests} onChange={(event) => update('specialRequests', event.target.value)} rows={3} maxLength={200} className="w-full resize-none rounded border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-blue-500" />
                  <div className="mt-1 text-right text-[10px] text-slate-400">{form.specialRequests.length}/200</div>
                </Field>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <StepTitle step="3" title="Room & Rate Plan" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Room Type" required><SelectDropdown value={form.roomType} onChange={(value) => update('roomType', value)} options={ROOM_TYPES.filter((item) => item !== 'All')} /></Field>
              <Field label="Rate Plan" required><SelectDropdown value={form.ratePlan} onChange={(value) => update('ratePlan', value)} options={RATE_PLANS} /></Field>
            </div>
            <div className="mt-4 rounded-lg border border-blue-200 bg-white p-3">
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex items-center gap-2"><strong>{form.roomNo ? `Room ${form.roomNo}` : 'No room selected'}</strong>{form.roomNo && <span className="rounded bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">AVAILABLE</span>}</div>
                  <div className="mt-2 text-[12px] text-slate-500">{form.roomNo ? 'Room ready for reservation assignment' : 'Open Availability to assign a real room.'}</div>
                  <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-500">{form.roomType || 'Room Type'} <span>{Number(form.adults) + Number(form.children)} Guests</span></div>
                </div>
                <div className="text-right">
                  <strong>{money(form.ratePerNight)}</strong>
                  <div className="text-[11px] text-slate-500">Per Night</div>
                  <div className="mt-3 font-bold">{money(pricing.roomCharge)}</div>
                  <div className="text-[11px] text-slate-500">({pricing.nights} Nights)</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <StepTitle step="4" title="Pricing & Policies" />
          <div className="grid gap-4 md:grid-cols-4 xl:grid-cols-6">
            <Field label="Rate Type"><SelectDropdown value={form.rateType} onChange={(value) => update('rateType', value)} options={['Per Night', 'Package', 'Hourly']} /></Field>
            <Field label="Average Rate per Night"><Input type="number" value={form.ratePerNight} onChange={(value) => update('ratePerNight', value)} /></Field>
            <Field label="Discount (%)"><Input type="number" value={form.discountPercent} onChange={(value) => update('discountPercent', value)} /></Field>
            <Field label="Discount Amount"><input value={Math.round(pricing.discount)} readOnly className="h-10 w-full rounded border border-slate-200 bg-slate-50 px-3 text-[13px] font-bold text-slate-700" /></Field>
            <Field label="Payment Policy"><SelectDropdown value={form.paymentPolicy} onChange={(value) => update('paymentPolicy', value)} options={PAYMENT_POLICIES} /></Field>
            <Field label="Cancellation Policy"><SelectDropdown value={form.cancellationPolicy} onChange={(value) => update('cancellationPolicy', value)} options={CANCELLATION_POLICIES} /></Field>
            <Field label="Early Check-in"><SelectDropdown value={form.earlyCheckIn} onChange={(value) => update('earlyCheckIn', value)} options={['Not Required', 'Required', 'Subject to Availability']} /></Field>
            <Field label="Notes (Optional)"><Input value={form.notes} onChange={(value) => update('notes', value)} placeholder="Add any notes..." /></Field>
            <div className="rounded-lg bg-slate-50 p-3 md:col-span-2">
              <div className="text-[12px] text-slate-500">Estimated Total</div>
              <div className="mt-1 text-[22px] font-bold text-slate-950">{money(pricing.total)}</div>
              <div className="mt-1 text-[11px] text-slate-500">Room {money(pricing.roomCharge)} + Tax {money(pricing.tax)} - Discount {money(pricing.discount)}</div>
            </div>
          </div>
        </section>

        <div className="mt-4 flex flex-wrap justify-end gap-3">
          <button type="button" onClick={() => navigate('/hotel/reservations/list')} className="h-10 rounded border border-slate-200 bg-white px-5 text-[13px] font-bold text-slate-700">Cancel</button>
          <button type="submit" disabled={saving || !form.guestName} className="h-10 rounded bg-blue-600 px-6 text-[13px] font-bold text-white hover:bg-blue-700 disabled:opacity-60">{saving ? 'Saving...' : editId ? 'Update Reservation' : 'Create Reservation'}</button>
        </div>
      </form>
    </ReservationShell>
  );
}
