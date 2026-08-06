import { useMemo, useState } from 'react';
import { FileText, MessageCircle, Plus, Printer, Search, Trash2 } from 'lucide-react';

import { useModuleRecords } from '../../../shared/recordUi/useModuleRecords.js';

const ESTIMATE_TYPES = ['Surgery', 'IPD Treatment', 'Health Checkup', 'Emergency', 'Diagnostics', 'Other'];
const DOCTORS = ['Dr. Arun Kumar', 'Dr. Kumar', 'Dr. Meera Sharma', 'Dr. Priya Nair'];
const DEFAULT_SERVICES = [
  { name: 'Surgery Charges', department: 'OT', price: 25000 },
  { name: 'Surgeon Fee', department: 'Doctors', price: 8000 },
  { name: 'OT Charges', department: 'OT', price: 5000 },
  { name: 'Room - 3 Days', department: 'IPD', price: 9000 },
  { name: 'Diagnostics', department: 'Diagnostics', price: 3000 },
  { name: 'Estimated Medicines', department: 'Pharmacy', price: 5000 },
];
const EMPTY_SERVICE = { name: '', department: 'Other', price: 0 };
const INPUT = 'border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] text-[#111827] outline-none focus:border-blue-500 font-[inherit] bg-white';

function money(value) {
  return `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function nextEstimateNo(records) {
  const max = records.reduce((highest, record) => {
    const n = Number(String(record.data?.estimateNo || '').replace(/\D/g, ''));
    return Number.isFinite(n) ? Math.max(highest, n) : highest;
  }, 240);
  return `EST-${String(max + 1).padStart(5, '0')}`;
}

function patientPhone(data = {}) {
  return data.phone || data.mobile || '';
}

function totalServices(services = []) {
  return services.reduce((sum, service) => sum + Number(service.price || 0), 0);
}

function Button({ children, onClick, tone = 'white', disabled = false }) {
  const tones = {
    blue: 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700',
    green: 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700',
    subtle: 'border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100',
    white: 'border-[#dbe4ef] bg-white text-[#374151] hover:bg-gray-50',
  };
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md border px-3 text-[13px] font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${tones[tone]}`}>
      {children}
    </button>
  );
}

