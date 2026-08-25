import { useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Award, Building2, Calendar, Check, CreditCard, FileText, GraduationCap, IdCard,
  Phone, RefreshCw, Upload, User, Users, X,
} from 'lucide-react';

import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';
import { createModuleRecord, openModuleRecordFile, uploadModuleRecordFile } from '../../../../../services/moduleRecordsService.js';
import { useCurrentUser } from '../../../../../hooks/useCurrentUser.js';

const MODULE_KEY = 'school/admissions/new-admission';

const LABEL = 'block text-[12.5px] font-medium text-[#374151] mb-1';
const INPUT = 'w-full border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit] bg-white';

const CLASS_OPTIONS = ['Nursery', 'LKG', 'UKG', ...Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`)];
const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
const CATEGORY_OPTIONS = ['General', 'OBC', 'SC', 'ST', 'EWS', 'Other'];
const STATE_OPTIONS = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra',
  'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Other',
];
const BOARD_OPTIONS = ['CBSE', 'ICSE', 'State Board', 'IB', 'Other'];
const MEDIUM_OPTIONS = ['English', 'Hindi', 'Regional Language', 'Other'];
const PAYMENT_MODE_OPTIONS = ['Cash', 'Card', 'UPI', 'Bank Transfer', 'Cheque'];

function academicYearOptions() {
  const year = new Date().getFullYear();
  return [year - 1, year, year + 1].map((y) => `${y}-${y + 1}`);
}

function generateApplicationNumber() {
  const year = new Date().getFullYear();
  const seq = String(Math.floor(100000 + Math.random() * 900000));
  return `APP${year}-${seq}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function initialForm(prefill) {
  return {
    fullName: '', dob: '', gender: '', classApplyingFor: '', academicYear: academicYearOptions()[1], category: '',
    guardianName: '', motherName: '', occupation: '', email: '', mobileNumber: '', alternateNumber: '',
    addressLine1: '', addressLine2: '', city: '', state: '', pinCode: '',
    previousSchoolName: '', board: '', lastClassAttended: '', mediumOfInstruction: '', previousAcademicYear: '', tcNumber: '',
    lastExamPassed: '', percentageCgpa: '', grade: '', subjectsStudied: '',
    applicationFee: '500.00', paymentMode: '', transactionRef: '',
    ...prefill,
  };
}

const DOCUMENT_TYPES = [
  { key: 'studentPhoto', label: 'Student Photo', required: true },
  { key: 'birthCertificate', label: 'Birth Certificate', required: true },
  { key: 'aadharCard', label: 'Aadhar Card' },
  { key: 'previousTc', label: 'Previous TC' },
  { key: 'marksheet', label: 'Marksheet' },
  { key: 'others', label: 'Others' },
];

const STEPS = [
  { label: 'Enquiry', icon: IdCard },
  { label: 'Application', icon: FileText },
  { label: 'Document Verification', icon: FileText },
  { label: 'Selection', icon: Users },
  { label: 'Admission', icon: FileText },
];

function StepBar() {
  return (
    <div className="flex items-center mb-5">
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const state = i === 0 ? 'done' : i === 1 ? 'active' : 'pending';
        return (
          <div key={step.label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 ${
                state === 'done' ? 'bg-emerald-500 border-emerald-500 text-white'
                  : state === 'active' ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-[#dbe4ef] text-[#94a3b8]'
              }`}
              >
                {state === 'done' ? <Check size={16} /> : <Icon size={15} />}
              </div>
              <div className="text-center leading-tight">
                <div className="text-[10.5px] text-[#94a3b8]">Step {i + 1}</div>
                <div className={`text-[12px] font-semibold ${state === 'pending' ? 'text-[#94a3b8]' : 'text-[#111827]'}`}>{step.label}</div>
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 mx-2 ${i === 0 ? 'bg-emerald-400' : 'bg-[#e2e8f0]'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <section className="bg-white border border-[#dfe7f1] rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-none">
          <Icon size={15} />
        </span>
        <h2 className="m-0 text-[14.5px] font-bold text-[#111827]">{title}</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

function UploadBox({ label, required, file, onPick, onRemove }) {
  const inputRef = useRef(null);

  return (
    <div>
      <label className={LABEL}>{label}{required && <span className="text-red-500"> *</span>}</label>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(e) => {
          const picked = e.target.files?.[0];
          e.target.value = '';
          if (picked) onPick(picked);
        }}
      />
      <button
        type="button"
        onClick={() => (file?.id ? openModuleRecordFile(file.id) : inputRef.current?.click())}
        className="w-full flex flex-col items-center justify-center gap-1 border border-dashed border-[#cbd5e1] rounded-lg py-4 bg-[#f8fafc] hover:bg-[#f1f5f9] cursor-pointer"
      >
        {file?.uploading ? (
          <RefreshCw size={16} className="text-blue-500 animate-spin" />
        ) : file?.id ? (
          <Check size={16} className="text-emerald-600" />
        ) : (
          <Upload size={16} className="text-[#64748b]" />
        )}
        <span className="text-[11.5px] text-[#536173] truncate max-w-full px-2">
          {file?.uploading ? 'Uploading...' : file?.filename ? file.filename : 'Upload'}
        </span>
      </button>
      {file?.id && !file.uploading && (
        <button type="button" onClick={onRemove} className="mt-1 inline-flex items-center gap-1 text-[11px] text-red-500 bg-transparent border-0 cursor-pointer p-0">
          <X size={11} /> Remove
        </button>
      )}
    </div>
  );
}

export function NewAdmissionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = useCurrentUser();
  const [form, setForm] = useState(() => initialForm(location.state?.prefill));
  const [documents, setDocuments] = useState({});
  const [applicationNumber, setApplicationNumber] = useState(generateApplicationNumber);
  const [applicationDate] = useState(todayISO);
  const [status, setStatus] = useState('Draft');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  function set(key) {
    return (value) => setForm((current) => ({ ...current, [key]: value }));
  }

  function setInput(key) {
    return (e) => set(key)(e.target.value);
  }

  async function pickDocument(key, file) {
    setError('');
    if (file.size > 2 * 1024 * 1024) {
      setError('Each document must be 2MB or smaller.');
      return;
    }
    setDocuments((current) => ({ ...current, [key]: { uploading: true, filename: file.name } }));
    try {
      const stored = await uploadModuleRecordFile(MODULE_KEY, file);
      setDocuments((current) => ({ ...current, [key]: { id: stored.id, filename: stored.filename } }));
    } catch (err) {
      setDocuments((current) => ({ ...current, [key]: null }));
      setError(err.message || 'Unable to upload file');
    }
  }

  function removeDocument(key) {
    setDocuments((current) => ({ ...current, [key]: null }));
  }

  function resetForm() {
    setForm(initialForm());
    setDocuments({});
    setApplicationNumber(generateApplicationNumber());
    setStatus('Draft');
    setError('');
    setMessage('');
  }

  function buildPayload(nextStatus) {
    return {
      ...form,
      documents: Object.fromEntries(DOCUMENT_TYPES.map(({ key }) => [key, documents[key]?.id ? { id: documents[key].id, filename: documents[key].filename } : null])),
      applicationNumber,
      applicationDate,
      status: nextStatus,
      history: [{ status: nextStatus, note: nextStatus === 'Submitted' ? 'Application submitted' : 'Saved as draft', at: new Date().toISOString(), by: currentUser?.name || form.fullName || 'Applicant' }],
      remarks: [],
    };
  }

  async function handleSaveDraft() {
    setError('');
    setMessage('');
    setSaving(true);
    try {
      await createModuleRecord(MODULE_KEY, buildPayload('Draft'));
      setStatus('Draft');
      setMessage('Application saved as draft.');
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
      ['fullName', 'Full Name'], ['dob', 'Date of Birth'], ['gender', 'Gender'],
      ['classApplyingFor', 'Class Applying For'], ['academicYear', 'Academic Year'],
      ['guardianName', "Father's / Guardian's Name"], ['mobileNumber', 'Mobile Number'],
      ['addressLine1', 'Address Line 1'], ['city', 'City'], ['state', 'State'], ['pinCode', 'PIN Code'],
      ['applicationFee', 'Application Fee'], ['paymentMode', 'Payment Mode'],
    ];
    const missing = required.filter(([key]) => !String(form[key] || '').trim());
    if (missing.length) {
      setError(`Please fill in: ${missing.map(([, label]) => label).join(', ')}.`);
      return;
    }
    if (!documents.studentPhoto?.id || !documents.birthCertificate?.id) {
      setError('Student Photo and Birth Certificate are required.');
      return;
    }

    setSaving(true);
    try {
      await createModuleRecord(MODULE_KEY, buildPayload('Submitted'));
      resetForm();
      setMessage('Application submitted successfully.');
    } catch (err) {
      setError(err.message || 'Unable to submit application');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 md:p-7">
      <div className="mb-5">
        <nav className="flex items-center gap-1 text-[13px] text-[#536173] mb-1">
          <a className="text-blue-600 no-underline hover:underline" href="/dashboard">Home</a>
          <span>›</span><span>Admissions</span><span>›</span><span>New Admission</span>
        </nav>
        <h1 className="m-0 text-[22px] font-bold text-[#111827]">New Admission</h1>
      </div>

      <StepBar />

      {error && <div className="mb-4 rounded-xl px-4 py-2.5 bg-red-50 border border-red-100 text-red-700 text-[13px]">{error}</div>}
      {message && <div className="mb-4 rounded-xl px-4 py-2.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-[13px]">{message}</div>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Section icon={User} title="Student Personal Information">
            <Field label="Full Name" required><input className={INPUT} value={form.fullName} onChange={setInput('fullName')} placeholder="Enter full name" /></Field>
            <Field label="Date of Birth" required>
              <div className="relative">
                <input type="date" className={`${INPUT} pr-8`} value={form.dob} onChange={setInput('dob')} />
                <Calendar size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none" />
              </div>
            </Field>
            <Field label="Gender" required><SelectDropdown value={form.gender} onChange={set('gender')} options={GENDER_OPTIONS} placeholder="Select Gender" /></Field>
            <Field label="Class Applying For" required><SelectDropdown value={form.classApplyingFor} onChange={set('classApplyingFor')} options={CLASS_OPTIONS} placeholder="Select Class" /></Field>
            <Field label="Academic Year" required><SelectDropdown value={form.academicYear} onChange={set('academicYear')} options={academicYearOptions()} placeholder="Select Year" /></Field>
            <Field label="Category"><SelectDropdown value={form.category} onChange={set('category')} options={CATEGORY_OPTIONS} placeholder="Select Category" /></Field>
          </Section>

          <Section icon={Users} title="Parent / Guardian Information">
            <Field label="Father's / Guardian's Name" required><input className={INPUT} value={form.guardianName} onChange={setInput('guardianName')} placeholder="Enter name" /></Field>
            <Field label="Mother's Name"><input className={INPUT} value={form.motherName} onChange={setInput('motherName')} placeholder="Enter name" /></Field>
            <Field label="Occupation"><input className={INPUT} value={form.occupation} onChange={setInput('occupation')} placeholder="Enter occupation" /></Field>
            <Field label="Email ID"><input type="email" className={INPUT} value={form.email} onChange={setInput('email')} placeholder="Enter email" /></Field>
            <Field label="Mobile Number" required><input className={INPUT} value={form.mobileNumber} onChange={setInput('mobileNumber')} placeholder="Enter mobile number" /></Field>
            <Field label="Alternate Number"><input className={INPUT} value={form.alternateNumber} onChange={setInput('alternateNumber')} placeholder="Enter alternate number" /></Field>
          </Section>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Section icon={Phone} title="Contact Details">
            <Field label="Address Line 1" required><input className={INPUT} value={form.addressLine1} onChange={setInput('addressLine1')} placeholder="Enter address line 1" /></Field>
            <Field label="Address Line 2"><input className={INPUT} value={form.addressLine2} onChange={setInput('addressLine2')} placeholder="Enter address line 2" /></Field>
            <Field label="City" required><input className={INPUT} value={form.city} onChange={setInput('city')} placeholder="Enter city" /></Field>
            <Field label="State" required><SelectDropdown value={form.state} onChange={set('state')} options={STATE_OPTIONS} placeholder="Select State" /></Field>
            <Field label="PIN Code" required><input className={INPUT} value={form.pinCode} onChange={setInput('pinCode')} placeholder="Enter PIN code" /></Field>
          </Section>

          <Section icon={Building2} title="Previous School Details">
            <Field label="Previous School Name"><input className={INPUT} value={form.previousSchoolName} onChange={setInput('previousSchoolName')} placeholder="Enter school name" /></Field>
            <Field label="Board"><SelectDropdown value={form.board} onChange={set('board')} options={BOARD_OPTIONS} placeholder="Select Board" /></Field>
            <Field label="Last Class Attended"><SelectDropdown value={form.lastClassAttended} onChange={set('lastClassAttended')} options={CLASS_OPTIONS} placeholder="Select Class" /></Field>
            <Field label="Medium of Instruction"><SelectDropdown value={form.mediumOfInstruction} onChange={set('mediumOfInstruction')} options={MEDIUM_OPTIONS} placeholder="Select Medium" /></Field>
            <Field label="Previous Academic Year"><SelectDropdown value={form.previousAcademicYear} onChange={set('previousAcademicYear')} options={academicYearOptions()} placeholder="Select Year" /></Field>
            <Field label="TC Number (If any)"><input className={INPUT} value={form.tcNumber} onChange={setInput('tcNumber')} placeholder="Enter TC number" /></Field>
          </Section>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Section icon={GraduationCap} title="Previous Academic Information">
            <Field label="Last Exam Passed"><SelectDropdown value={form.lastExamPassed} onChange={set('lastExamPassed')} options={CLASS_OPTIONS} placeholder="Select Exam" /></Field>
            <Field label="Percentage / CGPA"><input className={INPUT} value={form.percentageCgpa} onChange={setInput('percentageCgpa')} placeholder="Enter percentage or CGPA" /></Field>
            <Field label="Grade"><input className={INPUT} value={form.grade} onChange={setInput('grade')} placeholder="Enter grade" /></Field>
            <div className="sm:col-span-2 lg:col-span-3">
              <Field label="Subjects Studied"><input className={INPUT} value={form.subjectsStudied} onChange={setInput('subjectsStudied')} placeholder="Enter subjects studied (comma separated)" /></Field>
            </div>
          </Section>

          <section className="bg-white border border-[#dfe7f1] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-none">
                <Upload size={15} />
              </span>
              <h2 className="m-0 text-[14.5px] font-bold text-[#111827]">Upload Admission Documents</h2>
            </div>
            <p className="text-[11.5px] text-[#94a3b8] mb-4 ml-9">(PDF, JPG, PNG – Max size 2MB each)</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {DOCUMENT_TYPES.map(({ key, label, required }) => (
                <UploadBox
                  key={key}
                  label={label}
                  required={required}
                  file={documents[key]}
                  onPick={(file) => pickDocument(key, file)}
                  onRemove={() => removeDocument(key)}
                />
              ))}
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Section icon={CreditCard} title="Application Fee">
            <Field label="Application Fee (₹)" required><input type="number" step="0.01" className={INPUT} value={form.applicationFee} onChange={setInput('applicationFee')} /></Field>
            <Field label="Payment Mode" required><SelectDropdown value={form.paymentMode} onChange={set('paymentMode')} options={PAYMENT_MODE_OPTIONS} placeholder="Select Payment Mode" /></Field>
            <Field label="Transaction / Reference No."><input className={INPUT} value={form.transactionRef} onChange={setInput('transactionRef')} placeholder="Enter transaction no." /></Field>
          </Section>

          <Section icon={FileText} title="Application Information">
            <div className="sm:col-span-2 lg:col-span-3">
              <Field label="Application Number">
                <div className="flex gap-2">
                  <input className={`${INPUT} min-w-0`} value={applicationNumber} readOnly />
                  <button type="button" onClick={() => setApplicationNumber(generateApplicationNumber())} className="inline-flex items-center gap-1 px-3 rounded-md bg-blue-600 text-white border-0 cursor-pointer text-[12px] font-medium flex-none">
                    <RefreshCw size={13} /> Generate
                  </button>
                </div>
              </Field>
            </div>
            <Field label="Application Date">
              <div className="relative">
                <input type="date" className={`${INPUT} pr-8`} value={applicationDate} readOnly />
                <Calendar size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none" />
              </div>
            </Field>
            <Field label="Status">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[12px] font-semibold ${status === 'Submitted' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                <Award size={12} /> {status}
              </span>
            </Field>
          </Section>
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-between gap-3 mt-1">
          <div className="flex gap-2">
            <button type="button" disabled={saving} onClick={handleSaveDraft} className="inline-flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium text-[#374151] bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 disabled:opacity-60">
              <FileText size={14} /> Save as Draft
            </button>
            <button type="button" disabled={saving} onClick={resetForm} className="inline-flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium text-[#374151] bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 disabled:opacity-60">
              <RefreshCw size={14} /> Reset
            </button>
          </div>
          <div className="flex gap-2">
            <button type="button" disabled={saving} onClick={() => navigate('/school/admissions/applications')} className="px-4 py-2.5 text-[13px] font-medium text-[#374151] bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 disabled:opacity-60">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 px-5 py-2.5 text-[13px] font-bold text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 disabled:opacity-60">
              {saving ? 'Submitting...' : 'Submit Application'} <FileText size={14} />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
