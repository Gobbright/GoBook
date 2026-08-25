import { useMemo, useState } from 'react';
import { Building2, CircleGauge, Home, Plus } from 'lucide-react';

import {
  RoomsCard,
  RoomsPageHeader,
  RoomsPrimaryButton,
  RoomsTableActions,
  floors,
} from './RoomsAvailabilityShared.jsx';

function SummaryTile({ label, value, tone = 'slate' }) {
  const tones = {
    slate: 'text-slate-950',
    blue: 'text-blue-700',
    green: 'text-emerald-700',
    amber: 'text-amber-700',
    red: 'text-red-600',
  };
  return (
    <div className="border-r border-slate-100 px-4 py-2 last:border-r-0">
      <div className="text-[12px] font-semibold text-slate-500">{label}</div>
      <div className={`mt-2 text-[24px] font-bold leading-none ${tones[tone]}`}>{value}</div>
    </div>
  );
}

export function FloorBuildingPage() {
  const [floorRows, setFloorRows] = useState(floors);
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ buildingName: 'Main Building', buildingCode: 'MAIN', address: '', name: '', floorNumber: '', floorCode: '', totalRooms: '', range: '', description: '', status: 'Active' });
  const totals = useMemo(() => floorRows.reduce((acc, floor) => ({
    floors: acc.floors + 1,
    totalRooms: acc.totalRooms + floor.totalRooms,
    available: acc.available + floor.available,
    occupied: acc.occupied + floor.occupied,
    reserved: acc.reserved + floor.reserved,
    outOfOrder: acc.outOfOrder + floor.outOfOrder,
  }), { floors: 0, totalRooms: 0, available: 0, occupied: 0, reserved: 0, outOfOrder: 0 }), [floorRows]);

  function addFloor() {
    const totalRooms = Number(form.totalRooms);
    const next = { name: form.name || form.buildingName, buildingName: form.buildingName, buildingCode: form.buildingCode, address: form.address, floorNumber: form.floorNumber, floorCode: form.floorCode, description: form.description, status: form.status, totalRooms, range: form.range, available: totalRooms, occupied: 0, reserved: 0, outOfOrder: 0 };
    setFloorRows((current) => [...current, next]);
    setForm({ buildingName: 'Main Building', buildingCode: 'MAIN', address: '', name: '', floorNumber: '', floorCode: '', totalRooms: '', range: '', description: '', status: 'Active' });
    setShowForm(false);
    setMessage(`${next.name} added to Main Building.`);
  }

  function handleFloorAction(action, floor) {
    if (!floor) return;
    if (action === 'View') setMessage(`${floor.name}: ${floor.totalRooms} rooms, ${floor.available} available.`);
    if (action === 'Edit') {
      setForm({
        buildingName: floor.buildingName || 'Main Building',
        buildingCode: floor.buildingCode || 'MAIN',
        address: floor.address || '',
        name: floor.name || '',
        floorNumber: floor.floorNumber || '',
        floorCode: floor.floorCode || '',
        totalRooms: String(floor.totalRooms || ''),
        range: floor.range || '',
        description: floor.description || '',
        status: floor.status || 'Active',
      });
      setShowForm(true);
      setMessage(`Editing ${floor.name}.`);
    }
    if (action === 'Delete') {
      const ok = window.confirm(`Delete ${floor.name}?`);
      if (!ok) return;
      setFloorRows((current) => current.filter((item) => item !== floor));
      setMessage(`${floor.name} deleted.`);
    }
  }

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6">
      <RoomsPageHeader
        title="Floor / Building"
        subtitle="Manage floors and room allocation"
        actions={(
          <RoomsPrimaryButton onClick={() => setShowForm((value) => !value)}>
            <Plus size={15} />
            Add Floor
          </RoomsPrimaryButton>
        )}
      />

      {message && <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[13px] font-semibold text-blue-700">{message}</div>}

      {showForm && (
        <form onSubmit={(event) => { event.preventDefault(); if (form.buildingName && form.name && form.totalRooms && form.range) addFloor(); }} className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 text-[14px] font-bold text-slate-950">Add Floor / Building</div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <input value={form.buildingName} onChange={(event) => setForm((current) => ({ ...current, buildingName: event.target.value }))} placeholder="Building name *" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
            <input value={form.buildingCode} onChange={(event) => setForm((current) => ({ ...current, buildingCode: event.target.value }))} placeholder="Building code" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
            <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Floor name *" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
            <input value={form.floorNumber} onChange={(event) => setForm((current) => ({ ...current, floorNumber: event.target.value }))} type="number" min="0" placeholder="Floor number" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
            <input value={form.floorCode} onChange={(event) => setForm((current) => ({ ...current, floorCode: event.target.value }))} placeholder="Floor code" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
            <input value={form.totalRooms} onChange={(event) => setForm((current) => ({ ...current, totalRooms: event.target.value }))} type="number" min="1" placeholder="Rooms *" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
            <input value={form.range} onChange={(event) => setForm((current) => ({ ...current, range: event.target.value }))} placeholder="Room range *" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
            <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500">
              {['Active', 'Inactive'].map((item) => <option key={item}>{item}</option>)}
            </select>
            <input value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} placeholder="Address" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500 md:col-span-2" />
            <input value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Description" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
            <RoomsPrimaryButton type="submit">Save Floor</RoomsPrimaryButton>
          </div>
        </form>
      )}

      <RoomsCard>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-semibold">Floor / Building</th>
                <th className="px-4 py-3 font-semibold">Total Rooms</th>
                <th className="px-4 py-3 font-semibold">Room Range</th>
                <th className="px-4 py-3 font-semibold">Available</th>
                <th className="px-4 py-3 font-semibold">Occupied</th>
                <th className="px-4 py-3 font-semibold">Reserved</th>
                <th className="px-4 py-3 font-semibold">Out of Order</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {floorRows.map((floor) => (
                <tr key={floor.name} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-[13px] font-semibold text-slate-950">{floor.name}</td>
                  <td className="px-4 py-3 text-[13px] text-slate-700">{floor.totalRooms}</td>
                  <td className="px-4 py-3 text-[13px] text-slate-700">{floor.range}</td>
                  <td className="px-4 py-3 text-[13px] font-semibold text-emerald-700">{floor.available}</td>
                  <td className="px-4 py-3 text-[13px] font-semibold text-blue-700">{floor.occupied}</td>
                  <td className="px-4 py-3 text-[13px] font-semibold text-orange-700">{floor.reserved}</td>
                  <td className="px-4 py-3 text-[13px] font-semibold text-red-600">{floor.outOfOrder}</td>
                  <td className="px-4 py-3"><RoomsTableActions item={floor} onAction={handleFloorAction} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </RoomsCard>

      <RoomsCard className="mt-5 p-5">
        <h2 className="m-0 mb-4 text-[16px] font-bold text-slate-950">Building Summary</h2>
        <div className="grid grid-cols-2 gap-y-4 md:grid-cols-3 xl:grid-cols-6">
          <SummaryTile label="Total Floors" value={totals.floors} tone="blue" />
          <SummaryTile label="Total Rooms" value={totals.totalRooms} />
          <SummaryTile label="Available" value={totals.available} tone="green" />
          <SummaryTile label="Occupied" value={totals.occupied} tone="blue" />
          <SummaryTile label="Reserved" value={totals.reserved} tone="amber" />
          <SummaryTile label="Out of Order" value={totals.outOfOrder} tone="red" />
        </div>
      </RoomsCard>

      <RoomsCard className="mt-5 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Building2 size={18} className="text-blue-600" />
          <h2 className="m-0 text-[16px] font-bold text-slate-950">Main Building Allocation</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {floorRows.map((floor) => (
            <div key={floor.name} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[15px] font-bold text-slate-950">{floor.name}</div>
                <Home size={16} className="text-blue-600" />
              </div>
              <div className="mt-3 text-[12px] text-slate-500">Rooms {floor.range}</div>
              <div className="mt-4 h-2 rounded-full bg-slate-200">
                <div className="h-2 rounded-full bg-blue-600" style={{ width: `${Math.round((floor.occupied / floor.totalRooms) * 100)}%` }} />
              </div>
              <div className="mt-3 flex items-center gap-2 text-[12px] font-semibold text-slate-600">
                <CircleGauge size={14} />
                {Math.round((floor.occupied / floor.totalRooms) * 100)}% occupied
              </div>
            </div>
          ))}
        </div>
      </RoomsCard>
    </div>
  );
}
