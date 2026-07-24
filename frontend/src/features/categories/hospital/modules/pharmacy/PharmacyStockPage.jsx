import { useEffect, useMemo, useState } from 'react';

import { api } from '../../../../../services/api.js';
import { useModuleRecords, useLookupRecords, names } from '../../../shared/recordUi/useModuleRecords.js';
import { FormModal } from '../../../shared/recordUi/FormModal.jsx';
import { PageHeader } from '../../../shared/recordUi/PageHeader.jsx';
import { StatusBadge } from '../../../shared/recordUi/StatusBadge.jsx';
import { RowActions } from '../../../shared/recordUi/RowActions.jsx';
import { fmtDate, daysUntil } from '../../../shared/recordUi/dateUtils.js';

const TH = 'text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-4 py-3 border-b border-[#edf2f7]';
const TD = 'px-4 py-3 border-b border-[#f3f4f6] text-[13px]';

const FIELDS = [
  { key: 'medicineName', label: 'Medicine', required: true, type: 'lookup', lookupModule: 'products' },
  { key: 'supplierName', label: 'Supplier', type: 'lookup', lookupModule: 'hospital/suppliers' },
  { key: 'batchNumber', label: 'Batch Number' },
  { key: 'quantity', label: 'Quantity', type: 'number' },
  { key: 'receivedDate', label: 'Received Date', type: 'date' },
  { key: 'expiryDate', label: 'Expiry Date', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: ['Available', 'Low', 'Out of Stock'] },
];

export function PharmacyStockPage() {
  const { records, loading, create, update, remove } = useModuleRecords('hospital/pharmacy-stock');
  const suppliers = useLookupRecords('hospital/suppliers');
  const [medicineNames, setMedicineNames] = useState([]);
  const [modal, setModal] = useState(null);

  useEffect(() => {
    api.invListProducts({ limit: 500 })
      .then((res) => {
        const active = (res.data ?? []).filter((p) => p.status === 'Active');
        setMedicineNames([...new Set(active.map((p) => p.description).filter(Boolean))].sort());
      })
      .catch(() => setMedicineNames([]));
  }, []);

  const lookupOptions = {
    products: medicineNames,
    'hospital/suppliers': names(suppliers.records),
  };

  const sorted = useMemo(() => {
    return [...records].sort((a, b) => {
      const da = daysUntil(a.data?.expiryDate);
      const db = daysUntil(b.data?.expiryDate);
      if (da == null) return 1;
      if (db == null) return -1;
      return da - db;
    });
  }, [records]);

  async function handleSubmit(form) {
    if (modal.mode === 'edit') await update(modal.record._id, form);
    else await create(form);
    setModal(null);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this stock batch?')) return;
    await remove(id);
  }

  return (
    <div className="p-4 md:p-7">
      <PageHeader title="Stock" group="Pharmacy" subtitle="Batches sorted by expiry — soonest first" actionLabel="Add Stock" onAction={() => setModal({ mode: 'add' })} />

      {modal && (
        <FormModal
          title={modal.mode === 'add' ? 'New Stock Batch' : 'Edit Stock Batch'}
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
                <th className={TH}>Medicine</th>
                <th className={TH}>Batch</th>
                <th className={TH}>Supplier</th>
                <th className={TH}>Quantity</th>
                <th className={TH}>Expiry</th>
                <th className={TH}>Status</th>
                <th className={TH}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-[13px] text-[#536173]">Loading…</td></tr>
              ) : sorted.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-[13px] text-[#536173]">No stock batches yet.</td></tr>
              ) : sorted.map((r) => {
                const d = daysUntil(r.data?.expiryDate);
                const urgent = d != null && d < 0;
                const soon = d != null && d >= 0 && d <= 30;
                return (
                  <tr key={r._id} className={urgent ? 'bg-red-50' : soon ? 'bg-amber-50' : ''}>
                    <td className={`${TD} font-medium text-[#111827]`}>{r.data?.medicineName || '—'}</td>
                    <td className={`${TD} text-[#536173] font-mono`}>{r.data?.batchNumber || '—'}</td>
                    <td className={`${TD} text-[#536173]`}>{r.data?.supplierName || '—'}</td>
                    <td className={`${TD} text-[#111827]`}>{r.data?.quantity || 0}</td>
                    <td className={`${TD} ${urgent ? 'text-red-600 font-semibold' : soon ? 'text-amber-600 font-semibold' : 'text-[#536173]'}`}>
                      {fmtDate(r.data?.expiryDate)}{urgent && ' · expired'}{soon && ` · ${d}d left`}
                    </td>
                    <td className={TD}><StatusBadge value={r.data?.status} /></td>
                    <td className={TD}><RowActions onEdit={() => setModal({ mode: 'edit', record: r })} onDelete={() => handleDelete(r._id)} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
