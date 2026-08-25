import { useEffect, useRef, useState } from 'react';

import { apiClient } from '../../../../../services/apiClient.js';
import { formatCurrency } from '../../../../../utils/formatCurrency.js';
import { DateRangeFilter } from '../../../../../components/forms/DateRangeFilter.jsx';
import { ExportButtons } from '../../../../../components/forms/ExportButtons.jsx';
import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';
import { isWithinDateRange } from '../../../../../utils/dateRange.js';

const EMPTY = {
  name: '', contact: '', phone: '', email: '', category: '', status: 'Active', gstin: '', address: '',
  bankName: '', accountHolderName: '', accountNumber: '', ifscCode: '', bankBranch: '',
};
const AVATAR_COLORS = ['#2563eb', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#e11d48', '#65a30d'];
const TH = 'text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-5 py-3 border-b border-[#edf2f7]';
const TD = 'px-5 py-3.5 border-b border-[#f3f4f6] text-[13px]';

const PAGE_SIZE = 5;

function pageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total];
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '...', current - 1, current, current + 1, '...', total];
}

function partyKeys(party = {}) {
  return [
    party.gstin,
    party.phone,
    party.name,
  ].map((value) => String(value || '').trim().toLowerCase()).filter(Boolean);
}

export function VendorManagementPage() {
  const [vendors, setVendors]       = useState([]);
  const [customers, setCustomers]   = useState([]);
  const [stats, setStats]           = useState({ total: 0, active: 0, inactive: 0 });
  const [categories, setCategories] = useState([]);
  const [search, setSearch]         = useState('');
  const [category, setCategory]     = useState('All Categories');
  const [status, setStatus]         = useState('All Status');
  const [partyType, setPartyType]   = useState('All Parties');
  const [dateFrom, setDateFrom]     = useState('');
  const [dateTo, setDateTo]         = useState('');
  const [page, setPage]             = useState(1);
  const [showForm, setShowForm]     = useState(false);
  const [editingId, setEditingId]   = useState(null);
  const [form, setForm]             = useState(EMPTY);
  const [formError, setFormError]   = useState('');
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting]   = useState(false);
  const fileInputRef = useRef(null);

  async function load() {
    try {
      const [vendorResult, customerResult] = await Promise.allSettled([
        apiClient('/more-modules/vendors'),
        apiClient('/crm/customers'),
      ]);
      const vendorData = vendorResult.status === 'fulfilled' ? vendorResult.value : {};
      const customerData = customerResult.status === 'fulfilled' ? customerResult.value : {};
      setVendors(vendorData.vendors ?? []);
      setStats(vendorData.stats ?? {});
      setCategories(vendorData.categories ?? []);
      setCustomers(customerData.customers ?? []);
    } catch {}
  }

  useEffect(() => { load(); }, []);

  const catOptions = ['All Categories', ...categories];
  const customerKeys = new Set(customers.flatMap(partyKeys));
  function isAlsoCustomer(vendor) {
    return partyKeys(vendor).some((key) => customerKeys.has(key));
  }

  const filtered   = vendors.filter((v) => {
    const matchSearch   = !search || v.name.toLowerCase().includes(search.toLowerCase()) || (v.contact || '').toLowerCase().includes(search.toLowerCase());
    const matchCategory = category === 'All Categories' || v.category === category;
    const matchStatus = status === 'All Status' || v.status === status;
    const alsoCustomer = isAlsoCustomer(v);
    const matchPartyType = partyType === 'All Parties'
      || (partyType === 'Vendor Only' && !alsoCustomer)
      || (partyType === 'Customer & Vendor' && alsoCustomer);
    return matchSearch && matchCategory && matchStatus && matchPartyType && isWithinDateRange(v.createdAt || v.updatedAt, dateFrom, dateTo);
  });

  useEffect(() => { setPage(1); }, [search, category, status, partyType, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function updateForm(k, v) { setForm((f) => ({ ...f, [k]: v })); }
  function resetForm() { setForm(EMPTY); setEditingId(null); setShowForm(false); setFormError(''); }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    try {
      if (editingId) await apiClient(`/more-modules/vendors/${editingId}`, { method: 'PUT', body: JSON.stringify(form) });
      else await apiClient('/more-modules/vendors', { method: 'POST', body: JSON.stringify(form) });
      await load();
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
      const result = await apiClient('/more-modules/vendors/import', { method: 'POST', body: formData });
      await load();
      setImportResult(result);
    } catch (err) {
      setImportResult({ error: err.message || 'Import failed' });
    } finally {
      setImporting(false);
    }
  }

  function handleEdit(v) {
    setForm({
      ...EMPTY,
      name: v.name,
      contact: v.contact,
      phone: v.phone,
      email: v.email,
      category: v.category,
      status: v.status,
      gstin: v.gstin,
      address: v.address,
      bankName: v.bankName || '',
      accountHolderName: v.accountHolderName || '',
      accountNumber: v.accountNumber || '',
      ifscCode: v.ifscCode || '',
      bankBranch: v.bankBranch || '',
    });
    setEditingId(v._id);
    setShowForm(true);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this vendor?')) return;
    await apiClient(`/more-modules/vendors/${id}`, { method: 'DELETE' });
    await load();
  }

  const statCards = [
    { label: 'Total Vendors',    value: String(stats.total ?? 0),    sub: 'All Vendors',  color: '#2563eb', bg: '#eff6ff' },
    { label: 'Active Vendors',   value: String(stats.active ?? 0),   sub: `${stats.total ? Math.round(((stats.active ?? 0) / stats.total) * 100) : 0}%`,   color: '#16a34a', bg: '#f0fdf4' },
    { label: 'Inactive Vendors', value: String(stats.inactive ?? 0), sub: `${stats.total ? Math.round(((stats.inactive ?? 0) / stats.total) * 100) : 0}%`, color: '#f97316', bg: '#fff7ed' },
    { label: 'Categories',       value: String(categories.length),   sub: 'Vendor Types', color: '#0891b2', bg: '#ecfeff' },
    { label: 'Filtered',         value: String(filtered.length),     sub: 'In view',      color: '#7c3aed', bg: '#f5f3ff' },
  ];
  const exportColumns = [
    { label: 'Vendor', value: (row) => row.name },
    { label: 'Contact Person', value: (row) => row.contact },
    { label: 'Phone', value: (row) => row.phone },
    { label: 'Email', value: (row) => row.email },
    { label: 'Category', value: (row) => row.category },
    { label: 'GSTIN', value: (row) => row.gstin },
    { label: 'Status', value: (row) => row.status },
    { label: 'Party Type', value: (row) => isAlsoCustomer(row) ? 'Customer & Vendor' : 'Vendor Only' },
    { label: 'Bank', value: (row) => row.bankName },
    { label: 'A/C No.', value: (row) => row.accountNumber },
    { label: 'IFSC', value: (row) => row.ifscCode },
  ];

  return (
    <div className="p-4 md:p-7">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-1">
        <div>
          <nav className="flex items-center gap-1 text-[13px] text-[#536173] mb-1">
            <a className="text-blue-600 no-underline hover:underline" href="/dashboard">Home</a>
            <span>›</span><span>More Modules</span><span>›</span><span>Vendor Management</span>
          </nav>
          <h1 className="m-0 text-[22px] font-bold">Vendor Management</h1>
          <p className="m-0 text-[13px] text-[#536173] mt-0.5">Manage vendors and their details</p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleImportFile} />
          <button type="button" disabled={importing} onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-[#374151] bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit] disabled:opacity-60">
            <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
            {importing ? 'Importing...' : 'Import Excel'}
          </button>
          <button className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit]" type="button" onClick={() => setShowForm(true)}>
            <svg fill="none" height="14" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="14"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
            Add Vendor
          </button>
        </div>
      </div>

      {showForm && (
        <form className="bg-white border border-[#dfe7f1] rounded-xl p-5 mt-5" onSubmit={handleSubmit}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="m-0 text-[15px] font-semibold">{editingId ? 'Edit Vendor' : 'New Vendor'}</h3>
            <button className="text-[#536173] hover:text-[#111827] bg-transparent border-0 cursor-pointer text-xl font-[inherit]" type="button" onClick={resetForm}>×</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" placeholder="Vendor name *" required value={form.name} onChange={(e) => updateForm('name', e.target.value)} />
            <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" placeholder="Contact person" value={form.contact} onChange={(e) => updateForm('contact', e.target.value)} />
            <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" placeholder="Phone" value={form.phone} onChange={(e) => updateForm('phone', e.target.value)} />
            <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" placeholder="Email" type="email" value={form.email} onChange={(e) => updateForm('email', e.target.value)} />
            <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" placeholder="Category (e.g. Raw Material)" value={form.category} onChange={(e) => updateForm('category', e.target.value)} />
            <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" placeholder="GSTIN" value={form.gstin} onChange={(e) => updateForm('gstin', e.target.value)} />
            <SelectDropdown buttonClassName="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] bg-white font-[inherit] outline-none" value={form.status} onChange={(v) => updateForm('status', v)} options={['Active', 'Inactive']} />
            <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit] sm:col-span-2" placeholder="Address" value={form.address} onChange={(e) => updateForm('address', e.target.value)} />
          </div>
          <div className="mb-4">
            <div className="text-[12px] font-semibold uppercase tracking-wide text-[#536173] mb-2">Bank Details</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" placeholder="Bank Name" value={form.bankName} onChange={(e) => updateForm('bankName', e.target.value)} />
              <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" placeholder="A/C Name" value={form.accountHolderName} onChange={(e) => updateForm('accountHolderName', e.target.value)} />
              <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" placeholder="A/C No." value={form.accountNumber} onChange={(e) => updateForm('accountNumber', e.target.value)} />
              <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" placeholder="IFSC" value={form.ifscCode} onChange={(e) => updateForm('ifscCode', e.target.value.toUpperCase())} />
              <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit] sm:col-span-2" placeholder="Bank Branch" value={form.bankBranch} onChange={(e) => updateForm('bankBranch', e.target.value)} />
            </div>
          </div>
          {formError && <p className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">{formError}</p>}
          <div className="flex justify-end gap-2">
            <button className="px-4 py-2 text-[13px] font-medium text-gray-700 bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit]" type="button" onClick={resetForm}>Cancel</button>
            <button className="px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit]" type="submit">{editingId ? 'Update Vendor' : 'Save Vendor'}</button>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 my-5">
        {statCards.map((s) => (
          <div key={s.label} className="bg-white border border-[#dfe7f1] rounded-xl p-4 flex items-center gap-4">
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
          <div className="relative flex-1 min-w-45 max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#536173]" fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>
            <input className="border border-[#dbe4ef] rounded-md pl-8 pr-3 py-2 text-[13px] w-full outline-none focus:border-blue-500 font-[inherit]" placeholder="Search vendor..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <SelectDropdown buttonClassName="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit] text-[#536173] bg-white cursor-pointer" value={category} onChange={setCategory} options={catOptions} />
          <SelectDropdown buttonClassName="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit] text-[#536173] bg-white cursor-pointer" value={status} onChange={setStatus} options={['All Status', 'Active', 'Inactive']} />
          <SelectDropdown buttonClassName="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit] text-[#536173] bg-white cursor-pointer" value={partyType} onChange={setPartyType} options={['All Parties', 'Vendor Only', 'Customer & Vendor']} />
          <DateRangeFilter
            from={dateFrom}
            to={dateTo}
            onFromChange={setDateFrom}
            onToChange={setDateTo}
            onClear={() => { setDateFrom(''); setDateTo(''); }}
          />
          <ExportButtons title="Vendors" filename="vendors" rows={filtered} columns={exportColumns} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={TH}>Vendor Name</th>
                <th className={TH}>Contact Person</th>
                <th className={TH}>Phone</th>
                <th className={TH}>Email</th>
                <th className={TH}>Category</th>
                <th className={TH}>Status</th>
                <th className={TH}>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 && (
                <tr><td colSpan="7" className="text-center py-8 text-[#536173] text-[13px]">No vendors found. Click "Add Vendor" to get started.</td></tr>
              )}
              {paginated.map((row, i) => (
                <tr key={row._id} className="hover:bg-gray-50">
                  <td className={TD}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-none" style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>{row.name[0]}</div>
                      <span className="font-medium text-[#111827]">{row.name}</span>
                      {isAlsoCustomer(row) && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">Customer</span>}
                    </div>
                  </td>
                  <td className={`${TD} text-[#536173]`}>{row.contact || '—'}</td>
                  <td className={`${TD} text-[#536173]`}>{row.phone || '—'}</td>
                  <td className={`${TD} text-[#536173]`}>{row.email || '—'}</td>
                  <td className={`${TD} text-[#536173]`}>{row.category || '—'}</td>
                  <td className={TD}>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${row.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{row.status}</span>
                  </td>
                  <td className={TD}>
                    <div className="flex items-center gap-1">
                      <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-yellow-50 text-yellow-500 bg-transparent border-0 cursor-pointer" title="Edit" type="button" onClick={() => handleEdit(row)}>
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
