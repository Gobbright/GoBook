import { useState } from 'react';
import { Download, Mail, MessageCircle, Printer } from 'lucide-react';

import { useLoad } from '../../../hooks/useLoad.js';
import { payrollService } from '../../../services/payrollService.js';
import { PayrollNav, money, payrollMonth } from './PayrollNav.jsx';

export default function Payslips() {
  const [month, setMonth] = useState(payrollMonth());
  const [employeeId, setEmployeeId] = useState('');
  const [message, setMessage] = useState('');
  const { data, loading, error } = useLoad(() => payrollService.adminPayroll(month), [month]);
  const rows = data?.data || [];
  const selected = rows.find((row) => row.employeeId === employeeId) || rows[0];
  const gross = Number(selected?.basic || 0) + Number(selected?.allowances || 0);

  function downloadPayslip() {
    if (!selected) return;
    const blob = new Blob([`${selected.name} payslip\nGross: ${gross}\nDeductions: ${selected.deductions}\nNet: ${selected.net}`], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `payslip-${selected.employeeId}-${month}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <div className="hr-screen">
      <div className="hr-page-head">
        <div><h1>Payslips</h1><p>Generate and manage employee payslips</p></div>
        <div className="hr-actions">
          <input className="attendance-select" type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
          <select className="attendance-select" value={selected?.employeeId || ''} onChange={(event) => setEmployeeId(event.target.value)}>
            <option value="">Select employee</option>
            {rows.map((row) => <option key={row.employeeId} value={row.employeeId}>{row.name} ({row.employeeId})</option>)}
          </select>
        </div>
      </div>
      <PayrollNav current="/employee-management/payroll/payslips" />
      {error && <p className="error">{error}</p>}
      {message && <p className="leave-success-message">{message}</p>}
      <div className="payslip-layout">
        <aside className="hr-card payslip-list">
          <h2>Payslip List</h2>
          {rows.map((row) => <button className={row.employeeId === selected?.employeeId ? 'active' : ''} key={row.employeeId} type="button" onClick={() => setEmployeeId(row.employeeId)}><strong>{row.name}</strong><span>{row.employeeId} - {month}</span></button>)}
          {!rows.length && <p>No payslips available. Generate payroll first.</p>}
        </aside>
        <section className="hr-card payslip-preview">
          {loading ? <p>Loading payslip...</p> : selected ? <>
            <h2>GoBook HR Solutions Pvt. Ltd.</h2>
            <p>Payslip for the month of {month}</p>
            <div className="payslip-meta"><span>Employee Name <strong>{selected.name}</strong></span><span>Employee ID <strong>{selected.employeeId}</strong></span><span>Department <strong>{selected.dept || '-'}</strong></span><span>Payment Status <strong>{selected.status}</strong></span></div>
            <div className="payslip-columns"><section><h3>Earnings</h3><p><span>Basic Salary</span><strong>{money(selected.basic)}</strong></p><p><span>Allowances</span><strong>{money(selected.allowances)}</strong></p><b><span>Gross Salary</span><strong>{money(gross)}</strong></b></section><section><h3>Deductions</h3><p><span>Payroll Deductions</span><strong>{money(selected.deductions)}</strong></p><b className="danger"><span>Total Deductions</span><strong>{money(selected.deductions)}</strong></b></section></div>
            <div className="payslip-net">Net Salary <strong>{money(selected.net)}</strong></div>
            <div className="payslip-actions"><button className="hr-btn" type="button" onClick={downloadPayslip}><Download size={14} /> Download</button><button className="hr-btn" type="button" onClick={() => window.print()}><Printer size={14} /> Print</button><button className="hr-btn" type="button" onClick={() => setMessage(`Email queued for ${selected.name}.`)}><Mail size={14} /> Email</button><button className="hr-btn" type="button" onClick={() => setMessage(`WhatsApp message prepared for ${selected.name}.`)}><MessageCircle size={14} /> WhatsApp</button></div>
          </> : <p>No payslip selected.</p>}
        </section>
      </div>
    </div>
  );
}
