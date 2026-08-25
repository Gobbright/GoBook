import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Banknote,
  CalendarDays,
  CreditCard,
  Eye,
  Filter,
  Plus,
  Printer,
  ReceiptText,
  Search,
  Trash2,
  Utensils,
} from 'lucide-react';

import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';
import { createModuleRecord, deleteModuleRecord, listModuleRecords, updateModuleRecord } from '../../../../../services/moduleRecordsService.js';
import { paginateRows, PaginationFooter } from './HotelPagination.jsx';

const TABS = ['All Bills', 'Dine-In', 'Room Service', 'Takeaway'];
const PAYMENT_FILTERS = ['All', 'Paid', 'Billed', 'Room Charge', 'UPI', 'Cash', 'Card', 'Pending'];
const ORDER_TYPES = ['All', 'Dine-In', 'Room Service', 'Takeaway'];
const TABLE_ROOM_FILTERS = ['All', 'Table', 'Room'];
const PAYMENT_METHODS = ['Cash', 'Card', 'UPI', 'Room Charge'];

function money(value) {
  return new Intl.NumberFormat('en-IN', {
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: 'currency',
  }).format(Number(value || 0));
}

function itemAmount(item) {
  return Number(item.qty || 0) * Number(item.rate || item.price || 0);
}

function normalizeItems(items) {
  return Array.isArray(items) ? items : [];
}

function normalizeBill(record) {
  const data = record.data || {};
  const items = normalizeItems(data.items);
  const subtotal = Number(data.subtotal || items.reduce((sum, item) => sum + itemAmount(item), 0));
  const tax = Number(data.tax || 0);
  const discount = Number(data.discount || 0);
  const total = Number(data.total || data.amount || Math.max(0, subtotal - discount + tax));
  const rawPayment = String(data.payment || data.paymentMethod || data.paymentStatus || 'Pending');
  return {
    id: record._id,
    rawData: data,
    billNo: data.billNo || data.billNumber || data.orderId || '',
    date: data.date || data.billDate || '',
    time: data.time || data.billTime || '',
    table: data.table || data.tableOrRoom || '',
    guest: data.guest || data.guestName || '',
    room: data.room || data.roomNumber || '',
    steward: data.steward || data.createdBy || '',
    orderType: data.orderType || data.mode || 'Dine-In',
    payment: rawPayment.toUpperCase(),
    items,
    subtotal,
    tax,
    discount,
    total,
    payable: Number(data.payable || total),
    status: String(data.status || (rawPayment.toUpperCase() === 'ROOM CHARGE' ? 'BILLED' : 'PAID')).toUpperCase(),
    source: data.source || 'pos',
    sourceOrderId: data.sourceOrderId || '',
  };
}

function normalizeOrderBill(record) {
  const data = record.data || {};
  const items = normalizeItems(data.items);
  const subtotal = Number(data.amount || items.reduce((sum, item) => sum + itemAmount(item), 0));
  return normalizeBill({
    _id: `order-${record._id}`,
    data: {
      source: 'order',
      sourceOrderId: record._id,
      billNo: data.billNo || data.orderId || data.orderNo || '',
      date: data.date || '',
      time: data.time || '',
      table: data.table || data.tableOrRoom || '',
      guest: data.guest || data.guestName || '',
      room: data.room || data.roomNumber || '',
      orderType: data.orderType || 'Dine-In',
      payment: data.room || data.roomNumber ? 'ROOM CHARGE' : 'PENDING',
      items,
      subtotal,
      tax: data.tax || 0,
      discount: data.discount || 0,
      total: data.total || subtotal,
      status: data.status || 'SERVED',
    },
  });
}

function Badge({ label, type = 'neutral' }) {
  const tones = {
    dine: 'bg-green-100 text-green-700',
    room: 'bg-purple-100 text-purple-700',
    takeaway: 'bg-orange-100 text-orange-700',
    paid: 'bg-green-100 text-green-700',
    billed: 'bg-emerald-100 text-emerald-700',
    upi: 'bg-blue-100 text-blue-700',
    cash: 'bg-teal-100 text-teal-700',
    card: 'bg-amber-100 text-amber-700',
    neutral: 'bg-slate-100 text-slate-700',
  };
  return <span className={`inline-flex rounded px-2 py-1 text-[11px] font-bold ${tones[type] || tones.neutral}`}>{label}</span>;
}

