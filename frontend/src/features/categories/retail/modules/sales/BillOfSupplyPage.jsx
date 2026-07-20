import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Download, Eye, FileText, IndianRupee,
  MoreVertical, Pencil, Plus, Search, Share2, Trash2, TrendingUp, Wallet, X,
} from 'lucide-react';
import { formatCurrency } from '../../../../../utils/formatCurrency.js';
import { api } from '../../../../../services/api.js';
import { DateRangeFilter } from '../../../../../components/forms/DateRangeFilter.jsx';
import { ExportButtons } from '../../../../../components/forms/ExportButtons.jsx';
import { isWithinDateRange } from '../../../../../utils/dateRange.js';
import { RecordPaymentModal } from './shared/RecordPaymentModal.jsx';
import { DocumentPdfDownload } from './shared/DocumentPdfDownload.jsx';

const PAGE_SIZE = 5;
const BILL_NUMBER_COLLATOR = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
const PAYMENT_FILTERS = ['All', 'Unpaid', 'Partial', 'Paid', 'Overdue'];

function fmtDate(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isPastDue(dueDate) {
  if (!dueDate) return false;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return false;
  due.setHours(23, 59, 59, 999);
  return due < new Date();
}

function StatCard({ label, amount, format = 'currency', accentColor, icon }) {
  const display = format === 'number' ? Number(amount).toLocaleString('en-IN') : formatCurrency(amount);
  return (
    <div className="bg-white border border-[#dfe7f1] rounded-lg p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-[#536173]">{label}</span>
        <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-none" style={{ backgroundColor: accentColor + '1a' }}>
          {icon}
        </span>
      </div>
      <div className="text-[22px] font-bold text-[#111827] leading-none">{display}</div>
    </div>
  );
}

function PaymentStatusBadge({ status }) {
  const classes = {
    Paid:    'bg-green-50 text-green-700',
    Partial: 'bg-blue-50 text-blue-700',
    Unpaid:  'bg-amber-50 text-amber-700',
    Overdue: 'bg-red-50 text-red-700',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${classes[status] ?? 'bg-gray-50 text-gray-600'}`}>
      {status}
    </span>
  );
}

function ShareModal({ bill, onClose }) {
  const [emailTo, setEmailTo] = useState(bill.customer?.email || '');
  const [sending, setSending] = useState(false);
  const [result, setResult]   = useState(null);

  const phone = (bill.customer?.phone || '').replace(/\D/g, '');
  const msg = `Hi ${bill.customer?.name || 'Customer'}, your bill ${bill.number} for ${formatCurrency(bill.total)} is ready. Thank you!`;

  function handleWhatsApp() {
    window.open(`https://wa.me/${phone ? `91${phone.slice(-10)}` : ''}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
  }

  async function handleEmail() {
    if (!emailTo.trim()) return;
    setSending(true); setResult(null);
    try {
      await api.sendInvoiceEmail(bill.id, { toEmail: emailTo.trim() });
      setResult({ ok: true, msg: `Bill sent to ${emailTo.trim()}` });
    } catch (err) {
      setResult({ ok: false, msg: err.message || 'Failed to send email' });
    } finally { setSending(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.35)' }} onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#edf2f7]">
          <div>
            <div className="font-semibold text-[#111827] text-[15px]">Share Bill</div>
            <div className="text-xs text-[#536173] mt-0.5">{bill.number} · {bill.customer?.name || 'Customer'}</div>
          </div>
          <button type="button" className="text-[#94a3b8] hover:text-[#374151] p-1" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="px-5 py-4 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="text-xs font-semibold text-[#536173] uppercase tracking-wide">WhatsApp</div>
            <div className="text-[13px] text-[#374151] bg-[#f8fafc] rounded-md px-3 py-2 border border-[#edf2f7] leading-relaxed">{msg}</div>
            <button type="button" disabled={!phone} onClick={handleWhatsApp}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-md text-[13px] font-semibold text-white cursor-pointer border-0 disabled:opacity-50"
              style={{ backgroundColor: '#16a34a' }}>
              <svg fill="currentColor" height="15" viewBox="0 0 24 24" width="15"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Send via WhatsApp
            </button>
            {!phone && <div className="text-xs text-amber-600">No phone number on this bill</div>}
          </div>
          <div className="border-t border-[#edf2f7]" />
          <div className="flex flex-col gap-2">
            <div className="text-xs font-semibold text-[#536173] uppercase tracking-wide">Email</div>
            <input type="email"
              className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit] w-full"
              placeholder="Customer email address" value={emailTo}
              onChange={(e) => { setEmailTo(e.target.value); setResult(null); }} />
            <button type="button" disabled={sending || !emailTo.trim()} onClick={handleEmail}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-md text-[13px] font-semibold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer border-0 disabled:opacity-50">
              {sending ? 'Sending…' : 'Send Bill by Email'}
            </button>
            {result && (
              <div className={`text-xs px-3 py-2 rounded-md ${result.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{result.msg}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const ROW_ACTIONS = [
  { id: 'payment', icon: Wallet,  label: 'Record Payment' },
  { id: 'view',    icon: Eye,     label: 'View Bill' },
  { id: 'pdf',     icon: Download, label: 'Download PDF' },
  { id: 'edit',    icon: Pencil,  label: 'Edit' },
  { id: 'share',   icon: Share2,  label: 'Share' },
  { id: 'delete',  icon: Trash2,  label: 'Delete', danger: true },
];

function ActionMenu({ bill, openMenu, setOpenMenu, onShare, onPayment, onDownload, onDelete }) {
  const billId = bill.id;
  const isOpen = openMenu === billId;
  const btnRef = useRef(null);
  const [menuPos, setMenuPos] = useState({ top: 'auto', bottom: 'auto', right: 0 });

  function handleToggle() {
    if (!isOpen && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const right = window.innerWidth - rect.right;
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 220) {
        setMenuPos({ top: 'auto', bottom: window.innerHeight - rect.top + 4, right });
      } else {
        setMenuPos({ top: rect.bottom + 4, bottom: 'auto', right });
      }
    }
    setOpenMenu(isOpen ? null : billId);
  }

  function handleAction(id) {
    setOpenMenu(null);
    if (id === 'view')    window.location.assign(`#/billing/bill-of-supply/${billId}/view`);
    else if (id === 'edit')    window.location.assign(`#/billing/bill-of-supply/${billId}/edit`);
    else if (id === 'payment') onPayment(bill);
    else if (id === 'pdf')     onDownload(bill);
    else if (id === 'share')   onShare(bill);
    else if (id === 'delete')  onDelete(bill);
  }

  return (
    <div tabIndex={-1} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpenMenu(null); }}>
      <button
        ref={btnRef}
        type="button"
        className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#edf2f7] text-[#94a3b8] hover:text-[#374151] transition-colors"
        onClick={handleToggle}
      >
        <MoreVertical size={15} />
      </button>
      {isOpen && (
        <div
          className="fixed z-50 bg-white border border-[#dde6f2] rounded-lg shadow-lg py-1"
          style={{ top: menuPos.top, bottom: menuPos.bottom, right: menuPos.right, minWidth: 176 }}
        >
          {ROW_ACTIONS.map(({ id, icon: Icon, label, danger }) => (
            <button
              key={id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-left border-0 bg-transparent font-[inherit] cursor-pointer transition-colors ${danger ? 'text-red-600 hover:bg-red-50' : 'text-[#374151] hover:bg-gray-50'}`}
              onClick={() => handleAction(id)}
            >
              <Icon size={13} className={danger ? 'text-red-400' : 'text-[#94a3b8]'} />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function normalizeBill(inv) {
  let subtotal = 0;
  if (Array.isArray(inv.items)) {
    inv.items.forEach((item) => {
      const gross = (item.qty ?? 1) * (item.rate ?? 0);
      subtotal += gross - gross * ((item.discount ?? 0) / 100);
    });
  }
  if (Array.isArray(inv.charges)) {
    inv.charges.forEach((c) => { subtotal += Number(c.amount) || 0; });
  }
  const savedTotal = Number(inv.totals?.finalTotal ?? inv.totals?.grandTotal);
  const total = Number.isFinite(savedTotal) && savedTotal > 0 ? savedTotal : Math.round(subtotal * 100) / 100;
  const paid = Math.max(0, Number(inv.advanceReceived) || 0);
  const balanceDue = Math.max(0, total - paid);
  return {
    ...inv,
    id: inv._id ?? inv.id,
    number: inv.number || 'Untitled',
    date: inv.meta?.date || '',
    dueDate: inv.meta?.dueDate || '',
    total: Math.round(total * 100) / 100,
    paid: Math.round(paid * 100) / 100,
    balanceDue: Math.round(balanceDue * 100) / 100,
    paymentStatus: balanceDue <= 0 ? 'Paid' : isPastDue(inv.meta?.dueDate) ? 'Overdue' : 'Unpaid',
  };
}

function applyPaymentData(bills, paidMap) {
  return bills.map((bill) => {
    const pmt = paidMap[bill.id];
    if (!pmt) return bill;
    const totalPaid = pmt.totalPaid;
    const balanceDue = pmt.balance;
    let paymentStatus;
    if (balanceDue <= 0)    paymentStatus = 'Paid';
    else if (totalPaid > 0) paymentStatus = 'Partial';
    else if (isPastDue(bill.dueDate)) paymentStatus = 'Overdue';
    else                    paymentStatus = 'Unpaid';
    return { ...bill, paid: totalPaid, balanceDue, paymentStatus };
  });
}

export function BillOfSupplyPage() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [openMenu, setOpenMenu] = useState(null);
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [shareInvoice, setShareInvoice] = useState(null);
  const [paymentInvoice, setPaymentInvoice] = useState(null);
  const [bizSettings, setBizSettings] = useState({});
  const [pdfDoc, setPdfDoc] = useState(null);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [res, paymentRes] = await Promise.all([
        api.listInvoices({ documentType: 'bill-of-supply', limit: 100 }),
        api.listOutstanding({ documentType: 'bill-of-supply' }).catch(() => ({ rows: [] })),
      ]);
      const raw = Array.isArray(res.data) ? res.data.map(normalizeBill) : [];
      const paidMap = {};
      for (const row of (paymentRes.rows ?? [])) paidMap[row.id] = row;
      setBills(applyPaymentData(raw, paidMap));
    } catch (err) {
      setError(err.message || 'Unable to load bills');
      setBills([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    api.getSettings().then(setBizSettings).catch(() => {});
  }, []);

  const stats = useMemo(() => {
    const total = bills.length;
    const totalValue = bills.reduce((s, b) => s + b.total, 0);
    const totalBalance = bills.reduce((s, b) => s + b.balanceDue, 0);
    const pendingCount = bills.filter((b) => b.balanceDue > 0).length;
    const avgValue = total > 0 ? totalValue / total : 0;
    return { total, totalValue, totalBalance, pendingCount, avgValue };
  }, [bills]);

  const ordered = useMemo(
    () => [...bills].sort((a, b) => BILL_NUMBER_COLLATOR.compare(a.number, b.number)),
    [bills],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ordered.filter((b) => {
      if (q && !b.number?.toLowerCase().includes(q) && !b.customer?.name?.toLowerCase().includes(q)) return false;
      if (!isWithinDateRange(b.date || b.createdAt, dateFrom, dateTo)) return false;
      if (paymentFilter !== 'All' && b.paymentStatus !== paymentFilter) return false;
      return true;
    });
  }, [ordered, search, dateFrom, dateTo, paymentFilter]);

  useEffect(() => { setCurrentPage(1); }, [search, dateFrom, dateTo, paymentFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const paginated = filtered.slice(pageStart, pageStart + PAGE_SIZE);
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  const exportColumns = [
    { label: 'Bill No.',      value: (r) => r.number },
    { label: 'Customer',      value: (r) => r.customer?.name || '' },
    { label: 'Phone',         value: (r) => r.customer?.phone || '' },
    { label: 'Bill Date',     value: (r) => fmtDate(r.date) },
    { label: 'Due Date',      value: (r) => fmtDate(r.dueDate) },
    { label: 'Total',         value: (r) => formatCurrency(r.total) },
    { label: 'Paid',          value: (r) => formatCurrency(r.paid) },
    { label: 'Balance Due',   value: (r) => formatCurrency(r.balanceDue) },
    { label: 'Payment Status',value: (r) => r.paymentStatus },
  ];

  async function handleDelete(bill) {
    if (!window.confirm(`Delete bill of supply ${bill.number}? This cannot be undone.`)) return;
    try {
      await api.deleteInvoice(bill.id);
      setBills((prev) => prev.filter((item) => item.id !== bill.id));
    } catch (err) {
      setError(err.message || 'Unable to delete bill of supply');
    }
  }

  return (
    <div className="p-4 md:p-7">

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-6">
        <div>
          <nav className="flex items-center gap-1 text-[13px] text-[#536173] mb-1">
            <a className="text-blue-600 no-underline hover:underline" href="#/dashboard">Home</a>
            <span>›</span><span>Sales</span><span>›</span>
            <span className="text-[#111827]">Bills of Supply</span>
          </nav>
          <h1 className="m-0 text-[22px] font-bold text-[#111827]">Bills of Supply</h1>
          <p className="m-0 text-[13px] text-[#536173] mt-1">Non-GST bills for exempt goods / unregistered customers</p>
        </div>
        <a
          href="#/billing/bill-of-supply/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-[13px] font-semibold rounded-md hover:bg-blue-700 no-underline transition-colors"
        >
          <Plus size={15} />
          Create Bill of Supply
        </a>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 mb-6">{error}</div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Bills" amount={stats.total} format="number" accentColor="#2563eb" icon={<FileText size={16} color="#2563eb" />} />
        <StatCard label="Total Value" amount={stats.totalValue} accentColor="#16a34a" icon={<IndianRupee size={16} color="#16a34a" />} />
        <StatCard label="Balance Pending" amount={stats.totalBalance} accentColor="#ea580c" icon={<Wallet size={16} color="#ea580c" />} />
        <StatCard label="Average Value" amount={stats.avgValue} accentColor="#7c3aed" icon={<TrendingUp size={16} color="#7c3aed" />} />
      </div>

      {/* Table card */}
      <div className="bg-white border border-[#dfe7f1] rounded-lg overflow-hidden">

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-end gap-2 border-b border-[#edf2f7] px-4 py-2.5">
          <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} onClear={() => { setDateFrom(''); setDateTo(''); }} />
          <select
            className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit] bg-white text-[#374151]"
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
          >
            {PAYMENT_FILTERS.map((s) => <option key={s} value={s}>{s === 'All' ? 'All Payments' : s}</option>)}
          </select>
          <ExportButtons title="Bills of Supply" filename="bills-of-supply" rows={filtered} columns={exportColumns} />
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none" />
            <input
              className="pl-8 pr-3 py-2 border border-[#dbe4ef] rounded-md text-[13px] outline-none focus:border-blue-500 w-56 font-[inherit]"
              placeholder="Search bill or customer…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: 900 }}>
            <thead>
              <tr className="bg-[#f8fafc]">
                {[
                  { label: 'Bill No.',       align: 'left'  },
                  { label: 'Customer',        align: 'left'  },
                  { label: 'Phone',           align: 'left'  },
                  { label: 'Bill Date',       align: 'left'  },
                  { label: 'Due Date',        align: 'left'  },
                  { label: 'Total',           align: 'right' },
                  { label: 'Paid',            align: 'right' },
                  { label: 'Balance',         align: 'right' },
                  { label: 'Payment',         align: 'left'  },
                  { label: '',                align: 'right' },
                ].map((col, i) => (
                  <th key={i} className={`text-xs font-semibold uppercase tracking-wide text-[#536173] px-4 py-3 ${col.align === 'right' ? 'text-right' : 'text-left'}`}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-[#536173] text-[13px]">Loading bills…</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-16 text-[#536173] text-[13px]">
                    {bills.length === 0 ? 'No bills yet. Create your first Bill of Supply.' : 'No bills match your search.'}
                  </td>
                </tr>
              ) : (
                paginated.map((bill) => (
                  <tr key={bill.id} className="border-t border-[#edf2f7] hover:bg-[#fafbfe] transition-colors">
                    <td className="px-4 py-3.5">
                      <a href={`#/billing/bill-of-supply/${bill.id}/view`} className="text-[13px] font-semibold text-blue-600 no-underline hover:underline">
                        {bill.number}
                      </a>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-[13px] font-medium text-[#111827]">{bill.customer?.name || 'Walk-in customer'}</div>
                      <div className="text-xs text-[#94a3b8] mt-0.5">{bill.customer?.city}</div>
                    </td>
                    <td className="px-4 py-3.5 text-[13px] text-[#374151] whitespace-nowrap">
                      {bill.customer?.phone || <span className="text-[#b0bec5]">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-[13px] text-[#374151] whitespace-nowrap">{fmtDate(bill.date)}</td>
                    <td className="px-4 py-3.5 text-[13px] text-[#374151] whitespace-nowrap">{fmtDate(bill.dueDate)}</td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-[13px] font-bold text-[#111827]">{formatCurrency(bill.total)}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right text-[13px] text-[#536173]">{formatCurrency(bill.paid)}</td>
                    <td className="px-4 py-3.5 text-right">
                      <span className={`text-[13px] font-bold ${bill.balanceDue > 0 ? 'text-[#b45309]' : 'text-green-700'}`}>
                        {formatCurrency(bill.balanceDue)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <PaymentStatusBadge status={bill.paymentStatus} />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <ActionMenu
                        bill={bill}
                        openMenu={openMenu}
                        setOpenMenu={setOpenMenu}
                        onShare={setShareInvoice}
                        onPayment={(bill) => setPaymentInvoice({ ...bill, balance: bill.balanceDue, invoiceTotal: bill.total })}
                        onDownload={setPdfDoc}
                        onDelete={handleDelete}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-[#edf2f7] flex flex-wrap items-center justify-between gap-2">
          <span className="text-[13px] text-[#536173]">
            Showing <span className="font-medium text-[#374151]">{filtered.length === 0 ? 0 : pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filtered.length)}</span> of{' '}
            <span className="font-medium text-[#374151]">{filtered.length}</span> bills
          </span>
          <div className="flex items-center gap-1">
            <button type="button" disabled={safePage === 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 border border-[#dbe4ef] rounded text-[13px] text-[#374151] bg-white hover:bg-gray-50 cursor-pointer font-[inherit] disabled:opacity-50 disabled:cursor-not-allowed">
              ← Prev
            </button>
            {pageNumbers.map((p) => (
              <button key={p} type="button" onClick={() => setCurrentPage(p)}
                className={`min-w-8 px-3 py-1.5 border rounded text-[13px] font-semibold cursor-pointer font-[inherit] ${safePage === p ? 'border-blue-600 text-white bg-blue-600' : 'border-[#dbe4ef] text-[#374151] bg-white hover:bg-gray-50'}`}>
                {p}
              </button>
            ))}
            <button type="button" disabled={safePage === totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 border border-[#dbe4ef] rounded text-[13px] text-[#374151] bg-white hover:bg-gray-50 cursor-pointer font-[inherit] disabled:opacity-50 disabled:cursor-not-allowed">
              Next →
            </button>
          </div>
        </div>
      </div>

      {shareInvoice && (
        <ShareModal bill={shareInvoice} onClose={() => setShareInvoice(null)} />
      )}
      {paymentInvoice && (
        <RecordPaymentModal
          invoice={paymentInvoice}
          onClose={() => setPaymentInvoice(null)}
          onSaved={() => { setPaymentInvoice(null); loadData(); }}
        />
      )}
      {pdfDoc && <DocumentPdfDownload doc={pdfDoc} bizSettings={bizSettings} onDone={() => setPdfDoc(null)} />}
    </div>
  );
}
