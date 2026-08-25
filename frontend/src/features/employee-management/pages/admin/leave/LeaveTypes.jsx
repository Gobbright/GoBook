import { useEffect, useMemo, useState } from 'react';
import { Check, Edit3, MoreVertical, Plus, Settings, X } from 'lucide-react';

import { LeaveNav } from './LeaveNav.jsx';

const STORAGE_KEY = 'gobook-hr-leave-types';
const SETTINGS = ['Annual Allowance', 'Carry Forward Rules', 'Half Day Allowed', 'Attachment Required', 'Approval Rules', 'Paid / Unpaid'];
const defaultTypes = [
  { id: 'casual-leave', name: 'Casual Leave', allowance: '12 Days', carry: 'Up to 5 Days', half: true, attachment: false, approval: 'Manager Approval', paid: 'Paid', active: true },
  { id: 'sick-leave', name: 'Sick Leave', allowance: '10 Days', carry: 'Up to 5 Days', half: true, attachment: false, approval: 'Manager Approval', paid: 'Paid', active: true },
  { id: 'earned-leave', name: 'Earned Leave', allowance: '18 Days', carry: 'Up to 10 Days', half: true, attachment: false, approval: 'Manager Approval', paid: 'Paid', active: true },
  { id: 'maternity-leave', name: 'Maternity Leave', allowance: '180 Days', carry: 'No Carry Forward', half: false, attachment: true, approval: 'HR Approval', paid: 'Paid', active: true },
  { id: 'paternity-leave', name: 'Paternity Leave', allowance: '15 Days', carry: 'No Carry Forward', half: false, attachment: true, approval: 'HR Approval', paid: 'Paid', active: true },
  { id: 'loss-of-pay', name: 'Loss of Pay', allowance: '-', carry: 'No Carry Forward', half: false, attachment: false, approval: 'HR Approval', paid: 'Unpaid', active: true },
  { id: 'comp-off', name: 'Comp-Off', allowance: 'As Earned', carry: 'Up to 10 Days', half: true, attachment: false, approval: 'Manager Approval', paid: 'Paid', active: true },
];

function makeId(value) {
  return `${value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${Date.now()}`;
}

function loadTypes() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return Array.isArray(saved) && saved.length ? saved : defaultTypes;
  } catch {
    return defaultTypes;
  }
}

function emptyDraft() {
  return { name: '', allowance: '', carry: 'No Carry Forward', half: true, attachment: false, approval: 'Manager Approval', paid: 'Paid', active: true };
}

