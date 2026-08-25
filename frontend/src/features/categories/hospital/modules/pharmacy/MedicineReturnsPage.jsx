import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  FileText,
  PackageCheck,
  Search,
  ShieldCheck,
  Undo2,
} from 'lucide-react';

import { api } from '../../../../../services/api.js';
import { useModuleRecords } from '../../../shared/recordUi/useModuleRecords.js';
import { todayISO } from '../../../shared/recordUi/dateUtils.js';

const INPUT = 'h-10 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-[inherit] text-[#111827] outline-none focus:border-blue-500';
const TH = 'px-4 py-3 text-left text-[11px] font-extrabold uppercase text-[#536173]';
const TD = 'border-t border-[#edf2f7] px-4 py-3 text-[13px]';
const DATE_FILTERS = ['Today', 'All Dates'];
const STATUS_FILTERS = ['Return Status', 'PENDING', 'COMPLETED', 'REJECTED'];
const RETURN_REASONS = [
  'Excess Medicine',
  'Doctor changed prescription',
  'Treatment discontinued',
  'Wrong item issued',
  'Duplicate issue',
  'Patient discharge',
  'Other',
];
const CONDITIONS = ['Sealed / Unopened', 'Damaged', 'Opened', 'Expired', 'Rejected'];
const NON_RETURNABLE = ['Injection', 'Insulin', 'Vaccine', 'Cold Chain', 'Controlled Drug'];


function normalize(value = '') {
  return String(value || '').trim().toLowerCase();
}

function money(value) {
  return `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;
}

function shortDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

function returnNo(records) {
  const max = records.reduce((highest, record) => {
    const n = Number(String(record.data?.returnId || '').replace(/\D/g, ''));
    return Number.isFinite(n) ? Math.max(highest, n) : highest;
  }, 214);
  return `RET-${String(max + 1).padStart(4, '0')}`;
}

function itemName(item = {}) {
  return item.name || item.medicine || item.medicineName || item.description || 'Medicine';
}

function itemQty(item = {}) {
  return Number(item.qty || item.quantity || item.dispensed || 0);
}

function itemRate(item = {}) {
  const totalAmount = Number(item.amount || item.total || 0);
  const qty = itemQty(item);
  return Number(item.rate || item.price || item.sellingPrice || (qty ? totalAmount / qty : 0));
}

function itemBatch(item = {}) {
  return item.batch || item.batchNumber || item.batchNo || '';
}

function itemExpiry(item = {}) {
  return item.expiry || item.expiryDate || '';
}

function normalizeIssue(record) {
  const data = record.data || {};
  const customer = data.customer || {};
  return {
    id: record._id,
    raw: data,
    invoiceNo: data.billNo || data.invoiceNo || data.issueNo || 'PH-DRAFT',
    patientName: data.patientName || customer.name || 'Walk-in',
    patientId: data.patientId || customer.patientId || '',
    mobile: data.mobile || data.phone || customer.phone || '',
    date: data.date || data.createdAt || '',
    items: Array.isArray(data.items) ? data.items : [],
  };
}

function StatusBadge({ value }) {
  const styles = {
    COMPLETED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    PENDING: 'border-amber-200 bg-amber-50 text-amber-700',
    REJECTED: 'border-red-200 bg-red-50 text-red-700',
  };
  return <span className={`rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${styles[value] || styles.PENDING}`}>{value || 'PENDING'}</span>;
}

function Button({ children, icon: Icon, onClick, tone = 'white', disabled = false }) {
  const tones = {
    blue: 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700',
    green: 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700',
    white: 'border-[#dbe4ef] bg-white text-[#374151] hover:bg-gray-50',
  };
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-[13px] font-semibold ${tones[tone]} font-[inherit] transition disabled:cursor-not-allowed disabled:opacity-60`}>
      {Icon && <Icon size={15} />}
      {children}
    </button>
  );
}

