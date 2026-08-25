import { useMemo, useState } from 'react';
import { CalendarCheck, CheckCircle2, Clock3, Plus, Search } from 'lucide-react';

import { useLookupRecords, useModuleRecords, names } from '../shared/recordUi/useModuleRecords.js';

const INPUT = 'h-10 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-[inherit] text-[#111827] outline-none focus:border-blue-500';
const VIEW_MODES = ['Day', 'Week', 'Month'];
const SURGERIES = ['Appendectomy', 'Knee Replacement', 'C-Section', 'Hernia Repair', 'Cholecystectomy', 'Angioplasty', 'Other'];
const PRIORITIES = ['Routine', 'Urgent', 'Emergency'];
const STATUSES = ['REQUESTED', 'PLANNED', 'CONFIRMED', 'IN PROGRESS', 'COMPLETED', 'CANCELLED', 'POSTPONED'];
const OTS = ['OT-01', 'OT-02', 'OT-03', 'Minor OT'];


function normalize(value = '') {
  return String(value || '').trim().toLowerCase();
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function displayDate(value) {
  if (!value) return '-';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function displayTime(value = '') {
  if (!value) return '-';
  const [hour, minute] = String(value).split(':').map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return value;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  return `${String(hour % 12 || 12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${suffix}`;
}

function durationHours(value = '') {
  const match = String(value).match(/([\d.]+)/);
  return match ? Number(match[1]) : 2;
}

function endTime(start = '', duration = '') {
  const [hour, minute] = String(start || '09:00').split(':').map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return '-';
  const end = new Date();
  end.setHours(hour, minute, 0, 0);
  end.setMinutes(end.getMinutes() + durationHours(duration) * 60);
  return `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
}

function statusTone(status) {
  if (status === 'CONFIRMED' || status === 'COMPLETED') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'IN PROGRESS') return 'border-blue-200 bg-blue-50 text-blue-700';
  if (status === 'CANCELLED') return 'border-red-200 bg-red-50 text-red-700';
  if (status === 'POSTPONED') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

function Button({ children, icon: Icon, onClick, tone = 'white', disabled = false }) {
  const tones = {
    blue: 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700',
    green: 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100',
    red: 'border-red-100 bg-red-50 text-red-700 hover:bg-red-100',
    white: 'border-[#dbe4ef] bg-white text-[#374151] hover:bg-gray-50',
  };
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-[13px] font-semibold ${tones[tone]} font-[inherit] transition disabled:cursor-not-allowed disabled:opacity-60`}>
      {Icon && <Icon size={15} />}
      {children}
    </button>
  );
}

function Field({ label, required, children }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-[12px] font-extrabold uppercase text-[#536173]">{label}{required ? ' *' : ''}</span>
      {children}
    </label>
  );
}

