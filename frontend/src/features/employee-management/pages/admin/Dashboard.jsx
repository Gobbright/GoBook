import {
  ArrowRight,
  CalendarCheck,
  ClipboardCheck,
  Clock3,
  FileText,
  ShieldAlert,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { PageHeader } from '../../components/common/PageHeader.jsx';
import { StatCard } from '../../components/common/StatCard.jsx';
import { useLoad } from '../../hooks/useLoad.js';
import { adminService } from '../../services/adminService.js';

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'EM';
}

function dashboardDate(date) {
  if (!date) return 'Employee operations overview';
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function Dashboard() {
  const { data, loading, error } = useLoad(adminService.dashboard, []);
  const stats = data || {};
  const recentEmployees = stats.recentEmployees || [];
  const attendanceRate = Number(stats.attendanceRate || 0);
  const activeEmployees = Number(stats.activeEmployees || 0);
  const present = Number(stats.present || 0);
  const absent = Number(stats.absent || 0);
  const late = Number(stats.late || 0);
  const notMarked = Number(stats.notMarked || 0);
  const pendingLeaves = Number(stats.pendingLeaves || 0);
  const pendingCorrections = Number(stats.pendingCorrections || 0);
  const approvalLoad = pendingLeaves + pendingCorrections;
  const watchCount = absent + late + notMarked;
  const newJoiners = recentEmployees.length;
  const healthItems = [
    {
      icon: ShieldAlert,
      tone: watchCount > 0 ? 'amber' : 'green',
      label: 'Attendance Watch',
      value: loading ? '--' : watchCount,
      detail: watchCount > 0 ? `${absent} absent, ${late} late, ${notMarked} not marked` : 'No attendance exceptions today',
      to: '/employee-management/attendance',
    },
    {
      icon: ClipboardCheck,
      tone: approvalLoad > 0 ? 'rose' : 'green',
      label: 'Approval Queue',
      value: loading ? '--' : approvalLoad,
      detail: approvalLoad > 0 ? 'Review leave and correction requests' : 'All approvals are clear',
      to: approvalLoad > pendingLeaves ? '/employee-management/attendance/corrections' : '/employee-management/leave',
    },
    {
      icon: Sparkles,
      tone: 'blue',
      label: 'Recent Joiners',
      value: loading ? '--' : newJoiners,
      detail: newJoiners > 0 ? 'Check profiles and document readiness' : 'Add employees to begin onboarding',
      to: '/employee-management/employees',
    },
  ];
  const attendanceItems = [
    ['Present', present, 'green'],
    ['Late', late, 'amber'],
    ['Absent', absent, 'red'],
    ['Not Marked', notMarked, 'gray'],
  ];

  return (
    <div className="employee-admin-dashboard">
      <PageHeader
        title="Admin Dashboard"
        subtitle={dashboardDate(stats.date)}
        action={<Link className="btn primary" to="/employee-management/employees/add"><UserPlus size={17} />Add Employee</Link>}
      />

      {error && <p className="error">{error}</p>}

      <div className="grid stats dashboard-stats">
        <StatCard label="Total Employees" value={stats.employees || 0} detail={`${activeEmployees} active`} icon={Users} tone="blue" loading={loading} />
        <StatCard label="Present Today" value={present} detail={`${attendanceRate}% attendance`} icon={UserCheck} tone="green" loading={loading} />
        <StatCard label="Pending Leaves" value={pendingLeaves} detail="Awaiting approval" icon={Clock3} tone="amber" loading={loading} />
        <StatCard label="Corrections" value={pendingCorrections} detail="Needs review" icon={ClipboardCheck} tone="rose" loading={loading} />
      </div>

      <section className="dashboard-focus-grid" aria-label="Employee operations focus">
        {healthItems.map(({ icon: Icon, tone, label, value, detail, to }) => (
          <Link className={`dashboard-focus-card focus-${tone}`} to={to} key={label}>
            <span className="dashboard-focus-icon"><Icon size={18} /></span>
            <span className="dashboard-focus-copy"><small>{label}</small><strong>{value}</strong><em>{detail}</em></span>
            <ArrowRight size={16} />
          </Link>
        ))}
      </section>

      <div className="dashboard-grid dashboard-grid-top">
        <section className="card dashboard-panel attendance-panel">
          <div className="dashboard-panel-head">
            <div>
              <h2>Today Attendance</h2>
              <p>{stats.activeEmployees || 0} active employees</p>
            </div>
            <Link to="/employee-management/attendance">View attendance<ArrowRight size={15} /></Link>
          </div>

          <div className="attendance-rate">
            <div><strong>{loading ? '--' : `${stats.attendanceRate || 0}%`}</strong><span>Attendance rate</span></div>
            <div className="attendance-track" role="progressbar" aria-valuenow={stats.attendanceRate || 0} aria-valuemin="0" aria-valuemax="100">
              <span style={{ width: `${Math.min(100, attendanceRate)}%` }} />
            </div>
          </div>

          <div className="attendance-breakdown">
            {attendanceItems.map(([label, value, tone]) => (
              <div key={label}>
                <span className={`attendance-dot attendance-dot-${tone}`} />
                <span>{label}</span>
                <strong>{loading ? '--' : value}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="card dashboard-panel quick-actions-panel">
          <div className="dashboard-panel-head">
            <div><h2>Quick Actions</h2><p>Common employee operations</p></div>
          </div>
          <nav className="dashboard-actions" aria-label="Employee quick actions">
            <Link to="/employee-management/employees/add"><span className="action-icon action-icon-blue"><UserPlus size={18} /></span><span><strong>Add Employee</strong><small>Create profile and login</small></span><ArrowRight size={16} /></Link>
            <Link to="/employee-management/attendance"><span className="action-icon action-icon-green"><CalendarCheck size={18} /></span><span><strong>Attendance</strong><small>Review today records</small></span><ArrowRight size={16} /></Link>
            <Link to="/employee-management/leave"><span className="action-icon action-icon-amber"><Clock3 size={18} /></span><span><strong>Leave Requests</strong><small>Approve pending leave</small></span><ArrowRight size={16} /></Link>
            <Link to="/employee-management/payroll/processing"><span className="action-icon action-icon-violet"><Wallet size={18} /></span><span><strong>Payroll Run</strong><small>Process monthly salary</small></span><ArrowRight size={16} /></Link>
          </nav>
        </section>
      </div>

      <div className="dashboard-grid dashboard-grid-bottom">
        <section className="card dashboard-panel recent-employees-panel">
          <div className="dashboard-panel-head">
            <div><h2>Recent Employees</h2><p>Latest employee profiles</p></div>
            <Link to="/employee-management/employees">View all<ArrowRight size={15} /></Link>
          </div>
          {loading ? (
            <div className="dashboard-list-loading"><span /><span /><span /></div>
          ) : recentEmployees.length ? (
            <div className="recent-employee-list">
              {recentEmployees.map((employee) => (
                <Link key={employee._id} to="/employee-management/employees" className="recent-employee-row">
                  <span className="employee-avatar">{initials(employee.name)}</span>
                  <span className="employee-summary"><strong>{employee.name}</strong><small>{employee.employeeId} - {employee.designation || employee.dept || 'Employee'}</small></span>
                  <span className={`employee-status employee-status-${String(employee.status).toLowerCase()}`}>{employee.status}</span>
                </Link>
              ))}
            </div>
          ) : <p className="empty dashboard-empty">No employees added yet.</p>}
        </section>

        <section className="card dashboard-panel pending-panel">
          <div className="dashboard-panel-head"><div><h2>Pending Actions</h2><p>Items requiring review</p></div></div>
          <Link to="/employee-management/leave" className="pending-row"><span className="action-icon action-icon-amber"><Clock3 size={18} /></span><span><strong>Leave requests</strong><small>Awaiting approval</small></span><b>{loading ? '--' : stats.pendingLeaves || 0}</b></Link>
          <Link to="/employee-management/attendance/corrections" className="pending-row"><span className="action-icon action-icon-rose"><ClipboardCheck size={18} /></span><span><strong>Corrections</strong><small>Attendance changes</small></span><b>{loading ? '--' : stats.pendingCorrections || 0}</b></Link>
          <Link to="/employee-management/payroll/payslips" className="pending-row"><span className="action-icon action-icon-violet"><FileText size={18} /></span><span><strong>Payslips</strong><small>Review generated salary slips</small></span><b><ArrowRight size={15} /></b></Link>
        </section>
      </div>
    </div>
  );
}
