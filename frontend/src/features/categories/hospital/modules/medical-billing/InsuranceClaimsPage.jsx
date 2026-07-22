import { useState } from 'react';

import { useModuleRecords, useLookupRecords, names } from '../../../shared/recordUi/useModuleRecords.js';
import { FormModal } from '../../../shared/recordUi/FormModal.jsx';
import { PageHeader } from '../../../shared/recordUi/PageHeader.jsx';
import { KanbanBoard } from '../../../shared/recordUi/KanbanBoard.jsx';
import { RowActions } from '../../../shared/recordUi/RowActions.jsx';

const STATUSES = ['Submitted', 'Pending', 'Approved', 'Rejected'];

const FIELDS = [
  { key: 'patientName', label: 'Patient', required: true, type: 'lookup', lookupModule: 'hospital/patients' },
  { key: 'insurer', label: 'Insurer', required: true },
  { key: 'policyNumber', label: 'Policy Number' },
  { key: 'claimAmount', label: 'Claim Amount', type: 'number' },
  { key: 'claimDate', label: 'Claim Date', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: STATUSES },
];

function formatMoney(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

export function InsuranceClaimsPage() {
  const { records, loading, create, update, remove } = useModuleRecords('hospital/insurance-claims');
  const patients = useLookupRecords('hospital/patients');
  const [modal, setModal] = useState(null);

  const lookupOptions = { 'hospital/patients': names(patients.records) };

  async function handleSubmit(form) {
    if (modal.mode === 'edit') await update(modal.record._id, form);
    else await create(form);
    setModal(null);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this claim?')) return;
    await remove(id);
  }

  return (
    <div className="p-4 md:p-7">
      <PageHeader title="Insurance Claims" group="Medical Billing" subtitle="Claim status pipeline" actionLabel="Add Claim" onAction={() => setModal({ mode: 'add' })} />

      {modal && (
        <FormModal
          title={modal.mode === 'add' ? 'New Insurance Claim' : 'Edit Insurance Claim'}
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
        <KanbanBoard
          columns={STATUSES}
          records={records}
          statusKey="status"
          renderCard={(r) => (
            <div key={r._id} className="bg-white border border-[#dfe7f1] rounded-lg p-3">
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-[13px] font-semibold text-[#111827]">{r.data?.patientName || 'Unnamed patient'}</span>
                <RowActions onEdit={() => setModal({ mode: 'edit', record: r })} onDelete={() => handleDelete(r._id)} />
              </div>
              <div className="text-xs text-[#536173]">{r.data?.insurer || 'No insurer'}</div>
              <div className="text-xs text-[#94a3b8]">Policy {r.data?.policyNumber || '—'}</div>
              <div className="text-[14px] font-bold text-[#111827] mt-2">{formatMoney(r.data?.claimAmount)}</div>
            </div>
          )}
        />
      )}
    </div>
  );
}