export function SurgerySchedulePage() {
  const schedules = useModuleRecords('hospital/surgery-schedule');
  const patients = useLookupRecords('hospital/patients');
  const ipd = useLookupRecords('hospital/ipd-admissions');
  const doctors = useLookupRecords('hospital/doctors');
  const [viewMode, setViewMode] = useState('Day');
  const [date, setDate] = useState(todayISO());
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    patientName: '',
    surgery: 'Appendectomy',
    surgeon: '',
    assistantSurgeon: '',
    anesthetist: '',
    preferredDate: todayISO(),
    startTime: '09:00',
    estimatedDuration: '2 Hours',
    priority: 'Routine',
    otHint: 'OT-01',
    preOpRequirements: 'Consent, NPO, anesthesia clearance',
    notes: '',
  });

  const records = schedules.records;
  const patientOptions = useMemo(() => {
    const values = [...names(patients.records), ...names(ipd.records)];
    return [...new Set(values.filter(Boolean))];
  }, [ipd.records, patients.records]);
  const doctorOptions = useMemo(() => {
    const values = names(doctors.records);
    return values;
  }, [doctors.records]);

  const dayRows = useMemo(() => records
    .filter((record) => record.data?.preferredDate === date)
    .sort((a, b) => String(a.data?.startTime || '').localeCompare(String(b.data?.startTime || ''))), [date, records]);

  const patientMatches = useMemo(() => {
    const q = normalize(search);
    if (!q) return patientOptions.slice(0, 6);
    return patientOptions.filter((item) => normalize(item).includes(q)).slice(0, 8);
  }, [patientOptions, search]);

  function set(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setMessage('');
  }

  function checkAvailability() {
    const conflict = records.find((record) => {
      const data = record.data || {};
      return data.preferredDate === form.preferredDate
        && data.otHint === form.otHint
        && data.startTime === form.startTime
        && !['CANCELLED', 'POSTPONED'].includes(data.status);
    });
    setMessage(conflict ? `${form.otHint} has a planned surgery at ${displayTime(form.startTime)}. Use OT Booking for final resource reservation.` : 'No schedule conflict found. Confirm OT/resources in OT Booking.');
  }

  async function scheduleSurgery() {
    if (!form.patientName.trim()) {
      window.alert('Patient is required.');
      return;
    }
    if (!form.surgery || !form.surgeon) {
      window.alert('Surgery and surgeon are required.');
      return;
    }

    await schedules.create({
      ...form,
      date: form.preferredDate,
      status: 'PLANNED',
      name: `${form.surgery} - ${form.patientName}`,
      workflow: 'REQUESTED -> PLANNED -> CONFIRMED -> IN PROGRESS -> COMPLETED / CANCELLED / POSTPONED',
      responsibility: 'Surgery Schedule records planned surgery timing. OT Booking reserves OT/resources.',
    });
    setDate(form.preferredDate);
    setShowForm(false);
    setMessage(`${form.surgery} scheduled for ${form.patientName}. Use OT Booking to reserve OT/resources.`);
  }

  async function updateStatus(record, status) {
    await schedules.update(record._id, { ...record.data, status });
    setMessage(`${record.data?.surgery || 'Surgery'} marked ${status}.`);
  }

  return (
    <div className="p-4 md:p-7">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 text-[13px] font-semibold text-[#64748b]">Home &gt; Emergency & OT &gt; Surgery Schedule</div>
          <h1 className="m-0 text-[26px] font-extrabold text-[#071936]">Surgery Schedule</h1>
          <p className="m-0 mt-1 text-[13px] font-semibold text-[#64748b]">Planned surgeries and timing. OT/resource reservation stays in OT Booking.</p>
        </div>
        <Button icon={Plus} tone="blue" onClick={() => setShowForm(true)}>Schedule Surgery</Button>
      </div>

      {message && <div className="mb-4 rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-[13px] font-semibold text-blue-700">{message}</div>}

      {!showForm ? (
        <section className="rounded-lg border border-[#dfe7f1] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf2f7] bg-[#fbfdff] p-4">
            <div className="inline-flex rounded-md border border-[#dbe4ef] bg-white p-0.5">
              {VIEW_MODES.map((mode) => (
                <button key={mode} type="button" onClick={() => setViewMode(mode)} className={`h-8 rounded px-3 text-[12px] font-extrabold ${viewMode === mode ? 'bg-blue-600 text-white' : 'text-[#334155] hover:bg-gray-50'}`}>{mode}</button>
              ))}
            </div>
            <Field label="Date"><input className={INPUT} type="date" value={date} onChange={(event) => setDate(event.target.value)} /></Field>
          </div>

          <div className="p-4">
            <div className="mb-5 flex items-center gap-2 text-[14px] font-extrabold text-[#071936]"><CalendarCheck size={16} />Date: {displayDate(date)}</div>
            <div className="space-y-6">
              {dayRows.map((record) => {
                const data = record.data || {};
                const finish = endTime(data.startTime, data.estimatedDuration);
                return (
                  <div key={record._id} className="grid gap-3 lg:grid-cols-[110px_minmax(0,1fr)]">
                    <div className="pt-3 text-[14px] font-extrabold text-[#071936]">{displayTime(data.startTime)}</div>
                    <div className="rounded-lg border border-[#dfe7f1] bg-white p-4 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h2 className="m-0 text-[18px] font-extrabold text-[#071936]">{data.surgery}</h2>
                          <div className="mt-2 grid gap-1 text-[13px] font-semibold text-[#334155]">
                            <div>Patient: {data.patientName}</div>
                            <div>Surgeon: {data.surgeon}</div>
                            <div>{data.otHint || 'OT TBD'} - {displayTime(data.startTime)} to {displayTime(finish)}</div>
                          </div>
                        </div>
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${statusTone(data.status)}`}>Status: {data.status}</span>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {STATUSES.filter((status) => !['REQUESTED', data.status].includes(status)).slice(0, 4).map((status) => (
                          <Button key={status} onClick={() => updateStatus(record, status)}>{status}</Button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
              {dayRows.length === 0 && <div className="rounded-md border border-dashed border-[#dbe4ef] p-8 text-center text-[13px] font-semibold text-[#64748b]">No surgeries planned for this date.</div>}
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-lg border border-[#dfe7f1] bg-white">
          <div className="border-b border-[#edf2f7] bg-[#fbfdff] p-4">
            <h2 className="m-0 text-[20px] font-extrabold uppercase text-[#071936]">Schedule Surgery</h2>
          </div>
          <div className="grid gap-5 p-4 xl:grid-cols-[minmax(0,1fr)_330px]">
            <main className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Field label="Patient">
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                    <input className="h-10 w-full rounded-md border border-[#dbe4ef] bg-white pl-9 pr-3 text-[13px] font-[inherit] outline-none focus:border-blue-500" placeholder="Search Patient / IPD" value={search || form.patientName} onChange={(event) => { setSearch(event.target.value); set('patientName', event.target.value); }} />
                  </div>
                  {search && patientMatches.length > 0 && (
                    <div className="mt-2 grid gap-2">
                      {patientMatches.map((patient) => <button key={patient} type="button" onClick={() => { set('patientName', patient); setSearch(''); }} className="rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-left text-[13px] font-semibold text-[#334155] hover:bg-gray-50">{patient}</button>)}
                    </div>
                  )}
                </Field>
              </div>
              <Field label="Surgery" required><select className={INPUT} value={form.surgery} onChange={(event) => set('surgery', event.target.value)}>{SURGERIES.map((item) => <option key={item}>{item}</option>)}</select></Field>
              <Field label="Surgeon" required><select className={INPUT} value={form.surgeon} onChange={(event) => set('surgeon', event.target.value)}>{doctorOptions.map((item) => <option key={item}>{item}</option>)}</select></Field>
              <Field label="Assistant Surgeon"><select className={INPUT} value={form.assistantSurgeon} onChange={(event) => set('assistantSurgeon', event.target.value)}>{doctorOptions.map((item) => <option key={item}>{item}</option>)}</select></Field>
              <Field label="Anesthetist"><select className={INPUT} value={form.anesthetist} onChange={(event) => set('anesthetist', event.target.value)}>{doctorOptions.map((item) => <option key={item}>{item}</option>)}</select></Field>
              <Field label="Preferred Date"><input className={INPUT} type="date" value={form.preferredDate} onChange={(event) => set('preferredDate', event.target.value)} /></Field>
              <Field label="Start Time"><input className={INPUT} type="time" value={form.startTime} onChange={(event) => set('startTime', event.target.value)} /></Field>
              <Field label="Estimated Duration"><input className={INPUT} value={form.estimatedDuration} onChange={(event) => set('estimatedDuration', event.target.value)} /></Field>
              <Field label="Priority"><select className={INPUT} value={form.priority} onChange={(event) => set('priority', event.target.value)}>{PRIORITIES.map((item) => <option key={item}>{item}</option>)}</select></Field>
              <Field label="OT Hint"><select className={INPUT} value={form.otHint} onChange={(event) => set('otHint', event.target.value)}>{OTS.map((item) => <option key={item}>{item}</option>)}</select></Field>
              <Field label="Pre-operative Requirements"><input className={INPUT} value={form.preOpRequirements} onChange={(event) => set('preOpRequirements', event.target.value)} /></Field>
              <div className="md:col-span-2"><Field label="Notes"><textarea className={`${INPUT} min-h-24 py-3`} value={form.notes} onChange={(event) => set('notes', event.target.value)} /></Field></div>
            </main>
            <aside className="space-y-4">
              <div className="rounded-lg border border-[#dfe7f1] bg-[#f8fbff] p-4">
                <div className="mb-2 flex items-center gap-2 text-[14px] font-extrabold text-[#071936]"><Clock3 size={15} />Planned Slot</div>
                <div className="text-[13px] font-semibold text-[#334155]">{displayDate(form.preferredDate)}<br />{displayTime(form.startTime)} to {displayTime(endTime(form.startTime, form.estimatedDuration))}</div>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-[13px] font-semibold text-amber-800">
                Surgery Schedule plans what surgery is planned and when. OT Booking reserves the OT room, staff, equipment, and resources.
              </div>
              <div className="rounded-lg border border-[#dfe7f1] bg-white p-4 text-[13px] font-semibold text-[#334155]">
                <div className="mb-2 flex items-center gap-2 font-extrabold text-[#071936]"><CheckCircle2 size={15} />Status Flow</div>
                REQUESTED &gt; PLANNED &gt; CONFIRMED &gt; IN PROGRESS &gt; COMPLETED
                <br />Additional: CANCELLED | POSTPONED
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button onClick={() => setShowForm(false)}>Cancel</Button>
                <Button icon={CheckCircle2} onClick={checkAvailability}>Check Availability</Button>
                <Button icon={CalendarCheck} tone="blue" onClick={scheduleSurgery}>Schedule Surgery</Button>
              </div>
            </aside>
          </div>
        </section>
      )}
    </div>
  );
}

