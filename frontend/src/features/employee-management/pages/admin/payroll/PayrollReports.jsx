import { useState } from 'react';
import { Download, Mail, Printer } from 'lucide-react';

import { useLoad } from '../../../hooks/useLoad.js';
import { payrollService } from '../../../services/payrollService.js';
import { PayrollNav, money, payrollMonth } from './PayrollNav.jsx';

const categories = ['Monthly Payroll', 'Department Payroll', 'Employee Salary Report', 'Salary Register', 'Deduction Report', 'PF Report', 'ESI Report', 'TDS Report', 'Payroll Summary'];

function exportCsv(rows, month) {
  const lines = [['Employee', 'Department', 'Basic', 'Allowances', 'Deductions', 'Net', 'Status'].join(','), ...rows.map((row) => [row.name, row.dept, row.basic, row.allowances, row.deductions, row.net, row.status].join(','))];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `payroll-report-${month}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export default function PayrollReports() {
  const [month, setMonth] = useState(payrollMonth());
  const [department, setDepartment] = useState('All Departments');
  const [category, setCategory] = useState(categories[0]);
  const [message, setMessage] = useState('');
  const { data, loading, error } = useLoad(() => payrollService.adminPayroll(month), [month]);
  const rows = data?.data || [];
  const departments = ['All Departments', ...new Set(rows.map((row) => row.dept).filter(Boolean))];
  const filtered = department === 'All Departments' ? rows : rows.filter((row) => row.dept === department);
  const gross = filtered.reduce((sum, row) => sum + Number(row.basic || 0) + Number(row.allowances || 0), 0);
  const deductions = filtered.reduce((sum, row) => sum + Number(row.deductions || 0), 0);
  const net = filtered.reduce((sum, row) => sum + Number(row.net || 0), 0);
  const departmentRows = departments.filter((dept) => dept !== 'All Departments').map((dept) => {
    const deptRows = rows.filter((row) => row.dept === dept);
    return { dept, employees: deptRows.length, gross: deptRows.reduce((sum, row) => sum + Number(row.basic || 0) + Number(row.allowances || 0), 0), deductions: deptRows.reduce((sum, row) => sum + Number(row.deductions || 0), 0), net: deptRows.reduce((sum, row) => sum + Number(row.net || 0), 0) };
  });

  return (
    <div className="hr-screen">
      <div className="hr-page-head">
        <div><h1>Payroll Reports</h1><p>Generate detailed payroll reports</p></div>
        <div className="hr-actions"><select className="attendance-select" value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select><input className="attendance-select" type="month" value={month} onChange={(event) => setMonth(event.target.value)} /><select className="attendance-select" value={department} onChange={(event) => setDepartment(event.target.value)}>{departments.map((dept) => <option key={dept}>{dept}</option>)}</select><button className="hr-btn primary" type="button" onClick={() => setMessage(`${category} generated for ${month}.`)}>Generate Report</button></div>
      </div>
      <PayrollNav current="/employee-management/payroll/reports" />
      {(error || message) && <p className={error ? 'error' : 'leave-success-message'}>{error || message}</p>}
      <div className="payroll-report-layout">
        <aside className="hr-card report-category-list">{categories.map((item) => <button className={item === category ? 'active' : ''} key={item} type="button" onClick={() => setCategory(item)}>{item}</button>)}</aside>
        <section className="hr-card">
          <h2>{category} ({month})</h2>
          <div className="leave-total-grid payroll-total-grid">{[['Total Employees', filtered.length], ['Total Gross Salary', money(gross)], ['Total Deductions', money(deductions)], ['Net Payroll', money(net)]].map(([label, value]) => <section className="hr-card" key={label}><span>{label}</span><strong>{value}</strong></section>)}</div>
          <h3>Department Wise Summary</h3>
          <div className="hr-table-wrap"><table className="hr-table"><thead><tr><th>Department</th><th>Employees</th><th>Gross Salary</th><th>Deductions</th><th>Net Salary</th></tr></thead><tbody>{loading ? <tr><td colSpan="5">Loading report...</td></tr> : departmentRows.length ? departmentRows.map((row) => <tr key={row.dept}><td>{row.dept}</td><td>{row.employees}</td><td>{money(row.gross)}</td><td>{money(row.deductions)}</td><td>{money(row.net)}</td></tr>) : <tr><td colSpan="5">No payroll report data found.</td></tr>}</tbody></table></div>
          <div className="payslip-actions"><button className="hr-btn" type="button" onClick={() => exportCsv(filtered, month)}><Download size={14} /> Export CSV</button><button className="hr-btn" type="button" onClick={() => window.print()}><Printer size={14} /> Print</button><button className="hr-btn" type="button" onClick={() => setMessage('Report email queued.')}><Mail size={14} /> Email</button></div>
        </section>
      </div>
    </div>
  );
}
