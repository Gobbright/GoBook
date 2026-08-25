import { useEffect, useMemo, useState } from 'react';
import { CreditCard, Eye, Plus, Printer, Search, Trash2 } from 'lucide-react';

import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';
import { createModuleRecord, listModuleRecords } from '../../../../../services/moduleRecordsService.js';
import { paginateRows, PaginationFooter } from './HotelPagination.jsx';

const DEFAULT_GUEST = {
  name: 'No active guest',
  guestId: '-',
  mobile: '-',
  email: '-',
  nationality: '-',
  room: '-',
  roomType: '-',
  floor: '-',
  stayId: '-',
  checkIn: '-',
  checkOut: '-',
  nights: 0,
};

const CATEGORY_FILTERS = ['All Categories', 'Accommodation', 'F&B', 'Laundry', 'Spa', 'Room Service', 'Payment'];
const MANUAL_CATEGORIES = ['Other Service', 'Damage Charge', 'Mini Bar', 'Parking', 'Adjustment', 'Miscellaneous'];
const PAYMENT_MODES = ['Cash', 'Card', 'UPI', 'Bank Transfer'];
const EMPTY_CHARGE = { description: '', category: 'Other Service', amount: 0, notes: '' };

function money(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function normalizeStay(record) {
  const data = record.data || {};
  return {
    recordId: record._id,
    name: data.guestName || data.name || DEFAULT_GUEST.name,
    guestId: data.guestId || data.reservationId || DEFAULT_GUEST.guestId,
    mobile: data.mobile || DEFAULT_GUEST.mobile,
    email: data.email || DEFAULT_GUEST.email,
    nationality: data.nationality || DEFAULT_GUEST.nationality,
    room: data.roomNumber || data.room || DEFAULT_GUEST.room,
    roomType: data.roomType || DEFAULT_GUEST.roomType,
    floor: data.floor ? `Floor ${data.floor}` : DEFAULT_GUEST.floor,
    stayId: data.stayId || data.reservationId || DEFAULT_GUEST.stayId,
    checkIn: [data.checkInDate, data.checkInTime].filter(Boolean).join(' | ') || DEFAULT_GUEST.checkIn,
    checkOut: [data.checkOutDate, data.checkOutTime].filter(Boolean).join(' | ') || DEFAULT_GUEST.checkOut,
    nights: Number(data.nights || DEFAULT_GUEST.nights),
  };
}

function normalizeRoom(record) {
  const data = record.data || {};
  return {
    number: data.number || data.roomNo || data.roomNumber || '',
    rate: Number(data.rate || data.baseRate || 0),
  };
}

function normalizeCharge(record, config) {
  const data = record.data || {};
  const amount = Number(data.balance || data.grandTotal || data.amount || data.total || data.price || 0);
  if (!amount) return null;
  const room = data.room || data.roomNumber;
  const chargeGuest = data.guest || data.guestName;
  return {
    id: record._id,
    room,
    guest: chargeGuest,
    date: data.date || data.billDate || data.pickupDate || '',
    time: data.time || data.pickupTime || '',
    description: config.description(data),
    source: config.source,
    category: config.category,
    reference: data.orderId || data.bookingId || data.tripId || data.billNo || data.serviceName || '-',
    charge: amount,
    payment: 0,
    automatic: true,
  };
}

function normalizePayment(record) {
  const data = record.data || {};
  const room = data.room || data.roomNumber;
  const paymentGuest = data.guest || data.guestName;
  return {
    id: record._id,
    room,
    guest: paymentGuest,
    receiptNo: data.receiptNo || data.paymentId || '',
    date: data.date || data.paymentDate || '',
    time: data.time || '',
    mode: data.mode || data.paymentMethod || 'Cash',
    amount: Number(data.amount || 0),
  };
}

function CategoryBadge({ category }) {
  const tone = {
    Accommodation: 'bg-cyan-100 text-cyan-700',
    'F&B': 'bg-orange-100 text-orange-700',
    Laundry: 'bg-emerald-100 text-emerald-700',
    Spa: 'bg-violet-100 text-violet-700',
    'Room Service': 'bg-blue-100 text-blue-700',
    Payment: 'bg-slate-200 text-slate-700',
  };
  return <span className={`rounded px-2 py-1 text-[11px] font-semibold ${tone[category] || 'bg-slate-100 text-slate-700'}`}>{category}</span>;
}

function SummaryRow({ label, value, tone = 'text-slate-950' }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md bg-slate-50 px-3 py-2.5">
      <span className="text-[13px] font-medium text-slate-500">{label}</span>
      <strong className={`text-[15px] ${tone}`}>{value}</strong>
    </div>
  );
}

