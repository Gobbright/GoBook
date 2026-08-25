import { useMemo, useState } from 'react';
import { BedDouble, CalendarClock, IndianRupee, Search, UserRound, X } from 'lucide-react';

import { useModuleRecords } from '../../../shared/recordUi/useModuleRecords.js';
import { todayISO } from '../../../shared/recordUi/dateUtils.js';

const INPUT = 'h-10 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-[inherit] text-[#111827] outline-none focus:border-blue-500';
const BED_STATUSES = ['Available', 'Reserved', 'Occupied', 'Cleaning', 'Maintenance', 'Blocked'];

function normalize(value = '') {
  return String(value || '-').trim().toLowerCase();
}

function statusOf(value = '') {
  const status = String(value || 'Available').trim();
  return BED_STATUSES.find((item) => normalize(item) === normalize(status)) || 'Available';
}

function isAllocatable(status = '') {
  return ['Available', 'Reserved'].includes(statusOf(status));
}

function money(value) {
  return `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;
}

function displayIpd(value = '') {
  const n = String(value || '-').match(/(\d{3,})$/)?.[1];
  return n ? `IPD-${n.slice(-4)}` : value;
}

function bedName(data = {}) {
  const raw = data.bedNumber || data.name || data.bed || 'B01';
  const parts = String(raw).split('/');
  return parts[parts.length - 1] || raw;
}

function roomName(data = {}) {
  if (data.roomName || data.roomNumber || data.room) return data.roomName || data.roomNumber || data.room;
  const raw = String(data.name || '-');
  return raw.includes('/') ? raw.split('/')[0] : 'G-201';
}

function optionSet(values, fallback) {
  return [...new Set([...values.filter(Boolean), ...fallback])];
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

function statusClass(status) {
  const normalized = statusOf(status);
  if (normalized === 'Available') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (normalized === 'Occupied') return 'border-blue-200 bg-blue-50 text-blue-800';
  if (normalized === 'Reserved') return 'border-violet-200 bg-violet-50 text-violet-800';
  if (normalized === 'Cleaning') return 'border-amber-200 bg-amber-50 text-amber-800';
  if (normalized === 'Maintenance') return 'border-rose-200 bg-rose-50 text-rose-800';
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

function LegendDot({ status }) {
  const colors = {
    Available: 'bg-emerald-500',
    Occupied: 'bg-blue-600',
    Reserved: 'bg-violet-500',
    Cleaning: 'bg-amber-500',
    Maintenance: 'bg-rose-500',
    Blocked: 'bg-slate-500',
  };
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${colors[status]}`} />;
}

