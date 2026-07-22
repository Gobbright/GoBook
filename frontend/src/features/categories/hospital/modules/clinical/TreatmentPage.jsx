import { useState } from 'react';

import { useModuleRecords, useLookupRecords, names } from '../../../shared/recordUi/useModuleRecords.js';
import { FormModal } from '../../../shared/recordUi/FormModal.jsx';
import { PageHeader } from '../../../shared/recordUi/PageHeader.jsx';
import { KanbanBoard } from '../../../shared/recordUi/KanbanBoard.jsx';
import { RowActions } from '../../../shared/recordUi/RowActions.jsx';
import { fmtDate } from '../../../shared/recordUi/dateUtils.js';

const STATUSES = ['Ongoing', 'Completed', 'Discontinued'];

const FIELDS = [
  { key: 'patientName', label: 'Patient', required: true, type: 'lookup', lookupModule: 'hospital/patients' },
  { key: 'doctorName', label: 'Doctor', type: 'lookup', lookupModule: 'hospital/doctors' },
  { key: 'treatmentType', label: 'Treatment Type', required: true },
  { key: 'startDate', label: 'Start Date', type: 'date' },
  { key: 'endDate', label: 'End Date', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: STATUSES },
];

export function TreatmentPage() {
  const { records, loading, create, update, remove } = useModuleRecords('hospital/treatment');
  const patients = useLookupRecords('hospital/patients');
  const doctors = useLookupRecords('hospital/doctors');
  const [modal, setModal] = useState(null);

  const lookupOptions = {
    'hospital/patients': names(patients.records),
    'hospital/doctors': names(doctors.records),
  };

  async function handleSubmit(form) {
    if (modal.mode === 'edit') await update(modal.record._id, form);
    else await create(form);
    setModal(null);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this treatment record?')) return;
    await remove(id);
  }

  return (
    <div className="p-4 md:p-7">
      <PageHeader title="Treatment" group="Clinical" subtitle="Treatments grouped by status" actionLabel="Add Treatment" onAction={() => setModal({ mode: 'add' })} />

      {modal && (
        <FormModal
          title={modal.mode === 'add' ? 'New Treatment' : 'Edit Treatment'}
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
          columns={STATUSES}
          records={records}
          statusKey="status"
          renderCard={(r) => (
            <div key={r._id} className="bg-white border border-[#dfe7f1] rounded-lg p-3">
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-[13px] font-semibold text-[#111827]">{r.data?.treatmentType || 'Treatment'}</span>
                <RowActions onEdit={() => setModal({ mode: 'edit', record: r })} onDelete={() => handleDelete(r._id)} />
              </div>
              <div className="text-xs text-[#536173]">{r.data?.patientName || 'Unnamed patient'}</div>
              <div className="text-xs text-[#94a3b8]">{r.data?.doctorName || 'No doctor assigned'}</div>
              <div className="text-[11px] text-[#94a3b8] mt-2">{fmtDate(r.data?.startDate)} → {r.data?.endDate ? fmtDate(r.data.endDate) : 'ongoing'}</div>
            </div>
          )}
        />
      )}
    </div>
  );
}
