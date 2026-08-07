import { useMemo, useState } from 'react';
import { CalendarOff, Plus, Search, Stethoscope, UserRound, X } from 'lucide-react';

import { useModuleRecords } from '../shared/recordUi/useModuleRecords.js';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SLOT_DURATIONS = ['10 Minutes', '15 Minutes', '20 Minutes', '30 Minutes'];
const REASONS = ['Leave', 'Holiday', 'Emergency Unavailability', 'Blocked Slot', 'Temporary Schedule'];
const INPUT = 'h-10 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-[inherit] text-[#111827] outline-none focus:border-blue-500';

const EMPTY_FORM = {
  doctorName: 'Dr. Arun Kumar',
  departmentName: 'General Medicine',
  workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  morningStart: '09:00',
  morningEnd: '13:00',
  eveningStart: '17:00',
  eveningEnd: '20:00',
  slotDuration: '15 Minutes',
  maxPatients: 40,
  consultationFee: 500,
  followUpFee: 300,
  followUpValidity: 7,
  status: 'Available',
};

function money(value) {
  return `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;
}

function timeLabel(value) {
  if (!value) return '-';
  const [hour, minute] = String(value).split(':').map(Number);
  const date = new Date();
  date.setHours(hour || 0, minute || 0, 0, 0);
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function dateBetween(value, from, to) {
  if (!value || !from || !to) return false;
  return value >= from && value <= to;
}

function doctorName(data = {}) {
  return data.name || data.doctorName || '';
}

function Button({ children, onClick, tone = 'white', disabled = false }) {
  const tones = {
    blue: 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700',
    green: 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700',
    red: 'border-red-100 bg-red-50 text-red-700 hover:bg-red-100',
    white: 'border-[#dbe4ef] bg-white text-[#374151] hover:bg-gray-50',
  };
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border px-4 text-[13px] font-semibold ${tones[tone]} cursor-pointer disabled:cursor-not-allowed disabled:opacity-60`}>
      {children}
    </button>
  );
}

