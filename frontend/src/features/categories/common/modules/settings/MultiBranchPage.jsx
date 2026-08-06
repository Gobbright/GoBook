import { useEffect, useState } from 'react';

import { apiClient } from '../../../../../services/apiClient.js';
import { formatCurrency } from '../../../../../utils/formatCurrency.js';
import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';

const EMPTY = { name: '', code: '', manager: '', phone: '', email: '', city: '', status: 'Active', users: 0, revenue: 0 };
const TH = 'text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-5 py-3 border-b border-[#edf2f7]';
const TD = 'px-5 py-3.5 border-b border-[#f3f4f6] text-[13px]';
const PAGE_SIZE = 10;

export function MultiBranchPage() {
  const [branches, setBranches] = useState([]);
  const [stats, setStats]       = useState({ total: 0, active: 0, inactive: 0, totalUsers: 0, totalRevenue: 0 });
  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm]         = useState(EMPTY);

  function load() {
    return apiClient('/settings/branches')
      .then((data) => { setBranches(data.branches ?? []); setStats(data.stats ?? {}); })
      .catch(() => {});
  }

  useEffect(() => { load(); }, []);

  const filtered = branches.filter((b) =>
    !search ||
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.code.toLowerCase().includes(search.toLowerCase()) ||
    (b.manager || '').toLowerCase().includes(search.toLowerCase()),
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible    = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function updateForm(k, v) { setForm((f) => ({ ...f, [k]: v })); }
  function resetForm() { setForm(EMPTY); setEditingId(null); setShowForm(false); }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = { ...form, users: Number(form.users), revenue: Number(form.revenue) };
    if (editingId) await apiClient(`/settings/branches/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
    else await apiClient('/settings/branches', { method: 'POST', body: JSON.stringify(payload) });
    await load();
    resetForm();
  }

  function handleEdit(b) {
    setForm({ name: b.name, code: b.code, manager: b.manager, phone: b.phone, email: b.email, city: b.city, status: b.status, users: b.users, revenue: b.revenue });
    setEditingId(b._id);
    setShowForm(true);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this branch?')) return;
    await apiClient(`/settings/branches/${id}`, { method: 'DELETE' });
    await load();
  }

  const statCards = [
    { label: 'Total Branches',    value: String(stats.total ?? 0),                  sub: 'Branches',          color: '#2563eb', bg: '#eff6ff' },
    { label: 'Active Branches',   value: String(stats.active ?? 0),                 sub: `${stats.total ? Math.round(((stats.active ?? 0) / stats.total) * 100) : 0}%`, color: '#16a34a', bg: '#f0fdf4' },
    { label: 'Inactive Branches', value: String(stats.inactive ?? 0),               sub: `${stats.total ? Math.round(((stats.inactive ?? 0) / stats.total) * 100) : 0}%`, color: '#ef4444', bg: '#fef2f2' },
    { label: 'Total Users',       value: String(stats.totalUsers ?? 0),             sub: 'Across All Branches', color: '#7c3aed', bg: '#f5f3ff' },
    { label: 'Total Revenue',     value: formatCurrency(stats.totalRevenue ?? 0),   sub: 'All Branches',       color: '#0891b2', bg: '#ecfeff' },
  ];

  return (
    <div className="p-4 md:p-7">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-1">
        <div>
          <nav className="flex items-center gap-1 text-[13px] text-[#536173] mb-1">
            <a className="text-blue-600 no-underline hover:underline" href="/dashboard">Home</a>
            <span>›</span><span>Settings</span><span>›</span><span>Multi Branch</span>
          </nav>
          <h1 className="m-0 text-[22px] font-bold">Multi Branch</h1>
          <p className="m-0 text-[13px] text-[#536173] mt-0.5">Manage and monitor all branches of your business</p>
        </div>
        <button className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit]" type="button" onClick={() => setShowForm(true)}>
          <svg fill="none" height="14" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="14"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
          Add Branch
        </button>
      </div>

      {showForm && (
        <form className="app-form-modal bg-white border border-[#dfe7f1] rounded-xl p-5 mt-5" onSubmit={handleSubmit}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="m-0 text-[15px] font-semibold">{editingId ? 'Edit Branch' : 'New Branch'}</h3>
            <button className="text-[#536173] hover:text-[#111827] bg-transparent border-0 cursor-pointer text-xl font-[inherit]" type="button" onClick={resetForm}>×</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" placeholder="Branch name *" required value={form.name} onChange={(e) => updateForm('name', e.target.value)} />
            <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" placeholder="Branch code *" required value={form.code} onChange={(e) => updateForm('code', e.target.value)} />
            <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" placeholder="Manager name" value={form.manager} onChange={(e) => updateForm('manager', e.target.value)} />
            <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" placeholder="Phone" value={form.phone} onChange={(e) => updateForm('phone', e.target.value)} />
            <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" placeholder="Email" type="email" value={form.email} onChange={(e) => updateForm('email', e.target.value)} />
            <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" placeholder="City" value={form.city} onChange={(e) => updateForm('city', e.target.value)} />
            <SelectDropdown buttonClassName="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] bg-white font-[inherit] outline-none" value={form.status} onChange={(v) => updateForm('status', v)} options={['Active', 'Inactive']} />
            <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" min="0" placeholder="Users count" type="number" value={form.users} onChange={(e) => updateForm('users', e.target.value)} />
            <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" min="0" placeholder="Revenue (₹)" type="number" value={form.revenue} onChange={(e) => updateForm('revenue', e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <button className="px-4 py-2 text-[13px] font-medium text-gray-700 bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit]" type="button" onClick={resetForm}>Cancel</button>
            <button className="px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit]" type="submit">{editingId ? 'Update Branch' : 'Save Branch'}</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 my-5">
        {statCards.map((s) => (
          <div key={s.label} className="bg-white border border-[#dfe7f1] rounded-xl p-4 flex items-center gap-3">
            <div className="min-w-0">
              <div className="text-xs text-[#536173] mb-0.5">{s.label}</div>
              <div className="text-[15px] font-bold leading-tight truncate" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs mt-0.5 text-[#536173]">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-[#dfe7f1] rounded-xl">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[#edf2f7]">
          <div className="relative flex-1 max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#536173]" fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>
            <input className="border border-[#dbe4ef] rounded-md pl-8 pr-3 py-2 text-[13px] w-full outline-none focus:border-blue-500 font-[inherit]" placeholder="Search branches..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={TH}>Branch Name</th>
                <th className={TH}>Branch Code</th>
                <th className={TH}>Manager</th>
                <th className={TH}>Phone</th>
                <th className={TH}>Email</th>
                <th className={TH}>City</th>
                <th className={TH}>Status</th>
                <th className={TH}>Users</th>
                <th className={`${TH} text-right`}>Revenue</th>
                <th className={TH}>Action</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr><td colSpan="10" className="text-center py-8 text-[#536173] text-[13px]">No branches found. Click "Add Branch" to get started.</td></tr>
              )}
              {visible.map((row) => (
                <tr key={row._id} className="hover:bg-gray-50">
                  <td className={`${TD} font-medium text-[#111827]`}>{row.name}</td>
                  <td className={`${TD} text-[#536173] font-mono text-[12px]`}>{row.code}</td>
                  <td className={`${TD} text-[#536173]`}>{row.manager || '—'}</td>
                  <td className={`${TD} text-[#536173]`}>{row.phone || '—'}</td>
                  <td className={`${TD} text-[#536173]`}>{row.email || '—'}</td>
                  <td className={`${TD} text-[#536173]`}>{row.city || '—'}</td>
                  <td className={TD}>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${row.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{row.status}</span>
                  </td>
                  <td className={`${TD} text-[#536173]`}>{row.users}</td>
                  <td className={`${TD} text-right font-medium`}>{row.revenue === 0 ? '₹ 0' : formatCurrency(row.revenue)}</td>
                  <td className={TD}>
                    <div className="flex items-center gap-1">
                      <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-yellow-50 text-yellow-500 bg-transparent border-0 cursor-pointer" type="button" title="Edit" onClick={() => handleEdit(row)}>
                        <svg fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-50 text-red-400 bg-transparent border-0 cursor-pointer" type="button" title="Delete" onClick={() => handleDelete(row._id)}>
                        <svg fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-[#edf2f7] flex flex-wrap gap-2 justify-between items-center text-[13px] text-[#536173]">
          <span>Showing {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} branches</span>
          <div className="flex items-center gap-1 flex-wrap">
            <button className="px-2.5 py-1 rounded border border-[#dbe4ef] hover:bg-gray-50 text-[12px] bg-white font-[inherit] cursor-pointer disabled:opacity-40" type="button" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>←</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button key={p} className={`px-2.5 py-1 rounded text-[12px] font-[inherit] cursor-pointer border ${p === page ? 'bg-blue-600 text-white border-blue-600' : 'border-[#dbe4ef] hover:bg-gray-50 bg-white'}`} type="button" onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="px-2.5 py-1 rounded border border-[#dbe4ef] hover:bg-gray-50 text-[12px] bg-white font-[inherit] cursor-pointer disabled:opacity-40" type="button" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>→</button>
          </div>
        </div>
      </div>
    </div>
  );
}
