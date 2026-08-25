import { useState } from 'react';
import { CheckCircle2, Download, RefreshCw } from 'lucide-react';

import { useLoad } from '../../../hooks/useLoad.js';
import { payrollService } from '../../../services/payrollService.js';
import { PayrollNav, money, payrollMonth } from './PayrollNav.jsx';

function summarize(rows) {
  const totalEarnings = rows.reduce((sum, row) => sum + Number(row.basic || 0) + Number(row.allowances || 0), 0);
  const totalDeductions = rows.reduce((sum, row) => sum + Number(row.deductions || 0), 0);
  const netPayroll = rows.reduce((sum, row) => sum + Number(row.net || 0), 0);
  return { totalEarnings, totalDeductions, netPayroll, processed: rows.filter((row) => row.status === 'Paid').length };
}

function exportCsv(rows, month) {
  const header = ['Employee', 'Department', 'Gross Salary', 'Deductions', 'Net Salary', 'Status'];
  const lines = rows.map((row) => [row.name, row.dept, Number(row.basic || 0) + Number(row.allowances || 0), row.deductions, row.net, row.status].join(','));
  const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `payroll-summary-${month}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export default function PayrollProcessing() {
  const [month, setMonth] = useState(payrollMonth());
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState('');
  const { data, loading, error, setData } = useLoad(() => payrollService.adminPayroll(month), [month]);
  const rows = data?.data || [];
  const totals = summarize(rows);

  async function generatePayroll() {
    setBusy('generate');
    setMessage('');
    try {
      const result = await payrollService.generate(month);
      setData(result);
      setMessage(result.message || 'Payroll preview generated.');
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy('');
    }
  }

  async function approvePayroll() {
    setBusy('approve');
    setMessage('');
    try {
      const result = await payrollService.approve(month);
      setData(result);
      setMessage(result.message || 'Payroll approved.');
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="hr-screen">
      <div className="hr-page-head">
        <div><h1>Payroll Processing</h1><p>Process monthly payroll for all employees</p></div>
        <div className="hr-actions">
          <input className="attendance-select" type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
          <button className="hr-btn" type="button" onClick={generatePayroll} disabled={busy === 'generate'}><RefreshCw size={14} /> Preview Payroll</button>
          <button className="hr-btn primary" type="button" onClick={approvePayroll} disabled={!rows.length || busy === 'approve'}><CheckCircle2 size={14} /> Approve Payroll</button>
        </div>
      </div>
      <PayrollNav current="/employee-management/payroll/processing" />
      {(error || message) && <p className={error || message.includes('not') ? 'error' : 'leave-success-message'}>{error || message}</p>}
      <div className="payroll-processing-layout">
        <section className="hr-card">
          <h2>Payroll Review</h2>
          <div className="leave-total-grid payroll-total-grid">
            <section className="hr-card"><span>Total Employees</span><strong>{rows.length}</strong></section>
            <section className="hr-card"><span>Total Earnings</span><strong>{money(totals.totalEarnings)}</strong></section>
            <section className="hr-card"><span>Total Deductions</span><strong>{money(totals.totalDeductions)}</strong></section>
            <section className="hr-card"><span>Net Payroll</span><strong>{money(totals.netPayroll)}</strong></section>
          </div>
          <div className="hr-table-wrap">
            <table className="hr-table">
              <thead><tr><th>Employee</th><th>Department</th><th>Gross Salary</th><th>Deductions</th><th>Net Salary</th><th>Status</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan="6">Loading payroll...</td></tr> : rows.length ? rows.map((row) => <tr key={row._id || row.employeeId}><td><div className="hr-employee-cell"><span>{row.name?.[0] || 'E'}</span><div><strong>{row.name}</strong><small>{row.employeeId}</small></div></div></td><td>{row.dept || '-'}</td><td>{money(Number(row.basic || 0) + Number(row.allowances || 0))}</td><td>{money(row.deductions)}</td><td>{money(row.net)}</td><td><span className={`hr-pill ${row.status === 'Paid' ? 'green' : 'amber'}`}>{row.status}</span></td></tr>) : <tr><td colSpan="6">No payroll generated for this month.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
        <aside className="payroll-side-stack">
          <section className="hr-card payroll-summary-card"><h2>Payroll Summary</h2><p><span>Total Employees</span><strong>{rows.length}</strong></p><p><span>Processed</span><strong>{totals.processed}</strong></p><p><span>Calculated</span><strong>{rows.length}</strong></p><p><span>Pending</span><strong>{Math.max(0, rows.length - totals.processed)}</strong></p><hr /><p><span>Total Earnings</span><strong>{money(totals.totalEarnings)}</strong></p><p><span>Total Deductions</span><strong>{money(totals.totalDeductions)}</strong></p><p><span>Net Payroll</span><strong>{money(totals.netPayroll)}</strong></p></section>
          <section className="hr-card payroll-action-list"><h2>Payroll Actions</h2><button type="button" onClick={() => exportCsv(rows, month)} disabled={!rows.length}>Export Summary <Download size={14} /></button><button type="button" onClick={() => exportCsv(rows, `${month}-details`)} disabled={!rows.length}>Export Details <Download size={14} /></button><button type="button" onClick={generatePayroll}><RefreshCw size={14} /> Recalculate</button></section>
        </aside>
      </div>
    </div>
  );
}
