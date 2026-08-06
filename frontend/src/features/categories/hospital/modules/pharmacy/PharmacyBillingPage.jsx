import { useEffect, useMemo, useState } from 'react';
import { Barcode, CreditCard, FileText, Pause, Pill, Printer, Search, Trash2, UserRound, Wallet, X } from 'lucide-react';

import { api } from '../../../../../services/api.js';
import { useModuleRecords } from '../../../shared/recordUi/useModuleRecords.js';

const INPUT = 'border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] text-[#111827] w-full outline-none focus:border-blue-500 font-[inherit] bg-white';
const PAYMENT_METHODS = ['Cash', 'UPI', 'Card'];
const SAMPLE_PRESCRIPTION = [
  { medicine: 'Paracetamol 500mg', qty: 2 },
  { medicine: 'Amoxicillin 250mg', qty: 1 },
];

function money(value) {
  return `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;
}

function nextBillNo(records) {
  const max = records.reduce((highest, record) => {
    const number = String(record.data?.billNo || '').replace(/\D/g, '');
    return Math.max(highest, Number(number) || 0);
  }, 244);
  return `PH-${String(max + 1).padStart(5, '0')}`;
}

function phoneOf(data = {}) {
  return data.phone || data.mobile || '';
}

function normalizeMedicine(product = {}) {
  return {
    id: product._id || product.id,
    name: product.description || product.name || product.productName || 'Unnamed Medicine',
    code: product.code || '',
    barcode: product.barcode || '',
    batch: product.batchNo || product.batch || 'MAIN',
    expiry: product.expiryDate || product.expiry || '',
    stock: Number(product.stock || 0),
    rate: Number(product.rate || product.sellingPrice || product.price || 0),
    gstRate: Number(product.gstRate || product.taxRate || 0),
    raw: product,
  };
}

function expiryLabel(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', { month: '2-digit', year: '2-digit' });
}

function isExpired(value) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  date.setHours(23, 59, 59, 999);
  return date < new Date();
}

function itemAmount(item) {
  return Number(item.qty || 0) * Number(item.rate || 0);
}

function Button({ children, onClick, tone = 'white', disabled = false, className = '' }) {
  const tones = {
    blue: 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700',
    green: 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700',
    red: 'border-red-100 bg-red-50 text-red-700 hover:bg-red-100',
    white: 'border-[#dbe4ef] bg-white text-[#374151] hover:bg-gray-50',
  };
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md border px-3 text-[13px] font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${tones[tone]} ${className}`}>
      {children}
    </button>
  );
}

