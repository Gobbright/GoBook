import { useEffect, useState } from 'react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';

import {
  createModuleRecord,
  deleteModuleRecord,
  listModuleRecords,
  updateModuleRecord,
} from '../../services/moduleRecordsService.js';

const TH = 'text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-4 py-3 border-b border-[#edf2f7] whitespace-nowrap';
const TD = 'px-4 py-3 border-b border-[#f3f4f6] text-[13px] text-[#111827]';
const PAGE_SIZE = 8;

function emptyForm(fields) {
  return Object.fromEntries(fields.map((f) => [f.key, '']));
}

function FieldInput({ field, value, onChange }) {
  const common = {
    id: `field-${field.key}`,
    value: value ?? '',
    onChange: (e) => onChange(e.target.value),
    required: !!field.required,
    className: 'w-full border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit] bg-white',
  };
  if (field.type === 'select') {
    return (
      <select {...common}>
        <option value="">— Select —</option>
        {field.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    );
  }
  if (field.type === 'textarea') {
    return <textarea {...common} rows={2} />;
  }
  return <input {...common} type={field.type || 'text'} />;
}

export function GenericModulePage({ title, group, category, moduleKey, fields }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(() => emptyForm(fields));
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    return listModuleRecords(moduleKey)
      .then((res) => setRecords(res.records ?? []))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    let active = true;
    listModuleRecords(moduleKey)
      .then((res) => { if (active) setRecords(res.records ?? []); })
      .catch(() => { if (active) setRecords([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [moduleKey]);

  const filtered = search
    ? records.filter((r) => fields.some((f) => String(r.data?.[f.key] ?? '').toLowerCase().includes(search.toLowerCase())))
    : records;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function openAdd() {
    setForm(emptyForm(fields));
    setEditingId(null);
    setFormError('');
    setShowForm(true);
  }

  function openEdit(record) {
    setForm({ ...emptyForm(fields), ...record.data });
    setEditingId(record._id);
    setFormError('');
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setFormError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      if (editingId) await updateModuleRecord(editingId, form);
      else await createModuleRecord(moduleKey, form);
      await load();
      closeForm();
    } catch (err) {
      setFormError(err.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm(`Delete this ${title.toLowerCase()} record?`)) return;
    await deleteModuleRecord(id);
    await load();
  }

  return (
    <div className="p-4 md:p-7">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-1">
        <div>
          <nav className="flex items-center gap-1 text-[13px] text-[#536173] mb-1">
            <a className="text-blue-600 no-underline hover:underline" href="/dashboard">Home</a>
            <span>›</span><span>{group}</span><span>›</span><span>{title}</span>
          </nav>
          <h1 className="m-0 text-[22px] font-bold text-[#111827]">{title}</h1>
          <p className="m-0 text-[13px] text-[#536173] mt-0.5">Manage {title.toLowerCase()} records for {category}</p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit] self-start"
        >
          <Plus size={14} strokeWidth={2.5} />
          Add {title}
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && closeForm()}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-110 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#edf2f7]">
              <h3 className="m-0 text-[15px] font-semibold text-[#111827]">{editingId ? `Edit ${title}` : `New ${title}`}</h3>
              <button type="button" onClick={closeForm} className="text-[#536173] hover:text-[#111827] bg-transparent border-0 cursor-pointer text-lg leading-none font-[inherit]">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="px-5 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {fields.map((field) => (
                  <div key={field.key} className="flex flex-col gap-1">
                    <label htmlFor={`field-${field.key}`} className="text-xs text-[#536173] font-medium">
                      {field.label}{field.required && <span className="text-blue-600"> *</span>}
                    </label>
                    <FieldInput field={field} value={form[field.key]} onChange={(v) => setForm((p) => ({ ...p, [field.key]: v }))} />
                  </div>
                ))}
              </div>
              {formError && <p className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">{formError}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={closeForm} className="px-4 py-2 text-[13px] font-medium text-gray-700 bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit]">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit] disabled:opacity-60">
                  {saving ? 'Saving…' : editingId ? `Update ${title}` : `Save ${title}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white border border-[#dfe7f1] rounded-xl mt-5">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[#edf2f7]">
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#536173]" />
            <input
              className="border border-[#dbe4ef] rounded-md pl-8 pr-3 py-2 text-[13px] w-full outline-none focus:border-blue-500 font-[inherit]"
              placeholder={`Search ${title.toLowerCase()}...`}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>

        {loading ? (
          <p className="text-[13px] text-[#536173] px-5 py-8 text-center">Loading…</p>
        ) : paginated.length === 0 ? (
          <p className="text-[13px] text-[#536173] px-5 py-8 text-center">
            No {title.toLowerCase()} records yet. Click &ldquo;Add {title}&rdquo; to create the first one.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {fields.map((f) => <th key={f.key} className={TH}>{f.label}</th>)}
                  <th className={TH}>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((row) => (
                  <tr key={row._id} className="hover:bg-gray-50">
                    {fields.map((f) => (
                      <td key={f.key} className={TD}>
                        {f.key.toLowerCase().includes('status') && row.data?.[f.key] ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700">
                            {row.data[f.key]}
                          </span>
                        ) : (
                          row.data?.[f.key] || '—'
                        )}
                      </td>
                    ))}
                    <td className={TD}>
                      <div className="flex items-center gap-1">
                        <button type="button" title="Edit" onClick={() => openEdit(row)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-yellow-50 text-yellow-500 bg-transparent border-0 cursor-pointer">
                          <Pencil size={13} />
                        </button>
                        <button type="button" title="Delete" onClick={() => handleDelete(row._id)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-50 text-red-400 bg-transparent border-0 cursor-pointer">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-[#edf2f7] flex items-center justify-between text-[13px] text-[#536173]">
            <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 text-[12px] border border-[#dbe4ef] rounded hover:bg-gray-50 disabled:opacity-40 bg-white font-[inherit] cursor-pointer">←</button>
              <span className="px-2">Page {page} of {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2 py-1 text-[12px] border border-[#dbe4ef] rounded hover:bg-gray-50 disabled:opacity-40 bg-white font-[inherit] cursor-pointer">→</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
