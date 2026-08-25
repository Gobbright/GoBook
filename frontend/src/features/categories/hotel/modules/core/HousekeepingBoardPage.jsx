import { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';

import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';
import { listModuleRecords, updateModuleRecord } from '../../../../../services/moduleRecordsService.js';
import {
  HkCard,
  HkPageHeader,
  HkSearch,
  HkSecondaryButton,
  HkStatCard,
  dotColors,
  statusColors,
} from './HousekeepingShared.jsx';

const statuses = ['Available', 'Occupied', 'Dirty', 'Cleaning', 'Inspection', 'Maintenance', 'Reserved'];
const roomTypes = ['All Room Types', 'Standard Room', 'Deluxe Room', 'Executive Room', 'Suite Room', 'Premium Suite', 'Family Room'];

function toHousekeepingStatus(status, occupied) {
  if (occupied) return 'Occupied';
  if (status === 'Vacant' || status === 'Available') return 'Available';
  if (['Blocked', 'Out of Order', 'Maintenance'].includes(status)) return 'Maintenance';
  if (statuses.includes(status)) return status;
  return 'Available';
}

function toRoomStatus(status) {
  if (status === 'Available') return 'Vacant';
  if (status === 'Maintenance') return 'Maintenance';
  return status;
}

function normalizeRoom(record, inHouseByRoom) {
  const data = record.data || {};
  const number = data.number || data.roomNo || data.roomNumber || '';
  const guest = inHouseByRoom.get(String(number));
  const status = toHousekeepingStatus(data.status || 'Vacant', Boolean(guest));
  return {
    recordId: record._id,
    rawData: data,
    number,
    floor: data.floor || 'Unassigned',
    type: data.type || data.roomType || 'Unassigned',
    status,
    guest: guest || data.occupancy || '-',
    assignedTo: data.assignedTo || '-',
    task: status === 'Occupied' ? 'Guest stay' : status === 'Available' ? 'Ready room' : `${status} task`,
  };
}

function normalizeInHouse(record) {
  const data = record.data || {};
  return {
    room: String(data.roomNumber || data.room || ''),
    guest: data.guestName || data.name || 'In-house guest',
  };
}

export function HousekeepingBoardPage() {
  const [floor, setFloor] = useState('All Floor');
  const [type, setType] = useState('All Room Types');
  const [status, setStatus] = useState('All Status');
  const [search, setSearch] = useState('');
  const [rooms, setRooms] = useState([]);
  const [selected, setSelected] = useState(null);
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
        .map((record) => normalizeRoom(record, inHouseByRoom))
        .filter((room) => room.number);

      setRooms(nextRooms);
      setSelected((current) => nextRooms.find((room) => room.number === current?.number) || nextRooms[0] || null);
      setMessage(nextRooms.length ? 'Housekeeping dashboard refreshed.' : 'No room records found. Add rooms in Rooms & Availability > Rooms first.');
    }).catch((err) => {
      setRooms([]);
      setSelected(null);
      setMessage(err.message || 'Unable to load housekeeping dashboard.');
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
      const matchesSearch = !query || [room.number, room.guest, room.task].some((value) => String(value || '').toLowerCase().includes(query));
      const matchesFloor = floor === 'All Floor' || room.floor === floor;
      const matchesType = type === 'All Room Types' || room.type === type;
      const matchesStatus = status === 'All Status' || room.status === status;
      return matchesSearch && matchesFloor && matchesType && matchesStatus;
    });
  }, [floor, rooms, search, status, type]);

  const summary = useMemo(() => ({
    total: rooms.length,
    occupied: rooms.filter((room) => room.status === 'Occupied').length,
    available: rooms.filter((room) => room.status === 'Available').length,
    dirty: rooms.filter((room) => room.status === 'Dirty').length,
    cleaning: rooms.filter((room) => room.status === 'Cleaning').length,
    inspection: rooms.filter((room) => room.status === 'Inspection').length,
    maintenance: rooms.filter((room) => room.status === 'Maintenance').length,
    reserved: rooms.filter((room) => room.status === 'Reserved').length,
  }), [rooms]);

  const grouped = floorOptions
    .filter((floorName) => floorName !== 'All Floor')
    .map((floorName) => ({ floorName, rooms: filteredRooms.filter((room) => room.floor === floorName) }))
    .filter((group) => group.rooms.length);

  async function updateHousekeepingStatus(nextStatus) {
    if (!selected?.recordId) return;
    const updatedData = { ...selected.rawData, status: toRoomStatus(nextStatus), occupancy: nextStatus === 'Available' ? '-' : selected.guest };
    try {
      await updateModuleRecord(selected.recordId, updatedData);
      setMessage(`Room ${selected.number} marked as ${nextStatus}.`);
      loadRooms();
    } catch (err) {
      setMessage(err.message || `Unable to update room ${selected.number}.`);
    }
  }

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6">
      <HkPageHeader
        title="Housekeeping Dashboard"
        subtitle="Live room cleaning, inspection, and maintenance status"
        actions={<HkSecondaryButton onClick={loadRooms} className="px-3" aria-label="Refresh"><RefreshCw size={15} /></HkSecondaryButton>}
      />

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <HkStatCard label="Total Rooms" value={summary.total} />
        <HkStatCard label="Occupied" value={summary.occupied} tone="blue" />
        <HkStatCard label="Available" value={summary.available} tone="green" />
        <HkStatCard label="Dirty" value={summary.dirty} tone="orange" />
        <HkStatCard label="Cleaning" value={summary.cleaning} tone="amber" />
        <HkStatCard label="Inspection" value={summary.inspection} tone="purple" />
        <HkStatCard label="Maintenance" value={summary.maintenance} />
        <HkStatCard label="Reserved" value={summary.reserved} tone="purple" />
      </div>

      <HkCard className="mb-4 p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[170px_190px_190px_1fr]">
          <SelectDropdown value={floor} onChange={setFloor} options={floorOptions} />
          <SelectDropdown value={type} onChange={setType} options={roomTypes} />
          <SelectDropdown value={status} onChange={setStatus} options={['All Status', ...statuses]} />
          <HkSearch value={search} onChange={setSearch} placeholder="Search room, guest, or task..." />
        </div>
      </HkCard>

      {message && <div className="mb-4 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-[13px] font-semibold text-blue-700">{message}</div>}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
        <HkCard className="p-4">
          <div className="space-y-6">
            {loading ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center text-[13px] text-slate-500">
                Loading housekeeping rooms...
              </div>
            ) : grouped.map((group) => (
              <section key={group.floorName}>
                <h2 className="m-0 mb-3 text-[15px] font-bold text-slate-950">{group.floorName}</h2>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
                  {group.rooms.map((room) => (
                    <button
                      key={room.number}
                      type="button"
                      onClick={() => setSelected(room)}
                      className={`min-h-20 rounded-lg border p-3 text-left transition hover:shadow-sm ${statusColors[room.status] || statusColors.Available} ${selected?.number === room.number ? 'ring-2 ring-blue-200' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[15px] font-bold">{room.number}</span>
                        <span className={`h-2.5 w-2.5 rounded-full ${dotColors[room.status] || dotColors.Available}`} />
                      </div>
                      <div className="mt-2 text-[12px] font-semibold">{room.status}</div>
                    </button>
                  ))}
                </div>
              </section>
            ))}
            {!loading && grouped.length === 0 && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center text-[13px] text-slate-500">
                No housekeeping room records found.
              </div>
            )}
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-5 text-[12px] font-semibold text-slate-600">
            {statuses.map((item) => <span key={item} className="flex items-center gap-2"><span className={`h-3 w-3 rounded-full ${dotColors[item]}`} />{item}</span>)}
          </div>
        </HkCard>

        {selected ? (
          <HkCard className="p-4">
            <h2 className="m-0 text-[18px] font-bold text-slate-950">Room {selected.number}</h2>
            <div className={`mt-3 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusColors[selected.status] || statusColors.Available}`}>{selected.status}</div>
            <div className="mt-5 space-y-3 text-[13px]">
              <div className="flex justify-between gap-3"><span className="text-slate-500">Room Type</span><span className="font-bold text-slate-950">{selected.type}</span></div>
              <div className="flex justify-between gap-3"><span className="text-slate-500">Floor</span><span className="font-bold text-slate-950">{selected.floor}</span></div>
              <div className="flex justify-between gap-3"><span className="text-slate-500">Guest / Note</span><span className="font-bold text-slate-950">{selected.guest}</span></div>
              <div className="flex justify-between gap-3"><span className="text-slate-500">Assigned To</span><span className="font-bold text-slate-950">{selected.assignedTo}</span></div>
              <div className="flex justify-between gap-3"><span className="text-slate-500">Task</span><span className="font-bold text-slate-950">{selected.task}</span></div>
            </div>
            <div className="mt-5 grid gap-2">
              <HkSecondaryButton onClick={() => updateHousekeepingStatus('Cleaning')}>Start Cleaning</HkSecondaryButton>
              <HkSecondaryButton onClick={() => updateHousekeepingStatus('Inspection')}>Mark Inspection</HkSecondaryButton>
              <HkSecondaryButton onClick={() => updateHousekeepingStatus('Maintenance')}>Report Maintenance</HkSecondaryButton>
              <HkSecondaryButton onClick={() => updateHousekeepingStatus('Available')}>Mark Available</HkSecondaryButton>
            </div>
          </HkCard>
        ) : (
          <HkCard className="p-4">
            <p className="m-0 text-[13px] text-slate-500">Select a room to view housekeeping details.</p>
          </HkCard>
        )}
      </div>
    </div>
  );
}
