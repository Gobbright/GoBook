import { useEffect, useMemo, useState } from 'react';
import { FileText, Plus, Printer, Search, UserCircle2 } from 'lucide-react';

import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';
import { createModuleRecord, deleteModuleRecord, listModuleRecords, updateModuleRecord } from '../../../../../services/moduleRecordsService.js';
import { Card, PageHeader, PrimaryButton, SecondaryButton, TextInput, money } from './FrontDeskShared.jsx';

const DEFAULT_GUEST = {
  name: 'No guest selected',
  id: '-',
  room: '-',
  roomType: '-',
  checkIn: '-',
  checkInTime: '',
  checkOut: '-',
  checkOutTime: '',
  nights: 0,
  adults: 0,
  children: 0,
};

function normalizeGuest(record, index) {
  const data = record.data || {};
  return {
    recordId: record._id,
    name: data.guestName || data.name || DEFAULT_GUEST.name,
    id: record._id || `STAY-${index + 1}`,
    stayId: data.reservationId || data.stayId || data.guestId || `STAY-${index + 1}`,
    room: data.roomNumber || data.room || '-',
    roomType: data.roomType || '-',
    checkIn: data.checkInDate || '-',
    checkInTime: data.checkInTime || '',
    checkOut: data.checkOutDate || '-',
    checkOutTime: data.checkOutTime || '',
    nights: Number(data.nights || 0),
    adults: Number(data.adults || 0),
    children: Number(data.children || 0),
    rawData: data,
  };
}

function normalizeRoom(record) {
  const data = record.data || {};
  return {
    recordId: record._id,
    number: data.number || data.roomNo || data.roomNumber || '',
    rate: Number(data.rate || data.baseRate || data.price || 0),
    rawData: data,
  };
}

function normalizeCharge(record, source) {
  const data = record.data || {};
  const value = Number(data.balance || data.grandTotal || data.total || data.amount || data.subtotal || 0);
  if (!value) return null;
  const itemText = Array.isArray(data.items)
    ? data.items.map((item) => item.itemName || item.name).filter(Boolean).join(', ')
    : '';
  return {
    id: record._id,
    label: [data.billNo || data.folioNo || data.referenceNo || source, itemText].filter(Boolean).join(' - '),
    guestName: data.guestName || data.guest || '',
    room: data.roomNumber || data.room || '',
    amount: value,
  };
}

function normalizePayment(record) {
  const data = record.data || {};
  return {
    id: record._id,
    guestName: data.guestName || data.guest || '',
    room: data.roomNumber || data.room || '',
    amount: Number(data.amount || 0),
  };
}

