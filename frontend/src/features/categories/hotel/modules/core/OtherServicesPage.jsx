import { useMemo, useState } from 'react';
import { BriefcaseBusiness, Clock, HeartHandshake, LifeBuoy, PieChart, Settings, Wrench } from 'lucide-react';

import {
  AddIcon,
  otherRequests,
  otherServiceTiles,
  RowAction,
  ServiceBadge,
  ServiceCard,
  ServicePageHeader,
  ServicePrimaryButton,
  ServiceSearch,
  ServiceSecondaryButton,
  ServiceTabs,
} from './HotelServicesShared.jsx';
import { paginateRows, PaginationFooter } from './HotelPagination.jsx';

const TABS = ['All Requests', 'In Progress', 'Completed', 'Pending'];
const iconMap = {
  'Doctor On Call': LifeBuoy,
  'Wake-up Call': Clock,
  'Baby Sitting': HeartHandshake,
  Decorations: HeartHandshake,
  'Lost & Found': LifeBuoy,
  'Business Center': BriefcaseBusiness,
  Maintenance: Wrench,
  'Guest Amenities': HeartHandshake,
};

const toneClass = {
  green: 'bg-emerald-50 text-emerald-700',
  blue: 'bg-blue-50 text-blue-700',
  violet: 'bg-violet-50 text-violet-700',
  pink: 'bg-pink-50 text-pink-700',
  orange: 'bg-orange-50 text-orange-700',
  slate: 'bg-slate-100 text-slate-700',
};

