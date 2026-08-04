import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Edit3, Plus, Save, Trash2, X } from 'lucide-react';
import { DataTable } from '../../../components/common/DataTable.jsx';
import { PageHeader } from '../../../components/common/PageHeader.jsx';
import { useLoad } from '../../../hooks/useLoad.js';
import { adminService } from '../../../services/adminService.js';

function buildLoginUrl(row) {
  const url = new URL('/employee-login', window.location.origin);
  if (row.employeeId) url.searchParams.set('employeeId', row.employeeId);
  if (row.userId) url.searchParams.set('ownerUserId', row.userId);
  return url.toString();
}

function LoginCopyButton({ row, copiedId, onCopy }) {
  const disabled = !row.loginAccess || row.status !== 'Active';
  return (
    <button className="btn employee-login-copy-btn" type="button" disabled={disabled} onClick={() => onCopy(row)} title="Copy employee login URL">
      <Copy size={14} />{copiedId === row._id ? 'Copied' : disabled ? 'Login Off' : 'Copy'}
    </button>
  );
}

function fieldValue(value) {
  return value === undefined || value === null ? '' : String(value);
}

function dateInputValue(value) {
  if (!value) return '';
  const text = String(value).trim();
  if (/^\\d{4}-\\d{2}-\\d{2}$/.test(text)) return text;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function EmployeeEditModal({ employee, saving, error, onClose, onSave }) {
  const [form, setForm] = useState({
    name: fieldValue(employee.name),
    email: fieldValue(employee.email),
    phone: fieldValue(employee.phone),
    dept: fieldValue(employee.dept),
    designation: fieldValue(employee.designation),
    joinDate: dateInputValue(employee.joinDate),
    basicSalary: fieldValue(employee.basicSalary || 0),
    currentPassword: fieldValue(employee.loginPassword),
    newPassword: '',
    changePassword: false,
    loginAccess: Boolean(employee.loginAccess),
    status: employee.status || 'Active',
    role: employee.employeeRole || 'employee',
  });

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      mobileNumber: form.phone.trim(),
      department: form.dept.trim(),
      designation: form.designation.trim(),
      joiningDate: form.joinDate,
      basicSalary: Number(form.basicSalary || 0),
      loginAccess: form.loginAccess,
      status: form.status,
      role: form.role,
    };
    if (form.changePassword) {
      payload.password = form.newPassword.trim();
    }
    await onSave(employee._id, payload);
  }

  return (
    <div className="employee-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="employee-modal" role="dialog" aria-modal="true" aria-labelledby="employee-edit-title">
        <div className="employee-modal-head">
          <div>
            <h2 id="employee-edit-title">Edit Employee</h2>
            <p>{employee.employeeId} - {employee.name}</p>
          </div>
          <button className="icon-btn" type="button" onClick={onClose} title="Close"><X size={17} /></button>
        </div>
        {error && <p className="error">{error}</p>}
        <form className="form-grid" onSubmit={submit}>
          <div className="field"><label>Employee ID</label><input value={employee.employeeId || ''} disabled /></div>
          <div className="field"><label>Name</label><input value={form.name} onChange={(event) => set('name', event.target.value)} required /></div>
          <div className="field"><label>Email</label><input type="email" value={form.email} onChange={(event) => set('email', event.target.value)} required /></div>
          <div className="field"><label>Mobile</label><input value={form.phone} onChange={(event) => set('phone', event.target.value)} /></div>
          <div className="field"><label>Department</label><input value={form.dept} onChange={(event) => set('dept', event.target.value)} /></div>
          <div className="field"><label>Designation</label><input value={form.designation} onChange={(event) => set('designation', event.target.value)} /></div>
          <div className="field"><label>Joining Date</label><input type="date" value={form.joinDate} onChange={(event) => set('joinDate', event.target.value)} /></div>
          <div className="field"><label>Basic Salary</label><input type="number" min="0" value={form.basicSalary} onChange={(event) => set('basicSalary', event.target.value)} /></div>
          <div className="field"><label>Login Access</label><select value={form.loginAccess ? 'Enable' : 'Disable'} onChange={(event) => set('loginAccess', event.target.value === 'Enable')}><option>Enable</option><option>Disable</option></select></div>
          <div className="field"><label>Status</label><select value={form.status} onChange={(event) => set('status', event.target.value)}><option>Active</option><option>Inactive</option></select></div>
          <div className="field"><label>Portal Role</label><select value={form.role} onChange={(event) => set('role', event.target.value)}><option value="employee">Employee</option><option value="hr">HR</option><option value="admin">Admin</option></select></div>
          <div className="field"><label>Login Password</label><input type="text" value={form.currentPassword || '-'} readOnly /></div>
          <label className="employee-check-field"><input type="checkbox" checked={form.changePassword} onChange={(event) => set('changePassword', event.target.checked)} />Change Password</label>
          {form.changePassword && <div className="field"><label>New Password</label><input type="text" value={form.newPassword} required onChange={(event) => set('newPassword', event.target.value)} /></div>}
          <div className="employee-modal-actions field-full"><button className="btn" type="button" onClick={onClose}>Cancel</button><button className="btn primary" type="submit" disabled={saving}><Save size={15} />{saving ? 'Saving...' : 'Save Changes'}</button></div>
        </form>
      </section>
    </div>
  );
}

