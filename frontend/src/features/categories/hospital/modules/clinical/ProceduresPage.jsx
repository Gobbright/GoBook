import { useMemo, useState } from 'react';
import { CheckCircle2, Clock3, Plus, Stethoscope } from 'lucide-react';

import { useModuleRecords } from '../../../shared/recordUi/useModuleRecords.js';
import { todayISO } from '../../../shared/recordUi/dateUtils.js';

const INPUT = 'h-10 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-[inherit] text-[#111827] outline-none focus:border-blue-500';
const TEXTAREA = 'min-h-20 w-full rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-[13px] font-[inherit] text-[#111827] outline-none focus:border-blue-500';
const PROCEDURE_MASTER = [
  { name: 'Injection', charge: 150 },
  { name: 'Wound Dressing', charge: 350 },
  { name: 'Nebulization', charge: 300 },
  { name: 'Suturing', charge: 800 },
  { name: 'ECG', charge: 500 },
  { name: 'Wound Cleaning', charge: 250 },
  { name: 'IV Administration', charge: 450 },
  { name: 'Minor Procedure', charge: 1000 },
];
const STAFF = ['Nurse Priya', 'Nurse Anu', 'Nurse Kavitha', 'Duty Staff'];
const STATUSES = ['Ordered', 'In Progress', 'Completed', 'Cancelled'];

function normalizeStatus(status = '') {
  return String(status || '-').trim().toUpperCase().replace(/\s+/g, ' ');
}

function money(value) {
  return `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;
}

function nextOpdNo(records) {
  const year = new Date().getFullYear();
  const prefix = `OPD-${year}-`;
  const max = records.reduce((highest, record) => {
    const raw = record.data?.opdNo || record.data?.visitNo || '-';
    if (!String(raw).startsWith(prefix)) return highest;
    const n = Number(String(raw).slice(prefix.length));
    return Number.isFinite(n) ? Math.max(highest, n) : highest;
  }, 451);
  return `${prefix}${String(max + 1).padStart(5, '0')}`;
}

function Button({ children, onClick, tone = 'white', disabled = false }) {
  const tones = {
    blue: 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700',
    green: 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700',
    white: 'border-[#dbe4ef] bg-white text-[#374151] hover:bg-gray-50',
  };
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-[13px] font-semibold ${tones[tone]} cursor-pointer disabled:cursor-not-allowed disabled:opacity-60`}>
      {children}
    </button>
  );
}

function statusClass(status) {
  const normalized = normalizeStatus(status);
  if (normalized === 'COMPLETED') return 'border-emerald-100 bg-emerald-50 text-emerald-700';
  if (normalized === 'IN PROGRESS') return 'border-blue-100 bg-blue-50 text-blue-700';
  if (normalized === 'CANCELLED') return 'border-red-100 bg-red-50 text-red-700';
  return 'border-amber-100 bg-amber-50 text-amber-700';
}

