import { useMemo, useState } from 'react';
import { Calculator, Edit3, Save, X } from 'lucide-react';

import { useLoad } from '../../../hooks/useLoad.js';
import { adminService } from '../../../services/adminService.js';
import { PayrollNav, money } from './PayrollNav.jsx';

const EARNING_FIELDS = [
  ['basicSalary', 'Basic Salary'],
  ['hra', 'House Rent Allowance (HRA)'],
  ['specialAllowance', 'Special Allowance'],
  ['conveyanceAllowance', 'Conveyance Allowance'],
  ['medicalAllowance', 'Medical Allowance'],
  ['otherAllowances', 'Other Allowances'],
];

const DEDUCTION_FIELDS = [
  ['pf', 'Provident Fund (PF)'],
  ['esi', 'Employee State Insurance (ESI)'],
  ['professionalTax', 'Professional Tax'],
  ['tds', 'TDS'],
  ['otherDeduction', 'Other Deduction'],
  ['loanDeduction', 'Loan Deduction'],
];

function toNumber(value) {
  return Number(value) || 0;
}

function defaultStructure(basicSalary = 0) {
  const basic = toNumber(basicSalary);
  return {
    basicSalary: basic,
    hra: Math.round(basic * 0.32),
    specialAllowance: Math.round(basic * 0.2),
    conveyanceAllowance: 1600,
    medicalAllowance: 1000,
    otherAllowances: 0,
    pf: Math.round(basic * 0.12),
    esi: Math.round(basic * 0.02),
    professionalTax: 200,
    tds: Math.round(basic * 0.07),
    otherDeduction: 500,
    loanDeduction: 0,
  };
}

function structureFromEmployee(employee) {
  const basic = toNumber(employee?.basicSalary);
  return { ...defaultStructure(basic), ...(employee?.salaryStructure || {}), basicSalary: basic };
}

function totalsFromStructure(structure) {
  const gross = EARNING_FIELDS.reduce((sum, [key]) => sum + toNumber(structure[key]), 0);
  const deductions = DEDUCTION_FIELDS.reduce((sum, [key]) => sum + toNumber(structure[key]), 0);
  return { gross, deductions, net: Math.max(0, gross - deductions) };
}

