import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

import { useModuleRecords } from '../../../shared/recordUi/useModuleRecords.js';

const FIELD = 'border-0 bg-transparent p-0 font-mono text-[15px] text-black outline-none';
const SELECT = 'border-0 bg-transparent p-0 font-mono text-[15px] text-black outline-none';
const STATUSES = ['Pending Results', 'Draft', 'Submitted', 'Verified', 'Published', 'Correction Required'];
const DEPARTMENTS = ['Department', 'Hematology', 'Biochemistry', 'Pathology', 'Hormone'];
const PRIORITIES = ['Priority', 'Routine', 'Urgent', 'Critical'];

const PARAMETERS = [
  { name: 'Hemoglobin', value: '14.2', unit: 'g/dL', reference: '13.0 - 17.0', low: 13, high: 17 },
  { name: 'WBC', value: '12500', unit: '/uL', reference: '4000 - 11000', low: 4000, high: 11000 },
  { name: 'Platelets', value: '220000', unit: '/uL', reference: '150000 - 450000', low: 150000, high: 450000 },
];

const DEMO_RESULT = {
  orderId: 'LAB-1025',
  patientName: 'Raj Kumar',
  patientAge: '34 Y',
  patientGender: 'Male',
  testName: 'CBC',
  department: 'Hematology',
  priority: 'Urgent',
  sampleCollectedAt: '07 Aug - 11:20 AM',
  status: 'Pending Results',
  parameters: PARAMETERS,
  technicianNotes: 'Mild leukocytosis',
  enteredBy: 'Tech. Priya',
  verifiedBy: 'Dr. / Lab In-charge',
};

function normalize(value = '') {
  return String(value || '').trim().toLowerCase();
}

function compareParameter(parameter) {
  const value = Number(String(parameter.value || '').replace(/,/g, ''));
  if (!Number.isFinite(value)) return '';
  if (parameter.high && value > parameter.high) return 'high';
  if (parameter.low && value < parameter.low) return 'low';
  return '';
}

function referenceWithCommas(value = '') {
  return value.replace(/\b(\d{4,})\b/g, (match) => Number(match).toLocaleString('en-IN'));
}

function Button({ children, onClick, disabled = false }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="font-mono text-[15px] text-black disabled:opacity-50">
      [{children}]
    </button>
  );
}

function Card({ children, className = '' }) {
  return (
    <section className={`relative rounded-[28px] bg-[#f3f3f3] px-7 py-6 font-mono text-[15px] leading-6 text-black ${className}`}>
      <div className="absolute right-5 top-5 h-4 w-4 rounded border-2 border-black before:absolute before:-right-1 before:-top-1 before:h-4 before:w-4 before:rounded before:border-2 before:border-black before:bg-[#f3f3f3]" />
      {children}
    </section>
  );
}

function resultFromOrder(order) {
  const firstTest = order.data?.tests?.[0] || {};
  return {
    ...DEMO_RESULT,
    orderId: order.data?.orderId || DEMO_RESULT.orderId,
    patientName: order.data?.patientName || DEMO_RESULT.patientName,
    patientAge: order.data?.patientAge || DEMO_RESULT.patientAge,
    patientGender: order.data?.patientGender || DEMO_RESULT.patientGender,
    testName: firstTest.name || firstTest.testName || DEMO_RESULT.testName,
    department: firstTest.category || DEMO_RESULT.department,
    priority: order.data?.priority || DEMO_RESULT.priority,
    status: order.data?.resultStatus || DEMO_RESULT.status,
    technicianNotes: order.data?.technicianNotes || DEMO_RESULT.technicianNotes,
  };
}

