import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar, CheckCircle2, Download, Eye, FileText, IndianRupee,
  MoreVertical, Pencil, Plus, Search, Share2, TriangleAlert,
  Trash2,
} from 'lucide-react';
import { formatCurrency } from '../../../../../utils/formatCurrency.js';
import { api } from '../../../../../services/api.js';
import { DateRangeFilter } from '../../../../../components/forms/DateRangeFilter.jsx';
import { ExportButtons } from '../../../../../components/forms/ExportButtons.jsx';
import { isWithinDateRange } from '../../../../../utils/dateRange.js';
import { ShareModal } from './shared/ShareModal.jsx';
import { DocumentPdfDownload } from './shared/DocumentPdfDownload.jsx';
import { useListKeyboardNav } from '../../../../../hooks/useListKeyboardNav.js';

const PAGE_SIZE = 5;
const ROW_ACTIONS = [
  { id: 'view', icon: Eye, label: 'View PE' },
  { id: 'edit', icon: Pencil, label: 'Edit' },
  { id: 'pdf', icon: Download, label: 'Download PDF' },
  { id: 'share', icon: Share2, label: 'Share' },
  { id: 'delete', icon: Trash2, label: 'Delete', danger: true },
];

function fmtDate(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function calcTotal(doc) {
  if (doc?.totals?.finalTotal != null) return Number(doc.totals.finalTotal) || 0;
  if (doc?.totals?.grandTotal != null) return Number(doc.totals.grandTotal) || 0;
  let total = 0;
  (doc.items || []).forEach((item) => {
    const taxable = (Number(item.qty) || 0) * (Number(item.rate) || 0) * (1 - (Number(item.discount) || 0) / 100);
    total += taxable + taxable * ((Number(item.gstRate) || 0) / 100);
  });
  (doc.charges || []).forEach((charge) => {
    const amount = Number(charge.amount) || 0;
    total += amount + amount * ((Number(charge.gstRate) || 0) / 100);
  });
  return Math.round(total);
}

function normalizePE(entry, poMap) {
  const linkedPoId = entry.extra?.linkedPurchaseOrderId || '';
  const po = linkedPoId ? poMap.get(linkedPoId) : null;
  const poTotal = po ? calcTotal(po) : Number(entry.extra?.purchaseOrderTotal) || 0;
  const peTotal = calcTotal(entry);
  const difference = peTotal - poTotal;
  return {
    ...entry,
    id: entry._id,
    date: entry.meta?.date || '',
    vendorInvoiceNo: entry.extra?.vendorInvoiceNo || entry.meta?.poRef || '',
    linkedPoId,
    linkedPoNumber: entry.extra?.linkedPurchaseOrderNo || po?.number || '',
    poTotal,
    peTotal,
    difference,
    matchStatus: poTotal > 0 && Math.abs(difference) < 1 ? 'matched' : 'mismatch',
  };
}

function pageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total];
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '...', current - 1, current, current + 1, '...', total];
}

