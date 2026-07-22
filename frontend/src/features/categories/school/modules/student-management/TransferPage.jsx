import { useState } from 'react';
import { ArrowRight } from 'lucide-react';

import { useModuleRecords, useLookupRecords, names } from '../../../shared/recordUi/useModuleRecords.js';
import { FormModal } from '../../../shared/recordUi/FormModal.jsx';
import { PageHeader } from '../../../shared/recordUi/PageHeader.jsx';
import { RowActions } from '../../../shared/recordUi/RowActions.jsx';
import { fmtDate } from '../../../shared/recordUi/dateUtils.js';

const FIELDS = [
  { key: 'studentName', label: 'Student Name', required: true, type: 'lookup', lookupModule: 'school/students' },
  { key: 'fromClass', label: 'From Class', required: true },
  { key: 'toClass', label: 'To Class', required: true },
  { key: 'transferDate', label: 'Transfer Date', type: 'date' },
  { key: 'reason', label: 'Reason', type: 'textarea', full: true },
];

export function TransferPage() {
  const { records, loading, create, update, remove, reload } = useModuleRecords('school/transfer');
  const students = useLookupRecords('school/students');
  const [modal, setModal] = useState(null);

  const lookupOptions = { 'school/students': names(students.records) };

  const sorted = [...records].sort((a, b) => (b.data?.transferDate || '').localeCompare(a.data?.transferDate || ''));

  async function handleSubmit(form) {
    if (modal.mode === 'edit') await update(modal.record._id, form);
    else await create(form);
    setModal(null);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this transfer record?')) return;
    await remove(id);
  }

  return (
    <div className="p-4 md:p-7">
      <PageHeader title="Transfer" group="Student Management" subtitle="Class transfer log" actionLabel="Add Transfer" onAction={() => setModal({ mode: 'add' })} moduleKey="school/transfer" fields={FIELDS} onImported={reload} />

      {modal && (
        <FormModal
          title={modal.mode === 'add' ? 'New Transfer' : 'Edit Transfer'}
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
      ) : sorted.length === 0 ? (
        <div className="bg-white border border-[#dfe7f1] rounded-xl py-16 text-center text-[13px] text-[#536173]">No transfer records yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sorted.map((r) => (
            <div key={r._id} className="bg-white border border-[#dfe7f1] rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <span className="text-[13px] font-semibold text-[#111827]">{r.data?.studentName || 'Unnamed student'}</span>
                <RowActions onEdit={() => setModal({ mode: 'edit', record: r })} onDelete={() => handleDelete(r._id)} />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[13px] font-medium text-[#536173] bg-[#f3f4f6] rounded px-2 py-1">{r.data?.fromClass || '—'}</span>
                <ArrowRight size={14} className="text-blue-500 flex-none" />
                <span className="text-[13px] font-medium text-blue-700 bg-blue-50 rounded px-2 py-1">{r.data?.toClass || '—'}</span>
              </div>
              <div className="text-xs text-[#94a3b8] mb-1.5">{fmtDate(r.data?.transferDate)}</div>
              {r.data?.reason && <p className="text-[12px] text-[#374151] m-0">{r.data.reason}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
