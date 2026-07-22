import { useState, useEffect, useCallback, useRef } from 'react';
import { DateRangeFilter } from '../../../../../components/forms/DateRangeFilter.jsx';
import { ExportButtons } from '../../../../../components/forms/ExportButtons.jsx';
import { api } from '../../../../../services/api.js';
import { dateRangeParams } from '../../../../../utils/dateRange.js';

const AVATAR_COLORS = ['#2563eb', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#e11d48', '#65a30d'];
const TH = 'text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-5 py-3 border-b border-[#edf2f7]';
const TD = 'px-5 py-3.5 border-b border-[#f3f4f6] text-[13px]';
const IL = 'block text-[12px] font-medium text-[#374151] mb-1';
const IC = 'w-full border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit] bg-white';

const STATUS_STYLES = {
  Present:    'bg-green-100 text-green-700',
  Late:       'bg-yellow-100 text-yellow-700',
  Absent:     'bg-red-100 text-red-600',
  'On Leave': 'bg-orange-100 text-orange-600',
};

const EMPTY_ATT = { employeeId: '', name: '', dept: '', date: '', checkIn: '--', checkOut: '--', hours: '--', status: 'Present' };

function todayISO() { return new Date().toISOString().slice(0, 10); }

function AttendanceModal({ initial, onClose, onSaved }) {
  const isEdit = !!initial?._id;
  const [form, setForm] = useState(initial ? { ...EMPTY_ATT, ...initial } : { ...EMPTY_ATT, date: todayISO() });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.employeeId.trim() || !form.name.trim() || !form.date) { setError('Employee ID, Name and Date are required'); return; }
    setSaving(true); setError('');
    try {
      if (isEdit) await api.hrUpdateAttendance(initial._id, form);
      else        await api.hrCreateAttendance(form);
      onSaved();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#edf2f7]">
          <h2 className="text-[16px] font-bold">{isEdit ? 'Edit Attendance' : 'Add Attendance'}</h2>
          <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-[#536173] bg-transparent border-0 cursor-pointer text-lg" onClick={onClose} type="button">×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
            <div>
              <label className={IL}>Employee ID *</label>
              <input className={IC} placeholder="e.g. EMP-001" value={form.employeeId} onChange={(e) => set('employeeId', e.target.value)} />
            </div>
            <div>
              <label className={IL}>Employee Name *</label>
              <input className={IC} placeholder="e.g. Rahul Sharma" value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>
            <div>
              <label className={IL}>Department</label>
              <input className={IC} placeholder="e.g. IT Department" value={form.dept} onChange={(e) => set('dept', e.target.value)} />
            </div>
            <div>
              <label className={IL}>Date *</label>
              <input className={IC} type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
            </div>
            <div>
              <label className={IL}>Status</label>
              <select className={IC} value={form.status} onChange={(e) => set('status', e.target.value)}>
                {['Present', 'Late', 'Absent', 'On Leave'].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={IL}>Check In</label>
              <input className={IC} placeholder="e.g. 09:00 AM" value={form.checkIn === '--' ? '' : form.checkIn} onChange={(e) => set('checkIn', e.target.value || '--')} />
            </div>
            <div>
              <label className={IL}>Check Out</label>
              <input className={IC} placeholder="e.g. 06:00 PM" value={form.checkOut === '--' ? '' : form.checkOut} onChange={(e) => set('checkOut', e.target.value || '--')} />
            </div>
            <div>
              <label className={IL}>Total Hours</label>
              <input className={IC} placeholder="e.g. 9h 00m" value={form.hours === '--' ? '' : form.hours} onChange={(e) => set('hours', e.target.value || '--')} />
            </div>
          </div>
          {error && <p className="px-6 pb-2 text-[12px] text-red-600">{error}</p>}
          <div className="px-6 py-4 border-t border-[#edf2f7] flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[13px] font-medium text-[#374151] bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit]">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit] disabled:opacity-60">
              {saving ? 'Saving...' : isEdit ? 'Update Record' : 'Add Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AttendancePage() {
  const [dateFrom, setDateFrom] = useState(todayISO());
  const [dateTo, setDateTo]     = useState(todayISO());
  const [dept, setDept]       = useState('All Departments');
  const [page, setPage]       = useState(1);
  const [records, setRecords] = useState([]);
  const [total, setTotal]     = useState(0);
  const [stats, setStats]     = useState({ total: 0, present: 0, absent: 0, late: 0, onLeave: 0 });
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const LIMIT = 5;

  const fetchAllForExport = useCallback(async () => {
    const params = { page: 1, limit: 9999 };
    Object.assign(params, dateRangeParams(dateFrom, dateTo));
    if (dept !== 'All Departments') params.dept = dept;
    const res = await api.hrListAttendance(params);
    return res.data ?? [];
  }, [dateFrom, dateTo, dept]);

  const fetchStats = useCallback(async () => {
    try { setStats(await api.hrAttendanceStats(dateRangeParams(dateFrom, dateTo))); } catch (_) {}
  }, [dateFrom, dateTo]);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      Object.assign(params, dateRangeParams(dateFrom, dateTo));
      if (dept !== 'All Departments') params.dept = dept;
      const res = await api.hrListAttendance(params);
      setRecords(res.data ?? []); setTotal(res.total ?? 0);
    } catch (_) { setRecords([]); }
    finally { setLoading(false); }
  }, [dateFrom, dateTo, dept, page]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { setPage(1); }, [dateFrom, dateTo, dept]);
  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this attendance record?')) return;
    try { await api.hrDeleteAttendance(id); fetchRecords(); fetchStats(); }
    catch (err) { alert(err.message); }
  };

  const handleSaved = () => { setModal(null); fetchRecords(); fetchStats(); };

  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setImporting(true);
    try {
      const result = await api.hrImportAttendance(formData);
      setDateFrom(''); setDateTo('');
      fetchRecords(); fetchStats();
      setImportResult(result);
    } catch (err) {
      setImportResult({ error: err.message || 'Import failed' });
    } finally {
      setImporting(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const exportColumns = [
    { label: 'Employee ID', value: (row) => row.employeeId },
    { label: 'Name', value: (row) => row.name },
    { label: 'Department', value: (row) => row.dept },
    { label: 'Date', value: (row) => row.date },
    { label: 'Check In', value: (row) => row.checkIn },
    { label: 'Check Out', value: (row) => row.checkOut },
    { label: 'Total Hours', value: (row) => row.hours },
    { label: 'Status', value: (row) => row.status },
  ];

  return (
    <div className="p-4 md:p-7">
      {modal !== null && <AttendanceModal initial={modal === 'add' ? null : modal} onClose={() => setModal(null)} onSaved={handleSaved} />}

      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-1">
        <div>
          <nav className="flex items-center gap-1 text-[13px] text-[#536173] mb-1">
            <a className="text-blue-600 no-underline hover:underline" href="//dashboard">Home</a>
            <span>›</span><span>HR &amp; Payroll</span><span>›</span><span>Attendance</span>
          </nav>
          <h1 className="m-0 text-[22px] font-bold">Attendance</h1>
          <p className="m-0 text-[13px] text-[#536173] mt-0.5">Track and manage employee attendance</p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleImportFile} />
          <button type="button" disabled={importing} onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-[#374151] bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit] disabled:opacity-60">
            <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
            {importing ? 'Importing...' : 'Import Excel'}
          </button>
          <button onClick={() => setModal('add')} className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit]" type="button">
            <svg fill="none" height="14" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="14"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
            Add Attendance
          </button>
        </div>
      </div>

      {importResult && (
        <div className={`mt-4 mb-0 px-4 py-3 rounded-lg text-[13px] border ${importResult.error ? 'bg-red-50 border-red-100 text-red-700' : 'bg-green-50 border-green-100 text-green-700'}`}>
          {importResult.error ? importResult.error : `Import complete: ${importResult.imported ?? 0} added, ${importResult.updated ?? 0} updated${(importResult.skipped ?? 0) > 0 ? `, ${importResult.skipped} skipped` : ''}.`}
          {importResult.errors?.length > 0 && <ul className="mt-1 list-disc pl-5 text-[12px]">{importResult.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}{importResult.errors.length > 5 && <li>...and {importResult.errors.length - 5} more</li>}</ul>}
          <button type="button" onClick={() => setImportResult(null)} className="mt-1 text-[12px] underline bg-transparent border-0 cursor-pointer p-0 text-inherit font-[inherit]">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 my-5">
        {[
          { label: 'Total Employees', value: stats.total,    sub: 'Employees', color: '#2563eb', bg: '#eff6ff', icon: <svg fill="none" height="20" stroke="#2563eb" strokeWidth="2" viewBox="0 0 24 24" width="20"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg> },
          { label: 'Present Today',   value: stats.present,  sub: stats.total ? `${((stats.present / stats.total) * 100).toFixed(1)}%` : '0%',  color: '#16a34a', bg: '#f0fdf4', icon: <svg fill="none" height="20" stroke="#16a34a" strokeWidth="2" viewBox="0 0 24 24" width="20"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg> },
          { label: 'Absent Today',    value: stats.absent,   sub: stats.total ? `${((stats.absent / stats.total) * 100).toFixed(1)}%` : '0%',   color: '#dc2626', bg: '#fef2f2', icon: <svg fill="none" height="20" stroke="#dc2626" strokeWidth="2" viewBox="0 0 24 24" width="20"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="17" x2="22" y1="11" y2="16"/><line x1="22" x2="17" y1="11" y2="16"/></svg> },
          { label: 'On Leave',        value: stats.onLeave,  sub: stats.total ? `${((stats.onLeave / stats.total) * 100).toFixed(1)}%` : '0%',  color: '#d97706', bg: '#fffbeb', icon: <svg fill="none" height="20" stroke="#d97706" strokeWidth="2" viewBox="0 0 24 24" width="20"><rect height="18" rx="2" ry="2" width="18" x="3" y="4"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg> },
          { label: 'Late Today',      value: stats.late,     sub: stats.total ? `${((stats.late / stats.total) * 100).toFixed(1)}%` : '0%',     color: '#7c3aed', bg: '#f5f3ff', icon: <svg fill="none" height="20" stroke="#7c3aed" strokeWidth="2" viewBox="0 0 24 24" width="20"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-[#dfe7f1] rounded-xl p-4 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-none" style={{ background: s.bg }}>{s.icon}</div>
            <div>
              <div className="text-xs text-[#536173] mb-0.5">{s.label}</div>
              <div className="text-[17px] font-bold leading-tight" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs mt-0.5 text-[#536173]">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-[#dfe7f1] rounded-xl">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[#edf2f7] flex-wrap">
          <DateRangeFilter
            from={dateFrom}
            to={dateTo}
            onFromChange={setDateFrom}
            onToChange={setDateTo}
            onClear={() => { setDateFrom(''); setDateTo(''); }}
          />
          <ExportButtons title="Attendance" filename="attendance" rows={records} columns={exportColumns} fetchRows={fetchAllForExport} />
          <select className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit] text-[#536173] bg-white cursor-pointer" value={dept} onChange={(e) => setDept(e.target.value)}>
            {['All Departments'].map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={TH}>Employee ID</th>
                <th className={TH}>Name</th>
                <th className={TH}>Department</th>
                <th className={TH}>Check In</th>
                <th className={TH}>Check Out</th>
                <th className={TH}>Total Hours</th>
                <th className={TH}>Status</th>
                <th className={TH}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-5 py-8 text-center text-[13px] text-[#536173]">Loading...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-[13px] text-[#536173]">
                  No attendance records for this date.{' '}
                  <button className="text-blue-600 underline bg-transparent border-0 cursor-pointer font-[inherit] text-[13px]" onClick={() => setModal('add')} type="button">Add one now</button>
                </td></tr>
              ) : records.map((row, i) => (
                <tr key={row._id} className="hover:bg-gray-50">
                  <td className={`${TD} font-medium text-blue-600`}>{row.employeeId}</td>
                  <td className={TD}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-none" style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>{row.name[0]}</div>
                      <span className="font-medium text-[#111827]">{row.name}</span>
                    </div>
                  </td>
                  <td className={`${TD} text-[#536173]`}>{row.dept}</td>
                  <td className={`${TD} text-[#536173]`}>{row.checkIn}</td>
                  <td className={`${TD} text-[#536173]`}>{row.checkOut}</td>
                  <td className={`${TD} font-medium`}>{row.hours}</td>
                  <td className={TD}>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_STYLES[row.status] ?? 'bg-gray-100 text-gray-600'}`}>{row.status}</span>
                  </td>
                  <td className={TD}>
                    <div className="flex items-center gap-1">
                      <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-yellow-50 text-yellow-500 bg-transparent border-0 cursor-pointer" title="Edit" type="button" onClick={() => setModal(row)}>
                        <svg fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-50 text-red-400 bg-transparent border-0 cursor-pointer" title="Delete" type="button" onClick={() => handleDelete(row._id)}>
                        <svg fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-[#edf2f7] flex justify-between text-[13px] text-[#536173]">
          <span>Showing {records.length ? (page - 1) * LIMIT + 1 : 0}–{Math.min(page * LIMIT, total)} of {total} entries</span>
          <div className="flex items-center gap-1">
            <button className="px-2.5 py-1 rounded border border-[#dbe4ef] hover:bg-gray-50 text-[12px] bg-white font-[inherit] cursor-pointer" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} type="button">←</button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
              <button key={p} className={`px-2.5 py-1 rounded text-[12px] font-[inherit] cursor-pointer ${p === page ? 'bg-blue-600 text-white border-0' : 'border border-[#dbe4ef] bg-white hover:bg-gray-50'}`} onClick={() => setPage(p)} type="button">{p}</button>
            ))}
            <button className="px-2.5 py-1 rounded border border-[#dbe4ef] hover:bg-gray-50 text-[12px] bg-white font-[inherit] cursor-pointer" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} type="button">→</button>
          </div>
        </div>
      </div>
    </div>
  );
}
