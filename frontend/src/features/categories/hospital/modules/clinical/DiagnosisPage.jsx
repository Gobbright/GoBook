import { useMemo, useState } from 'react';
import { ClipboardPlus, FlaskConical, Pill, Plus, Search, Stethoscope, Trash2 } from 'lucide-react';

import { useModuleRecords } from '../../../shared/recordUi/useModuleRecords.js';
import { todayISO } from '../../../shared/recordUi/dateUtils.js';

const INPUT = 'h-10 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-[inherit] text-[#111827] outline-none focus:border-blue-500';
const TEXTAREA = 'min-h-20 w-full rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-[13px] font-[inherit] text-[#111827] outline-none focus:border-blue-500';
const DIAGNOSIS_TYPES = ['Primary', 'Secondary', 'Differential/Provisional'];
const DIAGNOSIS_STATUSES = ['Suspected', 'Provisional', 'Confirmed', 'Ruled Out'];
const SUGGESTIONS = [
  { name: 'Viral Fever', icdCode: 'A92.9' },
  { name: 'Dengue Fever', icdCode: 'A90' },
  { name: 'Upper Respiratory Infection', icdCode: 'J06.9' },
  { name: 'Hypertension', icdCode: 'I10' },
  { name: 'Type 2 Diabetes Mellitus', icdCode: 'E11' },
  { name: 'Acute Gastroenteritis', icdCode: 'A09' },
];