function typeTone(type) {
  if (type === 'Dine-In') return 'dine';
  if (type === 'Room Service') return 'room';
  if (type === 'Takeaway') return 'takeaway';
  return 'neutral';
}

function paymentTone(payment) {
  if (payment === 'ROOM CHARGE') return 'room';
  if (payment === 'UPI') return 'upi';
  if (payment === 'CASH') return 'cash';
  if (payment === 'CARD') return 'card';
  return 'neutral';
}

function statusTone(status) {
  if (status === 'PAID') return 'paid';
  if (status === 'BILLED') return 'billed';
  return 'neutral';
}

function Metric({ icon: Icon, label, value, detail, tone = 'blue' }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };
  return (
    <div className="flex min-h-[92px] items-center gap-4 border-r border-slate-200 px-5 last:border-r-0">
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${colors[tone] || colors.blue}`}>
        <Icon size={20} />
      </span>
      <div className="min-w-0">
        <div className="text-[12px] font-semibold text-slate-500">{label}</div>
        <div className="mt-1 text-[22px] font-bold leading-none text-slate-950">{value}</div>
        {detail && <div className="mt-2 text-[11px] font-medium text-slate-600">{detail}</div>}
      </div>
    </div>
  );
}

function PaymentMiniCard({ icon: Icon, label, value, detail, tone }) {
  const colors = {
    orange: 'bg-orange-50 text-orange-600',
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${colors[tone] || colors.blue}`}>
        <Icon size={18} />
      </span>
      <div>
        <div className="text-[11px] font-medium text-slate-500">{label}</div>
        <div className="text-[15px] font-bold text-slate-950">{value}</div>
        <div className="text-[11px] text-slate-500">{detail}</div>
      </div>
    </div>
  );
}

