import { useMemo, useState } from 'react';
import { Search, Pill } from 'lucide-react';

import { useModuleRecords } from '../../../shared/recordUi/useModuleRecords.js';
import { FormModal } from '../../../shared/recordUi/FormModal.jsx';
import { PageHeader } from '../../../shared/recordUi/PageHeader.jsx';
import { StatusBadge } from '../../../shared/recordUi/StatusBadge.jsx';
import { RowActions } from '../../../shared/recordUi/RowActions.jsx';

const FIELDS = [
  { key: 'name', label: 'Medicine Name', required: true },
  { key: 'category', label: 'Category', type: 'select', options: ['Tablet', 'Syrup', 'Injection', 'Ointment', 'Drops', 'Other'] },
  { key: 'manufacturer', label: 'Manufacturer' },
  { key: 'unit', label: 'Unit', type: 'select', options: ['Strip', 'Bottle', 'Vial', 'Box', 'Piece'] },
  { key: 'price', label: 'Price', type: 'number' },
  { key: 'stock', label: 'Stock Qty', type: 'number' },
  { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Discontinued'] },
];

export function MedicinesPage() {
  const { records, loading, create, update, remove } = useModuleRecords('hospital/medicines');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) => `${r.data?.name || ''} ${r.data?.category || ''}`.toLowerCase().includes(q));
  }, [records, search]);

  async function handleSubmit(form) {
    if (modal.mode === 'edit') await update(modal.record._id, form);
    else await create(form);
    setModal(null);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this medicine?')) return;
    await remove(id);
  }

  function stockBadge(stock) {
    const n = Number(stock) || 0;
    if (n === 0) return <span className="text-[11px] font-semibold text-red-600">Out of stock</span>;
    if (n < 20) return <span className="text-[11px] font-semibold text-amber-600">Low stock · {n}</span>;
    return <span className="text-[11px] font-semibold text-green-600">In stock · {n}</span>;
  }

  return (
    <div className="p-4 md:p-7">
      <PageHeader title="Medicines" group="Pharmacy" subtitle="Medicine catalog" actionLabel="Add Medicines" onAction={() => setModal({ mode: 'add' })} />

      {modal && (
        <FormModal
          title={modal.mode === 'add' ? 'New Medicine' : 'Edit Medicine'}
          fields={FIELDS}
          initial={modal.mode === 'edit' ? modal.record.data : null}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
          submitLabel={modal.mode === 'add' ? 'Save Medicine' : 'Update Medicine'}
        />
      )}

      <div className="relative max-w-xs mb-5">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
        <input
          className="pl-8 pr-3 py-2 border border-[#dbe4ef] rounded-md text-[13px] outline-none focus:border-blue-500 w-full font-[inherit] bg-white"
          placeholder="Search medicines..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="text-[13px] text-[#536173] px-5 py-8 text-center">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-[#dfe7f1] rounded-xl py-16 text-center text-[13px] text-[#536173]">No medicines found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filtered.map((r) => (
            <div key={r._id} className="bg-white border border-[#dfe7f1] rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <span className="w-10 h-10 rounded-lg bg-green-100 text-green-700 flex items-center justify-center flex-none">
                  <Pill size={16} />
                </span>
                <RowActions onEdit={() => setModal({ mode: 'edit', record: r })} onDelete={() => handleDelete(r._id)} />
              </div>
              <div className="text-[14px] font-semibold text-[#111827] mb-0.5 truncate">{r.data?.name}</div>
              <div className="text-xs text-[#94a3b8] mb-2">{r.data?.category || 'Uncategorized'} · {r.data?.manufacturer || 'Unknown mfr.'}</div>
              <div className="text-[13px] font-medium text-[#111827] mb-2">₹{Number(r.data?.price || 0).toLocaleString('en-IN')} <span className="text-xs text-[#94a3b8]">/ {r.data?.unit || 'unit'}</span></div>
              <div className="flex items-center justify-between pt-2 border-t border-[#f3f4f6]">
                {stockBadge(r.data?.stock)}
                <StatusBadge value={r.data?.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
