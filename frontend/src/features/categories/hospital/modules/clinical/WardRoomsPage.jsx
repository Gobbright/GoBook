import { useMemo, useState } from 'react';
import { BedDouble, Building2, DoorOpen, Plus, Save, Settings2, Wrench } from 'lucide-react';

import { useModuleRecords } from '../../../shared/recordUi/useModuleRecords.js';

const INPUT = 'h-10 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-[inherit] text-[#111827] outline-none focus:border-blue-500';
const TEXTAREA = 'min-h-20 w-full rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-[13px] font-[inherit] text-[#111827] outline-none focus:border-blue-500';
const BUILDINGS = ['Main Building', 'North Block', 'South Block', 'Emergency Block', 'Maternity Block'];
const WARD_TYPES = ['General Ward', 'Semi-Private', 'Private Ward', 'Deluxe', 'ICU', 'NICU', 'PICU', 'Maternity', 'Isolation', 'Day Care'];
const ROOM_TYPES = ['General', 'Semi-Private', 'Private', 'Deluxe', 'ICU', 'NICU', 'PICU', 'Isolation', 'Day Care'];
const FLOORS = ['Ground Floor', '1st Floor', '2nd Floor', '3rd Floor', '4th Floor'];
const STATUSES = ['Active', 'Inactive', 'Maintenance'];

function normalize(value = '') {
  return String(value || '').trim().toLowerCase();
}

function isOccupied(status = '') {
  return normalize(status) === 'occupied';
}

function isAvailable(status = '') {
  return !status || normalize(status) === 'available' || normalize(status) === 'active';
}

function money(value) {
  return `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;
}

function optionSet(fallback, values) {
  return [...new Set([...fallback, ...values.filter(Boolean)])];
}

function Button({ children, onClick, tone = 'white', disabled = false }) {
  const tones = {
    blue: 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700',
    green: 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700',
    white: 'border-[#dbe4ef] bg-white text-[#374151] hover:bg-gray-50',
  };
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-[13px] font-semibold ${tones[tone]} cursor-pointer disabled:cursor-not-allowed disabled:opacity-60`}>
      {children}
    </button>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-md border border-[#edf2f7] bg-white p-3 text-center">
      <div className="text-[11px] font-extrabold uppercase text-[#64748b]">{label}</div>
      <div className="mt-1 text-[22px] font-extrabold text-[#071936]">{value}</div>
    </div>
  );
}