function ScheduleForm({ form, setForm, doctors, onSave, onClose, saving }) {
  function toggleDay(day) {
    setForm((current) => ({
      ...current,
      workingDays: current.workingDays.includes(day)
        ? current.workingDays.filter((item) => item !== day)
        : [...current.workingDays, day],
    }));
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#edf2f7] bg-white px-5 py-3">
          <h2 className="m-0 text-[17px] font-extrabold text-[#071936]">Doctor Schedule</h2>
          <button type="button" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#dbe4ef] bg-white cursor-pointer"><X size={16} /></button>
        </div>
        <div className="grid gap-4 p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">
              Doctor *
              <select className={`${INPUT} mt-1`} value={form.doctorName} onChange={(event) => {
                const selected = doctors.find((record) => doctorName(record.data) === event.target.value);
                setForm({ ...form, doctorName: event.target.value, departmentName: selected?.data?.departmentName || selected?.data?.department || form.departmentName });
              }}>
                {[form.doctorName, ...doctors.map((record) => doctorName(record.data)).filter(Boolean)].filter((item, index, arr) => item && arr.indexOf(item) === index).map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">
              Department
              <input className={`${INPUT} mt-1`} value={form.departmentName} onChange={(event) => setForm({ ...form, departmentName: event.target.value })} />
            </label>
          </div>

          <div>
            <div className="mb-2 text-[12px] font-extrabold uppercase text-[#536173]">Working Days</div>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day) => (
                <label key={day} className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-[13px] font-bold ${form.workingDays.includes(day) ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-[#dbe4ef] bg-white text-[#334155]'}`}>
                  <input type="checkbox" checked={form.workingDays.includes(day)} onChange={() => toggleDay(day)} />
                  {day}
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="mb-2 text-[12px] font-extrabold uppercase text-[#536173]">Morning Session</div>
              <div className="grid grid-cols-[1fr_24px_1fr] items-center gap-2">
                <input className={INPUT} type="time" value={form.morningStart} onChange={(event) => setForm({ ...form, morningStart: event.target.value })} />
                <span className="text-center font-bold text-[#64748b]">to</span>
                <input className={INPUT} type="time" value={form.morningEnd} onChange={(event) => setForm({ ...form, morningEnd: event.target.value })} />
              </div>
            </div>
            <div>
              <div className="mb-2 text-[12px] font-extrabold uppercase text-[#536173]">Evening Session</div>
              <div className="grid grid-cols-[1fr_24px_1fr] items-center gap-2">
                <input className={INPUT} type="time" value={form.eveningStart} onChange={(event) => setForm({ ...form, eveningStart: event.target.value })} />
                <span className="text-center font-bold text-[#64748b]">to</span>
                <input className={INPUT} type="time" value={form.eveningEnd} onChange={(event) => setForm({ ...form, eveningEnd: event.target.value })} />
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">Slot Duration<select className={`${INPUT} mt-1`} value={form.slotDuration} onChange={(event) => setForm({ ...form, slotDuration: event.target.value })}>{SLOT_DURATIONS.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">Maximum Patients<input className={`${INPUT} mt-1`} type="number" min="0" value={form.maxPatients} onChange={(event) => setForm({ ...form, maxPatients: event.target.value })} /></label>
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">Consultation Fee<input className={`${INPUT} mt-1`} type="number" min="0" value={form.consultationFee} onChange={(event) => setForm({ ...form, consultationFee: event.target.value })} /></label>
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">Follow-up Fee<input className={`${INPUT} mt-1`} type="number" min="0" value={form.followUpFee} onChange={(event) => setForm({ ...form, followUpFee: event.target.value })} /></label>
          </div>

          <label className="text-[12px] font-extrabold uppercase text-[#536173]">
            Follow-up Validity
            <input className={`${INPUT} mt-1 max-w-xs`} type="number" min="0" value={form.followUpValidity} onChange={(event) => setForm({ ...form, followUpValidity: event.target.value })} />
          </label>

          <div className="flex justify-end gap-2 border-t border-[#edf2f7] pt-4">
            <Button onClick={onClose}>Cancel</Button>
            <Button tone="blue" disabled={saving || !form.doctorName} onClick={onSave}>Save Schedule</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DoctorSchedulePage() {
  const schedules = useModuleRecords('hospital/doctor-schedule');
  const doctors = useModuleRecords('hospital/doctors');
  const appointments = useModuleRecords('hospital/appointments');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [block, setBlock] = useState({ doctorName: 'Dr. Arun Kumar', from: '', to: '', reason: 'Leave', notify: true });
  const [message, setMessage] = useState('');

  const doctorOptions = useMemo(() => {
    const fromDoctors = doctors.records.map((record) => ({
      doctorName: doctorName(record.data),
      departmentName: record.data?.departmentName || record.data?.department || record.data?.specialization || '',
      consultationFee: record.data?.consultationFee,
    })).filter((item) => item.doctorName);
    const fromSchedules = schedules.records.map((record) => ({
      doctorName: record.data?.doctorName,
      departmentName: record.data?.departmentName,
      consultationFee: record.data?.consultationFee,
    })).filter((item) => item.doctorName);
    const map = new Map([...fromDoctors, ...fromSchedules].map((item) => [item.doctorName, item]));
    return map.size ? [...map.values()] : [{ doctorName: 'Dr. Arun Kumar', departmentName: 'General Medicine', consultationFee: 500 }];
  }, [doctors.records, schedules.records]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const existing = schedules.records.map((record) => ({ id: record._id, data: { ...EMPTY_FORM, ...record.data } }));
    const scheduledNames = new Set(existing.map((record) => record.data.doctorName));
    const missing = doctorOptions
      .filter((doctor) => !scheduledNames.has(doctor.doctorName))
      .map((doctor) => ({ id: `doctor-${doctor.doctorName}`, data: { ...EMPTY_FORM, doctorName: doctor.doctorName, departmentName: doctor.departmentName || EMPTY_FORM.departmentName, consultationFee: doctor.consultationFee || EMPTY_FORM.consultationFee } }));
    return [...existing, ...missing].filter((record) => {
      if (!q) return true;
      return [record.data.doctorName, record.data.departmentName].filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }, [doctorOptions, schedules.records, search]);

  const affectedAppointments = useMemo(() => appointments.records.filter((record) => (
    record.data?.doctorName === block.doctorName
    && dateBetween(record.data?.date, block.from, block.to)
    && !['Cancelled', 'Completed', 'No Show'].includes(record.data?.status)
  )), [appointments.records, block.doctorName, block.from, block.to]);

  async function saveSchedule() {
    setSaving(true);
    try {
      const payload = { ...modal.data, status: 'Available' };
      if (modal.id && !String(modal.id).startsWith('doctor-')) await schedules.update(modal.id, payload);
      else await schedules.create(payload);
      setModal(null);
      setMessage(`Schedule saved for ${payload.doctorName}. Available slots can now be used during booking.`);
    } finally {
      setSaving(false);
    }
  }

  async function blockSchedule() {
    if (!block.doctorName || !block.from || !block.to) {
      setMessage('Select doctor and leave date range before blocking availability.');
      return;
    }
    await schedules.create({
      name: `${block.doctorName} unavailable`,
      doctorName: block.doctorName,
      blockFrom: block.from,
      blockTo: block.to,
      blockReason: block.reason,
      notifyAffectedAppointments: block.notify ? 'Yes' : 'No',
      affectedAppointments: affectedAppointments.length,
      status: 'Blocked',
    });
    setMessage(`${affectedAppointments.length} appointments are affected. Reception can reschedule them from Appointment Calendar or Appointment List.`);
  }

  return (
    <div className="p-4 md:p-7">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="m-0 text-[22px] font-extrabold text-[#071936]">Doctor Schedule</h1>
          <p className="m-0 mt-1 text-[13px] font-semibold text-[#64748b]">Manage doctor working availability, sessions, fees and leave blocks.</p>
        </div>
        <Button tone="blue" onClick={() => setModal({ data: { ...EMPTY_FORM, doctorName: doctorOptions[0]?.doctorName || EMPTY_FORM.doctorName, departmentName: doctorOptions[0]?.departmentName || EMPTY_FORM.departmentName } })}><Plus size={14} />Add Schedule</Button>
      </div>

      {message && <div className="mb-4 rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-[13px] font-semibold text-blue-700">{message}</div>}

      <div className="mb-5 rounded-lg border border-[#dfe7f1] bg-white p-4">
        <div className="flex items-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-3">
          <Search size={15} className="text-[#64748b]" />
          <input className="h-10 min-w-0 flex-1 border-0 bg-transparent text-[13px] font-[inherit] outline-none" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search Doctor" />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {rows.map((record) => (
          <section key={record.id} className="rounded-lg border border-[#dfe7f1] bg-white p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-blue-600"><UserRound size={18} /></span>
                <div>
                  <h2 className="m-0 text-[17px] font-extrabold text-[#071936]">{record.data.doctorName}</h2>
                  <p className="m-0 mt-1 text-[13px] font-semibold text-[#64748b]">{record.data.departmentName || '-'}</p>
                </div>
              </div>
              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${record.data.status === 'Blocked' ? 'border-red-100 bg-red-50 text-red-700' : 'border-emerald-100 bg-emerald-50 text-emerald-700'}`}>{record.data.status === 'Blocked' ? 'BLOCKED' : 'AVAILABLE'}</span>
            </div>

            <div className="grid gap-3 text-[13px] font-semibold text-[#334155]">
              <div className="flex items-center gap-2"><CalendarOff size={14} className="text-[#64748b]" />{record.data.workingDays?.join(' - ') || '-'}</div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-md bg-[#f8fbff] p-3"><div className="text-[11px] font-extrabold uppercase text-[#64748b]">Morning</div><div className="mt-1 font-extrabold text-[#071936]">{timeLabel(record.data.morningStart)} - {timeLabel(record.data.morningEnd)}</div></div>
                <div className="rounded-md bg-[#f8fbff] p-3"><div className="text-[11px] font-extrabold uppercase text-[#64748b]">Evening</div><div className="mt-1 font-extrabold text-[#071936]">{timeLabel(record.data.eveningStart)} - {timeLabel(record.data.eveningEnd)}</div></div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="flex justify-between"><span>Slot Duration</span><strong>{record.data.slotDuration}</strong></div>
                <div className="flex justify-between"><span>Max Appointments</span><strong>{record.data.maxPatients} / Day</strong></div>
                <div className="flex justify-between"><span>Consultation Fee</span><strong>{money(record.data.consultationFee)}</strong></div>
                <div className="flex justify-between"><span>Follow-up Fee</span><strong>{money(record.data.followUpFee)}</strong></div>
              </div>
            </div>

            <div className="mt-5 flex justify-end border-t border-[#edf2f7] pt-4">
              <Button onClick={() => setModal({ id: record.id, data: { ...record.data } })}><Stethoscope size={14} />Edit Schedule</Button>
            </div>
          </section>
        ))}
      </div>

      <section className="mt-5 rounded-lg border border-[#dfe7f1] bg-white p-5">
        <div className="mb-4 flex items-center gap-2 text-[16px] font-extrabold text-[#071936]"><CalendarOff size={18} className="text-red-500" />Block Availability</div>
        <div className="grid gap-4 md:grid-cols-5">
          <label className="text-[12px] font-extrabold uppercase text-[#536173] md:col-span-2">Doctor<select className={`${INPUT} mt-1`} value={block.doctorName} onChange={(event) => setBlock({ ...block, doctorName: event.target.value })}>{doctorOptions.map((item) => <option key={item.doctorName}>{item.doctorName}</option>)}</select></label>
          <label className="text-[12px] font-extrabold uppercase text-[#536173]">From<input className={`${INPUT} mt-1`} type="date" value={block.from} onChange={(event) => setBlock({ ...block, from: event.target.value })} /></label>
          <label className="text-[12px] font-extrabold uppercase text-[#536173]">To<input className={`${INPUT} mt-1`} type="date" value={block.to} onChange={(event) => setBlock({ ...block, to: event.target.value })} /></label>
          <label className="text-[12px] font-extrabold uppercase text-[#536173]">Reason<select className={`${INPUT} mt-1`} value={block.reason} onChange={(event) => setBlock({ ...block, reason: event.target.value })}>{REASONS.map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#334155]"><input type="checkbox" checked={block.notify} onChange={(event) => setBlock({ ...block, notify: event.target.checked })} />Notify affected appointments</label>
          <div className="text-[13px] font-extrabold text-amber-700">{block.from && block.to ? `${affectedAppointments.length} appointments are affected.` : 'Select date range to check affected appointments.'}</div>
          <Button tone="red" onClick={blockSchedule}><CalendarOff size={14} />Block Schedule</Button>
        </div>
      </section>

      <div className="mt-5 rounded-lg border border-[#dfe7f1] bg-white p-4">
        <div className="mb-3 text-[12px] font-extrabold uppercase text-[#536173]">Workflow</div>
        <div className="flex flex-wrap items-center gap-2 text-[12px] font-bold text-[#334155]">
          {['Doctor', 'Configure Working Days', 'Configure Sessions', 'Set Slot Duration', 'Save', 'Available Slots Generated', 'Book Appointment uses these slots'].map((step, index) => (
            <span key={step} className="inline-flex items-center gap-2">
              <span className="rounded-md border border-[#dbe4ef] bg-[#f8fbff] px-2.5 py-1">{step}</span>
              {index < 6 && <span className="text-[#94a3b8]">-&gt;</span>}
            </span>
          ))}
        </div>
      </div>

      {modal && (
        <ScheduleForm
          form={modal.data}
          setForm={(updater) => setModal((current) => ({ ...current, data: typeof updater === 'function' ? updater(current.data) : updater }))}
          doctors={doctors.records}
          onSave={saveSchedule}
          onClose={() => setModal(null)}
          saving={saving}
        />
      )}
    </div>
  );
}
