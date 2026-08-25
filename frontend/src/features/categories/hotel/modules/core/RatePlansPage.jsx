import { useMemo, useState } from 'react';
import { Edit2, Eye, Plus, Search, Trash2 } from 'lucide-react';

import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';
import { paginateRows, PaginationFooter } from './HotelPagination.jsx';
import { money, PageHeader, ReservationShell, ROOM_TYPES, StatusBadge } from './ReservationShared.jsx';

const MEAL_PLANS = ['All', 'Room Only', 'CP (Breakfast)', 'MAP (Breakfast + Dinner)', 'AP (All Meals)'];
const STATUS_OPTIONS = ['All', 'Active', 'Inactive'];
const EMPTY_PLAN = { name: '', roomTypes: 'All', meal: 'Room Only', rate: '', cancellation: '24 Hours Before Arrival', status: 'Active' };

function Field({ label, children }) {
  return <label className="block"><span className="mb-1.5 block text-[12px] font-semibold text-slate-600">{label}</span>{children}</label>;
}

export function RatePlansPage() {
  const [plans, setPlans] = useState([]);
  const [search, setSearch] = useState('');
  const [roomType, setRoomType] = useState('All');
  const [mealPlan, setMealPlan] = useState('All');
  const [status, setStatus] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_PLAN);
  const [message, setMessage] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [editingKey, setEditingKey] = useState('');

  const filteredPlans = useMemo(() => {
    const query = search.trim().toLowerCase();
    return plans.filter((plan) => {
      const searchMatch = !query || [plan.name, plan.meal, plan.cancellation].some((item) => String(item).toLowerCase().includes(query));
      const roomMatch = roomType === 'All' || plan.roomTypes === 'All' || plan.roomTypes === roomType;
      const mealMatch = mealPlan === 'All' || plan.meal === mealPlan;
      const statusMatch = status === 'All' || plan.status === status;
      return searchMatch && roomMatch && mealMatch && statusMatch;
    });
  }, [mealPlan, plans, roomType, search, status]);

  const pagination = paginateRows(filteredPlans, page, pageSize);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function addPlan(event) {
    event.preventDefault();
    if (!form.name || !form.rate) return;
    const payload = { ...form, rate: Number(form.rate) };
    setPlans((current) => {
      if (!editingKey) return [payload, ...current];
      return current.map((plan) => (`${plan.name}-${plan.rate}` === editingKey ? payload : plan));
    });
    setForm(EMPTY_PLAN);
    setEditingKey('');
    setShowForm(false);
    setMessage(`${form.name} saved.`);
  }

  function editPlan(plan) {
    setEditingKey(`${plan.name}-${plan.rate}`);
    setForm({ ...plan, rate: String(plan.rate || '') });
    setShowForm(true);
    setMessage(`Editing ${plan.name}.`);
  }

  function showPlan(plan) {
    setMessage(`${plan.name}: ${money(plan.rate)} / ${plan.meal} / ${plan.status}`);
  }

  function deletePlan(plan) {
    const ok = window.confirm(`Delete rate plan ${plan.name}?`);
    if (!ok) return;
    setPlans((current) => current.filter((item) => item !== plan));
    setMessage(`${plan.name} deleted.`);
  }

  return (
    <ReservationShell>
      <PageHeader title="Rate Plans" subtitle="Pricing master used when creating reservations">
        <div className="text-[11px] text-slate-500">Home <span className="mx-2">›</span> Reservations <span className="mx-2">›</span> Rate Plans</div>
        <button type="button" onClick={() => { setEditingKey(''); setForm(EMPTY_PLAN); setShowForm((value) => !value); }} className="inline-flex h-10 items-center gap-2 rounded bg-blue-600 px-4 text-[13px] font-bold text-white hover:bg-blue-700"><Plus size={15} />Add Rate Plan</button>
      </PageHeader>

      {message && <p className="mb-4 rounded border border-blue-100 bg-blue-50 px-3 py-2 text-[13px] text-blue-700">{message}</p>}

      {showForm && (
        <form onSubmit={addPlan} className="mb-4 rounded-lg border border-blue-100 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[1fr_170px_190px_130px_200px_120px_auto]">
            <Field label="Rate Plan"><input value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Rate plan name" className="h-10 w-full rounded border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" /></Field>
            <Field label="Room Types"><SelectDropdown value={form.roomTypes} onChange={(value) => update('roomTypes', value)} options={ROOM_TYPES} /></Field>
            <Field label="Meal Plan"><SelectDropdown value={form.meal} onChange={(value) => update('meal', value)} options={MEAL_PLANS.filter((item) => item !== 'All')} /></Field>
            <Field label="Rate"><input type="number" value={form.rate} onChange={(event) => update('rate', event.target.value)} className="h-10 w-full rounded border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" /></Field>
            <Field label="Cancellation Policy"><input value={form.cancellation} onChange={(event) => update('cancellation', event.target.value)} className="h-10 w-full rounded border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" /></Field>
            <Field label="Status"><SelectDropdown value={form.status} onChange={(value) => update('status', value)} options={STATUS_OPTIONS.filter((item) => item !== 'All')} /></Field>
            <button type="submit" className="mt-6 h-10 rounded bg-blue-600 px-4 text-[13px] font-bold text-white">{editingKey ? 'Update' : 'Save'}</button>
          </div>
        </form>
      )}

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-3 border-b border-slate-100 p-4 lg:grid-cols-[minmax(260px,1fr)_190px_190px_150px]">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search rate plan..." className="h-10 w-full rounded border border-slate-200 pl-9 pr-3 text-[13px] outline-none focus:border-blue-500" />
          </div>
          <SelectDropdown value={roomType} onChange={setRoomType} options={ROOM_TYPES} />
          <SelectDropdown value={mealPlan} onChange={setMealPlan} options={MEAL_PLANS} />
          <SelectDropdown value={status} onChange={setStatus} options={STATUS_OPTIONS} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-[13px]">
            <thead className="bg-slate-50 text-[12px] text-slate-500">
              <tr>
                <th className="px-4 py-3">Rate Plan</th>
                <th className="px-4 py-3">Room Types</th>
                <th className="px-4 py-3">Meal Plan</th>
                <th className="px-4 py-3">Rate</th>
                <th className="px-4 py-3">Cancellation Policy</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {pagination.pageRows.map((plan) => (
                <tr key={`${plan.name}-${plan.rate}`} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-slate-950">{plan.name}</td>
                  <td className="px-4 py-3">{plan.roomTypes}</td>
                  <td className="px-4 py-3">{plan.meal}</td>
                  <td className="px-4 py-3 font-bold">{money(plan.rate)}</td>
                  <td className="px-4 py-3">{plan.cancellation}</td>
                  <td className="px-4 py-3"><StatusBadge status={plan.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-3 text-slate-600">
                      <button type="button" onClick={() => showPlan(plan)} aria-label={`View ${plan.name}`} className="text-blue-700"><Eye size={15} /></button>
                      <button type="button" onClick={() => editPlan(plan)} aria-label={`Edit ${plan.name}`} className="text-blue-700"><Edit2 size={15} /></button>
                      <button type="button" onClick={() => deletePlan(plan)} aria-label={`Delete ${plan.name}`} className="text-red-600"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPlans.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-[13px] text-slate-500">
                    No rate plans found. Add a rate plan to use pricing in New Reservation.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-[12px] text-slate-500">
          <span>Showing {pagination.start} to {pagination.end} of {filteredPlans.length} entries</span>
          <div className="flex items-center gap-2"><button type="button" className="grid h-8 w-8 place-items-center rounded border border-blue-600 bg-blue-600 text-white">1</button><button type="button" className="grid h-8 w-8 place-items-center rounded border border-slate-200 bg-white">›</button></div>
          <PaginationFooter page={pagination.currentPage} pageSize={pageSize} total={filteredPlans.length} start={pagination.start} end={pagination.end} totalPages={pagination.totalPages} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </div>
      </section>
    </ReservationShell>
  );
}
