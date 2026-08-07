import { useEffect, useMemo, useState } from 'react';
import {
  Barcode,
  CalendarDays,
  CheckCircle,
  CreditCard,
  FileText,
  Globe2,
  IdCard,
  List,
  Mail,
  MapPin,
  Pause,
  Phone,
  Pill,
  Plus,
  Printer,
  Search,
  Settings,
  Trash2,
  UserRound,
  Wallet,
  X,
} from 'lucide-react';

import { useKeyboardMode } from '../../../../../app/KeyboardModeContext.jsx';
import { api, SERVER_ORIGIN } from '../../../../../services/api.js';
import { useModuleRecords } from '../../../shared/recordUi/useModuleRecords.js';
import { getInvoicePrintTemplate, setInvoicePrintTemplate } from '../../../retail/modules/sales/shared/invoiceTemplatePreference.js';

const INPUT = 'border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] text-[#111827] w-full outline-none focus:border-blue-500 font-[inherit] bg-white';
const PAYMENT_METHODS = ['Cash', 'UPI', 'Card'];
const SAMPLE_PRESCRIPTION = [
  { medicine: 'Paracetamol 500mg', qty: 2 },
  { medicine: 'Amoxicillin 250mg', qty: 1 },
];

function money(value) {
  return `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;
}

function amount(value) {
  return Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function amountWords(value) {
  const number = Math.round(Number(value || 0));
  if (!number) return 'Rupees Zero Only';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const underHundred = (n) => (n < 20 ? ones[n] : `${tens[Math.floor(n / 10)]}${n % 10 ? ` ${ones[n % 10]}` : ''}`);
  const underThousand = (n) => `${n >= 100 ? `${ones[Math.floor(n / 100)]} Hundred${n % 100 ? ' ' : ''}` : ''}${n % 100 ? underHundred(n % 100) : ''}`;
  const parts = [];
  let rest = number;
  [['Crore', 10000000], ['Lakh', 100000], ['Thousand', 1000]].forEach(([label, divisor]) => {
    const count = Math.floor(rest / divisor);
    if (count) {
      parts.push(`${underThousand(count)} ${label}`);
      rest %= divisor;
    }
  });
  if (rest) parts.push(underThousand(rest));
  return `Rupees ${parts.join(' ')} Only`;
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
    batch: product.batchNumber || product.batchNo || product.batch || 'MAIN',
    expiry: product.expiryDate || product.expiry || '',
    stock: Number(product.stock || 0),
    rate: Number(product.rate || product.sellingPrice || product.price || 0),
    gstRate: Number(product.gstRate || product.taxRate || 0),
    raw: product,
  };
}

function productRows(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.records)) return response.records;
  return [];
}

function businessAddress(settings = {}) {
  return [
    settings.address,
    [settings.city, settings.state, settings.pincode].filter(Boolean).join(', '),
  ].filter(Boolean).join(', ');
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
  const { keyboardMode } = useKeyboardMode();
  const patients = useModuleRecords('hospital/patients');
  const prescriptions = useModuleRecords('hospital/prescription');
  const pharmacyBills = useModuleRecords('hospital/pharmacy-billing');
  const payments = useModuleRecords('hospital/payments');
  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientMenu, setShowPatientMenu] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [walkIn, setWalkIn] = useState(false);
  const [prescription, setPrescription] = useState('');
  const [medicineSearch, setMedicineSearch] = useState('');
  const [showMedicineMenu, setShowMedicineMenu] = useState(false);
  const [medicines, setMedicines] = useState([]);
  const [medicineLoading, setMedicineLoading] = useState(false);
  const [medicineError, setMedicineError] = useState('');
  const [items, setItems] = useState([]);
  const [discount, setDiscount] = useState(10);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [heldBills, setHeldBills] = useState([]);
  const [message, setMessage] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [bizSettings, setBizSettings] = useState({});
  const [printTemplate, setPrintTemplate] = useState(() => getInvoicePrintTemplate());

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
  const prescriptionOptions = useMemo(() => prescriptions.records
    .filter((record) => record.data?.status === 'Finalized' || record.data?.pharmacyStatus === 'Ready for Pharmacy')
    .map((record) => ({
      id: record.data?.prescriptionNo || record.data?.rxNo || record._id,
      label: `${record.data?.prescriptionNo || record.data?.rxNo || 'RX'} - ${record.data?.patientName || 'Patient'} - ${record.data?.doctorName || 'Doctor'}`,
      data: record.data || {},
    })), [prescriptions.records]);
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
  const fKeyActions = [
    { key: 'F1', label: 'New', icon: Plus, action: () => window.location.assign('/hospital/pharmacy-billing') },
    { key: 'F2', label: 'Pay', icon: CreditCard, action: () => { if (items.length && !hasInvalidStock && !hasExpiredItem) payBill(); } },
    { key: 'F3', label: 'Preview', icon: FileText, action: () => { if (items.length) setPreviewOpen(true); } },
    { key: 'F4', label: 'Print', icon: Printer, action: () => { if (items.length) window.print(); } },
    { key: 'F5', label: 'Patient', icon: UserRound, action: () => document.querySelector('[data-fkey="pharmacy-patient"]')?.focus() },
    { key: 'F6', label: 'Medicine', icon: Pill, action: () => document.querySelector('[data-fkey="pharmacy-medicine"]')?.focus() },
    { key: 'F7', label: 'Rx', icon: FileText, action: () => document.querySelector('[data-fkey="pharmacy-prescription"]')?.focus() },
    { key: 'F8', label: 'Hold', icon: Pause, action: holdBill },
    { key: 'F10', label: 'Settings', icon: Settings, action: () => window.location.assign('/business-settings') },
  ];

  useEffect(() => {
    api.getSettings().then(setBizSettings).catch(() => {});
  }, []);

  useEffect(() => {
    setInvoicePrintTemplate(printTemplate);
  }, [printTemplate]);

  useEffect(() => {
    setMedicineLoading(true);
    setMedicineError('');
    api.invListProducts({ page: 1, limit: 500, itemType: 'Product' })
      .then((res) => setMedicines(productRows(res).map(normalizeMedicine)))
      .catch((err) => {
        setMedicines([]);
        setMedicineError(err.message || 'Failed to load inventory products.');
      })
      .finally(() => setMedicineLoading(false));
  }, []);

  useEffect(() => {
    function handleKeyDown(event) {
      if (!keyboardMode) return;
      const mod = event.ctrlKey || event.metaKey;

      if (mod && event.key === 'Enter') {
        event.preventDefault();
        if (items.length && !hasInvalidStock && !hasExpiredItem) payBill();
        return;
      }

      if (mod && event.key.toLowerCase() === 'p') {
        event.preventDefault();
        if (items.length) window.print();
        return;
      }

      if (event.altKey && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        document.querySelector('[data-fkey="pharmacy-medicine"]')?.focus();
        return;
      }

      if (event.altKey && event.key.toLowerCase() === 'v') {
        event.preventDefault();
        window.location.assign('/hospital/bills-invoices');
        return;
      }

      if (!event.ctrlKey && !event.metaKey && !event.altKey) {
        const action = fKeyActions.find((item) => item.key === event.key);
        if (action) {
          event.preventDefault();
          action.action();
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

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
    setShowMedicineMenu(false);
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
    const selectedRx = prescriptionOptions.find((item) => item.id === prescription);
    const source = selectedRx?.data?.medicinesList || selectedRx?.data?.prescribedMedicines || SAMPLE_PRESCRIPTION;
    source.forEach((line) => {
      const medicineName = line.medicine || line.name || '';
      const found = medicines.find((medicine) => medicine.name.toLowerCase().includes(medicineName.toLowerCase().split(' ')[0]));
      if (found) addMedicine(found, Number(line.qty || 1));
    });
    if (selectedRx && !selectedPatientId && !walkIn) {
      const patient = patients.records.find((record) => record.data?.patientId === selectedRx.data.patientId || record.data?.name === selectedRx.data.patientName);
      if (patient) selectPatient(patient);
    }
    setMessage('Prescription medicines loaded where matching inventory stock was found. Stock will deduct only after payment.');
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
      businessSnapshot: bizSettings,
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

        <div className="hidden md:flex items-stretch bg-white border-b border-[#e5edf7] overflow-x-auto">
          {fKeyActions.map(({ key, label, icon: Icon, action }) => (
            <button
              key={key}
              type="button"
              onClick={action}
              className="flex min-w-[92px] items-center justify-center gap-2 border-0 border-r border-[#e5edf7] bg-white px-3 py-2 text-[12px] font-bold text-[#0d1c34] cursor-pointer last:border-r-0 hover:bg-blue-50"
            >
              <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-black text-blue-700">{key}</span>
              <Icon size={14} />
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => window.location.assign('/hospital/bills-invoices')}
            className="flex min-w-[104px] items-center justify-center gap-2 border-0 bg-white px-3 py-2 text-[12px] font-bold text-[#0d1c34] cursor-pointer hover:bg-blue-50"
          >
            <span className="rounded bg-black/5 px-1.5 py-0.5 text-[10px] font-black">Alt+V</span>
            <List size={14} />
            List
          </button>
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
                    data-fkey="pharmacy-patient"
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
                <select data-fkey="pharmacy-prescription" className={INPUT} value={prescription} onChange={(event) => setPrescription(event.target.value)}>
                  <option value="">Select Prescription</option>
                  {prescriptionOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                  {prescriptionOptions.length === 0 && <option value="RX-2026-00456">RX-2026-00456 - Sample</option>}
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
                setShowMedicineMenu(false);
              }}
            >
              <label className="mb-1 block text-[12px] font-extrabold uppercase text-[#536173]">Medicine Search / Barcode</label>
              <div className="flex items-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-3">
                <Search size={15} className="text-[#64748b]" />
                <input
                  data-fkey="pharmacy-medicine"
                  className="h-11 min-w-0 flex-1 border-0 bg-transparent text-[13px] font-[inherit] outline-none"
                  value={medicineSearch}
                  onFocus={() => setShowMedicineMenu(true)}
                  onChange={(event) => {
                    setMedicineSearch(event.target.value);
                    setShowMedicineMenu(true);
                  }}
                  placeholder="Search Medicine / Scan Barcode"
                />
                <Barcode size={16} className="text-blue-600" />
              </div>
              <div className={`mt-1 text-[12px] font-semibold ${medicineError ? 'text-red-600' : 'text-[#64748b]'}`}>
                {medicineError || (medicineLoading ? 'Loading inventory products...' : `${medicines.length} inventory products available`)}
              </div>
              {showMedicineMenu && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-md border border-[#dbe4ef] bg-white p-1 shadow-lg">
                  {medicineLoading ? (
                    <div className="px-3 py-2 text-[13px] text-[#64748b]">Loading medicines...</div>
                  ) : medicineError ? (
                    <div className="px-3 py-2 text-[13px] text-red-600">{medicineError}</div>
                  ) : medicineOptions.length === 0 ? (
                    <div className="px-3 py-2 text-[13px] text-[#64748b]">No inventory medicine found. Add medicines in Pharmacy - Medicine Dispensing / common Inventory first.</div>
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
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#edf2f7] bg-white px-5 py-3">
              <div>
                <h2 className="m-0 text-[16px] font-extrabold text-[#071936]">Pharmacy Invoice Preview</h2>
                <p className="m-0 mt-0.5 text-[12px] font-semibold text-[#64748b]">Bill #{billNo}</p>
              </div>
              <div className="flex items-center gap-2">
                <select className={INPUT} value={printTemplate} onChange={(event) => setPrintTemplate(event.target.value)}>
                  <option value="modern">Modern</option>
                  <option value="classic">Classic</option>
                </select>
                <Button onClick={() => window.print()}><Printer size={14} />Print</Button>
                <button type="button" onClick={() => setPreviewOpen(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#dbe4ef] bg-white text-[#334155] cursor-pointer"><X size={16} /></button>
              </div>
            </div>
            <div className="p-5">
              {printTemplate === 'classic' ? (
              <div id="document-preview-print" className="invoice-pages-stack invoice-classic-stack">
                <section className="invoice-page invoice-classic-page">
                  <div className="invoice-classic-outer">
                    <div className="invoice-classic-title-row">
                      <span />
                      <strong>Pharmacy Invoice</strong>
                      <em>Original for Recipient</em>
                    </div>

                    <div className="invoice-classic-top-grid">
                      <div className="invoice-classic-business">
                        {bizSettings.logoUrl && (
                          <img src={`${SERVER_ORIGIN}${bizSettings.logoUrl}`} alt="logo" className="invoice-classic-logo" />
                        )}
                        <div>
                          <h2>{bizSettings.businessName || '-'}</h2>
                          <p>{businessAddress(bizSettings) || '-'}</p>
                          {bizSettings.phone && <p>{bizSettings.phone}</p>}
                          {bizSettings.businessEmail && <p>{bizSettings.businessEmail}</p>}
                          {bizSettings.gstin && <h3>GSTIN: {bizSettings.gstin}</h3>}
                        </div>
                      </div>

                      <div className="invoice-classic-meta-grid">
                        <div>
                          <div className="invoice-classic-field"><span>Invoice No.</span><b>:</b><strong className="invoice-classic-emphasis">{billNo}</strong></div>
                          <div className="invoice-classic-field"><span>Sale Type</span><b>:</b><strong>{walkIn ? 'Walk-in' : 'Patient'}</strong></div>
                          <div className="invoice-classic-field"><span>Items</span><b>:</b><strong>{items.length}</strong></div>
                          <div className="invoice-classic-field"><span>Pay Status</span><b>:</b><strong>Paid</strong></div>
                        </div>
                        <div>
                          <div className="invoice-classic-field"><span>Invoice Date</span><b>:</b><strong className="invoice-classic-emphasis">{new Date().toLocaleDateString('en-IN')}</strong></div>
                          <div className="invoice-classic-field"><span>Pay. Mode</span><b>:</b><strong>{paymentMethod}</strong></div>
                          <div className="invoice-classic-field"><span>Receipt No.</span><b>:</b><strong>{nextReceiptNo}</strong></div>
                          <div className="invoice-classic-field"><span>Prescription</span><b>:</b><strong>{prescription || '-'}</strong></div>
                        </div>
                      </div>
                    </div>

                    <div className="invoice-classic-party-grid">
                      <div className="invoice-classic-customer">
                        <div className="invoice-classic-section-caption">Customer</div>
                        <h2>{walkIn ? 'Walk-in Customer' : selectedPatient?.data?.name || '-'}</h2>
                        <p>Patient ID : {walkIn ? '-' : selectedPatient?.data?.patientId || '-'}</p>
                        <p>Mobile : {walkIn ? '-' : phoneOf(selectedPatient?.data) || '-'}</p>
                        <p>Billing Mode : {walkIn ? 'Counter pharmacy sale' : 'Patient linked pharmacy sale'}</p>
                      </div>
                      <div className="invoice-classic-ledger">
                        <div className="invoice-classic-ledger-heading">Pharmacy Details:</div>
                        <p>Prescription : {prescription || 'Manual sale'}</p>
                        <div className="invoice-classic-ledger-row"><span>Total Qty</span><b>=</b><strong>{items.reduce((sum, item) => sum + Number(item.qty || 0), 0)}</strong></div>
                        <div className="invoice-classic-ledger-row"><span>Stock Check</span><b>=</b><strong>{hasInvalidStock ? 'Needs Review' : 'Passed'}</strong></div>
                        <div className="invoice-classic-ledger-row invoice-classic-ledger-total"><span>Balance Due</span><b>=</b><strong>{amount(0)}</strong></div>
                      </div>
                    </div>

                    <table className="invoice-classic-table invoice-classic-table-no-gst">
                      <thead>
                        <tr>
                          <th className="classic-col-sno">S/N</th>
                          <th className="classic-col-desc">Description Of Goods / Service</th>
                          <th className="classic-col-qty">Billed<br />Quantity</th>
                          <th className="classic-col-uqc">Batch</th>
                          <th className="classic-col-price">Price</th>
                          <th className="classic-col-amount">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, index) => (
                          <tr key={`classic-pharmacy-${item.id}-${index}`}>
                            <td className="classic-col-sno">{index + 1})</td>
                            <td className="classic-col-desc">
                              <div className="invoice-classic-item-title">{item.name || '-'}</div>
                              <div className="invoice-classic-item-sub">{item.code || item.barcode || ''} {item.expiry ? `| Exp ${expiryLabel(item.expiry)}` : ''}</div>
                            </td>
                            <td className="classic-col-qty">{item.qty || 0}</td>
                            <td className="classic-col-uqc">{item.batch || '-'}</td>
                            <td className="classic-col-price">{amount(item.rate)}</td>
                            <td className="classic-col-amount">{amount(itemAmount(item))}</td>
                          </tr>
                        ))}
                        <tr className="invoice-classic-subtotal-row"><td className="classic-col-sno" /><td className="classic-col-desc" /><td className="classic-col-qty">{items.reduce((sum, item) => sum + Number(item.qty || 0), 0)}</td><td className="classic-col-uqc" /><td className="classic-col-price" /><td className="classic-col-amount">{amount(subtotal)}</td></tr>
                        <tr className="invoice-classic-total-line"><td colSpan={5}>Discount</td><td className="classic-col-amount">-{amount(discount)}</td></tr>
                        <tr className="invoice-classic-total-line"><td colSpan={5}>GST</td><td className="classic-col-amount">{amount(gst)}</td></tr>
                        <tr className="invoice-classic-grand-total"><td colSpan={5}>Grand Total</td><td className="classic-col-amount">{amount(total)}</td></tr>
                      </tbody>
                    </table>

                    <div className="invoice-classic-summary">
                      <div className="invoice-classic-tax-summary">
                        <h3>Amount in Words</h3>
                        <p>{amountWords(total)}</p>
                      </div>
                      <table className="invoice-classic-payment-summary">
                        <tbody>
                          <tr><td>Payment Mode</td><td>{paymentMethod}</td></tr>
                          <tr><td>Amount Paid</td><td>{amount(total)}</td></tr>
                          <tr className="invoice-classic-payment-grand"><td>Grand Total</td><td>{amount(total)}</td></tr>
                          <tr className="invoice-classic-payment-due"><td>Balance Due</td><td>{amount(0)}</td></tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="invoice-classic-bottom">
                      <div className="invoice-classic-terms"><h3>Terms & Notes</h3><ul><li>Medicines are dispensed against the listed batches.</li><li>Verify batch and expiry before handover.</li></ul></div>
                      <div className="invoice-classic-declaration"><h3>Declaration</h3><p>This invoice is generated from existing pharmacy bill data.</p></div>
                      <div className="invoice-classic-sign"><strong>For {bizSettings.businessName || '-'}</strong><b>Pharmacist / Authorised Signatory</b></div>
                    </div>

                    <div className="invoice-classic-footer">
                      <span>{bizSettings.phone || '-'}</span>
                      <strong>Generated by GoBook</strong>
                      <strong>{bizSettings.website || bizSettings.businessWebsite || ''}</strong>
                    </div>

                    <div className="mt-4 flex justify-end gap-2 print:hidden">
                      <Button tone="green" onClick={payBill} disabled={hasInvalidStock || hasExpiredItem}>Pay {money(total)}</Button>
                    </div>
                  </div>
                </section>
              </div>
              ) : (
              <div id="document-preview-print" className="hospital-invoice-print">
                <section className="hospital-invoice-page">
                  <div className="hospital-invoice-top">
                    <div className="hospital-brand">
                      {bizSettings.logoUrl ? (
                        <img src={`${SERVER_ORIGIN}${bizSettings.logoUrl}`} alt="logo" className="hospital-brand-logo" />
                      ) : <div className="hospital-brand-logo" />}
                      <div className="min-w-0">
                        <div className="hospital-brand-name">{bizSettings.businessName || ''}</div>
                        <div className="hospital-brand-type">{bizSettings.businessType || ''}</div>
                        <div className="hospital-brand-rule" />
                        <div className="hospital-brand-tag">{bizSettings.tagline || ''}</div>
                      </div>
                    </div>

                    <div className="hospital-contact">
                      <div className="hospital-contact-line"><Phone />{bizSettings.phone || '-'}</div>
                      <div className="hospital-contact-line"><Mail />{bizSettings.businessEmail || '-'}</div>
                      <div className="hospital-contact-line"><Globe2 />{bizSettings.website || bizSettings.businessWebsite || '-'}</div>
                      <div className="hospital-contact-line"><MapPin /><span>{businessAddress(bizSettings) || '-'}</span></div>
                    </div>

                    <div className="hospital-invoice-title-box">
                      <div className="hospital-invoice-title">INVOICE</div>
                      <div className="hospital-copy-label">Original for Recipient</div>
                      <div className="hospital-invoice-number">{billNo}</div>
                      <div className="hospital-meta-line"><span>Invoice Date</span><span>:</span><strong>{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></div>
                      <div className="hospital-meta-line"><span>Invoice Time</span><span>:</span><strong>{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</strong></div>
                    </div>
                  </div>

                  <div className="hospital-blue-rule" />

                  <div className="hospital-detail-grid">
                    <div className="hospital-detail-panel">
                      <div className="hospital-section-pill">Customer Details</div>
                      <div className="hospital-detail-row"><UserRound /><span>Name</span><span>:</span><strong>{walkIn ? 'Walk-in Customer' : selectedPatient?.data?.name || 'Patient not selected'}</strong></div>
                      <div className="hospital-detail-row"><IdCard /><span>Patient ID</span><span>:</span><strong>{walkIn ? '-' : selectedPatient?.data?.patientId || '-'}</strong></div>
                      <div className="hospital-detail-row"><Phone /><span>Mobile</span><span>:</span><strong>{walkIn ? '-' : phoneOf(selectedPatient?.data) || '-'}</strong></div>
                      <div className="hospital-detail-row"><Pill /><span>Sale Type</span><span>:</span><strong>{walkIn ? 'Walk-in' : 'Patient'}</strong></div>
                    </div>

                    <div className="hospital-detail-panel">
                      <div className="hospital-section-pill">Prescription Details</div>
                      <div className="hospital-detail-row"><FileText /><span>Prescription</span><span>:</span><strong>{prescription || 'Manual Sale'}</strong></div>
                      <div className="hospital-detail-row"><Pill /><span>Total Items</span><span>:</span><strong>{items.length}</strong></div>
                      <div className="hospital-detail-row"><Pill /><span>Total Qty</span><span>:</span><strong>{items.reduce((sum, item) => sum + Number(item.qty || 0), 0)}</strong></div>
                      <div className="hospital-detail-row"><CheckCircle /><span>Stock Check</span><span>:</span><strong>{hasInvalidStock ? 'Needs Review' : 'Passed'}</strong></div>
                      <div className="hospital-detail-row"><CalendarDays /><span>Expiry Check</span><span>:</span><strong>{hasExpiredItem ? 'Expired Found' : 'Passed'}</strong></div>
                    </div>

                    <div className="hospital-detail-panel">
                      <div className="hospital-section-pill">Payment Details</div>
                      <div className="hospital-detail-row"><CreditCard /><span>Payment Mode</span><span>:</span><strong>{paymentMethod}</strong></div>
                      <div className="hospital-detail-row"><IdCard /><span>Reference No</span><span>:</span><strong>-</strong></div>
                      <div className="hospital-detail-row"><FileText /><span>Invoice No</span><span>:</span><strong>{billNo}</strong></div>
                      <div className="hospital-detail-row"><CalendarDays /><span>Due Date</span><span>:</span><strong>-</strong></div>
                      <div className="hospital-detail-row"><CheckCircle /><span>Status</span><span>:</span><strong className="hospital-paid">PAID</strong></div>
                    </div>
                  </div>

                  <table className="hospital-invoice-table">
                    <thead>
                      <tr>
                        <th style={{ width: '6%' }}>#</th>
                        <th style={{ width: '32%' }}>Service / Item</th>
                        <th>Batch</th>
                        <th>Expiry</th>
                        <th style={{ width: '10%' }}>Qty</th>
                        <th style={{ width: '14%' }}>Rate (Rs.)</th>
                        <th style={{ width: '16%' }}>Amount (Rs.)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={`preview-${item.id}-${index}`}>
                          <td>{index + 1}</td>
                          <td className="item-cell">
                            <div className="item-title">{item.name}</div>
                            <div className="item-sub">{item.code || item.barcode || `${item.gstRate || 0}% GST`}</div>
                          </td>
                          <td><strong>{item.batch || '-'}</strong></td>
                          <td>{expiryLabel(item.expiry)}</td>
                          <td>{item.qty}</td>
                          <td>{amount(item.rate)}</td>
                          <td><strong>{amount(itemAmount(item))}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="hospital-summary-grid">
                    <div className="hospital-summary-card">
                      <div className="hospital-summary-title">Amount Summary</div>
                      <div className="hospital-summary-body">
                        <div className="hospital-summary-line"><span>Subtotal</span><strong>{amount(subtotal)}</strong></div>
                        <div className="hospital-summary-line hospital-green"><span>Discount</span><strong>- {amount(discount)}</strong></div>
                        <div className="hospital-summary-line"><span>Taxable Amount</span><strong>{amount(Math.max(0, subtotal - Number(discount || 0)))}</strong></div>
                        <div className="hospital-summary-line"><span>SGST</span><strong>{amount(gst / 2)}</strong></div>
                        <div className="hospital-summary-line"><span>CGST</span><strong>{amount(gst / 2)}</strong></div>
                      </div>
                      <div className="hospital-total-row"><span>Total Amount</span><strong>&#8377; {amount(total)}</strong></div>
                      <div className="hospital-words">
                        <div>Amount in Words:</div>
                        <div>{amountWords(total)}</div>
                      </div>
                    </div>

                    <div className="hospital-summary-card">
                      <div className="hospital-summary-title">Payment Summary</div>
                      <div className="hospital-summary-body">
                        <div className="hospital-summary-line"><span>Total Amount</span><strong>&#8377; {amount(total)}</strong></div>
                        <div className="hospital-summary-line hospital-green"><span>Amount Paid</span><strong>&#8377; {amount(total)}</strong></div>
                        <div className="hospital-summary-line hospital-green"><span>Balance Amount</span><strong>&#8377; {amount(0)}</strong></div>
                      </div>
                      <div className="hospital-breakup-title">Payment Breakup</div>
                      <div className="hospital-summary-body" style={{ paddingTop: 14 }}>
                        <div className="hospital-summary-line"><span>{paymentMethod}</span><strong>&#8377; {amount(total)}</strong></div>
                        <div className="hospital-summary-line"><span>Total Paid</span><strong>&#8377; {amount(total)}</strong></div>
                      </div>
                      <div className="hospital-stamp"><strong>PAID</strong><span>Thank You!</span></div>
                    </div>
                  </div>

                  <div className="hospital-bottom-grid">
                    <div className="hospital-notes">
                      <div className="hospital-note-label"><FileText size={13} />Notes</div>
                      <ol>
                        <li>Please keep this invoice for your records.</li>
                        <li>Medicines once sold will not be taken back.</li>
                        <li>Report any discrepancy within 7 days.</li>
                        <li>Verify batch and expiry before handover.</li>
                      </ol>
                    </div>
                    <div className="hospital-qr">
                      <div className="hospital-qr-title">Scan to Download Invoice</div>
                      <div className="hospital-qr-box">
                        {Array.from({ length: 49 }).map((_, index) => (
                          <span key={index} className={[0, 1, 2, 4, 5, 6, 7, 9, 13, 14, 16, 18, 20, 21, 22, 24, 25, 28, 30, 31, 33, 35, 36, 40, 42, 43, 44, 46, 47, 48].includes(index) ? 'is-dark' : ''} />
                        ))}
                      </div>
                    </div>
                    <div className="hospital-signature">
                      <div>For {(bizSettings.businessName || '').toUpperCase()}</div>
                      <div className="hospital-sign-line">Pharmacist / Authorised Signatory</div>
                    </div>
                  </div>

                  <div className="hospital-footer-strip">
                    <span>24x7 Helpline : {bizSettings.phone || '-'}</span>
                    <span>We wish you good health!</span>
                  </div>

                  <div className="mt-4 flex justify-end gap-2 print:hidden">
                    <Button tone="green" onClick={payBill} disabled={hasInvalidStock || hasExpiredItem}>Pay {money(total)}</Button>
                  </div>
                </section>
              </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
