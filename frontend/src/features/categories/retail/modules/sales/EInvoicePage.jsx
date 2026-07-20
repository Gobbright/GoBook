import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar, Download, Eye, FileText, IndianRupee,
  MoreVertical, Pencil, Plus, Search, Share2, Trash2, TrendingUp,
} from 'lucide-react';
import { formatCurrency } from '../../../../../utils/formatCurrency.js';
import { api } from '../../../../../services/api.js';
import { ShareModal } from './shared/ShareModal.jsx';
import { DocumentPdfDownload } from './shared/DocumentPdfDownload.jsx';
import { DateRangeFilter } from '../../../../../components/forms/DateRangeFilter.jsx';
import { ExportButtons } from '../../../../../components/forms/ExportButtons.jsx';
import { isWithinDateRange } from '../../../../../utils/dateRange.js';
import { useListKeyboardNav } from '../../../../../hooks/useListKeyboardNav.js';

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function StatCard({ label, amount, countLabel, accentColor, icon, format = 'currency' }) {
  const display = format === 'number' ? Number(amount).toLocaleString('en-IN') : formatCurrency(amount);
  return (
    <div className="bg-white border border-[#dfe7f1] rounded-lg p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-[#536173]">{label}</span>
        <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-none" style={{ backgroundColor: accentColor + '1a' }}>
          {icon}
        </span>
      </div>
      <div>
        <div className="text-[22px] font-bold text-[#111827] leading-none">{display}</div>
        {countLabel && (
          <div className="text-xs text-[#536173] mt-1.5">{countLabel}</div>
        )}
      </div>
    </div>
  );
}

