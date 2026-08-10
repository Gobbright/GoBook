import { useMemo, useState } from 'react';
import { AlertTriangle, FileText, Printer, Search, Send } from 'lucide-react';

import { useModuleRecords } from '../../../shared/recordUi/useModuleRecords.js';
import { todayISO } from '../../../shared/recordUi/dateUtils.js';

const INPUT = 'h-10 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-[inherit] text-[#111827] outline-none focus:border-blue-500';
const DATE_FILTERS = ['Today', 'All Dates'];
const SOURCE_FILTERS = ['OPD/IPD', 'OPD', 'IPD', 'Emergency', 'Discharge'];
const DOCTORS = ['Doctor', 'Dr. Arun', 'Dr. Ravi', 'Dr. Arun Kumar', 'Dr. Ravi Kumar'];
const STATUSES = ['Status', 'PENDING', 'PARTIALLY DISPENSED', 'DISPENSED', 'CANCELLED', 'EXPIRED'];

const DEFAULT_MEDICINES = [
  { medicine: 'Paracetamol 500mg', dosage: '500mg', frequency: '1-0-1', duration: '5 Days' },
  { medicine: 'Vitamin C 500mg', dosage: '500mg', frequency: '1-0-0', duration: '7 Days' },
  { medicine: 'ORS Sachet', dosage: '1', frequency: '1-1-1', duration: '3 Days' },
];

const DEMO_PRESCRIPTIONS = [
  {
    _id: 'demo-rx-1052',
    data: {
      rxId: 'RX-1052',
      prescriptionNo: 'RX-2026-001052',
      patientName: 'Raj Kumar',
      patientId: 'GBH-00128',
      age: '34',
      gender: 'Male',
      bloodGroup: 'O+',
      allergy: 'Penicillin',
      source: 'OPD',
      doctorName: 'Dr. Arun',
      visitNo: 'OPD-2026-00452',
      diagnosis: 'Viral Fever',
      prescribedMedicines: DEFAULT_MEDICINES,
      doctorInstructions: 'Take medicines after food.',
      status: 'PENDING',
      date: todayISO(),
    },
  },
  {
    _id: 'demo-rx-1051',
    data: {
      rxId: 'RX-1051',
      prescriptionNo: 'RX-2026-001051',
      patientName: 'Priya S',
      patientId: 'GBH-00129',
      age: '42',
      gender: 'Female',
      bloodGroup: 'B+',
      source: 'IPD',
      doctorName: 'Dr. Ravi',
      visitNo: 'IPD-2026-00181',
      diagnosis: 'Post operative care',
      prescribedMedicines: DEFAULT_MEDICINES.slice(0, 2),
      doctorInstructions: 'Continue medication as advised.',
      status: 'PARTIALLY DISPENSED',
      date: todayISO(),
    },
  },
  {
    _id: 'demo-rx-1050',
    data: {
      rxId: 'RX-1050',
      prescriptionNo: 'RX-2026-001050',
      patientName: 'Karthik R',
      patientId: 'GBH-00130',
      age: '29',
      gender: 'Male',
      bloodGroup: 'A+',
      source: 'OPD',
      doctorName: 'Dr. Arun',
      visitNo: 'OPD-2026-00448',
      diagnosis: 'Gastritis',
      prescribedMedicines: DEFAULT_MEDICINES.slice(0, 2),
      doctorInstructions: 'After food.',
      status: 'DISPENSED',
      date: todayISO(),
    },
  },
];

function normalize(value = '') {
  return String(value || '').trim().toLowerCase();
}

function shortRx(value = '') {
  const match = String(value).match(/RX-\d{4}-0*(\d+)/);
  return match ? `RX-${match[1]}` : value;
}

function normalizeStatus(data = {}) {
  const raw = data.dispensingStatus || data.pharmacyStatus || data.status || 'PENDING';
  if (raw === 'Ready for Pharmacy' || raw === 'Finalized') return 'PENDING';
  if (raw === 'PARTIAL') return 'PARTIALLY DISPENSED';
  return String(raw).toUpperCase();
}

function normalizeMedicines(data = {}) {
  if (Array.isArray(data.prescribedMedicines)) return data.prescribedMedicines;
  if (Array.isArray(data.medicinesList)) return data.medicinesList;
  if (typeof data.medicines === 'string') {
    return data.medicines.split('\n').filter(Boolean).map((line) => {
      const [medicine, dosage, frequency, duration] = line.split(' - ');
      return { medicine, dosage, frequency, duration };
    });
  }
  return DEFAULT_MEDICINES;
}

