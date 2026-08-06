import { useEffect, useMemo, useState } from 'react';
import { Eye, FileText, Plus, Printer, ReceiptText, Search, Trash2, UserRound, Wallet, X } from 'lucide-react';

import { useModuleRecords } from '../../../shared/recordUi/useModuleRecords.js';

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
  const patients = useModuleRecords('hospital/patients');
  const bills = useModuleRecords('hospital/billing');
  const payments = useModuleRecords('hospital/payments');
  const packages = useModuleRecords('hospital/packages');
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
    setServices(PENDING_SERVICES.map((item) => ({ ...item })));
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

      <div className="billing-workspace">
        <div className="col-span-full bg-white border border-[#dfe7f1] rounded-lg p-5 mb-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <div className="billing-customer-picker">
              <label>Patient</label>
              <div className="billing-customer-search-line">
                <Search size={15} />
                <input
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
                      <td><input value={item.service} onChange={(event) => updateService(index, 'service', event.target.value)} /></td>
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
                <Button onClick={() => window.print()}><Printer size={14} />Print</Button>
                <button type="button" onClick={() => setShowPreview(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#dbe4ef] bg-white text-[#334155] cursor-pointer">
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="rounded-md border border-[#d9e4f2] bg-white p-5">
                <div className="mb-5 flex flex-wrap items-start justify-between gap-4 border-b border-[#edf2f7] pb-4">
                  <div>
                    <div className="text-[18px] font-extrabold text-[#071936]">GoBright Hospital</div>
                    <div className="mt-1 text-[12px] font-semibold text-[#64748b]">Hospital Service Bill</div>
                  </div>
                  <div className="text-right text-[12px] font-semibold text-[#334155]">
                    <div>Bill No: {billNo}</div>
                    <div>Date: {new Date().toLocaleDateString('en-IN')}</div>
                    <div>Type: {billType}</div>
                  </div>
                </div>

                <div className="mb-5 grid gap-3 text-[13px] sm:grid-cols-2">
                  <div className="rounded-md bg-[#f8fbff] p-3">
                    <div className="mb-1 text-[11px] font-extrabold uppercase text-[#64748b]">Patient</div>
                    <div className="font-extrabold text-[#111827]">{selectedPatient.data?.name || 'Unnamed'}</div>
                    <div>{selectedPatient.data?.patientId || '-'}</div>
                    <div>{patientPhone(selectedPatient.data) || 'No mobile'}</div>
                  </div>
                  <div className="rounded-md bg-[#f8fbff] p-3">
                    <div className="mb-1 text-[11px] font-extrabold uppercase text-[#64748b]">Visit</div>
                    <div className="font-extrabold text-[#111827]">{visitNo}</div>
                    <div>Dr. Arun Kumar</div>
                    <div>General Medicine</div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] border-collapse text-[12px]">
                    <thead>
                      <tr className="bg-[#f8fafc] text-left uppercase text-[#334155]">
                        <th className="border-b border-[#e5edf7] px-3 py-2">Service</th>
                        <th className="border-b border-[#e5edf7] px-3 py-2">Department</th>
                        {billStructure !== 'compact' && <th className="border-b border-[#e5edf7] px-3 py-2">Source</th>}
                        <th className="border-b border-[#e5edf7] px-3 py-2 text-right">Qty</th>
                        <th className="border-b border-[#e5edf7] px-3 py-2 text-right">Rate</th>
                        <th className="border-b border-[#e5edf7] px-3 py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {services.length === 0 ? (
                        <tr>
                          <td className="px-3 py-8 text-center text-[#64748b]" colSpan={billStructure === 'compact' ? 5 : 6}>No services added.</td>
                        </tr>
                      ) : services.map((item, index) => (
                        <tr key={`preview-${item.service}-${index}`}>
                          <td className="border-b border-[#f1f5f9] px-3 py-2 font-semibold text-[#111827]">{item.service || '-'}</td>
                          <td className="border-b border-[#f1f5f9] px-3 py-2">{item.department || '-'}</td>
                          {billStructure !== 'compact' && <td className="border-b border-[#f1f5f9] px-3 py-2">{item.source || '-'}</td>}
                          <td className="border-b border-[#f1f5f9] px-3 py-2 text-right">{item.qty || 0}</td>
                          <td className="border-b border-[#f1f5f9] px-3 py-2 text-right">{money(item.rate)}</td>
                          <td className="border-b border-[#f1f5f9] px-3 py-2 text-right font-bold">{money(lineAmount(item))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="ml-auto mt-5 w-full max-w-sm rounded-md bg-[#f8fbff] p-3 text-[13px]">
                  <div className="flex justify-between py-1"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
                  <div className="flex justify-between py-1 text-green-700"><span>Discount</span><strong>- {money(totalDiscount)}</strong></div>
                  <div className="flex justify-between py-1"><span>Tax</span><strong>{money(totalTax)}</strong></div>
                  <div className="flex justify-between py-1 text-green-700"><span>Insurance</span><strong>- {money(totalInsurance)}</strong></div>
                  <div className="flex justify-between py-1 text-green-700"><span>Advance</span><strong>- {money(advanceAdjustment)}</strong></div>
                  <div className="mt-2 flex justify-between border-t border-[#dbe4ef] pt-2 text-[16px] font-extrabold text-blue-700"><span>Payable</span><strong>{money(payable)}</strong></div>
                </div>

                {billStructure === 'insurance' && (
                  <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-[12px] font-semibold text-amber-800">
                    Insurance / TPA structure includes claim review, policy verification and non-covered charge split.
                  </div>
                )}

                {notes && (
                  <div className="mt-4 text-[12px] text-[#475569]">
                    <strong>Notes:</strong> {notes}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
