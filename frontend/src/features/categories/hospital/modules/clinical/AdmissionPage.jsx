import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BedDouble,
  ClipboardPlus,
  FileUp,
  IndianRupee,
  Phone,
  Save,
  Search,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

import { useModuleRecords } from '../../../shared/recordUi/useModuleRecords.js';
import { todayISO } from '../../../shared/recordUi/dateUtils.js';

const INPUT = 'h-10 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-[inherit] text-[#111827] outline-none focus:border-blue-500';
const TEXTAREA = 'min-h-20 w-full rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-[13px] font-[inherit] text-[#111827] outline-none focus:border-blue-500';
const ADMISSION_TYPES = ['Planned', 'Emergency', 'OPD to IPD', 'Day Care', 'Observation'];
const PRIORITIES = ['Normal', 'Priority', 'Emergency'];
const DEPARTMENTS = ['General Medicine', 'Cardiology', 'Orthopedics', 'Pediatrics', 'Gynecology', 'Emergency'];
const DOCTORS = ['', 'Dr. Priya Raman', 'Dr. Meera Nair', 'Dr. Suresh Babu'];
const WARD_TYPES = ['General Ward', 'Private Room', 'Semi Private', 'ICU', 'NICU', 'Day Care'];
const ROOM_PREFERENCES = ['Any Available', 'Near Nursing Station', 'Window Side', 'Single Room', 'Twin Sharing'];
const RELATIONSHIPS = ['Spouse', 'Father', 'Mother', 'Son', 'Daughter', 'Brother', 'Sister', 'Other'];
const FALLBACK_BEDS = ['GW-101-A', 'GW-101-B', 'GW-102-A', 'PR-201', 'ICU-03'];

function phoneOf(data = {}) {
  return data.phone || data.mobile || data.patientPhone || '-';
}

function nextIpdNo(records) {
  const year = new Date().getFullYear();
  const prefix = `IPD-${year}-`;
  const max = records.reduce((highest, record) => {
    const raw = record.data?.ipdNo || record.data?.admissionNo || '-';
    if (!String(raw).startsWith(prefix)) return highest;
    const n = Number(String(raw).slice(prefix.length));
    return Number.isFinite(n) ? Math.max(highest, n) : highest;
  }, 181);
  return `${prefix}${String(max + 1).padStart(5, '0')}`;
}

function normalize(value = '') {
  return String(value || '-').trim().toLowerCase();
}

function optionSet(fallback, values) {
  return [...new Set([...fallback, ...values.filter(Boolean)])];
}

