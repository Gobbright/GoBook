import { useMemo, useState } from 'react';
import { Library } from 'lucide-react';

import { useModuleRecords } from '../../../shared/recordUi/useModuleRecords.js';
import { FormModal } from '../../../shared/recordUi/FormModal.jsx';
import { PageHeader } from '../../../shared/recordUi/PageHeader.jsx';
import { RowActions } from '../../../shared/recordUi/RowActions.jsx';

const FIELDS = [
  { key: 'title', label: 'Title', required: true },
  { key: 'author', label: 'Author' },
  { key: 'category', label: 'Category' },
  { key: 'shelfNumber', label: 'Shelf Number' },
];

export function CataloguePage() {
  const { records, loading, create, update, remove, reload } = useModuleRecords('school/library/catalogue');
  const [modal, setModal] = useState(null);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const r of records) {
      const cat = r.data?.category || 'Uncategorized';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(r);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [records]);

  async function handleSubmit(form) {
    if (modal.mode === 'edit') await update(modal.record._id, form);
    else await create(form);
    setModal(null);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this catalogue entry?')) return;
    await remove(id);
  }

  return (
    <div className="p-4 md:p-7">
      <PageHeader title="Catalogue" group="Library" subtitle="Browse by category & shelf" actionLabel="Add Entry" onAction={() => setModal({ mode: 'add' })} moduleKey="school/library/catalogue" fields={FIELDS} onImported={reload} />

      {modal && (
        <FormModal
          title={modal.mode === 'add' ? 'New Catalogue Entry' : 'Edit Catalogue Entry'}
          fields={FIELDS}
          initial={modal.mode === 'edit' ? modal.record.data : null}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
          submitLabel={modal.mode === 'add' ? 'Save' : 'Update'}
        />
      )}

      {loading ? (
        <p className="text-[13px] text-[#536173] px-5 py-8 text-center">Loading…</p>
      ) : grouped.length === 0 ? (
        <div className="bg-white border border-[#dfe7f1] rounded-xl py-16 text-center text-[13px] text-[#536173]">Catalogue is empty.</div>
      ) : (
        <div className="flex flex-col gap-6">
          {grouped.map(([category, items]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-3">
                <Library size={15} className="text-indigo-500" />
                <h2 className="m-0 text-[14px] font-semibold text-[#111827]">{category}</h2>
                <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 rounded-full px-2 py-0.5">{items.length}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {items.map((r) => (
                  <div key={r._id} className="bg-white border border-[#dfe7f1] rounded-lg p-3">
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <span className="text-[13px] font-semibold text-[#111827]">{r.data?.title}</span>
                      <RowActions onEdit={() => setModal({ mode: 'edit', record: r })} onDelete={() => handleDelete(r._id)} />
                    </div>
                    <div className="text-xs text-[#94a3b8]">{r.data?.author || 'Unknown author'}</div>
                    <div className="text-[11px] text-[#536173] mt-1.5">Shelf {r.data?.shelfNumber || '—'}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
