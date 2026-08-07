import { useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Clock3, CreditCard, FileText, MoreVertical, Printer, Search, UserRound, XCircle } from 'lucide-react';

import { useModuleRecords } from '../../../shared/recordUi/useModuleRecords.js';
import { fmtDate, todayISO } from '../../../shared/recordUi/dateUtils.js';

const STATUS_FLOW = ['BOOKED', 'CONFIRMED', 'CHECKED-IN', 'WAITING', 'IN CONSULTATION', 'COMPLETED'];
const OTHER_STATUSES = ['CANCELLED', 'NO-SHOW', 'RESCHEDULED'];
const STATUS_OPTIONS = ['All Status', ...STATUS_FLOW, ...OTHER_STATUSES];
const DATE_OPTIONS = ['Today', 'All Dates'];

function normalizeStatus(status = 'Scheduled') {
  const normalized = String(status || '').trim().toUpperCase().replace(/\s+/g, ' ');
  const map = {
    SCHEDULED: 'BOOKED',
    CHECKEDIN: 'CHECKED-IN',
    'CHECKED IN': 'CHECKED-IN',
    WAITING: 'WAITING',
    'IN CONSULTATION': 'IN CONSULTATION',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
    CANCELED: 'CANCELLED',
    'NO SHOW': 'NO-SHOW',
    'NO-SHOW': 'NO-SHOW',
    RESCHEDULED: 'RESCHEDULED',
    CONFIRMED: 'CONFIRMED',
  };
  return map[normalized] || normalized || 'BOOKED';
}

function storedStatus(status) {
  return status.split(' ').map((part) => part.charAt(0) + part.slice(1).toLowerCase()).join(' ');
}

function phoneOf(data = {}) {
  return data.patientPhone || data.phone || data.mobile || '';
}

function nextToken(records, doctorName) {
  const prefix = String(doctorName || 'A').replace(/^Dr\.?\s*/i, '').trim().charAt(0).toUpperCase() || 'A';
  const max = records.reduce((highest, record) => {
    const token = String(record.data?.tokenNo || '');
    if (!token.startsWith(prefix)) return highest;
    const n = Number(token.slice(1));
    return Number.isFinite(n) ? Math.max(highest, n) : highest;
  }, 0);
  return `${prefix}${String(max + 1).padStart(2, '0')}`;
}

function nextReceiptNo(records) {
  const max = records.reduce((highest, record) => {
    const n = Number(String(record.data?.receiptNo || '').replace(/\D/g, ''));
    return Number.isFinite(n) ? Math.max(highest, n) : highest;
  }, 200);
  return `REC-${String(max + 1).padStart(3, '0')}`;
}

function statusClass(status) {
  const normalized = normalizeStatus(status);
  if (normalized === 'COMPLETED') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  if (normalized === 'WAITING' || normalized === 'CHECKED-IN') return 'bg-amber-50 text-amber-700 border-amber-100';
  if (normalized === 'CANCELLED' || normalized === 'NO-SHOW') return 'bg-red-50 text-red-700 border-red-100';
  if (normalized === 'IN CONSULTATION') return 'bg-purple-50 text-purple-700 border-purple-100';
  return 'bg-blue-50 text-blue-700 border-blue-100';
}

function Stat({ label, value, icon: Icon, tone = 'blue' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
  };
  return (
    <div className="rounded-lg border border-[#dfe7f1] bg-white p-4">
      <div className={`mb-3 inline-flex h-8 w-8 items-center justify-center rounded-md ${tones[tone]}`}><Icon size={16} /></div>
      <div className="text-[24px] font-extrabold text-[#071936]">{value}</div>
      <div className="text-[12px] font-bold uppercase text-[#64748b]">{label}</div>
    </div>
  );
}

