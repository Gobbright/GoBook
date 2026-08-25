import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, AlertTriangle, Clock3, Send, Stethoscope } from 'lucide-react';

import { useLookupRecords, useModuleRecords, names } from '../shared/recordUi/useModuleRecords.js';

const INPUT = 'h-10 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-[inherit] text-[#111827] outline-none focus:border-red-500';
const PRIORITIES = [
  { key: 'CRITICAL', queue: 'Red', label: 'Immediate', tone: 'border-red-300 bg-red-50 text-red-700' },
  { key: 'URGENT', queue: 'Orange', label: 'Very Soon', tone: 'border-orange-300 bg-orange-50 text-orange-700' },
  { key: 'SEMI-URGENT', queue: 'Yellow', label: 'Priority', tone: 'border-amber-300 bg-amber-50 text-amber-700' },
  { key: 'NON-URGENT', queue: 'Green', label: 'Normal', tone: 'border-emerald-300 bg-emerald-50 text-emerald-700' },
];


function displayTime(value = '') {
  if (!value) return '-';
  if (/[AP]M/i.test(value)) return value;
  const [hour, minute] = String(value).split(':').map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return value;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  return `${String(hour % 12 || 12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${suffix}`;
}

function priorityFromStatus(status = '') {
  return PRIORITIES.find((item) => item.queue === status || item.key === status)?.key || 'SEMI-URGENT';
}

function priorityMeta(priority) {
  return PRIORITIES.find((item) => item.key === priority) || PRIORITIES[2];
}

