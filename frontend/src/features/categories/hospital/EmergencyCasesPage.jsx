import { useMemo, useState } from 'react';
import {
  Activity,
  Ambulance,
  BedDouble,
  ClipboardList,
  FileText,
  FlaskConical,
  HeartPulse,
  Pill,
  Plus,
  Search,
  Stethoscope,
  Syringe,
  UserCheck,
} from 'lucide-react';

import { useLookupRecords, useModuleRecords, names } from '../shared/recordUi/useModuleRecords.js';

const INPUT = 'h-10 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-[inherit] text-[#111827] outline-none focus:border-red-500';
const TH = 'px-4 py-3 text-left text-[11px] font-extrabold uppercase text-[#536173]';
const TD = 'border-t border-[#edf2f7] px-4 py-3 text-[13px]';
const PRIORITIES = ['All', 'CRITICAL', 'URGENT', 'SEMI-URGENT', 'NON-URGENT'];
const STATUSES = ['Status', 'REGISTERED', 'TRIAGED', 'WAITING', 'IN TREATMENT', 'DISCHARGED', 'ADMITTED', 'TRANSFERRED'];
const TABS = ['Overview', 'Triage', 'Vitals', 'Doctor Notes', 'Diagnosis', 'Orders', 'Medication', 'Procedures', 'Diagnostics', 'Billing', 'Admission'];


function normalize(value = '') {
  return String(value || '').trim().toLowerCase();
}

function displayTime(value = '') {
  if (!value) return '-';
  if (/[AP]M/i.test(value)) return value;
  const [hour, minute] = String(value).split(':').map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return value;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  return `${String(hour % 12 || 12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${suffix}`;
}

function priorityOf(data = {}) {
  if (data.triagePriority) return data.triagePriority;
  if (data.status === 'Red') return 'CRITICAL';
  if (data.status === 'Orange') return 'URGENT';
  if (data.status === 'Yellow') return 'SEMI-URGENT';
  if (data.status === 'Green') return 'NON-URGENT';
  return 'NORMAL';
}

function statusOf(data = {}) {
  return data.caseStatus || (data.triageTime ? 'TRIAGED' : 'REGISTERED');
}

function priorityTone(priority) {
  if (priority === 'CRITICAL') return 'border-red-200 bg-red-50 text-red-700';
  if (priority === 'URGENT') return 'border-orange-200 bg-orange-50 text-orange-700';
  if (priority === 'SEMI-URGENT') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-emerald-200 bg-emerald-50 text-emerald-700';
}

