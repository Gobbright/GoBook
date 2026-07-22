import { useState } from 'react';
import { Pill } from 'lucide-react';

import { useModuleRecords, useLookupRecords, names } from '../../../shared/recordUi/useModuleRecords.js';
import { FormModal } from '../../../shared/recordUi/FormModal.jsx';
import { PageHeader } from '../../../shared/recordUi/PageHeader.jsx';
import { StatusBadge } from '../../../shared/recordUi/StatusBadge.jsx';
import { RowActions } from '../../../shared/recordUi/RowActions.jsx';
import { fmtDate } from '../../../shared/recordUi/dateUtils.js';

const FIELDS = [
  { key: 'patientName', label: 'Patient', required: true, type: 'lookup', lookupModule: 'hospital/patients' },
  { key: 'doctorName', label: 'Doctor', type: 'lookup', lookupModule: 'hospital/doctors' },
  { key: 'medicines', label: 'Medicines', type: 'textarea', full: true, required: true },
  { key: 'dosageInstructions', label: 'Dosage / Instructions', type: 'textarea', full: true },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Completed'] },
];

export function PrescriptionPage() {
  const { records, loading, create, update, remove } = useModuleRecords('hospital/prescription');
  const patients = useLookupRecords('hospital/patients');
  const doctors = useLookupRecords('hospital/doctors');
  const [modal, setModal] = useState(null);

  const lookupOptions = {
    'hospital/patients': names(patients.records),
    'hospital/doctors': names(doctors.records),
  };

  async function handleSubmit(form) {
    if (modal.mode === 'edit') await update(modal.record._id, form);
    else await create(form);
    setModal(null);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this prescription?')) return;
    await remove(id);
  }

  return (
    <div className="p-4 md:p-7">
      <PageHeader title="Prescription" group="Clinical" subtitle="Prescriptions in Rx pad format" actionLabel="Add Prescription" onAction={() => setModal({ mode: 'add' })} />

      {modal && (
        <FormModal
          title={modal.mode === 'add' ? 'New Prescription' : 'Edit Prescription'}
          fields={FIELDS}
          initial={modal.mode === 'edit' ? modal.record.data : null}
          lookupOptions={lookupOptions}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
          submitLabel={modal.mode === 'add' ? 'Save Prescription' : 'Update Prescription'}
        />
      )}

      {loading ? (
        <p className="text-[13px] text-[#536173] px-5 py-8 text-center">Loading…</p>
      ) : records.length === 0 ? (
        <div className="bg-white border border-[#dfe7f1] rounded-xl py-16 text-center text-[13px] text-[#536173]">No prescriptions yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {records.map((r) => (
            <div key={r._id} className="bg-white border border-[#dfe7f1] rounded-xl overflow-hidden">
              <div className="bg-blue-50 px-4 py-3 flex items-center justify-between border-b border-blue-100">
                <div className="flex items-center gap-2">
                  <span className="text-[20px] font-serif italic text-blue-700 leading-none">℞</span>
                  <div>
                    <div className="text-[13px] font-semibold text-[#111827]">{r.data?.patientName || 'Unnamed patient'}</div>
                    <div className="text-xs text-[#536173]">{r.data?.doctorName || 'No doctor'} · {fmtDate(r.data?.date)}</div>
                  </div>
                </div>
                <StatusBadge value={r.data?.status} />
              </div>
              <div className="p-4">
                <div className="flex items-start gap-2 mb-2">
                  <Pill size={14} className="text-[#94a3b8] mt-0.5 flex-none" />
                  <p className="text-[13px] text-[#111827] whitespace-pre-wrap m-0">{r.data?.medicines || 'No medicines listed'}</p>
                </div>
                {r.data?.dosageInstructions && (
                  <p className="text-[12px] text-[#536173] whitespace-pre-wrap mt-2 pt-2 border-t border-[#f3f4f6]">{r.data.dosageInstructions}</p>
                )}
                <div className="flex justify-end mt-3">
                  <RowActions onEdit={() => setModal({ mode: 'edit', record: r })} onDelete={() => handleDelete(r._id)} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
