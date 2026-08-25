import { useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, CheckCircle2, Plus } from 'lucide-react';

import { useModuleRecords } from '../shared/recordUi/useModuleRecords.js';

const INPUT = 'h-10 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-[inherit] text-[#111827] outline-none focus:border-blue-500';
const OTS = ['OT-01', 'OT-02', 'OT-03', 'Minor OT'];
const REQUIREMENTS = ['General Anesthesia', 'Surgical Assistant', 'Standard Instrument Set', 'Special Equipment'];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function displayDate(value) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function displayTime(value = '') {
  const [hour, minute] = String(value).split(':').map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return value || '-';
  const suffix = hour >= 12 ? 'PM' : 'AM';
  return `${String(hour % 12 || 12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${suffix}`;
}

function durationMinutes(value = '') {
  const match = String(value).match(/([\d.]+)/);
  return (match ? Number(match[1]) : 2) * 60;
}

function minutes(value = '') {
  const [hour, minute] = String(value).split(':').map(Number);
  return Number.isFinite(hour) && Number.isFinite(minute) ? hour * 60 + minute : 0;
}

function overlaps(aStart, aDuration, bStart, bDuration) {
  const a1 = minutes(aStart);
  const a2 = a1 + durationMinutes(aDuration);
  const b1 = minutes(bStart);
  const b2 = b1 + durationMinutes(bDuration);
  return a1 < b2 && b1 < a2;
}

