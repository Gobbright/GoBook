import { useMemo, useState } from 'react';
import { Activity, Building2, Edit3, Eye, MapPin, Plus, Search, Stethoscope, Users } from 'lucide-react';

import { names, useLookupRecords, useModuleRecords } from '../../../shared/recordUi/useModuleRecords.js';

const INPUT = 'h-10 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-[inherit] text-[#111827] outline-none focus:border-blue-500';
const TEXTAREA = 'min-h-20 w-full rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-[13px] font-[inherit] text-[#111827] outline-none focus:border-blue-500';
const COMMON_DEPARTMENTS = ['General Medicine', 'Cardiology', 'Orthopedics', 'Pediatrics', 'Gynecology', 'Dermatology', 'ENT', 'Neurology', 'Nephrology', 'Urology', 'Oncology', 'General Surgery'];
const STATUSES = ['Active', 'Inactive'];
const EMPTY_FORM = {
  name: 'Cardiology',
  code: 'CARD',
  headOfDept: '',
  location: 'Block A - 2nd Floor',
  description: '',
  status: 'Active',
};

function normalize(value = '') {
  return String(value || '-').trim().toLowerCase();
}

function codeFromName(name) {
  const words = String(name || '-').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  if (words.length === 1) return words[0].slice(0, 4).toUpperCase();
  return words.map((word) => word[0]).join('').slice(0, 4).toUpperCase();
}

