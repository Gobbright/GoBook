import { useMemo, useState } from 'react';
import { ClipboardList, Eye, Filter, MoreHorizontal, Plus, Search, UserCheck, UsersRound } from 'lucide-react';

import { names, useLookupRecords, useModuleRecords } from '../../../shared/recordUi/useModuleRecords.js';

const INPUT = 'h-10 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-[inherit] text-[#111827] outline-none focus:border-blue-500';
const DESIGNATIONS = ['Senior Staff Nurse', 'Staff Nurse', 'Head Nurse', 'Charge Nurse', 'ICU Nurse', 'OT Nurse'];
const SPECIALIZATIONS = ['General Nursing', 'ICU Nursing', 'OT Nursing', 'Pediatric Nursing', 'Emergency Nursing', 'Maternity Nursing'];
const WARDS = ['General Ward', 'Private Ward', 'ICU', 'NICU', 'PICU', 'Maternity', 'Emergency'];
const STATUSES = ['Active', 'On Duty', 'Off Duty', 'Inactive'];
const EMPTY_FORM = {
  name: 'Priya S',
  employeeId: 'EMP-0082',
  departmentName: 'General Medicine',
  designation: 'Senior Staff Nurse',
  registrationNo: 'TN-NUR-28452',
  primaryWard: 'General Ward',
  specialization: 'General Nursing',
  status: 'Active',
  currentShift: 'Morning',
  patientsAssigned: '6',
};
const DEMO_NURSES = [
  {
    _id: 'demo-nur-0018',
    data: {
      nurseId: 'NUR-0018',
      name: 'Priya S',
      employeeId: 'EMP-0082',
      departmentName: 'General Medicine',
      designation: 'Senior Staff Nurse',
      registrationNo: 'TN-NUR-28452',
      primaryWard: 'General Ward',
      specialization: 'General Nursing',
      currentShift: 'Morning',
      patientsAssigned: '6',
      status: 'On Duty',
    },
  },
];

function normalize(value = '') {
  return String(value || '').trim().toLowerCase();
}

