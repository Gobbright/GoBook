import { useMemo, useState } from 'react';
import {
  Activity, BedDouble, CalendarDays, Clock, FlaskConical,
  Pill, Search, Stethoscope,
} from 'lucide-react';

import { useLookupRecords, useModuleRecords, names } from '../shared/recordUi/useModuleRecords.js';
import { FormModal } from '../shared/recordUi/FormModal.jsx';
import { PageHeader } from '../shared/recordUi/PageHeader.jsx';
import { RowActions } from '../shared/recordUi/RowActions.jsx';
import { StatusBadge } from '../shared/recordUi/StatusBadge.jsx';
import { KanbanBoard } from '../shared/recordUi/KanbanBoard.jsx';
import { fmtDate, todayISO } from '../shared/recordUi/dateUtils.js';

function useHospitalLookups() {
  const patients = useLookupRecords('hospital/patients');
  const doctors = useLookupRecords('hospital/doctors');
  const departments = useLookupRecords('hospital/departments');
  const nurses = useLookupRecords('hospital/nurses');
  return {
    'hospital/patients': names(patients.records),
    'hospital/doctors': names(doctors.records),
    'hospital/departments': names(departments.records),
    'hospital/nurses': names(nurses.records),
  };
}

function FieldSummary({ data, fields }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-2">
      {fields.slice(0, 4).map((field) => (
        <div key={field.key} className="text-[12px] min-w-0">
          <span className="text-[#94a3b8]">{field.label}: </span>
          <span className="text-[#374151]">{data?.[field.key] || '-'}</span>
        </div>
      ))}
    </div>
  );
}

function recordTitle(record, keys = ['name', 'patientName', 'doctorName', 'testName', 'medicineName']) {
  return keys.map((key) => record.data?.[key]).find(Boolean) || 'Untitled';
}

