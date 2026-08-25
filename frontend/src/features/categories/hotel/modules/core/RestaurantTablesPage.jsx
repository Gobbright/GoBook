import { useMemo, useState } from 'react';
import { Clock3, Plus, Users } from 'lucide-react';

import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';
import {
  AddIcon,
  PosBadge,
  PosCard,
  PosPageHeader,
  PosPrimaryButton,
  restaurantTables,
} from './RestaurantPosShared.jsx';

const statusStyles = {
  Available: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Occupied: 'border-blue-200 bg-blue-50 text-blue-700',
  Reserved: 'border-orange-200 bg-orange-50 text-orange-700',
  Cleaning: 'border-violet-200 bg-violet-50 text-violet-700',
  'Out of Order': 'border-red-200 bg-red-50 text-red-600',
};

export function RestaurantTablesPage() {
  const [floor, setFloor] = useState('Main Floor');
  const [selected, setSelected] = useState('A2');
  const [tables, setTables] = useState(restaurantTables);
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ id: '', zone: 'Zone A', floor: 'Main Floor', capacity: '2', tableType: 'Rectangle', status: 'Available' });

  const selectedTable = tables.find((table) => table.id === selected);
  const zones = useMemo(() => {
    const grouped = new Map();
    tables.forEach((table) => {
      if (!grouped.has(table.zone)) grouped.set(table.zone, []);
      grouped.get(table.zone).push(table);
    });
    return [...grouped.entries()];
  }, [tables]);

  function addTable() {
    const next = { id: form.id, zone: form.zone, floor: form.floor, capacity: Number(form.capacity), tableType: form.tableType, status: form.status, duration: '' };
    setTables((current) => [...current, next]);
    setSelected(next.id);
    setForm({ id: '', zone: 'Zone A', floor: 'Main Floor', capacity: '2', tableType: 'Rectangle', status: 'Available' });
    setShowForm(false);
    setMessage(`${next.id} added to ${next.zone}.`);
  }

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6">
      <PosPageHeader
        title="Table Management"
        subtitle="Manage dining tables, reservations, cleaning, and seating movement."
        actions={<PosPrimaryButton onClick={() => setShowForm((value) => !value)}><AddIcon />Add Table</PosPrimaryButton>}
      />

      {message && <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[13px] font-semibold text-blue-700">{message}</div>}

      {showForm && (
        <form onSubmit={(event) => { event.preventDefault(); if (form.id) addTable(); }} className="mb-4 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-[140px_160px_160px_120px_160px_160px_auto]">
          <input value={form.id} onChange={(event) => setForm((current) => ({ ...current, id: event.target.value }))} placeholder="Table no. *" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
          <SelectDropdown value={form.zone} onChange={(zone) => setForm((current) => ({ ...current, zone }))} options={['Zone A', 'Zone B']} />
          <SelectDropdown value={form.floor} onChange={(floor) => setForm((current) => ({ ...current, floor }))} options={['Main Floor', 'Garden Area', 'Rooftop']} />
          <input value={form.capacity} onChange={(event) => setForm((current) => ({ ...current, capacity: event.target.value }))} type="number" min="1" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
          <SelectDropdown value={form.tableType} onChange={(tableType) => setForm((current) => ({ ...current, tableType }))} options={['Rectangle', 'Round', 'Square', 'Outdoor']} />
          <SelectDropdown value={form.status} onChange={(status) => setForm((current) => ({ ...current, status }))} options={['Available', 'Occupied', 'Reserved', 'Cleaning', 'Out of Order']} />
          <PosPrimaryButton type="submit">Save Table</PosPrimaryButton>
        </form>
      )}

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <PosCard className="p-4">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="w-full max-w-48">
              <SelectDropdown value={floor} onChange={setFloor} options={['Main Floor', 'Garden Area', 'Rooftop']} />
            </div>
            <div className="flex flex-wrap gap-4 text-[12px] font-semibold text-slate-600">
              {Object.keys(statusStyles).map((status) => (
                <span key={status} className="inline-flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${statusStyles[status].split(' ')[1]}`} />
                  {status}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            {zones.map(([zone, tables]) => (
              <section key={zone}>
                <h2 className="m-0 mb-3 text-[14px] font-bold text-slate-950">{zone}</h2>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                  {tables.map((table) => (
                    <button
                      key={table.id}
                      type="button"
                      onClick={() => setSelected(table.id)}
                      className={`min-h-24 rounded-lg border p-3 text-center transition hover:shadow-sm ${statusStyles[table.status]} ${selected === table.id ? 'ring-2 ring-blue-200' : ''}`}
                    >
                      <div className="text-[15px] font-bold">{table.id}</div>
                      {table.status === 'Occupied' && <div className="mt-1 flex justify-center text-[12px]"><Users size={14} /></div>}
                      <div className="mt-2 text-[12px] font-semibold">{table.status}</div>
                      {table.duration && <div className="mt-1 text-[11px] font-semibold">{table.duration}</div>}
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-4 text-[12px] font-semibold text-slate-500">
            <span className="inline-flex items-center gap-1"><Users size={14} /> 2 Number of Guests</span>
            <span className="inline-flex items-center gap-1"><Clock3 size={14} /> 00:30 Duration</span>
          </div>
        </PosCard>

        <PosCard className="p-4">
          <h2 className="m-0 text-[16px] font-bold text-slate-950">Selected Table</h2>
          {selectedTable && (
            <>
              <div className="mt-4 rounded-lg bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[28px] font-bold leading-none text-slate-950">{selectedTable.id}</div>
                    <div className="mt-2 text-[13px] font-semibold text-slate-500">{selectedTable.zone} - {floor}</div>
                  </div>
                  <PosBadge>{selectedTable.status}</PosBadge>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[12px] font-semibold text-slate-500">Capacity</div>
                    <div className="mt-1 text-[18px] font-bold text-slate-950">{selectedTable.capacity}</div>
                  </div>
                  <div>
                    <div className="text-[12px] font-semibold text-slate-500">Duration</div>
                    <div className="mt-1 text-[18px] font-bold text-slate-950">{selectedTable.duration || '-'}</div>
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-2">
                <button type="button" onClick={() => setMessage(`Order opened for table ${selectedTable.id}.`)} className="h-10 rounded-md border border-blue-200 bg-blue-50 px-3 text-[13px] font-semibold text-blue-700">Open Order</button>
                <button type="button" onClick={() => {
                  setTables((current) => current.map((table) => (table.id === selectedTable.id ? { ...table, status: 'Reserved', duration: '07:30 PM' } : table)));
                  setMessage(`${selectedTable.id} reserved.`);
                }} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-700">Reserve Table</button>
                <button type="button" onClick={() => setMessage(`Transfer order started for ${selectedTable.id}.`)} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-700">Transfer Order</button>
                <button type="button" onClick={() => setMessage(`${selectedTable.id} selected for merge.`)} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-700">
                  <Plus size={14} />
                  Merge Tables
                </button>
              </div>
            </>
          )}
        </PosCard>
      </section>
    </div>
  );
}
