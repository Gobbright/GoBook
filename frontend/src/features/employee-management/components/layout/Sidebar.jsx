import { NavLink } from 'react-router-dom';
import { Bell, CalendarCheck, ClipboardList, FileText, LayoutDashboard, LogOut, User, Users, Wallet } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

const icons = { Dashboard: LayoutDashboard, Employees: Users, Attendance: CalendarCheck, Leave: ClipboardList, Payroll: Wallet, Notices: Bell, Holidays: FileText, Profile: User };
const adminGroups = [
  { title: 'Dashboard', items: [['Dashboard', '/employee-management/dashboard']] },
  { title: 'Employees', items: [['Employees', '/employee-management/employees']] },
  { title: 'Attendance', items: [['Daily Attendance', '/employee-management/attendance'], ['Attendance Register', '/employee-management/attendance/monthly'], ['Corrections', '/employee-management/attendance/corrections'], ['Reports', '/employee-management/attendance/reports']] },
  { title: 'Leave', items: [['Leave Requests', '/employee-management/leave'], ['Leave Types', '/employee-management/leave/types'], ['Leave Balance', '/employee-management/leave/balance'], ['Leave Calendar', '/employee-management/leave/calendar'], ['Leave Reports', '/employee-management/leave/reports']] },
  { title: 'Payroll', items: [['Salary Structure', '/employee-management/payroll'], ['Payroll Processing', '/employee-management/payroll/processing'], ['Payslips', '/employee-management/payroll/payslips'], ['Deductions', '/employee-management/payroll/deductions'], ['Payroll Reports', '/employee-management/payroll/reports']] },
  { title: 'Notices', items: [['Send Notice', '/employee-management/notices']] },
  { title: 'Holidays', items: [['Holidays', '/employee-management/holidays'], ['Add Holiday', '/employee-management/holidays/add']] },
];
const employeeGroups = [
  { title: 'Dashboard', items: [['Dashboard', '/employee/dashboard']] },
  { title: 'Attendance', items: [['Check In / Check Out', '/employee/attendance'], ['Monthly Attendance', '/employee/attendance/monthly'], ['Correction Request', '/employee/attendance/correction']] },
  { title: 'Leave', items: [['Apply Leave', '/employee/leave/apply'], ['Leave Status', '/employee/leave/status'], ['Leave History', '/employee/leave/history']] },
  { title: 'Notices', items: [['Notices', '/employee/notices']] },
  { title: 'Payroll', items: [['Payslips', '/employee/payslips']] },
  { title: 'Holidays', items: [['Holidays', '/employee/holidays']] },
  { title: 'Profile', items: [['My Profile', '/employee/profile']] },
];

export function Sidebar() {
  const { user, logout, isAdmin } = useAuth();
  const groups = isAdmin
    ? adminGroups.filter((group) => user?.role === 'admin' || group.title !== 'Notices')
    : employeeGroups;
  return (
    <aside className="sidebar">
      <div className="sidebar-logo"><img src="/gobook-logo-full.png" alt="GoBook" /><span className="sidebar-role">{user?.role} portal</span></div>
      <nav className="nav">
        {groups.map((group) => {
          const Icon = icons[group.title] || LayoutDashboard;
          return (
            <div className="nav-group" key={group.title}>
              <div className="nav-title">{group.title}</div>
              {group.items.map(([label, to]) => <NavLink key={to} className="nav-link" to={to}><Icon size={15} />{label}</NavLink>)}
            </div>
          );
        })}
        <button className="nav-link logout-link" type="button" onClick={logout}><LogOut size={15} />Logout</button>
      </nav>
    </aside>
  );
}
