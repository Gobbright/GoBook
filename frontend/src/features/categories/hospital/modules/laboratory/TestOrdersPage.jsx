import { useMemo, useState } from 'react';
import { AlertCircle, FlaskConical, Plus, Search } from 'lucide-react';

import { names, useLookupRecords, useModuleRecords } from '../../../shared/recordUi/useModuleRecords.js';
import { todayISO } from '../../../shared/recordUi/dateUtils.js';

const INPUT = 'h-10 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-[inherit] text-[#111827] outline-none focus:border-blue-500';
const TEXTAREA = 'min-h-20 w-full rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-[13px] font-[inherit] text-[#111827] outline-none focus:border-blue-500';
const SOURCES = ['All Sources', 'OPD', 'IPD', 'Emergency', 'Health Package', 'Direct'];
const PRIORITIES = ['Routine', 'Urgent'];
const STATUSES = ['ORDERED', 'SAMPLE COLLECTED', 'PROCESSING', 'RESULT ENTERED', 'VERIFIED', 'COMPLETED', 'CANCELLED', 'RECOLLECTION REQUIRED'];
const DEMO_TESTS = [
  { _id: 'demo-cbc', data: { shortName: 'CBC', name: 'CBC', testCode: 'LAB-CBC', price: 800 } },
  { _id: 'demo-sugar', data: { shortName: 'Blood Sugar', name: 'Blood Sugar', testCode: 'LAB-BS', price: 300 } },
  { _id: 'demo-crp', data: { shortName: 'CRP', name: 'CRP', testCode: 'LAB-CRP', price: 600 } },
  { _id: 'demo-thyroid', data: { shortName: 'Thyroid', name: 'Thyroid Profile', testCode: 'LAB-TFT', price: 1200 } },
];
const DEMO_ORDERS = [
  { _id: 'demo-lab-1025', data: { orderId: 'LAB-1025', patientName: 'Raj Kumar', tests: [{ name: 'CBC', price: 800 }], source: 'OPD', priority: 'Routine', status: 'ORDERED', date: todayISO() } },
  { _id: 'demo-lab-1024', data: { orderId: 'LAB-1024', patientName: 'Priya S', tests: [{ name: 'CBC', price: 800 }, { name: 'Blood Sugar', price: 300 }, { name: 'CRP', price: 600 }], source: 'IPD', priority: 'Urgent', status: 'SAMPLE COLLECTED', date: todayISO() } },
  { _id: 'demo-lab-1023', data: { orderId: 'LAB-1023', patientName: 'Arun K', tests: [{ name: 'Sugar', price: 300 }], source: 'Direct', priority: 'Routine', status: 'COMPLETED', date: todayISO() } },
];

function normalize(value = '') {
  return String(value || '').trim().toLowerCase();
}