function SummaryRow({ label, value, strong, danger }) {
  return (
    <div className={`flex items-center justify-between gap-4 py-2 text-[13px] ${strong ? 'font-bold' : ''} ${danger ? 'text-red-600' : 'text-slate-700'}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export function CheckOutPage() {
  const [guests, setGuests] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [charges, setCharges] = useState([]);
  const [payments, setPayments] = useState([]);
  const [selectedGuestId, setSelectedGuestId] = useState('');
  const [query, setQuery] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [method, setMethod] = useState('UPI');
  const [reference, setReference] = useState('');
  const [message, setMessage] = useState('');
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      listModuleRecords('hotel/front-desk/in-house-guests').catch(() => ({ records: [] })),
      listModuleRecords('hotel/rooms-availability/rooms').catch(() => ({ records: [] })),
      listModuleRecords('hotel/billing/new-bill').catch(() => ({ records: [] })),
      listModuleRecords('hotel/billing/guest-billing').catch(() => ({ records: [] })),
      listModuleRecords('hotel/restaurant-pos/billing').catch(() => ({ records: [] })),
      listModuleRecords('hotel/services/room-service').catch(() => ({ records: [] })),
      listModuleRecords('hotel/services/laundry').catch(() => ({ records: [] })),
      listModuleRecords('hotel/services/spa').catch(() => ({ records: [] })),
      listModuleRecords('hotel/services/transport').catch(() => ({ records: [] })),
      listModuleRecords('hotel/services/other-services').catch(() => ({ records: [] })),
      listModuleRecords('hotel/billing/payments').catch(() => ({ records: [] })),
    ]).then(([guestRes, roomRes, billRes, folioRes, restaurantBillRes, roomServiceRes, laundryRes, spaRes, transportRes, otherServicesRes, paymentRes]) => {
      if (!active) return;
      const guestRows = (guestRes.records || []).map(normalizeGuest);
      setGuests(guestRows);
      setRooms((roomRes.records || []).map(normalizeRoom));
      setCharges([
        ...(billRes.records || []).map((record) => normalizeCharge(record, 'Manual Bill')),
        ...(folioRes.records || []).map((record) => normalizeCharge(record, 'Guest Folio')),
        ...(restaurantBillRes.records || []).map((record) => normalizeCharge(record, 'Restaurant Bill')),
        ...(roomServiceRes.records || []).map((record) => normalizeCharge(record, 'Room Service')),
        ...(laundryRes.records || []).map((record) => normalizeCharge(record, 'Laundry')),
        ...(spaRes.records || []).map((record) => normalizeCharge(record, 'Spa')),
        ...(transportRes.records || []).map((record) => normalizeCharge(record, 'Transport')),
        ...(otherServicesRes.records || []).map((record) => normalizeCharge(record, 'Other Service')),
      ].filter(Boolean));
      setPayments((paymentRes.records || []).map(normalizePayment));
      setSelectedGuestId(guestRows[0]?.recordId || '');
    });
    return () => { active = false; };
  }, []);

  const filteredGuests = useMemo(() => {
    const text = query.trim().toLowerCase();
    return guests.filter((item) => !text || [item.name, item.stayId, item.room, item.roomType].some((value) => String(value || '').toLowerCase().includes(text)));
  }, [guests, query]);

  const guest = guests.find((item) => item.recordId === selectedGuestId) || filteredGuests[0] || DEFAULT_GUEST;
  const guestCharges = useMemo(() => charges.filter((charge) => {
    if (guest.name === DEFAULT_GUEST.name) return false;
    return String(charge.room) === String(guest.room) || charge.guestName === guest.name;
  }), [charges, guest.name, guest.room]);
  const checkoutCharges = useMemo(() => {
    if (guest.name === DEFAULT_GUEST.name) return [];
    const room = rooms.find((item) => String(item.number) === String(guest.room));
    const roomRate = Number(room?.rate || guest.rawData?.roomRate || guest.rawData?.rate || guest.rawData?.amount || 0);
    const nights = Math.max(1, Number(guest.nights || 1));
    const roomCharge = roomRate > 0
      ? [{ id: 'room-charge', label: `Room Charge (${nights} night${nights === 1 ? '' : 's'})`, guestName: guest.name, room: guest.room, amount: roomRate * nights }]
      : [];
    return [...roomCharge, ...guestCharges];
  }, [guest, guestCharges, rooms]);

  const total = checkoutCharges.reduce((sum, charge) => sum + charge.amount, 0);
  const paid = useMemo(() => payments
    .filter((payment) => (
      guest.name !== DEFAULT_GUEST.name
      && (String(payment.room) === String(guest.room) || payment.guestName === guest.name)
    ))
    .reduce((sum, payment) => sum + payment.amount, 0), [guest.name, guest.room, payments]);
  const outstanding = useMemo(() => Math.max(0, total - paid - (Number(paymentAmount) || 0)), [paid, paymentAmount, total]);

  async function closeCheckout() {
    if (guest.name === DEFAULT_GUEST.name) {
      setMessage('Select an in-house guest before checkout.');
      return;
    }
    setClosing(true);
    try {
      await createModuleRecord('hotel/front-desk/check-out', {
        guestName: guest.name,
        stayId: guest.stayId,
        roomNumber: guest.room,
        roomType: guest.roomType,
        checkInDate: guest.checkIn,
        checkOutDate: new Date().toISOString().slice(0, 10),
        paymentAmount: Number(paymentAmount || 0),
        paymentMethod: method,
        reference,
        total,
        outstanding,
        status: outstanding > 0 ? 'Closed with Balance' : 'Checked-out',
      });
      if (Number(paymentAmount || 0) > 0) {
        await createModuleRecord('hotel/billing/payments', {
          guestName: guest.name,
          roomNumber: guest.room,
          amount: Number(paymentAmount || 0),
          paymentMethod: method,
          reference,
          paymentDate: new Date().toISOString().slice(0, 10),
          status: outstanding > 0 ? 'PARTIAL' : 'RECEIVED',
        });
      }
      const room = rooms.find((item) => String(item.number) === String(guest.room));
      if (room?.recordId) await updateModuleRecord(room.recordId, { ...room.rawData, status: 'Vacant', occupancy: '-' });
      if (guest.recordId) await deleteModuleRecord(guest.recordId);
      setGuests((current) => current.filter((item) => item.recordId !== guest.recordId));
      setSelectedGuestId('');
      setPaymentAmount('');
      setReference('');
      setMessage(`${guest.name} checked out. Room ${guest.room} is now vacant.`);
    } catch (err) {
      setMessage(err.message || 'Unable to complete checkout.');
    } finally {
      setClosing(false);
    }
  }

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6">
      <PageHeader title="Check-out" subtitle="Process guest departure and generate the final bill." />

      <div className="mb-4">
        <TextInput icon={Search} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search guest, room no. or invoice no." />
      </div>

      <div className="mb-4 grid gap-2 md:grid-cols-3">
        {filteredGuests.map((item) => (
          <button
            key={item.recordId}
            type="button"
            onClick={() => setSelectedGuestId(item.recordId)}
            className={`rounded-lg border p-3 text-left text-[12px] ${item.recordId === guest.recordId ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-200'}`}
          >
            <div className="font-bold text-slate-950">{item.name}</div>
            <div className="mt-1 text-slate-500">Room {item.room} | {item.stayId}</div>
          </button>
        ))}
        {filteredGuests.length === 0 && <div className="rounded-lg border border-slate-200 bg-white px-3 py-6 text-center text-[13px] text-slate-500 md:col-span-3">No in-house guests available for checkout.</div>}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_1fr_0.7fr]">
        <Card className="p-4">
          <h2 className="m-0 text-[15px] font-bold text-slate-950">Guest & Stay Details</h2>
          <div className="mt-4 rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-blue-100 text-blue-700">
                <UserCircle2 size={26} />
              </span>
              <div>
                <div className="text-[17px] font-bold text-slate-950">{guest.name}</div>
                <div className="text-[12px] text-slate-500">{guest.stayId}</div>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 text-[12px] md:grid-cols-4">
              <div><div className="text-slate-500">Room No.</div><div className="mt-1 font-bold text-slate-950">{guest.room}</div></div>
              <div><div className="text-slate-500">Room Type</div><div className="mt-1 font-bold text-slate-950">{guest.roomType}</div></div>
              <div><div className="text-slate-500">Check-in</div><div className="mt-1 font-bold text-slate-950">{guest.checkIn}<br />{guest.checkInTime}</div></div>
              <div><div className="text-slate-500">Check-out</div><div className="mt-1 font-bold text-slate-950">{guest.checkOut}<br />{guest.checkOutTime}</div></div>
              <div><div className="text-slate-500">Nights</div><div className="mt-1 font-bold text-slate-950">{guest.nights}</div></div>
              <div><div className="text-slate-500">Guests</div><div className="mt-1 font-bold text-slate-950">{guest.adults} Adults, {guest.children} Child</div></div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="m-0 text-[15px] font-bold text-slate-950">Folio / Charges Summary</h2>
          </div>
          <div className="px-4 py-3">
            {checkoutCharges.map((charge) => (
              <SummaryRow key={charge.label} label={charge.label} value={money(charge.amount)} />
            ))}
            {checkoutCharges.length === 0 && <div className="py-6 text-center text-[13px] text-slate-500">No room rate or folio charges found.</div>}
            <div className="mt-2 border-t border-slate-200 pt-2">
              <SummaryRow label="Total Amount" value={money(total)} strong />
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="m-0 text-[15px] font-bold text-slate-950">Payment Summary</h2>
            <div className="mt-3">
              <SummaryRow label="Total Amount" value={money(total)} />
              <SummaryRow label="Paid Amount" value={money(paid)} />
              <SummaryRow label="Outstanding" value={money(Math.max(0, total - paid))} strong danger />
            </div>
            <div className="mt-4 border-t border-slate-100 pt-4">
              <h3 className="m-0 text-[13px] font-bold text-slate-950">Settlement</h3>
              <div className="mt-3 grid grid-cols-1 gap-3">
                <TextInput value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} placeholder="Payment amount" />
                <SelectDropdown value={method} onChange={setMethod} options={['UPI', 'Cash', 'Card', 'Bank Transfer']} />
                <TextInput value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Reference no." />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="m-0 text-[15px] font-bold text-slate-950">Actions</h2>
            <div className="mt-3 grid gap-2">
              <SecondaryButton className="justify-start text-emerald-700">
                <Plus size={15} />
                Add Additional Charge
              </SecondaryButton>
              <SecondaryButton className="justify-start">
                <FileText size={15} />
                Receive Payment
              </SecondaryButton>
              <SecondaryButton className="justify-start">
                <Printer size={15} />
                Print Invoice
              </SecondaryButton>
              <PrimaryButton className="justify-start bg-red-600 hover:bg-red-700" onClick={closeCheckout} disabled={closing || guest.name === DEFAULT_GUEST.name}>
                {closing ? 'Closing...' : 'Check-out & Close'}
              </PrimaryButton>
            </div>
            {message && <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] font-semibold text-emerald-700">{message}</div>}
          </Card>
        </div>
      </div>
    </div>
  );
}
