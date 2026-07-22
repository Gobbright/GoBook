import { useState } from 'react';
import { FlaskConical } from 'lucide-react';

import { useModuleRecords, useLookupRecords, names } from '../../../shared/recordUi/useModuleRecords.js';
import { FormModal } from '../../../shared/recordUi/FormModal.jsx';
import { PageHeader } from '../../../shared/recordUi/PageHeader.jsx';
import { StatusBadge } from '../../../shared/recordUi/StatusBadge.jsx';
import { RowActions } from '../../../shared/recordUi/RowActions.jsx';
import { fmtDate } from '../../../shared/recordUi/dateUtils.js';

const FIELDS = [
  { key: 'patientName', label: 'Patient', required: true, type: 'lookup', lookupModule: 'hospital/patients' },
  { key: 'testName', label: 'Test Name', required: true },
  { key: 'reviewedBy', label: 'Reviewed By', type: 'lookup', lookupModule: 'hospital/doctors' },
  { key: 'result', label: 'Result', type: 'textarea', full: true },
  { key: 'reportDate', label: 'Report Date', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: ['Normal', 'Abnormal', 'Pending Review'] },
];

export function LabReportsPage() {
  const { records, loading, create, update, remove } = useModuleRecords('hospital/lab-reports');
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
    if (!window.confirm('Delete this report?')) return;
    await remove(id);
  }

  return (
    <div className="p-4 md:p-7">
      <PageHeader title="Reports" group="Laboratory" subtitle="Test result documents" actionLabel="Add Report" onAction={() => setModal({ mode: 'add' })} />

      {modal && (
        <FormModal
          title={modal.mode === 'add' ? 'New Lab Report' : 'Edit Lab Report'}
          fields={FIELDS}
          initial={modal.mode === 'edit' ? modal.record.data : null}
          lookupOptions={lookupOptions}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
          submitLabel={modal.mode === 'add' ? 'Save Report' : 'Update Report'}
        />
      )}

      {loading ? (
        <p className="text-[13px] text-[#536173] px-5 py-8 text-center">Loading…</p>
      ) : records.length === 0 ? (
        <div className="bg-white border border-[#dfe7f1] rounded-xl py-16 text-center text-[13px] text-[#536173]">No reports yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {records.map((r) => (
            <div key={r._id} className="bg-white border border-[#dfe7f1] rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-[#f8fafc] border-b border-[#e5edf7] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FlaskConical size={14} className="text-blue-500" />
                  <span className="text-[13px] font-semibold text-[#111827]">{r.data?.testName || 'Test'}</span>
                </div>
                <StatusBadge value={r.data?.status} />
              </div>
              <div className="p-4">
                <div className="text-[13px] text-[#111827] font-medium mb-0.5">{r.data?.patientName || 'Unnamed patient'}</div>
                <div className="text-xs text-[#94a3b8] mb-3">Reviewed by {r.data?.reviewedBy || '—'} · {fmtDate(r.data?.reportDate)}</div>
                <p className="text-[13px] text-[#374151] whitespace-pre-wrap m-0">{r.data?.result || 'No result recorded yet.'}</p>
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