function nextNurseId(records) {
  const max = records.reduce((highest, record) => {
    const match = String(record.data?.nurseId || '').match(/NUR-(\d+)/i);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 18);
  return `NUR-${String(max + 1).padStart(4, '0')}`;
}

function Button({ children, icon: Icon, onClick, tone = 'white', disabled = false }) {
  const tones = {
    blue: 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700',
    white: 'border-[#dbe4ef] bg-white text-[#374151] hover:bg-gray-50',
  };
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-[13px] font-semibold ${tones[tone]} font-[inherit] transition disabled:opacity-60`}>
      {Icon && <Icon size={15} />}
      {children}
    </button>
  );
}

function Stat({ label, value, icon: Icon }) {
  return (
    <div className="rounded-md border border-[#edf2f7] bg-[#f8fbff] p-3">
      <div className="flex items-center gap-2 text-[12px] font-bold text-[#64748b]"><Icon size={14} />{label}</div>
      <div className="mt-1 text-[20px] font-extrabold text-[#071936]">{value}</div>
    </div>
  );
}

export function NursesPage() {
  const nurses = useModuleRecords('hospital/nurses');
  const departments = useLookupRecords('hospital/departments');
  const employees = useLookupRecords('hr/employees');
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('All Departments');
  const [ward, setWard] = useState('All Wards');
  const [status, setStatus] = useState('All Status');
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const records = nurses.records.length ? nurses.records : DEMO_NURSES;
  const departmentOptions = useMemo(() => {
    const existing = names(departments.records);
    return existing.length ? existing : ['General Medicine', 'Cardiology', 'Orthopedics', 'Pediatrics'];
  }, [departments.records]);
  const employeeOptions = useMemo(() => {
    const fromEmployees = employees.records.map((record) => record.data?.employeeId || record.data?.code || record.data?.name).filter(Boolean);
    const fromNurses = records.map((record) => record.data?.employeeId).filter(Boolean);
    const options = [...new Set([...fromEmployees, ...fromNurses, EMPTY_FORM.employeeId])];
    return options.length ? options : [EMPTY_FORM.employeeId];
  }, [employees.records, records]);

  const filtered = useMemo(() => {
    const q = normalize(search);
    return records.filter((record) => {
      const data = record.data || {};
      const haystack = normalize([data.nurseId, data.name, data.employeeId, data.departmentName, data.primaryWard, data.designation].filter(Boolean).join(' '));
      const matchesSearch = !q || haystack.includes(q);
      const matchesDepartment = department === 'All Departments' || data.departmentName === department;
      const matchesWard = ward === 'All Wards' || data.primaryWard === ward;
      const matchesStatus = status === 'All Status' || normalize(data.status) === normalize(status);
      return matchesSearch && matchesDepartment && matchesWard && matchesStatus;
    });
  }, [department, records, search, status, ward]);

  const totals = useMemo(() => filtered.reduce((acc, record) => {
    const data = record.data || {};
    acc.onDuty += normalize(data.status) === 'on duty' ? 1 : 0;
    acc.patients += Number(data.patientsAssigned || 0);
    return acc;
  }, { onDuty: 0, patients: 0 }), [filtered]);

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function saveNurse() {
    if (!form.name.trim()) {
      setMessage('Name is required.');
      return;
    }
    setSaving(true);
    try {
      const nurseId = nextNurseId(nurses.records);
      await nurses.create({
        ...form,
        nurseId,
        linkedEmployeeId: form.employeeId,
      });
      setForm(EMPTY_FORM);
      setShowAddForm(false);
      setMessage(`${nurseId} saved. HR details remain in Employee Management.`);
    } finally {
      setSaving(false);
    }
  }

  function openAddForm() {
    setShowAddForm(true);
    setTimeout(() => document.getElementById('add-nurse-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  }

  return (
    <div className="p-4 md:p-7">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="m-0 text-[24px] font-extrabold text-[#071936]">Nurses</h1>
          <p className="m-0 mt-1 text-[13px] font-semibold text-[#64748b]">Clinical nursing master for ward assignment, shift status and patient load.</p>
        </div>
        <Button icon={Plus} tone="blue" onClick={openAddForm}>Add Nurse</Button>
      </div>

      {message && <div className="mb-4 rounded-md border border-emerald-100 bg-emerald-50 px-4 py-3 text-[13px] font-semibold text-emerald-700">{message}</div>}

      {showAddForm && (
        <section id="add-nurse-form" className="mb-5 rounded-lg border border-[#dfe7f1] bg-white p-4">
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-[#edf2f7] pb-3">
            <div>
              <h2 className="m-0 text-[17px] font-extrabold text-[#071936]">Add Nurse</h2>
              <p className="m-0 mt-1 text-[12px] font-semibold text-[#64748b]">Clinical assignment and nursing operations only.</p>
            </div>
            <Button onClick={saveNurse} disabled={saving} tone="blue">Save</Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">Name *<input className={`${INPUT} mt-1`} value={form.name} onChange={(event) => setField('name', event.target.value)} /></label>
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">Employee ID<select className={`${INPUT} mt-1`} value={form.employeeId} onChange={(event) => setField('employeeId', event.target.value)}>{employeeOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">Department *<select className={`${INPUT} mt-1`} value={form.departmentName} onChange={(event) => setField('departmentName', event.target.value)}>{departmentOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">Designation<select className={`${INPUT} mt-1`} value={form.designation} onChange={(event) => setField('designation', event.target.value)}>{DESIGNATIONS.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">Nursing Registration No<input className={`${INPUT} mt-1`} value={form.registrationNo} onChange={(event) => setField('registrationNo', event.target.value)} /></label>
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">Primary Ward<select className={`${INPUT} mt-1`} value={form.primaryWard} onChange={(event) => setField('primaryWard', event.target.value)}>{WARDS.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">Specialization<select className={`${INPUT} mt-1`} value={form.specialization} onChange={(event) => setField('specialization', event.target.value)}>{SPECIALIZATIONS.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">Status<select className={`${INPUT} mt-1`} value={form.status} onChange={(event) => setField('status', event.target.value)}>{STATUSES.map((item) => <option key={item}>{item}</option>)}</select></label>
          </div>
        </section>
      )}

      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <Stat label="Nurses" value={filtered.length} icon={UsersRound} />
        <Stat label="On Duty" value={totals.onDuty} icon={UserCheck} />
        <Stat label="Assigned Patients" value={totals.patients} icon={ClipboardList} />
      </div>

      <section className="rounded-lg border border-[#dfe7f1] bg-white">
        <div className="grid gap-3 border-b border-[#edf2f7] p-4 lg:grid-cols-[minmax(260px,1fr)_180px_170px_160px]">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
            <input className="h-10 w-full rounded-md border border-[#dbe4ef] bg-white pl-9 pr-3 text-[13px] font-[inherit] outline-none focus:border-blue-500" placeholder="Search Nurse" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <select className={INPUT} value={department} onChange={(event) => setDepartment(event.target.value)}>
            {['All Departments', ...departmentOptions].map((item) => <option key={item}>{item}</option>)}
          </select>
          <select className={INPUT} value={ward} onChange={(event) => setWard(event.target.value)}>
            {['All Wards', ...WARDS].map((item) => <option key={item}>{item}</option>)}
          </select>
          <select className={INPUT} value={status} onChange={(event) => setStatus(event.target.value)}>
            {['All Status', ...STATUSES].map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>

        {nurses.loading ? (
          <div className="px-5 py-10 text-center text-[13px] font-semibold text-[#64748b]">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-14 text-center text-[13px] font-semibold text-[#64748b]">No nurses found.</div>
        ) : (
          <div className="divide-y divide-[#edf2f7]">
            {filtered.map((record) => {
              const data = record.data || {};
              const onDuty = normalize(data.status) === 'on duty';
              return (
                <div key={record._id} className="grid gap-4 p-4 lg:grid-cols-[160px_minmax(240px,1fr)_260px_auto] lg:items-center">
                  <div>
                    <div className="text-[12px] font-extrabold text-[#64748b]">{data.nurseId || 'NUR-0018'}</div>
                    <div className="mt-1 text-[17px] font-extrabold text-[#071936]">{data.name || 'Priya S'}</div>
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-[#334155]">{data.designation || 'Senior Staff Nurse'}</div>
                    <div className="mt-1 text-[13px] font-semibold text-[#64748b]">{data.departmentName || 'General Medicine'}</div>
                    <div className="mt-2 text-[12px] font-semibold text-[#64748b]">Ward: {data.primaryWard || 'General Ward'}</div>
                    <div className="text-[12px] font-semibold text-[#64748b]">Current Shift: {data.currentShift || 'Morning'}</div>
                  </div>
                  <div className="rounded-md bg-[#f8fbff] p-3">
                    <div className="text-[12px] font-bold text-[#64748b]">Patients Assigned</div>
                    <div className="mt-1 text-[22px] font-extrabold text-[#071936]">{data.patientsAssigned || 0}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    <span className={`inline-flex h-8 items-center rounded-full px-3 text-[11px] font-extrabold ${onDuty ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
                      {(data.status || 'Active').toUpperCase()}
                    </span>
                    <Button icon={Eye}>View</Button>
                    <Button icon={ClipboardList}>Assign Patients</Button>
                    <Button icon={MoreHorizontal} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
}