function endTime(start, duration) {
  const total = minutes(start) + durationMinutes(duration);
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function Button({ children, icon: Icon, onClick, tone = 'white', disabled = false }) {
  const tones = {
    blue: 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700',
    green: 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700',
    white: 'border-[#dbe4ef] bg-white text-[#374151] hover:bg-gray-50',
  };
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-[13px] font-semibold ${tones[tone]} font-[inherit] transition disabled:cursor-not-allowed disabled:opacity-60`}>
      {Icon && <Icon size={15} />}
      {children}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-[12px] font-extrabold uppercase text-[#536173]">{label}</span>
      {children}
    </label>
  );
}

export function OTBookingPage() {
  const surgerySchedule = useModuleRecords('hospital/surgery-schedule');
  const otBookings = useModuleRecords('hospital/ot-booking');
  const [date, setDate] = useState(todayISO());
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const surgeries = surgerySchedule.records;
  const bookings = otBookings.records;
  const [form, setForm] = useState({
    surgeryRecordId: '',
    surgeryId: '',
    surgery: '',
    patientName: '',
    ot: 'OT-01',
    date: todayISO(),
    startTime: '09:00',
    estimatedDuration: '2 Hours',
    surgeon: '',
    anesthetist: '',
    requirements: ['General Anesthesia', 'Surgical Assistant', 'Standard Instrument Set'],
  });

  const dayBookings = useMemo(() => bookings
    .filter((record) => record.data?.date === date)
    .sort((a, b) => String(a.data?.startTime || '').localeCompare(String(b.data?.startTime || ''))), [bookings, date]);

  function set(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setMessage('');
  }

  function selectSurgery(id) {
    const record = surgeries.find((item) => item._id === id);
    const data = record?.data || {};
    setForm((current) => ({
      ...current,
      surgeryRecordId: id,
      surgeryId: data.surgeryId || data.scheduleNo || `SURG-${String(surgeries.indexOf(record) + 125).padStart(5, '0')}`,
      surgery: data.surgery || current.surgery,
      patientName: data.patientName || current.patientName,
      surgeon: data.surgeon || current.surgeon,
      anesthetist: data.anesthetist || current.anesthetist,
      date: data.preferredDate || current.date,
      startTime: data.startTime || current.startTime,
      estimatedDuration: data.estimatedDuration || current.estimatedDuration,
      ot: data.otHint || current.ot,
    }));
  }

  function toggleRequirement(item) {
    setForm((current) => ({
      ...current,
      requirements: current.requirements.includes(item)
        ? current.requirements.filter((value) => value !== item)
        : [...current.requirements, item],
    }));
  }

  function conflictMessages() {
    const conflicts = bookings.filter((record) => {
      const data = record.data || {};
      if (data.date !== form.date) return false;
      if (data.status === 'CANCELLED') return false;
      const timeOverlap = overlaps(form.startTime, form.estimatedDuration, data.startTime, data.estimatedDuration);
      return timeOverlap && (data.ot === form.ot || data.surgeon === form.surgeon || data.anesthetist === form.anesthetist);
    });
    return conflicts.map((record) => {
      const data = record.data || {};
      if (data.ot === form.ot) return `${form.ot} already booked at this time.`;
      if (data.surgeon === form.surgeon) return `${form.surgeon} already has overlapping surgery.`;
      if (data.anesthetist === form.anesthetist) return `${form.anesthetist} already has overlapping surgery.`;
      return 'Overlapping surgery found.';
    });
  }

  function checkConflict() {
    const conflicts = conflictMessages();
    const missingEquipment = form.requirements.includes('Special Equipment') ? ['Special equipment availability must be confirmed manually.'] : [];
    const checks = [
      conflicts.length ? null : 'OT available',
      conflicts.some((item) => item.includes(form.surgeon)) ? null : 'Surgeon available',
      conflicts.some((item) => item.includes(form.anesthetist)) ? null : 'Anesthetist available',
      missingEquipment.length ? null : 'Required equipment available',
      conflicts.length ? null : 'No overlapping surgery',
    ].filter(Boolean);
    setMessage([...checks.map((item) => `✓ ${item}`), ...conflicts, ...missingEquipment].join(' | '));
    return conflicts.length === 0 && missingEquipment.length === 0;
  }

  async function confirmBooking() {
    if (!checkConflict()) return;
    await otBookings.create({
      ...form,
      status: 'BOOKED',
      preparationStatus: 'Pending Preparation',
      name: `${form.ot} - ${form.surgery} - ${form.patientName}`,
      workflow: 'Check OT -> Check surgeon -> Check anesthetist -> Check equipment -> Check overlap -> Confirm OT Booking',
      responsibility: 'OT Booking reserves OT/resources. Surgery Schedule stores planned surgery timing.',
    });
    setDate(form.date);
    setShowForm(false);
    setMessage(`OT booking confirmed for ${form.surgery} in ${form.ot}.`);
  }

  return (
    <div className="p-4 md:p-7">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 text-[13px] font-semibold text-[#64748b]">Home &gt; Emergency & OT &gt; OT Booking</div>
          <h1 className="m-0 text-[26px] font-extrabold text-[#071936]">OT Booking</h1>
          <p className="m-0 mt-1 text-[13px] font-semibold text-[#64748b]">Reserve operation theatre, staff, instruments, and equipment for planned surgeries.</p>
        </div>
        <Button icon={Plus} tone="blue" onClick={() => setShowForm(true)}>New Booking</Button>
      </div>

      {message && <div className="mb-4 rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-[13px] font-semibold text-blue-700">{message}</div>}

      {!showForm ? (
        <section className="rounded-lg border border-[#dfe7f1] bg-white">
          <div className="border-b border-[#edf2f7] bg-[#fbfdff] p-4">
            <Field label="Date"><input className={INPUT} type="date" value={date} onChange={(event) => setDate(event.target.value)} /></Field>
            <div className="mt-2 text-[13px] font-extrabold text-[#071936]">Date: {displayDate(date)}</div>
          </div>
          <div className="grid gap-6 p-4 xl:grid-cols-2">
            {OTS.map((ot) => {
              const rows = dayBookings.filter((record) => record.data?.ot === ot);
              return (
                <div key={ot} className="rounded-lg border border-[#dfe7f1] bg-white">
                  <div className="border-b border-[#edf2f7] bg-[#f8fbff] px-4 py-3 text-[15px] font-extrabold text-[#071936]">{ot}</div>
                  <div className="divide-y divide-[#edf2f7]">
                    {rows.map((record) => {
                      const data = record.data || {};
                      return (
                        <div key={record._id} className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 p-4">
                          <div className="text-[13px] font-extrabold text-[#071936]">{displayTime(data.startTime)}</div>
                          <div className="border-l-4 border-blue-500 pl-3">
                            <div className="text-[15px] font-extrabold text-[#071936]">{data.surgery}</div>
                            <div className="mt-1 text-[13px] font-semibold text-[#334155]">{data.patientName}</div>
                            <div className="text-[13px] font-semibold text-[#334155]">{data.surgeon}</div>
                            <div className="text-[13px] font-semibold text-[#334155]">{data.estimatedDuration}</div>
                            <div className="mt-1 text-[12px] font-extrabold text-emerald-700">● {data.status || 'BOOKED'}</div>
                          </div>
                        </div>
                      );
                    })}
                    {rows.length === 0 && <div className="p-4 text-[13px] font-semibold text-[#64748b]">09:00 | AVAILABLE</div>}
                    {ot === 'OT-01' && rows.length > 0 && <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 p-4"><div className="text-[13px] font-extrabold text-[#071936]">11:30</div><div className="border-l-4 border-emerald-500 pl-3 text-[13px] font-extrabold text-emerald-700">AVAILABLE</div></div>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="rounded-lg border border-[#dfe7f1] bg-white">
          <div className="border-b border-[#edf2f7] bg-[#fbfdff] p-4">
            <h2 className="m-0 text-[20px] font-extrabold uppercase text-[#071936]">Book Operation Theatre</h2>
          </div>
          <div className="grid gap-5 p-4 xl:grid-cols-[minmax(0,1fr)_340px]">
            <main className="grid gap-4 md:grid-cols-2">
              <Field label="Surgery"><select className={INPUT} value={form.surgeryRecordId} onChange={(event) => selectSurgery(event.target.value)}>{surgeries.map((record) => <option key={record._id} value={record._id}>{record.data?.surgeryId || record.data?.surgery || record._id}</option>)}</select></Field>
              <Field label="Patient"><input className={INPUT} value={form.patientName} readOnly /></Field>
              <Field label="OT"><select className={INPUT} value={form.ot} onChange={(event) => set('ot', event.target.value)}>{OTS.map((ot) => <option key={ot}>{ot}</option>)}</select></Field>
              <Field label="Date"><input className={INPUT} type="date" value={form.date} onChange={(event) => set('date', event.target.value)} /></Field>
              <Field label="Start Time"><input className={INPUT} type="time" value={form.startTime} onChange={(event) => set('startTime', event.target.value)} /></Field>
              <Field label="Estimated Duration"><input className={INPUT} value={form.estimatedDuration} onChange={(event) => set('estimatedDuration', event.target.value)} /></Field>
              <Field label="Surgeon"><input className={INPUT} value={form.surgeon} onChange={(event) => set('surgeon', event.target.value)} /></Field>
              <Field label="Anesthetist"><input className={INPUT} value={form.anesthetist} onChange={(event) => set('anesthetist', event.target.value)} /></Field>
            </main>
            <aside className="space-y-4">
              <div className="rounded-lg border border-[#dfe7f1] bg-[#f8fbff] p-4">
                <div className="mb-3 text-[14px] font-extrabold text-[#071936]">OT Requirements</div>
                <div className="space-y-2">
                  {REQUIREMENTS.map((item) => (
                    <label key={item} className="flex items-center gap-2 text-[13px] font-semibold text-[#334155]">
                      <input type="checkbox" checked={form.requirements.includes(item)} onChange={() => toggleRequirement(item)} />
                      {item}
                    </label>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-[13px] font-semibold text-amber-800">
                Before confirming: OT, surgeon, anesthetist, equipment, and overlapping surgery are checked.
              </div>
              <div className="rounded-lg border border-[#dfe7f1] bg-white p-4 text-[13px] font-semibold text-[#334155]">
                <div className="mb-2 flex items-center gap-2 font-extrabold text-[#071936]"><CalendarClock size={15} />Slot</div>
                {form.ot} - {displayDate(form.date)}<br />{displayTime(form.startTime)} to {displayTime(endTime(form.startTime, form.estimatedDuration))}
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button onClick={() => setShowForm(false)}>Cancel</Button>
                <Button icon={AlertTriangle} onClick={checkConflict}>Check Conflict</Button>
                <Button icon={CheckCircle2} tone="green" onClick={confirmBooking}>Confirm Booking</Button>
              </div>
            </aside>
          </div>
        </section>
      )}
    </div>
  );
}

