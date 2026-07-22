import { useState } from 'react';
import { DoorOpen } from 'lucide-react';

import { useModuleRecords, useLookupRecords } from '../../../shared/recordUi/useModuleRecords.js';
import { FormModal } from '../../../shared/recordUi/FormModal.jsx';
import { PageHeader } from '../../../shared/recordUi/PageHeader.jsx';
import { StatusBadge } from '../../../shared/recordUi/StatusBadge.jsx';
import { RowActions } from '../../../shared/recordUi/RowActions.jsx';

const TYPES = ['Single', 'Double', 'Dormitory'];

const FIELDS = [
  { key: 'roomNumber', label: 'Room Number', required: true },
  { key: 'type', label: 'Type', type: 'select', options: TYPES },
  { key: 'capacity', label: 'Capacity', type: 'number' },
  { key: 'status', label: 'Status', type: 'select', options: ['Available', 'Full'] },
];

export function RoomsPage() {
  const { records, loading, create, update, remove, reload } = useModuleRecords('school/hostel/rooms');
  const allocations = useLookupRecords('school/hostel/allocation');
  const [modal, setModal] = useState(null);

  function occupantCount(roomNumber) {
    return allocations.records.filter((r) => r.data?.roomNumber === roomNumber && r.data?.status !== 'Vacated').length;
  }

  async function handleSubmit(form) {
    if (modal.mode === 'edit') await update(modal.record._id, form);
    else await create(form);
    setModal(null);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this room?')) return;
    await remove(id);
  }

  return (
    <div className="p-4 md:p-7">
      <PageHeader title="Rooms" group="Hostel" subtitle="Rooms by type, with live occupancy" actionLabel="Add Room" onAction={() => setModal({ mode: 'add' })} moduleKey="school/hostel/rooms" fields={FIELDS} onImported={reload} />

      {modal && (
        <FormModal
          title={modal.mode === 'add' ? 'New Room' : 'Edit Room'}
          fields={FIELDS}
          initial={modal.mode === 'edit' ? modal.record.data : null}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
          submitLabel={modal.mode === 'add' ? 'Save Room' : 'Update Room'}
        />
      )}

      {loading ? (
        <p className="text-[13px] text-[#536173] px-5 py-8 text-center">Loading…</p>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${TYPES.length}, minmax(0, 1fr))` }}>
          {TYPES.map((type) => {
            const rooms = records.filter((r) => r.data?.type === type);
            return (
              <div key={type} className="bg-[#f8fafc] border border-[#e5edf7] rounded-xl flex flex-col min-h-40">
                <div className="px-4 py-3 border-b border-[#e5edf7] flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-[#111827]">{type}</span>
                  <span className="text-[11px] text-[#536173] bg-white border border-[#dbe4ef] rounded-full px-2 py-0.5">{rooms.length}</span>
                </div>
                <div className="p-3 flex flex-col gap-2 flex-1">
                  {rooms.length === 0 ? (
                    <p className="text-[12px] text-[#94a3b8] text-center py-6">No rooms</p>
                  ) : rooms.map((r) => {
                    const occupants = occupantCount(r.data?.roomNumber);
                    const capacity = Number(r.data?.capacity) || 0;
                    return (
                      <div key={r._id} className="bg-white border border-[#dfe7f1] rounded-lg p-3">
                        <div className="flex items-start justify-between mb-1.5">
                          <div className="flex items-center gap-1.5 text-[13px] font-semibold text-[#111827]">
                            <DoorOpen size={13} className="text-blue-500 flex-none" />
                            {r.data?.roomNumber || 'Room —'}
                          </div>
                          <RowActions onEdit={() => setModal({ mode: 'edit', record: r })} onDelete={() => handleDelete(r._id)} />
                        </div>
                        <div className="text-xs text-[#94a3b8] mb-2">{occupants}/{capacity || '—'} occupied</div>
                        <StatusBadge value={r.data?.status} />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
