import { useEffect, useRef, useState } from 'react';

import {
  createLead,
  deleteLead,
  getLeads,
  importLeads,
  updateLead,
} from '../../../../../services/crmService.js';
import { DateRangeFilter } from '../../../../../components/forms/DateRangeFilter.jsx';
import { ExportButtons } from '../../../../../components/forms/ExportButtons.jsx';
import { isWithinDateRange } from '../../../../../utils/dateRange.js';

const STATUS_STYLES = {
  'New':         'bg-blue-100 text-blue-700',
  'Contacted':   'bg-purple-100 text-purple-700',
  'In Progress': 'bg-yellow-100 text-yellow-700',
  'Qualified':   'bg-green-100 text-green-700',
  'Converted':   'bg-green-100 text-green-700',
};

const SOURCES  = ['Website', 'Referral', 'Advertisement', 'Social Media', 'Cold Call'];
const STATUSES = ['New', 'Contacted', 'In Progress', 'Qualified', 'Converted'];

const EMPTY_LEAD = { name: '', company: '', email: '', phone: '', source: 'Website', status: 'New', owner: '' };

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

export function LeadsPage() {
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [leads, setLeads] = useState([]);
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_LEAD);
  const [formError, setFormError] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  function loadLeads() {
    return getLeads()
      .then((data) => setLeads(data.leads ?? []))
      .catch(() => setLeads([]));
  }

  useEffect(() => {
    let isMounted = true;
    getLeads()
      .then((data) => { if (isMounted) setLeads(data.leads ?? []); })
      .catch(() => { if (isMounted) setLeads([]); });
    return () => { isMounted = false; };
  }, []);

  const filtered = leads.filter((l) => {
    const matchesSearch = !search ||
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.company.toLowerCase().includes(search.toLowerCase()) ||
      l.email.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && isWithinDateRange(l.createdAt || l.updatedAt, dateFrom, dateTo);
  });

  useEffect(() => { setPage(1); }, [search, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalLeads = leads.length;
  const newLeads   = leads.filter((l) => l.status === 'New').length;
  const inProgress = leads.filter((l) => l.status === 'In Progress').length;
  const converted  = leads.filter((l) => l.status === 'Qualified' || l.status === 'Converted').length;
  const exportColumns = [
    { label: 'Lead Name', value: (row) => row.name },
    { label: 'Company', value: (row) => row.company },
    { label: 'Email', value: (row) => row.email },
    { label: 'Phone', value: (row) => row.phone },
    { label: 'Source', value: (row) => row.source },
    { label: 'Status', value: (row) => row.status },
    { label: 'Owner', value: (row) => row.owner },
  ];

  function updateForm(field, value) { setForm((f) => ({ ...f, [field]: value })); }
  function resetForm() { setForm(EMPTY_LEAD); setEditingId(null); setShowForm(false); setFormError(''); }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    try {
      if (editingId) await updateLead(editingId, form);
      else await createLead(form);
      await loadLeads();
      resetForm();
    } catch (err) {
      setFormError(err.message);
    }
  }
  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setImporting(true);
    try {
      const result = await importLeads(formData);
      await loadLeads();
      setImportResult(result);
    } catch (err) {
      setImportResult({ error: err.message || 'Import failed' });
    } finally {
      setImporting(false);
    }
  }

  function handleEdit(row) {
    setForm({ name: row.name, company: row.company, email: row.email, phone: row.phone, source: row.source, status: row.status, owner: row.owner });
    setEditingId(row._id);
    setShowForm(true);
  }

  async function handleDelete(id) {
    await deleteLead(id);
    await loadLeads();
  }

  return (
    <div className="p-4 md:p-7">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-1">
        <div>
          <nav className="flex items-center gap-1 text-[13px] text-[#536173] mb-1">
            <a className="text-blue-600 no-underline hover:underline" href="//dashboard">Home</a>
            <span>›</span><span>CRM</span><span>›</span><span>Leads</span>
          </nav>
          <h1 className="m-0 text-[22px] font-bold">Leads</h1>
          <p className="m-0 text-[13px] text-[#536173] mt-0.5">Track and manage your potential leads</p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleImportFile} />
          <button type="button" disabled={importing} onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-[#374151] bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit] disabled:opacity-60">
            <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
            {importing ? 'Importing...' : 'Import Excel'}
          </button>
          <button className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit]" type="button" onClick={() => setShowForm(true)}>
            <svg fill="none" height="14" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="14"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
            Add Lead
          </button>
        </div>
      </div>

      {showForm && (
        <form className="bg-white border border-[#dfe7f1] rounded-xl p-5 mt-5" onSubmit={handleSubmit}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="m-0 text-[15px] font-semibold">{editingId ? 'Edit Lead' : 'New Lead'}</h3>
            <button className="text-[#536173] hover:text-[#111827] bg-transparent border-0 cursor-pointer text-xl font-[inherit]" type="button" onClick={resetForm}>×</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" placeholder="Lead name" required value={form.name} onChange={(e) => updateForm('name', e.target.value)} />
            <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" placeholder="Company" value={form.company} onChange={(e) => updateForm('company', e.target.value)} />
            <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" placeholder="Email" type="email" value={form.email} onChange={(e) => updateForm('email', e.target.value)} />
            <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" placeholder="Phone" value={form.phone} onChange={(e) => updateForm('phone', e.target.value)} />
            <select className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] bg-white font-[inherit] outline-none" value={form.source} onChange={(e) => updateForm('source', e.target.value)}>
              {SOURCES.map((s) => <option key={s}>{s}</option>)}
            </select>
            <select className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] bg-white font-[inherit] outline-none" value={form.status} onChange={(e) => updateForm('status', e.target.value)}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
            <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" placeholder="Owner" value={form.owner} onChange={(e) => updateForm('owner', e.target.value)} />
          </div>
          {formError && <p className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">{formError}</p>}
          <div className="flex justify-end gap-2">
            <button className="px-4 py-2 text-[13px] font-medium text-gray-700 bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit]" type="button" onClick={resetForm}>Cancel</button>
            <button className="px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit]" type="submit">{editingId ? 'Update Lead' : 'Save Lead'}</button>
          </div>
        </form>
      )}

      {importResult && (
        <div className={`mt-4 mb-0 px-4 py-3 rounded-lg text-[13px] border ${importResult.error ? 'bg-red-50 border-red-100 text-red-700' : 'bg-green-50 border-green-100 text-green-700'}`}>
          {importResult.error ? importResult.error : `Import complete: ${importResult.imported ?? 0} added, ${importResult.updated ?? 0} updated${(importResult.skipped ?? 0) > 0 ? `, ${importResult.skipped} skipped` : ''}.`}
          {importResult.errors?.length > 0 && <ul className="mt-1 list-disc pl-5 text-[12px]">{importResult.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}{importResult.errors.length > 5 && <li>...and {importResult.errors.length - 5} more</li>}</ul>}
          <button type="button" onClick={() => setImportResult(null)} className="mt-1 text-[12px] underline bg-transparent border-0 cursor-pointer p-0 text-inherit font-[inherit]">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-5">
        {[
          { label: 'Total Leads',  value: totalLeads.toString(), color: '#2563eb', bg: '#eff6ff', icon: 0 },
          { label: 'New Leads',    value: newLeads.toString(),   color: '#16a34a', bg: '#f0fdf4', icon: 1 },
          { label: 'In Progress',  value: inProgress.toString(), color: '#d97706', bg: '#fffbeb', icon: 2 },
          { label: 'Converted',    value: converted.toString(),  color: '#7c3aed', bg: '#f5f3ff', icon: 3 },
        ].map((s, i) => {
          const icons = [
            <svg key="0" fill="none" height="20" stroke={s.color} strokeWidth="2" viewBox="0 0 24 24" width="20"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
            <svg key="1" fill="none" height="20" stroke={s.color} strokeWidth="2" viewBox="0 0 24 24" width="20"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>,
            <svg key="2" fill="none" height="20" stroke={s.color} strokeWidth="2" viewBox="0 0 24 24" width="20"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
            <svg key="3" fill="none" height="20" stroke={s.color} strokeWidth="2" viewBox="0 0 24 24" width="20"><polyline points="20 6 9 17 4 12"/></svg>,
          ];
          return (
            <div key={s.label} className="bg-white border border-[#dfe7f1] rounded-xl p-4 flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-none" style={{ background: s.bg }}>
                {icons[i]}
              </div>
              <div>
                <div className="text-xs text-[#536173] mb-0.5">{s.label}</div>
                <div className="text-[17px] font-bold leading-tight" style={{ color: s.color }}>{s.value}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white border border-[#dfe7f1] rounded-xl">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[#edf2f7] flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#536173]" fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13">
              <circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/>
            </svg>
            <input className="border border-[#dbe4ef] rounded-md pl-8 pr-3 py-2 text-[13px] w-full outline-none focus:border-blue-500 font-[inherit]" placeholder="Search leads..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <DateRangeFilter
            from={dateFrom}
            to={dateTo}
            onFromChange={setDateFrom}
            onToChange={setDateTo}
            onClear={() => { setDateFrom(''); setDateTo(''); }}
          />
          <ExportButtons title="Leads" filename="leads" rows={filtered} columns={exportColumns} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={TH}>Lead Name</th>
                <th className={TH}>Company</th>
                <th className={TH}>Email</th>
                <th className={TH}>Phone</th>
                <th className={TH}>Source</th>
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
                        {row.name[0]}
                      </div>
                      <span className="font-medium text-[#111827]">{row.name}</span>
                    </div>
                  </td>
                  <td className={`${TD} text-[#536173]`}>{row.company}</td>
                  <td className={`${TD} text-[#536173]`}>{row.email}</td>
                  <td className={`${TD} text-[#536173]`}>{row.phone}</td>
                  <td className={`${TD} text-[#536173]`}>{row.source}</td>
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
