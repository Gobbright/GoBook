import { useState } from 'react';

import { useModuleRecords, useLookupRecords, names } from '../../../shared/recordUi/useModuleRecords.js';
import { FormModal } from '../../../shared/recordUi/FormModal.jsx';
import { PageHeader } from '../../../shared/recordUi/PageHeader.jsx';
import { RowActions } from '../../../shared/recordUi/RowActions.jsx';

const TH = 'text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-5 py-3 border-b border-[#edf2f7]';
const TD = 'px-5 py-3.5 border-b border-[#f3f4f6] text-[13px]';

const FIELDS = [
  { key: 'subjectName', label: 'Subject Name', required: true },
  { key: 'className', label: 'Class', type: 'lookup', lookupModule: 'school/classes' },
  { key: 'teacherName', label: 'Teacher' },
  { key: 'subjectCode', label: 'Subject Code' },
];

export function SubjectsPage() {
  const { records, loading, create, update, remove, reload } = useModuleRecords('school/subjects');
  const classes = useLookupRecords('school/classes');
  const [modal, setModal] = useState(null);

  const lookupOptions = { 'school/classes': names(classes.records) };

  async function handleSubmit(form) {
    if (modal.mode === 'edit') await update(modal.record._id, form);
    else await create(form);
    setModal(null);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this subject?')) return;
    await remove(id);
  }

  return (
    <div className="p-4 md:p-7">
      <PageHeader title="Subjects" group="Academic" subtitle="Subject directory" actionLabel="Add Subject" onAction={() => setModal({ mode: 'add' })} moduleKey="school/subjects" fields={FIELDS} onImported={reload} />

      {modal && (
        <FormModal
          title={modal.mode === 'add' ? 'New Subject' : 'Edit Subject'}
          fields={FIELDS}
          initial={modal.mode === 'edit' ? modal.record.data : null}
          lookupOptions={lookupOptions}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
          submitLabel={modal.mode === 'add' ? 'Save Subject' : 'Update Subject'}
        />
      )}

      <div className="bg-white border border-[#dfe7f1] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={TH}>Subject Name</th>
                <th className={TH}>Class</th>
                <th className={TH}>Teacher</th>
                <th className={TH}>Code</th>
                <th className={TH}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-[13px] text-[#536173]">Loading…</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-[13px] text-[#536173]">No subjects found</td></tr>
              ) : records.map((r) => (
                <tr key={r._id} className="hover:bg-gray-50">
                  <td className={`${TD} font-medium text-[#111827]`}>{r.data?.subjectName}</td>
                  <td className={`${TD} text-[#536173]`}>{r.data?.className || '—'}</td>
                  <td className={`${TD} text-[#536173]`}>{r.data?.teacherName || '—'}</td>
                  <td className={`${TD} text-[#536173] font-mono`}>{r.data?.subjectCode || '—'}</td>
                  <td className={TD}><RowActions onEdit={() => setModal({ mode: 'edit', record: r })} onDelete={() => handleDelete(r._id)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
