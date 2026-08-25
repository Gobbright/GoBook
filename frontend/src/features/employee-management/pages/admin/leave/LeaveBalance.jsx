import { useState } from 'react';
import { ChevronDown, RotateCw } from 'lucide-react';

import { useLoad } from '../../../hooks/useLoad.js';
import { adminService } from '../../../services/adminService.js';
import { leaveService } from '../../../services/leaveService.js';
import { LeaveNav } from './LeaveNav.jsx';

const ENTITLEMENTS = { 'Casual Leave': 12, 'Sick Leave': 10, 'Annual Leave': 18, 'Comp Off': 0 };

function formatDate(value) {
  if (!value) return '-';
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function LeaveBalance() {
  const employeesLoad = useLoad(adminService.employees, []);
  const leavesLoad = useLoad(leaveService.adminLeaves, []);
  const employees = employeesLoad.data?.data || [];
  const leaves = leavesLoad.data?.data || [];
  const [employeeId, setEmployeeId] = useState('');
  const [employeeOpen, setEmployeeOpen] = useState(false);
  const selected = employees.find((employee) => employee.employeeId === employeeId) || employees[0];
  const employeeLeaves = leaves.filter((row) => row.empId === selected?.employeeId);
  const approved = employeeLeaves.filter((row) => row.status === 'Approved');
  const pending = employeeLeaves.filter((row) => row.status === 'Pending');
  const balanceRows = Object.entries(ENTITLEMENTS).map(([type, entitlement]) => {
    const used = approved.filter((row) => row.type === type).reduce((sum, row) => sum + Number(row.days || 0), 0);
    const pendingDays = pending.filter((row) => row.type === type).reduce((sum, row) => sum + Number(row.days || 0), 0);
    return { type, entitlement, used, pending: pendingDays, remaining: Math.max(0, entitlement - used), carry: type === 'Comp Off' ? 'Up to 10 Days' : type === 'Annual Leave' ? 'Up to 10 Days' : 'Up to 5 Days' };
  });
  const totals = balanceRows.reduce((acc, row) => ({ entitlement: acc.entitlement + row.entitlement, used: acc.used + row.used, pending: acc.pending + row.pending, remaining: acc.remaining + row.remaining }), { entitlement: 0, used: 0, pending: 0, remaining: 0 });

  return (
    <div className="hr-screen">
      <div className="hr-page-head">
        <div><h1>Leave Balance</h1><p>Track leave balance and history</p></div>
        <div className="leave-employee-dropdown">
          <button className="attendance-select" type="button" onClick={() => setEmployeeOpen((open) => !open)}>
            <span>{employeesLoad.loading ? 'Loading employees...' : selected?.name || 'Select employee'}</span>
            <ChevronDown size={15} />
          </button>
          {employeeOpen && (
            <div className="leave-employee-menu">
              {employees.length === 0 ? <span>No employees found</span> : employees.map((employee) => (
                <button
                  className={selected?.employeeId === employee.employeeId ? 'active' : ''}
                  key={employee._id}
                  type="button"
                  onClick={() => {
                    setEmployeeId(employee.employeeId);
                    setEmployeeOpen(false);
                  }}
                >
                  <strong>{employee.name}</strong>
                  <small>{employee.employeeId} - {employee.dept || 'No department'}</small>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <LeaveNav current="/employee-management/leave/balance" />
      {employeesLoad.error && <p className="error">{employeesLoad.error}</p>}
      {leavesLoad.error && <p className="error">{leavesLoad.error}</p>}
      <section className="hr-card leave-balance-person">
        <div className="hr-employee-cell"><span>{selected?.name?.[0] || 'E'}</span><div><strong>{selected?.name || 'No employee selected'}</strong><small>{selected?.employeeId || '-'} - {selected?.designation || '-'} - {selected?.dept || '-'}</small></div></div>
        <button className="hr-btn" type="button" disabled={!selected}><RotateCw size={14} />Adjust Balance</button>
      </section>
      <section className="hr-card">
        <div className="hr-table-wrap"><table className="hr-table"><thead><tr><th>Leave Type</th><th>Entitlement</th><th>Used</th><th>Pending Approval</th><th>Remaining</th><th>Carry Forward</th><th>Actions</th></tr></thead><tbody>{balanceRows.map((row) => <tr key={row.type}><td>{row.type}</td><td>{row.entitlement} Days</td><td>{row.used} Days</td><td>{row.pending} Day{row.pending === 1 ? '' : 's'}</td><td><span className="hr-pill green">{row.remaining} Days</span></td><td>{row.carry}</td><td><button className="hr-icon-btn" type="button"><RotateCw size={14} /></button></td></tr>)}</tbody></table></div>
      </section>
      <section className="hr-card">
        <h2>Leave History</h2>
        <div className="hr-table-wrap"><table className="hr-table"><thead><tr><th>Date</th><th>Leave Type</th><th>From</th><th>To</th><th>Days</th><th>Status</th><th>Approved By</th></tr></thead><tbody>{employeeLeaves.length === 0 ? <tr><td colSpan={7}>No leave history found.</td></tr> : employeeLeaves.map((row) => <tr key={row._id}><td>{formatDate(row.applied)}</td><td>{row.type}</td><td>{formatDate(row.from)}</td><td>{formatDate(row.to)}</td><td>{row.days}</td><td><span className={row.status === 'Approved' ? 'hr-pill green' : row.status === 'Rejected' ? 'hr-pill red' : 'hr-pill amber'}>{row.status}</span></td><td>{row.recordedBy || '-'}</td></tr>)}</tbody></table></div>
      </section>
      <div className="leave-total-grid">{[['Total Entitlement', `${totals.entitlement} Days`], ['Total Used', `${totals.used} Days`], ['Pending Approval', `${totals.pending} Day${totals.pending === 1 ? '' : 's'}`], ['Available Balance', `${totals.remaining} Days`], ['Carry Forward', 'Up to 20 Days']].map(([label, value]) => <section className="hr-card" key={label}><span>{label}</span><strong>{value}</strong></section>)}</div>
    </div>
  );
}
