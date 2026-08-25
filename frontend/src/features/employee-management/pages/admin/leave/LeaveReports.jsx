import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';

import { useLoad } from '../../../hooks/useLoad.js';
import { adminService } from '../../../services/adminService.js';
import { leaveService } from '../../../services/leaveService.js';
import { LeaveNav } from './LeaveNav.jsx';

function localMonth() {
  return new Date().toISOString().slice(0, 7);
}

export default function LeaveReports() {
  const [month, setMonth] = useState(localMonth);
  const [dept, setDept] = useState('');
  const employeesLoad = useLoad(adminService.employees, []);
  const leavesLoad = useLoad(leaveService.adminLeaves, []);
  const employees = employeesLoad.data?.data || [];
  const leaves = leavesLoad.data?.data || [];
  const depts = [...new Set(employees.map((employee) => employee.dept).filter(Boolean))];
  const scoped = leaves.filter((row) => row.from?.startsWith(month) && (!dept || row.dept === dept));
  const paid = scoped.filter((row) => row.type !== 'Unpaid Leave').reduce((sum, row) => sum + Number(row.days || 0), 0);
  const unpaid = scoped.filter((row) => row.type === 'Unpaid Leave').reduce((sum, row) => sum + Number(row.days || 0), 0);
  const totalDays = scoped.reduce((sum, row) => sum + Number(row.days || 0), 0);
  const typeCounts = useMemo(() => {
    const map = new Map();
    for (const row of scoped) map.set(row.type, (map.get(row.type) || 0) + Number(row.days || 0));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [scoped]);
  const topTakers = useMemo(() => {
    const map = new Map();
    for (const row of scoped) map.set(row.name, (map.get(row.name) || 0) + Number(row.days || 0));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [scoped]);
  const deptRows = depts.map((name) => {
    const deptEmployees = employees.filter((employee) => employee.dept === name).length;
    const deptLeaves = scoped.filter((row) => row.dept === name);
    const taken = deptLeaves.reduce((sum, row) => sum + Number(row.days || 0), 0);
    return { name, employees: deptEmployees, taken, paid: deptLeaves.filter((row) => row.type !== 'Unpaid Leave').reduce((sum, row) => sum + Number(row.days || 0), 0), unpaid: deptLeaves.filter((row) => row.type === 'Unpaid Leave').reduce((sum, row) => sum + Number(row.days || 0), 0) };
  });

  return (
    <div className="hr-screen">
      <div className="hr-page-head"><div><h1>Leave Reports</h1><p>Generate leave reports and analytics</p></div><button className="hr-btn"><Download size={14} />Export</button></div>
      <LeaveNav current="/employee-management/leave/reports" />
      {leavesLoad.error && <p className="error">{leavesLoad.error}</p>}
      <section className="hr-card">
        <div className="report-filter-grid">
          <label className="hr-field">Report Type<select><option>Monthly Report</option><option>Employee-wise Report</option><option>Department-wise Report</option></select></label>
          <label className="hr-field">Month<input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></label>
          <label className="hr-field">Department<select value={dept} onChange={(e) => setDept(e.target.value)}><option value="">All Departments</option>{depts.map((item) => <option key={item}>{item}</option>)}</select></label>
          <button className="hr-btn primary">Generate Report</button>
        </div>
        <div className="attendance-report-layout">
          <aside className="report-menu">{['Employee-wise Report', 'Department-wise Report', 'Leave Type Report', 'Monthly Report', 'Annual Report', 'Paid Leave Report', 'Unpaid Leave Report', 'Leave Utilization Report'].map((item, index) => <button key={item} className={index === 0 ? 'active' : ''}>{item}</button>)}</aside>
          <section className="report-main">
            <h2>Monthly Leave Summary ({month})</h2>
            <div className="report-summary-grid">{[['Total Employees', employees.length], ['Total Leaves Taken', totalDays], ['Paid Leaves', paid], ['Unpaid Leaves', unpaid], ['Leave Utilization', `${employees.length ? ((totalDays / (employees.length * 40)) * 100).toFixed(2) : '0.00'}%`]].map(([label, value]) => <span key={label}>{label}<strong>{value}</strong></span>)}</div>
            <div className="leave-report-split"><div className="leave-donut"><strong>{totalDays}</strong><span>Total Leaves</span></div><div>{typeCounts.length === 0 ? <p>No leave data for this month.</p> : typeCounts.map(([type, days]) => <p key={type}><span>{type}</span><strong>{days} Days</strong></p>)}</div></div>
          </section>
          <aside className="hr-card report-late"><h2>Top Leave Takers</h2>{topTakers.length === 0 ? <p>No leave takers.</p> : topTakers.map(([name, days], index) => <p key={name}><span>{index + 1}. {name}</span><strong>{days} Days</strong></p>)}</aside>
        </div>
        <div className="hr-table-wrap"><table className="hr-table"><thead><tr><th>Department</th><th>Total Employees</th><th>Leaves Taken</th><th>Paid Leaves</th><th>Unpaid Leaves</th><th>Leave Utilization</th></tr></thead><tbody>{deptRows.map((row) => <tr key={row.name}><td>{row.name}</td><td>{row.employees}</td><td>{row.taken}</td><td>{row.paid}</td><td>{row.unpaid}</td><td><span className="hr-pill green">{row.employees ? ((row.taken / (row.employees * 40)) * 100).toFixed(2) : '0.00'}%</span></td></tr>)}</tbody></table></div>
        <p className="leave-report-note">Note: Leave Utilization = (Total Leaves Taken / Total Leave Entitlement) * 100</p>
      </section>
    </div>
  );
}
