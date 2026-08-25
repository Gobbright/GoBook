import { useEffect, useMemo, useState } from 'react';
import { BookOpen, UtensilsCrossed } from 'lucide-react';

import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';
import { createModuleRecord, deleteModuleRecord, listModuleRecords } from '../../../../../services/moduleRecordsService.js';
import {
  AddIcon,
  money,
  popularRoomItems,
  roomServiceOrders,
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

const TABS = ['All Orders', 'In Progress', 'Delivered', 'Pending'];

function normalizeGuest(record, index) {
  const data = record.data || {};
  return {
    id: record._id || data.stayId || `guest-${index}`,
    guest: data.guestName || data.name || 'Guest',
    room: data.roomNumber || data.room || '',
    stayId: data.stayId || data.reservationId || record._id || '',
  };
}

function normalizeMenuItem(record, index) {
  const data = record.data || {};
  return {
    id: record._id || data.code || `item-${index}`,
    name: data.name || data.itemName || 'Menu item',
    price: Number(data.price || data.rate || 0),
    channels: Array.isArray(data.channels) ? data.channels : String(data.channels || 'Room Service').split(',').map((item) => item.trim()).filter(Boolean),
    status: data.status || 'Active',
  };
}

function normalizeOrder(record, index) {
  const data = record.data || {};
  return {
    recordId: record._id,
    id: data.orderId || data.id || `RS-${index + 1}`,
    guest: data.guestName || data.guest || '',
    room: data.roomNumber || data.room || '',
    stayId: data.stayId || '',
    item: data.menuItem || data.item || data.itemName || '',
    items: Number(data.quantity || data.items || 1),
    amount: Number(data.amount || data.total || 0),
    instructions: data.instructions || data.specialInstructions || '',
    priority: data.priority || 'Normal',
    payment: data.payment || data.billingMode || 'Charge to Room',
    status: data.status || 'Pending',
    orderTime: data.orderTime || 'Just now',
  };
}

export function RoomServicePage() {
  const [tab, setTab] = useState('All Orders');
  const [search, setSearch] = useState('');
  const [orders, setOrders] = useState(roomServiceOrders);
  const [guests, setGuests] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ guestId: '', guest: '', room: '', stayId: '', menuItem: '', quantity: '1', amount: '', instructions: '', priority: 'Normal', payment: 'Charge to Room' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  function loadData() {
    Promise.all([
      listModuleRecords('hotel/front-desk/in-house-guests').catch(() => ({ records: [] })),
      listModuleRecords('hotel/restaurant-pos/menu').catch(() => ({ records: [] })),
      listModuleRecords('hotel/services/room-service').catch(() => ({ records: [] })),
    ]).then(([guestRes, menuRes, orderRes]) => {
      const guestRows = (guestRes.records || []).map(normalizeGuest).filter((guest) => guest.room);
      const menuRows = (menuRes.records || [])
        .map(normalizeMenuItem)
        .filter((item) => item.name && item.price > 0 && item.status !== 'Inactive' && item.channels.includes('Room Service'));
      const orderRows = (orderRes.records || []).map(normalizeOrder);
      setGuests(guestRows);
      setMenuItems(menuRows);
      setOrders(orderRows);
      if (guestRows[0] && !form.guestId) {
        setForm((current) => ({ ...current, guestId: guestRows[0].id, guest: guestRows[0].guest, room: guestRows[0].room, stayId: guestRows[0].stayId }));
      }
    });
  }

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orders.filter((order) => {
      const tabMatch = tab === 'All Orders' || order.status === tab;
      const searchMatch = !query || [order.id, order.guest, order.room, order.item].some((value) => String(value).toLowerCase().includes(query));
      return tabMatch && searchMatch;
    });
  }, [orders, search, tab]);

  const pagination = paginateRows(rows, page, pageSize);

  function selectGuest(guestId) {
    const guest = guests.find((item) => item.id === guestId);
    setForm((current) => ({
      ...current,
      guestId,
      guest: guest?.guest || '',
      room: guest?.room || '',
      stayId: guest?.stayId || '',
      payment: guest ? 'Charge to Room' : current.payment,
    }));
  }

  function selectMenuItem(itemName) {
    const item = menuItems.find((entry) => entry.name === itemName);
    const quantity = Number(form.quantity || 1);
    setForm((current) => ({ ...current, menuItem: itemName, amount: item ? String(item.price * quantity) : current.amount }));
  }

  function updateQuantity(quantity) {
    const item = menuItems.find((entry) => entry.name === form.menuItem);
    setForm((current) => ({ ...current, quantity, amount: item ? String(item.price * Number(quantity || 1)) : current.amount }));
  }

  async function createOrder() {
    const orderId = `RS-${Date.now().toString().slice(-4)}`;
    const next = {
      orderId,
      guestName: form.guest,
      guest: form.guest,
      roomNumber: form.room,
      room: form.room,
      stayId: form.stayId,
      menuItem: form.menuItem,
      item: form.menuItem,
      quantity: Number(form.quantity),
      items: Number(form.quantity),
      amount: Number(form.amount),
      total: Number(form.amount),
      instructions: form.instructions,
      priority: form.priority,
      payment: form.payment,
      billingMode: form.payment,
      status: 'Pending',
      orderTime: 'Just now',
      date: new Date().toISOString().slice(0, 10),
    };
    try {
      const saved = await createModuleRecord('hotel/services/room-service', next);
      setOrders((current) => [{ ...normalizeOrder(saved.record || { _id: saved._id, data: next }), recordId: saved.record?._id || saved._id }, ...current]);
      setForm((current) => ({ ...current, menuItem: '', quantity: '1', amount: '', instructions: '', priority: 'Normal', payment: 'Charge to Room' }));
      setShowForm(false);
      setTab('All Orders');
      setMessage(`${orderId} created for Room ${next.roomNumber}. It will appear in checkout folio and reports.`);
    } catch (err) {
      setMessage(err.message || 'Unable to save room service order.');
    }
  }

  async function createTestOrder() {
    const guest = guests[0];
    const item = menuItems[0] || { name: 'Tea', price: 50 };
    if (!guest) {
      setMessage('No checked-in guest found. Complete check-in first, then create a room service test order.');
      return;
    }
    setForm({ guestId: guest.id, guest: guest.guest, room: guest.room, stayId: guest.stayId, menuItem: item.name, quantity: '1', amount: String(item.price), instructions: 'Test order', priority: 'Normal', payment: 'Charge to Room' });
    setShowForm(true);
    setMessage(`Test data filled for ${guest.guest} - Room ${guest.room}. Click Send to Kitchen to save it.`);
  }

  async function handleOrderAction(action, order) {
    if (!order) return;
    if (action === 'View') {
      setMessage(`${order.id}: ${order.item || 'Room service'}, Room ${order.room}, ${money(order.amount)}.`);
      return;
    }
    if (action === 'Edit') {
      setForm({ guestId: '', guest: order.guest || '', room: order.room || '', stayId: order.stayId || '', menuItem: order.item || '', quantity: String(order.items || 1), amount: String(order.amount || ''), instructions: order.instructions || '', priority: order.priority || 'Normal', payment: order.payment || 'Charge to Room' });
      setShowForm(true);
      setMessage(`Editing ${order.id}.`);
      return;
    }
    if (action === 'Delete') {
      const ok = window.confirm(`Delete room service order ${order.id}?`);
      if (!ok) return;
      try {
        if (order.recordId) await deleteModuleRecord(order.recordId);
        setOrders((current) => current.filter((item) => item.id !== order.id));
        setMessage(`${order.id} deleted.`);
      } catch (err) {
        setMessage(err.message || 'Unable to delete room service order.');
      }
    }
  }

  const popularItems = menuItems.slice(0, 5).map((item) => ({ name: item.name, price: item.price }));

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6">
      <ServicePageHeader
        title="Room Service"
        subtitle="Create room service orders for checked-in guests and charge them to the stay folio."
        actions={(
          <>
            <ServicePrimaryButton onClick={() => setShowForm((value) => !value)}><AddIcon />New Order</ServicePrimaryButton>
            <ServiceSecondaryButton onClick={createTestOrder}>Use Test Data</ServiceSecondaryButton>
            <ServiceSecondaryButton onClick={() => setMessage('Use Restaurant & POS > Menu to add items available for Room Service.')}><BookOpen size={15} />Menu</ServiceSecondaryButton>
          </>
        )}
      />

      {message && <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[13px] font-semibold text-blue-700">{message}</div>}

      {showForm && (
        <form onSubmit={(event) => { event.preventDefault(); if (form.guest && form.room && form.amount) createOrder(); }} className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 text-[14px] font-bold text-slate-950">New Room Service Order</div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            <SelectDropdown value={form.guestId} onChange={selectGuest} options={[{ label: 'Select checked-in guest', value: '' }, ...guests.map((guest) => ({ label: `${guest.guest} - Room ${guest.room}`, value: guest.id }))]} />
            <input value={form.room} readOnly placeholder="Room" className="h-10 rounded-md border border-slate-200 bg-slate-50 px-3 text-[13px] outline-none" />
            <input value={form.stayId} readOnly placeholder="Current stay ID" className="h-10 rounded-md border border-slate-200 bg-slate-50 px-3 text-[13px] outline-none" />
            <SelectDropdown value={form.menuItem} onChange={selectMenuItem} options={[{ label: 'Select menu item', value: '' }, ...menuItems.map((item) => ({ label: `${item.name} - ${money(item.price)}`, value: item.name }))]} />
            <input value={form.quantity} onChange={(event) => updateQuantity(event.target.value)} type="number" min="1" placeholder="Qty" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
            <input value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} type="number" min="1" placeholder="Amount *" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
            <SelectDropdown value={form.priority} onChange={(priority) => setForm((current) => ({ ...current, priority }))} options={['Low', 'Normal', 'High']} />
            <SelectDropdown value={form.payment} onChange={(payment) => setForm((current) => ({ ...current, payment }))} options={['Charge to Room', 'Cash', 'Card', 'UPI']} />
            <input value={form.instructions} onChange={(event) => setForm((current) => ({ ...current, instructions: event.target.value }))} placeholder="Special instructions" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500 md:col-span-2" />
            <ServicePrimaryButton type="submit">Send to Kitchen</ServicePrimaryButton>
          </div>
        </form>
      )}

      <section className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-5">
        <ServiceStatCard label="Total Orders" value={orders.length} />
        <ServiceStatCard label="In Progress" value={orders.filter((item) => item.status === 'In Progress').length} />
        <ServiceStatCard label="Delivered Today" value={orders.filter((item) => item.status === 'Delivered').length} />
        <ServiceStatCard label="Pending" value={orders.filter((item) => item.status === 'Pending').length} tone="red" />
        <ServiceStatCard label="Room Charges" value={orders.filter((item) => item.payment === 'Charge to Room').length} tone="green" />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <ServiceCard>
          <ServiceTabs tabs={TABS} active={tab} onChange={setTab} />
          <div className="border-b border-slate-100 p-4">
            <ServiceSearch value={search} onChange={setSearch} placeholder="Search order, guest, room, or item..." />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 text-[12px] text-slate-500">
                  <th className="px-4 py-3 font-semibold">Order ID</th>
                  <th className="px-4 py-3 font-semibold">Guest / Room</th>
                  <th className="px-4 py-3 font-semibold">Item</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Order Time</th>
                  <th className="px-4 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {pagination.pageRows.map((order) => (
                  <tr key={order.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-[13px] font-bold text-slate-950">{order.id}</td>
                    <td className="px-4 py-3 text-[13px] font-semibold text-slate-700">{order.guest}<div className="text-[12px] text-slate-500">Room {order.room}</div></td>
                    <td className="px-4 py-3 text-[13px] text-slate-700">{order.item || '-'} x {order.items}</td>
                    <td className="px-4 py-3 text-[13px] font-bold text-slate-950">{money(order.amount)}</td>
                    <td className="px-4 py-3"><ServiceBadge>{order.status}</ServiceBadge></td>
                    <td className="px-4 py-3 text-[13px] text-slate-700">{order.orderTime}</td>
                    <td className="px-4 py-3"><RowAction item={order} onAction={handleOrderAction} /></td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-[13px] text-slate-500">No room service orders found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-[12px] text-slate-500">
            <PaginationFooter page={pagination.currentPage} pageSize={pageSize} total={rows.length} start={pagination.start} end={pagination.end} totalPages={pagination.totalPages} label="orders" onPageChange={setPage} onPageSizeChange={setPageSize} />
          </div>
        </ServiceCard>

        <ServiceCard className="p-4">
          <h2 className="m-0 text-[16px] font-bold text-slate-950">Room Service Menu</h2>
          <div className="mt-4 space-y-3">
            {[...popularItems, ...popularRoomItems].slice(0, 5).map((item) => (
              <div key={item.name} className="flex items-center justify-between gap-3 rounded-md bg-slate-50 p-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-orange-50 text-orange-600"><UtensilsCrossed size={18} /></span>
                  <span className="text-[13px] font-semibold text-slate-800">{item.name}</span>
                </div>
                <span className="text-[13px] font-bold text-slate-950">{money(item.price)}</span>
              </div>
            ))}
            {popularItems.length === 0 && popularRoomItems.length === 0 && <p className="m-0 text-[13px] text-slate-500">No room service menu items found. Add items in Restaurant &amp; POS &gt; Menu.</p>}
          </div>
        </ServiceCard>
      </section>
    </div>
  );
}
