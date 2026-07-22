import { useMemo, useState } from 'react';
import { Receipt } from 'lucide-react';

import { useModuleRecords, useLookupRecords, names } from '../../../shared/recordUi/useModuleRecords.js';
import { FormModal } from '../../../shared/recordUi/FormModal.jsx';
import { PageHeader } from '../../../shared/recordUi/PageHeader.jsx';
import { StatusBadge } from '../../../shared/recordUi/StatusBadge.jsx';
import { RowActions } from '../../../shared/recordUi/RowActions.jsx';
import { fmtDate } from '../../../shared/recordUi/dateUtils.js';

const FIELDS = [
  { key: 'patientName', label: 'Patient', required: true, type: 'lookup', lookupModule: 'hospital/patients' },
  { key: 'billDate', label: 'Bill Date', type: 'date' },
  { key: 'services', label: 'Services / Description', type: 'textarea', full: true },
  { key: 'amount', label: 'Amount', type: 'number', required: true },
  { key: 'paymentMethod', label: 'Payment Method', type: 'select', options: ['Cash', 'Card', 'UPI', 'Insurance'] },
  { key: 'status', label: 'Status', type: 'select', options: ['Paid', 'Pending', 'Partial'] },
];

function formatMoney(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

export function MedicalBillsPage() {
  const { records, loading, create, update, remove } = useModuleRecords('hospital/medical-bills');
  const patients = useLookupRecords('hospital/patients');
  const [modal, setModal] = useState(null);
  const [viewing, setViewing] = useState(null);

  const lookupOptions = { 'hospital/patients': names(patients.records) };

  const totals = useMemo(() => {
    const total = records.reduce((s, r) => s + (Number(r.data?.amount) || 0), 0);
    const paid = records.filter((r) => r.data?.status === 'Paid').reduce((s, r) => s + (Number(r.data?.amount) || 0), 0);
    return { total, paid, outstanding: total - paid };
  }, [records]);

  async function handleSubmit(form) {
    if (modal.mode === 'edit') await update(modal.record._id, form);
    else await create(form);
    setModal(null);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this bill?')) return;
    await remove(id);
  }

  return (
    <div className="p-4 md:p-7">
      <PageHeader title="Medical Bills" group="Medical Billing" subtitle="Patient invoices" actionLabel="Add Bill" onAction={() => setModal({ mode: 'add' })} />

      {modal && (
        <FormModal
          title={modal.mode === 'add' ? 'New Medical Bill' : 'Edit Medical Bill'}
          fields={FIELDS}
          initial={modal.mode === 'edit' ? modal.record.data : null}
          lookupOptions={lookupOptions}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
          submitLabel={modal.mode === 'add' ? 'Save Bill' : 'Update Bill'}
        />
      )}

      {viewing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && setViewing(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-130 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-[#edf2f7] flex items-center justify-between bg-[#0f172a] text-white rounded-t-xl">
              <div>
                <div className="text-xs text-blue-200 uppercase tracking-wide">Medical Bill</div>
                <h2 className="m-0 text-[18px] font-bold mt-0.5">{viewing.data?.patientName}</h2>
              </div>
              <button type="button" onClick={() => setViewing(null)} className="text-blue-200 hover:text-white bg-transparent border-0 cursor-pointer text-lg leading-none font-[inherit]">✕</button>
            </div>
            <div className="px-6 py-5">
              <div className="flex justify-between text-[13px] text-[#536173] mb-4">
                <span>Bill Date: <strong className="text-[#111827]">{fmtDate(viewing.data?.billDate)}</strong></span>
                <StatusBadge value={viewing.data?.status} />
              </div>
              <div className="border border-[#e5e7eb] rounded-lg p-4 mb-4">
                <div className="text-xs text-[#94a3b8] uppercase tracking-wide mb-1.5">Services</div>
                <p className="text-[13px] text-[#374151] whitespace-pre-wrap m-0">{viewing.data?.services || 'No services listed.'}</p>
              </div>
              <div className="flex items-center justify-between border-t border-[#e5e7eb] pt-4">
                <span className="text-[13px] text-[#536173]">Paid via {viewing.data?.paymentMethod || '—'}</span>
                <span className="text-[20px] font-bold text-[#111827]">{formatMoney(viewing.data?.amount)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        {[
          ['Total Billed', totals.total, 'blue'],
          ['Collected', totals.paid, 'green'],
          ['Outstanding', totals.outstanding, 'amber'],
        ].map(([label, value, color]) => (
          <div key={label} className="bg-white border border-[#dfe7f1] rounded-xl p-4">
            <div className="text-xs text-[#94a3b8] uppercase tracking-wide mb-1">{label}</div>
            <div className={`text-[20px] font-bold ${color === 'blue' ? 'text-blue-600' : color === 'green' ? 'text-green-600' : 'text-amber-600'}`}>{formatMoney(value)}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <p className="text-[13px] text-[#536173] px-5 py-8 text-center">Loading…</p>
      ) : records.length === 0 ? (
        <div className="bg-white border border-[#dfe7f1] rounded-xl py-16 text-center text-[13px] text-[#536173]">No bills yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {records.map((r) => (
            <div key={r._id} className="bg-white border border-[#dfe7f1] rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Receipt size={15} className="text-blue-500" />
                  <span className="text-[13px] font-semibold text-[#111827]">{r.data?.patientName || 'Unnamed patient'}</span>
                </div>
                <RowActions onEdit={() => setModal({ mode: 'edit', record: r })} onDelete={() => handleDelete(r._id)} />
              </div>
              <div className="text-xs text-[#94a3b8] mb-3">{fmtDate(r.data?.billDate)}</div>
              <div className="flex items-center justify-between pt-2 border-t border-[#f3f4f6]">
                <span className="text-[16px] font-bold text-[#111827]">{formatMoney(r.data?.amount)}</span>
                <StatusBadge value={r.data?.status} />
              </div>
              <button type="button" onClick={() => setViewing(r)} className="text-[12px] text-blue-600 bg-transparent border-0 cursor-pointer font-[inherit] hover:underline mt-2">View Invoice →</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
