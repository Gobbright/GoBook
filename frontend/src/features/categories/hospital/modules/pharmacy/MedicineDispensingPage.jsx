import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  History,
  PackageCheck,
  Pill,
  Search,
  ShieldCheck,
  Split,
} from 'lucide-react';

import { api } from '../../../../../services/api.js';
import { useModuleRecords } from '../../../shared/recordUi/useModuleRecords.js';
import { todayISO } from '../../../shared/recordUi/dateUtils.js';

const INPUT = 'h-10 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-[inherit] text-[#111827] outline-none focus:border-blue-500';
const TH = 'px-4 py-3 text-left text-[11px] font-extrabold uppercase text-[#536173]';
const TD = 'border-t border-[#edf2f7] px-4 py-3 text-[13px]';


function normalize(value = '') {
  return String(value || '').trim().toLowerCase();
}

function rxLabel(data = {}) {
  return data.rxId || data.prescriptionNo || data.rxNo || 'RX';
}

function patientMobile(data = {}) {
  return data.mobile || data.phone || data.patientMobile || '';
}

function sourceOf(data = {}) {
  return data.source || (data.visitNo || data.opdNo || data.ipdNo || '').slice(0, 3) || 'OPD';
}

function medicineName(item = {}) {
  return item.medicine || item.medicineName || item.name || item.description || 'Medicine';
}

function requiredQty(item = {}) {
  return Number(item.qty || item.quantity || item.required || item.requiredQty || 1);
}

function normalizeMedicines(data = {}) {
  if (Array.isArray(data.prescribedMedicines)) return data.prescribedMedicines;
  if (Array.isArray(data.medicinesList)) return data.medicinesList;
  if (typeof data.medicines === 'string') {
    return data.medicines.split('\n').filter(Boolean).map((line) => {
      const [name, qty] = line.split(' - ');
      return { medicine: name, qty: Number(qty) || 1 };
    });
  }
  return [];
}

function normalizeStockRecord(record) {
  const data = record.data || record;
  return {
    id: record._id || data.id,
    source: record.data ? 'pharmacy-stock' : 'inventory',
    raw: data.raw || data,
    medicineName: data.medicineName || data.description || data.name || data.productName || 'Medicine',
    batchNumber: data.batchNumber || data.batchNo || data.batch || 'MAIN',
    quantity: Number(data.quantity ?? data.stock ?? 0),
    expiryDate: data.expiryDate || data.expiry || '',
  };
}

function expiryTime(value) {
  const time = new Date(value || '2999-12-31').getTime();
  return Number.isNaN(time) ? new Date('2999-12-31').getTime() : time;
}

function isExpired(value) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  date.setHours(23, 59, 59, 999);
  return date < new Date();
}

function fmtDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function matchMedicine(stockName, prescribedName) {
  const stock = normalize(stockName);
  const prescribed = normalize(prescribedName);
  if (!stock || !prescribed) return false;
  return stock === prescribed || stock.includes(prescribed) || prescribed.includes(stock.split(' ')[0]);
}

function Button({ children, icon: Icon, onClick, tone = 'white', disabled = false }) {
  const tones = {
    blue: 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700',
    green: 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100',
    white: 'border-[#dbe4ef] bg-white text-[#374151] hover:bg-gray-50',
  };
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-[13px] font-semibold ${tones[tone]} font-[inherit] transition disabled:cursor-not-allowed disabled:opacity-60`}>
      {Icon && <Icon size={15} />}
      {children}
    </button>
  );
}

function StatusPill({ children, tone = 'slate' }) {
  const tones = {
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    red: 'border-red-200 bg-red-50 text-red-700',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    slate: 'border-slate-200 bg-slate-50 text-slate-600',
  };
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${tones[tone]}`}>{children}</span>;
}

