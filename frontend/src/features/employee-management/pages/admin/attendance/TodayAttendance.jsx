import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Edit3, Filter, MoreVertical, RefreshCw, Search } from 'lucide-react';

import { useLoad } from '../../../hooks/useLoad.js';
import { adminService } from '../../../services/adminService.js';
import { attendanceService } from '../../../services/attendanceService.js';
import { AttendanceNav } from './AttendanceNav.jsx';

const STATUSES = ['Present', 'Late', 'Absent', 'WFH', 'On Duty', 'Half Day', 'On Leave'];

function localDateValue() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function dateLabel(value) {
  const d = new Date(`${value}T00:00:00`);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', weekday: 'long' });
}

function statusClass(status) {
  if (status === 'Present') return 'hr-pill green';
  if (status === 'Late' || status === 'Half Day') return 'hr-pill amber';
  if (status === 'Absent') return 'hr-pill red';
  return 'hr-pill blue';
}



export default function TodayAttendance() {
  const [date, setDate] = useState(localDateValue);
  const [query, setQuery] = useState('');
  const [dept, setDept] = useState('');
  const [shift, setShift] = useState('');
  const [editing, setEditing] = useState(null);
  const [markOpen, setMarkOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [rowMenu, setRowMenu] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [form, setForm] = useState({ employeeId: '', status: 'Present', checkIn: '09:00', checkOut: '', remarks: '', shift: '' });
  const { data, loading, error, setData, reload } = useLoad(() => attendanceService.adminDate(date), [date]);
  const employeesLoad = useLoad(adminService.employees, []);
  const rows = useMemo(() => data?.data || [], [data]);
  const employees = useMemo(() => employeesLoad.data?.data || [], [employeesLoad.data]);

  const employeeById = useMemo(() => new Map(employees.map((employee) => [employee.employeeId, employee])), [employees]);
  const departments = [...new Set(employees.map((employee) => employee.dept).filter(Boolean))];
  const shifts = [...new Set(employees.map((employee) => employee.shift || 'General Shift').filter(Boolean))];
  const displayRows = rows.filter((row) => {
    const employee = employeeById.get(row.employeeId) || {};
    const q = query.trim().toLowerCase();
    return (!q || [row.name, row.employeeId, row.dept, employee.designation].some((value) => String(value || '').toLowerCase().includes(q)))
      && (!dept || row.dept === dept)
      && (!shift || (row.shift || employee.shift || 'General Shift') === shift);
  });
  const counts = {
    total: employees.length,
    present: rows.filter((row) => row.status === 'Present').length,
    absent: rows.filter((row) => row.status === 'Absent').length,
    late: rows.filter((row) => row.status === 'Late').length,
    wfh: rows.filter((row) => row.status === 'WFH').length,
    duty: rows.filter((row) => row.status === 'On Duty').length,
  };

  function nudgeDate(days) {
    const d = new Date(`${date}T00:00:00`);
    d.setDate(d.getDate() + days);
    setDate(d.toISOString().slice(0, 10));
  }

  function openMark(row = null) {
    setMarkOpen(true);
    if (row) {
      setEditing(row);
      setForm({ employeeId: row.employeeId, status: row.status || 'Present', checkIn: row.checkIn === '--' ? '' : row.checkIn, checkOut: row.checkOut === '--' ? '' : row.checkOut, remarks: row.remarks || '', shift: row.shift || employeeById.get(row.employeeId)?.shift || 'General Shift' });
    } else {
      setEditing(null);
      setForm({ employeeId: employees[0]?.employeeId || '', status: 'Present', checkIn: '09:00', checkOut: '', remarks: '', shift: employees[0]?.shift || 'General Shift' });
    }
  }

  async function saveAttendance(event) {
    event.preventDefault();
    setActionError('');
    setMessage('');
    if (!form.employeeId) return setActionError('Select an employee before saving attendance.');
    setSaving(true);
    try {
      const saved = await attendanceService.adminMark({ ...form, date });
      setData((current) => {
        const existing = current?.data || [];
        const next = existing.some((row) => row._id === saved._id)
          ? existing.map((row) => row._id === saved._id ? saved : row)
          : [...existing, saved];
        return { data: next };
      });
      setEditing(null);
      setMarkOpen(false);
      setMessage('Attendance saved.');
    } catch (err) {
      setActionError(err.message || 'Unable to save attendance.');
    } finally {
      setSaving(false);
    }
  }

  async function quickMark(employee, status) {
    setActionError('');
    setMessage('');
    try {
      const saved = await attendanceService.adminMark({
        employeeId: employee.employeeId,
        date,
        status,
        checkIn: status === 'Present' || status === 'Late' ? '09:00' : '--',
        checkOut: '',
        shift: employee.shift || 'General Shift',
        remarks: `Marked ${status} by HR`,
      });
      setData((current) => {
        const existing = current?.data || [];
        const next = existing.some((row) => row._id === saved._id)
          ? existing.map((row) => row._id === saved._id ? saved : row)
          : [...existing, saved];
        return { data: next };
      });
      setRowMenu(null);
      setMessage(`${employee.name} marked ${status}.`);
    } catch (err) {
      setActionError(err.message || 'Unable to update attendance.');
    }
  }

  function toggleRowMenu(event, row, employee) {
    const rect = event.currentTarget.getBoundingClientRect();
    setRowMenu((current) => current?.row._id === row._id ? null : {
      row,
      employee,
      style: {
        top: Math.min(rect.bottom + 8, window.innerHeight - 216),
        left: Math.max(8, Math.min(rect.right - 190, window.innerWidth - 202)),
      },
    });
  }

  useEffect(() => {
    if (!rowMenu) return undefined;
    const close = () => setRowMenu(null);
    const closeFromOutside = (event) => {
      if (event.target.closest?.('.attendance-action-menu, .attendance-action-trigger')) return;
      setRowMenu(null);
    };
    document.addEventListener('mousedown', closeFromOutside);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', closeFromOutside);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [rowMenu]);

  async function bulkMark(status) {
    setBulkOpen(false);
    setActionError('');
    setMessage('');
    if (employees.length === 0) return setActionError('No employees found for bulk attendance.');
    setSaving(true);
    try {
      const savedRows = await Promise.all(employees.map((employee) => attendanceService.adminMark({
        employeeId: employee.employeeId,
        date,
        status,
        checkIn: status === 'Present' || status === 'Late' ? '09:00' : '--',
        checkOut: '',
        shift: employee.shift || 'General Shift',
        remarks: `Bulk marked ${status}`,
      })));
      setData((current) => {
        const byKey = new Map((current?.data || []).map((row) => [row.employeeId, row]));
        for (const row of savedRows) byKey.set(row.employeeId, row);
        return { data: [...byKey.values()] };
      });
      setMessage(`Bulk marked ${employees.length} employee(s) as ${status}.`);
    } catch (err) {
      setActionError(err.message || 'Unable to complete bulk action.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="hr-screen">
      <div className="hr-page-head">
        <div><h1>Daily Attendance</h1><p>Mark and manage daily attendance</p></div>
        <div className="hr-actions">
          <div className="hr-menu-cell">
            <button className="hr-btn" type="button" onClick={() => setBulkOpen((open) => !open)}>Bulk Actions</button>
            {bulkOpen && <div className="hr-row-menu"><button type="button" onClick={() => bulkMark('Present')}>Mark all Present</button><button type="button" onClick={() => bulkMark('Absent')}>Mark all Absent</button><button type="button" onClick={() => { setQuery(''); setDept(''); setShift(''); setBulkOpen(false); }}>Clear filters</button></div>}
          </div>
          <button className="hr-btn primary" type="button" onClick={() => openMark()}>Mark Attendance</button>
        </div>
      </div>
      <AttendanceNav current="/employee-management/attendance" />
      {error && <p className="error">{error}</p>}
      {actionError && <p className="error">{actionError}</p>}
      {message && <p className="leave-success-message">{message}</p>}
      <div className="attendance-date-row">
        <button className="hr-icon-btn" type="button" onClick={() => nudgeDate(-1)}><ChevronLeft size={16} /></button>
        <label><span>{dateLabel(date)}</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        <button className="hr-icon-btn" type="button" onClick={() => nudgeDate(1)}><ChevronRight size={16} /></button>
      </div>
      <div className="attendance-stat-grid">
        {[
          ['Total Employees', counts.total, ''],
          ['Present', counts.present, counts.total ? `${((counts.present / counts.total) * 100).toFixed(2)}%` : '0%'],
          ['Absent', counts.absent, counts.total ? `${((counts.absent / counts.total) * 100).toFixed(2)}%` : '0%'],
          ['Late', counts.late, counts.total ? `${((counts.late / counts.total) * 100).toFixed(2)}%` : '0%'],
          ['WFH', counts.wfh, counts.total ? `${((counts.wfh / counts.total) * 100).toFixed(2)}%` : '0%'],
          ['On Duty', counts.duty, counts.total ? `${((counts.duty / counts.total) * 100).toFixed(2)}%` : '0%'],
        ].map(([label, value, sub]) => <section className="attendance-stat" key={label}><span>{label}</span><strong>{value}</strong>{sub && <small>{sub}</small>}</section>)}
      </div>
      <section className="hr-card">
        <div className="hr-toolbar">
          <div className="hr-search"><Search size={15} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search employee by name, ID or department..." /></div>
          <select className="attendance-select" value={dept} onChange={(e) => setDept(e.target.value)}><option value="">All Departments</option>{departments.map((item) => <option key={item}>{item}</option>)}</select>
          <select className="attendance-select" value={shift} onChange={(e) => setShift(e.target.value)}><option value="">All Shifts</option>{shifts.map((item) => <option key={item}>{item}</option>)}</select>
          <button className="hr-btn" type="button" onClick={() => setMessage(`Filters applied. Showing ${displayRows.length} record(s).`)}>Filters <Filter size={14} /></button><button className="hr-icon-btn" type="button" onClick={reload}><RefreshCw size={15} /></button>
        </div>
        <div className="hr-table-wrap">
          <table className="hr-table attendance-table">
            <thead>
              <tr><th>#</th><th>Employee</th><th>Department</th><th>Shift</th><th>Status</th><th>Time</th><th>Remarks</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={8}>Loading attendance...</td></tr> : null}
              {!loading && displayRows.length === 0 ? <tr><td colSpan={8}>No attendance marked for this date.</td></tr> : null}
              {displayRows.map((row, index) => {
                const employee = employeeById.get(row.employeeId) || row;
                const checkIn = row.checkIn && row.checkIn !== '--' ? row.checkIn : '-';
                const checkOut = row.checkOut && row.checkOut !== '--' ? row.checkOut : '';
                return (
                  <tr className="attendance-row" key={row._id}>
                    <td className="attendance-row-index">{index + 1}</td>
                    <td>
                      <div className="hr-employee-cell attendance-employee-cell">
                        <span>{row.name?.[0] || 'E'}</span>
                        <div><strong>{row.name}</strong><small>{row.employeeId}</small></div>
                      </div>
                    </td>
                    <td><span className="attendance-muted-value">{row.dept || '-'}</span></td>
                    <td><span className="attendance-shift-chip">{row.shift || employee.shift || 'General Shift'}</span></td>
                    <td><span className={statusClass(row.status)}>{row.status}</span></td>
                    <td>
                      <div className="attendance-time-cell">
                        <span>{checkIn}</span>
                        {checkOut && <small>{checkOut}</small>}
                      </div>
                    </td>
                    <td><span className="attendance-remarks" title={row.remarks || ''}>{row.remarks || '-'}</span></td>
                    <td className="attendance-actions-cell">
                      <button className="hr-icon-btn" type="button" title="Edit attendance" onClick={() => openMark(row)}><Edit3 size={14} /></button>
                      <button className="hr-icon-btn attendance-action-trigger" type="button" title="Quick actions" onClick={(event) => toggleRowMenu(event, row, employee)}><MoreVertical size={14} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="attendance-legend">{STATUSES.map((status) => <span key={status}><i className={statusClass(status)} />{status}</span>)}</div>
      </section>
      {rowMenu && createPortal(
        <div className="hr-row-menu hr-row-menu-portal attendance-action-menu" style={rowMenu.style}>
          <button type="button" onClick={() => { openMark(rowMenu.row); setRowMenu(null); }}>Edit Attendance</button>
          <button type="button" onClick={() => quickMark(rowMenu.employee, 'Present')}>Mark Present</button>
          <button type="button" onClick={() => quickMark(rowMenu.employee, 'Absent')}>Mark Absent</button>
          <button type="button" onClick={() => quickMark(rowMenu.employee, 'On Leave')}>Mark On Leave</button>
        </div>,
        document.body,
      )}
      {markOpen && (
        <div className="customer-form-overlay fixed inset-0 z-[100] flex items-start justify-center bg-slate-900/35 px-4 py-8" role="dialog" aria-modal="true" aria-labelledby="mark-attendance-modal-title" onMouseDown={(event) => event.target === event.currentTarget && setMarkOpen(false)}>
          <button type="button" aria-label="Close mark attendance" className="absolute inset-0 cursor-default border-0 bg-transparent" onClick={() => setMarkOpen(false)} />
          <form className="relative w-full max-w-[760px] rounded-lg border border-[#cfdced] bg-white p-5 shadow-2xl" onSubmit={saveAttendance}>
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 id="mark-attendance-modal-title" className="m-0 text-[20px] font-bold text-[#111827]">{editing ? 'Edit Attendance' : 'Mark Attendance'}</h3>
                <p className="m-0 mt-1.5 text-[13px] text-[#64748b]">Fill in the attendance details for the selected employee.</p>
              </div>
              <button className="flex h-8 w-8 items-center justify-center rounded-md border-0 bg-transparent text-[28px] leading-none text-[#64748b] cursor-pointer hover:bg-slate-50 hover:text-[#111827]" type="button" onClick={() => setMarkOpen(false)} aria-label="Close">×</button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-[13px] font-semibold text-[#536173]">Employee</label>
                <select
                  className="h-[40px] w-full rounded-md border border-[#dbe4ef] px-3 text-[14px] outline-none font-[inherit] focus:border-blue-500 bg-white cursor-pointer"
                  value={form.employeeId}
                  disabled={Boolean(editing)}
                  onChange={(e) => setForm((current) => ({ ...current, employeeId: e.target.value }))}
                >
                  <option value="">Select employee</option>
                  {employees.map((employee) => (
                    <option key={employee.employeeId} value={employee.employeeId}>{employee.name} ({employee.employeeId})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[13px] font-semibold text-[#536173]">Status</label>
                <select
                  className="h-[40px] w-full rounded-md border border-[#dbe4ef] px-3 text-[14px] outline-none font-[inherit] focus:border-blue-500 bg-white cursor-pointer"
                  value={form.status}
                  onChange={(e) => setForm((current) => ({ ...current, status: e.target.value }))}
                >
                  {STATUSES.map((status) => <option key={status}>{status}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[13px] font-semibold text-[#536173]">Shift</label>
                <input
                  className="h-[40px] w-full rounded-md border border-[#dbe4ef] px-3 text-[14px] outline-none font-[inherit] focus:border-blue-500"
                  value={form.shift}
                  onChange={(e) => setForm((current) => ({ ...current, shift: e.target.value }))}
                  placeholder="e.g. General Shift"
                />
              </div>

              <div>
                <label className="mb-1 block text-[13px] font-semibold text-[#536173]">Check In</label>
                <input
                  className="h-[40px] w-full rounded-md border border-[#dbe4ef] px-3 text-[14px] outline-none font-[inherit] focus:border-blue-500"
                  value={form.checkIn}
                  onChange={(e) => setForm((current) => ({ ...current, checkIn: e.target.value }))}
                  placeholder="09:00"
                />
              </div>

              <div>
                <label className="mb-1 block text-[13px] font-semibold text-[#536173]">Check Out</label>
                <input
                  className="h-[40px] w-full rounded-md border border-[#dbe4ef] px-3 text-[14px] outline-none font-[inherit] focus:border-blue-500"
                  value={form.checkOut}
                  onChange={(e) => setForm((current) => ({ ...current, checkOut: e.target.value }))}
                  placeholder="18:00"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-[13px] font-semibold text-[#536173]">Remarks</label>
                <textarea
                  className="w-full rounded-md border border-[#dbe4ef] px-3 py-2.5 text-[14px] outline-none font-[inherit] focus:border-blue-500 resize-y min-h-[80px]"
                  value={form.remarks}
                  onChange={(e) => setForm((current) => ({ ...current, remarks: e.target.value }))}
                  placeholder="Optional remarks..."
                />
              </div>
            </div>

            {actionError && <p className="mt-4 text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{actionError}</p>}
            <div className="mt-5 flex justify-end gap-2.5">
              <button className="min-w-[78px] rounded-md border border-[#dbe4ef] bg-white px-4 py-2.5 text-[14px] font-semibold text-[#1f2937] cursor-pointer hover:bg-gray-50 font-[inherit]" type="button" onClick={() => setMarkOpen(false)}>Cancel</button>
              <button className="min-w-[132px] rounded-md border-0 bg-blue-600 px-4 py-2.5 text-[14px] font-semibold text-white cursor-pointer hover:bg-blue-700 font-[inherit]" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Attendance'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
