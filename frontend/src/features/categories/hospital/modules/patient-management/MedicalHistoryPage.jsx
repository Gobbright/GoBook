import { useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, HeartPulse, Pill, Plus, Search, Stethoscope, User } from 'lucide-react';

import { useModuleRecords } from '../../../shared/recordUi/useModuleRecords.js';
import { FormModal } from '../../../shared/recordUi/FormModal.jsx';
import { RowActions } from '../../../shared/recordUi/RowActions.jsx';
import { fmtDate } from '../../../shared/recordUi/dateUtils.js';

const TABS = ['Summary', 'Conditions', 'Allergies', 'Surgeries', 'Medications', 'Family History'];
const SELECT = 'h-8 rounded-md border border-[#dbe4ef] bg-white px-2.5 text-[12.5px] font-[inherit] text-[#374151] outline-none focus:border-blue-500';

const FIELD_MAP = {
  Conditions: [
    { key: 'patientName', label: 'Patient', required: true },
    { key: 'condition', label: 'Condition/Diagnosis', required: true },
    { key: 'diagnosedDate', label: 'Diagnosed Date', type: 'date' },
    { key: 'doctor', label: 'Doctor' },
    { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Controlled', 'Resolved'] },
    { key: 'notes', label: 'Notes', type: 'textarea', full: true },
  ],
  Allergies: [
    { key: 'patientName', label: 'Patient', required: true },
    { key: 'allergy', label: 'Allergy', required: true },
    { key: 'allergyType', label: 'Allergy Type', type: 'select', options: ['Drug', 'Food', 'Environmental', 'Latex', 'Other'] },
    { key: 'reaction', label: 'Reaction' },
    { key: 'severity', label: 'Severity', type: 'select', options: ['Low', 'Medium', 'High'] },
  ],
  Surgeries: [
    { key: 'patientName', label: 'Patient', required: true },
    { key: 'procedure', label: 'Procedure', required: true },
    { key: 'hospital', label: 'Hospital' },
    { key: 'surgeon', label: 'Surgeon' },
    { key: 'date', label: 'Date', type: 'date' },
    { key: 'notes', label: 'Notes', type: 'textarea', full: true },
  ],
  Medications: [
    { key: 'patientName', label: 'Patient', required: true },
    { key: 'medicine', label: 'Medicine', required: true },
    { key: 'dosage', label: 'Dosage' },
    { key: 'frequency', label: 'Frequency' },
    { key: 'startDate', label: 'Start Date', type: 'date' },
    { key: 'endDate', label: 'End Date', type: 'date' },
  ],
  'Family History': [
    { key: 'patientName', label: 'Patient', required: true },
    { key: 'diabetes', label: 'Diabetes', type: 'select', options: ['No', 'Yes'] },
    { key: 'hypertension', label: 'Hypertension', type: 'select', options: ['No', 'Yes'] },
    { key: 'heartDisease', label: 'Heart Disease', type: 'select', options: ['No', 'Yes'] },
    { key: 'cancer', label: 'Cancer', type: 'select', options: ['No', 'Yes'] },
    { key: 'other', label: 'Other hereditary conditions', type: 'textarea', full: true },
  ],
};

function patientText(patient) {
  const data = patient?.data || {};
  return [data.name, data.patientId, data.age ? `${data.age} Years` : '', data.gender, data.bloodGroup].filter(Boolean).join(' | ');
}

function findDate(data = {}) {
  return data.diagnosedDate || data.date || data.startDate || data.createdAt;
}

function entryTitle(data = {}) {
  return data.condition || data.allergy || data.procedure || data.medicine || data.other || 'Medical entry';
}

function entrySubtitle(category, data = {}) {
  if (category === 'Conditions') return [data.doctor, data.status, data.notes].filter(Boolean).join(' - ');
  if (category === 'Allergies') return [data.allergyType, data.reaction, data.severity].filter(Boolean).join(' - ');
  if (category === 'Surgeries') return [data.hospital, data.surgeon, data.notes].filter(Boolean).join(' - ');
  if (category === 'Medications') return [data.dosage, data.frequency].filter(Boolean).join(' - ');
  if (category === 'Family History') return ['Diabetes', 'Hypertension', 'Heart Disease', 'Cancer'].filter((key) => data[key[0].toLowerCase() + key.slice(1).replace(/\s/g, '')] === 'Yes').join(', ') || data.other || 'No hereditary risks marked';
  return '';
}

function SummaryCard({ label, value, tone = 'blue' }) {
  const tones = {
    blue: 'border-blue-200 bg-blue-50 text-blue-800',
    red: 'border-red-200 bg-red-50 text-red-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
  };
  return (
    <div className={`rounded-lg border p-3 ${tones[tone] || tones.blue}`}>
      <div className="text-[11px] font-extrabold uppercase tracking-wide opacity-75">{label}</div>
      <div className="mt-1 truncate text-[16px] font-extrabold">{value || '-'}</div>
    </div>
  );
}

function DataTable({ category, rows, onEdit, onDelete }) {
  if (rows.length === 0) return <div className="rounded-lg border border-[#dfe7f1] bg-white py-8 text-center text-[13px] text-[#536173]">No {category.toLowerCase()} recorded.</div>;
  return (
    <div className="overflow-x-auto rounded-lg border border-[#dfe7f1] bg-white">
      <table className="w-full min-w-[720px] border-collapse">
        <thead>
          <tr className="bg-[#f8fafc] text-left text-[11px] uppercase tracking-wide text-[#64748b]">
            <th className="px-3 py-2">Details</th>
            <th className="px-3 py-2">Date</th>
            <th className="px-3 py-2">Status / Severity</th>
            <th className="px-3 py-2">Notes</th>
            <th className="px-3 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((record) => {
            const data = record.data || {};
            const risk = category === 'Allergies' && data.severity === 'High';
            return (
              <tr key={record._id} className={`border-t border-[#edf2f7] text-[13px] ${risk ? 'bg-red-50' : ''}`}>
                <td className="px-3 py-2 font-semibold text-[#111827]">{entryTitle(data)}</td>
                <td className="px-3 py-2 text-[#374151]">{fmtDate(findDate(data))}</td>
                <td className={`px-3 py-2 font-semibold ${risk ? 'text-red-700' : 'text-[#374151]'}`}>{data.status || data.severity || '-'}</td>
                <td className="px-3 py-2 text-[#536173]">{entrySubtitle(category, data) || '-'}</td>
                <td className="px-3 py-2"><RowActions onEdit={() => onEdit(record)} onDelete={() => onDelete(record)} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function MedicalHistoryPage() {
  const patients = useModuleRecords('hospital/patients');
  const history = useModuleRecords('hospital/medical-history');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [activeTab, setActiveTab] = useState('Summary');
  const [modal, setModal] = useState(null);

  const matchingPatients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return patients.records.slice(0, 8);
    return patients.records.filter((record) => {
      const data = record.data || {};
      return [data.patientId, data.name, data.phone, data.mobile, data.email].filter(Boolean).join(' ').toLowerCase().includes(q);
    }).slice(0, 8);
  }, [patients.records, search]);

  const selectedPatient = patients.records.find((record) => record._id === selectedId) || matchingPatients[0] || null;
  const selectedName = selectedPatient?.data?.name || '';

  const patientRows = useMemo(() => (
    history.records.filter((record) => record.data?.patientName === selectedName)
  ), [history.records, selectedName]);

  const rowsByCategory = useMemo(() => {
    const grouped = {};
    TABS.slice(1).forEach((tab) => { grouped[tab] = []; });
    patientRows.forEach((record) => {
      const category = record.data?.category || 'Conditions';
      if (grouped[category]) grouped[category].push(record);
    });
    return grouped;
  }, [patientRows]);

  const highRiskAllergies = rowsByCategory.Allergies.filter((record) => record.data?.severity === 'High');
  const summaryConditions = rowsByCategory.Conditions.map((record) => record.data?.condition).filter(Boolean).join(', ');
  const summaryAllergies = rowsByCategory.Allergies.map((record) => record.data?.allergy).filter(Boolean).join(', ');

  const timeline = useMemo(() => {
    const registration = selectedPatient ? [{
      id: `registered-${selectedPatient._id}`,
      date: selectedPatient.createdAt,
      title: 'Patient Registered',
      detail: selectedPatient.data?.patientId || selectedPatient.data?.name,
      icon: User,
    }] : [];
    const entries = patientRows.map((record) => ({
      id: record._id,
      date: findDate(record.data) || record.createdAt,
      title: record.data?.category || 'Medical History',
      detail: `${entryTitle(record.data)}${entrySubtitle(record.data?.category, record.data) ? ` - ${entrySubtitle(record.data?.category, record.data)}` : ''}`,
      icon: record.data?.category === 'Medications' ? Pill : record.data?.category === 'Allergies' ? AlertTriangle : Stethoscope,
    }));
    return [...entries, ...registration].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }, [patientRows, selectedPatient]);

  const lookupOptions = { 'hospital/patients': patients.records.map((record) => record.data?.name).filter(Boolean) };

  async function submit(form) {
    const payload = { ...form, category: modal.category };
    if (modal.mode === 'edit') await history.update(modal.record._id, payload);
    else await history.create(payload);
    setModal(null);
  }

  async function deleteRecord(record) {
    if (!window.confirm('Delete this medical history entry?')) return;
    await history.remove(record._id);
  }

  function openAdd(category) {
    if (!selectedPatient) return;
    setModal({ mode: 'add', category, record: { data: { patientName: selectedName, status: category === 'Conditions' ? 'Active' : undefined, severity: category === 'Allergies' ? 'Low' : undefined } } });
  }

  return (
    <div className="p-3 md:p-4">
      {modal && (
        <FormModal
          title={modal.mode === 'edit' ? `Edit ${modal.category}` : `Add ${modal.category}`}
          fields={FIELD_MAP[modal.category]}
          initial={modal.record?.data}
          lookupOptions={lookupOptions}
          onSubmit={submit}
          onClose={() => setModal(null)}
          submitLabel={modal.mode === 'edit' ? 'Update' : 'Save'}
        />
      )}

      <div className="rounded-xl border border-[#dfe7f1] bg-white p-3">
        <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="m-0 text-[20px] font-extrabold text-[#111827]">Medical History</h1>
            <p className="m-0 text-[12px] text-[#536173]">Structured clinical data and timeline</p>
          </div>
          {activeTab !== 'Summary' && (
            <button type="button" onClick={() => openAdd(activeTab)} disabled={!selectedPatient} className="inline-flex h-8 items-center gap-2 rounded-md border border-blue-600 bg-blue-600 px-3 text-[12.5px] font-semibold text-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-50">
              <Plus size={14} />Add {activeTab}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[380px_1fr]">
          <div>
            <label className="mb-1 block text-[12px] font-semibold text-[#374151]">Patient</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
              <input className="h-9 w-full rounded-md border border-[#dbe4ef] bg-white pl-8 pr-3 text-[13px] font-[inherit] outline-none focus:border-blue-500" placeholder="Search Patient ID / Name / Mobile" value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
            <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-[#edf2f7]">
              {matchingPatients.map((patient) => (
                <button key={patient._id} type="button" onClick={() => setSelectedId(patient._id)} className={`block w-full border-0 border-b border-[#edf2f7] bg-white px-3 py-2 text-left text-[12.5px] cursor-pointer ${selectedPatient?._id === patient._id ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-[#374151] hover:bg-gray-50'}`}>
                  {patientText(patient)}
                </button>
              ))}
              {!patients.loading && matchingPatients.length === 0 && <div className="px-3 py-4 text-center text-[12.5px] text-[#536173]">No patients found.</div>}
            </div>
          </div>

          <div className="rounded-lg border border-[#edf2f7] bg-[#fbfdff] p-3">
            {selectedPatient ? (
              <>
                <div className="text-[14px] font-extrabold text-[#111827]">{selectedPatient.data?.name || 'Unnamed Patient'}</div>
                <div className="mt-1 text-[12.5px] text-[#536173]">{patientText(selectedPatient)}</div>
                {highRiskAllergies.length > 0 && (
                  <div className="mt-2 inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-[12px] font-semibold text-red-700">
                    <AlertTriangle size={14} />High-risk allergy: {highRiskAllergies.map((record) => record.data?.allergy).filter(Boolean).join(', ')}
                  </div>
                )}
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-[13px] text-[#536173]">Select a patient to view medical history.</div>
            )}
          </div>
        </div>
      </div>

      {selectedPatient && (
        <>
          <div className="mt-3 flex flex-wrap gap-1 rounded-xl border border-[#dfe7f1] bg-white p-2">
            {TABS.map((tab) => (
              <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`h-8 rounded-md border px-2.5 text-[12.5px] font-semibold cursor-pointer ${activeTab === tab ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-transparent bg-white text-[#536173] hover:bg-gray-50'}`}>{tab}</button>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[1fr_360px]">
            <div>
              {activeTab === 'Summary' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <SummaryCard label="Blood Group" value={selectedPatient.data?.bloodGroup} />
                    <SummaryCard label="Allergies" value={summaryAllergies || selectedPatient.data?.knownAllergies} tone={highRiskAllergies.length ? 'red' : 'amber'} />
                    <SummaryCard label="Conditions" value={summaryConditions || selectedPatient.data?.existingConditions} />
                  </div>
                  <div className="rounded-xl border border-[#dfe7f1] bg-white p-3">
                    <div className="mb-2 flex items-center gap-2 text-[13px] font-extrabold text-[#111827]"><HeartPulse size={15} />Medical Summary</div>
                    <p className="m-0 text-[13px] text-[#536173]">Use the tabs to maintain structured clinical details. High-risk allergies are highlighted for prescribing safety.</p>
                  </div>
                </div>
              ) : (
                <DataTable
                  category={activeTab}
                  rows={rowsByCategory[activeTab]}
                  onEdit={(record) => setModal({ mode: 'edit', category: activeTab, record })}
                  onDelete={deleteRecord}
                />
              )}
            </div>

            <div className="rounded-xl border border-[#dfe7f1] bg-white p-3">
              <div className="mb-3 flex items-center gap-2 text-[13px] font-extrabold text-[#111827]"><CalendarDays size={15} />Clinical Timeline</div>
              {history.loading ? (
                <div className="py-8 text-center text-[13px] text-[#536173]">Loading...</div>
              ) : timeline.length === 0 ? (
                <div className="py-8 text-center text-[13px] text-[#536173]">No timeline entries yet.</div>
              ) : (
                <div className="relative pl-5">
                  <div className="absolute left-[6px] top-1 bottom-1 w-px bg-[#dbe4ef]" />
                  <div className="space-y-3">
                    {timeline.map((item) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.id} className="relative">
                          <span className="absolute -left-5 top-1 flex h-3 w-3 items-center justify-center rounded-full bg-blue-600 ring-4 ring-white" />
                          <div className="text-[12px] font-extrabold text-[#111827]">{fmtDate(item.date)}</div>
                          <div className="mt-1 rounded-lg border border-[#edf2f7] bg-[#fbfdff] p-2">
                            <div className="flex items-center gap-2 text-[12.5px] font-semibold text-[#111827]"><Icon size={13} />{item.title}</div>
                            <div className="mt-1 text-[12px] text-[#536173]">{item.detail || '-'}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
