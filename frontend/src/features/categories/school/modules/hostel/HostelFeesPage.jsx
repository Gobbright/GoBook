import { useState } from 'react';

import { useModuleRecords, useLookupRecords, names } from '../../../shared/recordUi/useModuleRecords.js';
import { FormModal } from '../../../shared/recordUi/FormModal.jsx';
import { PageHeader } from '../../../shared/recordUi/PageHeader.jsx';
import { StatusBadge } from '../../../shared/recordUi/StatusBadge.jsx';
import { RowActions } from '../../../shared/recordUi/RowActions.jsx';
import { fmtDate } from '../../../shared/recordUi/dateUtils.js';

const TH = 'text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-4 py-3 border-b border-[#edf2f7]';
const TD = 'px-4 py-3 border-b border-[#f3f4f6] text-[13px]';

const FIELDS = [
  { key: 'studentName', label: 'Student Name', required: true, type: 'lookup', lookupModule: 'school/students' },
  { key: 'amount', label: 'Amount', type: 'number', required: true },
  { key: 'dueDate', label: 'Due Date', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: ['Paid', 'Pending'] },
];

function formatMoney(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

export function HostelFeesPage() {
  const { records, loading, create, update, remove, reload } = useModuleRecords('school/hostel/fees');
  const students = useLookupRecords('school/students');
  const [modal, setModal] = useState(null);

  const lookupOptions = { 'school/students': names(students.records) };

  const collected = records.filter((r) => r.data?.status === 'Paid').reduce((s, r) => s + (Number(r.data?.amount) || 0), 0);
  const pending = records.filter((r) => r.data?.status !== 'Paid').reduce((s, r) => s + (Number(r.data?.amount) || 0), 0);

  async function handleSubmit(form) {
    if (modal.mode === 'edit') await update(modal.record._id, form);
    else await create(form);
    setModal(null);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this hostel fee record?')) return;
    await remove(id);
  }

  return (
    <div className="p-4 md:p-7">
      <PageHeader title="Hostel Fees" group="Hostel" subtitle="Hostel fee status" actionLabel="Add Fee" onAction={() => setModal({ mode: 'add' })} moduleKey="school/hostel/fees" fields={FIELDS} onImported={reload} />

      {modal && (
        <FormModal
          title={modal.mode === 'add' ? 'New Hostel Fee' : 'Edit Hostel Fee'}
          fields={FIELDS}
          initial={modal.mode === 'edit' ? modal.record.data : null}
          lookupOptions={lookupOptions}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
          submitLabel={modal.mode === 'add' ? 'Save' : 'Update'}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <div className="bg-white border border-[#dfe7f1] rounded-xl p-4">
          <div className="text-xs text-[#94a3b8] uppercase tracking-wide mb-1">Collected</div>
          <div className="text-[20px] font-bold text-green-600">{formatMoney(collected)}</div>
        </div>
        <div className="bg-white border border-[#dfe7f1] rounded-xl p-4">
          <div className="text-xs text-[#94a3b8] uppercase tracking-wide mb-1">Pending</div>
          <div className="text-[20px] font-bold text-amber-600">{formatMoney(pending)}</div>
        </div>
      </div>

      <div className="bg-white border border-[#dfe7f1] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={TH}>Student</th>
                <th className={`${TH} text-right`}>Amount</th>
                <th className={TH}>Due Date</th>
                <th className={TH}>Status</th>
                <th className={TH}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-[13px] text-[#536173]">Loading…</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-[13px] text-[#536173]">No hostel fees recorded yet.</td></tr>
              ) : records.map((r) => (
                <tr key={r._id} className="hover:bg-gray-50">
                  <td className={`${TD} font-medium text-[#111827]`}>{r.data?.studentName}</td>
                  <td className={`${TD} text-right font-semibold text-[#111827]`}>{formatMoney(r.data?.amount)}</td>
                  <td className={`${TD} text-[#536173]`}>{fmtDate(r.data?.dueDate)}</td>
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
