import { useMemo, useState } from 'react';

import { names, useLookupRecords, useModuleRecords } from '../../../shared/recordUi/useModuleRecords.js';

const SPECIALIZATIONS = ['Internal Medicine', 'Cardiology', 'Orthopedics', 'Pediatrics', 'Gynecology', 'Dermatology', 'ENT', 'General Surgery'];
const GENDERS = ['Male', 'Female', 'Other'];
const STATUSES = ['Available', 'On Leave', 'Inactive'];
const EMPTY_FORM = {
  name: '',
  gender: 'Male',
  mobile: '',
  email: '',
  departmentName: 'General Medicine',
  specialization: 'Internal Medicine',
  qualification: 'MBBS, MD',
  registrationNo: 'TNMC-123456',
  experienceYears: '12',
  consultationFee: '500',
  followUpFee: '300',
  followUpValidityDays: '7',
  status: 'Available',
};

function normalize(value = '') {
  return String(value || '-').trim().toLowerCase();
}

function Line() {
  return <div className="my-8 h-px max-w-[610px] bg-black/70" />;
}

function BracketButton({ children, onClick, disabled = false }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="bg-transparent font-mono text-[14px] text-black outline-none disabled:opacity-50">
      [{children}]
    </button>
  );
}

function BracketInput({ value, onChange, className = 'w-[130px]', type = 'text' }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 whitespace-nowrap">
      <span>[</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${className} min-w-0 bg-transparent font-mono text-[14px] text-black outline-none`}
      />
      <span>]</span>
    </span>
  );
}

function BracketSelect({ value, onChange, options, className = '' }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 whitespace-nowrap">
      <span>[</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${className} min-w-0 bg-transparent font-mono text-[14px] text-black outline-none`}
      >
        {options.map((item) => <option key={item}>{item}</option>)}
      </select>
      <span>]</span>
    </span>
  );
}

