import { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CalendarDays,
  CheckCircle,
  CreditCard,
  Eye,
  FileText,
  Globe2,
  IdCard,
  List,
  Mail,
  MapPin,
  Phone,
  Plus,
  Printer,
  ReceiptText,
  Save,
  Search,
  Settings,
  Stethoscope,
  Trash2,
  UserRound,
  Wallet,
  X,
} from 'lucide-react';

import { useKeyboardMode } from '../../../../../app/KeyboardModeContext.jsx';
import { api, SERVER_ORIGIN } from '../../../../../services/api.js';
import { useModuleRecords } from '../../../shared/recordUi/useModuleRecords.js';
import { getInvoicePrintTemplate, setInvoicePrintTemplate } from '../../../retail/modules/sales/shared/invoiceTemplatePreference.js';

const BILL_TYPES = ['OPD', 'IPD', 'Diagnostics', 'Emergency', 'OT', 'Other'];
const BILL_STRUCTURES = [
  { value: 'detailed', label: 'Detailed Hospital Bill' },
  { value: 'compact', label: 'Compact Counter Bill' },
  { value: 'insurance', label: 'Insurance / TPA Bill' },
  { value: 'discharge', label: 'Discharge Summary Bill' },
];
const PAYMENT_METHODS = ['Cash', 'UPI', 'Card', 'Bank', 'Credit'];
const PENDING_SERVICES = [
  { service: 'Consultation', code: 'OPD-CONS', department: 'OPD', qty: 1, rate: 500, discount: 0, tax: 0, insurance: 0, source: 'OPD' },
  { service: 'CBC Test', code: 'LAB-CBC', department: 'Laboratory', qty: 1, rate: 800, discount: 0, tax: 0, insurance: 0, source: 'Lab' },
  { service: 'X-Ray Chest', code: 'RAD-XRAY', department: 'Radiology', qty: 1, rate: 1200, discount: 0, tax: 0, insurance: 0, source: 'Radiology' },
];
const EMPTY_SERVICE = { service: '', code: '', department: 'OPD', qty: 1, rate: 0, discount: 0, tax: 0, insurance: 0, source: 'Manual' };
const INPUT = 'border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] text-[#111827] w-full outline-none focus:border-blue-500 font-[inherit] bg-white';

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
  const year = new Date().getFullYear();
  const prefix = `HB-${year}-`;
  const max = records.reduce((highest, record) => {
    const billNo = record.data?.billNo || '';
    if (!billNo.startsWith(prefix)) return highest;
    const number = Number(billNo.slice(prefix.length));
    return Number.isFinite(number) ? Math.max(highest, number) : highest;
  }, 0);
  return `${prefix}${String(max + 1).padStart(6, '0')}`;
}

function patientPhone(data = {}) {
  return data.phone || data.mobile || '';
}

function visitFor(patient, billType) {
  const suffix = String(patient?.data?.patientId || '00128').replace(/\D/g, '').slice(-5).padStart(5, '0');
  return `${billType}-${suffix}`;
}

function lineAmount(item) {
  return (Number(item.qty) || 0) * (Number(item.rate) || 0);
}

function billTypeFromEstimate(type) {
  const map = {
    Surgery: 'OT',
    'IPD Treatment': 'IPD',
    'Health Checkup': 'Diagnostics',
    Diagnostics: 'Diagnostics',
    Emergency: 'Emergency',
  };
  return map[type] || 'Other';
}

function normalizeProcedureStatus(status = '') {
  return String(status || '').trim().toUpperCase().replace(/\s+/g, ' ');
}

function businessAddress(settings = {}) {
  return [
    settings.address,
    [settings.city, settings.state, settings.pincode].filter(Boolean).join(', '),
  ].filter(Boolean).join(', ');
}

