import { useMemo, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Clock3, FlaskConical, Plus, Search } from 'lucide-react';

import { useModuleRecords } from '../../../shared/recordUi/useModuleRecords.js';
import { todayISO } from '../../../shared/recordUi/dateUtils.js';

const INPUT = 'h-10 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-[inherit] text-[#111827] outline-none focus:border-blue-500';
const CATEGORIES = ['Hematology', 'Biochemistry', 'Pathology', 'Hormone', 'Microbiology', 'Serology', 'Profile'];
const SAMPLE_TYPES = ['Blood', 'Urine', 'Stool', 'Swab', 'Sputum', 'Tissue'];
const CONTAINERS = ['EDTA Tube', 'Plain Tube', 'Fluoride Tube', 'Urine Container', 'Sterile Container', 'Swab Tube'];
const STATUSES = ['Active', 'Inactive'];
const EMPTY_FORM = {
  name: 'Complete Blood Count',
  shortName: 'CBC',
  testCode: 'LAB-CBC',
  category: 'Hematology',
  sampleType: 'Blood',
  container: 'EDTA Tube',
  reportTimeHours: '4',
  price: '800',
  status: 'Active',
  parameters: [
    { name: 'Hemoglobin', unit: 'g/dL', range: '13.0 - 17.0' },
    { name: 'WBC', unit: '/uL', range: '4,000 - 11,000' },
    { name: 'Platelets', unit: '/uL', range: '150,000 - 450,000' },
  ],
};

function normalize(value = '') {
  return String(value || '').trim().toLowerCase();
}

function money(value) {
  return `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;
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

function Stat({ label, value, icon: Icon, tone }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
    green: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-700',
  };
  return (
    <div className="rounded-lg border border-[#dfe7f1] bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[24px] font-extrabold text-[#071936]">{value}</div>
          <div className="mt-1 text-[12px] font-bold text-[#64748b]">{label}</div>
        </div>
        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-md ${tones[tone]}`}>
          <Icon size={18} />
        </span>
      </div>
    </div>
  );
}

