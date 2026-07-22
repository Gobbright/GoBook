import { useState } from 'react';
import { Bus } from 'lucide-react';

import { useModuleRecords, useLookupRecords, names } from '../../../shared/recordUi/useModuleRecords.js';
import { FormModal } from '../../../shared/recordUi/FormModal.jsx';
import { PageHeader } from '../../../shared/recordUi/PageHeader.jsx';
import { RowActions } from '../../../shared/recordUi/RowActions.jsx';

const FIELDS = [
  { key: 'vehicleNumber', label: 'Vehicle Number', required: true },
  { key: 'type', label: 'Type' },
  { key: 'capacity', label: 'Capacity', type: 'number' },
  { key: 'driverName', label: 'Driver', type: 'lookup', lookupModule: 'school/transport/drivers' },
];

export function VehiclesPage() {
  const { records, loading, create, update, remove, reload } = useModuleRecords('school/transport/vehicles');
  const drivers = useLookupRecords('school/transport/drivers');
  const [modal, setModal] = useState(null);

  const lookupOptions = { 'school/transport/drivers': names(drivers.records) };

  async function handleSubmit(form) {
    if (modal.mode === 'edit') await update(modal.record._id, form);
    else await create(form);
    setModal(null);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this vehicle?')) return;
    await remove(id);
  }

  return (
    <div className="p-4 md:p-7">
      <PageHeader title="Vehicles" group="Transport" subtitle="Fleet directory" actionLabel="Add Vehicle" onAction={() => setModal({ mode: 'add' })} moduleKey="school/transport/vehicles" fields={FIELDS} onImported={reload} />

      {modal && (
        <FormModal
          title={modal.mode === 'add' ? 'New Vehicle' : 'Edit Vehicle'}
          fields={FIELDS}
          initial={modal.mode === 'edit' ? modal.record.data : null}
          lookupOptions={lookupOptions}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
          submitLabel={modal.mode === 'add' ? 'Save Vehicle' : 'Update Vehicle'}
        />
      )}

      {loading ? (
        <p className="text-[13px] text-[#536173] px-5 py-8 text-center">Loading…</p>
      ) : records.length === 0 ? (
        <div className="bg-white border border-[#dfe7f1] rounded-xl py-16 text-center text-[13px] text-[#536173]">No vehicles yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {records.map((r) => (
            <div key={r._id} className="bg-white border border-[#dfe7f1] rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <span className="w-10 h-10 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center flex-none"><Bus size={17} /></span>
                <RowActions onEdit={() => setModal({ mode: 'edit', record: r })} onDelete={() => handleDelete(r._id)} />
              </div>
              <div className="text-[14px] font-semibold text-[#111827] font-mono mb-0.5">{r.data?.vehicleNumber}</div>
              <div className="text-xs text-[#94a3b8] mb-3">{r.data?.type || 'Vehicle'} · Cap. {r.data?.capacity || '—'}</div>
              <div className="text-[12px] text-[#536173] pt-2 border-t border-[#f3f4f6]">Driver: {r.data?.driverName || 'Unassigned'}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