function DetailField({ label, value }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 break-words text-[14px] font-bold leading-5 text-slate-950">{value}</div>
    </div>
  );
}

export function GuestBillingPage() {
  const [guests, setGuests] = useState([]);
  const [guest, setGuest] = useState(DEFAULT_GUEST);
  const [rooms, setRooms] = useState([]);
  const [folio, setFolio] = useState([]);
  const [payments, setPayments] = useState([
  ]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [showChargeForm, setShowChargeForm] = useState(false);
  const [manualCharge, setManualCharge] = useState(EMPTY_CHARGE);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [message, setMessage] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  useEffect(() => {
    let active = true;
    const configs = [
      { moduleKey: 'hotel/restaurant-pos/billing', source: 'POS', category: 'F&B', description: (data) => data.billNo ? `Restaurant - ${data.billNo}` : 'Restaurant Charges' },
      { moduleKey: 'hotel/services/room-service', source: 'Room Service', category: 'Room Service', description: (data) => data.orderId ? `Room Service - Order #${data.orderId}` : 'Room Service' },
      { moduleKey: 'hotel/services/laundry', source: 'Laundry', category: 'Laundry', description: (data) => data.orderId ? `Laundry Service - ${data.orderId}` : 'Laundry Service' },
      { moduleKey: 'hotel/services/spa', source: 'Spa', category: 'Spa', description: (data) => data.service || 'Spa Service' },
      { moduleKey: 'hotel/services/transport', source: 'Transport', category: 'Transport', description: (data) => data.service || 'Transport Service' },
      { moduleKey: 'hotel/services/other-services', source: 'Services', category: 'Hotel Services', description: (data) => data.serviceName || data.service || 'Other Service' },
      { moduleKey: 'hotel/billing/new-bill', source: 'Manual Bill', category: 'Hotel Services', description: (data) => data.billNo ? `Manual Bill - ${data.billNo}` : 'Manual Bill' },
    ];

    Promise.all([
      listModuleRecords('hotel/front-desk/in-house-guests').catch(() => ({ records: [] })),
      listModuleRecords('hotel/rooms-availability/rooms').catch(() => ({ records: [] })),
      ...configs.map((config) => listModuleRecords(config.moduleKey).catch(() => ({ records: [], config }))),
      listModuleRecords('hotel/billing/payments')
        .catch(() => []),
    ]).then((results) => {
      if (!active) return;
      const stayRecords = results[0].records || [];
      const guestRows = stayRecords.map(normalizeStay);
      const chargeGroups = results.slice(2, configs.length + 2)
        .flatMap((res, index) => (res.records || []).map((record) => normalizeCharge(record, configs[index])).filter(Boolean));
      const paymentSource = results[configs.length + 2];
      const paymentRecords = (paymentSource.records || []).map((record) => normalizePayment(record)).filter(Boolean);
      setGuests(guestRows);
      setGuest((current) => guestRows.find((item) => item.recordId === current.recordId) || guestRows[0] || DEFAULT_GUEST);
      setRooms((results[1].records || []).map(normalizeRoom));
      setFolio(chargeGroups);
      if (paymentRecords.length) setPayments(paymentRecords);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const filteredFolio = useMemo(() => {
    const query = search.trim().toLowerCase();
    const roomRate = rooms.find((room) => String(room.number) === String(guest.room))?.rate || 0;
    const nights = Math.max(1, Number(guest.nights || 1));
    const roomCharge = guest.name !== DEFAULT_GUEST.name && roomRate > 0
      ? [{
        date: guest.checkIn,
        time: '',
        description: `Room Charge (${nights} night${nights === 1 ? '' : 's'})`,
        source: 'Rooms',
        category: 'Accommodation',
        reference: `ROOM-${guest.room}`,
        charge: roomRate * nights,
        payment: 0,
      }]
      : [];
    return [...roomCharge, ...folio.filter((entry) => {
      const roomMatches = entry.room && String(entry.room) === String(guest.room);
      const guestMatches = entry.guest && entry.guest === guest.name;
      return guest.name !== DEFAULT_GUEST.name && (roomMatches || guestMatches);
    })].filter((entry) => {
      const matchesSearch = !query || [entry.description, entry.reference, entry.category, guest.name, guest.room].some((value) => String(value).toLowerCase().includes(query));
      const matchesCategory = categoryFilter === 'All Categories' || entry.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [categoryFilter, folio, guest, rooms, search]);

  const totals = useMemo(() => {
    const guestPayments = payments.filter((payment) => {
      const roomMatches = payment.room && String(payment.room) === String(guest.room);
      const guestMatches = payment.guest && payment.guest === guest.name;
      return guest.name !== DEFAULT_GUEST.name && (roomMatches || guestMatches);
    });
    const ledgerCharges = filteredFolio.reduce((sum, entry) => sum + Number(entry.charge || 0), 0);
    const totalCharges = ledgerCharges;
    const totalPayments = guestPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const adjustments = 0;
    const outstanding = Math.max(0, totalCharges - totalPayments + adjustments);
    return { totalCharges, totalPayments, adjustments, outstanding };
  }, [filteredFolio, guest, payments]);

  const runningRows = useMemo(() => {
    let balance = totals.outstanding + filteredFolio.reduce((sum, row) => sum - Number(row.charge || 0) + Number(row.payment || 0), 0);
    return filteredFolio.map((row) => {
      balance += Number(row.charge || 0) - Number(row.payment || 0);
      return { ...row, balance };
    });
  }, [filteredFolio, totals.outstanding]);

  const pagination = paginateRows(runningRows, page, pageSize);

  async function addManualCharge(event) {
    event.preventDefault();
    if (!manualCharge.description || !manualCharge.amount) return;
    const entry = {
      date: new Date().toLocaleDateString('en-IN'),
      time: 'Now',
      description: manualCharge.description,
      source: 'Manual',
      category: manualCharge.category === 'Other Service' ? 'Hotel Services' : manualCharge.category,
      reference: `ADJ-${folio.length + 1025}`,
      charge: Number(manualCharge.amount),
      payment: 0,
      notes: manualCharge.notes,
      automatic: false,
      room: guest.room,
      guest: guest.name,
    };
    try {
      await createModuleRecord('hotel/billing/new-bill', {
        billNo: entry.reference,
        billType: 'Manual Charge',
        billingMode: 'Charge to Room',
        guestName: guest.name,
        roomNumber: guest.room,
        stayId: guest.stayId,
        charges: [{ description: entry.description, category: entry.category, qty: 1, rate: entry.charge, amount: entry.charge }],
        amount: entry.charge,
        total: entry.charge,
        grandTotal: entry.charge,
        balance: entry.charge,
        status: 'Pending',
        billDate: new Date().toISOString().slice(0, 10),
      });
      setFolio((current) => [entry, ...current]);
      setManualCharge(EMPTY_CHARGE);
      setShowChargeForm(false);
      setMessage('Charge added and saved to guest folio.');
    } catch (err) {
      setMessage(err.message || 'Unable to save charge.');
    }
  }

  async function receivePayment() {
    if (!paymentAmount) return;
    const payload = {
      receiptNo: `PAY-${String(payments.length + 2001).padStart(4, '0')}`,
      guestName: guest.name,
      guest: guest.name,
      roomNumber: guest.room,
      room: guest.room,
      stayId: guest.stayId,
      amount: Number(paymentAmount),
      mode: paymentMode,
      date: new Date().toLocaleDateString('en-IN'),
      time: 'Now',
    };
    try {
      await createModuleRecord('hotel/billing/payments', payload);
      setPayments((current) => [payload, ...current]);
      setFolio((current) => [{
        date: payload.date,
        time: payload.time,
        description: 'Payment Received',
        source: 'Payment',
        category: 'Payment',
        reference: payload.receiptNo,
        charge: 0,
        payment: payload.amount,
        guest: guest.name,
        room: guest.room,
      }, ...current]);
      setPaymentAmount('');
      setMessage('Payment received and applied to folio.');
    } catch (err) {
      setMessage(err.message || 'Unable to receive payment');
    }
  }

  async function finalizeFolio(status) {
    const payload = {
      billNo: `FOLIO-${String(folio.length + payments.length + 1025).padStart(4, '0')}`,
      billType: 'Guest Folio',
      guestName: guest.name,
      guestId: guest.guestId,
      roomNumber: guest.room,
      stayId: guest.stayId,
      charges: folio,
      payments,
      grandTotal: totals.totalCharges,
      paid: totals.totalPayments,
      balance: totals.outstanding,
      status,
    };
    try {
      await createModuleRecord('hotel/billing/guest-billing', payload);
      setMessage(status === 'Finalized' ? 'Guest folio finalized for checkout.' : 'Guest folio saved.');
    } catch (err) {
      setMessage(err.message || 'Unable to save folio');
    }
  }

  function handleFolioAction(action, entry) {
    if (action === 'View') {
      setMessage(`${entry.reference}: ${entry.description} / ${entry.category} / ${money(entry.charge || entry.payment)}`);
    }
    if (action === 'Delete') {
      const ok = window.confirm(`Delete folio entry ${entry.reference}?`);
      if (!ok) return;
      setFolio((current) => current.filter((item) => item !== entry));
      setMessage(`${entry.reference} removed from folio.`);
    }
  }

  return (
    <div className="min-h-full bg-slate-50 px-5 py-6 text-slate-900 md:px-8">
      <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="m-0 text-[28px] font-bold text-slate-950">Guest Folio</h1>
          <p className="m-0 mt-1 text-[14px] text-slate-500">Complete stay account: room, restaurant, services, payments, and checkout balance.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SelectDropdown
            value={guest.recordId || ''}
            onChange={(recordId) => {
              setGuest(guests.find((item) => item.recordId === recordId) || DEFAULT_GUEST);
              setPage(1);
            }}
            options={guests.length ? guests.map((item) => ({ label: `${item.name} - Room ${item.room}`, value: item.recordId })) : [{ label: 'No in-house guests', value: '' }]}
            className="w-64"
          />
          <button type="button" onClick={() => setShowChargeForm((value) => !value)} className="inline-flex h-9 items-center gap-2 rounded bg-blue-600 px-4 text-[13px] font-semibold text-white hover:bg-blue-700">
            <Plus size={15} />
            Add Manual Charge
          </button>
          <button type="button" onClick={() => finalizeFolio('Draft')} className="h-9 rounded border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 hover:border-blue-300">Save Draft</button>
          <button type="button" onClick={() => finalizeFolio('Finalized')} className="h-9 rounded bg-slate-950 px-4 text-[13px] font-semibold text-white hover:bg-slate-800">Checkout</button>
        </div>
      </section>

      {message && <p className="mb-5 rounded border border-blue-100 bg-blue-50 px-3 py-2 text-[13px] text-blue-700">{message}</p>}

      <section className="mb-5 grid items-start gap-5 2xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="self-start rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="m-0 text-[22px] font-bold text-slate-950">{guest.name}</h2>
                <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">VIP</span>
                <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-bold text-green-700">IN-HOUSE</span>
              </div>
              <div className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
                <DetailField label="Guest ID" value={guest.guestId} />
                <DetailField label="Mobile" value={guest.mobile} />
                <DetailField label="Room" value={`${guest.room} - ${guest.roomType}`} />
                <DetailField label="Stay ID" value={guest.stayId} />
                <DetailField label="Nights" value={guest.nights} />
                <DetailField label="Email" value={guest.email} />
              </div>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
              <div className="text-[12px] font-bold uppercase text-slate-400">Stay Timeline</div>
              <div className="mt-3 space-y-3">
                <DetailField label="Check-in" value={guest.checkIn} />
                <DetailField label="Check-out" value={guest.checkOut} />
              </div>
            </div>
          </div>
        </div>

        <div className="self-start rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="m-0 text-[15px] font-bold text-slate-950">Balance Summary</h2>
              <p className="m-0 mt-1 text-[12px] text-slate-500">Current payable amount</p>
            </div>
            <span className="rounded-full bg-red-50 px-3 py-1 text-[12px] font-bold text-red-600">DUE</span>
          </div>
          <div className="mt-4 rounded-lg bg-red-50 px-4 py-3.5">
            <div className="text-[12px] font-bold uppercase text-red-500">Balance Due</div>
            <div className="mt-1 text-[28px] font-bold leading-none text-red-600">{money(totals.outstanding)}</div>
          </div>
          <div className="mt-3 space-y-2">
            <SummaryRow label="Total Charges" value={money(totals.totalCharges)} />
            <SummaryRow label="Payments Received" value={money(totals.totalPayments)} tone="text-green-700" />
            <SummaryRow label="Adjustments" value={money(totals.adjustments)} />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_118px_auto]">
            <input value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} type="number" min="0" placeholder="Receive amount" className="h-10 rounded border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
            <SelectDropdown value={paymentMode} onChange={setPaymentMode} options={PAYMENT_MODES} />
            <button type="button" onClick={receivePayment} className="inline-flex h-10 items-center justify-center gap-2 rounded bg-green-600 px-4 text-[13px] font-semibold text-white hover:bg-green-700">
              <CreditCard size={15} />
              Receive
            </button>
          </div>
        </div>
      </section>

      {showChargeForm && (
        <form onSubmit={addManualCharge} className="mb-4 rounded-lg border border-blue-100 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[190px_minmax(220px,1fr)_160px_auto]">
            <SelectDropdown value={manualCharge.category} onChange={(category) => setManualCharge((current) => ({ ...current, category }))} options={MANUAL_CATEGORIES} />
            <input value={manualCharge.description} onChange={(e) => setManualCharge((current) => ({ ...current, description: e.target.value }))} placeholder="Charge description" className="h-10 rounded border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
            <input value={manualCharge.amount} onChange={(e) => setManualCharge((current) => ({ ...current, amount: e.target.value }))} type="number" min="0" placeholder="Amount" className="h-10 rounded border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
            <button type="submit" className="h-10 rounded bg-blue-600 px-4 text-[13px] font-semibold text-white">Add Charge</button>
          </div>
        </form>
      )}

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="m-0 text-[17px] font-bold text-slate-950">Guest Folio</h2>
            <p className="m-0 mt-1 text-[12px] text-slate-500">{loading ? 'Loading linked charges...' : `${runningRows.length} transactions shown`}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[190px_minmax(240px,320px)_auto]">
            <SelectDropdown value={categoryFilter} onChange={setCategoryFilter} options={CATEGORY_FILTERS} />
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search charge or reference" className="h-10 w-full rounded border border-slate-200 pl-9 pr-3 text-[13px] outline-none focus:border-blue-500" />
            </div>
            <button type="button" className="inline-flex h-10 items-center justify-center gap-2 rounded border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 hover:border-blue-300">
              <Printer size={15} />
              Print
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-[13px]">
            <thead className="bg-slate-50 text-[12px] text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3 text-right">Charge</th>
                <th className="px-4 py-3 text-right">Payment</th>
                <th className="px-4 py-3 text-right">Balance</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {pagination.pageRows.map((entry, index) => (
                <tr key={`${entry.reference}-${index}`} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-700"><div>{entry.date}</div><div className="text-[11px] text-slate-500">{entry.time}</div></td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{entry.description}</td>
                  <td className="px-4 py-3"><CategoryBadge category={entry.category} /></td>
                  <td className="px-4 py-3 text-slate-700">{entry.reference}</td>
                  <td className="px-4 py-3 text-right font-medium">{entry.charge ? money(entry.charge) : '-'}</td>
                  <td className="px-4 py-3 text-right font-medium text-green-600">{entry.payment ? money(entry.payment) : '-'}</td>
                  <td className={`px-4 py-3 text-right font-bold ${entry.balance > 0 ? 'text-slate-900' : 'text-green-600'}`}>{money(entry.balance)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button type="button" onClick={() => handleFolioAction('View', entry)} aria-label={`View ${entry.reference}`} className="grid h-8 w-8 place-items-center rounded-md border-0 bg-transparent text-blue-700 hover:bg-blue-50"><Eye size={15} /></button>
                      <button type="button" onClick={() => handleFolioAction('Delete', entry)} aria-label={`Delete ${entry.reference}`} className="grid h-8 w-8 place-items-center rounded-md border-0 bg-transparent text-red-600 hover:bg-red-50"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              <tr className="border-t border-slate-200 bg-slate-50 font-bold">
                <td className="px-4 py-3" colSpan={4}>Total</td>
                <td className="px-4 py-3 text-right">{money(filteredFolio.reduce((sum, entry) => sum + Number(entry.charge || 0), 0))}</td>
                <td className="px-4 py-3 text-right text-green-600">{money(filteredFolio.reduce((sum, entry) => sum + Number(entry.payment || 0), 0))}</td>
                <td className="px-4 py-3 text-right text-red-600">{money(totals.outstanding)}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-[12px] text-slate-500">
          <PaginationFooter page={pagination.currentPage} pageSize={pageSize} total={runningRows.length} start={pagination.start} end={pagination.end} totalPages={pagination.totalPages} onPageChange={setPage} onPageSizeChange={setPageSize} />
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => finalizeFolio('Draft')} className="h-9 rounded border border-slate-200 bg-white px-4 font-semibold text-slate-700">Save Folio</button>
            <button type="button" onClick={() => finalizeFolio('Finalized')} className="h-9 rounded bg-blue-600 px-4 font-semibold text-white">Generate Final Bill</button>
          </div>
        </div>
      </section>
    </div>
  );
}
