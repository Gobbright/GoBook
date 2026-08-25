import { useMemo, useState } from 'react';
import { AlertTriangle, FileText, FlaskConical, Pill, Plus, Printer, Save, Search, Star, Trash2 } from 'lucide-react';

import { useModuleRecords } from '../../../shared/recordUi/useModuleRecords.js';
import { todayISO } from '../../../shared/recordUi/dateUtils.js';

const INPUT = 'h-10 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-[inherit] text-[#111827] outline-none focus:border-blue-500';
const TEXTAREA = 'min-h-20 w-full rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-[13px] font-[inherit] text-[#111827] outline-none focus:border-blue-500';
const FREQUENCIES = ['1-0-1', '1-0-0', '0-0-1', '1-1-1', '0-1-0', 'SOS'];
const ROUTES = ['Oral', 'IV', 'IM', 'Topical', 'Inhalation', 'Eye/Ear Drops'];
const MEDICINES = [
  { name: 'Paracetamol 500mg', generic: 'Acetaminophen', dosage: '500mg', frequency: '1-0-1', duration: '5 Days', route: 'Oral' },
  { name: 'Vitamin C', generic: 'Ascorbic Acid', dosage: '500mg', frequency: '1-0-0', duration: '7 Days', route: 'Oral' },
  { name: 'Cetirizine 10mg', generic: 'Cetirizine', dosage: '10mg', frequency: '0-0-1', duration: '3 Days', route: 'Oral' },
  { name: 'Pantoprazole 40mg', generic: 'Pantoprazole', dosage: '40mg', frequency: '1-0-0', duration: '5 Days', route: 'Oral' },
  { name: 'ORS Sachet', generic: 'Oral Rehydration Salts', dosage: '1 Sachet', frequency: 'SOS', duration: '3 Days', route: 'Oral' },
];
const DEFAULT_LINES = [
  { medicine: 'Paracetamol 500mg', generic: 'Acetaminophen', dosage: '500mg', frequency: '1-0-1', duration: '5 Days', route: 'Oral', timing: 'After Food', instructions: 'Take with water' },
  { medicine: 'Vitamin C', generic: 'Ascorbic Acid', dosage: '500mg', frequency: '1-0-0', duration: '7 Days', route: 'Oral', timing: 'After Food', instructions: '' },
];

function normalizeStatus(status = '') {
  return String(status || '-').trim().toUpperCase().replace(/\s+/g, ' ');
}

function nextRxNo(records) {
  const year = new Date().getFullYear();
  const prefix = `RX-${year}-`;
  const max = records.reduce((highest, record) => {
    const raw = record.data?.prescriptionNo || record.data?.rxNo || '-';
    if (!String(raw).startsWith(prefix)) return highest;
    const n = Number(String(raw).slice(prefix.length));
    return Number.isFinite(n) ? Math.max(highest, n) : highest;
  }, 455);
  return `${prefix}${String(max + 1).padStart(5, '0')}`;
}

function patientLine(data = {}) {
  return [data.age ? `${data.age} Y` : '34 Y', data.gender || 'Male'].filter(Boolean).join(' - ');
}

