import { useState } from 'react';
import { Receipt } from 'lucide-react';

import { useModuleRecords, useLookupRecords, names } from '../../../shared/recordUi/useModuleRecords.js';
import { FormModal } from '../../../shared/recordUi/FormModal.jsx';
import { PageHeader } from '../../../shared/recordUi/PageHeader.jsx';
import { RowActions } from '../../../shared/recordUi/RowActions.jsx';
import { fmtDate } from '../../../shared/recordUi/dateUtils.js';

const FIELDS = [
  { key: 'studentName', label: 'Student Name', required: true, type: 'lookup', lookupModule: 'school/students' },
  { key: 'receiptNumber', label: 'Receipt Number', required: true },
  { key: 'amount', label: 'Amount', type: 'number', required: true },
  { key: 'date', label: 'Date', type: 'date' },
];

function formatMoney(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

export function FeeReceiptPage() {
  const { records, loading, create, update, remove, reload } = useModuleRecords('school/fee-receipt');
  const students = useLookupRecords('school/students');
  const [modal, setModal] = useState(null);
  const [viewing, setViewing] = useState(null);

  const lookupOptions = { 'school/students': names(students.records) };

  async function handleSubmit(form) {
    if (modal.mode === 'edit') await update(modal.record._id, form);
    else await create(form);
    setModal(null);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this receipt?')) return;
    await remove(id);
  }

  return (
    <div className="p-4 md:p-7">
      <PageHeader title="Fee Receipt" group="Fee Management" subtitle="Payment receipts" actionLabel="Add Receipt" onAction={() => setModal({ mode: 'add' })} moduleKey="school/fee-receipt" fields={FIELDS} onImported={reload} />

      {modal && (
        <FormModal
          title={modal.mode === 'add' ? 'New Fee Receipt' : 'Edit Fee Receipt'}
          fields={FIELDS}
          initial={modal.mode === 'edit' ? modal.record.data : null}
          lookupOptions={lookupOptions}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
          submitLabel={modal.mode === 'add' ? 'Save' : 'Update'}
        />
      )}

      {viewing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && setViewing(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-110 overflow-hidden">
            <div className="px-6 py-5 bg-[#0f172a] text-white flex items-center justify-between">
              <div>
                <div className="text-xs text-blue-200 uppercase tracking-wide">Fee Receipt</div>
                <div className="text-[18px] font-bold mt-0.5">#{viewing.data?.receiptNumber}</div>
              </div>
              <button type="button" onClick={() => setViewing(null)} className="text-blue-200 hover:text-white bg-transparent border-0 cursor-pointer text-lg leading-none font-[inherit]">✕</button>
            </div>
            <div className="px-6 py-5">
              <div className="flex justify-between text-[13px] text-[#536173] mb-4">
                <span>Received from: <strong className="text-[#111827]">{viewing.data?.studentName}</strong></span>
                <span>{fmtDate(viewing.data?.date)}</span>
              </div>
              <div className="border-t border-dashed border-[#dbe4ef] pt-4 flex items-center justify-between">
                <span className="text-[13px] text-[#536173]">Amount Paid</span>
                <span className="text-[24px] font-bold text-[#111827]">{formatMoney(viewing.data?.amount)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-[13px] text-[#536173] px-5 py-8 text-center">Loading…</p>
      ) : records.length === 0 ? (
        <div className="bg-white border border-[#dfe7f1] rounded-xl py-16 text-center text-[13px] text-[#536173]">No receipts yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {records.map((r) => (
            <div key={r._id} className="bg-white border border-[#dfe7f1] rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Receipt size={15} className="text-blue-500" />
                  <span className="text-[13px] font-semibold text-[#111827] font-mono">#{r.data?.receiptNumber || '—'}</span>
                </div>
                <RowActions onEdit={() => setModal({ mode: 'edit', record: r })} onDelete={() => handleDelete(r._id)} />
              </div>
              <div className="text-[13px] text-[#111827] font-medium mb-0.5">{r.data?.studentName || 'Unnamed student'}</div>
              <div className="text-xs text-[#94a3b8] mb-3">{fmtDate(r.data?.date)}</div>
              <div className="flex items-center justify-between pt-2 border-t border-[#f3f4f6]">
                <span className="text-[16px] font-bold text-[#111827]">{formatMoney(r.data?.amount)}</span>
                <button type="button" onClick={() => setViewing(r)} className="text-[12px] text-blue-600 bg-transparent border-0 cursor-pointer font-[inherit] hover:underline">View →</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