function ActionMenu({ entry, openMenu, setOpenMenu, onShare, onDownload, onDelete, onNavigate }) {
  const isOpen = openMenu === entry.id;
  const btnRef = useRef(null);
  const [menuPos, setMenuPos] = useState({ top: 'auto', bottom: 'auto', right: 0 });

  function handleToggle() {
    if (!isOpen && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const right = window.innerWidth - rect.right;
      const spaceBelow = window.innerHeight - rect.bottom;
      setMenuPos(spaceBelow < 260
        ? { top: 'auto', bottom: window.innerHeight - rect.top + 4, right }
        : { top: rect.bottom + 4, bottom: 'auto', right });
    }
    setOpenMenu(isOpen ? null : entry.id);
  }

  function handleAction(id) {
    setOpenMenu(null);
    if (id === 'view') onNavigate(`/billing/purchase-entry/${entry.id}/view`);
    else if (id === 'edit') onNavigate(`/billing/purchase-entry/${entry.id}/edit`);
    else if (id === 'pdf') onDownload(entry);
    else if (id === 'share') onShare(entry);
    else if (id === 'delete') onDelete(entry);
  }

  return (
    <div tabIndex={-1} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpenMenu(null); }}>
      <button ref={btnRef} type="button" className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#edf2f7] text-[#94a3b8] hover:text-[#374151] transition-colors" onClick={handleToggle}>
        <MoreVertical size={15} />
      </button>
      {isOpen && (
        <div className="fixed z-50 bg-white border border-[#dde6f2] rounded-lg shadow-lg py-1" style={{ top: menuPos.top, bottom: menuPos.bottom, right: menuPos.right, minWidth: 180 }}>
          {ROW_ACTIONS.map(({ id, icon: Icon, label, danger }) => (
            <button key={id} type="button" onMouseDown={(e) => e.preventDefault()} className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-left border-0 bg-transparent font-[inherit] cursor-pointer transition-colors ${danger ? 'text-red-600 hover:bg-red-50' : 'text-[#374151] hover:bg-gray-50'}`} onClick={() => handleAction(id)}>
              <Icon size={13} className={danger ? 'text-red-400' : 'text-[#94a3b8]'} />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, amount, icon, tone = '#2563eb', format = 'currency' }) {
  const value = format === 'number' ? Number(amount).toLocaleString('en-IN') : formatCurrency(amount);
  return (
    <div className="bg-white border border-[#dfe7f1] rounded-lg p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-[#536173]">{label}</span>
        <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${tone}1a` }}>{icon}</span>
      </div>
      <div className="text-[22px] font-bold text-[#111827] leading-none">{value}</div>
    </div>
  );
}

export function PurchaseEntryPage() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [search, setSearch] = useState('');
  const [openMenu, setOpenMenu] = useState(null);
  const [shareDoc, setShareDoc] = useState(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bizSettings, setBizSettings] = useState({});
  const [pdfDoc, setPdfDoc] = useState(null);
  const searchRef = useRef(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [peRes, poRes] = await Promise.all([
          api.listInvoices({ documentType: 'purchase-entry', limit: 200 }),
          api.listInvoices({ documentType: 'purchase-order', limit: 500 }),
        ]);
        const poMap = new Map((poRes.data || []).map((po) => [po._id, po]));
        setEntries((peRes.data || []).map((entry) => normalizePE(entry, poMap)));
      } catch (err) {
        setError(err.message || 'Unable to load purchase entries');
        setEntries([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    api.getSettings().then(setBizSettings).catch(() => {});
  }, []);

  const stats = useMemo(() => ({
    total: entries.length,
    totalValue: entries.reduce((sum, entry) => sum + entry.peTotal, 0),
    matched: entries.filter((entry) => entry.matchStatus === 'matched').length,
    mismatch: entries.filter((entry) => entry.matchStatus !== 'matched').length,
  }), [entries]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (q && !entry.number?.toLowerCase().includes(q) && !entry.vendorInvoiceNo?.toLowerCase().includes(q) && !entry.linkedPoNumber?.toLowerCase().includes(q) && !entry.customer?.name?.toLowerCase().includes(q)) return false;
      if (!isWithinDateRange(entry.date || entry.createdAt, dateFrom, dateTo)) return false;
      return true;
    });
  }, [dateFrom, dateTo, entries, search]);

  useEffect(() => { setPage(1); }, [dateFrom, dateTo, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const { highlightedIndex } = useListKeyboardNav({
    rowCount: paginated.length,
    onOpen: (index) => navigate(`/billing/purchase-entry/${paginated[index].id}/view`),
    searchRef,
  });

  const exportColumns = [
    { label: 'PE No.', value: (row) => row.number },
    { label: 'Vendor Invoice', value: (row) => row.vendorInvoiceNo },
    { label: 'Linked PO', value: (row) => row.linkedPoNumber },
    { label: 'Vendor', value: (row) => row.customer?.name || '' },
    { label: 'Date', value: (row) => fmtDate(row.date) },
    { label: 'PO Amount', value: (row) => formatCurrency(row.poTotal) },
    { label: 'PE Amount', value: (row) => formatCurrency(row.peTotal) },
    { label: 'Difference', value: (row) => formatCurrency(row.difference) },
    { label: 'Status', value: (row) => row.matchStatus },
  ];

  async function handleDelete(entry) {
    if (!window.confirm(`Delete purchase entry ${entry.number}? This cannot be undone.`)) return;
    try {
      await api.deleteInvoice(entry.id);
      setEntries((prev) => prev.filter((item) => item.id !== entry.id));
    } catch (err) {
      setError(err.message || 'Unable to delete purchase entry');
    }
  }

  return (
    <div className="p-4 md:p-7">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-6">
        <div>
          <nav className="flex items-center gap-1 text-[13px] text-[#536173] mb-1">
            <Link className="text-blue-600 no-underline hover:underline" to="/dashboard">Home</Link>
            <span>›</span><span>Sales</span><span>›</span>
            <span className="text-[#111827]">Purchase Entries</span>
          </nav>
          <h1 className="m-0 text-[22px] font-bold text-[#111827]">Purchase Entries</h1>
        </div>
        <Link to="/billing/purchase-entry/new" className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-[13px] font-semibold rounded-md hover:bg-blue-700 no-underline transition-colors">
          <Plus size={15} />
          Create Purchase Entry
        </Link>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 mb-6">{error}</div>}
      {loading && <div className="rounded-lg border border-[#dfe7f1] bg-white p-6 text-sm text-[#374151] mb-6">Loading purchase entries...</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Entries" amount={stats.total} format="number" tone="#2563eb" icon={<FileText size={16} color="#2563eb" />} />
        <StatCard label="Total Vendor Invoice" amount={stats.totalValue} tone="#16a34a" icon={<IndianRupee size={16} color="#16a34a" />} />
        <StatCard label="Matched" amount={stats.matched} format="number" tone="#15803d" icon={<CheckCircle2 size={16} color="#15803d" />} />
        <StatCard label="Mismatch" amount={stats.mismatch} format="number" tone="#d97706" icon={<TriangleAlert size={16} color="#d97706" />} />
      </div>

      <div className="bg-white border border-[#dfe7f1] rounded-lg overflow-hidden">
        <div className="flex flex-wrap items-center justify-end gap-2 border-b border-[#edf2f7] px-4 py-2.5">
          <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} onClear={() => { setDateFrom(''); setDateTo(''); }} />
          <ExportButtons title="Purchase Entries" filename="purchase-entries" rows={filtered} columns={exportColumns} />
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none" />
            <input ref={searchRef} className="pl-8 pr-3 py-2 border border-[#dbe4ef] rounded-md text-[13px] outline-none focus:border-blue-500 w-64 font-[inherit]" placeholder="Search PE, invoice, PO or vendor... (/)" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse sales-list-table">
            <thead>
              <tr className="bg-[#f8fafc]">
                {['PE No.', 'Vendor Invoice', 'Linked PO', 'Vendor', 'Date', 'PO Amount', 'PE Amount', 'Difference', 'Status', ''].map((label, i) => (
                  <th key={label || i} className={`text-xs font-semibold uppercase tracking-wide text-[#536173] px-4 py-3 ${i >= 5 && i <= 7 ? 'text-right' : 'text-left'}`}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-16 text-[#536173] text-[13px]">No purchase entries match your search.</td></tr>
              ) : paginated.map((entry, rowIndex) => (
                <tr key={entry.id} className={`border-t border-[#edf2f7] hover:bg-[#fafbfe] transition-colors ${highlightedIndex === rowIndex ? 'bg-[#eef4fd]' : ''}`}>
                  <td className="px-4 py-3.5"><Link to={`/billing/purchase-entry/${entry.id}/view`} className="text-[13px] font-semibold text-blue-600 no-underline hover:underline">{entry.number}</Link></td>
                  <td className="px-4 py-3.5 text-[13px] text-[#374151]">{entry.vendorInvoiceNo || <span className="text-[#b0bec5]">-</span>}</td>
                  <td className="px-4 py-3.5 text-[13px] text-[#374151]">{entry.linkedPoNumber || <span className="text-[#b0bec5]">Not linked</span>}</td>
                  <td className="px-4 py-3.5"><div className="text-[13px] font-medium text-[#111827]">{entry.customer?.name}</div><div className="text-xs text-[#94a3b8] mt-0.5">{entry.customer?.city}</div></td>
                  <td className="px-4 py-3.5 text-[13px] text-[#374151] whitespace-nowrap"><Calendar size={12} className="inline mr-1 text-[#94a3b8]" />{fmtDate(entry.date)}</td>
                  <td className="px-4 py-3.5 text-right text-[13px] text-[#536173]">{entry.poTotal ? formatCurrency(entry.poTotal) : '-'}</td>
                  <td className="px-4 py-3.5 text-right text-[13px] font-bold text-[#111827]">{formatCurrency(entry.peTotal)}</td>
                  <td className={`px-4 py-3.5 text-right text-[13px] font-semibold ${Math.abs(entry.difference) < 1 ? 'text-[#15803d]' : 'text-[#b45309]'}`}>{formatCurrency(entry.difference)}</td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold ${entry.matchStatus === 'matched' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                      {entry.matchStatus === 'matched' ? <CheckCircle2 size={12} /> : <TriangleAlert size={12} />}
                      {entry.matchStatus === 'matched' ? 'Matched' : 'Mismatch'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right"><ActionMenu entry={entry} openMenu={openMenu} setOpenMenu={setOpenMenu} onShare={setShareDoc} onDownload={setPdfDoc} onDelete={handleDelete} onNavigate={navigate} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-[#edf2f7] flex items-center justify-between text-[13px] text-[#536173]">
          <span>Showing {paginated.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 text-[12px] border border-[#dbe4ef] rounded hover:bg-gray-50 disabled:opacity-40 bg-white font-[inherit] cursor-pointer">←</button>
            {pageNumbers(page, totalPages).map((p, i) => p === '...' ? <span key={`ellipsis-${i}`} className="px-2 py-1 text-[12px] text-[#536173]">...</span> : <button key={p} onClick={() => setPage(p)} className={`px-2 py-1 text-[12px] border rounded font-[inherit] cursor-pointer ${p === page ? 'bg-blue-600 text-white border-blue-600' : 'border-[#dbe4ef] hover:bg-gray-50 bg-white'}`}>{p}</button>)}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2 py-1 text-[12px] border border-[#dbe4ef] rounded hover:bg-gray-50 disabled:opacity-40 bg-white font-[inherit] cursor-pointer">→</button>
          </div>
        </div>
      </div>

      {shareDoc && <ShareModal doc={shareDoc} onClose={() => setShareDoc(null)} />}
      {pdfDoc && <DocumentPdfDownload doc={pdfDoc} bizSettings={bizSettings} onDone={() => setPdfDoc(null)} />}
    </div>
  );
}