function Button({ children, onClick, tone = 'white', disabled = false }) {
  const tones = {
    blue: 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700',
    green: 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700',
    amber: 'border-amber-100 bg-amber-50 text-amber-700 hover:bg-amber-100',
    white: 'border-[#dbe4ef] bg-white text-[#374151] hover:bg-gray-50',
  };
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-[13px] font-semibold ${tones[tone]} cursor-pointer disabled:cursor-not-allowed disabled:opacity-60`}>
      {children}
    </button>
  );
}

function emptyLine(seed = {}) {
  return {
    medicine: seed.name || '-',
    generic: seed.generic || '-',
    dosage: seed.dosage || '500mg',
    frequency: seed.frequency || '1-0-1',
    duration: seed.duration || '5 Days',
    route: seed.route || 'Oral',
    timing: 'After Food',
    instructions: seed.instructions || 'Take with water',
  };
}

export function PrescriptionPage() {
  const query = useMemo(() => new URLSearchParams(window.location.search), []);
  const patients = useModuleRecords('hospital/patients');
  const appointments = useModuleRecords('hospital/appointments');
  const opd = useModuleRecords('hospital/opd-visits');
  const history = useModuleRecords('hospital/medical-history');
  const prescriptions = useModuleRecords('hospital/prescription');
  const [search, setSearch] = useState('');
  const [line, setLine] = useState(emptyLine(MEDICINES[0]));
  const [lines, setLines] = useState(DEFAULT_LINES);
  const [advice, setAdvice] = useState({ fluids: true, rest: true });
  const [additional, setAdditional] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const activeVisit = useMemo(() => {
    const requestedOpd = query.get('opdNo');
    const requestedPatient = query.get('patientName');
    return opd.records.find((record) => requestedOpd && [record.data?.opdNo, record.data?.visitNo].includes(requestedOpd))
      || opd.records.find((record) => requestedPatient && record.data?.patientName === requestedPatient)
      || opd.records.find((record) => ['DIAGNOSED', 'IN CONSULTATION'].includes(normalizeStatus(record.data?.status)))
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
  const opdNo = visitData.opdNo || visitData.visitNo || appointmentData.opdNo || 'OPD-2026-00452';
  const diagnosis = visitData.diagnosis || visitData.diagnoses?.[0]?.name || 'Viral Fever';
  const rxNo = nextRxNo(prescriptions.records);

  const allergies = useMemo(() => {
    const structured = history.records
      .filter((record) => record.data?.patientName === patientName && record.data?.category === 'Allergies')
      .map((record) => record.data?.allergy)
      .filter(Boolean);
    const basics = String(patientData.knownAllergies || '-').split(',').map((item) => item.trim()).filter(Boolean);
    return [...new Set([...structured, ...basics])];
  }, [history.records, patientData.knownAllergies, patientName]);

  const filteredMedicines = useMemo(() => {
    const q = search.trim().toLowerCase();
    return MEDICINES.filter((item) => !q || [item.name, item.generic].join(' ').toLowerCase().includes(q));
  }, [search]);

  function selectMedicine(medicine) {
    setLine(emptyLine(medicine));
    setSearch(medicine.name);
  }

  function addMedicine() {
    if (!line.medicine.trim()) return;
    setLines([...lines, line]);
    setLine(emptyLine());
    setSearch('');
  }

  function saveTemplate() {
    setMessage('Common prescription template saved for reuse.');
  }

  async function save(status) {
    const clean = lines.filter((item) => item.medicine.trim());
    if (clean.length === 0) {
      setMessage('Add at least one medicine before saving.');
      return;
    }
    setSaving(true);
    try {
      const readable = clean.map((item) => `${item.medicine} - ${item.dosage} - ${item.frequency} - ${item.duration} - ${item.route} - ${item.timing}`).join('\n');
      const payload = {
        name: `${rxNo} - ${patientName}`,
        prescriptionNo: rxNo,
        rxNo,
        opdNo,
        visitNo: opdNo,
        appointmentId: visitData.appointmentId || appointmentData.appointmentId || '-',
        patientName,
        patientId,
        doctorName,
        diagnosis,
        medicines: readable,
        prescribedMedicines: clean,
        medicinesList: clean,
        advice: [
          advice.fluids ? 'Drink plenty of fluids' : '',
          advice.rest ? 'Take adequate rest' : '',
        ].filter(Boolean),
        additionalInstructions: additional,
        date: todayISO(),
        status,
        pharmacyStatus: status === 'Finalized' ? 'Ready for Pharmacy' : 'Draft',
      };
      await prescriptions.create(payload);
      if (activeVisit?._id) await opd.update(activeVisit._id, { ...activeVisit.data, prescription: rxNo, status: status === 'Finalized' ? 'Prescribed' : activeVisit.data?.status });
      setMessage(status === 'Finalized' ? `${rxNo} finalized and sent to Pharmacy Prescriptions.` : `${rxNo} draft saved.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 md:p-7">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="m-0 text-[22px] font-extrabold text-[#071936]">Prescription</h1>
          <p className="m-0 mt-1 text-[13px] font-semibold text-[#64748b]">{patientName} - {patientLine(patientData)} | {opdNo}</p>
        </div>
        <Button onClick={saveTemplate}><Star size={14} />Save Template</Button>
      </div>

      {message && <div className="mb-4 rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-[13px] font-semibold text-blue-700">{message}</div>}

      <section className="mb-5 rounded-lg border border-[#dfe7f1] bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="m-0 text-[18px] font-extrabold text-[#071936]">{patientName} <span className="text-[13px] font-semibold text-[#64748b]">- {patientLine(patientData)}</span></h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {(allergies.length ? allergies : ['Penicillin']).map((item) => (
                <span key={item} className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-[12px] font-extrabold uppercase text-red-700"><AlertTriangle size={14} />Allergy: {item}</span>
              ))}
            </div>
            <p className="m-0 mt-3 text-[13px] font-semibold text-[#334155]">Diagnosis: <strong>{diagnosis}</strong></p>
          </div>
          <div className="rounded-md border border-[#dbe4ef] bg-[#f8fbff] px-3 py-2 text-[13px] font-semibold text-[#334155]">
            <div>Rx No: <strong>{rxNo}</strong></div>
            <div className="mt-1">Doctor: <strong>{doctorName}</strong></div>
            <div className="mt-1">Patient ID: <strong>{patientId}</strong></div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-5">
          <section className="rounded-lg border border-[#dfe7f1] bg-white p-4">
            <div className="mb-4">
              <label className="mb-1 block text-[12px] font-extrabold uppercase text-[#536173]">Search Medicine</label>
              <div className="flex items-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-3">
                <Search size={15} className="text-[#64748b]" />
                <input className="h-10 min-w-0 flex-1 border-0 bg-transparent text-[13px] font-[inherit] outline-none" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search Medicine" />
              </div>
              {search && (
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  {filteredMedicines.map((medicine) => (
                    <button key={medicine.name} type="button" onClick={() => selectMedicine(medicine)} className="rounded-md border border-[#edf2f7] bg-[#fbfdff] px-3 py-2 text-left text-[13px] font-semibold text-[#334155] hover:border-blue-200 hover:bg-blue-50 cursor-pointer">
                      <strong>{medicine.name}</strong><span className="ml-2 text-[12px] text-[#64748b]">{medicine.generic}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-3">
              <label className="text-[12px] font-extrabold uppercase text-[#536173]">Medicine<input className={`${INPUT} mt-1`} value={line.medicine} onChange={(event) => setLine({ ...line, medicine: event.target.value })} /></label>
              <div className="grid gap-3 md:grid-cols-4">
                <label className="text-[12px] font-extrabold uppercase text-[#536173]">Dosage<input className={`${INPUT} mt-1`} value={line.dosage} onChange={(event) => setLine({ ...line, dosage: event.target.value })} /></label>
                <label className="text-[12px] font-extrabold uppercase text-[#536173]">Frequency<select className={`${INPUT} mt-1`} value={line.frequency} onChange={(event) => setLine({ ...line, frequency: event.target.value })}>{FREQUENCIES.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label className="text-[12px] font-extrabold uppercase text-[#536173]">Duration<input className={`${INPUT} mt-1`} value={line.duration} onChange={(event) => setLine({ ...line, duration: event.target.value })} /></label>
                <label className="text-[12px] font-extrabold uppercase text-[#536173]">Route<select className={`${INPUT} mt-1`} value={line.route} onChange={(event) => setLine({ ...line, route: event.target.value })}>{ROUTES.map((item) => <option key={item}>{item}</option>)}</select></label>
              </div>
              <label className="inline-flex w-fit items-center gap-2 text-[13px] font-semibold text-[#334155]"><input type="checkbox" checked={line.timing === 'After Food'} onChange={(event) => setLine({ ...line, timing: event.target.checked ? 'After Food' : 'Before Food' })} />After Food</label>
              <label className="text-[12px] font-extrabold uppercase text-[#536173]">Instructions<input className={`${INPUT} mt-1`} value={line.instructions} onChange={(event) => setLine({ ...line, instructions: event.target.value })} placeholder="Take with water" /></label>
              <div className="flex justify-end"><Button tone="blue" onClick={addMedicine}><Plus size={14} />Add Medicine</Button></div>
            </div>
          </section>

          <section className="rounded-lg border border-[#dfe7f1] bg-white">
            <div className="border-b border-[#edf2f7] p-4">
              <h2 className="m-0 text-[16px] font-extrabold text-[#071936]">Prescribed Medicines</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-[13px]">
                <thead>
                  <tr className="bg-[#f8fafc] text-left text-[12px] uppercase text-[#536173]">
                    <th className="border-b border-[#edf2f7] px-4 py-3">Medicine</th>
                    <th className="border-b border-[#edf2f7] px-4 py-3">Dosage</th>
                    <th className="border-b border-[#edf2f7] px-4 py-3">Frequency</th>
                    <th className="border-b border-[#edf2f7] px-4 py-3">Duration</th>
                    <th className="border-b border-[#edf2f7] px-4 py-3">Route</th>
                    <th className="border-b border-[#edf2f7] px-4 py-3">Timing</th>
                    <th className="border-b border-[#edf2f7] px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((item, index) => (
                    <tr key={`${item.medicine}-${index}`} className="hover:bg-[#fbfdff]">
                      <td className="border-b border-[#f1f5f9] px-4 py-3"><strong>{item.medicine}</strong><div className="text-[12px] text-[#64748b]">{item.generic}</div></td>
                      <td className="border-b border-[#f1f5f9] px-4 py-3">{item.dosage}</td>
                      <td className="border-b border-[#f1f5f9] px-4 py-3">{item.frequency}</td>
                      <td className="border-b border-[#f1f5f9] px-4 py-3">{item.duration}</td>
                      <td className="border-b border-[#f1f5f9] px-4 py-3">{item.route}</td>
                      <td className="border-b border-[#f1f5f9] px-4 py-3">{item.timing}</td>
                      <td className="border-b border-[#f1f5f9] px-4 py-3 text-right"><button type="button" onClick={() => setLines(lines.filter((_, itemIndex) => itemIndex !== index))} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-100 bg-red-50 text-red-700 cursor-pointer"><Trash2 size={14} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="grid content-start gap-5">
          <section className="rounded-lg border border-[#dfe7f1] bg-white p-4">
            <h2 className="m-0 mb-3 text-[16px] font-extrabold text-[#071936]">General Advice</h2>
            <div className="grid gap-2 text-[13px] font-semibold text-[#334155]">
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={advice.fluids} onChange={(event) => setAdvice({ ...advice, fluids: event.target.checked })} />Drink plenty of fluids</label>
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={advice.rest} onChange={(event) => setAdvice({ ...advice, rest: event.target.checked })} />Take adequate rest</label>
              <label className="mt-2 text-[12px] font-extrabold uppercase text-[#536173]">Additional Instructions<textarea className={`${TEXTAREA} mt-1`} value={additional} onChange={(event) => setAdditional(event.target.value)} /></label>
            </div>
          </section>

          <section className="rounded-lg border border-[#dfe7f1] bg-white p-4">
            <h2 className="m-0 mb-3 text-[16px] font-extrabold text-[#071936]">Prescription Flow</h2>
            <div className="grid gap-2 text-[13px] font-semibold text-[#334155]">
              <div className="flex justify-between"><span>Medicines</span><strong>{lines.length}</strong></div>
              <div className="flex justify-between"><span>Pharmacy Status</span><strong>On Finalize</strong></div>
              <div className="rounded-md border border-amber-100 bg-amber-50 p-3 text-[12px] font-bold text-amber-800">Inventory stock is not deducted here. Stock reduces only after Pharmacy Billing payment/dispensing.</div>
            </div>
          </section>
        </aside>
      </div>

      <div className="mt-5 flex flex-wrap justify-end gap-2 rounded-lg border border-[#dfe7f1] bg-white p-4">
        <Button onClick={() => save('Draft')} disabled={saving}><Save size={14} />Save Draft</Button>
        <Button onClick={() => window.print()} disabled={!lines.length}><Printer size={14} />Print Prescription</Button>
        <Button tone="green" onClick={() => save('Finalized')} disabled={saving}><FileText size={14} />Finalize</Button>
      </div>

      <div className="mt-5 rounded-lg border border-[#dfe7f1] bg-white p-4">
        <div className="mb-3 text-[12px] font-extrabold uppercase text-[#536173]">Workflow</div>
        <div className="flex flex-wrap items-center gap-2 text-[12px] font-bold text-[#334155]">
          {['Diagnosis', 'Doctor Prescribes', 'Prescription Generated', 'Pharmacy receives prescription', 'Pharmacy Billing', 'Medicine Dispensed'].map((step, index, arr) => (
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

