import { useState } from 'react';
import { Edit3, Plus, Trash2 } from 'lucide-react';

import { useLoad } from '../../../hooks/useLoad.js';
import { payrollService } from '../../../services/payrollService.js';
import { PayrollNav, money, payrollMonth } from './PayrollNav.jsx';

const defaultRules = [
  { id: 'pf', type: 'Provident Fund (PF)', description: 'Statutory PF', appliesTo: 'All Employees', calculation: '12% of Basic', active: true },
  { id: 'esi', type: 'ESI', description: 'Employee State Insurance', appliesTo: 'All Employees', calculation: 'As per ESI Slab', active: true },
  { id: 'tds', type: 'TDS', description: 'Tax Deducted at Source', appliesTo: 'All Employees', calculation: 'As per IT Rules', active: true },
  { id: 'pt', type: 'Professional Tax', description: 'State Professional Tax', appliesTo: 'All Employees', calculation: 'Fixed Amount', active: true },
  { id: 'loan', type: 'Loan Deduction', description: 'Employee Loan', appliesTo: 'Selected', calculation: 'EMI Amount', active: true },
  { id: 'advance', type: 'Advance Salary', description: 'Salary Advance', appliesTo: 'Selected', calculation: 'Advance Amount', active: true },
];

export default function Deductions() {
  const [month, setMonth] = useState(payrollMonth());
  const [rules, setRules] = useState(defaultRules);
  const [editing, setEditing] = useState(null);
  const { data, error } = useLoad(() => payrollService.adminPayroll(month), [month]);
  const rows = data?.data || [];
  const total = rows.reduce((sum, row) => sum + Number(row.deductions || 0), 0);

  function saveRule(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const rule = { id: editing?.id || crypto.randomUUID(), type: form.get('type'), description: form.get('description'), appliesTo: form.get('appliesTo'), calculation: form.get('calculation'), active: form.get('active') === 'on' };
    setRules((current) => editing?.id ? current.map((item) => item.id === editing.id ? rule : item) : [rule, ...current]);
    setEditing(null);
  }

  return (
    <div className="hr-screen">
      <div className="hr-page-head">
        <div><h1>Deductions</h1><p>Manage all types of payroll deductions</p></div>
        <div className="hr-actions"><input className="attendance-select" type="month" value={month} onChange={(event) => setMonth(event.target.value)} /><button className="hr-btn primary" type="button" onClick={() => setEditing({})}><Plus size={14} /> Add Deduction</button></div>
      </div>
      <PayrollNav current="/employee-management/payroll/deductions" />
      {error && <p className="error">{error}</p>}
      <section className="hr-card">
        <div className="hr-table-wrap"><table className="hr-table"><thead><tr><th>Deduction Type</th><th>Description</th><th>Applies To</th><th>Calculation</th><th>Status</th><th>Actions</th></tr></thead><tbody>{rules.map((rule) => <tr key={rule.id}><td>{rule.type}</td><td>{rule.description}</td><td>{rule.appliesTo}</td><td>{rule.calculation}</td><td><button className={`hr-pill ${rule.active ? 'green' : 'gray'}`} type="button" onClick={() => setRules((current) => current.map((item) => item.id === rule.id ? { ...item, active: !item.active } : item))}>{rule.active ? 'Active' : 'Inactive'}</button></td><td><div className="row-actions"><button className="icon-btn" type="button" onClick={() => setEditing(rule)}><Edit3 size={14} /></button><button className="icon-btn danger" type="button" onClick={() => setRules((current) => current.filter((item) => item.id !== rule.id))}><Trash2 size={14} /></button></div></td></tr>)}</tbody></table></div>
      </section>
      <div className="leave-total-grid payroll-total-grid">{[['Total Deductions', money(total)], ['PF', money(rows.reduce((sum, row) => sum + Number(row.basic || 0) * 0.12, 0))], ['ESI', money(rows.reduce((sum, row) => sum + Number(row.basic || 0) * 0.02, 0))], ['TDS', money(rows.reduce((sum, row) => sum + Number(row.basic || 0) * 0.07, 0))], ['Others', money(Math.max(0, total * 0.18))]].map(([label, value]) => <section className="hr-card" key={label}><span>{label}</span><strong>{value}</strong></section>)}</div>
      {editing && <div className="employee-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setEditing(null)}><form className="employee-modal" onSubmit={saveRule}><div className="employee-modal-head"><h2>{editing.id ? 'Edit Deduction' : 'Add Deduction'}</h2></div><div className="form-grid"><label className="hr-field">Deduction Type<input name="type" required defaultValue={editing.type || ''} /></label><label className="hr-field">Description<input name="description" required defaultValue={editing.description || ''} /></label><label className="hr-field">Applies To<input name="appliesTo" required defaultValue={editing.appliesTo || 'All Employees'} /></label><label className="hr-field">Calculation<input name="calculation" required defaultValue={editing.calculation || ''} /></label></div><label className="employee-check-field"><input name="active" type="checkbox" defaultChecked={editing.active ?? true} /> Active</label><div className="employee-modal-actions"><button className="btn" type="button" onClick={() => setEditing(null)}>Cancel</button><button className="btn primary">Save</button></div></form></div>}
    </div>
  );
}
