import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Clock3, IndianRupee, Phone, Plus, Search, UserRound, X } from 'lucide-react';

import { useModuleRecords } from '../shared/recordUi/useModuleRecords.js';
import { todayISO } from '../shared/recordUi/dateUtils.js';

const INPUT = 'h-10 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-[inherit] text-[#111827] outline-none focus:border-blue-500';
const DEPARTMENTS = ['General Medicine', 'Cardiology', 'Orthopedics', 'Pediatrics', 'Gynecology', 'Dermatology'];
const DOCTORS_BY_DEPARTMENT = {
  'General Medicine': ['', 'Dr. Meera Nair'],
  Cardiology: ['Dr. Suresh Babu', 'Dr. Kavitha Rao'],
  Orthopedics: ['Dr. Naveen Raj'],
  Pediatrics: ['Dr. Anitha Menon'],
  Gynecology: ['Dr. Priya Raman'],
  Dermatology: ['Dr. Farhan Ali'],
};
const SLOT_GROUPS = {
  Morning: ['09:00', '09:15', '09:30', '09:45', '10:00'],
  Afternoon: ['14:00', '14:15', '14:30', '14:45'],
  Evening: ['17:00', '17:15', '17:30'],
};

function phoneOf(data = {}) {
  return data.phone || data.mobile || '-';
}

function nextAppointmentId(records) {
  const year = new Date().getFullYear();
  const prefix = `APT-${year}-`;
  const max = records.reduce((highest, record) => {
    const raw = record.data?.appointmentId || '-';
    if (!String(raw).startsWith(prefix)) return highest;
    const n = Number(String(raw).slice(prefix.length));
    return Number.isFinite(n) ? Math.max(highest, n) : highest;
  }, 1244);
  return `${prefix}${String(max + 1).padStart(6, '0')}`;
}

function nextReceiptNo(records) {
  const max = records.reduce((highest, record) => {
    const n = Number(String(record.data?.receiptNo || '-').replace(/\D/g, ''));
    return Number.isFinite(n) ? Math.max(highest, n) : highest;
  }, 200);
  return `REC-${String(max + 1).padStart(3, '0')}`;
}

function dateBetween(value, from, to) {
  if (!value || !from || !to) return false;
  return value >= from && value <= to;
}

function dayName(value) {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(value).getDay()];
}

function toMinutes(time) {
  const [hour, minute] = String(time || '-').split(':').map(Number);
  return (hour || 0) * 60 + (minute || 0);
}

