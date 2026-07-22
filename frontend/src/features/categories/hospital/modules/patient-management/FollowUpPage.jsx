import { useState } from 'react';
import { AlertCircle } from 'lucide-react';

import { useModuleRecords, useLookupRecords, names } from '../../../shared/recordUi/useModuleRecords.js';
import { FormModal } from '../../../shared/recordUi/FormModal.jsx';
import { PageHeader } from '../../../shared/recordUi/PageHeader.jsx';
import { KanbanBoard } from '../../../shared/recordUi/KanbanBoard.jsx';
import { RowActions } from '../../../shared/recordUi/RowActions.jsx';
import { fmtDate, daysUntil } from '../../../shared/recordUi/dateUtils.js';

const STATUSES = ['Pending', 'Completed', 'Missed'];

const FIELDS = [
  { key: 'patientName', label: 'Patient', required: true, type: 'lookup', lookupModule: 'hospital/patients' },
  { key: 'doctorName', label: 'Doctor', type: 'lookup', lookupModule: 'hospital/doctors' },
  { key: 'followUpDate', label: 'Follow-up Date', type: 'date' },
  { key: 'reason', label: 'Reason' },
  { key: 'status', label: 'Status', type: 'select', options: STATUSES },
];

export function FollowUpPage() {
  const { records, loading, create, update, remove } = useModuleRecords('hospital/follow-up');
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
    if (!window.confirm('Delete this follow-up?')) return;
    await remove(id);
  }

  return (
    <div className="p-4 md:p-7">
      <PageHeader title="Follow Up" group="Patient Management" subtitle="Board grouped by follow-up status — overdue items flagged" actionLabel="Add Follow Up" onAction={() => setModal({ mode: 'add' })} />

      {modal && (
        <FormModal
          title={modal.mode === 'add' ? 'New Follow Up' : 'Edit Follow Up'}
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
          renderCard={(r) => {
            const overdue = r.data?.status === 'Pending' && daysUntil(r.data?.followUpDate) < 0;
            return (
              <div key={r._id} className={`bg-white border rounded-lg p-3 ${overdue ? 'border-red-300' : 'border-[#dfe7f1]'}`}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-[13px] font-semibold text-[#111827]">{r.data?.patientName || 'Unnamed patient'}</span>
                  <RowActions onEdit={() => setModal({ mode: 'edit', record: r })} onDelete={() => handleDelete(r._id)} />
                </div>
                <div className="text-xs text-[#94a3b8]">{r.data?.doctorName || 'No doctor assigned'}</div>
                <div className="text-xs text-[#374151] mt-1">{r.data?.reason || 'No reason specified'}</div>
                <div className={`flex items-center gap-1 mt-2 text-[11px] font-medium ${overdue ? 'text-red-600' : 'text-[#536173]'}`}>
                  {overdue && <AlertCircle size={11} />}
                  {fmtDate(r.data?.followUpDate)}{overdue && ' · overdue'}
                </div>
              </div>
            );
          }}
        />
      )}
    </div>
  );
}
