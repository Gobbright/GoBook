import { useMemo, useState } from 'react';
import { Download, Eye, Mail, MoreVertical, Printer, Search, Send, Wallet, X } from 'lucide-react';

import { ExportButtons } from '../../../../../components/forms/ExportButtons.jsx';
import { useModuleRecords } from '../../../shared/recordUi/useModuleRecords.js';

const DATE_FILTERS = ['Today', 'This Week', 'This Month', 'All Dates'];
const TYPE_FILTERS = ['All Types', 'OPD', 'IPD', 'Pharmacy', 'Diagnostics', 'Emergency', 'OT', 'Other'];
const STATUS_FILTERS = ['All Status', 'Paid', 'Partial', 'Unpaid', 'Cancelled', 'Draft'];
const INPUT = 'border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] text-[#111827] outline-none focus:border-blue-500 font-[inherit] bg-white';

function money(value) {
  return `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function itemAmount(item = {}) {
  return Number(item.amount ?? ((Number(item.qty) || 0) * (Number(item.rate) || 0))) || 0;
}

function statusOf(data = {}) {
  if (data.status === 'Cancelled') return 'Cancelled';
  if (data.status === 'Draft') return 'Draft';
  const total = Number(data.total ?? data.payable ?? data.amount ?? 0);
  const paid = Number(data.paidAmount ?? (data.status === 'Paid' ? total : 0));
  const balance = Number(data.balance ?? Math.max(0, total - paid));
  if (balance <= 0 && total > 0) return 'Paid';
  if (paid > 0) return 'Partial';
  return data.status || 'Unpaid';
}

function normalizeServiceBill(record) {
  const data = record.data || {};
  const total = Number(data.payable ?? data.total ?? data.amount ?? 0);
  const paid = Number(data.paidAmount ?? (data.status === 'Paid' ? total : 0));
  return {
    id: record._id,
    source: 'hospital/billing',
    invoiceNo: data.billNo || data.invoiceNo || 'INV-DRAFT',
    patient: data.patientName || 'Patient',
    patientId: data.patientId || '-',
    mobile: data.mobile || data.phone || '-',
    type: data.billType || 'OPD',
    total,
    subtotal: Number(data.subtotal || 0),
    discount: Number(data.discount || 0),
    insurance: Number(data.insurance || 0),
    tax: Number(data.tax || 0),
    paid,
    balance: Number(data.balance ?? Math.max(0, total - paid)),
    status: statusOf(data),
    date: data.date || record.createdAt,
    visitNo: data.visitNo || '-',
    doctor: data.doctorName || '-',
    department: data.department || 'General Medicine',
    items: data.services || [],
    payments: paid > 0 ? [{ date: data.date, mode: data.paymentMode || 'Cash', amount: paid, reference: data.reference || '-' }] : [],
    raw: data,
  };
}

function normalizePharmacyBill(record) {
  const data = record.data || {};
  const total = Number(data.total ?? data.amount ?? 0);
  const paid = data.status === 'Paid' ? total : Number(data.paidAmount || 0);
  return {
    id: record._id,
    source: 'hospital/pharmacy-billing',
    invoiceNo: data.billNo || 'PH-DRAFT',
    patient: data.patientName || data.customer?.name || 'Walk-in',
    patientId: data.patientId || data.customer?.patientId || '-',
    mobile: data.customer?.phone || data.mobile || '-',
    type: 'Pharmacy',
    total,
    subtotal: Number(data.subtotal || 0),
    discount: Number(data.discount || 0),
    insurance: 0,
    tax: Number(data.gst || 0),
    paid,
    balance: Math.max(0, total - paid),
    status: statusOf({ ...data, total, paidAmount: paid }),
    date: data.date || record.createdAt,
    visitNo: data.prescription || '-',
    doctor: data.doctorName || '-',
    department: 'Pharmacy',
    items: data.items || [],
    payments: paid > 0 ? [{ date: data.date, mode: data.paymentMethod || 'Cash', amount: paid, reference: '' }] : [],
    raw: data,
  };
}

function isInDateFilter(dateValue, filter) {
  if (filter === 'All Dates') return true;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  if (filter === 'Today') return date >= start;
  if (filter === 'This Week') {
    const weekStart = new Date(start);
    weekStart.setDate(start.getDate() - start.getDay());
    return date >= weekStart;
  }
  if (filter === 'This Month') return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  return true;
}

function StatusBadge({ status }) {
  const classes = {
    Paid: 'bg-green-50 text-green-700',
    Partial: 'bg-blue-50 text-blue-700',
    Unpaid: 'bg-amber-50 text-amber-700',
    Cancelled: 'bg-red-50 text-red-700',
    Draft: 'bg-slate-100 text-slate-700',
  };
  return <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-extrabold uppercase ${classes[status] || classes.Unpaid}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{status}</span>;
}

function Button({ children, onClick, tone = 'white', disabled = false }) {
  const tones = {
    blue: 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700',
    green: 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700',
    red: 'border-red-100 bg-red-50 text-red-700 hover:bg-red-100',
    white: 'border-[#dbe4ef] bg-white text-[#374151] hover:bg-gray-50',
  };
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md border px-3 text-[13px] font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${tones[tone]}`}>
      {children}
    </button>
  );
}