function Button({ children, icon: Icon, onClick, tone = 'white', disabled = false }) {
  const tones = {
    red: 'border-red-600 bg-red-600 text-white hover:bg-red-700',
    blue: 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700',
    white: 'border-[#dbe4ef] bg-white text-[#374151] hover:bg-gray-50',
  };
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-[13px] font-semibold ${tones[tone]} font-[inherit] transition disabled:cursor-not-allowed disabled:opacity-60`}>
      {Icon && <Icon size={15} />}
      {children}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-[12px] font-extrabold uppercase text-[#536173]">{label}</span>
      {children}
    </label>
  );
}

export function TriagePage() {
  const navigate = useNavigate();
  const emergencies = useModuleRecords('hospital/emergency-cases');
  const nurses = useLookupRecords('hospital/nurses');
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState({
    priority: 'SEMI-URGENT',
    bp: '',
    temperature: '',
    pulse: '',
    spo2: '',
    respiratoryRate: '',
    gcs: '',
    painScore: '',
    chiefComplaint: '',
    observation: '',
    triageNurse: '',
  });
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const cases = emergencies.records;
  const orderedCases = useMemo(() => [...cases].sort((a, b) => String(b.data?.createdAt || b.createdAt || '').localeCompare(String(a.data?.createdAt || a.createdAt || ''))), [cases]);
  const selected = orderedCases.find((record) => record._id === selectedId) || orderedCases[0] || null;
  const selectedData = selected?.data || {};
  const nurseOptions = useMemo(() => {
    const existing = names(nurses.records);
    return existing;
  }, [nurses.records]);
  const meta = priorityMeta(form.priority);

  function set(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setMessage('');
  }

  function selectCase(id) {
    const record = orderedCases.find((item) => item._id === id);
    const data = record?.data || {};
    setSelectedId(id);
    setForm((current) => ({
      ...current,
      priority: priorityFromStatus(data.triagePriority || data.priority || data.status),
      bp: data.bp || data.vitals?.bp || current.bp,
      temperature: data.temperature || data.vitals?.temperature || current.temperature,
      pulse: data.pulse || data.vitals?.pulse || current.pulse,
      spo2: data.spo2 || data.vitals?.spo2 || current.spo2,
      respiratoryRate: data.respiratoryRate || data.vitals?.respiratoryRate || current.respiratoryRate,
      gcs: data.gcs || data.vitals?.gcs || current.gcs,
      painScore: data.painScore || data.vitals?.painScore || current.painScore,
      chiefComplaint: data.chiefComplaint || current.chiefComplaint,
      observation: data.observation || data.triageNotes || current.observation,
      triageNurse: data.triageNurse || current.triageNurse,
    }));
  }

  async function saveTriage({ sendToQueue = false } = {}) {
    if (!selected) return;
    if (!form.chiefComplaint.trim()) {
      window.alert('Chief complaint is required.');
      return;
    }
    if (!form.triageNurse.trim()) {
      window.alert('Triage nurse is required.');
      return;
    }

    const payload = {
      ...selectedData,
      triagePriority: form.priority,
      priorityLabel: meta.label,
      status: meta.queue,
      triageStatus: sendToQueue ? 'Queued for Doctor / Emergency Team' : 'Triaged',
      bp: form.bp,
      temperature: form.temperature,
      pulse: form.pulse,
      spo2: form.spo2,
      respiratoryRate: form.respiratoryRate,
      gcs: form.gcs,
      painScore: form.painScore,
      chiefComplaint: form.chiefComplaint,
      observation: form.observation,
      triageNotes: form.observation,
      triageNurse: form.triageNurse,
      triageTime: new Date().toISOString(),
      isRetriage: Boolean(selectedData.triageTime),
      workflow: 'Emergency Registration -> Triage -> Priority Assigned -> Emergency Queue -> Doctor / Emergency Team',
      name: selectedData.name || `${selectedData.erNo || 'ER'} - ${selectedData.patientName || 'Patient'}`,
    };

    setSaving(true);
    try {
      await emergencies.update(selected._id, payload);
      setMessage(`${selectedData.erNo || 'Emergency'} triage saved as ${form.priority} (${meta.label}).`);
      if (sendToQueue) navigate('/hospital/emergency-cases');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 md:p-7">
      <div className="w-full rounded-lg border border-[#dfe7f1] bg-white">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#edf2f7] bg-[#fbfdff] p-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-red-50 text-red-600"><Stethoscope size={20} /></span>
            <div>
              <h1 className="m-0 text-[20px] font-extrabold uppercase text-[#071936]">Triage</h1>
              <p className="m-0 mt-0.5 text-[12px] font-semibold text-[#64748b]">Assign treatment urgency, capture vitals, and send to the emergency queue.</p>
            </div>
          </div>
          <div className={`rounded-md border px-3 py-2 text-[13px] font-extrabold ${meta.tone}`}>{form.priority}: {meta.label}</div>
        </div>

        {message && <div className="mx-4 mt-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-[13px] font-semibold text-green-700">{message}</div>}

        <div className="grid gap-5 p-4 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-lg border border-[#dfe7f1] bg-[#f8fbff]">
            <div className="border-b border-[#edf2f7] p-3 text-[12px] font-extrabold uppercase text-[#536173]">Emergency Cases</div>
            <div className="max-h-[70vh] overflow-y-auto">
              {orderedCases.map((record) => {
                const data = record.data || {};
                const active = selected?._id === record._id;
                const itemMeta = priorityMeta(priorityFromStatus(data.triagePriority || data.priority || data.status));
                return (
                  <button key={record._id} type="button" onClick={() => selectCase(record._id)} className={`w-full border-0 border-b border-[#edf2f7] bg-transparent p-3 text-left font-[inherit] cursor-pointer ${active ? 'bg-blue-50' : 'hover:bg-white'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-[13px] text-[#071936]">{data.erNo || 'ER'}</strong>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-extrabold ${itemMeta.tone}`}>{priorityFromStatus(data.triagePriority || data.priority || data.status)}</span>
                    </div>
                    <div className="mt-1 text-[12px] font-semibold text-[#334155]">{data.patientName || 'Patient'}</div>
                    <div className="mt-0.5 text-[11px] font-semibold text-[#64748b]">{displayTime(data.arrivalTime)} - {data.triageStatus || 'Waiting for Triage'}</div>
                  </button>
                );
              })}
            </div>
          </aside>

          <main>
            <section className="mb-5 rounded-lg border border-[#dfe7f1] bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-[13px] font-extrabold text-[#536173]">Emergency No: {selectedData.erNo || '-'}</div>
                  <h2 className="m-0 mt-4 text-[22px] font-extrabold text-[#071936]">{selectedData.patientName || 'No emergency case selected'}</h2>
                  <div className="mt-1 text-[13px] font-semibold text-[#64748b]">{selectedData.age || '-'} Y - {selectedData.gender || '-'}</div>
                  <div className="mt-1 text-[13px] font-semibold text-[#64748b]">Arrival: {displayTime(selectedData.arrivalTime)}</div>
                </div>
                <div className="rounded-md border border-[#dbe4ef] bg-[#f8fbff] px-3 py-2 text-[12px] font-extrabold text-[#334155]">
                  <Clock3 size={14} className="mr-1 inline" />{selectedData.triageTime ? 'Re-triage' : 'First triage'}
                </div>
              </div>
            </section>

            <section className="mb-5 rounded-lg border border-[#dfe7f1] bg-white p-4">
              <h2 className="m-0 mb-4 text-[14px] font-extrabold uppercase text-[#071936]">Triage Priority</h2>
              <div className="grid gap-3 md:grid-cols-4">
                {PRIORITIES.map((item) => (
                  <label key={item.key} className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 ${form.priority === item.key ? item.tone : 'border-[#dbe4ef] bg-white text-[#334155] hover:bg-gray-50'}`}>
                    <input type="radio" name="priority" className="mt-1" checked={form.priority === item.key} onChange={() => set('priority', item.key)} />
                    <span>
                      <span className="block text-[13px] font-extrabold">{item.key}</span>
                      <span className="mt-1 block text-[12px] font-bold">{item.label}</span>
                    </span>
                  </label>
                ))}
              </div>
            </section>

            <section className="mb-5 rounded-lg border border-[#dfe7f1] bg-white p-4">
              <h2 className="m-0 mb-4 text-[14px] font-extrabold uppercase text-[#071936]">Vitals</h2>
              <div className="grid gap-4 md:grid-cols-4">
                <Field label="BP"><input className={INPUT} value={form.bp} onChange={(event) => set('bp', event.target.value)} /></Field>
                <Field label="Temperature"><input className={INPUT} value={form.temperature} onChange={(event) => set('temperature', event.target.value)} /></Field>
                <Field label="Pulse"><input className={INPUT} value={form.pulse} onChange={(event) => set('pulse', event.target.value)} /></Field>
                <Field label="SpO2"><input className={INPUT} value={form.spo2} onChange={(event) => set('spo2', event.target.value)} /></Field>
                <Field label="Respiratory Rate"><input className={INPUT} value={form.respiratoryRate} onChange={(event) => set('respiratoryRate', event.target.value)} /></Field>
                <Field label="GCS"><input className={INPUT} value={form.gcs} onChange={(event) => set('gcs', event.target.value)} /></Field>
                <Field label="Pain Score"><input className={INPUT} value={form.painScore} onChange={(event) => set('painScore', event.target.value)} /></Field>
              </div>
            </section>

            <section className="rounded-lg border border-[#dfe7f1] bg-white p-4">
              <h2 className="m-0 mb-4 text-[14px] font-extrabold uppercase text-[#071936]">Chief Complaint</h2>
              <div className="grid gap-4">
                <Field label="Symptoms"><input className={INPUT} value={form.chiefComplaint} onChange={(event) => set('chiefComplaint', event.target.value)} /></Field>
                <Field label="Observation"><input className={INPUT} value={form.observation} onChange={(event) => set('observation', event.target.value)} /></Field>
                <Field label="Triage Nurse">
                  <select className={INPUT} value={form.triageNurse} onChange={(event) => set('triageNurse', event.target.value)}>
                    <option value="">Select nurse</option>`r`n                    {nurseOptions.map((nurse) => <option key={nurse}>{nurse}</option>)}
                  </select>
                </Field>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-[12px] font-extrabold text-red-700">
                  <Activity size={14} />Emergency Registration &gt; Triage &gt; Emergency Queue &gt; Doctor / Emergency Team
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button icon={AlertTriangle} onClick={() => saveTriage()} disabled={saving}>Save Triage</Button>
                  <Button icon={Send} tone="red" onClick={() => saveTriage({ sendToQueue: true })} disabled={saving}>Send to Emergency Queue</Button>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