function nextDoctorId(records) {
  const max = records.reduce((highest, record) => {
    const id = record.data?.doctorId || '-';
    const match = id.match(/DOC-(\d+)/i);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 12);
  return `DOC-${String(max + 1).padStart(4, '0')}`;
}

export function DoctorsPage() {
  const doctors = useModuleRecords('hospital/doctors');
  const departments = useLookupRecords('hospital/departments');
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('Department');
  const [specialization, setSpecialization] = useState('Specialization');
  const [status, setStatus] = useState('Status');
  const [form, setForm] = useState(EMPTY_FORM);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const records = doctors.records;
  const departmentOptions = useMemo(() => {
    const existing = names(departments.records);
    return existing;
  }, [departments.records]);

  const filtered = useMemo(() => {
    const q = normalize(search);
    return records.filter((record) => {
      const data = record.data || {};
      const haystack = normalize([data.name, data.doctorId, data.departmentName, data.specialization, data.qualification].filter(Boolean).join(' '));
      const matchesSearch = !q || haystack.includes(q);
      const matchesDepartment = department === 'Department' || data.departmentName === department;
      const matchesSpecialization = specialization === 'Specialization' || data.specialization === specialization;
      const matchesStatus = status === 'Status' || normalize(data.status || 'Available') === normalize(status);
      return matchesSearch && matchesDepartment && matchesSpecialization && matchesStatus;
    });
  }, [department, records, search, specialization, status]);

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function saveDoctor() {
    if (!form.name.trim()) {
      setMessage('Doctor Name is required.');
      return;
    }
    setSaving(true);
    try {
      const doctorId = nextDoctorId(doctors.records);
      await doctors.create({
        ...form,
        doctorId,
        phone: form.mobile,
        todaySchedule: '09:00 AM - 01:00 PM',
        appointmentsToday: '0',
        appointmentCapacity: '24',
        linkedEmployeeId: form.linkedEmployeeId || '-',
      });
      setForm({ ...EMPTY_FORM, departmentName: departmentOptions[0] || 'General Medicine' });
      setMessage(`${doctorId} saved. Link this doctor to Employee ID for HR details.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 md:p-7">
      <h1 className="m-0 mb-7 text-[24px] font-semibold text-black">UI</h1>

      {message && <div className="mb-4 rounded-[18px] bg-[#f3f3f3] px-6 py-3 font-mono text-[14px] text-black">{message}</div>}

      <section className="rounded-[28px] bg-[#f3f3f3] px-6 py-5 font-mono text-[14px] leading-6 text-black md:px-8">
        <div className="grid max-w-[520px] grid-cols-[1fr_auto]">
          <div>DOCTORS</div>
          <BracketButton onClick={() => document.getElementById('add-doctor-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>+ Add Doctor</BracketButton>
        </div>

        <div className="mt-8">
          <span>[</span>
          <span className="mx-2">🔍</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search Doctor"
            className="w-[170px] bg-transparent font-mono text-[14px] text-black outline-none placeholder:text-black"
          />
          <span>]</span>
        </div>

        <div className="mt-8 flex max-w-[520px] flex-wrap gap-2">
          <BracketSelect value={department} onChange={setDepartment} options={['Department', ...departmentOptions]} />
          <BracketSelect value={specialization} onChange={setSpecialization} options={['Specialization', ...SPECIALIZATIONS]} />
          <BracketSelect value={status} onChange={setStatus} options={['Status', ...STATUSES]} />
        </div>

        <Line />

        {doctors.loading ? (
          <div>Loading...</div>
        ) : filtered.length === 0 ? (
          <div>No doctors found.</div>
        ) : (
          <div className="grid gap-10">
            {filtered.map((record) => {
              const data = record.data || {};
              return (
                <div key={record._id}>
                  <div>{data.name || '-'}</div>
                  <div>{data.departmentName || 'General Medicine'} • {data.qualification || 'MBBS, MD'}</div>
                  <div>Doctor ID: {data.doctorId || 'DOC-0012'}</div>

                  <div className="mt-8">Today: {data.todaySchedule || '09:00 AM - 01:00 PM'}</div>
                  <div>Appointments: {data.appointmentsToday || '18'} / {data.appointmentCapacity || '24'}</div>

                  <div className="mt-8">● {(data.status || 'AVAILABLE').toUpperCase()}</div>

                  <div className="mt-8 flex flex-wrap gap-1">
                    <BracketButton>View Profile</BracketButton>
                    <BracketButton>Schedule</BracketButton>
                    <BracketButton>•••</BracketButton>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <h2 className="m-0 mt-8 text-[18px] font-semibold text-black">Add Doctor UI</h2>

      <section id="add-doctor-form" className="mt-4 max-w-[625px] rounded-[28px] bg-[#f3f3f3] px-5 py-4 font-mono text-[12px] leading-5 text-black md:px-6">
        <div>ADD DOCTOR</div>

        <div className="mt-7">PERSONAL</div>
        <div className="mt-2 grid max-w-[360px] grid-cols-2 gap-x-10 gap-y-5">
          <label>
            <div>Doctor Name *</div>
            <BracketInput value={form.name} onChange={(value) => setField('name', value)} />
          </label>
          <label>
            <div>Gender</div>
            <BracketSelect value={form.gender} onChange={(value) => setField('gender', value)} options={GENDERS} />
          </label>
          <label>
            <div>Mobile</div>
            <BracketInput value={form.mobile} onChange={(value) => setField('mobile', value)} />
          </label>
          <label>
            <div>Email</div>
            <BracketInput value={form.email} onChange={(value) => setField('email', value)} />
          </label>
        </div>

        <div className="mt-12">PROFESSIONAL</div>
        <div className="mt-2 grid gap-5">
          <label>
            <div>Department *</div>
            <BracketSelect value={form.departmentName} onChange={(value) => setField('departmentName', value)} options={departmentOptions} />
          </label>
          <label>
            <div>Specialization *</div>
            <BracketSelect value={form.specialization} onChange={(value) => setField('specialization', value)} options={SPECIALIZATIONS} />
          </label>
          <label>
            <div>Qualification</div>
            <BracketInput value={form.qualification} onChange={(value) => setField('qualification', value)} />
          </label>
          <label>
            <div>Medical Registration No *</div>
            <BracketInput value={form.registrationNo} onChange={(value) => setField('registrationNo', value)} />
          </label>
          <label>
            <div>Experience</div>
            <BracketInput value={form.experienceYears} onChange={(value) => setField('experienceYears', value)} className="w-[24px]" /> <span>Years</span>
          </label>
        </div>

        <div className="mt-12">CONSULTATION</div>
        <div className="mt-2 grid max-w-[330px] gap-1">
          <label className="grid grid-cols-[1fr_auto_auto] gap-2">
            <span>Consultation Fee</span>
            <span>₹</span>
            <BracketInput value={form.consultationFee} onChange={(value) => setField('consultationFee', value)} className="w-[42px]" />
          </label>
          <label className="grid grid-cols-[1fr_auto_auto] gap-2">
            <span>Follow-up Fee</span>
            <span>₹</span>
            <BracketInput value={form.followUpFee} onChange={(value) => setField('followUpFee', value)} className="w-[42px]" />
          </label>
          <label className="grid grid-cols-[1fr_auto] gap-2">
            <span>Follow-up Validity</span>
            <span><BracketInput value={form.followUpValidityDays} onChange={(value) => setField('followUpValidityDays', value)} className="w-[20px]" /> Days</span>
          </label>
        </div>

        <div className="mt-10 flex max-w-[260px] justify-between">
          <BracketButton onClick={() => setForm(EMPTY_FORM)}>Cancel</BracketButton>
          <BracketButton onClick={saveDoctor} disabled={saving}>Save Doctor</BracketButton>
        </div>
      </section>
    </div>
  );
}


