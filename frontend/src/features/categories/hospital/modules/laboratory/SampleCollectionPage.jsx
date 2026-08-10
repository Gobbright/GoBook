import { useMemo, useState } from 'react';
import { Barcode, FlaskConical, Printer, Search, X } from 'lucide-react';

import { useModuleRecords } from '../../../shared/recordUi/useModuleRecords.js';
import { todayISO } from '../../../shared/recordUi/dateUtils.js';

const INPUT = 'h-10 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-[inherit] text-[#111827] outline-none focus:border-blue-500';
const TEXTAREA = 'min-h-20 w-full rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-[13px] font-[inherit] text-[#111827] outline-none focus:border-blue-500';
const SAMPLE_TYPES = ['All Samples', 'Blood', 'Urine', 'Stool', 'Swab', 'Tissue'];
const QUEUE_STATUSES = ['Pending Collection', 'Collected', 'Received In Lab', 'Processing', 'Rejected', 'Recollection Required'];
const PRIORITIES = ['All Priority', 'Routine', 'Urgent'];
const CONDITIONS = ['Acceptable', 'Hemolyzed', 'Insufficient quantity', 'Wrong container', 'Label mismatch', 'Contaminated', 'Other'];
const DEMO_ORDERS = [
  { _id: 'demo-lab-1025', data: { orderId: 'LAB-1025', patientName: 'Raj Kumar', patientId: 'GBH-00128', visitNo: 'OPD-00452', tests: [{ name: 'CBC', sampleType: 'Blood', container: 'EDTA Tube' }, { name: 'Blood Sugar', sampleType: 'Blood', container: 'EDTA Tube' }], priority: 'Urgent', status: 'ORDERED', date: todayISO() } },
  { _id: 'demo-lab-1026', data: { orderId: 'LAB-1026', patientName: 'Priya S', patientId: 'GBH-00129', visitNo: 'IPD-0185', tests: [{ name: 'Urine Routine', sampleType: 'Urine', container: 'Urine Container' }], priority: 'Routine', status: 'ORDERED', date: todayISO() } },
];

function normalize(value = '') {
  return String(value || '').trim().toLowerCase();
}

