import { useMemo, useState } from 'react';
import { CalendarDays, UtensilsCrossed } from 'lucide-react';

import { useModuleRecords } from '../../../shared/recordUi/useModuleRecords.js';
import { FormModal } from '../../../shared/recordUi/FormModal.jsx';
import { PageHeader } from '../../../shared/recordUi/PageHeader.jsx';
import { RowActions } from '../../../shared/recordUi/RowActions.jsx';
import { todayISO, fmtDate } from '../../../shared/recordUi/dateUtils.js';

const MEALS = ['Breakfast', 'Lunch', 'Dinner'];

const FIELDS = [
  { key: 'mealType', label: 'Meal Type', type: 'select', options: MEALS, required: true },
  { key: 'date', label: 'Date', type: 'date', required: true },
  { key: 'menu', label: 'Menu', type: 'textarea', full: true },
  { key: 'headCount', label: 'Head Count', type: 'number' },
];

export function MessPage() {
  const { records, loading, create, update, remove, reload } = useModuleRecords('school/hostel/mess');
  const [date, setDate] = useState(todayISO());
  const [modal, setModal] = useState(null);

  const dayMeals = useMemo(() => records.filter((r) => r.data?.date === date), [records, date]);

  function mealEntry(mealType) {
    return dayMeals.find((r) => r.data?.mealType === mealType);
  }

  async function handleSubmit(form) {
    if (modal.mode === 'edit') await update(modal.record._id, form);
    else await create(form);
    setModal(null);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this menu entry?')) return;
    await remove(id);
  }

  return (
    <div className="p-4 md:p-7">
      <PageHeader title="Mess" group="Hostel" subtitle="Daily meal menu" actionLabel="Add Menu" onAction={() => setModal({ mode: 'add', record: { data: { date } } })} moduleKey="school/hostel/mess" fields={FIELDS} onImported={reload} />

      {modal && (
        <FormModal
          title={modal.mode === 'add' ? 'New Menu Entry' : 'Edit Menu Entry'}
          fields={FIELDS}
          initial={modal.record?.data}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
          submitLabel={modal.mode === 'add' ? 'Save' : 'Update'}
        />
      )}

      <div className="bg-white border border-[#dfe7f1] rounded-xl p-4 mb-5 flex items-center gap-3">
        <CalendarDays size={16} className="text-blue-600" />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]" />
        <button type="button" onClick={() => setDate(todayISO())} className="text-[12px] text-blue-600 bg-transparent border-0 cursor-pointer font-[inherit] hover:underline">Today</button>
        <span className="text-[13px] text-[#536173] ml-auto">{fmtDate(date)}</span>
      </div>

      {loading ? (
        <p className="text-[13px] text-[#536173] px-5 py-8 text-center">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {MEALS.map((meal) => {
            const entry = mealEntry(meal);
            return (
              <div key={meal} className="bg-white border border-[#dfe7f1] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <UtensilsCrossed size={15} className="text-orange-500" />
                    <span className="text-[13px] font-semibold text-[#111827]">{meal}</span>
                  </div>
                  {entry && <RowActions onEdit={() => setModal({ mode: 'edit', record: entry })} onDelete={() => handleDelete(entry._id)} />}
                </div>
                {entry ? (
                  <>
                    <p className="text-[13px] text-[#374151] whitespace-pre-wrap min-h-10">{entry.data?.menu || 'No menu set'}</p>
                    <div className="text-[11px] text-[#94a3b8] mt-2 pt-2 border-t border-[#f3f4f6]">Head count: {entry.data?.headCount || '—'}</div>
                  </>
                ) : (
                  <p className="text-[12px] text-[#94a3b8] text-center py-6">Not planned yet</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