export function BedAllocationPage() {
  const beds = useModuleRecords('hospital/bed-management');
  const admissions = useModuleRecords('hospital/ipd-admissions');
  const procedures = useModuleRecords('hospital/procedures');
  const [ward, setWard] = useState('General Ward');
  const [floor, setFloor] = useState('2nd Floor');
  const [selectedBedId, setSelectedBedId] = useState('');
  const [selectedAdmissionId, setSelectedAdmissionId] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const bedRecords = beds.records;
  const admissionRecords = admissions.records;
  const wardOptions = useMemo(() => optionSet(bedRecords.map((record) => record.data?.wardName || record.data?.ward), ['General Ward', 'Private Ward', 'ICU']), [bedRecords]);
  const floorOptions = useMemo(() => optionSet(bedRecords.map((record) => record.data?.floor), ['Ground Floor', '1st Floor', '2nd Floor', '3rd Floor']), [bedRecords]);

  const filteredBeds = useMemo(() => bedRecords.filter((record) => {
    const data = record.data || {};
    return (data.wardName || data.ward || 'General Ward') === ward && (data.floor || '2nd Floor') === floor;
  }), [bedRecords, floor, ward]);

  const rooms = useMemo(() => {
    const map = new Map();
    filteredBeds.forEach((record) => {
      const room = roomName(record.data);
      if (!map.has(room)) map.set(room, []);
      map.get(room).push(record);
    });
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filteredBeds]);

  const waitingAdmissions = useMemo(() => admissionRecords.filter((record) => {
    const data = record.data || {};
    const status = normalize(data.status);
    return !['discharged', 'draft'].includes(status) && !(data.bedNumber && data.status === 'Bed Allocated');
  }), [admissionRecords]);

  const selectedBed = filteredBeds.find((record) => record._id === selectedBedId) || null;
  const selectedAdmission = admissionRecords.find((record) => record._id === selectedAdmissionId) || waitingAdmissions[0] || null;
  const selectedBedData = selectedBed?.data || {};
  const selectedAdmissionData = selectedAdmission?.data || {};
  const canConfirm = selectedBed && isAllocatable(selectedBedData.status) && selectedAdmission;

  async function openAllocate(record) {
    setSelectedBedId(record._id);
    setSelectedAdmissionId((waitingAdmissions[0] || selectedAdmission)?._id || '-');
    setMessage('');
  }

  async function confirmAllocation() {
    if (!canConfirm) {
      setMessage('Select an available or reserved bed and an admitted patient.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...selectedBedData,
        status: 'Occupied',
        patientName: selectedAdmissionData.patientName || '-',
        patientId: selectedAdmissionData.patientId || '-',
        ipdNo: selectedAdmissionData.ipdNo || selectedAdmissionData.admissionNo || '-',
        allocationDate: todayISO(),
        allocationTime: new Date().toTimeString().slice(0, 5),
      };
      await beds.update(selectedBed._id, payload);
      if (selectedAdmission) {
        await admissions.update(selectedAdmission._id, {
          ...selectedAdmissionData,
          wardName: selectedBedData.wardName || ward,
          roomName: roomName(selectedBedData),
          bedNumber: bedName(selectedBedData),
          dailyRoomCharge: Number(selectedBedData.dailyCharge || 0),
          nursingCharge: Number(selectedBedData.nursingCharge || 0),
          status: 'Bed Allocated',
        });
      }
      await procedures.create({
        name: `Bed ${bedName(selectedBedData)} daily room charge`,
        procedure: `Bed ${bedName(selectedBedData)} daily room charge`,
        patientName: selectedAdmissionData.patientName || '-',
        patientId: selectedAdmissionData.patientId || '-',
        ipdNo: selectedAdmissionData.ipdNo || selectedAdmissionData.admissionNo || '-',
        department: 'IPD',
        date: todayISO(),
        charge: Number(selectedBedData.dailyCharge || 0) + Number(selectedBedData.nursingCharge || 0),
        roomCharge: Number(selectedBedData.dailyCharge || 0),
        nursingCharge: Number(selectedBedData.nursingCharge || 0),
        status: 'Completed',
        billingStatus: 'Pending',
        source: 'IPD Bed Allocation',
      });
      setMessage(`${selectedAdmissionData.patientName || 'Patient'} allocated to ${ward} / ${roomName(selectedBedData)} / ${bedName(selectedBedData)}. Daily IPD charge is pending for billing.`);
      setSelectedBedId('');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 md:p-7">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="m-0 text-[22px] font-extrabold text-[#071936]">Bed Allocation</h1>
          <p className="m-0 mt-1 text-[13px] font-semibold text-[#64748b]">Live bed board with ward, floor, room status and IPD allocation.</p>
        </div>
        <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-[13px] font-extrabold text-blue-700">{filteredBeds.filter((record) => isAllocatable(record.data?.status)).length} beds allocatable</div>
      </div>

      {message && <div className="mb-4 rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-[13px] font-semibold text-blue-700">{message}</div>}

      <section className="rounded-lg border border-[#dfe7f1] bg-white p-4">
        <div className="grid gap-3 md:grid-cols-[220px_220px_minmax(0,1fr)]">
          <label className="text-[12px] font-extrabold uppercase text-[#536173]">Ward<select className={`${INPUT} mt-1`} value={ward} onChange={(event) => setWard(event.target.value)}>{wardOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="text-[12px] font-extrabold uppercase text-[#536173]">Floor<select className={`${INPUT} mt-1`} value={floor} onChange={(event) => setFloor(event.target.value)}>{floorOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
          <div className="rounded-md border border-[#edf2f7] bg-[#f8fbff] p-3">
            <div className="mb-2 text-[12px] font-extrabold uppercase text-[#536173]">Legend</div>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-[12px] font-bold text-[#334155]">
              {BED_STATUSES.slice(0, 5).map((item) => <span key={item} className="inline-flex items-center gap-1.5"><LegendDot status={item} />{item}</span>)}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-5">
          {rooms.map(([room, roomBeds]) => (
            <div key={room} className="rounded-lg border border-[#edf2f7] bg-[#fbfdff] p-4">
              <h2 className="m-0 mb-4 text-[15px] font-extrabold uppercase text-[#071936]">Room {room}</h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {roomBeds.map((record) => {
                  const data = record.data || {};
                  const currentStatus = statusOf(data.status);
                  return (
                    <div key={record._id} className={`min-h-[150px] rounded-lg border p-4 ${statusClass(currentStatus)}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-[18px] font-extrabold">{bedName(data)}</div>
                        <BedDouble size={18} />
                      </div>
                      <div className="mt-3 text-[12px] font-extrabold uppercase">{currentStatus}</div>
                      <div className="mt-3 min-h-10 text-[13px] font-semibold">
                        {currentStatus === 'Occupied' ? (
                          <>
                            <div>{data.patientName || 'Patient'}</div>
                            <div className="mt-1">{displayIpd(data.ipdNo)}</div>
                          </>
                        ) : currentStatus === 'Available' || currentStatus === 'Reserved' ? (
                          <Button onClick={() => openAllocate(record)} tone={currentStatus === 'Available' ? 'green' : 'white'}>Allocate</Button>
                        ) : <span>{currentStatus === 'Cleaning' ? 'Housekeeping in progress' : 'Not allocatable'}</span>}
                      </div>
                      <div className="mt-3 border-t border-current/20 pt-2 text-[11px] font-bold">{money(data.dailyCharge)} / day + {money(data.nursingCharge)} nursing</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {rooms.length === 0 && <div className="rounded-md border border-dashed border-[#dbe4ef] px-3 py-10 text-center text-[13px] font-semibold text-[#94a3b8]">No beds configured for this ward and floor.</div>}
        </div>
      </section>

      {selectedBed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <section className="w-full max-w-xl rounded-lg bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="m-0 text-[20px] font-extrabold text-[#071936]">Allocate Bed</h2>
                <p className="m-0 mt-1 text-[13px] font-semibold text-[#64748b]">Confirm IPD patient, bed charges and allocation time.</p>
              </div>
              <button type="button" onClick={() => setSelectedBedId('')} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#dbe4ef] bg-white text-[#374151] hover:bg-gray-50"><X size={16} /></button>
            </div>

            <div className="grid gap-4">
              <label className="text-[12px] font-extrabold uppercase text-[#536173]">Patient<select className={`${INPUT} mt-1`} value={selectedAdmissionId} onChange={(event) => setSelectedAdmissionId(event.target.value)}>
                {waitingAdmissions.map((record) => <option key={record._id} value={record._id}>{record.data?.patientName || 'Patient'} - {record.data?.ipdNo || record.data?.admissionNo || 'IPD'}</option>)}
                {waitingAdmissions.length === 0 && <option value={selectedAdmission?._id}>{selectedAdmissionData.patientName || '-'} - {selectedAdmissionData.ipdNo || '-'}</option>}
              </select></label>

              <div className="rounded-md border border-[#edf2f7] bg-[#f8fbff] p-4">
                <div className="mb-3 flex items-center gap-2 text-[14px] font-extrabold text-[#071936]"><UserRound size={16} />{selectedAdmissionData.patientName || '-'} - {selectedAdmissionData.ipdNo || '-'}</div>
                <div className="grid gap-2 text-[13px] font-semibold text-[#334155]">
                  <div className="flex justify-between"><span>Selected Bed</span><strong>{ward} / {roomName(selectedBedData)} / {bedName(selectedBedData)}</strong></div>
                  <div className="flex justify-between"><span>Daily Room Charge</span><strong>{money(selectedBedData.dailyCharge)}</strong></div>
                  <div className="flex justify-between"><span>Nursing Charge</span><strong>{money(selectedBedData.nursingCharge)}</strong></div>
                  <div className="flex justify-between"><span>Status</span><strong>{statusOf(selectedBedData.status)}</strong></div>
                </div>
              </div>

              <div className="rounded-md border border-[#edf2f7] bg-white p-4">
                <div className="flex items-center gap-2 text-[13px] font-bold text-[#334155]"><CalendarClock size={16} />Allocation Date/Time</div>
                <div className="mt-2 text-[15px] font-extrabold text-[#071936]">{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} - {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                <div className="mt-3 flex items-center gap-2 rounded-md border border-emerald-100 bg-emerald-50 p-3 text-[12px] font-bold text-emerald-800"><IndianRupee size={15} />This creates a pending IPD billing charge automatically.</div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-[#edf2f7] pt-4">
              <Button onClick={() => setSelectedBedId('')}>Cancel</Button>
              <Button tone="green" onClick={confirmAllocation} disabled={!canConfirm || saving}>Confirm Allocation</Button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}


