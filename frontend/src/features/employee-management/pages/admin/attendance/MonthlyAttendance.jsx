import { useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';

import { useLoad } from '../../../hooks/useLoad.js';
import { adminService } from '../../../services/adminService.js';
import { attendanceService } from '../../../services/attendanceService.js';
import { AttendanceNav } from './AttendanceNav.jsx';

function localMonth() {
  return new Date().toISOString().slice(0, 7);
}

function monthName(value) {
  return new Date(`${value}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function daysInMonth(value) {
  const [year, month] = value.split('-').map(Number);
  return new Date(year, month, 0).getDate();
}

function code(status) {
  if (status === 'Present') return 'P';
  if (status === 'Absent') return 'A';
  if (status === 'Late') return 'L';
  if (status === 'Half Day') return 'HF';
  if (status === 'WFH') return 'WF';
  if (status === 'On Duty') return 'OD';
  return status ? status[0] : '';
}

export default function MonthlyAttendance() {
  const [month, setMonth] = useState(localMonth);
  const [dept, setDept] = useState('');
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const { data, loading, error } = useLoad(() => attendanceService.adminMonthly(month), [month]);
  const employeesLoad = useLoad(adminService.employees, []);
  const rows = useMemo(() => data?.data || [], [data]);
  const employees = useMemo(() => employeesLoad.data?.data || [], [employeesLoad.data]);
  const days = Array.from({ length: daysInMonth(month) }, (_, i) => i + 1);
  const depts = [...new Set(employees.map((employee) => employee.dept).filter(Boolean))];
  const attendanceMap = useMemo(() => {
    const map = new Map();
    for (const record of rows) map.set(`${record.employeeId}-${Number(record.date.slice(-2))}`, record);
    return map;
  }, [rows]);
  const displayEmployees = employees.filter((employee) => {
    const q = query.trim().toLowerCase();
    return (!q || [employee.name, employee.employeeId, employee.dept].some((value) => String(value || '').toLowerCase().includes(q))) && (!dept || employee.dept === dept);
  });
  const summary = {
    working: days.length,
    present: rows.filter((row) => row.status === 'Present').length,
    absent: rows.filter((row) => row.status === 'Absent').length,
    late: rows.filter((row) => row.status === 'Late').length,
    leave: rows.filter((row) => row.status === 'On Leave').length,
    half: rows.filter((row) => row.status === 'Half Day').length,
  };
  const rate = rows.length ? (((summary.present + summary.late) / rows.length) * 100).toFixed(2) : '0.00';

  function exportRegister() {
    const header = ['Employee ID', 'Employee', ...days.map((day) => String(day))];
    const body = displayEmployees.map((employee) => [employee.employeeId, employee.name, ...days.map((day) => code(attendanceMap.get(`${employee.employeeId}-${day}`)?.status))]);
    const csv = [header, ...body].map((line) => line.map((cell) => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance-register-${month}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage('Attendance register exported.');
  }

  return (
    <div className="hr-screen">
      <div className="hr-page-head">
        <div><h1>Attendance Register</h1><p>Monthly attendance overview and history</p></div>
        <div className="hr-actions"><button className="hr-btn" type="button" onClick={exportRegister}><Download size={14} /> Export</button></div>
      </div>
      <AttendanceNav current="/employee-management/attendance/monthly" />
      {error && <p className="error">{error}</p>}
      {message && <p className="leave-success-message">{message}</p>}
      <section className="hr-card">
        <div className="hr-toolbar">
          <input className="attendance-select" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          <select className="attendance-select" value={dept} onChange={(e) => setDept(e.target.value)}><option value="">All Departments</option>{depts.map((item) => <option key={item}>{item}</option>)}</select>
          <div className="hr-search"><Search size={15} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search employee..." /></div>
        </div>
        <div className="attendance-register-layout">
          <div className="attendance-register-scroll">
            <table className="attendance-register-table">
              <thead><tr><th>Employee</th>{days.map((day) => <th key={day}>{day}</th>)}</tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={days.length + 1}>Loading register...</td></tr> : null}
                {!loading && displayEmployees.map((employee) => <tr key={employee._id}><td><div className="hr-employee-cell"><span>{employee.name?.[0] || 'E'}</span><div><strong>{employee.name}</strong><small>{employee.employeeId}</small></div></div></td>{days.map((day) => { const record = attendanceMap.get(`${employee.employeeId}-${day}`); const text = code(record?.status); return <td key={day} className={`att-cell ${text || 'empty'}`}>{text}</td>; })}</tr>)}
              </tbody>
            </table>
          </div>
          <aside className="attendance-summary-card"><h2>Summary ({monthName(month)})</h2>{[['Total Working Days', summary.working], ['Present Days', summary.present], ['Absent Days', summary.absent], ['Late Days', summary.late], ['Leave Days', summary.leave], ['Half Days', summary.half]].map(([k, v]) => <p key={k}><span>{k}</span><strong>{v}</strong></p>)}<div className="attendance-rate-line"><span>Attendance %</span><strong>{rate}%</strong><i style={{ width: `${Math.min(100, Number(rate))}%` }} /></div><button className="hr-btn full" type="button" onClick={() => setMessage(displayEmployees[0] ? `Showing history scope for ${displayEmployees[0].name}. Use search to select another employee.` : 'No employee history available.')}>Employee History</button></aside>
        </div>
        <div className="attendance-legend">{[['P', 'Present'], ['A', 'Absent'], ['L', 'Late'], ['HF', 'Half Day'], ['WF', 'Work From Home'], ['OD', 'On Duty']].map(([c, l]) => <span key={c}><i className={`att-cell ${c}`} />{l}</span>)}</div>
      </section>
    </div>
  );
}
