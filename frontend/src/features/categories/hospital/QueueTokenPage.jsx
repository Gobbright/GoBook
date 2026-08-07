import { useMemo, useState } from 'react';
import { ArrowRightLeft, BellRing, CheckCircle2, Clock3, FileText, Printer, RotateCcw, Search, ShieldAlert, UserCheck, XCircle } from 'lucide-react';

import { useModuleRecords } from '../shared/recordUi/useModuleRecords.js';
import { fmtDate, todayISO } from '../shared/recordUi/dateUtils.js';

const INPUT = 'h-10 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-[inherit] text-[#111827] outline-none focus:border-blue-500';
const QUEUE_STATUSES = ['WAITING', 'CALLED', 'IN CONSULTATION', 'COMPLETED', 'SKIPPED', 'CANCELLED', 'NO-SHOW'];
const PRIORITIES = ['NORMAL', 'PRIORITY', 'EMERGENCY'];
const PRIORITY_WEIGHT = { EMERGENCY: 0, PRIORITY: 1, NORMAL: 2 };

function normalizeStatus(status = 'Booked') {
  const normalized = String(status || '').trim().toUpperCase().replace(/\s+/g, ' ');
  const map = {
    SCHEDULED: 'BOOKED',
    BOOKED: 'BOOKED',
    CONFIRMED: 'CONFIRMED',
    CHECKEDIN: 'CHECKED-IN',
    'CHECKED IN': 'CHECKED-IN',
    'CHECKED-IN': 'CHECKED-IN',
    WAITING: 'WAITING',
    CALLED: 'CALLED',
    'IN CONSULTATION': 'IN CONSULTATION',
    COMPLETED: 'COMPLETED',
    SKIPPED: 'SKIPPED',
    CANCELLED: 'CANCELLED',
    CANCELED: 'CANCELLED',
    'NO SHOW': 'NO-SHOW',
    'NO-SHOW': 'NO-SHOW',
  };
  return map[normalized] || normalized || 'BOOKED';
}

function storedStatus(status) {
  if (status === 'CHECKED-IN') return 'Checked-in';
  if (status === 'NO-SHOW') return 'No-show';
  return status.split(' ').map((part) => part.charAt(0) + part.slice(1).toLowerCase()).join(' ');
}

function phoneOf(data = {}) {
  return data.patientPhone || data.phone || data.mobile || '';
}

function tokenPrefix(doctorName = '') {
  return String(doctorName || 'A').replace(/^Dr\.?\s*/i, '').trim().charAt(0).toUpperCase() || 'A';
}

function tokenNumber(token = '', prefix = '') {
  const raw = String(token || '').toUpperCase().replace(`${prefix}-`, prefix);
  if (!raw.startsWith(prefix)) return 0;
  const value = Number(raw.slice(prefix.length).replace(/\D/g, ''));
  return Number.isFinite(value) ? value : 0;
}

function nextToken(records, doctorName) {
  const prefix = tokenPrefix(doctorName);
  const max = records.reduce((highest, record) => Math.max(highest, tokenNumber(record.data?.tokenNo, prefix)), 0);
  return `${prefix}-${String(max + 1).padStart(2, '0')}`;
}

function waitLabel(record) {
  const data = record.data || {};
  const from = data.checkInAt || data.calledAt || (data.date && data.time ? `${data.date}T${data.time}` : '');
  if (!from) return 'Just In';
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(from).getTime()) / 60000));
  if (!Number.isFinite(minutes) || minutes <= 0) return 'Just In';
  return `${minutes} min`;
}

function statusClass(status) {
  if (status === 'COMPLETED') return 'border-emerald-100 bg-emerald-50 text-emerald-700';
  if (status === 'IN CONSULTATION') return 'border-purple-100 bg-purple-50 text-purple-700';
  if (status === 'CALLED') return 'border-blue-100 bg-blue-50 text-blue-700';
  if (status === 'SKIPPED') return 'border-amber-100 bg-amber-50 text-amber-700';
  if (status === 'CANCELLED' || status === 'NO-SHOW') return 'border-red-100 bg-red-50 text-red-700';
  return 'border-[#dbe4ef] bg-[#f8fbff] text-[#334155]';
}

function priorityClass(priority) {
  if (priority === 'EMERGENCY') return 'border-red-100 bg-red-50 text-red-700';
  if (priority === 'PRIORITY') return 'border-amber-100 bg-amber-50 text-amber-700';
  return 'border-[#dbe4ef] bg-white text-[#64748b]';
}

