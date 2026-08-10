import { useMemo, useState } from 'react';
import { CalendarDays, Clock3, Plus, ShieldAlert, UsersRound } from 'lucide-react';

import { names, useLookupRecords, useModuleRecords } from '../../../shared/recordUi/useModuleRecords.js';
import { todayISO } from '../../../shared/recordUi/dateUtils.js';

const INPUT = 'h-10 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-[inherit] text-[#111827] outline-none focus:border-blue-500';
const SHIFTS = {
  Morning: '06:00 AM - 02:00 PM',
  Evening: '02:00 PM - 10:00 PM',
  Night: '10:00 PM - 06:00 AM',
};
const STAFF_TYPES = ['Nurse', 'Doctor'];
const WARDS = ['General Ward', 'Private Ward', 'ICU', 'NICU', 'PICU', 'Maternity', 'Emergency'];
const ROLES = ['Ward Nurse', 'Senior Nurse', 'Staff Nurse', 'Duty Doctor', 'Resident Doctor', 'Charge Nurse'];
const EMPTY_FORM = {
  staffType: 'Nurse',
  staffName: 'Priya S',
  date: todayISO(),
  shift: 'Morning',
  departmentName: 'General Medicine',
  wardName: 'General Ward',
  role: 'Ward Nurse',
  status: 'Assigned',
};
const DEMO_SHIFTS = [
  { _id: 'demo-shift-1', data: { staffType: 'Nurse', staffName: 'Priya S', role: 'Senior Nurse', departmentName: 'General Medicine', wardName: 'General Ward', date: todayISO(), shift: 'Morning', status: 'Assigned' } },
  { _id: 'demo-shift-2', data: { staffType: 'Nurse', staffName: 'Anu M', role: 'Staff Nurse', departmentName: 'General Medicine', wardName: 'General Ward', date: todayISO(), shift: 'Morning', status: 'Assigned' } },
  { _id: 'demo-shift-3', data: { staffType: 'Nurse', staffName: 'Kavitha R', role: 'Staff Nurse', departmentName: 'General Medicine', wardName: 'General Ward', date: todayISO(), shift: 'Morning', status: 'Assigned' } },
  { _id: 'demo-shift-4', data: { staffType: 'Nurse', staffName: 'Meena S', role: 'Senior Nurse', departmentName: 'General Medicine', wardName: 'General Ward', date: todayISO(), shift: 'Evening', status: 'Assigned' } },
  { _id: 'demo-shift-5', data: { staffType: 'Nurse', staffName: 'Raji K', role: 'Staff Nurse', departmentName: 'General Medicine', wardName: 'General Ward', date: todayISO(), shift: 'Evening', status: 'Assigned' } },
  { _id: 'demo-shift-6', data: { staffType: 'Nurse', staffName: 'Deepa S', role: 'Staff Nurse', departmentName: 'General Medicine', wardName: 'General Ward', date: todayISO(), shift: 'Night', status: 'Assigned' } },
];

