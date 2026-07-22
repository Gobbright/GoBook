import { useState } from 'react';
import { CheckCircle2, Circle, XCircle } from 'lucide-react';

import { useModuleRecords, useLookupRecords, names } from '../../../shared/recordUi/useModuleRecords.js';
import { FormModal } from '../../../shared/recordUi/FormModal.jsx';
import { PageHeader } from '../../../shared/recordUi/PageHeader.jsx';
import { RowActions } from '../../../shared/recordUi/RowActions.jsx';
import { fmtDate } from '../../../shared/recordUi/dateUtils.js';

const SAMPLE_TYPES = ['Blood', 'Urine', 'Stool', 'Tissue', 'Swab', 'Other'];
const STATUSES = ['Pending', 'Collected', 'Rejected'];
const ICONS = { Pending: Circle, Collected: CheckCircle2, Rejected: XCircle };
const ICON_COLOR = { Pending: 'text-amber-500', Collected: 'text-green-600', Rejected: 'text-red-500' };

const FIELDS = [
  { key: 'patientName', label: 'Patient', required: true, type: 'lookup', lookupModule: 'hospital/patients' },
  { key: 'sampleType', label: 'Sample Type', type: 'select', options: SAMPLE_TYPES },
  { key: 'collectedBy', label: 'Collected By' },
  { key: 'collectionDate', label: 'Collection Date', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: STATUSES },
];

export function SampleCollectionPage() {
  const { records, loading, create, update, remove } = useModuleRecords('hospital/sample-collection');
  const patients = useLookupRecords('hospital/patients');
  const [modal, setModal] = useState(null);

  const lookupOptions = { 'hospital/patients': names(patients.records) };

  async function handleSubmit(form) {
    if (modal.mode === 'edit') await update(modal.record._id, form);
    else await create(form);
    setModal(null);
  }

  async function toggleStatus(r) {
    const order = STATUSES;
    const next = order[(order.indexOf(r.data?.status) + 1) % order.length];
    await update(r._id, { ...r.data, status: next });
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this sample collection entry?')) return;
    await remove(id);
  }

  return (
    <div className="p-4 md:p-7">
      <PageHeader title="Sample Collection" group="Laboratory" subtitle="Checklist — click the status icon to advance it" actionLabel="Add Sample" onAction={() => setModal({ mode: 'add' })} />

      {modal && (
        <FormModal
          title={modal.mode === 'add' ? 'New Sample Collection' : 'Edit Sample Collection'}
          fields={FIELDS}
          initial={modal.mode === 'edit' ? modal.record.data : null}
          lookupOptions={lookupOptions}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
          submitLabel={modal.mode === 'add' ? 'Save' : 'Update'}
        />
      )}

      <div className="bg-white border border-[#dfe7f1] rounded-xl">
        {loading ? (
          <p className="text-[13px] text-[#536173] px-5 py-8 text-center">Loading…</p>
        ) : records.length === 0 ? (
          <p className="text-[13px] text-[#536173] px-5 py-8 text-center">No samples logged yet.</p>
        ) : (
          <div className="divide-y divide-[#f3f4f6]">
            {records.map((r) => {
              const Icon = ICONS[r.data?.status] || Circle;
              return (
                <div key={r._id} className="flex items-center gap-3 px-5 py-3.5">
                  <button type="button" onClick={() => toggleStatus(r)} title="Click to advance status" className={`bg-transparent border-0 cursor-pointer p-0 ${ICON_COLOR[r.data?.status] || 'text-[#94a3b8]'}`}>
                    <Icon size={19} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className={`text-[13px] font-medium ${r.data?.status === 'Collected' ? 'text-[#94a3b8] line-through' : 'text-[#111827]'}`}>{r.data?.patientName || 'Unnamed patient'}</div>
                    <div className="text-xs text-[#94a3b8]">{r.data?.sampleType || 'Sample'} · Collected by {r.data?.collectedBy || '—'} · {fmtDate(r.data?.collectionDate)}</div>
                  </div>
                  <RowActions onEdit={() => setModal({ mode: 'edit', record: r })} onDelete={() => handleDelete(r._id)} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