function Button({ children, icon: Icon, onClick, tone = 'white', disabled = false }) {
  const tones = {
    blue: 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700',
    green: 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700',
    white: 'border-[#dbe4ef] bg-white text-[#374151] hover:bg-gray-50',
  };
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-[13px] font-semibold ${tones[tone]} font-[inherit] transition disabled:opacity-60`}>
      {Icon && <Icon size={15} />}
      {children}
    </button>
  );
}

function StatusBadge({ value }) {
  const styles = {
    PENDING: 'border-amber-200 bg-amber-50 text-amber-700',
    'PARTIALLY DISPENSED': 'border-blue-200 bg-blue-50 text-blue-700',
    DISPENSED: 'border-green-200 bg-green-50 text-green-700',
    CANCELLED: 'border-red-200 bg-red-50 text-red-700',
    EXPIRED: 'border-slate-200 bg-slate-50 text-slate-600',
  };
  return <span className={`rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${styles[value] || styles.PENDING}`}>{value}</span>;
}

export function PrescriptionsQueuePage() {
  const prescriptions = useModuleRecords('hospital/prescription');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('Today');
  const [sourceFilter, setSourceFilter] = useState('OPD/IPD');
  const [doctorFilter, setDoctorFilter] = useState('Doctor');
  const [statusFilter, setStatusFilter] = useState('Status');
  const [selectedId, setSelectedId] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const records = prescriptions.records.length ? prescriptions.records : DEMO_PRESCRIPTIONS;
  const filteredRecords = useMemo(() => {
    const q = normalize(search);
    return records.filter((record) => {
      const data = record.data || {};
      const rx = data.rxId || shortRx(data.prescriptionNo || data.rxNo);
      const status = normalizeStatus(data);
      const source = data.source || (data.opdNo || data.visitNo || '').slice(0, 3) || 'OPD';
      const matchesSearch = !q || normalize([data.patientName, data.patientId, rx, data.prescriptionNo, data.doctorName].filter(Boolean).join(' ')).includes(q);
      const matchesDate = dateFilter !== 'Today' || !data.date || String(data.date).slice(0, 10) === todayISO();
      const matchesSource = sourceFilter === 'OPD/IPD' || source === sourceFilter;
      const matchesDoctor = doctorFilter === 'Doctor' || data.doctorName === doctorFilter;
      const matchesStatus = statusFilter === 'Status' || status === statusFilter;
      return matchesSearch && matchesDate && matchesSource && matchesDoctor && matchesStatus;
    });
  }, [dateFilter, doctorFilter, records, search, sourceFilter, statusFilter]);

  const selected = records.find((record) => record._id === selectedId) || filteredRecords[0] || records[0];
  const selectedData = selected?.data || {};
  const selectedStatus = normalizeStatus(selectedData);
  const selectedMedicines = normalizeMedicines(selectedData);
  const selectedAllergy = selectedData.allergy || selectedData.knownAllergies || (selectedData.patientName ? '' : 'Penicillin');

  async function sendToDispensing() {
    if (!selected) return;
    setSaving(true);
    try {
      if (!String(selected._id).startsWith('demo-')) {
        await prescriptions.update(selected._id, {
          ...selectedData,
          pharmacyStatus: 'Sent to Dispensing',
          dispensingStatus: selectedStatus === 'PENDING' ? 'PENDING' : selectedStatus,
        });
      }
      setMessage(`${selectedData.prescriptionNo || selectedData.rxId || 'Prescription'} sent to pharmacy dispensing queue.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 md:p-7">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 text-[13px] font-semibold text-[#64748b]">Home &gt; Pharmacy &gt; Prescriptions</div>
          <h1 className="m-0 text-[26px] font-extrabold text-[#071936]">Prescriptions</h1>
          <p className="m-0 mt-1 text-[13px] font-semibold text-[#64748b]">Medicine prescriptions from OPD, IPD, Emergency and Discharge workflows.</p>
        </div>
        <StatusBadge value={selectedStatus} />
      </div>

      {message && <div className="mb-4 rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-[13px] font-semibold text-blue-700">{message}</div>}

      <section className="mb-5 rounded-lg border border-[#dfe7f1] bg-white">
        <div className="grid gap-3 border-b border-[#edf2f7] p-4 lg:grid-cols-[minmax(260px,1fr)_130px_150px_150px_160px]">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
            <input className="h-10 w-full rounded-md border border-[#dbe4ef] bg-white pl-9 pr-3 text-[13px] font-[inherit] outline-none focus:border-blue-500" placeholder="Patient / Prescription ID / Doctor" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <select className={INPUT} value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>{DATE_FILTERS.map((item) => <option key={item}>{item}</option>)}</select>
          <select className={INPUT} value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>{SOURCE_FILTERS.map((item) => <option key={item}>{item}</option>)}</select>
          <select className={INPUT} value={doctorFilter} onChange={(event) => setDoctorFilter(event.target.value)}>{DOCTORS.map((item) => <option key={item}>{item}</option>)}</select>
          <select className={INPUT} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>{STATUSES.map((item) => <option key={item}>{item}</option>)}</select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-[13px]">
            <thead className="bg-[#f8fbff] text-[11px] uppercase text-[#536173]">
              <tr>
                <th className="px-4 py-3 font-extrabold">Rx ID</th>
                <th className="px-4 py-3 font-extrabold">Patient</th>
                <th className="px-4 py-3 font-extrabold">Source</th>
                <th className="px-4 py-3 font-extrabold">Doctor</th>
                <th className="px-4 py-3 font-extrabold">Items</th>
                <th className="px-4 py-3 font-extrabold">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => {
                const data = record.data || {};
                const active = selected?._id === record._id;
                const source = data.source || (data.opdNo || data.visitNo || '').slice(0, 3) || 'OPD';
                const medicines = normalizeMedicines(data);
                return (
                  <tr key={record._id} onClick={() => setSelectedId(record._id)} className={`cursor-pointer border-t border-[#edf2f7] ${active ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                    <td className="px-4 py-3 font-extrabold text-[#071936]">{data.rxId || shortRx(data.prescriptionNo || data.rxNo)}</td>
                    <td className="px-4 py-3 font-semibold text-[#334155]">{data.patientName}</td>
                    <td className="px-4 py-3 font-semibold text-[#64748b]">{source}</td>
                    <td className="px-4 py-3 font-semibold text-[#334155]">{data.doctorName}</td>
                    <td className="px-4 py-3 font-semibold text-[#334155]">{medicines.length}</td>
                    <td className="px-4 py-3"><StatusBadge value={normalizeStatus(data)} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-[#dfe7f1] bg-white">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#edf2f7] p-4">
          <div>
            <h2 className="m-0 text-[18px] font-extrabold text-[#071936]">Prescription</h2>
            <p className="m-0 mt-1 text-[13px] font-semibold text-[#64748b]">{selectedData.prescriptionNo || selectedData.rxId || 'RX-2026-001052'}</p>
          </div>
          <FileText size={24} className="text-blue-600" />
        </div>

        <div className="p-4">
          <div className="mb-4 rounded-lg border border-[#dbe4ef] bg-[#f8fbff] p-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,360px)]">
              <div>
                <div className="text-[17px] font-extrabold text-[#071936]">{selectedData.patientName || 'Raj Kumar'} - {selectedData.patientId || 'GBH-00128'}</div>
                <div className="mt-1 text-[13px] font-semibold text-[#64748b]">{selectedData.age || '34'} Y - {selectedData.gender || 'Male'} - {selectedData.bloodGroup || 'O+'}</div>
                {selectedAllergy && (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-[12px] font-extrabold text-red-700">
                    <AlertTriangle size={14} />Allergy: {selectedAllergy}
                  </div>
                )}
              </div>
              <div className="text-[13px] font-semibold text-[#334155]">
                <div>Doctor: <strong>{selectedData.doctorName || 'Dr. Arun Kumar'}</strong></div>
                <div className="mt-1">Visit: <strong>{selectedData.visitNo || selectedData.opdNo || 'OPD-2026-00452'}</strong></div>
                <div className="mt-1">Diagnosis: <strong>{selectedData.diagnosis || 'Viral Fever'}</strong></div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border border-[#dbe4ef]">
            <table className="min-w-full border-collapse text-left text-[13px]">
              <thead className="bg-[#f8fbff] text-[11px] uppercase text-[#536173]">
                <tr>
                  <th className="px-4 py-3 font-extrabold">Medicine</th>
                  <th className="px-4 py-3 font-extrabold">Dosage</th>
                  <th className="px-4 py-3 font-extrabold">Frequency</th>
                  <th className="px-4 py-3 font-extrabold">Duration</th>
                </tr>
              </thead>
              <tbody>
                {selectedMedicines.map((item, index) => (
                  <tr key={`${item.medicine}-${index}`} className="border-t border-[#edf2f7]">
                    <td className="px-4 py-3 font-extrabold text-[#071936]">{item.medicine}</td>
                    <td className="px-4 py-3 font-semibold text-[#334155]">{item.dosage}</td>
                    <td className="px-4 py-3 font-semibold text-[#334155]">{item.frequency}</td>
                    <td className="px-4 py-3 font-semibold text-[#334155]">{item.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 rounded-md border border-[#dbe4ef] bg-white p-3">
            <div className="text-[12px] font-extrabold uppercase text-[#536173]">Doctor Instructions</div>
            <div className="mt-1 text-[13px] font-semibold text-[#334155]">{selectedData.doctorInstructions || selectedData.additionalInstructions || 'Take medicines after food.'}</div>
          </div>

          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button icon={Printer} onClick={() => window.print()}>Print Prescription</Button>
            <Button tone="blue" icon={Send} onClick={sendToDispensing} disabled={saving}>Send to Dispensing</Button>
          </div>
        </div>
      </section>
    </div>
  );
}
