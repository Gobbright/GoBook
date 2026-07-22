import { useState } from 'react';

import { useModuleRecords, useLookupRecords, names } from '../../../shared/recordUi/useModuleRecords.js';
import { FormModal } from '../../../shared/recordUi/FormModal.jsx';
import { PageHeader } from '../../../shared/recordUi/PageHeader.jsx';
import { KanbanBoard } from '../../../shared/recordUi/KanbanBoard.jsx';
import { RowActions } from '../../../shared/recordUi/RowActions.jsx';
import { fmtDate } from '../../../shared/recordUi/dateUtils.js';

const STATUSES = ['Pending', 'In Progress', 'Completed'];

const FIELDS = [
  { key: 'patientName', label: 'Patient', required: true, type: 'lookup', lookupModule: 'hospital/patients' },
  { key: 'testName', label: 'Test Name', required: true },
  { key: 'orderedBy', label: 'Ordered By', type: 'lookup', lookupModule: 'hospital/doctors' },
  { key: 'priority', label: 'Priority', type: 'select', options: ['Routine', 'Urgent'] },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: STATUSES },
];

export function TestOrdersPage() {
  const { records, loading, create, update, remove } = useModuleRecords('hospital/test-orders');
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
    if (!window.confirm('Delete this test order?')) return;
    await remove(id);
  }

  return (
    <div className="p-4 md:p-7">
      <PageHeader title="Test Orders" group="Laboratory" subtitle="Order pipeline — Pending → In Progress → Completed" actionLabel="Add Test Order" onAction={() => setModal({ mode: 'add' })} />

      {modal && (
        <FormModal
          title={modal.mode === 'add' ? 'New Test Order' : 'Edit Test Order'}
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
            <div key={r._id} className={`bg-white border rounded-lg p-3 ${r.data?.priority === 'Urgent' ? 'border-red-300' : 'border-[#dfe7f1]'}`}>
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-[13px] font-semibold text-[#111827]">{r.data?.testName || 'Test'}</span>
                <RowActions onEdit={() => setModal({ mode: 'edit', record: r })} onDelete={() => handleDelete(r._id)} />
              </div>
              <div className="text-xs text-[#536173]">{r.data?.patientName || 'Unnamed patient'}</div>
              <div className="text-xs text-[#94a3b8]">Ordered by {r.data?.orderedBy || '—'}</div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[11px] text-[#94a3b8]">{fmtDate(r.data?.date)}</span>
                {r.data?.priority === 'Urgent' && <span className="text-[10px] font-semibold text-red-600">URGENT</span>}
              </div>
            </div>
          )}
        />
      )}
    </div>
  );
}
