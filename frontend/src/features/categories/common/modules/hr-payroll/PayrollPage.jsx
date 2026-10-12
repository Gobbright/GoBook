import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCheck, FileText, IndianRupee, RefreshCw, ShieldCheck, Wallet } from 'lucide-react';
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
const LIMIT = 8;

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function moneyNumber(value) {
  return Number(value) || 0;
}

function grossSalary(row) {
  return moneyNumber(row.basic) + moneyNumber(row.allowances);
}

function netSalary(row) {
  return moneyNumber(row.net) || (grossSalary(row) - moneyNumber(row.deductions));
}

function PayrollModal({ initial, onClose, onSaved }) {
  const isEdit = !!initial?._id;
  const [form, setForm] = useState(initial ? { ...EMPTY_PAYROLL, ...initial } : { ...EMPTY_PAYROLL, month: currentMonth() });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const net = moneyNumber(form.basic) + moneyNumber(form.allowances) - moneyNumber(form.deductions);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.employeeId.trim() || !form.name.trim() || !form.month.trim()) {
      setError('Employee ID, Name and Month are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (isEdit) await api.hrUpdatePayroll(initial._id, form);
      else await api.hrCreatePayroll(form);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 sm:p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="mt-auto max-h-[88vh] w-full overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:mt-0 sm:max-w-2xl sm:rounded-xl">
        <div className="flex items-start justify-between border-b border-[#edf2f7] px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-[18px] font-bold sm:text-[16px]">{isEdit ? 'Edit Payroll Record' : 'Add Payroll Record'}</h2>
            <p className="mt-1 text-[13px] text-[#64748b]">Salary details will be used for monthly net pay and payslip preview.</p>
          </div>
          <button className="flex h-8 w-8 items-center justify-center rounded border-0 bg-transparent text-2xl text-[#536173] cursor-pointer hover:bg-gray-100" onClick={onClose} type="button">x</button>
        </div>
        <form onSubmit={handleSubmit} className="flex max-h-[calc(88vh-1px)] flex-col">
          <div className="grid grid-cols-1 gap-4 overflow-y-auto px-5 py-5 sm:grid-cols-2 sm:px-6">
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
              <input className={IC} placeholder="e.g. Sales" value={form.dept} onChange={(e) => set('dept', e.target.value)} />
            </div>
            <div>
              <label className={IL}>Payroll Month *</label>
              <input className={IC} type="month" value={form.month} onChange={(e) => set('month', e.target.value)} />
            </div>
            <div>
              <label className={IL}>Basic Salary</label>
              <input className={IC} type="number" min="0" placeholder="0" value={form.basic} onChange={(e) => set('basic', e.target.value)} />
            </div>
            <div>
              <label className={IL}>Allowances</label>
              <input className={IC} type="number" min="0" placeholder="0" value={form.allowances} onChange={(e) => set('allowances', e.target.value)} />
            </div>
            <div>
              <label className={IL}>Deductions</label>
              <input className={IC} type="number" min="0" placeholder="0" value={form.deductions} onChange={(e) => set('deductions', e.target.value)} />
            </div>
            <div>
              <label className={IL}>Status</label>
              <SelectDropdown buttonClassName={IC} value={form.status} onChange={(value) => set('status', value)} options={['Pending', 'Paid']} />
            </div>
            <div className="grid grid-cols-3 gap-3 rounded-lg bg-[#f8fbff] p-3 sm:col-span-2">
              <div><span className="block text-[11px] text-[#64748b]">Gross</span><strong className="text-[13px]">{formatCurrency(moneyNumber(form.basic) + moneyNumber(form.allowances))}</strong></div>
              <div><span className="block text-[11px] text-[#64748b]">Deductions</span><strong className="text-[13px] text-red-600">{formatCurrency(form.deductions)}</strong></div>
              <div><span className="block text-[11px] text-[#64748b]">Net Pay</span><strong className="text-[13px] text-blue-700">{formatCurrency(net)}</strong></div>
            </div>
          </div>
          {error && <p className="px-5 pb-2 text-[12px] text-red-600 sm:px-6">{error}</p>}
          <div className="flex justify-end gap-2 border-t border-[#edf2f7] bg-white px-5 py-4 sm:px-6">
            <button type="button" onClick={onClose} className="rounded-md border border-[#dbe4ef] bg-white px-4 py-2 text-[13px] font-medium text-[#374151] cursor-pointer hover:bg-gray-50 font-[inherit]">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-md border-0 bg-blue-600 px-4 py-2 text-[13px] font-medium text-white cursor-pointer hover:bg-blue-700 font-[inherit] disabled:opacity-60">
              {saving ? 'Saving...' : isEdit ? 'Update Record' : 'Add Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PayslipModal({ row, onClose }) {
  if (!row) return null;
  const gross = grossSalary(row);
  const net = netSalary(row);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-[#edf2f7] px-6 py-4">
          <div>
            <h2 className="text-[18px] font-bold">Payslip Preview</h2>
            <p className="mt-1 text-[13px] text-[#64748b]">{row.month} - {row.employeeId}</p>
          </div>
          <button className="rounded border-0 bg-transparent px-2 text-2xl text-[#64748b] cursor-pointer" type="button" onClick={onClose}>x</button>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div className="rounded-lg bg-blue-50 p-4">
            <p className="m-0 text-[12px] uppercase tracking-wide text-blue-700">Employee</p>
            <h3 className="m-0 mt-1 text-[18px] font-bold">{row.name}</h3>
            <p className="m-0 mt-1 text-[13px] text-[#64748b]">{row.dept || 'No department'} - {row.status}</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <section className="rounded-lg border border-[#dfe7f1] p-4">
              <h4 className="m-0 mb-3 text-[13px] font-bold text-[#0f172a]">Earnings</h4>
              <p className="flex justify-between text-[13px]"><span>Basic Salary</span><strong>{formatCurrency(row.basic)}</strong></p>
              <p className="flex justify-between text-[13px]"><span>Allowances</span><strong>{formatCurrency(row.allowances)}</strong></p>
              <p className="flex justify-between border-t border-[#edf2f7] pt-2 text-[13px]"><span>Gross Salary</span><strong>{formatCurrency(gross)}</strong></p>
            </section>
            <section className="rounded-lg border border-[#dfe7f1] p-4">
              <h4 className="m-0 mb-3 text-[13px] font-bold text-[#0f172a]">Deductions</h4>
              <p className="flex justify-between text-[13px]"><span>Total Deductions</span><strong className="text-red-600">{formatCurrency(row.deductions)}</strong></p>
              <p className="mt-10 flex justify-between border-t border-[#edf2f7] pt-2 text-[13px]"><span>Net Salary</span><strong className="text-blue-700">{formatCurrency(net)}</strong></p>
            </section>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-[#edf2f7] px-6 py-4">
          <button className="rounded-md border border-[#dbe4ef] bg-white px-4 py-2 text-[13px] font-medium cursor-pointer" type="button" onClick={onClose}>Close</button>
          <button className="rounded-md border-0 bg-blue-600 px-4 py-2 text-[13px] font-medium text-white cursor-pointer" type="button" onClick={() => window.print()}>Print</button>
        </div>
      </div>
    </div>
  );
}

export function PayrollPage() {
  const [month, setMonth] = useState('');
  const [dept, setDept] = useState('All Departments');
  const [page, setPage] = useState(1);
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ totalEmployees: 0, grossSalary: 0, totalDeductions: 0, totalNet: 0 });
  const [months, setMonths] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const [actionBusy, setActionBusy] = useState('');
  const fileInputRef = useRef(null);

  const depts = useMemo(() => ['All Departments', ...departments], [departments]);
  const activeMonth = month || currentMonth();
  const paidCount = records.filter((row) => row.status === 'Paid').length;
  const pendingCount = records.filter((row) => row.status !== 'Paid').length;
  const missingSalaryCount = records.filter((row) => moneyNumber(row.basic) <= 0).length;
  const negativeNetCount = records.filter((row) => netSalary(row) < 0).length;
  const progress = records.length ? Math.round((paidCount / records.length) * 100) : 0;

  const checklist = [
    { label: 'Payroll records prepared', ok: total > 0, detail: `${total} record(s)` },
    { label: 'Salary values reviewed', ok: total > 0 && missingSalaryCount === 0, detail: missingSalaryCount ? `${missingSalaryCount} missing basic salary` : 'No missing salary' },
    { label: 'Net pay validated', ok: total > 0 && negativeNetCount === 0, detail: negativeNetCount ? `${negativeNetCount} negative net pay` : 'Ready' },
    { label: 'Payments completed', ok: total > 0 && pendingCount === 0, detail: pendingCount ? `${pendingCount} pending` : 'All paid' },
  ];

  const fetchAllForExport = useCallback(async () => {
    const params = { page: 1, limit: 9999 };
    if (month) params.month = month;
    if (dept !== 'All Departments') params.dept = dept;
    const res = await api.hrListPayroll(params);
    return res.data ?? [];
  }, [month, dept]);

  const fetchMonths = useCallback(async () => {
    try {
      const data = await api.hrPayrollMonths();
      const list = Array.isArray(data) && data.length ? data : [currentMonth()];
      setMonths(list);
      setMonth((value) => value || list[0]);
    } catch (_) {
      setMonths([currentMonth()]);
      setMonth((value) => value || currentMonth());
    }
  }, []);

  const fetchDepartments = useCallback(async () => {
    try {
      const data = await api.hrDepartments();
      setDepartments(Array.isArray(data) ? data.filter(Boolean) : []);
    } catch (_) {
      setDepartments([]);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      setStats(await api.hrPayrollStats(month ? { month } : {}));
    } catch (_) {
      setStats({ totalEmployees: 0, grossSalary: 0, totalDeductions: 0, totalNet: 0 });
    }
  }, [month]);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (month) params.month = month;
      if (dept !== 'All Departments') params.dept = dept;
      const res = await api.hrListPayroll(params);
      setRecords(res.data ?? []);
      setTotal(res.total ?? 0);
    } catch (_) {
      setRecords([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [month, dept, page]);

  useEffect(() => { fetchMonths(); fetchDepartments(); }, [fetchMonths, fetchDepartments]);
  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { setPage(1); }, [month, dept]);
  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const refreshPayroll = useCallback(async () => {
    await Promise.all([fetchRecords(), fetchStats(), fetchMonths(), fetchDepartments()]);
  }, [fetchRecords, fetchStats, fetchMonths, fetchDepartments]);

  const handleStatusToggle = async (row) => {
    const newStatus = row.status === 'Paid' ? 'Pending' : 'Paid';
    try {
      await api.hrPatchPayrollStatus(row._id, newStatus);
      refreshPayroll();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this payroll record?')) return;
    try {
      await api.hrDeletePayroll(id);
      refreshPayroll();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSaved = () => {
    setModal(null);
    refreshPayroll();
  };

  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setImporting(true);
    try {
      const result = await api.hrImportPayroll(formData);
      setImportResult(result);
      refreshPayroll();
    } catch (err) {
      setImportResult({ error: err.message || 'Import failed' });
    } finally {
      setImporting(false);
    }
  }

  async function handleGenerateRun() {
    setActionBusy('generate');
    try {
      const [employeesRes, payrollRes] = await Promise.all([
        api.hrListEmployees({ page: 1, limit: 9999, status: 'Active' }),
        api.hrListPayroll({ page: 1, limit: 9999, month: activeMonth }),
      ]);
      const employees = employeesRes.data ?? [];
      const existingIds = new Set((payrollRes.data ?? []).map((row) => row.employeeId));
      const toCreate = employees.filter((employee) => !existingIds.has(employee.employeeId));

      let imported = 0;
      for (const employee of toCreate) {
        await api.hrCreatePayroll({
          employeeId: employee.employeeId,
          name: employee.name,
          dept: employee.dept || '',
          month: activeMonth,
          basic: moneyNumber(employee.basicSalary),
          allowances: 0,
          deductions: 0,
          status: 'Pending',
        });
        imported += 1;
      }
      setMonth(activeMonth);
      setImportResult({ imported, updated: 0, skipped: employees.length - imported });
      refreshPayroll();
    } catch (err) {
      setImportResult({ error: err.message || 'Unable to generate payroll run' });
    } finally {
      setActionBusy('');
    }
  }

  async function handleMarkFilteredPaid() {
    const pendingRows = records.filter((row) => row.status !== 'Paid');
    if (!pendingRows.length) return;
    if (!window.confirm(`Mark ${pendingRows.length} visible payroll record(s) as paid?`)) return;
    setActionBusy('paid');
    try {
      await Promise.all(pendingRows.map((row) => api.hrPatchPayrollStatus(row._id, 'Paid')));
      refreshPayroll();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionBusy('');
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
      <PayslipModal row={selectedPayslip} onClose={() => setSelectedPayslip(null)} />

      <div className="mb-1 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <nav className="mb-1 flex items-center gap-1 text-[13px] text-[#536173]">
            <a className="text-blue-600 no-underline hover:underline" href="/dashboard">Home</a>
            <span>›</span><span>HR &amp; Payroll</span><span>›</span><span>Payroll</span>
          </nav>
          <h1 className="m-0 text-[22px] font-bold">Payroll</h1>
          <p className="m-0 mt-0.5 text-[13px] text-[#536173]">Prepare, review, pay, and preview employee salaries</p>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:overflow-visible sm:pb-0">
          <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleImportFile} />
          <button type="button" disabled={actionBusy === 'generate'} onClick={handleGenerateRun} className="inline-flex flex-none items-center gap-1.5 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-[13px] font-medium text-blue-700 cursor-pointer hover:bg-blue-100 font-[inherit] disabled:opacity-60">
            <RefreshCw size={14} className={actionBusy === 'generate' ? 'animate-spin' : ''} />
            Generate Run
          </button>
          <button type="button" disabled={!records.length || actionBusy === 'paid'} onClick={handleMarkFilteredPaid} className="inline-flex flex-none items-center gap-1.5 rounded-md border border-green-100 bg-green-50 px-3 py-2 text-[13px] font-medium text-green-700 cursor-pointer hover:bg-green-100 font-[inherit] disabled:opacity-60">
            <CheckCircle2 size={14} />
            Mark Paid
          </button>
          <button type="button" disabled={importing} onClick={() => fileInputRef.current?.click()} className="inline-flex flex-none items-center gap-1.5 rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-[13px] font-medium text-[#374151] cursor-pointer hover:bg-gray-50 font-[inherit] disabled:opacity-60">
            <FileText size={14} />
            {importing ? 'Importing...' : 'Import Excel'}
          </button>
          <button onClick={() => setModal('add')} className="inline-flex flex-none items-center gap-1.5 rounded-md border-0 bg-blue-600 px-4 py-2 text-[13px] font-medium text-white cursor-pointer hover:bg-blue-700 font-[inherit]" type="button">
            + Add Payroll
          </button>
        </div>
      </div>

      {importResult && (
        <div className={`mt-4 mb-0 rounded-lg border px-4 py-3 text-[13px] ${importResult.error ? 'border-red-100 bg-red-50 text-red-700' : 'border-green-100 bg-green-50 text-green-700'}`}>
          {importResult.error ? importResult.error : `Payroll update complete: ${importResult.imported ?? 0} added, ${importResult.updated ?? 0} updated${(importResult.skipped ?? 0) > 0 ? `, ${importResult.skipped} skipped` : ''}.`}
          {importResult.errors?.length > 0 && <ul className="mt-1 list-disc pl-5 text-[12px]">{importResult.errors.slice(0, 5).map((err, i) => <li key={i}>{err}</li>)}{importResult.errors.length > 5 && <li>...and {importResult.errors.length - 5} more</li>}</ul>}
          <button type="button" onClick={() => setImportResult(null)} className="mt-1 p-0 text-[12px] underline bg-transparent border-0 cursor-pointer text-inherit font-[inherit]">Dismiss</button>
        </div>
      )}

      <div className="my-5 grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
        <section className="rounded-xl border border-[#dfe7f1] bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="m-0 text-[16px] font-bold">Payroll Run</h2>
              <p className="m-0 mt-1 text-[13px] text-[#64748b]">{activeMonth} - {dept}</p>
            </div>
            <div className="w-fit rounded-full bg-blue-50 px-3 py-1 text-[12px] font-semibold text-blue-700">{progress}% paid</div>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {[
              ['Prepare', total > 0],
              ['Review', total > 0 && missingSalaryCount === 0 && negativeNetCount === 0],
              ['Approve', total > 0],
              ['Pay', total > 0 && pendingCount === 0],
            ].map(([label, done], index) => (
              <div key={label} className={`rounded-lg border p-3 ${done ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-[#e5edf6] bg-[#f8fafc] text-[#64748b]'}`}>
                <div className="mb-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-[12px] font-bold">{index + 1}</div>
                <div className="text-[12px] font-semibold">{label}</div>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-xl border border-[#dfe7f1] bg-white p-4">
          <h2 className="m-0 text-[16px] font-bold">Review Checklist</h2>
          <div className="mt-3 space-y-2">
            {checklist.map((item) => (
              <div key={item.label} className="flex items-center gap-3 rounded-lg border border-[#edf2f7] px-3 py-2">
                {item.ok ? <CheckCircle2 size={18} className="text-green-600" /> : <AlertTriangle size={18} className="text-amber-500" />}
                <div className="min-w-0">
                  <p className="m-0 text-[13px] font-semibold text-[#0f172a]">{item.label}</p>
                  <p className="m-0 text-[12px] text-[#64748b]">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="my-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        {[
          { label: 'Employees', value: stats.totalEmployees, sub: month || 'Current', color: '#2563eb', bg: '#eff6ff', icon: <ClipboardCheck size={20} color="#2563eb" /> },
          { label: 'Pending', value: pendingCount, sub: 'Visible page', color: '#d97706', bg: '#fffbeb', icon: <AlertTriangle size={20} color="#d97706" /> },
          { label: 'Gross', value: formatCurrency(stats.grossSalary), sub: month || 'All', color: '#16a34a', bg: '#f0fdf4', icon: <IndianRupee size={20} color="#16a34a" /> },
          { label: 'Deductions', value: formatCurrency(stats.totalDeductions), sub: month || 'All', color: '#dc2626', bg: '#fef2f2', icon: <ShieldCheck size={20} color="#dc2626" /> },
          { label: 'Net Pay', value: formatCurrency(stats.totalNet), sub: month || 'All', color: '#7c3aed', bg: '#f5f3ff', icon: <Wallet size={20} color="#7c3aed" /> },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-3 rounded-xl border border-[#dfe7f1] bg-white p-3 sm:p-4">
            <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl sm:h-11 sm:w-11" style={{ background: item.bg }}>{item.icon}</div>
            <div className="min-w-0">
              <div className="mb-0.5 truncate text-[11px] text-[#536173] sm:text-xs">{item.label}</div>
              <div className="truncate text-[14px] font-bold leading-tight sm:text-[15px]" style={{ color: item.color }}>{item.value}</div>
              <div className="mt-0.5 truncate text-[11px] text-[#536173] sm:text-xs">{item.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-[#dfe7f1] bg-white">
        <div className="flex flex-wrap items-center gap-3 border-b border-[#edf2f7] px-4 py-3.5 sm:px-5">
          <SelectDropdown className="w-[150px] flex-none" value={month} onChange={setMonth} options={months} />
          <SelectDropdown className="w-[170px] flex-none" value={dept} onChange={setDept} options={depts} />
          <ExportButtons title="Payroll" filename="payroll" rows={records} columns={exportColumns} fetchRows={fetchAllForExport} />
        </div>

        <div className="md:hidden">
          {loading ? (
            <div className="px-5 py-8 text-center text-[13px] text-[#536173]">Loading...</div>
          ) : records.length === 0 ? (
            <div className="px-5 py-10 text-center text-[13px] text-[#536173]">No payroll records found. <button className="text-[13px] text-blue-600 underline bg-transparent border-0 cursor-pointer font-[inherit]" onClick={() => setModal('add')} type="button">Add one now</button></div>
          ) : (
            <div className="divide-y divide-[#edf2f7]">
              {records.map((row, i) => (
                <article key={row._id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-[12px] font-bold text-white" style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>{row.name?.[0] || 'P'}</div>
                      <div className="min-w-0">
                        <h3 className="m-0 truncate text-[14px] font-bold text-[#0f172a]">{row.name}</h3>
                        <p className="m-0 mt-0.5 text-[12px] text-[#64748b]">{row.employeeId} - {row.dept || 'No department'}</p>
                      </div>
                    </div>
                    <button onClick={() => handleStatusToggle(row)} className={`flex-none rounded-full border-0 px-2.5 py-1 text-[11px] font-semibold cursor-pointer ${row.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`} type="button">{row.status}</button>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-[#f8fafc] p-3">
                    <div><span className="block text-[11px] text-[#64748b]">Gross</span><strong className="text-[12px]">{formatCurrency(grossSalary(row))}</strong></div>
                    <div><span className="block text-[11px] text-[#64748b]">Deduct</span><strong className="text-[12px] text-red-600">{formatCurrency(row.deductions)}</strong></div>
                    <div><span className="block text-[11px] text-[#64748b]">Net</span><strong className="text-[12px] text-blue-700">{formatCurrency(netSalary(row))}</strong></div>
                  </div>
                  <div className="mt-3 flex justify-end gap-2">
                    <button className="rounded-md border border-[#dbe4ef] bg-white px-3 py-1.5 text-[12px] font-medium cursor-pointer" type="button" onClick={() => setSelectedPayslip(row)}>Payslip</button>
                    <button className="rounded-md border border-[#dbe4ef] bg-white px-3 py-1.5 text-[12px] font-medium cursor-pointer" type="button" onClick={() => setModal(row)}>Edit</button>
                    <button className="rounded-md border border-red-100 bg-red-50 px-3 py-1.5 text-[12px] font-medium text-red-600 cursor-pointer" type="button" onClick={() => handleDelete(row._id)}>Delete</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full border-collapse">
            <thead><tr><th className={TH}>Employee ID</th><th className={TH}>Name</th><th className={TH}>Department</th><th className={`${TH} text-right`}>Basic</th><th className={`${TH} text-right`}>Allowances</th><th className={`${TH} text-right`}>Deductions</th><th className={`${TH} text-right`}>Net Salary</th><th className={TH}>Status</th><th className={TH}>Action</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-5 py-8 text-center text-[13px] text-[#536173]">Loading...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={9} className="px-5 py-10 text-center text-[13px] text-[#536173]">No payroll records found. <button className="text-[13px] text-blue-600 underline bg-transparent border-0 cursor-pointer font-[inherit]" onClick={() => setModal('add')} type="button">Add one now</button></td></tr>
              ) : records.map((row, i) => (
                <tr key={row._id} className="hover:bg-gray-50">
                  <td className={`${TD} font-medium text-blue-600`}>{row.employeeId}</td>
                  <td className={TD}><div className="flex items-center gap-2.5"><div className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>{row.name?.[0] || 'P'}</div><span className="font-medium text-[#111827]">{row.name}</span></div></td>
                  <td className={`${TD} text-[#536173]`}>{row.dept}</td>
                  <td className={`${TD} text-right font-medium`}>{formatCurrency(row.basic)}</td>
                  <td className={`${TD} text-right text-green-700`}>{formatCurrency(row.allowances)}</td>
                  <td className={`${TD} text-right text-red-500`}>{formatCurrency(row.deductions)}</td>
                  <td className={`${TD} text-right font-semibold text-[#111827]`}>{formatCurrency(netSalary(row))}</td>
                  <td className={TD}><button onClick={() => handleStatusToggle(row)} className={`inline-flex items-center rounded-full border-0 px-2 py-0.5 text-[11px] font-semibold cursor-pointer ${row.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`} type="button">{row.status}</button></td>
                  <td className={TD}>
                    <div className="flex items-center gap-1">
                      <button className="flex h-7 w-7 items-center justify-center rounded border-0 bg-transparent text-blue-500 cursor-pointer hover:bg-blue-50" title="Payslip" type="button" onClick={() => setSelectedPayslip(row)}><FileText size={13} /></button>
                      <button className="flex h-7 w-7 items-center justify-center rounded border-0 bg-transparent text-yellow-500 cursor-pointer hover:bg-yellow-50" title="Edit" type="button" onClick={() => setModal(row)}><svg fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg></button>
                      <button className="flex h-7 w-7 items-center justify-center rounded border-0 bg-transparent text-red-400 cursor-pointer hover:bg-red-50" title="Delete" type="button" onClick={() => handleDelete(row._id)}><svg fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 border-t border-[#edf2f7] px-4 py-3 text-[13px] text-[#536173] sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <span>Showing {records.length ? (page - 1) * LIMIT + 1 : 0}-{Math.min(page * LIMIT, total)} of {total} entries</span>
          <div className="flex items-center gap-1">
            <button className="rounded border border-[#dbe4ef] bg-white px-2.5 py-1 text-[12px] cursor-pointer hover:bg-gray-50 font-[inherit] disabled:opacity-50" disabled={page <= 1} onClick={() => setPage((prev) => prev - 1)} type="button">Prev</button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => <button key={p} className={`rounded px-2.5 py-1 text-[12px] cursor-pointer font-[inherit] ${p === page ? 'bg-blue-600 text-white border-0' : 'border border-[#dbe4ef] bg-white hover:bg-gray-50'}`} onClick={() => setPage(p)} type="button">{p}</button>)}
            <button className="rounded border border-[#dbe4ef] bg-white px-2.5 py-1 text-[12px] cursor-pointer hover:bg-gray-50 font-[inherit] disabled:opacity-50" disabled={page >= totalPages} onClick={() => setPage((prev) => prev + 1)} type="button">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