function normalize(value = '') {
  return String(value || '').trim().toLowerCase();
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

function shiftRecords(records, date, department, ward) {
  return records.filter((record) => {
    const data = record.data || {};
    return data.date === date
      && data.departmentName === department
      && data.wardName === ward
      && data.shift
      && data.staffName;
  });
}

export function ShiftAllocationPage() {
  const shifts = useModuleRecords('hospital/nursing-care');
  const nurses = useLookupRecords('hospital/nurses');
  const doctors = useLookupRecords('hospital/doctors');
  const departments = useLookupRecords('hospital/departments');
  const [date, setDate] = useState(todayISO());
  const [department, setDepartment] = useState('General Medicine');
  const [ward, setWard] = useState('General Ward');
  const [showAssign, setShowAssign] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const records = shifts.records.length ? shifts.records : DEMO_SHIFTS;
  const departmentOptions = useMemo(() => {
    const existing = names(departments.records);
    return existing.length ? existing : ['General Medicine', 'Cardiology', 'Orthopedics', 'Pediatrics'];
  }, [departments.records]);
  const nurseOptions = useMemo(() => {
    const existing = names(nurses.records);
    return existing.length ? existing : ['Priya S', 'Anu M', 'Kavitha R', 'Meena S', 'Raji K', 'Deepa S'];
  }, [nurses.records]);
  const doctorOptions = useMemo(() => {
    const existing = names(doctors.records);
    return existing.length ? existing : ['Dr. Arun Kumar', 'Dr. Ravi Kumar', 'Dr. Priya'];
  }, [doctors.records]);
  const staffOptions = form.staffType === 'Doctor' ? doctorOptions : nurseOptions;

  const roster = useMemo(() => shiftRecords(records, date, department, ward), [date, department, records, ward]);
  const grouped = useMemo(() => Object.fromEntries(Object.keys(SHIFTS).map((shift) => [shift, roster.filter((record) => record.data?.shift === shift)])), [roster]);

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function openAssign() {
    setForm((current) => ({ ...current, date, departmentName: department, wardName: ward }));
    setShowAssign(true);
    setTimeout(() => document.getElementById('assign-shift-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  }

  async function assignShift() {
    const overlap = shifts.records.some((record) => {
      const data = record.data || {};
      return data.staffName === form.staffName && data.date === form.date && data.shift === form.shift && normalize(data.status) !== 'cancelled';
    });
    if (overlap) {
      setMessage(`${form.staffName} already has a ${form.shift} shift on ${form.date}.`);
      return;
    }
    setSaving(true);
    try {
      await shifts.create({
        ...form,
        name: `${form.staffName} - ${form.shift} shift`,
        type: 'Shift Allocation',
      });
      setDate(form.date);
      setDepartment(form.departmentName);
      setWard(form.wardName);
      setShowAssign(false);
      setMessage(`${form.staffName} assigned to ${form.shift} duty.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 md:p-7">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="m-0 text-[24px] font-extrabold text-[#071936]">Shift Allocation</h1>
          <p className="m-0 mt-1 text-[13px] font-semibold text-[#64748b]">Assign doctors and nurses to hospital duty periods, wards and departments.</p>
        </div>
        <Button icon={Plus} tone="blue" onClick={openAssign}>Assign Shift</Button>
      </div>

      {message && <div className="mb-4 rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-[13px] font-semibold text-blue-700">{message}</div>}

      {showAssign && (
        <section id="assign-shift-form" className="mb-5 rounded-lg border border-[#dfe7f1] bg-white p-4">
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-[#edf2f7] pb-3">
            <div>
              <h2 className="m-0 text-[17px] font-extrabold text-[#071936]">Assign Shift</h2>
              <p className="m-0 mt-1 text-[12px] font-semibold text-[#64748b]">Checks overlap before adding to duty roster.</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowAssign(false)}>Cancel</Button>
              <Button tone="blue" onClick={assignShift} disabled={saving}>Assign Shift</Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">Staff Type<select className={`${INPUT} mt-1`} value={form.staffType} onChange={(event) => setForm({ ...form, staffType: event.target.value, staffName: event.target.value === 'Doctor' ? doctorOptions[0] : nurseOptions[0] })}>{STAFF_TYPES.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">Staff *<select className={`${INPUT} mt-1`} value={form.staffName} onChange={(event) => setField('staffName', event.target.value)}>{staffOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">Date *<input className={`${INPUT} mt-1`} type="date" value={form.date} onChange={(event) => setField('date', event.target.value)} /></label>
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">Shift *<select className={`${INPUT} mt-1`} value={form.shift} onChange={(event) => setField('shift', event.target.value)}>{Object.keys(SHIFTS).map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">Department<select className={`${INPUT} mt-1`} value={form.departmentName} onChange={(event) => setField('departmentName', event.target.value)}>{departmentOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">Ward *<select className={`${INPUT} mt-1`} value={form.wardName} onChange={(event) => setField('wardName', event.target.value)}>{WARDS.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">Role<select className={`${INPUT} mt-1`} value={form.role} onChange={(event) => setField('role', event.target.value)}>{ROLES.map((item) => <option key={item}>{item}</option>)}</select></label>
          </div>
        </section>
      )}

      <section className="mb-5 rounded-lg border border-[#dfe7f1] bg-white p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-[12px] font-extrabold uppercase text-[#536173]">Date<input className={`${INPUT} mt-1`} type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
          <label className="text-[12px] font-extrabold uppercase text-[#536173]">Department<select className={`${INPUT} mt-1`} value={department} onChange={(event) => setDepartment(event.target.value)}>{departmentOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="text-[12px] font-extrabold uppercase text-[#536173]">Ward<select className={`${INPUT} mt-1`} value={ward} onChange={(event) => setWard(event.target.value)}>{WARDS.map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>
      </section>

      <section className="rounded-lg border border-[#dfe7f1] bg-white">
        {Object.entries(SHIFTS).map(([shift, timing]) => (
          <div key={shift} className="border-b border-[#edf2f7] p-4 last:border-b-0">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="m-0 text-[15px] font-extrabold uppercase text-[#071936]">{shift}</h2>
                <div className="mt-1 flex items-center gap-1 text-[12px] font-bold text-[#64748b]"><Clock3 size={13} />{timing}</div>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-extrabold text-blue-700">{grouped[shift].length} assigned</span>
            </div>
            {grouped[shift].length === 0 ? (
              <div className="rounded-md bg-[#f8fbff] px-3 py-3 text-[13px] font-semibold text-[#64748b]">No staff assigned.</div>
            ) : (
              <div className="divide-y divide-[#edf2f7]">
                {grouped[shift].map((record) => {
                  const data = record.data || {};
                  return (
                    <div key={record._id} className="grid gap-2 py-3 md:grid-cols-[minmax(160px,1fr)_180px_180px_120px] md:items-center">
                      <div className="font-extrabold text-[#071936]">{data.staffName}</div>
                      <div className="text-[13px] font-semibold text-[#334155]">{data.role}</div>
                      <div className="text-[13px] font-semibold text-[#64748b]">{data.wardName}</div>
                      <div className="text-[11px] font-extrabold uppercase text-emerald-700">{data.status || 'Assigned'}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </section>

      <section className="mt-5 rounded-lg border border-[#dfe7f1] bg-white p-4">
        <div className="mb-3 flex items-center gap-2 text-[13px] font-extrabold uppercase text-[#536173]"><CalendarDays size={15} />Workflow</div>
        <div className="flex flex-wrap items-center gap-2 text-[12px] font-bold text-[#334155]">
          {['Staff', 'Check Availability', 'Check Leave', 'Select Date', 'Select Shift', 'Ward/Department', 'Allocate', 'Duty Roster'].map((step, index, arr) => (
            <span key={step} className="inline-flex items-center gap-2">
              <span className="rounded-md border border-[#dbe4ef] bg-[#f8fbff] px-2.5 py-1">{step}</span>
              {index < arr.length - 1 && <span className="text-[#94a3b8]">-&gt;</span>}
            </span>
          ))}
        </div>
        <div className="mt-3 flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-[12px] font-semibold text-amber-800">
          <ShieldAlert size={15} className="mt-0.5 flex-none" />
          Approved doctor/nurse leave from Employee Management should block affected duty slots and alert reception for replacement staff.
        </div>
      </section>
    </div>
  );
}
