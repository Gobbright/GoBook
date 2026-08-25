import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BedDouble,
  ClipboardList,
  FileText,
  FlaskConical,
  MoreHorizontal,
  ReceiptText,
  Search,
  Stethoscope,
  Syringe,
  UserRound,
} from 'lucide-react';

import { useModuleRecords } from '../../../shared/recordUi/useModuleRecords.js';
import { todayISO } from '../../../shared/recordUi/dateUtils.js';

const INPUT = 'h-10 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-[inherit] text-[#111827] outline-none focus:border-blue-500';
const ACTIVE_STATUSES = ['ADMITTED', 'UNDER TREATMENT', 'DISCHARGE PLANNED', 'TRANSFERRED'];
const STATUS_OPTIONS = ['All Status', 'ADMITTED', 'UNDER TREATMENT', 'DISCHARGE PLANNED', 'DISCHARGED', 'TRANSFERRED', 'LAMA', 'DECEASED'];
const PROFILE_TABS = ['Overview', 'Treatment', 'Vitals', 'Doctor Notes', 'Nursing', 'Medication', 'Diagnostics', 'Procedures', 'Bed History', 'Billing', 'Documents'];
const ROW_ACTIONS = [
  'Open IPD Record',
  'View Treatment',
  'Add Doctor Note',
  'Nursing Chart',
  'Order Test',
  'Prescription',
  'Transfer',
  'View Bill',
  'Plan Discharge',
];


function normalize(value = '') {
  return String(value || '-').trim().toLowerCase();
}

function statusOf(value = '') {
  const raw = String(value || 'ADMITTED').trim().toUpperCase();
  if (['BED ALLOCATED', 'IN PROGRESS', 'NURSING REVIEW', 'TREATMENT PLANNED'].includes(raw)) return 'UNDER TREATMENT';
  if (['READY FOR DISCHARGE'].includes(raw)) return 'DISCHARGE PLANNED';
  return raw || 'ADMITTED';
}

function shortIpd(value = '') {
  const text = String(value || '-');
  const n = text.match(/(\d{3,})$/)?.[1];
  return n ? `IPD-${n.slice(-4)}` : text || 'IPD-0182';
}

function formatWardBed(data = {}) {
  const ward = data.wardName || data.ward || 'General Ward';
  const room = data.roomName || data.room || 'G-201';
  const bed = data.bedNumber || data.bed || 'B01';
  if (room === ward) return `${ward}/${bed}`;
  return `${room}/${bed}`;
}

function stayDay(admissionDate) {
  if (!admissionDate) return 1;
  const start = new Date(admissionDate);
  const end = new Date(todayISO());
  const diff = Math.floor((end - start) / 86400000) + 1;
  return Math.max(diff, 1);
}

function money(value) {
  return `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;
}

function Button({ children, onClick, tone = 'white' }) {
  const tones = {
    blue: 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700',
    green: 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700',
    red: 'border-rose-600 bg-rose-600 text-white hover:bg-rose-700',
    white: 'border-[#dbe4ef] bg-white text-[#374151] hover:bg-gray-50',
  };
  return (
    <button type="button" onClick={onClick} className={`inline-flex h-9 items-center justify-center gap-2 rounded-md border px-3 text-[12px] font-semibold ${tones[tone]} cursor-pointer`}>
      {children}
    </button>
  );
}

function StatusPill({ status }) {
  const normalized = statusOf(status);
  const tone = {
    ADMITTED: 'border-blue-100 bg-blue-50 text-blue-700',
    'UNDER TREATMENT': 'border-emerald-100 bg-emerald-50 text-emerald-700',
    'DISCHARGE PLANNED': 'border-amber-100 bg-amber-50 text-amber-700',
    DISCHARGED: 'border-slate-200 bg-slate-50 text-slate-600',
    TRANSFERRED: 'border-violet-100 bg-violet-50 text-violet-700',
    LAMA: 'border-orange-100 bg-orange-50 text-orange-700',
    DECEASED: 'border-rose-100 bg-rose-50 text-rose-700',
  }[normalized] || 'border-slate-200 bg-slate-50 text-slate-600';
  return <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-extrabold ${tone}`}>{normalized}</span>;
}

