import { useMemo, useState } from 'react';

import { useModuleRecords, useLookupRecords, names } from '../../../shared/recordUi/useModuleRecords.js';
import { FormModal } from '../../../shared/recordUi/FormModal.jsx';
import { PageHeader } from '../../../shared/recordUi/PageHeader.jsx';
import { RowActions } from '../../../shared/recordUi/RowActions.jsx';
import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const FIELDS = [
  { key: 'className', label: 'Class', required: true, type: 'lookup', lookupModule: 'school/classes' },
  { key: 'day', label: 'Day', type: 'select', options: DAYS, required: true },
  { key: 'period', label: 'Period', required: true },
  { key: 'subject', label: 'Subject', type: 'lookup', lookupModule: 'school/subjects' },
  { key: 'teacherName', label: 'Teacher' },
];

export function TimetablePage() {
  const { records, loading, create, update, remove, reload } = useModuleRecords('school/timetable');
  const classes = useLookupRecords('school/classes');
  const subjects = useLookupRecords('school/subjects');
  const [selectedClass, setSelectedClass] = useState('');
  const [modal, setModal] = useState(null);

  const lookupOptions = {
    'school/classes': names(classes.records),
    'school/subjects': names(subjects.records),
  };

  const classOptions = names(classes.records);

  const filtered = useMemo(() =>
    selectedClass ? records.filter((r) => r.data?.className === selectedClass) : records,
  [records, selectedClass]);

  const periods = useMemo(() =>
    [...new Set(filtered.map((r) => r.data?.period).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true })),
  [filtered]);

  function cellEntry(day, period) {
    return filtered.find((r) => r.data?.day === day && r.data?.period === period);
  }

  async function handleSubmit(form) {
    if (modal.mode === 'edit') await update(modal.record._id, form);
    else await create(form);
    setModal(null);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this timetable entry?')) return;
    await remove(id);
  }

  return (
    <div className="p-4 md:p-7">
      <PageHeader title="Timetable" group="Academic" subtitle="Weekly schedule grid" actionLabel="Add Period" onAction={() => setModal({ mode: 'add', record: selectedClass ? { data: { className: selectedClass } } : null })} moduleKey="school/timetable" fields={FIELDS} onImported={reload} />

      {modal && (
        <FormModal
          title={modal.mode === 'add' ? 'New Timetable Entry' : 'Edit Timetable Entry'}
          fields={FIELDS}
          initial={modal.record?.data}
          lookupOptions={lookupOptions}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
          submitLabel={modal.mode === 'add' ? 'Save' : 'Update'}
        />
      )}

      <div className="bg-white border border-[#dfe7f1] rounded-xl p-4 mb-5 flex items-center gap-3">
        <label className="text-[13px] font-medium text-[#374151]">Class:</label>
        <SelectDropdown
          buttonClassName="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit] bg-white w-56"
          value={selectedClass}
          onChange={setSelectedClass}
          options={[{ value: '', label: 'All classes' }, ...classOptions.map((c) => ({ value: c, label: c }))]}
        />
      </div>

      {loading ? (
        <p className="text-[13px] text-[#536173] px-5 py-8 text-center">Loading…</p>
      ) : periods.length === 0 ? (
        <div className="bg-white border border-[#dfe7f1] rounded-xl py-16 text-center text-[13px] text-[#536173]">No timetable entries yet.</div>
      ) : (
        <div className="bg-white border border-[#dfe7f1] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-4 py-3 border-b border-r border-[#edf2f7] bg-[#f8fafc]">Period</th>
                  {DAYS.map((d) => (
                    <th key={d} className="text-center text-xs font-semibold uppercase tracking-wide text-[#536173] px-3 py-3 border-b border-[#edf2f7] bg-[#f8fafc]">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periods.map((period) => (
                  <tr key={period}>
                    <td className="px-4 py-3 border-b border-r border-[#f3f4f6] text-[13px] font-semibold text-[#111827] bg-[#f8fafc] whitespace-nowrap">{period}</td>
                    {DAYS.map((day) => {
                      const entry = cellEntry(day, period);
                      return (
                        <td key={day} className="px-2 py-2 border-b border-[#f3f4f6] align-top">
                          {entry ? (
                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-2 group relative">
                              <div className="text-[12px] font-semibold text-blue-800">{entry.data?.subject || '—'}</div>
                              <div className="text-[11px] text-[#536173]">{entry.data?.teacherName || 'No teacher'}</div>
                              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <RowActions onEdit={() => setModal({ mode: 'edit', record: entry })} onDelete={() => handleDelete(entry._id)} />
                              </div>
                            </div>
                          ) : (
                            <div className="text-[11px] text-[#cbd5e1] text-center py-2">—</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
