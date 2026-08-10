import { useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, CalendarOff, Clock3, Edit3, Plus, Search, ShieldAlert } from 'lucide-react';

import { useModuleRecords } from '../shared/recordUi/useModuleRecords.js';
import { todayISO } from '../shared/recordUi/dateUtils.js';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const SLOT_DURATIONS = ['10 Minutes', '15 Minutes', '20 Minutes', '30 Minutes'];
const REASONS = ['Leave', 'Holiday', 'Emergency Unavailability', 'Blocked Slot', 'Temporary Schedule'];
const INPUT = 'h-10 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-[inherit] text-[#111827] outline-none focus:border-blue-500';

const EMPTY_FORM = {
  doctorName: 'Dr. Arun Kumar',
  departmentName: 'General Medicine',
  workingDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
  morningStart: '09:00',
  morningEnd: '13:00',
  eveningStart: '17:00',
  eveningEnd: '20:00',
  saturdayEvening: false,
  slotDuration: '15 Minutes',
  maxPatients: 40,
  consultationFee: 500,
  followUpFee: 300,
  followUpValidity: 7,
  status: 'Available',
};

function normalize(value = '') {
  return String(value || '').trim().toLowerCase();
}

function doctorName(data = {}) {
  return data.name || data.doctorName || '';
}

function dateBetween(value, from, to) {
  if (!value || !from || !to) return false;
  return value >= from && value <= to;
}

function timeRange(start, end) {
  if (!start || !end) return 'OFF';
  return `${String(start).slice(0, 5)} - ${String(end).slice(0, 5)}`;
}

function scheduleForDay(schedule, day) {
  const workingDays = (schedule.workingDays || []).map((item) => String(item).toUpperCase());
  if (!workingDays.includes(day)) return { morning: 'OFF', evening: '' };
  if (day === 'SAT' && !schedule.saturdayEvening) return { morning: timeRange(schedule.morningStart, schedule.morningEnd), evening: '' };
  return { morning: timeRange(schedule.morningStart, schedule.morningEnd), evening: timeRange(schedule.eveningStart, schedule.eveningEnd) };
}