export function LabResultsPage() {
  const orders = useModuleRecords('hospital/test-orders');
  const results = useModuleRecords('hospital/lab-results');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('Pending Results');
  const [department, setDepartment] = useState('Department');
  const [priority, setPriority] = useState('Priority');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const record = useMemo(() => {
    const resultRecord = results.records[0]?.data;
    if (resultRecord) return { ...DEMO_RESULT, ...resultRecord };
    const order = orders.records.find((item) => ['SAMPLE COLLECTED', 'PROCESSING', 'RESULT ENTERED'].includes(item.data?.status));
    return order ? resultFromOrder(order) : DEMO_RESULT;
  }, [orders.records, results.records]);

  const [parameters, setParameters] = useState(record.parameters || PARAMETERS);
  const [technicianNotes, setTechnicianNotes] = useState(record.technicianNotes || '');
  const abnormal = parameters.find((parameter) => compareParameter(parameter));
  const visible = normalize([record.orderId, record.patientName, record.testName].join(' ')).includes(normalize(search));

  function updateParameter(index, value) {
    setParameters((current) => current.map((parameter, parameterIndex) => (parameterIndex === index ? { ...parameter, value } : parameter)));
  }

  async function save(nextStatus) {
    setSaving(true);
    try {
      const payload = {
        ...record,
        parameters,
        technicianNotes,
        status: nextStatus,
        enteredBy: record.enteredBy || 'Tech. Priya',
      };
      await results.create({ name: `${record.orderId} ${record.testName}`, ...payload });
      const order = orders.records.find((item) => item.data?.orderId === record.orderId);
      if (order) {
        await orders.update(order._id, {
          ...order.data,
          resultStatus: nextStatus,
          status: nextStatus === 'Submitted' ? 'RESULT ENTERED' : order.data.status,
          technicianNotes,
        });
      }
      setMessage(nextStatus === 'Draft' ? `${record.orderId} saved as draft.` : `${record.orderId} submitted for verification.`);
    } finally {
      setSaving(false);
    }
  }

  async function verify(nextStatus) {
    setSaving(true);
    try {
      await results.create({
        name: `${record.orderId} ${record.testName}`,
        ...record,
        parameters,
        technicianNotes,
        status: nextStatus,
        verifiedAt: new Date().toISOString(),
      });
      const order = orders.records.find((item) => item.data?.orderId === record.orderId);
      if (order) {
        await orders.update(order._id, { ...order.data, resultStatus: nextStatus, status: nextStatus === 'Verified' ? 'VERIFIED' : 'RESULT ENTERED' });
      }
      setMessage(nextStatus === 'Verified' ? `${record.orderId} verified and published.` : `${record.orderId} returned for correction.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 md:p-7">
      <h1 className="mb-6 text-[26px] font-extrabold text-black">UI</h1>
      {message && <div className="mb-4 rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-[13px] font-semibold text-blue-700">{message}</div>}

      <Card className="max-w-[960px]">
        <div>LAB RESULTS</div>

        <div className="mt-7 flex items-center gap-2">
          <span>[</span>
          <Search size={15} className="text-blue-500" />
          <input className={`${FIELD} w-[260px]`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Patient / Order / Test" />
          <span>]</span>
        </div>

        <div className="mt-7 flex flex-wrap gap-2">
          <span>[<select className={SELECT} value={status} onChange={(event) => setStatus(event.target.value)}>{STATUSES.map((item) => <option key={item}>{item}</option>)}</select>]</span>
          <span>[<select className={SELECT} value={department} onChange={(event) => setDepartment(event.target.value)}>{DEPARTMENTS.map((item) => <option key={item}>{item}</option>)}</select>]</span>
          <span>[<select className={SELECT} value={priority} onChange={(event) => setPriority(event.target.value)}>{PRIORITIES.map((item) => <option key={item}>{item}</option>)}</select>]</span>
        </div>

        <div className="mt-9 w-[470px] max-w-full border-t border-black" />

        {visible ? (
          <div className="mt-9">
            <div>{record.orderId}</div>
            <div>{record.patientName} • {record.patientAge} • {record.patientGender}</div>

            <div className="mt-8">{record.testName}</div>
            <div>Sample Collected: {record.sampleCollectedAt}</div>

            <div className="mt-8 grid max-w-[620px] grid-cols-[160px_110px_90px_1fr] gap-x-0">
              <div>Parameter</div>
              <div>Result</div>
              <div>Unit</div>
              <div>Reference</div>

              {parameters.map((parameter, index) => {
                const comparison = compareParameter(parameter);
                return (
                  <div key={parameter.name} className="contents">
                    <div className="mt-7">{parameter.name}</div>
                    <div className="mt-7">
                      [<input className={`${FIELD} w-[64px]`} value={parameter.value} onChange={(event) => updateParameter(index, event.target.value)} />]{comparison === 'high' && ' ↑'}{comparison === 'low' && ' ↓'}
                    </div>
                    <div className="mt-7">{parameter.unit}</div>
                    <div className="mt-7">{parameter.reference}</div>
                  </div>
                );
              })}
            </div>

            <div className="mt-10 w-[470px] max-w-full border-t border-black" />

            <label className="mt-9 block">
              <div>Technician Notes</div>
              <div>[ <input className={`${FIELD} w-[180px]`} value={technicianNotes} onChange={(event) => setTechnicianNotes(event.target.value)} />________________ ]</div>
            </label>

            <div className="mt-8 flex max-w-[460px] justify-between gap-5">
              <Button onClick={() => save('Draft')} disabled={saving}>Save Draft</Button>
              <Button onClick={() => save('Submitted')} disabled={saving}>Submit for Verification</Button>
            </div>
          </div>
        ) : (
          <div className="mt-9">No matching result found.</div>
        )}
      </Card>

      <h2 className="mb-6 mt-8 text-[24px] font-extrabold text-black">Verification UI</h2>

      <Card className="max-w-[960px]">
        <div>RESULT VERIFICATION</div>

        <div className="mt-8">{record.testName}</div>
        <div>{record.patientName}</div>

        {abnormal && (
          <div className="mt-9">
            <div>⚠ {abnormal.name}: {Number(abnormal.value).toLocaleString('en-IN')} {abnormal.unit}</div>
            <div>Reference: {referenceWithCommas(abnormal.reference)}</div>
          </div>
        )}

        <div className="mt-8">
          <div>Entered By</div>
          <div>{record.enteredBy}</div>
        </div>

        <div className="mt-8">
          <div>Verified By</div>
          <div>{record.verifiedBy}</div>
        </div>

        <div className="mt-8 flex max-w-[450px] justify-between gap-5">
          <Button onClick={() => verify('Correction Required')} disabled={saving}>Return for Correction</Button>
          <Button onClick={() => verify('Verified')} disabled={saving}>Verify & Publish</Button>
        </div>
      </Card>
    </div>
  );
}