export function ProceduresPage() {
  const query = useMemo(() => new URLSearchParams(window.location.search), []);
  const patients = useModuleRecords('hospital/patients');
  const appointments = useModuleRecords('hospital/appointments');
  const opd = useModuleRecords('hospital/opd-visits');
  const procedures = useModuleRecords('hospital/procedures');
  const [form, setForm] = useState({ procedure: 'Wound Dressing', assignedTo: 'Nurse Priya', date: todayISO(), time: '12:30', charge: 350, instructions: '' });
  const [message, setMessage] = useState('');

  const activeVisit = useMemo(() => {
    const requestedOpd = query.get('opdNo');
    const requestedPatient = query.get('patientName');
    return opd.records.find((record) => requestedOpd && [record.data?.opdNo, record.data?.visitNo].includes(requestedOpd))
      || opd.records.find((record) => requestedPatient && record.data?.patientName === requestedPatient)
      || opd.records.find((record) => ['PRESCRIBED', 'DIAGNOSED', 'IN CONSULTATION'].includes(normalizeStatus(record.data?.status)))
      || opd.records[0]
      || null;
  }, [opd.records, query]);

  const activeAppointment = useMemo(() => {
    const requestedPatient = query.get('patientName');
    return appointments.records.find((record) => activeVisit?.data?.appointmentId && record.data?.appointmentId === activeVisit.data.appointmentId)
      || appointments.records.find((record) => requestedPatient && record.data?.patientName === requestedPatient)
      || null;
  }, [activeVisit, appointments.records, query]);

  const patient = useMemo(() => {
    const visitData = activeVisit?.data || {};
    const appointmentData = activeAppointment?.data || {};
    const requestedPatient = query.get('patientName');
    return patients.records.find((record) => record.data?.patientId && record.data.patientId === (visitData.patientId || appointmentData.patientId))
      || patients.records.find((record) => record.data?.name && record.data.name === (visitData.patientName || appointmentData.patientName || requestedPatient))
      || patients.records[0]
      || null;
  }, [activeAppointment, activeVisit, patients.records, query]);

  const patientData = patient?.data || {};
  const visitData = activeVisit?.data || {};
  const appointmentData = activeAppointment?.data || {};
  const patientName = visitData.patientName || appointmentData.patientName || patientData.name || '-';
  const patientId = visitData.patientId || appointmentData.patientId || patientData.patientId || '-';
  const doctorName = visitData.doctorName || appointmentData.doctorName || '-';
  const opdNo = visitData.opdNo || visitData.visitNo || appointmentData.opdNo || nextOpdNo(opd.records);

  const todayProcedures = useMemo(() => procedures.records
    .filter((record) => (record.data?.opdNo === opdNo || record.data?.patientName === patientName) && record.data?.date === todayISO())
    .sort((a, b) => (a.data?.time || '-').localeCompare(b.data?.time || '-')), [opdNo, patientName, procedures.records]);

  function selectProcedure(name) {
    const item = PROCEDURE_MASTER.find((procedure) => procedure.name === name);
    setForm({ ...form, procedure: name, charge: item?.charge || form.charge });
  }

  async function addProcedure() {
    await procedures.create({
      name: `${form.procedure} - ${patientName}`,
      procedure: form.procedure,
      patientName,
      patientId,
      opdNo,
      visitNo: opdNo,
      doctorName,
      orderedBy: doctorName,
      assignedTo: form.assignedTo,
      date: form.date,
      time: form.time,
      charge: Number(form.charge || 0),
      instructions: form.instructions,
      status: 'Ordered',
      billingStatus: 'Pending',
      source: 'OPD Procedure',
    });
    if (activeVisit?._id) await opd.update(activeVisit._id, { ...activeVisit.data, status: 'Procedure Done', procedureNotes: form.procedure });
    setMessage(`${form.procedure} added as a pending billing charge for ${money(form.charge)}.`);
  }

  async function updateStatus(record, status) {
    await procedures.update(record._id, { ...record.data, status });
    setMessage(`${record.data?.procedure || 'Procedure'} marked ${status}.`);
  }

  return (
    <div className="p-4 md:p-7">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="m-0 text-[22px] font-extrabold text-[#071936]">Procedures</h1>
          <p className="m-0 mt-1 text-[13px] font-semibold text-[#64748b]">Patient: {patientName} | OPD Visit: {opdNo}</p>
        </div>
        <Button tone="blue" onClick={addProcedure}><Plus size={14} />Add Procedure</Button>
      </div>

      {message && <div className="mb-4 rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-[13px] font-semibold text-blue-700">{message}</div>}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-lg border border-[#dfe7f1] bg-white p-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">Procedure<select className={`${INPUT} mt-1`} value={form.procedure} onChange={(event) => selectProcedure(event.target.value)}>{PROCEDURE_MASTER.map((item) => <option key={item.name}>{item.name}</option>)}</select></label>
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">Ordered By<input className={`${INPUT} mt-1`} value={doctorName} readOnly /></label>
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">Assigned To<select className={`${INPUT} mt-1`} value={form.assignedTo} onChange={(event) => setForm({ ...form, assignedTo: event.target.value })}>{STAFF.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">Date<input className={`${INPUT} mt-1`} type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label>
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">Time<input className={`${INPUT} mt-1`} type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} /></label>
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">Charge<input className={`${INPUT} mt-1`} type="number" value={form.charge} onChange={(event) => setForm({ ...form, charge: Number(event.target.value) })} /></label>
            <label className="text-[12px] font-extrabold uppercase text-[#536173] md:col-span-2 xl:col-span-3">Instructions<textarea className={`${TEXTAREA} mt-1`} value={form.instructions} onChange={(event) => setForm({ ...form, instructions: event.target.value })} /></label>
          </div>
          <div className="mt-4 flex justify-end"><Button tone="green" onClick={addProcedure}><Stethoscope size={14} />Add Procedure</Button></div>
        </section>

        <aside className="rounded-lg border border-[#dfe7f1] bg-white p-4">
          <h2 className="m-0 mb-3 text-[16px] font-extrabold text-[#071936]">Billing Integration</h2>
          <div className="grid gap-3 text-[13px] font-semibold text-[#334155]">
            <div className="rounded-md border border-blue-100 bg-blue-50 p-3 text-blue-800">Added procedures are saved as `Pending` charges for New Bill.</div>
            <div className="flex justify-between"><span>Patient ID</span><strong>{patientId}</strong></div>
            <div className="flex justify-between"><span>Doctor</span><strong>{doctorName}</strong></div>
            <div className="flex justify-between"><span>Pending Today</span><strong>{todayProcedures.filter((record) => record.data?.billingStatus !== 'Billed').length}</strong></div>
          </div>
        </aside>
      </div>

      <section className="mt-5 rounded-lg border border-[#dfe7f1] bg-white">
        <div className="border-b border-[#edf2f7] p-4">
          <h2 className="m-0 text-[16px] font-extrabold text-[#071936]">Today's Procedures</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#f8fafc] text-left text-[12px] uppercase text-[#536173]">
                <th className="border-b border-[#edf2f7] px-4 py-3">Procedure</th>
                <th className="border-b border-[#edf2f7] px-4 py-3">Assigned</th>
                <th className="border-b border-[#edf2f7] px-4 py-3">Charge</th>
                <th className="border-b border-[#edf2f7] px-4 py-3">Status</th>
                <th className="border-b border-[#edf2f7] px-4 py-3">Billing</th>
                <th className="border-b border-[#edf2f7] px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {todayProcedures.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-[#64748b]">No procedures ordered today.</td></tr>
              ) : todayProcedures.map((record) => {
                const data = record.data || {};
                return (
                  <tr key={record._id} className="hover:bg-[#fbfdff]">
                    <td className="border-b border-[#f1f5f9] px-4 py-3 font-extrabold text-[#071936]">{data.procedure || '-'}</td>
                    <td className="border-b border-[#f1f5f9] px-4 py-3">{data.assignedTo || '-'}</td>
                    <td className="border-b border-[#f1f5f9] px-4 py-3 font-bold">{money(data.charge)}</td>
                    <td className="border-b border-[#f1f5f9] px-4 py-3"><span className={`rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${statusClass(data.status)}`}>{normalizeStatus(data.status || 'Ordered')}</span></td>
                    <td className="border-b border-[#f1f5f9] px-4 py-3">{data.billingStatus || 'Pending'}</td>
                    <td className="border-b border-[#f1f5f9] px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button type="button" title="In Progress" onClick={() => updateStatus(record, 'In Progress')} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-blue-100 bg-blue-50 text-blue-700 cursor-pointer"><Clock3 size={14} /></button>
                        <button type="button" title="Completed" onClick={() => updateStatus(record, 'Completed')} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-emerald-100 bg-emerald-50 text-emerald-700 cursor-pointer"><CheckCircle2 size={14} /></button>
                      </div>
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
          {['OPD', 'Procedure', 'Pending Charge', 'Billing - New Bill'].map((step, index, arr) => (
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

