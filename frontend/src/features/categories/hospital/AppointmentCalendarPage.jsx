import { Fragment, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Stethoscope, UserRound, X } from 'lucide-react';

import { useModuleRecords } from '../shared/recordUi/useModuleRecords.js';
import { todayISO } from '../shared/recordUi/dateUtils.js';

const TIMES = ['09:00', '09:30', '10:00', '10:30', '14:00', '14:30', '15:00', '17:00', '17:30'];
const VIEWS = ['Day', 'Week', 'Month'];

function normalizeStatus(status = 'Scheduled') {
  const normalized = String(status || '').trim().toUpperCase().replace(/\s+/g, ' ');
  const map = {
    SCHEDULED: 'BOOKED',
    CHECKEDIN: 'CHECKED-IN',
    'CHECKED IN': 'CHECKED-IN',
    WAITING: 'WAITING',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
    CONFIRMED: 'CONFIRMED',
    'IN CONSULTATION': 'IN CONSULTATION',
    RESCHEDULED: 'RESCHEDULED',
  };
  return map[normalized] || normalized || 'BOOKED';
}

function storedStatus(status) {
  return status.split(' ').map((part) => part.charAt(0) + part.slice(1).toLowerCase()).join(' ');
}

function iso(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function startOfWeek(date) {
  const next = new Date(date);
  const day = next.getDay() || 7;
  next.setDate(next.getDate() - day + 1);
  return next;
}

function monthDays(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const first = new Date(year, month, 1);
  const start = startOfWeek(first);
  return Array.from({ length: 35 }, (_, index) => addDays(start, index));
}

function formatMonth(date) {
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function formatTimeRange(time) {
  if (!time) return '-';
  const [hour, minute] = time.split(':').map(Number);
  const start = new Date();
  start.setHours(hour || 0, minute || 0, 0, 0);
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + 15);
  return `${start.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
}

function statusClass(status) {
  const normalized = normalizeStatus(status);
  if (normalized === 'COMPLETED') return 'border-emerald-100 bg-emerald-50 text-emerald-700';
  if (normalized === 'WAITING' || normalized === 'CHECKED-IN') return 'border-amber-100 bg-amber-50 text-amber-700';
  if (normalized === 'CANCELLED') return 'border-red-100 bg-red-50 text-red-700';
  if (normalized === 'IN CONSULTATION') return 'border-purple-100 bg-purple-50 text-purple-700';
  return 'border-blue-100 bg-blue-50 text-blue-700';
}

function AppointmentCard({ record, compact = false, onClick }) {
  const data = record.data || {};
  return (
    <button type="button" onClick={onClick} className={`block w-full rounded-md border ${statusClass(data.status)} p-2 text-left shadow-sm cursor-pointer`}>
      <div className={`${compact ? 'text-[11px]' : 'text-[12px]'} font-extrabold`}>{data.patientName || 'Patient'}</div>
      {!compact && <div className="mt-0.5 text-[11px] font-semibold opacity-80">{data.doctorName || 'No doctor'}</div>}
      <div className="mt-1 text-[10px] font-black uppercase opacity-80">{normalizeStatus(data.status)}</div>
    </button>
  );
}

export function AppointmentCalendarPage() {
  const appointments = useModuleRecords('hospital/appointments');
  const [view, setView] = useState('Week');
  const [activeDate, setActiveDate] = useState(() => new Date(todayISO()));
  const [department, setDepartment] = useState('All');
  const [doctor, setDoctor] = useState('All Doctors');
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState('');

  const departments = useMemo(() => ['All', ...new Set(appointments.records.map((record) => record.data?.departmentName).filter(Boolean))], [appointments.records]);
  const doctors = useMemo(() => ['All Doctors', ...new Set(appointments.records.map((record) => record.data?.doctorName).filter(Boolean))], [appointments.records]);

  const filtered = useMemo(() => appointments.records.filter((record) => {
    const data = record.data || {};
    if (department !== 'All' && data.departmentName !== department) return false;
    if (doctor !== 'All Doctors' && data.doctorName !== doctor) return false;
    return true;
  }), [appointments.records, department, doctor]);

  const visibleDays = useMemo(() => {
    if (view === 'Day') return [new Date(activeDate)];
    if (view === 'Month') return monthDays(activeDate);
    const start = startOfWeek(activeDate);
    return Array.from({ length: 5 }, (_, index) => addDays(start, index));
  }, [activeDate, view]);

  function recordsFor(date, time) {
    const day = iso(date);
    return filtered.filter((record) => record.data?.date === day && (!time || record.data?.time === time));
  }

  function move(amount) {
    if (view === 'Month') {
      const next = new Date(activeDate);
      next.setMonth(next.getMonth() + amount);
      setActiveDate(next);
      return;
    }
    setActiveDate(addDays(activeDate, view === 'Week' ? amount * 7 : amount));
  }

  function bookSlot(date, time) {
    window.location.assign(`/hospital/book-appointment?date=${iso(date)}&time=${time || ''}`);
  }

  async function updateStatus(record, status) {
    await appointments.update(record._id, { ...record.data, status: storedStatus(status) });
    setSelected({ ...record, data: { ...record.data, status: storedStatus(status) } });
    setMessage(`${record.data?.patientName || 'Appointment'} marked ${status}.`);
  }

  const selectedData = selected?.data || {};

  return (
    <div className="p-4 md:p-7">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="m-0 text-[22px] font-extrabold text-[#071936]">Appointment Calendar</h1>
          <p className="m-0 mt-1 text-[13px] font-semibold text-[#64748b]">Visual doctor schedule with available and booked slots.</p>
        </div>
        <button type="button" onClick={() => setActiveDate(new Date(todayISO()))} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-4 text-[13px] font-semibold text-[#374151] hover:bg-gray-50 cursor-pointer">
          <CalendarDays size={14} />Today
        </button>
      </div>

      {message && <div className="mb-4 rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-[13px] font-semibold text-blue-700">{message}</div>}

      <section className="rounded-lg border border-[#dfe7f1] bg-white">
        <div className="border-b border-[#edf2f7] p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => move(-1)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#dbe4ef] bg-white text-[#334155] cursor-pointer"><ChevronLeft size={16} /></button>
              <div className="min-w-44 text-center text-[16px] font-extrabold text-[#071936]">{formatMonth(activeDate)}</div>
              <button type="button" onClick={() => move(1)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#dbe4ef] bg-white text-[#334155] cursor-pointer"><ChevronRight size={16} /></button>
            </div>
            <div className="inline-flex overflow-hidden rounded-md border border-[#dbe4ef]">
              {VIEWS.map((item) => (
                <button key={item} type="button" onClick={() => setView(item)} className={`h-9 border-0 border-r border-[#dbe4ef] px-3 text-[13px] font-bold last:border-r-0 cursor-pointer ${view === item ? 'bg-blue-600 text-white' : 'bg-white text-[#334155]'}`}>
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">
              Department
              <select className="mt-1 h-10 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-semibold text-[#111827]" value={department} onChange={(event) => setDepartment(event.target.value)}>
                {departments.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">
              Doctor
              <select className="mt-1 h-10 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-semibold text-[#111827]" value={doctor} onChange={(event) => setDoctor(event.target.value)}>
                {doctors.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
          </div>
        </div>

        {view === 'Month' ? (
          <div className="grid grid-cols-7 border-b border-[#edf2f7] text-[12px]">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <div key={day} className="border-r border-[#edf2f7] bg-[#f8fafc] px-3 py-2 font-extrabold uppercase text-[#536173] last:border-r-0">{day}</div>)}
            {visibleDays.map((day) => {
              const dayRecords = recordsFor(day);
              const inMonth = day.getMonth() === activeDate.getMonth();
              return (
                <button key={iso(day)} type="button" onClick={() => { setActiveDate(day); setView('Day'); }} className={`min-h-28 border-r border-t border-[#edf2f7] bg-white p-2 text-left last:border-r-0 ${inMonth ? '' : 'opacity-40'} cursor-pointer`}>
                  <div className="mb-2 font-extrabold text-[#071936]">{day.getDate()}</div>
                  <div className="grid gap-1">
                    {dayRecords.slice(0, 3).map((record) => <AppointmentCard key={record._id} record={record} compact onClick={(event) => { event.stopPropagation(); setSelected(record); }} />)}
                    {dayRecords.length > 3 && <span className="text-[11px] font-bold text-[#64748b]">+{dayRecords.length - 3} more</span>}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className={`min-w-[760px] grid ${view === 'Day' ? 'grid-cols-[86px_1fr]' : 'grid-cols-[86px_repeat(5,minmax(130px,1fr))]'}`}>
              <div className="border-b border-r border-[#edf2f7] bg-[#f8fafc] px-3 py-3 text-[12px] font-extrabold uppercase text-[#536173]">Time</div>
              {visibleDays.map((day) => (
                <div key={iso(day)} className="border-b border-r border-[#edf2f7] bg-[#f8fafc] px-3 py-3 text-center last:border-r-0">
                  <div className="text-[12px] font-extrabold uppercase text-[#536173]">{day.toLocaleDateString('en-IN', { weekday: 'short' })}</div>
                  <div className="text-[12px] font-bold text-[#071936]">{day.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</div>
                </div>
              ))}
              {TIMES.map((time) => (
                <Fragment key={time}>
                  <div key={`${time}-label`} className="border-b border-r border-[#edf2f7] px-3 py-4 text-[13px] font-extrabold text-[#071936]">{time}</div>
                  {visibleDays.map((day) => {
                    const slotRecords = recordsFor(day, time);
                    return (
                      <div key={`${iso(day)}-${time}`} className="min-h-20 border-b border-r border-[#edf2f7] p-2 last:border-r-0">
                        {slotRecords.length > 0 ? (
                          <div className="grid gap-2">
                            {slotRecords.map((record) => <AppointmentCard key={record._id} record={record} onClick={() => setSelected(record)} />)}
                          </div>
                        ) : (
                          <button type="button" onClick={() => bookSlot(day, time)} className="flex h-full min-h-14 w-full items-center justify-center rounded-md border border-dashed border-[#dbe4ef] bg-[#fbfdff] text-[12px] font-bold text-[#94a3b8] hover:border-blue-300 hover:text-blue-600 cursor-pointer">
                            Available
                          </button>
                        )}
                      </div>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        )}
      </section>

      {selected && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#edf2f7] px-5 py-3">
              <h2 className="m-0 text-[17px] font-extrabold text-[#071936]">{selectedData.patientName || 'Appointment'}</h2>
              <button type="button" onClick={() => setSelected(null)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#dbe4ef] bg-white cursor-pointer"><X size={16} /></button>
            </div>
            <div className="p-5">
              <div className="mb-4 rounded-md border border-[#dbe4ef] bg-[#f8fbff] p-4">
                <div className="mb-3 flex items-center gap-2 text-[13px] font-extrabold text-[#071936]"><Clock3 size={15} />{formatTimeRange(selectedData.time)}</div>
                <div className="grid gap-2 text-[13px] font-semibold text-[#334155]">
                  <div className="flex items-center gap-2"><Stethoscope size={14} />{selectedData.doctorName || '-'}</div>
                  <div>{selectedData.departmentName || '-'}</div>
                  <div className="flex items-center gap-2"><UserRound size={14} />Patient ID: {selectedData.patientId || '-'}</div>
                  <div>Status: <span className={`rounded-full border px-2 py-0.5 text-[11px] font-extrabold ${statusClass(selectedData.status)}`}>{normalizeStatus(selectedData.status)}</span></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setMessage(`${selectedData.appointmentId || 'Appointment'} selected.`)} className="h-10 rounded-md border border-[#dbe4ef] bg-white text-[13px] font-semibold cursor-pointer">View</button>
                <button type="button" onClick={() => updateStatus(selected, 'CHECKED-IN')} className="h-10 rounded-md border border-blue-600 bg-blue-600 text-[13px] font-semibold text-white cursor-pointer">Check-in</button>
                <button type="button" onClick={() => bookSlot(new Date(selectedData.date || todayISO()), selectedData.time)} className="h-10 rounded-md border border-[#dbe4ef] bg-white text-[13px] font-semibold cursor-pointer">Reschedule</button>
                <button type="button" onClick={() => updateStatus(selected, 'CANCELLED')} className="h-10 rounded-md border border-red-100 bg-red-50 text-[13px] font-semibold text-red-700 cursor-pointer">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-5 rounded-lg border border-[#dfe7f1] bg-white p-4">
        <div className="mb-3 text-[12px] font-extrabold uppercase text-[#536173]">Workflow</div>
        <div className="flex flex-wrap items-center gap-2 text-[12px] font-bold text-[#334155]">
          {['Calendar', 'Select Doctor', 'View Schedule', 'Click Available Slot', 'Select Patient', 'Book Appointment'].map((step, index) => (
            <span key={step} className="inline-flex items-center gap-2">
              <span className="rounded-md border border-[#dbe4ef] bg-[#f8fbff] px-2.5 py-1">{step}</span>
              {index < 5 && <span className="text-[#94a3b8]">→</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
