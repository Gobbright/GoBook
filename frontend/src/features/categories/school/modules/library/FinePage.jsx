import { useState } from 'react';

import { useModuleRecords, useLookupRecords, names } from '../../../shared/recordUi/useModuleRecords.js';
import { FormModal } from '../../../shared/recordUi/FormModal.jsx';
import { PageHeader } from '../../../shared/recordUi/PageHeader.jsx';
import { StatusBadge } from '../../../shared/recordUi/StatusBadge.jsx';
import { RowActions } from '../../../shared/recordUi/RowActions.jsx';

const TH = 'text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-4 py-3 border-b border-[#edf2f7]';
const TD = 'px-4 py-3 border-b border-[#f3f4f6] text-[13px]';

const FIELDS = [
  { key: 'studentName', label: 'Student Name', required: true, type: 'lookup', lookupModule: 'school/students' },
  { key: 'bookTitle', label: 'Book Title' },
  { key: 'amount', label: 'Amount', type: 'number', required: true },
  { key: 'status', label: 'Status', type: 'select', options: ['Pending', 'Paid'] },
];

function formatMoney(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

export function FinePage() {
  const { records, loading, create, update, remove, reload } = useModuleRecords('school/library/fine');
  const students = useLookupRecords('school/students');
  const [modal, setModal] = useState(null);

  const lookupOptions = { 'school/students': names(students.records) };

  const pendingTotal = records.filter((r) => r.data?.status !== 'Paid').reduce((s, r) => s + (Number(r.data?.amount) || 0), 0);

  async function handleSubmit(form) {
    if (modal.mode === 'edit') await update(modal.record._id, form);
    else await create(form);
    setModal(null);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this fine record?')) return;
    await remove(id);
  }

  return (
    <div className="p-4 md:p-7">
      <PageHeader title="Fine" group="Library" subtitle="Library fines" actionLabel="Add Fine" onAction={() => setModal({ mode: 'add' })} moduleKey="school/library/fine" fields={FIELDS} onImported={reload} />

      {modal && (
        <FormModal
          title={modal.mode === 'add' ? 'New Fine' : 'Edit Fine'}
          fields={FIELDS}
          initial={modal.mode === 'edit' ? modal.record.data : null}
          lookupOptions={lookupOptions}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
          submitLabel={modal.mode === 'add' ? 'Save' : 'Update'}
        />
      )}

      <div className="bg-white border border-[#dfe7f1] rounded-xl p-4 mb-5 flex items-center justify-between">
        <span className="text-[13px] font-medium text-[#374151]">Pending Fines</span>
        <span className="text-[22px] font-bold text-amber-600">{formatMoney(pendingTotal)}</span>
      </div>

      <div className="bg-white border border-[#dfe7f1] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={TH}>Student</th>
                <th className={TH}>Book</th>
                <th className={`${TH} text-right`}>Amount</th>
                <th className={TH}>Status</th>
                <th className={TH}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-[13px] text-[#536173]">Loading…</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-[13px] text-[#536173]">No fines recorded yet.</td></tr>
              ) : records.map((r) => (
                <tr key={r._id} className="hover:bg-gray-50">
                  <td className={`${TD} font-medium text-[#111827]`}>{r.data?.studentName}</td>
                  <td className={`${TD} text-[#536173]`}>{r.data?.bookTitle || '—'}</td>
                  <td className={`${TD} text-right font-semibold text-[#111827]`}>{formatMoney(r.data?.amount)}</td>
                  <td className={TD}><StatusBadge value={r.data?.status} /></td>
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