function DeleteConfirmModal({ employee, deleting, error, onClose, onConfirm }) {
  return (
    <div className="employee-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="employee-modal employee-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="employee-delete-title">
        <div className="employee-modal-head">
          <div>
            <h2 id="employee-delete-title">Delete Employee</h2>
            <p>{employee.employeeId} - {employee.name}</p>
          </div>
          <button className="icon-btn" type="button" onClick={onClose} title="Close"><X size={17} /></button>
        </div>
        {error && <p className="error">{error}</p>}
        <p className="employee-confirm-copy">This will delete the employee login and related employee management records for this account.</p>
        <div className="employee-modal-actions">
          <button className="btn" type="button" onClick={onClose}>Cancel</button>
          <button className="btn danger" type="button" disabled={deleting} onClick={() => onConfirm(employee)}><Trash2 size={15} />{deleting ? 'Deleting...' : 'Confirm Delete'}</button>
        </div>
      </section>
    </div>
  );
}

export default function EmployeeList() {
  const { data, loading, error: loadError, setData } = useLoad(adminService.employees, []);
  const [copiedId, setCopiedId] = useState('');
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [actionError, setActionError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const rows = data?.data || [];
  const columns = [
    { key: 'employeeId', label: 'Employee ID' },
    { key: 'loginPassword', label: 'Password', render: (row) => row.loginPassword || '-' },
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Mobile' },
    { key: 'dept', label: 'Department' },
    { key: 'designation', label: 'Designation' },
    { key: 'status', label: 'Status' },
    { key: 'loginUrl', label: 'Login', render: (row) => <LoginCopyButton row={row} copiedId={copiedId} onCopy={copyLoginUrl} /> },
  ];

  async function copyLoginUrl(row) {
    const url = buildLoginUrl(row);
    await navigator.clipboard?.writeText(url);
    setCopiedId(row._id);
    window.setTimeout(() => setCopiedId(''), 1400);
  }

  async function saveEmployee(id, payload) {
    setSaving(true);
    setActionError('');
    try {
      const updated = await adminService.updateEmployee(id, payload);
      setData((current) => ({ ...current, data: (current?.data || []).map((employee) => employee._id === id ? updated : employee) }));
      setEditing(null);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete(employee) {
    setDeleting(true);
    setActionError('');
    try {
      await adminService.deleteEmployee(employee._id);
      setData((current) => ({ ...current, data: (current?.data || []).filter((item) => item._id !== employee._id) }));
      setDeleteTarget(null);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <PageHeader title="Employee List" subtitle="Manage employee records and employee login links" action={<Link className="btn primary" to="/employee-management/employees/add"><Plus size={15} />Add Employee</Link>} />
      {(loadError || (!editing && !deleteTarget && actionError)) && <p className="error">{loadError || actionError}</p>}
      {loading ? <div className="card">Loading employees...</div> : <DataTable columns={columns} rows={rows} actions={(row) => <div className="row-actions"><button className="icon-btn" type="button" title="Edit" aria-label="Edit employee" onClick={() => { setActionError(''); setEditing(row); }}><Edit3 size={15} /></button><button className="icon-btn danger" type="button" title="Delete" aria-label="Delete employee" onClick={() => { setActionError(''); setDeleteTarget(row); }}><Trash2 size={15} /></button></div>} />}
      {editing && <EmployeeEditModal employee={editing} saving={saving} error={actionError} onClose={() => setEditing(null)} onSave={saveEmployee} />}
      {deleteTarget && <DeleteConfirmModal employee={deleteTarget} deleting={deleting} error={actionError} onClose={() => setDeleteTarget(null)} onConfirm={confirmDelete} />}
    </>
  );
}