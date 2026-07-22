import { useState } from 'react';
import { Building2 } from 'lucide-react';

import { useModuleRecords, useLookupRecords, names } from '../../../shared/recordUi/useModuleRecords.js';
import { FormModal } from '../../../shared/recordUi/FormModal.jsx';
import { PageHeader } from '../../../shared/recordUi/PageHeader.jsx';
import { StatusBadge } from '../../../shared/recordUi/StatusBadge.jsx';
import { RowActions } from '../../../shared/recordUi/RowActions.jsx';

const FIELDS = [
  { key: 'name', label: 'Department Name', required: true },
  { key: 'headOfDept', label: 'Head of Department', type: 'lookup', lookupModule: 'hospital/doctors' },
  { key: 'floor', label: 'Floor' },
  { key: 'phone', label: 'Phone' },
  { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
];

export function DepartmentsPage() {
  const { records, loading, create, update, remove } = useModuleRecords('hospital/departments');
  const doctors = useLookupRecords('hospital/doctors');
  const [modal, setModal] = useState(null);

  const lookupOptions = { 'hospital/doctors': names(doctors.records) };

  function doctorCount(deptName) {
    return doctors.records.filter((r) => r.data?.departmentName === deptName).length;
  }

  async function handleSubmit(form) {
    if (modal.mode === 'edit') await update(modal.record._id, form);
    else await create(form);
    setModal(null);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this department?')) return;
    await remove(id);
  }

  return (
    <div className="p-4 md:p-7">
      <PageHeader title="Departments" group="Clinical" subtitle="Departments with live doctor counts" actionLabel="Add Departments" onAction={() => setModal({ mode: 'add' })} />

      {modal && (
        <FormModal
          title={modal.mode === 'add' ? 'New Department' : 'Edit Department'}
          fields={FIELDS}
          initial={modal.mode === 'edit' ? modal.record.data : null}
          lookupOptions={lookupOptions}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
          submitLabel={modal.mode === 'add' ? 'Save Department' : 'Update Department'}
        />
      )}

      {loading ? (
        <p className="text-[13px] text-[#536173] px-5 py-8 text-center">Loading…</p>
      ) : records.length === 0 ? (
        <div className="bg-white border border-[#dfe7f1] rounded-xl py-16 text-center text-[13px] text-[#536173]">No departments yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {records.map((r) => (
            <div key={r._id} className="bg-white border border-[#dfe7f1] rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <span className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center flex-none">
                  <Building2 size={17} />
                </span>
                <RowActions onEdit={() => setModal({ mode: 'edit', record: r })} onDelete={() => handleDelete(r._id)} />
              </div>
              <div className="text-[14px] font-semibold text-[#111827] mb-0.5">{r.data?.name}</div>
              <div className="text-xs text-[#94a3b8] mb-3">Floor {r.data?.floor || '—'}</div>
              <div className="text-[12px] text-[#536173] mb-1">Head: {r.data?.headOfDept || '—'}</div>
              <div className="text-[12px] text-[#536173] mb-3">{r.data?.phone || 'No phone on file'}</div>
              <div className="flex items-center justify-between pt-3 border-t border-[#f3f4f6]">
                <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 rounded-full px-2 py-0.5">{doctorCount(r.data?.name)} doctors</span>
                <StatusBadge value={r.data?.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
