import { useState } from 'react';
import { Award } from 'lucide-react';

import { useModuleRecords, useLookupRecords, names } from '../../../shared/recordUi/useModuleRecords.js';
import { FormModal } from '../../../shared/recordUi/FormModal.jsx';
import { PageHeader } from '../../../shared/recordUi/PageHeader.jsx';
import { StatusBadge } from '../../../shared/recordUi/StatusBadge.jsx';
import { RowActions } from '../../../shared/recordUi/RowActions.jsx';
import { fmtDate } from '../../../shared/recordUi/dateUtils.js';

const FIELDS = [
  { key: 'studentName', label: 'Student Name', required: true, type: 'lookup', lookupModule: 'school/students' },
  { key: 'certificateType', label: 'Certificate Type', required: true },
  { key: 'issueDate', label: 'Issue Date', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: ['Issued', 'Pending'] },
];

export function CertificatesPage() {
  const { records, loading, create, update, remove, reload } = useModuleRecords('school/certificates');
  const students = useLookupRecords('school/students');
  const [modal, setModal] = useState(null);

  const lookupOptions = { 'school/students': names(students.records) };

  async function handleSubmit(form) {
    if (modal.mode === 'edit') await update(modal.record._id, form);
    else await create(form);
    setModal(null);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this certificate record?')) return;
    await remove(id);
  }

  return (
    <div className="p-4 md:p-7">
      <PageHeader title="Certificates" group="Student Management" subtitle="Issued & pending certificates" actionLabel="Add Certificate" onAction={() => setModal({ mode: 'add' })} moduleKey="school/certificates" fields={FIELDS} onImported={reload} />

      {modal && (
        <FormModal
          title={modal.mode === 'add' ? 'New Certificate' : 'Edit Certificate'}
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
      ) : records.length === 0 ? (
        <div className="bg-white border border-[#dfe7f1] rounded-xl py-16 text-center text-[13px] text-[#536173]">No certificates yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {records.map((r) => (
            <div key={r._id} className="bg-white border-2 border-dashed border-amber-200 rounded-xl p-4 relative">
              <div className="flex items-start justify-between mb-2">
                <span className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center flex-none"><Award size={18} /></span>
                <RowActions onEdit={() => setModal({ mode: 'edit', record: r })} onDelete={() => handleDelete(r._id)} />
              </div>
              <div className="text-[14px] font-semibold text-[#111827]">{r.data?.certificateType || 'Certificate'}</div>
              <div className="text-xs text-[#94a3b8] mb-3">{r.data?.studentName || 'Unnamed student'}</div>
              <div className="flex items-center justify-between pt-2 border-t border-dashed border-amber-200">
                <span className="text-[11px] text-[#94a3b8]">{fmtDate(r.data?.issueDate)}</span>
                <StatusBadge value={r.data?.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