function Button({ children, onClick, tone = 'white', disabled = false }) {
  const tones = {
    blue: 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700',
    green: 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700',
    white: 'border-[#dbe4ef] bg-white text-[#374151] hover:bg-gray-50',
  };
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-[13px] font-semibold ${tones[tone]} cursor-pointer disabled:cursor-not-allowed disabled:opacity-60`}>
      {children}
    </button>
  );
}

export function AdmissionPage() {
  const query = useMemo(() => new URLSearchParams(window.location.search), []);
  const patients = useModuleRecords('hospital/patients');
  const admissions = useModuleRecords('hospital/ipd-admissions');
  const beds = useModuleRecords('hospital/bed-management');
  const doctors = useModuleRecords('hospital/doctors');
  const schedules = useModuleRecords('hospital/doctor-schedule');
  const histories = useModuleRecords('hospital/medical-history');

  const [search, setSearch] = useState(query.get('patientName') || '-');
  const [showPatients, setShowPatients] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [admissionType, setAdmissionType] = useState('Planned');
  const [admissionDate, setAdmissionDate] = useState(todayISO());
  const [admissionTime, setAdmissionTime] = useState('10:30');
  const [department, setDepartment] = useState('General Medicine');
  const [doctor, setDoctor] = useState('');
  const [reason, setReason] = useState('Fever with dehydration');
  const [diagnosis, setDiagnosis] = useState('Viral Fever');
  const [priority, setPriority] = useState('Normal');
  const [referredBy, setReferredBy] = useState('Dr. Kumar / External Referral');
  const [wardType, setWardType] = useState('General Ward');
  const [roomPreference, setRoomPreference] = useState('Any Available');
  const [bed, setBed] = useState('');
  const [estimatedStay, setEstimatedStay] = useState(3);
  const [attendant, setAttendant] = useState({ name: '', relationship: 'Spouse', mobile: '' });
  const [insuranceTpa, setInsuranceTpa] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [documentName, setDocumentName] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedPatient = useMemo(() => {
    const byId = patients.records.find((record) => record._id === selectedPatientId);
    if (byId) return byId;
    const requested = query.get('patientName');
    return patients.records.find((record) => requested && normalize(record.data?.name) === normalize(requested)) || patients.records[0] || null;
  }, [patients.records, query, selectedPatientId]);

  const patientData = selectedPatient?.data || {};
  const patientName = patientData.name || query.get('patientName') || '-';
  const patientId = patientData.patientId || '-';
  const patientPhone = phoneOf(patientData) || '+91 98765 43210';
  const patientAge = patientData.age || '34';
  const patientGender = patientData.gender || 'Male';
  const bloodGroup = patientData.bloodGroup || patientData.blood || 'O+';
  const ipdNo = useMemo(() => nextIpdNo(admissions.records), [admissions.records]);

  const patientAllergies = useMemo(() => {
    const matches = histories.records.filter((record) => {
      const data = record.data || {};
      return [data.patientId, data.patientName].some((value) => value && [patientId, patientName].includes(value));
    });
    const allergyValues = matches.flatMap((record) => {
      const data = record.data || {};
      return [data.allergies, data.knownAllergies, data.allergy].filter(Boolean);
    });
    return allergyValues.length ? allergyValues.join(', ') : 'Penicillin Allergy';
  }, [histories.records, patientId, patientName]);

  const patientOptions = useMemo(() => {
    const q = normalize(search);
    const source = q ? patients.records.filter((record) => {
      const data = record.data || {};
      return normalize([data.patientId, data.name, data.email, phoneOf(data)].filter(Boolean).join(' ')).includes(q);
    }) : patients.records;
    return source.slice(0, 7);
  }, [patients.records, search]);

  const departmentOptions = useMemo(() => optionSet(DEPARTMENTS, [
    ...doctors.records.map((record) => record.data?.departmentName),
    ...schedules.records.map((record) => record.data?.departmentName),
  ]), [doctors.records, schedules.records]);

  const doctorOptions = useMemo(() => {
    const linked = [
      ...doctors.records.filter((record) => !department || record.data?.departmentName === department).map((record) => record.data?.name || record.data?.doctorName),
      ...schedules.records.filter((record) => !department || record.data?.departmentName === department).map((record) => record.data?.doctorName),
    ];
    return optionSet(DOCTORS, linked);
  }, [department, doctors.records, schedules.records]);

  const availableBeds = useMemo(() => {
    const live = beds.records
      .filter((record) => !record.data?.status || record.data?.status === 'Available')
      .map((record) => ({
        id: record._id,
        label: record.data?.name || record.data?.bedNumber || record.data?.roomName || '-',
        data: record.data || {},
      }))
      .filter((item) => item.label);
    if (live.length) return live;
    return FALLBACK_BEDS.map((label) => ({ id: '', label, data: {} }));
  }, [beds.records]);

  function selectPatient(record) {
    setSelectedPatientId(record._id);
    setSearch(record.data?.name || '-');
    setShowPatients(false);
  }

  function resetForm() {
    setAdmissionType('Planned');
    setAdmissionDate(todayISO());
    setAdmissionTime('10:30');
    setDepartment('General Medicine');
    setDoctor('');
    setReason('Fever with dehydration');
    setDiagnosis('Viral Fever');
    setPriority('Normal');
    setReferredBy('Dr. Kumar / External Referral');
    setWardType('General Ward');
    setRoomPreference('Any Available');
    setBed('');
    setEstimatedStay(3);
    setAttendant({ name: '', relationship: 'Spouse', mobile: '' });
    setInsuranceTpa('');
    setAdvanceAmount(0);
    setNotes('');
    setDocumentName('');
    setMessage('');
  }

  async function saveAdmission(status) {
    if (!selectedPatient && !patientName) {
      setMessage('Select a patient before admission.');
      return;
    }
    const selectedBed = availableBeds.find((item) => item.label === bed);
    const shouldAllocateBed = status === 'Admitted' && selectedBed?.label;
    const payload = {
      name: `${patientName} - ${diagnosis || reason || 'Admission'}`,
      ipdNo,
      admissionNo: ipdNo,
      patientName,
      patientId,
      patientPhone,
      age: patientAge,
      gender: patientGender,
      bloodGroup,
      allergy: patientAllergies,
      admissionType,
      admissionDate,
      admissionTime,
      departmentName: department,
      doctorName: doctor,
      reason,
      diagnosis,
      priority,
      referredBy,
      wardName: wardType,
      roomName: roomPreference,
      bedNumber: bed,
      estimatedStay,
      attendantName: attendant.name,
      attendantRelationship: attendant.relationship,
      attendantMobile: attendant.mobile,
      insuranceTpa,
      advanceAmount: Number(advanceAmount || 0),
      consentDocument: documentName,
      status: shouldAllocateBed ? 'Bed Allocated' : status,
      notes,
    };

    setSaving(true);
    try {
      await admissions.create(payload);
      if (shouldAllocateBed && selectedBed.id) {
        await beds.update(selectedBed.id, {
          ...selectedBed.data,
          status: 'Occupied',
          patientName,
          patientId,
          ipdNo,
          admissionDate,
        });
      }
      setMessage(status === 'Draft'
        ? `Draft saved for ${patientName}. IPD number will remain ${ipdNo} when admitted.`
        : `${ipdNo} generated for ${patientName}. ${shouldAllocateBed ? `${bed} allocated.` : 'Bed allocation pending.'}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 md:p-7">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="m-0 text-[22px] font-extrabold text-[#071936]">Admit Patient</h1>
          <p className="m-0 mt-1 text-[13px] font-semibold text-[#64748b]">Convert a registered patient into IPD with bed requirement, attendant, advance and consent details.</p>
        </div>
        <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-[13px] font-extrabold text-blue-700">IPD No: {ipdNo}</div>
      </div>

      {message && <div className="mb-4 rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-[13px] font-semibold text-blue-700">{message}</div>}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <section className="rounded-lg border border-[#dfe7f1] bg-white p-4">
          <div className="relative">
            <label className="mb-1 block text-[12px] font-extrabold uppercase text-[#536173]">Patient</label>
            <div className="flex items-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-3">
              <Search size={15} className="text-[#64748b]" />
              <input className="h-10 min-w-0 flex-1 border-0 bg-transparent text-[13px] font-[inherit] outline-none" value={search} onFocus={() => setShowPatients(true)} onChange={(event) => { setSearch(event.target.value); setShowPatients(true); }} placeholder="Search Patient ID / Name / Mobile" />
            </div>
            {showPatients && (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-md border border-[#dbe4ef] bg-white p-1 shadow-lg">
                {patientOptions.length === 0 ? <div className="px-3 py-2 text-[13px] text-[#64748b]">No matching patient found.</div> : patientOptions.map((record) => (
                  <button key={record._id} type="button" onClick={() => selectPatient(record)} className="flex w-full items-center justify-between gap-3 rounded px-3 py-2 text-left text-[13px] hover:bg-blue-50">
                    <span><strong>{record.data?.name || 'Unnamed'}</strong><span className="ml-2 text-[#64748b]">{record.data?.patientId || '-'}</span></span>
                    <span className="text-[#64748b]">{phoneOf(record.data)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 rounded-md border border-[#dbe4ef] bg-[#f8fbff] p-4">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_240px]">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-[15px] font-extrabold text-[#071936]"><UserRound size={17} />{patientName}<span className="text-[13px] text-[#64748b]">{patientId}</span></div>
                <div className="mt-2 text-[13px] font-semibold text-[#475569]">{patientAge} Y - {patientGender} - {bloodGroup}</div>
                <div className="mt-2 inline-flex items-center gap-2 text-[13px] font-semibold text-[#475569]"><Phone size={14} />{patientPhone}</div>
              </div>
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-[13px] font-bold text-amber-800">
                <AlertTriangle size={15} className="mr-1 inline" /> {patientAllergies}
              </div>
            </div>
          </div>

          <div className="mt-5 border-t border-[#edf2f7] pt-5">
            <div className="mb-3 flex items-center gap-2 text-[13px] font-extrabold uppercase text-[#071936]"><ClipboardPlus size={15} />Admission Details</div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <label className="text-[12px] font-extrabold uppercase text-[#536173]">Admission Type *<select className={`${INPUT} mt-1`} value={admissionType} onChange={(event) => setAdmissionType(event.target.value)}>{ADMISSION_TYPES.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="text-[12px] font-extrabold uppercase text-[#536173]">Admission Date *<input className={`${INPUT} mt-1`} type="date" value={admissionDate} onChange={(event) => setAdmissionDate(event.target.value)} /></label>
              <label className="text-[12px] font-extrabold uppercase text-[#536173]">Admission Time *<input className={`${INPUT} mt-1`} type="time" value={admissionTime} onChange={(event) => setAdmissionTime(event.target.value)} /></label>
              <label className="text-[12px] font-extrabold uppercase text-[#536173]">Department *<select className={`${INPUT} mt-1`} value={department} onChange={(event) => setDepartment(event.target.value)}>{departmentOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="text-[12px] font-extrabold uppercase text-[#536173]">Admitting Doctor *<select className={`${INPUT} mt-1`} value={doctor} onChange={(event) => setDoctor(event.target.value)}>{doctorOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="text-[12px] font-extrabold uppercase text-[#536173]">Priority<select className={`${INPUT} mt-1`} value={priority} onChange={(event) => setPriority(event.target.value)}>{PRIORITIES.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="md:col-span-2 text-[12px] font-extrabold uppercase text-[#536173]">Reason for Admission *<input className={`${INPUT} mt-1`} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
              <label className="text-[12px] font-extrabold uppercase text-[#536173]">Diagnosis<input className={`${INPUT} mt-1`} value={diagnosis} onChange={(event) => setDiagnosis(event.target.value)} /></label>
              <label className="md:col-span-2 xl:col-span-3 text-[12px] font-extrabold uppercase text-[#536173]">Referred By<input className={`${INPUT} mt-1`} value={referredBy} onChange={(event) => setReferredBy(event.target.value)} /></label>
            </div>
          </div>

          <div className="mt-5 border-t border-[#edf2f7] pt-5">
            <div className="mb-3 flex items-center gap-2 text-[13px] font-extrabold uppercase text-[#071936]"><BedDouble size={15} />Bed Requirement</div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="text-[12px] font-extrabold uppercase text-[#536173]">Ward Type<select className={`${INPUT} mt-1`} value={wardType} onChange={(event) => setWardType(event.target.value)}>{WARD_TYPES.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="text-[12px] font-extrabold uppercase text-[#536173]">Room Preference<select className={`${INPUT} mt-1`} value={roomPreference} onChange={(event) => setRoomPreference(event.target.value)}>{ROOM_PREFERENCES.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="text-[12px] font-extrabold uppercase text-[#536173]">Bed<select className={`${INPUT} mt-1`} value={bed} onChange={(event) => setBed(event.target.value)}><option value="">Select Available Bed</option>{availableBeds.map((item) => <option key={item.label}>{item.label}</option>)}</select></label>
              <label className="text-[12px] font-extrabold uppercase text-[#536173]">Estimated Stay<input className={`${INPUT} mt-1`} type="number" min="1" value={estimatedStay} onChange={(event) => setEstimatedStay(event.target.value)} /></label>
            </div>
          </div>

          <div className="mt-5 border-t border-[#edf2f7] pt-5">
            <div className="mb-3 text-[13px] font-extrabold uppercase text-[#071936]">Attendant</div>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="text-[12px] font-extrabold uppercase text-[#536173]">Name<input className={`${INPUT} mt-1`} value={attendant.name} onChange={(event) => setAttendant({ ...attendant, name: event.target.value })} /></label>
              <label className="text-[12px] font-extrabold uppercase text-[#536173]">Relationship<select className={`${INPUT} mt-1`} value={attendant.relationship} onChange={(event) => setAttendant({ ...attendant, relationship: event.target.value })}>{RELATIONSHIPS.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="text-[12px] font-extrabold uppercase text-[#536173]">Mobile<input className={`${INPUT} mt-1`} value={attendant.mobile} onChange={(event) => setAttendant({ ...attendant, mobile: event.target.value })} /></label>
            </div>
          </div>

          <div className="mt-5 border-t border-[#edf2f7] pt-5">
            <div className="mb-3 flex items-center gap-2 text-[13px] font-extrabold uppercase text-[#071936]"><ShieldCheck size={15} />Insurance / Advance / Consent</div>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="text-[12px] font-extrabold uppercase text-[#536173]">Insurance / TPA<input className={`${INPUT} mt-1`} value={insuranceTpa} onChange={(event) => setInsuranceTpa(event.target.value)} placeholder="Star Health / TPA" /></label>
              <label className="text-[12px] font-extrabold uppercase text-[#536173]">Advance Amount<div className="mt-1 flex items-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-3"><IndianRupee size={14} className="text-[#64748b]" /><input className="h-10 min-w-0 flex-1 border-0 bg-transparent text-[13px] font-[inherit] outline-none" type="number" value={advanceAmount} onChange={(event) => setAdvanceAmount(event.target.value)} /></div></label>
              <label className="text-[12px] font-extrabold uppercase text-[#536173]">Consent / Document<div className="mt-1 flex items-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-3"><FileUp size={14} className="text-[#64748b]" /><input className="h-10 min-w-0 flex-1 border-0 bg-transparent text-[13px] font-[inherit] outline-none" type="text" value={documentName} onChange={(event) => setDocumentName(event.target.value)} placeholder="Consent form.pdf" /></div></label>
              <label className="md:col-span-3 text-[12px] font-extrabold uppercase text-[#536173]">Admission Notes<textarea className={`${TEXTAREA} mt-1`} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-[#edf2f7] pt-4">
            <Button onClick={resetForm}>Reset</Button>
            <Button onClick={() => saveAdmission('Draft')} disabled={saving}><Save size={14} />Save Draft</Button>
            <Button tone="green" onClick={() => saveAdmission('Admitted')} disabled={saving}><ClipboardPlus size={14} />Admit Patient</Button>
          </div>
        </section>

        <aside className="grid content-start gap-5">
          <section className="rounded-lg border border-[#dfe7f1] bg-white p-4">
            <h2 className="m-0 mb-3 text-[16px] font-extrabold text-[#071936]">Admission Summary</h2>
            <div className="grid gap-3 text-[13px] font-semibold text-[#334155]">
              <div className="flex justify-between"><span>IPD No</span><strong>{ipdNo}</strong></div>
              <div className="flex justify-between"><span>Type</span><strong>{admissionType}</strong></div>
              <div className="flex justify-between"><span>Doctor</span><strong>{doctor}</strong></div>
              <div className="flex justify-between"><span>Department</span><strong>{department}</strong></div>
              <div className="flex justify-between"><span>Bed</span><strong>{bed || 'Pending'}</strong></div>
              <div className="rounded-md border border-emerald-100 bg-emerald-50 p-3 text-[12px] font-bold text-emerald-800">After admit: IPD ID generated, bed allocation updated, and patient appears in IPD workflows.</div>
            </div>
          </section>

          <section className="rounded-lg border border-[#dfe7f1] bg-white p-4">
            <h2 className="m-0 mb-3 text-[16px] font-extrabold text-[#071936]">Available Beds</h2>
            <div className="grid gap-2">
              {availableBeds.slice(0, 6).map((item) => (
                <button key={item.label} type="button" onClick={() => setBed(item.label)} className={`flex items-center justify-between rounded-md border px-3 py-2 text-left text-[13px] font-semibold ${bed === item.label ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-[#edf2f7] bg-[#fbfdff] text-[#334155] hover:bg-blue-50'}`}>
                  <span>{item.label}</span>
                  <span className="text-[11px] uppercase text-[#64748b]">{item.data?.wardName || wardType}</span>
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <div className="mt-5 rounded-lg border border-[#dfe7f1] bg-white p-4">
        <div className="mb-3 text-[12px] font-extrabold uppercase text-[#536173]">Workflow</div>
        <div className="flex flex-wrap items-center gap-2 text-[12px] font-bold text-[#334155]">
          {['Patient', 'Admission', 'Doctor/Department', 'Bed Requirement', 'Insurance/Advance', 'Admit', 'Generate IPD ID', 'Bed Allocation'].map((step, index, arr) => (
            <span key={step} className="inline-flex items-center gap-2">
              <span className="rounded-md border border-[#dbe4ef] bg-[#f8fbff] px-2.5 py-1">{step}</span>
              {index < arr.length - 1 && <span className="text-[#94a3b8]">-&gt;</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

