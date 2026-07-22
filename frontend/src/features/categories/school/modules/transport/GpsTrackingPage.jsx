import { useMemo, useState } from 'react';
import { MapPin, Navigation } from 'lucide-react';

import { useModuleRecords, useLookupRecords } from '../../../shared/recordUi/useModuleRecords.js';
import { FormModal } from '../../../shared/recordUi/FormModal.jsx';
import { PageHeader } from '../../../shared/recordUi/PageHeader.jsx';
import { RowActions } from '../../../shared/recordUi/RowActions.jsx';
import { fmtDate } from '../../../shared/recordUi/dateUtils.js';

const FIELDS = [
  { key: 'vehicleNumber', label: 'Vehicle', required: true, type: 'lookup', lookupModule: 'school/transport/vehicles' },
  { key: 'currentLocation', label: 'Current Location' },
  { key: 'lastUpdated', label: 'Last Updated', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: ['Moving', 'Stopped'] },
];

export function GpsTrackingPage() {
  const { records, loading, create, update, remove, reload } = useModuleRecords('school/transport/gps-tracking');
  const vehicles = useLookupRecords('school/transport/vehicles');
  const [modal, setModal] = useState(null);

  const vehicleNumbers = [...new Set(vehicles.records.map((r) => r.data?.vehicleNumber).filter(Boolean))].sort();
  const lookupOptions = { 'school/transport/vehicles': vehicleNumbers };

  const sorted = useMemo(() => [...records].sort((a, b) => (b.data?.lastUpdated || '').localeCompare(a.data?.lastUpdated || '')), [records]);

  const movingCount = records.filter((r) => r.data?.status === 'Moving').length;

  async function handleSubmit(form) {
    if (modal.mode === 'edit') await update(modal.record._id, form);
    else await create(form);
    setModal(null);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this tracking entry?')) return;
    await remove(id);
  }

  return (
    <div className="p-4 md:p-7">
      <PageHeader title="GPS Tracking" group="Transport" subtitle="Live vehicle status" actionLabel="Add Vehicle Status" onAction={() => setModal({ mode: 'add' })} moduleKey="school/transport/gps-tracking" fields={FIELDS} onImported={reload} />

      {modal && (
        <FormModal
          title={modal.mode === 'add' ? 'New Tracking Entry' : 'Edit Tracking Entry'}
          fields={FIELDS}
          initial={modal.mode === 'edit' ? modal.record.data : null}
          lookupOptions={lookupOptions}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
          submitLabel={modal.mode === 'add' ? 'Save' : 'Update'}
        />
      )}

      <div className="bg-white border border-[#dfe7f1] rounded-xl p-4 mb-5 flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
        </span>
        <span className="text-[13px] font-medium text-[#374151]">{movingCount} of {records.length} vehicles currently moving</span>
      </div>

      {loading ? (
        <p className="text-[13px] text-[#536173] px-5 py-8 text-center">Loading…</p>
      ) : sorted.length === 0 ? (
        <div className="bg-white border border-[#dfe7f1] rounded-xl py-16 text-center text-[13px] text-[#536173]">No vehicle status logged yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((r) => {
            const moving = r.data?.status === 'Moving';
            return (
              <div key={r._id} className={`border rounded-xl p-4 ${moving ? 'bg-green-50 border-green-200' : 'bg-white border-[#dfe7f1]'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Navigation size={15} className={moving ? 'text-green-600' : 'text-[#94a3b8]'} />
                    <span className="text-[13px] font-semibold text-[#111827] font-mono">{r.data?.vehicleNumber || '—'}</span>
                  </div>
                  <RowActions onEdit={() => setModal({ mode: 'edit', record: r })} onDelete={() => handleDelete(r._id)} />
                </div>
                <div className="flex items-center gap-1.5 text-[13px] text-[#374151] mb-1">
                  <MapPin size={12} className="text-[#94a3b8] flex-none" />
                  {r.data?.currentLocation || 'Location unknown'}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${moving ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{r.data?.status || 'Unknown'}</span>
                  <span className="text-[11px] text-[#94a3b8]">{fmtDate(r.data?.lastUpdated)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
