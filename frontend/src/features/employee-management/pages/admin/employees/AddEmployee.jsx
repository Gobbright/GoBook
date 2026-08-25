import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BriefcaseBusiness, FileText, Save, Upload, UserRound } from 'lucide-react';

import { adminService } from '../../../services/adminService.js';

const STEPS = ['Personal', 'Employment', 'Payroll', 'Documents', 'Review'];

const initial = {
  employeeId: '', name: '', email: '', mobileNumber: '', dateOfBirth: '', gender: '', bloodGroup: '',
  address: '', emergencyName: '', emergencyRelationship: '', emergencyPhone: '',
  department: '', designation: '', branch: '', reportingManager: '', joiningDate: '', employmentType: 'Full Time',
  shift: 'General Shift', workLocation: 'Office', basicSalary: '', password: '', loginAccess: true, status: 'Active', role: 'employee',
};

function Field({ label, required, children }) {
  return <label className="hr-field">{label}{required && <b>*</b>}{children}</label>;
}

export default function AddEmployee() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initial);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  function set(key, value) { setForm((current) => ({ ...current, [key]: value })); }

  function choosePhoto(file) {
    setPhoto(file || null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(file ? URL.createObjectURL(file) : '');
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (!form.name || !form.email) return setError('Employee name and email are required');
    if (form.loginAccess && !form.password) return setError('Password is required when login access is enabled');
    setSaving(true);
    try {
      const payload = {
        ...form,
        phone: form.mobileNumber,
        emergencyContact: { name: form.emergencyName, relationship: form.emergencyRelationship, phone: form.emergencyPhone },
        basicSalary: Number(form.basicSalary || 0),
      };
      if (photo) {
        const formData = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
          formData.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
        });
        formData.append('photo', photo);
        await adminService.createEmployeeWithPhoto(formData);
      } else {
        await adminService.createEmployee(payload);
      }
      navigate('/employee-management/employees');
    } catch (err) {
      setError(err.message || 'Unable to save employee');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="hr-screen" onSubmit={submit}>
      <div className="hr-breadcrumb"><Link to="/employee-management/employees"><ArrowLeft size={15} /> Employees</Link><span>/</span><strong>Add Employee</strong></div>
      <div className="hr-page-head">
        <div><h1>Add New Employee</h1><p>Create employee profile and configure employment details</p></div>
        <div className="hr-actions"><button className="hr-btn" type="button">Save Draft</button><button className="hr-btn primary" disabled={saving}>{saving ? 'Saving...' : 'Submit Employee'}</button></div>
      </div>
      {error && <p className="error">{error}</p>}

      <div className="hr-stepper">{STEPS.map((label, index) => <button key={label} type="button" className={index === step ? 'active' : ''} onClick={() => setStep(index)}><span>{index + 1}</span>{label}</button>)}</div>

      <div className="hr-form-layout">
        <section className="hr-card">
          {step === 0 && (
            <>
              <h2>Personal Information</h2>
              <div className="hr-form-grid">
                <label className="hr-upload-box employee-photo-upload">
                  {photoPreview ? <img src={photoPreview} alt="Selected employee profile" /> : <Upload size={24} />}
                  <span>{photo ? photo.name : 'Click to upload'}</span>
                  <small>{photo ? `${Math.max(1, Math.round(photo.size / 1024))} KB` : 'JPG, PNG (Max 2MB)'}</small>
                  <input accept=".jpg,.jpeg,.png,image/jpeg,image/png" type="file" onChange={(e) => choosePhoto(e.target.files?.[0])} />
                </label>
                <Field label="Employee ID" required><input value={form.employeeId} onChange={(e) => set('employeeId', e.target.value)} placeholder="EMP-00129" /></Field>
                <Field label="Full Name" required><input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Enter full name" /></Field>
                <Field label="Date of Birth"><input type="date" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} /></Field>
                <Field label="Gender"><select value={form.gender} onChange={(e) => set('gender', e.target.value)}><option value="">Select Gender</option><option>Male</option><option>Female</option><option>Other</option></select></Field>
                <Field label="Blood Group"><select value={form.bloodGroup} onChange={(e) => set('bloodGroup', e.target.value)}><option value="">Select Blood Group</option>{['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((v) => <option key={v}>{v}</option>)}</select></Field>
                <Field label="Mobile" required><input value={form.mobileNumber} onChange={(e) => set('mobileNumber', e.target.value)} placeholder="Enter mobile number" /></Field>
                <Field label="Email" required><input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="Enter email address" /></Field>
                <Field label="Address"><textarea value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Enter full address" /></Field>
              </div>
              <h3>Emergency Contact</h3>
              <div className="hr-form-grid three">
                <Field label="Name"><input value={form.emergencyName} onChange={(e) => set('emergencyName', e.target.value)} placeholder="Enter name" /></Field>
                <Field label="Relationship"><input value={form.emergencyRelationship} onChange={(e) => set('emergencyRelationship', e.target.value)} placeholder="Relationship" /></Field>
                <Field label="Mobile"><input value={form.emergencyPhone} onChange={(e) => set('emergencyPhone', e.target.value)} placeholder="Enter mobile number" /></Field>
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <h2>Employment Details</h2>
              <div className="hr-form-grid">
                <Field label="Department"><input value={form.department} onChange={(e) => set('department', e.target.value)} placeholder="Front Office" /></Field>
                <Field label="Designation"><input value={form.designation} onChange={(e) => set('designation', e.target.value)} placeholder="Senior Front Desk Executive" /></Field>
                <Field label="Branch"><input value={form.branch} onChange={(e) => set('branch', e.target.value)} placeholder="Chennai" /></Field>
                <Field label="Reporting Manager"><input value={form.reportingManager} onChange={(e) => set('reportingManager', e.target.value)} placeholder="Manager name" /></Field>
                <Field label="Joining Date"><input type="date" value={form.joiningDate} onChange={(e) => set('joiningDate', e.target.value)} /></Field>
                <Field label="Employment Type"><select value={form.employmentType} onChange={(e) => set('employmentType', e.target.value)}>{['Full Time', 'Part Time', 'Contract', 'Intern', 'Temporary', 'Consultant'].map((v) => <option key={v}>{v}</option>)}</select></Field>
                <Field label="Shift"><input value={form.shift} onChange={(e) => set('shift', e.target.value)} /></Field>
                <Field label="Work Location"><input value={form.workLocation} onChange={(e) => set('workLocation', e.target.value)} /></Field>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <h2>Payroll Setup</h2>
              <div className="hr-form-grid">
                <Field label="Monthly Basic Salary"><input type="number" min="0" value={form.basicSalary} onChange={(e) => set('basicSalary', e.target.value)} /></Field>
                <Field label="Login Access"><select value={form.loginAccess ? 'Enable' : 'Disable'} onChange={(e) => set('loginAccess', e.target.value === 'Enable')}><option>Enable</option><option>Disable</option></select></Field>
                <Field label="Login Password"><input value={form.password} onChange={(e) => set('password', e.target.value)} /></Field>
                <Field label="Portal Role"><select value={form.role} onChange={(e) => set('role', e.target.value)}><option value="employee">Employee</option><option value="hr">HR</option><option value="admin">Admin</option></select></Field>
                <Field label="Status"><select value={form.status} onChange={(e) => set('status', e.target.value)}>{['Active', 'Probation', 'On Leave', 'Inactive', 'Resigned', 'Terminated'].map((v) => <option key={v}>{v}</option>)}</select></Field>
              </div>
            </>
          )}
          {step === 3 && <div className="hr-empty-docs"><FileText size={38} /><h2>Documents</h2><p>Employee document upload and verification is available after creating the employee profile.</p></div>}
          {step === 4 && <div className="hr-review"><h2>Review</h2>{[['Name', form.name], ['Email', form.email], ['Department', form.department], ['Designation', form.designation], ['Branch', form.branch], ['Employment Type', form.employmentType], ['Status', form.status]].map(([k, v]) => <p key={k}><span>{k}</span><strong>{v || '-'}</strong></p>)}</div>}

          <div className="hr-form-actions">
            <button className="hr-btn" type="button" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>Back</button>
            {step < STEPS.length - 1 ? <button className="hr-btn primary" type="button" onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>Save & Continue <ArrowRight size={14} /></button> : <button className="hr-btn primary" disabled={saving}><Save size={14} /> Submit Employee</button>}
          </div>
        </section>

        <aside className="hr-side-stack">
          <section className="hr-card"><h2>Employment Types</h2>{['Full Time', 'Part Time', 'Contract', 'Intern', 'Temporary', 'Consultant'].map((type) => <button className={form.employmentType === type ? 'hr-type active' : 'hr-type'} type="button" key={type} onClick={() => set('employmentType', type)}><BriefcaseBusiness size={15} /><span>{type}<small>{type === 'Full Time' ? 'Regular full time employment' : `${type} employment`}</small></span></button>)}</section>
          <section className="hr-card"><h2>Workflow</h2>{STEPS.map((label, index) => <div className={index <= step ? 'hr-workflow done' : 'hr-workflow'} key={label}><span />{label}</div>)}</section>
          <section className="hr-card"><h2>Profile</h2><div className="hr-profile-mini"><UserRound size={34} /><strong>{form.name || 'New Employee'}</strong><span>{form.designation || 'Designation not set'}</span></div></section>
        </aside>
      </div>
    </form>
  );
}
