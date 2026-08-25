import { useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

import { useLoad } from '../../../hooks/useLoad.js';
import { adminService } from '../../../services/adminService.js';
import { leaveService } from '../../../services/leaveService.js';
import { LeaveNav } from './LeaveNav.jsx';

const COLORS = { 'Casual Leave': 'cl', 'Sick Leave': 'sl', 'Annual Leave': 'el', 'Comp Off': 'co', 'Unpaid Leave': 'up' };

function localMonth() {
  return new Date().toISOString().slice(0, 7);
}

function monthLabel(value) {
  return new Date(`${value}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function dateInRange(date, from, to) {
  return date >= from && date <= (to || from);
}

export default function LeaveCalendar() {
  const [month, setMonth] = useState(localMonth);
  const [dept, setDept] = useState('');
  const [status, setStatus] = useState('');
  const leavesLoad = useLoad(leaveService.adminLeaves, []);
  const employeesLoad = useLoad(adminService.employees, []);
  const leaves = leavesLoad.data?.data || [];
  const employees = employeesLoad.data?.data || [];
  const depts = [...new Set(employees.map((employee) => employee.dept).filter(Boolean))];
  const visibleLeaves = leaves.filter((row) => (!dept || row.dept === dept) && (!status || row.status === status));
  const [year, monthNumber] = month.split('-').map(Number);
  const daysCount = new Date(year, monthNumber, 0).getDate();
  const firstDay = new Date(year, monthNumber - 1, 1).getDay();
  const cells = [
    ...Array.from({ length: firstDay }, (_, index) => ({ key: `blank-${index}`, blank: true })),
    ...Array.from({ length: daysCount }, (_, index) => ({ key: index + 1, day: index + 1 })),
  ];
  const upcoming = visibleLeaves.filter((row) => row.from?.startsWith(month)).slice(0, 5);
  const onLeave = new Set(visibleLeaves.filter((row) => row.status === 'Approved').map((row) => row.empId)).size;

  function nudgeMonth(offset) {
    const date = new Date(`${month}-01T00:00:00`);
    date.setMonth(date.getMonth() + offset);
    setMonth(date.toISOString().slice(0, 7));
  }

  return (
    <div className="hr-screen">
      <div className="hr-page-head"><div><h1>Leave Calendar</h1><p>View team leave calendar and availability</p></div></div>
      <LeaveNav current="/employee-management/leave/calendar" />
      {leavesLoad.error && <p className="error">{leavesLoad.error}</p>}
      <section className="hr-card">
        <div className="hr-toolbar">
          <button className="hr-icon-btn" type="button" onClick={() => nudgeMonth(-1)}><ChevronLeft size={15} /></button>
          <label className="attendance-date-row"><span>{monthLabel(month)}</span><input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></label>
          <button className="hr-icon-btn" type="button" onClick={() => nudgeMonth(1)}><ChevronRight size={15} /></button>
          <select className="attendance-select" value={dept} onChange={(e) => setDept(e.target.value)}><option value="">All Departments</option>{depts.map((item) => <option key={item}>{item}</option>)}</select>
          <select className="attendance-select" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All Status</option><option>Pending</option><option>Approved</option><option>Rejected</option></select>
          <button className="hr-btn" type="button">Today <CalendarDays size={14} /></button>
        </div>
        <div className="leave-calendar-layout">
          <div className="leave-calendar-grid">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <b key={day}>{day}</b>)}
            {cells.map((cell) => {
              const iso = cell.blank ? '' : `${month}-${String(cell.day).padStart(2, '0')}`;
              const dayLeaves = visibleLeaves.filter((row) => !cell.blank && dateInRange(iso, row.from, row.to)).slice(0, 2);
              return <div className={cell.blank ? 'blank' : ''} key={cell.key}><strong>{cell.day || ''}</strong>{dayLeaves.map((row) => <span className={COLORS[row.type] || 'cl'} key={row._id}>{row.name} ({row.type.split(' ')[0]})</span>)}</div>;
            })}
          </div>
          <aside className="leave-calendar-side">
            <section className="hr-card"><h2>Upcoming Leaves</h2>{upcoming.length === 0 ? <p>No upcoming leaves.</p> : upcoming.map((row) => <p key={row._id}><span className="hr-avatar-sm">{row.name?.[0] || 'E'}</span><strong>{row.name}</strong><small>{row.from} - {row.to}<br />{row.type}</small></p>)}</section>
            <section className="hr-card"><h2>Staff Availability</h2><div className="leave-availability"><strong>{employees.length ? Math.round(((employees.length - onLeave) / employees.length) * 100) : 0}%</strong><span>Available</span></div><p>Total Employees <b>{employees.length}</b></p><p>On Leave <b>{onLeave}</b></p><p>Available <b>{Math.max(0, employees.length - onLeave)}</b></p></section>
          </aside>
        </div>
        <div className="attendance-legend">{[['cl', 'Casual Leave'], ['sl', 'Sick Leave'], ['el', 'Earned Leave'], ['up', 'Unpaid Leave']].map(([key, label]) => <span key={key}><i className={`leave-dot ${key}`} />{label}</span>)}</div>
      </section>
    </div>
  );
}
