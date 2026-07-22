import { useState } from 'react';

import { useModuleRecords, useLookupRecords, names } from '../../../shared/recordUi/useModuleRecords.js';
import { FormModal } from '../../../shared/recordUi/FormModal.jsx';
import { PageHeader } from '../../../shared/recordUi/PageHeader.jsx';
import { KanbanBoard } from '../../../shared/recordUi/KanbanBoard.jsx';
import { RowActions } from '../../../shared/recordUi/RowActions.jsx';
import { fmtDate } from '../../../shared/recordUi/dateUtils.js';

const STATUSES = ['Pending', 'Approved', 'Rejected'];

const FIELDS = [
  { key: 'studentName', label: 'Student Name', required: true, type: 'lookup', lookupModule: 'school/students' },
  { key: 'className', label: 'Class' },
  { key: 'admissionDate', label: 'Admission Date', type: 'date' },
  { key: 'guardianName', label: 'Guardian Name' },
  { key: 'status', label: 'Status', type: 'select', options: STATUSES },
];

export function AdmissionPage() {
  const { records, loading, create, update, remove, reload } = useModuleRecords('school/admission');
  const students = useLookupRecords('school/students');
  const [modal, setModal] = useState(null);

  const lookupOptions = { 'school/students': names(students.records) };

  async function handleSubmit(form) {
    if (modal.mode === 'edit') await update(modal.record._id, form);
    else await create(form);
    setModal(null);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this admission application?')) return;
    await remove(id);
  }

  return (
    <div className="p-4 md:p-7">
      <PageHeader title="Admission" group="Student Management" subtitle="Application pipeline" actionLabel="Add Application" onAction={() => setModal({ mode: 'add' })} moduleKey="school/admission" fields={FIELDS} onImported={reload} />

      {modal && (
        <FormModal
          title={modal.mode === 'add' ? 'New Admission Application' : 'Edit Admission Application'}
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
                <span className="text-[13px] font-semibold text-[#111827]">{r.data?.studentName || 'Unnamed applicant'}</span>
                <RowActions onEdit={() => setModal({ mode: 'edit', record: r })} onDelete={() => handleDelete(r._id)} />
              </div>
              <div className="text-xs text-[#536173]">Class {r.data?.className || '—'}</div>
              <div className="text-xs text-[#94a3b8]">Guardian: {r.data?.guardianName || '—'}</div>
              <div className="text-[11px] text-[#94a3b8] mt-2">{fmtDate(r.data?.admissionDate)}</div>
            </div>
          )}
        />
      )}
    </div>
  );
}