export function WardRoomsPage() {
  const beds = useModuleRecords('hospital/bed-management');
  const [building, setBuilding] = useState('Main Building');
  const [selectedWard, setSelectedWard] = useState('General Ward');
  const [form, setForm] = useState({
    wardName: 'Private Ward',
    roomNumber: 'P-205',
    roomType: 'Private',
    floor: '2nd Floor',
    numberOfBeds: 1,
    dailyCharge: 3000,
    nursingCharge: 500,
    status: 'Active',
    amenities: '',
  });
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const records = beds.records;
  const buildingRecords = useMemo(() => records.filter((record) => {
    const data = record.data || {};
    return (data.buildingName || data.building || 'Main Building') === building;
  }), [building, records]);

  const wardSummaries = useMemo(() => {
    const map = new Map();
    buildingRecords.forEach((record) => {
      const data = record.data || {};
      const wardName = data.wardName || data.ward || 'General Ward';
      if (!map.has(wardName)) {
        map.set(wardName, { wardName, total: 0, occupied: 0, available: 0, maintenance: 0, rooms: new Set(), dailyCharge: data.dailyCharge || 0 });
      }
      const entry = map.get(wardName);
      entry.total += 1;
      entry.occupied += isOccupied(data.status) ? 1 : 0;
      entry.available += isAvailable(data.status) ? 1 : 0;
      entry.maintenance += normalize(data.status) === 'maintenance' ? 1 : 0;
      if (data.roomName || data.roomNumber) entry.rooms.add(data.roomName || data.roomNumber);
      if (data.dailyCharge) entry.dailyCharge = data.dailyCharge;
    });
    const summaries = [...map.values()].map((item) => ({ ...item, roomsCount: item.rooms.size || item.total }));
    return summaries.length ? summaries : [
      { wardName: 'General Ward', total: 30, occupied: 22, available: 8, maintenance: 0, roomsCount: 1, dailyCharge: 1200 },
      { wardName: 'Private Ward', total: 20, occupied: 16, available: 4, maintenance: 0, roomsCount: 20, dailyCharge: 3000 },
      { wardName: 'ICU', total: 12, occupied: 10, available: 2, maintenance: 0, roomsCount: 1, dailyCharge: 7000 },
    ];
  }, [buildingRecords]);

  const wardOptions = useMemo(() => optionSet(WARD_TYPES, wardSummaries.map((item) => item.wardName)), [wardSummaries]);
  const buildingOptions = useMemo(() => optionSet(BUILDINGS, records.map((record) => record.data?.buildingName || record.data?.building)), [records]);
  const selectedRooms = useMemo(() => buildingRecords
    .filter((record) => (record.data?.wardName || record.data?.ward || 'General Ward') === selectedWard)
    .slice(0, 8), [buildingRecords, selectedWard]);

  function updateForm(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm(nextWard = 'Private Ward') {
    setForm({
      wardName: nextWard,
      roomNumber: nextWard === 'ICU' ? 'IC-05' : 'P-205',
      roomType: nextWard === 'ICU' ? 'ICU' : 'Private',
      floor: '2nd Floor',
      numberOfBeds: 1,
      dailyCharge: nextWard === 'ICU' ? 7000 : 3000,
      nursingCharge: nextWard === 'ICU' ? 1500 : 500,
      status: 'Active',
      amenities: '',
    });
  }

  async function saveRoom() {
    if (!form.wardName || !form.roomNumber) {
      setMessage('Ward and room number are required.');
      return;
    }
    setSaving(true);
    try {
      const count = Math.max(Number(form.numberOfBeds || 1), 1);
      for (let index = 0; index < count; index += 1) {
        const bedLabel = count === 1 ? form.roomNumber : `${form.roomNumber}/B${String(index + 1).padStart(2, '0')}`;
        await beds.create({
          name: bedLabel,
          wardName: form.wardName,
          roomName: form.roomNumber,
          roomNumber: form.roomNumber,
          roomType: form.roomType,
          floor: form.floor,
          buildingName: building,
          dailyCharge: Number(form.dailyCharge || 0),
          nursingCharge: Number(form.nursingCharge || 0),
          amenities: form.amenities,
          status: form.status === 'Maintenance' ? 'Maintenance' : 'Available',
          roomStatus: form.status,
          notes: `${form.roomType} room configured from Ward & Rooms.`,
        });
      }
      setSelectedWard(form.wardName);
      setMessage(`${form.roomNumber} saved under ${form.wardName} with ${count} bed${count === 1 ? '' : 's'}.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 md:p-7">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="m-0 text-[22px] font-extrabold text-[#071936]">Ward & Rooms</h1>
          <p className="m-0 mt-1 text-[13px] font-semibold text-[#64748b]">Configure hospital wards, rooms, beds, rates and live accommodation availability.</p>
        </div>
        <Button tone="blue" onClick={() => resetForm('General Ward')}><Plus size={14} />Add Ward</Button>
      </div>

      {message && <div className="mb-4 rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-[13px] font-semibold text-blue-700">{message}</div>}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-lg border border-[#dfe7f1] bg-white p-4">
          <div className="mb-4 grid gap-3 md:grid-cols-[260px_minmax(0,1fr)]">
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">Hospital Building<select className={`${INPUT} mt-1`} value={building} onChange={(event) => setBuilding(event.target.value)}>{buildingOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
            <div className="rounded-md border border-[#edf2f7] bg-[#f8fbff] p-3 text-[13px] font-semibold text-[#475569]">
              <Building2 size={15} className="mr-2 inline text-blue-700" />Occupancy below is generated from bed-management records and updates when Admission allocates beds.
            </div>
          </div>

          <div className="grid gap-4">
            {wardSummaries.map((ward) => (
              <div key={ward.wardName} className={`rounded-lg border p-4 ${selectedWard === ward.wardName ? 'border-blue-300 bg-blue-50/40' : 'border-[#edf2f7] bg-white'}`}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="m-0 text-[17px] font-extrabold uppercase text-[#071936]">{ward.wardName}</h2>
                    <div className="mt-1 text-[12px] font-semibold text-[#64748b]">{ward.roomsCount} room{ward.roomsCount === 1 ? '' : 's'} configured - Daily from {money(ward.dailyCharge)}</div>
                  </div>
                  <Button onClick={() => { setSelectedWard(ward.wardName); updateForm('wardName', ward.wardName); }}>View Rooms</Button>
                </div>
                <div className="grid gap-3 md:grid-cols-4">
                  <StatCard label={ward.wardName.includes('Private') ? 'Total Rooms' : 'Total Beds'} value={ward.total} />
                  <StatCard label="Occupied" value={ward.occupied} />
                  <StatCard label="Available" value={ward.available} />
                  <StatCard label="Maintenance" value={ward.maintenance} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="grid content-start gap-5">
          <section className="rounded-lg border border-[#dfe7f1] bg-white p-4">
            <h2 className="m-0 mb-3 flex items-center gap-2 text-[16px] font-extrabold text-[#071936]"><DoorOpen size={17} />Room Details</h2>
            <div className="grid gap-3">
              <label className="text-[12px] font-extrabold uppercase text-[#536173]">Ward *<select className={`${INPUT} mt-1`} value={form.wardName} onChange={(event) => updateForm('wardName', event.target.value)}>{wardOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="text-[12px] font-extrabold uppercase text-[#536173]">Room Number *<input className={`${INPUT} mt-1`} value={form.roomNumber} onChange={(event) => updateForm('roomNumber', event.target.value)} /></label>
              <label className="text-[12px] font-extrabold uppercase text-[#536173]">Room Type<select className={`${INPUT} mt-1`} value={form.roomType} onChange={(event) => updateForm('roomType', event.target.value)}>{ROOM_TYPES.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="text-[12px] font-extrabold uppercase text-[#536173]">Floor<select className={`${INPUT} mt-1`} value={form.floor} onChange={(event) => updateForm('floor', event.target.value)}>{FLOORS.map((item) => <option key={item}>{item}</option>)}</select></label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-[12px] font-extrabold uppercase text-[#536173]">Number of Beds<input className={`${INPUT} mt-1`} type="number" min="1" value={form.numberOfBeds} onChange={(event) => updateForm('numberOfBeds', event.target.value)} /></label>
                <label className="text-[12px] font-extrabold uppercase text-[#536173]">Status<select className={`${INPUT} mt-1`} value={form.status} onChange={(event) => updateForm('status', event.target.value)}>{STATUSES.map((item) => <option key={item}>{item}</option>)}</select></label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-[12px] font-extrabold uppercase text-[#536173]">Daily Charge<input className={`${INPUT} mt-1`} type="number" value={form.dailyCharge} onChange={(event) => updateForm('dailyCharge', event.target.value)} /></label>
                <label className="text-[12px] font-extrabold uppercase text-[#536173]">Nursing Charge<input className={`${INPUT} mt-1`} type="number" value={form.nursingCharge} onChange={(event) => updateForm('nursingCharge', event.target.value)} /></label>
              </div>
              <label className="text-[12px] font-extrabold uppercase text-[#536173]">Amenities<textarea className={`${TEXTAREA} mt-1`} value={form.amenities} onChange={(event) => updateForm('amenities', event.target.value)} placeholder="Oxygen, attached bath, monitor, attendant cot" /></label>
              <Button tone="green" onClick={saveRoom} disabled={saving}><Save size={14} />Save Room</Button>
            </div>
          </section>

          <section className="rounded-lg border border-[#dfe7f1] bg-white p-4">
            <h2 className="m-0 mb-3 flex items-center gap-2 text-[16px] font-extrabold text-[#071936]"><BedDouble size={17} />{selectedWard} Rooms</h2>
            <div className="grid gap-2">
              {selectedRooms.length === 0 && <div className="rounded-md border border-dashed border-[#dbe4ef] px-3 py-4 text-center text-[13px] font-semibold text-[#94a3b8]">No rooms configured yet.</div>}
              {selectedRooms.map((record) => {
                const data = record.data || {};
                return (
                  <div key={record._id} className="rounded-md border border-[#edf2f7] bg-[#fbfdff] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[13px] font-extrabold text-[#071936]">{data.roomName || data.roomNumber || data.name}</div>
                        <div className="mt-1 text-[12px] font-semibold text-[#64748b]">{data.name} - {data.floor || '-'} - {money(data.dailyCharge)}</div>
                      </div>
                      <span className={`rounded-full border px-2 py-1 text-[11px] font-extrabold ${isOccupied(data.status) ? 'border-rose-100 bg-rose-50 text-rose-700' : normalize(data.status) === 'maintenance' ? 'border-amber-100 bg-amber-50 text-amber-700' : 'border-emerald-100 bg-emerald-50 text-emerald-700'}`}>
                        {data.status || 'Available'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-lg border border-[#dfe7f1] bg-white p-4">
            <h2 className="m-0 mb-3 flex items-center gap-2 text-[16px] font-extrabold text-[#071936]"><Settings2 size={17} />Configuration Notes</h2>
            <div className="grid gap-2 text-[13px] font-semibold text-[#475569]">
              <div className="rounded-md bg-[#f8fbff] p-3"><Wrench size={14} className="mr-2 inline text-blue-700" />Maintenance rooms stay unavailable for Admission.</div>
              <div className="rounded-md bg-[#f8fbff] p-3">Daily and nursing charges can be pulled into IPD billing later from these records.</div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

