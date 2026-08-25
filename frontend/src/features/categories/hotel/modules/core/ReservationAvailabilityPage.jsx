import { useEffect, useMemo, useState } from 'react';
import { BedDouble, Blocks, CalendarDays, Search } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';
import { listModuleRecords } from '../../../../../services/moduleRecordsService.js';
import { money, PageHeader, PrimaryLink, ReservationShell, StatCard, StatusBadge } from './ReservationShared.jsx';

const BLOCKED_STATUSES = new Set(['Blocked', 'Maintenance', 'Out of Order']);
const BOOKED_STATUSES = new Set(['Confirmed', 'Pending', 'Checked-in', 'In-House']);

function normalizeRoom(record) {
  const data = record.data || {};
  return {
    id: record._id,
    room: data.number || data.roomNo || data.roomNumber || '',
    roomType: data.type || data.roomType || '',
    floor: data.floor || '',
    status: data.status || 'Vacant',
    rate: Number(data.rate || data.baseRate || 0),
  };
}

function normalizeReservation(record) {
  const data = record.data || {};
  return {
    id: record._id,
    room: data.roomNumber || data.availableRoom || data.room || '',
    roomType: data.roomType || '',
    status: data.status || 'Pending',
  };
}

function normalizeInHouse(record) {
  const data = record.data || {};
  return {
    id: record._id,
    room: data.roomNumber || data.room || '',
    roomType: data.roomType || '',
    status: 'In-House',
  };
}

