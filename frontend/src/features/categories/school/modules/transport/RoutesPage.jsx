import { useState } from 'react';
import { ArrowRight, Route as RouteIcon } from 'lucide-react';

import { useModuleRecords } from '../../../shared/recordUi/useModuleRecords.js';
import { FormModal } from '../../../shared/recordUi/FormModal.jsx';
import { PageHeader } from '../../../shared/recordUi/PageHeader.jsx';
import { RowActions } from '../../../shared/recordUi/RowActions.jsx';

const FIELDS = [
  { key: 'routeName', label: 'Route Name', required: true },
  { key: 'startPoint', label: 'Start Point' },
  { key: 'endPoint', label: 'End Point' },
  { key: 'distance', label: 'Distance (km)', type: 'number' },
];

export function RoutesPage() {
  const { records, loading, create, update, remove, reload } = useModuleRecords('school/transport/routes');
  const [modal, setModal] = useState(null);

  async function handleSubmit(form) {
    if (modal.mode === 'edit') await update(modal.record._id, form);
    else await create(form);
    setModal(null);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this route?')) return;
    await remove(id);
  }

  return (
    <div className="p-4 md:p-7">
      <PageHeader title="Routes" group="Transport" subtitle="Transport routes" actionLabel="Add Route" onAction={() => setModal({ mode: 'add' })} moduleKey="school/transport/routes" fields={FIELDS} onImported={reload} />

      {modal && (
        <FormModal
          title={modal.mode === 'add' ? 'New Route' : 'Edit Route'}
          fields={FIELDS}
          initial={modal.mode === 'edit' ? modal.record.data : null}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
          submitLabel={modal.mode === 'add' ? 'Save Route' : 'Update Route'}
        />
      )}

      {loading ? (
        <p className="text-[13px] text-[#536173] px-5 py-8 text-center">Loading…</p>
      ) : records.length === 0 ? (
        <div className="bg-white border border-[#dfe7f1] rounded-xl py-16 text-center text-[13px] text-[#536173]">No routes yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {records.map((r) => (
            <div key={r._id} className="bg-white border border-[#dfe7f1] rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <span className="w-10 h-10 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center flex-none"><RouteIcon size={16} /></span>
                <RowActions onEdit={() => setModal({ mode: 'edit', record: r })} onDelete={() => handleDelete(r._id)} />
              </div>
              <div className="text-[14px] font-semibold text-[#111827] mb-2">{r.data?.routeName}</div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[12px] font-medium text-[#536173] bg-[#f3f4f6] rounded px-2 py-1 truncate">{r.data?.startPoint || '—'}</span>
                <ArrowRight size={13} className="text-teal-500 flex-none" />
                <span className="text-[12px] font-medium text-teal-700 bg-teal-50 rounded px-2 py-1 truncate">{r.data?.endPoint || '—'}</span>
              </div>
              <div className="text-[11px] text-[#94a3b8]">{r.data?.distance ? `${r.data.distance} km` : 'Distance not set'}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
