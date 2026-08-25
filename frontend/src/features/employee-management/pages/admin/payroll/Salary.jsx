import { useMemo, useState } from 'react';
import { Edit3, MoreVertical, Save, X } from 'lucide-react';

import { useLoad } from '../../../hooks/useLoad.js';
import { adminService } from '../../../services/adminService.js';
import { PayrollNav, money } from './PayrollNav.jsx';

const earningRows = (basic) => [
  ['Basic Salary', basic],
  ['House Rent Allowance (HRA)', Math.round(basic * 0.32)],
  ['Special Allowance', Math.round(basic * 0.2)],
  ['Conveyance Allowance', 1600],
  ['Medical Allowance', 1000],
  ['Other Allowances', 0],
];
const deductionRows = (basic) => [
  ['Provident Fund (PF)', Math.round(basic * 0.12)],
  ['Employee State Insurance (ESI)', Math.round(basic * 0.02)],
  ['Professional Tax', 200],
  ['TDS', Math.round(basic * 0.07)],
  ['Other Deduction', 500],
  ['Loan Deduction', 0],
];

export default function Salary() {
  const { data, loading, error, setData } = useLoad(adminService.employees, []);
  const employees = data?.data || [];
  const [employeeId, setEmployeeId] = useState('');
  const [editing, setEditing] = useState(false);
  const [salary, setSalary] = useState('');
  const selected = employees.find((employee) => employee.employeeId === employeeId) || employees[0];
  const basic = Number((editing ? salary : '') || selected?.basicSalary || 0);
  const earnings = useMemo(() => earningRows(basic), [basic]);
  const deductions = useMemo(() => deductionRows(basic), [basic]);
  const gross = earnings.reduce((sum, [, value]) => sum + Number(value || 0), 0);
  const totalDeductions = deductions.reduce((sum, [, value]) => sum + Number(value || 0), 0);
  const net = Math.max(0, gross - totalDeductions);

  async function saveStructure(event) {
    event.preventDefault();
    if (!selected) return;
    const nextSalary = Number(salary || 0);
    await adminService.updateEmployee(selected._id, { basicSalary: nextSalary });
    setData((current) => ({ data: (current?.data || []).map((employee) => employee._id === selected._id ? { ...employee, basicSalary: nextSalary } : employee) }));
    setSalary('');
    setEditing(false);
  }

  return (
    <div className="hr-screen">
      <div className="hr-page-head">
        <div><h1>Salary Structure</h1><p>Manage employee salary structures</p></div>
        <div className="hr-actions"><button className="hr-btn primary" type="button" onClick={() => { setSalary(String(selected?.basicSalary || 0)); setEditing(true); }}><Edit3 size={14} /> Edit Structure</button><button className="hr-icon-btn" type="button"><MoreVertical size={15} /></button></div>
      </div>
      <PayrollNav current="/employee-management/payroll" />
      {error && <p className="error">{error}</p>}
      <section className="hr-card payroll-person-head">
        <div className="hr-employee-cell"><span>{selected?.name?.[0] || 'E'}</span><div><strong>{selected?.name || 'No employee selected'}</strong><small>{selected?.employeeId || '-'} - {selected?.designation || '-'}<br />{selected?.dept || '-'}</small></div></div>
        <select className="attendance-select" value={selected?.employeeId || ''} onChange={(e) => { setEmployeeId(e.target.value); setSalary(''); }}><option value="">Select employee</option>{employees.map((employee) => <option key={employee._id} value={employee.employeeId}>{employee.name} ({employee.employeeId})</option>)}</select>
      </section>
      {loading ? <section className="hr-card">Loading salary structure...</section> : (
        <>
          <div className="payroll-structure-grid">
            <section className="hr-card payroll-table-card"><h2>Earnings</h2>{earnings.map(([label, value]) => <p key={label}><span>{label}</span><strong>{money(value)}</strong></p>)}<b><span>Gross Salary</span><strong>{money(gross)}</strong></b></section>
            <section className="hr-card payroll-table-card"><h2>Deductions</h2>{deductions.map(([label, value]) => <p key={label}><span>{label}</span><strong>{money(value)}</strong></p>)}<b className="danger"><span>Total Deductions</span><strong>{money(totalDeductions)}</strong></b></section>
          </div>
          <section className="payroll-net-card">Net Salary <strong>{money(net)}</strong></section>
          <div className="leave-total-grid">{[['Gross Salary', money(gross)], ['Total Deductions', money(totalDeductions)], ['Net Salary', money(net)], ['Effective From', '01 Aug 2026']].map(([label, value]) => <section className="hr-card" key={label}><span>{label}</span><strong>{value}</strong></section>)}</div>
        </>
      )}
      {editing && <div className="employee-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setEditing(false)}><form className="employee-modal employee-confirm-modal" onSubmit={saveStructure}><div className="employee-modal-head"><h2>Edit Salary Structure</h2><button className="icon-btn" type="button" onClick={() => setEditing(false)}><X size={17} /></button></div><label className="hr-field">Basic Salary<input type="number" min="0" value={salary} onChange={(event) => setSalary(event.target.value)} /></label><div className="employee-modal-actions"><button className="btn" type="button" onClick={() => setEditing(false)}>Cancel</button><button className="btn primary"><Save size={14} />Save</button></div></form></div>}
    </div>
  );
}
