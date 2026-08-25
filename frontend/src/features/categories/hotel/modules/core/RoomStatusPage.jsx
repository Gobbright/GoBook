import { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';

import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';
import { listModuleRecords } from '../../../../../services/moduleRecordsService.js';
import {
  RoomsCard,
  RoomsPageHeader,
  RoomsSearch,
  RoomsSecondaryButton,
  RoomsStatCard,
} from './RoomsAvailabilityShared.jsx';

const statusStyles = {
  Vacant: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  Occupied: 'border-blue-300 bg-blue-50 text-blue-700',
  Reserved: 'border-orange-300 bg-orange-50 text-orange-700',
  Cleaning: 'border-violet-300 bg-violet-50 text-violet-700',
  Maintenance: 'border-red-300 bg-red-50 text-red-600',
  Blocked: 'border-red-300 bg-red-50 text-red-600',
  'Out of Order': 'border-red-300 bg-red-50 text-red-600',
};

const dotStyles = {
  Vacant: 'bg-emerald-500',
  Occupied: 'bg-blue-600',
  Reserved: 'bg-orange-500',
  Cleaning: 'bg-violet-500',
  Maintenance: 'bg-red-600',
  Blocked: 'bg-red-600',
  'Out of Order': 'bg-red-600',
};

const ROOM_TYPES = ['All Room Types', 'Standard Room', 'Deluxe Room', 'Executive Room', 'Suite Room', 'Premium Suite', 'Family Room'];
const ROOM_STATUSES = ['All Status', 'Vacant', 'Occupied', 'Reserved', 'Cleaning', 'Maintenance', 'Blocked', 'Out of Order'];
const LEGEND_STATUSES = ['Vacant', 'Occupied', 'Reserved', 'Out of Order'];

function normalizeRoom(record) {
  const data = record.data || {};
  return {
    recordId: record._id,
    number: data.number || data.roomNo || data.roomNumber || '',
    floor: data.floor || 'Unassigned',
    type: data.type || data.roomType || 'Unassigned',
    status: data.status || 'Vacant',
    occupancy: data.occupancy || '-',
    rate: Number(data.rate || data.baseRate || 0),
  };
}

function normalizeInHouse(record) {
  const data = record.data || {};
  return {
    room: String(data.roomNumber || data.room || ''),
    guest: data.guestName || data.name || 'In-house guest',
  };
}

export function RoomStatusPage() {
  const [floor, setFloor] = useState('All Floor');
  const [type, setType] = useState('All Room Types');
  const [status, setStatus] = useState('All Status');
  const [search, setSearch] = useState('');
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  function loadRooms() {
    setLoading(true);
    setMessage('');
    Promise.all([
      listModuleRecords('hotel/rooms-availability/rooms').catch(() => ({ records: [] })),
      listModuleRecords('hotel/front-desk/in-house-guests').catch(() => ({ records: [] })),
    ]).then(([roomRes, inHouseRes]) => {
      const inHouseByRoom = new Map(
        (inHouseRes.records || [])
          .map(normalizeInHouse)
          .filter((guest) => guest.room)
          .map((guest) => [guest.room, guest.guest]),
      );
      const nextRooms = (roomRes.records || [])
        .map(normalizeRoom)
        .filter((room) => room.number)
        .map((room) => {
          const guest = inHouseByRoom.get(String(room.number));
          return guest ? { ...room, status: 'Occupied', occupancy: guest } : room;
        });

      setRooms(nextRooms);
      setSelectedRoom((current) => nextRooms.find((room) => room.number === current?.number) || nextRooms[0] || null);
      setMessage(nextRooms.length ? 'Room status refreshed.' : 'No room records found. Add rooms in Rooms screen first.');
    }).catch((err) => {
      setRooms([]);
      setSelectedRoom(null);
      setMessage(err.message || 'Unable to load room status.');
    }).finally(() => {
      setLoading(false);
    });
  }

  useEffect(() => {
    loadRooms();
  }, []);

  const floorOptions = useMemo(() => ['All Floor', ...Array.from(new Set(rooms.map((room) => room.floor || 'Unassigned'))).sort()], [rooms]);

  const filteredRooms = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rooms.filter((room) => {
      const matchesSearch = !query || [room.number, room.type].some((value) => String(value || '').toLowerCase().includes(query));
      const matchesFloor = floor === 'All Floor' || room.floor === floor;
      const matchesType = type === 'All Room Types' || room.type === type;
      const matchesStatus = status === 'All Status' || room.status === status;
      return matchesSearch && matchesFloor && matchesType && matchesStatus;
    });
  }, [floor, rooms, search, status, type]);

  const summary = useMemo(() => ({
    total: rooms.length,
    vacant: rooms.filter((room) => room.status === 'Vacant').length,
    occupied: rooms.filter((room) => room.status === 'Occupied').length,
    reserved: rooms.filter((room) => room.status === 'Reserved').length,
    outOfOrder: rooms.filter((room) => ['Blocked', 'Maintenance', 'Out of Order'].includes(room.status)).length,
  }), [rooms]);

  const grouped = floorOptions
    .filter((floorName) => floorName !== 'All Floor')
    .map((floorName) => ({ floorName, rooms: filteredRooms.filter((room) => room.floor === floorName) }))
    .filter((group) => group.rooms.length > 0);

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6">
      <RoomsPageHeader title="Room Status" subtitle="Live overview of all room statuses" />

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        <RoomsStatCard label="Total Rooms" value={summary.total} />
        <RoomsStatCard label="Vacant" value={summary.vacant} tone="green" />
        <RoomsStatCard label="Occupied" value={summary.occupied} tone="blue" />
        <RoomsStatCard label="Reserved" value={summary.reserved} tone="amber" />
        <RoomsStatCard label="Out of Order" value={summary.outOfOrder} tone="red" />
      </div>

      <RoomsCard className="mb-4 p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[170px_190px_1fr_auto]">
          <SelectDropdown value={floor} onChange={setFloor} options={floorOptions} />
          <SelectDropdown value={type} onChange={setType} options={ROOM_TYPES} />
          <RoomsSearch value={search} onChange={setSearch} placeholder="Search room..." />
          <div className="flex flex-wrap items-center gap-4 text-[12px] font-semibold text-slate-600">
            <SelectDropdown value={status} onChange={setStatus} options={ROOM_STATUSES} className="w-40" />
            {LEGEND_STATUSES.map((item) => (
              <span key={item} className="flex items-center gap-2"><span className={`h-3 w-3 rounded ${dotStyles[item]}`} />{item}</span>
            ))}
            <span className="text-slate-400">Last Updated: Just now</span>
            <RoomsSecondaryButton onClick={loadRooms} className="h-9 px-3" aria-label="Refresh"><RefreshCw size={14} /></RoomsSecondaryButton>
          </div>
        </div>
      </RoomsCard>

      {message && <div className="mb-4 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-[13px] font-semibold text-blue-700">{message}</div>}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
        <RoomsCard className="p-4">
          <div className="space-y-6">
            {loading ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center text-[13px] text-slate-500">
                Loading room status...
              </div>
            ) : grouped.map((group) => (
              <section key={group.floorName}>
                <h2 className="m-0 mb-3 text-[15px] font-bold text-slate-950">{group.floorName}</h2>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
                  {group.rooms.map((room) => (
                    <button
                      key={room.number}
                      type="button"
                      onClick={() => setSelectedRoom(room)}
                      className={`min-h-20 rounded-lg border p-4 text-left transition hover:shadow-sm ${statusStyles[room.status] || statusStyles.Vacant} ${selectedRoom?.number === room.number ? 'ring-2 ring-blue-200' : ''}`}
                    >
                      <div className="text-[16px] font-bold">{room.number}</div>
                      <div className="mt-2 text-[12px] font-semibold">{room.status}</div>
                    </button>
                  ))}
                </div>
              </section>
            ))}
            {!loading && grouped.length === 0 && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center text-[13px] text-slate-500">
                No room records found. Add rooms to view live status.
              </div>
            )}
          </div>
          <div className="mt-6 flex justify-center gap-6 text-[12px] font-semibold text-slate-600">
            {LEGEND_STATUSES.map((item) => (
              <span key={item} className="flex items-center gap-2"><span className={`h-3 w-3 rounded-full ${dotStyles[item]}`} />{item}</span>
            ))}
          </div>
        </RoomsCard>

        {selectedRoom ? (
          <RoomsCard className="p-4">
            <h2 className="m-0 text-[18px] font-bold text-slate-950">Room {selectedRoom.number}</h2>
            <div className={`mt-3 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusStyles[selectedRoom.status] || statusStyles.Vacant}`}>{selectedRoom.status}</div>
            <div className="mt-5 space-y-3 text-[13px]">
              <div className="flex justify-between gap-3"><span className="text-slate-500">Floor</span><span className="font-bold text-slate-950">{selectedRoom.floor}</span></div>
              <div className="flex justify-between gap-3"><span className="text-slate-500">Room Type</span><span className="font-bold text-slate-950">{selectedRoom.type}</span></div>
              <div className="flex justify-between gap-3"><span className="text-slate-500">Current Occupancy</span><span className="font-bold text-slate-950">{selectedRoom.occupancy}</span></div>
              <div className="flex justify-between gap-3"><span className="text-slate-500">Rate</span><span className="font-bold text-slate-950">Rs. {selectedRoom.rate}</span></div>
            </div>
            <div className="mt-5 grid gap-2">
              <RoomsSecondaryButton onClick={() => setMessage(`Room ${selectedRoom.number}: ${selectedRoom.type} / ${selectedRoom.status}`)}>View Room</RoomsSecondaryButton>
              <RoomsSecondaryButton onClick={loadRooms}>Refresh Status</RoomsSecondaryButton>
              <RoomsSecondaryButton onClick={() => setMessage(`Current occupancy: ${selectedRoom.occupancy || '-'}`)}>View History</RoomsSecondaryButton>
            </div>
          </RoomsCard>
        ) : (
          <RoomsCard className="p-4">
            <p className="m-0 text-[13px] text-slate-500">Select a room to view status details.</p>
          </RoomsCard>
        )}
      </div>
    </div>
  );
}
