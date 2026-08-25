import { useMemo, useState } from 'react';
import { HeartPulse, Sparkles } from 'lucide-react';

import {
  AddIcon,
  money,
  RowAction,
  ServiceBadge,
  ServiceCard,
  ServicePageHeader,
  ServicePrimaryButton,
  ServiceSecondaryButton,
  ServiceSearch,
  ServiceStatCard,
  ServiceTabs,
  spaBookings,
} from './HotelServicesShared.jsx';
import { paginateRows, PaginationFooter } from './HotelPagination.jsx';

const TABS = ['All Bookings', 'In Progress', 'Completed', 'Upcoming'];

export function SpaPage() {
  const [tab, setTab] = useState('All Bookings');
  const [search, setSearch] = useState('');
  const [bookings, setBookings] = useState(spaBookings);
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ guest: '', room: '', service: 'Swedish Massage', duration: '60 Minutes', therapist: '', date: '', time: '', price: '', request: '', payment: 'Charge to Room' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return bookings.filter((booking) => {
      const tabMatch = tab === 'All Bookings' || booking.status === tab;
      const searchMatch = !query || [booking.id, booking.guest, booking.room, booking.service, booking.therapist].some((value) => String(value).toLowerCase().includes(query));
      return tabMatch && searchMatch;
    });
  }, [bookings, search, tab]);

  const pagination = paginateRows(rows, page, pageSize);

  const services = spaBookings.map((booking) => ({ name: booking.service, price: booking.price }));

  function createBooking() {
    const next = {
      id: `SP-${1026 + bookings.length}`,
      guest: form.guest,
      room: form.room,
      service: form.service,
      duration: form.duration,
      therapist: form.therapist,
      time: `${form.date}, ${form.time}`,
      request: form.request,
      payment: form.payment,
      status: 'Upcoming',
      price: Number(form.price),
    };
    setBookings((current) => [next, ...current]);
    setForm({ guest: '', room: '', service: 'Swedish Massage', duration: '60 Minutes', therapist: '', date: '', time: '', price: '', request: '', payment: 'Charge to Room' });
    setShowForm(false);
    setTab('All Bookings');
    setMessage(`${next.id} booked. Confirm therapist and payment from booking details.`);
  }

  function handleBookingAction(action, booking) {
    if (!booking) return;
    if (action === 'View') setMessage(`${booking.id}: ${booking.service}, ${booking.status}, ${money(booking.price)}.`);
    if (action === 'Edit') {
      const [date = '', time = ''] = String(booking.time || '').split(', ');
      setForm({ guest: booking.guest || '', room: booking.room || '', service: booking.service || 'Swedish Massage', duration: booking.duration || '60 Minutes', therapist: booking.therapist || '', date, time, price: String(booking.price || ''), request: booking.request || '', payment: booking.payment || 'Charge to Room' });
      setShowForm(true);
      setMessage(`Editing ${booking.id}.`);
    }
    if (action === 'Delete') {
      const ok = window.confirm(`Delete spa booking ${booking.id}?`);
      if (!ok) return;
      setBookings((current) => current.filter((item) => item.id !== booking.id));
      setMessage(`${booking.id} deleted.`);
    }
  }

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6">
      <ServicePageHeader
        title="Spa"
        subtitle="Manage spa appointments and services"
        actions={(
          <>
            <ServicePrimaryButton onClick={() => setShowForm((value) => !value)}><AddIcon />New Booking</ServicePrimaryButton>
            <ServiceSecondaryButton onClick={() => setMessage('Spa services opened: massage, therapy, facial, scrub, and packages.')}><Sparkles size={15} />Services</ServiceSecondaryButton>
          </>
        )}
      />

      {message && <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[13px] font-semibold text-blue-700">{message}</div>}

      {showForm && (
        <form onSubmit={(event) => { event.preventDefault(); if (form.guest && form.room && form.therapist && form.price) createBooking(); }} className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 text-[14px] font-bold text-slate-950">New Spa Booking</div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input value={form.guest} onChange={(event) => setForm((current) => ({ ...current, guest: event.target.value }))} placeholder="Guest name *" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
          <input value={form.room} onChange={(event) => setForm((current) => ({ ...current, room: event.target.value }))} placeholder="Room *" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
          <select value={form.service} onChange={(event) => setForm((current) => ({ ...current, service: event.target.value }))} className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500">
            {['Swedish Massage', 'Aroma Therapy', 'Deep Tissue Massage', 'Facial Treatment'].map((service) => <option key={service}>{service}</option>)}
          </select>
          <select value={form.duration} onChange={(event) => setForm((current) => ({ ...current, duration: event.target.value }))} className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500">
            {['30 Minutes', '60 Minutes', '90 Minutes', '120 Minutes'].map((item) => <option key={item}>{item}</option>)}
          </select>
          <input value={form.therapist} onChange={(event) => setForm((current) => ({ ...current, therapist: event.target.value }))} placeholder="Therapist" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
          <input value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} placeholder="Date" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
          <input value={form.time} onChange={(event) => setForm((current) => ({ ...current, time: event.target.value }))} placeholder="Time" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
          <input value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} type="number" min="1" placeholder="Price" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
          <select value={form.payment} onChange={(event) => setForm((current) => ({ ...current, payment: event.target.value }))} className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500">
            {['Charge to Room', 'Cash', 'Card', 'UPI'].map((item) => <option key={item}>{item}</option>)}
          </select>
          <input value={form.request} onChange={(event) => setForm((current) => ({ ...current, request: event.target.value }))} placeholder="Special request" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
          <ServicePrimaryButton type="submit">Book Spa</ServicePrimaryButton>
          </div>
        </form>
      )}

      <section className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-5">
        <ServiceStatCard label="Today's Bookings" value={bookings.length} />
        <ServiceStatCard label="In Progress" value={bookings.filter((item) => item.status === 'In Progress').length} />
        <ServiceStatCard label="Completed Today" value={bookings.filter((item) => item.status === 'Completed').length} />
        <ServiceStatCard label="Upcoming" value={bookings.filter((item) => item.status === 'Upcoming').length} tone="slate" />
        <ServiceStatCard label="Revenue Today" value={money(bookings.reduce((sum, item) => sum + Number(item.price || 0), 0))} />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <ServiceCard>
          <ServiceTabs tabs={TABS} active={tab} onChange={setTab} />
          <div className="border-b border-slate-100 p-4">
            <ServiceSearch value={search} onChange={setSearch} placeholder="Search guest, room, or booking..." />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 text-[12px] text-slate-500">
                  <th className="px-4 py-3 font-semibold">Booking ID</th>
                  <th className="px-4 py-3 font-semibold">Guest / Room</th>
                  <th className="px-4 py-3 font-semibold">Service</th>
                  <th className="px-4 py-3 font-semibold">Therapist</th>
                  <th className="px-4 py-3 font-semibold">Time</th>
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
                    <td className="px-4 py-3 text-[13px] text-slate-700">{booking.therapist}</td>
                    <td className="px-4 py-3 text-[13px] text-slate-700">{booking.time}</td>
                    <td className="px-4 py-3"><ServiceBadge>{booking.status}</ServiceBadge></td>
                    <td className="px-4 py-3"><RowAction item={booking} onAction={handleBookingAction} /></td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-[13px] text-slate-500">No spa bookings found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <PaginationFooter page={pagination.currentPage} pageSize={pageSize} total={rows.length} start={pagination.start} end={pagination.end} totalPages={pagination.totalPages} label="bookings" onPageChange={setPage} onPageSizeChange={setPageSize} />
        </ServiceCard>

        <ServiceCard className="p-4">
          <h2 className="m-0 flex items-center gap-2 text-[16px] font-bold text-slate-950"><HeartPulse size={18} className="text-blue-600" />Popular Spa Services</h2>
          <div className="mt-4 space-y-3">
            {services.map((service) => (
              <div key={service.name} className="flex items-center justify-between rounded-md bg-slate-50 p-3 text-[13px]">
                <span className="font-semibold text-slate-800">{service.name}</span>
                <span className="font-bold text-slate-950">{money(service.price)}</span>
              </div>
            ))}
            {services.length === 0 && <p className="m-0 text-[13px] text-slate-500">No spa services found.</p>}
          </div>
          <button type="button" onClick={() => setMessage('All spa services opened.')} className="mt-4 w-full border-0 bg-transparent text-[13px] font-bold text-blue-700">View All Services</button>
        </ServiceCard>
      </section>
    </div>
  );
}
