import { useEffect, useMemo, useState } from 'react';
import { CreditCard, Minus, Plus, ReceiptText, ShoppingBag, Table2, Truck, Users, X } from 'lucide-react';

import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';
import { createModuleRecord, listModuleRecords } from '../../../../../services/moduleRecordsService.js';
import {
  money,
  PosCard,
  PosPageHeader,
  PosPrimaryButton,
  PosSearch,
  PosSecondaryButton,
} from './RestaurantPosShared.jsx';

const MODES = [
  { label: 'Dine In', icon: Table2 },
  { label: 'Take Away', icon: ShoppingBag },
  { label: 'Delivery', icon: Truck },
];

const CATEGORIES = ['All', 'Starters', 'Main Course', 'Beverages', 'Desserts', 'Combo'];
const INITIAL_CART = [];
const PAYMENT_MODES = ['Cash', 'Card', 'UPI', 'Room Charge'];

function normalizeInHouseGuest(record, index) {
  const data = record.data || {};
  return {
    id: record._id || data.stayId || data.reservationId || `guest-${index}`,
    name: data.guestName || data.name || 'Guest',
    room: data.roomNumber || data.room || '',
    stayId: data.stayId || data.reservationId || '',
  };
}

function normalizeMenuItem(record, index) {
  const data = record.data || {};
  return {
    id: record._id || data.id || data.code || `menu-${index}`,
    name: data.name || data.itemName || 'Menu item',
    category: data.category || 'Other',
    price: Number(data.price || data.rate || data.amount || 0),
    status: data.status || 'Active',
    type: data.type || '',
  };
}

