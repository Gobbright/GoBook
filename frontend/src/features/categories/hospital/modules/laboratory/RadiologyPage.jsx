import { useMemo, useState } from 'react';
import { Activity, Plus, Search } from 'lucide-react';

import { useModuleRecords } from '../../../shared/recordUi/useModuleRecords.js';
import { todayISO } from '../../../shared/recordUi/dateUtils.js';

const INPUT = 'h-10 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-[inherit] text-[#111827] outline-none focus:border-blue-500';
const TEXTAREA = 'min-h-20 w-full rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-[13px] font-[inherit] text-[#111827] outline-none focus:border-blue-500';
const MODALITIES = ['All Modalities', 'X-Ray', 'CT', 'MRI', 'Ultrasound', 'Mammography', 'Fluoroscopy'];
const STATUSES = ['All Status', 'WAITING', 'IN PROGRESS', 'COMPLETED', 'CANCELLED'];
const PRIORITIES = ['All Priority', 'Routine', 'URGENT'];
const SCANS = {
  'Chest X-Ray': { modality: 'X-Ray', bodyPart: 'Chest', price: 1200 },
  'CT Brain': { modality: 'CT', bodyPart: 'Brain', price: 4500 },
  'MRI Knee': { modality: 'MRI', bodyPart: 'Knee', price: 8000 },
  'Ultrasound Abdomen': { modality: 'Ultrasound', bodyPart: 'Abdomen', price: 1800 },
};


function normalize(value = '') {
  return String(value || '-').trim().toLowerCase();
}

