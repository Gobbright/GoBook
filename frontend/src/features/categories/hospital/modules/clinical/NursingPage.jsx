import { useState } from 'react';

import { useModuleRecords, useLookupRecords, names } from '../../../shared/recordUi/useModuleRecords.js';
import { FormModal } from '../../../shared/recordUi/FormModal.jsx';
import { PageHeader } from '../../../shared/recordUi/PageHeader.jsx';
import { KanbanBoard } from '../../../shared/recordUi/KanbanBoard.jsx';
import { StatusBadge } from '../../../shared/recordUi/StatusBadge.jsx';
import { RowActions } from '../../../shared/recordUi/RowActions.jsx';

const SHIFTS = ['Morning', 'Evening', 'Night'];

const FIELDS = [
  { key: 'patientName', label: 'Patient', required: true, type: 'lookup', lookupModule: 'hospital/patients' },
  { key: 'nurseName', label: 'Nurse Name', required: true },
  { key: 'ward', label: 'Ward' },
  { key: 'shift', label: 'Shift', type: 'select', options: SHIFTS, required: true },
  { key: 'careNotes', label: 'Care Notes', type: 'textarea', full: true },
  { key: 'status', label: 'Status', type: 'select', options: ['Ongoing', 'Completed'] },
];

export function NursingPage() {
  const { records, loading, create, update, remove } = useModuleRecords('hospital/nursing');
  const patients = useLookupRecords('hospital/patients');
  const [modal, setModal] = useState(null);

  const lookupOptions = { 'hospital/patients': names(patients.records) };

  async function handleSubmit(form) {
    if (modal.mode === 'edit') await update(modal.record._id, form);
    else await create(form);
    setModal(null);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this nursing entry?')) return;
    await remove(id);
  }

  return (
    <div className="p-4 md:p-7">
      <PageHeader title="Nursing" group="Clinical" subtitle="Care tasks by shift" actionLabel="Add Nursing" onAction={() => setModal({ mode: 'add' })} />

      {modal && (
        <FormModal
          title={modal.mode === 'add' ? 'New Nursing Entry' : 'Edit Nursing Entry'}
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
      ) : (
        <KanbanBoard
          columns={SHIFTS}
          records={records}
          statusKey="shift"
          renderCard={(r) => (
            <div key={r._id} className="bg-white border border-[#dfe7f1] rounded-lg p-3">
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-[13px] font-semibold text-[#111827]">{r.data?.patientName || 'Unnamed patient'}</span>
                <RowActions onEdit={() => setModal({ mode: 'edit', record: r })} onDelete={() => handleDelete(r._id)} />
              </div>
              <div className="text-xs text-[#536173]">Nurse: {r.data?.nurseName || '—'}</div>
              <div className="text-xs text-[#94a3b8]">{r.data?.ward || 'No ward'}</div>
              {r.data?.careNotes && <p className="text-[12px] text-[#374151] mt-1.5">{r.data.careNotes}</p>}
              <div className="mt-2"><StatusBadge value={r.data?.status} /></div>
            </div>
          )}
        />
      )}
    </div>
  );
}