function SearchBox({ value, onChange, placeholder }) {
  return (
    <div className="relative max-w-xs">
      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
      <input
        className="pl-8 pr-3 py-2 border border-[#dbe4ef] rounded-md text-[13px] outline-none focus:border-blue-500 w-full font-[inherit] bg-white"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function WorkflowModal({ modal, title, fields, lookupOptions, onClose, onSubmit }) {
  if (!modal) return null;
  return (
    <FormModal
      title={modal.mode === 'add' ? `New ${title}` : `Edit ${title}`}
      fields={fields}
      initial={modal.mode === 'edit' ? modal.record.data : modal.initial}
      lookupOptions={lookupOptions}
      onSubmit={onSubmit}
      onClose={onClose}
      submitLabel={modal.mode === 'add' ? 'Save' : 'Update'}
    />
  );
}

function Stat({ label, value, tone = 'blue' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <div className={`border rounded-lg px-4 py-3 ${tones[tone] || tones.blue}`}>
      <div className="text-[11px] uppercase tracking-wide opacity-75">{label}</div>
      <div className="text-xl font-bold mt-0.5">{value}</div>
    </div>
  );
}

export function PatientWorkflowPage({ moduleKey, title, group, subtitle, fields }) {
  const { records, loading, create, update, remove } = useModuleRecords(moduleKey);
  const lookupOptions = useHospitalLookups();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [modal, setModal] = useState(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? records.filter((r) => JSON.stringify(r.data || {}).toLowerCase().includes(q)) : records;
  }, [records, search]);
  const selected = records.find((r) => r._id === selectedId) || filtered[0] || null;

  async function submit(form) {
    if (modal.mode === 'edit') await update(modal.record._id, form);
    else await create(form);
    setModal(null);
  }

  async function del(id) {
    if (!window.confirm(`Delete this ${title.toLowerCase()} record?`)) return;
    await remove(id);
    if (selectedId === id) setSelectedId('');
  }

  return (
    <div className="p-4 md:p-7">
      <PageHeader title={title} group={group} subtitle={subtitle} actionLabel={`Add ${title}`} onAction={() => setModal({ mode: 'add' })} />
      <WorkflowModal modal={modal} title={title} fields={fields} lookupOptions={lookupOptions} onClose={() => setModal(null)} onSubmit={submit} />

      <div className="grid grid-cols-1 lg:grid-cols-[330px_1fr] gap-5">
        <div className="bg-white border border-[#dfe7f1] rounded-xl overflow-hidden">
          <div className="p-3 border-b border-[#edf2f7]"><SearchBox value={search} onChange={setSearch} placeholder={`Search ${title.toLowerCase()}...`} /></div>
          <div className="max-h-[70vh] overflow-y-auto">
            {loading ? <p className="text-[13px] text-[#536173] px-4 py-6 text-center">Loading...</p> : filtered.map((record) => (
              <button
                key={record._id}
                type="button"
                onClick={() => setSelectedId(record._id)}
                className={`w-full px-4 py-3 text-left bg-transparent border-0 border-b border-[#f3f4f6] cursor-pointer font-[inherit] ${selected?._id === record._id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
              >
                <div className="text-[13px] font-semibold text-[#111827] truncate">{recordTitle(record, ['name', 'patientName', 'documentName'])}</div>
                <div className="text-xs text-[#94a3b8] truncate">{record.data?.phone || record.data?.date || record.data?.status || 'EMR record'}</div>
              </button>
            ))}
            {!loading && filtered.length === 0 && <p className="text-[13px] text-[#536173] px-4 py-6 text-center">No records found.</p>}
          </div>
        </div>

        <div className="bg-white border border-[#dfe7f1] rounded-xl p-5">
          {!selected ? (
            <div className="py-16 text-center text-[13px] text-[#536173]">Select a record to view the full EMR details.</div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4 border-b border-[#edf2f7] pb-4">
                <div>
                  <h2 className="m-0 text-[18px] font-bold text-[#111827]">{recordTitle(selected, ['name', 'patientName', 'documentName'])}</h2>
                  {selected.data?.status && <div className="mt-2"><StatusBadge value={selected.data.status} /></div>}
                </div>
                <RowActions onEdit={() => setModal({ mode: 'edit', record: selected })} onDelete={() => del(selected._id)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                {fields.filter((f) => !f.full).map((field) => (
                  <div key={field.key}>
                    <div className="text-xs text-[#94a3b8] uppercase tracking-wide">{field.label}</div>
                    <div className="text-[13px] text-[#111827] font-medium mt-0.5">{selected.data?.[field.key] || '-'}</div>
                  </div>
                ))}
              </div>
              {fields.filter((f) => f.full).map((field) => (
                <div key={field.key} className="mt-5 pt-5 border-t border-[#edf2f7]">
                  <div className="text-xs text-[#94a3b8] uppercase tracking-wide">{field.label}</div>
                  <p className="text-[13px] text-[#374151] whitespace-pre-wrap">{selected.data?.[field.key] || '-'}</p>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function AppointmentWorkflowPage({ moduleKey, title, group, subtitle, fields, mode = 'schedule' }) {
  const { records, loading, create, update, remove } = useModuleRecords(moduleKey);
  const lookupOptions = useHospitalLookups();
  const [date, setDate] = useState(todayISO());
  const [modal, setModal] = useState(null);
  const rows = useMemo(() => records.filter((r) => !r.data?.date || r.data.date === date).sort((a, b) => (a.data?.time || '').localeCompare(b.data?.time || '')), [records, date]);
  const waiting = rows.filter((r) => ['Waiting', 'Scheduled'].includes(r.data?.status || 'Scheduled')).length;

  async function submit(form) {
    const next = { ...form, tokenNo: mode === 'token' && !form.tokenNo ? String(records.length + 1).padStart(3, '0') : form.tokenNo };
    if (modal.mode === 'edit') await update(modal.record._id, next);
    else await create(next);
    setModal(null);
  }
  async function del(id) {
    if (!window.confirm('Delete this appointment record?')) return;
    await remove(id);
  }

  return (
    <div className="p-4 md:p-7">
      <PageHeader title={title} group={group} subtitle={subtitle} actionLabel={mode === 'token' ? 'Generate Token' : `Add ${title}`} onAction={() => setModal({ mode: 'add', initial: { date, status: mode === 'queue' ? 'Waiting' : 'Scheduled' } })} />
      <WorkflowModal modal={modal} title={title} fields={fields} lookupOptions={lookupOptions} onClose={() => setModal(null)} onSubmit={submit} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Stat label="Selected Date" value={fmtDate(date)} />
        <Stat label="Total" value={rows.length} tone="green" />
        <Stat label="Waiting" value={waiting} tone="amber" />
        <Stat label="Done" value={rows.filter((r) => r.data?.status === 'Completed').length} tone="blue" />
      </div>
      <div className="bg-white border border-[#dfe7f1] rounded-xl p-4 mb-5 flex flex-wrap items-center gap-3">
        <CalendarDays size={16} className="text-blue-600" />
        <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" />
        <button type="button" onClick={() => setDate(todayISO())} className="text-[12px] text-blue-600 bg-transparent border-0 cursor-pointer font-[inherit] hover:underline">Today</button>
      </div>
      {mode === 'queue' || mode === 'token' ? (
        <KanbanBoard
          columns={['Scheduled', 'Waiting', 'In Consultation', 'Completed']}
          records={rows}
          statusKey="status"
          renderCard={(record) => (
            <div key={record._id} className="bg-white border border-[#dfe7f1] rounded-lg p-3">
              <div className="flex justify-between gap-2"><strong className="text-[13px] text-[#111827]">{record.data?.tokenNo ? `#${record.data.tokenNo} ` : ''}{record.data?.patientName || 'Patient'}</strong><RowActions onEdit={() => setModal({ mode: 'edit', record })} onDelete={() => del(record._id)} /></div>
              <div className="text-xs text-[#536173] mt-1">{record.data?.doctorName || 'No doctor'} · {record.data?.time || 'No time'}</div>
            </div>
          )}
        />
      ) : (
        <div className="bg-white border border-[#dfe7f1] rounded-xl divide-y divide-[#edf2f7]">
          {loading ? <p className="text-[13px] text-[#536173] px-5 py-8 text-center">Loading...</p> : rows.map((record) => (
            <div key={record._id} className="px-5 py-4 flex items-center gap-4">
              <div className="w-18 text-[13px] font-semibold text-[#111827] flex items-center gap-1"><Clock size={13} />{record.data?.time || '-'}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-[#111827]">{record.data?.patientName || 'Patient'}</div>
                <div className="text-xs text-[#94a3b8]">{record.data?.doctorName || 'No doctor'} · {record.data?.departmentName || 'No department'}</div>
              </div>
              <StatusBadge value={record.data?.status} />
              <RowActions onEdit={() => setModal({ mode: 'edit', record })} onDelete={() => del(record._id)} />
            </div>
          ))}
          {!loading && rows.length === 0 && <p className="text-[13px] text-[#536173] px-5 py-8 text-center">No appointments for this date.</p>}
        </div>
      )}
    </div>
  );
}

export function ClinicalWorkflowPage({ moduleKey, title, group, subtitle, fields, columns = ['Open', 'In Progress', 'Completed'] }) {
  const { records, loading, create, update, remove } = useModuleRecords(moduleKey);
  const lookupOptions = useHospitalLookups();
  const [patient, setPatient] = useState('');
  const [modal, setModal] = useState(null);
  const rows = patient ? records.filter((r) => r.data?.patientName === patient) : records;

  async function submit(form) {
    if (modal.mode === 'edit') await update(modal.record._id, form);
    else await create(form);
    setModal(null);
  }
  async function del(id) {
    if (!window.confirm('Delete this clinical record?')) return;
    await remove(id);
  }

  return (
    <div className="p-4 md:p-7">
      <PageHeader title={title} group={group} subtitle={subtitle} actionLabel={`Add ${title}`} onAction={() => setModal({ mode: 'add', initial: patient ? { patientName: patient, status: columns[0] } : { status: columns[0] } })} />
      <WorkflowModal modal={modal} title={title} fields={fields} lookupOptions={lookupOptions} onClose={() => setModal(null)} onSubmit={submit} />
      <div className="bg-white border border-[#dfe7f1] rounded-xl p-4 mb-5 flex items-center gap-3">
        <label className="text-[13px] font-medium text-[#374151]">Patient:</label>
        <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit] w-64" list="clinical-patients" placeholder="All patients" value={patient} onChange={(e) => setPatient(e.target.value)} />
        <datalist id="clinical-patients">{lookupOptions['hospital/patients'].map((name) => <option key={name} value={name} />)}</datalist>
        {patient && <button type="button" onClick={() => setPatient('')} className="text-[12px] text-blue-600 bg-transparent border-0 cursor-pointer font-[inherit] hover:underline">Clear</button>}
      </div>
      {loading ? <p className="text-[13px] text-[#536173] px-5 py-8 text-center">Loading...</p> : (
        <KanbanBoard
          columns={columns}
          records={rows}
          statusKey="status"
          renderCard={(record) => (
            <div key={record._id} className="bg-white border border-[#dfe7f1] rounded-lg p-3">
              <div className="flex items-start justify-between gap-2"><strong className="text-[13px] text-[#111827]">{record.data?.patientName || recordTitle(record)}</strong><RowActions onEdit={() => setModal({ mode: 'edit', record })} onDelete={() => del(record._id)} /></div>
              <div className="text-xs text-[#94a3b8] mt-1">{record.data?.doctorName || 'No doctor'} · {fmtDate(record.data?.date)}</div>
              {record.data?.notes && <p className="text-[12px] text-[#536173] mt-2 line-clamp-3">{record.data.notes}</p>}
            </div>
          )}
        />
      )}
    </div>
  );
}

export function EmergencyWorkflowPage({ moduleKey, title, group, subtitle, fields }) {
  return <ClinicalWorkflowPage moduleKey={moduleKey} title={title} group={group} subtitle={subtitle} fields={fields} columns={['Red', 'Orange', 'Yellow', 'Green', 'Discharged']} />;
}

export function DoctorWorkflowPage({ moduleKey, title, group, subtitle, fields }) {
  const { records, loading, create, update, remove } = useModuleRecords(moduleKey);
  const lookupOptions = useHospitalLookups();
  const [modal, setModal] = useState(null);
  async function submit(form) {
    if (modal.mode === 'edit') await update(modal.record._id, form);
    else await create(form);
    setModal(null);
  }
  async function del(id) {
    if (!window.confirm('Delete this doctor workflow record?')) return;
    await remove(id);
  }
  return (
    <div className="p-4 md:p-7">
      <PageHeader title={title} group={group} subtitle={subtitle} actionLabel={`Add ${title}`} onAction={() => setModal({ mode: 'add' })} />
      <WorkflowModal modal={modal} title={title} fields={fields} lookupOptions={lookupOptions} onClose={() => setModal(null)} onSubmit={submit} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? <p className="text-[13px] text-[#536173]">Loading...</p> : records.map((record) => (
          <div key={record._id} className="bg-white border border-[#dfe7f1] rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="w-11 h-11 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center"><Stethoscope size={18} /></span>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold text-[#111827] truncate">{recordTitle(record)}</div>
                <div className="text-xs text-[#94a3b8] truncate">{record.data?.departmentName || record.data?.specialization || 'Doctor workflow'}</div>
              </div>
              <RowActions onEdit={() => setModal({ mode: 'edit', record })} onDelete={() => del(record._id)} />
            </div>
            <FieldSummary data={record.data} fields={fields} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function NursingWorkflowPage({ moduleKey, title, group, subtitle, fields }) {
  return <ClinicalWorkflowPage moduleKey={moduleKey} title={title} group={group} subtitle={subtitle} fields={fields} columns={['Assigned', 'In Care', 'Observed', 'Completed']} />;
}

export function BedWorkflowPage({ moduleKey, title, group, subtitle, fields }) {
  const { records, loading, create, update, remove } = useModuleRecords(moduleKey);
  const lookupOptions = useHospitalLookups();
  const [modal, setModal] = useState(null);
  const statuses = ['Available', 'Occupied', 'Cleaning', 'Maintenance'];
  async function submit(form) {
    if (modal.mode === 'edit') await update(modal.record._id, form);
    else await create(form);
    setModal(null);
  }
  async function del(id) {
    if (!window.confirm('Delete this bed/ward record?')) return;
    await remove(id);
  }
  return (
    <div className="p-4 md:p-7">
      <PageHeader title={title} group={group} subtitle={subtitle} actionLabel={`Add ${title}`} onAction={() => setModal({ mode: 'add', initial: { status: 'Available' } })} />
      <WorkflowModal modal={modal} title={title} fields={fields} lookupOptions={lookupOptions} onClose={() => setModal(null)} onSubmit={submit} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {statuses.map((status) => <Stat key={status} label={status} value={records.filter((r) => (r.data?.status || 'Available') === status).length} tone={status === 'Occupied' ? 'red' : status === 'Available' ? 'green' : 'amber'} />)}
      </div>
      {loading ? <p className="text-[13px] text-[#536173] px-5 py-8 text-center">Loading...</p> : (
        <KanbanBoard
          columns={statuses}
          records={records}
          statusKey="status"
          renderCard={(record) => (
            <div key={record._id} className="bg-white border border-[#dfe7f1] rounded-lg p-3">
              <div className="flex justify-between gap-2"><strong className="text-[13px] text-[#111827] flex items-center gap-1"><BedDouble size={13} />{record.data?.name || record.data?.bedNumber || 'Bed'}</strong><RowActions onEdit={() => setModal({ mode: 'edit', record })} onDelete={() => del(record._id)} /></div>
              <div className="text-xs text-[#536173] mt-1">{record.data?.wardName || record.data?.ward || 'Ward'} · {record.data?.roomName || 'Room'}</div>
              {record.data?.patientName && <div className="text-xs text-[#111827] mt-1">{record.data.patientName}</div>}
            </div>
          )}
        />
      )}
    </div>
  );
}

export function DiagnosticWorkflowPage({ moduleKey, title, group, subtitle, fields, radiology = false }) {
  const columns = radiology ? ['Scheduled', 'In Scan', 'Reporting', 'Completed'] : ['Booked', 'Collected', 'Processing', 'Reported'];
  const Icon = radiology ? Activity : FlaskConical;
  return (
    <ClinicalWorkflowPage
      moduleKey={moduleKey}
      title={title}
      group={group}
      subtitle={subtitle}
      fields={fields}
      columns={columns}
      icon={<Icon size={14} />}
    />
  );
}

export function PharmacyWorkflowPage({ moduleKey, title, group, subtitle, fields }) {
  const { records, loading, create, update, remove } = useModuleRecords(moduleKey);
  const lookupOptions = useHospitalLookups();
  const [modal, setModal] = useState(null);
  async function submit(form) {
    if (modal.mode === 'edit') await update(modal.record._id, form);
    else await create(form);
    setModal(null);
  }
  async function del(id) {
    if (!window.confirm('Delete this pharmacy record?')) return;
    await remove(id);
  }
  return (
    <div className="p-4 md:p-7">
      <PageHeader title={title} group={group} subtitle={subtitle} actionLabel={`Add ${title}`} onAction={() => setModal({ mode: 'add', initial: { status: 'Ordered' } })} />
      <WorkflowModal modal={modal} title={title} fields={fields} lookupOptions={lookupOptions} onClose={() => setModal(null)} onSubmit={submit} />
      {loading ? <p className="text-[13px] text-[#536173] px-5 py-8 text-center">Loading...</p> : (
        <KanbanBoard
          columns={['Ordered', 'Dispensed', 'Returned', 'Cancelled']}
          records={records}
          statusKey="status"
          renderCard={(record) => (
            <div key={record._id} className="bg-white border border-[#dfe7f1] rounded-lg p-3">
              <div className="flex justify-between gap-2"><strong className="text-[13px] text-[#111827] flex items-center gap-1"><Pill size={13} />{record.data?.name || record.data?.medicineName || 'Medicine'}</strong><RowActions onEdit={() => setModal({ mode: 'edit', record })} onDelete={() => del(record._id)} /></div>
              <div className="text-xs text-[#536173] mt-1">{record.data?.patientName || 'Walk-in'} · Qty {record.data?.quantity || '-'}</div>
              <div className="text-xs text-[#94a3b8] mt-1">{record.data?.doctorName || 'No prescription link'}</div>
            </div>
          )}
        />
      )}
    </div>
  );
}