function money(value) {
  return `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;
}

function nextRadiologyId(records) {
  const max = records.reduce((highest, record) => {
    const match = String(record.data?.orderId || '-').match(/RAD-(\d+)/i);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 251);
  return `RAD-${String(max + 1).padStart(4, '0')}`;
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

function StatusBadge({ value }) {
  const styles = {
    WAITING: 'bg-amber-50 text-amber-700 border-amber-200',
    'IN PROGRESS': 'bg-blue-50 text-blue-700 border-blue-200',
    COMPLETED: 'bg-green-50 text-green-700 border-green-200',
    CANCELLED: 'bg-red-50 text-red-700 border-red-200',
  };
  return <span className={`rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${styles[value] || 'border-slate-200 bg-slate-50 text-slate-600'}`}>{value || 'WAITING'}</span>;
}

export function RadiologyPage() {
  const orders = useModuleRecords('hospital/radiology-workflow');
  const pendingCharges = useModuleRecords('hospital/pending-charges');
  const [search, setSearch] = useState('');
  const [modality, setModality] = useState('All Modalities');
  const [status, setStatus] = useState('All Status');
  const [priority, setPriority] = useState('All Priority');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    patientName: '',
    visitNo: 'OPD-00452',
    orderedBy: '',
    scan: 'Chest X-Ray',
    priority: 'Routine',
    clinicalIndication: 'Persistent cough',
    notes: '',
  });
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const records = orders.records;
  const scanDetails = SCANS[form.scan] || SCANS['Chest X-Ray'];
  const filteredOrders = useMemo(() => {
    const q = normalize(search);
    return records.filter((record) => {
      const data = record.data || {};
      const matchesSearch = !q || normalize([data.orderId, data.patientName, data.scan].filter(Boolean).join(' ')).includes(q);
      const matchesModality = modality === 'All Modalities' || data.modality === modality;
      const matchesStatus = status === 'All Status' || data.status === status;
      const matchesPriority = priority === 'All Priority' || data.priority === priority;
      return matchesSearch && matchesModality && matchesStatus && matchesPriority;
    });
  }, [modality, priority, records, search, status]);

  const summary = [
    { label: 'Orders', value: 48 },
    { label: 'Waiting', value: 12 },
    { label: 'In Progress', value: 6 },
    { label: 'Completed', value: 30 },
  ];

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function createOrder() {
    setSaving(true);
    try {
      const orderId = nextRadiologyId(records);
      const payload = {
        name: form.scan,
        orderId,
        patientName: form.patientName,
        visitNo: form.visitNo,
        orderedBy: form.orderedBy,
        scan: form.scan,
        modality: scanDetails.modality,
        bodyPart: scanDetails.bodyPart,
        priority: form.priority,
        clinicalIndication: form.clinicalIndication,
        notes: form.notes,
        price: scanDetails.price,
        status: 'WAITING',
        date: todayISO(),
      };
      await orders.create(payload);
      await pendingCharges.create({
        name: `${form.scan} - ${form.patientName}`,
        patientName: form.patientName,
        visitNo: form.visitNo,
        source: 'Radiology',
        department: 'Radiology',
        service: form.scan,
        amount: scanDetails.price,
        status: 'Pending',
        linkedOrderId: orderId,
        date: todayISO(),
      });
      setShowForm(false);
      setMessage(`${orderId} created and sent to pending charges.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 md:p-7">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 text-[13px] font-semibold text-[#64748b]">Home &gt; Diagnostics &gt; Radiology</div>
          <h1 className="m-0 text-[26px] font-extrabold text-[#071936]">Radiology</h1>
          <p className="m-0 mt-1 text-[13px] font-semibold text-[#64748b]">Manage scan orders, modality workflow, reporting status and billing handoff.</p>
        </div>
        <Button tone="blue" icon={Plus} onClick={() => setShowForm(true)}>New Order</Button>
      </div>

      {message && <div className="mb-4 rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-[13px] font-semibold text-blue-700">{message}</div>}

      {showForm && (
        <section className="mb-5 rounded-lg border border-[#dfe7f1] bg-white p-4">
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-[#edf2f7] pb-3">
            <div>
              <h2 className="m-0 text-[18px] font-extrabold text-[#071936]">New Radiology Order</h2>
              <p className="m-0 mt-1 text-[12px] font-semibold text-[#64748b]">Create a scan order and push the charge to billing automatically.</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowForm(false)}>Cancel</Button>
              <Button tone="blue" onClick={createOrder} disabled={saving}>Create Order</Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">Patient<input className={`${INPUT} mt-1`} value={form.patientName} onChange={(event) => setField('patientName', event.target.value)} placeholder="Search Patient" /></label>
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">Visit<select className={`${INPUT} mt-1`} value={form.visitNo} onChange={(event) => setField('visitNo', event.target.value)}><option>OPD-00452</option><option>IPD-0182</option><option>Direct</option></select></label>
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">Ordered By<input className={`${INPUT} mt-1`} value={form.orderedBy} onChange={(event) => setField('orderedBy', event.target.value)} /></label>
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">Scan *<select className={`${INPUT} mt-1`} value={form.scan} onChange={(event) => setField('scan', event.target.value)}>{Object.keys(SCANS).map((item) => <option key={item}>{item}</option>)}</select></label>
            <div className="rounded-md bg-[#f8fbff] p-3 text-[13px] font-semibold text-[#334155]"><div className="text-[12px] font-extrabold uppercase text-[#64748b]">Modality</div><div className="mt-1 text-[16px] font-extrabold text-[#071936]">{scanDetails.modality}</div></div>
            <div className="rounded-md bg-[#f8fbff] p-3 text-[13px] font-semibold text-[#334155]"><div className="text-[12px] font-extrabold uppercase text-[#64748b]">Price</div><div className="mt-1 text-[16px] font-extrabold text-[#071936]">{money(scanDetails.price)}</div></div>
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">Body Part<select className={`${INPUT} mt-1`} value={scanDetails.bodyPart} disabled><option>{scanDetails.bodyPart}</option></select></label>
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">Priority<select className={`${INPUT} mt-1`} value={form.priority} onChange={(event) => setField('priority', event.target.value)}><option>Routine</option><option>URGENT</option></select></label>
            <label className="md:col-span-3 text-[12px] font-extrabold uppercase text-[#536173]">Clinical Indication<textarea className={`${TEXTAREA} mt-1`} value={form.clinicalIndication} onChange={(event) => setField('clinicalIndication', event.target.value)} /></label>
            <label className="md:col-span-3 text-[12px] font-extrabold uppercase text-[#536173]">Notes<textarea className={`${TEXTAREA} mt-1`} value={form.notes} onChange={(event) => setField('notes', event.target.value)} /></label>
          </div>
        </section>
      )}

      <div className="mb-5 grid gap-4 md:grid-cols-4">
        {summary.map((item) => (
          <div key={item.label} className="rounded-lg border border-[#dfe7f1] bg-white p-4">
            <div className="text-[24px] font-extrabold text-[#071936]">{item.value}</div>
            <div className="mt-1 text-[12px] font-extrabold uppercase text-[#64748b]">{item.label}</div>
          </div>
        ))}
      </div>

      <section className="rounded-lg border border-[#dfe7f1] bg-white">
        <div className="grid gap-3 border-b border-[#edf2f7] p-4 lg:grid-cols-[minmax(260px,1fr)_170px_150px_150px]">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
            <input className="h-10 w-full rounded-md border border-[#dbe4ef] bg-white pl-9 pr-3 text-[13px] font-[inherit] outline-none focus:border-blue-500" placeholder="Patient / Order" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <select className={INPUT} value={modality} onChange={(event) => setModality(event.target.value)}>{MODALITIES.map((item) => <option key={item}>{item}</option>)}</select>
          <select className={INPUT} value={status} onChange={(event) => setStatus(event.target.value)}>{STATUSES.map((item) => <option key={item}>{item}</option>)}</select>
          <select className={INPUT} value={priority} onChange={(event) => setPriority(event.target.value)}>{PRIORITIES.map((item) => <option key={item}>{item}</option>)}</select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-[13px]">
            <thead className="bg-[#f8fbff] text-[11px] uppercase text-[#536173]">
              <tr>
                <th className="px-4 py-3 font-extrabold">Order</th>
                <th className="px-4 py-3 font-extrabold">Patient</th>
                <th className="px-4 py-3 font-extrabold">Scan</th>
                <th className="px-4 py-3 font-extrabold">Modality</th>
                <th className="px-4 py-3 font-extrabold">Priority</th>
                <th className="px-4 py-3 font-extrabold">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((record) => {
                const data = record.data || {};
                return (
                  <tr key={record._id} className="border-t border-[#edf2f7]">
                    <td className="px-4 py-3 font-extrabold text-[#071936]">{data.orderId}</td>
                    <td className="px-4 py-3 font-semibold text-[#334155]">{data.patientName}</td>
                    <td className="px-4 py-3 font-semibold text-[#071936]">{data.scan || data.name}</td>
                    <td className="px-4 py-3 font-semibold text-[#64748b]">{data.modality}</td>
                    <td className="px-4 py-3 font-semibold text-[#334155]">{data.priority}</td>
                    <td className="px-4 py-3"><StatusBadge value={data.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}


