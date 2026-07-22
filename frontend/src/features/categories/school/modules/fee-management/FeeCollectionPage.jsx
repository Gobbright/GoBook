import { useMemo, useState } from 'react';

import { useModuleRecords, useLookupRecords, names } from '../../../shared/recordUi/useModuleRecords.js';
import { FormModal } from '../../../shared/recordUi/FormModal.jsx';
import { PageHeader } from '../../../shared/recordUi/PageHeader.jsx';
import { RowActions } from '../../../shared/recordUi/RowActions.jsx';
import { fmtDate } from '../../../shared/recordUi/dateUtils.js';

const TH = 'text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-4 py-3 border-b border-[#edf2f7]';
const TD = 'px-4 py-3 border-b border-[#f3f4f6] text-[13px]';

const FIELDS = [
  { key: 'studentName', label: 'Student Name', required: true, type: 'lookup', lookupModule: 'school/students' },
  { key: 'amount', label: 'Amount', type: 'number', required: true },
  { key: 'paymentDate', label: 'Payment Date', type: 'date' },
  { key: 'mode', label: 'Mode', type: 'select', options: ['Cash', 'Card', 'UPI', 'Bank Transfer'] },
];

function formatMoney(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

export function FeeCollectionPage() {
  const { records, loading, create, update, remove, reload } = useModuleRecords('school/fee-collection');
  const students = useLookupRecords('school/students');
  const [modal, setModal] = useState(null);

  const lookupOptions = { 'school/students': names(students.records) };

  const sorted = useMemo(() => [...records].sort((a, b) => (b.data?.paymentDate || '').localeCompare(a.data?.paymentDate || '')), [records]);

  let running = 0;
  const withRunning = sorted.slice().reverse().map((r) => {
    running += Number(r.data?.amount) || 0;
    return { ...r, running };
  }).reverse();

  const totalCollected = records.reduce((s, r) => s + (Number(r.data?.amount) || 0), 0);

  async function handleSubmit(form) {
    if (modal.mode === 'edit') await update(modal.record._id, form);
    else await create(form);
    setModal(null);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this payment record?')) return;
    await remove(id);
  }

  return (
    <div className="p-4 md:p-7">
      <PageHeader title="Fee Collection" group="Fee Management" subtitle="Payment ledger with running total" actionLabel="Add Payment" onAction={() => setModal({ mode: 'add' })} moduleKey="school/fee-collection" fields={FIELDS} onImported={reload} />

      {modal && (
        <FormModal
          title={modal.mode === 'add' ? 'New Fee Payment' : 'Edit Fee Payment'}
          fields={FIELDS}
          initial={modal.mode === 'edit' ? modal.record.data : null}
          lookupOptions={lookupOptions}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
          submitLabel={modal.mode === 'add' ? 'Save' : 'Update'}
        />
      )}

      <div className="bg-white border border-[#dfe7f1] rounded-xl p-4 mb-5 flex items-center justify-between">
        <span className="text-[13px] font-medium text-[#374151]">Total Collected</span>
        <span className="text-[22px] font-bold text-green-600">{formatMoney(totalCollected)}</span>
      </div>

      <div className="bg-white border border-[#dfe7f1] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={TH}>Date</th>
                <th className={TH}>Student</th>
                <th className={TH}>Mode</th>
                <th className={`${TH} text-right`}>Amount</th>
                <th className={`${TH} text-right`}>Running Total</th>
                <th className={TH}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-[13px] text-[#536173]">Loading…</td></tr>
              ) : withRunning.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-[13px] text-[#536173]">No payments recorded yet.</td></tr>
              ) : withRunning.map((r) => (
                <tr key={r._id}>
                  <td className={`${TD} whitespace-nowrap`}>{fmtDate(r.data?.paymentDate)}</td>
                  <td className={`${TD} font-medium text-[#111827]`}>{r.data?.studentName || '—'}</td>
                  <td className={`${TD} text-[#536173]`}>{r.data?.mode || '—'}</td>
                  <td className={`${TD} text-right font-medium text-[#111827]`}>{formatMoney(r.data?.amount)}</td>
                  <td className={`${TD} text-right text-[#536173]`}>{formatMoney(r.running)}</td>
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
