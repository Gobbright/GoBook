import { useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

import { useModuleRecords, useLookupRecords, names } from '../../../shared/recordUi/useModuleRecords.js';
import { FormModal } from '../../../shared/recordUi/FormModal.jsx';
import { PageHeader } from '../../../shared/recordUi/PageHeader.jsx';
import { RowActions } from '../../../shared/recordUi/RowActions.jsx';
import { fmtDate, daysUntil } from '../../../shared/recordUi/dateUtils.js';

const FIELDS = [
  { key: 'medicineName', label: 'Medicine', required: true, type: 'lookup', lookupModule: 'hospital/medicines' },
  { key: 'batchNumber', label: 'Batch Number' },
  { key: 'expiryDate', label: 'Expiry Date', type: 'date', required: true },
  { key: 'quantity', label: 'Quantity', type: 'number' },
  { key: 'status', label: 'Status', type: 'select', options: ['Near Expiry', 'Expired', 'Cleared'] },
];

const GROUPS = [
  { key: 'expired', label: 'Expired', color: 'red', test: (d) => d != null && d < 0 },
  { key: 'soon', label: 'Expiring Soon (≤30 days)', color: 'amber', test: (d) => d != null && d >= 0 && d <= 30 },
  { key: 'ok', label: 'OK', color: 'green', test: (d) => d == null || d > 30 },
];

export function ExpiryAlertsPage() {
  const { records, loading, create, update, remove } = useModuleRecords('hospital/expiry-alerts');
  const medicines = useLookupRecords('hospital/medicines');
  const [modal, setModal] = useState(null);

  const lookupOptions = { 'hospital/medicines': names(medicines.records) };

  const grouped = useMemo(() => {
    return GROUPS.map((g) => ({
      ...g,
      items: records
        .filter((r) => g.test(daysUntil(r.data?.expiryDate)) && (r.data?.status !== 'Cleared' || g.key === 'ok'))
        .sort((a, b) => (daysUntil(a.data?.expiryDate) ?? 9999) - (daysUntil(b.data?.expiryDate) ?? 9999)),
    }));
  }, [records]);

  async function handleSubmit(form) {
    if (modal.mode === 'edit') await update(modal.record._id, form);
    else await create(form);
    setModal(null);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this alert?')) return;
    await remove(id);
  }

  const colorMap = {
    red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: 'text-red-500' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: 'text-amber-500' },
    green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: 'text-green-600' },
  };

  return (
    <div className="p-4 md:p-7">
      <PageHeader title="Expiry Alerts" group="Pharmacy" subtitle="Grouped by urgency, soonest-expiring first" actionLabel="Add Alert" onAction={() => setModal({ mode: 'add' })} />

      {modal && (
        <FormModal
          title={modal.mode === 'add' ? 'New Expiry Alert' : 'Edit Expiry Alert'}
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
      ) : (
        <div className="flex flex-col gap-6">
          {grouped.map((g) => {
            const c = colorMap[g.color];
            return (
              <div key={g.key}>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={15} className={c.icon} />
                  <h2 className="m-0 text-[14px] font-semibold text-[#111827]">{g.label}</h2>
                  <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${c.bg} ${c.text}`}>{g.items.length}</span>
                </div>
                {g.items.length === 0 ? (
                  <p className="text-[13px] text-[#94a3b8] pl-1">Nothing here.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {g.items.map((r) => {
                      const d = daysUntil(r.data?.expiryDate);
                      return (
                        <div key={r._id} className={`border rounded-lg p-3 ${c.bg} ${c.border}`}>
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <span className="text-[13px] font-semibold text-[#111827]">{r.data?.medicineName || '—'}</span>
                            <RowActions onEdit={() => setModal({ mode: 'edit', record: r })} onDelete={() => handleDelete(r._id)} />
                          </div>
                          <div className="text-xs text-[#536173]">Batch {r.data?.batchNumber || '—'} · Qty {r.data?.quantity || 0}</div>
                          <div className={`text-[12px] font-medium mt-1 ${c.text}`}>
                            {fmtDate(r.data?.expiryDate)}{d != null && (d < 0 ? ` · expired ${Math.abs(d)}d ago` : ` · ${d}d left`)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
