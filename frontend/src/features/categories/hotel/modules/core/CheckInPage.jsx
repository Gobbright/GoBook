import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Building2, CalendarDays, CheckCircle2, Search, UserCircle2 } from 'lucide-react';

import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';
import { createModuleRecord, listModuleRecords, updateModuleRecord } from '../../../../../services/moduleRecordsService.js';
import { Card, Field, GuestMiniCard, PageHeader, PrimaryButton, SecondaryButton, TextInput } from './FrontDeskShared.jsx';

const steps = ['Guest Details', 'Stay Details', 'Room & Rate', 'Payment & Confirmation'];

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

function tomorrowValue() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function guestKey(data = {}) {
  return String(data.mobile || data.phone || data.guestName || data.fullName || data.name || '').trim().toLowerCase();
}

export function CheckInPage() {
  const [guests, setGuests] = useState([]);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [guestMode, setGuestMode] = useState('existing');
  const [query, setQuery] = useState('');
  const [selectedGuestId, setSelectedGuestId] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    idType: 'Aadhaar Card',
    idNumber: '',
    checkInDate: '',
    checkOutDate: '',
    checkInTime: '',
    checkOutTime: '',
    adults: '1',
    children: '0',
    roomNumber: '',
    roomType: '',
    source: 'Walk-in',
    company: '',
    requests: '',
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      listModuleRecords('hotel/reservations/list').catch(() => ({ records: [] })),
      listModuleRecords('hotel/rooms-availability/rooms').catch(() => ({ records: [] })),
      listModuleRecords('hotel/front-desk/in-house-guests').catch(() => ({ records: [] })),
      listModuleRecords('hotel/guests/list').catch(() => ({ records: [] })),
      listModuleRecords('hotel/guests/registration').catch(() => ({ records: [] })),
    ])
      .then(([reservationRes, roomRes, inHouseRes, guestListRes, registrationRes]) => {
        if (!active) return;
        const occupiedRoomNumbers = new Set((inHouseRes.records || [])
          .map((record) => record.data?.roomNumber || record.data?.room)
          .filter(Boolean)
          .map((room) => String(room)));
        const inHouseGuestKeys = new Set((inHouseRes.records || [])
          .map((record) => guestKey(record.data))
          .filter(Boolean));
        const rooms = (roomRes.records || [])
          .map((record) => {
            const data = record.data || {};
            return {
              recordId: record._id,
              number: data.number || data.roomNo || data.roomNumber || '',
              roomType: data.type || data.roomType || '',
              floor: data.floor || '',
              status: data.status || 'Vacant',
              rawData: data,
            };
          })
          .filter((room) => room.number && ['Vacant', 'Available'].includes(room.status) && !occupiedRoomNumbers.has(String(room.number)));
        setAvailableRooms(rooms);
        const reservationRows = (reservationRes.records || [])
          .filter((record) => !['Checked-in', 'Checked-out', 'Cancelled', 'In-House'].includes(record.data?.status))
          .map((record, index) => {
            const data = record.data || {};
            return {
              recordId: record._id,
              sourceModule: 'hotel/reservations/list',
              id: data.reservationNo || data.confirmationNo || `RES-${index + 1}`,
              reservationId: data.reservationNo || data.confirmationNo || `RES-${index + 1}`,
              name: data.guestName || data.guest || '',
              mobile: data.mobile || data.phone || '',
              email: data.email || '',
              room: data.roomNumber || data.availableRoom || '-',
              roomType: data.roomType || '',
              floor: String(data.floor || data.roomNumber || data.availableRoom || '').charAt(0),
              checkIn: data.checkInDate || '',
              checkOut: data.checkOutDate || '',
              nights: Number(data.nights || 0),
              adults: Number(data.adults || 1),
              children: Number(data.children || 0),
              status: data.status || 'Confirmed',
              amount: Number(data.amount || data.estimatedTotal || 0),
              rawData: data,
            };
          });
        const registeredRows = [...(guestListRes.records || []), ...(registrationRes.records || [])]
          .filter((record) => !inHouseGuestKeys.has(guestKey(record.data)))
          .map((record, index) => {
            const data = record.data || {};
            return {
              recordId: record._id,
              sourceModule: 'hotel/guests/list',
              id: data.guestId || data.id || `GST-${index + 1}`,
              reservationId: 'Walk-in',
              name: data.guestName || data.fullName || data.name || 'Guest',
              mobile: data.mobile || data.phone || '',
              email: data.email || '',
              room: '-',
              roomType: data.roomType || '',
              floor: '',
              checkIn: todayValue(),
              checkOut: tomorrowValue(),
              nights: 1,
              adults: Number(data.adults || 1),
              children: Number(data.children || 0),
              status: 'Registered',
              amount: 0,
              rawData: data,
            };
          });
        const rowsByGuest = new Map();
        [...reservationRows, ...registeredRows].forEach((row) => {
          const key = row.mobile || row.name || row.id;
          if (!rowsByGuest.has(key)) rowsByGuest.set(key, row);
        });
        const rows = [...rowsByGuest.values()].filter((row) => row.name);
        if (rows.length) {
          setGuests(rows);
          setSelectedGuestId(rows[0].id);
          const selectedRoom = rows[0].room && rows[0].room !== '-' && rooms.some((room) => String(room.number) === String(rows[0].room)) ? rows[0].room : '';
          setForm((current) => ({
            ...current,
            checkInDate: rows[0].checkIn || current.checkInDate,
            checkOutDate: rows[0].checkOut || current.checkOutDate,
            adults: String(rows[0].adults),
            children: String(rows[0].children),
            roomNumber: selectedRoom,
            roomType: rows[0].roomType || current.roomType,
          }));
        } else {
          setGuests([]);
          setSelectedGuestId('');
        }
      });
    return () => { active = false; };
  }, []);

  const guest = guests.find((item) => item.id === selectedGuestId) || guests[0] || null;

  const filteredGuests = useMemo(() => {
    const search = query.trim().toLowerCase();
    const sourceRows = guestMode === 'existing' ? guests : [];
    return sourceRows.filter((item) => !search || [item.name, item.mobile, item.email, item.id, item.room, item.reservationId].some((value) => String(value || '').toLowerCase().includes(search)));
  }, [guestMode, guests, query]);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function selectGuest(id) {
    const selected = guests.find((item) => item.id === id);
    setSelectedGuestId(id);
    if (!selected) return;
    const selectedRoom = selected.room && selected.room !== '-' && availableRooms.some((room) => String(room.number) === String(selected.room)) ? selected.room : '';
    setForm((current) => ({
      ...current,
      checkInDate: selected.checkIn || current.checkInDate,
      checkOutDate: selected.checkOut || current.checkOutDate,
      adults: String(selected.adults || current.adults),
      children: String(selected.children || current.children),
      roomNumber: selectedRoom,
      roomType: selected.roomType || current.roomType,
    }));
    if (selected.room && selected.room !== '-' && !selectedRoom) {
      setMessage(`Room ${selected.room} is already occupied or blocked. Choose another available room.`);
    }
  }

  async function completeCheckIn() {
    if (!guest) {
      setMessage('No guest selected for check-in.');
      return;
    }
    if (!form.roomNumber) {
      setMessage('Assign a room number before completing check-in.');
      return;
    }
    setSaving(true);
    try {
      const room = availableRooms.find((item) => String(item.number) === String(form.roomNumber));
      if (!room) {
        setMessage(`Room ${form.roomNumber} is not available. Choose another room.`);
        setSaving(false);
        return;
      }
      const payload = {
        reservationId: guest.reservationId || guest.id,
        guestName: guest.name,
        mobile: guest.mobile,
        roomNumber: form.roomNumber,
        room: form.roomNumber,
        roomType: form.roomType || room?.roomType || guest.roomType,
        floor: room?.floor || guest.floor,
        checkInDate: form.checkInDate,
        checkOutDate: form.checkOutDate,
        checkInTime: form.checkInTime,
        checkOutTime: form.checkOutTime,
        adults: Number(form.adults || guest.adults || 1),
        children: Number(form.children || guest.children || 0),
        nights: guest.nights,
        idType: form.idType,
        idNumber: form.idNumber,
        requests: form.requests,
        status: 'In-House',
        amount: guest.amount,
      };
      await createModuleRecord('hotel/front-desk/in-house-guests', payload);
      if (guest.recordId && guest.sourceModule === 'hotel/reservations/list') {
        await updateModuleRecord(guest.recordId, { ...guest.rawData, status: 'Checked-in', roomNumber: form.roomNumber, availableRoom: form.roomNumber, roomType: payload.roomType });
      }
      if (room.recordId) {
        await updateModuleRecord(room.recordId, { ...room.rawData, status: 'Occupied', occupancy: guest.name });
      }
      const remainingGuests = guests.filter((item) => item.id !== guest.id);
      const remainingRooms = availableRooms.filter((item) => String(item.number) !== String(form.roomNumber));
      setGuests(remainingGuests);
      setAvailableRooms(remainingRooms);
      setSelectedGuestId(remainingGuests[0]?.id || '');
      setMessage(`${guest.name} checked in to Room ${form.roomNumber}. In-house guest and guest folio are now linked.`);
      if (remainingGuests[0]) {
        const nextRoom = remainingGuests[0].room && remainingGuests[0].room !== '-' && remainingRooms.some((roomItem) => String(roomItem.number) === String(remainingGuests[0].room)) ? remainingGuests[0].room : '';
        setForm((current) => ({
          ...current,
          checkInDate: remainingGuests[0].checkIn || current.checkInDate,
          checkOutDate: remainingGuests[0].checkOut || current.checkOutDate,
          adults: String(remainingGuests[0].adults || current.adults),
          children: String(remainingGuests[0].children || current.children),
          roomNumber: nextRoom,
          roomType: remainingGuests[0].roomType || current.roomType,
        }));
      } else {
        setForm((current) => ({ ...current, roomNumber: '', roomType: '' }));
      }
    } catch (err) {
      setMessage(err.message || 'Unable to complete check-in');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6">
      <PageHeader
        title="Check-in"
        subtitle="Register guest arrival and assign the ready room."
        actions={(
          <>
            <SecondaryButton onClick={() => setMessage('Check-in draft saved.')}>Save Draft</SecondaryButton>
            <PrimaryButton onClick={completeCheckIn} disabled={saving}>
              {saving ? 'Checking in...' : 'Complete Check-in'}
              <ArrowRight size={15} />
            </PrimaryButton>
          </>
        )}
      />

      <div className="mb-4 rounded-lg border border-slate-200 bg-white px-5 py-3">
        <div className="grid grid-cols-4 gap-2">
          {steps.map((step, index) => (
            <div key={step} className="min-w-0">
              <div className="mb-2 flex items-center gap-2">
                <span className={`grid h-7 w-7 place-items-center rounded-full text-[12px] font-bold ${index === 0 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{index + 1}</span>
                <span className="truncate text-[12px] font-semibold text-slate-600">{step}</span>
              </div>
              <div className={`h-1 rounded-full ${index === 0 ? 'bg-blue-600' : 'bg-slate-200'}`} />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr_360px]">
        <Card className="p-4">
          <h2 className="m-0 text-[15px] font-bold text-slate-950">Guest Details</h2>
          <div className="mt-4 flex gap-5 text-[12px] font-semibold text-slate-600">
            <label className="flex items-center gap-2">
              <input type="radio" checked={guestMode === 'existing'} onChange={() => setGuestMode('existing')} />
              Existing Guest
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={guestMode === 'new'} onChange={() => setGuestMode('new')} />
              New Guest
            </label>
          </div>

          <div className="mt-4">
            <Field label="Search Reservation / Guest" required>
              <TextInput icon={Search} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, mobile, email or booking ID" />
            </Field>
          </div>

          <div className="mt-3 space-y-2">
            {filteredGuests.map((item) => (
              <GuestMiniCard key={item.id} guest={item} selected={item.id === selectedGuestId} onClick={() => selectGuest(item.id)} />
            ))}
            {filteredGuests.length === 0 && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-6 text-center text-[13px] text-slate-500">
                {guestMode === 'new' ? 'Register the guest first, then return to complete check-in.' : 'No existing guests or pending reservations available for check-in.'}
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Field label="ID Proof Type" required>
              <SelectDropdown value={form.idType} onChange={(value) => update('idType', value)} options={['Aadhaar Card', 'Passport', 'Driving Licence', 'PAN']} />
            </Field>
            <Field label="ID Proof Number" required>
              <TextInput value={form.idNumber} onChange={(event) => update('idNumber', event.target.value)} />
            </Field>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="m-0 text-[15px] font-bold text-slate-950">Stay Details</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Field label="Check-in Date" required>
              <TextInput value={form.checkInDate} onChange={(event) => update('checkInDate', event.target.value)} />
            </Field>
            <Field label="Check-out Date" required>
              <TextInput value={form.checkOutDate} onChange={(event) => update('checkOutDate', event.target.value)} />
            </Field>
            <Field label="Check-in Time">
              <TextInput value={form.checkInTime} onChange={(event) => update('checkInTime', event.target.value)} />
            </Field>
            <Field label="Check-out Time">
              <TextInput value={form.checkOutTime} onChange={(event) => update('checkOutTime', event.target.value)} />
            </Field>
            <Field label="Adults">
              <TextInput value={form.adults} onChange={(event) => update('adults', event.target.value)} />
            </Field>
            <Field label="Children">
              <TextInput value={form.children} onChange={(event) => update('children', event.target.value)} />
            </Field>
            <Field label="Room Number" required>
              {availableRooms.length > 0 ? (
                <SelectDropdown
                  value={form.roomNumber}
                  onChange={(value) => {
                    const room = availableRooms.find((item) => item.number === value);
                    setForm((current) => ({ ...current, roomNumber: value, roomType: room?.roomType || current.roomType }));
                  }}
                  options={['', ...availableRooms.map((room) => room.number)]}
                />
              ) : (
                <TextInput value={form.roomNumber} onChange={(event) => update('roomNumber', event.target.value)} />
              )}
            </Field>
            <Field label="Room Type">
              <TextInput value={form.roomType} onChange={(event) => update('roomType', event.target.value)} />
            </Field>
            <Field label="Source / Channel">
              <SelectDropdown value={form.source} onChange={(value) => update('source', value)} options={['Walk-in', 'Website', 'Phone', 'OTA', 'Corporate']} />
            </Field>
            <Field label="Company">
              <TextInput value={form.company} onChange={(event) => update('company', event.target.value)} />
            </Field>
          </div>
          <div className="mt-3">
            <Field label="Special Requests">
              <textarea
                value={form.requests}
                onChange={(event) => update('requests', event.target.value)}
                className="min-h-20 w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-blue-500"
              />
            </Field>
          </div>
        </Card>

        <Card className="flex flex-col p-4">
          <h2 className="m-0 text-[15px] font-bold text-slate-950">Next Step</h2>
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-blue-100 text-blue-700">
                <UserCircle2 size={24} />
              </span>
              <div>
                <div className="text-[15px] font-bold text-slate-950">{guest?.name || 'No reservation selected'}</div>
                <div className="text-[12px] text-slate-500">{guest ? `${guest.id} | Room ${form.roomNumber || '-'}` : 'Create a reservation first'}</div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-[12px]">
              <span className="flex items-center gap-2 text-slate-600"><CalendarDays size={14} className="text-blue-600" /> {form.checkInDate || '-'}</span>
              <span className="flex items-center gap-2 text-slate-600"><Building2 size={14} className="text-blue-600" /> {form.roomType || guest?.roomType || '-'}</span>
            </div>
          </div>
          <p className="m-0 mt-4 text-[13px] leading-5 text-slate-500">Select room and rate plan for this reservation, then collect deposit or charge to room folio.</p>
          <PrimaryButton className="mt-4 w-full" onClick={completeCheckIn} disabled={saving}>
            Complete Check-in
            <ArrowRight size={15} />
          </PrimaryButton>
          {message && (
            <div className="mt-4 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] font-semibold text-emerald-700">
              <CheckCircle2 size={15} />
              {message}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