function Button({ children, onClick, tone = 'white', disabled = false, className = '' }) {
  const tones = {
    blue: 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700',
    green: 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700',
    subtle: 'border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100',
    white: 'border-[#dbe4ef] bg-white text-[#374151] hover:bg-gray-50',
  };
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md border px-3 text-[13px] font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${tones[tone]} ${className}`}
    >
      {children}
    </button>
  );
}

export function NewBillPage() {
  const { keyboardMode } = useKeyboardMode();
  const patients = useModuleRecords('hospital/patients');
  const bills = useModuleRecords('hospital/billing');
  const payments = useModuleRecords('hospital/payments');
  const packages = useModuleRecords('hospital/packages');
  const procedures = useModuleRecords('hospital/procedures');
  const [search, setSearch] = useState('');
  const [showPatientMenu, setShowPatientMenu] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [billType, setBillType] = useState('OPD');
  const [billStructure, setBillStructure] = useState('detailed');
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [services, setServices] = useState([]);
  const [billDiscount, setBillDiscount] = useState(100);
  const [taxAdjustment, setTaxAdjustment] = useState(0);
  const [insuranceAdjustment, setInsuranceAdjustment] = useState(500);
  const [advanceAdjustment, setAdvanceAdjustment] = useState(0);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [paidAmount, setPaidAmount] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [auth, setAuth] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const [bizSettings, setBizSettings] = useState({});
  const [printTemplate, setPrintTemplate] = useState(() => getInvoicePrintTemplate());

  const billNo = useMemo(() => nextBillNo(bills.records), [bills.records]);
  const nextReceiptNo = useMemo(() => {
    const max = payments.records.reduce((highest, record) => {
      const n = Number(String(record.data?.receiptNo || '').replace(/\D/g, ''));
      return Number.isFinite(n) ? Math.max(highest, n) : highest;
    }, 198);
    return `REC-${String(max + 1).padStart(3, '0')}`;
  }, [payments.records]);
  const patientOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    const source = q ? patients.records.filter((record) => {
      const data = record.data || {};
      return [data.patientId, data.name, data.email, patientPhone(data)].filter(Boolean).join(' ').toLowerCase().includes(q);
    }) : patients.records;
    return source.slice(0, 8);
  }, [patients.records, search]);

  const selectedPatient = patients.records.find((record) => record._id === selectedPatientId) || null;
  const activePackages = useMemo(() => packages.records
    .map((record) => ({ id: record._id, ...record.data }))
    .filter((pkg) => pkg.status !== 'Inactive'), [packages.records]);
  const selectedPackage = activePackages.find((pkg) => pkg.id === selectedPackageId) || null;
  const visitNo = selectedPatient ? visitFor(selectedPatient, billType) : `${billType}-00000`;
  const subtotal = services.reduce((sum, item) => sum + lineAmount(item), 0);
  const serviceDiscount = services.reduce((sum, item) => sum + Number(item.discount || 0), 0);
  const serviceTax = services.reduce((sum, item) => sum + Number(item.tax || 0), 0);
  const serviceInsurance = services.reduce((sum, item) => sum + Number(item.insurance || 0), 0);
  const totalDiscount = serviceDiscount + Number(billDiscount || 0);
  const totalTax = serviceTax + Number(taxAdjustment || 0);
  const totalInsurance = serviceInsurance + Number(insuranceAdjustment || 0);
  const payable = Math.max(0, subtotal - totalDiscount - totalInsurance - Number(advanceAdjustment || 0) + totalTax);
  const received = paidAmount === '' ? payable : Number(paidAmount || 0);
  const balance = paymentMode === 'Credit' ? payable : Math.max(0, payable - received);
  const extraReceived = paymentMode === 'Credit' ? 0 : Math.max(0, received - payable);

  const fKeyActions = [
    { key: 'F1', label: 'New', icon: Plus, action: () => window.location.assign('/hospital/new-bill') },
    { key: 'F2', label: 'Draft', icon: Save, action: () => { if (selectedPatient) save('Draft'); } },
    { key: 'F3', label: 'Preview', icon: Eye, action: () => { if (selectedPatient) setShowPreview(true); } },
    { key: 'F4', label: 'Print', icon: Printer, action: () => { if (selectedPatient) window.print(); } },
    { key: 'F5', label: 'Patient', icon: UserRound, action: () => document.querySelector('[data-fkey="hospital-patient"]')?.focus() },
    { key: 'F6', label: 'Service', icon: Plus, action: () => { addService(); window.setTimeout(() => document.querySelector('[data-fkey="hospital-service"]')?.focus(), 0); } },
    { key: 'F7', label: 'Pending', icon: List, action: loadPendingCharges },
    { key: 'F8', label: 'Collect', icon: Wallet, action: () => { if (selectedPatient) save('Paid'); } },
    { key: 'F10', label: 'Settings', icon: Settings, action: () => window.location.assign('/business-settings') },
  ];

  useEffect(() => {
    api.getSettings().then(setBizSettings).catch(() => {});
  }, []);

  useEffect(() => {
    setInvoicePrintTemplate(printTemplate);
  }, [printTemplate]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.get('estimateDraft')) return;
    const raw = window.sessionStorage.getItem('hospitalEstimateToBill');
    if (!raw) return;

    let estimate;
    try {
      estimate = JSON.parse(raw);
    } catch {
      window.sessionStorage.removeItem('hospitalEstimateToBill');
      return;
    }

    const patient = patients.records.find((record) => (
      record._id === estimate.patientRecordId || record.data?.patientId === estimate.patientId
    ));
    if (estimate.patientId && !patient && patients.loading) return;

    if (patient) {
      setSelectedPatientId(patient._id);
      setSearch(patient.data?.name || patient.data?.patientId || '');
    } else {
      setSearch(estimate.patientName || '');
    }
    setBillType(billTypeFromEstimate(estimate.estimateType));
    setServices((estimate.services || []).map((service) => ({
      service: service.name || '',
      code: 'EST',
      department: service.department || estimate.estimateType || 'Estimate',
      qty: 1,
      rate: Number(service.price || 0),
      discount: 0,
      tax: 0,
      insurance: 0,
      source: `Estimate: ${estimate.estimateNo}`,
      estimateNo: estimate.estimateNo,
    })));
    setInsuranceAdjustment(Number(estimate.expectedInsurance || 0));
    setBillDiscount(Number(estimate.discount || 0));
    setNotes(`Converted from estimate ${estimate.estimateNo}. Actual charges can be edited before invoice.`);
    setSavedMessage(`Estimate ${estimate.estimateNo} loaded. Review actual charges before generating invoice.`);
    window.sessionStorage.removeItem('hospitalEstimateToBill');
  }, [patients.loading, patients.records]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (!keyboardMode) return;
      const mod = event.ctrlKey || event.metaKey;

      if (mod && event.key.toLowerCase() === 's') {
        event.preventDefault();
        if (selectedPatient) save('Draft');
        return;
      }

      if (mod && event.key === 'Enter') {
        event.preventDefault();
        if (selectedPatient) save('Paid');
        return;
      }

      if (mod && event.key.toLowerCase() === 'p') {
        event.preventDefault();
        if (selectedPatient) window.print();
        return;
      }

      if (event.altKey && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        addService();
        window.setTimeout(() => document.querySelector('[data-fkey="hospital-service"]')?.focus(), 0);
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

  function updateService(index, field, value) {
    const numeric = ['qty', 'rate', 'discount', 'tax', 'insurance'].includes(field);
    setServices((current) => current.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [field]: numeric ? Number(value) : value } : item
    )));
  }

  function addService() {
    setServices((current) => [...current, { ...EMPTY_SERVICE }]);
  }

  function removeService(index) {
    setServices((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function loadPendingCharges() {
    const pendingProcedureRows = selectedPatient ? procedures.records
      .filter((record) => record.data?.patientId === selectedPatient.data?.patientId || record.data?.patientName === selectedPatient.data?.name)
      .filter((record) => record.data?.billingStatus !== 'Billed' && normalizeProcedureStatus(record.data?.status) !== 'CANCELLED')
      .map((record) => ({
        service: record.data?.procedure || record.data?.name || 'OPD Procedure',
        code: 'PROC',
        department: 'OPD',
        qty: 1,
        rate: Number(record.data?.charge || 0),
        discount: 0,
        tax: 0,
        insurance: 0,
        source: `Procedure: ${record.data?.opdNo || record.data?.visitNo || ''}`,
        sourceModule: 'hospital/procedures',
        sourceRecordId: record._id,
      })) : [];
    setServices(pendingProcedureRows.length ? pendingProcedureRows : PENDING_SERVICES.map((item) => ({ ...item })));
  }

  function applyPackage(packageId) {
    setSelectedPackageId(packageId);
    const pkg = activePackages.find((item) => item.id === packageId);
    if (!pkg) return;
    const packageServiceNames = new Set((pkg.services || []).map((service) => String(service.name || '').trim().toLowerCase()).filter(Boolean));
    const packageRows = (pkg.services || []).map((service) => ({
      service: service.name,
      code: 'PKG',
      department: pkg.category || 'Package',
      qty: 1,
      rate: Number(service.price || 0),
      discount: Number(service.price || 0),
      tax: 0,
      insurance: 0,
      source: `Package: ${pkg.packageName}`,
      packageId: pkg.id,
      packageName: pkg.packageName,
    }));
    const packagePriceRow = {
      service: pkg.packageName,
      code: 'PACKAGE',
      department: pkg.category || 'Package',
      qty: 1,
      rate: Number(pkg.packagePrice || 0),
      discount: 0,
      tax: 0,
      insurance: 0,
      source: 'Package Price',
      packageId: pkg.id,
      packageName: pkg.packageName,
    };
    setServices((current) => [
      ...current.filter((item) => !item.packageId && !packageServiceNames.has(String(item.service || '').trim().toLowerCase())),
      ...packageRows,
      packagePriceRow,
    ]);
  }

  async function save(status) {
    if (!selectedPatient) return;
    if (Number(billDiscount || 0) > 1000 && !auth.trim()) {
      window.alert('Authorization is required for large discounts.');
      return;
    }
    await bills.create({
      billNo,
      patientName: selectedPatient.data?.name || '',
      patientId: selectedPatient.data?.patientId || '',
      visitNo,
      billType,
      billStructure,
      packageId: selectedPackage?.id || '',
      packageName: selectedPackage?.packageName || '',
      estimateNo: services.find((item) => item.estimateNo)?.estimateNo || '',
      services,
      subtotal,
      discount: totalDiscount,
      tax: totalTax,
      insurance: totalInsurance,
      advance: Number(advanceAdjustment || 0),
      payable,
      paidAmount: status === 'Paid' ? received : 0,
      balance,
      paymentMode: status === 'Paid' ? paymentMode : '',
      reference,
      notes,
      authorization: auth,
      businessSnapshot: bizSettings,
      status,
      date: new Date().toISOString().slice(0, 10),
      amount: payable,
      name: `${billType} Bill`,
    });
    if (status === 'Paid') {
      await payments.create({
        receiptNo: nextReceiptNo,
        invoiceNo: billNo,
        invoiceSource: 'hospital/billing',
        patientName: selectedPatient.data?.name || '',
        mobile: patientPhone(selectedPatient.data),
        method: paymentMode,
        amount: received,
        referenceNo: reference,
        cashier: 'Cashier',
        status: 'Completed',
        date: new Date().toISOString().slice(0, 10),
        accountingStatus: 'Pending',
        name: `Receipt ${nextReceiptNo}`,
      });
    }
    if (status !== 'Draft') {
      await Promise.all(services
        .filter((item) => item.sourceModule === 'hospital/procedures' && item.sourceRecordId)
        .map((item) => {
          const record = procedures.records.find((procedure) => procedure._id === item.sourceRecordId);
          if (!record) return Promise.resolve();
          return procedures.update(record._id, { ...record.data, billingStatus: 'Billed', billNo });
        }));
    }
    setSavedMessage(status === 'Paid' ? `Bill ${billNo} generated and payment collected.` : `Draft ${billNo} saved.`);
  }

  return (
    <div className="billing-v2">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <ReceiptText size={18} />
          </span>
          <div>
            <h1 className="m-0">New Hospital Bill</h1>
            <p className="m-0 mt-1 text-[12px] font-semibold text-[#536173]">Bill No: {bills.loading ? 'Auto' : billNo}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => window.location.assign('/hospital/bills-invoices')}><List size={14} />View List <span className="hidden md:inline text-[10px] font-bold bg-black/5 rounded px-1.5 py-0.5">Alt+V</span></Button>
          <Button onClick={() => save('Draft')} disabled={!selectedPatient}>Save Draft</Button>
          <Button tone="blue" onClick={loadPendingCharges}>Load Pending Charges</Button>
          <Button onClick={() => setShowPreview(true)} disabled={!selectedPatient}><Eye size={14} />Preview</Button>
          <Button tone="green" onClick={() => save('Paid')} disabled={!selectedPatient}>Collect Payment</Button>
        </div>
      </div>

      {savedMessage && (
        <div data-validation-error className="mb-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-[13px] font-semibold text-green-700">
          {savedMessage}
        </div>
      )}

      <div className="hidden md:flex items-stretch bg-white border border-[#e5edf7] rounded-lg mb-4 overflow-x-auto">
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
      </div>

      <div className="billing-workspace">
        <div className="col-span-full bg-white border border-[#dfe7f1] rounded-lg p-5 mb-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <div className="billing-customer-picker">
              <label>Patient</label>
              <div className="billing-customer-search-line">
                <Search size={15} />
                <input
                  data-fkey="hospital-patient"
                  value={search}
                  onFocus={() => setShowPatientMenu(true)}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setShowPatientMenu(true);
                  }}
                  placeholder="Search Patient ID / Name / Mobile"
                />
              </div>
              {showPatientMenu && patientOptions.length > 0 && (
                <div className="billing-customer-dropdown">
                  {patientOptions.map((patient) => (
                    <button
                      key={patient._id}
                      type="button"
                      onClick={() => {
                        setSelectedPatientId(patient._id);
                        setSearch(patient.data?.name || patient.data?.patientId || '');
                        setShowPatientMenu(false);
                      }}
                    >
                      <strong>{patient.data?.name || 'Unnamed'}</strong>
                      <span>{patient.data?.patientId || '-'} - {patientPhone(patient.data) || 'No mobile'}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label>Bill Type</label>
              <select className={INPUT} value={billType} onChange={(event) => setBillType(event.target.value)}>
                {BILL_TYPES.map((type) => <option key={type}>{type}</option>)}
              </select>
            </div>

            <div>
              <label>Visit</label>
              <select className={INPUT} value={visitNo} onChange={() => {}}>
                <option>{visitNo}</option>
              </select>
            </div>

            <div>
              <label>Bill Structure</label>
              <select className={INPUT} value={billStructure} onChange={(event) => setBillStructure(event.target.value)}>
                {BILL_STRUCTURES.map((structure) => <option key={structure.value} value={structure.value}>{structure.label}</option>)}
              </select>
            </div>

            <div>
              <label>Package</label>
              <select className={INPUT} value={selectedPackageId} onChange={(event) => applyPackage(event.target.value)}>
                <option value="">No Package</option>
                {activePackages.map((pkg) => <option key={pkg.id} value={pkg.id}>{pkg.packageName}</option>)}
              </select>
            </div>
          </div>
        </div>

        <main className="billing-document-card bg-white border border-[#dfe7f1] rounded-lg overflow-hidden">
          <div className="grid gap-3 border-b border-[#edf2f7] bg-[#fbfdff] p-4 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="rounded-md border border-[#dfe7f1] bg-white p-3">
              <div className="mb-2 flex items-center gap-2 text-[12px] font-extrabold uppercase text-[#536173]">
                <UserRound size={14} />
                Patient & Visit
              </div>
              {selectedPatient ? (
                <div className="grid gap-2 text-[13px] text-[#111827] sm:grid-cols-2">
                  <strong>{selectedPatient.data?.name || 'Unnamed'} - {selectedPatient.data?.patientId || '-'}</strong>
                  <strong>{visitNo}</strong>
                  <span>{patientPhone(selectedPatient.data) || 'No mobile'}</span>
                  <span>Dr. Arun Kumar - General Medicine</span>
                </div>
              ) : (
                <div className="text-[13px] text-[#64748b]">Search and select a patient to auto-load visit details.</div>
              )}
            </div>

            <div className="rounded-md border border-blue-100 bg-blue-50 p-3">
              <div className="mb-2 flex items-center gap-2 text-[12px] font-extrabold uppercase text-blue-700">
                <FileText size={14} />
                Charge Source
              </div>
              <div className="text-[12px] font-semibold leading-5 text-[#334155]">
                Pulls unbilled OPD, IPD, diagnostics, emergency and OT charges. Manual hospital services can be added below.
                {selectedPackage && <div className="mt-2 text-blue-700">Package applied: {selectedPackage.packageName}. Included services are marked covered.</div>}
              </div>
            </div>
          </div>

          <div className="billing-items-panel px-6 py-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="m-0 text-[14px] font-extrabold uppercase text-[#111827]">Service / Charges</h3>
              <Button tone="subtle" onClick={addService}><Plus size={14} />Add Service</Button>
            </div>

            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Service</th>
                    <th>Code</th>
                    <th>Department</th>
                    <th>Qty</th>
                    <th>Rate</th>
                    <th>Disc.</th>
                    <th>Tax</th>
                    <th>Ins.</th>
                    <th>Source</th>
                    <th>Amount</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((item, index) => (
                    <tr key={`${item.service}-${index}`}>
                      <td>{index + 1}</td>
                      <td><input data-fkey={index === services.length - 1 ? 'hospital-service' : undefined} value={item.service} onChange={(event) => updateService(index, 'service', event.target.value)} /></td>
                      <td><input value={item.code} onChange={(event) => updateService(index, 'code', event.target.value)} /></td>
                      <td><input value={item.department} onChange={(event) => updateService(index, 'department', event.target.value)} /></td>
                      <td><input min="0" type="number" value={item.qty} onChange={(event) => updateService(index, 'qty', event.target.value)} /></td>
                      <td><input min="0" type="number" value={item.rate} onChange={(event) => updateService(index, 'rate', event.target.value)} /></td>
                      <td><input min="0" type="number" value={item.discount} onChange={(event) => updateService(index, 'discount', event.target.value)} /></td>
                      <td><input min="0" type="number" value={item.tax} onChange={(event) => updateService(index, 'tax', event.target.value)} /></td>
                      <td><input min="0" type="number" value={item.insurance} onChange={(event) => updateService(index, 'insurance', event.target.value)} /></td>
                      <td><input value={item.source} onChange={(event) => updateService(index, 'source', event.target.value)} /></td>
                      <td className="font-bold text-[#111827]">{money(lineAmount(item))}</td>
                      <td>
                        <button type="button" onClick={() => removeService(index)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#dbe4ef] bg-white text-red-600 cursor-pointer">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="billing-lower-details">
            <div>
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-[#536173]">Notes</label>
                <textarea className={INPUT} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Billing notes, insurance remarks or internal instructions" />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-[#536173]">Large Discount Authorization</label>
                <textarea className={INPUT} value={auth} onChange={(event) => setAuth(event.target.value)} placeholder="Required when bill-level discount is above Rs. 1,000" />
              </div>
            </div>
          </div>
        </main>

        <aside className="billing-summary-card bg-white border border-[#dfe7f1] rounded-lg">
          <div className="billing-summary-title flex items-center gap-2 font-extrabold">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-blue-600">
              <Wallet size={15} />
            </span>
            Bill Summary
          </div>

          <div className="billing-summary-lines flex flex-col">
            <div><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
            <div className="text-green-700"><span>Service Discount</span><strong>- {money(serviceDiscount)}</strong></div>
            <div><span>Bill Discount</span><input className="w-28 text-right" min="0" type="number" value={billDiscount} onChange={(event) => setBillDiscount(Number(event.target.value))} /></div>
            <div><span>Tax</span><input className="w-28 text-right" min="0" type="number" value={taxAdjustment} onChange={(event) => setTaxAdjustment(Number(event.target.value))} /></div>
            <div className="text-green-700"><span>Insurance</span><input className="w-28 text-right" min="0" type="number" value={insuranceAdjustment} onChange={(event) => setInsuranceAdjustment(Number(event.target.value))} /></div>
            <div className="text-green-700"><span>Advance</span><input className="w-28 text-right" min="0" type="number" value={advanceAdjustment} onChange={(event) => setAdvanceAdjustment(Number(event.target.value))} /></div>
          </div>

          <div className="billing-total-box">
            <div className="text-[12px] font-bold uppercase tracking-wide text-blue-700">Payable</div>
            <div className="text-[30px] font-extrabold text-blue-700 leading-tight">{money(payable)}</div>
            <div className="mt-2 text-[11px] text-[#536173]">Verify services, discount approval and insurance before collecting payment.</div>
          </div>

          <div className="billing-payment-panel">
            <div className="billing-summary-subtitle text-[12px] font-extrabold uppercase text-[#536173]">Payment Method</div>
            <div className="billing-payment-grid">
              {PAYMENT_METHODS.map((method) => (
                <button key={method} type="button" className={paymentMode === method ? 'active' : ''} onClick={() => setPaymentMode(method)}>
                  <span>{method.slice(0, 1)}</span>
                  {method}
                </button>
              ))}
            </div>

            <div className="billing-payment-details">
              <label>Amount Received</label>
              <div className="billing-payment-amount-row">
                <input type="number" min="0" value={paymentMode === 'Credit' ? 0 : paidAmount} disabled={paymentMode === 'Credit'} placeholder={String(payable)} onChange={(event) => setPaidAmount(event.target.value)} />
                <button type="button" disabled={paymentMode === 'Credit'} onClick={() => setPaidAmount(String(payable))}>Full</button>
              </div>
              <div className="billing-payment-balance"><span>Balance</span><strong>{money(balance)}</strong></div>
              {extraReceived > 0 && <div className="billing-payment-change"><span>Extra Received</span><strong>{money(extraReceived)}</strong></div>}
              {['UPI', 'Card', 'Bank'].includes(paymentMode) && (
                <input className="billing-payment-ref" value={reference} onChange={(event) => setReference(event.target.value)} placeholder="UTR / Transaction No." />
              )}
            </div>
          </div>

          <Button tone="green" className="mt-4 w-full" onClick={() => save('Paid')} disabled={!selectedPatient}>
            Collect Payment & Generate Bill
          </Button>
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#edf2f7] pt-3">
            <Button className="w-full" onClick={() => save('Draft')} disabled={!selectedPatient}>Save Draft</Button>
            <Button className="w-full" onClick={() => setShowPreview(true)} disabled={!selectedPatient}><Eye size={14} />Preview</Button>
            <Button className="w-full" onClick={() => window.print()} disabled={!selectedPatient}><Printer size={14} />Print</Button>
          </div>
        </aside>
      </div>

      {showPreview && selectedPatient && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e5edf7] bg-white px-5 py-3">
              <div>
                <h2 className="m-0 text-[16px] font-extrabold text-[#071936]">Bill Preview</h2>
                <p className="m-0 mt-0.5 text-[12px] font-semibold text-[#64748b]">
                  {BILL_STRUCTURES.find((item) => item.value === billStructure)?.label}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select className={INPUT} value={printTemplate} onChange={(event) => setPrintTemplate(event.target.value)}>
                  <option value="modern">Modern</option>
                  <option value="classic">Classic</option>
                </select>
                <Button onClick={() => window.print()}><Printer size={14} />Print</Button>
                <button type="button" onClick={() => setShowPreview(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#dbe4ef] bg-white text-[#334155] cursor-pointer">
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="p-6">
              {printTemplate === 'classic' ? (
              <div id="document-preview-print" className="invoice-pages-stack invoice-classic-stack">
                <section className="invoice-page invoice-classic-page">
                  <div className="invoice-classic-outer">
                    <div className="invoice-classic-title-row">
                      <span />
                      <strong>Tax Invoice</strong>
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
                          <div className="invoice-classic-field"><span>Visit No.</span><b>:</b><strong>{visitNo}</strong></div>
                          <div className="invoice-classic-field"><span>Bill Type</span><b>:</b><strong>{billType}</strong></div>
                          <div className="invoice-classic-field"><span>Pay Status</span><b>:</b><strong>{balance > 0 ? 'Due' : 'Paid'}</strong></div>
                        </div>
                        <div>
                          <div className="invoice-classic-field"><span>Invoice Date</span><b>:</b><strong className="invoice-classic-emphasis">{new Date().toLocaleDateString('en-IN')}</strong></div>
                          <div className="invoice-classic-field"><span>Pay. Mode</span><b>:</b><strong>{paymentMode}</strong></div>
                          <div className="invoice-classic-field"><span>Receipt No.</span><b>:</b><strong>{balance > 0 ? '-' : nextReceiptNo}</strong></div>
                          <div className="invoice-classic-field"><span>Reference</span><b>:</b><strong>{reference || '-'}</strong></div>
                        </div>
                      </div>
                    </div>

                    <div className="invoice-classic-party-grid">
                      <div className="invoice-classic-customer">
                        <div className="invoice-classic-section-caption">Patient</div>
                        <h2>{selectedPatient.data?.name || '-'}</h2>
                        <p>Patient ID : {selectedPatient.data?.patientId || '-'}</p>
                        <p>Age / Gender : {selectedPatient.data?.age || '-'} / {selectedPatient.data?.gender || '-'}</p>
                        <p>Mobile : {patientPhone(selectedPatient.data) || '-'}</p>
                        <p>{[selectedPatient.data?.address, selectedPatient.data?.city].filter(Boolean).join(', ') || '-'}</p>
                      </div>
                      <div className="invoice-classic-ledger">
                        <div className="invoice-classic-ledger-heading">Visit Details:</div>
                        <p>Doctor : Dr. Arun Kumar</p>
                        <div className="invoice-classic-ledger-row"><span>Department</span><b>=</b><strong>General Medicine</strong></div>
                        <div className="invoice-classic-ledger-row"><span>Adding this Invoice Amount</span><b>=</b><strong>+{amount(payable)}</strong></div>
                        <div className="invoice-classic-ledger-row invoice-classic-ledger-total"><span>Balance Due</span><b>=</b><strong>{amount(balance)}</strong></div>
                      </div>
                    </div>

                    <table className="invoice-classic-table invoice-classic-table-no-gst">
                      <thead>
                        <tr>
                          <th className="classic-col-sno">S/N</th>
                          <th className="classic-col-desc">Description Of Goods / Service</th>
                          <th className="classic-col-qty">Billed<br />Quantity</th>
                          <th className="classic-col-uqc">UQC</th>
                          <th className="classic-col-price">Price</th>
                          <th className="classic-col-amount">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {services.map((item, index) => (
                          <tr key={`classic-${item.service}-${index}`}>
                            <td className="classic-col-sno">{index + 1})</td>
                            <td className="classic-col-desc">
                              <div className="invoice-classic-item-title">{item.service || '-'}</div>
                              <div className="invoice-classic-item-sub">{item.department || '-'} {item.code ? `| ${item.code}` : ''}</div>
                            </td>
                            <td className="classic-col-qty">{item.qty || 0}</td>
                            <td className="classic-col-uqc">NOS</td>
                            <td className="classic-col-price">{amount(item.rate)}</td>
                            <td className="classic-col-amount">{amount(lineAmount(item))}</td>
                          </tr>
                        ))}
                        <tr className="invoice-classic-subtotal-row"><td className="classic-col-sno" /><td className="classic-col-desc" /><td className="classic-col-qty">{services.reduce((sum, item) => sum + Number(item.qty || 0), 0)}</td><td className="classic-col-uqc" /><td className="classic-col-price" /><td className="classic-col-amount">{amount(subtotal)}</td></tr>
                        <tr className="invoice-classic-total-line"><td colSpan={5}>Discount</td><td className="classic-col-amount">-{amount(totalDiscount)}</td></tr>
                        <tr className="invoice-classic-total-line"><td colSpan={5}>Tax</td><td className="classic-col-amount">{amount(totalTax)}</td></tr>
                        <tr className="invoice-classic-grand-total"><td colSpan={5}>Grand Total</td><td className="classic-col-amount">{amount(payable)}</td></tr>
                      </tbody>
                    </table>

                    <div className="invoice-classic-summary">
                      <div className="invoice-classic-tax-summary">
                        <h3>Amount in Words</h3>
                        <p>{amountWords(payable)}</p>
                      </div>
                      <table className="invoice-classic-payment-summary">
                        <tbody>
                          <tr><td>Payment Mode</td><td>{paymentMode}</td></tr>
                          <tr><td>Amount Paid</td><td>{amount(received)}</td></tr>
                          <tr className="invoice-classic-payment-grand"><td>Grand Total</td><td>{amount(payable)}</td></tr>
                          <tr className="invoice-classic-payment-due"><td>Balance Due</td><td>{amount(balance)}</td></tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="invoice-classic-bottom">
                      <div className="invoice-classic-terms"><h3>Terms & Notes</h3><ul><li>{notes || 'Please keep this invoice for your records.'}</li><li>Report any discrepancy within 7 days.</li></ul></div>
                      <div className="invoice-classic-declaration"><h3>Declaration</h3><p>This invoice is generated from existing hospital bill data.</p></div>
                      <div className="invoice-classic-sign"><strong>For {bizSettings.businessName || '-'}</strong><b>Authorised Signatory</b></div>
                    </div>

                    <div className="invoice-classic-footer">
                      <span>{bizSettings.phone || '-'}</span>
                      <strong>Generated by GoBook</strong>
                      <strong>{bizSettings.website || bizSettings.businessWebsite || ''}</strong>
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
                      <div className="hospital-section-pill">Patient Details</div>
                      <div className="hospital-detail-row"><UserRound /><span>Patient Name</span><span>:</span><strong>{selectedPatient.data?.name || '-'}</strong></div>
                      <div className="hospital-detail-row"><IdCard /><span>Patient ID</span><span>:</span><strong>{selectedPatient.data?.patientId || '-'}</strong></div>
                      <div className="hospital-detail-row"><CalendarDays /><span>Age / Gender</span><span>:</span><strong>{selectedPatient.data?.age || '-'} / {selectedPatient.data?.gender || '-'}</strong></div>
                      <div className="hospital-detail-row"><Phone /><span>Mobile</span><span>:</span><strong>{patientPhone(selectedPatient.data) || '-'}</strong></div>
                      <div className="hospital-detail-row"><MapPin /><span>Address</span><span>:</span><strong>{[selectedPatient.data?.address, selectedPatient.data?.city].filter(Boolean).join(', ') || '-'}</strong></div>
                    </div>

                    <div className="hospital-detail-panel">
                      <div className="hospital-section-pill">Visit Details</div>
                      <div className="hospital-detail-row"><ReceiptText /><span>Visit Type</span><span>:</span><strong>{billType}</strong></div>
                      <div className="hospital-detail-row"><FileText /><span>Visit No</span><span>:</span><strong>{visitNo}</strong></div>
                      <div className="hospital-detail-row"><UserRound /><span>Doctor</span><span>:</span><strong>Dr. Arun Kumar</strong></div>
                      <div className="hospital-detail-row"><Building2 /><span>Department</span><span>:</span><strong>General Medicine</strong></div>
                      <div className="hospital-detail-row"><CalendarDays /><span>Visit Date</span><span>:</span><strong>{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></div>
                    </div>

                    <div className="hospital-detail-panel">
                      <div className="hospital-section-pill">Payment Details</div>
                      <div className="hospital-detail-row"><CreditCard /><span>Payment Mode</span><span>:</span><strong>{paymentMode}</strong></div>
                      <div className="hospital-detail-row"><IdCard /><span>Reference No</span><span>:</span><strong>{reference || '-'}</strong></div>
                      <div className="hospital-detail-row"><ReceiptText /><span>Receipt No</span><span>:</span><strong>{balance > 0 ? '-' : nextReceiptNo}</strong></div>
                      <div className="hospital-detail-row"><CalendarDays /><span>Due Date</span><span>:</span><strong>{balance > 0 ? new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</strong></div>
                      <div className="hospital-detail-row"><CheckCircle /><span>Status</span><span>:</span><strong className={balance > 0 ? '' : 'hospital-paid'}>{balance > 0 ? 'DUE' : 'PAID'}</strong></div>
                    </div>
                  </div>

                  <table className="hospital-invoice-table">
                    <thead>
                      <tr>
                        <th style={{ width: '6%' }}>#</th>
                        <th style={{ width: '34%' }}>Service / Item</th>
                        <th>Department</th>
                        <th style={{ width: '11%' }}>Qty</th>
                        <th style={{ width: '16%' }}>Rate (Rs.)</th>
                        <th style={{ width: '18%' }}>Amount (Rs.)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {services.length === 0 ? (
                        <tr><td colSpan={6}>No services added.</td></tr>
                      ) : services.map((item, index) => (
                        <tr key={`preview-${item.service}-${index}`}>
                          <td>{index + 1}</td>
                          <td className="item-cell">
                            <div className="item-title">{item.service || '-'}</div>
                            <div className="item-sub">{item.code || item.source || ''}</div>
                          </td>
                          <td><strong>{item.department || '-'}</strong></td>
                          <td>{item.qty || 0}</td>
                          <td>{amount(item.rate)}</td>
                          <td><strong>{amount(lineAmount(item))}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="hospital-summary-grid">
                    <div className="hospital-summary-card">
                      <div className="hospital-summary-title">Amount Summary</div>
                      <div className="hospital-summary-body">
                        <div className="hospital-summary-line"><span>Subtotal</span><strong>{amount(subtotal)}</strong></div>
                        <div className="hospital-summary-line hospital-green"><span>Discount</span><strong>- {amount(totalDiscount)}</strong></div>
                        <div className="hospital-summary-line"><span>Taxable Amount</span><strong>{amount(Math.max(0, subtotal - totalDiscount))}</strong></div>
                        <div className="hospital-summary-line"><span>SGST (2.5%)</span><strong>{amount(totalTax / 2)}</strong></div>
                        <div className="hospital-summary-line"><span>CGST (2.5%)</span><strong>{amount(totalTax / 2)}</strong></div>
                        <div className="hospital-summary-line hospital-green"><span>Insurance / Advance</span><strong>- {amount(totalInsurance + Number(advanceAdjustment || 0))}</strong></div>
                      </div>
                      <div className="hospital-total-row"><span>Total Amount</span><strong>&#8377; {amount(payable)}</strong></div>
                      <div className="hospital-words">
                        <div>Amount in Words:</div>
                        <div>{amountWords(payable)}</div>
                      </div>
                    </div>

                    <div className="hospital-summary-card">
                      <div className="hospital-summary-title">Payment Summary</div>
                      <div className="hospital-summary-body">
                        <div className="hospital-summary-line"><span>Total Amount</span><strong>&#8377; {amount(payable)}</strong></div>
                        <div className="hospital-summary-line hospital-green"><span>Amount Paid</span><strong>&#8377; {amount(received)}</strong></div>
                        <div className="hospital-summary-line hospital-green"><span>Balance Amount</span><strong>&#8377; {amount(balance)}</strong></div>
                      </div>
                      <div className="hospital-breakup-title">Payment Breakup</div>
                      <div className="hospital-summary-body" style={{ paddingTop: 14 }}>
                        <div className="hospital-summary-line"><span>{paymentMode}</span><strong>&#8377; {amount(received)}</strong></div>
                        <div className="hospital-summary-line"><span>Total Paid</span><strong>&#8377; {amount(received)}</strong></div>
                      </div>
                      <div className="hospital-stamp"><strong>{balance > 0 ? 'DUE' : 'PAID'}</strong><span>Thank You!</span></div>
                    </div>
                  </div>

                  <div className="hospital-bottom-grid">
                    <div className="hospital-notes">
                      <div className="hospital-note-label"><FileText size={13} />Notes</div>
                      <ol>
                        <li>Please keep this invoice for your records.</li>
                        <li>Medicines once sold will not be taken back.</li>
                        <li>Report any discrepancy within 7 days.</li>
                        <li>{notes || 'Follow up with the doctor as advised.'}</li>
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
                      <div className="hospital-sign-line">Authorised Signatory</div>
                    </div>
                  </div>

                  <div className="hospital-footer-strip">
                    <span>24x7 Helpline : {bizSettings.phone || '-'}</span>
                    <span>We wish you good health!</span>
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
