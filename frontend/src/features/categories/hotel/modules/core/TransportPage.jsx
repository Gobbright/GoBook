import { useMemo, useState } from 'react';
import { Bus, Car } from 'lucide-react';

import {
  AddIcon,
  RowAction,
  ServiceBadge,
  ServiceCard,
  ServicePageHeader,
  ServicePrimaryButton,
  ServiceSearch,
  ServiceSecondaryButton,
  ServiceStatCard,
  ServiceTabs,
  transportBookings,
} from './HotelServicesShared.jsx';
import { paginateRows, PaginationFooter } from './HotelPagination.jsx';

const TABS = ['All Bookings', 'Upcoming', 'In Progress', 'Completed', 'Cancelled'];
const vehicles = [];

export function TransportPage() {
  const [tab, setTab] = useState('All Bookings');
  const [search, setSearch] = useState('');
  const [bookings, setBookings] = useState(transportBookings);
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ guest: '', room: '', service: 'Airport Drop', pickup: 'Hotel', drop: '', date: '', time: '', passengers: '1', vehicle: '', driver: '', price: '', flight: '', instructions: '', payment: 'Charge to Room' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return bookings.filter((booking) => {
      const tabMatch = tab === 'All Bookings' || booking.status === tab;
      const searchMatch = !query || [booking.id, booking.guest, booking.room, booking.service, booking.vehicle].some((value) => String(value).toLowerCase().includes(query));
      return tabMatch && searchMatch;
    });
  }, [bookings, search, tab]);

  const pagination = paginateRows(rows, page, pageSize);

  function createBooking() {
    const next = {
      id: `TR-${1029 + bookings.length}`,
      guest: form.guest,
      room: form.room,
      service: form.service,
      pickup: form.pickup,
      drop: form.drop,
      passengers: Number(form.passengers),
      vehicle: form.vehicle,
      driver: form.driver,
      price: Number(form.price) || 0,
      flight: form.flight,
      instructions: form.instructions,
      payment: form.payment,
      time: `${form.date}, ${form.time}`,
      status: 'Upcoming',
    };
    setBookings((current) => [next, ...current]);
    setForm({ guest: '', room: '', service: 'Airport Drop', pickup: 'Hotel', drop: '', date: '', time: '', passengers: '1', vehicle: '', driver: '', price: '', flight: '', instructions: '', payment: 'Charge to Room' });
    setShowForm(false);
    setTab('All Bookings');
    setMessage(`${next.id} booked. Assign driver and pickup details from booking details.`);
  }

  function handleBookingAction(action, booking) {
    if (!booking) return;
    if (action === 'View') setMessage(`${booking.id}: ${booking.service}, ${booking.vehicle || 'vehicle pending'}, ${booking.status}.`);
    if (action === 'Edit') {
      const [date = '', time = ''] = String(booking.time || '').split(', ');
      setForm({ guest: booking.guest || '', room: booking.room || '', service: booking.service || 'Airport Drop', pickup: booking.pickup || 'Hotel', drop: booking.drop || '', date, time, passengers: String(booking.passengers || 1), vehicle: booking.vehicle || '', driver: booking.driver || '', price: String(booking.price || ''), flight: booking.flight || '', instructions: booking.instructions || '', payment: booking.payment || 'Charge to Room' });
      setShowForm(true);
      setMessage(`Editing ${booking.id}.`);
    }
    if (action === 'Delete') {
      const ok = window.confirm(`Delete transport booking ${booking.id}?`);
      if (!ok) return;
      setBookings((current) => current.filter((item) => item.id !== booking.id));
      setMessage(`${booking.id} deleted.`);
    }
  }

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6">
      <ServicePageHeader
        title="Transport"
        subtitle="Manage transport bookings and requests"
        actions={(
          <>
            <ServicePrimaryButton onClick={() => setShowForm((value) => !value)}><AddIcon />New Booking</ServicePrimaryButton>
            <ServiceSecondaryButton onClick={() => setMessage('Vehicle availability opened.')}><Car size={15} />Vehicles</ServiceSecondaryButton>
          </>
        )}
      />

      {message && <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[13px] font-semibold text-blue-700">{message}</div>}

      {showForm && (
        <form onSubmit={(event) => { event.preventDefault(); if (form.guest && form.room && form.vehicle && form.time) createBooking(); }} className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 text-[14px] font-bold text-slate-950">New Transport Booking</div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input value={form.guest} onChange={(event) => setForm((current) => ({ ...current, guest: event.target.value }))} placeholder="Guest name *" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
          <input value={form.room} onChange={(event) => setForm((current) => ({ ...current, room: event.target.value }))} placeholder="Room *" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
          <select value={form.service} onChange={(event) => setForm((current) => ({ ...current, service: event.target.value }))} className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500">
            {['Airport Pickup', 'Airport Drop', 'Railway Station', 'Bus Stand', 'City Transfer', 'Local Taxi', 'Hotel Shuttle', 'Custom Trip', 'Outstation'].map((service) => <option key={service}>{service}</option>)}
          </select>
          <input value={form.pickup} onChange={(event) => setForm((current) => ({ ...current, pickup: event.target.value }))} placeholder="Pickup location" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
          <input value={form.drop} onChange={(event) => setForm((current) => ({ ...current, drop: event.target.value }))} placeholder="Drop location" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
          <input value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} placeholder="Pickup date" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
          <input value={form.time} onChange={(event) => setForm((current) => ({ ...current, time: event.target.value }))} placeholder="Pickup time *" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
          <input value={form.passengers} onChange={(event) => setForm((current) => ({ ...current, passengers: event.target.value }))} type="number" min="1" placeholder="Passengers" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
          <input value={form.vehicle} onChange={(event) => setForm((current) => ({ ...current, vehicle: event.target.value }))} placeholder="Vehicle" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
          <input value={form.driver} onChange={(event) => setForm((current) => ({ ...current, driver: event.target.value }))} placeholder="Driver" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
          <input value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} type="number" min="0" placeholder="Price" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
          <input value={form.flight} onChange={(event) => setForm((current) => ({ ...current, flight: event.target.value }))} placeholder="Flight / train no." className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
          <select value={form.payment} onChange={(event) => setForm((current) => ({ ...current, payment: event.target.value }))} className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500">
            {['Charge to Room', 'Cash', 'Card', 'UPI'].map((item) => <option key={item}>{item}</option>)}
          </select>
          <input value={form.instructions} onChange={(event) => setForm((current) => ({ ...current, instructions: event.target.value }))} placeholder="Special instructions" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500 md:col-span-2" />
          <ServicePrimaryButton type="submit">Book Transport</ServicePrimaryButton>
          </div>
        </form>
      )}

      <section className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-5">
        <ServiceStatCard label="Total Bookings" value={bookings.length} />
        <ServiceStatCard label="Upcoming" value={bookings.filter((item) => item.status === 'Upcoming').length} />
        <ServiceStatCard label="In Progress" value={bookings.filter((item) => item.status === 'In Progress').length} />
        <ServiceStatCard label="Completed Today" value={bookings.filter((item) => item.status === 'Completed').length} />
        <ServiceStatCard label="Cancelled" value={bookings.filter((item) => item.status === 'Cancelled').length} tone="red" />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <ServiceCard>
          <ServiceTabs tabs={TABS} active={tab} onChange={setTab} />
          <div className="border-b border-slate-100 p-4">
            <ServiceSearch value={search} onChange={setSearch} placeholder="Search guest, room, booking..." />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 text-[12px] text-slate-500">
                  <th className="px-4 py-3 font-semibold">Booking ID</th>
                  <th className="px-4 py-3 font-semibold">Guest / Room</th>
                  <th className="px-4 py-3 font-semibold">Service Type</th>
                  <th className="px-4 py-3 font-semibold">Vehicle</th>
                  <th className="px-4 py-3 font-semibold">Pickup Time</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {pagination.pageRows.map((booking) => (
                  <tr key={booking.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-[13px] font-bold text-slate-950">{booking.id}</td>
                    <td className="px-4 py-3 text-[13px] font-semibold text-slate-700">{booking.guest}<div className="text-[12px] text-slate-500">Room {booking.room}</div></td>
                    <td className="px-4 py-3 text-[13px] text-slate-700">{booking.service}</td>
                    <td className="px-4 py-3 text-[13px] text-slate-700">{booking.vehicle}</td>
                    <td className="px-4 py-3 text-[13px] text-slate-700">{booking.time}</td>
                    <td className="px-4 py-3"><ServiceBadge>{booking.status}</ServiceBadge></td>
                    <td className="px-4 py-3"><RowAction item={booking} onAction={handleBookingAction} /></td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-[13px] text-slate-500">No transport bookings found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <PaginationFooter page={pagination.currentPage} pageSize={pageSize} total={rows.length} start={pagination.start} end={pagination.end} totalPages={pagination.totalPages} label="bookings" onPageChange={setPage} onPageSizeChange={setPageSize} />
        </ServiceCard>

        <ServiceCard className="p-4">
          <h2 className="m-0 flex items-center gap-2 text-[16px] font-bold text-slate-950"><Bus size={18} className="text-blue-600" />Available Vehicles</h2>
          <div className="mt-4 space-y-3">
            {vehicles.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-md bg-slate-50 p-3 text-[13px]">
                <span className="font-semibold text-slate-800">{label}</span>
                <span className="font-bold text-slate-950">{value}</span>
              </div>
            ))}
            {vehicles.length === 0 && <p className="m-0 text-[13px] text-slate-500">No vehicle records found.</p>}
          </div>
          <button type="button" onClick={() => setMessage('All vehicles opened.')} className="mt-4 w-full border-0 bg-transparent text-[13px] font-bold text-blue-700">View All Vehicles</button>
        </ServiceCard>
      </section>
    </div>
  );
}
