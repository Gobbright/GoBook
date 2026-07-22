import { useState } from 'react';

import { useModuleRecords, useLookupRecords, names } from '../../../shared/recordUi/useModuleRecords.js';
import { FormModal } from '../../../shared/recordUi/FormModal.jsx';
import { PageHeader } from '../../../shared/recordUi/PageHeader.jsx';
import { RowActions } from '../../../shared/recordUi/RowActions.jsx';
import { fmtDate } from '../../../shared/recordUi/dateUtils.js';

const TH = 'text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-5 py-3 border-b border-[#edf2f7]';
const TD = 'px-5 py-3.5 border-b border-[#f3f4f6] text-[13px]';

const FIELDS = [
  { key: 'className', label: 'Class', required: true, type: 'lookup', lookupModule: 'school/classes' },
  { key: 'feeType', label: 'Fee Type', required: true },
  { key: 'amount', label: 'Amount', type: 'number', required: true },
  { key: 'dueDate', label: 'Due Date', type: 'date' },
];

function formatMoney(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

export function FeeStructurePage() {
  const { records, loading, create, update, remove, reload } = useModuleRecords('school/fee-structure');
  const classes = useLookupRecords('school/classes');
  const [modal, setModal] = useState(null);

  const lookupOptions = { 'school/classes': names(classes.records) };

  async function handleSubmit(form) {
    if (modal.mode === 'edit') await update(modal.record._id, form);
    else await create(form);
    setModal(null);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this fee structure entry?')) return;
    await remove(id);
  }

  return (
    <div className="p-4 md:p-7">
      <PageHeader title="Fee Structure" group="Fee Management" subtitle="Fee amounts by class" actionLabel="Add Fee Structure" onAction={() => setModal({ mode: 'add' })} moduleKey="school/fee-structure" fields={FIELDS} onImported={reload} />

      {modal && (
        <FormModal
          title={modal.mode === 'add' ? 'New Fee Structure' : 'Edit Fee Structure'}
          fields={FIELDS}
          initial={modal.mode === 'edit' ? modal.record.data : null}
          lookupOptions={lookupOptions}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
          submitLabel={modal.mode === 'add' ? 'Save' : 'Update'}
        />
      )}

      <div className="bg-white border border-[#dfe7f1] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={TH}>Class</th>
                <th className={TH}>Fee Type</th>
                <th className={`${TH} text-right`}>Amount</th>
                <th className={TH}>Due Date</th>
                <th className={TH}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-[13px] text-[#536173]">Loading…</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-[13px] text-[#536173]">No fee structures defined yet.</td></tr>
              ) : records.map((r) => (
                <tr key={r._id} className="hover:bg-gray-50">
                  <td className={`${TD} font-medium text-[#111827]`}>{r.data?.className}</td>
                  <td className={`${TD} text-[#536173]`}>{r.data?.feeType || '—'}</td>
                  <td className={`${TD} text-right font-semibold text-[#111827]`}>{formatMoney(r.data?.amount)}</td>
                  <td className={`${TD} text-[#536173]`}>{fmtDate(r.data?.dueDate)}</td>
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
