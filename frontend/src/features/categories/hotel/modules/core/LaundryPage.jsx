import { useMemo, useState } from 'react';
import { ClipboardList } from 'lucide-react';

import {
  AddIcon,
  laundryRequests,
  RowAction,
  ServiceBadge,
  ServiceCard,
  ServicePageHeader,
  ServicePrimaryButton,
  ServiceSearch,
  ServiceSecondaryButton,
  ServiceStatCard,
  ServiceTabs,
} from './HotelServicesShared.jsx';
import { paginateRows, PaginationFooter } from './HotelPagination.jsx';

const TABS = ['All Requests', 'In Process', 'Ready', 'Delivered', 'Pending'];
const overview = [];

export function LaundryPage() {
  const [tab, setTab] = useState('All Requests');
  const [search, setSearch] = useState('');
  const [requests, setRequests] = useState(laundryRequests);
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ guest: '', room: '', type: 'Wash & Fold', itemName: '', items: '1', pickup: '', delivery: '', instructions: '', amount: '' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return requests.filter((request) => {
      const tabMatch = tab === 'All Requests' || request.status === tab;
      const searchMatch = !query || [request.id, request.guest, request.room, request.type].some((value) => String(value).toLowerCase().includes(query));
      return tabMatch && searchMatch;
    });
  }, [requests, search, tab]);

  const pagination = paginateRows(rows, page, pageSize);

  function createRequest() {
    const next = {
      id: `LD-${1037 + requests.length}`,
      guest: form.guest,
      room: form.room,
      type: form.type,
      itemName: form.itemName,
      items: Number(form.items),
      pickup: form.pickup,
      delivery: form.delivery,
      instructions: form.instructions,
      amount: Number(form.amount) || 0,
      status: 'Pending',
      requestTime: 'Just now',
    };
    setRequests((current) => [next, ...current]);
    setForm({ guest: '', room: '', type: 'Wash & Fold', itemName: '', items: '1', pickup: '', delivery: '', instructions: '', amount: '' });
    setShowForm(false);
    setTab('All Requests');
    setMessage(`${next.id} created. Assign pickup and laundry items from request details.`);
  }

  function handleRequestAction(action, request) {
    if (!request) return;
    if (action === 'View') setMessage(`${request.id}: ${request.type}, ${request.items} item(s), ${request.status}.`);
    if (action === 'Edit') {
      setForm({ guest: request.guest || '', room: request.room || '', type: request.type || 'Wash & Fold', itemName: request.itemName || '', items: String(request.items || 1), amount: String(request.amount || ''), pickup: request.pickup || '', delivery: request.delivery || '', instructions: request.instructions || '' });
      setShowForm(true);
      setMessage(`Editing ${request.id}.`);
    }
    if (action === 'Delete') {
      const ok = window.confirm(`Delete laundry request ${request.id}?`);
      if (!ok) return;
      setRequests((current) => current.filter((item) => item.id !== request.id));
      setMessage(`${request.id} deleted.`);
    }
  }

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6">
      <ServicePageHeader
        title="Laundry"
        subtitle="Manage laundry requests"
        actions={(
          <>
            <ServicePrimaryButton onClick={() => setShowForm((value) => !value)}><AddIcon />New Request</ServicePrimaryButton>
            <ServiceSecondaryButton onClick={() => setMessage('Laundry price list opened: Wash & Fold, Ironing, Dry Cleaning, Express Service.')}><ClipboardList size={15} />Price List</ServiceSecondaryButton>
          </>
        )}
      />

      {message && <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[13px] font-semibold text-blue-700">{message}</div>}

      {showForm && (
        <form onSubmit={(event) => { event.preventDefault(); if (form.guest && form.room) createRequest(); }} className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 text-[14px] font-bold text-slate-950">New Laundry Order</div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input value={form.guest} onChange={(event) => setForm((current) => ({ ...current, guest: event.target.value }))} placeholder="Guest name *" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
          <input value={form.room} onChange={(event) => setForm((current) => ({ ...current, room: event.target.value }))} placeholder="Room *" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
          <input value={form.itemName} onChange={(event) => setForm((current) => ({ ...current, itemName: event.target.value }))} placeholder="Item name" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
          <select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))} className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500">
            {['Wash & Fold', 'Ironing', 'Dry Cleaning', 'Express Service'].map((type) => <option key={type}>{type}</option>)}
          </select>
          <input value={form.items} onChange={(event) => setForm((current) => ({ ...current, items: event.target.value }))} type="number" min="1" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
          <input value={form.pickup} onChange={(event) => setForm((current) => ({ ...current, pickup: event.target.value }))} placeholder="Pickup time" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
          <input value={form.delivery} onChange={(event) => setForm((current) => ({ ...current, delivery: event.target.value }))} placeholder="Expected delivery" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
          <input value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} type="number" min="0" placeholder="Amount" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
          <input value={form.instructions} onChange={(event) => setForm((current) => ({ ...current, instructions: event.target.value }))} placeholder="Special instructions" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500 md:col-span-2" />
          <ServicePrimaryButton type="submit">Create Order</ServicePrimaryButton>
          </div>
        </form>
      )}

      <section className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-5">
        <ServiceStatCard label="Total Requests" value={requests.length} />
        <ServiceStatCard label="In Process" value={requests.filter((item) => item.status === 'In Process').length} />
        <ServiceStatCard label="Ready for Delivery" value={requests.filter((item) => item.status === 'Ready').length} />
        <ServiceStatCard label="Delivered Today" value={requests.filter((item) => item.status === 'Delivered').length} />
        <ServiceStatCard label="Pending" value={requests.filter((item) => item.status === 'Pending').length} tone="red" />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <ServiceCard>
          <ServiceTabs tabs={TABS} active={tab} onChange={setTab} />
          <div className="border-b border-slate-100 p-4">
            <ServiceSearch value={search} onChange={setSearch} placeholder="Search laundry request..." />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 text-[12px] text-slate-500">
                  <th className="px-4 py-3 font-semibold">Request ID</th>
                  <th className="px-4 py-3 font-semibold">Guest / Room</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Items</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Request Time</th>
                  <th className="px-4 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {pagination.pageRows.map((request) => (
                  <tr key={request.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-[13px] font-bold text-slate-950">{request.id}</td>
                    <td className="px-4 py-3 text-[13px] font-semibold text-slate-700">{request.guest}<div className="text-[12px] text-slate-500">Room {request.room}</div></td>
                    <td className="px-4 py-3 text-[13px] text-slate-700">{request.type}</td>
                    <td className="px-4 py-3 text-[13px] text-slate-700">{request.items}</td>
                    <td className="px-4 py-3"><ServiceBadge>{request.status}</ServiceBadge></td>
                    <td className="px-4 py-3 text-[13px] text-slate-700">{request.requestTime}</td>
                    <td className="px-4 py-3"><RowAction item={request} onAction={handleRequestAction} /></td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-[13px] text-slate-500">No laundry requests found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-[12px] text-slate-500">
            <PaginationFooter page={pagination.currentPage} pageSize={pageSize} total={rows.length} start={pagination.start} end={pagination.end} totalPages={pagination.totalPages} label="requests" onPageChange={setPage} onPageSizeChange={setPageSize} />
          </div>
        </ServiceCard>

        <ServiceCard className="p-4">
          <h2 className="m-0 text-[16px] font-bold text-slate-950">Laundry Status Overview</h2>
          <div className="mt-4 space-y-4">
            {overview.map(([label, value]) => (
              <div key={label}>
                <div className="mb-1 flex justify-between text-[13px] font-semibold text-slate-700"><span>{label}</span><span>{value}</span></div>
                <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-blue-600" style={{ width: `${Math.min(100, value * 5)}%` }} /></div>
              </div>
            ))}
            {overview.length === 0 && <p className="m-0 text-[13px] text-slate-500">No laundry status data found.</p>}
          </div>
          <button type="button" onClick={() => setMessage('Laundry price list opened.')} className="mt-5 w-full border-0 bg-transparent text-[13px] font-bold text-blue-700">View Price List</button>
        </ServiceCard>
      </section>
    </div>
  );
}