export function EstimatesPage() {
  const estimates = useModuleRecords('hospital/estimates');
  const patients = useModuleRecords('hospital/patients');
  const [search, setSearch] = useState('');
  const [showPatientMenu, setShowPatientMenu] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [estimateType, setEstimateType] = useState('Surgery');
  const [doctor, setDoctor] = useState('Dr. Arun Kumar');
  const [expectedDays, setExpectedDays] = useState(3);
  const [services, setServices] = useState(DEFAULT_SERVICES);
  const [expectedInsurance, setExpectedInsurance] = useState(30000);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [savedMessage, setSavedMessage] = useState('');

  const estimateNo = useMemo(() => nextEstimateNo(estimates.records), [estimates.records]);
  const patientOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    const source = q ? patients.records.filter((record) => {
      const data = record.data || {};
      return [data.patientId, data.name, patientPhone(data), data.email].filter(Boolean).join(' ').toLowerCase().includes(q);
    }) : patients.records;
    return source.slice(0, 8);
  }, [patients.records, search]);
  const selectedPatient = patients.records.find((record) => record._id === selectedPatientId) || null;
  const estimatedCost = totalServices(services);
  const patientPayable = Math.max(0, estimatedCost - Number(expectedInsurance || 0) - Number(discount || 0));
  const savedRows = useMemo(() => estimates.records
    .map((record) => ({ id: record._id, ...record.data }))
    .sort((a, b) => String(b.estimateNo || '').localeCompare(String(a.estimateNo || '')))
    .slice(0, 6), [estimates.records]);

  function updateService(index, field, value) {
    setServices((current) => current.map((service, itemIndex) => (
      itemIndex === index ? { ...service, [field]: field === 'price' ? Number(value) : value } : service
    )));
  }

  function addService() {
    setServices((current) => [...current, { ...EMPTY_SERVICE }]);
  }

  function removeService(index) {
    setServices((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function payload(status = 'Draft') {
    return {
      estimateNo,
      patientName: selectedPatient?.data?.name || search,
      patientId: selectedPatient?.data?.patientId || '',
      patientRecordId: selectedPatient?._id || '',
      mobile: patientPhone(selectedPatient?.data),
      estimateType,
      doctor,
      expectedDays: Number(expectedDays || 0),
      services,
      estimatedCost,
      expectedInsurance: Number(expectedInsurance || 0),
      discount: Number(discount || 0),
      patientPayable,
      notes,
      status,
      date: today(),
      amount: patientPayable,
      name: `${estimateType} Estimate`,
    };
  }

  async function saveEstimate(status = 'Saved') {
    if (!selectedPatient && !search.trim()) return;
    await estimates.create(payload(status));
    setSavedMessage(`${estimateNo} saved.`);
  }

  async function convertToBill() {
    if (!selectedPatient && !search.trim()) return;
    const estimate = payload('Converted');
    await estimates.create(estimate);
    window.sessionStorage.setItem('hospitalEstimateToBill', JSON.stringify(estimate));
    window.location.assign('/hospital/new-bill?estimateDraft=1');
  }

  function shareWhatsApp() {
    const text = `${estimateNo} estimate for ${selectedPatient?.data?.name || search}: estimated payable ${money(patientPayable)}`;
    const mobile = patientPhone(selectedPatient?.data).replace(/\D/g, '');
    window.open(`https://wa.me/${mobile || ''}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="p-3 md:p-4">
      <div className="rounded-2xl border border-[#e5e7eb] bg-[#f7f7f8] p-5 md:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><FileText size={18} /></span>
            <div>
              <h1 className="m-0 text-[18px] font-extrabold uppercase text-[#111827]">New Estimate</h1>
              <p className="m-0 mt-1 text-[12px] font-semibold text-[#64748b]">{estimateNo} - before admission, surgery or expensive treatment</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => saveEstimate('Saved')} disabled={!selectedPatient && !search.trim()}>Save</Button>
            <Button onClick={() => window.print()}><Printer size={14} />Print</Button>
            <Button onClick={shareWhatsApp} disabled={!selectedPatient && !search.trim()}><MessageCircle size={14} />WhatsApp</Button>
            <Button tone="green" onClick={convertToBill} disabled={!selectedPatient && !search.trim()}>Convert to Bill</Button>
          </div>
        </div>

        {savedMessage && <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-[13px] font-semibold text-green-700">{savedMessage}</div>}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <main className="rounded-lg border border-[#dfe7f1] bg-white p-4">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="relative md:col-span-2">
                <label className="mb-1 block text-[12px] font-extrabold uppercase text-[#536173]">Patient</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
                  <input
                    className={`${INPUT} w-full pl-8`}
                    value={search}
                    onFocus={() => setShowPatientMenu(true)}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setShowPatientMenu(true);
                    }}
                    placeholder="Search Patient"
                  />
                </div>
                {showPatientMenu && patientOptions.length > 0 && (
                  <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-[#dbe4ef] bg-white shadow-lg">
                    {patientOptions.map((patient) => (
                      <button
                        key={patient._id}
                        type="button"
                        onClick={() => {
                          setSelectedPatientId(patient._id);
                          setSearch(patient.data?.name || patient.data?.patientId || '');
                          setShowPatientMenu(false);
                        }}
                        className="block w-full cursor-pointer border-b border-[#edf2f7] px-3 py-2 text-left text-[13px] last:border-0 hover:bg-blue-50"
                      >
                        <strong>{patient.data?.name || 'Unnamed'}</strong>
                        <span className="ml-2 text-[#64748b]">{patient.data?.patientId || '-'} - {patientPhone(patient.data) || 'No mobile'}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <label>
                <span className="mb-1 block text-[12px] font-extrabold uppercase text-[#536173]">Estimate Type</span>
                <select className={`${INPUT} w-full`} value={estimateType} onChange={(event) => setEstimateType(event.target.value)}>
                  {ESTIMATE_TYPES.map((type) => <option key={type}>{type}</option>)}
                </select>
              </label>
              <label>
                <span className="mb-1 block text-[12px] font-extrabold uppercase text-[#536173]">Doctor</span>
                <select className={`${INPUT} w-full`} value={doctor} onChange={(event) => setDoctor(event.target.value)}>
                  {DOCTORS.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
            </div>

            <div className="my-5 h-px bg-[#dfe7f1]" />
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="m-0 text-[13px] font-extrabold uppercase text-[#111827]">Expected Services</h2>
              <Button tone="subtle" onClick={addService}><Plus size={14} />Add Service</Button>
            </div>

            <div className="grid gap-2">
              {services.map((service, index) => (
                <div key={`${service.name}-${index}`} className="grid gap-2 md:grid-cols-[minmax(0,1fr)_150px_140px_36px]">
                  <input className={`${INPUT} w-full`} value={service.name} onChange={(event) => updateService(index, 'name', event.target.value)} placeholder="Service name" />
                  <input className={`${INPUT} w-full`} value={service.department} onChange={(event) => updateService(index, 'department', event.target.value)} placeholder="Department" />
                  <input className={`${INPUT} w-full text-right`} type="number" min="0" value={service.price} onChange={(event) => updateService(index, 'price', event.target.value)} />
                  <button type="button" onClick={() => removeService(index)} className="inline-flex h-10 w-9 items-center justify-center rounded-md border border-red-100 bg-red-50 text-red-600 cursor-pointer"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <label>
                <span className="mb-1 block text-[12px] font-extrabold uppercase text-[#536173]">Expected IPD Days</span>
                <input className={`${INPUT} w-full`} type="number" min="0" value={expectedDays} onChange={(event) => setExpectedDays(Number(event.target.value))} />
              </label>
              <label>
                <span className="mb-1 block text-[12px] font-extrabold uppercase text-[#536173]">Expected Insurance</span>
                <input className={`${INPUT} w-full`} type="number" min="0" value={expectedInsurance} onChange={(event) => setExpectedInsurance(Number(event.target.value))} />
              </label>
              <label>
                <span className="mb-1 block text-[12px] font-extrabold uppercase text-[#536173]">Discount</span>
                <input className={`${INPUT} w-full`} type="number" min="0" value={discount} onChange={(event) => setDiscount(Number(event.target.value))} />
              </label>
              <label className="md:col-span-3">
                <span className="mb-1 block text-[12px] font-extrabold uppercase text-[#536173]">Notes</span>
                <textarea className={`${INPUT} w-full`} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Coverage assumptions, room preference or treatment notes" />
              </label>
            </div>
          </main>

          <aside className="rounded-lg border border-[#dfe7f1] bg-white p-4">
            <div className="mb-4 rounded-md bg-[#f8fbff] p-3 text-[13px]">
              <div className="text-[11px] font-extrabold uppercase text-[#64748b]">Patient</div>
              <strong className="block text-[#111827]">{selectedPatient?.data?.name || search || 'Search Patient'}</strong>
              <span className="text-[#64748b]">{selectedPatient?.data?.patientId || 'No patient selected'}</span>
            </div>
            <div className="grid gap-2 text-[13px]">
              <div className="flex justify-between"><span>Estimated Cost</span><strong>{money(estimatedCost)}</strong></div>
              <div className="flex justify-between text-green-700"><span>Expected Insurance</span><strong>- {money(expectedInsurance)}</strong></div>
              <div className="flex justify-between text-green-700"><span>Discount</span><strong>- {money(discount)}</strong></div>
            </div>
            <div className="my-4 h-px bg-[#dfe7f1]" />
            <div className="rounded-md bg-blue-50 p-4">
              <div className="text-[11px] font-extrabold uppercase text-blue-700">Estimated Patient Payable</div>
              <div className="mt-1 text-[28px] font-extrabold leading-tight text-blue-700">{money(patientPayable)}</div>
            </div>
            <div className="mt-4 text-[12px] font-semibold leading-5 text-[#64748b]">
              Convert Estimate to New Bill after patient confirmation. Actual charges stay editable before invoice generation.
            </div>
          </aside>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-[#e5e7eb] bg-white p-5">
        <h2 className="m-0 mb-4 text-[15px] font-extrabold uppercase text-[#111827]">Recent Estimates</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#f8fafc] text-left uppercase text-[#334155]">
                <th className="border-b border-[#e5edf7] px-3 py-2">Estimate</th>
                <th className="border-b border-[#e5edf7] px-3 py-2">Patient</th>
                <th className="border-b border-[#e5edf7] px-3 py-2">Type</th>
                <th className="border-b border-[#e5edf7] px-3 py-2 text-right">Cost</th>
                <th className="border-b border-[#e5edf7] px-3 py-2 text-right">Payable</th>
                <th className="border-b border-[#e5edf7] px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {savedRows.length === 0 ? (
                <tr><td className="px-3 py-8 text-center text-[#64748b]" colSpan={6}>No estimates saved yet.</td></tr>
              ) : savedRows.map((row) => (
                <tr key={row.id}>
                  <td className="border-b border-[#f1f5f9] px-3 py-2 font-bold">{row.estimateNo}</td>
                  <td className="border-b border-[#f1f5f9] px-3 py-2">{row.patientName}</td>
                  <td className="border-b border-[#f1f5f9] px-3 py-2">{row.estimateType}</td>
                  <td className="border-b border-[#f1f5f9] px-3 py-2 text-right">{money(row.estimatedCost)}</td>
                  <td className="border-b border-[#f1f5f9] px-3 py-2 text-right font-bold">{money(row.patientPayable)}</td>
                  <td className="border-b border-[#f1f5f9] px-3 py-2">{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
