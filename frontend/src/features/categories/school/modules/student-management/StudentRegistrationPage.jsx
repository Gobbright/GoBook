import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Building2, Calendar, Camera, Check, FileText,
  Home, Phone, RefreshCw, User, Users,
} from 'lucide-react';

import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';
import { useCurrentUser } from '../../../../../hooks/useCurrentUser.js';
import {
  createModuleRecord, listModuleRecords, openModuleRecordFile, uploadModuleRecordFile,
} from '../../../../../services/moduleRecordsService.js';

const MODULE_KEY = 'school/students/registration';
const ADMISSIONS_KEY = 'school/admissions/new-admission';

const LABEL = 'block text-[12px] font-medium text-[#374151] mb-1';
const INPUT = 'w-full border border-[#dbe4ef] rounded-md px-2.5 py-1.5 text-[12.5px] outline-none focus:border-blue-500 font-[inherit] bg-white';

const CLASS_OPTIONS = ['Nursery', 'LKG', 'UKG', ...Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`)];
const SECTION_OPTIONS = ['A', 'B', 'C', 'D'];
const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
const BLOOD_GROUP_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const NATIONALITY_OPTIONS = ['Indian', 'Other'];
const RELIGION_OPTIONS = ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Other'];
const STATUS_OPTIONS = ['Active', 'Inactive'];
const RELATIONSHIP_OPTIONS = ['Father', 'Mother', 'Guardian', 'Grandparent', 'Sibling', 'Other'];
const INCOME_OPTIONS = ['Below ₹2,00,000', '₹2,00,000 - ₹5,00,000', '₹5,00,000 - ₹10,00,000', 'Above ₹10,00,000'];
const BOARD_OPTIONS = ['CBSE', 'ICSE', 'State Board', 'IB', 'Other'];

function academicYearOptions() {
  const year = new Date().getFullYear();
  return [year - 1, year, year + 1].map((y) => `${y}-${y + 1}`);
}

function generateStudentId() {
  const year = new Date().getFullYear();
  const seq = String(Math.floor(1000 + Math.random() * 9000));
  return `STU${year}-${seq}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function initialForm() {
  return {
    admissionRecordId: '', admissionNumber: '',
    studentName: '', dob: '', gender: '', bloodGroup: '', nationality: '', aadhaarNumber: '', religion: '',
    className: '', section: '', rollNumber: '', academicYear: academicYearOptions()[1], dateOfAdmission: todayISO(), studentStatus: 'Active',
    fatherName: '', motherName: '', guardianName: '', fatherMobile: '', motherMobile: '', email: '', occupationFather: '', occupationMother: '', annualIncome: '',
    emergencyContactName: '', emergencyRelationship: '', emergencyMobile: '', emergencyAlternateNumber: '',
    addressLine1: '', addressLine2: '', city: '', state: '', pinCode: '',
    previousSchoolName: '', previousBoard: '', lastClassAttended: '', lastAcademicYear: '',
  };
}

const STEPS = [
  { key: 'admission', label: 'Approved Admission', icon: Check },
  { key: 'registration', label: 'Student Registration', sub: 'Create Student' },
  { key: 'assignment', label: 'Class/Section Assignment', sub: 'Assign Class & Section' },
  { key: 'active', label: 'Active Student', sub: 'Student is Active' },
];

function StepBar({ admissionNumber }) {
  return (
    <div className="flex items-center flex-wrap gap-y-2">
      {STEPS.map((step, i) => {
        const state = i === 0 ? 'done' : i === 1 ? 'active' : 'pending';
        return (
          <div key={step.key} className="flex items-center flex-1 min-w-40 last:flex-none">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 flex-none text-[12px] font-bold ${
                state === 'done' ? 'bg-emerald-500 border-emerald-500 text-white'
                  : state === 'active' ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-[#dbe4ef] text-[#94a3b8]'
              }`}
              >
                {state === 'done' ? <Check size={13} /> : i + 1}
              </div>
              <div className="leading-tight">
                <div className="text-[12px] font-semibold text-[#111827]">
                  {i + 1} {step.label}
                </div>
                <div className="text-[10.5px] text-[#94a3b8]">{i === 0 ? (admissionNumber || 'Select an approved admission') : step.sub}</div>
              </div>
            </div>
            {i < STEPS.length - 1 && <div className="h-0.5 flex-1 mx-2.5 bg-[#e2e8f0] min-w-6" />}
          </div>
        );
      })}
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <section className="bg-white border border-[#dfe7f1] rounded-xl p-3.5">
      <div className="flex items-center gap-2 mb-2.5">
        <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-none"><Icon size={13} /></span>
        <h2 className="m-0 text-[13px] font-bold text-[#111827]">{title}</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-3 gap-y-2.5">
        {children}
      </div>
    </section>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className={LABEL}>{label}{required && <span className="text-red-500"> *</span>}</label>
      {children}
    </div>
  );
}

export function StudentRegistrationPage() {
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const [form, setForm] = useState(initialForm);
  const [studentId, setStudentId] = useState(generateStudentId);
  const [approvedAdmissions, setApprovedAdmissions] = useState([]);
  const [photo, setPhoto] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const photoInputRef = useRef(null);

  useEffect(() => {
    listModuleRecords(ADMISSIONS_KEY)
      .then((res) => setApprovedAdmissions((res.records ?? []).filter((r) => r.data?.status === 'Approved')))
      .catch(() => setApprovedAdmissions([]));
  }, []);

  const admissionOptions = useMemo(() => approvedAdmissions.map((r) => ({ value: r._id, label: r.data?.applicationNumber || r._id })), [approvedAdmissions]);

  function set(key) {
    return (value) => setForm((current) => ({ ...current, [key]: value }));
  }
  function setInput(key) {
    return (e) => set(key)(e.target.value);
  }

  function selectAdmission(id) {
    const record = approvedAdmissions.find((r) => r._id === id);
    if (!record) {
      setForm((current) => ({ ...current, admissionRecordId: '', admissionNumber: '' }));
      return;
    }
    const d = record.data || {};
    setForm((current) => ({
      ...current,
      admissionRecordId: id,
      admissionNumber: d.applicationNumber || '',
      studentName: d.fullName || current.studentName,
      dob: d.dob || current.dob,
      gender: d.gender || current.gender,
      className: d.classApplyingFor || current.className,
      academicYear: d.academicYear || current.academicYear,
      fatherName: d.guardianName || current.fatherName,
      motherName: d.motherName || current.motherName,
      fatherMobile: d.mobileNumber || current.fatherMobile,
      email: d.email || current.email,
      addressLine1: d.addressLine1 || current.addressLine1,
      addressLine2: d.addressLine2 || current.addressLine2,
      city: d.city || current.city,
      state: d.state || current.state,
      pinCode: d.pinCode || current.pinCode,
      previousSchoolName: d.previousSchoolName || current.previousSchoolName,
      previousBoard: d.board || current.previousBoard,
      lastClassAttended: d.lastClassAttended || current.lastClassAttended,
      lastAcademicYear: d.previousAcademicYear || current.lastAcademicYear,
    }));
  }

  async function pickPhoto(file) {
    setError('');
    if (file.size > 2 * 1024 * 1024) {
      setError('Photo must be 2MB or smaller.');
      return;
    }
    setPhoto({ uploading: true, filename: file.name, previewUrl: URL.createObjectURL(file) });
    try {
      const stored = await uploadModuleRecordFile(MODULE_KEY, file);
      setPhoto((current) => ({ id: stored.id, filename: stored.filename, previewUrl: current?.previewUrl }));
    } catch (err) {
      setPhoto(null);
      setError(err.message || 'Unable to upload photo');
    }
  }

  function resetForm() {
    setForm(initialForm());
    setStudentId(generateStudentId());
    setPhoto(null);
    setError('');
    setMessage('');
  }

  function buildPayload(status) {
    return {
      ...form,
      studentId,
      photo: photo?.id ? { id: photo.id, filename: photo.filename } : null,
      status,
      history: [{ status, note: status === 'Registered' ? 'Student registered' : 'Saved as draft', at: new Date().toISOString(), by: currentUser?.name || 'Admin' }],
      classHistory: [{ academicYear: form.academicYear, className: form.className, section: form.section, rollNumber: form.rollNumber, status: 'Current', at: new Date().toISOString() }],
      remarks: [],
    };
  }

  async function handleSaveDraft() {
    setError('');
    setMessage('');
    setSaving(true);
    try {
      await createModuleRecord(MODULE_KEY, buildPayload('Draft'));
      setMessage('Student registration saved as draft.');
    } catch (err) {
      setError(err.message || 'Unable to save draft');
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');

    const required = [
      ['studentName', 'Student Name'], ['dob', 'Date of Birth'], ['gender', 'Gender'],
      ['className', 'Class'], ['section', 'Section'], ['rollNumber', 'Roll Number'], ['academicYear', 'Academic Year'], ['dateOfAdmission', 'Date of Admission'],
      ['fatherName', "Father's Name"], ['motherName', "Mother's Name"], ['fatherMobile', "Father's Mobile"], ['motherMobile', "Mother's Mobile"],
      ['emergencyContactName', 'Emergency Contact Name'], ['emergencyRelationship', 'Relationship'], ['emergencyMobile', 'Emergency Mobile Number'],
      ['addressLine1', 'Address Line 1'], ['city', 'City'], ['state', 'State'], ['pinCode', 'PIN Code'],
    ];
    const missing = required.filter(([key]) => !String(form[key] || '').trim());
    if (missing.length) {
      setError(`Please fill in: ${missing.map(([, label]) => label).join(', ')}.`);
      return;
    }

    setSaving(true);
    try {
      await createModuleRecord(MODULE_KEY, buildPayload('Registered'));
      resetForm();
      setMessage('Student registered successfully.');
    } catch (err) {
      setError(err.message || 'Unable to register student');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <nav className="flex items-center gap-1 text-[13px] text-[#536173] mb-1">
            <a className="text-blue-600 no-underline hover:underline" href="/dashboard">Home</a>
            <span>›</span><span>Students</span><span>›</span><span>Student Registration</span>
          </nav>
          <h1 className="m-0 text-[20px] font-bold text-[#111827]">Student Registration</h1>
        </div>
        <button type="button" onClick={() => navigate('/school/admissions/applications')} className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-[#374151] bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50">
          <ArrowLeft size={14} /> Back to Admissions
        </button>
      </div>

      <div className="bg-white border border-[#dfe7f1] rounded-xl p-3 mb-3">
        <StepBar admissionNumber={form.admissionNumber} />
      </div>

      {error && <div className="mb-3 rounded-xl px-3.5 py-2 bg-red-50 border border-red-100 text-red-700 text-[12.5px]">{error}</div>}
      {message && <div className="mb-3 rounded-xl px-3.5 py-2 bg-emerald-50 border border-emerald-100 text-emerald-700 text-[12.5px]">{message}</div>}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)] gap-3">
        <div className="flex flex-col gap-2.5">
          <Section icon={User} title="Student Information">
            <Field label="Student ID" required>
              <div className="flex gap-2">
                <input className={`${INPUT} min-w-0`} value={studentId} readOnly />
                <button type="button" onClick={() => setStudentId(generateStudentId())} className="inline-flex items-center gap-1 px-3 rounded-md bg-blue-600 text-white border-0 cursor-pointer text-[12px] font-medium flex-none">
                  <RefreshCw size={13} /> Generate
                </button>
              </div>
            </Field>
            <Field label="Admission No" required>
              <SelectDropdown value={form.admissionRecordId} onChange={selectAdmission} options={admissionOptions} placeholder={admissionOptions.length ? 'Select Admission No' : 'No approved admissions yet'} />
            </Field>
            <Field label="Student Name" required><input className={INPUT} value={form.studentName} onChange={setInput('studentName')} placeholder="Enter full name" /></Field>
            <Field label="Date of Birth" required>
              <div className="relative">
                <input type="date" className={`${INPUT} pr-8`} value={form.dob} onChange={setInput('dob')} />
                <Calendar size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none" />
              </div>
            </Field>
            <Field label="Gender" required><SelectDropdown value={form.gender} onChange={set('gender')} options={GENDER_OPTIONS} placeholder="Select Gender" /></Field>
            <Field label="Blood Group"><SelectDropdown value={form.bloodGroup} onChange={set('bloodGroup')} options={BLOOD_GROUP_OPTIONS} placeholder="Select Blood Group" /></Field>
            <Field label="Nationality"><SelectDropdown value={form.nationality} onChange={set('nationality')} options={NATIONALITY_OPTIONS} placeholder="Select Nationality" /></Field>
            <Field label="Aadhaar Number"><input className={INPUT} value={form.aadhaarNumber} onChange={setInput('aadhaarNumber')} placeholder="Enter Aadhaar Number" /></Field>
            <Field label="Religion"><SelectDropdown value={form.religion} onChange={set('religion')} options={RELIGION_OPTIONS} placeholder="Select Religion" /></Field>
          </Section>

          <Section icon={FileText} title="Academic Information">
            <Field label="Class" required><SelectDropdown value={form.className} onChange={set('className')} options={CLASS_OPTIONS} placeholder="Select Class" /></Field>
            <Field label="Section" required><SelectDropdown value={form.section} onChange={set('section')} options={SECTION_OPTIONS} placeholder="Select Section" /></Field>
            <Field label="Roll Number" required><input className={INPUT} value={form.rollNumber} onChange={setInput('rollNumber')} placeholder="Enter Roll Number" /></Field>
            <Field label="Academic Year" required><SelectDropdown value={form.academicYear} onChange={set('academicYear')} options={academicYearOptions()} placeholder="Select Year" /></Field>
            <Field label="Date of Admission" required>
              <div className="relative">
                <input type="date" className={`${INPUT} pr-8`} value={form.dateOfAdmission} onChange={setInput('dateOfAdmission')} />
                <Calendar size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none" />
              </div>
            </Field>
            <Field label="Student Status" required><SelectDropdown value={form.studentStatus} onChange={set('studentStatus')} options={STATUS_OPTIONS} placeholder="Select Status" /></Field>
          </Section>

          <Section icon={Users} title="Parent / Guardian Information">
            <Field label="Father's Name" required><input className={INPUT} value={form.fatherName} onChange={setInput('fatherName')} placeholder="Enter father's name" /></Field>
            <Field label="Mother's Name" required><input className={INPUT} value={form.motherName} onChange={setInput('motherName')} placeholder="Enter mother's name" /></Field>
            <Field label="Guardian Name"><input className={INPUT} value={form.guardianName} onChange={setInput('guardianName')} placeholder="Enter guardian name" /></Field>
            <Field label="Father's Mobile" required><input className={INPUT} value={form.fatherMobile} onChange={setInput('fatherMobile')} placeholder="Enter mobile number" /></Field>
            <Field label="Mother's Mobile" required><input className={INPUT} value={form.motherMobile} onChange={setInput('motherMobile')} placeholder="Enter mobile number" /></Field>
            <Field label="Email ID"><input type="email" className={INPUT} value={form.email} onChange={setInput('email')} placeholder="Enter email address" /></Field>
            <Field label="Occupation (Father)"><input className={INPUT} value={form.occupationFather} onChange={setInput('occupationFather')} placeholder="Enter occupation" /></Field>
            <Field label="Occupation (Mother)"><input className={INPUT} value={form.occupationMother} onChange={setInput('occupationMother')} placeholder="Enter occupation" /></Field>
            <Field label="Annual Income"><SelectDropdown value={form.annualIncome} onChange={set('annualIncome')} options={INCOME_OPTIONS} placeholder="Select Income Range" /></Field>
          </Section>

          <Section icon={Phone} title="Emergency Contact">
            <Field label="Contact Name" required><input className={INPUT} value={form.emergencyContactName} onChange={setInput('emergencyContactName')} placeholder="Enter contact name" /></Field>
            <Field label="Relationship" required><SelectDropdown value={form.emergencyRelationship} onChange={set('emergencyRelationship')} options={RELATIONSHIP_OPTIONS} placeholder="Select Relationship" /></Field>
            <Field label="Mobile Number" required><input className={INPUT} value={form.emergencyMobile} onChange={setInput('emergencyMobile')} placeholder="Enter mobile number" /></Field>
            <Field label="Alternate Number"><input className={INPUT} value={form.emergencyAlternateNumber} onChange={setInput('emergencyAlternateNumber')} placeholder="Enter alternate number" /></Field>
          </Section>

          <Section icon={Home} title="Address Information">
            <Field label="Address Line 1" required><input className={INPUT} value={form.addressLine1} onChange={setInput('addressLine1')} placeholder="Enter address line 1" /></Field>
            <Field label="Address Line 2"><input className={INPUT} value={form.addressLine2} onChange={setInput('addressLine2')} placeholder="Enter address line 2" /></Field>
            <Field label="City" required><input className={INPUT} value={form.city} onChange={setInput('city')} placeholder="Enter city" /></Field>
            <Field label="State" required><input className={INPUT} value={form.state} onChange={setInput('state')} placeholder="Enter state" /></Field>
            <Field label="PIN Code" required><input className={INPUT} value={form.pinCode} onChange={setInput('pinCode')} placeholder="Enter PIN code" /></Field>
          </Section>

          <Section icon={Building2} title="Previous School Information">
            <Field label="Previous School Name"><input className={INPUT} value={form.previousSchoolName} onChange={setInput('previousSchoolName')} placeholder="Enter previous school name" /></Field>
            <Field label="Board"><SelectDropdown value={form.previousBoard} onChange={set('previousBoard')} options={BOARD_OPTIONS} placeholder="Select Board" /></Field>
            <Field label="Last Class Attended"><SelectDropdown value={form.lastClassAttended} onChange={set('lastClassAttended')} options={CLASS_OPTIONS} placeholder="Select Class" /></Field>
            <Field label="Last Academic Year"><SelectDropdown value={form.lastAcademicYear} onChange={set('lastAcademicYear')} options={academicYearOptions()} placeholder="Select Year" /></Field>
          </Section>

          <div className="bg-blue-50 border border-blue-100 rounded-xl px-3.5 py-2.5 text-[12px] text-blue-700">
            Note: After saving, you can assign class, section and roll number from the next step.
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
            <button type="button" disabled={saving} onClick={() => navigate('/school/admissions/applications')} className="px-4 py-2 text-[13px] font-medium text-[#374151] bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 disabled:opacity-60">Cancel</button>
            <button type="button" disabled={saving} onClick={handleSaveDraft} className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-[13px] font-medium text-[#374151] bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 disabled:opacity-60">Save as Draft</button>
            <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-1.5 px-5 py-2 text-[13px] font-bold text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 disabled:opacity-60">
              {saving ? 'Saving...' : 'Save & Next'} <ArrowRight size={14} />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <section className="bg-white border border-[#dfe7f1] rounded-xl p-3.5">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-none"><Camera size={13} /></span>
              <h2 className="m-0 text-[13px] font-bold text-[#111827]">Student Photo</h2>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-[#eef2f7] flex items-center justify-center overflow-hidden">
                  {photo?.previewUrl ? <img src={photo.previewUrl} alt="Student" className="w-full h-full object-cover" /> : <User size={36} className="text-[#94a3b8]" />}
                </div>
                <button type="button" onClick={() => photoInputRef.current?.click()} className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center border-2 border-white cursor-pointer">
                  <Camera size={11} />
                </button>
                <input ref={photoInputRef} type="file" accept=".jpg,.jpeg,.png" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) pickPhoto(f); }} />
              </div>
              <div className="text-center">
                <div className="text-[12.5px] font-semibold text-[#111827]">{photo?.uploading ? 'Uploading...' : 'Upload Photo'}</div>
                <div className="text-[10.5px] text-[#94a3b8]">JPG, PNG (Max size 2MB)</div>
              </div>
              {photo?.id ? (
                <button type="button" onClick={() => openModuleRecordFile(photo.id)} className="text-[11.5px] font-semibold text-blue-600 bg-transparent border-0 cursor-pointer">View Photo</button>
              ) : (
                <button type="button" onClick={() => photoInputRef.current?.click()} className="px-3.5 py-1.5 text-[12px] font-medium text-[#374151] bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50">Choose File</button>
              )}
            </div>
          </section>

          <section className="bg-white border border-[#dfe7f1] rounded-xl p-3.5">
            <h2 className="m-0 mb-2.5 text-[13px] font-bold text-[#111827]">Student Summary</h2>
            <div className="flex flex-col gap-2 text-[12.5px]">
              <div className="flex items-center justify-between"><span className="text-[#94a3b8]">Student ID</span><span className="font-semibold text-[#111827]">{studentId}</span></div>
              <div className="flex items-center justify-between"><span className="text-[#94a3b8]">Admission No</span><span className="font-semibold text-[#111827]">{form.admissionNumber || '—'}</span></div>
              <div className="flex items-center justify-between"><span className="text-[#94a3b8]">Class</span><span className="font-semibold text-[#111827]">{form.className || 'Not Assigned'}</span></div>
              <div className="flex items-center justify-between"><span className="text-[#94a3b8]">Section</span><span className="font-semibold text-[#111827]">{form.section || 'Not Assigned'}</span></div>
              <div className="flex items-center justify-between"><span className="text-[#94a3b8]">Roll Number</span><span className="font-semibold text-[#111827]">{form.rollNumber || 'Not Assigned'}</span></div>
              <div className="flex items-center justify-between"><span className="text-[#94a3b8]">Academic Year</span><span className="font-semibold text-[#111827]">{form.academicYear || '—'}</span></div>
              <div className="flex items-center justify-between"><span className="text-[#94a3b8]">Status</span><span className={`px-2 py-0.5 rounded-md text-[11.5px] font-semibold ${form.studentStatus === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{form.studentStatus}</span></div>
            </div>
          </section>
        </div>
      </form>
    </div>
  );
}
