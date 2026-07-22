import { useMemo, useState } from 'react';
import { BedDouble } from 'lucide-react';

import { useModuleRecords, useLookupRecords, names } from '../../../shared/recordUi/useModuleRecords.js';
import { FormModal } from '../../../shared/recordUi/FormModal.jsx';
import { PageHeader } from '../../../shared/recordUi/PageHeader.jsx';
import { StatusBadge } from '../../../shared/recordUi/StatusBadge.jsx';
import { RowActions } from '../../../shared/recordUi/RowActions.jsx';
import { fmtDate } from '../../../shared/recordUi/dateUtils.js';

const WARDS = ['General', 'ICU', 'Private', 'Semi-Private', 'Emergency'];

const FIELDS = [
  { key: 'patientName', label: 'Patient', required: true, type: 'lookup', lookupModule: 'hospital/patients' },
  { key: 'doctorName', label: 'Attending Doctor', type: 'lookup', lookupModule: 'hospital/doctors' },
  { key: 'ward', label: 'Ward', type: 'select', options: WARDS, required: true },
  { key: 'bedNumber', label: 'Bed Number' },
  { key: 'admissionDate', label: 'Admission Date', type: 'date' },
  { key: 'reason', label: 'Reason for Admission', type: 'textarea', full: true },
  { key: 'status', label: 'Status', type: 'select', options: ['Admitted', 'Discharged', 'Transferred'] },
];

export function AdmissionsPage() {
  const { records, loading, create, update, remove } = useModuleRecords('hospital/admissions');
  const patients = useLookupRecords('hospital/patients');
  const doctors = useLookupRecords('hospital/doctors');
  const [modal, setModal] = useState(null);

  const lookupOptions = {
    'hospital/patients': names(patients.records),
    'hospital/doctors': names(doctors.records),
  };

  const currentlyAdmitted = useMemo(() => records.filter((r) => r.data?.status !== 'Discharged'), [records]);

  async function handleSubmit(form) {
    if (modal.mode === 'edit') await update(modal.record._id, form);
    else await create(form);
    setModal(null);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this admission record?')) return;
    await remove(id);
  }

  return (
    <div className="p-4 md:p-7">
      <PageHeader title="Admissions" group="Patient Management" subtitle="Ward occupancy board — currently admitted patients by ward" actionLabel="Admit Patient" onAction={() => setModal({ mode: 'add' })} />

      {modal && (
        <FormModal
          title={modal.mode === 'add' ? 'New Admission' : 'Edit Admission'}
          fields={FIELDS}
          initial={modal.mode === 'edit' ? modal.record.data : null}
          lookupOptions={lookupOptions}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
          submitLabel={modal.mode === 'add' ? 'Admit Patient' : 'Update Admission'}
        />
      )}

      {loading ? (
        <p className="text-[13px] text-[#536173] px-5 py-8 text-center">Loading…</p>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${WARDS.length}, minmax(0, 1fr))` }}>
          {WARDS.map((ward) => {
            const beds = currentlyAdmitted.filter((r) => r.data?.ward === ward);
            return (
              <div key={ward} className="bg-[#f8fafc] border border-[#e5edf7] rounded-xl flex flex-col min-h-40">
                <div className="px-4 py-3 border-b border-[#e5edf7] flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-[#111827]">{ward}</span>
                  <span className="text-[11px] text-[#536173] bg-white border border-[#dbe4ef] rounded-full px-2 py-0.5">{beds.length}</span>
                </div>
                <div className="p-3 flex flex-col gap-2 flex-1">
                  {beds.length === 0 ? (
                    <p className="text-[12px] text-[#94a3b8] text-center py-6">No patients</p>
                  ) : beds.map((r) => (
                    <div key={r._id} className="bg-white border border-[#dfe7f1] rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5 text-[13px] font-semibold text-[#111827]">
                          <BedDouble size={13} className="text-blue-500 flex-none" />
                          {r.data?.bedNumber || 'Bed —'}
                        </div>
                        <RowActions onEdit={() => setModal({ mode: 'edit', record: r })} onDelete={() => handleDelete(r._id)} />
                      </div>
                      <div className="text-[13px] font-medium text-[#111827]">{r.data?.patientName || 'Unnamed patient'}</div>
                      <div className="text-xs text-[#94a3b8] mt-0.5">{r.data?.doctorName || 'No doctor assigned'}</div>
                      <div className="text-xs text-[#94a3b8] mt-0.5">Admitted {fmtDate(r.data?.admissionDate)}</div>
                      <div className="mt-2"><StatusBadge value={r.data?.status} /></div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
