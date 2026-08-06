import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CalendarCheck, RefreshCw, Save, Upload, X } from 'lucide-react';

import { useModuleRecords } from '../shared/recordUi/useModuleRecords.js';

const EMPTY_FORM = {
  photoName: '',
  firstName: '',
  lastName: '',
  dob: '',
  age: '',
  gender: 'Male',
  bloodGroup: 'O+',
  maritalStatus: 'Single',
  mobile: '',
  alternateMobile: '',
  email: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  country: 'India',
  emergencyName: '',
  emergencyRelationship: 'Father',
  emergencyMobile: '',
  idType: 'Aadhaar',
  idNumber: '',
  idFileName: '',
  knownAllergies: '',
  existingConditions: '',
};

const INPUT = 'w-full border border-[#dbe4ef] rounded-md px-2.5 py-1.5 text-[12.5px] outline-none focus:border-blue-500 bg-white font-[inherit] h-8';
const LABEL = 'block text-[11px] font-semibold text-[#4b5563] mb-0.5';
const SECTION = 'bg-white border border-[#dfe7f1] rounded-lg p-3';
const SECTION_TITLE = 'text-[11px] font-extrabold uppercase tracking-wide text-[#111827] mb-2';

function toISODate(value) {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : value;
}

function toDisplayDate(value) {
  if (!value) return '';
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function calculateAge(dob) {
  const iso = toISODate(dob);
  if (!iso) return '';
  const birthDate = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(birthDate.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDelta = today.getMonth() - birthDate.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) age -= 1;
  return age >= 0 ? String(age) : '';
}

function nextPatientId(records) {
  const year = new Date().getFullYear();
  const prefix = `GBH-${year}-`;
  const max = records.reduce((highest, record) => {
    const id = record.data?.patientId || '';
    if (!id.startsWith(prefix)) return highest;
    const number = Number(id.slice(prefix.length));
    return Number.isFinite(number) ? Math.max(highest, number) : highest;
  }, 0);
  return `${prefix}${String(max + 1).padStart(6, '0')}`;
}

function normalizePhone(value = '') {
  return value.replace(/\D/g, '').slice(-10);
}

function Field({ label, required, children }) {
  return (
    <label className="block min-w-0">
      <span className={LABEL}>{label}{required ? ' *' : ''}</span>
      {children}
    </label>
  );
}

function TextInput({ value, onChange, placeholder = '', type = 'text', readOnly = false }) {
  return (
    <input
      className={`${INPUT} ${readOnly ? 'bg-[#f8fafc] text-[#64748b]' : ''}`}
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      readOnly={readOnly}
    />
  );
}

function SelectInput({ value, onChange, options }) {
  return (
    <select className={INPUT} value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>
  );
}

function FileButton({ label, value, onChange }) {
  return (
    <label className="inline-flex h-8 w-full items-center justify-center gap-2 rounded-md border border-dashed border-[#b8c7da] bg-[#f8fafc] px-2.5 py-1.5 text-[12.5px] font-semibold text-[#0f4c81] cursor-pointer hover:bg-blue-50">
      <Upload size={14} />
      <span className="truncate">{value || label}</span>
      <input type="file" className="hidden" onChange={(event) => onChange(event.target.files?.[0]?.name || '')} />
    </label>
  );
}

function AlertLine({ tone, children }) {
  const tones = {
    red: 'border-red-200 bg-red-50 text-red-700',
    green: 'border-green-200 bg-green-50 text-green-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
  };
  return <div className={`rounded-md border px-2.5 py-1.5 text-[12px] ${tones[tone]}`}>{children}</div>;
}

export function PatientRegistrationPage() {
  const navigate = useNavigate();
  const { records, loading, create } = useModuleRecords('hospital/patients');
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedPatientId, setSavedPatientId] = useState('');

  const patientId = useMemo(() => nextPatientId(records), [records]);
  const duplicate = useMemo(() => {
    const phone = normalizePhone(form.mobile);
    if (phone.length < 10) return null;
    return records.find((record) => normalizePhone(record.data?.mobile || record.data?.phone) === phone) || null;
  }, [records, form.mobile]);

  function set(field, value) {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === 'dob') next.age = calculateAge(value);
      return next;
    });
    setSavedPatientId('');
    setError('');
  }

  function reset() {
    setForm(EMPTY_FORM);
    setError('');
    setSavedPatientId('');
  }

  function buildPayload(id) {
    const fullName = [form.firstName.trim(), form.lastName.trim()].filter(Boolean).join(' ');
    const addressParts = [form.address, form.city, form.state, form.pincode, form.country].filter(Boolean);
    return {
      ...form,
      patientId: id,
      name: fullName,
      dob: toISODate(form.dob),
      dobDisplay: toDisplayDate(toISODate(form.dob)),
      phone: form.mobile,
      bloodGroup: form.bloodGroup,
      emergencyContact: [form.emergencyName, form.emergencyRelationship, form.emergencyMobile].filter(Boolean).join(' | '),
      address: addressParts.join('\n'),
      status: 'Active',
    };
  }

  async function savePatient({ bookAppointment = false } = {}) {
    if (!form.firstName.trim() || !form.gender || !form.mobile.trim()) {
      setError('First name, gender, and mobile number are required.');
      return;
    }
    if (duplicate && !window.confirm('A patient with this mobile number already exists. Save another registration anyway?')) return;

    const id = patientId;
    setSaving(true);
    setError('');
    try {
      await create(buildPayload(id));
      setSavedPatientId(id);
      if (bookAppointment) {
        navigate('/hospital/book-appointment', { state: { patientName: [form.firstName, form.lastName].filter(Boolean).join(' '), patientId: id } });
      } else {
        setForm(EMPTY_FORM);
      }
    } catch (err) {
      setError(err.message || 'Failed to save patient.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-3 md:p-4">
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="m-0 text-[20px] font-extrabold text-[#111827]">Patient Registration</h1>
          <p className="m-0 text-[12px] text-[#536173]">Register a new patient</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-[12px] text-[#0f4c81]">
            Next ID: <strong>{loading ? 'Loading...' : patientId}</strong>
          </span>
          <button type="button" onClick={reset} className="inline-flex h-8 items-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-2.5 text-[12.5px] font-semibold text-[#374151] cursor-pointer">
            <RefreshCw size={14} />Reset
          </button>
        </div>
      </div>

      <div className="border-t border-[#dbe4ef] pt-3">
        <div className="grid grid-cols-1 xl:grid-cols-[1.45fr_0.95fr] gap-3">
          <div className="space-y-3">
            <section className={SECTION}>
              <div className={SECTION_TITLE}>Basic Information</div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                <Field label="Photo"><FileButton label="Upload" value={form.photoName} onChange={(value) => set('photoName', value)} /></Field>
                <Field label="First Name" required><TextInput value={form.firstName} onChange={(value) => set('firstName', value)} /></Field>
                <Field label="Last Name"><TextInput value={form.lastName} onChange={(value) => set('lastName', value)} /></Field>
                <Field label="Mobile Number" required><TextInput value={form.mobile} onChange={(value) => set('mobile', value)} placeholder="+91" /></Field>
                <Field label="Date of Birth"><TextInput value={toDisplayDate(form.dob)} onChange={(value) => set('dob', value)} placeholder="DD/MM/YYYY" /></Field>
                <Field label="Age"><TextInput value={form.age} onChange={(value) => set('age', value)} readOnly placeholder="Auto" /></Field>
                <Field label="Gender" required><SelectInput value={form.gender} onChange={(value) => set('gender', value)} options={['Male', 'Female', 'Other']} /></Field>
                <Field label="Blood Group"><SelectInput value={form.bloodGroup} onChange={(value) => set('bloodGroup', value)} options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']} /></Field>
                <Field label="Marital Status"><SelectInput value={form.maritalStatus} onChange={(value) => set('maritalStatus', value)} options={['Single', 'Married', 'Widowed', 'Separated']} /></Field>
                <Field label="Alternate Mobile"><TextInput value={form.alternateMobile} onChange={(value) => set('alternateMobile', value)} /></Field>
                <div className="lg:col-span-2"><Field label="Email"><TextInput type="email" value={form.email} onChange={(value) => set('email', value)} /></Field></div>
              </div>
            </section>

            <section className={SECTION}>
              <div className={SECTION_TITLE}>Contact Information</div>
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-2.5">
                <div className="col-span-2 lg:col-span-3"><Field label="Address"><TextInput value={form.address} onChange={(value) => set('address', value)} /></Field></div>
                <Field label="City"><TextInput value={form.city} onChange={(value) => set('city', value)} /></Field>
                <Field label="State"><TextInput value={form.state} onChange={(value) => set('state', value)} /></Field>
                <Field label="Pincode"><TextInput value={form.pincode} onChange={(value) => set('pincode', value)} /></Field>
                <Field label="Country"><TextInput value={form.country} onChange={(value) => set('country', value)} /></Field>
              </div>
            </section>
          </div>

          <div className="space-y-3">
            {(error || savedPatientId || duplicate) && (
              <div className="space-y-1.5">
                {error && <AlertLine tone="red"><span className="inline-flex items-center gap-1.5"><AlertTriangle size={14} />{error}</span></AlertLine>}
                {savedPatientId && <AlertLine tone="green">Patient ID: <strong>{savedPatientId}</strong>. Patient saved successfully.</AlertLine>}
                {duplicate && <AlertLine tone="amber">Possible duplicate: {duplicate.data?.name || 'Existing patient'} {duplicate.data?.patientId ? `(${duplicate.data.patientId})` : ''}.</AlertLine>}
              </div>
            )}

            <section className={SECTION}>
              <div className={SECTION_TITLE}>Emergency Contact</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3 gap-2.5">
                <Field label="Name"><TextInput value={form.emergencyName} onChange={(value) => set('emergencyName', value)} placeholder="John Peter" /></Field>
                <Field label="Relationship"><SelectInput value={form.emergencyRelationship} onChange={(value) => set('emergencyRelationship', value)} options={['Father', 'Mother', 'Spouse', 'Sibling', 'Friend', 'Guardian', 'Other']} /></Field>
                <Field label="Mobile"><TextInput value={form.emergencyMobile} onChange={(value) => set('emergencyMobile', value)} placeholder="+91" /></Field>
              </div>
            </section>

            <section className={SECTION}>
              <div className={SECTION_TITLE}>Identification</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3 gap-2.5">
                <Field label="ID Type"><SelectInput value={form.idType} onChange={(value) => set('idType', value)} options={['Aadhaar', 'Passport', 'Driving Licence', 'Voter ID', 'PAN', 'Other']} /></Field>
                <Field label="ID Number"><TextInput value={form.idNumber} onChange={(value) => set('idNumber', value)} /></Field>
                <Field label="Upload ID"><FileButton label="Upload ID" value={form.idFileName} onChange={(value) => set('idFileName', value)} /></Field>
              </div>
            </section>

            <section className={SECTION}>
              <div className={SECTION_TITLE}>Medical Basics</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3 gap-2.5">
                <Field label="Blood Group"><SelectInput value={form.bloodGroup} onChange={(value) => set('bloodGroup', value)} options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']} /></Field>
                <Field label="Known Allergies"><TextInput value={form.knownAllergies} onChange={(value) => set('knownAllergies', value)} /></Field>
                <Field label="Existing Conditions"><TextInput value={form.existingConditions} onChange={(value) => set('existingConditions', value)} /></Field>
              </div>
            </section>

            <div className="flex flex-col gap-2 rounded-lg border border-[#dfe7f1] bg-white p-3">
              <button type="button" disabled={saving} onClick={() => savePatient({ bookAppointment: true })} className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-emerald-600 bg-emerald-600 px-3 text-[13px] font-semibold text-white cursor-pointer disabled:opacity-60">
                <CalendarCheck size={14} />Save & Book Appointment
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => navigate('/hospital/patients')} className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-3 text-[12.5px] font-semibold text-[#374151] cursor-pointer">
                  <X size={14} />Cancel
                </button>
                <button type="button" disabled={saving} onClick={() => savePatient()} className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-blue-600 bg-blue-600 px-3 text-[12.5px] font-semibold text-white cursor-pointer disabled:opacity-60">
                  <Save size={14} />Save Patient
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