function normalizeStatus(status = '') {
  return String(status || '-').trim().toUpperCase().replace(/\s+/g, ' ');
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
    red: 'border-red-100 bg-red-50 text-red-700 hover:bg-red-100',
  };
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-[13px] font-semibold ${tones[tone]} cursor-pointer disabled:cursor-not-allowed disabled:opacity-60`}>
      {children}
    </button>
  );
}

function emptyDiagnosis(name = '', icdCode = '') {
  return { name, icdCode, type: 'Primary', status: 'Confirmed', since: '3 Days', notes: '' };
}

export function DiagnosisPage() {
  const query = useMemo(() => new URLSearchParams(window.location.search), []);
  const patients = useModuleRecords('hospital/patients');
  const appointments = useModuleRecords('hospital/appointments');
  const opd = useModuleRecords('hospital/opd-visits');
  const history = useModuleRecords('hospital/medical-history');
  const [search, setSearch] = useState('');
  const [diagnoses, setDiagnoses] = useState([emptyDiagnosis('Viral Fever', 'A92.9')]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const activeVisit = useMemo(() => {
    const requestedOpd = query.get('opdNo');
    const requestedPatient = query.get('patientName');
    return opd.records.find((record) => requestedOpd && [record.data?.opdNo, record.data?.visitNo].includes(requestedOpd))
      || opd.records.find((record) => requestedPatient && record.data?.patientName === requestedPatient)
      || opd.records.find((record) => ['IN CONSULTATION', 'DIAGNOSED'].includes(normalizeStatus(record.data?.status)))
      || opd.records[0]
      || null;
  }, [opd.records, query]);

  const activeAppointment = useMemo(() => {
    const requestedPatient = query.get('patientName');
    return appointments.records.find((record) => activeVisit?.data?.appointmentId && record.data?.appointmentId === activeVisit.data.appointmentId)
      || appointments.records.find((record) => requestedPatient && record.data?.patientName === requestedPatient)
      || appointments.records.find((record) => ['IN CONSULTATION', 'CALLED'].includes(normalizeStatus(record.data?.status)))
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

  const filteredSuggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return SUGGESTIONS.filter((item) => !q || [item.name, item.icdCode].join(' ').toLowerCase().includes(q));
  }, [search]);

  function addDiagnosis(item = {}) {
    const hasPrimary = diagnoses.some((diagnosis) => diagnosis.type === 'Primary');
    setDiagnoses([...diagnoses, { ...emptyDiagnosis(item.name || '-', item.icdCode || '-'), type: hasPrimary ? 'Secondary' : 'Primary' }]);
  }

  function updateDiagnosis(index, key, value) {
    setDiagnoses(diagnoses.map((diagnosis, itemIndex) => (itemIndex === index ? { ...diagnosis, [key]: value } : diagnosis)));
  }

  async function save() {
    const clean = diagnoses.filter((diagnosis) => diagnosis.name.trim());
    if (clean.length === 0) {
      setMessage('Add at least one diagnosis before saving.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: `Diagnosis - ${patientName}`,
        opdNo,
        visitNo: opdNo,
        appointmentId: visitData.appointmentId || appointmentData.appointmentId || '-',
        patientName,
        patientId,
        doctorName,
        departmentName: visitData.departmentName || appointmentData.departmentName || 'General Medicine',
        date: todayISO(),
        diagnosis: clean.map((item) => `${item.name}${item.icdCode ? ` (${item.icdCode})` : ''}`).join(', '),
        diagnoses: clean,
        status: 'Diagnosed',
      };
      if (activeVisit?._id) await opd.update(activeVisit._id, { ...activeVisit.data, ...payload });
      else await opd.create(payload);

      await Promise.all(clean
        .filter((item) => item.status === 'Confirmed' && item.type !== 'Differential/Provisional')
        .map((item) => history.create({
          patientName,
          category: 'Conditions',
          condition: item.name,
          icdCode: item.icdCode,
          diagnosedDate: todayISO(),
          doctor: doctorName,
          status: item.type === 'Primary' ? 'Active' : 'Controlled',
          notes: item.notes || `${item.type} diagnosis from ${opdNo}`,
        })));

      if (activeAppointment?._id) await appointments.update(activeAppointment._id, { ...activeAppointment.data, opdNo, status: 'Diagnosed' });
      setMessage('Diagnosis saved and linked to the current OPD visit.');
    } finally {
      setSaving(false);
    }
  }

  function quickGo(path) {
    window.location.assign(`${path}?patientName=${encodeURIComponent(patientName)}&opdNo=${encodeURIComponent(opdNo)}`);
  }

  return (
    <div className="p-4 md:p-7">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="m-0 text-[22px] font-extrabold text-[#071936]">Diagnosis</h1>
          <p className="m-0 mt-1 text-[13px] font-semibold text-[#64748b]">{patientName} - {patientId} | {opdNo} - {doctorName}</p>
        </div>
        <Button tone="green" onClick={save} disabled={saving}><ClipboardPlus size={14} />Save Diagnosis</Button>
      </div>

      {message && <div className="mb-4 rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-[13px] font-semibold text-blue-700">{message}</div>}

      <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="grid content-start gap-5">
          <section className="rounded-lg border border-[#dfe7f1] bg-white p-4">
            <div className="mb-3 text-[13px] font-extrabold uppercase text-[#536173]">Search Diagnosis</div>
            <div className="flex items-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-3">
              <Search size={15} className="text-[#64748b]" />
              <input className="h-10 min-w-0 flex-1 border-0 bg-transparent text-[13px] font-[inherit] outline-none" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search condition / ICD code" />
            </div>
            <div className="mt-3 grid gap-2">
              {filteredSuggestions.map((item) => (
                <button key={item.name} type="button" onClick={() => addDiagnosis(item)} className="flex items-center justify-between rounded-md border border-[#edf2f7] bg-[#fbfdff] px-3 py-2 text-left text-[13px] font-semibold text-[#334155] hover:border-blue-200 hover:bg-blue-50 cursor-pointer">
                  <span>{item.name}</span>
                  <span className="text-[12px] text-[#64748b]">{item.icdCode}</span>
                </button>
              ))}
              {filteredSuggestions.length === 0 && <button type="button" onClick={() => addDiagnosis({ name: search })} className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-left text-[13px] font-semibold text-blue-700 cursor-pointer">Add "{search}"</button>}
            </div>
          </section>

          <section className="rounded-lg border border-[#dfe7f1] bg-white p-4">
            <h2 className="m-0 mb-3 text-[16px] font-extrabold text-[#071936]">Next Actions</h2>
            <div className="grid gap-2">
              <Button onClick={() => quickGo('/hospital/prescription')}><Pill size={14} />Prescription</Button>
              <Button onClick={() => quickGo('/hospital/test-booking')}><FlaskConical size={14} />Tests</Button>
              <Button onClick={() => quickGo('/hospital/procedures')}><Stethoscope size={14} />Procedures</Button>
            </div>
          </section>
        </aside>

        <section className="rounded-lg border border-[#dfe7f1] bg-white">
          <div className="border-b border-[#edf2f7] p-4">
            <h2 className="m-0 text-[16px] font-extrabold text-[#071936]">Selected Diagnoses</h2>
          </div>
          <div className="grid gap-4 p-4">
            {diagnoses.map((diagnosis, index) => (
              <div key={index} className="rounded-lg border border-[#dfe7f1] bg-[#fbfdff] p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-[13px] font-black text-white">{index + 1}</span>
                    <input className="min-w-0 flex-1 border-0 bg-transparent text-[16px] font-extrabold text-[#071936] outline-none" value={diagnosis.name} onChange={(event) => updateDiagnosis(index, 'name', event.target.value)} placeholder="Diagnosis name" />
                  </div>
                  <Button tone="red" onClick={() => setDiagnoses(diagnoses.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={14} />Remove</Button>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <label className="text-[12px] font-extrabold uppercase text-[#536173]">ICD Code<input className={`${INPUT} mt-1`} value={diagnosis.icdCode} onChange={(event) => updateDiagnosis(index, 'icdCode', event.target.value)} placeholder="Optional" /></label>
                  <label className="text-[12px] font-extrabold uppercase text-[#536173]">Type<select className={`${INPUT} mt-1`} value={diagnosis.type} onChange={(event) => updateDiagnosis(index, 'type', event.target.value)}>{DIAGNOSIS_TYPES.map((item) => <option key={item}>{item}</option>)}</select></label>
                  <label className="text-[12px] font-extrabold uppercase text-[#536173]">Status<select className={`${INPUT} mt-1`} value={diagnosis.status} onChange={(event) => updateDiagnosis(index, 'status', event.target.value)}>{DIAGNOSIS_STATUSES.map((item) => <option key={item}>{item}</option>)}</select></label>
                  <label className="text-[12px] font-extrabold uppercase text-[#536173]">Since<input className={`${INPUT} mt-1`} value={diagnosis.since} onChange={(event) => updateDiagnosis(index, 'since', event.target.value)} /></label>
                  <label className="text-[12px] font-extrabold uppercase text-[#536173] md:col-span-2 xl:col-span-4">Notes<textarea className={`${TEXTAREA} mt-1`} value={diagnosis.notes} onChange={(event) => updateDiagnosis(index, 'notes', event.target.value)} /></label>
                </div>
              </div>
            ))}
            <Button onClick={() => addDiagnosis()}><Plus size={14} />Add Another Diagnosis</Button>
          </div>
          <div className="flex flex-wrap justify-end gap-2 border-t border-[#edf2f7] p-4">
            <Button onClick={() => quickGo('/hospital/consultation')}>Back to Consultation</Button>
            <Button tone="green" onClick={save} disabled={saving}><ClipboardPlus size={14} />Save Diagnosis</Button>
          </div>
        </section>
      </div>

      <div className="mt-5 rounded-lg border border-[#dfe7f1] bg-white p-4">
        <div className="mb-3 text-[12px] font-extrabold uppercase text-[#536173]">Workflow</div>
        <div className="flex flex-wrap items-center gap-2 text-[12px] font-bold text-[#334155]">
          {['Consultation', 'Symptoms/Examination', 'Diagnosis', 'Prescription', 'Tests', 'Procedures'].map((step, index, arr) => (
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