function Button({ children, icon: Icon, onClick, tone = 'white', disabled = false }) {
  const tones = {
    red: 'border-red-600 bg-red-600 text-white hover:bg-red-700',
    blue: 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700',
    green: 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100',
    white: 'border-[#dbe4ef] bg-white text-[#374151] hover:bg-gray-50',
  };
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-[13px] font-semibold ${tones[tone]} font-[inherit] transition disabled:cursor-not-allowed disabled:opacity-60`}>
      {Icon && <Icon size={15} />}
      {children}
    </button>
  );
}

function InfoGrid({ items }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-md border border-[#edf2f7] bg-[#f8fbff] p-3">
          <div className="text-[11px] font-extrabold uppercase text-[#64748b]">{label}</div>
          <div className="mt-1 text-[13px] font-extrabold text-[#071936]">{value || '-'}</div>
        </div>
      ))}
    </div>
  );
}

export function EmergencyCasesPage() {
  const emergencies = useModuleRecords('hospital/emergency-cases');
  const doctors = useLookupRecords('hospital/doctors');
  const [search, setSearch] = useState('');
  const [scopeFilter, setScopeFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [doctorFilter, setDoctorFilter] = useState('Doctor');
  const [statusFilter, setStatusFilter] = useState('Status');
  const [selectedId, setSelectedId] = useState('');
  const [activeTab, setActiveTab] = useState('Overview');
  const [message, setMessage] = useState('');

  const records = emergencies.records;
  const doctorOptions = useMemo(() => {
    const existing = names(doctors.records);
    const fromCases = [...new Set(records.map((record) => record.data?.doctorName).filter(Boolean))];
    return ['Doctor', ...new Set([...existing, ...fromCases])];
  }, [doctors.records, records]);

  const filtered = useMemo(() => {
    const q = normalize(search);
    return records.filter((record) => {
      const data = record.data || {};
      const priority = priorityOf(data);
      const status = statusOf(data);
      const matchesSearch = !q || normalize([data.patientName, data.erNo, data.patientId, data.mobile].filter(Boolean).join(' ')).includes(q);
      const matchesScope = scopeFilter === 'All' || data.emergencyType === scopeFilter || data.arrivalMode === scopeFilter;
      const matchesPriority = priorityFilter === 'All' || priority === priorityFilter || (priorityFilter === 'Critical' && priority === 'CRITICAL');
      const matchesDoctor = doctorFilter === 'Doctor' || data.doctorName === doctorFilter;
      const matchesStatus = statusFilter === 'Status' || status === statusFilter;
      return matchesSearch && matchesScope && matchesPriority && matchesDoctor && matchesStatus;
    });
  }, [doctorFilter, priorityFilter, records, scopeFilter, search, statusFilter]);

  const selected = records.find((record) => record._id === selectedId) || filtered[0] || records[0] || null;
  const data = selected?.data || {};
  const priority = priorityOf(data);
  const currentStatus = statusOf(data);

  async function updateCase(patch, notice) {
    if (!selected) return;
    const payload = {
      ...data,
      ...patch,
      name: data.name || `${data.erNo || 'ER'} - ${data.patientName || 'Patient'}`,
      workflow: 'REGISTERED -> TRIAGED -> WAITING -> IN TREATMENT -> DISCHARGED / ADMITTED / TRANSFERRED',
    };
    await emergencies.update(selected._id, payload);
    setMessage(notice);
  }

  function action(label) {
    const updates = {
      'Start Treatment': { caseStatus: 'IN TREATMENT' },
      'Order Lab': { labOrders: [...(data.labOrders || []), { date: new Date().toISOString(), status: 'Ordered' }] },
      'Order Radiology': { radiologyOrders: [...(data.radiologyOrders || []), { date: new Date().toISOString(), status: 'Ordered' }] },
      'Prescribe Medicine': { medicationStatus: 'Prescription Required' },
      'Add Procedure': { procedureStatus: 'Procedure Added' },
      'Admit Patient': { caseStatus: 'ADMITTED', ipdStatus: 'Admitted' },
      Transfer: { caseStatus: 'TRANSFERRED' },
      Discharge: { caseStatus: 'DISCHARGED' },
    };
    updateCase(updates[label] || {}, `${label} recorded for ${data.erNo || 'case'}.`);
  }

  return (
    <div className="p-4 md:p-7">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 text-[13px] font-semibold text-[#64748b]">Home &gt; Emergency & OT &gt; Emergency Cases</div>
          <h1 className="m-0 text-[26px] font-extrabold text-[#071936]">Emergency Cases</h1>
          <p className="m-0 mt-1 text-[13px] font-semibold text-[#64748b]">Emergency 360 workspace for treatment, notes, orders, admission, transfer, and discharge.</p>
        </div>
        <span className={`rounded-full border px-3 py-1.5 text-[12px] font-extrabold ${priorityTone(priority)}`}>{priority}</span>
      </div>

      {message && <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-[13px] font-semibold text-green-700">{message}</div>}

      <section className="mb-5 rounded-lg border border-[#dfe7f1] bg-white">
        <div className="grid gap-3 border-b border-[#edf2f7] p-4 lg:grid-cols-[minmax(260px,1fr)_130px_150px_180px_170px]">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
            <input className="h-10 w-full rounded-md border border-[#dbe4ef] bg-white pl-9 pr-3 text-[13px] font-[inherit] outline-none focus:border-red-500" placeholder="Patient / ER No" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <select className={INPUT} value={scopeFilter} onChange={(event) => setScopeFilter(event.target.value)}>{['All', 'Medical', 'Surgical', 'Trauma', 'Accident', 'Ambulance', 'Walk-in'].map((item) => <option key={item}>{item}</option>)}</select>
          <select className={INPUT} value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>{PRIORITIES.map((item) => <option key={item}>{item}</option>)}</select>
          <select className={INPUT} value={doctorFilter} onChange={(event) => setDoctorFilter(event.target.value)}>{doctorOptions.map((item) => <option key={item}>{item}</option>)}</select>
          <select className={INPUT} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>{STATUSES.map((item) => <option key={item}>{item}</option>)}</select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead className="bg-[#f8fbff]">
              <tr>
                <th className={TH}>ER No</th>
                <th className={TH}>Patient</th>
                <th className={TH}>Priority</th>
                <th className={TH}>Doctor</th>
                <th className={TH}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((record) => {
                const row = record.data || {};
                const rowPriority = priorityOf(row);
                const active = selected?._id === record._id;
                return (
                  <tr key={record._id} onClick={() => { setSelectedId(record._id); setActiveTab('Overview'); }} className={`cursor-pointer ${active ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                    <td className={`${TD} font-extrabold text-[#071936]`}>{row.erNo || 'ER'}</td>
                    <td className={`${TD} font-semibold text-[#334155]`}>{row.patientName || 'Patient'}</td>
                    <td className={TD}><span className={`rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${priorityTone(rowPriority)}`}>{rowPriority}</span></td>
                    <td className={`${TD} font-semibold text-[#334155]`}>{row.doctorName || 'Unassigned'}</td>
                    <td className={`${TD} font-extrabold text-[#071936]`}>{statusOf(row)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {selected && (
        <section className="rounded-lg border border-[#dfe7f1] bg-white">
          <div className="grid gap-4 border-b border-[#edf2f7] bg-[#fbfdff] p-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div>
              <div className="text-[12px] font-extrabold uppercase text-[#536173]">Emergency Case</div>
              <h2 className="m-0 mt-3 text-[24px] font-extrabold text-[#071936]">{data.patientName || 'Patient'}</h2>
              <div className="mt-1 text-[13px] font-semibold text-[#334155]">{data.erNo || 'ER'} - IPD: {data.ipdStatus || 'Not Admitted'}</div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-3 py-1.5 text-[12px] font-extrabold ${priorityTone(priority)}`}>{priority}</span>
                <span className="rounded-full border border-[#dbe4ef] bg-white px-3 py-1.5 text-[12px] font-extrabold text-[#334155]">Arrival {displayTime(data.arrivalTime)}</span>
              </div>
            </div>
            <div className="rounded-lg border border-[#dbe4ef] bg-white p-3">
              <div className="text-[12px] font-extrabold uppercase text-[#536173]">Doctor Assignment</div>
              <select className={`${INPUT} mt-2`} value={data.doctorName || ''} onChange={(event) => updateCase({ doctorName: event.target.value }, 'Emergency doctor assigned.')}>
                <option value="">Unassigned</option>
                {doctorOptions.filter((item) => item !== 'Doctor').map((doctor) => <option key={doctor}>{doctor}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-1 overflow-x-auto border-b border-[#edf2f7] px-4 py-2">
            {TABS.map((tab) => (
              <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`h-9 rounded-md border px-3 text-[12px] font-extrabold ${activeTab === tab ? 'border-blue-600 bg-blue-600 text-white' : 'border-transparent bg-white text-[#334155] hover:border-[#dbe4ef] hover:bg-gray-50'}`}>
                {tab}
              </button>
            ))}
          </div>

          <div className="grid gap-5 p-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <main className="min-h-[240px]">
              {activeTab === 'Overview' && <InfoGrid items={[['Current Status', currentStatus], ['Emergency Type', data.emergencyType], ['Arrival Mode', data.arrivalMode], ['Chief Complaint', data.chiefComplaint], ['Ambulance Info', data.ambulanceInfo], ['Emergency Contact', data.emergencyContactName || data.emergencyContactMobile]]} />}
              {activeTab === 'Triage' && <InfoGrid items={[['Priority', priority], ['Queue Meaning', priority === 'CRITICAL' ? 'Immediate' : priority === 'URGENT' ? 'Very Soon' : priority === 'SEMI-URGENT' ? 'Priority' : 'Normal'], ['Triage Nurse', data.triageNurse], ['Triage Time', data.triageTime ? new Date(data.triageTime).toLocaleString('en-IN') : '-'], ['Observation', data.observation || data.triageNotes], ['Pain Score', data.painScore]]} />}
              {activeTab === 'Vitals' && <InfoGrid items={[['BP', data.bp], ['Temperature', data.temperature], ['Pulse', data.pulse], ['SpO2', data.spo2], ['Respiratory Rate', data.respiratoryRate], ['GCS', data.gcs]]} />}
              {activeTab === 'Doctor Notes' && <EditableCaseText label="Doctor Notes" value={data.doctorNotes || ''} onSave={(value) => updateCase({ doctorNotes: value }, 'Doctor notes saved.')} />}
              {activeTab === 'Diagnosis' && <EditableCaseText label="Diagnosis" value={data.diagnosis || ''} onSave={(value) => updateCase({ diagnosis: value }, 'Diagnosis saved.')} />}
              {activeTab === 'Orders' && <InfoGrid items={[['Lab Orders', (data.labOrders || []).length], ['Radiology Orders', (data.radiologyOrders || []).length], ['Medication Status', data.medicationStatus], ['Procedure Status', data.procedureStatus]]} />}
              {activeTab === 'Medication' && <EditableCaseText label="Medication" value={data.medication || ''} onSave={(value) => updateCase({ medication: value }, 'Medication notes saved.')} />}
              {activeTab === 'Procedures' && <EditableCaseText label="Procedures" value={data.procedures || ''} onSave={(value) => updateCase({ procedures: value }, 'Procedure notes saved.')} />}
              {activeTab === 'Diagnostics' && <EditableCaseText label="Diagnostics" value={data.diagnostics || ''} onSave={(value) => updateCase({ diagnostics: value }, 'Diagnostic notes saved.')} />}
              {activeTab === 'Billing' && <InfoGrid items={[['Billing Status', data.billing || 'Emergency billing pending'], ['Billing Module', 'Billing > New Bill'], ['Case Type', 'Emergency']]} />}
              {activeTab === 'Admission' && <InfoGrid items={[['IPD Status', data.ipdStatus || 'Not Admitted'], ['Admission Action', currentStatus === 'ADMITTED' ? 'Completed' : 'Use Admit Patient'], ['Transfer Status', currentStatus === 'TRANSFERRED' ? 'Transferred' : '-'], ['Discharge Status', currentStatus === 'DISCHARGED' ? 'Discharged' : '-']]} />}
            </main>

            <aside className="space-y-4">
              <div className="rounded-lg border border-[#dfe7f1] bg-[#f8fbff] p-4">
                <div className="mb-2 text-[12px] font-extrabold uppercase text-[#536173]">Current Status</div>
                <div className="text-[20px] font-extrabold text-[#071936]">{currentStatus}</div>
              </div>
              <div className="rounded-lg border border-[#dfe7f1] bg-white p-4">
                <div className="mb-3 text-[14px] font-extrabold text-[#071936]">Emergency Actions</div>
                <div className="grid gap-2">
                  <Button icon={Activity} tone="red" onClick={() => action('Start Treatment')}>Start Treatment</Button>
                  <Button icon={FlaskConical} onClick={() => action('Order Lab')}>Order Lab</Button>
                  <Button icon={Stethoscope} onClick={() => action('Order Radiology')}>Order Radiology</Button>
                  <Button icon={Pill} onClick={() => action('Prescribe Medicine')}>Prescribe Medicine</Button>
                  <Button icon={Syringe} onClick={() => action('Add Procedure')}>Add Procedure</Button>
                  <Button icon={BedDouble} tone="blue" onClick={() => action('Admit Patient')}>Admit Patient</Button>
                  <Button icon={Ambulance} tone="amber" onClick={() => action('Transfer')}>Transfer</Button>
                  <Button icon={UserCheck} tone="green" onClick={() => action('Discharge')}>Discharge</Button>
                </div>
              </div>
              <div className="rounded-lg border border-[#dfe7f1] bg-white p-4 text-[13px] font-semibold text-[#334155]">
                <div className="mb-2 flex items-center gap-2 font-extrabold text-[#071936]"><ClipboardList size={15} />Case Flow</div>
                REGISTERED &gt; TRIAGED &gt; WAITING &gt; IN TREATMENT &gt; DISCHARGED / ADMITTED / TRANSFERRED
              </div>
            </aside>
          </div>
        </section>
      )}
    </div>
  );
}

function EditableCaseText({ label, value, onSave }) {
  const [text, setText] = useState(value);
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-[14px] font-extrabold text-[#071936]"><FileText size={15} />{label}</div>
      <textarea className={`${INPUT} min-h-40 py-3`} value={text} onChange={(event) => setText(event.target.value)} />
      <div className="mt-3 flex justify-end">
        <Button icon={Plus} tone="blue" onClick={() => onSave(text)}>Save {label}</Button>
      </div>
    </div>
  );
}