export function PharmacyBillingPage() {
  const patients = useModuleRecords('hospital/patients');
  const pharmacyBills = useModuleRecords('hospital/pharmacy-billing');
  const payments = useModuleRecords('hospital/payments');
  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientMenu, setShowPatientMenu] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [walkIn, setWalkIn] = useState(false);
  const [prescription, setPrescription] = useState('');
  const [medicineSearch, setMedicineSearch] = useState('');
  const [medicines, setMedicines] = useState([]);
  const [medicineLoading, setMedicineLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [discount, setDiscount] = useState(10);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [heldBills, setHeldBills] = useState([]);
  const [message, setMessage] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);

  const billNo = useMemo(() => nextBillNo(pharmacyBills.records), [pharmacyBills.records]);
  const nextReceiptNo = useMemo(() => {
    const max = payments.records.reduce((highest, record) => {
      const n = Number(String(record.data?.receiptNo || '').replace(/\D/g, ''));
      return Number.isFinite(n) ? Math.max(highest, n) : highest;
    }, 198);
    return `REC-${String(max + 1).padStart(3, '0')}`;
  }, [payments.records]);
  const patientOptions = useMemo(() => {
    const q = patientSearch.trim().toLowerCase();
    const source = q ? patients.records.filter((record) => {
      const data = record.data || {};
      return [data.patientId, data.name, phoneOf(data)].filter(Boolean).join(' ').toLowerCase().includes(q);
    }) : patients.records;
    return source.slice(0, 6);
  }, [patients.records, patientSearch]);
  const selectedPatient = patients.records.find((record) => record._id === selectedPatientId) || null;
  const medicineOptions = useMemo(() => {
    const q = medicineSearch.trim().toLowerCase();
    if (!q) return medicines.slice(0, 8);
    return medicines.filter((item) => [item.name, item.code, item.barcode, item.batch].filter(Boolean).join(' ').toLowerCase().includes(q)).slice(0, 8);
  }, [medicines, medicineSearch]);
  const subtotal = items.reduce((sum, item) => sum + itemAmount(item), 0);
  const gst = items.reduce((sum, item) => sum + itemAmount(item) * (Number(item.gstRate || 0) / 100), 0);
  const total = Math.max(0, subtotal - Number(discount || 0) + gst);
  const hasInvalidStock = items.some((item) => Number(item.qty || 0) > Number(item.stock || 0));
  const hasExpiredItem = items.some((item) => isExpired(item.expiry));

  useEffect(() => {
    setMedicineLoading(true);
    api.invListProducts({ page: 1, limit: 100 })
      .then((res) => setMedicines((res.data || []).map(normalizeMedicine)))
      .catch(() => setMedicines([]))
      .finally(() => setMedicineLoading(false));
  }, []);

  function selectPatient(patient) {
    setSelectedPatientId(patient._id);
    setPatientSearch(patient.data?.name || patient.data?.patientId || '');
    setWalkIn(false);
    setShowPatientMenu(false);
  }

  function enableWalkIn() {
    setWalkIn(true);
    setSelectedPatientId('');
    setPatientSearch('Walk-in Customer');
    setShowPatientMenu(false);
  }

  function addMedicine(medicine, qty = 1) {
    if (!medicine) return;
    if (isExpired(medicine.expiry)) {
      window.alert(`${medicine.name} is expired and cannot be billed.`);
      return;
    }
    if (medicine.stock <= 0) {
      window.alert(`${medicine.name} is out of stock.`);
      return;
    }
    setItems((current) => {
      const existing = current.find((item) => item.id === medicine.id && item.batch === medicine.batch);
      if (existing) {
        return current.map((item) => item === existing ? { ...item, qty: Math.min(item.stock, Number(item.qty || 0) + qty) } : item);
      }
      return [...current, { ...medicine, qty: Math.min(medicine.stock, qty) }];
    });
    setMedicineSearch('');
  }

  function updateQty(index, value) {
    setItems((current) => current.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      return { ...item, qty: Math.max(1, Number(value || 1)) };
    }));
  }

  function removeItem(index) {
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function clearBill() {
    setItems([]);
    setDiscount(0);
    setPrescription('');
    setMessage('');
  }

  function holdBill() {
    if (!items.length) return;
    setHeldBills((current) => [...current, {
      id: Date.now(),
      patientSearch,
      selectedPatientId,
      walkIn,
      prescription,
      items,
      discount,
    }]);
    clearBill();
    setPatientSearch('');
    setSelectedPatientId('');
    setWalkIn(false);
    setMessage('Bill held. Resume it from the held bill strip.');
  }

  function resumeBill(held) {
    setPatientSearch(held.patientSearch);
    setSelectedPatientId(held.selectedPatientId);
    setWalkIn(held.walkIn);
    setPrescription(held.prescription);
    setItems(held.items);
    setDiscount(held.discount);
    setHeldBills((current) => current.filter((item) => item.id !== held.id));
    setMessage('');
  }

  function loadPrescription() {
    SAMPLE_PRESCRIPTION.forEach((line) => {
      const found = medicines.find((medicine) => medicine.name.toLowerCase().includes(line.medicine.toLowerCase().split(' ')[0]));
      if (found) addMedicine(found, line.qty);
    });
    setMessage('Prescription medicines loaded where matching stock was found.');
  }

  function findMedicineBySearch() {
    const q = medicineSearch.trim().toLowerCase();
    if (!q) return null;
    return medicines.find((medicine) => [medicine.barcode, medicine.code, medicine.name].filter(Boolean).some((value) => String(value).toLowerCase() === q))
      || medicineOptions[0]
      || null;
  }

  async function payBill() {
    if (!walkIn && !selectedPatient) {
      window.alert('Select a patient or choose Walk-in Customer.');
      return;
    }
    if (!items.length) {
      window.alert('Add at least one medicine.');
      return;
    }
    if (hasInvalidStock) {
      window.alert('Some item quantities exceed current stock.');
      return;
    }
    if (hasExpiredItem) {
      window.alert('Expired medicine cannot be billed.');
      return;
    }

    const customer = walkIn
      ? { name: 'Walk-in Customer', phone: '' }
      : {
          name: selectedPatient.data?.name || '',
          patientId: selectedPatient.data?.patientId || '',
          phone: phoneOf(selectedPatient.data),
        };

    await pharmacyBills.create({
      billNo,
      customer,
      patientName: customer.name,
      patientId: customer.patientId || '',
      prescription,
      items,
      subtotal,
      discount: Number(discount || 0),
      gst,
      total,
      paymentMethod,
      status: 'Paid',
      date: new Date().toISOString().slice(0, 10),
      workflow: 'Patient/Walk-in -> Prescription/Medicine Search -> Batch -> Qty -> Stock Validation -> Payment -> Invoice -> Dispense -> Inventory Deduction',
      name: `Pharmacy Bill ${billNo}`,
      amount: total,
    });

    await payments.create({
      receiptNo: nextReceiptNo,
      invoiceNo: billNo,
      invoiceSource: 'hospital/pharmacy-billing',
      patientName: customer.name,
      mobile: customer.phone || '',
      method: paymentMethod,
      amount: total,
      referenceNo: '',
      cashier: 'Cashier',
      status: 'Completed',
      date: new Date().toISOString().slice(0, 10),
      accountingStatus: 'Pending',
      name: `Receipt ${nextReceiptNo}`,
    });

    await Promise.all(items.map((item) => {
      const nextStock = Math.max(0, Number(item.stock || 0) - Number(item.qty || 0));
      return api.invUpdateProduct(item.id, { ...item.raw, stock: nextStock });
    }));

    setMedicines((current) => current.map((medicine) => {
      const sold = items.find((item) => item.id === medicine.id);
      if (!sold) return medicine;
      return { ...medicine, stock: Math.max(0, Number(medicine.stock || 0) - Number(sold.qty || 0)) };
    }));
    setMessage(`Payment collected. ${billNo} printed and inventory deducted.`);
    clearBill();
    setPatientSearch('');
    setSelectedPatientId('');
    setWalkIn(false);
    setPreviewOpen(false);
  }

  return (
    <div className="p-3 md:p-4">
      <div className="rounded-lg border border-[#dfe7f1] bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-[#edf2f7] bg-[#fbfdff] px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-blue-50 text-blue-600"><Pill size={18} /></span>
            <div>
              <h1 className="m-0 text-[18px] font-extrabold text-[#071936]">Pharmacy Billing</h1>
              <p className="m-0 mt-0.5 text-[12px] font-semibold text-[#64748b]">POS dispensing counter</p>
            </div>
          </div>
          <div className="text-[13px] font-extrabold text-[#071936]">Bill #{billNo}</div>
        </div>

        {message && <div className="mx-4 mt-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-[13px] font-semibold text-green-700">{message}</div>}

        <div className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_330px]">
          <main className="min-w-0">
            <div className="mb-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_190px]">
              <div className="relative">
                <label className="mb-1 block text-[12px] font-extrabold uppercase text-[#536173]">Patient</label>
                <div className="flex items-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-3">
                  <UserRound size={15} className="text-[#64748b]" />
                  <input
                    className="h-10 min-w-0 flex-1 border-0 bg-transparent text-[13px] font-[inherit] outline-none"
                    value={patientSearch}
                    onFocus={() => setShowPatientMenu(true)}
                    onChange={(event) => {
                      setPatientSearch(event.target.value);
                      setShowPatientMenu(true);
                      setWalkIn(false);
                    }}
                    placeholder="Search Patient / Mobile"
                  />
                </div>
                {showPatientMenu && !walkIn && patientOptions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-30 mt-1 rounded-md border border-[#dbe4ef] bg-white p-1 shadow-lg">
                    {patientOptions.map((patient) => (
                      <button key={patient._id} type="button" onClick={() => selectPatient(patient)} className="block w-full rounded px-3 py-2 text-left text-[13px] hover:bg-blue-50">
                        <strong>{patient.data?.name || 'Unnamed'}</strong>
                        <span className="ml-2 text-[#64748b]">{patient.data?.patientId || '-'} - {phoneOf(patient.data) || 'No mobile'}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-end">
                <Button className="h-10 w-full" tone={walkIn ? 'blue' : 'white'} onClick={enableWalkIn}>Walk-in Customer</Button>
              </div>
            </div>

            <div className="mb-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_170px]">
              <div>
                <label className="mb-1 block text-[12px] font-extrabold uppercase text-[#536173]">Prescription</label>
                <select className={INPUT} value={prescription} onChange={(event) => setPrescription(event.target.value)}>
                  <option value="">Select Prescription</option>
                  <option value="RX-2026-00456">RX-2026-00456 - Dr. Kumar</option>
                  <option value="RX-2026-00431">RX-2026-00431 - Follow-up</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button className="h-10 w-full" onClick={loadPrescription} disabled={!prescription}>Load Prescription</Button>
              </div>
            </div>

            <div className="mb-3 h-px bg-[#dbe4ef]" />

            <form
              className="relative mb-3"
              onSubmit={(event) => {
                event.preventDefault();
                addMedicine(findMedicineBySearch());
              }}
            >
              <label className="mb-1 block text-[12px] font-extrabold uppercase text-[#536173]">Medicine Search / Barcode</label>
              <div className="flex items-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-3">
                <Search size={15} className="text-[#64748b]" />
                <input className="h-11 min-w-0 flex-1 border-0 bg-transparent text-[13px] font-[inherit] outline-none" value={medicineSearch} onChange={(event) => setMedicineSearch(event.target.value)} placeholder="Search Medicine / Scan Barcode" />
                <Barcode size={16} className="text-blue-600" />
              </div>
              {medicineSearch.trim() && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-md border border-[#dbe4ef] bg-white p-1 shadow-lg">
                  {medicineLoading ? (
                    <div className="px-3 py-2 text-[13px] text-[#64748b]">Loading medicines...</div>
                  ) : medicineOptions.length === 0 ? (
                    <div className="px-3 py-2 text-[13px] text-[#64748b]">No matching medicine found.</div>
                  ) : medicineOptions.map((medicine) => (
                    <button key={medicine.id} type="button" onClick={() => addMedicine(medicine)} className="flex w-full items-center justify-between gap-3 rounded px-3 py-2 text-left text-[13px] hover:bg-blue-50">
                      <span><strong>{medicine.name}</strong><span className="ml-2 text-[#64748b]">{medicine.code || medicine.barcode || '-'}</span></span>
                      <span className={medicine.stock <= 0 ? 'font-bold text-red-600' : 'font-bold text-green-700'}>{medicine.stock} stock</span>
                    </button>
                  ))}
                </div>
              )}
            </form>

            <div className="overflow-x-auto rounded-md border border-[#dbe4ef]">
              <table className="w-full min-w-[760px] border-collapse">
                <thead>
                  <tr className="bg-[#f8fafc]">
                    {['Medicine', 'Batch', 'Expiry', 'Stock', 'Qty', 'Rate', 'GST', 'Amount', ''].map((heading) => (
                      <th key={heading} className="border-b border-[#e5edf7] px-3 py-2 text-left text-[11px] font-extrabold uppercase text-[#334155]">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr><td colSpan={9} className="px-3 py-12 text-center text-[13px] text-[#64748b]">Search medicine or scan barcode to add items.</td></tr>
                  ) : items.map((item, index) => (
                    <tr key={`${item.id}-${index}`} className={Number(item.qty) > Number(item.stock) || isExpired(item.expiry) ? 'bg-red-50' : 'hover:bg-[#fbfdff]'}>
                      <td className="border-b border-[#f1f5f9] px-3 py-2 text-[13px] font-semibold text-[#111827]">{item.name}</td>
                      <td className="border-b border-[#f1f5f9] px-3 py-2 text-[13px]">{item.batch}</td>
                      <td className="border-b border-[#f1f5f9] px-3 py-2 text-[13px]">{expiryLabel(item.expiry)}</td>
                      <td className="border-b border-[#f1f5f9] px-3 py-2 text-[13px] font-bold text-green-700">{item.stock}</td>
                      <td className="border-b border-[#f1f5f9] px-3 py-2"><input className="h-8 w-18 rounded border border-[#dbe4ef] px-2 text-[13px]" min="1" type="number" value={item.qty} onChange={(event) => updateQty(index, event.target.value)} /></td>
                      <td className="border-b border-[#f1f5f9] px-3 py-2 text-[13px]">{money(item.rate)}</td>
                      <td className="border-b border-[#f1f5f9] px-3 py-2 text-[13px]">{item.gstRate}%</td>
                      <td className="border-b border-[#f1f5f9] px-3 py-2 text-[13px] font-extrabold text-[#111827]">{money(itemAmount(item))}</td>
                      <td className="border-b border-[#f1f5f9] px-3 py-2 text-right">
                        <button type="button" onClick={() => removeItem(index)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-100 bg-red-50 text-red-600 cursor-pointer"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </main>

          <aside className="rounded-lg border border-[#dfe7f1] bg-[#fbfdff] p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[13px] font-extrabold text-[#071936]"><Wallet size={16} />Payment</div>
              <div className="text-[12px] font-bold text-[#64748b]">Items: {items.reduce((sum, item) => sum + Number(item.qty || 0), 0)}</div>
            </div>

            <div className="mb-4 rounded-md bg-white p-3 text-[13px]">
              <div className="flex justify-between py-1"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
              <div className="flex items-center justify-between gap-3 py-1">
                <span>Discount</span>
                <input className="h-8 w-28 rounded border border-[#dbe4ef] px-2 text-right text-[13px]" min="0" type="number" value={discount} onChange={(event) => setDiscount(Number(event.target.value))} />
              </div>
              <div className="flex justify-between py-1"><span>GST</span><strong>{money(gst)}</strong></div>
              <div className="mt-2 flex justify-between border-t border-[#dbe4ef] pt-3 text-[20px] font-extrabold text-blue-700"><span>Total</span><strong>{money(total)}</strong></div>
            </div>

            <div className="mb-4">
              <div className="mb-2 text-[12px] font-extrabold uppercase text-[#536173]">Payment Mode</div>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <button key={method} type="button" onClick={() => setPaymentMethod(method)} className={`min-h-10 rounded-md border text-[12px] font-bold cursor-pointer ${paymentMethod === method ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-[#dbe4ef] bg-white text-[#374151]'}`}>
                    {method}
                  </button>
                ))}
              </div>
            </div>

            {(hasInvalidStock || hasExpiredItem) && (
              <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-700">
                Fix stock or expiry issues before payment.
              </div>
            )}

            <Button tone="green" className="mb-3 h-12 w-full text-[15px]" onClick={payBill} disabled={!items.length || hasInvalidStock || hasExpiredItem}>
              <CreditCard size={16} />Pay {money(total)}
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={holdBill} disabled={!items.length}><Pause size={14} />Hold</Button>
              <Button tone="red" onClick={clearBill} disabled={!items.length}><X size={14} />Clear</Button>
              <Button className="col-span-2" onClick={() => setPreviewOpen(true)} disabled={!items.length}><FileText size={14} />Preview Invoice</Button>
              <Button className="col-span-2" onClick={() => window.print()} disabled={!items.length}><Printer size={14} />Print</Button>
            </div>

            {heldBills.length > 0 && (
              <div className="mt-4 border-t border-[#dbe4ef] pt-3">
                <div className="mb-2 text-[12px] font-extrabold uppercase text-[#536173]">Held Bills</div>
                <div className="flex flex-col gap-2">
                  {heldBills.map((held) => (
                    <button key={held.id} type="button" onClick={() => resumeBill(held)} className="rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-left text-[12px] font-semibold text-[#374151] cursor-pointer hover:bg-blue-50">
                      {held.patientSearch || 'Walk-in'} - {held.items.length} items
                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

      {previewOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-3xl rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#edf2f7] px-5 py-3">
              <div>
                <h2 className="m-0 text-[16px] font-extrabold text-[#071936]">Pharmacy Invoice Preview</h2>
                <p className="m-0 mt-0.5 text-[12px] font-semibold text-[#64748b]">Bill #{billNo}</p>
              </div>
              <button type="button" onClick={() => setPreviewOpen(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#dbe4ef] bg-white text-[#334155] cursor-pointer"><X size={16} /></button>
            </div>
            <div className="p-5">
              <div className="mb-4 flex justify-between gap-4 text-[13px]">
                <div>
                  <strong>{walkIn ? 'Walk-in Customer' : selectedPatient?.data?.name || 'Patient not selected'}</strong>
                  <div className="text-[#64748b]">{selectedPatient?.data?.patientId || ''} {phoneOf(selectedPatient?.data) || ''}</div>
                </div>
                <div className="text-right">
                  <strong>{paymentMethod}</strong>
                  <div className="text-[#64748b]">{new Date().toLocaleDateString('en-IN')}</div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] border-collapse text-[12px]">
                  <thead><tr className="bg-[#f8fafc] text-left"><th className="px-3 py-2">Medicine</th><th className="px-3 py-2">Batch</th><th className="px-3 py-2">Expiry</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2 text-right">Rate</th><th className="px-3 py-2 text-right">Amount</th></tr></thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={`preview-${item.id}-${index}`}><td className="border-b border-[#f1f5f9] px-3 py-2 font-semibold">{item.name}</td><td className="border-b border-[#f1f5f9] px-3 py-2">{item.batch}</td><td className="border-b border-[#f1f5f9] px-3 py-2">{expiryLabel(item.expiry)}</td><td className="border-b border-[#f1f5f9] px-3 py-2 text-right">{item.qty}</td><td className="border-b border-[#f1f5f9] px-3 py-2 text-right">{money(item.rate)}</td><td className="border-b border-[#f1f5f9] px-3 py-2 text-right font-bold">{money(itemAmount(item))}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="ml-auto mt-4 w-full max-w-xs rounded-md bg-[#f8fbff] p-3 text-[13px]">
                <div className="flex justify-between py-1"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
                <div className="flex justify-between py-1"><span>Discount</span><strong>- {money(discount)}</strong></div>
                <div className="flex justify-between py-1"><span>GST</span><strong>{money(gst)}</strong></div>
                <div className="mt-2 flex justify-between border-t border-[#dbe4ef] pt-2 text-[17px] font-extrabold text-blue-700"><span>Total</span><strong>{money(total)}</strong></div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button onClick={() => window.print()}><Printer size={14} />Print</Button>
                <Button tone="green" onClick={payBill} disabled={hasInvalidStock || hasExpiredItem}>Pay {money(total)}</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
