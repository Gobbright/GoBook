import { useMemo, useState } from 'react';
import { Activity, AlertTriangle, ClipboardPlus, FileImage, FlaskConical, History, Pill, Plus, Save, Stethoscope, X } from 'lucide-react';

import { useModuleRecords } from '../../../shared/recordUi/useModuleRecords.js';
import { todayISO } from '../../../shared/recordUi/dateUtils.js';

const INPUT = 'h-10 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-[inherit] text-[#111827] outline-none focus:border-blue-500';
const TEXTAREA = 'min-h-24 w-full rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-[13px] font-[inherit] text-[#111827] outline-none focus:border-blue-500';
const DEFAULT_COMPLAINTS = [
  { name: 'Fever', duration: '3 Days' },
  { name: 'Body Pain', duration: '2 Days' },
];

function normalizeStatus(status = '') {
  const normalized = String(status || '-').trim().toUpperCase().replace(/\s+/g, ' ');
  const map = { 'IN CONSULTATION': 'IN CONSULTATION', CALLED: 'CALLED', WAITING: 'WAITING', COMPLETED: 'COMPLETED' };
  return map[normalized] || normalized;
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

function phoneOf(data = {}) {
  return data.patientPhone || data.phone || data.mobile || '-';
}

function patientLabel(data = {}) {
  return [data.age ? `${data.age} Y` : '34 Y', data.gender || 'Male', data.bloodGroup || 'O+'].filter(Boolean).join(' - ');
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

function Field({ label, value, onChange, suffix = '', readOnly = false }) {
  return (
    <label className="text-[12px] font-extrabold uppercase text-[#536173]">
      {label}
      <div className="mt-1 flex items-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-3">
        <input className="h-10 min-w-0 flex-1 border-0 bg-transparent text-[13px] font-[inherit] font-semibold text-[#111827] outline-none" value={value} readOnly={readOnly} onChange={(event) => onChange?.(event.target.value)} />
        {suffix && <span className="text-[12px] font-bold text-[#64748b]">{suffix}</span>}
      </div>
    </label>
  );
}

export function ConsultationPage() {
  const query = useMemo(() => new URLSearchParams(window.location.search), []);
  const patients = useModuleRecords('hospital/patients');
  const appointments = useModuleRecords('hospital/appointments');
  const history = useModuleRecords('hospital/medical-history');
  const documents = useModuleRecords('hospital/documents');
  const opd = useModuleRecords('hospital/opd-visits');
  const [complaints, setComplaints] = useState(DEFAULT_COMPLAINTS);
  const [newComplaint, setNewComplaint] = useState('');
  const [newDuration, setNewDuration] = useState('');
  const [vitals, setVitals] = useState({ bp: '120/80', temperature: '101.2', pulse: '82', spo2: '98', weight: '72', height: '170' });
  const [notes, setNotes] = useState({ symptoms: '', examination: '', doctorNotes: '' });
  const [attachment, setAttachment] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const activeAppointment = useMemo(() => {
    const requestedPatient = query.get('patientName');
    const requestedAppointment = query.get('appointmentId');
    return appointments.records.find((record) => requestedAppointment && record.data?.appointmentId === requestedAppointment)
      || appointments.records.find((record) => normalizeStatus(record.data?.status) === 'IN CONSULTATION')
      || appointments.records.find((record) => requestedPatient && record.data?.patientName === requestedPatient)
      || appointments.records.find((record) => ['CALLED', 'WAITING'].includes(normalizeStatus(record.data?.status)))
      || null;
  }, [appointments.records, query]);

  const patient = useMemo(() => {
    const appointmentData = activeAppointment?.data || {};
    const requestedPatient = query.get('patientName');
    return patients.records.find((record) => record.data?.patientId && record.data.patientId === appointmentData.patientId)
      || patients.records.find((record) => record.data?.name && record.data.name === appointmentData.patientName)
      || patients.records.find((record) => requestedPatient && record.data?.name === requestedPatient)
      || patients.records[0]
      || null;
  }, [activeAppointment, patients.records, query]);

  const patientData = patient?.data || {};
  const appointmentData = activeAppointment?.data || {};
  const patientName = appointmentData.patientName || patientData.name || '-';
  const patientId = appointmentData.patientId || patientData.patientId || '-';
  const doctorName = appointmentData.doctorName || '-';
  const tokenNo = appointmentData.tokenNo || 'A-08';
  const opdNo = appointmentData.opdNo || appointmentData.visitNo || nextOpdNo(opd.records);

  const patientHistory = useMemo(() => history.records.filter((record) => record.data?.patientName === patientName), [history.records, patientName]);
  const allergies = useMemo(() => {
    const structured = patientHistory
      .filter((record) => record.data?.category === 'Allergies')
      .map((record) => record.data?.allergy)
      .filter(Boolean);
    const basics = String(patientData.knownAllergies || '-').split(',').map((item) => item.trim()).filter(Boolean);
    return [...new Set([...structured, ...basics])];
  }, [patientData.knownAllergies, patientHistory]);
  const previousVisits = useMemo(() => opd.records.filter((record) => record.data?.patientName === patientName), [opd.records, patientName]);
  const labReports = useMemo(() => documents.records.filter((record) => record.data?.patientName === patientName && /lab|laboratory|report/i.test(record.data?.documentType || record.data?.name || '-')), [documents.records, patientName]);
  const bmi = useMemo(() => {
    const weight = Number(vitals.weight);
    const height = Number(vitals.height) / 100;
    if (!weight || !height) return '';
    return (weight / (height * height)).toFixed(1);
  }, [vitals.height, vitals.weight]);

  function addComplaint() {
    if (!newComplaint.trim()) return;
    setComplaints([...complaints, { name: newComplaint.trim(), duration: newDuration.trim() || 'Today' }]);
    setNewComplaint('');
    setNewDuration('');
  }

  function quickGo(path) {
    window.location.assign(`${path}?patientName=${encodeURIComponent(patientName)}&opdNo=${encodeURIComponent(opdNo)}`);
  }

  async function save(status) {
    setSaving(true);
    try {
      await opd.create({
        name: `Consultation - ${patientName}`,
        opdNo,
        visitNo: opdNo,
        appointmentId: appointmentData.appointmentId || '-',
        patientName,
        patientId,
        doctorName,
        departmentName: appointmentData.departmentName || 'General Medicine',
        date: todayISO(),
        tokenNo,
        complaints,
        vitals: { ...vitals, bmi },
        symptoms: notes.symptoms,
        examinationFindings: notes.examination,
        notes: notes.doctorNotes,
        attachment,
        status,
      });
      if (activeAppointment) {
        await appointments.update(activeAppointment._id, { ...activeAppointment.data, opdNo, status: status === 'Draft' ? activeAppointment.data?.status : 'Diagnosed' });
      }
      setMessage(status === 'Draft' ? 'Consultation draft saved.' : 'Consultation saved. Diagnosis is ready.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 md:p-7">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="m-0 text-[22px] font-extrabold text-[#071936]">Consultation</h1>
          <p className="m-0 mt-1 text-[13px] font-semibold text-[#64748b]">{opdNo}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => quickGo('/hospital/medical-history')}><History size={14} />Medical History</Button>
          <Button tone="blue" onClick={() => save('Draft')} disabled={saving}><Save size={14} />Save Draft</Button>
          <Button tone="green" onClick={() => save('Diagnosed')} disabled={saving}><CheckIcon />Save Consultation</Button>
        </div>
      </div>

      {message && <div className="mb-4 rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-[13px] font-semibold text-blue-700">{message}</div>}

      <section className="mb-5 rounded-lg border border-[#dfe7f1] bg-white p-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="m-0 text-[20px] font-extrabold text-[#071936]">{patientName}</h2>
                <p className="m-0 mt-1 text-[13px] font-semibold text-[#475569]">{patientLabel(patientData)}</p>
              </div>
              <div className="text-right text-[13px] font-semibold text-[#334155]">
                <div>Patient ID: <strong>{patientId}</strong></div>
                <div className="mt-1">Token: <strong>{tokenNo}</strong></div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(allergies.length ? allergies : ['Penicillin']).map((item) => (
                <span key={item} className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-[12px] font-extrabold text-red-700">
                  <AlertTriangle size={14} />Allergy: {item}
                </span>
              ))}
              <span className="inline-flex items-center gap-2 rounded-md border border-[#dbe4ef] bg-[#f8fbff] px-2.5 py-1.5 text-[12px] font-bold text-[#334155]"><Stethoscope size={14} />{doctorName}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={() => quickGo('/hospital/medical-history')}><History size={14} />Medical History</Button>
              <Button onClick={() => setMessage(`${previousVisits.length} previous visits available for ${patientName}.`)}><Activity size={14} />Previous Visits</Button>
              <Button onClick={() => setMessage(`${labReports.length} lab reports available for ${patientName}.`)}><FlaskConical size={14} />Lab Reports</Button>
            </div>
          </div>
          <div className="rounded-md border border-[#dbe4ef] bg-[#f8fbff] p-3 text-[13px] font-semibold text-[#334155]">
            <div className="text-[11px] font-extrabold uppercase text-[#64748b]">Current Visit</div>
            <div className="mt-2 flex justify-between"><span>Appointment</span><strong>{appointmentData.appointmentId || '-'}</strong></div>
            <div className="mt-2 flex justify-between"><span>Time</span><strong>{appointmentData.time || '-'}</strong></div>
            <div className="mt-2 flex justify-between"><span>Mobile</span><strong>{phoneOf(appointmentData) || phoneOf(patientData) || '-'}</strong></div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-5">
          <section className="rounded-lg border border-[#dfe7f1] bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="m-0 text-[16px] font-extrabold text-[#071936]">Chief Complaints</h2>
              <div className="grid gap-2 sm:grid-cols-[180px_120px_auto]">
                <input className={INPUT} value={newComplaint} onChange={(event) => setNewComplaint(event.target.value)} placeholder="Complaint" />
                <input className={INPUT} value={newDuration} onChange={(event) => setNewDuration(event.target.value)} placeholder="Duration" />
                <Button onClick={addComplaint}><Plus size={14} />Add</Button>
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {complaints.map((item, index) => (
                <div key={`${item.name}-${index}`} className="flex items-center justify-between gap-3 rounded-md border border-[#edf2f7] bg-[#fbfdff] px-3 py-2 text-[13px]">
                  <strong className="text-[#071936]">{item.name}</strong>
                  <span className="font-semibold text-[#64748b]">{item.duration}</span>
                  <button type="button" onClick={() => setComplaints(complaints.filter((_, itemIndex) => itemIndex !== index))} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-100 bg-red-50 text-red-700 cursor-pointer"><X size={13} /></button>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-[#dfe7f1] bg-white p-4">
            <h2 className="m-0 mb-3 text-[16px] font-extrabold text-[#071936]">Vitals</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Field label="BP" value={vitals.bp} onChange={(value) => setVitals({ ...vitals, bp: value })} />
              <Field label="Temperature" value={vitals.temperature} suffix="F" onChange={(value) => setVitals({ ...vitals, temperature: value })} />
              <Field label="Pulse" value={vitals.pulse} suffix="bpm" onChange={(value) => setVitals({ ...vitals, pulse: value })} />
              <Field label="SpO2" value={vitals.spo2} suffix="%" onChange={(value) => setVitals({ ...vitals, spo2: value })} />
              <Field label="Weight" value={vitals.weight} suffix="kg" onChange={(value) => setVitals({ ...vitals, weight: value })} />
              <Field label="Height" value={vitals.height} suffix="cm" onChange={(value) => setVitals({ ...vitals, height: value })} />
              <Field label="BMI" value={bmi ? `${bmi} Auto` : ''} readOnly />
            </div>
          </section>

          <section className="rounded-lg border border-[#dfe7f1] bg-white p-4">
            <h2 className="m-0 mb-3 text-[16px] font-extrabold text-[#071936]">Clinical Notes</h2>
            <div className="grid gap-3">
              <label className="text-[12px] font-extrabold uppercase text-[#536173]">Symptoms<textarea className={`${TEXTAREA} mt-1`} value={notes.symptoms} onChange={(event) => setNotes({ ...notes, symptoms: event.target.value })} /></label>
              <label className="text-[12px] font-extrabold uppercase text-[#536173]">Examination Findings<textarea className={`${TEXTAREA} mt-1`} value={notes.examination} onChange={(event) => setNotes({ ...notes, examination: event.target.value })} /></label>
              <label className="text-[12px] font-extrabold uppercase text-[#536173]">Doctor Notes<textarea className={`${TEXTAREA} mt-1`} value={notes.doctorNotes} onChange={(event) => setNotes({ ...notes, doctorNotes: event.target.value })} /></label>
              <label className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-semibold text-[#374151] cursor-pointer">
                <FileImage size={14} />Attach File/Image
                <input type="file" className="hidden" onChange={(event) => setAttachment(event.target.files?.[0]?.name || '-')} />
              </label>
              {attachment && <div className="text-[12px] font-semibold text-[#64748b]">Attached: {attachment}</div>}
            </div>
          </section>
        </div>

        <aside className="grid content-start gap-5">
          <section className="rounded-lg border border-[#dfe7f1] bg-white p-4">
            <h2 className="m-0 mb-3 text-[16px] font-extrabold text-[#071936]">Quick Actions</h2>
            <div className="grid gap-2">
              <Button tone="blue" onClick={() => quickGo('/hospital/diagnosis')}><ClipboardPlus size={14} />Diagnosis</Button>
              <Button onClick={() => quickGo('/hospital/prescription')}><Pill size={14} />Prescription</Button>
              <Button onClick={() => quickGo('/hospital/test-booking')}><FlaskConical size={14} />Lab Test</Button>
              <Button onClick={() => quickGo('/hospital/procedures')}><Stethoscope size={14} />Procedure</Button>
              <Button onClick={() => quickGo('/hospital/follow-up')}><Activity size={14} />Follow-up</Button>
            </div>
          </section>

          <section className="rounded-lg border border-[#dfe7f1] bg-white p-4">
            <h2 className="m-0 mb-3 text-[16px] font-extrabold text-[#071936]">Clinical Context</h2>
            <div className="grid gap-3 text-[13px] font-semibold text-[#334155]">
              <div className="flex justify-between"><span>Previous Visits</span><strong>{previousVisits.length}</strong></div>
              <div className="flex justify-between"><span>Lab Reports</span><strong>{labReports.length}</strong></div>
              <div className="flex justify-between"><span>History Items</span><strong>{patientHistory.length}</strong></div>
              <div className="flex justify-between"><span>Current Medicines</span><strong>{patientHistory.filter((record) => record.data?.category === 'Medications').length}</strong></div>
            </div>
          </section>
        </aside>
      </div>

      <div className="mt-5 flex flex-wrap justify-end gap-2 rounded-lg border border-[#dfe7f1] bg-white p-4">
        <Button onClick={() => save('Draft')} disabled={saving}><Save size={14} />Save Draft</Button>
        <Button tone="green" onClick={() => save('Diagnosed')} disabled={saving}><CheckIcon />Save Consultation</Button>
      </div>

      <div className="mt-5 rounded-lg border border-[#dfe7f1] bg-white p-4">
        <div className="mb-3 text-[12px] font-extrabold uppercase text-[#536173]">Workflow</div>
        <div className="flex flex-wrap items-center gap-2 text-[12px] font-bold text-[#334155]">
          {['Appointment', 'Check-in', 'Queue & Token', 'Doctor Calls Patient', 'Consultation', 'Complaints + Vitals', 'Examination', 'Clinical Notes', 'Diagnosis'].map((step, index, arr) => (
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

function CheckIcon() {
  return <ClipboardPlus size={14} />;
}

