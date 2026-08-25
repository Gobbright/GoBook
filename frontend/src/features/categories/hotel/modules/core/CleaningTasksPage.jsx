import { useMemo, useState } from 'react';
import { CheckCircle2, Filter } from 'lucide-react';

import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';
import { AddIcon, HkBadge, HkCard, HkPageHeader, HkPrimaryButton, HkSearch, HkSecondaryButton, HkTableActions, cleaningTasks } from './HousekeepingShared.jsx';
import { paginateRows, PaginationFooter } from './HotelPagination.jsx';

const checklist = ['Remove used linen', 'Change bedsheet', 'Clean bathroom', 'Replace towels', 'Refill toiletries', 'Clean floor', 'Check minibar', 'Final room inspection'];

export function CleaningTasksPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All Status');
  const [priority, setPriority] = useState('All Priority');
  const [tasks, setTasks] = useState(cleaningTasks);
  const [selected, setSelected] = useState(cleaningTasks[0] || null);
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ room: '', type: 'Checkout Cleaning', assigned: '', priority: 'Normal', status: 'Pending', started: '', notes: '' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tasks.filter((task) => {
      const matchesSearch = !query || [task.id, task.room, task.assigned].some((value) => value.toLowerCase().includes(query));
      const matchesStatus = status === 'All Status' || task.status === status;
      const matchesPriority = priority === 'All Priority' || task.priority === priority;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [priority, search, status, tasks]);

  const pagination = paginateRows(filtered, page, pageSize);

  function createTask() {
    const next = {
      id: `HK-${1026 + tasks.length}`,
      room: form.room,
      type: form.type,
      assigned: form.assigned || '-',
      priority: form.priority,
      status: form.status,
      started: form.started || '-',
      notes: form.notes,
      progress: form.status === 'Completed' ? 100 : 0,
    };
    setTasks((current) => [next, ...current]);
    setSelected(next);
    setForm({ room: '', type: 'Checkout Cleaning', assigned: '', priority: 'Normal', status: 'Pending', started: '', notes: '' });
    setShowForm(false);
    setMessage(`${next.id} created for room ${next.room}.`);
  }

  function handleTaskAction(action, task) {
    if (!task) return;
    if (action === 'View') {
      setSelected(task);
      setMessage(`${task.id} selected.`);
      return;
    }
    if (action === 'Edit') {
      setSelected(task);
      setForm({
        room: task.room || '',
        type: task.type || 'Checkout Cleaning',
        assigned: task.assigned === '-' ? '' : task.assigned || '',
        priority: task.priority || 'Normal',
        status: task.status || 'Pending',
        started: task.started === '-' ? '' : task.started || '',
        notes: task.notes || '',
      });
      setShowForm(true);
      setMessage(`Editing ${task.id}.`);
      return;
    }
    if (action === 'Complete') {
      const updated = { ...task, status: 'Completed', progress: 100 };
      setTasks((current) => current.map((item) => (item.id === task.id ? updated : item)));
      setSelected(updated);
      setMessage(`${task.id} completed.`);
    }
  }

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6">
      <HkPageHeader
        title="Cleaning Tasks"
        subtitle="Manage room cleaning work and inspections"
        actions={<HkPrimaryButton onClick={() => setShowForm((value) => !value)}><AddIcon />Create Task</HkPrimaryButton>}
      />

      {message && <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[13px] font-semibold text-blue-700">{message}</div>}

      {showForm && (
        <form onSubmit={(event) => { event.preventDefault(); if (form.room) createTask(); }} className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 text-[14px] font-bold text-slate-950">Create Cleaning Task</div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-7">
            <input value={form.room} onChange={(event) => setForm((current) => ({ ...current, room: event.target.value }))} placeholder="Room *" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
            <SelectDropdown value={form.type} onChange={(type) => setForm((current) => ({ ...current, type }))} options={['Checkout Cleaning', 'Daily Clean', 'Deep Clean', 'VIP Cleaning', 'Inspection', 'Turn-down Service', 'Special Cleaning']} />
            <input value={form.assigned} onChange={(event) => setForm((current) => ({ ...current, assigned: event.target.value }))} placeholder="Assigned to" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
            <SelectDropdown value={form.priority} onChange={(priority) => setForm((current) => ({ ...current, priority }))} options={['High', 'Normal', 'Low']} />
            <SelectDropdown value={form.status} onChange={(status) => setForm((current) => ({ ...current, status }))} options={['Pending', 'Cleaning', 'Inspection', 'Completed']} />
            <input value={form.started} onChange={(event) => setForm((current) => ({ ...current, started: event.target.value }))} placeholder="Start time" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
            <input value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Notes / issue" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
            <HkPrimaryButton type="submit">Save Task</HkPrimaryButton>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <HkCard>
          <div className="grid grid-cols-1 gap-3 border-b border-slate-100 p-4 lg:grid-cols-[1fr_170px_170px_auto]">
            <HkSearch value={search} onChange={setSearch} placeholder="Room / Guest / Task ID" />
            <SelectDropdown value={status} onChange={setStatus} options={['All Status', 'Pending', 'Cleaning', 'Inspection', 'Completed']} />
            <SelectDropdown value={priority} onChange={setPriority} options={['All Priority', 'High', 'Normal', 'Low']} />
            <HkSecondaryButton><Filter size={15} />Filter</HkSecondaryButton>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-semibold">Task ID</th>
                  <th className="px-4 py-3 font-semibold">Room</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Assigned</th>
                  <th className="px-4 py-3 font-semibold">Priority</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {pagination.pageRows.map((task) => (
                  <tr key={task.id} onClick={() => setSelected(task)} className={`cursor-pointer border-t border-slate-100 hover:bg-slate-50 ${selected?.id === task.id ? 'bg-blue-50/60' : ''}`}>
                    <td className="px-4 py-3 text-[13px] font-semibold text-slate-950">{task.id}</td>
                    <td className="px-4 py-3 text-[13px] text-slate-700">{task.room}</td>
                    <td className="px-4 py-3 text-[13px] text-slate-700">{task.type}</td>
                    <td className="px-4 py-3 text-[13px] text-slate-700">{task.assigned}</td>
                    <td className="px-4 py-3"><HkBadge>{task.priority}</HkBadge></td>
                    <td className="px-4 py-3"><HkBadge>{task.status}</HkBadge></td>
                    <td className="px-4 py-3"><HkTableActions item={task} onAction={handleTaskAction} /></td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-[13px] text-slate-500">No cleaning tasks found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <PaginationFooter page={pagination.currentPage} pageSize={pageSize} total={filtered.length} start={pagination.start} end={pagination.end} totalPages={pagination.totalPages} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </HkCard>

        <HkCard className="p-4">
          <h2 className="m-0 text-[18px] font-bold text-slate-950">Cleaning Task</h2>
          {!selected ? (
            <p className="m-0 mt-3 text-[13px] text-slate-500">Select or create a cleaning task to view details.</p>
          ) : (
            <>
          <p className="m-0 mt-1 text-[13px] font-semibold text-slate-500">Task ID: {selected.id}</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
            <div><span className="text-slate-500">Room</span><div className="mt-1 font-bold text-slate-950">{selected.room}</div></div>
            <div><span className="text-slate-500">Assigned</span><div className="mt-1 font-bold text-slate-950">{selected.assigned}</div></div>
            <div><span className="text-slate-500">Type</span><div className="mt-1 font-bold text-slate-950">{selected.type}</div></div>
            <div><span className="text-slate-500">Started</span><div className="mt-1 font-bold text-slate-950">{selected.started}</div></div>
          </div>
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-[13px] font-semibold">
              <span>Checklist Progress</span>
              <span className="text-blue-700">{selected.progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${selected.progress}%` }} /></div>
          </div>
          <div className="mt-4 space-y-2">
            {checklist.map((item, index) => (
              <label key={item} className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] font-semibold text-slate-700">
                <input type="checkbox" defaultChecked={index < Math.round((selected.progress / 100) * checklist.length)} />
                {item}
              </label>
            ))}
          </div>
          <div className="mt-5 grid gap-2">
            <HkSecondaryButton onClick={() => setMessage(`${selected.id} progress saved.`)}>Save Progress</HkSecondaryButton>
            <HkPrimaryButton onClick={() => setMessage(`${selected.id} marked completed and sent for inspection.`)}><CheckCircle2 size={15} />Complete Cleaning</HkPrimaryButton>
          </div>
            </>
          )}
        </HkCard>
      </div>
    </div>
  );
}
