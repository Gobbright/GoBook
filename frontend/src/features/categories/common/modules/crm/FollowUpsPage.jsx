import { useEffect, useState } from 'react';

import {
  createFollowUp,
  deleteFollowUp,
  getFollowUps,
  updateFollowUp,
} from '../../../../../services/crmService.js';
import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';
import { DateRangeFilter } from '../../../../../components/forms/DateRangeFilter.jsx';
import { ExportButtons } from '../../../../../components/forms/ExportButtons.jsx';
import { isWithinDateRange } from '../../../../../utils/dateRange.js';

const TABS = ['All', 'Overdue'];

const STATUS_STYLES = {
  Pending: 'bg-yellow-100 text-yellow-700',
  Done:    'bg-green-100 text-green-700',
  Overdue: 'bg-red-100 text-red-600',
};

const EMPTY_FOLLOW_UP = { person: '', regarding: '', date: '', time: '', status: 'Pending', owner: '' };

const TH = 'text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-5 py-3 border-b border-[#edf2f7]';
const TD = 'px-5 py-3.5 border-b border-[#f3f4f6] text-[13px]';
const AVATAR_COLORS = ['#2563eb', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#e11d48', '#65a30d'];

const PAGE_SIZE = 5;

function pageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total];
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '...', current - 1, current, current + 1, '...', total];
}