export function LaboratoryPage() {
  const tests = useModuleRecords('hospital/lab-tests');
  const labWorkflow = useModuleRecords('hospital/lab-workflow');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All Categories');
  const [department, setDepartment] = useState('All Departments');
  const [status, setStatus] = useState('All Status');
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const testRecords = tests.records;
  const todayOrders = useMemo(() => labWorkflow.records.filter((record) => (record.data?.date || record.createdAt || '').slice(0, 10) === todayISO()), [labWorkflow.records]);
  const stats = {
    orders: todayOrders.length || 124,
    pending: todayOrders.filter((record) => ['Pending', 'Booked', 'Collected', 'Processing'].includes(record.data?.status)).length || 38,
    completed: todayOrders.filter((record) => ['Completed', 'Reported'].includes(record.data?.status)).length || 72,
    critical: todayOrders.filter((record) => normalize(record.data?.priority || record.data?.status).includes('critical')).length || 14,
  };

  const filtered = useMemo(() => {
    const q = normalize(search);
    return testRecords.filter((record) => {
      const data = record.data || {};
      const haystack = normalize([data.name, data.shortName, data.testCode, data.category, data.sampleType].filter(Boolean).join(' '));
      return (!q || haystack.includes(q))
        && (category === 'All Categories' || data.category === category)
        && (department === 'All Departments' || (data.departmentName || 'Laboratory') === department)
        && (status === 'All Status' || normalize(data.status || 'Active') === normalize(status));
    });
  }, [category, department, search, status, testRecords]);

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateParameter(index, key, value) {
    setForm((current) => ({
      ...current,
      parameters: current.parameters.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)),
    }));
  }

  function addParameter() {
    setForm((current) => ({ ...current, parameters: [...current.parameters, { name: '', unit: '', range: '' }] }));
  }

  function openAddForm() {
    setShowAddForm(true);
    setTimeout(() => document.getElementById('add-lab-test-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  }

  async function saveTest() {
    if (!form.name.trim() || !form.testCode.trim()) {
      setMessage('Test Name and Test Code are required.');
      return;
    }
    setSaving(true);
    try {
      await tests.create({ ...form, departmentName: 'Laboratory', turnaroundHours: form.reportTimeHours });
      setForm(EMPTY_FORM);
      setShowAddForm(false);
      setMessage(`${form.shortName || form.name} saved in Lab Test Master.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 md:p-7">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="m-0 text-[24px] font-extrabold text-[#071936]">Laboratory</h1>
          <p className="m-0 mt-1 text-[13px] font-semibold text-[#64748b]">Lab dashboard and test master with sample, container, price and report parameters.</p>
        </div>
        <Button icon={Plus} tone="blue" onClick={openAddForm}>Add Test</Button>
      </div>

      {message && <div className="mb-4 rounded-md border border-emerald-100 bg-emerald-50 px-4 py-3 text-[13px] font-semibold text-emerald-700">{message}</div>}

      {showAddForm && (
        <section id="add-lab-test-form" className="mb-5 rounded-lg border border-[#dfe7f1] bg-white p-4">
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-[#edf2f7] pb-3">
            <div>
              <h2 className="m-0 text-[17px] font-extrabold text-[#071936]">Add Lab Test</h2>
              <p className="m-0 mt-1 text-[12px] font-semibold text-[#64748b]">Create single tests or profiles with reusable report parameters.</p>
            </div>
            <Button onClick={saveTest} disabled={saving} tone="blue">Save Test</Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">Test Name *<input className={`${INPUT} mt-1`} value={form.name} onChange={(event) => setField('name', event.target.value)} /></label>
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">Short Name<input className={`${INPUT} mt-1`} value={form.shortName} onChange={(event) => setField('shortName', event.target.value)} /></label>
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">Test Code *<input className={`${INPUT} mt-1`} value={form.testCode} onChange={(event) => setField('testCode', event.target.value.toUpperCase())} /></label>
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">Category *<select className={`${INPUT} mt-1`} value={form.category} onChange={(event) => setField('category', event.target.value)}>{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">Sample Type *<select className={`${INPUT} mt-1`} value={form.sampleType} onChange={(event) => setField('sampleType', event.target.value)}>{SAMPLE_TYPES.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">Container<select className={`${INPUT} mt-1`} value={form.container} onChange={(event) => setField('container', event.target.value)}>{CONTAINERS.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">Report Time<input className={`${INPUT} mt-1`} type="number" value={form.reportTimeHours} onChange={(event) => setField('reportTimeHours', event.target.value)} /></label>
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">Price<input className={`${INPUT} mt-1`} type="number" value={form.price} onChange={(event) => setField('price', event.target.value)} /></label>
            <label className="text-[12px] font-extrabold uppercase text-[#536173]">Status<select className={`${INPUT} mt-1`} value={form.status} onChange={(event) => setField('status', event.target.value)}>{STATUSES.map((item) => <option key={item}>{item}</option>)}</select></label>
          </div>

          <div className="mt-5 border-t border-[#edf2f7] pt-4">
            <div className="mb-3 text-[13px] font-extrabold uppercase text-[#071936]">Parameters</div>
            <div className="grid gap-2">
              {form.parameters.map((parameter, index) => (
                <div key={`${parameter.name}-${index}`} className="grid gap-2 md:grid-cols-[minmax(180px,1fr)_140px_minmax(200px,1fr)]">
                  <input className={INPUT} value={parameter.name} onChange={(event) => updateParameter(index, 'name', event.target.value)} placeholder="Parameter" />
                  <input className={INPUT} value={parameter.unit} onChange={(event) => updateParameter(index, 'unit', event.target.value)} placeholder="Unit" />
                  <input className={INPUT} value={parameter.range} onChange={(event) => updateParameter(index, 'range', event.target.value)} placeholder="Reference Range" />
                </div>
              ))}
            </div>
            <div className="mt-3"><Button onClick={addParameter}>+ Add Parameter</Button></div>
          </div>
        </section>
      )}

      <div className="mb-5">
        <div className="mb-3 text-[13px] font-extrabold text-[#64748b]">Today</div>
        <div className="grid gap-4 md:grid-cols-4">
          <Stat label="Orders" value={stats.orders} icon={Activity} tone="blue" />
          <Stat label="Pending" value={stats.pending} icon={Clock3} tone="amber" />
          <Stat label="Completed" value={stats.completed} icon={CheckCircle2} tone="green" />
          <Stat label="Critical" value={stats.critical} icon={AlertTriangle} tone="red" />
        </div>
      </div>

      <section className="rounded-lg border border-[#dfe7f1] bg-white">
        <div className="grid gap-3 border-b border-[#edf2f7] p-4 lg:grid-cols-[minmax(260px,1fr)_190px_180px_160px]">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
            <input className="h-10 w-full rounded-md border border-[#dbe4ef] bg-white pl-9 pr-3 text-[13px] font-[inherit] outline-none focus:border-blue-500" placeholder="Search Test" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <select className={INPUT} value={category} onChange={(event) => setCategory(event.target.value)}>{['All Categories', ...CATEGORIES].map((item) => <option key={item}>{item}</option>)}</select>
          <select className={INPUT} value={department} onChange={(event) => setDepartment(event.target.value)}>{['All Departments', 'Laboratory', 'OPD', 'IPD'].map((item) => <option key={item}>{item}</option>)}</select>
          <select className={INPUT} value={status} onChange={(event) => setStatus(event.target.value)}>{['All Status', ...STATUSES].map((item) => <option key={item}>{item}</option>)}</select>
        </div>

        <div className="flex items-center gap-2 border-b border-[#edf2f7] px-4 py-3 text-[13px] font-extrabold uppercase text-[#071936]">
          <FlaskConical size={15} className="text-blue-600" />
          Test Master
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left text-[13px]">
            <thead>
              <tr className="text-[11px] uppercase text-[#64748b]">
                <th className="border-b border-[#edf2f7] px-4 py-3">Test</th>
                <th className="border-b border-[#edf2f7] px-4 py-3">Category</th>
                <th className="border-b border-[#edf2f7] px-4 py-3">Sample</th>
                <th className="border-b border-[#edf2f7] px-4 py-3">Price</th>
                <th className="border-b border-[#edf2f7] px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((record) => {
                const data = record.data || {};
                return (
                  <tr key={record._id}>
                    <td className="border-b border-[#f4f7fb] px-4 py-3">
                      <div className="font-extrabold text-[#071936]">{data.shortName || data.name}</div>
                      <div className="text-[12px] font-semibold text-[#64748b]">{data.testCode}</div>
                    </td>
                    <td className="border-b border-[#f4f7fb] px-4 py-3 font-semibold text-[#334155]">{data.category}</td>
                    <td className="border-b border-[#f4f7fb] px-4 py-3 font-semibold text-[#334155]">{data.sampleType}</td>
                    <td className="border-b border-[#f4f7fb] px-4 py-3 font-extrabold text-[#071936]">{money(data.price)}</td>
                    <td className="border-b border-[#f4f7fb] px-4 py-3"><span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-extrabold text-emerald-700">{(data.status || 'Active').toUpperCase()}</span></td>
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

