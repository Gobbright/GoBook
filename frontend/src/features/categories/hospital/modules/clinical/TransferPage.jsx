import { useMemo, useState } from 'react';
import { ArrowDown, ArrowRightLeft, BedDouble, Clock3, Search } from 'lucide-react';

import { useModuleRecords } from '../../../shared/recordUi/useModuleRecords.js';
import { todayISO } from '../../../shared/recordUi/dateUtils.js';

const INPUT = 'h-10 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-[inherit] text-[#111827] outline-none focus:border-blue-500';
const TEXTAREA = 'min-h-20 w-full rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-[13px] font-[inherit] text-[#111827] outline-none focus:border-blue-500';
const REASONS = ['Patient requested private room', 'Doctor advised ICU care', 'ICU step-down', 'Clinical isolation required', 'Maintenance/cleaning', 'Bed consolidation', 'Other'];
const TRANSFER_TYPES = ['Bed to Bed', 'Room to Room', 'Ward to Ward', 'Ward to ICU', 'ICU to Ward', 'Branch Transfer'];

function normalize(value = '') {
  return String(value || '-').trim().toLowerCase();
}

function money(value) {
  return `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;
}

function isActiveIpd(status = '') {
  return !['draft', 'discharged', 'cancelled'].includes(normalize(status));
}

function isAvailable(status = '') {
  return ['available', 'reserved'].includes(normalize(status || 'Available'));
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

function nowTime() {
  return new Date().toTimeString().slice(0, 5);
}

function dateTimeLabel(date, time) {
  return `${date} ${time}`;
}

function displayDateTime(value = '') {
  if (!value) return 'Discharge';
  const [date, time] = String(value).split(' ');
  if (!date) return value;
  const d = new Date(date);
  const datePart = Number.isNaN(d.getTime()) ? date : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  return [datePart, time].filter(Boolean).join(' ');
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

export function TransferPage() {
  const admissions = useModuleRecords('hospital/ipd-admissions');
  const beds = useModuleRecords('hospital/bed-management');
  const procedures = useModuleRecords('hospital/procedures');
  const [search, setSearch] = useState('');
  const [selectedAdmissionId, setSelectedAdmissionId] = useState('');
  const [newWard, setNewWard] = useState('Private Ward');
  const [newRoom, setNewRoom] = useState('P-205');
  const [newBedId, setNewBedId] = useState('');
  const [transferDate, setTransferDate] = useState(todayISO());
  const [transferTime, setTransferTime] = useState('18:30');
  const [reason, setReason] = useState('Patient requested private room');
  const [transferType, setTransferType] = useState('Ward to Ward');
  const [doctorApproval, setDoctorApproval] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const admissionRecords = admissions.records;
  const bedRecords = beds.records;
  const activeAdmissions = useMemo(() => admissionRecords.filter((record) => isActiveIpd(record.data?.status)), [admissionRecords]);
  const patientOptions = useMemo(() => {
    const q = normalize(search);
    const source = q ? activeAdmissions.filter((record) => normalize([
      record.data?.patientName,
      record.data?.patientId,
      record.data?.ipdNo,
      record.data?.admissionNo,
      record.data?.patientPhone,
    ].filter(Boolean).join(' ')).includes(q)) : activeAdmissions;
    return source.slice(0, 8);
  }, [activeAdmissions, search]);

  const selectedAdmission = activeAdmissions.find((record) => record._id === selectedAdmissionId) || patientOptions[0] || activeAdmissions[0] || null;
  const data = useMemo(() => selectedAdmission?.data || {}, [selectedAdmission]);
  const currentBed = useMemo(() => bedRecords.find((record) => {
    const bed = record.data || {};
    const ipdNo = data.ipdNo || data.admissionNo;
    return (ipdNo && bed.ipdNo === ipdNo) || (
      (bed.wardName || bed.ward) === data.wardName
      && roomName(bed) === data.roomName
      && bedName(bed) === data.bedNumber
    );
  }) || null, [bedRecords, data]);

  const wardOptions = useMemo(() => [...new Set(bedRecords.map((record) => record.data?.wardName || record.data?.ward).filter(Boolean))], [bedRecords]);
  const roomOptions = useMemo(() => [...new Set(bedRecords
    .filter((record) => (record.data?.wardName || record.data?.ward) === newWard)
    .map((record) => roomName(record.data)).filter(Boolean))], [bedRecords, newWard]);
  const availableBeds = useMemo(() => bedRecords.filter((record) => {
    const bed = record.data || {};
    return (bed.wardName || bed.ward) === newWard && roomName(bed) === newRoom && isAvailable(bed.status);
  }), [bedRecords, newRoom, newWard]);
  const selectedBed = availableBeds.find((record) => record._id === newBedId) || availableBeds[0] || null;
  const selectedBedData = selectedBed?.data || {};
  const currentRate = Number(data.dailyRoomCharge || currentBed?.data?.dailyCharge || 1500);
  const currentNursing = Number(data.nursingCharge || currentBed?.data?.nursingCharge || 300);
  const newRate = Number(selectedBedData.dailyCharge || 3000);
  const newNursing = Number(selectedBedData.nursingCharge || 500);
  const bedHistory = Array.isArray(data.bedHistory) && data.bedHistory.length ? data.bedHistory : [
    {
      from: data.allocationDate ? dateTimeLabel(data.allocationDate, data.allocationTime || '10:00') : dateTimeLabel(todayISO(), '10:00'),
      to: '',
      wardName: data.wardName || 'General Ward',
      roomName: data.roomName || 'G-201',
      bedNumber: data.bedNumber || 'B01',
      rate: currentRate,
      nursingCharge: currentNursing,
    },
  ];

  function selectAdmission(record) {
    setSelectedAdmissionId(record._id);
    setSearch(record.data?.patientName || '-');
  }

  async function transferPatient() {
    if (!selectedBed || !isAvailable(selectedBedData.status)) {
      setMessage('Select an available destination bed before transfer.');
      return;
    }
    const transferAt = dateTimeLabel(transferDate, transferTime);
    const closedHistory = bedHistory.map((entry, index) => (
      index === bedHistory.length - 1 ? { ...entry, to: transferAt } : entry
    ));
    const nextHistory = [
      ...closedHistory,
      {
        from: transferAt,
        to: '',
        wardName: newWard,
        roomName: newRoom,
        bedNumber: bedName(selectedBedData),
        rate: newRate,
        nursingCharge: newNursing,
        reason,
        transferType,
      },
    ];

    setSaving(true);
    try {
      if (currentBed) {
        await beds.update(currentBed._id, {
          ...currentBed.data,
          status: 'Cleaning',
          patientName: '',
          patientId: '',
          ipdNo: '',
          lastReleasedAt: transferAt,
        });
      }
      if (selectedBed._id) {
        await beds.update(selectedBed._id, {
          ...selectedBedData,
          status: 'Occupied',
          patientName: data.patientName || '-',
          patientId: data.patientId || '-',
          ipdNo: data.ipdNo || data.admissionNo || '-',
          allocationDate: transferDate,
          allocationTime: transferTime,
        });
      }
      if (selectedAdmission._id) {
        await admissions.update(selectedAdmission._id, {
          ...data,
          wardName: newWard,
          roomName: newRoom,
          bedNumber: bedName(selectedBedData),
          dailyRoomCharge: newRate,
          nursingCharge: newNursing,
          bedHistory: nextHistory,
          lastTransferAt: transferAt,
          transferReason: reason,
          transferType,
          doctorApproval,
          notes,
          status: 'Bed Allocated',
        });
      }
      await procedures.create({
        name: `Bed transfer to ${newRoom}/${bedName(selectedBedData)}`,
        procedure: `Bed transfer - ${newWard}`,
        patientName: data.patientName || '-',
        patientId: data.patientId || '-',
        ipdNo: data.ipdNo || data.admissionNo || '-',
        department: 'IPD',
        date: transferDate,
        charge: newRate + newNursing,
        roomCharge: newRate,
        nursingCharge: newNursing,
        status: 'Completed',
        billingStatus: 'Pending',
        source: 'IPD Bed Transfer',
        notes: `Old rate preserved in bed history. ${reason}`,
      });
      setMessage(`${data.patientName || 'Patient'} transferred to ${newWard} / ${newRoom} / ${bedName(selectedBedData)}. Previous bed moved to Cleaning and new rate starts from ${transferAt}.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 md:p-7">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="m-0 text-[22px] font-extrabold text-[#071936]">Patient Transfer</h1>
          <p className="m-0 mt-1 text-[13px] font-semibold text-[#64748b]">Move admitted patients across beds, rooms, wards or ICU while preserving rate history.</p>
        </div>
        <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-[13px] font-extrabold text-blue-700">{availableBeds.length} destination beds available</div>
      </div>

      {message && <div className="mb-4 rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-[13px] font-semibold text-blue-700">{message}</div>}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-lg border border-[#dfe7f1] bg-white p-4">
          <div className="relative">
            <label className="mb-1 block text-[12px] font-extrabold uppercase text-[#536173]">Patient</label>
            <div className="flex items-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-3">
              <Search size={15} className="text-[#64748b]" />
              <input className="h-10 min-w-0 flex-1 border-0 bg-transparent text-[13px] font-[inherit] outline-none" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search IPD No / Patient" />
            </div>
            {search && (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-md border border-[#dbe4ef] bg-white p-1 shadow-lg">
                {patientOptions.map((record) => (
                  <button key={record._id} type="button" onClick={() => selectAdmission(record)} className="flex w-full items-center justify-between gap-3 rounded px-3 py-2 text-left text-[13px] hover:bg-blue-50">
                    <span><strong>{record.data?.patientName || 'Patient'}</strong><span className="ml-2 text-[#64748b]">{record.data?.ipdNo || record.data?.admissionNo || '-'}</span></span>
                    <span className="text-[#64748b]">{record.data?.wardName || '-'}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 rounded-md border border-[#edf2f7] bg-[#f8fbff] p-4 text-[14px] font-extrabold text-[#071936]">
            {data.patientName || '-'} - {data.ipdNo || data.admissionNo || '-'}
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_70px_minmax(0,1fr)]">
            <section className="rounded-lg border border-[#dfe7f1] bg-white p-4">
              <h2 className="m-0 mb-3 text-[13px] font-extrabold uppercase text-[#071936]">Current Location</h2>
              <div className="grid gap-2 text-[13px] font-semibold text-[#334155]">
                <div>{data.wardName || 'General Ward'}</div>
                <div>Room {data.roomName || 'G-201'}</div>
                <div>Bed {data.bedNumber || 'B01'}</div>
                <div className="pt-2 text-[16px] font-extrabold text-[#071936]">{money(currentRate)} / Day</div>
                <div className="text-[12px] text-[#64748b]">Nursing {money(currentNursing)} / Day</div>
              </div>
            </section>

            <div className="flex items-center justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-blue-700"><ArrowDown size={22} /></div>
            </div>

            <section className="rounded-lg border border-[#dfe7f1] bg-white p-4">
              <h2 className="m-0 mb-3 text-[13px] font-extrabold uppercase text-[#071936]">New Location</h2>
              <div className="grid gap-3">
                <label className="text-[12px] font-extrabold uppercase text-[#536173]">Ward *<select className={`${INPUT} mt-1`} value={newWard} onChange={(event) => { setNewWard(event.target.value); setNewBedId(''); }}><option value="">Select Ward</option>{wardOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label className="text-[12px] font-extrabold uppercase text-[#536173]">Room *<select className={`${INPUT} mt-1`} value={newRoom} onChange={(event) => { setNewRoom(event.target.value); setNewBedId(''); }}><option value="">Select Room</option>{roomOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label className="text-[12px] font-extrabold uppercase text-[#536173]">Bed *<select className={`${INPUT} mt-1`} value={selectedBed?._id || '-'} onChange={(event) => setNewBedId(event.target.value)}><option value="">Select Available Bed</option>{availableBeds.map((record) => <option key={record._id} value={record._id}>{bedName(record.data)} - {record.data?.status || 'Available'}</option>)}</select></label>
                <div className="rounded-md border border-emerald-100 bg-emerald-50 p-3 text-[13px] font-bold text-emerald-800">New Rate: {money(newRate)} / Day + {money(newNursing)} nursing</div>
              </div>
            </section>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">Transfer Type<select className={`${INPUT} mt-1`} value={transferType} onChange={(event) => setTransferType(event.target.value)}>{TRANSFER_TYPES.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">Transfer Date<input className={`${INPUT} mt-1`} type="date" value={transferDate} onChange={(event) => setTransferDate(event.target.value)} /></label>
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">Transfer Time<input className={`${INPUT} mt-1`} type="time" value={transferTime} onChange={(event) => setTransferTime(event.target.value)} /></label>
            <label className="md:col-span-2 text-[12px] font-extrabold uppercase text-[#536173]">Reason *<select className={`${INPUT} mt-1`} value={reason} onChange={(event) => setReason(event.target.value)}>{REASONS.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">Doctor Approval<input className={`${INPUT} mt-1`} value={doctorApproval} onChange={(event) => setDoctorApproval(event.target.value)} placeholder="Approving doctor" /></label>
            <label className="md:col-span-2 xl:col-span-3 text-[12px] font-extrabold uppercase text-[#536173]">Notes<textarea className={`${TEXTAREA} mt-1`} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
          </div>

          <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-[#edf2f7] pt-4">
            <Button onClick={() => window.location.assign('/hospital/inpatients')}>Cancel</Button>
            <Button tone="green" onClick={transferPatient} disabled={!selectedBed || saving}><ArrowRightLeft size={14} />Transfer Patient</Button>
          </div>
        </section>

        <aside className="grid content-start gap-5">
          <section className="rounded-lg border border-[#dfe7f1] bg-white p-4">
            <h2 className="m-0 mb-3 flex items-center gap-2 text-[16px] font-extrabold text-[#071936]"><BedDouble size={17} />Bed History</h2>
            <div className="grid gap-3">
              {bedHistory.map((entry, index) => (
                <div key={`${entry.from}-${index}`} className="rounded-md border border-[#edf2f7] bg-[#fbfdff] p-3">
                  <div className="mb-2 flex items-center gap-2 text-[12px] font-extrabold text-[#64748b]"><Clock3 size={14} />{displayDateTime(entry.from)} - {displayDateTime(entry.to)}</div>
                  <div className="text-[13px] font-extrabold text-[#071936]">{entry.wardName} / {entry.roomName} / {entry.bedNumber}</div>
                  <div className="mt-1 text-[12px] font-semibold text-[#475569]">{money(entry.rate)} / day + {money(entry.nursingCharge)} nursing</div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-[#dfe7f1] bg-white p-4">
            <h2 className="m-0 mb-3 text-[16px] font-extrabold text-[#071936]">Billing Behavior</h2>
            <div className="grid gap-2 text-[13px] font-semibold text-[#475569]">
              <div className="rounded-md bg-blue-50 p-3 text-blue-800">Old bed rate is closed at transfer time. New rate starts from the transfer timestamp.</div>
              <div className="rounded-md bg-emerald-50 p-3 text-emerald-800">A pending IPD transfer charge is created for New Bill.</div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}


