import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock3, Link2, Plus, Search, Siren, UserRound } from 'lucide-react';

import { useModuleRecords } from '../shared/recordUi/useModuleRecords.js';

const INPUT = 'h-10 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-[inherit] text-[#111827] outline-none focus:border-red-500';
const ARRIVAL_MODES = ['Walk-in', 'Ambulance', 'Police', 'Referral', 'Transfer from another hospital'];
const BROUGHT_BY = ['Family Member', 'Self', 'Ambulance Staff', 'Police', 'Bystander', 'Hospital Staff', 'Other'];
const EMERGENCY_TYPES = ['Medical', 'Surgical', 'Trauma', 'Accident', 'Poisoning', 'Other'];
const GENDERS = ['Male', 'Female', 'Other', 'Unknown'];

const EMPTY_FORM = {
  name: '',
  age: '34',
  gender: 'Male',
  mobile: '9876543210',
  address: '',
  arrivalDate: '2026-08-10',
  arrivalTime: '09:45',
  arrivalMode: 'Walk-in',
  broughtBy: 'Family Member',
  emergencyType: 'Medical',
  chiefComplaint: 'Severe chest pain',
  knownAllergy: 'Penicillin',
  existingCondition: 'Hypertension',
  emergencyContactName: '',
  emergencyContactMobile: '',
};

function normalize(value = '') {
  return String(value || '-').trim().toLowerCase();
}

function phone(value = '') {
  return String(value || '-').replace(/\D/g, '').slice(-10);
}

function nextEmergencyNo(records) {
  const year = new Date().getFullYear();
  const prefix = `ER-${year}-`;
  const max = records.reduce((highest, record) => {
    const value = record.data?.erNo || '-';
    if (!value.startsWith(prefix)) return highest;
    const number = Number(value.slice(prefix.length));
    return Number.isFinite(number) ? Math.max(highest, number) : highest;
  }, 0);
  return `${prefix}${String(max + 1).padStart(6, '0')}`;
}

function nextTempId(records) {
  const max = records.reduce((highest, record) => {
    const value = record.data?.temporaryPatientId || record.data?.patientId || '-';
    if (!value.startsWith('ER-TEMP-')) return highest;
    const number = Number(value.replace(/\D/g, ''));
    return Number.isFinite(number) ? Math.max(highest, number) : highest;
  }, 124);
  return `ER-TEMP-${String(max + 1).padStart(5, '0')}`;
}

function fullPatientName(data = {}) {
  return data.name || [data.firstName, data.lastName].filter(Boolean).join(' ') || 'Unnamed Patient';
}

