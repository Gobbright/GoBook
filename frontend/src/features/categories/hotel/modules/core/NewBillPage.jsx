import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Edit2, Save, Search, Trash2, UserCircle } from 'lucide-react';

import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';
import { createModuleRecord, listModuleRecords } from '../../../../../services/moduleRecordsService.js';

const BILL_TYPES = ['Hotel Guest Bill', 'Corporate Bill', 'Walk-in Bill'];
const BILLING_MODES = ['Charge to Room', 'Direct Payment', 'Corporate Credit'];
const MANUAL_CATEGORIES = ['Other Service', 'Damage Charge', 'Mini Bar', 'Parking', 'Adjustment', 'Miscellaneous'];
const TAX_OPTIONS = ['CGST (9%)', 'SGST (9%)', 'IGST (18%)'];

const GUEST = {
  name: 'No guest selected',
  guestId: '-',
  mobile: '-',
  room: '-',
  roomType: '-',
  stayId: '-',
  checkIn: '-',
  checkOut: '-',
  nights: 0,
};

const EMPTY_ITEM = {
  description: '',
  category: 'Other Service',
  qty: 1,
  rate: 0,
};

function money(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value || 0));
}

function amount(item) {
  return Number(item.qty || 0) * Number(item.rate || 0);
}

function normalizeStayGuest(record, index) {
  const data = record.data || {};
  return {
    recordId: record._id || `guest-${index}`,
    name: data.guestName || data.name || GUEST.name,
    guestId: data.guestId || data.reservationId || data.bookingId || `GST-${index + 1}`,
    mobile: data.mobile || '-',
    room: data.roomNumber || data.room || '-',
    roomType: data.roomType || '-',
    stayId: data.stayId || data.reservationId || data.bookingId || `STAY-${index + 1}`,
    checkIn: [data.checkInDate, data.checkInTime].filter(Boolean).join(' | ') || data.checkInDate || '-',
    checkOut: [data.checkOutDate, data.checkOutTime].filter(Boolean).join(' | ') || data.checkOutDate || '-',
    nights: Number(data.nights || 0),
  };
}

function normalizeModuleCharge(record, config) {
  const data = record.data || {};
  const value = Number(data.amount || data.total || data.price || 0);
  if (!value) return null;
  const room = data.room || data.roomNumber;
  const guest = data.guest || data.guestName;
  return {
    id: `${config.moduleKey}-${record._id}`,
    description: config.description(data),
    category: config.category,
    date: data.date || data.billDate || '',
    qty: 1,
    rate: value,
    room,
    guest,
    automatic: true,
  };
}

function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold text-slate-500">{label}{required && <span className="text-red-500"> *</span>}</span>
      {children}
    </label>
  );
}

function TextInput({ value, onChange, type = 'text', readOnly = false, placeholder }) {
  return (
    <input
      type={type}
      value={value}
      readOnly={readOnly}
      placeholder={placeholder}
      onChange={(e) => onChange?.(e.target.value)}
      className={`h-9 w-full rounded border border-slate-200 px-3 text-[12px] text-slate-800 outline-none focus:border-blue-500 ${readOnly ? 'bg-slate-100 text-slate-500' : 'bg-white'}`}
    />
  );
}