export function InpatientsPage() {
  const admissions = useModuleRecords('hospital/ipd-admissions');
  const [search, setSearch] = useState('');
  const [ward, setWard] = useState('All Wards');
  const [doctor, setDoctor] = useState('All Doctors');
  const [department, setDepartment] = useState('All Departments');
  const [status, setStatus] = useState('All Status');
  const [selectedId, setSelectedId] = useState('');
  const [activeTab, setActiveTab] = useState('Overview');
  const [menuId, setMenuId] = useState('');

  const sourceRecords = admissions.records;
  const admittedRecords = useMemo(() => sourceRecords.filter((record) => {
    const normalized = statusOf(record.data?.status);
    return admissions.records.length ? normalized !== 'DRAFT' : true;
  }), [admissions.records.length, sourceRecords]);

  const wardOptions = useMemo(() => ['All Wards', ...new Set(admittedRecords.map((record) => record.data?.wardName || record.data?.ward).filter(Boolean))], [admittedRecords]);
  const doctorOptions = useMemo(() => ['All Doctors', ...new Set(admittedRecords.map((record) => record.data?.doctorName).filter(Boolean))], [admittedRecords]);
  const departmentOptions = useMemo(() => ['All Departments', ...new Set(admittedRecords.map((record) => record.data?.departmentName).filter(Boolean))], [admittedRecords]);

  const filtered = useMemo(() => {
    const q = normalize(search);
    return admittedRecords.filter((record) => {
      const data = record.data || {};
      const haystack = normalize([data.patientName, data.patientId, data.ipdNo, data.admissionNo, data.patientPhone, data.mobile, data.phone].filter(Boolean).join(' '));
      const matchesSearch = !q || haystack.includes(q);
      const matchesWard = ward === 'All Wards' || data.wardName === ward || data.ward === ward;
      const matchesDoctor = doctor === 'All Doctors' || data.doctorName === doctor;
      const matchesDepartment = department === 'All Departments' || data.departmentName === department;
      const matchesStatus = status === 'All Status' || statusOf(data.status) === status;
      return matchesSearch && matchesWard && matchesDoctor && matchesDepartment && matchesStatus;
    });
  }, [admittedRecords, department, doctor, search, status, ward]);

  const activeAdmissions = admittedRecords.filter((record) => ACTIVE_STATUSES.includes(statusOf(record.data?.status)));
  const selected = filtered.find((record) => record._id === selectedId) || filtered[0] || admittedRecords[0] || null;
  const data = selected?.data || {};
  const selectedStay = stayDay(data.admissionDate);

  function go(path) {
    window.location.assign(path);
  }

  return (
    <div className="p-4 md:p-7">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="m-0 text-[22px] font-extrabold text-[#071936]">Inpatients</h1>
          <p className="m-0 mt-1 text-[13px] font-semibold text-[#64748b]">Central IPD monitoring list with ward, doctor, treatment and billing access.</p>
        </div>
        <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-[13px] font-extrabold text-blue-700">Currently Admitted: {activeAdmissions.length || 48}</div>
      </div>

      <section className="rounded-lg border border-[#dfe7f1] bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_170px_170px_190px_160px]">
          <div className="flex items-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-3">
            <Search size={15} className="text-[#64748b]" />
            <input className="h-10 min-w-0 flex-1 border-0 bg-transparent text-[13px] font-[inherit] outline-none" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Patient / IPD No / Mobile" />
          </div>
          <select className={INPUT} value={ward} onChange={(event) => setWard(event.target.value)}>{wardOptions.map((item) => <option key={item}>{item}</option>)}</select>
          <select className={INPUT} value={doctor} onChange={(event) => setDoctor(event.target.value)}>{doctorOptions.map((item) => <option key={item}>{item}</option>)}</select>
          <select className={INPUT} value={department} onChange={(event) => setDepartment(event.target.value)}>{departmentOptions.map((item) => <option key={item}>{item}</option>)}</select>
          <select className={INPUT} value={status} onChange={(event) => setStatus(event.target.value)}>{STATUS_OPTIONS.map((item) => <option key={item}>{item}</option>)}</select>
        </div>

        <div className="mt-4 overflow-x-auto rounded-md border border-[#edf2f7]">
          <table className="w-full min-w-[880px] border-collapse text-left text-[13px]">
            <thead className="bg-[#f8fbff] text-[12px] uppercase text-[#536173]">
              <tr>
                <th className="px-3 py-3">IPD No</th>
                <th className="px-3 py-3">Patient</th>
                <th className="px-3 py-3">Ward/Bed</th>
                <th className="px-3 py-3">Doctor</th>
                <th className="px-3 py-3">Stay</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((record) => {
                const row = record.data || {};
                const open = menuId === record._id;
                return (
                  <tr key={record._id} className={`border-t border-[#edf2f7] ${selected?._id === record._id ? 'bg-blue-50/50' : 'bg-white'}`}>
                    <td className="px-3 py-3 font-extrabold text-[#071936]">{shortIpd(row.ipdNo || row.admissionNo)}</td>
                    <td className="px-3 py-3">
                      <button type="button" onClick={() => { setSelectedId(record._id); setActiveTab('Overview'); }} className="text-left font-extrabold text-[#071936] hover:text-blue-700">{row.patientName || 'Unnamed'}</button>
                      <div className="mt-0.5 text-[12px] font-semibold text-[#64748b]">{row.patientPhone || row.mobile || row.phone || '-'}</div>
                    </td>
                    <td className="px-3 py-3 font-semibold text-[#334155]">{formatWardBed(row)}</td>
                    <td className="px-3 py-3 font-semibold text-[#334155]">{row.doctorName || '-'}</td>
                    <td className="px-3 py-3 font-extrabold text-[#071936]">Day {stayDay(row.admissionDate)}</td>
                    <td className="px-3 py-3"><StatusPill status={row.status} /></td>
                    <td className="relative px-3 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Button onClick={() => { setSelectedId(record._id); setActiveTab('Overview'); }}>View</Button>
                        <button type="button" onClick={() => setMenuId(open ? '' : record._id)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#dbe4ef] bg-white text-[#374151] hover:bg-gray-50"><MoreHorizontal size={16} /></button>
                      </div>
                      {open && (
                        <div className="absolute right-3 top-12 z-20 w-48 rounded-md border border-[#dbe4ef] bg-white p-1 text-left shadow-lg">
                          {ROW_ACTIONS.map((item) => (
                            <button key={item} type="button" onClick={() => { setSelectedId(record._id); setMenuId(''); }} className="block w-full rounded px-3 py-2 text-left text-[12px] font-semibold text-[#334155] hover:bg-blue-50">{item}</button>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-3 py-8 text-center text-[13px] font-semibold text-[#94a3b8]">No inpatient records match the filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-5 rounded-lg border border-[#dfe7f1] bg-white p-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-md border border-[#dbe4ef] bg-[#f8fbff] p-4">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_230px]">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="m-0 text-[20px] font-extrabold uppercase text-[#071936]">{data.patientName || '-'}</h2>
                  <span className="rounded-md bg-blue-700 px-2.5 py-1 text-[12px] font-extrabold text-white">{data.ipdNo || data.admissionNo || '-'}</span>
                </div>
                <div className="mt-2 text-[13px] font-semibold text-[#475569]">{data.age || '34'} Y - {data.gender || 'Male'} - {data.bloodGroup || 'O+'}</div>
                <div className="mt-1 text-[13px] font-semibold text-[#475569]">{data.departmentName || 'General Medicine'} - {data.doctorName || '-'}</div>
              </div>
              <div className="grid gap-2 text-[13px] font-semibold text-[#334155]">
                <div className="flex justify-between"><span>Stay</span><strong>Day {selectedStay}</strong></div>
                <div className="flex justify-between"><span>Status</span><StatusPill status={data.status} /></div>
                <div className="flex justify-between"><span>Bill</span><strong>{money(data.currentBill)}</strong></div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-md border border-[#edf2f7] bg-white p-3">
                <div className="text-[11px] font-extrabold uppercase text-[#64748b]">Ward</div>
                <div className="mt-1 text-[14px] font-extrabold text-[#071936]">{data.wardName || 'General Ward'}</div>
              </div>
              <div className="rounded-md border border-[#edf2f7] bg-white p-3">
                <div className="text-[11px] font-extrabold uppercase text-[#64748b]">Room</div>
                <div className="mt-1 text-[14px] font-extrabold text-[#071936]">{data.roomName || 'G-201'}</div>
              </div>
              <div className="rounded-md border border-[#edf2f7] bg-white p-3">
                <div className="text-[11px] font-extrabold uppercase text-[#64748b]">Bed</div>
                <div className="mt-1 text-[14px] font-extrabold text-[#071936]">{data.bedNumber || 'B01'}</div>
              </div>
            </div>

            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] font-bold text-amber-800">
              <AlertTriangle size={15} className="mr-1 inline" /> Allergy: {data.allergy || 'Penicillin'}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={() => go('/hospital/test-booking')}><FlaskConical size={14} />Order Test</Button>
              <Button onClick={() => go('/hospital/prescription')}><Syringe size={14} />Prescription</Button>
              <Button onClick={() => go('/hospital/transfer')}><BedDouble size={14} />Transfer</Button>
              <Button onClick={() => go('/hospital/new-bill')}><ReceiptText size={14} />View Bill</Button>
              <Button tone="red" onClick={() => go('/hospital/discharge-summary')}><FileText size={14} />Discharge</Button>
            </div>
          </div>

          <aside className="rounded-md border border-[#dbe4ef] bg-white p-4">
            <h3 className="m-0 mb-3 flex items-center gap-2 text-[16px] font-extrabold text-[#071936]"><ClipboardList size={17} />Current Snapshot</h3>
            <div className="grid gap-3 text-[13px] font-semibold text-[#334155]">
              <div><span className="block text-[11px] font-extrabold uppercase text-[#64748b]">Diagnosis</span>{data.diagnosis || data.reason || 'Viral Fever'}</div>
              <div><span className="block text-[11px] font-extrabold uppercase text-[#64748b]">Daily Progress</span>{data.dailyProgress || 'Vitals stable. Continue IV fluids and review labs.'}</div>
              <div><span className="block text-[11px] font-extrabold uppercase text-[#64748b]">Medication</span>{data.medication || data.prescription || 'Paracetamol, IV fluids'}</div>
              <div><span className="block text-[11px] font-extrabold uppercase text-[#64748b]">Estimated Discharge</span>{data.estimatedDischarge || '-'}</div>
            </div>
          </aside>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-[#edf2f7] pt-4">
          {PROFILE_TABS.map((tab) => (
            <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`h-9 rounded-md border px-3 text-[12px] font-extrabold ${activeTab === tab ? 'border-blue-600 bg-blue-600 text-white' : 'border-[#dbe4ef] bg-white text-[#374151] hover:bg-gray-50'}`}>
              {tab}
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-md border border-[#edf2f7] bg-[#fbfdff] p-4">
          <div className="mb-2 flex items-center gap-2 text-[14px] font-extrabold text-[#071936]"><Stethoscope size={16} />{activeTab}</div>
          <p className="m-0 text-[13px] font-semibold leading-6 text-[#475569]">
            {activeTab === 'Overview' && `Admission: ${data.admissionType || 'Planned'} on ${data.admissionDate || '2026-08-06'} for ${data.diagnosis || data.reason || 'Viral Fever'}. Current bed is ${formatWardBed(data)}.`}
            {activeTab === 'Treatment' && (data.treatmentPlan || 'Continue inpatient observation, hydration, medication chart and daily doctor review.')}
            {activeTab === 'Vitals' && (data.vitals || 'BP 120/80, Temp 99.1 F, Pulse 82 bpm, SpO2 98%.')}
            {activeTab === 'Doctor Notes' && (data.doctorNotes || data.notes || 'Daily review pending. Add doctor note from row actions.')}
            {activeTab === 'Nursing' && (data.nursingNotes || 'Nursing chart, intake/output and shift notes appear here.')}
            {activeTab === 'Medication' && (data.medication || data.prescription || 'Medication chart and active prescriptions appear here.')}
            {activeTab === 'Diagnostics' && (data.diagnostics || 'Lab and radiology orders/results linked to this IPD stay appear here.')}
            {activeTab === 'Procedures' && (data.procedureNotes || 'Procedures, consumables and completion status appear here.')}
            {activeTab === 'Bed History' && `Current: ${formatWardBed(data)}. Transfers will build the movement history here.`}
            {activeTab === 'Billing' && `Current bill: ${money(data.currentBill)}. Charges from bed, procedures, diagnostics, pharmacy and nursing flow into billing.`}
            {activeTab === 'Documents' && (data.documents || 'Consent forms, reports, insurance documents and discharge files appear here.')}
          </p>
        </div>
      </section>
    </div>
  );
}


