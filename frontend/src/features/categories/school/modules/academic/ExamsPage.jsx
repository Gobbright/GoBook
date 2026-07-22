import { useState } from 'react';

import { useModuleRecords, useLookupRecords, names } from '../../../shared/recordUi/useModuleRecords.js';
import { FormModal } from '../../../shared/recordUi/FormModal.jsx';
import { PageHeader } from '../../../shared/recordUi/PageHeader.jsx';
import { KanbanBoard } from '../../../shared/recordUi/KanbanBoard.jsx';
import { RowActions } from '../../../shared/recordUi/RowActions.jsx';
import { fmtDate } from '../../../shared/recordUi/dateUtils.js';

const STATUSES = ['Upcoming', 'Ongoing', 'Completed'];

const FIELDS = [
  { key: 'examName', label: 'Exam Name', required: true },
  { key: 'className', label: 'Class', type: 'lookup', lookupModule: 'school/classes' },
  { key: 'examDate', label: 'Exam Date', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: STATUSES },
];

export function ExamsPage() {
  const { records, loading, create, update, remove, reload } = useModuleRecords('school/exams');
  const classes = useLookupRecords('school/classes');
  const [modal, setModal] = useState(null);

  const lookupOptions = { 'school/classes': names(classes.records) };

  async function handleSubmit(form) {
    if (modal.mode === 'edit') await update(modal.record._id, form);
    else await create(form);
    setModal(null);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this exam?')) return;
    await remove(id);
  }

  return (
    <div className="p-4 md:p-7">
      <PageHeader title="Exams" group="Academic" subtitle="Exam schedule pipeline" actionLabel="Add Exam" onAction={() => setModal({ mode: 'add' })} moduleKey="school/exams" fields={FIELDS} onImported={reload} />

      {modal && (
        <FormModal
          title={modal.mode === 'add' ? 'New Exam' : 'Edit Exam'}
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
                <span className="text-[13px] font-semibold text-[#111827]">{r.data?.examName || 'Exam'}</span>
                <RowActions onEdit={() => setModal({ mode: 'edit', record: r })} onDelete={() => handleDelete(r._id)} />
              </div>
              <div className="text-xs text-[#536173]">{r.data?.className || 'All classes'}</div>
              <div className="text-[11px] text-[#94a3b8] mt-2">{fmtDate(r.data?.examDate)}</div>
            </div>
          )}
        />
      )}
    </div>
  );
}