export function PosBillingPage() {
  const [mode, setMode] = useState('Dine In');
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState(INITIAL_CART);
  const [items, setItems] = useState([]);
  const [table, setTable] = useState('Table 05');
  const [guestCount, setGuestCount] = useState('2');
  const [inHouseGuests, setInHouseGuests] = useState([]);
  const [selectedGuestId, setSelectedGuestId] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      listModuleRecords('hotel/front-desk/in-house-guests').catch(() => ({ records: [] })),
      listModuleRecords('hotel/restaurant-pos/menu').catch(() => ({ records: [] })),
    ])
      .then(([guestRes, menuRes]) => {
        if (!active) return;
        const rows = (guestRes.records || []).map(normalizeInHouseGuest).filter((guest) => guest.name && guest.room);
        setInHouseGuests(rows);
        setItems((menuRes.records || []).map(normalizeMenuItem).filter((item) => item.name && item.price > 0 && item.status !== 'Inactive'));
      })
      .catch(() => {
        if (active) {
          setInHouseGuests([]);
          setItems([]);
        }
      });
    return () => { active = false; };
  }, []);

  const selectedGuest = inHouseGuests.find((guest) => guest.id === selectedGuestId) || null;
  const tableOptions = useMemo(() => {
    const roomOptions = inHouseGuests.map((guest) => ({
      label: `Room ${guest.room} - ${guest.name}`,
      value: `Room ${guest.room}`,
    }));
    const tableValues = new Set();
    return [
      ...roomOptions.filter((option) => {
        if (tableValues.has(option.value)) return false;
        tableValues.add(option.value);
        return true;
      }),
      { label: 'Table 01', value: 'Table 01' },
      { label: 'Table 02', value: 'Table 02' },
      { label: 'Table 05', value: 'Table 05' },
      { label: 'Takeaway', value: 'Takeaway' },
    ];
  }, [inHouseGuests]);

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      const categoryMatch = category === 'All' || item.category === category;
      const searchMatch = !query || item.name.toLowerCase().includes(query);
      return categoryMatch && searchMatch;
    });
  }, [category, items, search]);

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const discount = cart.length ? 40 : 0;
    const taxable = Math.max(0, subtotal - discount);
    const cgst = taxable * 0.025;
    const sgst = taxable * 0.025;
    const total = taxable + cgst + sgst;
    return { subtotal, discount, cgst, sgst, total: Math.round(total) };
  }, [cart]);

  function addItem(item) {
    setCart((current) => {
      const existing = current.find((cartItem) => cartItem.id === item.id);
      if (existing) {
        return current.map((cartItem) => (cartItem.id === item.id ? { ...cartItem, qty: cartItem.qty + 1 } : cartItem));
      }
      return [...current, { id: item.id, name: item.name, price: item.price, qty: 1 }];
    });
  }

  function updateQty(id, delta) {
    setCart((current) => current
      .map((item) => (item.id === id ? { ...item, qty: Math.max(0, item.qty + delta) } : item))
      .filter((item) => item.qty > 0));
  }

  async function placeOrder() {
    if (!cart.length) return;
    if (paymentMode === 'Room Charge' && !selectedGuest) {
      setMessage('Choose an in-house guest before using Room Charge.');
      return;
    }
    setSaving(true);
    const orderNo = `ORD-${Date.now().toString().slice(-4)}`;
    const orderGuest = selectedGuest?.name || 'Walk-in Customer';
    const orderRoom = selectedGuest?.room || '';
    const payload = {
      orderId: orderNo,
      type: mode,
      orderType: mode,
      table,
      tableOrRoom: orderRoom ? `Room ${orderRoom}` : table,
      guest: orderGuest,
      guestName: orderGuest,
      room: orderRoom,
      roomNumber: orderRoom,
      stayId: selectedGuest?.stayId || '',
      payment: paymentMode,
      paymentMode,
      items: cart.map((item) => ({ itemName: item.name, name: item.name, qty: item.qty, rate: item.price, price: item.price })),
      itemCount: cart.reduce((sum, item) => sum + item.qty, 0),
      amount: totals.total,
      subtotal: totals.subtotal,
      tax: totals.cgst + totals.sgst,
      total: totals.total,
      status: 'In Progress',
      time: 'Just now',
    };
    try {
      await createModuleRecord('hotel/restaurant-pos/orders', payload);
      await createModuleRecord('hotel/restaurant-pos/kot', {
        ...payload,
        kotNo: `KOT-${orderNo.replace(/\D/g, '')}`,
        priority: 'Normal',
        assignTo: 'Kitchen',
        status: 'New',
      });
      if (paymentMode === 'Room Charge') {
        await createModuleRecord('hotel/restaurant-pos/billing', {
          ...payload,
          billNo: `POS-${orderNo.replace(/\D/g, '')}`,
          billDate: new Date().toISOString().slice(0, 10),
          status: 'Room Charge',
          paymentStatus: 'Room Charge',
        });
      }
      setMessage(`Order ${orderNo} placed for ${orderRoom ? `Room ${orderRoom}` : table}. ${paymentMode === 'Room Charge' ? 'Restaurant bill linked to guest folio.' : 'KOT sent to kitchen.'}`);
      setCart([]);
    } catch (err) {
      setMessage(err.message || 'Unable to place order');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6">
      <PosPageHeader
        title="POS / Billing"
        subtitle="Create orders, send food to service, and close bills from one counter screen."
      />

      {message && <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[13px] font-semibold text-blue-700">{message}</div>}

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {MODES.map(({ label, icon: Icon }) => (
              <button
                key={label}
                type="button"
                onClick={() => setMode(label)}
                className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg border px-4 text-[13px] font-semibold transition ${mode === label ? 'border-blue-600 bg-blue-600 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700'}`}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>

          <PosCard className="p-4">
            <div className="mb-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <div className="text-[11px] font-semibold text-slate-500">Guest / Room Link</div>
                <div className="mt-1 truncate text-[13px] font-bold text-slate-950">{selectedGuest ? `${selectedGuest.name} - Room ${selectedGuest.room}` : 'Walk-in customer'}</div>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500"><CreditCard size={13} />Payment</div>
                <div className="mt-1 text-[13px] font-bold text-slate-950">{paymentMode}</div>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <div className="text-[11px] font-semibold text-slate-500">Order Items</div>
                <div className="mt-1 text-[13px] font-bold text-slate-950">{cart.reduce((sum, item) => sum + item.qty, 0)} item(s)</div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-[150px_100px_190px_130px_minmax(0,1fr)]">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-slate-500">Table / Room</span>
                <SelectDropdown
                  value={table}
                  onChange={(value) => {
                    setTable(value);
                    const roomNo = String(value).replace(/^Room\s+/i, '');
                    const guest = inHouseGuests.find((item) => String(item.room) === roomNo);
                    if (guest) {
                      setSelectedGuestId(guest.id);
                      setPaymentMode('Room Charge');
                    } else if (!String(value).startsWith('Room ')) {
                      setSelectedGuestId('');
                      setPaymentMode((current) => (current === 'Room Charge' ? 'Cash' : current));
                    }
                  }}
                  options={tableOptions}
                />
              </label>
              <div>
                <span className="mb-1 block text-[11px] font-semibold text-slate-500">Guests</span>
                <div className="flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-700">
                  <Users size={15} className="text-slate-400" />
                  <input value={guestCount} onChange={(event) => setGuestCount(event.target.value)} className="w-full border-0 bg-transparent p-0 text-[13px] font-semibold outline-none" />
                </div>
              </div>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-slate-500">Guest Name</span>
                <SelectDropdown
                  value={selectedGuestId}
                  onChange={(value) => {
                    const guest = inHouseGuests.find((item) => item.id === value);
                    setSelectedGuestId(value);
                    if (guest) {
                      setPaymentMode('Room Charge');
                      setTable(`Room ${guest.room}`);
                    }
                  }}
                  options={[{ label: 'Walk-in Customer', value: '' }, ...inHouseGuests.map((guest) => ({ label: `${guest.name} - Room ${guest.room}`, value: guest.id }))]}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-slate-500">Payment Mode</span>
                <SelectDropdown value={paymentMode} onChange={setPaymentMode} options={PAYMENT_MODES} />
              </label>
              <PosSearch value={search} onChange={setSearch} placeholder="Search menu item..." />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 rounded-md bg-slate-100 p-1 sm:grid-cols-3 lg:grid-cols-6">
              {CATEGORIES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={`h-9 rounded px-4 text-[12px] font-semibold transition ${category === item ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-blue-700'}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </PosCard>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
            {visibleItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => addItem(item)}
                className="group rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md"
              >
                <div className="flex items-start justify-end">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-blue-50 text-blue-700"><Plus size={14} /></span>
                </div>
                <div className="mt-1 min-h-10 text-[13px] font-bold text-slate-950">{item.name}</div>
                <div className="mt-1 text-[12px] font-semibold text-slate-500">{item.category}</div>
                <div className="mt-3 text-[13px] font-bold text-slate-950">{money(item.price)}</div>
              </button>
            ))}
            {visibleItems.length === 0 && (
              <div className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-[13px] text-slate-500 sm:col-span-2 2xl:col-span-4">
                No active menu items found. Add food items in Restaurant &amp; POS &gt; Menu, then return here to bill them.
              </div>
            )}
          </div>
        </div>

        <PosCard className="flex flex-col self-start">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="m-0 flex items-center gap-2 text-[16px] font-bold text-slate-950">
              <ReceiptText size={18} className="text-blue-600" />
              Current Order
            </h2>
            <button type="button" onClick={() => setCart([])} className="border-0 bg-transparent text-[12px] font-semibold text-red-600">Clear Cart</button>
          </div>

          <div className="space-y-3 p-4">
            {cart.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-[13px] text-slate-500">Add items from the menu to start an order.</div>
            ) : cart.map((item) => (
              <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_88px_72px_24px] items-center gap-2">
                <div className="min-w-0 text-[13px] font-semibold text-slate-950">{item.name}</div>
                <div className="flex h-8 items-center rounded-md border border-slate-200">
                  <button type="button" onClick={() => updateQty(item.id, -1)} className="grid h-8 w-7 place-items-center border-0 bg-transparent text-slate-500"><Minus size={13} /></button>
                  <span className="w-8 text-center text-[13px] font-bold text-slate-900">{item.qty}</span>
                  <button type="button" onClick={() => updateQty(item.id, 1)} className="grid h-8 w-7 place-items-center border-0 bg-transparent text-slate-500"><Plus size={13} /></button>
                </div>
                <div className="text-right text-[13px] font-bold text-slate-950">{money(item.price * item.qty)}</div>
                <button type="button" onClick={() => updateQty(item.id, -item.qty)} className="grid h-7 w-7 place-items-center border-0 bg-transparent text-red-500"><X size={14} /></button>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-100 p-4">
            <div className="space-y-2 text-[13px]">
              <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="font-bold text-slate-950">{money(totals.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Discount</span><span className="font-bold text-slate-950">- {money(totals.discount)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">CGST (2.5%)</span><span className="font-bold text-slate-950">{money(totals.cgst, 2)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">SGST (2.5%)</span><span className="font-bold text-slate-950">{money(totals.sgst, 2)}</span></div>
              <div className="flex justify-between border-t border-slate-200 pt-3 text-[17px] font-bold text-slate-950"><span>Total</span><span>{money(totals.total)}</span></div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <PosSecondaryButton onClick={() => setMessage(`Order for ${table} is on hold.`)} className="w-full">Hold Order</PosSecondaryButton>
              <PosPrimaryButton onClick={placeOrder} disabled={saving || !cart.length} className="w-full">{saving ? 'Placing...' : 'Place Order'}</PosPrimaryButton>
            </div>
          </div>
        </PosCard>
      </section>
    </div>
  );
}
