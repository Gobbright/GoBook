import { useMemo, useState } from 'react';
import { Check, Download, Eye, FileText, Filter, Upload, X } from 'lucide-react';

import { useLoad } from '../../../hooks/useLoad.js';
import { adminService } from '../../../services/adminService.js';
import { leaveService } from '../../../services/leaveService.js';
import { LeaveNav } from './LeaveNav.jsx';
import { SERVER_ORIGIN } from '../../../../../services/apiBase.js';

const TYPES = ['Casual Leave', 'Sick Leave', 'Annual Leave', 'Unpaid Leave', 'Comp Off', 'Maternity Leave', 'Paternity Leave'];
const today = () => new Date().toISOString().slice(0, 10);

function countDays(from, to) {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to || from}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
  return Math.max(1, Math.round((end - start) / 86400000) + 1);
}

function formatDate(value) {
  if (!value) return '-';
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusClass(status) {
  if (status === 'Approved') return 'hr-pill green';
  if (status === 'Rejected') return 'hr-pill red';
  return 'hr-pill amber';
}

function fileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function LeaveRequests() {
  const { data, loading, error, setData } = useLoad(leaveService.adminLeaves, []);
  const employeesLoad = useLoad(adminService.employees, []);
  const leaves = useMemo(() => data?.data || [], [data]);
  const employees = useMemo(() => employeesLoad.data?.data || [], [employeesLoad.data]);
  const departments = [...new Set(employees.map((employee) => employee.dept).filter(Boolean))];
  const [tab, setTab] = useState('All Requests');
  const [status, setStatus] = useState('');
  const [dept, setDept] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState({ empId: '', type: 'Casual Leave', from: today(), to: today(), reason: '' });
  const [attachment, setAttachment] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [submitError, setSubmitError] = useState('');

  const scoped = leaves.filter((row) => {
    const isMine = tab === 'My Requests' ? row.recordedBy !== 'Employee Portal' : true;
    return isMine && (!status || row.status === status) && (!dept || row.dept === dept);
  });
  const selected = scoped.find((row) => row._id === selectedId) || scoped[0];

  async function submitLeave(event) {
    event?.preventDefault();
    setSubmitError('');
    setSubmitMessage('');
    const empId = form.empId || employees[0]?.employeeId;
    if (!empId) {
      setSubmitError('Select an employee before submitting leave.');
      return;
    }
    if (!form.from || !form.to) {
      setSubmitError('From and to dates are required.');
      return;
    }
    setSubmitting(true);
    const days = countDays(form.from, form.to);
    try {
      let created;
      if (attachment) {
        const payload = new FormData();
        Object.entries({ ...form, empId, days }).forEach(([key, value]) => payload.append(key, value));
        payload.append('attachment', attachment);
        created = await leaveService.createAdminWithAttachment(payload);
      } else {
        created = await leaveService.createAdmin({ ...form, empId, days });
      }
      setData((current) => ({ data: [created, ...(current?.data || [])] }));
      setSelectedId(created._id);
      setTab('All Requests');
      setStatus('');
      setDept('');
      setForm({ empId, type: 'Casual Leave', from: today(), to: today(), reason: '' });
      setAttachment(null);
      setSubmitMessage('Leave request submitted.');
    } catch (err) {
      setSubmitError(err.message || 'Unable to submit leave request.');
    } finally {
      setSubmitting(false);
    }
  }

  async function update(row, nextStatus) {
    const updated = await leaveService.updateStatus(row._id, nextStatus);
    setData((current) => ({ data: (current?.data || []).map((record) => record._id === updated._id ? updated : record) }));
  }

  return (
    <div className="hr-screen">
      <div className="hr-page-head"><div><h1>Leave Requests</h1><p>Manage and track leave requests</p></div></div>
      <LeaveNav current="/employee-management/leave" />
      {error && <p className="error">{error}</p>}
      <div className="hr-tabs">{['My Requests', 'All Requests'].map((item) => <button key={item} className={tab === item ? 'active' : ''} type="button" onClick={() => setTab(item)}>{item}</button>)}</div>
      <div className="leave-request-layout">
        <form className="hr-card leave-apply-card" onSubmit={submitLeave}>
          <h2>Apply Leave</h2>
          {submitError && <p className="error">{submitError}</p>}
          {submitMessage && <p className="leave-success-message">{submitMessage}</p>}
          <label className="hr-field">Employee<select value={form.empId} onChange={(e) => setForm((current) => ({ ...current, empId: e.target.value }))}><option value="">Select employee</option>{employees.map((employee) => <option key={employee._id} value={employee.employeeId}>{employee.name} ({employee.employeeId})</option>)}</select></label>
          <label className="hr-field">Leave Type<select value={form.type} onChange={(e) => setForm((current) => ({ ...current, type: e.target.value }))}>{TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
          <label className="hr-field">From<input type="date" value={form.from} onChange={(e) => setForm((current) => ({ ...current, from: e.target.value, to: current.to || e.target.value }))} /></label>
          <label className="hr-field">To<input type="date" value={form.to} onChange={(e) => setForm((current) => ({ ...current, to: e.target.value }))} /></label>
          <label className="hr-field">Reason<textarea value={form.reason} onChange={(e) => setForm((current) => ({ ...current, reason: e.target.value }))} placeholder="Reason for leave" /></label>
          <label className="leave-upload">
            <Upload size={15} />
            {attachment ? attachment.name : 'Upload File'}
            <span>{attachment ? fileSize(attachment.size) : 'PDF, JPG, PNG (Max 5MB)'}</span>
            <input
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              type="file"
              onChange={(e) => setAttachment(e.target.files?.[0] || null)}
            />
          </label>
          <button className="hr-btn primary full" type="submit" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Request'}</button>
        </form>
        <section className="hr-card leave-list-card">
          <div className="hr-toolbar">
            <select className="attendance-select" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All Status</option><option>Pending</option><option>Approved</option><option>Rejected</option></select>
            <select className="attendance-select" value={dept} onChange={(e) => setDept(e.target.value)}><option value="">All Departments</option>{departments.map((item) => <option key={item}>{item}</option>)}</select>
            <button className="hr-btn" type="button">Filters <Filter size={14} /></button>
          </div>
          <div className="hr-table-wrap">
            <table className="hr-table"><thead><tr><th>Employee</th><th>Leave Details</th><th>Duration</th><th>Status</th><th>Actions</th></tr></thead><tbody>
              {loading ? <tr><td colSpan={5}>Loading leaves...</td></tr> : null}
              {!loading && scoped.length === 0 ? <tr><td colSpan={5}>No leave requests found.</td></tr> : null}
              {scoped.map((row) => <tr key={row._id}><td><div className="hr-employee-cell"><span>{row.name?.[0] || 'E'}</span><div><strong>{row.name}</strong><small>{row.empId}</small></div></div></td><td>{row.type}<br /><small>{formatDate(row.from)} - {formatDate(row.to)}</small></td><td>{row.days} Day{row.days === 1 ? '' : 's'}</td><td><span className={statusClass(row.status)}>{row.status}</span></td><td><div className="row-actions"><button className="hr-icon-btn" type="button" onClick={() => update(row, 'Approved')}><Check size={14} /></button><button className="hr-icon-btn" type="button" onClick={() => update(row, 'Rejected')}><X size={14} /></button><button className="hr-icon-btn" type="button" onClick={() => setSelectedId(row._id)}><Eye size={14} /></button></div></td></tr>)}
            </tbody></table>
          </div>
          <div className="hr-table-footer">Showing {scoped.length} of {leaves.length} requests</div>
        </section>
        <aside className="hr-card leave-detail-card">
          <h2>Request Details</h2>
          {selected ? <>
            <div className="hr-employee-cell leave-detail-person"><span>{selected.name?.[0] || 'E'}</span><div><strong>{selected.name}</strong><small>{selected.empId}</small></div><i className={statusClass(selected.status)}>{selected.status}</i></div>
            {[
              ['Leave Type', selected.type],
              ['Duration', `${formatDate(selected.from)} - ${formatDate(selected.to)} (${selected.days} Day${selected.days === 1 ? '' : 's'})`],
              ['Reason', selected.reason || '-'],
              ['Applied On', formatDate(selected.applied)],
              ['Applied To', selected.recordedBy || 'HR Admin'],
            ].map(([key, value]) => <p className="hr-info-row" key={key}><span>{key}</span><strong>{value}</strong></p>)}
            {selected.attachment?.url ? (
              <a className="correction-document" href={`${SERVER_ORIGIN}${selected.attachment.url}`} target="_blank" rel="noreferrer">
                <FileText size={17} />
                <span>{selected.attachment.originalName || selected.attachment.fileName}<br /><small>{fileSize(selected.attachment.size)}</small></span>
                <Download size={15} />
              </a>
            ) : (
              <div className="correction-document"><FileText size={17} /><span>No attachment<br /><small>Upload file while submitting request</small></span></div>
            )}
            <div className="correction-actions"><button className="hr-btn primary" onClick={() => update(selected, 'Approved')}>Approve</button><button className="hr-btn danger" onClick={() => update(selected, 'Rejected')}>Reject</button></div>
          </> : <p>No request selected.</p>}
        </aside>
      </div>
      <section className="hr-card leave-workflow"><h2>Leave Workflow</h2>{['Employee raises leave request', 'Manager reviews request', 'Approve or reject action', 'Attendance updated', 'Leave balance updated'].map((item, index) => <span key={item}><i>{index + 1}</i>{item}</span>)}</section>
    </div>
  );
}
