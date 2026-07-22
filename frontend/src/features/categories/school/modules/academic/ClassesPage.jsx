import { useState } from 'react';
import { BookOpen } from 'lucide-react';

import { useModuleRecords, useLookupRecords } from '../../../shared/recordUi/useModuleRecords.js';
import { FormModal } from '../../../shared/recordUi/FormModal.jsx';
import { PageHeader } from '../../../shared/recordUi/PageHeader.jsx';
import { RowActions } from '../../../shared/recordUi/RowActions.jsx';

const FIELDS = [
  { key: 'className', label: 'Class Name', required: true },
  { key: 'classTeacher', label: 'Class Teacher' },
  { key: 'totalStudents', label: 'Total Students', type: 'number' },
  { key: 'section', label: 'Section' },
];

export function ClassesPage() {
  const { records, loading, create, update, remove, reload } = useModuleRecords('school/classes');
  const students = useLookupRecords('school/students');
  const [modal, setModal] = useState(null);

  function enrolledCount(className) {
    return students.records.filter((r) => r.data?.className === className).length;
  }

  async function handleSubmit(form) {
    if (modal.mode === 'edit') await update(modal.record._id, form);
    else await create(form);
    setModal(null);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this class?')) return;
    await remove(id);
  }

  return (
    <div className="p-4 md:p-7">
      <PageHeader title="Classes" group="Academic" subtitle="Classes with live enrollment counts" actionLabel="Add Class" onAction={() => setModal({ mode: 'add' })} moduleKey="school/classes" fields={FIELDS} onImported={reload} />

      {modal && (
        <FormModal
          title={modal.mode === 'add' ? 'New Class' : 'Edit Class'}
          fields={FIELDS}
          initial={modal.mode === 'edit' ? modal.record.data : null}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
          submitLabel={modal.mode === 'add' ? 'Save Class' : 'Update Class'}
        />
      )}

      {loading ? (
        <p className="text-[13px] text-[#536173] px-5 py-8 text-center">Loading…</p>
      ) : records.length === 0 ? (
        <div className="bg-white border border-[#dfe7f1] rounded-xl py-16 text-center text-[13px] text-[#536173]">No classes yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {records.map((r) => (
            <div key={r._id} className="bg-white border border-[#dfe7f1] rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <span className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center flex-none"><BookOpen size={17} /></span>
                <RowActions onEdit={() => setModal({ mode: 'edit', record: r })} onDelete={() => handleDelete(r._id)} />
              </div>
              <div className="text-[14px] font-semibold text-[#111827] mb-0.5">{r.data?.className}{r.data?.section ? ` - ${r.data.section}` : ''}</div>
              <div className="text-xs text-[#94a3b8] mb-3">Teacher: {r.data?.classTeacher || '—'}</div>
              <div className="flex items-center justify-between pt-3 border-t border-[#f3f4f6]">
                <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 rounded-full px-2 py-0.5">{enrolledCount(r.data?.className)} enrolled</span>
                <span className="text-[11px] text-[#94a3b8]">Cap. {r.data?.totalStudents || '—'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
