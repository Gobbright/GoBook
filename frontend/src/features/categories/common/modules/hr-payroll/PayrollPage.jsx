import { useState, useEffect, useCallback, useRef } from 'react';
import { IndianRupee } from 'lucide-react';
import { ExportButtons } from '../../../../../components/forms/ExportButtons.jsx';
import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';
import { api } from '../../../../../services/api.js';
import { formatCurrency } from '../../../../../utils/formatCurrency.js';

const AVATAR_COLORS = ['#2563eb', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#e11d48', '#65a30d'];
const TH = 'text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-5 py-3 border-b border-[#edf2f7]';
const TD = 'px-5 py-3.5 border-b border-[#f3f4f6] text-[13px]';
const IL = 'block text-[12px] font-medium text-[#374151] mb-1';
const IC = 'w-full border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit] bg-white';

const EMPTY_PAYROLL = { employeeId: '', name: '', dept: '', month: '', basic: '', allowances: '', deductions: '', status: 'Pending' };

function PayrollModal({ initial, onClose, onSaved }) {
  const isEdit = !!initial?._id;
  const [form, setForm] = useState(initial ? { ...EMPTY_PAYROLL, ...initial } : { ...EMPTY_PAYROLL });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const net = (Number(form.basic) || 0) + (Number(form.allowances) || 0) - (Number(form.deductions) || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.employeeId.trim() || !form.name.trim() || !form.month.trim()) { setError('Employee ID, Name and Month are required'); return; }
    setSaving(true); setError('');
    try {
      if (isEdit) await api.hrUpdatePayroll(initial._id, form);
      else        await api.hrCreatePayroll(form);
      onSaved();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#edf2f7]">
          <h2 className="text-[16px] font-bold">{isEdit ? 'Edit Payroll Record' : 'Add Payroll Record'}</h2>
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
              <label className={IL}>Month *</label>
              <input className={IC} placeholder="e.g. June 2026" value={form.month} onChange={(e) => set('month', e.target.value)} />
            </div>
            <div>
              <label className={IL}>Basic Salary (₹)</label>
              <input className={IC} type="number" min="0" placeholder="0" value={form.basic} onChange={(e) => set('basic', e.target.value)} />
            </div>
            <div>
              <label className={IL}>Allowances (₹)</label>
              <input className={IC} type="number" min="0" placeholder="0" value={form.allowances} onChange={(e) => set('allowances', e.target.value)} />
            </div>
            <div>
              <label className={IL}>Deductions (₹)</label>
              <input className={IC} type="number" min="0" placeholder="0" value={form.deductions} onChange={(e) => set('deductions', e.target.value)} />
            </div>
            <div>
              <label className={IL}>Status</label>
              <SelectDropdown buttonClassName={IC} value={form.status} onChange={(v) => set('status', v)} options={['Pending', 'Paid']} />
            </div>
            <div className="sm:col-span-2 bg-blue-50 rounded-lg px-4 py-3 flex justify-between items-center">
              <span className="text-[13px] font-medium text-[#374151]">Net Salary</span>
              <span className="text-[15px] font-bold text-blue-600">{formatCurrency(net)}</span>
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

export function PayrollPage() {
  const [month, setMonth]     = useState('');
  const [dept, setDept]       = useState('All Departments');
  const [page, setPage]       = useState(1);
  const [records, setRecords] = useState([]);
  const [total, setTotal]     = useState(0);
  const [stats, setStats]     = useState({ totalEmployees: 0, grossSalary: 0, totalDeductions: 0, totalNet: 0 });
  const [months, setMonths]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const LIMIT = 5;
  const depts = ['All Departments'];

  const fetchAllForExport = useCallback(async () => {
    const params = { page: 1, limit: 9999 };
    if (month) params.month = month;
    if (dept !== 'All Departments') params.dept = dept;
    const res = await api.hrListPayroll(params);
    return res.data ?? [];
  }, [month, dept]);

  const fetchMonths = useCallback(async () => {
    try { const d = await api.hrPayrollMonths(); setMonths(d); if (d.length > 0) setMonth(d[0]); } catch (_) {}
  }, []);

  const fetchStats = useCallback(async () => {
    try { setStats(await api.hrPayrollStats(month ? { month } : {})); } catch (_) {}
  }, [month]);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (month) params.month = month;
      if (dept !== 'All Departments') params.dept = dept;
      const res = await api.hrListPayroll(params);
      setRecords(res.data ?? []); setTotal(res.total ?? 0);
    } catch (_) { setRecords([]); }
    finally { setLoading(false); }
  }, [month, dept, page]);

  useEffect(() => { fetchMonths(); }, [fetchMonths]);
  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { setPage(1); }, [month, dept]);
  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const handleStatusToggle = async (row) => {
    const newStatus = row.status === 'Paid' ? 'Pending' : 'Paid';
    try { await api.hrPatchPayrollStatus(row._id, newStatus); fetchRecords(); fetchStats(); }
    catch (err) { alert(err.message); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this payroll record?')) return;
    try { await api.hrDeletePayroll(id); fetchRecords(); fetchStats(); fetchMonths(); }
    catch (err) { alert(err.message); }
  };

  const handleSaved = () => { setModal(null); fetchRecords(); fetchStats(); fetchMonths(); };

  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setImporting(true);
    try {
      const result = await api.hrImportPayroll(formData);
      setMonth('');
      await fetchMonths();
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
    { label: 'Month', value: (row) => row.month },
    { label: 'Basic', value: (row) => formatCurrency(row.basic) },
    { label: 'Allowances', value: (row) => formatCurrency(row.allowances) },
    { label: 'Deductions', value: (row) => formatCurrency(row.deductions) },
    { label: 'Net Salary', value: (row) => formatCurrency(row.net) },
    { label: 'Status', value: (row) => row.status },
  ];

  return (
    <div className="p-4 md:p-7">
      {modal !== null && <PayrollModal initial={modal === 'add' ? null : modal} onClose={() => setModal(null)} onSaved={handleSaved} />}

      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-1">
        <div>
          <nav className="flex items-center gap-1 text-[13px] text-[#536173] mb-1">
            <a className="text-blue-600 no-underline hover:underline" href="/dashboard">Home</a>
            <span>›</span><span>HR &amp; Payroll</span><span>›</span><span>Payroll</span>
          </nav>
          <h1 className="m-0 text-[22px] font-bold">Payroll</h1>
          <p className="m-0 text-[13px] text-[#536173] mt-0.5">Process and manage employee payroll</p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleImportFile} />
          <button type="button" disabled={importing} onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-[#374151] bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit] disabled:opacity-60">
            <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
            {importing ? 'Importing...' : 'Import Excel'}
          </button>
          <button onClick={() => setModal('add')} className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit]" type="button">
            <svg fill="none" height="14" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="14"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
            Add Payroll
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
          { label: 'Total Employees', value: stats.totalEmployees,              sub: month || 'All', color: '#2563eb', bg: '#eff6ff', icon: <svg fill="none" height="20" stroke="#2563eb" strokeWidth="2" viewBox="0 0 24 24" width="20"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg> },
          { label: 'Total Payroll',   value: formatCurrency(stats.totalNet),    sub: month || 'All', color: '#0891b2', bg: '#ecfeff', icon: <svg fill="none" height="20" stroke="#0891b2" strokeWidth="2" viewBox="0 0 24 24" width="20"><rect height="14" rx="2" width="22" x="1" y="4"/><line x1="1" x2="23" y1="10" y2="10"/></svg> },
          { label: 'Gross Salary',    value: formatCurrency(stats.grossSalary), sub: month || 'All', color: '#16a34a', bg: '#f0fdf4', icon: <IndianRupee size={20} color="#16a34a" /> },
          { label: 'Deductions',      value: formatCurrency(stats.totalDeductions), sub: month || 'All', color: '#dc2626', bg: '#fef2f2', icon: <svg fill="none" height="20" stroke="#dc2626" strokeWidth="2" viewBox="0 0 24 24" width="20"><circle cx="12" cy="12" r="10"/><line x1="8" x2="16" y1="12" y2="12"/></svg> },
          { label: 'Net Pay',         value: formatCurrency(stats.totalNet),    sub: month || 'All', color: '#7c3aed', bg: '#f5f3ff', icon: <svg fill="none" height="20" stroke="#7c3aed" strokeWidth="2" viewBox="0 0 24 24" width="20"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg> },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-[#dfe7f1] rounded-xl p-4 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-none" style={{ background: s.bg }}>{s.icon}</div>
            <div>
              <div className="text-xs text-[#536173] mb-0.5">{s.label}</div>
              <div className="text-[15px] font-bold leading-tight" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs mt-0.5 text-[#536173]">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-[#dfe7f1] rounded-xl">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[#edf2f7] flex-wrap">
          <SelectDropdown buttonClassName="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit] text-[#111827] bg-white cursor-pointer" value={month} onChange={setMonth} options={months.length === 0 ? [{ value: '', label: 'All Months' }] : months} />
          <SelectDropdown buttonClassName="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit] text-[#536173] bg-white cursor-pointer" value={dept} onChange={setDept} options={depts} />
          <ExportButtons title="Payroll" filename="payroll" rows={records} columns={exportColumns} fetchRows={fetchAllForExport} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={TH}>Employee ID</th>
                <th className={TH}>Name</th>
                <th className={TH}>Department</th>
                <th className={`${TH} text-right`}>Basic</th>
                <th className={`${TH} text-right`}>Allowances</th>
                <th className={`${TH} text-right`}>Deductions</th>
                <th className={`${TH} text-right`}>Net Salary</th>
                <th className={TH}>Status</th>
                <th className={TH}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-5 py-8 text-center text-[13px] text-[#536173]">Loading...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={9} className="px-5 py-10 text-center text-[13px] text-[#536173]">
                  No payroll records found.{' '}
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
                  <td className={`${TD} text-right font-medium`}>{formatCurrency(row.basic)}</td>
                  <td className={`${TD} text-right text-green-700`}>{formatCurrency(row.allowances)}</td>
                  <td className={`${TD} text-right text-red-500`}>{formatCurrency(row.deductions)}</td>
                  <td className={`${TD} text-right font-semibold text-[#111827]`}>{formatCurrency(row.net)}</td>
                  <td className={TD}>
                    <button onClick={() => handleStatusToggle(row)} className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold cursor-pointer border-0 ${row.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {row.status}
                    </button>
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