function displayTime(value = '') {
  if (!value) return '';
  const [hour, minute] = value.split(':').map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return value;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${String(displayHour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${suffix}`;
}

function Button({ children, icon: Icon, onClick, tone = 'white', disabled = false }) {
  const tones = {
    red: 'border-red-600 bg-red-600 text-white hover:bg-red-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100',
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

function Field({ label, required, children }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-[12px] font-extrabold uppercase text-[#536173]">{label}{required ? ' *' : ''}</span>
      {children}
    </label>
  );
}

export function EmergencyRegistrationPage() {
  const navigate = useNavigate();
  const patients = useModuleRecords('hospital/patients');
  const emergencies = useModuleRecords('hospital/emergency-cases');
  const [search, setSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const erNo = useMemo(() => nextEmergencyNo(emergencies.records), [emergencies.records]);
  const tempId = useMemo(() => nextTempId([...patients.records, ...emergencies.records]), [emergencies.records, patients.records]);

  const matches = useMemo(() => {
    const q = normalize(search);
    if (!q) return patients.records.slice(0, 6);
    return patients.records.filter((record) => {
      const data = record.data || {};
      return normalize([data.patientId, fullPatientName(data), data.mobile, data.phone].filter(Boolean).join(' ')).includes(q);
    }).slice(0, 8);
  }, [patients.records, search]);

  const selectedPatient = patients.records.find((record) => record._id === selectedPatientId) || null;

  function set(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setMessage('');
  }

  function selectExistingPatient(record) {
    const data = record.data || {};
    setSelectedPatientId(record._id);
    setForm((current) => ({
      ...current,
      name: fullPatientName(data),
      age: data.age || current.age,
      gender: data.gender || current.gender,
      mobile: data.mobile || data.phone || current.mobile,
      address: data.address || current.address,
      knownAllergy: data.knownAllergies || data.allergy || current.knownAllergy,
      existingCondition: data.existingConditions || current.existingCondition,
      emergencyContactName: data.emergencyName || current.emergencyContactName,
      emergencyContactMobile: data.emergencyMobile || current.emergencyContactMobile,
    }));
    setSearch(`${data.patientId || '-'} ${fullPatientName(data)}`.trim());
  }

  function startNewEmergencyPatient() {
    setSelectedPatientId('');
    setForm({ ...EMPTY_FORM, name: '', age: '', mobile: '', knownAllergy: '', existingCondition: '' });
    setSearch('');
    setMessage('');
  }

  function markUnknown() {
    setSelectedPatientId('');
    setForm((current) => ({
      ...current,
      name: 'UNKNOWN',
      age: '',
      gender: 'Unknown',
      mobile: '',
      address: '',
      knownAllergy: '',
      existingCondition: '',
      emergencyContactName: '',
      emergencyContactMobile: '',
    }));
    setMessage(`Temporary patient ID will be ${tempId}. Staff can merge this emergency record later.`);
  }

  async function registerEmergency() {
    const isUnknown = normalize(form.name) === 'unknown';
    if (!isUnknown && !form.name.trim()) {
      window.alert('Patient name is required. Use UNKNOWN for unidentified or unconscious patients.');
      return;
    }
    if (!form.chiefComplaint.trim()) {
      window.alert('Chief complaint is required for triage.');
      return;
    }

    setSaving(true);
    try {
      let linkedPatient = selectedPatient;
      let patientId = selectedPatient?.data?.patientId || '-';

      if (!linkedPatient && !isUnknown) {
        patientId = tempId;
        await patients.create({
          patientId,
          name: form.name.trim(),
          age: form.age,
          gender: form.gender,
          mobile: form.mobile,
          phone: form.mobile,
          address: form.address,
          knownAllergies: form.knownAllergy,
          existingConditions: form.existingCondition,
          emergencyName: form.emergencyContactName,
          emergencyMobile: form.emergencyContactMobile,
          emergencyContact: [form.emergencyContactName, form.emergencyContactMobile].filter(Boolean).join(' | '),
          status: 'Emergency',
        });
      }

      if (isUnknown) patientId = tempId;

      await emergencies.create({
        erNo,
        name: `${erNo} - ${form.name.trim() || 'UNKNOWN'}`,
        patientName: form.name.trim() || 'UNKNOWN',
        patientId,
        temporaryPatientId: isUnknown ? tempId : '',
        linkedPatientRecordId: linkedPatient?._id || '-',
        isTemporaryPatient: isUnknown,
        age: form.age,
        gender: form.gender,
        mobile: form.mobile,
        address: form.address,
        date: form.arrivalDate,
        arrivalDate: form.arrivalDate,
        arrivalTime: form.arrivalTime,
        arrivalDisplay: `${form.arrivalDate} ${displayTime(form.arrivalTime)}`,
        arrivalMode: form.arrivalMode,
        broughtBy: form.broughtBy,
        emergencyType: form.emergencyType,
        chiefComplaint: form.chiefComplaint,
        knownAllergy: form.knownAllergy,
        existingCondition: form.existingCondition,
        emergencyContactName: form.emergencyContactName,
        emergencyContactMobile: form.emergencyContactMobile,
        status: 'Red',
        triageStatus: 'Waiting for Triage',
        workflow: 'Patient Arrives -> Search Patient -> Quick Registration -> Emergency ID -> TRIAGE',
      });

      setMessage(`${erNo} registered. ${isUnknown ? `${tempId} created for unidentified patient. ` : ''}Proceed to triage.`);
      navigate('/hospital/triage');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 md:p-7">
      <div className="w-full rounded-lg border border-[#dfe7f1] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf2f7] bg-[#fffafa] p-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-red-50 text-red-600"><Siren size={20} /></span>
            <div>
              <h1 className="m-0 text-[20px] font-extrabold uppercase text-[#071936]">Emergency Registration</h1>
              <p className="m-0 mt-0.5 text-[12px] font-semibold text-[#64748b]">Minimal intake for immediate treatment and triage.</p>
            </div>
          </div>
          <div className="rounded-md border border-red-100 bg-white px-3 py-2 text-[13px] font-extrabold text-[#071936]">ER No: {erNo}</div>
        </div>

        {message && <div className="mx-4 mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] font-semibold text-amber-800">{message}</div>}

        <div className="p-4">
          <section className="mb-5">
            <div className="mb-2 text-[12px] font-extrabold uppercase text-[#536173]">Patient</div>
            <div className="grid gap-3 lg:grid-cols-[minmax(280px,1fr)_auto_auto_auto]">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                <input className="h-10 w-full rounded-md border border-[#dbe4ef] bg-white pl-9 pr-3 text-[13px] font-[inherit] outline-none focus:border-red-500" placeholder="Search Patient ID / Mobile" value={search} onChange={(event) => setSearch(event.target.value)} />
              </div>
              <Button icon={Link2} onClick={() => matches[0] && selectExistingPatient(matches[0])}>Existing Patient</Button>
              <Button icon={Plus} onClick={startNewEmergencyPatient}>New Emergency Patient</Button>
              <Button icon={AlertTriangle} tone="amber" onClick={markUnknown}>UNKNOWN</Button>
            </div>
            {search && matches.length > 0 && (
              <div className="mt-2 grid gap-2">
                {matches.map((record) => (
                  <button key={record._id} type="button" onClick={() => selectExistingPatient(record)} className={`rounded-md border px-3 py-2 text-left text-[13px] font-semibold ${selectedPatientId === record._id ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-[#dbe4ef] bg-white text-[#334155] hover:bg-gray-50'}`}>
                    <UserRound size={14} className="mr-2 inline" />{fullPatientName(record.data)} - {record.data?.patientId || '-'} - {record.data?.mobile || record.data?.phone || '-'}
                  </button>
                ))}
              </div>
            )}
          </section>

          <div className="mb-5 h-px bg-[#edf2f7]" />

          <section className="mb-5">
            <h2 className="m-0 mb-4 text-[14px] font-extrabold uppercase text-[#071936]">Patient Details</h2>
            <div className="grid gap-4">
              <Field label="Name" required><input className={INPUT} value={form.name} onChange={(event) => set('name', event.target.value)} placeholder="UNKNOWN if unidentified" /></Field>
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Age"><input className={INPUT} type="number" value={form.age} onChange={(event) => set('age', event.target.value)} /></Field>
                <Field label="Gender"><select className={INPUT} value={form.gender} onChange={(event) => set('gender', event.target.value)}>{GENDERS.map((item) => <option key={item}>{item}</option>)}</select></Field>
                <Field label="Mobile"><input className={INPUT} value={form.mobile} onChange={(event) => set('mobile', phone(event.target.value))} /></Field>
              </div>
              <Field label="Address"><input className={INPUT} value={form.address} onChange={(event) => set('address', event.target.value)} /></Field>
              <div className="grid gap-4 md:grid-cols-[1fr_1fr_1.4fr]">
                <Field label="Emergency Arrival"><div className="grid gap-2 sm:grid-cols-2"><input className={INPUT} type="date" value={form.arrivalDate} onChange={(event) => set('arrivalDate', event.target.value)} /><input className={INPUT} type="time" value={form.arrivalTime} onChange={(event) => set('arrivalTime', event.target.value)} /></div></Field>
                <Field label="Arrival Mode"><select className={INPUT} value={form.arrivalMode} onChange={(event) => set('arrivalMode', event.target.value)}>{ARRIVAL_MODES.map((item) => <option key={item}>{item}</option>)}</select></Field>
                <Field label="Brought By"><select className={INPUT} value={form.broughtBy} onChange={(event) => set('broughtBy', event.target.value)}>{BROUGHT_BY.map((item) => <option key={item}>{item}</option>)}</select></Field>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Emergency Type"><select className={INPUT} value={form.emergencyType} onChange={(event) => set('emergencyType', event.target.value)}>{EMERGENCY_TYPES.map((item) => <option key={item}>{item}</option>)}</select></Field>
                <Field label="Emergency Contact"><input className={INPUT} value={form.emergencyContactName} onChange={(event) => set('emergencyContactName', event.target.value)} placeholder="Name" /></Field>
                <Field label="Contact Mobile"><input className={INPUT} value={form.emergencyContactMobile} onChange={(event) => set('emergencyContactMobile', phone(event.target.value))} /></Field>
              </div>
            </div>
          </section>

          <div className="mb-5 h-px bg-[#edf2f7]" />

          <section>
            <h2 className="m-0 mb-4 text-[14px] font-extrabold uppercase text-[#071936]">Initial Information</h2>
            <div className="grid gap-4">
              <Field label="Chief Complaint" required><input className={INPUT} value={form.chiefComplaint} onChange={(event) => set('chiefComplaint', event.target.value)} /></Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Known Allergy"><input className={INPUT} value={form.knownAllergy} onChange={(event) => set('knownAllergy', event.target.value)} /></Field>
                <Field label="Existing Condition"><input className={INPUT} value={form.existingCondition} onChange={(event) => set('existingCondition', event.target.value)} /></Field>
              </div>
            </div>
          </section>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-[12px] font-extrabold text-red-700">
              <Clock3 size={14} />Patient Arrives &gt; Search Patient &gt; Emergency ID &gt; TRIAGE
            </div>
            <Button icon={Siren} tone="red" disabled={saving} onClick={registerEmergency}>Register Emergency</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

