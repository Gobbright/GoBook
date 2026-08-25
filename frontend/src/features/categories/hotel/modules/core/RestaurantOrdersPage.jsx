import { useEffect, useMemo, useState } from 'react';
import { Edit2, Eye, Filter, Trash2 } from 'lucide-react';

import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';
import { createModuleRecord, deleteModuleRecord, listModuleRecords } from '../../../../../services/moduleRecordsService.js';
import { paginateRows, PaginationFooter } from './HotelPagination.jsx';
import {
  money,
  PosBadge,
  PosCard,
  PosPageHeader,
  PosSearch,
  PosSecondaryButton,
  restaurantOrders,
} from './RestaurantPosShared.jsx';

const TABS = ['All Orders', 'Dine In', 'Take Away', 'Delivery'];

function normalizeOrder(record, index) {
  const data = record.data || {};
  return {
    recordId: record._id,
    id: data.orderId || data.orderNo || `ORD-${index + 1}`,
    type: data.type || data.orderType || 'Dine In',
    table: data.table || data.tableOrRoom || '-',
    guest: data.guest || data.guestName || 'Walk-in Customer',
    room: data.room || data.roomNumber || '-',
    items: Number(data.itemCount || (Array.isArray(data.items) ? data.items.reduce((sum, item) => sum + Number(item.qty || 1), 0) : data.items) || 0),
    itemLines: Array.isArray(data.items) ? data.items : [],
    amount: Number(data.amount || data.total || 0),
    subtotal: Number(data.subtotal || 0),
    tax: Number(data.tax || 0),
    payment: data.payment || data.paymentMode || '-',
    status: data.status || 'In Progress',
    time: data.time || 'Just now',
  };
}

