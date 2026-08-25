import { useMemo, useState } from 'react';
import { Download, Eye, FileText, Plus, X } from 'lucide-react';

import { useLoad } from '../../../hooks/useLoad.js';
import { adminService } from '../../../services/adminService.js';
import { attendanceService } from '../../../services/attendanceService.js';
import { AttendanceNav } from './AttendanceNav.jsx';

function dateText(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function statusClass(status) {
  if (status === 'Approved') return 'hr-pill green';
  if (status === 'Rejected') return 'hr-pill red';
  return 'hr-pill amber';
}

export default function CorrectionRequests() {
  const { data, loading, error, setData } = useLoad(attendanceService.corrections, []);
  const employeesLoad = useLoad(adminService.employees, []);
  const rows = data?.data || [];
  const employees = employeesLoad.data?.data || [];
  const [tab, setTab] = useState('Pending');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [form, setForm] = useState({ employeeId: '', date: new Date().toISOString().slice(0, 10), checkIn: '09:00', checkOut: '', reason: '' });
  const selectedRows = tab === 'All Requests' ? rows : rows.filter((row) => (row.status || 'Pending') === tab);
  const [selectedId, setSelectedId] = useState('');
  const selected = useMemo(() => selectedRows.find((row) => row._id === selectedId) || selectedRows[0], [selectedRows, selectedId]);

  async function update(row, status) {
    setActionError('');
    setMessage('');
    try {
      const updated = await attendanceService.updateCorrection(row._id, { status });
      setData((current) => ({ data: (current?.data || []).map((record) => record._id === updated._id ? updated : record) }));
      setMessage(`Correction ${status.toLowerCase()}.`);
    } catch (err) {
      setActionError(err.message || 'Unable to update correction request.');
    }
  }

  async function createCorrection(event) {
    event.preventDefault();
    setActionError('');
    setMessage('');
    const employeeId = form.employeeId || employees[0]?.employeeId;
    if (!employeeId) return setActionError('Select an employee before creating a correction request.');
    if (!form.reason.trim()) return setActionError('Correction reason is required.');
    setSaving(true);
    try {
      const created = await attendanceService.createCorrectionAdmin({ ...form, employeeId });
      setData((current) => ({ data: [created, ...(current?.data || [])] }));
      setSelectedId(created._id);
      setTab('Pending');
      setModalOpen(false);
      setForm({ employeeId, date: new Date().toISOString().slice(0, 10), checkIn: '09:00', checkOut: '', reason: '' });
      setMessage('Correction request created.');
    } catch (err) {
      setActionError(err.message || 'Unable to create correction request.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="hr-screen">
      <div className="hr-page-head">
        <div><h1>Attendance Corrections</h1><p>Manage attendance correction requests</p></div>
        <button className="hr-btn primary" type="button" onClick={() => setModalOpen(true)}><Plus size={14} /> New Correction Request</button>
      </div>
      <AttendanceNav current="/employee-management/attendance/corrections" />
      {error && <p className="error">{error}</p>}
      {actionError && <p className="error">{actionError}</p>}
      {message && <p className="leave-success-message">{message}</p>}
      <div className="hr-tabs">{['Pending', 'Approved', 'Rejected', 'All Requests'].map((item) => <button key={item} type="button" className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item}<span className="attendance-tab-count">{item === 'All Requests' ? rows.length : rows.filter((row) => (row.status || 'Pending') === item).length}</span></button>)}</div>
      <div className="correction-layout">
        <section className="hr-card correction-list">
          {loading ? <p>Loading requests...</p> : null}
          {!loading && selectedRows.length === 0 ? <p>No requests found.</p> : null}
          {selectedRows.map((row) => <button key={row._id} type="button" className={selected?._id === row._id ? 'active' : ''} onClick={() => setSelectedId(row._id)}><span className="hr-avatar-sm">{row.name?.[0] || 'E'}</span><strong>{row.name}</strong><small>{row.employeeId}<br />{row.date}</small><i className={statusClass(row.status || 'Pending')}>{row.status || 'Pending'}</i></button>)}
          <div className="hr-table-footer">Showing {selectedRows.length} request(s)</div>
        </section>
        <section className="hr-card">
          <h2>Request Details</h2>
          {selected ? <>
            {[
              ['Employee', `${selected.name} (${selected.employeeId})`],
              ['Date', selected.date],
              ['Current Status', selected.status || 'Pending'],
              ['Requested Status', 'Present'],
              ['Reason', selected.reason || '-'],
              ['Requested On', dateText(selected.createdAt)],
              ['Requested By', selected.name],
              ['Note', selected.reason || '-'],
            ].map(([k, v]) => <p className="hr-info-row" key={k}><span>{k}</span><strong>{v}</strong></p>)}
            <div className="correction-document"><FileText size={17} /><span>PunchProof.jpg<br /><small>125 KB</small></span><Eye size={15} /><Download size={15} /></div>
          </> : <p>No request selected.</p>}
        </section>
        <section className="hr-card">
          <h2>Approval</h2>
          <p className="attendance-muted">Approve or reject this correction request.</p>
          <textarea className="attendance-note" placeholder="Enter remarks..." />
          <div className="correction-actions"><button className="hr-btn primary" disabled={!selected} onClick={() => selected && update(selected, 'Approved')}>Approve</button><button className="hr-btn danger" disabled={!selected} onClick={() => selected && update(selected, 'Rejected')}>Reject</button></div>
          <h2>Audit Trail</h2>
          {['Request Submitted', 'Under Review', selected?.status === 'Approved' ? 'Approved' : selected?.status === 'Rejected' ? 'Rejected' : 'Pending Approval'].map((item, index) => <div className="hr-activity" key={item}><span /> <strong>{item}</strong><small>{dateText(selected?.createdAt) || `${index + 1} hour ago`}</small></div>)}
        </section>
      </div>
      {modalOpen && (
        <div className="employee-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setModalOpen(false)}>
          <form className="employee-modal employee-confirm-modal" onSubmit={createCorrection}>
            <div className="employee-modal-head"><h2>New Correction Request</h2><button className="icon-btn" type="button" onClick={() => setModalOpen(false)}><X size={17} /></button></div>
            <label className="hr-field">Employee<select value={form.employeeId} onChange={(e) => setForm((current) => ({ ...current, employeeId: e.target.value }))}><option value="">Select employee</option>{employees.map((employee) => <option key={employee.employeeId} value={employee.employeeId}>{employee.name} ({employee.employeeId})</option>)}</select></label>
            <label className="hr-field">Date<input type="date" value={form.date} onChange={(e) => setForm((current) => ({ ...current, date: e.target.value }))} /></label>
            <label className="hr-field">Check In<input value={form.checkIn} onChange={(e) => setForm((current) => ({ ...current, checkIn: e.target.value }))} placeholder="09:00" /></label>
            <label className="hr-field">Check Out<input value={form.checkOut} onChange={(e) => setForm((current) => ({ ...current, checkOut: e.target.value }))} placeholder="18:00" /></label>
            <label className="hr-field">Reason<textarea value={form.reason} onChange={(e) => setForm((current) => ({ ...current, reason: e.target.value }))} placeholder="Reason for correction" /></label>
            <div className="employee-modal-actions"><button className="btn" type="button" onClick={() => setModalOpen(false)}>Cancel</button><button className="btn primary" disabled={saving}>{saving ? 'Saving...' : 'Submit Request'}</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