function Button({ children, onClick, tone = 'white', disabled = false }) {
  const tones = {
    blue: 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700',
    red: 'border-red-100 bg-red-50 text-red-700 hover:bg-red-100',
    white: 'border-[#dbe4ef] bg-white text-[#374151] hover:bg-gray-50',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-[13px] font-semibold ${tones[tone]} font-[inherit] transition disabled:opacity-60`}
    >
      {children}
    </button>
  );
}

function EditSchedulePanel({ form, setForm, doctors, onSave, onCancel, saving }) {
  function toggleDay(day) {
    setForm((current) => ({
      ...current,
      workingDays: current.workingDays.includes(day)
        ? current.workingDays.filter((item) => item !== day)
        : [...current.workingDays, day],
    }));
  }

  return (
    <section className="mt-5 rounded-lg border border-[#dfe7f1] bg-white p-4">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-[#edf2f7] pb-3">
        <div>
          <h2 className="m-0 text-[17px] font-extrabold text-[#071936]">Edit Schedule</h2>
          <p className="m-0 mt-1 text-[12px] font-semibold text-[#64748b]">Working days, sessions, slot duration and appointment capacity.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={onCancel}>Cancel</Button>
          <Button tone="blue" onClick={onSave} disabled={saving}>Save Schedule</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label className="text-[12px] font-extrabold uppercase text-[#536173]">
          Doctor *
          <select className={`${INPUT} mt-1`} value={form.doctorName} onChange={(event) => {
            const selected = doctors.find((record) => doctorName(record.data) === event.target.value);
            setForm({ ...form, doctorName: event.target.value, departmentName: selected?.data?.departmentName || form.departmentName });
          }}>
            {[form.doctorName, ...doctors.map((record) => doctorName(record.data)).filter(Boolean)].filter((item, index, arr) => item && arr.indexOf(item) === index).map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="text-[12px] font-extrabold uppercase text-[#536173]">
          Department
          <input className={`${INPUT} mt-1`} value={form.departmentName} onChange={(event) => setForm({ ...form, departmentName: event.target.value })} />
        </label>
        <label className="text-[12px] font-extrabold uppercase text-[#536173]">
          Slot Duration
          <select className={`${INPUT} mt-1`} value={form.slotDuration} onChange={(event) => setForm({ ...form, slotDuration: event.target.value })}>
            {SLOT_DURATIONS.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
      </div>

      <div className="mt-4">
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

      <div className="mt-4 grid gap-4 md:grid-cols-2">
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
          <label className="mt-2 inline-flex items-center gap-2 text-[13px] font-semibold text-[#334155]">
            <input type="checkbox" checked={form.saturdayEvening} onChange={(event) => setForm({ ...form, saturdayEvening: event.target.checked })} />
            Include Saturday evening
          </label>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-4">
        <label className="text-[12px] font-extrabold uppercase text-[#536173]">Max Patients<input className={`${INPUT} mt-1`} type="number" value={form.maxPatients} onChange={(event) => setForm({ ...form, maxPatients: event.target.value })} /></label>
        <label className="text-[12px] font-extrabold uppercase text-[#536173]">Consultation Fee<input className={`${INPUT} mt-1`} type="number" value={form.consultationFee} onChange={(event) => setForm({ ...form, consultationFee: event.target.value })} /></label>
        <label className="text-[12px] font-extrabold uppercase text-[#536173]">Follow-up Fee<input className={`${INPUT} mt-1`} type="number" value={form.followUpFee} onChange={(event) => setForm({ ...form, followUpFee: event.target.value })} /></label>
        <label className="text-[12px] font-extrabold uppercase text-[#536173]">Follow-up Validity<input className={`${INPUT} mt-1`} type="number" value={form.followUpValidity} onChange={(event) => setForm({ ...form, followUpValidity: event.target.value })} /></label>
      </div>
    </section>
  );
}

export function DoctorSchedulePage() {
  const schedules = useModuleRecords('hospital/doctor-schedule');
  const doctors = useModuleRecords('hospital/doctors');
  const appointments = useModuleRecords('hospital/appointments');
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('General Medicine');
  const [date, setDate] = useState(todayISO());
  const [editing, setEditing] = useState(null);
  const [showBlock, setShowBlock] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [block, setBlock] = useState({ doctorName: 'Dr. Arun Kumar', from: todayISO(), to: todayISO(), reason: 'Leave', notify: true });

  const doctorOptions = useMemo(() => {
    const fromDoctors = doctors.records.map((record) => ({
      doctorName: doctorName(record.data),
      departmentName: record.data?.departmentName || record.data?.department || 'General Medicine',
      consultationFee: record.data?.consultationFee,
    })).filter((item) => item.doctorName);
    const fromSchedules = schedules.records.map((record) => ({
      doctorName: record.data?.doctorName,
      departmentName: record.data?.departmentName || 'General Medicine',
      consultationFee: record.data?.consultationFee,
    })).filter((item) => item.doctorName);
    const map = new Map([...fromDoctors, ...fromSchedules].map((item) => [item.doctorName, item]));
    return map.size ? [...map.values()] : [{ doctorName: 'Dr. Arun Kumar', departmentName: 'General Medicine', consultationFee: 500 }];
  }, [doctors.records, schedules.records]);

  const departments = useMemo(() => [...new Set(['General Medicine', ...doctorOptions.map((item) => item.departmentName).filter(Boolean)])], [doctorOptions]);

  const rows = useMemo(() => {
    const q = normalize(search);
    const existing = schedules.records
      .filter((record) => normalize(record.data?.status) !== 'blocked')
      .map((record) => ({ id: record._id, data: { ...EMPTY_FORM, ...record.data, workingDays: (record.data?.workingDays || EMPTY_FORM.workingDays).map((day) => String(day).toUpperCase().slice(0, 3)) } }));
    const scheduledNames = new Set(existing.map((record) => record.data.doctorName));
    const missing = doctorOptions
      .filter((doctor) => !scheduledNames.has(doctor.doctorName))
      .map((doctor) => ({
        id: `doctor-${doctor.doctorName}`,
        data: {
          ...EMPTY_FORM,
          doctorName: doctor.doctorName,
          departmentName: doctor.departmentName || EMPTY_FORM.departmentName,
          consultationFee: doctor.consultationFee || EMPTY_FORM.consultationFee,
        },
      }));
    return [...existing, ...missing].filter((record) => {
      const matchesSearch = !q || normalize([record.data.doctorName, record.data.departmentName].join(' ')).includes(q);
      const matchesDepartment = !department || record.data.departmentName === department;
      return matchesSearch && matchesDepartment;
    });
  }, [department, doctorOptions, schedules.records, search]);

  const affectedAppointments = useMemo(() => appointments.records.filter((record) => (
    record.data?.doctorName === block.doctorName
    && dateBetween(record.data?.date, block.from, block.to)
    && !['Cancelled', 'Completed', 'No Show'].includes(record.data?.status)
  )), [appointments.records, block.doctorName, block.from, block.to]);

  async function saveSchedule() {
    setSaving(true);
    try {
      const payload = { ...editing.data, status: 'Available' };
      if (editing.id && !String(editing.id).startsWith('doctor-')) await schedules.update(editing.id, payload);
      else await schedules.create(payload);
      setEditing(null);
      setMessage(`Schedule saved for ${payload.doctorName}. Available slots will be used by Book Appointment.`);
    } finally {
      setSaving(false);
    }
  }

  async function blockSchedule() {
    if (!block.doctorName || !block.from || !block.to) {
      setMessage('Select doctor and date range before blocking availability.');
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
    setShowBlock(false);
    setMessage(`${affectedAppointments.length} existing appointments are affected. Reception should reschedule them from Appointment List or Calendar.`);
  }

  function openEdit(record) {
    setEditing({ id: record.id, data: { ...record.data } });
    setShowBlock(false);
  }

  function openBlock(record) {
    setBlock({ doctorName: record.data.doctorName, from: date, to: date, reason: 'Leave', notify: true });
    setShowBlock(true);
    setEditing(null);
  }

  return (
    <div className="p-4 md:p-7">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="m-0 text-[24px] font-extrabold text-[#071936]">Doctor Schedule</h1>
          <p className="m-0 mt-1 text-[13px] font-semibold text-[#64748b]">One schedule source for Appointments and Doctors & Nursing availability.</p>
        </div>
        <Button tone="blue" onClick={() => openEdit({ id: '', data: { ...EMPTY_FORM, doctorName: doctorOptions[0]?.doctorName || EMPTY_FORM.doctorName, departmentName: department } })}>
          <Plus size={15} />Add Schedule
        </Button>
      </div>

      {message && <div className="mb-4 rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-[13px] font-semibold text-blue-700">{message}</div>}

      <section className="mb-5 rounded-lg border border-[#dfe7f1] bg-white p-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(260px,1fr)_260px_220px]">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
            <input
              className="h-10 w-full rounded-md border border-[#dbe4ef] bg-white pl-9 pr-3 text-[13px] font-[inherit] outline-none focus:border-blue-500"
              placeholder="Search Doctor"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <label className="grid grid-cols-[90px_1fr] items-center gap-2 text-[13px] font-bold text-[#334155]">
            Department
            <select className={INPUT} value={department} onChange={(event) => setDepartment(event.target.value)}>
              {departments.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="grid grid-cols-[44px_1fr] items-center gap-2 text-[13px] font-bold text-[#334155]">
            Date
            <input className={INPUT} type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
        </div>
      </section>

      <div className="grid gap-4">
        {rows.map((record) => (
          <section key={record.id} className="rounded-lg border border-[#dfe7f1] bg-white p-5">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="m-0 text-[18px] font-extrabold text-[#071936]">{record.data.doctorName}</h2>
                <p className="m-0 mt-1 text-[13px] font-semibold text-[#64748b]">{record.data.departmentName}</p>
              </div>
              <span className="inline-flex h-8 items-center rounded-full bg-emerald-50 px-3 text-[11px] font-extrabold text-emerald-700">
                <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
                AVAILABLE
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[580px] border-separate border-spacing-0 text-left text-[13px]">
                <tbody>
                  {DAYS.map((day) => {
                    const slots = scheduleForDay(record.data, day);
                    return (
                      <tr key={day} className="border-b border-[#edf2f7]">
                        <td className="w-16 py-2 font-extrabold text-[#071936]">{day}</td>
                        <td className="py-2 font-semibold text-[#334155]">{slots.morning}</td>
                        <td className="py-2 font-semibold text-[#334155]">{slots.evening}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#edf2f7] pt-4">
              <div className="flex flex-wrap gap-3 text-[13px] font-bold text-[#334155]">
                <span className="inline-flex items-center gap-1"><Clock3 size={14} className="text-[#64748b]" />Slot Duration: {record.data.slotDuration || '15 Minutes'}</span>
                <span>Capacity: {record.data.maxPatients || 40} / Day</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => openEdit(record)}><Edit3 size={14} />Edit Schedule</Button>
                <Button onClick={() => openBlock(record)}><CalendarOff size={14} />Block Time</Button>
              </div>
            </div>
          </section>
        ))}
      </div>

      {editing && (
        <EditSchedulePanel
          form={editing.data}
          setForm={(updater) => setEditing((current) => ({ ...current, data: typeof updater === 'function' ? updater(current.data) : updater }))}
          doctors={doctors.records}
          onSave={saveSchedule}
          onCancel={() => setEditing(null)}
          saving={saving}
        />
      )}

      {showBlock && (
        <section className="mt-5 rounded-lg border border-red-100 bg-white p-4">
          <div className="mb-4 flex items-start justify-between gap-3 border-b border-[#edf2f7] pb-3">
            <div>
              <h2 className="m-0 flex items-center gap-2 text-[17px] font-extrabold text-[#071936]"><ShieldAlert size={18} className="text-red-600" />Block Time</h2>
              <p className="m-0 mt-1 text-[12px] font-semibold text-[#64748b]">Leave, holiday and emergency unavailability block affected slots.</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowBlock(false)}>Cancel</Button>
              <Button tone="red" onClick={blockSchedule}><CalendarOff size={14} />Block Schedule</Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-5">
            <label className="text-[12px] font-extrabold uppercase text-[#536173] md:col-span-2">Doctor<select className={`${INPUT} mt-1`} value={block.doctorName} onChange={(event) => setBlock({ ...block, doctorName: event.target.value })}>{doctorOptions.map((item) => <option key={item.doctorName}>{item.doctorName}</option>)}</select></label>
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">From<input className={`${INPUT} mt-1`} type="date" value={block.from} onChange={(event) => setBlock({ ...block, from: event.target.value })} /></label>
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">To<input className={`${INPUT} mt-1`} type="date" value={block.to} onChange={(event) => setBlock({ ...block, to: event.target.value })} /></label>
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">Reason<select className={`${INPUT} mt-1`} value={block.reason} onChange={(event) => setBlock({ ...block, reason: event.target.value })}>{REASONS.map((item) => <option key={item}>{item}</option>)}</select></label>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#334155]"><input type="checkbox" checked={block.notify} onChange={(event) => setBlock({ ...block, notify: event.target.checked })} />Notify affected appointments</label>
            <div className="inline-flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-[13px] font-extrabold text-amber-700">
              <AlertTriangle size={15} />
              {affectedAppointments.length} appointments are affected.
            </div>
          </div>
        </section>
      )}

      <section className="mt-5 rounded-lg border border-[#dfe7f1] bg-white p-4">
        <div className="mb-3 flex items-center gap-2 text-[13px] font-extrabold uppercase text-[#536173]"><CalendarDays size={15} />Connection</div>
        <div className="flex flex-wrap items-center gap-2 text-[12px] font-bold text-[#334155]">
          {['Doctor Schedule', 'Available Slots', 'Appointments', 'Book Appointment'].map((step, index, arr) => (
            <span key={step} className="inline-flex items-center gap-2">
              <span className="rounded-md border border-[#dbe4ef] bg-[#f8fbff] px-2.5 py-1">{step}</span>
              {index < arr.length - 1 && <span className="text-[#94a3b8]">-&gt;</span>}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