export function RestaurantOrdersPage() {
  const [activeTab, setActiveTab] = useState('All Orders');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All Status');
  const [orderRows, setOrderRows] = useState(restaurantOrders);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'Dine In', table: 'Table 05', guest: '', items: '1', amount: '' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  useEffect(() => {
    let active = true;
    listModuleRecords('hotel/restaurant-pos/orders')
      .then((res) => {
        if (!active) return;
        const rows = (res.records || []).map(normalizeOrder);
        if (rows.length) {
          setOrderRows(rows);
          setSelectedOrder((current) => rows.find((order) => order.id === current?.id) || rows[0]);
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orderRows.filter((order) => {
      const tabMatch = activeTab === 'All Orders' || order.type === activeTab;
      const statusMatch = status === 'All Status' || order.status === status;
      const searchMatch = !query || [order.id, order.table, order.guest].some((value) => String(value).toLowerCase().includes(query));
      return tabMatch && statusMatch && searchMatch;
    });
  }, [activeTab, orderRows, search, status]);

  const pagination = paginateRows(filteredOrders, page, pageSize);

  async function createOrder() {
    const next = {
      id: `ORD-${1029 + orderRows.length}`,
      type: form.type,
      table: form.table,
      guest: form.guest,
      room: '-',
      items: Number(form.items),
      amount: Number(form.amount),
      status: 'In Progress',
      time: 'Just now',
    };
    try {
      const saved = await createModuleRecord('hotel/restaurant-pos/orders', {
        orderId: next.id,
        type: next.type,
        orderType: next.type,
        table: next.table,
        tableOrRoom: next.table,
        guest: next.guest,
        itemCount: next.items,
        amount: next.amount,
        total: next.amount,
        status: next.status,
        time: next.time,
      });
      setOrderRows((current) => [{ ...next, recordId: saved._id }, ...current]);
      setSelectedOrder({ ...next, recordId: saved._id, itemLines: [], subtotal: next.amount, tax: 0, payment: '-' });
      setForm({ type: 'Dine In', table: 'Table 05', guest: '', items: '1', amount: '' });
      setShowForm(false);
      setMessage(`${next.id} created. Add items or send KOT from order details.`);
    } catch (err) {
      setMessage(err.message || 'Unable to create order');
    }
  }

  async function handleOrderAction(action, order) {
    if (!order) return;
    if (action === 'View') {
      setSelectedOrder(order);
      setMessage(`${order.id} details opened.`);
    }
    if (action === 'Edit') {
      setSelectedOrder(order);
      setForm({ type: order.type || 'Dine In', table: order.table || 'Table 05', guest: order.guest || '', items: String(order.items || 1), amount: String(order.amount || '') });
      setShowForm(true);
      setMessage(`Editing ${order.id}.`);
    }
    if (action === 'Delete') {
      const ok = window.confirm(`Delete restaurant order ${order.id}?`);
      if (!ok) return;
      try {
        if (order.recordId) await deleteModuleRecord(order.recordId);
        setOrderRows((current) => current.filter((item) => item.id !== order.id));
        setSelectedOrder((current) => (current?.id === order.id ? null : current));
        setMessage(`${order.id} deleted.`);
      } catch (err) {
        setMessage(err.message || 'Unable to delete restaurant order.');
      }
    }
  }

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6">
      <PosPageHeader title="Orders" subtitle="View, track, and manage restaurant orders before billing." actions={<button type="button" onClick={() => setShowForm((value) => !value)} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border-0 bg-blue-600 px-4 text-[13px] font-semibold text-white shadow-sm transition hover:bg-blue-700">Create Order</button>} />

      {message && <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[13px] font-semibold text-blue-700">{message}</div>}

      {showForm && (
        <form onSubmit={(event) => { event.preventDefault(); if (form.guest && form.amount) createOrder(); }} className="mb-4 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-[150px_150px_minmax(0,1fr)_100px_130px_auto]">
          <SelectDropdown value={form.type} onChange={(type) => setForm((current) => ({ ...current, type }))} options={['Dine In', 'Take Away', 'Delivery']} />
          <input value={form.table} onChange={(event) => setForm((current) => ({ ...current, table: event.target.value }))} placeholder="Table / Room" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
          <input value={form.guest} onChange={(event) => setForm((current) => ({ ...current, guest: event.target.value }))} placeholder="Guest / customer" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
          <input value={form.items} onChange={(event) => setForm((current) => ({ ...current, items: event.target.value }))} type="number" min="1" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
          <input value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} type="number" min="1" placeholder="Amount" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
          <button type="submit" className="h-10 rounded-md bg-blue-600 px-4 text-[13px] font-semibold text-white">Save</button>
        </form>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
      <PosCard>
        <div className="border-b border-slate-100 px-4 pt-4">
          <div className="flex flex-wrap gap-1 rounded-md bg-slate-100 p-1">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`h-9 rounded px-4 text-[12px] font-semibold transition ${activeTab === tab ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-blue-700'}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 border-b border-slate-100 p-4 lg:grid-cols-[minmax(0,1fr)_150px_150px_110px]">
          <PosSearch value={search} onChange={setSearch} placeholder="Search order ID, table, customer..." />
          <SelectDropdown value="Today" onChange={() => {}} options={['Today', 'This Week', 'This Month']} />
          <SelectDropdown value={status} onChange={setStatus} options={['All Status', 'In Progress', 'Ready', 'On the Way', 'Completed', 'Cancelled']} />
          <PosSecondaryButton>
            <Filter size={15} />
            Filter
          </PosSecondaryButton>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 text-left text-[12px] text-slate-500">
                <th className="px-4 py-3 font-semibold">Order ID</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Table / Customer</th>
                <th className="px-4 py-3 font-semibold">Items</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Time</th>
                <th className="px-4 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {pagination.pageRows.map((order) => (
                <tr key={order.id} className={`border-t border-slate-100 hover:bg-slate-50 ${selectedOrder?.id === order.id ? 'bg-blue-50/60' : ''}`}>
                  <td className="px-4 py-3 text-[13px] font-bold text-slate-950">{order.id}</td>
                  <td className="px-4 py-3"><PosBadge>{order.type}</PosBadge></td>
                  <td className="px-4 py-3 text-[13px] font-semibold text-slate-700">{order.table}</td>
                  <td className="px-4 py-3 text-[13px] text-slate-700">{order.items}</td>
                  <td className="px-4 py-3 text-[13px] font-bold text-slate-950">{money(order.amount)}</td>
                  <td className="px-4 py-3"><PosBadge>{order.status}</PosBadge></td>
                  <td className="px-4 py-3 text-[13px] text-slate-700">{order.time}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button type="button" onClick={() => handleOrderAction('View', order)} aria-label="View order" className="grid h-8 w-8 place-items-center rounded-md border-0 bg-transparent text-blue-700 hover:bg-blue-50"><Eye size={15} /></button>
                      <button type="button" onClick={() => handleOrderAction('Edit', order)} aria-label="Edit order" className="grid h-8 w-8 place-items-center rounded-md border-0 bg-transparent text-blue-700 hover:bg-blue-50"><Edit2 size={15} /></button>
                      <button type="button" onClick={() => handleOrderAction('Delete', order)} aria-label="Delete order" className="grid h-8 w-8 place-items-center rounded-md border-0 bg-transparent text-red-600 hover:bg-red-50"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-[13px] text-slate-500">No restaurant orders found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 text-[12px] text-slate-500 md:flex-row md:items-center md:justify-between">
          <PaginationFooter page={pagination.currentPage} pageSize={pageSize} total={filteredOrders.length} start={pagination.start} end={pagination.end} totalPages={pagination.totalPages} label="orders" onPageChange={setPage} onPageSizeChange={setPageSize} />
        </div>
      </PosCard>
      <PosCard className="p-4">
        <h2 className="m-0 text-[18px] font-bold text-slate-950">Order Details</h2>
        {!selectedOrder ? (
          <p className="m-0 mt-3 text-[13px] text-slate-500">Click the eye button on any order to view details.</p>
        ) : (
          <>
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[18px] font-bold text-slate-950">{selectedOrder.id}</div>
                  <div className="mt-1 text-[13px] font-semibold text-slate-500">{selectedOrder.table}</div>
                </div>
                <PosBadge>{selectedOrder.status}</PosBadge>
              </div>
            </div>
            <div className="mt-4 space-y-3 text-[13px]">
              <div className="flex justify-between gap-3"><span className="text-slate-500">Order Type</span><span className="font-bold text-slate-950">{selectedOrder.type}</span></div>
              <div className="flex justify-between gap-3"><span className="text-slate-500">Guest</span><span className="font-bold text-slate-950">{selectedOrder.guest}</span></div>
              <div className="flex justify-between gap-3"><span className="text-slate-500">Room</span><span className="font-bold text-slate-950">{selectedOrder.room || '-'}</span></div>
              <div className="flex justify-between gap-3"><span className="text-slate-500">Payment</span><span className="font-bold text-slate-950">{selectedOrder.payment}</span></div>
              <div className="flex justify-between gap-3"><span className="text-slate-500">Items</span><span className="font-bold text-slate-950">{selectedOrder.items}</span></div>
              <div className="flex justify-between gap-3"><span className="text-slate-500">Time</span><span className="font-bold text-slate-950">{selectedOrder.time}</span></div>
            </div>
            <div className="mt-4 rounded-lg border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-3 py-2 text-[12px] font-semibold text-slate-500">Ordered Items</div>
              {selectedOrder.itemLines.length ? selectedOrder.itemLines.map((item, index) => (
                <div key={`${item.name || item.itemName}-${index}`} className="flex justify-between gap-3 border-b border-slate-100 px-3 py-2 text-[13px] last:border-b-0">
                  <span className="font-semibold text-slate-800">{item.name || item.itemName || 'Item'} x {item.qty || 1}</span>
                  <span className="font-bold text-slate-950">{money(Number(item.price || item.rate || 0) * Number(item.qty || 1))}</span>
                </div>
              )) : (
                <div className="px-3 py-4 text-[13px] text-slate-500">No item breakdown saved for this order.</div>
              )}
            </div>
            <div className="mt-4 space-y-2 border-t border-slate-200 pt-3 text-[13px]">
              <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="font-bold text-slate-950">{money(selectedOrder.subtotal || selectedOrder.amount)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Tax</span><span className="font-bold text-slate-950">{money(selectedOrder.tax || 0)}</span></div>
              <div className="flex justify-between text-[16px] font-bold text-slate-950"><span>Total</span><span>{money(selectedOrder.amount)}</span></div>
            </div>
            <div className="mt-4 grid gap-2">
              <PosSecondaryButton onClick={() => handleOrderAction('Edit', selectedOrder)}>Edit Order</PosSecondaryButton>
            </div>
          </>
        )}
      </PosCard>
      </div>
    </div>
  );
}
