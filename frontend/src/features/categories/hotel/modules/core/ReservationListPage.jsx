import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Edit2, Eye, Filter, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';

import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';
import { deleteModuleRecord, listModuleRecords } from '../../../../../services/moduleRecordsService.js';
import { paginateRows, PaginationFooter } from './HotelPagination.jsx';
import { money, PageHeader, PrimaryLink, ReservationShell, ROOM_TYPES, SOURCES, StatCard, STATUSES, StatusBadge } from './ReservationShared.jsx';

function normalizeStatus(value) {
  const raw = String(value || 'Pending').trim().toLowerCase();
  if (raw.includes('check') && raw.includes('in')) return 'Checked-in';
  if (raw.includes('check') && raw.includes('out')) return 'Checked-out';
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function normalizeRecord(record, index) {
  const data = record.data || {};
  return {
    id: data.reservationNo || data.confirmationNo || record._id || `RES-${index}`,
    recordId: record._id,
    rawData: data,
    guest: data.guestName || data.guest || '',
    room: data.availableRoom || data.roomNumber || data.room || '-',
    roomType: data.roomType || '',
    checkIn: data.checkInDate || '',
    checkOut: data.checkOutDate || '',
    nights: Number(data.nights || 0),
    guests: `${data.adults || 0}A${Number(data.children || 0) ? `, ${data.children}C` : ''}`,
    status: normalizeStatus(data.status),
    amount: Number(data.estimatedTotal || data.amount || 0),
    source: data.bookingSource || 'Walk-in',
  };
}

function matches(value, selected) {
  return selected === 'All' || selected === 'All Status' || value === selected;
}

export function ReservationListPage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [sourceFilter, setSourceFilter] = useState('All');
  const [roomTypeFilter, setRoomTypeFilter] = useState('All');
  const [message, setMessage] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const today = new Date().toLocaleDateString('en-IN');

  function loadReservations(showMessage = false) {
    setLoading(true);
    listModuleRecords('hotel/reservations/list')
      .then((res) => {
        const rows = (res.records || []).map(normalizeRecord);
        setRecords(rows);
        setPage(1);
        if (showMessage) setMessage('Reservation list refreshed.');
      })
      .catch((err) => setMessage(err.message || 'Unable to load reservations.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    let active = true;
    listModuleRecords('hotel/reservations/list')
      .then((res) => {
        if (!active) return;
        const rows = (res.records || []).map(normalizeRecord);
        setRecords(rows);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records.filter((row) => {
      const searchMatch = !query || [row.id, row.guest, row.room].some((item) => String(item).toLowerCase().includes(query));
      return searchMatch && matches(row.status, statusFilter) && matches(row.source, sourceFilter) && matches(row.roomType, roomTypeFilter);
    });
  }, [records, roomTypeFilter, search, sourceFilter, statusFilter]);

  const counts = useMemo(() => {
    const count = (status) => records.filter((row) => row.status === status).length;
    return {
      all: records.length,
      confirmed: count('Confirmed'),
      pending: count('Pending'),
      checkedIn: count('Checked-in'),
      checkedOut: count('Checked-out'),
      cancelled: count('Cancelled'),
    };
  }, [records]);

  const pagination = paginateRows(filteredRows, page, pageSize);

  function exportReservations() {
    if (!filteredRows.length) {
      setMessage('No reservations available to export.');
      return;
    }
    const header = ['Booking ID', 'Guest', 'Room', 'Check-in', 'Check-out', 'Nights', 'Guests', 'Status', 'Amount'];
    const rows = filteredRows.map((row) => [row.id, row.guest, row.room, row.checkIn, row.checkOut, row.nights, row.guests, row.status, row.amount]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'reservation-list.csv';
    link.click();
    URL.revokeObjectURL(url);
    setMessage(`${filteredRows.length} reservation(s) exported.`);
  }

  function editReservation(row) {
    navigate(`/hotel/reservations/new?edit=${encodeURIComponent(row.recordId)}`);
  }

  async function deleteReservation(row) {
    const ok = window.confirm(`Delete reservation ${row.id}?`);
    if (!ok) return;
    try {
      if (row.recordId) await deleteModuleRecord(row.recordId);
      setRecords((current) => current.filter((item) => item.recordId !== row.recordId));
      setMessage(`${row.id} deleted successfully.`);
    } catch (err) {
      setMessage(err.message || `Unable to delete ${row.id}.`);
    }
  }

  return (
    <ReservationShell>
      <PageHeader title="Reservation List" subtitle="View and manage all reservations">
        <div className="text-[11px] text-slate-500">Home <span className="mx-2">›</span> Reservations <span className="mx-2">›</span> Reservation List</div>
        <PrimaryLink to="/hotel/reservations/new"><Plus size={15} />New Reservation</PrimaryLink>
        <button type="button" onClick={exportReservations} className="inline-flex h-10 items-center gap-2 rounded border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700"><Download size={15} />Export</button>
      </PageHeader>

      {message && <p className="mb-4 rounded border border-blue-100 bg-blue-50 px-3 py-2 text-[13px] text-blue-700">{message}</p>}

      <section className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[230px_170px_170px_170px_minmax(260px,1fr)_88px_42px]">
          <div><label className="mb-1 block text-[12px] font-semibold text-slate-600">Date Range</label><input value={today} readOnly className="h-10 w-full rounded border border-slate-200 px-3 text-[13px]" /></div>
          <div><label className="mb-1 block text-[12px] font-semibold text-slate-600">Status</label><SelectDropdown value={statusFilter} onChange={setStatusFilter} options={STATUSES} /></div>
          <div><label className="mb-1 block text-[12px] font-semibold text-slate-600">Source / Channel</label><SelectDropdown value={sourceFilter} onChange={setSourceFilter} options={SOURCES} /></div>
          <div><label className="mb-1 block text-[12px] font-semibold text-slate-600">Room Type</label><SelectDropdown value={roomTypeFilter} onChange={setRoomTypeFilter} options={ROOM_TYPES} /></div>
          <div>
            <label className="mb-1 block text-[12px] font-semibold text-slate-600">Search</label>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by Guest, Room or Booking ID..." className="h-10 w-full rounded border border-slate-200 pl-9 pr-3 text-[13px] outline-none focus:border-blue-500" />
            </div>
          </div>
          <button type="button" onClick={() => { setPage(1); setMessage(`${filteredRows.length} reservation(s) match the selected filters.`); }} className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded border border-blue-500 bg-white text-[13px] font-semibold text-blue-600"><Filter size={15} />Filter</button>
          <button type="button" onClick={() => loadReservations(true)} className="mt-5 grid h-10 w-10 place-items-center rounded border border-slate-200 bg-white text-slate-600" aria-label="Refresh reservations"><RefreshCw size={15} /></button>
        </div>
      </section>

      <section className="mb-4 grid gap-3 lg:grid-cols-6">
        <StatCard label="All Reservations" value={counts.all} sub="View all" tone="blue" onClick={() => setStatusFilter('All Status')} />
        <StatCard label="Confirmed" value={counts.confirmed} sub="View all" tone="green" onClick={() => setStatusFilter('Confirmed')} />
        <StatCard label="Pending" value={counts.pending} tone="orange" onClick={() => setStatusFilter('Pending')} />
        <StatCard label="Checked-in" value={counts.checkedIn} tone="violet" onClick={() => setStatusFilter('Checked-in')} />
        <StatCard label="Checked-out" value={counts.checkedOut} tone="slate" onClick={() => setStatusFilter('Checked-out')} />
        <StatCard label="Cancelled" value={counts.cancelled} tone="red" onClick={() => setStatusFilter('Cancelled')} />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] border-collapse text-left text-[13px]">
            <thead className="bg-slate-50 text-[12px] text-slate-500">
              <tr>
                <th className="px-4 py-3">Booking ID</th>
                <th className="px-4 py-3">Guest</th>
                <th className="px-4 py-3">Room</th>
                <th className="px-4 py-3">Check-in</th>
                <th className="px-4 py-3">Check-out</th>
                <th className="px-4 py-3">Nights</th>
                <th className="px-4 py-3">Guests</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="px-4 py-10 text-center text-slate-500">Loading reservations...</td></tr>
              ) : pagination.pageRows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-slate-950">{row.id}</td>
                  <td className="px-4 py-3">{row.guest}</td>
                  <td className="px-4 py-3">{row.room}</td>
                  <td className="px-4 py-3">{row.checkIn}</td>
                  <td className="px-4 py-3">{row.checkOut}</td>
                  <td className="px-4 py-3">{row.nights}</td>
                  <td className="px-4 py-3">{row.guests}</td>
                  <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                  <td className="px-4 py-3 text-right font-bold">{money(row.amount)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-3 text-slate-600">
                      <button type="button" onClick={() => navigate('/hotel/guests/profile')} aria-label={`View ${row.id}`} className="grid h-8 w-8 place-items-center rounded-md border-0 bg-transparent text-blue-700 hover:bg-blue-50"><Eye size={15} /></button>
                      <button type="button" onClick={() => editReservation(row)} aria-label={`Edit ${row.id}`} className="grid h-8 w-8 place-items-center rounded-md border-0 bg-transparent text-blue-700 hover:bg-blue-50"><Edit2 size={15} /></button>
                      <button type="button" onClick={() => deleteReservation(row)} aria-label={`Delete ${row.id}`} className="grid h-8 w-8 place-items-center rounded-md border-0 bg-transparent text-red-600 hover:bg-red-50"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filteredRows.length === 0 && <tr><td colSpan={10} className="px-4 py-10 text-center text-slate-500">No reservations match the selected filters.</td></tr>}
            </tbody>
          </table>
        </div>
        <PaginationFooter page={pagination.currentPage} pageSize={pageSize} total={filteredRows.length} start={pagination.start} end={pagination.end} totalPages={pagination.totalPages} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </section>
    </ReservationShell>
  );
}