export default function Salary() {
  const { data, loading, error, setData } = useLoad(adminService.employees, []);
  const employees = data?.data || [];
  const [employeeId, setEmployeeId] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [salaryForm, setSalaryForm] = useState(defaultStructure());

  const selected = employees.find((employee) => employee.employeeId === employeeId) || employees[0];
  const structure = useMemo(() => structureFromEmployee(selected), [selected]);
  const visibleStructure = editing ? salaryForm : structure;
  const totals = useMemo(() => totalsFromStructure(visibleStructure), [visibleStructure]);
  const earnings = EARNING_FIELDS.map(([key, label]) => [label, visibleStructure[key]]);
  const deductions = DEDUCTION_FIELDS.map(([key, label]) => [label, visibleStructure[key]]);

  function openEditor() {
    if (!selected) return;
    setSalaryForm(structureFromEmployee(selected));
    setEditing(true);
  }

  function setSalaryField(key, value) {
    setSalaryForm((current) => ({ ...current, [key]: value }));
  }

  function recalculateFromBasic() {
    setSalaryForm((current) => defaultStructure(current.basicSalary));
  }

  async function saveStructure(event) {
    event.preventDefault();
    if (!selected) return;
    const clean = Object.fromEntries(
      [...EARNING_FIELDS, ...DEDUCTION_FIELDS].map(([key]) => [key, toNumber(salaryForm[key])]),
    );
    setSaving(true);
    try {
      const payload = {
        name: selected.name,
        email: selected.email,
        basicSalary: clean.basicSalary,
        salaryStructure: {
          hra: clean.hra,
          specialAllowance: clean.specialAllowance,
          conveyanceAllowance: clean.conveyanceAllowance,
          medicalAllowance: clean.medicalAllowance,
          otherAllowances: clean.otherAllowances,
          pf: clean.pf,
          esi: clean.esi,
          professionalTax: clean.professionalTax,
          tds: clean.tds,
          otherDeduction: clean.otherDeduction,
          loanDeduction: clean.loanDeduction,
        },
      };
      const updated = await adminService.updateEmployee(selected._id, payload);
      setData((current) => ({
        data: (current?.data || []).map((employee) => (employee._id === selected._id ? { ...employee, ...updated } : employee)),
      }));
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="hr-screen salary-structure-screen">
      <div className="hr-page-head">
        <div><h1>Salary Structure</h1><p>Manage employee salary structures</p></div>
        <div className="hr-actions">
          <button className="hr-btn primary" type="button" onClick={openEditor} disabled={!selected}><Edit3 size={14} /> Edit Structure</button>
        </div>
      </div>
      <PayrollNav current="/employee-management/payroll" />
      {error && <p className="error">{error}</p>}
      <section className="hr-card payroll-person-head">
        <div className="hr-employee-cell"><span>{selected?.name?.[0] || 'E'}</span><div><strong>{selected?.name || 'No employee selected'}</strong><small>{selected?.employeeId || '-'} - {selected?.designation || '-'}<br />{selected?.dept || '-'}</small></div></div>
        <select className="attendance-select" value={selected?.employeeId || ''} onChange={(e) => { setEmployeeId(e.target.value); }}>
          <option value="">Select employee</option>
          {employees.map((employee) => <option key={employee._id} value={employee.employeeId}>{employee.name} ({employee.employeeId})</option>)}
        </select>
      </section>
      {loading ? <section className="hr-card">Loading salary structure...</section> : (
        <>
          <div className="payroll-structure-grid">
            <section className="hr-card payroll-table-card"><h2>Earnings</h2>{earnings.map(([label, value]) => <p key={label}><span>{label}</span><strong>{money(value)}</strong></p>)}<b><span>Gross Salary</span><strong>{money(totals.gross)}</strong></b></section>
            <section className="hr-card payroll-table-card"><h2>Deductions</h2>{deductions.map(([label, value]) => <p key={label}><span>{label}</span><strong>{money(value)}</strong></p>)}<b className="danger"><span>Total Deductions</span><strong>{money(totals.deductions)}</strong></b></section>
          </div>
          <section className="payroll-net-card">Net Salary <strong>{money(totals.net)}</strong></section>
          <div className="leave-total-grid">{[['Gross Salary', money(totals.gross)], ['Total Deductions', money(totals.deductions)], ['Net Salary', money(totals.net)], ['Effective From', 'Current Month']].map(([label, value]) => <section className="hr-card" key={label}><span>{label}</span><strong>{value}</strong></section>)}</div>
        </>
      )}

      {editing && (
        <div className="employee-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setEditing(false)}>
          <form className="employee-modal salary-structure-modal" onSubmit={saveStructure}>
            <div className="employee-modal-head">
              <div>
                <h2>Edit Salary Structure</h2>
                <p className="m-0 mt-1 text-[13px] text-[#64748b]">{selected?.name} - {selected?.employeeId}</p>
              </div>
              <button className="icon-btn" type="button" onClick={() => setEditing(false)}><X size={17} /></button>
            </div>
            <div className="salary-structure-body">
              <div className="salary-calculator-strip">
                <div className="flex items-center gap-3">
                  <span><Calculator size={18} /></span>
                  <div><strong>Salary calculator</strong><p>Edit values manually or recalculate defaults from basic salary.</p></div>
                </div>
                <button className="btn" type="button" onClick={recalculateFromBasic}>Recalculate</button>
              </div>
              <div className="salary-edit-grid">
                <section className="salary-edit-section">
                  <h3>Earnings</h3>
                  <div>
                    {EARNING_FIELDS.map(([key, label]) => (
                      <label className="hr-field" key={key}>{label}<input type="number" min="0" value={salaryForm[key]} onChange={(event) => setSalaryField(key, event.target.value)} /></label>
                    ))}
                  </div>
                </section>
                <section className="salary-edit-section">
                  <h3>Deductions</h3>
                  <div>
                    {DEDUCTION_FIELDS.map(([key, label]) => (
                      <label className="hr-field" key={key}>{label}<input type="number" min="0" value={salaryForm[key]} onChange={(event) => setSalaryField(key, event.target.value)} /></label>
                    ))}
                  </div>
                </section>
              </div>
              <div className="salary-total-strip">
                <div><span>Gross</span><strong>{money(totals.gross)}</strong></div>
                <div><span>Deductions</span><strong className="danger">{money(totals.deductions)}</strong></div>
                <div><span>Net</span><strong className="primary">{money(totals.net)}</strong></div>
              </div>
            </div>
            <div className="employee-modal-actions salary-modal-actions">
              <button className="btn" type="button" onClick={() => setEditing(false)}>Cancel</button>
              <button className="btn primary" disabled={saving}><Save size={14} />{saving ? 'Saving...' : 'Save Structure'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