function InvoiceDetails({ invoice, onClose, onReceivePayment, onCancel }) {
  const phone = String(invoice.mobile || '-').replace(/\D/g, '');
  const shareText = encodeURIComponent(`Invoice ${invoice.invoiceNo} for ${invoice.patient}: ${money(invoice.total)}`);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-4">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-lg bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-[#edf2f7] bg-white px-5 py-3">
          <div>
            <h2 className="m-0 text-[17px] font-extrabold text-[#071936]">Invoice #{invoice.invoiceNo}</h2>
            <p className="m-0 mt-0.5 text-[12px] font-semibold text-[#64748b]">{formatDate(invoice.date)} - {invoice.type}</p>
          </div>
          <button type="button" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#dbe4ef] bg-white text-[#334155] cursor-pointer"><X size={16} /></button>
        </div>

        <div className="p-5">
          <div className="mb-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-md border border-[#dfe7f1] bg-[#fbfdff] p-3">
              <div className="mb-1 text-[11px] font-extrabold uppercase text-[#64748b]">Patient Information</div>
              <div className="text-[14px] font-extrabold text-[#111827]">{invoice.patient}</div>
              <div className="text-[13px] text-[#475569]">{invoice.patientId || '-'}</div>
              <div className="text-[13px] text-[#475569]">{invoice.mobile || '-'}</div>
            </div>
            <div className="rounded-md border border-[#dfe7f1] bg-[#fbfdff] p-3">
              <div className="mb-1 text-[11px] font-extrabold uppercase text-[#64748b]">Visit Information</div>
              <div className="text-[14px] font-extrabold text-[#111827]">{invoice.visitNo}</div>
              <div className="text-[13px] text-[#475569]">Type: {invoice.type}</div>
              <div className="text-[13px] text-[#475569]">Status: {invoice.status}</div>
            </div>
            <div className="rounded-md border border-[#dfe7f1] bg-[#fbfdff] p-3">
              <div className="mb-1 text-[11px] font-extrabold uppercase text-[#64748b]">Doctor / Department</div>
              <div className="text-[14px] font-extrabold text-[#111827]">{invoice.doctor}</div>
              <div className="text-[13px] text-[#475569]">{invoice.department}</div>
            </div>
          </div>

          <div className="mb-4 overflow-x-auto rounded-md border border-[#dfe7f1]">
            <div className="border-b border-[#edf2f7] bg-[#f8fafc] px-4 py-2 text-[12px] font-extrabold uppercase text-[#334155]">Itemized Charges</div>
            <table className="w-full min-w-[680px] border-collapse">
              <thead>
                <tr>
                  {['Item', 'Department/Batch', 'Qty', 'Rate', 'Amount'].map((heading) => <th key={heading} className="border-b border-[#edf2f7] px-3 py-2 text-left text-[11px] font-extrabold uppercase text-[#64748b]">{heading}</th>)}
                </tr>
              </thead>
              <tbody>
                {invoice.items.length === 0 ? (
                  <tr><td colSpan={5} className="px-3 py-8 text-center text-[13px] text-[#64748b]">No itemized charges saved.</td></tr>
                ) : invoice.items.map((item, index) => (
                  <tr key={`${invoice.id}-${index}`}>
                    <td className="border-b border-[#f1f5f9] px-3 py-2 text-[13px] font-semibold text-[#111827]">{item.service || item.name || item.medicine || '-'}</td>
                    <td className="border-b border-[#f1f5f9] px-3 py-2 text-[13px] text-[#475569]">{item.department || item.batch || item.source || '-'}</td>
                    <td className="border-b border-[#f1f5f9] px-3 py-2 text-[13px]">{item.qty || 1}</td>
                    <td className="border-b border-[#f1f5f9] px-3 py-2 text-[13px]">{money(item.rate)}</td>
                    <td className="border-b border-[#f1f5f9] px-3 py-2 text-[13px] font-bold text-[#111827]">{money(itemAmount(item))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="rounded-md border border-[#dfe7f1] p-3">
              <div className="mb-3 text-[12px] font-extrabold uppercase text-[#334155]">Payment History</div>
              {invoice.payments.length === 0 ? (
                <div className="text-[13px] text-[#64748b]">No payment collected yet.</div>
              ) : invoice.payments.map((payment, index) => (
                <div key={`${invoice.id}-pay-${index}`} className="flex flex-wrap justify-between gap-2 border-b border-[#f1f5f9] py-2 text-[13px] last:border-0">
                  <span>{formatDate(payment.date)} - {payment.mode}</span>
                  <strong>{money(payment.amount)}</strong>
                </div>
              ))}
            </div>

            <div className="rounded-md bg-[#f8fbff] p-3 text-[13px]">
              <div className="flex justify-between py-1"><span>Subtotal</span><strong>{money(invoice.subtotal)}</strong></div>
              <div className="flex justify-between py-1 text-green-700"><span>Discount</span><strong>- {money(invoice.discount)}</strong></div>
              <div className="flex justify-between py-1 text-green-700"><span>Insurance</span><strong>- {money(invoice.insurance)}</strong></div>
              <div className="flex justify-between py-1"><span>Tax</span><strong>{money(invoice.tax)}</strong></div>
              <div className="mt-2 flex justify-between border-t border-[#dbe4ef] pt-2 font-extrabold text-[#111827]"><span>Total</span><strong>{money(invoice.total)}</strong></div>
              <div className="mt-2 flex justify-between py-1"><span>Paid</span><strong>{money(invoice.paid)}</strong></div>
              <div className="flex justify-between py-1 text-[16px] font-extrabold text-blue-700"><span>Balance</span><strong>{money(invoice.balance)}</strong></div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={() => window.print()}><Printer size={14} />Print</Button>
            <Button><Download size={14} />PDF</Button>
            <Button disabled={!phone} onClick={() => window.open(`https://wa.me/${phone}?text=${shareText}`, '_blank', 'noopener')}><Send size={14} />WhatsApp</Button>
            <Button><Mail size={14} />Email</Button>
            <Button tone="green" disabled={invoice.balance <= 0 || invoice.status === 'Cancelled'} onClick={() => onReceivePayment(invoice)}><Wallet size={14} />Receive Payment</Button>
            <Button tone="red" disabled={invoice.status === 'Cancelled'} onClick={() => onCancel(invoice)}>Cancel</Button>
            <Button><MoreVertical size={14} /></Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function BillsInvoicesPage() {
  const serviceBills = useModuleRecords('hospital/billing');
  const pharmacyBills = useModuleRecords('hospital/pharmacy-billing');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('Today');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const invoices = useMemo(() => [
    ...serviceBills.records.map(normalizeServiceBill),
    ...pharmacyBills.records.map(normalizePharmacyBill),
  ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)), [serviceBills.records, pharmacyBills.records]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter((invoice) => {
      if (q && ![invoice.invoiceNo, invoice.patient, invoice.patientId, invoice.mobile].filter(Boolean).join(' ').toLowerCase().includes(q)) return false;
      if (!isInDateFilter(invoice.date, dateFilter)) return false;
      if (typeFilter !== 'All Types' && invoice.type !== typeFilter) return false;
      if (statusFilter !== 'All Status' && invoice.status !== statusFilter) return false;
      return true;
    });
  }, [invoices, search, dateFilter, typeFilter, statusFilter]);

  const exportColumns = [
    { label: 'Invoice', value: (row) => row.invoiceNo },
    { label: 'Patient', value: (row) => row.patient },
    { label: 'Mobile', value: (row) => row.mobile },
    { label: 'Type', value: (row) => row.type },
    { label: 'Total', value: (row) => money(row.total) },
    { label: 'Status', value: (row) => row.status },
    { label: 'Date', value: (row) => formatDate(row.date) },
  ];

  async function receivePayment(invoice) {
    const amountText = window.prompt('Receive payment amount', String(invoice.balance));
    if (amountText == null) return;
    const amount = Number(amountText);
    if (!Number.isFinite(amount) || amount <= 0) return;
    const nextPaid = Math.min(invoice.total, invoice.paid + amount);
    const nextBalance = Math.max(0, invoice.total - nextPaid);
    const nextStatus = nextBalance <= 0 ? 'Paid' : 'Partial';
    const collection = invoice.source === 'hospital/billing' ? serviceBills : pharmacyBills;
    await collection.update(invoice.id, {
      ...invoice.raw,
      paidAmount: nextPaid,
      balance: nextBalance,
      status: nextStatus,
      paymentHistory: [...(invoice.raw.paymentHistory || []), { date: new Date().toISOString().slice(0, 10), amount, mode: 'Cash' }],
    });
    setSelectedInvoice(null);
  }

  async function cancelInvoice(invoice) {
    if (!window.confirm(`Cancel invoice ${invoice.invoiceNo}?`)) return;
    const collection = invoice.source === 'hospital/billing' ? serviceBills : pharmacyBills;
    await collection.update(invoice.id, { ...invoice.raw, status: 'Cancelled', cancelledAt: new Date().toISOString() });
    setSelectedInvoice(null);
  }

  return (
    <div className="p-3 md:p-4">
      <div className="rounded-2xl border border-[#e5e7eb] bg-[#f7f7f8] p-4 md:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h1 className="m-0 text-[18px] font-extrabold text-[#111827]">Bills & Invoices</h1>
          <ExportButtons title="Bills & Invoices" filename="hospital-bills-invoices" rows={filtered} columns={exportColumns} />
        </div>

        <div className="mb-4 max-w-xl">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
            <input className={`${INPUT} w-full pl-8`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Invoice / Patient / Mobile" />
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          <select className={INPUT} value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>{DATE_FILTERS.map((item) => <option key={item}>{item}</option>)}</select>
          <select className={INPUT} value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>{TYPE_FILTERS.map((item) => <option key={item}>{item}</option>)}</select>
          <select className={INPUT} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>{STATUS_FILTERS.map((item) => <option key={item}>{item}</option>)}</select>
        </div>

        <div className="mb-4 h-px max-w-3xl bg-[#111827]" />

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr>
                {['Invoice', 'Patient', 'Type', 'Total', 'Status', 'Actions'].map((heading) => (
                  <th key={heading} className="px-3 py-2 text-left text-[12px] font-extrabold uppercase text-[#111827]">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {serviceBills.loading || pharmacyBills.loading ? (
                <tr><td colSpan={6} className="px-3 py-10 text-center text-[13px] text-[#64748b]">Loading invoices...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-10 text-center text-[13px] text-[#64748b]">No bills match your filters.</td></tr>
              ) : filtered.map((invoice) => (
                <tr key={`${invoice.source}-${invoice.id}`} className="cursor-pointer border-b border-[#e5e7eb] hover:bg-white" onClick={() => setSelectedInvoice(invoice)}>
                  <td className="px-3 py-3 text-[13px] font-bold text-blue-700">{invoice.invoiceNo}</td>
                  <td className="px-3 py-3 text-[13px] text-[#111827]">
                    <div className="font-semibold">{invoice.patient}</div>
                    <div className="text-[12px] text-[#64748b]">{invoice.mobile || invoice.patientId || '-'}</div>
                  </td>
                  <td className="px-3 py-3 text-[13px]">{invoice.type}</td>
                  <td className="px-3 py-3 text-[13px] font-extrabold text-[#111827]">{money(invoice.total)}</td>
                  <td className="px-3 py-3"><StatusBadge status={invoice.status} /></td>
                  <td className="px-3 py-3" onClick={(event) => event.stopPropagation()}>
                    <div className="flex flex-wrap gap-1.5">
                      <Button onClick={() => setSelectedInvoice(invoice)}><Eye size={13} />View</Button>
                      <Button onClick={() => window.print()}><Printer size={13} />Print</Button>
                      <Button tone="green" disabled={invoice.balance <= 0 || invoice.status === 'Cancelled'} onClick={() => receivePayment(invoice)}>Receive</Button>
                      <Button tone="red" disabled={invoice.status === 'Cancelled'} onClick={() => cancelInvoice(invoice)}>Cancel</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedInvoice && (
        <InvoiceDetails
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onReceivePayment={receivePayment}
          onCancel={cancelInvoice}
        />
      )}
    </div>
  );
}