export function MedicineDispensingPage() {
  const prescriptions = useModuleRecords('hospital/prescription');
  const dispensing = useModuleRecords('hospital/pharmacy-dispensing');
  const pharmacyStock = useModuleRecords('hospital/pharmacy-stock');
  const [inventoryStock, setInventoryStock] = useState([]);
  const [stockError, setStockError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [lines, setLines] = useState([]);
  const [pharmacist, setPharmacist] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.invListProducts({ page: 1, limit: 500, itemType: 'Product' })
      .then((res) => {
        const rows = Array.isArray(res) ? res : res.data || res.records || res.items || [];
        setInventoryStock(rows.map(normalizeStockRecord));
      })
      .catch((err) => {
        setInventoryStock([]);
        setStockError(err.message || 'Inventory products could not be loaded.');
      });
  }, []);

  const prescriptionRecords = prescriptions.records;
  const filteredPrescriptions = useMemo(() => {
    const q = normalize(search);
    return prescriptionRecords.filter((record) => {
      const data = record.data || {};
      const haystack = [rxLabel(data), data.prescriptionNo, data.patientName, patientMobile(data), data.doctorName].filter(Boolean).join(' ');
      return !q || normalize(haystack).includes(q);
    });
  }, [prescriptionRecords, search]);

  const selected = prescriptionRecords.find((record) => record._id === selectedId) || filteredPrescriptions[0] || prescriptionRecords[0];
  const selectedData = selected?.data || {};
  const stockBatches = useMemo(() => {
    const moduleBatches = pharmacyStock.records.map(normalizeStockRecord);
    const source = moduleBatches.length ? moduleBatches : inventoryStock;
    return source;
  }, [inventoryStock, pharmacyStock.records]);

  useEffect(() => {
    if (!selected) return;
    const nextLines = normalizeMedicines(selected.data).map((item, index) => {
      const name = medicineName(item);
      const batches = stockBatches
        .filter((batch) => matchMedicine(batch.medicineName, name) && Number(batch.quantity || 0) > 0)
        .sort((a, b) => expiryTime(a.expiryDate) - expiryTime(b.expiryDate));
      const suggested = batches.find((batch) => !isExpired(batch.expiryDate)) || batches[0] || null;
      const required = requiredQty(item);
      return {
        key: `${name}-${index}`,
        medicine: name,
        required,
        available: batches.reduce((sum, batch) => sum + Number(batch.quantity || 0), 0),
        batches,
        batchId: suggested?.id || '',
        dispense: Math.min(required, Number(suggested?.quantity || 0) || required),
        substitute: '',
        authorization: '',
        instructions: item.instructions || item.patientInstructions || selected.data?.doctorInstructions || '',
      };
    });
    setLines(nextLines);
    setNotes('');
    setMessage('');
  }, [selected, stockBatches]);

  const selectedAllergy = selectedData.allergy || selectedData.knownAllergies || '';
  const allergyConflicts = useMemo(() => {
    if (!selectedAllergy) return [];
    const allergy = normalize(selectedAllergy);
    return lines.filter((line) => normalize(line.medicine).includes(allergy));
  }, [lines, selectedAllergy]);
  const hasExpiredBatch = lines.some((line) => isExpired(line.batches.find((batch) => batch.id === line.batchId)?.expiryDate));
  const hasOverQty = lines.some((line) => {
    const batch = line.batches.find((item) => item.id === line.batchId);
    return Number(line.dispense || 0) > Number(batch?.quantity || 0) || Number(line.dispense || 0) > Number(line.required || 0);
  });
  const hasMissingBatch = lines.some((line) => Number(line.dispense || 0) > 0 && !line.batchId);
  const canDispense = lines.length > 0 && !hasExpiredBatch && !hasOverQty && !hasMissingBatch && allergyConflicts.length === 0;
  const totalRequired = lines.reduce((sum, line) => sum + Number(line.required || 0), 0);
  const totalDispense = lines.reduce((sum, line) => sum + Number(line.dispense || 0), 0);
  const isPartial = totalDispense < totalRequired;

  function updateLine(key, patch) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  async function deductBatch(batch, qty) {
    if (!batch) return;
    const nextQuantity = Math.max(0, Number(batch.quantity || 0) - Number(qty || 0));
    if (batch.source === 'pharmacy-stock') {
      await pharmacyStock.update(batch.id, { ...batch.raw, quantity: nextQuantity, status: nextQuantity <= 0 ? 'Out of Stock' : nextQuantity <= 10 ? 'Low' : 'Available' });
    } else {
      await api.invUpdateProduct(batch.id, { ...batch.raw, stock: nextQuantity });
    }
  }

  async function submitDispense(partialRequested) {
    if (!canDispense) {
      window.alert('Resolve stock, expiry, quantity, and allergy checks before dispensing.');
      return;
    }
    setSaving(true);
    try {
      const status = partialRequested || isPartial ? 'PARTIALLY DISPENSED' : 'DISPENSED';
      const dispensedItems = lines.map((line) => {
        const batch = line.batches.find((item) => item.id === line.batchId);
        return {
          medicine: line.medicine,
          required: line.required,
          dispensed: Number(line.dispense || 0),
          batchNumber: batch?.batchNumber || '',
          expiryDate: batch?.expiryDate || '',
          substitute: line.substitute,
          authorization: line.authorization,
          instructions: line.instructions,
        };
      });

      await dispensing.create({
        name: `${rxLabel(selectedData)} - ${selectedData.patientName || 'Patient'}`,
        rxId: rxLabel(selectedData),
        prescriptionId: selected?._id,
        patientName: selectedData.patientName,
        patientId: selectedData.patientId,
        source: sourceOf(selectedData),
        doctorName: selectedData.doctorName,
        pharmacist,
        notes,
        status,
        date: todayISO(),
        items: dispensedItems,
        workflow: sourceOf(selectedData) === 'IPD'
          ? 'Dispense -> Add Charge to IPD Bill -> Inventory Deduction'
          : 'Prescription -> Verification -> Stock Check -> Batch Selection -> Quantity Verification -> Pharmacy Billing -> Payment -> Dispense -> Inventory Deduction',
      });

      await Promise.all(lines.map((line) => deductBatch(line.batches.find((item) => item.id === line.batchId), line.dispense)));

      if (selected) {
        await prescriptions.update(selected._id, {
          ...selectedData,
          pharmacyStatus: status,
          dispensingStatus: status,
          dispensedAt: new Date().toISOString(),
        });
      }

      setMessage(`${rxLabel(selectedData)} marked as ${status.toLowerCase()}. Inventory deducted by selected FEFO batches.`);
      pharmacyStock.reload();
      dispensing.reload();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 md:p-7">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 text-[13px] font-semibold text-[#64748b]">Home &gt; Pharmacy &gt; Medicine Dispensing</div>
          <h1 className="m-0 text-[26px] font-extrabold text-[#071936]">Medicine Dispensing</h1>
          <p className="m-0 mt-1 text-[13px] font-semibold text-[#64748b]">Pharmacist verification, FEFO batch selection, issue notes, and inventory deduction.</p>
        </div>
        <StatusPill tone={sourceOf(selectedData) === 'IPD' ? 'blue' : 'green'}>{sourceOf(selectedData)} dispensing</StatusPill>
      </div>

      {message && <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-[13px] font-semibold text-green-700">{message}</div>}
      {stockError && <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-semibold text-amber-800">{stockError} Showing available pharmacy stock only.</div>}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="rounded-lg border border-[#dfe7f1] bg-white">
          <div className="border-b border-[#edf2f7] p-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_220px]">
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-extrabold uppercase text-[#536173]">Prescription</span>
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                  <input className="h-10 w-full rounded-md border border-[#dbe4ef] bg-white pl-9 pr-3 text-[13px] font-[inherit] outline-none focus:border-blue-500" placeholder="RX ID / Patient / Mobile" value={search} onChange={(event) => setSearch(event.target.value)} />
                </div>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-extrabold uppercase text-[#536173]">Load Prescription</span>
                <select className={INPUT} value={selected?._id || ''} onChange={(event) => setSelectedId(event.target.value)}>
                  {filteredPrescriptions.map((record) => (
                    <option key={record._id} value={record._id}>{rxLabel(record.data)} - {record.data?.patientName || 'Patient'}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4 rounded-md border border-[#dbe4ef] bg-[#f8fbff] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-[18px] font-extrabold text-[#071936]">{selectedData.patientName || '-'} - {rxLabel(selectedData)}</div>
                  <div className="mt-1 text-[13px] font-semibold text-[#64748b]">{selectedData.doctorName || '-'} - {sourceOf(selectedData)}</div>
                </div>
                <StatusPill tone={selectedData.dispensingStatus === 'DISPENSED' ? 'green' : 'amber'}>{selectedData.dispensingStatus || selectedData.pharmacyStatus || selectedData.status || 'PENDING'}</StatusPill>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead className="bg-[#f8fbff]">
                <tr>
                  <th className={TH}>Medicine</th>
                  <th className={TH}>Required</th>
                  <th className={TH}>Available</th>
                  <th className={TH}>Batch</th>
                  <th className={TH}>Expiry</th>
                  <th className={TH}>Dispense</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const batch = line.batches.find((item) => item.id === line.batchId);
                  const expired = isExpired(batch?.expiryDate);
                  return (
                    <tr key={line.key}>
                      <td className={`${TD} min-w-[230px]`}>
                        <div className="font-extrabold text-[#071936]">{line.medicine}</div>
                        {line.batches[0] && <div className="mt-1 text-[12px] font-semibold text-emerald-700">FEFO suggests {line.batches[0].batchNumber}</div>}
                      </td>
                      <td className={`${TD} font-extrabold text-[#334155]`}>{line.required}</td>
                      <td className={`${TD} font-extrabold ${line.available < line.required ? 'text-red-600' : 'text-[#334155]'}`}>{line.available}</td>
                      <td className={TD}>
                        <select className={`${INPUT} min-w-[150px]`} value={line.batchId} onChange={(event) => updateLine(line.key, { batchId: event.target.value })}>
                          {!line.batches.length && <option value="">No stock</option>}
                          {line.batches.map((item, index) => (
                            <option key={item.id} value={item.id}>
                              {item.batchNumber} - {item.quantity} qty{index === 0 ? ' - FEFO' : ''}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className={`${TD} font-semibold ${expired ? 'text-red-600' : 'text-[#536173]'}`}>{fmtDate(batch?.expiryDate)}{expired ? ' expired' : ''}</td>
                      <td className={TD}>
                        <input className={`${INPUT} w-24`} type="number" min="0" max={Math.min(line.required, batch?.quantity || 0)} value={line.dispense} onChange={(event) => updateLine(line.key, { dispense: Number(event.target.value || 0) })} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="border-t border-[#edf2f7] p-4">
            <div className="grid gap-3 lg:grid-cols-3">
              {lines.map((line) => (
                <div key={`${line.key}-instruction`} className="rounded-md border border-[#dbe4ef] p-3">
                  <div className="mb-2 text-[12px] font-extrabold uppercase text-[#536173]">{line.medicine}</div>
                  <input className={INPUT} placeholder="Patient instructions" value={line.instructions} onChange={(event) => updateLine(line.key, { instructions: event.target.value })} />
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    <input className={INPUT} placeholder="Substitute medicine" value={line.substitute} onChange={(event) => updateLine(line.key, { substitute: event.target.value })} />
                    <input className={INPUT} placeholder="Authorization" value={line.authorization} onChange={(event) => updateLine(line.key, { authorization: event.target.value })} />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-extrabold uppercase text-[#536173]">Pharmacist</span>
                <input className={INPUT} value={pharmacist} onChange={(event) => setPharmacist(event.target.value)} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-extrabold uppercase text-[#536173]">Notes</span>
                <input className={INPUT} placeholder="Pharmacist notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
              </label>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <StatusPill tone={allergyConflicts.length ? 'red' : 'green'}>{allergyConflicts.length ? 'Allergy conflict' : 'No allergy conflicts detected'}</StatusPill>
                <StatusPill tone={hasExpiredBatch ? 'red' : 'green'}>{hasExpiredBatch ? 'Expired batch selected' : 'Expiry check passed'}</StatusPill>
                <StatusPill tone={hasOverQty || hasMissingBatch ? 'red' : 'green'}>{hasOverQty || hasMissingBatch ? 'Quantity needs review' : 'Stock check passed'}</StatusPill>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button icon={Split} tone="amber" onClick={() => submitDispense(true)} disabled={saving || !canDispense}>Partial Dispense</Button>
                <Button icon={PackageCheck} tone="green" onClick={() => submitDispense(false)} disabled={saving || !canDispense}>Dispense All</Button>
              </div>
            </div>
          </div>
        </main>

        <aside className="space-y-5">
          <section className="rounded-lg border border-[#dfe7f1] bg-white p-4">
            <div className="mb-3 flex items-center gap-2 text-[15px] font-extrabold text-[#071936]"><ShieldCheck size={17} />Check</div>
            <div className="space-y-3 text-[13px] font-semibold text-[#334155]">
              <div className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 text-emerald-600" />FEFO recommends the first non-expired batch by nearest expiry.</div>
              <div className="flex gap-2"><AlertTriangle size={16} className={`mt-0.5 ${allergyConflicts.length ? 'text-red-600' : 'text-emerald-600'}`} />{allergyConflicts.length ? `Review allergy: ${selectedAllergy}` : 'No allergy conflicts detected'}</div>
              <div className="flex gap-2"><ClipboardCheck size={16} className="mt-0.5 text-blue-600" />Required {totalRequired} units, dispensing {totalDispense} units.</div>
            </div>
          </section>

          <section className="rounded-lg border border-[#dfe7f1] bg-white p-4">
            <div className="mb-3 flex items-center gap-2 text-[15px] font-extrabold text-[#071936]"><FileText size={17} />Workflow</div>
            <div className="space-y-2 text-[13px] font-bold text-[#334155]">
              {(sourceOf(selectedData) === 'IPD'
                ? ['Dispense', 'Add Charge to IPD Bill', 'Inventory Deduction']
                : ['Prescription', 'Pharmacist Verification', 'Stock Check', 'Batch Selection', 'Quantity Verification', 'Pharmacy Billing', 'Payment', 'Dispense', 'Inventory Deduction']
              ).map((step, index, steps) => (
                <div key={step}>
                  <div>{step}</div>
                  {index < steps.length - 1 && <div className="pl-9 text-[#94a3b8]">down</div>}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-[#dfe7f1] bg-white p-4">
            <div className="mb-3 flex items-center gap-2 text-[15px] font-extrabold text-[#071936]"><History size={17} />Dispensing History</div>
            <div className="space-y-2">
              {dispensing.records.length === 0 ? (
                <div className="rounded-md border border-dashed border-[#dbe4ef] p-3 text-[13px] font-semibold text-[#64748b]">No dispensing history yet.</div>
              ) : dispensing.records.slice(0, 5).map((record) => (
                <div key={record._id} className="rounded-md border border-[#edf2f7] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-extrabold text-[#071936]">{record.data?.rxId || record.data?.name}</div>
                    <StatusPill tone={record.data?.status === 'DISPENSED' ? 'green' : 'blue'}>{record.data?.status || 'Recorded'}</StatusPill>
                  </div>
                  <div className="mt-1 text-[12px] font-semibold text-[#64748b]">{record.data?.patientName || 'Patient'} - {record.data?.date || '-'}</div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

