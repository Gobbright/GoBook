import { useState } from 'react';
import { Grid3x3 } from 'lucide-react';

import { useModuleRecords, useLookupRecords, names } from '../../../shared/recordUi/useModuleRecords.js';
import { FormModal } from '../../../shared/recordUi/FormModal.jsx';
import { PageHeader } from '../../../shared/recordUi/PageHeader.jsx';
import { RowActions } from '../../../shared/recordUi/RowActions.jsx';
import { UtilizationBar } from '../../../shared/recordUi/UtilizationBar.jsx';

const FIELDS = [
  { key: 'sectionName', label: 'Section Name', required: true },
  { key: 'className', label: 'Class', type: 'lookup', lookupModule: 'school/classes' },
  { key: 'classTeacher', label: 'Class Teacher' },
  { key: 'capacity', label: 'Capacity', type: 'number' },
];

export function SectionsPage() {
  const { records, loading, create, update, remove, reload } = useModuleRecords('school/sections');
  const classes = useLookupRecords('school/classes');
  const students = useLookupRecords('school/students');
  const [modal, setModal] = useState(null);

  const lookupOptions = { 'school/classes': names(classes.records) };

  function enrolledCount(className, sectionName) {
    return students.records.filter((r) => r.data?.className === className && r.data?.section === sectionName).length;
  }

  async function handleSubmit(form) {
    if (modal.mode === 'edit') await update(modal.record._id, form);
    else await create(form);
    setModal(null);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this section?')) return;
    await remove(id);
  }

  return (
    <div className="p-4 md:p-7">
      <PageHeader title="Sections" group="Academic" subtitle="Sections with capacity utilization" actionLabel="Add Section" onAction={() => setModal({ mode: 'add' })} moduleKey="school/sections" fields={FIELDS} onImported={reload} />

      {modal && (
        <FormModal
          title={modal.mode === 'add' ? 'New Section' : 'Edit Section'}
          fields={FIELDS}
          initial={modal.mode === 'edit' ? modal.record.data : null}
          lookupOptions={lookupOptions}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
          submitLabel={modal.mode === 'add' ? 'Save Section' : 'Update Section'}
        />
      )}

      {loading ? (
        <p className="text-[13px] text-[#536173] px-5 py-8 text-center">Loading…</p>
      ) : records.length === 0 ? (
        <div className="bg-white border border-[#dfe7f1] rounded-xl py-16 text-center text-[13px] text-[#536173]">No sections yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {records.map((r) => {
            const enrolled = enrolledCount(r.data?.className, r.data?.sectionName);
            return (
              <div key={r._id} className="bg-white border border-[#dfe7f1] rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <span className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center flex-none"><Grid3x3 size={16} /></span>
                  <RowActions onEdit={() => setModal({ mode: 'edit', record: r })} onDelete={() => handleDelete(r._id)} />
                </div>
                <div className="text-[14px] font-semibold text-[#111827] mb-0.5">{r.data?.className} - {r.data?.sectionName}</div>
                <div className="text-xs text-[#94a3b8] mb-3">Teacher: {r.data?.classTeacher || '—'}</div>
                <UtilizationBar used={enrolled} total={Number(r.data?.capacity) || 0} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
