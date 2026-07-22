import { useMemo, useState } from 'react';
import { Search, IdCard } from 'lucide-react';

import { useModuleRecords, useLookupRecords, names } from '../../../shared/recordUi/useModuleRecords.js';
import { FormModal } from '../../../shared/recordUi/FormModal.jsx';
import { PageHeader } from '../../../shared/recordUi/PageHeader.jsx';
import { RowActions } from '../../../shared/recordUi/RowActions.jsx';

const FIELDS = [
  { key: 'name', label: 'Driver Name', required: true },
  { key: 'phone', label: 'Phone' },
  { key: 'licenseNumber', label: 'License Number' },
  { key: 'vehicleNumber', label: 'Vehicle', type: 'lookup', lookupModule: 'school/transport/vehicles', lookupDisplay: 'vehicleNumber' },
];

export function DriversPage() {
  const { records, loading, create, update, remove, reload } = useModuleRecords('school/transport/drivers');
  const vehicles = useLookupRecords('school/transport/vehicles');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [modal, setModal] = useState(null);

  const vehicleNumbers = [...new Set(vehicles.records.map((r) => r.data?.vehicleNumber).filter(Boolean))].sort();
  const lookupOptions = { 'school/transport/vehicles': vehicleNumbers };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) => `${r.data?.name || ''} ${r.data?.licenseNumber || ''}`.toLowerCase().includes(q));
  }, [records, search]);

  const selected = records.find((r) => r._id === selectedId) || filtered[0] || null;

  async function handleSubmit(form) {
    if (modal.mode === 'edit') await update(modal.record._id, form);
    else await create(form);
    setModal(null);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this driver?')) return;
    await remove(id);
    if (selectedId === id) setSelectedId(null);
  }

  return (
    <div className="p-4 md:p-7">
      <PageHeader title="Drivers" group="Transport" subtitle="Driver directory" actionLabel="Add Driver" onAction={() => setModal({ mode: 'add' })} moduleKey="school/transport/drivers" fields={FIELDS} onImported={reload} />

      {modal && (
        <FormModal
          title={modal.mode === 'add' ? 'New Driver' : 'Edit Driver'}
          fields={FIELDS}
          initial={modal.mode === 'edit' ? modal.record.data : null}
          lookupOptions={lookupOptions}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
          submitLabel={modal.mode === 'add' ? 'Save Driver' : 'Update Driver'}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
        <div className="bg-white border border-[#dfe7f1] rounded-xl overflow-hidden flex flex-col">
          <div className="p-3 border-b border-[#edf2f7]">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
              <input
                className="pl-8 pr-3 py-2 border border-[#dbe4ef] rounded-md text-[13px] outline-none focus:border-blue-500 w-full font-[inherit]"
                placeholder="Search drivers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-[70vh]">
            {loading ? (
              <p className="text-[13px] text-[#536173] px-4 py-6 text-center">Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="text-[13px] text-[#536173] px-4 py-6 text-center">No drivers found.</p>
            ) : filtered.map((r) => (
              <button
                key={r._id}
                type="button"
                onClick={() => setSelectedId(r._id)}
                className={`w-full flex items-center gap-3 px-4 py-3 border-b border-[#f3f4f6] text-left bg-transparent border-0 cursor-pointer font-[inherit] ${selected?._id === r._id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
              >
                <span className="w-9 h-9 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center flex-none"><IdCard size={15} /></span>
                <span className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-[#111827] truncate">{r.data?.name || 'Unnamed'}</div>
                  <div className="text-xs text-[#94a3b8] truncate">{r.data?.vehicleNumber || 'No vehicle assigned'}</div>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white border border-[#dfe7f1] rounded-xl p-6">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center">
              <IdCard size={32} className="text-[#cbd5e1] mb-2" />
              <p className="text-[13px] text-[#536173]">Select a driver to view details.</p>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between mb-5">
                <h2 className="m-0 text-[18px] font-bold text-[#111827]">{selected.data?.name}</h2>
                <RowActions onEdit={() => setModal({ mode: 'edit', record: selected })} onDelete={() => handleDelete(selected._id)} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  ['Phone', selected.data?.phone || '—'],
                  ['License Number', selected.data?.licenseNumber || '—'],
                  ['Vehicle', selected.data?.vehicleNumber || '—'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div className="text-xs text-[#94a3b8] uppercase tracking-wide mb-0.5">{label}</div>
                    <div className="text-[13px] text-[#111827] font-medium">{value}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
