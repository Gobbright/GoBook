import { useState } from 'react';
import { Contact } from 'lucide-react';

import { useModuleRecords, useLookupRecords, names } from '../../../shared/recordUi/useModuleRecords.js';
import { FormModal } from '../../../shared/recordUi/FormModal.jsx';
import { PageHeader } from '../../../shared/recordUi/PageHeader.jsx';
import { RowActions } from '../../../shared/recordUi/RowActions.jsx';

const RELATIONS = ['Father', 'Mother', 'Guardian'];
const RELATION_COLOR = { Father: 'bg-blue-100 text-blue-700', Mother: 'bg-pink-100 text-pink-700', Guardian: 'bg-purple-100 text-purple-700' };

const FIELDS = [
  { key: 'studentName', label: 'Student Name', required: true, type: 'lookup', lookupModule: 'school/students' },
  { key: 'parentName', label: 'Parent Name', required: true },
  { key: 'relation', label: 'Relation', type: 'select', options: RELATIONS },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
];

export function ParentDetailsPage() {
  const { records, loading, create, update, remove, reload } = useModuleRecords('school/parent-details');
  const students = useLookupRecords('school/students');
  const [modal, setModal] = useState(null);

  const lookupOptions = { 'school/students': names(students.records) };

  async function handleSubmit(form) {
    if (modal.mode === 'edit') await update(modal.record._id, form);
    else await create(form);
    setModal(null);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this contact?')) return;
    await remove(id);
  }

  return (
    <div className="p-4 md:p-7">
      <PageHeader title="Parent Details" group="Student Management" subtitle="Guardian & parent contacts" actionLabel="Add Contact" onAction={() => setModal({ mode: 'add' })} moduleKey="school/parent-details" fields={FIELDS} onImported={reload} />

      {modal && (
        <FormModal
          title={modal.mode === 'add' ? 'New Parent Contact' : 'Edit Parent Contact'}
          fields={FIELDS}
          initial={modal.mode === 'edit' ? modal.record.data : null}
          lookupOptions={lookupOptions}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
          submitLabel={modal.mode === 'add' ? 'Save Contact' : 'Update Contact'}
        />
      )}

      {loading ? (
        <p className="text-[13px] text-[#536173] px-5 py-8 text-center">Loading…</p>
      ) : records.length === 0 ? (
        <div className="bg-white border border-[#dfe7f1] rounded-xl py-16 text-center text-[13px] text-[#536173]">No contacts on file yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {records.map((r) => (
            <div key={r._id} className="bg-white border border-[#dfe7f1] rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center flex-none"><Contact size={16} /></span>
                  <div>
                    <div className="text-[13px] font-semibold text-[#111827]">{r.data?.parentName || 'Unnamed'}</div>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${RELATION_COLOR[r.data?.relation] || 'bg-gray-100 text-gray-600'}`}>{r.data?.relation || 'Relation'}</span>
                  </div>
                </div>
                <RowActions onEdit={() => setModal({ mode: 'edit', record: r })} onDelete={() => handleDelete(r._id)} />
              </div>
              <div className="text-xs text-[#94a3b8] mb-2">Student: {r.data?.studentName || '—'}</div>
              <div className="text-[12px] text-[#374151]">{r.data?.phone || 'No phone'}</div>
              <div className="text-[12px] text-[#374151]">{r.data?.email || 'No email'}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
