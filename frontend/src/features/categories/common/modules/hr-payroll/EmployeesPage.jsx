import { useState, useEffect, useCallback, useRef } from 'react';
import { ExportButtons } from '../../../../../components/forms/ExportButtons.jsx';
import { api } from '../../../../../services/api.js';

const AVATAR_COLORS = ['#2563eb', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#e11d48', '#65a30d'];
const TH = 'text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-5 py-3 border-b border-[#edf2f7]';
const TD = 'px-5 py-3.5 border-b border-[#f3f4f6] text-[13px]';
const IL = 'block text-[12px] font-medium text-[#374151] mb-1';
const IC = 'w-full border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit] bg-white';

const EMPTY = { name: '', dept: '', designation: '', email: '', phone: '', gender: 'Male', status: 'Active', joinDate: '', basicSalary: '' };

function EmployeeModal({ initial, depts, onClose, onSaved }) {
  const isEdit = !!initial?._id;
  const [form, setForm] = useState(initial ? { ...EMPTY, ...initial } : { ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        await api.hrUpdateEmployee(initial._id, form);
      } else {
        await api.hrCreateEmployee(form);
      }
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#edf2f7]">
          <h2 className="text-[16px] font-bold">{isEdit ? 'Edit Employee' : 'Add Employee'}</h2>
          <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-[#536173] bg-transparent border-0 cursor-pointer text-lg" onClick={onClose} type="button">×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
            <div className="sm:col-span-2">
              <label className={IL}>Full Name *</label>
              <input className={IC} placeholder="e.g. Rahul Sharma" value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>
            <div>
              <label className={IL}>Department</label>
              <input className={IC} list="dept-list" placeholder="e.g. IT Department" value={form.dept} onChange={(e) => set('dept', e.target.value)} />
              <datalist id="dept-list">{depts.filter((d) => d !== 'All Departments').map((d) => <option key={d} value={d} />)}</datalist>
            </div>
            <div>
              <label className={IL}>Designation</label>
              <input className={IC} placeholder="e.g. Software Engineer" value={form.designation} onChange={(e) => set('designation', e.target.value)} />
            </div>
            <div>
              <label className={IL}>Email</label>
              <input className={IC} type="email" placeholder="e.g. name@company.com" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </div>
            <div>
              <label className={IL}>Phone</label>
              <input className={IC} placeholder="e.g. 9876543210" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </div>
            <div>
              <label className={IL}>Gender</label>
              <select className={IC} value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                {['Male', 'Female', 'Other'].map((g) => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className={IL}>Status</label>
              <select className={IC} value={form.status} onChange={(e) => set('status', e.target.value)}>
                {['Active', 'Inactive'].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={IL}>Join Date</label>
              <input className={IC} type="date" value={form.joinDate} onChange={(e) => set('joinDate', e.target.value)} />
            </div>
            <div>
              <label className={IL}>Basic Salary (₹)</label>
              <input className={IC} type="number" min="0" placeholder="e.g. 45000" value={form.basicSalary} onChange={(e) => set('basicSalary', e.target.value)} />
            </div>
          </div>
          {error && <p className="px-6 pb-2 text-[12px] text-red-600">{error}</p>}
          <div className="px-6 py-4 border-t border-[#edf2f7] flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[13px] font-medium text-[#374151] bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit]">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit] disabled:opacity-60">
              {saving ? 'Saving...' : isEdit ? 'Update Employee' : 'Add Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function EmployeesPage() {
  const [search, setSearch]     = useState('');
  const [dept, setDept]         = useState('All Departments');
  const [status, setStatus]     = useState('All Status');
  const [page, setPage]         = useState(1);
  const [employees, setEmployees] = useState([]);
  const [total, setTotal]       = useState(0);
  const [stats, setStats]       = useState({ total: 0, male: 0, female: 0, deptCount: 0, active: 0, inactive: 0 });
  const [depts, setDepts]       = useState(['All Departments']);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null); // null | 'add' | employee-object
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const LIMIT = 5;

  const fetchAllForExport = useCallback(async () => {
    const params = { page: 1, limit: 9999 };
    if (search) params.search = search;
    if (dept !== 'All Departments') params.dept = dept;
    if (status !== 'All Status') params.status = status;
    const res = await api.hrListEmployees(params);
    return res.data ?? [];
  }, [search, dept, status]);

  const fetchDepts = useCallback(async () => {
    try { const d = await api.hrDepartments(); setDepts(['All Departments', ...d]); } catch (_) {}
  }, []);

  const fetchStats = useCallback(async () => {
    try { setStats(await api.hrEmployeeStats()); } catch (_) {}
  }, []);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (search) params.search = search;
      if (dept !== 'All Departments') params.dept = dept;
      if (status !== 'All Status') params.status = status;
      const res = await api.hrListEmployees(params);
      setEmployees(res.data ?? []);
      setTotal(res.total ?? 0);
    } catch (_) { setEmployees([]); }
    finally { setLoading(false); }
  }, [search, dept, status, page]);

  useEffect(() => { fetchDepts(); fetchStats(); }, [fetchDepts, fetchStats]);
  useEffect(() => { setPage(1); }, [search, dept, status]);
  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this employee? This cannot be undone.')) return;
    try { await api.hrDeleteEmployee(id); fetchEmployees(); fetchStats(); fetchDepts(); }
    catch (err) { alert(err.message); }
  };

  const handleSaved = () => { setModal(null); fetchEmployees(); fetchStats(); fetchDepts(); };

  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setImporting(true);
    try {
      const result = await api.hrImportEmployees(formData);
      fetchEmployees(); fetchStats(); fetchDepts();
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
    { label: 'Designation', value: (row) => row.designation },
    { label: 'Email', value: (row) => row.email },
    { label: 'Phone', value: (row) => row.phone },
    { label: 'Status', value: (row) => row.status },
  ];

  return (
    <div className="p-4 md:p-7">
      {modal !== null && (
        <EmployeeModal
          initial={modal === 'add' ? null : modal}
          depts={depts}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}

      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-1">
        <div>
          <nav className="flex items-center gap-1 text-[13px] text-[#536173] mb-1">
            <a className="text-blue-600 no-underline hover:underline" href="/dashboard">Home</a>
            <span>›</span><span>HR &amp; Payroll</span><span>›</span><span>Employees</span>
          </nav>
          <h1 className="m-0 text-[22px] font-bold">Employees</h1>
          <p className="m-0 text-[13px] text-[#536173] mt-0.5">Manage your organization employees</p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleImportFile} />
          <button type="button" disabled={importing} onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-[#374151] bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit] disabled:opacity-60">
            <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
            {importing ? 'Importing...' : 'Import Excel'}
          </button>
          <button onClick={() => setModal('add')} className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit]" type="button">
            <svg fill="none" height="14" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="14"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
            Add Employee
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
          { label: 'Total Employees', value: stats.total,    sub: `Active: ${stats.active}`,  color: '#2563eb', bg: '#eff6ff', icon: <svg fill="none" height="20" stroke="#2563eb" strokeWidth="2" viewBox="0 0 24 24" width="20"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg> },
          { label: 'Male Employees',  value: stats.male,     sub: stats.total ? `${((stats.male / stats.total) * 100).toFixed(1)}%` : '0%', color: '#0891b2', bg: '#ecfeff', icon: <svg fill="none" height="20" stroke="#0891b2" strokeWidth="2" viewBox="0 0 24 24" width="20"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 10-16 0"/></svg> },
          { label: 'Female Employees',value: stats.female,   sub: stats.total ? `${((stats.female / stats.total) * 100).toFixed(1)}%` : '0%', color: '#e11d48', bg: '#fff1f2', icon: <svg fill="none" height="20" stroke="#e11d48" strokeWidth="2" viewBox="0 0 24 24" width="20"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 10-16 0"/></svg> },
          { label: 'Departments',     value: stats.deptCount,sub: 'Total',                    color: '#7c3aed', bg: '#f5f3ff', icon: <svg fill="none" height="20" stroke="#7c3aed" strokeWidth="2" viewBox="0 0 24 24" width="20"><rect height="7" rx="1" width="7" x="2" y="3"/><rect height="7" rx="1" width="7" x="15" y="3"/><rect height="7" rx="1" width="7" x="2" y="14"/><rect height="7" rx="1" width="7" x="15" y="14"/></svg> },
          { label: 'Inactive',        value: stats.inactive ?? 0, sub: 'Employees',           color: '#d97706', bg: '#fffbeb', icon: <svg fill="none" height="20" stroke="#d97706" strokeWidth="2" viewBox="0 0 24 24" width="20"><rect height="18" rx="2" ry="2" width="18" x="3" y="4"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><line x1="10" x2="14" y1="16" y2="16"/></svg> },
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
          <div className="relative flex-1 min-w-45 max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#536173]" fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>
            <input className="border border-[#dbe4ef] rounded-md pl-8 pr-3 py-2 text-[13px] w-full outline-none focus:border-blue-500 font-[inherit]" placeholder="Search employees..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit] text-[#536173] bg-white cursor-pointer" value={dept} onChange={(e) => setDept(e.target.value)}>
            {depts.map((d) => <option key={d}>{d}</option>)}
          </select>
          <select className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit] text-[#536173] bg-white cursor-pointer" value={status} onChange={(e) => setStatus(e.target.value)}>
            {['All Status', 'Active', 'Inactive'].map((s) => <option key={s}>{s}</option>)}
          </select>
          <ExportButtons title="Employees" filename="employees" rows={employees} columns={exportColumns} fetchRows={fetchAllForExport} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={TH}>Employee ID</th>
                <th className={TH}>Name</th>
                <th className={TH}>Department</th>
                <th className={TH}>Designation</th>
                <th className={TH}>Email</th>
                <th className={TH}>Phone</th>
                <th className={TH}>Status</th>
                <th className={TH}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-5 py-8 text-center text-[13px] text-[#536173]">Loading...</td></tr>
              ) : employees.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-[13px] text-[#536173]">
                  No employees found.{' '}
                  <button className="text-blue-600 underline bg-transparent border-0 cursor-pointer font-[inherit] text-[13px]" onClick={() => setModal('add')} type="button">Add one now</button>
                </td></tr>
              ) : employees.map((row, i) => (
                <tr key={row._id} className="hover:bg-gray-50">
                  <td className={`${TD} font-medium text-blue-600`}>{row.employeeId}</td>
                  <td className={TD}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-none" style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>{row.name[0]}</div>
                      <span className="font-medium text-[#111827]">{row.name}</span>
                    </div>
                  </td>
                  <td className={`${TD} text-[#536173]`}>{row.dept}</td>
                  <td className={`${TD} text-[#536173]`}>{row.designation}</td>
                  <td className={`${TD} text-[#536173]`}>{row.email}</td>
                  <td className={`${TD} text-[#536173]`}>{row.phone}</td>
                  <td className={TD}>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${row.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{row.status}</span>
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
          <span>Showing {employees.length ? (page - 1) * LIMIT + 1 : 0}–{Math.min(page * LIMIT, total)} of {total} entries</span>
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
