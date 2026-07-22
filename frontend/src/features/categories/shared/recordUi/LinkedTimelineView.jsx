import { useMemo, useState } from 'react';
import { History } from 'lucide-react';

import { useModuleRecords, useLookupRecords, names } from './useModuleRecords.js';
import { FormModal } from './FormModal.jsx';
import { PageHeader } from './PageHeader.jsx';
import { RowActions } from './RowActions.jsx';
import { fmtDate } from './dateUtils.js';

// Shared "pick an entity, browse its history chronologically" layout — used by
// modules that revolve around one linked record (a patient, a student, ...)
// rather than a flat list of unrelated rows.
export function LinkedTimelineView({
  moduleKey, title, group, subtitle, fields, dateKey, renderEntry,
  linkField = 'patientName', linkModule = 'hospital/patients', linkLabel = 'Patient',
  extraLookupModules = [],
}) {
  const { records, loading, create, update, remove } = useModuleRecords(moduleKey);
  const primary = useLookupRecords(linkModule);
  const extra0 = useLookupRecords(extraLookupModules[0] || linkModule);
  const extra1 = useLookupRecords(extraLookupModules[1] || linkModule);
  const [selected, setSelected] = useState('');
  const [modal, setModal] = useState(null);

  const lookupOptions = {
    [linkModule]: names(primary.records),
    ...(extraLookupModules[0] ? { [extraLookupModules[0]]: names(extra0.records) } : {}),
    ...(extraLookupModules[1] ? { [extraLookupModules[1]]: names(extra1.records) } : {}),
  };

  const linkOptions = useMemo(() => names(primary.records), [primary.records]);

  const timeline = useMemo(() => {
    const rows = selected ? records.filter((r) => r.data?.[linkField] === selected) : records;
    return [...rows].sort((a, b) => (b.data?.[dateKey] || '').localeCompare(a.data?.[dateKey] || ''));
  }, [records, selected, dateKey, linkField]);

  async function handleSubmit(form) {
    if (modal.mode === 'edit') await update(modal.record._id, form);
    else await create(form);
    setModal(null);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this record?')) return;
    await remove(id);
  }

  const inputId = `timeline-${moduleKey.replace(/\W+/g, '-')}-options`;

  return (
    <div className="p-4 md:p-7">
      <PageHeader title={title} group={group} subtitle={subtitle} actionLabel={`Add ${title}`} onAction={() => setModal({ mode: 'add', record: selected ? { data: { [linkField]: selected } } : null })} />

      {modal && (
        <FormModal
          title={modal.mode === 'add' ? `New ${title} Entry` : `Edit ${title} Entry`}
          fields={fields}
          initial={modal.record?.data}
          lookupOptions={lookupOptions}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
          submitLabel={modal.mode === 'add' ? 'Save' : 'Update'}
        />
      )}

      <div className="bg-white border border-[#dfe7f1] rounded-xl p-4 mb-5 flex items-center gap-3">
        <label className="text-[13px] font-medium text-[#374151]">{linkLabel}:</label>
        <input
          className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit] w-64"
          list={inputId}
          placeholder={`All ${linkLabel.toLowerCase()}s`}
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        />
        <datalist id={inputId}>
          {linkOptions.map((n) => <option key={n} value={n} />)}
        </datalist>
        {selected && (
          <button type="button" onClick={() => setSelected('')} className="text-[12px] text-blue-600 bg-transparent border-0 cursor-pointer font-[inherit] hover:underline">Clear</button>
        )}
        <span className="text-xs text-[#94a3b8] ml-auto">{timeline.length} entr{timeline.length === 1 ? 'y' : 'ies'}</span>
      </div>

      {loading ? (
        <p className="text-[13px] text-[#536173] px-5 py-8 text-center">Loading…</p>
      ) : timeline.length === 0 ? (
        <div className="bg-white border border-[#dfe7f1] rounded-xl py-16 text-center text-[13px] text-[#536173]">
          {selected ? `No ${title.toLowerCase()} entries for ${selected}.` : `No ${title.toLowerCase()} entries yet.`}
        </div>
      ) : (
        <div className="relative pl-6">
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-[#e2e8f0]" />
          <div className="flex flex-col gap-4">
            {timeline.map((r) => (
              <div key={r._id} className="relative bg-white border border-[#dfe7f1] rounded-xl p-4">
                <span className="absolute -left-6 top-4.5 w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow" />
                <div className="flex items-start justify-between mb-1.5">
                  <div className="flex items-center gap-2 text-[13px] font-semibold text-[#111827]">
                    <History size={13} className="text-blue-500" />
                    {!selected && <span>{r.data?.[linkField] || `Unnamed ${linkLabel.toLowerCase()}`} · </span>}
                    {fmtDate(r.data?.[dateKey])}
                  </div>
                  <RowActions onEdit={() => setModal({ mode: 'edit', record: r })} onDelete={() => handleDelete(r._id)} />
                </div>
                {renderEntry(r.data)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
