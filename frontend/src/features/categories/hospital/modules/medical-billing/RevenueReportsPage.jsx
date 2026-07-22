import { useMemo, useState } from 'react';

import { useModuleRecords, useLookupRecords, names } from '../../../shared/recordUi/useModuleRecords.js';
import { FormModal } from '../../../shared/recordUi/FormModal.jsx';
import { PageHeader } from '../../../shared/recordUi/PageHeader.jsx';
import { RowActions } from '../../../shared/recordUi/RowActions.jsx';
import { LineChart } from '../../../../../components/charts/LineChart.jsx';

const FIELDS = [
  { key: 'period', label: 'Period', required: true },
  { key: 'departmentName', label: 'Department', type: 'lookup', lookupModule: 'hospital/departments' },
  { key: 'totalRevenue', label: 'Total Revenue', type: 'number', required: true },
  { key: 'totalBills', label: 'Total Bills', type: 'number' },
  { key: 'notes', label: 'Notes', type: 'textarea', full: true },
];

function formatMoney(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

export function RevenueReportsPage() {
  const { records, loading, create, update, remove } = useModuleRecords('hospital/revenue-reports');
  const departments = useLookupRecords('hospital/departments');
  const [modal, setModal] = useState(null);

  const lookupOptions = { 'hospital/departments': names(departments.records) };

  const chartData = useMemo(() =>
    [...records]
      .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))
      .map((r) => ({ label: r.data?.period || '—', total: Number(r.data?.totalRevenue) || 0 })),
  [records]);

  const totals = useMemo(() => {
    const revenue = records.reduce((s, r) => s + (Number(r.data?.totalRevenue) || 0), 0);
    const bills = records.reduce((s, r) => s + (Number(r.data?.totalBills) || 0), 0);
    const avgPerBill = bills > 0 ? revenue / bills : 0;
    return { revenue, bills, avgPerBill };
  }, [records]);

  async function handleSubmit(form) {
    if (modal.mode === 'edit') await update(modal.record._id, form);
    else await create(form);
    setModal(null);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this revenue report entry?')) return;
    await remove(id);
  }

  return (
    <div className="p-4 md:p-7">
      <PageHeader title="Revenue Reports" group="Medical Billing" subtitle="Revenue trend by period" actionLabel="Add Period" onAction={() => setModal({ mode: 'add' })} />

      {modal && (
        <FormModal
          title={modal.mode === 'add' ? 'New Revenue Report' : 'Edit Revenue Report'}
          fields={FIELDS}
          initial={modal.mode === 'edit' ? modal.record.data : null}
          lookupOptions={lookupOptions}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
          submitLabel={modal.mode === 'add' ? 'Save' : 'Update'}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        {[
          ['Total Revenue', formatMoney(totals.revenue)],
          ['Total Bills', totals.bills.toLocaleString('en-IN')],
          ['Avg. Revenue / Bill', formatMoney(totals.avgPerBill)],
        ].map(([label, value]) => (
          <div key={label} className="bg-white border border-[#dfe7f1] rounded-xl p-4">
            <div className="text-xs text-[#94a3b8] uppercase tracking-wide mb-1">{label}</div>
            <div className="text-[20px] font-bold text-[#111827]">{value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-[#dfe7f1] rounded-xl p-4 mb-5">
        <h2 className="m-0 text-[14px] font-semibold text-[#111827] mb-3">Revenue by Period</h2>
        <LineChart data={chartData} />
      </div>

      <div className="bg-white border border-[#dfe7f1] rounded-xl">
        {loading ? (
          <p className="text-[13px] text-[#536173] px-5 py-8 text-center">Loading…</p>
        ) : records.length === 0 ? (
          <p className="text-[13px] text-[#536173] px-5 py-8 text-center">No revenue periods logged yet.</p>
        ) : (
          <div className="divide-y divide-[#f3f4f6]">
            {records.map((r) => (
              <div key={r._id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-[#111827]">{r.data?.period}</div>
                  <div className="text-xs text-[#94a3b8]">{r.data?.departmentName || 'All departments'} · {r.data?.totalBills || 0} bills</div>
                  {r.data?.notes && <p className="text-[12px] text-[#536173] mt-1">{r.data.notes}</p>}
                </div>
                <div className="text-[15px] font-bold text-[#111827]">{formatMoney(r.data?.totalRevenue)}</div>
                <RowActions onEdit={() => setModal({ mode: 'edit', record: r })} onDelete={() => handleDelete(r._id)} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