function ActionButton({ children, icon: Icon, onClick, tone = 'white', disabled = false }) {
  const tones = {
    blue: 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700',
    white: 'border-[#dbe4ef] bg-white text-[#374151] hover:bg-gray-50',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-[13px] font-semibold ${tones[tone]} font-[inherit] transition disabled:opacity-60`}
    >
      {Icon && <Icon size={15} />}
      {children}
    </button>
  );
}

function Stat({ label, value, icon: Icon }) {
  return (
    <div className="rounded-md border border-[#edf2f7] bg-[#f8fbff] p-3">
      <div className="flex items-center gap-2 text-[12px] font-bold text-[#64748b]">
        <Icon size={14} />
        {label}
      </div>
      <div className="mt-1 text-[20px] font-extrabold text-[#071936]">{value}</div>
    </div>
  );
}

export function DepartmentsPage() {
  const departments = useModuleRecords('hospital/departments');
  const doctors = useLookupRecords('hospital/doctors');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [showAddForm, setShowAddForm] = useState(false);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const doctorOptions = useMemo(() => {
    const existing = names(doctors.records);
    return existing;
  }, [doctors.records]);

  const records = departments.records;

  const filtered = useMemo(() => {
    const q = normalize(search);
    if (!q) return records;
    return records.filter((record) => {
      const data = record.data || {};
      return normalize([data.name, data.code, data.departmentCode, data.headOfDept, data.location].filter(Boolean).join(' ')).includes(q);
    });
  }, [records, search]);

  const totals = useMemo(() => filtered.reduce((acc, record) => {
    const data = record.data || {};
    acc.doctors += Number(data.doctors || doctors.records.filter((doctor) => doctor.data?.departmentName === data.name).length || 0);
    acc.nurses += Number(data.nurses || 0);
    acc.patients += Number(data.currentPatients || 0);
    return acc;
  }, { doctors: 0, nurses: 0, patients: 0 }), [doctors.records, filtered]);

  function doctorCount(departmentName, fallback) {
    const count = doctors.records.filter((record) => record.data?.departmentName === departmentName).length;
    return count || fallback || 0;
  }

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function setDepartmentName(value) {
    setForm((current) => ({
      ...current,
      name: value,
      code: current.code && current.code !== codeFromName(current.name) ? current.code : codeFromName(value),
    }));
  }

  async function saveDepartment() {
    if (!form.name.trim() || !form.code.trim()) {
      setMessage('Department Name and Department Code are required.');
      return;
    }
    setSaving(true);
    try {
      await departments.create({
        ...form,
        departmentCode: form.code,
      });
      setForm(EMPTY_FORM);
      setShowAddForm(false);
      setMessage(`${form.name} saved and available across appointments, OPD, IPD, diagnostics, billing and reports.`);
    } finally {
      setSaving(false);
    }
  }

  function openAddForm() {
    setShowAddForm(true);
    setTimeout(() => document.getElementById('add-department-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  }

  return (
    <div className="p-4 md:p-7">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="m-0 text-[24px] font-extrabold text-[#071936]">Departments</h1>
          <p className="m-0 mt-1 text-[13px] font-semibold text-[#64748b]">Clinical department master reused across appointments, OPD, IPD, diagnostics, billing and reports.</p>
        </div>
        <ActionButton icon={Plus} tone="blue" onClick={openAddForm}>Add Department</ActionButton>
      </div>

      {message && <div className="mb-4 rounded-md border border-emerald-100 bg-emerald-50 px-4 py-3 text-[13px] font-semibold text-emerald-700">{message}</div>}

      {showAddForm && (
        <section id="add-department-form" className="mb-5 rounded-lg border border-[#dfe7f1] bg-white p-4">
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-[#edf2f7] pb-3">
            <div>
              <h2 className="m-0 text-[17px] font-extrabold text-[#071936]">Add Department</h2>
              <p className="m-0 mt-1 text-[12px] font-semibold text-[#64748b]">Create the reusable department master record.</p>
            </div>
            <ActionButton onClick={saveDepartment} disabled={saving} tone="blue">Save</ActionButton>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">
              Department Name *
              <select className={`${INPUT} mt-1`} value={form.name} onChange={(event) => setDepartmentName(event.target.value)}>
                {COMMON_DEPARTMENTS.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">
              Department Code *
              <input className={`${INPUT} mt-1`} value={form.code} onChange={(event) => setField('code', event.target.value.toUpperCase())} />
            </label>
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">
              Head of Department
              <select className={`${INPUT} mt-1`} value={form.headOfDept} onChange={(event) => setField('headOfDept', event.target.value)}>
                {doctorOptions.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">
              Location
              <input className={`${INPUT} mt-1`} value={form.location} onChange={(event) => setField('location', event.target.value)} />
            </label>
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">
              Status
              <select className={`${INPUT} mt-1`} value={form.status} onChange={(event) => setField('status', event.target.value)}>
                {STATUSES.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="md:col-span-2 xl:col-span-3 text-[12px] font-extrabold uppercase text-[#536173]">
              Description
              <textarea className={`${TEXTAREA} mt-1`} value={form.description} onChange={(event) => setField('description', event.target.value)} />
            </label>
          </div>
        </section>
      )}

      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <Stat label="Doctors" value={totals.doctors} icon={Stethoscope} />
        <Stat label="Nurses" value={totals.nurses} icon={Users} />
        <Stat label="Current Patients" value={totals.patients} icon={Activity} />
      </div>

      <section className="rounded-lg border border-[#dfe7f1] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf2f7] p-4">
          <div className="relative min-w-[260px] flex-1 max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
            <input
              className="h-10 w-full rounded-md border border-[#dbe4ef] bg-white pl-9 pr-3 text-[13px] font-[inherit] outline-none focus:border-blue-500"
              placeholder="Search Department"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="text-[12px] font-bold text-[#64748b]">{filtered.length} departments</div>
        </div>

        {departments.loading ? (
          <div className="px-5 py-10 text-center text-[13px] font-semibold text-[#64748b]">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-14 text-center text-[13px] font-semibold text-[#64748b]">No departments found.</div>
        ) : (
          <div className="divide-y divide-[#edf2f7]">
            {filtered.map((record) => {
              const data = record.data || {};
              const active = normalize(data.status || 'Active') === 'active';
              return (
                <div key={record._id} className="grid gap-4 p-4 lg:grid-cols-[minmax(240px,1fr)_360px_auto] lg:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-blue-700">
                        <Building2 size={18} />
                      </span>
                      <div className="min-w-0">
                        <h2 className="m-0 truncate text-[15px] font-extrabold uppercase text-[#071936]">{data.name || 'General Medicine'}</h2>
                        <div className="mt-0.5 text-[12px] font-bold text-[#64748b]">Code: {data.code || data.departmentCode || 'GEN'}</div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3 text-[12px] font-semibold text-[#64748b]">
                      <span>HOD: {data.headOfDept || '-'}</span>
                      <span className="inline-flex items-center gap-1"><MapPin size={13} />{data.location || '-'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-md bg-[#f8fbff] px-3 py-2 text-center">
                      <div className="text-[17px] font-extrabold text-[#071936]">{doctorCount(data.name, data.doctors)}</div>
                      <div className="text-[11px] font-bold text-[#64748b]">Doctors</div>
                    </div>
                    <div className="rounded-md bg-[#f8fbff] px-3 py-2 text-center">
                      <div className="text-[17px] font-extrabold text-[#071936]">{data.nurses || 0}</div>
                      <div className="text-[11px] font-bold text-[#64748b]">Nurses</div>
                    </div>
                    <div className="rounded-md bg-[#f8fbff] px-3 py-2 text-center">
                      <div className="text-[17px] font-extrabold text-[#071936]">{data.currentPatients || 0}</div>
                      <div className="text-[11px] font-bold text-[#64748b]">Patients</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    <span className={`inline-flex h-8 items-center rounded-full px-3 text-[11px] font-extrabold ${active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
                      {(data.status || 'Active').toUpperCase()}
                    </span>
                    <ActionButton icon={Eye}>View</ActionButton>
                    <ActionButton icon={Edit3}>Edit</ActionButton>
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