export function MedicineReturnsPage() {
  const pharmacyBills = useModuleRecords('hospital/pharmacy-billing');
  const returns = useModuleRecords('hospital/pharmacy-returns');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('Today');
  const [statusFilter, setStatusFilter] = useState('Return Status');
  const [showForm, setShowForm] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState('');
  const [reason, setReason] = useState('Excess Medicine');
  const [condition, setCondition] = useState('Sealed / Unopened');
  const [lines, setLines] = useState([]);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const issues = useMemo(() => {
    const source = pharmacyBills.records;
    return source.map(normalizeIssue).filter((issue) => issue.items.length);
  }, [pharmacyBills.records]);

  const returnRecords = returns.records;
  const filteredReturns = useMemo(() => {
    const q = normalize(search);
    return returnRecords.filter((record) => {
      const data = record.data || {};
      const matchesSearch = !q || normalize([data.returnId, data.patientName, data.invoiceNo, data.medicineSummary].filter(Boolean).join(' ')).includes(q);
      const matchesDate = dateFilter !== 'Today' || !data.date || String(data.date).slice(0, 10) === todayISO();
      const matchesStatus = statusFilter === 'Return Status' || data.status === statusFilter;
      return matchesSearch && matchesDate && matchesStatus;
    });
  }, [dateFilter, returnRecords, search, statusFilter]);

  const selectedIssue = issues.find((issue) => issue.id === selectedIssueId) || issues[0] || null;
  const nextReturnNo = returnNo(returns.records);

  const previousReturnedByLine = useMemo(() => {
    const map = new Map();
    if (!selectedIssue) return map;
    returns.records.forEach((record) => {
      if (record.data?.invoiceNo !== selectedIssue.invoiceNo) return;
      (record.data?.items || []).forEach((item) => {
        const key = `${normalize(item.medicine)}:${normalize(item.batchNumber)}`;
        map.set(key, (map.get(key) || 0) + Number(item.returnQty || 0));
      });
    });
    return map;
  }, [returns.records, selectedIssue]);

  function startReturn(issue = selectedIssue) {
    if (!issue) return;
    setSelectedIssueId(issue.id);
    setLines(issue.items.map((item, index) => {
      const sold = itemQty(item);
      const key = `${normalize(itemName(item))}:${normalize(itemBatch(item))}`;
      const previouslyReturned = previousReturnedByLine.get(key) || 0;
      return {
        key: `${itemName(item)}-${itemBatch(item)}-${index}`,
        item,
        medicine: itemName(item),
        sold,
        previouslyReturned,
        returnQty: 0,
        rate: itemRate(item),
        batch: itemBatch(item),
        expiry: itemExpiry(item),
      };
    }));
    setReason('Excess Medicine');
    setCondition('Sealed / Unopened');
    setShowForm(true);
    setMessage('');
  }

  function updateQty(key, value) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, returnQty: Math.max(0, Number(value || 0)) } : line)));
  }

  const refundAmount = lines.reduce((sum, line) => sum + Number(line.returnQty || 0) * Number(line.rate || 0), 0);
  const returnItems = lines.filter((line) => Number(line.returnQty || 0) > 0);
  const nonReturnableItems = returnItems.filter((line) => NON_RETURNABLE.some((term) => normalize(line.medicine).includes(normalize(term))));
  const overQtyItems = returnItems.filter((line) => Number(line.returnQty || 0) > Math.max(0, Number(line.sold || 0) - Number(line.previouslyReturned || 0)));
  const batchMismatch = returnItems.some((line) => !line.batch);
  const acceptableCondition = condition === 'Sealed / Unopened';
  const canProcess = selectedIssue && returnItems.length && reason && !nonReturnableItems.length && !overQtyItems.length && !batchMismatch;

  async function restoreInventory(line) {
    if (!acceptableCondition) return;
    if (!line.item?.id) return;
    await api.invUpdateProduct(line.item.id, {
      ...(line.item.raw || line.item),
      stock: Number(line.item.stock || 0) + Number(line.returnQty || 0),
    });
  }

  async function processReturn() {
    if (!canProcess) {
      window.alert('Resolve invoice, item, batch, quantity, return policy, and condition checks before processing.');
      return;
    }
    setSaving(true);
    try {
      const status = acceptableCondition ? 'COMPLETED' : 'PENDING';
      const payload = {
        returnId: nextReturnNo,
        invoiceNo: selectedIssue.invoiceNo,
        invoiceId: selectedIssue.id,
        patientName: selectedIssue.patientName,
        patientId: selectedIssue.patientId,
        reason,
        condition,
        reusable: acceptableCondition,
        status,
        amount: refundAmount,
        date: todayISO(),
        medicineSummary: returnItems.map((line) => line.medicine).join(', '),
        items: returnItems.map((line) => ({
          medicine: line.medicine,
          soldQty: line.sold,
          previousReturnedQty: line.previouslyReturned,
          returnQty: Number(line.returnQty || 0),
          rate: line.rate,
          amount: Number(line.returnQty || 0) * Number(line.rate || 0),
          batchNumber: line.batch,
          expiryDate: line.expiry,
          reusable: acceptableCondition,
        })),
        workflow: acceptableCondition
          ? 'Original Sale -> Return Request -> Verify Medicine -> Verify Batch / Qty -> Approve Return -> Reusable -> Inventory + -> Refund / Bill Adjustment'
          : 'Original Sale -> Return Request -> Verify Medicine -> Verify Batch / Qty -> Approve Return -> Not Reusable -> Damaged/Rejected',
        refundInstruction: refundAmount > 0 ? 'Pharmacy Return -> Billing -> Refund' : '',
        name: `Medicine Return ${nextReturnNo}`,
      };

      await returns.create(payload);
      await Promise.all(returnItems.map(restoreInventory));
      setMessage(`${nextReturnNo} recorded. ${acceptableCondition ? 'Reusable stock restored.' : 'Marked for damaged/rejected review.'} Use Billing > Refunds for any patient refund.`);
      setShowForm(false);
      setLines([]);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 md:p-7">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 text-[13px] font-semibold text-[#64748b]">Home &gt; Pharmacy &gt; Medicine Returns</div>
          <h1 className="m-0 text-[26px] font-extrabold text-[#071936]">Medicine Returns</h1>
          <p className="m-0 mt-1 text-[13px] font-semibold text-[#64748b]">Return verification, stock restoration, damaged rejection, and billing refund handoff.</p>
        </div>
        <Button icon={Undo2} tone="blue" onClick={() => startReturn()}>New Return</Button>
      </div>

      {message && <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-[13px] font-semibold text-green-700">{message}</div>}

      {!showForm ? (
        <section className="rounded-lg border border-[#dfe7f1] bg-white">
          <div className="grid gap-3 border-b border-[#edf2f7] p-4 lg:grid-cols-[minmax(260px,1fr)_140px_180px]">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
              <input className="h-10 w-full rounded-md border border-[#dbe4ef] bg-white pl-9 pr-3 text-[13px] font-[inherit] outline-none focus:border-blue-500" placeholder="Pharmacy Invoice / Patient / Medicine" value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
            <select className={INPUT} value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>{DATE_FILTERS.map((item) => <option key={item}>{item}</option>)}</select>
            <select className={INPUT} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>{STATUS_FILTERS.map((item) => <option key={item}>{item}</option>)}</select>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead className="bg-[#f8fbff]">
                <tr>
                  <th className={TH}>Return ID</th>
                  <th className={TH}>Patient</th>
                  <th className={TH}>Invoice</th>
                  <th className={TH}>Amount</th>
                  <th className={TH}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredReturns.map((record) => (
                  <tr key={record._id} className="hover:bg-gray-50">
                    <td className={`${TD} font-extrabold text-[#071936]`}>{record.data?.returnId}</td>
                    <td className={`${TD} font-semibold text-[#334155]`}>{record.data?.patientName}</td>
                    <td className={`${TD} font-semibold text-[#334155]`}>{record.data?.invoiceNo}</td>
                    <td className={`${TD} font-extrabold text-[#071936]`}>{money(record.data?.amount)}</td>
                    <td className={TD}><StatusBadge value={record.data?.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <main className="rounded-lg border border-[#dfe7f1] bg-white">
            <div className="border-b border-[#edf2f7] p-4">
              <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_220px]">
                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-extrabold uppercase text-[#536173]">Original Invoice / Issue *</span>
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                    <input className="h-10 w-full rounded-md border border-[#dbe4ef] bg-white pl-9 pr-3 text-[13px] font-[inherit] outline-none focus:border-blue-500" placeholder="Search invoice / issue" value={search} onChange={(event) => setSearch(event.target.value)} />
                  </div>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-extrabold uppercase text-[#536173]">Select Issue</span>
                  <select className={INPUT} value={selectedIssue?.id || ''} onChange={(event) => startReturn(issues.find((issue) => issue.id === event.target.value))}>
                    {issues.map((issue) => <option key={issue.id} value={issue.id}>{issue.invoiceNo} - {issue.patientName}</option>)}
                  </select>
                </label>
              </div>

              <div className="mt-4 rounded-md border border-[#dbe4ef] bg-[#f8fbff] p-4">
                <div className="text-[12px] font-extrabold uppercase text-[#536173]">Patient</div>
                <div className="mt-1 text-[17px] font-extrabold text-[#071936]">{selectedIssue?.patientName || 'Patient'} - {selectedIssue?.patientId || '-'}</div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead className="bg-[#f8fbff]">
                  <tr>
                    <th className={TH}>Medicine</th>
                    <th className={TH}>Sold</th>
                    <th className={TH}>Return Qty</th>
                    <th className={TH}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => {
                    const maxReturn = Math.max(0, Number(line.sold || 0) - Number(line.previouslyReturned || 0));
                    const over = Number(line.returnQty || 0) > maxReturn;
                    return (
                      <tr key={line.key}>
                        <td className={`${TD} min-w-[240px]`}>
                          <div className="font-extrabold text-[#071936]">{line.medicine}</div>
                          <div className="mt-1 text-[12px] font-semibold text-[#64748b]">Batch {line.batch || '-'} - Exp {shortDate(line.expiry)}</div>
                        </td>
                        <td className={`${TD} font-extrabold text-[#334155]`}>{line.sold}</td>
                        <td className={TD}>
                          <input className={`${INPUT} w-24 ${over ? 'border-red-400' : ''}`} type="number" min="0" max={maxReturn} value={line.returnQty} onChange={(event) => updateQty(line.key, event.target.value)} />
                          {line.previouslyReturned > 0 && <div className="mt-1 text-[11px] font-bold text-amber-700">{line.previouslyReturned} already returned</div>}
                        </td>
                        <td className={`${TD} font-extrabold text-[#071936]`}>{money(Number(line.returnQty || 0) * Number(line.rate || 0))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="border-t border-[#edf2f7] p-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <label>
                  <span className="mb-1.5 block text-[12px] font-extrabold uppercase text-[#536173]">Return Reason *</span>
                  <select className={INPUT} value={reason} onChange={(event) => setReason(event.target.value)}>{RETURN_REASONS.map((item) => <option key={item}>{item}</option>)}</select>
                </label>
                <label>
                  <span className="mb-1.5 block text-[12px] font-extrabold uppercase text-[#536173]">Package Condition *</span>
                  <select className={INPUT} value={condition} onChange={(event) => setCondition(event.target.value)}>{CONDITIONS.map((item) => <option key={item}>{item}</option>)}</select>
                </label>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-md border border-[#dbe4ef] p-3">
                  <div className="text-[12px] font-extrabold uppercase text-[#536173]">Batch</div>
                  <div className="mt-1 text-[14px] font-extrabold text-[#071936]">{returnItems[0]?.batch || lines[0]?.batch || '-'}</div>
                </div>
                <div className="rounded-md border border-[#dbe4ef] p-3">
                  <div className="text-[12px] font-extrabold uppercase text-[#536173]">Expiry</div>
                  <div className="mt-1 text-[14px] font-extrabold text-[#071936]">{shortDate(returnItems[0]?.expiry || lines[0]?.expiry)}</div>
                </div>
                <div className="rounded-md border border-[#dbe4ef] bg-[#f8fbff] p-3">
                  <div className="text-[12px] font-extrabold uppercase text-[#536173]">Refund Amount</div>
                  <div className="mt-1 text-[18px] font-extrabold text-[#071936]">{money(refundAmount)}</div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <Button onClick={() => setShowForm(false)}>Cancel</Button>
                <Button icon={PackageCheck} tone="green" disabled={saving || !canProcess} onClick={processReturn}>Process Return</Button>
              </div>
            </div>
          </main>

          <aside className="space-y-5">
            <section className="rounded-lg border border-[#dfe7f1] bg-white p-4">
              <div className="mb-3 flex items-center gap-2 text-[15px] font-extrabold text-[#071936]"><ShieldCheck size={17} />Validation</div>
              <div className="space-y-3 text-[13px] font-semibold text-[#334155]">
                <div className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 text-emerald-600" />Original invoice or issue exists.</div>
                <div className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 text-emerald-600" />Medicine belongs to selected invoice.</div>
                <div className="flex gap-2"><AlertTriangle size={16} className={`mt-0.5 ${overQtyItems.length ? 'text-red-600' : 'text-emerald-600'}`} />Return quantity cannot exceed sold quantity.</div>
                <div className="flex gap-2"><AlertTriangle size={16} className={`mt-0.5 ${nonReturnableItems.length ? 'text-red-600' : 'text-emerald-600'}`} />Non-returnable item policy checked.</div>
                <div className="flex gap-2"><ArrowRightLeft size={16} className="mt-0.5 text-blue-600" />Refund, if needed, continues in Billing &gt; Refunds.</div>
              </div>
            </section>

            <section className="rounded-lg border border-[#dfe7f1] bg-white p-4">
              <div className="mb-3 flex items-center gap-2 text-[15px] font-extrabold text-[#071936]"><FileText size={17} />Workflow</div>
              <div className="space-y-2 text-[13px] font-bold text-[#334155]">
                {['Original Sale', 'Return Request', 'Verify Medicine', 'Verify Batch / Qty', 'Approve Return'].map((step) => (
                  <div key={step}>
                    <div>{step}</div>
                    <div className="pl-9 text-[#94a3b8]">down</div>
                  </div>
                ))}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">Reusable<br />Inventory +<br />Refund / Bill Adjustment</div>
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-red-800">Not Reusable<br />Damaged / Rejected</div>
                </div>
              </div>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}