export function NewBillPage() {
  const [billType, setBillType] = useState('Hotel Guest Bill');
  const [billingMode, setBillingMode] = useState('Charge to Room');
  const [guest, setGuest] = useState(GUEST);
  const [guestOptions, setGuestOptions] = useState([]);
  const [showGuestPicker, setShowGuestPicker] = useState(false);
  const [guestSearch, setGuestSearch] = useState('');
  const [automaticCharges, setAutomaticCharges] = useState([]);
  const [manualCharges, setManualCharges] = useState([]);
  const [search, setSearch] = useState('');
  const [note, setNote] = useState('');
  const [manualItem, setManualItem] = useState(EMPTY_ITEM);
  const [showItemForm, setShowItemForm] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [advancePaid, setAdvancePaid] = useState(0);
  const [roundOff, setRoundOff] = useState(false);
  const [extraTax, setExtraTax] = useState(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    const configs = [
      { moduleKey: 'hotel/services/room-service', category: 'F&B', description: (data) => data.orderId ? `Room Service ${data.orderId}` : 'Room Service' },
      { moduleKey: 'hotel/services/laundry', category: 'Laundry', description: (data) => data.orderId ? `Laundry ${data.orderId}` : 'Laundry' },
      { moduleKey: 'hotel/services/spa', category: 'Hotel Services', description: (data) => data.bookingId ? `Spa ${data.bookingId}` : 'Spa' },
      { moduleKey: 'hotel/services/transport', category: 'Transport', description: (data) => data.tripId ? `Transport ${data.tripId}` : 'Transport' },
      { moduleKey: 'hotel/services/other-services', category: 'Hotel Services', description: (data) => data.serviceName || data.service || 'Other Service' },
      { moduleKey: 'hotel/restaurant-pos/billing', category: 'F&B', description: (data) => data.billNo ? `Restaurant ${data.billNo}` : 'Restaurant Charges' },
    ];
    Promise.all([
      listModuleRecords('hotel/front-desk/in-house-guests').catch(() => ({ records: [] })),
      listModuleRecords('hotel/guests/list').catch(() => ({ records: [] })),
      listModuleRecords('hotel/guests/registration').catch(() => ({ records: [] })),
      listModuleRecords('hotel/reservations/list').catch(() => ({ records: [] })),
      ...configs.map((config) => listModuleRecords(config.moduleKey)
        .then((res) => (res.records || []).map((record) => normalizeModuleCharge(record, config)).filter(Boolean))
        .catch(() => [])),
    ])
      .then((results) => {
        if (!active) return;
        const sourceGroups = results.slice(0, 4);
        const guests = sourceGroups
          .flatMap((res, groupIndex) => (res.records || []).map((record, index) => normalizeStayGuest(record, (groupIndex * 1000) + index)))
          .filter((option) => option.name && option.name !== GUEST.name);
        const automatic = results.slice(4).flat();
        setGuestOptions(guests);
        if (guests.length) setGuest(guests[0]);
        setAutomaticCharges(automatic);
      });
    return () => { active = false; };
  }, []);

  const selectableGuests = useMemo(() => {
    const query = guestSearch.trim().toLowerCase();
    return guestOptions.filter((option) => !query || [option.name, option.guestId, option.room, option.stayId]
      .some((value) => String(value || '').toLowerCase().includes(query)));
  }, [guestOptions, guestSearch]);

  const billCharges = useMemo(() => {
    const autoForGuest = automaticCharges.filter((charge) => {
      if (guest.name === GUEST.name) return false;
      const roomMatches = charge.room && String(charge.room) === String(guest.room);
      const guestMatches = charge.guest && charge.guest === guest.name;
      return roomMatches || guestMatches || (!charge.room && !charge.guest);
    });
    return [...autoForGuest, ...manualCharges];
  }, [automaticCharges, guest, manualCharges]);

  const filteredCharges = useMemo(() => billCharges.filter((charge) => {
    const text = `${charge.description} ${charge.category}`.toLowerCase();
    return !search || text.includes(search.toLowerCase());
  }), [billCharges, search]);

  const subtotal = billCharges.reduce((sum, item) => sum + amount(item), 0);
  const taxableAmount = Math.max(0, subtotal - Number(discount || 0));
  const cgst = taxableAmount * 0.09;
  const sgst = taxableAmount * 0.09;
  const totalTax = cgst + sgst + Number(extraTax || 0);
  const grandRaw = taxableAmount + totalTax;
  const roundedGrand = roundOff ? Math.round(grandRaw) : grandRaw;
  const roundValue = roundedGrand - grandRaw;
  const balance = roundedGrand - Number(advancePaid || 0);

  function addItem(event) {
    event.preventDefault();
    if (!manualItem.description || !manualItem.rate) return;
    setManualCharges((current) => [...current, { ...manualItem, id: `manual-${Date.now()}`, date: new Date().toLocaleDateString('en-IN'), automatic: false }]);
    setManualItem(EMPTY_ITEM);
    setShowItemForm(false);
    setMessage('Item added to bill.');
  }

  function removeItem(itemToRemove) {
    if (itemToRemove.automatic) {
      setAutomaticCharges((current) => current.filter((item) => item.id !== itemToRemove.id));
      return;
    }
    setManualCharges((current) => current.filter((item) => item.id !== itemToRemove.id));
  }

  async function saveBill(status) {
    setSaving(true);
    setMessage('');
    const payload = {
      billNo: 'AUTO',
      folioNo: 'AUTO',
      billType,
      billingMode,
      guestName: guest.name,
      guestId: guest.guestId,
      roomNumber: guest.room,
      stayId: guest.stayId,
      charges: billCharges,
      subtotal,
      discount: Number(discount || 0),
      taxableAmount,
      taxes: { cgst, sgst },
      totalTax,
      grandTotal: roundedGrand,
      advancePaid: Number(advancePaid || 0),
      balance,
      note,
      status,
    };
    try {
      await createModuleRecord('hotel/billing/new-bill', payload);
      setMessage(status === 'Draft' ? 'Bill saved as draft.' : 'Bill saved and preview bill generated.');
    } catch (err) {
      setMessage(err.message || 'Unable to save bill');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50 text-slate-900">
      <main className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
        <section className="mb-3 flex items-start justify-between">
          <div>
            <h1 className="m-0 text-[22px] font-bold text-slate-950">Manual Bill</h1>
            <p className="m-0 mt-1 text-[12px] text-slate-500">Create special charges, corporate bills, or manual adjustments.</p>
          </div>
          <div className="text-[11px] text-slate-500">Home <span className="mx-2">›</span> Billing <span className="mx-2">›</span> <span className="font-semibold text-slate-700">Manual Bill</span></div>
        </section>

        <div className="mb-3 flex justify-end gap-3">
          <button type="button" className="h-9 rounded border border-slate-200 bg-white px-5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50">Discard</button>
          <button type="button" disabled={saving} onClick={() => saveBill('Preview')} className="h-9 rounded bg-blue-600 px-5 text-[12px] font-semibold text-white hover:bg-blue-700 disabled:opacity-60">Save & Preview</button>
        </div>

        {message && <div className="mb-3 rounded border border-blue-100 bg-blue-50 px-3 py-2 text-[12px] text-blue-700">{message}</div>}

        <section className="grid gap-3 lg:grid-cols-[1.05fr_.95fr]">
          <div className="rounded border border-slate-200 bg-white p-3">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="m-0 text-[14px] font-bold text-slate-800">Guest & Stay Details</h2>
              <button
                type="button"
                onClick={() => setShowGuestPicker((value) => !value)}
                className="inline-flex h-7 items-center gap-1 rounded-full border border-blue-100 px-3 text-[11px] font-semibold text-blue-600 hover:bg-blue-50"
              >
                <Edit2 size={13} />
                Choose Guest
              </button>
            </div>
            {showGuestPicker && (
              <div className="mb-3 rounded border border-blue-100 bg-blue-50 p-3">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    value={guestSearch}
                    onChange={(event) => setGuestSearch(event.target.value)}
                    placeholder="Search in-house guest, room or stay ID"
                    className="h-9 w-full rounded border border-blue-100 bg-white pl-9 pr-3 text-[12px] outline-none focus:border-blue-500"
                  />
                </div>
                <div className="mt-2 text-[11px] font-semibold text-blue-700">{selectableGuests.length} guest{selectableGuests.length === 1 ? '' : 's'} available</div>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {selectableGuests.map((option, index) => (
                    <button
                      key={option.recordId || `${option.stayId}-${option.room}-${index}`}
                      type="button"
                      onClick={() => {
                        setGuest(option);
                        setShowGuestPicker(false);
                        setMessage(`${option.name} selected for this bill.`);
                      }}
                      className={`rounded border p-3 text-left text-[12px] hover:border-blue-300 hover:bg-white ${option.stayId === guest.stayId ? 'border-blue-500 bg-white' : 'border-blue-100 bg-blue-50'}`}
                    >
                      <div className="font-bold text-slate-950">{option.name}</div>
                      <div className="mt-1 text-slate-500">Room {option.room} | {option.roomType}</div>
                      <div className="text-slate-500">{option.stayId}</div>
                    </button>
                  ))}
                  {selectableGuests.length === 0 && (
                    <div className="rounded border border-dashed border-blue-200 bg-white px-3 py-6 text-center text-[12px] text-slate-500 md:col-span-2">
                      No in-house guests found. Complete Check-in first, then create the bill.
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="rounded border border-slate-200 p-3">
              <div className="grid gap-4 md:grid-cols-[1.3fr_1fr_1fr]">
                <div className="flex gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-100 text-blue-600"><UserCircle size={24} /></span>
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-[14px]">{guest.name}</strong>
                      {guest.name !== GUEST.name && <span className="rounded-full border border-green-300 bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700">Selected</span>}
                    </div>
                    <div className="mt-1 text-[12px] text-slate-500">Guest ID : {guest.guestId}</div>
                    <div className="text-[12px] text-slate-500">Mobile : {guest.mobile}</div>
                  </div>
                </div>
                <div className="text-[12px]">
                  <div className="text-slate-500">Room No.</div>
                  <div className="font-bold text-blue-600">{guest.room}</div>
                  <div className="mt-4 text-slate-500">Stay ID</div>
                  <div className="font-bold">{guest.stayId}</div>
                </div>
                <div className="text-[12px]">
                  <div className="text-slate-500">Room Type</div>
                  <div className="font-bold">{guest.roomType}</div>
                </div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3 text-[12px]">
              <div><div className="text-slate-500">Check-in</div><strong>{guest.checkIn}</strong></div>
              <div><div className="text-slate-500">Check-out</div><strong>{guest.checkOut}</strong></div>
              <div><div className="text-slate-500">Nights</div><strong>{guest.nights}</strong></div>
            </div>
          </div>

          <div className="rounded border border-slate-200 bg-white p-3">
            <h2 className="m-0 mb-3 text-[14px] font-bold text-slate-800">Bill Information</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Bill Date" required>
                <div className="relative">
                  <CalendarDays size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input value={new Date().toLocaleDateString('en-IN')} readOnly className="h-9 w-full rounded border border-slate-200 bg-white pl-9 pr-3 text-[12px]" />
                </div>
              </Field>
              <Field label="Bill Type" required><SelectDropdown value={billType} onChange={setBillType} options={BILL_TYPES} /></Field>
              <Field label="Reference No."><TextInput value="AUTO" readOnly /></Field>
              <Field label="Billing Mode" required><SelectDropdown value={billingMode} onChange={setBillingMode} options={BILLING_MODES} /></Field>
              <Field label="Folio No."><TextInput value="AUTO" readOnly /></Field>
              <Field label="Created By"><TextInput value="-" readOnly /></Field>
            </div>
          </div>
        </section>

        <section className="mt-3 grid min-h-[430px] gap-3 xl:grid-cols-[minmax(0,1fr)_390px]">
          <div className="flex min-h-0 flex-col rounded border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-3">
              <div className="flex items-center gap-3">
                <h2 className="m-0 text-[14px] font-bold text-slate-800">Bill Items</h2>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search item or service..." className="h-8 w-52 rounded border border-slate-200 px-3 text-[12px] outline-none focus:border-blue-500" />
              </div>
              <button type="button" onClick={() => setShowItemForm((value) => !value)} className="h-8 rounded border border-blue-200 bg-blue-50 px-3 text-[12px] font-semibold text-blue-700">+ Add Item</button>
            </div>

            {showItemForm && (
              <form onSubmit={addItem} className="grid gap-3 border-b border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_150px_90px_120px_100px]">
                <TextInput value={manualItem.description} onChange={(description) => setManualItem((current) => ({ ...current, description }))} placeholder="Description" />
                <SelectDropdown value={manualItem.category} onChange={(category) => setManualItem((current) => ({ ...current, category }))} options={MANUAL_CATEGORIES} />
                <TextInput type="number" value={manualItem.qty} onChange={(qty) => setManualItem((current) => ({ ...current, qty }))} />
                <TextInput type="number" value={manualItem.rate} onChange={(rate) => setManualItem((current) => ({ ...current, rate }))} />
                <button type="submit" className="h-9 rounded bg-blue-600 px-3 text-[12px] font-semibold text-white">Add</button>
              </form>
            )}

            <div className="min-h-[240px] flex-1 overflow-auto">
              <table className="w-full min-w-[820px] border-collapse text-left text-[12px]">
                <thead className="bg-slate-50 text-[11px] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Qty</th>
                    <th className="px-4 py-3 text-right">Rate (₹)</th>
                    <th className="px-4 py-3 text-right">Amount (₹)</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCharges.map((item, index) => (
                    <tr key={item.id || `${item.description}-${index}`} className="border-t border-slate-100">
                      <td className="px-4 py-3">{index + 1}</td>
                      <td className="px-4 py-3 font-semibold">{item.description}</td>
                      <td className="px-4 py-3">{item.category}</td>
                      <td className="px-4 py-3">{item.date}</td>
                      <td className="px-4 py-3 text-right">{Number(item.qty).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">{Number(item.rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-right">{amount(item).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-3">
                          <button type="button" className="text-blue-600"><Edit2 size={14} /></button>
                          <button type="button" onClick={() => removeItem(item)} className="text-red-500"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-slate-100 p-3">
              <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note..." rows={3} className="w-full resize-none rounded border border-slate-200 px-3 py-2 text-[12px] outline-none focus:border-blue-500" />
              <div className="mt-3 text-[11px] font-semibold text-red-500">* Required Fields</div>
            </div>
          </div>

          <aside className="rounded border border-slate-200 bg-white p-3 xl:sticky xl:top-3 xl:self-start">
            <h2 className="m-0 mb-4 text-[14px] font-bold text-slate-800">Summary</h2>
            <div className="space-y-3 text-[12px]">
              <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><strong>{money(subtotal)}</strong></div>
              <div className="grid grid-cols-[1fr_150px] items-center gap-3">
                <span className="text-slate-500">Discount</span>
                <input value={discount} onChange={(e) => setDiscount(e.target.value)} type="number" min="0" className="h-9 rounded border border-slate-200 px-3 text-right text-[12px] outline-none focus:border-blue-500" />
              </div>
              <div className="flex justify-between"><span className="text-slate-500">Taxable Amount</span><strong>{money(taxableAmount)}</strong></div>
              <div>
                <div className="mb-2 font-bold text-slate-700">Taxes</div>
                {[
                  ['CGST (9%)', cgst],
                  ['SGST (9%)', sgst],
                ].map(([label, value]) => (
                  <div key={label} className="mb-2 grid grid-cols-[1fr_80px_28px_110px_24px] items-center gap-2">
                    <SelectDropdown value={label} onChange={() => {}} options={TAX_OPTIONS} />
                    <input value="9.00" readOnly className="h-9 rounded border border-slate-200 bg-white px-2 text-right text-[12px]" />
                    <span className="text-center text-slate-500">%</span>
                    <input value={value.toLocaleString('en-IN', { minimumFractionDigits: 2 })} readOnly className="h-9 rounded border border-slate-200 bg-slate-50 px-2 text-right text-[12px]" />
                    <span className="text-slate-400">⊗</span>
                  </div>
                ))}
                <button type="button" onClick={() => { setExtraTax((value) => Number(value || 0) + 100); setMessage('Additional tax line added.'); }} className="text-[12px] font-semibold text-blue-600">+ Add Tax</button>
              </div>
              <div className="flex justify-between"><span className="text-slate-500">Total Tax</span><strong>{money(totalTax)}</strong></div>
              <div className="flex justify-between text-[20px]"><span className="font-bold">Grand Total</span><strong className="text-blue-600">{money(roundedGrand)}</strong></div>
              <div className="grid grid-cols-[1fr_150px] items-center gap-3">
                <span className="text-slate-500">Advance Paid</span>
                <input value={advancePaid} onChange={(e) => setAdvancePaid(e.target.value)} type="number" min="0" className="h-9 rounded border border-slate-200 px-3 text-right text-[12px] outline-none focus:border-blue-500" />
              </div>
              <div className="flex justify-between rounded bg-green-50 px-3 py-3 text-[15px]"><span className="font-bold text-green-700">Balance Payable</span><strong className="text-green-700">{money(balance)}</strong></div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Round Off</span>
                <div className="flex items-center gap-3">
                  <strong>{money(roundValue)}</strong>
                  <button type="button" onClick={() => setRoundOff((value) => !value)} className={`h-5 w-9 rounded-full p-0.5 transition ${roundOff ? 'bg-blue-600' : 'bg-slate-300'}`}>
                    <span className={`block h-4 w-4 rounded-full bg-white transition ${roundOff ? 'translate-x-4' : ''}`} />
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </section>

        <div className="sticky bottom-0 mt-3 flex justify-end gap-3 border-t border-slate-200 bg-slate-50/95 py-3 backdrop-blur">
          <button type="button" className="h-9 rounded border border-slate-200 bg-white px-5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button type="button" disabled={saving} onClick={() => saveBill('Draft')} className="inline-flex h-9 items-center gap-2 rounded border border-blue-200 bg-white px-5 text-[12px] font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60"><Save size={14} />Save as Draft</button>
          <button type="button" disabled={saving} onClick={() => saveBill('Preview')} className="h-9 rounded bg-blue-600 px-5 text-[12px] font-semibold text-white hover:bg-blue-700 disabled:opacity-60">Save & Preview Bill</button>
        </div>
      </main>
    </div>
  );
}