function fromMinutes(total) {
  const hour = Math.floor(total / 60);
  const minute = total % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function durationMinutes(label) {
  return Number(String(label || '-').replace(/\D/g, '')) || 15;
}

function slotsFromSchedule(schedule, date) {
  if (!schedule) return SLOT_GROUPS;
  if (!schedule.workingDays?.includes(dayName(date))) return { Morning: [], Afternoon: [], Evening: [] };
  const step = durationMinutes(schedule.slotDuration);
  const build = (start, end) => {
    const from = toMinutes(start);
    const to = toMinutes(end);
    if (!from || !to || to <= from) return [];
    const slots = [];
    for (let value = from; value < to; value += step) slots.push(fromMinutes(value));
    return slots;
  };
  return {
    Morning: build(schedule.morningStart, schedule.morningEnd),
    Evening: build(schedule.eveningStart, schedule.eveningEnd),
  };
}

function Button({ children, onClick, tone = 'white', disabled = false }) {
  const tones = {
    blue: 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700',
    green: 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700',
    white: 'border-[#dbe4ef] bg-white text-[#374151] hover:bg-gray-50',
  };
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border px-4 text-[13px] font-semibold ${tones[tone]} cursor-pointer disabled:cursor-not-allowed disabled:opacity-60`}>
      {children}
    </button>
  );
}

export function BookAppointmentPage() {
  const query = new URLSearchParams(window.location.search);
  const patients = useModuleRecords('hospital/patients');
  const appointments = useModuleRecords('hospital/appointments');
  const payments = useModuleRecords('hospital/payments');
  const schedules = useModuleRecords('hospital/doctor-schedule');
  const [search, setSearch] = useState('');
  const [showPatients, setShowPatients] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [department, setDepartment] = useState('General Medicine');
  const [doctor, setDoctor] = useState('');
  const [date, setDate] = useState(query.get('date') || todayISO());
  const [slot, setSlot] = useState(query.get('time') || '09:00');
  const [visitType, setVisitType] = useState('Consultation');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [fee, setFee] = useState(500);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const selectedPatient = patients.records.find((record) => record._id === selectedPatientId) || null;
  const activeSchedules = useMemo(() => schedules.records.filter((record) => record.data?.status !== 'Blocked'), [schedules.records]);
  const departmentOptions = useMemo(() => [...new Set([...DEPARTMENTS, ...activeSchedules.map((record) => record.data?.departmentName).filter(Boolean)])], [activeSchedules]);
  const doctors = useMemo(() => {
    const scheduled = activeSchedules.filter((record) => record.data?.departmentName === department).map((record) => record.data?.doctorName).filter(Boolean);
    return scheduled.length ? [...new Set(scheduled)] : DOCTORS_BY_DEPARTMENT[department] || [];
  }, [activeSchedules, department]);
  const selectedSchedule = activeSchedules.find((record) => record.data?.doctorName === doctor && record.data?.departmentName === department)?.data || null;
  const isDoctorBlocked = schedules.records.some((record) => record.data?.status === 'Blocked' && record.data?.doctorName === doctor && dateBetween(date, record.data?.blockFrom, record.data?.blockTo));
  const slotGroups = isDoctorBlocked ? { Morning: [], Afternoon: [], Evening: [] } : slotsFromSchedule(selectedSchedule, date);
  const appointmentId = useMemo(() => nextAppointmentId(appointments.records), [appointments.records]);
  const bookedSlots = useMemo(() => new Set(appointments.records
    .filter((record) => record.data?.date === date && record.data?.doctorName === doctor && !['Cancelled', 'No Show'].includes(record.data?.status))
    .map((record) => record.data?.time)
    .filter(Boolean)), [appointments.records, date, doctor]);

  const patientOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    const source = q ? patients.records.filter((record) => {
      const data = record.data || {};
      return [data.patientId, data.name, data.email, phoneOf(data)].filter(Boolean).join(' ').toLowerCase().includes(q);
    }) : patients.records;
    return source.slice(0, 6);
  }, [patients.records, search]);

  useEffect(() => {
    if (!selectedSchedule) return;
    const nextFee = visitType === 'Follow-up' ? selectedSchedule.followUpFee : selectedSchedule.consultationFee;
    if (nextFee !== undefined && nextFee !== null && nextFee !== '') setFee(nextFee);
  }, [selectedSchedule, visitType]);

  function selectPatient(record) {
    setSelectedPatientId(record._id);
    setSearch(record.data?.name || '-');
    setShowPatients(false);
  }

  function resetForm() {
    setSearch('');
    setSelectedPatientId('');
    setDepartment('General Medicine');
    setDoctor('');
    setDate(todayISO());
    setSlot('09:00');
    setVisitType('Consultation');
    setReason('');
    setNotes('');
    setFee(500);
    setMessage('');
  }

  async function book({ collectFee = false } = {}) {
    if (!selectedPatient) {
      setMessage('Select a patient before booking.');
      return;
    }
    if (!slot) {
      setMessage('Select an available slot.');
      return;
    }
    if (bookedSlots.has(slot)) {
      setMessage('This slot is already booked for the selected doctor.');
      return;
    }
    const data = selectedPatient.data || {};
    const payload = {
      appointmentId,
      patientName: data.name || '-',
      patientId: data.patientId || '-',
      patientPhone: phoneOf(data),
      doctorName: doctor,
      departmentName: department,
      date,
      time: slot,
      visitType,
      reason,
      consultationFee: Number(fee || 0),
      notes,
      status: 'Scheduled',
      paymentStatus: collectFee ? 'Paid' : 'Not Collected',
      confirmation: 'Pending',
    };
    setSaving(true);
    try {
      await appointments.create(payload);
      if (collectFee) {
        await payments.create({
          receiptNo: nextReceiptNo(payments.records),
          invoiceNo: appointmentId,
          patientName: data.name || '-',
          patientId: data.patientId || '-',
          mobile: phoneOf(data),
          method: 'Cash',
          amount: Number(fee || 0),
          status: 'Success',
          date,
          source: 'Appointment',
          notes: `Consultation fee for ${appointmentId}`,
        });
      }
      setMessage(`${appointmentId} booked${collectFee ? ' and fee collected' : ''}. Confirmation ready for SMS/WhatsApp.`);
      setSlot('');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 md:p-7">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="m-0 text-[22px] font-extrabold text-[#071936]">Book Appointment</h1>
          <p className="m-0 mt-1 text-[13px] font-semibold text-[#64748b]">Fast reception booking with patient search, availability and token-ready confirmation.</p>
        </div>
        <Button onClick={() => window.location.assign('/hospital/patient-registration')}><Plus size={14} />New Patient</Button>
      </div>

      {message && <div className="mb-4 rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-[13px] font-semibold text-blue-700">{message}</div>}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-lg border border-[#dfe7f1] bg-white p-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_220px_220px]">
            <div className="relative">
              <label className="mb-1 block text-[12px] font-extrabold uppercase text-[#536173]">Patient</label>
              <div className="flex items-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-3">
                <Search size={15} className="text-[#64748b]" />
                <input className="h-10 min-w-0 flex-1 border-0 bg-transparent text-[13px] font-[inherit] outline-none" value={search} onFocus={() => setShowPatients(true)} onChange={(event) => { setSearch(event.target.value); setShowPatients(true); }} placeholder="Search Patient ID / Name / Mobile" />
              </div>
              {showPatients && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-md border border-[#dbe4ef] bg-white p-1 shadow-lg">
                  {patientOptions.length === 0 ? <div className="px-3 py-2 text-[13px] text-[#64748b]">No matching patient found.</div> : patientOptions.map((record) => (
                    <button key={record._id} type="button" onClick={() => selectPatient(record)} className="flex w-full items-center justify-between gap-3 rounded px-3 py-2 text-left text-[13px] hover:bg-blue-50">
                      <span><strong>{record.data?.name || 'Unnamed'}</strong><span className="ml-2 text-[#64748b]">{record.data?.patientId || '-'}</span></span>
                      <span className="text-[#64748b]">{phoneOf(record.data)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-extrabold uppercase text-[#536173]">Department *</label>
              <select className={INPUT} value={department} onChange={(event) => {
                const nextDepartment = event.target.value;
                const scheduledDoctors = activeSchedules.filter((record) => record.data?.departmentName === nextDepartment).map((record) => record.data?.doctorName).filter(Boolean);
                setDepartment(nextDepartment);
                setDoctor(scheduledDoctors[0] || DOCTORS_BY_DEPARTMENT[nextDepartment]?.[0] || '-');
              }}>
                {departmentOptions.map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-extrabold uppercase text-[#536173]">Doctor *</label>
              <select className={INPUT} value={doctor} onChange={(event) => setDoctor(event.target.value)}>
                {doctors.map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>
          </div>

          {selectedPatient && (
            <div className="mt-4 rounded-md border border-[#dbe4ef] bg-[#f8fbff] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[15px] font-extrabold text-[#071936]">{selectedPatient.data?.name || 'Unnamed'} <span className="ml-3 text-[13px] text-[#64748b]">{selectedPatient.data?.patientId || '-'}</span></div>
                  <div className="mt-1 text-[13px] font-semibold text-[#475569]">{selectedPatient.data?.age || '-'} Years - {selectedPatient.data?.gender || '-'}</div>
                </div>
                <div className="inline-flex items-center gap-2 text-[13px] font-extrabold text-[#071936]"><Phone size={14} />{phoneOf(selectedPatient.data) || '-'}</div>
              </div>
            </div>
          )}

          <div className="mt-4 grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
            <div>
              <label className="mb-1 block text-[12px] font-extrabold uppercase text-[#536173]">Appointment Date *</label>
              <div className="flex items-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-3">
                <CalendarDays size={15} className="text-blue-600" />
                <input className="h-10 min-w-0 flex-1 border-0 bg-transparent text-[13px] font-[inherit] outline-none" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
              </div>
            </div>
            <div>
              <div className="mb-2 text-[12px] font-extrabold uppercase text-[#536173]">Available Slots</div>
              <div className="grid gap-3">
                {Object.entries(slotGroups).map(([label, slots]) => (
                  <div key={label}>
                    <div className="mb-1 text-[12px] font-bold text-[#334155]">{label}</div>
                    <div className="flex flex-wrap gap-2">
                      {slots.length === 0 && <span className="text-[12px] font-semibold text-[#94a3b8]">No slots</span>}
                      {slots.map((time) => {
                        const booked = bookedSlots.has(time);
                        return (
                          <button key={time} type="button" disabled={booked} onClick={() => setSlot(time)} className={`h-9 rounded-md border px-3 text-[13px] font-bold ${slot === time ? 'border-blue-600 bg-blue-600 text-white' : booked ? 'border-[#e5e7eb] bg-[#f8fafc] text-[#94a3b8]' : 'border-[#dbe4ef] bg-white text-[#0f172a] hover:bg-blue-50'} cursor-pointer disabled:cursor-not-allowed`}>
                            {time}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[220px_minmax(0,1fr)_180px]">
            <div>
              <label className="mb-2 block text-[12px] font-extrabold uppercase text-[#536173]">Visit Type</label>
              <div className="grid gap-2 text-[13px] font-semibold text-[#111827]">
                {['Consultation', 'Follow-up'].map((item) => (
                  <label key={item} className="inline-flex items-center gap-2"><input type="radio" checked={visitType === item} onChange={() => setVisitType(item)} />{item}</label>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-extrabold uppercase text-[#536173]">Reason for Visit</label>
              <input className={INPUT} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Fever and body pain" />
              <input className={`${INPUT} mt-2`} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Appointment notes" />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-extrabold uppercase text-[#536173]">Consultation Fee</label>
              <div className="flex items-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-3">
                <IndianRupee size={14} className="text-[#64748b]" />
                <input className="h-10 min-w-0 flex-1 border-0 bg-transparent text-[13px] font-[inherit] outline-none" type="number" min="0" value={fee} onChange={(event) => setFee(event.target.value)} />
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-[#edf2f7] pt-4">
            <Button onClick={resetForm}><X size={14} />Cancel</Button>
            <Button tone="blue" onClick={() => book({ collectFee: false })} disabled={saving || !selectedPatient || !slot}><Clock3 size={14} />Book Only</Button>
            <Button tone="green" onClick={() => book({ collectFee: true })} disabled={saving || !selectedPatient || !slot}><CheckCircle2 size={14} />Book & Collect Fee</Button>
          </div>
        </section>

        <aside className="rounded-lg border border-[#dfe7f1] bg-white p-4">
          <div className="text-[12px] font-extrabold uppercase text-[#536173]">Booking Summary</div>
          <div className="mt-3 grid gap-3 text-[13px]">
            <div className="flex justify-between"><span>Appointment ID</span><strong>{appointmentId}</strong></div>
            <div className="flex justify-between"><span>Date</span><strong>{date}</strong></div>
            <div className="flex justify-between"><span>Slot</span><strong>{slot || '-'}</strong></div>
            <div className="flex justify-between"><span>Doctor</span><strong>{doctor || '-'}</strong></div>
            <div className="flex justify-between"><span>Fee</span><strong>Rs. {Number(fee || 0).toLocaleString('en-IN')}</strong></div>
          </div>
          <div className="mt-4 rounded-md bg-[#f8fbff] p-3 text-[12px] font-semibold leading-5 text-[#475569]">
            Workflow: search patient, select department, doctor, date, slot, visit type, then book. Queue/token can be generated on arrival.
          </div>
        </aside>
      </div>
    </div>
  );
}