function ActionMenu({ doc, openMenu, setOpenMenu, onDelete, onShare, onDownload }) {
  const isOpen = openMenu === doc.id;
  const btnRef = useRef(null);
  const [menuPos, setMenuPos] = useState({ top: 'auto', bottom: 'auto', right: 0 });

  function handleToggle() {
    if (!isOpen && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const right = window.innerWidth - rect.right;
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 300) {
        setMenuPos({ top: 'auto', bottom: window.innerHeight - rect.top + 4, right });
      } else {
        setMenuPos({ top: rect.bottom + 4, bottom: 'auto', right });
      }
    }
    setOpenMenu(isOpen ? null : doc.id);
  }

  function close() { setOpenMenu(null); }

  return (
    <div tabIndex={-1} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) close(); }}>
      <button ref={btnRef} type="button" className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#edf2f7] text-[#94a3b8] hover:text-[#374151] transition-colors" onClick={handleToggle}>
        <MoreVertical size={15} />
      </button>

      {isOpen && (
        <div className="fixed z-50 bg-white border border-[#dde6f2] rounded-lg shadow-lg py-1" style={{ top: menuPos.top, bottom: menuPos.bottom, right: menuPos.right, minWidth: 192 }}>
          <button type="button" className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-[#374151] text-left border-0 bg-transparent font-[inherit] cursor-pointer hover:bg-gray-50 transition-colors" onMouseDown={(e) => e.preventDefault()} onClick={() => { close(); window.location.assign(`#/billing/e-invoice/${doc.id}/view`); }}>
            <Eye size={13} className="text-[#94a3b8]" /> View E-Invoice
          </button>
          <button type="button" className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-[#374151] text-left border-0 bg-transparent font-[inherit] cursor-pointer hover:bg-gray-50 transition-colors" onMouseDown={(e) => e.preventDefault()} onClick={() => { close(); window.location.assign(`#/billing/e-invoice/${doc.id}/edit`); }}>
            <Pencil size={13} className="text-[#94a3b8]" /> Edit
          </button>
          <button type="button" className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-left border-0 bg-transparent font-[inherit] cursor-pointer hover:bg-gray-50 transition-colors" onMouseDown={(e) => e.preventDefault()} onClick={() => { close(); onDownload(doc); }}>
            <Download size={13} className="text-[#94a3b8]" /> Download PDF
          </button>
          <button type="button" className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-[#374151] text-left border-0 bg-transparent font-[inherit] cursor-pointer hover:bg-gray-50 transition-colors" onMouseDown={(e) => e.preventDefault()} onClick={() => { close(); onShare(doc); }}>
            <Share2 size={13} className="text-[#94a3b8]" /> Share
          </button>

          <div className="border-t border-[#edf2f7] my-1" />
          <button type="button" className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-red-600 text-left border-0 bg-transparent font-[inherit] cursor-pointer hover:bg-red-50 transition-colors" onMouseDown={(e) => e.preventDefault()} onClick={() => { close(); onDelete(doc.id, doc.number); }}>
            <Trash2 size={13} className="text-red-400" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

function normalizeDoc(inv) {
  const customer = {
    name: '',
    gstin: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: 'Tamil Nadu',
    pincode: '',
    ...(inv.customer ?? {}),
  };

  let taxable = 0;
  let gst = 0;
  if (Array.isArray(inv.items)) {
    inv.items.forEach((item) => {
      const gross = (item.qty ?? 1) * (item.rate ?? 0);
      const base  = gross - gross * ((item.discount ?? 0) / 100);
      taxable += base;
      gst     += base * ((item.gstRate ?? 0) / 100);
    });
  }
  if (Array.isArray(inv.charges)) {
    inv.charges.forEach((c) => {
      const amt = Number(c.amount) || 0;
      taxable += amt;
      gst     += amt * ((c.gstRate ?? 0) / 100);
    });
  }
  return {
    ...inv,
    id: inv._id ?? inv.id,
    number: inv.number || 'Untitled e-invoice',
    customer,
    date: inv.meta?.date || '',
    irn: inv.extra?.irn || '',
    taxable: Math.round(taxable * 100) / 100,
    gst:     Math.round(gst * 100) / 100,
    total:   Math.round((taxable + gst) * 100) / 100,
  };
}

function DeleteDialog({ docNumber, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-xl shadow-xl border border-[#dfe7f1] p-6 w-full max-w-sm mx-4">
        <h3 className="text-[15px] font-bold text-[#111827] mb-2">Delete E-Invoice</h3>
        <p className="text-[13px] text-[#536173] mb-5">
          Are you sure you want to delete <span className="font-semibold text-[#111827]">{docNumber}</span>? This cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <button type="button" className="px-4 py-2 border border-[#dbe4ef] rounded-md text-[13px] text-[#374151] bg-white hover:bg-gray-50 cursor-pointer font-[inherit]" onClick={onCancel}>Cancel</button>
          <button type="button" className="px-4 py-2 bg-red-600 text-white text-[13px] font-semibold rounded-md hover:bg-red-700 cursor-pointer font-[inherit]" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

export function EInvoicePage() {
  const [search, setSearch] = useState('');
  const [openMenu, setOpenMenu] = useState(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [shareDoc, setShareDoc]         = useState(null);
  const [bizSettings, setBizSettings] = useState({});
  const [pdfDoc, setPdfDoc] = useState(null);
  const searchRef = useRef(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const response = await api.listEInvoices({ limit: 100 });
        setDocs(Array.isArray(response.data) ? response.data.map(normalizeDoc) : []);
      } catch (err) {
        setError(err.message || 'Unable to load e-invoices');
        setDocs([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    api.getSettings().then(setBizSettings).catch(() => {});
  }, []);

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    try {
      await api.deleteEInvoice(deleteTarget.id);
      setDocs((prev) => prev.filter((d) => d.id !== deleteTarget.id));
    } catch (err) {
      setError(err.message || 'Failed to delete e-invoice');
    } finally {
      setDeleteTarget(null);
    }
  }

  const stats = useMemo(() => {
    const total = docs.length;
    const totalValue = docs.reduce((s, d) => s + d.total, 0);
    const now = new Date();
    const createdThisMonth = docs.filter((d) => {
      const dt = new Date(d.createdAt || d.date);
      return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth();
    }).length;
    const avgValue = total > 0 ? totalValue / total : 0;
    return { total, totalValue, createdThisMonth, avgValue };
  }, [docs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return docs.filter((d) => {
      const number = d.number?.toLowerCase() ?? '';
      const customerName = d.customer?.name?.toLowerCase() ?? '';
      const irn = d.irn?.toLowerCase() ?? '';
      if (q && !number.includes(q) && !customerName.includes(q) && !irn.includes(q)) return false;
      if (!isWithinDateRange(d.date || d.createdAt, dateFrom, dateTo)) return false;
      return true;
    });
  }, [dateFrom, dateTo, search, docs]);
  const exportColumns = [
    { label: 'E-Invoice No.', value: (row) => row.number },
    { label: 'Customer', value: (row) => row.customer?.name || '' },
    { label: 'GSTIN', value: (row) => row.customer?.gstin || '' },
    { label: 'Date', value: (row) => fmtDate(row.date) },
    { label: 'IRN', value: (row) => row.irn || '' },
    { label: 'Taxable Amt', value: (row) => formatCurrency(row.taxable) },
    { label: 'GST', value: (row) => formatCurrency(row.gst) },
    { label: 'Total', value: (row) => formatCurrency(row.total) },
  ];

  const { highlightedIndex } = useListKeyboardNav({
    rowCount: filtered.length,
    onOpen: (index) => window.location.assign(`#/billing/e-invoice/${filtered[index].id}/view`),
    searchRef,
  });

  return (
    <div className="p-4 md:p-7">
      {deleteTarget && (
        <DeleteDialog docNumber={deleteTarget.number} onConfirm={handleDeleteConfirm} onCancel={() => setDeleteTarget(null)} />
      )}

      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-6">
        <div>
          <nav className="flex items-center gap-1 text-[13px] text-[#536173] mb-1">
            <a className="text-blue-600 no-underline hover:underline" href="#/dashboard">Home</a>
            <span>›</span><span>Sales</span><span>›</span>
            <span className="text-[#111827]">E-Invoices</span>
          </nav>
          <h1 className="m-0 text-[22px] font-bold text-[#111827]">E-Invoices</h1>
        </div>
        <a
          href="#/billing/e-invoice/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-[13px] font-semibold rounded-md hover:bg-blue-700 no-underline transition-colors"
        >
          <Plus size={15} /> Generate E-Invoice
        </a>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 mb-6">{error}</div>}
      {loading && <div className="rounded-lg border border-[#dfe7f1] bg-white p-6 text-sm text-[#374151] mb-6">Loading e-invoices…</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Documents"
          amount={stats.total}
          format="number"
          accentColor="#2563eb"
          icon={<FileText size={16} color="#2563eb" />}
        />
        <StatCard
          label="Total Value"
          amount={stats.totalValue}
          accentColor="#16a34a"
          icon={<IndianRupee size={16} color="#16a34a" />}
        />
        <StatCard
          label="Created This Month"
          amount={stats.createdThisMonth}
          format="number"
          accentColor="#d97706"
          icon={<Calendar size={16} color="#d97706" />}
        />
        <StatCard
          label="Average Value"
          amount={stats.avgValue}
          accentColor="#7c3aed"
          icon={<TrendingUp size={16} color="#7c3aed" />}
        />
      </div>

      <div className="bg-white border border-[#dfe7f1] rounded-lg overflow-hidden">
        <div className="flex flex-wrap items-center justify-end gap-2 border-b border-[#edf2f7] px-4 py-2.5">
          <DateRangeFilter
            from={dateFrom}
            to={dateTo}
            onFromChange={setDateFrom}
            onToChange={setDateTo}
            onClear={() => { setDateFrom(''); setDateTo(''); }}
          />
          <ExportButtons title="E-Invoices" filename="e-invoices" rows={filtered} columns={exportColumns} />
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none" />
            <input
              ref={searchRef}
              className="pl-8 pr-3 py-2 border border-[#dbe4ef] rounded-md text-[13px] outline-none focus:border-blue-500 w-64 font-[inherit]"
              placeholder="Search invoice no., customer, or IRN…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: 1060 }}>
            <thead>
              <tr className="bg-[#f8fafc]">
                {[
                  { label: 'Invoice No.',  align: 'left'  },
                  { label: 'Customer',     align: 'left'  },
                  { label: 'Phone',        align: 'left'  },
                  { label: 'Date',         align: 'left'  },
                  { label: 'IRN',          align: 'left'  },
                  { label: 'Taxable Amt',  align: 'right' },
                  { label: 'GST',          align: 'right' },
                  { label: 'Total',        align: 'right' },
                  { label: '',             align: 'right' },
                ].map((col, i) => (
                  <th key={i} className={`text-xs font-semibold uppercase tracking-wide text-[#536173] px-4 py-3 ${col.align === 'right' ? 'text-right' : 'text-left'}`}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!loading && filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-[#536173] text-[13px]">
                    {docs.length === 0 ? 'No e-invoices yet. Generate your first e-invoice.' : 'No e-invoices match your search.'}
                  </td>
                </tr>
              ) : (
                filtered.map((doc, rowIndex) => (
                  <tr key={doc.id} className={`border-t border-[#edf2f7] hover:bg-[#fafbfe] transition-colors ${highlightedIndex === rowIndex ? 'bg-[#eef4fd]' : ''}`}>
                    <td className="px-4 py-3.5">
                      <a href={`#/billing/e-invoice/${doc.id}/view`} className="text-[13px] font-semibold text-blue-600 no-underline hover:underline">{doc.number}</a>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-[13px] font-medium text-[#111827] leading-snug">{doc.customer?.name || 'Walk-in customer'}</div>
                      <div className="text-xs text-[#94a3b8] mt-0.5">{doc.customer?.city}</div>
                    </td>
                    <td className="px-4 py-3.5 text-[13px] text-[#374151] whitespace-nowrap">{doc.customer?.phone || <span className="text-[#b0bec5]">—</span>}</td>
                    <td className="px-4 py-3.5 text-[13px] text-[#374151] whitespace-nowrap">{fmtDate(doc.date)}</td>
                    <td className="px-4 py-3.5 text-[13px] text-[#374151]">
                      {doc.irn
                        ? <span className="font-mono text-[11px] bg-[#f1f5f9] px-1.5 py-0.5 rounded">{doc.irn.slice(0, 20)}{doc.irn.length > 20 ? '…' : ''}</span>
                        : <span className="text-[#b0bec5]">—</span>
                      }
                    </td>
                    <td className="px-4 py-3.5 text-right text-[13px] text-[#374151]">{formatCurrency(doc.taxable)}</td>
                    <td className="px-4 py-3.5 text-right text-[13px] text-[#536173]">{formatCurrency(doc.gst)}</td>
                    <td className="px-4 py-3.5 text-right"><span className="text-[13px] font-bold text-[#111827]">{formatCurrency(doc.total)}</span></td>
                    <td className="px-4 py-3.5 text-right">
                      <ActionMenu doc={doc} openMenu={openMenu} setOpenMenu={setOpenMenu} onDelete={(id, number) => setDeleteTarget({ id, number })} onShare={setShareDoc} onDownload={setPdfDoc} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-[#edf2f7] flex flex-wrap items-center justify-between gap-2">
          <span className="text-[13px] text-[#536173]">
            Showing <span className="font-medium text-[#374151]">{filtered.length}</span> of{' '}
            <span className="font-medium text-[#374151]">{docs.length}</span> e-invoices
          </span>
          <div className="flex items-center gap-1">
            <button type="button" className="px-3 py-1.5 border border-[#dbe4ef] rounded text-[13px] text-[#374151] bg-white hover:bg-gray-50 cursor-pointer font-[inherit]">← Prev</button>
            <button type="button" className="px-3 py-1.5 border border-blue-600 rounded text-[13px] font-semibold text-white bg-blue-600 cursor-pointer font-[inherit]">1</button>
            <button type="button" className="px-3 py-1.5 border border-[#dbe4ef] rounded text-[13px] text-[#374151] bg-white hover:bg-gray-50 cursor-pointer font-[inherit]">Next →</button>
          </div>
        </div>
      </div>

      {shareDoc && <ShareModal doc={shareDoc} onClose={() => setShareDoc(null)} />}
      {pdfDoc && <DocumentPdfDownload doc={pdfDoc} bizSettings={bizSettings} onDone={() => setPdfDoc(null)} />}
    </div>
  );
}
