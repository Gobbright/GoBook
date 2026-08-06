import { useEffect, useState } from 'react';

import { api } from '../../../../../services/api.js';
import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';

const TH = 'text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-5 py-3 border-b border-[#edf2f7]';
const TD = 'px-5 py-3.5 border-b border-[#f3f4f6] text-[13px]';
const INPUT = 'border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] w-full outline-none focus:border-blue-500 font-[inherit]';
const LABEL = 'block text-[12px] font-medium text-[#374151] mb-1';

const EditIcon = () => (
  <svg fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const TrashIcon = () => (
  <svg fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14H6L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4h6v2"/>
  </svg>
);

const EMPTY_FORM = { name: '', description: '', status: 'Active' };

function CategoryModal({ mode, initial, onSave, onClose }) {
  const [form, setForm] = useState(initial ?? EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return setErr('Category name is required');
    setSaving(true);
    setErr('');
    try {
      const result = mode === 'add' ? await api.invCreateCategory(form) : await api.invUpdateCategory(initial._id, form);
      onSave(result);
    } catch (e) {
      setErr(e.message || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-110 mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#edf2f7]">
          <h2 className="text-[16px] font-bold text-[#111827]">{mode === 'add' ? 'Add Category' : 'Edit Category'}</h2>
          <button onClick={onClose} className="text-[#536173] hover:text-[#111827] bg-transparent border-0 cursor-pointer text-lg leading-none">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4">
          {err && <div className="mb-3 px-3 py-2 bg-red-50 text-red-600 text-[12px] rounded-md">{err}</div>}
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className={LABEL}>Category Name *</label>
              <input className={INPUT} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Electronics" />
            </div>
            <div>
              <label className={LABEL}>Description</label>
              <input className={INPUT} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="e.g. Phones, laptops, accessories" />
            </div>
            <div>
              <label className={LABEL}>Status</label>
              <SelectDropdown buttonClassName={INPUT} value={form.status} onChange={(v) => set('status', v)} options={['Active', 'Inactive']} />
            </div>
          </div>
          <div className="flex gap-3 mt-5 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[13px] font-medium text-[#374151] bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit]">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit] disabled:opacity-60">
              {saving ? 'Saving...' : mode === 'add' ? 'Add Category' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function CategoriesPage() {
  const [search, setSearch]     = useState('');
  const [categories, setCategories] = useState([]);
  const [stats, setStats]       = useState(null);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [modal, setModal]       = useState(null);

  const LIMIT = 5;

  function loadAll() {
    setLoading(true);
    setError('');
    const params = { page, limit: LIMIT };
    if (search) params.search = search;
    Promise.all([api.invListCategories(params), api.invCategoryStats()])
      .then(([cats, st]) => { setCategories(cats.data); setTotal(cats.total); setStats(st); })
      .catch(() => setError('Failed to load categories'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadAll(); }, [search, page]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearch(val) {
    setSearch(val);
    setPage(1);
  }

  function handleSave() { setModal(null); loadAll(); }

  function handleDelete(id) {
    if (!window.confirm('Delete this category? Products already tagged with it will keep the category name as free text.')) return;
    api.invDeleteCategory(id)
      .then(() => { loadAll(); })
      .catch((e) => alert(e.message || 'Failed to delete category'));
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="p-7">
      {modal && <CategoryModal mode={modal.mode} initial={modal.mode === 'edit' ? modal.data : null} onSave={handleSave} onClose={() => setModal(null)} />}

      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 mb-5">
        <div>
          <h1 className="m-0 text-[22px] font-bold text-[#111827]">Categories</h1>
          <p className="m-0 text-[13px] text-[#536173] mt-0.5">Organize your products into categories</p>
        </div>
        <button className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit]" type="button" onClick={() => setModal({ mode: 'add' })}>
          <svg fill="none" height="14" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="14"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
          Add Category
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        {[
          { label: 'Total Categories', value: stats ? stats.total.toLocaleString('en-IN') : '—', sub: 'All',            color: '#2563eb', bg: '#eff6ff', icon: <svg fill="none" height="20" stroke="#2563eb" strokeWidth="2" viewBox="0 0 24 24" width="20"><rect height="7" rx="1" width="7" x="3" y="3"/><rect height="7" rx="1" width="7" x="14" y="3"/><rect height="7" rx="1" width="7" x="14" y="14"/><rect height="7" rx="1" width="7" x="3" y="14"/></svg> },
          { label: 'Active Categories', value: stats ? stats.active.toLocaleString('en-IN') : '—', sub: 'In use',        color: '#16a34a', bg: '#f0fdf4', icon: <svg fill="none" height="20" stroke="#16a34a" strokeWidth="2" viewBox="0 0 24 24" width="20"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> },
          { label: 'Products Tagged',   value: stats ? stats.totalProducts.toLocaleString('en-IN') : '—', sub: 'Products', color: '#7c3aed', bg: '#f5f3ff', icon: <svg fill="none" height="20" stroke="#7c3aed" strokeWidth="2" viewBox="0 0 24 24" width="20"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg> },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-[#dfe7f1] rounded-xl p-4 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-none" style={{ background: s.bg }}>{s.icon}</div>
            <div>
              <div className="text-xs text-[#536173] mb-0.5">{s.label}</div>
              <div className="text-[17px] font-bold leading-tight" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-[#536173] mt-0.5">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-[#dfe7f1] rounded-xl">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[#edf2f7]">
          <div className="relative flex-1 max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#536173]" fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>
            <input className="border border-[#dbe4ef] rounded-md pl-8 pr-3 py-2 text-[13px] w-full outline-none focus:border-blue-500 font-[inherit]" placeholder="Search categories..." value={search} onChange={(e) => handleSearch(e.target.value)} />
          </div>
        </div>

        {error && <div className="px-5 py-4 text-[13px] text-red-600">{error}</div>}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={TH}>Category Name</th>
                <th className={TH}>Description</th>
                <th className={TH}>Products</th>
                <th className={TH}>Status</th>
                <th className={TH}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-[13px] text-[#536173]">Loading...</td></tr>
              ) : categories.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-[13px] text-[#536173]">No categories found</td></tr>
              ) : categories.map((row) => (
                <tr key={row._id} className="hover:bg-gray-50">
                  <td className={`${TD} font-medium text-[#111827]`}>{row.name}</td>
                  <td className={`${TD} text-[#536173]`}>{row.description || '—'}</td>
                  <td className={`${TD} text-[#111827]`}>{row.productCount}</td>
                  <td className={TD}>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${row.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{row.status}</span>
                  </td>
                  <td className={TD}>
                    <div className="flex items-center gap-1">
                      <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-yellow-50 text-yellow-500 bg-transparent border-0 cursor-pointer" type="button" title="Edit" onClick={() => setModal({ mode: 'edit', data: row })}>
                        <EditIcon />
                      </button>
                      <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-50 text-red-400 bg-transparent border-0 cursor-pointer" type="button" title="Delete" onClick={() => handleDelete(row._id)}>
                        <TrashIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-[#edf2f7] flex flex-wrap justify-between gap-2 text-[13px] text-[#536173]">
          <span>Showing {categories.length === 0 ? 0 : (page - 1) * LIMIT + 1} to {(page - 1) * LIMIT + categories.length} of {total} entries</span>
          <div className="flex items-center gap-1 flex-wrap">
            <button className="px-2.5 py-1 rounded border border-[#dbe4ef] hover:bg-gray-50 text-[12px] bg-white font-[inherit] cursor-pointer disabled:opacity-40" type="button" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>←</button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
              <button key={p} className={`px-2.5 py-1 rounded text-[12px] font-[inherit] cursor-pointer border ${p === page ? 'bg-blue-600 text-white border-blue-600' : 'border-[#dbe4ef] hover:bg-gray-50 bg-white'}`} type="button" onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="px-2.5 py-1 rounded border border-[#dbe4ef] hover:bg-gray-50 text-[12px] bg-white font-[inherit] cursor-pointer disabled:opacity-40" type="button" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>→</button>
          </div>
        </div>
      </div>
    </div>
  );
}