function money(value) {
  return `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;
}

function nextOrderId(records) {
  const max = records.reduce((highest, record) => {
    const match = String(record.data?.orderId || '').match(/LAB-(\d+)/i);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 1025);
  return `LAB-${max + 1}`;
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

function testLabel(test) {
  return test.data?.shortName || test.data?.name || 'Test';
}

export function TestOrdersPage() {
  const orders = useModuleRecords('hospital/test-orders');
  const tests = useModuleRecords('hospital/lab-tests');
  const pendingCharges = useModuleRecords('hospital/pending-charges');
  const patients = useLookupRecords('hospital/patients');
  const doctors = useLookupRecords('hospital/doctors');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('Today');
  const [sourceFilter, setSourceFilter] = useState('All Sources');
  const [priorityFilter, setPriorityFilter] = useState('Priority');
  const [statusFilter, setStatusFilter] = useState('Status');
  const [showForm, setShowForm] = useState(false);
  const [testSearch, setTestSearch] = useState('');
  const [selectedTests, setSelectedTests] = useState([
    { name: 'CBC', code: 'LAB-CBC', price: 800 },
    { name: 'Blood Sugar', code: 'LAB-BS', price: 300 },
    { name: 'CRP', code: 'LAB-CRP', price: 600 },
  ]);
  const [form, setForm] = useState({
    patientName: 'Raj Kumar',
    visitNo: 'OPD-2026-00452',
    orderedBy: 'Dr. Arun Kumar',
    source: 'OPD',
    priority: 'Routine',
    clinicalNotes: 'Fever for 3 days',
    date: todayISO(),
  });
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const patientOptions = useMemo(() => {
    const existing = names(patients.records);
    return existing.length ? existing : ['Raj Kumar', 'Priya S', 'Arun K'];
  }, [patients.records]);
  const doctorOptions = useMemo(() => {
    const existing = names(doctors.records);
    return existing.length ? existing : ['Dr. Arun Kumar', 'Dr. Ravi Kumar', 'Dr. Priya'];
  }, [doctors.records]);
  const testRecords = tests.records.length ? tests.records : DEMO_TESTS;
  const orderRecords = orders.records.length ? orders.records : DEMO_ORDERS;

  const filteredTests = useMemo(() => {
    const q = normalize(testSearch);
    return testRecords.filter((record) => !q || normalize([record.data?.name, record.data?.shortName, record.data?.testCode].filter(Boolean).join(' ')).includes(q)).slice(0, 6);
  }, [testRecords, testSearch]);
  const total = selectedTests.reduce((sum, test) => sum + Number(test.price || 0), 0);

  const filteredOrders = useMemo(() => {
    const q = normalize(search);
    return orderRecords.filter((record) => {
      const data = record.data || {};
      const testText = (data.tests || []).map((item) => item.name || item.testName).join(' ');
      const matchesSearch = !q || normalize([data.orderId, data.patientName, testText].filter(Boolean).join(' ')).includes(q);
      const matchesDate = dateFilter !== 'Today' || (data.date || '').slice(0, 10) === todayISO();
      const matchesSource = sourceFilter === 'All Sources' || data.source === sourceFilter;
      const matchesPriority = priorityFilter === 'Priority' || data.priority === priorityFilter;
      const matchesStatus = statusFilter === 'Status' || data.status === statusFilter;
      return matchesSearch && matchesDate && matchesSource && matchesPriority && matchesStatus;
    });
  }, [dateFilter, orderRecords, priorityFilter, search, sourceFilter, statusFilter]);

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleTest(record) {
    const data = record.data || {};
    const item = { name: data.shortName || data.name, code: data.testCode, price: Number(data.price || 0) };
    setSelectedTests((current) => (
      current.some((test) => test.code === item.code)
        ? current.filter((test) => test.code !== item.code)
        : [...current, item]
    ));
  }

  function openForm() {
    setShowForm(true);
    setTimeout(() => document.getElementById('new-lab-order-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  }

  async function createOrder() {
    if (!form.patientName || selectedTests.length === 0) {
      setMessage('Select patient and at least one test.');
      return;
    }
    setSaving(true);
    try {
      const orderId = nextOrderId(orders.records);
      const payload = {
        ...form,
        name: `${orderId} - ${form.patientName}`,
        orderId,
        tests: selectedTests,
        testName: selectedTests.map((test) => test.name).join(', '),
        total,
        billingStatus: 'Pending',
        status: 'ORDERED',
      };
      await orders.create(payload);
      await pendingCharges.create({
        name: `${orderId} lab pending charges`,
        orderId,
        patientName: form.patientName,
        visitNo: form.visitNo,
        source: 'Laboratory',
        services: selectedTests.map((test) => ({ service: test.name, code: test.code, amount: test.price })),
        amount: total,
        status: 'Pending',
      });
      setShowForm(false);
      setMessage(`${orderId} created. Lab charges added to pending billing.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 md:p-7">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="m-0 text-[24px] font-extrabold text-[#071936]">Lab Orders</h1>
          <p className="m-0 mt-1 text-[13px] font-semibold text-[#64748b]">Central queue for OPD, IPD, emergency, package and direct lab test orders.</p>
        </div>
        <Button icon={Plus} tone="blue" onClick={openForm}>New Order</Button>
      </div>

      {message && <div className="mb-4 rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-[13px] font-semibold text-blue-700">{message}</div>}

      {showForm && (
        <section id="new-lab-order-form" className="mb-5 rounded-lg border border-[#dfe7f1] bg-white p-4">
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-[#edf2f7] pb-3">
            <div>
              <h2 className="m-0 text-[17px] font-extrabold text-[#071936]">New Lab Order</h2>
              <p className="m-0 mt-1 text-[12px] font-semibold text-[#64748b]">Select patient, visit and multiple tests. Charges move to billing pending.</p>
            </div>
            <Button tone="blue" onClick={createOrder} disabled={saving}>Create Order</Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">Patient<select className={`${INPUT} mt-1`} value={form.patientName} onChange={(event) => setField('patientName', event.target.value)}>{patientOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">Visit<input className={`${INPUT} mt-1`} value={form.visitNo} onChange={(event) => setField('visitNo', event.target.value)} /></label>
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">Ordered By<select className={`${INPUT} mt-1`} value={form.orderedBy} onChange={(event) => setField('orderedBy', event.target.value)}>{doctorOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
          </div>

          <div className="mt-5 border-t border-[#edf2f7] pt-4">
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">Search Test
              <div className="relative mt-1 max-w-md">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                <input className="h-10 w-full rounded-md border border-[#dbe4ef] bg-white pl-9 pr-3 text-[13px] font-[inherit] outline-none focus:border-blue-500" value={testSearch} onChange={(event) => setTestSearch(event.target.value)} placeholder="CBC / Blood Sugar / Thyroid" />
              </div>
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              {filteredTests.map((record) => {
                const selected = selectedTests.some((test) => test.code === record.data?.testCode);
                return (
                  <button key={record._id} type="button" onClick={() => toggleTest(record)} className={`rounded-md border px-3 py-2 text-[13px] font-semibold ${selected ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-[#dbe4ef] bg-white text-[#334155]'}`}>
                    {selected ? '✓ ' : '+ '}{testLabel(record)} - {money(record.data?.price)}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 rounded-md bg-[#f8fbff] p-3">
              <div className="mb-2 text-[12px] font-extrabold uppercase text-[#536173]">Selected</div>
              <div className="grid gap-2">
                {selectedTests.map((test) => (
                  <div key={test.code} className="flex items-center justify-between text-[13px] font-semibold text-[#334155]">
                    <span>✓ {test.name}</span>
                    <strong>{money(test.price)}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[220px_1fr_160px] md:items-end">
            <div>
              <div className="mb-2 text-[12px] font-extrabold uppercase text-[#536173]">Priority</div>
              <div className="flex gap-3">
                {PRIORITIES.map((item) => <label key={item} className="inline-flex items-center gap-2 text-[13px] font-semibold"><input type="radio" checked={form.priority === item} onChange={() => setField('priority', item)} />{item}</label>)}
              </div>
            </div>
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">Clinical Notes<textarea className={`${TEXTAREA} mt-1`} value={form.clinicalNotes} onChange={(event) => setField('clinicalNotes', event.target.value)} /></label>
            <div className="rounded-md bg-blue-50 px-3 py-3 text-right">
              <div className="text-[12px] font-extrabold text-blue-700">Total</div>
              <div className="text-[22px] font-extrabold text-blue-800">{money(total)}</div>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-lg border border-[#dfe7f1] bg-white">
        <div className="grid gap-3 border-b border-[#edf2f7] p-4 lg:grid-cols-[minmax(260px,1fr)_150px_160px_150px_170px]">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
            <input className="h-10 w-full rounded-md border border-[#dbe4ef] bg-white pl-9 pr-3 text-[13px] font-[inherit] outline-none focus:border-blue-500" placeholder="Patient / Order ID / Test" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <select className={INPUT} value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>{['Today', 'All Dates'].map((item) => <option key={item}>{item}</option>)}</select>
          <select className={INPUT} value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>{SOURCES.map((item) => <option key={item}>{item}</option>)}</select>
          <select className={INPUT} value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>{['Priority', ...PRIORITIES].map((item) => <option key={item}>{item}</option>)}</select>
          <select className={INPUT} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>{['Status', ...STATUSES].map((item) => <option key={item}>{item}</option>)}</select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-separate border-spacing-0 text-left text-[13px]">
            <thead>
              <tr className="text-[11px] uppercase text-[#64748b]">
                <th className="border-b border-[#edf2f7] px-4 py-3">Order ID</th>
                <th className="border-b border-[#edf2f7] px-4 py-3">Patient</th>
                <th className="border-b border-[#edf2f7] px-4 py-3">Tests</th>
                <th className="border-b border-[#edf2f7] px-4 py-3">Source</th>
                <th className="border-b border-[#edf2f7] px-4 py-3">Priority</th>
                <th className="border-b border-[#edf2f7] px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((record) => {
                const data = record.data || {};
                const testList = data.tests || [];
                const urgent = data.priority === 'Urgent';
                return (
                  <tr key={record._id}>
                    <td className="border-b border-[#f4f7fb] px-4 py-3 font-extrabold text-[#071936]">{data.orderId}</td>
                    <td className="border-b border-[#f4f7fb] px-4 py-3 font-semibold text-[#334155]">{data.patientName}</td>
                    <td className="border-b border-[#f4f7fb] px-4 py-3 font-semibold text-[#334155]">{testList.length === 1 ? testList[0].name : `${testList.length} Tests`}</td>
                    <td className="border-b border-[#f4f7fb] px-4 py-3 font-semibold text-[#64748b]">{data.source}</td>
                    <td className={`border-b border-[#f4f7fb] px-4 py-3 font-extrabold ${urgent ? 'text-red-700' : 'text-[#334155]'}`}>{urgent && <AlertCircle size={14} className="mr-1 inline" />}{data.priority}</td>
                    <td className="border-b border-[#f4f7fb] px-4 py-3"><span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-extrabold text-blue-700">{data.status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-5 rounded-lg border border-[#dfe7f1] bg-white p-4">
        <div className="mb-3 flex items-center gap-2 text-[13px] font-extrabold uppercase text-[#536173]"><FlaskConical size={15} />Billing Connection</div>
        <div className="flex flex-wrap items-center gap-2 text-[12px] font-bold text-[#334155]">
          {['Lab Order', 'Selected Tests', 'Pending Charges', 'Billing', 'Sample Collection'].map((step, index, arr) => (
            <span key={step} className="inline-flex items-center gap-2">
              <span className="rounded-md border border-[#dbe4ef] bg-[#f8fbff] px-2.5 py-1">{step}</span>
              {index < arr.length - 1 && <span className="text-[#94a3b8]">-&gt;</span>}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
