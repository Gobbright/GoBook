import { useMemo, useState } from 'react';
import { Bed, ClipboardList, Plus, UserCheck } from 'lucide-react';

import { names, useLookupRecords, useModuleRecords } from '../../../shared/recordUi/useModuleRecords.js';
import { todayISO } from '../../../shared/recordUi/dateUtils.js';

const INPUT = 'h-10 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-[inherit] text-[#111827] outline-none focus:border-blue-500';
const TEXTAREA = 'min-h-20 w-full rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-[13px] font-[inherit] text-[#111827] outline-none focus:border-blue-500';
const WARDS = ['General Ward', 'Private Ward', 'ICU', 'NICU', 'PICU', 'Maternity', 'Emergency'];
const SHIFTS = {
  Morning: ['06:00 AM', '02:00 PM'],
  Evening: ['02:00 PM', '10:00 PM'],
  Night: ['10:00 PM', '06:00 AM'],
};
const RESPONSIBILITIES = ['Primary Nurse', 'Supporting Nurse', 'Medication Nurse', 'Procedure Nurse'];

function normalize(value = '') {
  return String(value || '-').trim().toLowerCase();
}

function Button({ children, icon: Icon, onClick, tone = 'white', disabled = false }) {
  const tones = {
    blue: 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700',
    white: 'border-[#dbe4ef] bg-white text-[#374151] hover:bg-gray-50',
  };
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-[13px] font-semibold ${tones[tone]} font-[inherit] transition disabled:opacity-60`}>
      {Icon && <Icon size={15} />}
      {children}
    </button>
  );
}

function activeAdmission(record) {
  return !['discharged', 'cancelled'].includes(normalize(record.data?.status));
}

export function PatientAssignmentPage() {
  const nursingCare = useModuleRecords('hospital/nursing-care');
  const admissions = useModuleRecords('hospital/ipd-admissions');
  const nurses = useLookupRecords('hospital/nurses');
  const [ward, setWard] = useState('General Ward');
  const [shift, setShift] = useState('Morning');
  const [date, setDate] = useState(todayISO());
  const [showAssign, setShowAssign] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [form, setForm] = useState({ nurseName: '', responsibility: 'Primary Nurse', notes: '' });
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const patientRecords = useMemo(() => admissions.records.filter(activeAdmission), [admissions.records]);
  const assignmentRecords = useMemo(() => (
    nursingCare.records.filter((record) => record.data?.type === 'Patient Assignment')
  ), [nursingCare.records]);
  const nurseOptions = useMemo(() => {
    const existing = names(nurses.records);
    const assigned = assignmentRecords.map((record) => record.data?.nurseName).filter(Boolean);
    return [...new Set([...existing, ...assigned].filter(Boolean))];
  }, [assignmentRecords, nurses.records]);

  const wardPatients = useMemo(() => patientRecords.filter((record) => (record.data?.wardName || record.data?.ward) === ward), [patientRecords, ward]);
  const filteredAssignments = useMemo(() => assignmentRecords.filter((record) => (
    record.data?.wardName === ward && record.data?.shift === shift && record.data?.date === date
  )), [assignmentRecords, date, shift, ward]);
  const grouped = useMemo(() => {
    const map = new Map();
    filteredAssignments.forEach((record) => {
      const nurseName = record.data?.nurseName || 'Unassigned Nurse';
      if (!map.has(nurseName)) map.set(nurseName, []);
      map.get(nurseName).push(record);
    });
    return [...map.entries()];
  }, [filteredAssignments]);
  const selectedPatient = wardPatients.find((record) => record._id === selectedPatientId) || wardPatients[0] || null;

  function openAssign(patientRecord = selectedPatient) {
    setSelectedPatientId(patientRecord?._id || '');
    setForm((current) => ({ ...current, nurseName: nurseOptions[0] || '' }));
    setShowAssign(true);
    setTimeout(() => document.getElementById('assign-patient-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  }

  async function assignPatient() {
    const data = selectedPatient?.data || {};
    if (!form.nurseName || !data.patientName) {
      setMessage('Select patient and nurse before assigning.');
      return;
    }
    const alreadyAssigned = nursingCare.records.some((record) => record.data?.type === 'Patient Assignment'
      && record.data?.ipdNo === (data.ipdNo || data.admissionNo)
      && record.data?.date === date
      && record.data?.shift === shift
      && normalize(record.data?.status || 'Assigned') !== 'cancelled');
    if (alreadyAssigned) {
      setMessage(`${data.patientName} already has a nurse assigned for ${shift}.`);
      return;
    }
    setSaving(true);
    try {
      await nursingCare.create({
        type: 'Patient Assignment',
        name: `${data.patientName} assigned to ${form.nurseName}`,
        nurseName: form.nurseName,
        patientName: data.patientName,
        patientId: data.patientId,
        ipdNo: data.ipdNo || data.admissionNo,
        wardName: data.wardName || data.ward,
        roomName: data.roomName || data.room,
        bedNumber: data.bedNumber,
        condition: data.condition || data.conditionAtAdmission || 'Stable',
        shift,
        date,
        responsibility: form.responsibility,
        fromTime: `${date} ${SHIFTS[shift][0]}`,
        toTime: `${date} ${SHIFTS[shift][1]}`,
        notes: form.notes,
        status: 'Assigned',
      });
      setShowAssign(false);
      setMessage(`${data.patientName} assigned to ${form.nurseName}.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 md:p-7">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="m-0 text-[24px] font-extrabold text-[#071936]">Patient Assignment</h1>
          <p className="m-0 mt-1 text-[13px] font-semibold text-[#64748b]">Ward board for IPD nursing responsibility by shift.</p>
        </div>
        <Button icon={Plus} tone="blue" onClick={() => openAssign()}>Assign Patient</Button>
      </div>

      {message && <div className="mb-4 rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-[13px] font-semibold text-blue-700">{message}</div>}

      {showAssign && (
        <section id="assign-patient-form" className="mb-5 rounded-lg border border-[#dfe7f1] bg-white p-4">
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-[#edf2f7] pb-3">
            <div>
              <h2 className="m-0 text-[17px] font-extrabold text-[#071936]">Assign Patient</h2>
              <p className="m-0 mt-1 text-[12px] font-semibold text-[#64748b]">Assign primary or supporting nursing responsibility for this shift.</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowAssign(false)}>Cancel</Button>
              <Button tone="blue" onClick={assignPatient} disabled={saving}>Assign</Button>
            </div>
          </div>

          <div className="mb-4 rounded-md bg-[#f8fbff] p-3 text-[13px] font-semibold text-[#334155]">
            <div className="font-extrabold text-[#071936]">{selectedPatient?.data?.patientName || '-'} - {selectedPatient?.data?.ipdNo || selectedPatient?.data?.admissionNo || '-'}</div>
            <div className="mt-1">Location: {selectedPatient?.data?.wardName || ward} / {selectedPatient?.data?.roomName || '-'} / {selectedPatient?.data?.bedNumber || '-'}</div>
            <div className="mt-1">From {date} - {SHIFTS[shift][0]} to {SHIFTS[shift][1]}</div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">Patient<select className={`${INPUT} mt-1`} value={selectedPatient?._id || ''} onChange={(event) => setSelectedPatientId(event.target.value)}><option value="">Select patient</option>{wardPatients.map((record) => <option key={record._id} value={record._id}>{record.data?.patientName} - {record.data?.ipdNo || record.data?.admissionNo}</option>)}</select></label>
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">Nurse *<select className={`${INPUT} mt-1`} value={form.nurseName} onChange={(event) => setForm({ ...form, nurseName: event.target.value })}>{nurseOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">Shift<select className={`${INPUT} mt-1`} value={shift} onChange={(event) => setShift(event.target.value)}>{Object.keys(SHIFTS).map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">Responsibility<select className={`${INPUT} mt-1`} value={form.responsibility} onChange={(event) => setForm({ ...form, responsibility: event.target.value })}>{RESPONSIBILITIES.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="md:col-span-2 xl:col-span-3 text-[12px] font-extrabold uppercase text-[#536173]">Notes<textarea className={`${TEXTAREA} mt-1`} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
          </div>
        </section>
      )}

      <section className="mb-5 rounded-lg border border-[#dfe7f1] bg-white p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-[12px] font-extrabold uppercase text-[#536173]">Ward<select className={`${INPUT} mt-1`} value={ward} onChange={(event) => setWard(event.target.value)}>{WARDS.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="text-[12px] font-extrabold uppercase text-[#536173]">Shift<select className={`${INPUT} mt-1`} value={shift} onChange={(event) => setShift(event.target.value)}>{Object.keys(SHIFTS).map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="text-[12px] font-extrabold uppercase text-[#536173]">Date<input className={`${INPUT} mt-1`} type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
        </div>
      </section>

      <section className="rounded-lg border border-[#dfe7f1] bg-white">
        {grouped.length === 0 ? (
          <div className="p-5 text-[13px] font-semibold text-[#64748b]">No patient assignments for this ward and shift.</div>
        ) : (
          grouped.map(([nurseName, assignments]) => (
            <div key={nurseName} className="border-b border-[#edf2f7] p-5 last:border-b-0">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="m-0 text-[16px] font-extrabold uppercase text-[#071936]">Nurse {nurseName}</h2>
                  <div className="mt-1 text-[13px] font-bold text-[#64748b]">{shift} Shift</div>
                  <div className="mt-2 inline-flex items-center gap-2 rounded-md bg-[#f8fbff] px-3 py-2 text-[13px] font-extrabold text-[#334155]">
                    <UserCheck size={15} />
                    {assignments.length} / 8 Patients Assigned
                  </div>
                </div>
                <Button icon={Plus} onClick={() => openAssign()}>Assign Patient</Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] border-separate border-spacing-0 text-left text-[13px]">
                  <thead>
                    <tr className="text-[11px] uppercase text-[#64748b]">
                      <th className="border-b border-[#edf2f7] py-2">Bed</th>
                      <th className="border-b border-[#edf2f7] py-2">Patient</th>
                      <th className="border-b border-[#edf2f7] py-2">IPD</th>
                      <th className="border-b border-[#edf2f7] py-2">Condition</th>
                      <th className="border-b border-[#edf2f7] py-2">Open</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((record) => {
                      const data = record.data || {};
                      return (
                        <tr key={record._id}>
                          <td className="border-b border-[#f4f7fb] py-3 font-extrabold text-[#071936]"><span className="inline-flex items-center gap-1"><Bed size={14} />{data.bedNumber || '-'}</span></td>
                          <td className="border-b border-[#f4f7fb] py-3 font-semibold text-[#334155]">{data.patientName}</td>
                          <td className="border-b border-[#f4f7fb] py-3 font-semibold text-[#64748b]">{data.ipdNo}</td>
                          <td className={`border-b border-[#f4f7fb] py-3 font-extrabold ${normalize(data.condition) === 'critical' ? 'text-red-700' : 'text-emerald-700'}`}>{data.condition || 'Stable'}</td>
                          <td className="border-b border-[#f4f7fb] py-3">
                            <Button icon={ClipboardList}>Care Workspace</Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}


