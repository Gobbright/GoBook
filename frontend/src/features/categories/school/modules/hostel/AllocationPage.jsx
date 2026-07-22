import { useMemo, useState } from 'react';

import { useModuleRecords, useLookupRecords, names } from '../../../shared/recordUi/useModuleRecords.js';
import { FormModal } from '../../../shared/recordUi/FormModal.jsx';
import { PageHeader } from '../../../shared/recordUi/PageHeader.jsx';
import { StatusBadge } from '../../../shared/recordUi/StatusBadge.jsx';
import { RowActions } from '../../../shared/recordUi/RowActions.jsx';
import { fmtDate } from '../../../shared/recordUi/dateUtils.js';

const FIELDS = [
  { key: 'studentName', label: 'Student Name', required: true, type: 'lookup', lookupModule: 'school/students' },
  { key: 'roomNumber', label: 'Room Number', type: 'lookup', lookupModule: 'school/hostel/rooms' },
  { key: 'allocationDate', label: 'Allocation Date', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Vacated'] },
];

export function AllocationPage() {
  const { records, loading, create, update, remove, reload } = useModuleRecords('school/hostel/allocation');
  const students = useLookupRecords('school/students');
  const rooms = useLookupRecords('school/hostel/rooms');
  const [modal, setModal] = useState(null);

  const roomNumbers = [...new Set(rooms.records.map((r) => r.data?.roomNumber).filter(Boolean))].sort();
  const lookupOptions = {
    'school/students': names(students.records),
    'school/hostel/rooms': roomNumbers,
  };

  const grouped = useMemo(() => {
    const active = records.filter((r) => r.data?.status !== 'Vacated');
    const map = new Map();
    for (const r of active) {
      const room = r.data?.roomNumber || 'Unassigned';
      if (!map.has(room)) map.set(room, []);
      map.get(room).push(r);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [records]);

  async function handleSubmit(form) {
    if (modal.mode === 'edit') await update(modal.record._id, form);
    else await create(form);
    setModal(null);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this allocation record?')) return;
    await remove(id);
  }

  return (
    <div className="p-4 md:p-7">
      <PageHeader title="Allocation" group="Hostel" subtitle="Active allocations grouped by room" actionLabel="Allocate Room" onAction={() => setModal({ mode: 'add' })} moduleKey="school/hostel/allocation" fields={FIELDS} onImported={reload} />

      {modal && (
        <FormModal
          title={modal.mode === 'add' ? 'New Allocation' : 'Edit Allocation'}
          fields={FIELDS}
          initial={modal.mode === 'edit' ? modal.record.data : null}
          lookupOptions={lookupOptions}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
          submitLabel={modal.mode === 'add' ? 'Save' : 'Update'}
        />
      )}

      {loading ? (
        <p className="text-[13px] text-[#536173] px-5 py-8 text-center">Loading…</p>
      ) : grouped.length === 0 ? (
        <div className="bg-white border border-[#dfe7f1] rounded-xl py-16 text-center text-[13px] text-[#536173]">No active allocations.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {grouped.map(([room, occupants]) => (
            <div key={room} className="bg-white border border-[#dfe7f1] rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-[#f8fafc] border-b border-[#e5edf7] flex items-center justify-between">
                <span className="text-[13px] font-semibold text-[#111827]">{room}</span>
                <span className="text-[11px] text-[#536173] bg-white border border-[#dbe4ef] rounded-full px-2 py-0.5">{occupants.length}</span>
              </div>
              <div className="p-3 flex flex-col gap-2">
                {occupants.map((r) => (
                  <div key={r._id} className="bg-[#f8fafc] border border-[#e5edf7] rounded-lg p-2.5">
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-[12px] font-medium text-[#111827]">{r.data?.studentName}</span>
                      <RowActions onEdit={() => setModal({ mode: 'edit', record: r })} onDelete={() => handleDelete(r._id)} />
                    </div>
                    <div className="text-[11px] text-[#94a3b8]">Since {fmtDate(r.data?.allocationDate)}</div>
                    <div className="mt-1"><StatusBadge value={r.data?.status} /></div>
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