export function OtherServicesPage() {
  const [tab, setTab] = useState('All Requests');
  const [search, setSearch] = useState('');
  const [requests, setRequests] = useState(otherRequests);
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ guest: '', room: '', service: 'Guest Amenities', category: 'Room Service', details: '', quantity: '1', price: '', pricingType: 'Per Service', startDate: '', endDate: '', chargeTo: 'Room', staff: '' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return requests.filter((request) => {
      const tabMatch = tab === 'All Requests' || request.status === tab;
      const searchMatch = !query || [request.id, request.guest, request.room, request.service, request.details].some((value) => String(value).toLowerCase().includes(query));
      return tabMatch && searchMatch;
    });
  }, [requests, search, tab]);

  const pagination = paginateRows(rows, page, pageSize);

  function createRequest() {
    const next = {
      id: `OS-${1057 + requests.length}`,
      guest: form.guest,
      room: form.room,
      service: form.service,
      category: form.category,
      details: form.details,
      quantity: Number(form.quantity),
      price: Number(form.price) || 0,
      pricingType: form.pricingType,
      startDate: form.startDate,
      endDate: form.endDate,
      chargeTo: form.chargeTo,
      staff: form.staff,
      time: 'Just now',
      status: 'Pending',
    };
    setRequests((current) => [next, ...current]);
    setForm({ guest: '', room: '', service: 'Guest Amenities', category: 'Room Service', details: '', quantity: '1', price: '', pricingType: 'Per Service', startDate: '', endDate: '', chargeTo: 'Room', staff: '' });
    setShowForm(false);
    setTab('All Requests');
    setMessage(`${next.id} created. Assign staff and pricing from request details.`);
  }

  function handleRequestAction(action, request) {
    if (!request) return;
    if (action === 'View') setMessage(`${request.id}: ${request.service}, ${request.status}.`);
    if (action === 'Edit') {
      setForm({ guest: request.guest || '', room: request.room || '', service: request.service || 'Guest Amenities', category: request.category || 'Room Service', details: request.details || '', quantity: String(request.quantity || 1), price: String(request.price || ''), pricingType: request.pricingType || 'Per Service', startDate: request.startDate || '', endDate: request.endDate || '', chargeTo: request.chargeTo || 'Room', staff: request.staff || '' });
      setShowForm(true);
      setMessage(`Editing ${request.id}.`);
    }
    if (action === 'Delete') {
      const ok = window.confirm(`Delete service request ${request.id}?`);
      if (!ok) return;
      setRequests((current) => current.filter((item) => item.id !== request.id));
      setMessage(`${request.id} deleted.`);
    }
  }

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6">
      <ServicePageHeader
        title="Other Services"
        subtitle="Manage miscellaneous hotel services and requests"
        actions={<ServicePrimaryButton onClick={() => setShowForm((value) => !value)}><AddIcon />New Request</ServicePrimaryButton>}
      />

      {message && <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[13px] font-semibold text-blue-700">{message}</div>}

      {showForm && (
        <form onSubmit={(event) => { event.preventDefault(); if (form.guest && form.room && form.details) createRequest(); }} className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 text-[14px] font-bold text-slate-950">Service Request</div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input value={form.guest} onChange={(event) => setForm((current) => ({ ...current, guest: event.target.value }))} placeholder="Guest name *" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
          <input value={form.room} onChange={(event) => setForm((current) => ({ ...current, room: event.target.value }))} placeholder="Room *" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
          <select value={form.service} onChange={(event) => setForm((current) => ({ ...current, service: event.target.value }))} className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500">
            {otherServiceTiles.map((service) => <option key={service.name}>{service.name}</option>)}
          </select>
          <select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500">
            {['Room Service', 'Front Desk', 'Business', 'Transport', 'Events', 'Maintenance'].map((item) => <option key={item}>{item}</option>)}
          </select>
          <input value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))} type="number" min="1" placeholder="Quantity" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
          <input value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} type="number" min="0" placeholder="Price" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
          <select value={form.pricingType} onChange={(event) => setForm((current) => ({ ...current, pricingType: event.target.value }))} className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500">
            {['Per Item', 'Per Night', 'Per Person', 'Per Hour', 'Per Service', 'Fixed Charge'].map((item) => <option key={item}>{item}</option>)}
          </select>
          <input value={form.startDate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} placeholder="Start date" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
          <input value={form.endDate} onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))} placeholder="End date" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
          <select value={form.chargeTo} onChange={(event) => setForm((current) => ({ ...current, chargeTo: event.target.value }))} className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500">
            {['Guest', 'Room', 'Direct Payment'].map((item) => <option key={item}>{item}</option>)}
          </select>
          <input value={form.staff} onChange={(event) => setForm((current) => ({ ...current, staff: event.target.value }))} placeholder="Assigned staff" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
          <input value={form.details} onChange={(event) => setForm((current) => ({ ...current, details: event.target.value }))} placeholder="Request details *" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500 md:col-span-2" />
          <ServicePrimaryButton type="submit">Add Service</ServicePrimaryButton>
          </div>
        </form>
      )}

      <section className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8">
        {otherServiceTiles.map((service) => {
          const Icon = iconMap[service.name] || Settings;
          return (
            <ServiceCard key={service.name} className="p-4 text-center">
              <span className={`mx-auto grid h-11 w-11 place-items-center rounded-lg ${toneClass[service.tone]}`}>
                <Icon size={20} />
              </span>
              <div className="mt-3 text-[13px] font-bold text-slate-950">{service.name}</div>
              <div className="mt-1 text-[12px] font-semibold text-slate-500">{service.count}</div>
            </ServiceCard>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <ServiceCard>
          <ServiceTabs tabs={TABS} active={tab} onChange={setTab} />
          <div className="border-b border-slate-100 p-4">
            <ServiceSearch value={search} onChange={setSearch} placeholder="Search service request..." />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 text-[12px] text-slate-500">
                  <th className="px-4 py-3 font-semibold">Request ID</th>
                  <th className="px-4 py-3 font-semibold">Guest / Room</th>
                  <th className="px-4 py-3 font-semibold">Service</th>
                  <th className="px-4 py-3 font-semibold">Request Details</th>
                  <th className="px-4 py-3 font-semibold">Request Time</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {pagination.pageRows.map((request) => (
                  <tr key={request.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-[13px] font-bold text-slate-950">{request.id}</td>
                    <td className="px-4 py-3 text-[13px] font-semibold text-slate-700">{request.guest}<div className="text-[12px] text-slate-500">Room {request.room}</div></td>
                    <td className="px-4 py-3 text-[13px] text-slate-700">{request.service}</td>
                    <td className="px-4 py-3 text-[13px] text-slate-700">{request.details}</td>
                    <td className="px-4 py-3 text-[13px] text-slate-700">{request.time}</td>
                    <td className="px-4 py-3"><ServiceBadge>{request.status}</ServiceBadge></td>
                    <td className="px-4 py-3"><RowAction item={request} onAction={handleRequestAction} /></td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-[13px] text-slate-500">No other service requests found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <PaginationFooter page={pagination.currentPage} pageSize={pageSize} total={rows.length} start={pagination.start} end={pagination.end} totalPages={pagination.totalPages} label="requests" onPageChange={setPage} onPageSizeChange={setPageSize} />
        </ServiceCard>

        <aside className="space-y-4">
          <ServiceCard className="p-4">
            <h2 className="m-0 flex items-center gap-2 text-[16px] font-bold text-slate-950"><PieChart size={18} className="text-blue-600" />Service Summary</h2>
            <div className="mt-4 grid place-items-center">
              <div className="grid h-32 w-32 place-items-center rounded-full border-[16px] border-blue-600 bg-white text-center shadow-inner" style={{ borderRightColor: '#22c55e', borderBottomColor: '#f97316', borderLeftColor: '#a855f7' }}>
                <span><strong className="block text-2xl text-slate-950">{requests.length}</strong><span className="text-[12px] font-semibold text-slate-500">Total</span></span>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-[12px] font-semibold text-slate-600">
              <div className="flex justify-between"><span>In Progress</span><span>{requests.filter((item) => item.status === 'In Progress').length}</span></div>
              <div className="flex justify-between"><span>Pending</span><span>{requests.filter((item) => item.status === 'Pending').length}</span></div>
              <div className="flex justify-between"><span>Completed</span><span>{requests.filter((item) => item.status === 'Completed').length}</span></div>
              <div className="flex justify-between"><span>Scheduled</span><span>{requests.filter((item) => item.status === 'Scheduled').length}</span></div>
            </div>
          </ServiceCard>

          <ServiceCard className="p-4">
            <h2 className="m-0 text-[16px] font-bold text-slate-950">Quick Links</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <ServiceSecondaryButton onClick={() => setMessage('Service settings opened.')} className="h-16 flex-col px-2"><Settings size={16} />Service Settings</ServiceSecondaryButton>
              <ServiceSecondaryButton onClick={() => setMessage('Service history opened.')} className="h-16 flex-col px-2"><Clock size={16} />Service History</ServiceSecondaryButton>
            </div>
          </ServiceCard>
        </aside>
      </section>
    </div>
  );
}