export default function LeaveTypes() {
  const [rows, setRows] = useState(loadTypes);
  const [draft, setDraft] = useState(emptyDraft);
  const [editing, setEditing] = useState(null);
  const [menuId, setMenuId] = useState('');
  const [message, setMessage] = useState('');
  const activeCount = useMemo(() => rows.filter((row) => row.active).length, [rows]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  }, [rows]);

  function addType() {
    const name = draft.name.trim();
    setMessage('');
    if (!name) return;
    setRows((current) => [{ ...draft, id: makeId(name), name, allowance: draft.allowance.trim() || '-' }, ...current]);
    setDraft(emptyDraft());
    setMessage(`${name} created`);
  }

  function openEdit(row) {
    setEditing({ ...row });
    setMenuId('');
  }

  function saveEdit(event) {
    event.preventDefault();
    if (!editing?.name.trim()) return;
    setRows((current) => current.map((row) => row.id === editing.id ? { ...editing, name: editing.name.trim(), allowance: editing.allowance.trim() || '-' } : row));
    setEditing(null);
  }

  function toggleStatus(row) {
    setRows((current) => current.map((item) => item.id === row.id ? { ...item, active: !item.active } : item));
    setMenuId('');
  }

  function deleteType(row) {
    setRows((current) => current.filter((item) => item.id !== row.id));
    setMenuId('');
  }

  return (
    <div className="hr-screen">
      <div className="hr-page-head">
        <div><h1>Leave Types</h1><p>Create and manage leave types and policies</p></div>
        <div className="leave-type-create">
          <input value={draft.name} onChange={(e) => setDraft((current) => ({ ...current, name: e.target.value }))} placeholder="Leave type" />
          <input value={draft.allowance} onChange={(e) => setDraft((current) => ({ ...current, allowance: e.target.value }))} placeholder="Allowance" />
          <button className="hr-btn primary" type="button" onClick={addType}><Plus size={14} />Create Leave Type</button>
        </div>
      </div>
      <LeaveNav current="/employee-management/leave/types" />
      {message && <p className="leave-success-message">{message}</p>}
      <section className="hr-card">
        <div className="leave-types-summary"><span>{rows.length} leave types</span><strong>{activeCount} active</strong></div>
        <div className="hr-table-wrap">
          <table className="hr-table leave-types-table">
            <thead><tr><th>Leave Type</th><th>Annual Allowance</th><th>Carry Forward</th><th>Half Day</th><th>Attachment Required</th><th>Approval Rules</th><th>Paid / Unpaid</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.name}</td><td>{row.allowance}</td><td>{row.carry}</td>
                  <td>{row.half ? <Check size={15} className="leave-check" /> : <X size={15} className="leave-x" />}</td>
                  <td>{row.attachment ? <Check size={15} className="leave-check" /> : <X size={15} className="leave-x" />}</td>
                  <td>{row.approval}</td><td>{row.paid}</td>
                  <td><span className={row.active ? 'hr-pill green' : 'hr-pill red'}>{row.active ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    <div className="leave-row-actions">
                      <button className="hr-icon-btn" type="button" onClick={() => openEdit(row)} aria-label={`Edit ${row.name}`}><Edit3 size={14} /></button>
                      <button className="hr-icon-btn" type="button" onClick={() => setMenuId((current) => current === row.id ? '' : row.id)} aria-label={`${row.name} actions`}><MoreVertical size={14} /></button>
                      {menuId === row.id && (
                        <div className="leave-action-menu">
                          <button type="button" onClick={() => toggleStatus(row)}>{row.active ? 'Deactivate' : 'Activate'}</button>
                          <button type="button" onClick={() => deleteType(row)}>Delete</button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="hr-card leave-settings-card">
        <h2>Leave Type Settings</h2>
        <div className="leave-settings-grid">{SETTINGS.map((item) => <button key={item} type="button"><Settings size={16} /><span>{item}<small>{item === 'Paid / Unpaid' ? 'Define payment type' : 'Configure policy'}</small></span></button>)}</div>
      </section>
      {editing && (
        <div className="employee-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setEditing(null)}>
          <form className="employee-modal leave-type-modal" onSubmit={saveEdit}>
            <div className="employee-modal-head"><h2>Edit Leave Type</h2><button className="icon-btn" type="button" onClick={() => setEditing(null)}><X size={17} /></button></div>
            <label className="hr-field">Leave Type<input value={editing.name} onChange={(e) => setEditing((current) => ({ ...current, name: e.target.value }))} /></label>
            <label className="hr-field">Annual Allowance<input value={editing.allowance} onChange={(e) => setEditing((current) => ({ ...current, allowance: e.target.value }))} /></label>
            <label className="hr-field">Carry Forward<input value={editing.carry} onChange={(e) => setEditing((current) => ({ ...current, carry: e.target.value }))} /></label>
            <label className="hr-field">Approval Rules<select value={editing.approval} onChange={(e) => setEditing((current) => ({ ...current, approval: e.target.value }))}><option>Manager Approval</option><option>HR Approval</option></select></label>
            <label className="hr-field">Paid / Unpaid<select value={editing.paid} onChange={(e) => setEditing((current) => ({ ...current, paid: e.target.value }))}><option>Paid</option><option>Unpaid</option></select></label>
            <div className="leave-type-check-grid">
              <label className="employee-check-field"><input type="checkbox" checked={editing.half} onChange={(e) => setEditing((current) => ({ ...current, half: e.target.checked }))} />Half Day Allowed</label>
              <label className="employee-check-field"><input type="checkbox" checked={editing.attachment} onChange={(e) => setEditing((current) => ({ ...current, attachment: e.target.checked }))} />Attachment Required</label>
              <label className="employee-check-field"><input type="checkbox" checked={editing.active} onChange={(e) => setEditing((current) => ({ ...current, active: e.target.checked }))} />Active</label>
            </div>
            <div className="employee-modal-actions"><button className="btn" type="button" onClick={() => setEditing(null)}>Cancel</button><button className="btn primary" type="submit">Save Changes</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