export function ReservationAvailabilityPage() {
  const [searchParams] = useSearchParams();
  const [checkIn, setCheckIn] = useState(searchParams.get('checkIn') || '');
  const [checkOut, setCheckOut] = useState(searchParams.get('checkOut') || '');
  const [nights, setNights] = useState(() => {
    const from = new Date(searchParams.get('checkIn') || '');
    const to = new Date(searchParams.get('checkOut') || '');
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 1;
    return Math.max(1, Math.round((to - from) / 86400000));
  });
  const [guests, setGuests] = useState(searchParams.get('guests') || '1');
  const [tab, setTab] = useState('By Room Type');
  const [search, setSearch] = useState(searchParams.get('roomType') || '');
  const [rooms, setRooms] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  function loadAvailability() {
    setLoading(true);
    setMessage('');
    Promise.all([
      listModuleRecords('hotel/rooms-availability/rooms').catch(() => ({ records: [] })),
      listModuleRecords('hotel/reservations/list').catch(() => ({ records: [] })),
      listModuleRecords('hotel/front-desk/in-house-guests').catch(() => ({ records: [] })),
    ]).then(([roomRes, reservationRes, inHouseRes]) => {
      setRooms((roomRes.records || []).map(normalizeRoom).filter((room) => room.room));
      setReservations([
        ...(reservationRes.records || []).map(normalizeReservation),
        ...(inHouseRes.records || []).map(normalizeInHouse),
      ]);
      setMessage('Availability refreshed.');
    }).finally(() => {
      setLoading(false);
    });
  }

  useEffect(() => {
    loadAvailability();
  }, []);

  useEffect(() => {
    const from = new Date(checkIn);
    const to = new Date(checkOut);
    if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime())) {
      setNights(Math.max(1, Math.round((to - from) / 86400000)));
    }
  }, [checkIn, checkOut]);

  const bookedRoomNumbers = useMemo(() => new Set(
    reservations
      .filter((reservation) => BOOKED_STATUSES.has(reservation.status))
      .map((reservation) => String(reservation.room))
      .filter(Boolean),
  ), [reservations]);

  const availabilityRows = useMemo(() => {
    const grouped = new Map();
    rooms.forEach((room) => {
      const roomType = room.roomType || 'Unassigned';
      const current = grouped.get(roomType) || { roomType, total: 0, available: 0, booked: 0, blocked: 0 };
      const blocked = BLOCKED_STATUSES.has(room.status);
      const booked = bookedRoomNumbers.has(String(room.room)) || BOOKED_STATUSES.has(room.status);
      current.total += 1;
      if (blocked) current.blocked += 1;
      else if (booked) current.booked += 1;
      else current.available += 1;
      grouped.set(roomType, current);
    });
    return [...grouped.values()];
  }, [bookedRoomNumbers, rooms]);

  const totals = useMemo(() => {
    const total = availabilityRows.reduce((sum, row) => sum + row.total, 0);
    const available = availabilityRows.reduce((sum, row) => sum + row.available, 0);
    const booked = availabilityRows.reduce((sum, row) => sum + row.booked, 0);
    const blocked = availabilityRows.reduce((sum, row) => sum + row.blocked, 0);
    return { total, available, booked, blocked };
  }, [availabilityRows]);

  const roomRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rooms
      .map((room) => {
        const booked = bookedRoomNumbers.has(String(room.room)) || BOOKED_STATUSES.has(room.status);
        const blocked = BLOCKED_STATUSES.has(room.status);
        return { ...room, status: blocked ? 'Blocked' : booked ? 'Booked' : 'Available' };
      })
      .filter((row) => !query || [row.room, row.roomType, row.floor, row.status].some((item) => String(item).toLowerCase().includes(query)));
  }, [bookedRoomNumbers, rooms, search]);

  return (
    <ReservationShell>
      <PageHeader title="Room Availability" subtitle="Check room availability">
        <div className="text-[11px] text-slate-500">Home <span className="mx-2">›</span> Reservations <span className="mx-2">›</span> Availability</div>
      </PageHeader>

      <section className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[180px_180px_90px_120px_auto]">
          <label><span className="mb-1 block text-[12px] font-semibold text-slate-600">Check-in Date</span><input type="date" value={checkIn} onChange={(event) => setCheckIn(event.target.value)} className="h-10 w-full rounded border border-slate-200 px-3 text-[13px]" /></label>
          <label><span className="mb-1 block text-[12px] font-semibold text-slate-600">Check-out Date</span><input type="date" value={checkOut} onChange={(event) => setCheckOut(event.target.value)} className="h-10 w-full rounded border border-slate-200 px-3 text-[13px]" /></label>
          <label><span className="mb-1 block text-[12px] font-semibold text-slate-600">Nights</span><input type="number" min="1" value={nights} onChange={(event) => setNights(event.target.value)} className="h-10 w-full rounded border border-slate-200 px-3 text-[13px]" /></label>
          <label><span className="mb-1 block text-[12px] font-semibold text-slate-600">Guests</span><SelectDropdown value={String(guests)} onChange={(value) => setGuests(value)} options={['1', '2', '3', '4', '5']} /></label>
          <button type="button" onClick={loadAvailability} className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded bg-blue-600 px-5 text-[13px] font-bold text-white"><Search size={15} />Search</button>
        </div>
      </section>

      {message && <p className="mb-4 rounded border border-blue-100 bg-blue-50 px-3 py-2 text-[13px] text-blue-700">{message}</p>}

      <section className="mb-4 grid gap-3 lg:grid-cols-4">
        <StatCard label="Total Rooms" value={totals.total} tone="blue" />
        <StatCard label="Available Rooms" value={totals.available} tone="green" />
        <StatCard label="Booked Rooms" value={totals.booked} tone="orange" />
        <StatCard label="Blocked Rooms" value={totals.blocked} tone="red" />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-5 border-b border-slate-200 text-[13px] font-semibold">
            {['By Room Type', 'By Room'].map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={`border-b-2 pb-2 ${tab === item ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600'}`}>{item}</button>)}
          </div>
          <div className="relative w-full sm:w-72">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search room / type" className="h-10 w-full rounded border border-slate-200 pl-9 pr-3 text-[13px] outline-none focus:border-blue-500" />
          </div>
        </div>

        {tab === 'By Room Type' ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-[13px]">
              <thead className="bg-slate-50 text-[12px] text-slate-500"><tr><th className="px-4 py-3">Room Type</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Available</th><th className="px-4 py-3">Booked</th><th className="px-4 py-3">Blocked</th><th className="px-4 py-3">Availability</th></tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-[13px] text-slate-500">Loading room availability...</td></tr>
                ) : availabilityRows.map((row) => {
                  const percent = row.total ? Math.round((row.available / row.total) * 100) : 0;
                  return <tr key={row.roomType} className="border-t border-slate-100"><td className="px-4 py-3 font-bold">{row.roomType}</td><td className="px-4 py-3">{row.total}</td><td className="px-4 py-3">{row.available}</td><td className="px-4 py-3">{row.booked}</td><td className="px-4 py-3">{row.blocked}</td><td className="px-4 py-3"><span className={`rounded px-3 py-1 text-[12px] font-bold ${percent > 50 ? 'bg-green-100 text-green-700' : percent > 0 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>{percent}%</span></td></tr>;
                })}
                {!loading && availabilityRows.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-[13px] text-slate-500">No room availability data found. Configure rooms and room types to view availability.</td></tr>}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {loading ? <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center text-[13px] text-slate-500 md:col-span-2 xl:col-span-3">Loading rooms...</div> : roomRows.map((room) => <div key={room.room} className="rounded-lg border border-slate-200 bg-white p-4"><div className="flex items-start justify-between"><div><div className="text-[16px] font-bold">Room {room.room}</div><div className="mt-1 text-[12px] text-slate-500">{room.roomType} - {room.floor}</div></div><StatusBadge status={room.status} /></div><div className="mt-3 flex items-center justify-between text-[13px]"><span className="text-slate-500">Rate</span><strong>{money(room.rate)}</strong></div></div>)}
            {!loading && roomRows.length === 0 && <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center text-[13px] text-slate-500 md:col-span-2 xl:col-span-3">No room records found for the selected filters.</div>}
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={() => { setTab('By Room'); setMessage(`${roomRows.filter((room) => room.status === 'Available').length} assignable room(s) available for the selected stay.`); }} className="inline-flex h-11 items-center gap-2 rounded border border-blue-500 bg-white px-8 text-[13px] font-bold text-blue-600">
            <BedDouble size={16} />
            View Room Availability
          </button>
          <PrimaryLink to="/hotel/reservations/new">Create Reservation</PrimaryLink>
        </div>
      </section>

      <section className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4"><CalendarDays size={17} className="mb-2 text-blue-600" /><div className="text-[13px] font-bold">Selected Stay</div><div className="mt-1 text-[12px] text-slate-500">{checkIn} to {checkOut}, {nights} nights</div></div>
        <div className="rounded-lg border border-slate-200 bg-white p-4"><Blocks size={17} className="mb-2 text-orange-600" /><div className="text-[13px] font-bold">Reservation Conflicts</div><div className="mt-1 text-[12px] text-slate-500">{reservations.filter((row) => BOOKED_STATUSES.has(row.status)).length} active bookings checked</div></div>
        <div className="rounded-lg border border-slate-200 bg-white p-4"><BedDouble size={17} className="mb-2 text-green-600" /><div className="text-[13px] font-bold">Assignable Rooms</div><div className="mt-1 text-[12px] text-slate-500">Rooms with active guest or maintenance are excluded.</div></div>
      </section>
    </ReservationShell>
  );
}
