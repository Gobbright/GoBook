import { useEffect, useMemo, useState } from 'react';
import { Baby, BedDouble, Filter, RefreshCw, Search, UserRound, UsersRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';
import { deleteModuleRecord, listModuleRecords } from '../../../../../services/moduleRecordsService.js';
import { Badge, Card, EmptySearch, MetricCard, PageHeader, SecondaryButton, TableActions } from './FrontDeskShared.jsx';
import { paginateRows, PaginationFooter } from './HotelPagination.jsx';

function normalizeInHouse(record, index) {
  const data = record.data || {};
  return {
    recordId: record._id,
    id: data.reservationId || data.guestId || `STAY-${index + 1}`,
    reservationId: data.reservationId || data.bookingId || '',
    name: data.guestName || data.name || 'Guest',
    room: data.roomNumber || data.room || '-',
    roomType: data.roomType || 'Deluxe Room',
    floor: String(data.floor || data.roomNumber || data.room || '2').charAt(0),
    checkIn: data.checkInDate || '-',
    checkOut: data.checkOutDate || '-',
    nights: Number(data.nights || 1),
    adults: Number(data.adults || 1),
    children: Number(data.children || 0),
    status: data.status || 'In-House',
  };
}

export function InHouseGuestsPage() {
  const navigate = useNavigate();
  const [guests, setGuests] = useState([]);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [floor, setFloor] = useState('All Floors');
  const [roomType, setRoomType] = useState('All Room Types');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  useEffect(() => {
    let active = true;
    listModuleRecords('hotel/front-desk/in-house-guests')
      .then((res) => {
        if (!active) return;
        const rows = (res.records || []).map(normalizeInHouse);
        if (rows.length) setGuests(rows);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return guests.filter((guest) => {
      const matchesSearch = !query || [guest.name, guest.room, guest.id, guest.reservationId].some((value) => String(value || '').toLowerCase().includes(query));
      const matchesFloor = floor === 'All Floors' || guest.floor === floor.replace('Floor ', '');
      const matchesType = roomType === 'All Room Types' || guest.roomType === roomType;
      return matchesSearch && matchesFloor && matchesType;
    });
  }, [floor, guests, roomType, search]);

  const totals = {
    adults: guests.reduce((sum, guest) => sum + guest.adults, 0),
    children: guests.reduce((sum, guest) => sum + guest.children, 0),
    rooms: new Set(guests.map((guest) => guest.room)).size,
  };

  const pagination = paginateRows(filtered, page, pageSize);

  async function handleGuestAction(action, guest) {
    if (action === 'View') navigate('/hotel/guests/profile');
    if (action === 'Edit') navigate('/hotel/front-desk/room-change');
    if (action === 'Delete') {
      const ok = window.confirm(`Remove ${guest?.name || 'guest'} from in-house list?`);
      if (!ok) return;
      try {
        if (guest.recordId) await deleteModuleRecord(guest.recordId);
        setGuests((current) => current.filter((item) => item.recordId !== guest.recordId));
        setMessage(`${guest?.name || 'Guest'} removed from in-house list.`);
      } catch (err) {
        setMessage(err.message || 'Unable to remove in-house guest.');
      }
    }
  }

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6">
      <PageHeader title="In-House Guests" subtitle="View and manage all currently staying guests." />

      {message && <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[13px] font-semibold text-blue-700">{message}</div>}

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard icon={UserRound} label="Total In-House" value={guests.length} note="View all" tone="blue" />
        <MetricCard icon={UsersRound} label="Adults" value={totals.adults} note="Across active stays" tone="green" />
        <MetricCard icon={Baby} label="Children" value={totals.children} note="Across active stays" tone="amber" />
        <MetricCard icon={BedDouble} label="Rooms Occupied" value={totals.rooms} note="83% occupancy" tone="green" />
        <MetricCard icon={UserRound} label="Expected Check-out Today" value="4" note="Needs billing review" tone="orange" />
      </div>

      <Card>
        <div className="grid grid-cols-1 gap-3 border-b border-slate-100 p-4 lg:grid-cols-[1fr_180px_200px_auto_auto]">
          <EmptySearch value={search} onChange={setSearch} placeholder="Search guest, room no. or booking ID" />
          <SelectDropdown value={floor} onChange={setFloor} options={['All Floors', 'Floor 1', 'Floor 2', 'Floor 3', 'Floor 4', 'Floor 5']} />
          <SelectDropdown value={roomType} onChange={setRoomType} options={['All Room Types', 'Standard Room', 'Deluxe Room', 'Executive Room', 'Suite Room']} />
          <SecondaryButton>
            <Filter size={15} />
            Filter
          </SecondaryButton>
          <SecondaryButton className="px-3" aria-label="Refresh">
            <RefreshCw size={15} />
          </SecondaryButton>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-semibold">Room No.</th>
                <th className="px-4 py-3 font-semibold">Guest Name</th>
                <th className="px-4 py-3 font-semibold">Check-in</th>
                <th className="px-4 py-3 font-semibold">Check-out</th>
                <th className="px-4 py-3 font-semibold">Nights</th>
                <th className="px-4 py-3 font-semibold">Guests</th>
                <th className="px-4 py-3 font-semibold">Room Type</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {pagination.pageRows.map((guest) => (
                <tr key={guest.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-[13px] font-semibold text-slate-950">{guest.room}</td>
                  <td className="px-4 py-3 text-[13px] text-slate-700">{guest.name}</td>
                  <td className="px-4 py-3 text-[13px] text-slate-700">{guest.checkIn}</td>
                  <td className="px-4 py-3 text-[13px] text-slate-700">{guest.checkOut}</td>
                  <td className="px-4 py-3 text-[13px] text-slate-700">{guest.nights}</td>
                  <td className="px-4 py-3 text-[13px] text-slate-700">{guest.adults}A, {guest.children}C</td>
                  <td className="px-4 py-3 text-[13px] text-slate-700">{guest.roomType}</td>
                  <td className="px-4 py-3"><Badge>{guest.status}</Badge></td>
                  <td className="px-4 py-3"><TableActions item={guest} onAction={handleGuestAction} /></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-[13px] text-slate-500">No in-house guests found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <PaginationFooter page={pagination.currentPage} pageSize={pageSize} total={filtered.length} start={pagination.start} end={pagination.end} totalPages={pagination.totalPages} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </Card>
    </div>
  );
}
