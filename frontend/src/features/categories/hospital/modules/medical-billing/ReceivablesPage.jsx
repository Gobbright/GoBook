import { useMemo, useState } from 'react';

import { useModuleRecords, useLookupRecords, names } from '../../../shared/recordUi/useModuleRecords.js';
import { FormModal } from '../../../shared/recordUi/FormModal.jsx';
import { PageHeader } from '../../../shared/recordUi/PageHeader.jsx';
import { RowActions } from '../../../shared/recordUi/RowActions.jsx';
import { fmtDate, daysUntil } from '../../../shared/recordUi/dateUtils.js';

const FIELDS = [
  { key: 'patientName', label: 'Patient', required: true, type: 'lookup', lookupModule: 'hospital/patients' },
  { key: 'amountDue', label: 'Amount Due', type: 'number', required: true },
  { key: 'dueDate', label: 'Due Date', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: ['Pending', 'Overdue', 'Cleared'] },
];

const BUCKETS = [
  { key: 'current', label: 'Not Yet Due', test: (d) => d == null || d >= 0 },
  { key: 'b1', label: '1–30 Days Overdue', test: (d) => d != null && d < 0 && d >= -30 },
  { key: 'b2', label: '31–60 Days Overdue', test: (d) => d != null && d < -30 && d >= -60 },
  { key: 'b3', label: '60+ Days Overdue', test: (d) => d != null && d < -60 },
];

function formatMoney(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

export function ReceivablesPage() {
  const { records, loading, create, update, remove } = useModuleRecords('hospital/receivables');
  const patients = useLookupRecords('hospital/patients');
  const [modal, setModal] = useState(null);

  const lookupOptions = { 'hospital/patients': names(patients.records) };

  const outstanding = useMemo(() => records.filter((r) => r.data?.status !== 'Cleared'), [records]);

  const aging = useMemo(() => BUCKETS.map((b) => {
    const items = outstanding.filter((r) => b.test(daysUntil(r.data?.dueDate)));
    return { ...b, items, total: items.reduce((s, r) => s + (Number(r.data?.amountDue) || 0), 0) };
  }), [outstanding]);

  const totalOutstanding = aging.reduce((s, b) => s + b.total, 0);

  async function handleSubmit(form) {
    if (modal.mode === 'edit') await update(modal.record._id, form);
    else await create(form);
    setModal(null);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this receivable?')) return;
    await remove(id);
  }

  return (
    <div className="p-4 md:p-7">
      <PageHeader title="Receivables" group="Medical Billing" subtitle="Outstanding balances by aging bucket" actionLabel="Add Receivable" onAction={() => setModal({ mode: 'add' })} />

      {modal && (
        <FormModal
          title={modal.mode === 'add' ? 'New Receivable' : 'Edit Receivable'}
          fields={FIELDS}
          initial={modal.mode === 'edit' ? modal.record.data : null}
          lookupOptions={lookupOptions}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
          submitLabel={modal.mode === 'add' ? 'Save' : 'Update'}
        />
      )}

      <div className="bg-white border border-[#dfe7f1] rounded-xl p-4 mb-5 flex items-center justify-between">
        <span className="text-[13px] font-medium text-[#374151]">Total Outstanding</span>
        <span className="text-[22px] font-bold text-[#111827]">{formatMoney(totalOutstanding)}</span>
      </div>

      {loading ? (
        <p className="text-[13px] text-[#536173] px-5 py-8 text-center">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {aging.map((b) => (
            <div key={b.key} className="bg-white border border-[#dfe7f1] rounded-xl flex flex-col">
              <div className="px-4 py-3 border-b border-[#edf2f7]">
                <div className="text-[12px] font-semibold text-[#111827]">{b.label}</div>
                <div className="text-[16px] font-bold text-[#111827] mt-0.5">{formatMoney(b.total)}</div>
              </div>
              <div className="p-3 flex flex-col gap-2 flex-1">
                {b.items.length === 0 ? (
                  <p className="text-[12px] text-[#94a3b8] text-center py-6">None</p>
                ) : b.items.map((r) => (
                  <div key={r._id} className="bg-[#f8fafc] border border-[#e5edf7] rounded-lg p-2.5">
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-[12px] font-medium text-[#111827]">{r.data?.patientName || '—'}</span>
                      <RowActions onEdit={() => setModal({ mode: 'edit', record: r })} onDelete={() => handleDelete(r._id)} />
                    </div>
                    <div className="text-[11px] text-[#536173]">Due {fmtDate(r.data?.dueDate)}</div>
                    <div className="text-[13px] font-semibold text-[#111827] mt-1">{formatMoney(r.data?.amountDue)}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