function nowLabel() {
  return new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function orderSample(order) {
  const tests = order.data?.tests || [];
  const first = tests[0] || {};
  return {
    sampleType: first.sampleType || 'Blood',
    container: first.container || 'EDTA Tube',
  };
}

function displaySampleStatus(data = {}) {
  if (data.sampleStatus) return data.sampleStatus;
  if (data.status === 'ORDERED') return 'Pending Collection';
  if (data.status === 'SAMPLE COLLECTED') return 'Collected';
  if (data.status === 'RECOLLECTION REQUIRED') return 'Recollection Required';
  return data.status || 'Pending Collection';
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

export function SampleCollectionPage() {
  const orders = useModuleRecords('hospital/test-orders');
  const samples = useModuleRecords('hospital/sample-collection');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('Pending Collection');
  const [sampleType, setSampleType] = useState('All Samples');
  const [priority, setPriority] = useState('All Priority');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [showCollect, setShowCollect] = useState(false);
  const [form, setForm] = useState({ collectedBy: 'Tech. Priya', sampleCondition: 'Acceptable', notes: '' });
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const orderRecords = orders.records.length ? orders.records : DEMO_ORDERS;
  const queue = useMemo(() => orderRecords.filter((record) => {
    const data = record.data || {};
    const sample = orderSample(record);
    const displayStatus = displaySampleStatus(data);
    const testText = (data.tests || []).map((item) => item.name || item.testName).join(' ');
    const matchesSearch = !search || normalize([data.orderId, data.patientName, data.patientId, data.visitNo, testText, data.barcode].filter(Boolean).join(' ')).includes(normalize(search));
    const matchesStatus = status === 'Pending Collection' ? displayStatus === 'Pending Collection' : displayStatus === status;
    const matchesSample = sampleType === 'All Samples' || sample.sampleType === sampleType;
    const matchesPriority = priority === 'All Priority' || data.priority === priority;
    return matchesSearch && matchesStatus && matchesSample && matchesPriority;
  }), [orderRecords, priority, sampleType, search, status]);

  const selectedOrder = orderRecords.find((record) => record._id === selectedOrderId) || queue[0] || DEMO_ORDERS[0];
  const selectedSample = orderSample(selectedOrder);
  const barcode = `${String(selectedOrder?.data?.orderId || 'LAB1025').replace(/-/g, '')}-B01`;

  function openCollect(order) {
    setSelectedOrderId(order._id);
    setShowCollect(true);
    setTimeout(() => document.getElementById('collect-sample-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  }

  async function confirmCollection() {
    if (!selectedOrder?.data?.orderId) {
      setMessage('Select an order before confirming collection.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: `${selectedOrder.data.orderId} sample`,
        orderId: selectedOrder.data.orderId,
        patientName: selectedOrder.data.patientName,
        patientId: selectedOrder.data.patientId,
        visitNo: selectedOrder.data.visitNo,
        sampleType: selectedSample.sampleType,
        container: selectedSample.container,
        collectionDateTime: new Date().toISOString(),
        collectedBy: form.collectedBy,
        sampleCondition: form.sampleCondition,
        barcode,
        notes: form.notes,
        status: form.sampleCondition === 'Acceptable' ? 'Collected' : 'Rejected',
        rejectionReason: form.sampleCondition === 'Acceptable' ? '' : form.sampleCondition,
      };
      await samples.create(payload);
      if (!String(selectedOrder._id).startsWith('demo-')) {
        await orders.update(selectedOrder._id, {
          ...selectedOrder.data,
          sampleStatus: form.sampleCondition === 'Acceptable' ? 'Collected' : 'Recollection Required',
          status: form.sampleCondition === 'Acceptable' ? 'SAMPLE COLLECTED' : 'RECOLLECTION REQUIRED',
          barcode,
        });
      }
      setShowCollect(false);
      setMessage(form.sampleCondition === 'Acceptable'
        ? `${selectedOrder.data.orderId} collected and barcode generated.`
        : `${selectedOrder.data.orderId} rejected: ${form.sampleCondition}. Recollection required.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 md:p-7">
      {message && <div className="mb-4 rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-[13px] font-semibold text-blue-700">{message}</div>}

      {showCollect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#071936]/45 p-4">
          <section id="collect-sample-form" className="w-full max-w-3xl rounded-lg border border-[#dfe7f1] bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-[#edf2f7] px-5 py-4">
              <div>
                <h2 className="m-0 text-[18px] font-extrabold uppercase tracking-[0.02em] text-[#071936]">Collect Sample</h2>
                <p className="m-0 mt-1 text-[12px] font-semibold text-[#64748b]">Verify patient, container, barcode and condition before confirmation.</p>
              </div>
              <button type="button" onClick={() => setShowCollect(false)} className="grid h-9 w-9 place-items-center rounded-md border border-[#dbe4ef] bg-white text-[#64748b] hover:bg-gray-50">
                <X size={17} />
              </button>
            </div>

            <div className="p-5">
              <div className="grid gap-4 border-b border-[#edf2f7] pb-4 md:grid-cols-2">
                <div>
                  <div className="text-[12px] font-extrabold uppercase text-[#64748b]">Patient</div>
                  <div className="mt-1 text-[15px] font-extrabold text-[#071936]">{selectedOrder.data?.patientName} - {selectedOrder.data?.patientId || 'GBH-00128'}</div>
                </div>
                <div>
                  <div className="text-[12px] font-extrabold uppercase text-[#64748b]">Order</div>
                  <div className="mt-1 text-[15px] font-extrabold text-[#071936]">{selectedOrder.data?.orderId?.replace('LAB-', 'LAB-2026-00') || 'LAB-2026-001025'}</div>
                </div>
              </div>

              <div className="grid gap-4 py-4 md:grid-cols-2">
                <div>
                  <div className="text-[12px] font-extrabold uppercase text-[#64748b]">Sample Type</div>
                  <div className="mt-1 rounded-md border border-[#dbe4ef] bg-[#f8fbff] px-3 py-2 text-[14px] font-extrabold text-[#071936]">{selectedSample.sampleType}</div>
                </div>
                <div>
                  <div className="text-[12px] font-extrabold uppercase text-[#64748b]">Container</div>
                  <div className="mt-1 rounded-md border border-[#dbe4ef] bg-[#f8fbff] px-3 py-2 text-[14px] font-extrabold text-[#071936]">{selectedSample.container}</div>
                </div>
                <div>
                  <div className="text-[12px] font-extrabold uppercase text-[#64748b]">Collection Date/Time</div>
                  <div className="mt-1 rounded-md border border-[#dbe4ef] bg-[#f8fbff] px-3 py-2 text-[14px] font-extrabold text-[#071936]">{nowLabel()}</div>
                </div>
                <label className="text-[12px] font-extrabold uppercase text-[#536173]">Collected By<input className={`${INPUT} mt-1`} value={form.collectedBy} onChange={(event) => setForm({ ...form, collectedBy: event.target.value })} /></label>
                <label className="text-[12px] font-extrabold uppercase text-[#536173]">Sample Condition<select className={`${INPUT} mt-1`} value={form.sampleCondition} onChange={(event) => setForm({ ...form, sampleCondition: event.target.value })}>{CONDITIONS.map((item) => <option key={item}>{item}</option>)}</select></label>
                <div>
                  <div className="mb-1 text-[12px] font-extrabold uppercase text-[#536173]">Barcode</div>
                  <div className="flex gap-2">
                    <div className="flex h-10 flex-1 items-center rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-extrabold text-[#071936]"><Barcode size={15} className="mr-2 text-blue-600" />{barcode}</div>
                    <Button icon={Printer}>Print Barcode</Button>
                  </div>
                </div>
                <label className="md:col-span-2 text-[12px] font-extrabold uppercase text-[#536173]">Collection Notes<textarea className={`${TEXTAREA} mt-1`} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
              </div>

              <div className="flex justify-end gap-2 border-t border-[#edf2f7] pt-4">
                <Button onClick={() => setShowCollect(false)}>Cancel</Button>
                <Button tone="blue" onClick={confirmCollection} disabled={saving}>Confirm Collection</Button>
              </div>
            </div>
          </section>
        </div>
      )}

      <section className="rounded-lg border border-[#dfe7f1] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf2f7] px-5 py-4">
          <div>
            <h1 className="m-0 text-[20px] font-extrabold uppercase tracking-[0.02em] text-[#071936]">Sample Collection</h1>
            <p className="m-0 mt-1 text-[12px] font-semibold text-[#64748b]">Pending collection queue for technicians.</p>
          </div>
          <div className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[12px] font-extrabold text-blue-700">{queue.length} Pending</div>
        </div>

        <div className="grid gap-3 border-b border-[#edf2f7] p-4 lg:grid-cols-[minmax(260px,1fr)_210px_170px_150px]">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
            <input className="h-10 w-full rounded-md border border-[#dbe4ef] bg-white pl-9 pr-3 text-[13px] font-[inherit] outline-none focus:border-blue-500" placeholder="Order ID / Patient / Barcode" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <select className={INPUT} value={status} onChange={(event) => setStatus(event.target.value)}>{QUEUE_STATUSES.map((item) => <option key={item}>{item}</option>)}</select>
          <select className={INPUT} value={sampleType} onChange={(event) => setSampleType(event.target.value)}>{SAMPLE_TYPES.map((item) => <option key={item}>{item}</option>)}</select>
          <select className={INPUT} value={priority} onChange={(event) => setPriority(event.target.value)}>{PRIORITIES.map((item) => <option key={item}>{item}</option>)}</select>
        </div>

        {queue.length === 0 ? (
          <div className="px-5 py-12 text-center text-[13px] font-semibold text-[#64748b]">No samples in this queue.</div>
        ) : (
          <div className="divide-y divide-[#edf2f7]">
            {queue.map((order) => {
              const data = order.data || {};
              const sample = orderSample(order);
              const tests = data.tests || [];
              const urgent = data.priority === 'Urgent';
              return (
                <div key={order._id} className="grid gap-4 p-5 lg:grid-cols-[minmax(300px,1fr)_240px_auto] lg:items-center">
                  <div className="min-w-0">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[15px] font-extrabold text-[#071936]">{data.orderId}</span>
                      <span className={`rounded-full px-3 py-1 text-[11px] font-extrabold ${urgent ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'}`}>{data.priority || 'Routine'}</span>
                    </div>
                    <div className="text-[14px] font-extrabold text-[#071936]">{data.patientName} - {data.patientId || 'GBH-00128'}</div>
                    <div className="mt-1 text-[12px] font-semibold text-[#64748b]">{data.visitNo || '-'}</div>
                    <div className="mt-4">
                      <div className="text-[12px] font-extrabold uppercase text-[#64748b]">Tests</div>
                      <div className="mt-2 space-y-1">
                        {tests.map((test, index) => <div key={`${test.name}-${index}`} className="text-[13px] font-bold text-[#334155]">{test.name}</div>)}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-md border border-[#dbe4ef] bg-[#f8fbff] p-4">
                    <div className="flex items-center gap-2 text-[12px] font-extrabold uppercase text-[#64748b]"><FlaskConical size={14} />Required Sample</div>
                    <div className="mt-3 text-[15px] font-extrabold text-[#071936]">{sample.sampleType}</div>
                    <div className="text-[13px] font-semibold text-[#64748b]">{sample.container}</div>
                  </div>
                  <div className="flex justify-end">
                    <Button tone="blue" onClick={() => openCollect(order)}>Collect Sample</Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
