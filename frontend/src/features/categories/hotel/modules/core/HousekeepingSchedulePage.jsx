import { useMemo, useState } from 'react';
import { CalendarDays } from 'lucide-react';

import { AddIcon, HkBadge, HkCard, HkPageHeader, HkPrimaryButton, HkSecondaryButton, HkTableActions, schedules } from './HousekeepingShared.jsx';

const modes = ['Day', 'Week', 'Month'];

export function HousekeepingSchedulePage() {
  const [mode, setMode] = useState('Day');
  const [scheduleRows, setScheduleRows] = useState(schedules);
  const [selected, setSelected] = useState(schedules[0] || null);
  const [message, setMessage] = useState('');
  const today = new Date().toLocaleDateString('en-IN');

  const grouped = useMemo(() => ['Morning Shift', 'Evening Shift', 'Night Shift'].map((shift) => ({
    shift,
    time: scheduleRows.find((item) => item.shift === shift)?.time || '',
    rows: scheduleRows.filter((item) => item.shift === shift),
  })), [scheduleRows]);

  function handleScheduleAction(action, row) {
    if (!row) return;
    if (action === 'View') {
      setSelected(row);
      setMessage(`${row.staff}: ${row.area}, ${row.rooms} rooms.`);
    }
    if (action === 'Edit') {
      setSelected(row);
      setMessage(`Editing schedule for ${row.staff}.`);
    }
    if (action === 'Complete') {
      const updated = { ...row, status: 'Completed', completed: row.rooms, pending: 0, workload: 100 };
      setScheduleRows((current) => current.map((item) => (item === row ? updated : item)));
      setSelected(updated);
      setMessage(`${row.staff}'s schedule marked completed.`);
    }
  }

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6">
      <HkPageHeader
        title="Housekeeping Schedule"
        subtitle={`Date: ${today}`}
        actions={(
          <>
            <div className="inline-flex rounded-md border border-slate-200 bg-white p-1">
              {modes.map((item) => (
                <button key={item} type="button" onClick={() => setMode(item)} className={`rounded px-3 py-1.5 text-[13px] font-semibold ${mode === item ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>{item}</button>
              ))}
            </div>
            <HkPrimaryButton><AddIcon />Assign Schedule</HkPrimaryButton>
          </>
        )}
      />

      {message && <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[13px] font-semibold text-blue-700">{message}</div>}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {grouped.map((group) => (
            <HkCard key={group.shift}>
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div>
                  <h2 className="m-0 text-[15px] font-bold uppercase tracking-wide text-slate-950">{group.shift}</h2>
                  <p className="m-0 mt-1 text-[13px] font-semibold text-slate-500">{group.time}</p>
                </div>
                <CalendarDays size={17} className="text-blue-600" />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-3 font-semibold">Housekeeper</th>
                      <th className="px-4 py-3 font-semibold">Assigned Area</th>
                      <th className="px-4 py-3 font-semibold">Rooms</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.map((row) => (
                      <tr key={`${row.staff}-${row.shift}`} onClick={() => setSelected(row)} className={`cursor-pointer border-t border-slate-100 hover:bg-slate-50 ${selected?.staff === row.staff ? 'bg-blue-50/60' : ''}`}>
                        <td className="px-4 py-3 text-[13px] font-semibold text-slate-950">{row.staff}</td>
                        <td className="px-4 py-3 text-[13px] text-slate-700">{row.area}</td>
                        <td className="px-4 py-3 text-[13px] text-slate-700">{row.rooms}</td>
                        <td className="px-4 py-3"><HkBadge>{row.status}</HkBadge></td>
                        <td className="px-4 py-3"><HkTableActions item={row} onAction={handleScheduleAction} /></td>
                      </tr>
                    ))}
                    {group.rows.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-[13px] text-slate-500">No schedule assigned for this shift.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </HkCard>
          ))}
        </div>

        <HkCard className="p-4">
          {!selected ? (
            <p className="m-0 text-[13px] text-slate-500">Select or assign a schedule to view details.</p>
          ) : (
            <>
          <h2 className="m-0 text-[18px] font-bold text-slate-950">{selected.staff}</h2>
          <p className="m-0 mt-1 text-[13px] font-semibold text-slate-500">{selected.shift}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-md bg-blue-50 p-3 text-blue-700"><div className="text-[12px] font-semibold">Assigned Rooms</div><div className="mt-1 text-xl font-bold">{selected.rooms}</div></div>
            <div className="rounded-md bg-slate-50 p-3 text-slate-700"><div className="text-[12px] font-semibold">Area</div><div className="mt-1 text-xl font-bold">{selected.area}</div></div>
            <div className="rounded-md bg-amber-50 p-3 text-amber-700"><div className="text-[12px] font-semibold">Pending</div><div className="mt-1 text-xl font-bold">{selected.pending}</div></div>
            <div className="rounded-md bg-emerald-50 p-3 text-emerald-700"><div className="text-[12px] font-semibold">Completed</div><div className="mt-1 text-xl font-bold">{selected.completed}</div></div>
          </div>
          <div className="mt-5">
            <div className="mb-2 flex justify-between text-[13px] font-semibold"><span>Workload</span><span className="text-blue-700">{selected.workload}%</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${selected.workload}%` }} /></div>
          </div>
          <div className="mt-5 rounded-md bg-slate-50 p-3 text-[13px] text-slate-600">This page plans staff shifts. Cleaning Tasks holds the actual work assigned from this schedule.</div>
          <div className="mt-4 grid gap-2">
            <HkSecondaryButton>Edit Schedule</HkSecondaryButton>
            <HkSecondaryButton>Replace Staff</HkSecondaryButton>
          </div>
            </>
          )}
        </HkCard>
      </div>
    </div>
  );
}
