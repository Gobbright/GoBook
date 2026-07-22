import { useState } from 'react';
import { FileCheck2 } from 'lucide-react';

import { useModuleRecords, useLookupRecords, names } from '../../../shared/recordUi/useModuleRecords.js';
import { FormModal } from '../../../shared/recordUi/FormModal.jsx';
import { PageHeader } from '../../../shared/recordUi/PageHeader.jsx';
import { StatusBadge } from '../../../shared/recordUi/StatusBadge.jsx';
import { RowActions } from '../../../shared/recordUi/RowActions.jsx';
import { fmtDate } from '../../../shared/recordUi/dateUtils.js';

const FIELDS = [
  { key: 'patientName', label: 'Patient', required: true, type: 'lookup', lookupModule: 'hospital/patients' },
  { key: 'dischargeDate', label: 'Discharge Date', type: 'date' },
  { key: 'diagnosis', label: 'Final Diagnosis' },
  { key: 'dischargeSummary', label: 'Discharge Summary', type: 'textarea', full: true, rows: 4 },
  { key: 'followUpDate', label: 'Follow-up Date', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: ['Discharged', 'Referred', 'Discharged Against Advice'] },
];

export function DischargePage() {
  const { records, loading, create, update, remove } = useModuleRecords('hospital/discharge');
  const patients = useLookupRecords('hospital/patients');
  const [modal, setModal] = useState(null);
  const [viewing, setViewing] = useState(null);

  const lookupOptions = { 'hospital/patients': names(patients.records) };

  async function handleSubmit(form) {
    if (modal.mode === 'edit') await update(modal.record._id, form);
    else await create(form);
    setModal(null);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this discharge record?')) return;
    await remove(id);
  }

  return (
    <div className="p-4 md:p-7">
      <PageHeader title="Discharge" group="Patient Management" subtitle="Discharge summaries" actionLabel="Add Discharge" onAction={() => setModal({ mode: 'add' })} />

      {modal && (
        <FormModal
          title={modal.mode === 'add' ? 'New Discharge Record' : 'Edit Discharge Record'}
          fields={FIELDS}
          initial={modal.mode === 'edit' ? modal.record.data : null}
          lookupOptions={lookupOptions}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
          submitLabel={modal.mode === 'add' ? 'Save Record' : 'Update Record'}
        />
      )}

      {viewing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && setViewing(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-140 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-[#edf2f7] flex items-center justify-between">
              <div>
                <div className="text-xs text-[#94a3b8] uppercase tracking-wide">Discharge Summary</div>
                <h2 className="m-0 text-[18px] font-bold text-[#111827] mt-0.5">{viewing.data?.patientName}</h2>
              </div>
              <button type="button" onClick={() => setViewing(null)} className="text-[#536173] hover:text-[#111827] bg-transparent border-0 cursor-pointer text-lg leading-none font-[inherit]">✕</button>
            </div>
            <div className="px-6 py-5 grid grid-cols-2 gap-4 border-b border-[#edf2f7]">
              <div><div className="text-xs text-[#94a3b8] uppercase tracking-wide mb-0.5">Discharge Date</div><div className="text-[13px] text-[#111827] font-medium">{fmtDate(viewing.data?.dischargeDate)}</div></div>
              <div><div className="text-xs text-[#94a3b8] uppercase tracking-wide mb-0.5">Follow-up Date</div><div className="text-[13px] text-[#111827] font-medium">{fmtDate(viewing.data?.followUpDate)}</div></div>
              <div><div className="text-xs text-[#94a3b8] uppercase tracking-wide mb-0.5">Diagnosis</div><div className="text-[13px] text-[#111827] font-medium">{viewing.data?.diagnosis || '—'}</div></div>
              <div><div className="text-xs text-[#94a3b8] uppercase tracking-wide mb-0.5">Status</div><StatusBadge value={viewing.data?.status} /></div>
            </div>
            <div className="px-6 py-5">
              <div className="text-xs text-[#94a3b8] uppercase tracking-wide mb-1.5">Summary</div>
              <p className="text-[13px] text-[#374151] whitespace-pre-wrap leading-relaxed">{viewing.data?.dischargeSummary || 'No summary recorded.'}</p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-[13px] text-[#536173] px-5 py-8 text-center">Loading…</p>
      ) : records.length === 0 ? (
        <div className="bg-white border border-[#dfe7f1] rounded-xl py-16 text-center text-[13px] text-[#536173]">No discharge records yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {records.map((r) => (
            <div key={r._id} className="bg-white border border-[#dfe7f1] rounded-xl p-4 flex flex-col">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileCheck2 size={15} className="text-blue-500" />
                  <span className="text-[13px] font-semibold text-[#111827]">{r.data?.patientName || 'Unnamed patient'}</span>
                </div>
                <RowActions onEdit={() => setModal({ mode: 'edit', record: r })} onDelete={() => handleDelete(r._id)} />
              </div>
              <div className="text-xs text-[#94a3b8] mb-2">Discharged {fmtDate(r.data?.dischargeDate)}</div>
              <div className="text-[13px] text-[#374151] mb-3 line-clamp-2">{r.data?.diagnosis || 'No diagnosis recorded'}</div>
              <div className="mt-auto flex items-center justify-between pt-2 border-t border-[#f3f4f6]">
                <StatusBadge value={r.data?.status} />
                <button type="button" onClick={() => setViewing(r)} className="text-[12px] text-blue-600 bg-transparent border-0 cursor-pointer font-[inherit] hover:underline">View Summary →</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