export function AppointmentsPage() {
  const appointments = useModuleRecords('hospital/appointments');
  const payments = useModuleRecords('hospital/payments');
  const [search, setSearch] = useState('');
  const [dateMode, setDateMode] = useState('Today');
  const [department, setDepartment] = useState('Department');
  const [doctor, setDoctor] = useState('Doctor');
  const [status, setStatus] = useState('All Status');
  const [openMenuId, setOpenMenuId] = useState('');
  const [message, setMessage] = useState('');

  const today = todayISO();
  const todayRows = useMemo(() => appointments.records.filter((record) => record.data?.date === today), [appointments.records, today]);
  const departments = useMemo(() => ['Department', ...new Set(appointments.records.map((record) => record.data?.departmentName).filter(Boolean))], [appointments.records]);
  const doctors = useMemo(() => ['Doctor', ...new Set(appointments.records.map((record) => record.data?.doctorName).filter(Boolean))], [appointments.records]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return appointments.records
      .filter((record) => {
        const data = record.data || {};
        if (dateMode === 'Today' && data.date !== today) return false;
        if (department !== 'Department' && data.departmentName !== department) return false;
        if (doctor !== 'Doctor' && data.doctorName !== doctor) return false;
        if (status !== 'All Status' && normalizeStatus(data.status) !== status) return false;
        if (!q) return true;
        return [data.appointmentId, data.patientName, data.patientId, phoneOf(data)].filter(Boolean).join(' ').toLowerCase().includes(q);
      })
      .sort((a, b) => (a.data?.time || '').localeCompare(b.data?.time || ''));
  }, [appointments.records, dateMode, department, doctor, search, status, today]);

  const stats = useMemo(() => ({
    total: todayRows.length,
    completed: todayRows.filter((record) => normalizeStatus(record.data?.status) === 'COMPLETED').length,
    waiting: todayRows.filter((record) => ['WAITING', 'CHECKED-IN'].includes(normalizeStatus(record.data?.status))).length,
    cancelled: todayRows.filter((record) => normalizeStatus(record.data?.status) === 'CANCELLED').length,
  }), [todayRows]);

  async function updateStatus(record, nextStatus) {
    await appointments.update(record._id, { ...record.data, status: storedStatus(nextStatus) });
    setOpenMenuId('');
    setMessage(`${record.data?.patientName || 'Appointment'} marked ${nextStatus}.`);
  }

  async function generateToken(record) {
    const tokenNo = record.data?.tokenNo || nextToken(todayRows, record.data?.doctorName);
    await appointments.update(record._id, { ...record.data, tokenNo, status: 'Waiting' });
    setOpenMenuId('');
    setMessage(`Token ${tokenNo} generated.`);
  }

  async function collectFee(record) {
    const amount = Number(record.data?.consultationFee || 0);
    await payments.create({
      receiptNo: nextReceiptNo(payments.records),
      invoiceNo: record.data?.appointmentId || record._id,
      patientName: record.data?.patientName || '',
      patientId: record.data?.patientId || '',
      mobile: phoneOf(record.data),
      method: 'Cash',
      amount,
      status: 'Success',
      date: today,
      source: 'Appointment',
      notes: `Consultation fee for ${record.data?.appointmentId || 'appointment'}`,
    });
    await appointments.update(record._id, { ...record.data, paymentStatus: 'Paid' });
    setOpenMenuId('');
    setMessage(`Fee collected for ${record.data?.patientName || 'appointment'}.`);
  }

  function MenuAction({ children, onClick }) {
    return <button type="button" onClick={onClick} className="block w-full border-0 bg-white px-3 py-2 text-left text-[13px] font-semibold text-[#334155] hover:bg-blue-50 cursor-pointer">{children}</button>;
  }

  return (
    <div className="p-4 md:p-7">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="m-0 text-[22px] font-extrabold text-[#071936]">Appointments</h1>
          <p className="m-0 mt-1 text-[13px] font-semibold text-[#64748b]">Today: {fmtDate(today)}</p>
        </div>
        <button type="button" onClick={() => window.location.assign('/hospital/book-appointment')} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-blue-600 bg-blue-600 px-4 text-[13px] font-semibold text-white hover:bg-blue-700 cursor-pointer">
          + Book Appointment
        </button>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Today's" value={stats.total} icon={CalendarDays} />
        <Stat label="Completed" value={stats.completed} icon={CheckCircle2} tone="green" />
        <Stat label="Waiting" value={stats.waiting} icon={Clock3} tone="amber" />
        <Stat label="Cancelled" value={stats.cancelled} icon={XCircle} tone="red" />
      </div>

      {message && <div className="mb-4 rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-[13px] font-semibold text-blue-700">{message}</div>}

      <section className="rounded-lg border border-[#dfe7f1] bg-white">
        <div className="border-b border-[#edf2f7] p-4">
          <div className="mb-3 flex items-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-3">
            <Search size={15} className="text-[#64748b]" />
            <input className="h-10 min-w-0 flex-1 border-0 bg-transparent text-[13px] font-[inherit] outline-none" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Patient / Mobile / Appointment ID" />
          </div>
          <div className="grid gap-2 md:grid-cols-4">
            <select className="h-10 rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-semibold text-[#111827]" value={dateMode} onChange={(event) => setDateMode(event.target.value)}>
              {DATE_OPTIONS.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select className="h-10 rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-semibold text-[#111827]" value={department} onChange={(event) => setDepartment(event.target.value)}>
              {departments.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select className="h-10 rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-semibold text-[#111827]" value={doctor} onChange={(event) => setDoctor(event.target.value)}>
              {doctors.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select className="h-10 rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-semibold text-[#111827]" value={status} onChange={(event) => setStatus(event.target.value)}>
              {STATUS_OPTIONS.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#f8fafc] text-left text-[12px] uppercase text-[#536173]">
                <th className="border-b border-[#edf2f7] px-4 py-3">Time</th>
                <th className="border-b border-[#edf2f7] px-4 py-3">Token</th>
                <th className="border-b border-[#edf2f7] px-4 py-3">Patient</th>
                <th className="border-b border-[#edf2f7] px-4 py-3">Doctor</th>
                <th className="border-b border-[#edf2f7] px-4 py-3">Type</th>
                <th className="border-b border-[#edf2f7] px-4 py-3">Status</th>
                <th className="border-b border-[#edf2f7] px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {appointments.loading ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-[#64748b]">Loading appointments...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-[#64748b]">No appointments found.</td></tr>
              ) : rows.map((record) => {
                const data = record.data || {};
                const normalized = normalizeStatus(data.status);
                return (
                  <tr key={record._id} className="hover:bg-[#fbfdff]">
                    <td className="border-b border-[#f1f5f9] px-4 py-3 font-extrabold text-[#071936]">{data.time || '-'}</td>
                    <td className="border-b border-[#f1f5f9] px-4 py-3 font-bold text-[#334155]">{data.tokenNo || '-'}</td>
                    <td className="border-b border-[#f1f5f9] px-4 py-3">
                      <div className="font-extrabold text-[#111827]">{data.patientName || 'Unnamed patient'}</div>
                      <div className="text-[12px] font-semibold text-[#64748b]">{data.appointmentId || data.patientId || '-'} {phoneOf(data) ? `- ${phoneOf(data)}` : ''}</div>
                    </td>
                    <td className="border-b border-[#f1f5f9] px-4 py-3 font-semibold text-[#334155]">{data.doctorName || '-'}</td>
                    <td className="border-b border-[#f1f5f9] px-4 py-3">{data.visitType === 'Consultation' ? 'New' : data.visitType || '-'}</td>
                    <td className="border-b border-[#f1f5f9] px-4 py-3">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${statusClass(normalized)}`}>{normalized}</span>
                    </td>
                    <td className="relative border-b border-[#f1f5f9] px-4 py-3 text-right">
                      <button type="button" onClick={() => setOpenMenuId(openMenuId === record._id ? '' : record._id)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#dbe4ef] bg-white text-[#334155] hover:bg-gray-50 cursor-pointer"><MoreVertical size={16} /></button>
                      {openMenuId === record._id && (
                        <div className="absolute right-4 top-12 z-30 w-52 rounded-md border border-[#dbe4ef] bg-white py-1 text-left shadow-xl">
                          <MenuAction onClick={() => setMessage(`${data.appointmentId || 'Appointment'}: ${data.patientName || '-'} with ${data.doctorName || '-'}`)}>View Appointment</MenuAction>
                          <MenuAction onClick={() => updateStatus(record, 'CHECKED-IN')}>Check-in</MenuAction>
                          <MenuAction onClick={() => generateToken(record)}>Generate Token</MenuAction>
                          <MenuAction onClick={() => updateStatus(record, 'IN CONSULTATION')}>Start Consultation</MenuAction>
                          <MenuAction onClick={() => updateStatus(record, 'RESCHEDULED')}>Reschedule</MenuAction>
                          <MenuAction onClick={() => updateStatus(record, 'CANCELLED')}>Cancel</MenuAction>
                          <MenuAction onClick={() => collectFee(record)}>Collect Fee</MenuAction>
                          <MenuAction onClick={() => window.location.assign('/hospital/patients')}>View Patient</MenuAction>
                          <MenuAction onClick={() => window.print()}><span className="inline-flex items-center gap-2"><Printer size={13} />Print Appointment Slip</span></MenuAction>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-5 rounded-lg border border-[#dfe7f1] bg-white p-4">
        <div className="mb-3 text-[12px] font-extrabold uppercase text-[#536173]">Workflow</div>
        <div className="flex flex-wrap items-center gap-2 text-[12px] font-bold text-[#334155]">
          {['Appointment Booked', 'Patient Arrives', 'Check-in', 'Token Generated', 'Waiting', 'Doctor Consultation', 'Completed', 'OPD Record'].map((step, index) => (
            <span key={step} className="inline-flex items-center gap-2">
              <span className="rounded-md border border-[#dbe4ef] bg-[#f8fbff] px-2.5 py-1">{step}</span>
              {index < 7 && <span className="text-[#94a3b8]">→</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
