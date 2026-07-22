import { useState, useEffect, useCallback } from 'react';
import { ExportButtons } from '../../../../../components/forms/ExportButtons.jsx';
import { api } from '../../../../../services/api.js';

const AVATAR_COLORS = ['#2563eb', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#e11d48', '#65a30d'];
const TH = 'text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-5 py-3 border-b border-[#edf2f7]';
const TD = 'px-5 py-3.5 border-b border-[#f3f4f6] text-[13px]';
const IL = 'block text-[12px] font-medium text-[#374151] mb-1';
const IC = 'w-full border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit] bg-white';

const STATUS_STYLES = {
  Approved: 'bg-green-100 text-green-700',
  Pending:  'bg-yellow-100 text-yellow-700',
  Rejected: 'bg-red-100 text-red-600',
};

const EMPTY_LEAVE = { name: '', empId: '', type: 'Casual Leave', from: '', to: '', days: '', status: 'Pending', applied: '', reason: '' };

function todayISO() { return new Date().toISOString().slice(0, 10); }

function LeaveModal({ initial, onClose, onSaved }) {
  const isEdit = !!initial?._id;
  const [form, setForm] = useState(initial ? { ...EMPTY_LEAVE, ...initial } : { ...EMPTY_LEAVE, applied: todayISO() });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.empId.trim() || !form.from || !form.to) { setError('Name, Employee ID, From and To dates are required'); return; }
    setSaving(true); setError('');
    try {
      if (isEdit) await api.hrUpdateLeave(initial._id, form);
      else        await api.hrCreateLeave(form);
      onSaved();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#edf2f7]">
          <h2 className="text-[16px] font-bold">{isEdit ? 'Edit Leave Request' : 'Apply Leave'}</h2>
          <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-[#536173] bg-transparent border-0 cursor-pointer text-lg" onClick={onClose} type="button">×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
            <div>
              <label className={IL}>Employee Name *</label>
              <input className={IC} placeholder="e.g. Rahul Sharma" value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>
            <div>
              <label className={IL}>Employee ID *</label>
              <input className={IC} placeholder="e.g. EMP-001" value={form.empId} onChange={(e) => set('empId', e.target.value)} />
            </div>
            <div>
              <label className={IL}>Leave Type</label>
              <select className={IC} value={form.type} onChange={(e) => set('type', e.target.value)}>
                {['Casual Leave', 'Sick Leave', 'Annual Leave'].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={IL}>Status</label>
              <select className={IC} value={form.status} onChange={(e) => set('status', e.target.value)}>
                {['Pending', 'Approved', 'Rejected'].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={IL}>From Date *</label>
              <input className={IC} type="date" value={form.from} onChange={(e) => set('from', e.target.value)} />
            </div>
            <div>
              <label className={IL}>To Date *</label>
              <input className={IC} type="date" value={form.to} onChange={(e) => set('to', e.target.value)} />
            </div>
            <div>
              <label className={IL}>Number of Days</label>
              <input className={IC} type="number" min="1" placeholder="e.g. 2" value={form.days} onChange={(e) => set('days', e.target.value)} />
            </div>
            <div>
              <label className={IL}>Applied On</label>
              <input className={IC} type="date" value={form.applied} onChange={(e) => set('applied', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className={IL}>Reason</label>
              <textarea className={`${IC} resize-none`} rows={3} placeholder="Reason for leave..." value={form.reason} onChange={(e) => set('reason', e.target.value)} />
            </div>
          </div>
          {error && <p className="px-6 pb-2 text-[12px] text-red-600">{error}</p>}
          <div className="px-6 py-4 border-t border-[#edf2f7] flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[13px] font-medium text-[#374151] bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit]">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit] disabled:opacity-60">
              {saving ? 'Saving...' : isEdit ? 'Update Leave' : 'Apply Leave'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function LeaveManagementPage() {
  const [status, setStatus]   = useState('All Status');
  const [page, setPage]       = useState(1);
  const [leaves, setLeaves]   = useState([]);
  const [total, setTotal]     = useState(0);
  const [stats, setStats]     = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null);

  const LIMIT = 5;

  const fetchAllForExport = useCallback(async () => {
    const params = { page: 1, limit: 9999 };
    if (status !== 'All Status') params.status = status;
    const res = await api.hrListLeaves(params);
    return res.data ?? [];
  }, [status]);

  const fetchStats = useCallback(async () => {
    try { setStats(await api.hrLeaveStats()); } catch (_) {}
  }, []);

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (status !== 'All Status') params.status = status;
      const res = await api.hrListLeaves(params);
      setLeaves(res.data ?? []); setTotal(res.total ?? 0);
    } catch (_) { setLeaves([]); }
    finally { setLoading(false); }
  }, [status, page]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { setPage(1); }, [status]);
  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  const handleStatusChange = async (id, newStatus) => {
    try { await api.hrPatchLeaveStatus(id, newStatus); fetchLeaves(); fetchStats(); }
    catch (err) { alert(err.message); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this leave request?')) return;
    try { await api.hrDeleteLeave(id); fetchLeaves(); fetchStats(); }
    catch (err) { alert(err.message); }
  };

  const handleSaved = () => { setModal(null); fetchLeaves(); fetchStats(); };

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const exportColumns = [
    { label: 'Leave ID', value: (row) => row.leaveId },
    { label: 'Employee Name', value: (row) => row.name },
    { label: 'Employee ID', value: (row) => row.empId },
    { label: 'Leave Type', value: (row) => row.type },
    { label: 'From', value: (row) => row.from },
    { label: 'To', value: (row) => row.to },
    { label: 'Days', value: (row) => row.days },
    { label: 'Status', value: (row) => row.status },
    { label: 'Applied On', value: (row) => row.applied },
  ];

  return (
    <div className="p-4 md:p-7">
      {modal !== null && <LeaveModal initial={modal === 'add' ? null : modal} onClose={() => setModal(null)} onSaved={handleSaved} />}

      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-1">
        <div>
          <nav className="flex items-center gap-1 text-[13px] text-[#536173] mb-1">
            <a className="text-blue-600 no-underline hover:underline" href="//dashboard">Home</a>
            <span>›</span><span>HR &amp; Payroll</span><span>›</span><span>Leave Management</span>
          </nav>
          <h1 className="m-0 text-[22px] font-bold">Leave Management</h1>
          <p className="m-0 text-[13px] text-[#536173] mt-0.5">Manage employee leave requests and balances</p>
        </div>
        <button onClick={() => setModal('add')} className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit]" type="button">
          <svg fill="none" height="14" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="14"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
          Apply Leave
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 my-5">
        {[
          { label: 'Total Leaves',      value: stats.total,    sub: 'All Time',  color: '#2563eb', bg: '#eff6ff', icon: <svg fill="none" height="20" stroke="#2563eb" strokeWidth="2" viewBox="0 0 24 24" width="20"><rect height="18" rx="2" ry="2" width="18" x="3" y="4"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg> },
          { label: 'Pending',           value: stats.pending,  sub: 'Requests',  color: '#d97706', bg: '#fffbeb', icon: <svg fill="none" height="20" stroke="#d97706" strokeWidth="2" viewBox="0 0 24 24" width="20"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
          { label: 'Approved',          value: stats.approved, sub: 'Requests',  color: '#16a34a', bg: '#f0fdf4', icon: <svg fill="none" height="20" stroke="#16a34a" strokeWidth="2" viewBox="0 0 24 24" width="20"><polyline points="20 6 9 17 4 12"/></svg> },
          { label: 'Rejected',          value: stats.rejected, sub: 'Requests',  color: '#dc2626', bg: '#fef2f2', icon: <svg fill="none" height="20" stroke="#dc2626" strokeWidth="2" viewBox="0 0 24 24" width="20"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg> },
          { label: 'Available Leaves',  value: '—',            sub: 'Balance',   color: '#0891b2', bg: '#ecfeff', icon: <svg fill="none" height="20" stroke="#0891b2" strokeWidth="2" viewBox="0 0 24 24" width="20"><rect height="18" rx="2" ry="2" width="18" x="3" y="4"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><polyline points="9 16 11 18 15 14"/></svg> },
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
          <select className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit] text-[#536173] bg-white cursor-pointer" value={status} onChange={(e) => setStatus(e.target.value)}>
            {['All Status', 'Pending', 'Approved', 'Rejected'].map((s) => <option key={s}>{s}</option>)}
          </select>
          <ExportButtons title="Leave Management" filename="leave-management" rows={leaves} columns={exportColumns} fetchRows={fetchAllForExport} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={TH}>Leave ID</th>
                <th className={TH}>Employee</th>
                <th className={TH}>Leave Type</th>
                <th className={TH}>From</th>
                <th className={TH}>To</th>
                <th className={TH}>Days</th>
                <th className={TH}>Status</th>
                <th className={TH}>Applied On</th>
                <th className={TH}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-5 py-8 text-center text-[13px] text-[#536173]">Loading...</td></tr>
              ) : leaves.length === 0 ? (
                <tr><td colSpan={9} className="px-5 py-10 text-center text-[13px] text-[#536173]">
                  No leave requests found.{' '}
                  <button className="text-blue-600 underline bg-transparent border-0 cursor-pointer font-[inherit] text-[13px]" onClick={() => setModal('add')} type="button">Apply one now</button>
                </td></tr>
              ) : leaves.map((row, i) => (
                <tr key={row._id} className="hover:bg-gray-50">
                  <td className={`${TD} font-medium text-blue-600`}>{row.leaveId}</td>
                  <td className={TD}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-none" style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>{row.name[0]}</div>
                      <div>
                        <div className="font-medium text-[#111827]">{row.name}</div>
                        <div className="text-[11px] text-[#536173]">{row.empId}</div>
                      </div>
                    </div>
                  </td>
                  <td className={`${TD} text-[#536173]`}>{row.type}</td>
                  <td className={`${TD} text-[#536173]`}>{row.from}</td>
                  <td className={`${TD} text-[#536173]`}>{row.to}</td>
                  <td className={`${TD} font-medium text-center`}>{row.days}</td>
                  <td className={TD}>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_STYLES[row.status] ?? 'bg-gray-100 text-gray-600'}`}>{row.status}</span>
                  </td>
                  <td className={`${TD} text-[#536173]`}>{row.applied}</td>
                  <td className={TD}>
                    <div className="flex items-center gap-1">
                      {row.status !== 'Approved' && (
                        <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-green-50 text-green-600 bg-transparent border-0 cursor-pointer" title="Approve" type="button" onClick={() => handleStatusChange(row._id, 'Approved')}>
                          <svg fill="none" height="13" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="13"><polyline points="20 6 9 17 4 12"/></svg>
                        </button>
                      )}
                      <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-yellow-50 text-yellow-500 bg-transparent border-0 cursor-pointer" title="Edit" type="button" onClick={() => setModal(row)}>
                        <svg fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      {row.status !== 'Rejected' && (
                        <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-50 text-red-400 bg-transparent border-0 cursor-pointer" title="Reject" type="button" onClick={() => handleStatusChange(row._id, 'Rejected')}>
                          <svg fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>
                        </button>
                      )}
                      <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-50 text-[#9ca3af] bg-transparent border-0 cursor-pointer" title="Delete" type="button" onClick={() => handleDelete(row._id)}>
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
          <span>Showing {leaves.length ? (page - 1) * LIMIT + 1 : 0}–{Math.min(page * LIMIT, total)} of {total} entries</span>
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
