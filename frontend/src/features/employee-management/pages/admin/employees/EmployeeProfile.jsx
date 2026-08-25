import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CalendarCheck, Edit3, FileText, IndianRupee, MoreVertical, UserRound } from 'lucide-react';

import { useLoad } from '../../../hooks/useLoad.js';
import { adminService } from '../../../services/adminService.js';

function fmt(value) { return value || '-'; }
function money(value) { return `₹${Number(value || 0).toLocaleString('en-IN')}`; }

export default function EmployeeProfile() {
  const { id } = useParams();
  const { data, loading, error } = useLoad(adminService.employees, []);
  const [tab, setTab] = useState('Overview');
  const employee = useMemo(() => (data?.data || []).find((row) => row._id === id), [data, id]);

  if (loading) return <div className="hr-screen"><section className="hr-card">Loading profile...</section></div>;
  if (error) return <div className="hr-screen"><p className="error">{error}</p></div>;
  if (!employee) return <div className="hr-screen"><section className="hr-card">Employee not found.</section></div>;

  const facts = [
    ['Mobile', employee.phone], ['Email', employee.email], ['Date of Birth', employee.dateOfBirth], ['Gender', employee.gender],
    ['Blood Group', employee.bloodGroup], ['Emergency Contact', `${employee.emergencyContact?.name || '-'} ${employee.emergencyContact?.phone || ''}`], ['Address', employee.address],
  ];
  const employment = [
    ['Department', employee.dept], ['Designation', employee.designation], ['Reporting Manager', employee.reportingManager], ['Branch', employee.branch],
    ['Employment Type', employee.employmentType], ['Shift', employee.shift], ['Work Location', employee.workLocation], ['Joining Date', employee.joinDate],
  ];

  return (
    <div className="hr-screen">
      <section className="hr-profile-hero">
        <div className="hr-avatar-xl"><UserRound size={46} /></div>
        <div className="hr-profile-title"><h1>{employee.name}</h1><span className="hr-pill green">{employee.status || 'Active'}</span><p>{employee.employeeId} · {employee.designation || 'Employee'}<br />{employee.dept || 'Department not set'} · Joined on {fmt(employee.joinDate)}</p></div>
        <div className="hr-actions"><Link className="hr-btn" to={`/employee-management/employees/add?edit=${employee._id}`}><Edit3 size={14} /> Edit Profile</Link><button className="hr-btn"><MoreVertical size={14} /> More Actions</button></div>
      </section>

      <div className="hr-tabs">{['Overview', 'Employment', 'Attendance', 'Leave', 'Payroll', 'Documents'].map((item) => <button className={tab === item ? 'active' : ''} type="button" key={item} onClick={() => setTab(item)}>{item}</button>)}</div>

      <div className="hr-profile-grid">
        <section className="hr-mini-card"><CalendarCheck size={20} /><strong>24</strong><span>Present Days</span><small>98% Attendance</small></section>
        <section className="hr-mini-card amber"><CalendarCheck size={20} /><strong>12</strong><span>Days Balance</span><small>2 Pending Requests</small></section>
        <section className="hr-mini-card blue"><IndianRupee size={20} /><strong>{money(employee.basicSalary)}</strong><span>Monthly Salary</span><small>Latest payroll ready</small></section>
        <section className="hr-mini-card purple"><FileText size={20} /><strong>8</strong><span>Documents</span><small>Verification center</small></section>
      </div>

      <div className="hr-profile-columns">
        <section className="hr-card"><h2>Personal Information</h2>{facts.map(([k, v]) => <p className="hr-info-row" key={k}><span>{k}</span><strong>{fmt(v)}</strong></p>)}</section>
        <section className="hr-card"><h2>Employment Information</h2>{employment.map(([k, v]) => <p className="hr-info-row" key={k}><span>{k}</span><strong>{fmt(v)}</strong></p>)}</section>
        <section className="hr-card"><h2>Recent Activity</h2>{['Salary processed', 'Leave approved', 'Document verified', 'Profile updated', 'Attendance marked'].map((item, index) => <div className="hr-activity" key={item}><span /> <strong>{item}</strong><small>{20 - index * 2} Aug 2026</small></div>)}<Link className="hr-btn primary full" to={`/employee-management/employees/${employee._id}/documents`}>View Documents</Link></section>
      </div>
    </div>
  );
}