export function RestaurantBillingPage() {
  const navigate = useNavigate();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('All Bills');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [tableRoomFilter, setTableRoomFilter] = useState('All');
  const [selectedId, setSelectedId] = useState('');
  const [message, setMessage] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const today = new Date().toLocaleDateString('en-IN');

  useEffect(() => {
    let active = true;
    Promise.all([
      listModuleRecords('hotel/restaurant-pos/billing').catch(() => ({ records: [] })),
      listModuleRecords('hotel/restaurant-pos/orders').catch(() => ({ records: [] })),
    ]).then(([billRes, orderRes]) => {
      if (!active) return;
      const posBills = (billRes.records || []).map(normalizeBill);
      const existingOrderIds = new Set(posBills.map((bill) => bill.sourceOrderId).filter(Boolean));
      const orderBills = (orderRes.records || [])
        .filter((record) => !existingOrderIds.has(record._id))
        .map(normalizeOrderBill)
        .filter((bill) => bill.items.length > 0);
      const merged = [...posBills, ...orderBills];
      if (merged.length) {
        setBills(merged);
        setSelectedId(merged[0].id);
      }
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const filteredBills = useMemo(() => {
    const query = search.trim().toLowerCase();
    return bills.filter((bill) => {
      const matchesSearch = !query || [bill.billNo, bill.table, bill.guest, bill.room].some((value) => String(value).toLowerCase().includes(query));
      const tabType = activeTab === 'All Bills' || bill.orderType === activeTab;
      const matchesPayment = paymentFilter === 'All' || bill.payment === paymentFilter.toUpperCase() || bill.status === paymentFilter.toUpperCase();
      const matchesType = typeFilter === 'All' || bill.orderType === typeFilter;
      const matchesTableRoom = tableRoomFilter === 'All' || (tableRoomFilter === 'Room' ? bill.room : bill.table && !String(bill.table).toLowerCase().includes('room'));
      return matchesSearch && tabType && matchesPayment && matchesType && matchesTableRoom;
    });
  }, [activeTab, bills, paymentFilter, search, tableRoomFilter, typeFilter]);

  const selectedBill = bills.find((bill) => bill.id === selectedId) || filteredBills[0] || null;
  const pagination = paginateRows(filteredBills, page, pageSize);

  const metrics = useMemo(() => {
    const totalSales = bills.reduce((sum, bill) => sum + Number(bill.total || 0), 0);
    const paidAmount = bills.filter((bill) => bill.status === 'PAID').reduce((sum, bill) => sum + Number(bill.total || 0), 0);
    const roomCharges = bills.filter((bill) => bill.payment === 'ROOM CHARGE').reduce((sum, bill) => sum + Number(bill.total || 0), 0);
    const average = bills.length ? totalSales / bills.length : 0;
    const dineIn = bills.filter((bill) => bill.orderType === 'Dine-In').length;
    const roomService = bills.filter((bill) => bill.orderType === 'Room Service').length;
    const takeaway = bills.filter((bill) => bill.orderType === 'Takeaway').length;
    return { totalSales, paidAmount, roomCharges, average, dineIn, roomService, takeaway };
  }, [bills]);

  async function persistBill(bill, payment = bill.payment === 'ROOM CHARGE' ? 'Room Charge' : 'Cash') {
    if (!bill) return;
    const status = payment === 'Room Charge' ? 'BILLED' : 'PAID';
    const payload = {
      ...bill.rawData,
      source: bill.source === 'order' ? 'restaurant-billing' : bill.source,
      sourceOrderId: bill.sourceOrderId,
      billNo: bill.billNo || `RES-${String(bills.length + 1050).padStart(4, '0')}`,
      table: bill.table,
      guest: bill.guest,
      room: bill.room,
      steward: bill.steward,
      orderType: bill.orderType,
      items: bill.items,
      subtotal: bill.subtotal,
      tax: bill.tax,
      discount: bill.discount,
      total: bill.total,
      payable: bill.payable,
      amount: bill.total,
      paymentMethod: payment,
      payment: payment.toUpperCase(),
      status,
    };
    try {
      if (bill.source === 'order' || String(bill.id).startsWith('order-')) {
        const saved = await createModuleRecord('hotel/restaurant-pos/billing', payload);
        const normalized = normalizeBill(saved.record || { _id: bill.id.replace(/^order-/, 'bill-'), data: payload });
        setBills((current) => current.map((item) => (item.id === bill.id ? normalized : item)));
        setSelectedId(normalized.id);
      } else {
        await updateModuleRecord(bill.id, payload);
        setBills((current) => current.map((item) => (item.id === bill.id ? normalizeBill({ _id: bill.id, data: payload }) : item)));
      }
      setMessage(payment === 'Room Charge' ? `${payload.billNo} charged to guest folio.` : `${payload.billNo} marked paid by ${payment}.`);
    } catch (err) {
      setMessage(err.message || 'Unable to update restaurant bill');
    }
  }

  async function deleteBill(bill) {
    if (!bill) return;
    const ok = window.confirm(`Delete bill ${bill.billNo || bill.id}?`);
    if (!ok) return;
    try {
      if (bill.source !== 'order' && !String(bill.id).startsWith('order-')) await deleteModuleRecord(bill.id);
      setBills((current) => current.filter((item) => item.id !== bill.id));
      if (selectedId === bill.id) setSelectedId('');
      setMessage(`${bill.billNo || bill.id} deleted.`);
    } catch (err) {
      setMessage(err.message || 'Unable to delete restaurant bill.');
    }
  }

  return (
    <div className="min-h-full bg-slate-50 px-5 py-5 text-slate-900 md:px-8">
      <section className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="m-0 text-[26px] font-bold text-slate-950">Restaurant Bills</h1>
            <span className="text-slate-400">/</span>
            <span className="text-[14px] font-medium text-slate-600">Restaurant & POS</span>
            <span className="text-slate-400">/</span>
            <span className="text-[14px] font-medium text-slate-600">Restaurant Bills</span>
          </div>
          <div className="mt-4 flex gap-6 border-b border-slate-200 text-[13px] font-semibold">
            {TABS.map((tab) => (
              <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`border-b-2 pb-3 ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-blue-600'}`}>
                {tab}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate('/hotel/restaurant-pos/billing')} className="inline-flex h-10 items-center gap-2 rounded bg-blue-600 px-4 text-[13px] font-semibold text-white hover:bg-blue-700">
            <Plus size={15} />
            Create POS Bill
          </button>
          <button type="button" onClick={() => setMessage('Restaurant bill list sent to printer.')} className="grid h-10 w-10 place-items-center rounded border border-slate-200 bg-white text-slate-600 hover:border-blue-300" aria-label="Print bills">
            <Printer size={16} />
          </button>
        </div>
      </section>

      {message && <p className="mb-4 rounded border border-blue-100 bg-blue-50 px-3 py-2 text-[13px] text-blue-700">{message}</p>}

      <section className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[230px_170px_180px_180px_minmax(260px,1fr)_88px_42px]">
          <div>
            <label className="mb-1 block text-[12px] font-semibold text-slate-600">Date Range</label>
            <div className="relative">
              <input value={today} readOnly className="h-10 w-full rounded border border-slate-200 px-3 pr-9 text-[13px] font-medium text-slate-800" />
              <CalendarDays size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-semibold text-slate-600">Bill Type</label>
            <SelectDropdown value={typeFilter} onChange={setTypeFilter} options={ORDER_TYPES} />
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-semibold text-slate-600">Payment Status</label>
            <SelectDropdown value={paymentFilter} onChange={setPaymentFilter} options={PAYMENT_FILTERS} />
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-semibold text-slate-600">Table / Room</label>
            <SelectDropdown value={tableRoomFilter} onChange={setTableRoomFilter} options={TABLE_ROOM_FILTERS} />
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-semibold text-slate-600">Search</label>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search Bill No., Guest, Room..." className="h-10 w-full rounded border border-slate-200 pl-9 pr-3 text-[13px] outline-none focus:border-blue-500" />
            </div>
          </div>
          <button type="button" onClick={() => setMessage(`${filteredBills.length} restaurant bill(s) match the selected filters.`)} className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded border border-blue-500 bg-white text-[13px] font-semibold text-blue-600 hover:bg-blue-50">
            <Filter size={15} />
            Filter
          </button>
          <button type="button" onClick={() => setMessage('Restaurant bill list sent to printer.')} className="mt-5 grid h-10 w-10 place-items-center rounded border border-slate-200 bg-white text-slate-600 hover:border-blue-300">
            <Printer size={15} />
          </button>
        </div>
      </section>

      <section className="mb-4 grid rounded-lg border border-slate-200 bg-white shadow-sm xl:grid-cols-5">
        <Metric icon={ReceiptText} label="Total Bills" value={bills.length} detail={`Dine-In: ${metrics.dineIn} | Room Service: ${metrics.roomService} | Takeaway: ${metrics.takeaway}`} />
        <Metric icon={Banknote} label="Total Sales" value={money(metrics.totalSales)} tone="green" />
        <Metric icon={CreditCard} label="Paid Amount" value={money(metrics.paidAmount)} tone="green" />
        <Metric icon={Utensils} label="Room Charges" value={money(metrics.roomCharges)} detail={`${metrics.totalSales ? ((metrics.roomCharges / metrics.totalSales) * 100).toFixed(2) : '0.00'}% of Total Sales`} tone="purple" />
        <Metric icon={ReceiptText} label="Average Bill Value" value={money(metrics.average)} tone="orange" />
      </section>

      <section className="grid items-start gap-4 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="m-0 text-[15px] font-bold text-slate-950">Bills List</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left text-[13px]">
              <thead className="bg-slate-50 text-[12px] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Bill No.</th>
                  <th className="px-4 py-3">Date & Time</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Table / Room</th>
                  <th className="px-4 py-3">Guest</th>
                  <th className="px-4 py-3 text-center">Items</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} className="px-4 py-10 text-center text-slate-500">Loading restaurant bills...</td></tr>
                ) : filteredBills.length === 0 ? (
                  <tr><td colSpan={10} className="px-4 py-10 text-center text-slate-500">No restaurant bills found.</td></tr>
                ) : pagination.pageRows.map((bill) => (
                  <tr key={bill.id} onClick={() => setSelectedId(bill.id)} className={`cursor-pointer border-t border-slate-100 hover:bg-slate-50 ${selectedBill?.id === bill.id ? 'bg-blue-50/50' : ''}`}>
                    <td className="px-4 py-3 font-bold text-slate-900">{bill.billNo || '-'}</td>
                    <td className="px-4 py-3 text-slate-700"><div>{bill.date}</div><div className="text-[11px] text-slate-500">{bill.time}</div></td>
                    <td className="px-4 py-3"><Badge label={bill.orderType} type={typeTone(bill.orderType)} /></td>
                    <td className="px-4 py-3 font-medium text-slate-800">{bill.table || (bill.room ? `Room ${bill.room}` : '-')}</td>
                    <td className="px-4 py-3 text-slate-700">{bill.guest}{bill.room ? <span className="block text-[11px] text-slate-500">Room {bill.room}</span> : null}</td>
                    <td className="px-4 py-3 text-center">{bill.items.length}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-950">{money(bill.total)}</td>
                    <td className="px-4 py-3"><Badge label={bill.payment} type={paymentTone(bill.payment)} /></td>
                    <td className="px-4 py-3"><Badge label={bill.status} type={statusTone(bill.status)} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-3 text-slate-600">
                        <button type="button" onClick={(event) => { event.stopPropagation(); setSelectedId(bill.id); setMessage(`${bill.billNo || bill.id} opened in bill details.`); }} aria-label={`View ${bill.billNo || bill.id}`}><Eye size={15} /></button>
                        <button type="button" onClick={(event) => { event.stopPropagation(); setMessage(`${bill.billNo || bill.id} sent to printer.`); }} aria-label={`Print ${bill.billNo || bill.id}`}><Printer size={15} /></button>
                        <button type="button" onClick={(event) => { event.stopPropagation(); persistBill(bill, 'Room Charge'); }} aria-label={`Charge ${bill.billNo || bill.id} to room`}><CreditCard size={15} /></button>
                        <button type="button" onClick={(event) => { event.stopPropagation(); deleteBill(bill); }} aria-label={`Delete ${bill.billNo || bill.id}`} className="text-red-600"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-[12px] text-slate-500">
            <PaginationFooter page={pagination.currentPage} pageSize={pageSize} total={filteredBills.length} start={pagination.start} end={pagination.end} totalPages={pagination.totalPages} onPageChange={setPage} onPageSizeChange={setPageSize} />
          </div>

          <div className="border-t border-slate-100 p-4">
            <h2 className="m-0 mb-3 text-[15px] font-bold text-slate-950">Payment Summary (Today)</h2>
            <div className="grid gap-3 lg:grid-cols-5">
              <PaymentMiniCard icon={Banknote} label="Cash" value={money(0)} detail="0 Bills" tone="orange" />
              <PaymentMiniCard icon={CreditCard} label="Card" value={money(0)} detail="0 Bills" tone="orange" />
              <PaymentMiniCard icon={Banknote} label="UPI" value={money(0)} detail="0 Bills" tone="green" />
              <PaymentMiniCard icon={ReceiptText} label="Room Charge" value={money(metrics.roomCharges)} detail={`${metrics.roomService} Bills`} tone="blue" />
              <PaymentMiniCard icon={ReceiptText} label="Total" value={money(metrics.totalSales)} detail={`${bills.length} Bills`} tone="purple" />
            </div>
          </div>
        </div>

        <aside className="sticky top-4 rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="m-0 text-[15px] font-bold text-slate-950">Bill Details</h2>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setMessage(`${selectedBill?.billNo || 'Bill'} sent to printer.`)} className="grid h-8 w-8 place-items-center rounded border border-slate-200 bg-white text-slate-600"><Printer size={14} /></button>
              <button type="button" onClick={() => setSelectedId('')} className="grid h-8 w-8 place-items-center rounded border border-slate-200 bg-white text-slate-600">x</button>
            </div>
          </div>

          {!selectedBill ? (
            <p className="m-0 p-5 text-[13px] text-slate-500">Select a bill to view details.</p>
          ) : (
            <>
              <div className="p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[12px] text-slate-500">Bill No.</div>
                    <div className="text-[20px] font-bold text-slate-950">{selectedBill.billNo || '-'}</div>
                  </div>
                  <Badge label={selectedBill.status} type={statusTone(selectedBill.status)} />
                </div>

                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-[13px]">
                  <span className="text-slate-500">Type</span><strong>{selectedBill.orderType}</strong>
                  <span className="text-slate-500">Date & Time</span><strong>{selectedBill.date}, {selectedBill.time}</strong>
                  <span className="text-slate-500">Table</span><strong>{selectedBill.table || '-'}</strong>
                  <span className="text-slate-500">Guest</span><strong>{selectedBill.guest}{selectedBill.room ? ` (Room ${selectedBill.room})` : ''}</strong>
                  <span className="text-slate-500">Steward</span><strong>{selectedBill.steward}</strong>
                  <span className="text-slate-500">Payment Mode</span><strong>{selectedBill.payment === 'ROOM CHARGE' ? 'Room Charge' : selectedBill.payment}</strong>
                </div>

                <div className="my-4 border-t border-slate-200" />
                <h3 className="m-0 mb-3 text-[13px] font-bold text-slate-950">Items</h3>
                <div className="grid grid-cols-[minmax(0,1fr)_45px_70px_80px] gap-2 bg-slate-50 px-2 py-2 text-[11px] font-semibold text-slate-500">
                  <span>Item</span><span className="text-right">Qty</span><span className="text-right">Rate</span><span className="text-right">Amount</span>
                </div>
                <div className="space-y-2 py-2">
                  {selectedBill.items.map((item, index) => (
                    <div key={`${item.itemName}-${index}`} className="grid grid-cols-[minmax(0,1fr)_45px_70px_80px] gap-2 text-[12px]">
                      <span className="font-medium text-slate-800">{item.itemName}</span>
                      <span className="text-right">{item.qty}</span>
                      <span className="text-right">{Number(item.rate || item.price || 0).toFixed(2)}</span>
                      <span className="text-right">{itemAmount(item).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="my-4 border-t border-slate-200" />
                <div className="space-y-2 text-[13px]">
                  <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><strong>{money(selectedBill.subtotal)}</strong></div>
                  <div className="flex justify-between"><span className="text-slate-500">CGST (2.5%)</span><strong>{money(selectedBill.tax / 2)}</strong></div>
                  <div className="flex justify-between"><span className="text-slate-500">SGST (2.5%)</span><strong>{money(selectedBill.tax / 2)}</strong></div>
                  <div className="border-t border-slate-100 pt-3 flex justify-between"><span className="font-bold text-slate-950">Grand Total</span><strong className="text-blue-600">{money(selectedBill.total + selectedBill.discount)}</strong></div>
                  <div className="flex justify-between"><span className="text-slate-500">Rounded Off</span><strong>{money((selectedBill.payable || selectedBill.total) - selectedBill.total)}</strong></div>
                  <div className="rounded bg-green-50 px-3 py-3 flex justify-between text-[15px] font-bold text-green-700"><span>Total Payable</span><span>{money(selectedBill.payable || selectedBill.total)}</span></div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 border-t border-slate-100 p-4">
                <button type="button" onClick={() => setMessage(`${selectedBill.billNo} sent to printer.`)} className="h-10 rounded border border-blue-200 bg-white px-3 text-[12px] font-bold text-blue-700 hover:bg-blue-50">Reprint Bill</button>
                <button type="button" onClick={() => navigate('/hotel/restaurant-pos/orders')} className="h-10 rounded border border-blue-200 bg-white px-3 text-[12px] font-bold text-blue-700 hover:bg-blue-50">View Order</button>
                <button type="button" onClick={() => persistBill(selectedBill, 'Room Charge')} className="h-10 rounded bg-blue-600 px-3 text-[12px] font-bold text-white hover:bg-blue-700">
                  Charge to Room
                </button>
              </div>
            </>
          )}
        </aside>
      </section>
    </div>
  );
}
