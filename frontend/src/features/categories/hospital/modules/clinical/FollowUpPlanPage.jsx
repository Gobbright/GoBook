import { useEffect, useMemo, useState } from 'react';
import { Bell, CalendarCheck, MessageCircle, Save, Stethoscope } from 'lucide-react';

import { useModuleRecords } from '../../../shared/recordUi/useModuleRecords.js';
import { todayISO } from '../../../shared/recordUi/dateUtils.js';

const INPUT = 'h-10 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-[inherit] text-[#111827] outline-none focus:border-blue-500';
const TEXTAREA = 'min-h-24 w-full rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-[13px] font-[inherit] text-[#111827] outline-none focus:border-blue-500';
const PERIODS = ['3 Days', '5 Days', '7 Days', '10 Days', '14 Days', '30 Days'];
const TESTS = ['CBC', 'Blood Sugar', 'X-Ray'];

function normalizeStatus(status = '') {
  return String(status || '').trim().toUpperCase().replace(/\s+/g, ' ');
}

function addDays(dateValue, days) {
  const date = new Date(dateValue);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysFromPeriod(value) {
  return Number(String(value || '').replace(/\D/g, '')) || 7;
}

function nextOpdNo(records) {
  const year = new Date().getFullYear();
  const prefix = `OPD-${year}-`;
  const max = records.reduce((highest, record) => {
    const raw = record.data?.opdNo || record.data?.visitNo || '';
    if (!String(raw).startsWith(prefix)) return highest;
    const n = Number(String(raw).slice(prefix.length));
    return Number.isFinite(n) ? Math.max(highest, n) : highest;
  }, 451);
  return `${prefix}${String(max + 1).padStart(5, '0')}`;
}

function nextAppointmentId(records) {
  const year = new Date().getFullYear();
  const prefix = `APT-${year}-`;
  const max = records.reduce((highest, record) => {
    const raw = record.data?.appointmentId || '';
    if (!String(raw).startsWith(prefix)) return highest;
    const n = Number(String(raw).slice(prefix.length));
    return Number.isFinite(n) ? Math.max(highest, n) : highest;
  }, 1244);
  return `${prefix}${String(max + 1).padStart(6, '0')}`;
}

function phoneOf(data = {}) {
  return data.patientPhone || data.phone || data.mobile || '';
}

function money(value) {
  return `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;
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

export function FollowUpPlanPage() {
  const query = useMemo(() => new URLSearchParams(window.location.search), []);
  const patients = useModuleRecords('hospital/patients');
  const appointments = useModuleRecords('hospital/appointments');
  const opd = useModuleRecords('hospital/opd-visits');
  const schedules = useModuleRecords('hospital/doctor-schedule');
  const followUps = useModuleRecords('hospital/follow-up');
  const [required, setRequired] = useState('Yes');
  const [period, setPeriod] = useState('7 Days');
  const [suggestedDate, setSuggestedDate] = useState(() => addDays(todayISO(), 7));
  const [doctor, setDoctor] = useState('Dr. Arun Kumar');
  const [consultationType, setConsultationType] = useState('Follow-up');
  const [fee, setFee] = useState(300);
  const [reason, setReason] = useState('Review fever and CBC results');
  const [tests, setTests] = useState({ CBC: true, 'Blood Sugar': false, 'X-Ray': false });
  const [reminders, setReminders] = useState({ SMS: true, WhatsApp: true });
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const activeVisit = useMemo(() => {
    const requestedOpd = query.get('opdNo');
    const requestedPatient = query.get('patientName');
    return opd.records.find((record) => requestedOpd && [record.data?.opdNo, record.data?.visitNo].includes(requestedOpd))
      || opd.records.find((record) => requestedPatient && record.data?.patientName === requestedPatient)
      || opd.records.find((record) => ['PROCEDURE DONE', 'PRESCRIBED', 'DIAGNOSED', 'IN CONSULTATION'].includes(normalizeStatus(record.data?.status)))
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
  const patientName = visitData.patientName || appointmentData.patientName || patientData.name || 'Raj Kumar';
  const patientId = visitData.patientId || appointmentData.patientId || patientData.patientId || 'GBH-00128';
  const currentOpdNo = visitData.opdNo || visitData.visitNo || appointmentData.opdNo || 'OPD-2026-00452';
  const doctorName = visitData.doctorName || appointmentData.doctorName || doctor;
  const nextOpd = nextOpdNo(opd.records);
  const nextAppointment = nextAppointmentId(appointments.records);

  const doctorOptions = useMemo(() => {
    const names = [...new Set([
      doctorName,
      ...schedules.records.map((record) => record.data?.doctorName).filter(Boolean),
      ...appointments.records.map((record) => record.data?.doctorName).filter(Boolean),
    ])].filter(Boolean);
    return names.length ? names : ['Dr. Arun Kumar'];
  }, [appointments.records, doctorName, schedules.records]);

  useEffect(() => {
    const schedule = schedules.records.find((record) => record.data?.doctorName === doctor);
    if (schedule?.data?.followUpFee !== undefined && schedule.data.followUpFee !== '') setFee(Number(schedule.data.followUpFee || 0));
  }, [doctor, schedules.records]);

  function changePeriod(value) {
    setPeriod(value);
    setSuggestedDate(addDays(todayISO(), daysFromPeriod(value)));
  }

  async function saveFollowUp({ book = false } = {}) {
    setSaving(true);
    try {
      const selectedTests = Object.entries(tests).filter(([, checked]) => checked).map(([name]) => name);
      const selectedReminders = Object.entries(reminders).filter(([, checked]) => checked).map(([name]) => name);
      await followUps.create({
        name: `${patientName} follow-up - ${suggestedDate}`,
        patientName,
        patientId,
        previousOpdNo: currentOpdNo,
        nextOpdNo: book ? nextOpd : '',
        doctorName: doctor,
        followUpRequired: required,
        followUpAfter: period,
        followUpDate: suggestedDate,
        consultationType,
        followUpFee: fee,
        reason,
        testsBeforeFollowUp: selectedTests,
        reminders: selectedReminders,
        status: required === 'Yes' ? 'Pending' : 'Not Required',
      });

      if (activeVisit?._id) {
        await opd.update(activeVisit._id, { ...activeVisit.data, followUpDate: suggestedDate, followUpRequired: required, status: 'Follow-up' });
      }

      if (book && required === 'Yes') {
        await appointments.create({
          appointmentId: nextAppointment,
          patientName,
          patientId,
          patientPhone: phoneOf(patientData) || phoneOf(appointmentData),
          doctorName: doctor,
          departmentName: visitData.departmentName || appointmentData.departmentName || 'General Medicine',
          date: suggestedDate,
          time: '09:00',
          visitType: 'Follow-up',
          consultationFee: Number(fee || 0),
          reason,
          previousOpdNo: currentOpdNo,
          plannedOpdNo: nextOpd,
          status: 'Scheduled',
          paymentStatus: 'Not Collected',
          confirmation: selectedReminders.join(', ') || 'Pending',
        });
        await opd.create({
          name: `Follow-up OPD - ${patientName}`,
          opdNo: nextOpd,
          visitNo: nextOpd,
          previousOpdNo: currentOpdNo,
          patientName,
          patientId,
          doctorName: doctor,
          departmentName: visitData.departmentName || appointmentData.departmentName || 'General Medicine',
          date: suggestedDate,
          status: 'Registered',
          notes: `New follow-up OPD visit linked to ${currentOpdNo}.`,
        });
      }

      setMessage(book && required === 'Yes'
        ? `${nextAppointment} booked with new OPD visit ${nextOpd}. Reminder: ${selectedReminders.join(', ') || 'None'}.`
        : 'Follow-up plan saved.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 md:p-7">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="m-0 text-[22px] font-extrabold text-[#071936]">Follow-up</h1>
          <p className="m-0 mt-1 text-[13px] font-semibold text-[#64748b]">{patientName} | {currentOpdNo}</p>
        </div>
        <Button tone="blue" onClick={() => saveFollowUp()} disabled={saving}><Save size={14} />Save Follow-up</Button>
      </div>

      {message && <div className="mb-4 rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-[13px] font-semibold text-blue-700">{message}</div>}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-lg border border-[#dfe7f1] bg-white p-4">
          <div className="grid gap-5">
            <div>
              <div className="mb-2 text-[12px] font-extrabold uppercase text-[#536173]">Follow-up Required?</div>
              <div className="flex flex-wrap gap-3 text-[13px] font-semibold text-[#334155]">
                {['Yes', 'No'].map((item) => <label key={item} className="inline-flex items-center gap-2"><input type="radio" checked={required === item} onChange={() => setRequired(item)} />{item}</label>)}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <label className="text-[12px] font-extrabold uppercase text-[#536173]">Follow-up After<select className={`${INPUT} mt-1`} value={period} onChange={(event) => changePeriod(event.target.value)}>{PERIODS.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="text-[12px] font-extrabold uppercase text-[#536173]">Suggested Date<input className={`${INPUT} mt-1`} type="date" value={suggestedDate} onChange={(event) => setSuggestedDate(event.target.value)} /></label>
              <label className="text-[12px] font-extrabold uppercase text-[#536173]">Doctor<select className={`${INPUT} mt-1`} value={doctor} onChange={(event) => setDoctor(event.target.value)}>{doctorOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="text-[12px] font-extrabold uppercase text-[#536173]">Consultation Type<select className={`${INPUT} mt-1`} value={consultationType} onChange={(event) => setConsultationType(event.target.value)}><option>Follow-up</option><option>Consultation</option></select></label>
              <label className="text-[12px] font-extrabold uppercase text-[#536173]">Follow-up Fee<input className={`${INPUT} mt-1`} type="number" value={fee} onChange={(event) => setFee(Number(event.target.value))} /></label>
            </div>

            <label className="text-[12px] font-extrabold uppercase text-[#536173]">Reason / Instructions<textarea className={`${TEXTAREA} mt-1`} value={reason} onChange={(event) => setReason(event.target.value)} /></label>

            <div>
              <div className="mb-2 text-[12px] font-extrabold uppercase text-[#536173]">Tests Before Follow-up</div>
              <div className="flex flex-wrap gap-3 text-[13px] font-semibold text-[#334155]">
                {TESTS.map((item) => <label key={item} className="inline-flex items-center gap-2"><input type="checkbox" checked={tests[item]} onChange={(event) => setTests({ ...tests, [item]: event.target.checked })} />{item}</label>)}
              </div>
            </div>

            <div>
              <div className="mb-2 text-[12px] font-extrabold uppercase text-[#536173]">Reminder</div>
              <div className="flex flex-wrap gap-3 text-[13px] font-semibold text-[#334155]">
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={reminders.SMS} onChange={(event) => setReminders({ ...reminders, SMS: event.target.checked })} /><Bell size={14} />SMS</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={reminders.WhatsApp} onChange={(event) => setReminders({ ...reminders, WhatsApp: event.target.checked })} /><MessageCircle size={14} />WhatsApp</label>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-[#edf2f7] pt-4">
              <Button onClick={() => saveFollowUp()} disabled={saving}><Save size={14} />Save Follow-up</Button>
              <Button tone="green" onClick={() => saveFollowUp({ book: true })} disabled={saving || required !== 'Yes'}><CalendarCheck size={14} />Book Appointment</Button>
            </div>
          </div>
        </section>

        <aside className="grid content-start gap-5">
          <section className="rounded-lg border border-[#dfe7f1] bg-white p-4">
            <h2 className="m-0 mb-3 text-[16px] font-extrabold text-[#071936]">Next Visit Link</h2>
            <div className="grid gap-3 text-[13px] font-semibold text-[#334155]">
              <div className="flex justify-between"><span>Patient ID</span><strong>{patientId}</strong></div>
              <div className="flex justify-between"><span>Previous OPD</span><strong>{currentOpdNo}</strong></div>
              <div className="flex justify-between"><span>New OPD</span><strong>{nextOpd}</strong></div>
              <div className="flex justify-between"><span>Fee</span><strong>{money(fee)}</strong></div>
              <div className="rounded-md border border-blue-100 bg-blue-50 p-3 text-[12px] font-bold text-blue-800">Returning patient gets a new OPD visit linked to this encounter. The old consultation stays closed.</div>
            </div>
          </section>

          <section className="rounded-lg border border-[#dfe7f1] bg-white p-4">
            <h2 className="m-0 mb-3 flex items-center gap-2 text-[16px] font-extrabold text-[#071936]"><Stethoscope size={17} />Follow-up History</h2>
            <div className="grid gap-2">
              {followUps.records.filter((record) => record.data?.patientName === patientName).slice(0, 4).map((record) => (
                <div key={record._id} className="rounded-md border border-[#edf2f7] bg-[#fbfdff] px-3 py-2 text-[12px] font-semibold text-[#334155]">
                  <strong>{record.data?.followUpDate || '-'}</strong> - {record.data?.status || 'Pending'}
                </div>
              ))}
              {followUps.records.filter((record) => record.data?.patientName === patientName).length === 0 && <div className="rounded-md border border-dashed border-[#dbe4ef] px-3 py-4 text-center text-[13px] font-semibold text-[#94a3b8]">No follow-up history yet.</div>}
            </div>
          </section>
        </aside>
      </div>

      <div className="mt-5 rounded-lg border border-[#dfe7f1] bg-white p-4">
        <div className="mb-3 text-[12px] font-extrabold uppercase text-[#536173]">Workflow</div>
        <div className="flex flex-wrap items-center gap-2 text-[12px] font-bold text-[#334155]">
          {['Consultation Completed', 'Doctor requests Follow-up', period, 'Suggested Date', 'Book Appointment', 'SMS/WhatsApp Reminder', 'Patient Returns', 'New OPD Visit', 'Previous Visit Available'].map((step, index, arr) => (
            <span key={`${step}-${index}`} className="inline-flex items-center gap-2">
              <span className="rounded-md border border-[#dbe4ef] bg-[#f8fbff] px-2.5 py-1">{step}</span>
              {index < arr.length - 1 && <span className="text-[#94a3b8]">-&gt;</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
