import { useState } from 'react';
import { BookOpenCheck, BookUp } from 'lucide-react';

import { useModuleRecords, useLookupRecords, names } from '../../../shared/recordUi/useModuleRecords.js';
import { FormModal } from '../../../shared/recordUi/FormModal.jsx';
import { PageHeader } from '../../../shared/recordUi/PageHeader.jsx';
import { RowActions } from '../../../shared/recordUi/RowActions.jsx';
import { fmtDate, daysUntil } from '../../../shared/recordUi/dateUtils.js';

const FIELDS = [
  { key: 'bookTitle', label: 'Book Title', required: true, type: 'lookup', lookupModule: 'school/library/books' },
  { key: 'studentName', label: 'Student Name', type: 'lookup', lookupModule: 'school/students' },
  { key: 'issueDate', label: 'Issue Date', type: 'date' },
  { key: 'returnDate', label: 'Return Date (due)', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: ['Issued', 'Returned'] },
];

export function IssueReturnPage() {
  const { records, loading, create, update, remove, reload } = useModuleRecords('school/library/issue-return');
  const books = useLookupRecords('school/library/books');
  const students = useLookupRecords('school/students');
  const [modal, setModal] = useState(null);

  const bookTitles = [...new Set(books.records.map((r) => r.data?.title).filter(Boolean))].sort();
  const lookupOptions = {
    'school/library/books': bookTitles,
    'school/students': names(students.records),
  };

  async function handleSubmit(form) {
    if (modal.mode === 'edit') await update(modal.record._id, form);
    else await create(form);
    setModal(null);
  }

  async function markReturned(r) {
    await update(r._id, { ...r.data, status: 'Returned' });
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this issue/return entry?')) return;
    await remove(id);
  }

  const sorted = [...records].sort((a, b) => (b.data?.issueDate || '').localeCompare(a.data?.issueDate || ''));

  return (
    <div className="p-4 md:p-7">
      <PageHeader title="Issue / Return" group="Library" subtitle="Issued books — overdue returns flagged" actionLabel="Issue Book" onAction={() => setModal({ mode: 'add' })} moduleKey="school/library/issue-return" fields={FIELDS} onImported={reload} />

      {modal && (
        <FormModal
          title={modal.mode === 'add' ? 'New Issue' : 'Edit Issue / Return'}
          fields={FIELDS}
          initial={modal.mode === 'edit' ? modal.record.data : null}
          lookupOptions={lookupOptions}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
          submitLabel={modal.mode === 'add' ? 'Save' : 'Update'}
        />
      )}

      <div className="bg-white border border-[#dfe7f1] rounded-xl">
        {loading ? (
          <p className="text-[13px] text-[#536173] px-5 py-8 text-center">Loading…</p>
        ) : sorted.length === 0 ? (
          <p className="text-[13px] text-[#536173] px-5 py-8 text-center">No books issued yet.</p>
        ) : (
          <div className="divide-y divide-[#f3f4f6]">
            {sorted.map((r) => {
              const overdue = r.data?.status === 'Issued' && daysUntil(r.data?.returnDate) != null && daysUntil(r.data?.returnDate) < 0;
              const Icon = r.data?.status === 'Returned' ? BookUp : BookOpenCheck;
              return (
                <div key={r._id} className="flex items-center gap-3 px-5 py-3.5">
                  <button
                    type="button"
                    onClick={() => r.data?.status === 'Issued' && markReturned(r)}
                    title={r.data?.status === 'Issued' ? 'Click to mark returned' : 'Returned'}
                    className={`bg-transparent border-0 p-0 ${r.data?.status === 'Issued' ? 'cursor-pointer text-amber-500' : 'cursor-default text-green-600'}`}
                  >
                    <Icon size={19} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className={`text-[13px] font-medium ${r.data?.status === 'Returned' ? 'text-[#94a3b8] line-through' : 'text-[#111827]'}`}>{r.data?.bookTitle || 'Untitled'}</div>
                    <div className="text-xs text-[#94a3b8]">{r.data?.studentName || 'Unassigned'} · Issued {fmtDate(r.data?.issueDate)}</div>
                  </div>
                  <div className={`text-[12px] font-medium ${overdue ? 'text-red-600' : 'text-[#536173]'}`}>
                    {r.data?.status === 'Returned' ? 'Returned' : overdue ? `Overdue since ${fmtDate(r.data?.returnDate)}` : `Due ${fmtDate(r.data?.returnDate)}`}
                  </div>
                  <RowActions onEdit={() => setModal({ mode: 'edit', record: r })} onDelete={() => handleDelete(r._id)} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
