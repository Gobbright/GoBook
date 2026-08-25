import { useMemo, useState } from 'react';
import { BadgeCheck, Download, Fingerprint, MapPin, Radio, ScanFace, Smartphone } from 'lucide-react';

import { useLoad } from '../../../hooks/useLoad.js';
import { adminService } from '../../../services/adminService.js';
import { attendanceService } from '../../../services/attendanceService.js';
import { AttendanceNav } from './AttendanceNav.jsx';

function localMonth() { return new Date().toISOString().slice(0, 7); }

export default function AttendanceReports() {
  const [month, setMonth] = useState(localMonth);
  const [dept, setDept] = useState('');
  const [shift, setShift] = useState('');
  const [reportType, setReportType] = useState('Monthly Attendance');
  const [activeMenu, setActiveMenu] = useState('Monthly Attendance');
  const [message, setMessage] = useState('');
  const { data } = useLoad(() => attendanceService.adminMonthly(month), [month]);
  const employeesLoad = useLoad(adminService.employees, []);
  const rows = data?.data || [];
  const employees = employeesLoad.data?.data || [];
  const depts = [...new Set(employees.map((employee) => employee.dept).filter(Boolean))];
  const shifts = [...new Set(employees.map((employee) => employee.shift || 'General Shift').filter(Boolean))];
  const scoped = rows.filter((row) => (!dept || row.dept === dept) && (!shift || row.shift === shift));
  const summary = {
    total: employees.length,
    working: 26,
    present: scoped.filter((row) => row.status === 'Present').length,
    absent: scoped.filter((row) => row.status === 'Absent').length,
    rate: scoped.length ? (((scoped.filter((row) => ['Present', 'Late'].includes(row.status)).length / scoped.length) * 100).toFixed(2)) : '0.00',
  };
  const lateList = useMemo(() => {
    const counts = new Map();
    for (const row of scoped.filter((record) => record.status === 'Late')) counts.set(row.name, (counts.get(row.name) || 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [scoped]);
  const chartDays = Array.from({ length: 31 }, (_, index) => index + 1);

  function exportReport() {
    const lines = [
      ['Report Type', reportType],
      ['Month', month],
      ['Department', dept || 'All Departments'],
      ['Shift', shift || 'All Shifts'],
      ['Total Employees', summary.total],
      ['Present', summary.present],
      ['Absent', summary.absent],
      ['Attendance %', summary.rate],
    ];
    const csv = lines.map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance-report-${month}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage('Attendance report exported.');
  }

  return (
    <div className="hr-screen">
      <div className="hr-page-head">
        <div><h1>Attendance Reports</h1><p>Generate and analyze attendance reports</p></div>
        <button className="hr-btn" type="button" onClick={exportReport}><Download size={14} /> Export</button>
      </div>
      <AttendanceNav current="/employee-management/attendance/reports" />
      {message && <p className="leave-success-message">{message}</p>}
      <section className="hr-card">
        <div className="report-filter-grid">
          <label className="hr-field">Report Type<select value={reportType} onChange={(e) => setReportType(e.target.value)}><option>Monthly Attendance</option><option>Daily Attendance</option><option>Employee-wise</option><option>Late Arrivals</option></select></label>
          <label className="hr-field">Month<input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></label>
          <label className="hr-field">Department<select value={dept} onChange={(e) => setDept(e.target.value)}><option value="">All Departments</option>{depts.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="hr-field">Shift<select value={shift} onChange={(e) => setShift(e.target.value)}><option value="">All Shifts</option>{shifts.map((item) => <option key={item}>{item}</option>)}</select></label>
          <button className="hr-btn primary" type="button" onClick={() => setMessage(`${reportType} generated for ${month}.`)}>Generate Report</button>
        </div>
        <div className="attendance-report-layout">
          <aside className="report-menu">{['Daily Attendance', 'Monthly Attendance', 'Employee-wise', 'Department-wise', 'Late Arrivals', 'Absentee Report', 'Overtime Report', 'Shift-wise', 'Attendance % Report'].map((item) => <button key={item} type="button" className={activeMenu === item ? 'active' : ''} onClick={() => { setActiveMenu(item); setReportType(item); }}>{item}</button>)}</aside>
          <section className="report-main">
            <h2>Monthly Attendance Summary ({month})</h2>
            <div className="report-summary-grid">{[['Total Employees', summary.total], ['Total Working Days', summary.working], ['Total Present Days', summary.present], ['Total Absent Days', summary.absent], ['Avg Attendance %', `${summary.rate}%`]].map(([k, v]) => <span key={k}>{k}<strong>{v}</strong></span>)}</div>
            <div className="attendance-chart">{chartDays.map((day) => <span key={day} style={{ height: `${20 + ((day * 17) % 78)}%` }} />)}</div>
            <div className="attendance-legend"><span><i className="chart-dot green" />Present</span><span><i className="chart-dot red" />Absent</span><span><i className="chart-dot amber" />Late</span><span><i className="chart-dot blue" />Attendance %</span></div>
          </section>
          <aside className="hr-card report-late"><h2>Top Late Employees</h2>{lateList.length === 0 ? <p>No late entries.</p> : lateList.map(([name, count], index) => <p key={name}><span>{index + 1}. {name}</span><strong>{count} Times</strong></p>)}</aside>
        </div>
      </section>
      <section className="hr-card"><h2>Integration Options (Future)</h2><div className="integration-grid">{[[Fingerprint, 'Biometric Device', 'Connect biometric devices'], [Radio, 'RFID', 'Connect RFID systems'], [ScanFace, 'Face Recognition', 'AI face recognition'], [Smartphone, 'Mobile Attendance', 'Mobile app attendance'], [MapPin, 'GPS Attendance', 'Location based tracking'], [BadgeCheck, 'Approval Rules', 'Configure approval flow']].map(([Icon, title, sub]) => <button key={title} type="button" onClick={() => setMessage(`${title} setup is planned for a future integration.`)}><Icon size={22} /><span>{title}<small>{sub}</small></span></button>)}</div></section>
    </div>
  );
}
