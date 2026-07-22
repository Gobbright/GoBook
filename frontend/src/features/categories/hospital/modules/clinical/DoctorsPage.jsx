import { useMemo, useState } from 'react';
import { Search, Stethoscope } from 'lucide-react';

import { useModuleRecords, useLookupRecords, names } from '../../../shared/recordUi/useModuleRecords.js';
import { FormModal } from '../../../shared/recordUi/FormModal.jsx';
import { PageHeader } from '../../../shared/recordUi/PageHeader.jsx';
import { StatusBadge } from '../../../shared/recordUi/StatusBadge.jsx';
import { RowActions } from '../../../shared/recordUi/RowActions.jsx';

const FIELDS = [
  { key: 'name', label: 'Doctor Name', required: true },
  { key: 'specialization', label: 'Specialization' },
  { key: 'departmentName', label: 'Department', type: 'lookup', lookupModule: 'hospital/departments' },
  { key: 'qualification', label: 'Qualification' },
  { key: 'experienceYears', label: 'Experience (Years)', type: 'number' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'status', label: 'Status', type: 'select', options: ['Active', 'On Leave', 'Inactive'] },
];

export function DoctorsPage() {
  const { records, loading, create, update, remove } = useModuleRecords('hospital/doctors');
  const departments = useLookupRecords('hospital/departments');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);

  const lookupOptions = { 'hospital/departments': names(departments.records) };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) => `${r.data?.name || ''} ${r.data?.specialization || ''}`.toLowerCase().includes(q));
  }, [records, search]);

  async function handleSubmit(form) {
    if (modal.mode === 'edit') await update(modal.record._id, form);
    else await create(form);
    setModal(null);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this doctor record?')) return;
    await remove(id);
  }

  return (
    <div className="p-4 md:p-7">
      <PageHeader title="Doctors" group="Clinical" subtitle="Doctor directory" actionLabel="Add Doctors" onAction={() => setModal({ mode: 'add' })} />

      {modal && (
        <FormModal
          title={modal.mode === 'add' ? 'New Doctor' : 'Edit Doctor'}
          fields={FIELDS}
          initial={modal.mode === 'edit' ? modal.record.data : null}
          lookupOptions={lookupOptions}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
          submitLabel={modal.mode === 'add' ? 'Save Doctor' : 'Update Doctor'}
        />
      )}

      <div className="relative max-w-xs mb-5">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
        <input
          className="pl-8 pr-3 py-2 border border-[#dbe4ef] rounded-md text-[13px] outline-none focus:border-blue-500 w-full font-[inherit] bg-white"
          placeholder="Search doctors..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="text-[13px] text-[#536173] px-5 py-8 text-center">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-[#dfe7f1] rounded-xl py-16 text-center text-[13px] text-[#536173]">No doctors found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r) => (
            <div key={r._id} className="bg-white border border-[#dfe7f1] rounded-xl p-4">
              <div className="flex items-start gap-3 mb-3">
                <span className="w-11 h-11 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center flex-none">
                  <Stethoscope size={18} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold text-[#111827] truncate">{r.data?.name || 'Unnamed'}</div>
                  <div className="text-xs text-[#94a3b8] truncate">{r.data?.specialization || 'General'}</div>
                </div>
                <RowActions onEdit={() => setModal({ mode: 'edit', record: r })} onDelete={() => handleDelete(r._id)} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-[12px] text-[#536173] mb-3">
                <div>{r.data?.departmentName || 'No department'}</div>
                <div>{r.data?.experienceYears ? `${r.data.experienceYears} yrs exp.` : '—'}</div>
                <div className="truncate">{r.data?.phone || '—'}</div>
                <div className="truncate">{r.data?.qualification || '—'}</div>
              </div>
              <StatusBadge value={r.data?.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
