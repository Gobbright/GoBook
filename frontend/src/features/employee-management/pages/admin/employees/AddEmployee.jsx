import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy } from 'lucide-react';
import { PageHeader } from '../../../components/common/PageHeader.jsx';
import { adminService } from '../../../services/adminService.js';

const initial = { employeeId: '', name: '', email: '', mobileNumber: '', department: '', designation: '', joiningDate: '', password: '', loginAccess: true, status: 'Active', role: 'employee' };

export default function AddEmployee() {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');
  const [createdLoginUrl, setCreatedLoginUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function buildLoginUrl() {
    return window.location.origin + '/employee-login';
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setCreatedLoginUrl('');
    if (!form.name || !form.email) return setError('Employee name and email are required');
    if (form.loginAccess && !form.password) return setError('Password is required when login access is enabled');
    setSaving(true);
    try {
      await adminService.createEmployee(form);
      setCreatedLoginUrl(buildLoginUrl());
      setForm(initial);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Add Employee" subtitle="Create employee and login credentials" />
      {error && <p className="error">{error}</p>}
      <form className="card form-grid" onSubmit={submit}>
        {[
          ['employeeId', 'Employee ID'],
          ['name', 'Employee Name'],
          ['email', 'Email'],
          ['mobileNumber', 'Mobile Number'],
          ['department', 'Department'],
          ['designation', 'Designation'],
          ['joiningDate', 'Joining Date', 'date'],
          ['password', 'Login Password'],
        ].map(([key, label, type = 'text']) => (
          <div className="field" key={key}>
            <label>{label}</label>
            <input type={type} value={form[key]} onChange={(e) => set(key, e.target.value)} />
          </div>
        ))}
        <div className="field">
          <label>Login Access</label>
          <select value={form.loginAccess ? 'Enable' : 'Disable'} onChange={(e) => set('loginAccess', e.target.value === 'Enable')}>
            <option>Enable</option>
            <option>Disable</option>
          </select>
        </div>
        <div className="field">
          <label>Employee Status</label>
          <select value={form.status} onChange={(e) => set('status', e.target.value)}>
            <option>Active</option>
            <option>Inactive</option>
          </select>
        </div>
        <div className="field">
          <label>Portal Role</label>
          <select value={form.role} onChange={(e) => set('role', e.target.value)}>
            <option value="employee">Employee</option>
            <option value="hr">HR</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div className="field" style={{ justifyContent: 'end' }}>
          <button className="btn primary" disabled={saving}>{saving ? 'Saving...' : 'Save Employee'}</button>
        </div>
        {createdLoginUrl && (
          <div className="card employee-login-url">
            <strong>Employee Login URL</strong>
            <button className="btn employee-login-copy-btn" type="button" onClick={() => navigator.clipboard?.writeText(createdLoginUrl)}><Copy size={14} />Copy</button>
            <button className="btn primary" type="button" onClick={() => navigate('/employee-management/employees')}>View Employees</button>
          </div>
        )}
      </form>
    </>
  );
}



