import { useMemo, useState } from 'react';
import { Search, BookMarked } from 'lucide-react';

import { useModuleRecords } from '../../../shared/recordUi/useModuleRecords.js';
import { FormModal } from '../../../shared/recordUi/FormModal.jsx';
import { PageHeader } from '../../../shared/recordUi/PageHeader.jsx';
import { RowActions } from '../../../shared/recordUi/RowActions.jsx';

const FIELDS = [
  { key: 'title', label: 'Title', required: true },
  { key: 'author', label: 'Author' },
  { key: 'isbn', label: 'ISBN' },
  { key: 'category', label: 'Category' },
  { key: 'copiesAvailable', label: 'Copies Available', type: 'number' },
];

export function BooksPage() {
  const { records, loading, create, update, remove, reload } = useModuleRecords('school/library/books');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) => `${r.data?.title || ''} ${r.data?.author || ''} ${r.data?.category || ''}`.toLowerCase().includes(q));
  }, [records, search]);

  async function handleSubmit(form) {
    if (modal.mode === 'edit') await update(modal.record._id, form);
    else await create(form);
    setModal(null);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this book?')) return;
    await remove(id);
  }

  function availabilityBadge(copies) {
    const n = Number(copies) || 0;
    if (n === 0) return <span className="text-[11px] font-semibold text-red-600">Unavailable</span>;
    if (n < 3) return <span className="text-[11px] font-semibold text-amber-600">Only {n} left</span>;
    return <span className="text-[11px] font-semibold text-green-600">{n} available</span>;
  }

  return (
    <div className="p-4 md:p-7">
      <PageHeader title="Books" group="Library" subtitle="Book catalog" actionLabel="Add Book" onAction={() => setModal({ mode: 'add' })} moduleKey="school/library/books" fields={FIELDS} onImported={reload} />

      {modal && (
        <FormModal
          title={modal.mode === 'add' ? 'New Book' : 'Edit Book'}
          fields={FIELDS}
          initial={modal.mode === 'edit' ? modal.record.data : null}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
          submitLabel={modal.mode === 'add' ? 'Save Book' : 'Update Book'}
        />
      )}

      <div className="relative max-w-xs mb-5">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
        <input
          className="pl-8 pr-3 py-2 border border-[#dbe4ef] rounded-md text-[13px] outline-none focus:border-blue-500 w-full font-[inherit] bg-white"
          placeholder="Search books..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="text-[13px] text-[#536173] px-5 py-8 text-center">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-[#dfe7f1] rounded-xl py-16 text-center text-[13px] text-[#536173]">No books found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filtered.map((r) => (
            <div key={r._id} className="bg-white border border-[#dfe7f1] rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <span className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center flex-none"><BookMarked size={16} /></span>
                <RowActions onEdit={() => setModal({ mode: 'edit', record: r })} onDelete={() => handleDelete(r._id)} />
              </div>
              <div className="text-[14px] font-semibold text-[#111827] mb-0.5 truncate">{r.data?.title}</div>
              <div className="text-xs text-[#94a3b8] mb-3">{r.data?.author || 'Unknown author'} · {r.data?.category || 'Uncategorized'}</div>
              <div className="flex items-center justify-between pt-2 border-t border-[#f3f4f6]">
                {availabilityBadge(r.data?.copiesAvailable)}
                <span className="text-[11px] text-[#94a3b8] font-mono">{r.data?.isbn || '—'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