export function FollowUpsPage() {
  const [tab, setTab] = useState('All');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [followUps, setFollowUps] = useState([]);
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FOLLOW_UP);

  function loadFollowUps() {
    return getFollowUps()
      .then((data) => setFollowUps(data.followUps ?? []))
      .catch(() => setFollowUps([]));
  }

  useEffect(() => {
    let isMounted = true;
    getFollowUps()
      .then((data) => { if (isMounted) setFollowUps(data.followUps ?? []); })
      .catch(() => { if (isMounted) setFollowUps([]); });
    return () => { isMounted = false; };
  }, []);

  const filtered = followUps.filter((f) => {
    if (tab === 'Overdue' && f.status !== 'Overdue') return false;
    if (search && !f.person.toLowerCase().includes(search.toLowerCase()) &&
        !f.regarding.toLowerCase().includes(search.toLowerCase())) return false;
    if (!isWithinDateRange(f.date || f.createdAt, dateFrom, dateTo)) return false;
    return true;
  });

  useEffect(() => { setPage(1); }, [tab, search, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const exportColumns = [
    { label: 'Person', value: (row) => row.person },
    { label: 'Regarding', value: (row) => row.regarding },
    { label: 'Date', value: (row) => row.date },
    { label: 'Time', value: (row) => row.time },
    { label: 'Status', value: (row) => row.status },
    { label: 'Owner', value: (row) => row.owner },
  ];

  function updateForm(field, value) { setForm((f) => ({ ...f, [field]: value })); }
  function resetForm() { setForm(EMPTY_FOLLOW_UP); setEditingId(null); setShowForm(false); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (editingId) await updateFollowUp(editingId, form);
    else await createFollowUp(form);
    await loadFollowUps();
    resetForm();
  }

  function handleEdit(row) {
    setForm({ person: row.person, regarding: row.regarding, date: row.date, time: row.time, status: row.status, owner: row.owner });
    setEditingId(row._id);
    setShowForm(true);
  }

  async function handleDelete(id) {
    await deleteFollowUp(id);
    await loadFollowUps();
  }

  return (
    <div className="p-4 md:p-7">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-1">
        <div>
          <nav className="flex items-center gap-1 text-[13px] text-[#536173] mb-1">
            <a className="text-blue-600 no-underline hover:underline" href="/dashboard">Home</a>
            <span>›</span><span>CRM</span><span>›</span><span>Follow Ups</span>
          </nav>
          <h1 className="m-0 text-[22px] font-bold">Follow Ups</h1>
          <p className="m-0 text-[13px] text-[#536173] mt-0.5">Manage your follow ups and never miss any opportunity</p>
        </div>
        <button className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit]" type="button" onClick={() => setShowForm(true)}>
          <svg fill="none" height="14" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="14"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
          Add Follow Up
        </button>
      </div>

      {showForm && (
        <form className="bg-white border border-[#dfe7f1] rounded-xl p-5 mt-5" onSubmit={handleSubmit}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="m-0 text-[15px] font-semibold">{editingId ? 'Edit Follow Up' : 'New Follow Up'}</h3>
            <button className="text-[#536173] hover:text-[#111827] bg-transparent border-0 cursor-pointer text-xl font-[inherit]" type="button" onClick={resetForm}>×</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" placeholder="Lead / Customer name" required value={form.person} onChange={(e) => updateForm('person', e.target.value)} />
            <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" placeholder="Regarding" value={form.regarding} onChange={(e) => updateForm('regarding', e.target.value)} />
            <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" placeholder="Owner" value={form.owner} onChange={(e) => updateForm('owner', e.target.value)} />
            <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" type="date" value={form.date} onChange={(e) => updateForm('date', e.target.value)} />
            <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" type="time" value={form.time} onChange={(e) => updateForm('time', e.target.value)} />
            <SelectDropdown value={form.status} onChange={(v) => updateForm('status', v)} options={['Pending', 'Done', 'Overdue']} />
          </div>
          <div className="flex justify-end gap-2">
            <button className="px-4 py-2 text-[13px] font-medium text-gray-700 bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit]" type="button" onClick={resetForm}>Cancel</button>
            <button className="px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit]" type="submit">{editingId ? 'Update Follow Up' : 'Save Follow Up'}</button>
          </div>
        </form>
      )}

      <div className="bg-white border border-[#dfe7f1] rounded-xl mt-5">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[#edf2f7] flex-wrap">
          <div className="flex gap-1">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-3.5 py-1.5 rounded-md text-[13px] font-medium cursor-pointer border-0 font-[inherit] ${tab === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-[#536173] hover:bg-gray-200'}`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#536173]" fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13">
              <circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/>
            </svg>
            <input className="border border-[#dbe4ef] rounded-md pl-8 pr-3 py-2 text-[13px] w-full sm:w-48 outline-none focus:border-blue-500 font-[inherit]" placeholder="Search follow ups..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <DateRangeFilter
            from={dateFrom}
            to={dateTo}
            onFromChange={setDateFrom}
            onToChange={setDateTo}
            onClear={() => { setDateFrom(''); setDateTo(''); }}
          />
          <ExportButtons title="Follow Ups" filename="follow-ups" rows={filtered} columns={exportColumns} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={TH}>Lead / Customer</th>
                <th className={TH}>Regarding</th>
                <th className={TH}>Follow Up Date</th>
                <th className={TH}>Time</th>
                <th className={TH}>Status</th>
                <th className={TH}>Owner</th>
                <th className={TH}>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((row, i) => (
                <tr key={row._id ?? i} className="hover:bg-gray-50">
                  <td className={TD}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-none" style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>
                        {row.person[0]}
                      </div>
                      <span className="font-medium text-[#111827]">{row.person}</span>
                    </div>
                  </td>
                  <td className={`${TD} text-[#536173]`}>{row.regarding}</td>
                  <td className={`${TD} text-[#536173]`}>{row.date}</td>
                  <td className={`${TD} text-[#536173]`}>{row.time}</td>
                  <td className={TD}>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_STYLES[row.status] ?? 'bg-gray-100 text-gray-700'}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className={`${TD} text-[#536173]`}>{row.owner}</td>
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
        <div className="px-5 py-3 border-t border-[#edf2f7] flex items-center justify-between text-[13px] text-[#536173]">
          <span>Showing {paginated.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 text-[12px] border border-[#dbe4ef] rounded hover:bg-gray-50 disabled:opacity-40 bg-white font-[inherit] cursor-pointer">←</button>
            {pageNumbers(page, totalPages).map((p, i) => p === '...' ? (
              <span key={`ellipsis-${i}`} className="px-2 py-1 text-[12px] text-[#536173]">…</span>
            ) : (
              <button key={p} onClick={() => setPage(p)} className={`px-2 py-1 text-[12px] border rounded font-[inherit] cursor-pointer ${p === page ? 'bg-blue-600 text-white border-blue-600' : 'border-[#dbe4ef] hover:bg-gray-50 bg-white'}`}>{p}</button>
            ))}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2 py-1 text-[12px] border border-[#dbe4ef] rounded hover:bg-gray-50 disabled:opacity-40 bg-white font-[inherit] cursor-pointer">→</button>
          </div>
        </div>
      </div>
    </div>
  );
}
