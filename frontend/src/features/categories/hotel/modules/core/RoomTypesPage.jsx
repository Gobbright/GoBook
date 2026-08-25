import { useEffect, useMemo, useState } from 'react';
import { Bath, Monitor, Plus, Snowflake, Wifi } from 'lucide-react';

import {
  RoomsBadge,
  RoomsCard,
  RoomsPageHeader,
  RoomsPrimaryButton,
  RoomsStatCard,
  RoomsTableActions,
  money,
  roomTypes,
} from './RoomsAvailabilityShared.jsx';
import { createModuleRecord, deleteModuleRecord, listModuleRecords } from '../../../../../services/moduleRecordsService.js';
import { paginateRows, PaginationFooter } from './HotelPagination.jsx';

const amenityIcons = {
  'Wi-Fi': Wifi,
  AC: Snowflake,
  TV: Monitor,
  Bath,
};

export function RoomTypesPage() {
  const [message, setMessage] = useState('');
  const [types, setTypes] = useState(roomTypes);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [form, setForm] = useState({
    name: '',
    code: '',
    description: '',
    maxAdults: '2',
    maxChildren: '1',
    maxOccupancy: '3',
    bedType: 'King Bed',
    beds: '1',
    baseRate: '',
    extraAdult: '',
    extraChild: '',
    amenities: 'Wi-Fi, AC, TV, Room Service',
    status: 'Active',
  });
  const totals = useMemo(() => {
    const active = types.filter((item) => item.status === 'Active').length;
    const adults = types.reduce((sum, item) => sum + Number(item.capacity.match(/\d+/)?.[0] || 0), 0);
    const averageRate = types.length ? Math.round(types.reduce((sum, item) => sum + item.baseRate, 0) / types.length) : 0;
    const mostPopular = [...types].sort((a, b) => b.rooms - a.rooms)[0];
    return { active, adults, averageRate, mostPopular };
  }, [types]);

  const pagination = paginateRows(types, page, pageSize);

  useEffect(() => {
    let active = true;
    listModuleRecords('hotel/rooms-availability/room-types')
      .then((res) => {
        if (!active) return;
        setTypes((res.records || []).map((record) => {
          const data = record.data || {};
          return {
            recordId: record._id,
            name: data.name || data.roomType || '',
            code: data.code || '',
            description: data.description || '',
            capacity: data.capacity || `${data.maxAdults || 0} Adults${Number(data.maxChildren || 0) ? ` + ${data.maxChildren} Child` : ''}`,
            bedType: data.bedType || '',
            beds: Number(data.beds || 0),
            baseRate: Number(data.baseRate || data.rate || 0),
            extraAdult: Number(data.extraAdult || 0),
            extraChild: Number(data.extraChild || 0),
            maxOccupancy: Number(data.maxOccupancy || 0),
            amenities: Array.isArray(data.amenities) ? data.amenities : String(data.amenities || '').split(',').map((item) => item.trim()).filter(Boolean),
            status: data.status || 'Active',
            rooms: Number(data.rooms || 0),
          };
        }));
      })
      .catch(() => {
        if (active) setTypes([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  async function addRoomType() {
    const amenities = form.amenities.split(',').map((item) => item.trim()).filter(Boolean);
    const next = {
      name: form.name,
      code: form.code,
      description: form.description,
      capacity: `${form.maxAdults} Adults${Number(form.maxChildren) ? ` + ${form.maxChildren} Child` : ''}`,
      bedType: form.bedType,
      beds: Number(form.beds),
      baseRate: Number(form.baseRate),
      extraAdult: Number(form.extraAdult) || 0,
      extraChild: Number(form.extraChild) || 0,
      maxOccupancy: Number(form.maxOccupancy),
      amenities,
      status: form.status,
      rooms: 0,
    };
    try {
      const saved = await createModuleRecord('hotel/rooms-availability/room-types', next);
      setTypes((current) => [{ ...next, recordId: saved.record?._id }, ...current]);
      setForm({ name: '', code: '', description: '', maxAdults: '2', maxChildren: '1', maxOccupancy: '3', bedType: 'King Bed', beds: '1', baseRate: '', extraAdult: '', extraChild: '', amenities: 'Wi-Fi, AC, TV, Room Service', status: 'Active' });
      setShowForm(false);
      setMessage(`${next.name} added. Rooms and availability can now use this room type.`);
    } catch (err) {
      setMessage(err.message || 'Unable to save room type.');
    }
  }

  async function handleTypeAction(action, type) {
    if (!type) return;
    if (action === 'View') {
      setMessage(`${type.name}: ${money(type.baseRate)} base rate, ${type.status}`);
      return;
    }
    if (action === 'Edit') {
      setForm({
        name: type.name || '',
        code: type.code || '',
        description: type.description || '',
        maxAdults: String(type.capacity?.match(/\d+/)?.[0] || 2),
        maxChildren: '0',
        maxOccupancy: String(type.maxOccupancy || 3),
        bedType: type.bedType || 'King Bed',
        beds: String(type.beds || 1),
        baseRate: String(type.baseRate || ''),
        extraAdult: String(type.extraAdult || ''),
        extraChild: String(type.extraChild || ''),
        amenities: Array.isArray(type.amenities) ? type.amenities.join(', ') : '',
        status: type.status || 'Active',
      });
      setShowForm(true);
      setMessage(`Editing ${type.name}. Save will add/update the visible room type details.`);
      return;
    }
    if (action === 'Delete') {
      if (type.recordId) await deleteModuleRecord(type.recordId).catch(() => {});
      setTypes((current) => current.filter((item) => item.name !== type.name));
      setMessage(`${type.name} removed from room types.`);
    }
  }

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6">
      <RoomsPageHeader
        title="Room Types"
        subtitle="Manage all room types and pricing"
        actions={(
          <RoomsPrimaryButton onClick={() => setShowForm((value) => !value)}>
            <Plus size={15} />
            Add Room Type
          </RoomsPrimaryButton>
        )}
      />

      {message && <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[13px] font-semibold text-blue-700">{message}</div>}

      {showForm && (
        <form onSubmit={(event) => { event.preventDefault(); if (form.name && form.baseRate) addRoomType(); }} className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 text-[14px] font-bold text-slate-950">Add Room Type</div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Room type name *" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
            <input value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} placeholder="Room type code" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
            <input value={form.maxAdults} onChange={(event) => setForm((current) => ({ ...current, maxAdults: event.target.value }))} type="number" min="1" placeholder="Max adults" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
            <input value={form.maxChildren} onChange={(event) => setForm((current) => ({ ...current, maxChildren: event.target.value }))} type="number" min="0" placeholder="Max children" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
            <input value={form.maxOccupancy} onChange={(event) => setForm((current) => ({ ...current, maxOccupancy: event.target.value }))} type="number" min="1" placeholder="Max occupancy" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
            <select value={form.bedType} onChange={(event) => setForm((current) => ({ ...current, bedType: event.target.value }))} className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500">
              {['King Bed', 'Queen Bed', 'Twin Bed', 'Double Bed'].map((item) => <option key={item}>{item}</option>)}
            </select>
            <input value={form.beds} onChange={(event) => setForm((current) => ({ ...current, beds: event.target.value }))} type="number" min="1" placeholder="No. of beds" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
            <input value={form.baseRate} onChange={(event) => setForm((current) => ({ ...current, baseRate: event.target.value }))} type="number" min="1" placeholder="Base rate *" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
            <input value={form.extraAdult} onChange={(event) => setForm((current) => ({ ...current, extraAdult: event.target.value }))} type="number" min="0" placeholder="Extra adult charge" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
            <input value={form.extraChild} onChange={(event) => setForm((current) => ({ ...current, extraChild: event.target.value }))} type="number" min="0" placeholder="Extra child charge" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
            <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500">
              {['Active', 'Inactive'].map((item) => <option key={item}>{item}</option>)}
            </select>
            <input value={form.amenities} onChange={(event) => setForm((current) => ({ ...current, amenities: event.target.value }))} placeholder="Amenities, comma separated" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
            <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Description" rows={2} className="rounded-md border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-blue-500 md:col-span-2 xl:col-span-3" />
            <RoomsPrimaryButton type="submit" className="self-start">Save Room Type</RoomsPrimaryButton>
          </div>
        </form>
      )}

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <RoomsStatCard label="Total Room Types" value={types.length} note={`${totals.active} Active`} />
        <RoomsStatCard label="Total Capacity" value={`${totals.adults} Adults`} note="+ 7 Children" />
        <RoomsStatCard label="Average Base Rate" value={`₹ ${money(totals.averageRate)}`} note="Per Night" />
        <RoomsStatCard label="Most Popular" value={totals.mostPopular?.name || '-'} note={totals.mostPopular ? `(${totals.mostPopular.rooms} Rooms)` : 'No room types'} />
      </div>

      <RoomsCard>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-semibold">Room Type</th>
                <th className="px-4 py-3 font-semibold">Capacity</th>
                <th className="px-4 py-3 font-semibold">Base Rate (₹)</th>
                <th className="px-4 py-3 font-semibold">Max. Occupancy</th>
                <th className="px-4 py-3 font-semibold">Amenities</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-[13px] text-slate-500">Loading room types...</td>
                </tr>
              ) : pagination.pageRows.map((type, index) => (
                <tr key={type.name} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-14 place-items-center rounded-md border border-slate-200 bg-slate-100 text-[12px] font-bold text-slate-600">RT-{index + 1}</span>
                      <span className="text-[13px] font-semibold text-slate-950">{type.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-slate-700">{type.capacity}</td>
                  <td className="px-4 py-3 text-[13px] font-semibold text-slate-950">{money(type.baseRate)}</td>
                  <td className="px-4 py-3 text-[13px] text-slate-700">{type.maxOccupancy}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-slate-600">
                      {type.amenities.slice(0, 4).map((amenity) => {
                        const Icon = amenityIcons[amenity] || Monitor;
                        return <Icon key={amenity} size={14} />;
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3"><RoomsBadge>{type.status}</RoomsBadge></td>
                  <td className="px-4 py-3"><RoomsTableActions item={type} onAction={handleTypeAction} /></td>
                </tr>
              ))}
              {!loading && types.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-[13px] text-slate-500">No room types found. Add a room type to begin room setup.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <PaginationFooter page={pagination.currentPage} pageSize={pageSize} total={types.length} start={pagination.start} end={pagination.end} totalPages={pagination.totalPages} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </RoomsCard>
    </div>
  );
}
