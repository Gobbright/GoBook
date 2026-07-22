import { useEffect, useState } from 'react';

import { apiClient } from '../../../../../services/apiClient.js';
import { getCurrentUser } from '../../../../../services/authService.js';

const ROLES = ['Super Admin', 'Branch Manager', 'Accountant', 'Sales Executive', 'Inventory Manager'];

const ROLE_STYLES = {
  'Super Admin':       { bg: '#1e293b', text: '#f1f5f9' },
  'Branch Manager':    { bg: '#dbeafe', text: '#1d4ed8' },
  'Accountant':        { bg: '#d1fae5', text: '#065f46' },
  'Sales Executive':   { bg: '#fef3c7', text: '#92400e' },
  'Inventory Manager': { bg: '#fce7f3', text: '#9d174d' },
};

const ROLE_COLORS = ['#f472b6', '#3b82f6', '#f59e0b', '#22c55e', '#a78bfa'];
const AVATAR_COLORS = ['#2563eb', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#e11d48', '#65a30d'];
const TH = 'text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-5 py-3 border-b border-[#edf2f7]';
const TD = 'px-5 py-3.5 border-b border-[#f3f4f6] text-[13px]';
const PAGE_SIZE = 8;
const EMPTY = { name: '', email: '', password: '', role: 'Sales Executive', branch: '', phone: '', status: 'Active' };

function RolesDonut({ rolesOverview }) {
  const total = rolesOverview.reduce((s, r) => s + r.count, 0) || 1;
  let cum = 0;
  const stops = rolesOverview.map((r, i) => {
    const color = ROLE_COLORS[i % ROLE_COLORS.length];
    const from = (cum / total) * 100;
    cum += r.count;
    const to = (cum / total) * 100;
    return `${color} ${from.toFixed(1)}% ${to.toFixed(1)}%`;
  });

  return (
    <div className="flex flex-col items-center gap-4 pt-2">
      <div className="relative" style={{ width: 170, height: 170 }}>
        <div style={{ width: 170, height: 170, borderRadius: '50%', background: stops.length ? `conic-gradient(${stops.join(', ')})` : '#e5e7eb' }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 94, height: 94, borderRadius: '50%', background: 'white' }} />
      </div>
      <div className="w-full space-y-1.5 px-1">
        {rolesOverview.map((r, i) => (
          <div key={r.label} className="flex items-center justify-between text-[12px]">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full flex-none" style={{ background: ROLE_COLORS[i % ROLE_COLORS.length] }} />
              <span className="text-[#536173]">{r.label}</span>
            </div>
            <span className="font-semibold text-[#111827]">{r.count} ({r.pct})</span>
          </div>
        ))}
      </div>
      <div className="flex w-full justify-between pt-2 border-t border-[#edf2f7]">
        <div className="text-center">
          <div className="text-xs text-[#536173]">Total Roles</div>
          <div className="text-[18px] font-bold text-[#111827]">{rolesOverview.length}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-[#536173]">Total Users</div>
          <div className="text-[18px] font-bold text-[#111827]">{total}</div>
        </div>
      </div>
    </div>
  );
}

export function UsersRolesPage() {
  const currentUser = getCurrentUser();
  const [users, setUsers]           = useState([]);
  const [stats, setStats]           = useState({ total: 0, active: 0, inactive: 0 });
  const [rolesOverview, setRolesOverview] = useState([]);
  const [search, setSearch]         = useState('');
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [page, setPage]             = useState(1);
  const [showForm, setShowForm]     = useState(false);
  const [editingId, setEditingId]   = useState(null);
  const [form, setForm]             = useState(EMPTY);

  function load() {
    return apiClient('/settings/users')
      .then((data) => {
        setUsers(data.users ?? []);
        setStats(data.stats ?? {});
        setRolesOverview(data.rolesOverview ?? []);
      })
      .catch(() => {});
  }

  useEffect(() => { load(); }, []);

  const roleOptions = ['All Roles', ...ROLES];

  const filtered = users.filter((u) => {
    const matchSearch = !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.phone || '').includes(search);
    const matchRole = roleFilter === 'All Roles' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible    = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function updateForm(k, v) { setForm((f) => ({ ...f, [k]: v })); }
  function resetForm() { setForm(EMPTY); setEditingId(null); setShowForm(false); }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      name: form.name,
      email: form.email,
      role: form.role,
      branch: form.branch,
      phone: form.phone,
      status: form.status,
      ...(form.password ? { password: form.password } : {}),
    };
    if (editingId) await apiClient(`/settings/users/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
    else await apiClient('/settings/users', { method: 'POST', body: JSON.stringify(payload) });
    await load();
    resetForm();
  }

  function handleEdit(u) {
    setForm({ name: u.name, email: u.email, password: '', role: u.role, branch: u.branch, phone: u.phone, status: u.status });
    setEditingId(u._id);
    setShowForm(true);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this user?')) return;
    await apiClient(`/settings/users/${id}`, { method: 'DELETE' });
    await load();
  }

  const statCards = [
    { label: 'Total Users',    value: String(stats.total ?? 0),    sub: 'All Users',    color: '#2563eb', bg: '#eff6ff' },
    { label: 'Active Users',   value: String(stats.active ?? 0),   sub: `${stats.total ? Math.round(((stats.active ?? 0) / stats.total) * 100) : 0}%`, color: '#16a34a', bg: '#f0fdf4' },
    { label: 'Inactive Users', value: String(stats.inactive ?? 0), sub: `${stats.total ? Math.round(((stats.inactive ?? 0) / stats.total) * 100) : 0}%`, color: '#ef4444', bg: '#fef2f2' },
    { label: 'Total Roles',    value: String(ROLES.length),        sub: 'Defined Roles', color: '#7c3aed', bg: '#f5f3ff' },
    { label: 'Admins',         value: String(users.filter((u) => u.role === 'Super Admin').length), sub: 'Super Admins', color: '#0891b2', bg: '#ecfeff' },
  ];

  return (
    <div className="p-4 md:p-7">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-1">
        <div>
          <nav className="flex items-center gap-1 text-[13px] text-[#536173] mb-1">
            <a className="text-blue-600 no-underline hover:underline" href="//dashboard">Home</a>
            <span>›</span><span>Settings</span><span>›</span><span>Users &amp; Roles</span>
          </nav>
          <h1 className="m-0 text-[22px] font-bold">Users &amp; Roles</h1>
          <p className="m-0 text-[13px] text-[#536173] mt-0.5">Manage system users and their roles &amp; permissions</p>
        </div>
        <button className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit]" type="button" onClick={() => setShowForm(true)}>
          <svg fill="none" height="14" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="14"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
          Add User
        </button>
      </div>

      {showForm && (
        <form className="app-form-modal bg-white border border-[#dfe7f1] rounded-xl p-5 mt-5" onSubmit={handleSubmit}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="m-0 text-[15px] font-semibold">{editingId ? 'Edit User' : 'New User'}</h3>
            <button className="text-[#536173] hover:text-[#111827] bg-transparent border-0 cursor-pointer text-xl font-[inherit]" type="button" onClick={resetForm}>×</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" placeholder="Full name *" required value={form.name} onChange={(e) => updateForm('name', e.target.value)} />
            <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" placeholder="Email *" required type="email" value={form.email} onChange={(e) => updateForm('email', e.target.value)} />
            <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" placeholder="Phone" value={form.phone} onChange={(e) => updateForm('phone', e.target.value)} />
            <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" placeholder={editingId ? 'New password (optional)' : 'Password *'} required={!editingId} minLength={8} type="password" value={form.password} onChange={(e) => updateForm('password', e.target.value)} />
            <select className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] bg-white font-[inherit] outline-none" value={form.role} onChange={(e) => updateForm('role', e.target.value)}>
              {ROLES.map((r) => <option key={r}>{r}</option>)}
            </select>
            <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" placeholder="Branch" value={form.branch} onChange={(e) => updateForm('branch', e.target.value)} />
            <select className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] bg-white font-[inherit] outline-none" value={form.status} onChange={(e) => updateForm('status', e.target.value)}>
              <option>Active</option><option>Inactive</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button className="px-4 py-2 text-[13px] font-medium text-gray-700 bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit]" type="button" onClick={resetForm}>Cancel</button>
            <button className="px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit]" type="submit">{editingId ? 'Update User' : 'Save User'}</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 my-5">
        {statCards.map((s) => (
          <div key={s.label} className="bg-white border border-[#dfe7f1] rounded-xl p-4 flex items-center gap-3">
            <div className="min-w-0">
              <div className="text-xs text-[#536173] mb-0.5">{s.label}</div>
              <div className="text-[15px] font-bold leading-tight" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs mt-0.5 text-[#536173]">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        <div className="flex-1 min-w-0 bg-white border border-[#dfe7f1] rounded-xl">
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[#edf2f7] flex-wrap">
            <div className="relative flex-1 max-w-xs">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#536173]" fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>
              <input className="border border-[#dbe4ef] rounded-md pl-8 pr-3 py-2 text-[13px] w-full outline-none focus:border-blue-500 font-[inherit]" placeholder="Search users..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <select className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit] text-[#536173] bg-white cursor-pointer" value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}>
              {roleOptions.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={TH}>User Name</th>
                  <th className={TH}>Email</th>
                  <th className={TH}>Role</th>
                  <th className={TH}>Branch</th>
                  <th className={TH}>Phone</th>
                  <th className={TH}>Status</th>
                  <th className={TH}>Last Login</th>
                  <th className={TH}>Action</th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 && (
                  <tr><td colSpan="8" className="text-center py-8 text-[#536173] text-[13px]">No users found. Click "Add User" to get started.</td></tr>
                )}
                {visible.map((row, i) => {
                  const rs = ROLE_STYLES[row.role] || { bg: '#f1f5f9', text: '#475569' };
                  return (
                    <tr key={row._id} className="hover:bg-gray-50">
                      <td className={TD}>
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-none" style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>{row.name[0]}</div>
                          <span className="font-medium text-[#111827]">{row.name}</span>
                        </div>
                      </td>
                      <td className={`${TD} text-[#536173]`}>{row.email}</td>
                      <td className={TD}>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: rs.bg, color: rs.text }}>{row.role}</span>
                      </td>
                      <td className={`${TD} text-[#536173]`}>{row.branch || '—'}</td>
                      <td className={`${TD} text-[#536173]`}>{row.phone || '—'}</td>
                      <td className={TD}>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${row.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{row.status}</span>
                      </td>
                      <td className={`${TD} text-[#536173] text-[12px]`}>{row.lastLogin || '—'}</td>
                      <td className={TD}>
                        <div className="flex items-center gap-1">
                          <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-yellow-50 text-yellow-500 bg-transparent border-0 cursor-pointer" type="button" title="Edit" onClick={() => handleEdit(row)}>
                            <svg fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          {String(row._id) !== String(currentUser?.id) && (
                            <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-50 text-red-400 bg-transparent border-0 cursor-pointer" type="button" title="Delete" onClick={() => handleDelete(row._id)}>
                              <svg fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 border-t border-[#edf2f7] flex flex-wrap gap-2 justify-between items-center text-[13px] text-[#536173]">
            <span>Showing {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} users</span>
            <div className="flex items-center gap-1 flex-wrap">
              <button className="px-2.5 py-1 rounded border border-[#dbe4ef] hover:bg-gray-50 text-[12px] bg-white font-[inherit] cursor-pointer disabled:opacity-40" type="button" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>←</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} className={`px-2.5 py-1 rounded text-[12px] font-[inherit] cursor-pointer border ${p === page ? 'bg-blue-600 text-white border-blue-600' : 'border-[#dbe4ef] hover:bg-gray-50 bg-white'}`} type="button" onClick={() => setPage(p)}>{p}</button>
              ))}
              <button className="px-2.5 py-1 rounded border border-[#dbe4ef] hover:bg-gray-50 text-[12px] bg-white font-[inherit] cursor-pointer disabled:opacity-40" type="button" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>→</button>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-64 lg:flex-none bg-white border border-[#dfe7f1] rounded-xl p-5">
          <h3 className="m-0 text-[14px] font-semibold text-[#111827] mb-1">Roles Overview</h3>
          <RolesDonut rolesOverview={rolesOverview} />
        </div>
      </div>
    </div>
  );
}
