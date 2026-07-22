import { useState } from 'react';
import { ScanLine } from 'lucide-react';

import { useModuleRecords, useLookupRecords, names } from '../../../shared/recordUi/useModuleRecords.js';
import { FormModal } from '../../../shared/recordUi/FormModal.jsx';
import { PageHeader } from '../../../shared/recordUi/PageHeader.jsx';
import { StatusBadge } from '../../../shared/recordUi/StatusBadge.jsx';
import { RowActions } from '../../../shared/recordUi/RowActions.jsx';
import { fmtDate } from '../../../shared/recordUi/dateUtils.js';

const SCAN_TYPES = ['X-Ray', 'MRI', 'CT Scan', 'Ultrasound', 'ECG', 'Other'];

const FIELDS = [
  { key: 'patientName', label: 'Patient', required: true, type: 'lookup', lookupModule: 'hospital/patients' },
  { key: 'scanType', label: 'Scan Type', type: 'select', options: SCAN_TYPES },
  { key: 'doctorName', label: 'Referring Doctor', type: 'lookup', lookupModule: 'hospital/doctors' },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'findings', label: 'Findings', type: 'textarea', full: true },
  { key: 'status', label: 'Status', type: 'select', options: ['Scheduled', 'Completed'] },
];

export function DiagnosticsPage() {
  const { records, loading, create, update, remove } = useModuleRecords('hospital/diagnostics');
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
    if (!window.confirm('Delete this diagnostic record?')) return;
    await remove(id);
  }

  return (
    <div className="p-4 md:p-7">
      <PageHeader title="Diagnostics" group="Laboratory" subtitle="Imaging & diagnostic scan reports" actionLabel="Add Diagnostics" onAction={() => setModal({ mode: 'add' })} />

      {modal && (
        <FormModal
          title={modal.mode === 'add' ? 'New Diagnostic Scan' : 'Edit Diagnostic Scan'}
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
      ) : records.length === 0 ? (
        <div className="bg-white border border-[#dfe7f1] rounded-xl py-16 text-center text-[13px] text-[#536173]">No diagnostic records yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {records.map((r) => (
            <div key={r._id} className="bg-white border border-[#dfe7f1] rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-[#f5f3ff] border-b border-purple-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ScanLine size={14} className="text-purple-600" />
                  <span className="text-[13px] font-semibold text-[#111827]">{r.data?.scanType || 'Scan'}</span>
                </div>
                <StatusBadge value={r.data?.status} />
              </div>
              <div className="p-4">
                <div className="text-[13px] text-[#111827] font-medium mb-0.5">{r.data?.patientName || 'Unnamed patient'}</div>
                <div className="text-xs text-[#94a3b8] mb-3">Ref. {r.data?.doctorName || '—'} · {fmtDate(r.data?.date)}</div>
                <p className="text-[13px] text-[#374151] whitespace-pre-wrap m-0">{r.data?.findings || 'No findings recorded yet.'}</p>
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
