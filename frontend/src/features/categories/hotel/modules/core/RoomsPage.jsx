import { useEffect, useMemo, useState } from 'react';
import { Filter, Plus } from 'lucide-react';

import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';
import { createModuleRecord, deleteModuleRecord, listModuleRecords } from '../../../../../services/moduleRecordsService.js';
import { paginateRows } from './HotelPagination.jsx';
import {
  RoomsBadge,
  RoomsCard,
  RoomsPageHeader,
  RoomsPrimaryButton,
  RoomsSearch,
  RoomsSecondaryButton,
  RoomsTableActions,
  money,
  rooms,
} from './RoomsAvailabilityShared.jsx';

export function RoomsPage() {
  const [roomRows, setRoomRows] = useState(rooms);
  const [loading, setLoading] = useState(true);
  const [floor, setFloor] = useState('All Floor');
  const [type, setType] = useState('All Room Types');
  const [status, setStatus] = useState('All Status');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ number: '', floor: '1st Floor', type: 'Deluxe Room', building: 'Main Block', location: '', bedType: 'King Bed', beds: '1', maxOccupancy: '3', view: 'City View', amenities: 'Wi-Fi, AC, TV, Room Service', status: 'Vacant', rate: '', notes: '' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  useEffect(() => {
    let active = true;
    listModuleRecords('hotel/rooms-availability/rooms')
      .then((res) => {
        if (!active) return;
        const nextRooms = (res.records || []).map((record) => {
          const data = record.data || {};
          return {
            recordId: record._id,
            number: data.number || data.roomNo || data.roomNumber || '',
            floor: data.floor || '',
            type: data.type || data.roomType || '',
            building: data.building || '',
            location: data.location || '',
            bedType: data.bedType || '',
            beds: Number(data.beds || 0),
            maxOccupancy: Number(data.maxOccupancy || 0),
            view: data.view || '',
            amenities: data.amenities || '',
            notes: data.notes || '',
            status: data.status || 'Vacant',
            occupancy: data.occupancy || '-',
            rate: Number(data.rate || 0),
          };
        });
        setRoomRows(nextRooms);
        setSelectedRoom((current) => nextRooms.find((room) => room.number === current?.number) || nextRooms[0] || null);
      })
      .catch(() => {
        if (active) setRoomRows([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const filteredRooms = useMemo(() => {
    const query = search.trim().toLowerCase();
    return roomRows.filter((room) => {
      const matchesSearch = !query || [room.number, room.type].some((value) => value.toLowerCase().includes(query));
      const matchesFloor = floor === 'All Floor' || room.floor === floor;
      const matchesType = type === 'All Room Types' || room.type === type;
      const matchesStatus = status === 'All Status' || room.status === status;
      return matchesSearch && matchesFloor && matchesType && matchesStatus;
    });
  }, [floor, roomRows, search, status, type]);

  const pagination = paginateRows(filteredRooms, page, pageSize);

  async function addRoom() {
    const next = { number: form.number, floor: form.floor, type: form.type, building: form.building, location: form.location, bedType: form.bedType, beds: Number(form.beds), maxOccupancy: Number(form.maxOccupancy), view: form.view, amenities: form.amenities, notes: form.notes, status: form.status, occupancy: '-', rate: Number(form.rate) };
    try {
      const saved = await createModuleRecord('hotel/rooms-availability/rooms', next);
      const savedRoom = { ...next, recordId: saved.record?._id };
      setRoomRows((current) => [savedRoom, ...current]);
      setSelectedRoom(savedRoom);
      setForm({ number: '', floor: '1st Floor', type: 'Deluxe Room', building: 'Main Block', location: '', bedType: 'King Bed', beds: '1', maxOccupancy: '3', view: 'City View', amenities: 'Wi-Fi, AC, TV, Room Service', status: 'Vacant', rate: '', notes: '' });
      setShowForm(false);
      setMessage(`Room ${next.number} added. Availability will now include this room.`);
    } catch (err) {
      setMessage(err.message || 'Unable to save room.');
    }
  }

  async function handleRoomAction(action, room) {
    if (!room) return;
    if (action === 'View') {
      setSelectedRoom(room);
      setMessage(`Room ${room.number} details opened.`);
      return;
    }
    if (action === 'Edit') {
      setSelectedRoom(room);
      setForm({
        number: room.number || '',
        floor: room.floor || '1st Floor',
        type: room.type || 'Deluxe Room',
        building: room.building || 'Main Block',
        location: room.location || '',
        bedType: room.bedType || 'King Bed',
        beds: String(room.beds || 1),
        maxOccupancy: String(room.maxOccupancy || 3),
        view: room.view || 'City View',
        amenities: room.amenities || '',
        status: room.status || 'Vacant',
        rate: String(room.rate || ''),
        notes: room.notes || '',
      });
      setShowForm(true);
      setMessage(`Editing Room ${room.number}. Save will add/update the visible room details.`);
      return;
    }
    if (action === 'Delete') {
      if (room.recordId) await deleteModuleRecord(room.recordId).catch(() => {});
      setRoomRows((current) => current.filter((item) => item.number !== room.number));
      setSelectedRoom((current) => (current?.number === room.number ? null : current));
      setMessage(`Room ${room.number} removed from this list.`);
    }
  }

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6">
      <RoomsPageHeader
        title="Rooms"
        subtitle="Manage all rooms and their details"
        actions={(
          <>
            <RoomsPrimaryButton onClick={() => setShowForm((value) => !value)}>
              <Plus size={15} />
              Add Room
            </RoomsPrimaryButton>
            <RoomsTableActions exportButton />
          </>
        )}
      />

      {message && <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[13px] font-semibold text-blue-700">{message}</div>}

      {showForm && (
        <form onSubmit={(event) => { event.preventDefault(); if (form.number && form.rate) addRoom(); }} className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 text-[14px] font-bold text-slate-950">Add Room</div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            <input value={form.number} onChange={(event) => setForm((current) => ({ ...current, number: event.target.value }))} placeholder="Room no. *" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
            <SelectDropdown value={form.type} onChange={(type) => setForm((current) => ({ ...current, type }))} options={['Standard Room', 'Deluxe Room', 'Executive Room', 'Suite Room', 'Premium Suite', 'Family Room']} />
            <SelectDropdown value={form.building} onChange={(building) => setForm((current) => ({ ...current, building }))} options={['Main Block', 'Annex Building']} />
            <SelectDropdown value={form.floor} onChange={(floor) => setForm((current) => ({ ...current, floor }))} options={['Ground Floor', '1st Floor', '2nd Floor', '3rd Floor', '4th Floor']} />
            <input value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} placeholder="Wing / location" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
            <SelectDropdown value={form.bedType} onChange={(bedType) => setForm((current) => ({ ...current, bedType }))} options={['King Bed', 'Queen Bed', 'Twin Bed', 'Double Bed']} />
            <input value={form.beds} onChange={(event) => setForm((current) => ({ ...current, beds: event.target.value }))} type="number" min="1" placeholder="Beds" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
            <input value={form.maxOccupancy} onChange={(event) => setForm((current) => ({ ...current, maxOccupancy: event.target.value }))} type="number" min="1" placeholder="Max occupancy" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
            <SelectDropdown value={form.view} onChange={(view) => setForm((current) => ({ ...current, view }))} options={['City View', 'Garden View', 'Pool View', 'No View']} />
            <input value={form.rate} onChange={(event) => setForm((current) => ({ ...current, rate: event.target.value }))} type="number" min="1" placeholder="Rate *" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
            <SelectDropdown value={form.status} onChange={(status) => setForm((current) => ({ ...current, status }))} options={['Vacant', 'Occupied', 'Reserved', 'Cleaning', 'Maintenance', 'Blocked', 'Out of Order']} />
            <input value={form.amenities} onChange={(event) => setForm((current) => ({ ...current, amenities: event.target.value }))} placeholder="Amenities" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500 md:col-span-2" />
            <input value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Maintenance notes" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500 md:col-span-2" />
            <RoomsPrimaryButton type="submit">Save Room</RoomsPrimaryButton>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_340px]">
      <RoomsCard>
        <div className="grid grid-cols-1 gap-3 border-b border-slate-100 p-4 xl:grid-cols-[180px_180px_180px_1fr_auto]">
          <SelectDropdown value={floor} onChange={setFloor} options={['All Floor', '1st Floor', '2nd Floor', '3rd Floor']} />
          <SelectDropdown value={type} onChange={setType} options={['All Room Types', 'Standard Room', 'Deluxe Room', 'Executive Room', 'Suite Room', 'Premium Suite', 'Family Room']} />
          <SelectDropdown value={status} onChange={setStatus} options={['All Status', 'Vacant', 'Occupied', 'Reserved', 'Out of Order']} />
          <RoomsSearch value={search} onChange={setSearch} placeholder="Search room number or type..." />
          <RoomsSecondaryButton>
            <Filter size={15} />
            Filter
          </RoomsSecondaryButton>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-semibold">Room No.</th>
                <th className="px-4 py-3 font-semibold">Floor</th>
                <th className="px-4 py-3 font-semibold">Room Type</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Current Occupancy</th>
                <th className="px-4 py-3 font-semibold">Rate (₹)</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-[13px] text-slate-500">Loading rooms...</td>
                </tr>
              ) : pagination.pageRows.map((room) => (
                <tr key={room.number} className={`border-t border-slate-100 hover:bg-slate-50 ${selectedRoom?.number === room.number ? 'bg-blue-50/60' : ''}`}>
                  <td className="px-4 py-3 text-[13px] font-semibold text-slate-950">{room.number}</td>
                  <td className="px-4 py-3 text-[13px] text-slate-700">{room.floor}</td>
                  <td className="px-4 py-3 text-[13px] text-slate-700">{room.type}</td>
                  <td className="px-4 py-3"><RoomsBadge>{room.status}</RoomsBadge></td>
                  <td className="px-4 py-3 text-[13px] text-slate-700">{room.occupancy}</td>
                  <td className="px-4 py-3 text-[13px] font-semibold text-slate-950">{money(room.rate)}</td>
                  <td className="px-4 py-3"><RoomsTableActions item={room} onAction={handleRoomAction} /></td>
                </tr>
              ))}
              {!loading && filteredRooms.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-[13px] text-slate-500">No rooms match the selected filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 text-[12px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>Showing {pagination.start} to {pagination.end} of {filteredRooms.length} entries</span>
          <div className="hidden">
            <button type="button" className="h-8 w-8 rounded-md border border-slate-200 bg-white text-slate-500">‹</button>
            <button type="button" className="h-8 w-8 rounded-md border border-blue-600 bg-blue-600 text-white">1</button>
            <button type="button" className="h-8 w-8 rounded-md border border-slate-200 bg-white text-slate-500">›</button>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" disabled={pagination.currentPage <= 1} onClick={() => setPage(pagination.currentPage - 1)} className="h-8 rounded-md border border-slate-200 bg-white px-3 text-slate-500 disabled:opacity-50">Prev</button>
            {Array.from({ length: pagination.totalPages }, (_, index) => index + 1).map((item) => (
              <button key={item} type="button" onClick={() => setPage(item)} className={`h-8 min-w-8 rounded-md border px-2 text-[12px] font-semibold ${item === pagination.currentPage ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-600'}`}>{item}</button>
            ))}
            <button type="button" disabled={pagination.currentPage >= pagination.totalPages} onClick={() => setPage(pagination.currentPage + 1)} className="h-8 rounded-md border border-slate-200 bg-white px-3 text-slate-500 disabled:opacity-50">Next</button>
          </div>
          <SelectDropdown value={`${pageSize} / page`} onChange={(value) => { setPageSize(Number(String(value).split(' ')[0])); setPage(1); }} options={['5 / page', '10 / page', '25 / page', '50 / page']} className="w-32" />
        </div>
      </RoomsCard>
      <RoomsCard className="p-4">
        <h2 className="m-0 text-[18px] font-bold text-slate-950">Room Details</h2>
        {!selectedRoom ? (
          <p className="m-0 mt-3 text-[13px] text-slate-500">Click the eye button on any room to view details.</p>
        ) : (
          <>
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[20px] font-bold text-slate-950">Room {selectedRoom.number}</div>
                  <div className="mt-1 text-[13px] font-semibold text-slate-500">{selectedRoom.type || '-'}</div>
                </div>
                <RoomsBadge>{selectedRoom.status}</RoomsBadge>
              </div>
            </div>
            <div className="mt-4 space-y-3 text-[13px]">
              <div className="flex justify-between gap-3"><span className="text-slate-500">Floor</span><span className="font-bold text-slate-950">{selectedRoom.floor || '-'}</span></div>
              <div className="flex justify-between gap-3"><span className="text-slate-500">Building</span><span className="font-bold text-slate-950">{selectedRoom.building || '-'}</span></div>
              <div className="flex justify-between gap-3"><span className="text-slate-500">Location</span><span className="font-bold text-slate-950">{selectedRoom.location || '-'}</span></div>
              <div className="flex justify-between gap-3"><span className="text-slate-500">Occupancy</span><span className="font-bold text-slate-950">{selectedRoom.occupancy || '-'}</span></div>
              <div className="flex justify-between gap-3"><span className="text-slate-500">Bed Type</span><span className="font-bold text-slate-950">{selectedRoom.bedType || '-'}</span></div>
              <div className="flex justify-between gap-3"><span className="text-slate-500">Beds</span><span className="font-bold text-slate-950">{selectedRoom.beds || '-'}</span></div>
              <div className="flex justify-between gap-3"><span className="text-slate-500">Max Occupancy</span><span className="font-bold text-slate-950">{selectedRoom.maxOccupancy || '-'}</span></div>
              <div className="flex justify-between gap-3"><span className="text-slate-500">View</span><span className="font-bold text-slate-950">{selectedRoom.view || '-'}</span></div>
              <div className="flex justify-between gap-3"><span className="text-slate-500">Rate</span><span className="font-bold text-slate-950">{money(selectedRoom.rate)}</span></div>
            </div>
            <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
              <div className="text-[12px] font-semibold text-slate-500">Amenities</div>
              <div className="mt-1 text-[13px] font-semibold text-slate-800">{selectedRoom.amenities || '-'}</div>
            </div>
            <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
              <div className="text-[12px] font-semibold text-slate-500">Notes</div>
              <div className="mt-1 text-[13px] font-semibold text-slate-800">{selectedRoom.notes || '-'}</div>
            </div>
            <div className="mt-4 grid gap-2">
              <RoomsSecondaryButton onClick={() => handleRoomAction('Edit', selectedRoom)}>Edit Room</RoomsSecondaryButton>
            </div>
          </>
        )}
      </RoomsCard>
      </div>
    </div>
  );
}