function Button({ children, onClick, tone = 'white', disabled = false }) {
  const tones = {
    blue: 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700',
    green: 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700',
    red: 'border-red-100 bg-red-50 text-red-700 hover:bg-red-100',
    amber: 'border-amber-100 bg-amber-50 text-amber-700 hover:bg-amber-100',
    white: 'border-[#dbe4ef] bg-white text-[#374151] hover:bg-gray-50',
  };
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-[13px] font-semibold ${tones[tone]} cursor-pointer disabled:cursor-not-allowed disabled:opacity-60`}>
      {children}
    </button>
  );
}

function Stat({ label, value, tone = 'blue' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
  };
  return (
    <div className="rounded-lg border border-[#dfe7f1] bg-white p-4">
      <div className={`mb-2 h-1.5 w-10 rounded-full ${tones[tone]}`} />
      <div className="text-[24px] font-extrabold text-[#071936]">{value}</div>
      <div className="text-[12px] font-bold uppercase text-[#64748b]">{label}</div>
    </div>
  );
}

export function QueueTokenPage() {
  const appointments = useModuleRecords('hospital/appointments');
  const [department, setDepartment] = useState('General Medicine');
  const [doctor, setDoctor] = useState('Dr. Arun Kumar');
  const [search, setSearch] = useState('');
  const [selectedCheckInId, setSelectedCheckInId] = useState('');
  const [message, setMessage] = useState('');
  const today = todayISO();

  const todayRows = useMemo(() => appointments.records.filter((record) => record.data?.date === today), [appointments.records, today]);
  const departments = useMemo(() => {
    const values = [...new Set(appointments.records.map((record) => record.data?.departmentName).filter(Boolean))];
    return values.includes(department) ? values : [department, ...values];
  }, [appointments.records, department]);
  const doctors = useMemo(() => {
    const values = [...new Set(appointments.records
      .filter((record) => !department || record.data?.departmentName === department)
      .map((record) => record.data?.doctorName)
      .filter(Boolean))];
    return values.includes(doctor) ? values : [doctor, ...values];
  }, [appointments.records, department, doctor]);

  const doctorRows = useMemo(() => todayRows
    .filter((record) => {
      const data = record.data || {};
      return data.departmentName === department && data.doctorName === doctor;
    })
    .sort((a, b) => {
      const priority = (PRIORITY_WEIGHT[a.data?.queuePriority || 'NORMAL'] ?? 2) - (PRIORITY_WEIGHT[b.data?.queuePriority || 'NORMAL'] ?? 2);
      if (priority !== 0) return priority;
      const token = tokenNumber(a.data?.tokenNo, tokenPrefix(doctor)) - tokenNumber(b.data?.tokenNo, tokenPrefix(doctor));
      if (token !== 0) return token;
      return (a.data?.time || '').localeCompare(b.data?.time || '');
    }), [department, doctor, todayRows]);

  const current = doctorRows.find((record) => normalizeStatus(record.data?.status) === 'IN CONSULTATION')
    || doctorRows.find((record) => normalizeStatus(record.data?.status) === 'CALLED')
    || null;
  const waitingQueue = doctorRows.filter((record) => ['WAITING', 'CALLED'].includes(normalizeStatus(record.data?.status)) && record._id !== current?._id);
  const checkInRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return todayRows
      .filter((record) => ['BOOKED', 'CONFIRMED', 'CHECKED-IN'].includes(normalizeStatus(record.data?.status)))
      .filter((record) => {
        const data = record.data || {};
        if (!q) return true;
        return [data.appointmentId, data.patientName, data.patientId, phoneOf(data)].filter(Boolean).join(' ').toLowerCase().includes(q);
      })
      .sort((a, b) => (a.data?.time || '').localeCompare(b.data?.time || ''));
  }, [search, todayRows]);
  const selectedCheckIn = checkInRows.find((record) => record._id === selectedCheckInId) || checkInRows[0] || null;

  const stats = useMemo(() => ({
    waiting: doctorRows.filter((record) => normalizeStatus(record.data?.status) === 'WAITING').length,
    called: doctorRows.filter((record) => normalizeStatus(record.data?.status) === 'CALLED').length,
    current: current ? 1 : 0,
    done: doctorRows.filter((record) => normalizeStatus(record.data?.status) === 'COMPLETED').length,
  }), [current, doctorRows]);

  async function updateQueue(record, patch, note) {
    await appointments.update(record._id, { ...record.data, ...patch });
    if (note) setMessage(note);
  }

  async function checkIn(record) {
    const tokenNo = record.data?.tokenNo || nextToken(todayRows, record.data?.doctorName);
    await updateQueue(record, {
      tokenNo,
      status: 'Waiting',
      queuePriority: record.data?.queuePriority || 'NORMAL',
      checkInAt: record.data?.checkInAt || new Date().toISOString(),
    }, `Token ${tokenNo} generated for ${record.data?.patientName || 'patient'}.`);
  }

  async function callNext() {
    const next = waitingQueue.find((record) => normalizeStatus(record.data?.status) === 'WAITING') || waitingQueue[0];
    if (!next) {
      setMessage('No waiting patients for this doctor.');
      return;
    }
    await updateQueue(next, { status: 'Called', calledAt: new Date().toISOString() }, `Token ${next.data?.tokenNo || '-'} called.`);
  }

  async function startConsultation(record) {
    await updateQueue(record, { status: 'In Consultation', consultationStartedAt: new Date().toISOString() }, `${record.data?.patientName || 'Patient'} is now in consultation.`);
  }

  async function completeConsultation(record) {
    await updateQueue(record, { status: 'Completed', completedAt: new Date().toISOString() }, `${record.data?.patientName || 'Patient'} consultation completed.`);
  }

  const selectedData = selectedCheckIn?.data || {};

  return (
    <div className="p-4 md:p-7">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="m-0 text-[22px] font-extrabold text-[#071936]">Queue & Token</h1>
          <p className="m-0 mt-1 text-[13px] font-semibold text-[#64748b]">{fmtDate(today)}</p>
        </div>
        <Button tone="blue" onClick={callNext}><BellRing size={14} />Call Next Patient</Button>
      </div>

      {message && <div className="mb-4 rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-[13px] font-semibold text-blue-700">{message}</div>}

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Waiting" value={stats.waiting} tone="amber" />
        <Stat label="Called" value={stats.called} />
        <Stat label="In Consultation" value={stats.current} />
        <Stat label="Completed" value={stats.done} tone="green" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="rounded-lg border border-[#dfe7f1] bg-white">
          <div className="border-b border-[#edf2f7] p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-[12px] font-extrabold uppercase text-[#536173]">Department<select className={`${INPUT} mt-1`} value={department} onChange={(event) => setDepartment(event.target.value)}>{departments.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="text-[12px] font-extrabold uppercase text-[#536173]">Doctor<select className={`${INPUT} mt-1`} value={doctor} onChange={(event) => setDoctor(event.target.value)}>{doctors.map((item) => <option key={item}>{item}</option>)}</select></label>
            </div>
          </div>

          <div className="grid gap-4 p-4 lg:grid-cols-[260px_minmax(0,1fr)]">
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-5 text-center">
              <div className="text-[12px] font-extrabold uppercase text-blue-700">Current Token</div>
              <div className="mt-5 text-[46px] font-black leading-none text-[#071936]">{current?.data?.tokenNo || '-'}</div>
              <div className="mt-4 text-[18px] font-extrabold text-[#071936]">{current?.data?.patientName || 'No active patient'}</div>
              <div className="mt-1 text-[12px] font-black uppercase text-blue-700">{current ? normalizeStatus(current.data?.status) : 'Ready'}</div>
              {current && (
                <div className="mt-5 grid gap-2">
                  {normalizeStatus(current.data?.status) === 'CALLED' && <Button tone="blue" onClick={() => startConsultation(current)}><UserCheck size={14} />Start Consultation</Button>}
                  <Button tone="green" onClick={() => completeConsultation(current)}><CheckCircle2 size={14} />Complete Consultation</Button>
                </div>
              )}
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="m-0 text-[16px] font-extrabold text-[#071936]">Waiting Queue</h2>
                <Button tone="blue" onClick={callNext}><BellRing size={14} />Call Next</Button>
              </div>
              <div className="overflow-x-auto rounded-lg border border-[#dfe7f1]">
                <table className="w-full min-w-[760px] border-collapse text-[13px]">
                  <thead>
                    <tr className="bg-[#f8fafc] text-left text-[12px] uppercase text-[#536173]">
                      <th className="border-b border-[#edf2f7] px-3 py-3">Token</th>
                      <th className="border-b border-[#edf2f7] px-3 py-3">Patient</th>
                      <th className="border-b border-[#edf2f7] px-3 py-3">Time</th>
                      <th className="border-b border-[#edf2f7] px-3 py-3">Wait</th>
                      <th className="border-b border-[#edf2f7] px-3 py-3">Priority</th>
                      <th className="border-b border-[#edf2f7] px-3 py-3">Status</th>
                      <th className="border-b border-[#edf2f7] px-3 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.loading ? (
                      <tr><td colSpan={7} className="px-3 py-10 text-center text-[#64748b]">Loading queue...</td></tr>
                    ) : waitingQueue.length === 0 ? (
                      <tr><td colSpan={7} className="px-3 py-10 text-center text-[#64748b]">No waiting patients.</td></tr>
                    ) : waitingQueue.map((record) => {
                      const data = record.data || {};
                      const normalized = normalizeStatus(data.status);
                      return (
                        <tr key={record._id} className="hover:bg-[#fbfdff]">
                          <td className="border-b border-[#f1f5f9] px-3 py-3 text-[16px] font-black text-[#071936]">{data.tokenNo || '-'}</td>
                          <td className="border-b border-[#f1f5f9] px-3 py-3">
                            <div className="font-extrabold text-[#111827]">{data.patientName || 'Patient'}</div>
                            <div className="text-[12px] font-semibold text-[#64748b]">{data.appointmentId || data.patientId || '-'}</div>
                          </td>
                          <td className="border-b border-[#f1f5f9] px-3 py-3 font-semibold">{data.time || '-'}</td>
                          <td className="border-b border-[#f1f5f9] px-3 py-3 font-semibold">{waitLabel(record)}</td>
                          <td className="border-b border-[#f1f5f9] px-3 py-3">
                            <select className="h-8 rounded-md border border-[#dbe4ef] bg-white px-2 text-[12px] font-bold" value={data.queuePriority || 'NORMAL'} onChange={(event) => updateQueue(record, { queuePriority: event.target.value }, `Priority updated for ${data.tokenNo || data.patientName}.`)}>
                              {PRIORITIES.map((item) => <option key={item}>{item}</option>)}
                            </select>
                          </td>
                          <td className="border-b border-[#f1f5f9] px-3 py-3"><span className={`rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${statusClass(normalized)}`}>{normalized}</span></td>
                          <td className="border-b border-[#f1f5f9] px-3 py-3">
                            <div className="flex justify-end gap-1">
                              {normalized === 'WAITING' && <button type="button" title="Call patient" onClick={() => updateQueue(record, { status: 'Called', calledAt: new Date().toISOString() }, `Token ${data.tokenNo || '-'} called.`)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-blue-100 bg-blue-50 text-blue-700 cursor-pointer"><BellRing size={14} /></button>}
                              <button type="button" title="Skip token" onClick={() => updateQueue(record, { status: 'Skipped' }, `Token ${data.tokenNo || '-'} skipped.`)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-amber-100 bg-amber-50 text-amber-700 cursor-pointer"><RotateCcw size={14} /></button>
                              <button type="button" title="Transfer queue" onClick={() => updateQueue(record, { departmentName: 'General Medicine', doctorName: 'Dr. Arun Kumar' }, `Token ${data.tokenNo || '-'} transferred.`)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#dbe4ef] bg-white text-[#334155] cursor-pointer"><ArrowRightLeft size={14} /></button>
                              <button type="button" title="Cancel token" onClick={() => updateQueue(record, { status: 'Cancelled' }, `Token ${data.tokenNo || '-'} cancelled.`)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-100 bg-red-50 text-red-700 cursor-pointer"><XCircle size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <aside className="grid gap-5">
          <section className="rounded-lg border border-[#dfe7f1] bg-white p-4">
            <div className="mb-3 text-[13px] font-black uppercase text-[#071936]">{doctor.replace(/^Dr\.?\s*/i, 'Dr. ')} - {department}</div>
            <div className="rounded-md border border-[#dbe4ef] bg-[#f8fbff] p-4">
              <div className="text-[12px] font-extrabold uppercase text-[#64748b]">Current</div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <strong className="text-[22px] text-[#071936]">{current?.data?.tokenNo || '-'}</strong>
                <span className="font-extrabold text-[#071936]">{current?.data?.patientName || 'No active patient'}</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={() => window.location.assign('/hospital/patients')} disabled={!current}><FileText size={14} />Open Patient</Button>
                <Button tone="green" onClick={() => current && completeConsultation(current)} disabled={!current}><CheckCircle2 size={14} />Complete</Button>
              </div>
            </div>
            <div className="mt-4">
              <div className="mb-2 text-[12px] font-extrabold uppercase text-[#64748b]">Next</div>
              <div className="grid gap-2">
                {waitingQueue.slice(0, 4).map((record) => (
                  <div key={record._id} className="flex items-center justify-between rounded-md border border-[#edf2f7] px-3 py-2 text-[13px] font-bold">
                    <span>{record.data?.tokenNo || '-'}</span>
                    <span>{record.data?.patientName || 'Patient'}</span>
                  </div>
                ))}
                {waitingQueue.length === 0 && <div className="rounded-md border border-dashed border-[#dbe4ef] px-3 py-4 text-center text-[13px] font-semibold text-[#94a3b8]">Queue clear</div>}
              </div>
              <Button tone="blue" onClick={callNext}><BellRing size={14} />Call Next</Button>
            </div>
          </section>

          <section className="rounded-lg border border-[#dfe7f1] bg-white p-4">
            <div className="mb-3 flex items-center gap-2 text-[16px] font-extrabold text-[#071936]"><UserCheck size={18} className="text-blue-600" />Check-in</div>
            <div className="mb-3 flex items-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-3">
              <Search size={15} className="text-[#64748b]" />
              <input className="h-10 min-w-0 flex-1 border-0 bg-transparent text-[13px] font-[inherit] outline-none" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Appointment / Patient / Mobile" />
            </div>
            <select className={INPUT} value={selectedCheckIn?._id || ''} onChange={(event) => setSelectedCheckInId(event.target.value)}>
              {checkInRows.map((record) => <option key={record._id} value={record._id}>{record.data?.patientName || 'Patient'} - {record.data?.appointmentId || record.data?.time || '-'}</option>)}
            </select>
            <div className="mt-4 rounded-md border border-[#dbe4ef] bg-[#f8fbff] p-4">
              <div className="text-[16px] font-extrabold text-[#071936]">{selectedData.patientName || 'Select appointment'}</div>
              <div className="mt-1 text-[12px] font-semibold text-[#64748b]">{selectedData.appointmentId || '-'} | {selectedData.time || '-'} | {selectedData.doctorName || '-'}</div>
              <div className="mt-4 text-center">
                <div className="text-[12px] font-extrabold uppercase text-[#64748b]">Token</div>
                <div className="mt-2 text-[38px] font-black text-[#071936]">{selectedData.tokenNo || (selectedCheckIn ? nextToken(todayRows, selectedData.doctorName) : '-')}</div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[12px] font-semibold text-[#334155]">
                <div>Patients Ahead: <strong>{waitingQueue.length}</strong></div>
                <div>Estimated Wait: <strong>{waitingQueue.length ? `~${waitingQueue.length * 5} mins` : 'Just In'}</strong></div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button tone="blue" onClick={() => selectedCheckIn && checkIn(selectedCheckIn)} disabled={!selectedCheckIn}><UserCheck size={14} />Generate Token</Button>
                <Button onClick={() => window.print()} disabled={!selectedCheckIn}><Printer size={14} />Print Token</Button>
              </div>
            </div>
          </section>
        </aside>
      </div>

      <div className="mt-5 rounded-lg border border-[#dfe7f1] bg-white p-4">
        <div className="mb-3 flex items-center gap-2 text-[12px] font-extrabold uppercase text-[#536173]"><ShieldAlert size={14} />Queue Statuses</div>
        <div className="flex flex-wrap gap-2">
          {QUEUE_STATUSES.map((item) => <span key={item} className={`rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${statusClass(item)}`}>{item}</span>)}
          {PRIORITIES.map((item) => <span key={item} className={`rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${priorityClass(item)}`}>{item}</span>)}
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-[#dfe7f1] bg-white p-4">
        <div className="mb-3 text-[12px] font-extrabold uppercase text-[#536173]">Workflow</div>
        <div className="flex flex-wrap items-center gap-2 text-[12px] font-bold text-[#334155]">
          {['Patients', 'Book Appointment', 'Doctor Schedule', 'Available Slots', 'Appointment List', 'Check-in', 'Queue & Token', 'Doctor Calls', 'OPD', 'Billing'].map((step, index, arr) => (
            <span key={step} className="inline-flex items-center gap-2">
              <span className="rounded-md border border-[#dbe4ef] bg-[#f8fbff] px-2.5 py-1">{step}</span>
              {index < arr.length - 1 && <span className="text-[#94a3b8]">-&gt;</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
