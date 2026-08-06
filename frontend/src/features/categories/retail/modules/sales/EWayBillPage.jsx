import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar, CheckCircle2, ChevronLeft, ChevronRight, Download, Eye,
  FileText, IndianRupee, MoreVertical, Package, Pencil, Plus,
  Search, Share2, Trash2, TrendingUp, User, UserPlus,
} from 'lucide-react';
import { ShareModal } from './shared/ShareModal.jsx';
import { DocumentPdfDownload } from './shared/DocumentPdfDownload.jsx';
import { formatCurrency } from '../../../../../utils/formatCurrency.js';
import { api, SERVER_ORIGIN } from '../../../../../services/api.js';
import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';
import { DateRangeFilter } from '../../../../../components/forms/DateRangeFilter.jsx';
import { ExportButtons } from '../../../../../components/forms/ExportButtons.jsx';
import { SalesFilterBar } from '../../../../../components/forms/SalesFilterBar.jsx';
import { EMPTY_SALES_FILTERS } from '../../../../../components/forms/salesFilterDefaults.js';
import { useListKeyboardNav } from '../../../../../hooks/useListKeyboardNav.js';
import { useDebouncedValue } from '../../../../../hooks/useDebouncedValue.js';

const FETCH_LIMIT = 500;

function fmtDate(iso) {
  if (!iso) return '-';
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
          <button type="button" className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-[#374151] text-left border-0 bg-transparent font-[inherit] cursor-pointer hover:bg-gray-50 transition-colors" onMouseDown={(e) => e.preventDefault()} onClick={() => { close(); window.location.assign(`/billing/e-way-bill/${doc.id}/view`); }}>
            <Eye size={13} className="text-[#94a3b8]" /> View E-Way Bill
          </button>
          <button type="button" className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-[#374151] text-left border-0 bg-transparent font-[inherit] cursor-pointer hover:bg-gray-50 transition-colors" onMouseDown={(e) => e.preventDefault()} onClick={() => { close(); window.location.assign(`/billing/e-way-bill/${doc.id}/edit`); }}>
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
    id: inv._id,
    date: inv.meta?.date || '',
    transport: inv.extra?.transporter || '',
    taxable: Math.round(taxable * 100) / 100,
    gst:     Math.round(gst * 100) / 100,
    total:   Math.round((taxable + gst) * 100) / 100,
  };
}

function DeleteDialog({ docNumber, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-xl shadow-xl border border-[#dfe7f1] p-6 w-full max-w-sm mx-4">
        <h3 className="text-[15px] font-bold text-[#111827] mb-2">Delete E-Way Bill</h3>
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

export function EWayBillPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [openMenu, setOpenMenu] = useState(null);
  const [filters, setFilters] = useState(EMPTY_SALES_FILTERS);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [shareDoc, setShareDoc]         = useState(null);
  const [listBizSettings, setListBizSettings] = useState({});
  const [pdfDoc, setPdfDoc] = useState(null);
  const searchRef = useRef(null);

  function updateFilter(key, value) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const response = await api.listEWayBills({ ...filters, search: debouncedSearch, dateFrom, dateTo, limit: FETCH_LIMIT });
        setDocs(Array.isArray(response.data) ? response.data.map(normalizeDoc) : []);
      } catch (err) {
        setError(err.message || 'Unable to load e-way bills');
        setDocs([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [filters, debouncedSearch, dateFrom, dateTo]);

  useEffect(() => {
    api.getSettings().then(setListBizSettings).catch(() => {});
  }, []);

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    try {
      await api.deleteEWayBill(deleteTarget.id);
      setDocs((prev) => prev.filter((d) => d.id !== deleteTarget.id));
    } catch (err) {
      setError(err.message || 'Failed to delete e-way bill');
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

  const exportColumns = [
    { label: 'EWB No.', value: (row) => row.number },
    { label: 'Consignee', value: (row) => row.customer?.name || '' },
    { label: 'Date', value: (row) => fmtDate(row.date) },
    { label: 'Transporter', value: (row) => row.transport || '' },
    { label: 'Taxable Amt', value: (row) => formatCurrency(row.taxable) },
    { label: 'Total', value: (row) => formatCurrency(row.total) },
  ];

  const { highlightedIndex } = useListKeyboardNav({
    rowCount: docs.length,
    onOpen: (index) => window.location.assign(`/billing/e-way-bill/${docs[index].id}/view`),
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
            <a className="text-blue-600 no-underline hover:underline" href="/dashboard">Home</a>
            <span>›</span><span>Sales</span><span>›</span>
            <span className="text-[#111827]">E-Way Bills</span>
          </nav>
          <h1 className="m-0 text-[22px] font-bold text-[#111827]">E-Way Bills</h1>
        </div>
        <a
          href="/billing/e-way-bill/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-[13px] font-semibold rounded-md hover:bg-blue-700 no-underline transition-colors"
        >
          <Plus size={15} /> Generate E-Way Bill
        </a>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 mb-6">{error}</div>}
      {loading && <div className="rounded-lg border border-[#dfe7f1] bg-white p-6 text-sm text-[#374151] mb-6">Loading e-way bills...</div>}

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
          <SalesFilterBar
            filters={filters}
            onChange={updateFilter}
            fields={['customer', 'city', 'state', 'supplyType', 'amountRange', 'itemType', 'hsn', 'productName', 'barcode', 'ewbStatus']}
          />
          <ExportButtons title="E-Way Bills" filename="e-way-bills" rows={docs} columns={exportColumns} />
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none" />
            <input
              ref={searchRef}
              className="pl-8 pr-3 py-2 border border-[#dbe4ef] rounded-md text-[13px] outline-none focus:border-blue-500 w-64 font-[inherit]"
              placeholder="Search e-way bill or consignee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse sales-list-table">
            <thead>
              <tr className="bg-[#f8fafc]">
                {[
                  { label: 'EWB No.',      align: 'left'  },
                  { label: 'Consignee',    align: 'left'  },
                  { label: 'Phone',        align: 'left'  },
                  { label: 'Date',         align: 'left'  },
                  { label: 'Transport',    align: 'left'  },
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
              {!loading && docs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-[#536173] text-[13px]">
                    {docs.length === 0 ? 'No e-way bills yet. Generate your first e-way bill.' : 'No e-way bills match your search.'}
                  </td>
                </tr>
              ) : (
                docs.map((doc, rowIndex) => (
                  <tr key={doc.id} className={`border-t border-[#edf2f7] hover:bg-[#fafbfe] transition-colors ${highlightedIndex === rowIndex ? 'bg-[#eef4fd]' : ''}`}>
                    <td className="px-4 py-3.5">
                      <a href={`/billing/e-way-bill/${doc.id}/view`} className="text-[13px] font-semibold text-blue-600 no-underline hover:underline">{doc.number}</a>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-[13px] font-medium text-[#111827] leading-snug">{doc.customer?.name}</div>
                      <div className="text-xs text-[#94a3b8] mt-0.5">{doc.customer?.city}</div>
                    </td>
                    <td className="px-4 py-3.5 text-[13px] text-[#374151] whitespace-nowrap">{doc.customer?.phone || <span className="text-[#b0bec5]">-</span>}</td>
                    <td className="px-4 py-3.5 text-[13px] text-[#374151] whitespace-nowrap">{fmtDate(doc.date)}</td>
                    <td className="px-4 py-3.5 text-[13px] text-[#374151] whitespace-nowrap">{doc.transport || <span className="text-[#b0bec5]">-</span>}</td>
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
            Showing <span className="font-medium text-[#374151]">{docs.length}</span> of{' '}
            <span className="font-medium text-[#374151]">{docs.length}</span> e-way bills
          </span>
          <div className="flex items-center gap-1">
            <button type="button" className="px-3 py-1.5 border border-[#dbe4ef] rounded text-[13px] text-[#374151] bg-white hover:bg-gray-50 cursor-pointer inline-flex items-center gap-1 font-[inherit]"><ChevronLeft size={14} /> Prev</button>
            <button type="button" className="px-3 py-1.5 border border-blue-600 rounded text-[13px] font-semibold text-white bg-blue-600 cursor-pointer font-[inherit]">1</button>
            <button type="button" className="px-3 py-1.5 border border-[#dbe4ef] rounded text-[13px] text-[#374151] bg-white hover:bg-gray-50 cursor-pointer inline-flex items-center gap-1 font-[inherit]">Next <ChevronRight size={14} /></button>
          </div>
        </div>
      </div>
      {shareDoc && <ShareModal doc={shareDoc} onClose={() => setShareDoc(null)} />}
      {pdfDoc && <DocumentPdfDownload doc={pdfDoc} bizSettings={listBizSettings} onDone={() => setPdfDoc(null)} />}
    </div>
  );
}


// â”€â”€ EWayBillFormPage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Ã¢â€â‚¬Ã¢â€â‚¬ Constants Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

const UNITS = ['Nos', 'Pcs', 'Kg', 'Gm', 'Mt', 'Ltr', 'Box', 'Bag', 'Set', 'Pair', 'Hrs', 'Days'];
const GST_RATES = [0, 5, 12, 18, 28];
const DEFAULT_STATE = 'Tamil Nadu';

const INDIAN_STATES = [
  'Andaman & Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar',
  'Chandigarh', 'Chhattisgarh', 'Dadra & Nagar Haveli', 'Daman & Diu', 'Delhi',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu & Kashmir', 'Jharkhand',
  'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra',
  'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal',
];

const TRANSPORT_MODES = ['Road', 'Rail', 'Air', 'Ship'];

const INVOICE_TYPES = [
  { value: 'regular',       label: 'Regular - B2B (Registered)' },
  { value: 'b2c',           label: 'B2C (Unregistered Buyer)' },
  { value: 'export-wop',    label: 'Export - Without Payment of Tax' },
  { value: 'export-wp',     label: 'Export - With Payment of Tax' },
  { value: 'sez-wp',        label: 'SEZ Supply - With Tax' },
  { value: 'sez-wop',       label: 'SEZ Supply - Without Tax' },
  { value: 'deemed-export', label: 'Deemed Export' },
];

const CHARGE_PRESETS = [
  { label: 'Freight' },
  { label: 'Packing' },
  { label: 'Insurance' },
  { label: 'Loading/Unloading' },
];

// Ã¢â€â‚¬Ã¢â€â‚¬ Helpers Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

function calcEwbValidity(distanceKm) {
  const km = Number(distanceKm) || 0;
  if (km === 0)   return { days: 0,  label: '-' };
  if (km <= 200)  return { days: 1,  label: '1 Day' };
  if (km <= 500)  return { days: 3,  label: '3 Days' };
  if (km <= 1000) return { days: 5,  label: '5 Days' };
  return               { days: 15, label: '15 Days' };
}

function calcValidUntil(dateStr, days) {
  if (!dateStr || !days) return '-';
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ', 11:59 PM';
}

function calcLine(item) {
  const gross       = item.qty * item.rate;
  const discountAmt = gross * (item.discount / 100);
  const taxable     = gross - discountAmt;
  const gstAmt      = taxable * (item.gstRate / 100);
  return { gross, discountAmt, taxable, gstAmt, total: taxable + gstAmt };
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Styles Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

const cx = {
  field:        'flex flex-col gap-1.5',
  label:        'text-[13px] text-[#536173] font-medium',
  input:        'border border-[#dbe4ef] rounded-lg px-3.5 py-2.5 text-[14px] text-[#111827] w-full outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-[inherit] transition-colors',
  select:       'border border-[#dbe4ef] rounded-lg px-3.5 py-2.5 text-[14px] text-[#111827] w-full outline-none bg-white font-[inherit] focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors',
  btnOutline:   'inline-flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium text-gray-700 bg-white border border-[#dbe4ef] rounded-lg cursor-pointer hover:bg-gray-50 font-[inherit] transition-colors',
  btnPrimary:   'inline-flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium text-white bg-blue-600 border border-blue-600 rounded-lg cursor-pointer hover:bg-blue-700 font-[inherit] transition-colors',
  section:      'bg-white border border-[#dfe7f1] rounded-xl mb-5 shadow-sm',
  sectionHead:  'px-7 py-5 border-b border-[#edf2f7] flex items-center gap-3',
  sectionTitle: 'text-[15px] font-semibold text-[#111827]',
  card:         'bg-white border border-[#dfe7f1] rounded-xl mb-4 shadow-sm',
};

// Ã¢â€â‚¬Ã¢â€â‚¬ Component Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

export function EWayBillFormPage({ ewbId }) {
  const [customer, setCustomer] = useState({
    name:    '',
    gstin:   '',
    phone:   '',
    email:   '',
    address: '',
    state:   'Tamil Nadu',
  });
  const [customers, setCustomers]               = useState([]);
  const [showCustomerDrop, setShowCustomerDrop] = useState(false);
  const [customerQuery, setCustomerQuery]       = useState('');

  const [ewbMeta, setEwbMeta] = useState({
    number:       '',
    date:         '2026-06-02',
    poRef:        '',
    invoiceType:  'regular',
    paymentTerms: '30',
  });

  const [transport, setTransport] = useState({
    mode:             'Road',
    vehicleNumber:    '',
    driverName:       '',
    driverMobile:     '',
    transporterName:  '',
    transporterGstin: '',
    lrNumber:         '',
    dispatchDate:     '2026-06-02',
    dispatchTime:     '',
  });

  const [routeInfo, setRouteInfo] = useState({
    dispatchFrom:      '',
    dispatchFromState: 'Tamil Nadu',
    dispatchTo:        '',
    dispatchToState:   'Tamil Nadu',
    expectedDelivery:  '',
    distanceKm:        '',
  });

  const [items, setItems]               = useState([]);
  const [products, setProducts]         = useState([]);
  const [catalogFor, setCatalogFor]     = useState(null);
  const [catalogQuery, setCatalogQuery] = useState({});
  const nextItemId                      = useRef(1000);

  const [charges, setCharges] = useState([]);
  const nextChargeId = useRef(2000);

  const [bizSettings, setBizSettings] = useState({});
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError]     = useState('');
  const [gspLoading, setGspLoading]   = useState(false);
  const [gspError, setGspError]       = useState('');
  const [gspResult, setGspResult]     = useState(null);

  // Ã¢â€â‚¬Ã¢â€â‚¬ Computed Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

  const businessState = bizSettings.state || DEFAULT_STATE;
  const supplyType = customer.state === businessState ? 'intrastate' : 'interstate';

  const totals = useMemo(() => {
    let taxable = 0, cgst = 0, sgst = 0, igst = 0, grandTotal = 0;
    items.forEach(item => {
      const line  = calcLine(item);
      taxable    += line.taxable;
      grandTotal += line.total;
      if (supplyType === 'intrastate') { cgst += line.gstAmt / 2; sgst += line.gstAmt / 2; }
      else                              { igst += line.gstAmt; }
    });
    const additionalCharges = charges.reduce((s, c) => s + (Number(c.amount) || 0), 0);
    return { taxable, cgst, sgst, igst, additionalCharges, grandTotal: grandTotal + additionalCharges, itemCount: items.length };
  }, [items, charges, supplyType]);

  const validity   = calcEwbValidity(routeInfo.distanceKm);
  const validUntil = calcValidUntil(ewbMeta.date, validity.days);
  const gstinValid = customer.gstin?.length === 15;

  // Ã¢â€â‚¬Ã¢â€â‚¬ Handlers Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

  function updateCustomer(f, v) { setCustomer(p => ({ ...p, [f]: v })); }
  function updateEwbMeta(f, v)  { setEwbMeta(p => ({ ...p, [f]: v })); }
  function updateTransport(f, v){ setTransport(p => ({ ...p, [f]: v })); }
  function updateRoute(f, v)    { setRouteInfo(p => ({ ...p, [f]: v })); }

  function updateItem(id, field, value) {
    setItems(prev => prev.map(item =>
      item.id === id
        ? { ...item, [field]: ['qty', 'rate', 'discount', 'gstRate'].includes(field) ? Number(value) : value }
        : item,
    ));
  }

  function addItem() {
    const id = nextItemId.current++;
    setItems(prev => [...prev, { id, description: '', hsn: '', qty: 1, unit: 'Nos', rate: 0, discount: 0, gstRate: 18 }]);
  }

  function removeItem(id) { setItems(prev => prev.filter(i => i.id !== id)); }

  function getCatalogMatches(query) {
    if (!query) return products.slice(0, 6);
    const q = query.toLowerCase();
    return products.filter(p =>
      p.description.toLowerCase().includes(q) || (p.code || '').toLowerCase().includes(q) || p.hsn.includes(q),
    );
  }

  function selectProduct(itemId, product) {
    setItems(prev => prev.map(item =>
      item.id === itemId
        ? { ...item, description: product.description, hsn: product.hsn, unit: product.unit, rate: product.rate, gstRate: product.gstRate }
        : item,
    ));
    setCatalogFor(null);
    setCatalogQuery(p => ({ ...p, [itemId]: '' }));
  }

  function addCharge(preset) {
    const id = nextChargeId.current++;
    setCharges(prev => [...prev, { id, label: preset?.label ?? '', amount: '', taxable: true }]);
  }

  function updateCharge(id, field, value) {
    setCharges(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  }

  function removeCharge(id) { setCharges(prev => prev.filter(c => c.id !== id)); }

  function buildPayload(extraMeta = {}) {
    return {
      number:       ewbMeta.number,
      documentType: 'e-way-bill',
      customer,
      meta:         { ...ewbMeta, ...extraMeta },
      transport,
      route:        routeInfo,
      items,
      charges,
      totals,
      supplyType,
    };
  }

  async function handleSave(extraMeta = {}) {
    setSaveError('');
    setSaveLoading(true);
    try {
      const payload = buildPayload(extraMeta);
      if (ewbId) await api.updateEWayBill(ewbId, payload);
      else       await api.createEWayBill(payload);
      window.location.assign('/billing/e-way-bill');
    } catch (err) {
      setSaveError(err.message || 'Unable to save');
    } finally {
      setSaveLoading(false);
    }
  }

  async function handleGenerateGSP() {
    if (!customer.name.trim()) { setGspError('Consignee name is required before generating.'); return; }
    if (!transport.vehicleNumber.trim()) { setGspError('Vehicle number is required.'); return; }
    if (!routeInfo.distanceKm || Number(routeInfo.distanceKm) <= 0) { setGspError('Distance (KM) must be greater than 0.'); return; }
    if (items.length === 0) { setGspError('Add at least one item before generating.'); return; }

    setGspError('');
    setGspResult(null);
    setGspLoading(true);
    try {
      const result = await api.generateEWayBillGSP(buildPayload());
      setGspResult(result);
      // Auto-save the EWB number and validity back to this record
      const extraMeta = { ewbNumber: result.ewbNo, ewbValidUpto: result.validUpto };
      const payload = buildPayload(extraMeta);
      if (ewbId) await api.updateEWayBill(ewbId, payload);
      else {
        const saved = await api.createEWayBill(payload);
        // Stay on the page so user can see the EWB number, update URL to edit mode
        if (saved?._id) window.history.replaceState(null, '', `/billing/e-way-bill/${saved._id}/edit`);
      }
    } catch (err) {
      setGspError(err.message || 'GSP generation failed. Check your credentials in Business Settings.');
    } finally {
      setGspLoading(false);
    }
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Effects Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

  useEffect(() => {
    function focus(fkey) {
      const el = document.querySelector(`[data-fkey="${fkey}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el?.focus();
    }
    function handleKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        if (e.key === 'Escape') { e.target.blur(); return; }
        if (!e.key.startsWith('F') || e.altKey || e.ctrlKey || e.metaKey) return;
      }
      if (!e.key.startsWith('F') || e.altKey || e.ctrlKey || e.metaKey) return;
      const num = Number(e.key.slice(1));
      if (num < 1 || num > 12) return;
      e.preventDefault();
      if (num === 1)  window.location.assign('/billing/e-way-bill/new');
      if (num === 2)  handleSave();
      if (num === 3)  handleGenerateGSP();
      if (num === 5)  addItem();
      if (num === 6)  focus('consignee');
      if (num === 7)  focus('vehicle');
      if (num === 8)  focus('transporter');
      if (num === 9)  focus('distance');
      if (num === 10) window.location.assign('/dashboard');
      if (num === 11) window.location.assign('/business-settings');
      if (num === 12) window.location.assign('/billing/e-way-bill');
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let active = true;
    async function loadData() {
      const [cust, prod, biz] = await Promise.allSettled([
        api.listCustomers(), api.listProducts(), api.getSettings(),
      ]);
      if (!active) return;
      if (cust.status === 'fulfilled') setCustomers(Array.isArray(cust.value) ? cust.value : []);
      if (prod.status === 'fulfilled') setProducts(Array.isArray(prod.value) ? prod.value : []);
      if (biz.status === 'fulfilled' && biz.value) setBizSettings(biz.value);

      if (!ewbId) {
        try {
          const next = await api.getEWayBillNextNumber();
          if (active && next?.number) setEwbMeta(p => ({ ...p, number: next.number }));
        } catch { /* next number unavailable, keep default */ }
      } else {
        try {
          const doc = await api.getEWayBill(ewbId);
          if (!active) return;
          if (doc.customer)  setCustomer(doc.customer);
          if (doc.meta)      setEwbMeta(doc.meta);
          if (doc.transport) setTransport(doc.transport);
          if (doc.route)     setRouteInfo(doc.route);
          if (doc.items)     setItems(doc.items);
          if (doc.charges)   setCharges(doc.charges);
        } catch (err) {
          setSaveError(err.message || 'Unable to load E-Way Bill');
        }
      }
    }
    loadData();
    return () => { active = false; };
  }, [ewbId]);

  return (
    <div className="p-7 pb-20">

      {/* -- Page Header -- */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <div className="flex flex-col gap-1">
          <nav className="flex items-center gap-1 text-[13px] text-[#536173]">
            <a className="text-blue-600 no-underline hover:underline" href="/dashboard">Home</a>
            <span>›</span><span>Sales</span><span>›</span>
            <a className="text-blue-600 no-underline hover:underline" href="/billing/e-way-bill">E-Way Bills</a>
            <span>›</span><span>{ewbId ? 'Edit E-Way Bill' : 'New E-Way Bill'}</span>
          </nav>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="m-0 text-[22px] font-bold">{ewbMeta.number || 'E-Way Bill'}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button className={cx.btnOutline} type="button" onClick={() => window.location.assign('/billing/e-way-bill')}>
            <svg fill="none" height="15" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="15"><line x1="8" x2="21" y1="6" y2="6" /><line x1="8" x2="21" y1="12" y2="12" /><line x1="8" x2="21" y1="18" y2="18" /><line x1="3" x2="3.01" y1="6" y2="6" /><line x1="3" x2="3.01" y1="12" y2="12" /><line x1="3" x2="3.01" y1="18" y2="18" /></svg>
            View List
          </button>
          <button className={cx.btnOutline} disabled={saveLoading} type="button" onClick={() => handleSave()}>
            <svg fill="none" height="15" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="15"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            {saveLoading ? 'Saving…' : 'Save Record'}
          </button>
          <button
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white bg-blue-600 border border-blue-600 rounded-md cursor-pointer hover:bg-blue-700 font-[inherit] disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={gspLoading || saveLoading}
            type="button"
            onClick={handleGenerateGSP}
          >
            <svg fill="none" height="15" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="15"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            {gspLoading ? 'Generating…' : 'Generate EWB Number'}
          </button>
        </div>
      </div>

      {saveError && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">{saveError}</div>
      )}

      {gspError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3">
          <svg className="flex-none text-red-500 mt-0.5" fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
          <div className="text-[13px] text-red-700">{gspError}
            {gspError.includes('Business Settings') && (
              <a href="/business-settings" className="ml-2 font-semibold underline text-red-800">Go to Settings ?</a>
            )}
          </div>
        </div>
      )}

      {gspResult && (
        <div className="mb-5 rounded-xl border-2 border-green-400 bg-green-50 px-5 py-4 flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-none">
            <svg fill="none" height="20" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24" width="20"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div className="flex flex-col gap-1">
            <div className="text-[14px] font-bold text-green-800">E-Way Bill Generated Successfully!</div>
            <div className="flex items-center gap-3 flex-wrap mt-1">
              <div className="flex flex-col">
                <span className="text-[11px] text-green-600 font-medium uppercase tracking-wide">EWB Number</span>
                <span className="text-[20px] font-black text-green-900 font-mono tracking-widest">{gspResult.ewbNo}</span>
              </div>
              {gspResult.validUpto && (
                <div className="flex flex-col">
                  <span className="text-[11px] text-green-600 font-medium uppercase tracking-wide">Valid Until</span>
                  <span className="text-[15px] font-bold text-green-800">{gspResult.validUpto}</span>
                </div>
              )}
            </div>
            <div className="text-[12px] text-green-700 mt-1">This number has been auto-saved to your record. Keep it with the goods during transport.</div>
          </div>
        </div>
      )}

      {/* -- Document Card -- */}
      <div className="bg-white border border-[#dfe7f1] rounded-lg">

        {/* -- Parties + Meta -- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 border-b border-[#edf2f7]">

          {/* Bill From */}
          <div className="flex flex-col gap-2">
            <div className="text-xs font-semibold uppercase text-[#536173] tracking-wide mb-1">Bill From</div>
            <div className="flex items-start gap-3">
              {bizSettings.logoUrl ? (
                <img src={`${SERVER_ORIGIN}${bizSettings.logoUrl}`} alt="logo" className="w-12 h-12 rounded-lg object-contain border border-[#dbe4ef] flex-none" />
              ) : (
                <div className="w-12 h-12 rounded-lg border-2 border-dashed border-[#dbe4ef] flex flex-col items-center justify-center flex-none gap-0.5">
                  <svg fill="none" height="16" stroke="#94a3b8" strokeWidth="1.5" viewBox="0 0 24 24" width="16"><rect height="18" rx="2" ry="2" width="18" x="3" y="3" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                  <span className="text-[9px] text-[#94a3b8] font-medium">LOGO</span>
                </div>
              )}
              <div>
                <div className="text-base font-bold text-[#111827]">{bizSettings.businessName || 'Your Business Name'}</div>
                {bizSettings.gstin && <div className="text-[12px] text-[#374151] font-mono">GSTIN: {bizSettings.gstin}</div>}
              </div>
            </div>
            {bizSettings.address && (
              <div className="text-[13px] text-[#374151]">
                {bizSettings.address}{bizSettings.city ? `, ${bizSettings.city}` : ''}{bizSettings.state ? ` – ${bizSettings.state}` : ''}{bizSettings.pincode ? ` ${bizSettings.pincode}` : ''}
              </div>
            )}
            {(bizSettings.businessEmail || bizSettings.phone) && (
              <div className="text-[13px] text-[#536173]">
                {[bizSettings.businessEmail, bizSettings.phone].filter(Boolean).join(' · ')}
              </div>
            )}
            <a href="/business-settings" className="text-[12px] text-blue-600 hover:underline no-underline mt-1">Edit Business Profile ?</a>
          </div>

          {/* Consignee */}
          <div className="flex flex-col gap-3">
            <div className="text-xs font-semibold uppercase text-[#536173] tracking-wide mb-1">Consignee (Bill To)</div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#536173] font-medium">Consignee / Company Name *</label>
              <div className="relative" tabIndex={-1} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setShowCustomerDrop(false); }}>
                <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none" />
                <input
                  data-fkey="consignee"
                  className="border border-[#dbe4ef] rounded-md pl-8 pr-3 py-2 text-[13px] text-[#111827] w-full outline-none focus:border-blue-500 font-[inherit]"
                  placeholder="Search or enter consignee name"
                  value={customerQuery || customer.name}
                  onFocus={() => { setShowCustomerDrop(true); setCustomerQuery(''); }}
                  onChange={e => { setCustomerQuery(e.target.value); updateCustomer('name', e.target.value); }}
                />
                {showCustomerDrop && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-white border border-[#dde6f2] rounded-lg shadow-lg py-1 max-h-56 overflow-y-auto">
                    {customers.filter(c => !customerQuery || c.name.toLowerCase().includes(customerQuery.toLowerCase())).slice(0, 8).map(c => (
                      <button key={c.id} className="w-full flex flex-col gap-0.5 px-4 py-2.5 text-left hover:bg-[#f8fafc] cursor-pointer border-0 bg-transparent font-[inherit]" type="button"
                        onMouseDown={() => { setCustomer({ name: c.name, gstin: c.gstin, phone: c.phone, email: c.email, address: c.address, state: c.state ?? businessState }); setShowCustomerDrop(false); setCustomerQuery(''); }}>
                        <span className="text-[13px] font-medium text-[#111827]">{c.name}</span>
                        <span className="text-[11px] text-[#94a3b8] font-mono">{c.gstin} · {c.city}</span>
                      </button>
                    ))}
                    <div className="border-t border-[#edf2f7] mt-1 pt-1">
                      <button className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] text-blue-600 font-medium hover:bg-blue-50 cursor-pointer border-0 bg-transparent font-[inherit]" type="button">
                        <UserPlus size={13} /> Add New Customer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#536173] font-medium">Phone</label>
                <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] text-[#111827] w-full outline-none focus:border-blue-500 font-[inherit]" placeholder="+91 XXXXX XXXXX" value={customer.phone} onChange={e => updateCustomer('phone', e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#536173] font-medium">GSTIN</label>
                <div className="relative">
                  <input className={`border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] text-[#111827] w-full outline-none focus:border-blue-500 font-[inherit] pr-8 ${gstinValid ? 'border-green-400' : ''}`} maxLength={15} placeholder="15-digit GSTIN" value={customer.gstin} onChange={e => updateCustomer('gstin', e.target.value.toUpperCase())} />
                  {gstinValid && <CheckCircle2 size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-green-500 pointer-events-none" />}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#536173] font-medium">Address</label>
              <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] text-[#111827] w-full outline-none focus:border-blue-500 font-[inherit]" placeholder="Street / Building / Area" value={customer.address} onChange={e => updateCustomer('address', e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#536173] font-medium">State</label>
                <SelectDropdown buttonClassName="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] text-[#111827] w-full outline-none bg-white font-[inherit]" value={customer.state} onChange={v => updateCustomer('state', v)} options={INDIAN_STATES} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#536173] font-medium">Email</label>
                <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] text-[#111827] w-full outline-none focus:border-blue-500 font-[inherit]" placeholder="email@company.com" value={customer.email} onChange={e => updateCustomer('email', e.target.value)} />
              </div>
            </div>
          </div>

          {/* EWB Meta */}
          <div className="flex flex-col gap-3">
            <span className="inline-block text-xs font-bold uppercase text-blue-700 bg-[#eef5ff] rounded-md px-2.5 py-1.5 self-start mb-1">E-Way Bill</span>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#536173] font-medium">E-Way Bill No.</label>
              <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] text-[#111827] w-full outline-none focus:border-blue-500 font-[inherit]" value={ewbMeta.number} onChange={e => updateEwbMeta('number', e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#536173] font-medium">Date</label>
                <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] text-[#111827] w-full outline-none focus:border-blue-500 font-[inherit]" type="date" value={ewbMeta.date} onChange={e => updateEwbMeta('date', e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#536173] font-medium">Invoice Type</label>
                <SelectDropdown buttonClassName="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] text-[#111827] w-full outline-none bg-white font-[inherit]" value={ewbMeta.invoiceType} onChange={v => updateEwbMeta('invoiceType', v)} options={INVOICE_TYPES} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#536173] font-medium">PO / Reference No.</label>
                <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] text-[#111827] w-full outline-none focus:border-blue-500 font-[inherit]" placeholder="Optional" value={ewbMeta.poRef} onChange={e => updateEwbMeta('poRef', e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#536173] font-medium">Distance (KM)</label>
                <input data-fkey="distance" className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] text-[#111827] w-full outline-none focus:border-blue-500 font-[inherit]" min="0" placeholder="0" type="number" value={routeInfo.distanceKm} onChange={e => updateRoute('distanceKm', e.target.value)} />
              </div>
            </div>

            {validity.days > 0 && (
              <div className="text-[12px] text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
                EWB valid for <span className="font-semibold">{validity.label}</span> — until {validUntil}
              </div>
            )}
          </div>
        </div>

        {/* -- Transport Details -- */}
        <div className="px-6 py-5 border-b border-[#edf2f7]">
          <h3 className="m-0 text-[15px] font-semibold mb-4">Transport Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#536173] font-medium">Transport Mode *</label>
              <SelectDropdown buttonClassName="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] text-[#111827] w-full outline-none bg-white font-[inherit]" value={transport.mode} onChange={v => updateTransport('mode', v)} options={TRANSPORT_MODES} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#536173] font-medium">Vehicle Number *</label>
              <input data-fkey="vehicle" className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] text-[#111827] w-full outline-none focus:border-blue-500 font-[inherit]" placeholder="TN 01 AB 1234" value={transport.vehicleNumber} onChange={e => updateTransport('vehicleNumber', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#536173] font-medium">Transporter Name *</label>
              <input data-fkey="transporter" className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] text-[#111827] w-full outline-none focus:border-blue-500 font-[inherit]" placeholder="Transport company name" value={transport.transporterName} onChange={e => updateTransport('transporterName', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#536173] font-medium">Transporter GSTIN</label>
              <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] text-[#111827] w-full outline-none focus:border-blue-500 font-[inherit]" maxLength={15} placeholder="15-digit GSTIN" value={transport.transporterGstin} onChange={e => updateTransport('transporterGstin', e.target.value.toUpperCase())} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#536173] font-medium">Driver Name</label>
              <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] text-[#111827] w-full outline-none focus:border-blue-500 font-[inherit]" placeholder="Driver's full name" value={transport.driverName} onChange={e => updateTransport('driverName', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#536173] font-medium">Driver Mobile</label>
              <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] text-[#111827] w-full outline-none focus:border-blue-500 font-[inherit]" placeholder="+91 XXXXX XXXXX" value={transport.driverMobile} onChange={e => updateTransport('driverMobile', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#536173] font-medium">LR Number</label>
              <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] text-[#111827] w-full outline-none focus:border-blue-500 font-[inherit]" placeholder="Lorry Receipt No." value={transport.lrNumber} onChange={e => updateTransport('lrNumber', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#536173] font-medium">Dispatch Date</label>
              <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] text-[#111827] w-full outline-none focus:border-blue-500 font-[inherit]" type="date" value={transport.dispatchDate} onChange={e => updateTransport('dispatchDate', e.target.value)} />
            </div>
          </div>
        </div>

        {/* -- Route Information -- */}
        <div className="px-6 py-5 border-b border-[#edf2f7]">
          <h3 className="m-0 text-[15px] font-semibold mb-4">Route Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#536173] font-medium">Dispatch From *</label>
              <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] text-[#111827] w-full outline-none focus:border-blue-500 font-[inherit]" placeholder="City" value={routeInfo.dispatchFrom} onChange={e => updateRoute('dispatchFrom', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#536173] font-medium">From State</label>
              <SelectDropdown buttonClassName="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] text-[#111827] w-full outline-none bg-white font-[inherit]" value={routeInfo.dispatchFromState} onChange={v => updateRoute('dispatchFromState', v)} options={INDIAN_STATES} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#536173] font-medium">Dispatch To *</label>
              <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] text-[#111827] w-full outline-none focus:border-blue-500 font-[inherit]" placeholder="City" value={routeInfo.dispatchTo} onChange={e => updateRoute('dispatchTo', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#536173] font-medium">To State</label>
              <SelectDropdown buttonClassName="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] text-[#111827] w-full outline-none bg-white font-[inherit]" value={routeInfo.dispatchToState} onChange={v => updateRoute('dispatchToState', v)} options={INDIAN_STATES} />
            </div>
          </div>
        </div>

        {/* -- Items & Services -- */}
        <div className="px-6 py-5 border-b border-[#edf2f7]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="m-0 text-[15px] font-semibold">Items &amp; Services</h3>
            <button className="text-[13px] text-blue-600 font-medium border border-[#dbe4ef] rounded-md px-3 py-1.5 bg-white cursor-pointer hover:bg-gray-50 font-[inherit]" type="button" onClick={addItem}>+ Add Item</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ minWidth: 860 }}>
              <thead>
                <tr>
                  {[
                    { w: 32,   label: '#',                align: 'center' },
                    { w: null, label: 'Item Description', align: 'left'   },
                    { w: 90,   label: 'HSN / SAC',        align: 'left'   },
                    { w: 68,   label: 'Qty',              align: 'right'  },
                    { w: 82,   label: 'Unit',             align: 'left'   },
                    { w: 105,  label: 'Rate (?)',         align: 'right'  },
                    { w: 70,   label: 'Disc %',           align: 'right'  },
                    { w: 110,  label: 'Taxable',          align: 'right'  },
                    { w: 78,   label: 'GST %',            align: 'left'   },
                    { w: 100,  label: 'GST Amt',          align: 'right'  },
                    { w: 115,  label: 'Total (?)',        align: 'right'  },
                    { w: 38,   label: '',                 align: 'center' },
                  ].map((col, i) => (
                    <th key={i} className={`text-xs font-semibold uppercase text-[#536173] pb-2 px-2 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`} style={col.w ? { width: col.w } : undefined}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const line = calcLine(item);
                  const matches = getCatalogMatches(catalogQuery[item.id] ?? '');
                  const showCatalog = catalogFor === item.id;
                  return (
                    <tr key={item.id}>
                      <td className="border-t border-[#edf2f7] py-2 px-2 align-top text-center text-[#536173] text-xs pt-3">{idx + 1}</td>
                      <td className="border-t border-[#edf2f7] py-2 px-2 align-top">
                        <div className="relative" tabIndex={-1} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setCatalogFor(null); }}>
                          <Package size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#c4cfe0] pointer-events-none" />
                          <input
                            className="w-full border border-[#dbe4ef] rounded px-2 py-1.5 pl-6 text-[13px] font-[inherit] outline-none focus:border-blue-500 min-w-0"
                            placeholder="Search catalog or enter description…"
                            value={item.description}
                            onFocus={() => { setCatalogFor(item.id); setCatalogQuery(p => ({ ...p, [item.id]: item.description })); }}
                            onChange={e => { updateItem(item.id, 'description', e.target.value); setCatalogQuery(p => ({ ...p, [item.id]: e.target.value })); }}
                          />
                          {showCatalog && matches.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-white border border-[#dde6f2] rounded-lg shadow-lg py-1 max-h-52 overflow-y-auto" style={{ minWidth: 260 }}>
                              <div className="px-3 py-1.5 text-[11px] font-semibold uppercase text-[#94a3b8] tracking-wide border-b border-[#f1f5f9]">Product Catalog</div>
                              {matches.map(p => (
                                <button key={p.id} className="w-full flex items-start justify-between gap-3 px-3 py-2 text-left hover:bg-[#f8fafc] cursor-pointer border-0 bg-transparent font-[inherit]" type="button" onMouseDown={() => selectProduct(item.id, p)}>
                                  <div>
                                    <div className="text-[13px] font-medium text-[#111827]">{p.description}</div>
                                    <div className="text-[11px] text-[#94a3b8]">{p.code} · HSN {p.hsn}</div>
                                  </div>
                                  <span className="text-[12px] font-semibold text-[#374151] whitespace-nowrap">{formatCurrency(p.rate)}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="border-t border-[#edf2f7] py-2 px-2 align-top">
                        <input className="w-full border border-[#dbe4ef] rounded px-2 py-1.5 text-[13px] font-[inherit] outline-none focus:border-blue-500 min-w-0" placeholder="HSN" value={item.hsn} onChange={e => updateItem(item.id, 'hsn', e.target.value)} />
                      </td>
                      <td className="border-t border-[#edf2f7] py-2 px-2 align-top">
                        <input className="w-full border border-[#dbe4ef] rounded px-2 py-1.5 text-[13px] text-right font-[inherit] outline-none focus:border-blue-500 min-w-0" min="0" type="number" value={item.qty} onChange={e => updateItem(item.id, 'qty', e.target.value)} />
                      </td>
                      <td className="border-t border-[#edf2f7] py-2 px-2 align-top">
                        <SelectDropdown buttonClassName="w-full border border-[#dbe4ef] rounded px-2 py-1.5 text-[13px] font-[inherit] outline-none bg-white" value={item.unit} onChange={v => updateItem(item.id, 'unit', v)} options={UNITS} />
                      </td>
                      <td className="border-t border-[#edf2f7] py-2 px-2 align-top">
                        <input className="w-full border border-[#dbe4ef] rounded px-2 py-1.5 text-[13px] text-right font-[inherit] outline-none focus:border-blue-500 min-w-0" min="0" type="number" value={item.rate} onChange={e => updateItem(item.id, 'rate', e.target.value)} />
                      </td>
                      <td className="border-t border-[#edf2f7] py-2 px-2 align-top">
                        <input className="w-full border border-[#dbe4ef] rounded px-2 py-1.5 text-[13px] text-right font-[inherit] outline-none focus:border-blue-500 min-w-0" max="100" min="0" type="number" value={item.discount} onChange={e => updateItem(item.id, 'discount', e.target.value)} />
                      </td>
                      <td className="border-t border-[#edf2f7] py-2 px-2 align-top text-right text-[13px] font-medium text-[#374151] pt-3">{formatCurrency(line.taxable)}</td>
                      <td className="border-t border-[#edf2f7] py-2 px-2 align-top">
                        <SelectDropdown buttonClassName="w-full border border-[#dbe4ef] rounded px-2 py-1.5 text-[13px] font-[inherit] outline-none bg-white" value={item.gstRate} onChange={v => updateItem(item.id, 'gstRate', v)} options={GST_RATES.map((r) => ({ value: r, label: `${r}%` }))} />
                      </td>
                      <td className="border-t border-[#edf2f7] py-2 px-2 align-top text-right text-[13px] font-medium text-[#374151] pt-3">{formatCurrency(line.gstAmt)}</td>
                      <td className="border-t border-[#edf2f7] py-2 px-2 align-top text-right text-[13px] font-semibold text-[#111827] pt-3">{formatCurrency(line.total)}</td>
                      <td className="border-t border-[#edf2f7] py-2 px-2 align-top text-center">
                        <button className="w-7 h-7 text-red-400 bg-transparent border-0 text-lg cursor-pointer rounded hover:bg-red-50 hover:text-red-700 font-[inherit]" title="Remove" type="button" onClick={() => removeItem(item.id)}>×</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button className="mt-3 text-[13px] text-blue-600 font-medium border border-dashed border-[#dbe4ef] rounded-md px-4 py-2 bg-white cursor-pointer hover:bg-gray-50 w-full text-left font-[inherit]" type="button" onClick={addItem}>
            + Add Another Item
          </button>
        </div>

        {/* -- Additional Charges -- */}
        <div className="px-6 py-5 border-b border-[#edf2f7]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="m-0 text-[14px] font-semibold text-[#374151]">Additional Charges</h3>
            <div className="flex items-center gap-2 flex-wrap">
              {CHARGE_PRESETS.map(p => (
                <button key={p.label} type="button" className="text-[12px] text-[#536173] border border-[#dbe4ef] rounded-md px-2.5 py-1 bg-white hover:bg-gray-50 cursor-pointer font-[inherit]" onClick={() => addCharge(p)}>
                  + {p.label}
                </button>
              ))}
              <button type="button" className="flex items-center gap-1 text-[12px] text-blue-600 border border-blue-200 rounded-md px-2.5 py-1 bg-blue-50 hover:bg-blue-100 cursor-pointer font-[inherit]" onClick={() => addCharge(null)}>
                <Plus size={11} /> Custom Charge
              </button>
            </div>
          </div>
          {charges.length === 0 ? (
            <div className="text-[13px] text-[#94a3b8] text-center py-4 border border-dashed border-[#e2e8f0] rounded-md bg-[#fafbfe]">
              No additional charges. Use the buttons above to add freight, packing, or custom charges.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {charges.map(charge => (
                <div key={charge.id} className="grid grid-cols-[1fr_120px_36px] sm:grid-cols-[1fr_180px_100px_36px] gap-3 items-center bg-[#fafbfe] border border-[#edf2f7] rounded-lg px-4 py-2.5">
                  <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] text-[#111827] w-full outline-none focus:border-blue-500 font-[inherit] bg-white" placeholder="Charge description" value={charge.label} onChange={e => updateCharge(charge.id, 'label', e.target.value)} />
                  <input className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] text-[#111827] w-full outline-none focus:border-blue-500 font-[inherit] bg-white text-right" min="0" placeholder="0.00" type="number" value={charge.amount} onChange={e => updateCharge(charge.id, 'amount', e.target.value)} />
                  <div className="hidden sm:block text-right text-[13px] font-semibold text-[#111827]">{formatCurrency(Number(charge.amount) || 0)}</div>
                  <button className="w-7 h-7 flex items-center justify-center text-red-400 bg-transparent border-0 cursor-pointer rounded hover:bg-red-50 hover:text-red-700 font-[inherit]" type="button" onClick={() => removeCharge(charge.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* -- Footer: Notes + Totals -- */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 p-6">
          <div className="flex flex-col gap-2">
            <div className="text-xs font-semibold uppercase text-[#536173] tracking-wide">Notes</div>
            <textarea className="w-full border border-[#dbe4ef] rounded-md px-3 py-2.5 text-[13px] font-[inherit] resize-y outline-none focus:border-blue-500" placeholder="Notes or additional instructions…" rows={4} />
          </div>

          <div className="flex flex-col gap-1 text-[13px]">
            <div className="flex justify-between py-1.5 border-b border-[#f3f4f6]">
              <span className="text-[#536173]">Taxable Amount</span>
              <span>{formatCurrency(totals.taxable)}</span>
            </div>
            {supplyType === 'intrastate' ? (
              <>
                <div className="flex justify-between py-1 border-b border-[#f3f4f6] text-[#536173]">
                  <span>CGST</span><span>{formatCurrency(totals.cgst)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#f3f4f6] text-[#536173]">
                  <span>SGST</span><span>{formatCurrency(totals.sgst)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between py-1 border-b border-[#f3f4f6] text-[#536173]">
                <span>IGST</span><span>{formatCurrency(totals.igst)}</span>
              </div>
            )}
            {totals.additionalCharges > 0 && (
              <div className="flex justify-between py-1.5 border-b border-[#f3f4f6]">
                <span className="text-[#536173]">Additional Charges</span>
                <span>{formatCurrency(totals.additionalCharges)}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-base font-bold pt-2 mt-1 border-t-2 border-[#111827]">
              <span>Grand Total</span>
              <span>{formatCurrency(totals.grandTotal)}</span>
            </div>
          </div>
        </div>

      </div>

      {/* -- F-Key Shortcut Bar -- */}
      <div
        className="fixed bottom-0 left-0 right-0 md:left-60 z-30 select-none hidden md:block"
        style={{ background: '#062844', borderTop: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 -4px 16px rgba(0,0,0,0.25)' }}
      >
        <div className="flex items-stretch" style={{ height: 50 }}>
          {[
            { key: 'F1',  label: 'New EWB',    action: () => window.location.assign('/billing/e-way-bill/new') },
            { key: 'F2',  label: 'Save',        action: () => handleSave() },
            { key: 'F3',  label: 'Generate',    action: () => handleGenerateGSP() },
            { key: 'F5',  label: 'Add Item',    action: () => addItem() },
            { key: 'F6',  label: 'Consignee',   action: () => document.querySelector('[data-fkey="consignee"]')?.focus() },
            { key: 'F7',  label: 'Vehicle',     action: () => { const el = document.querySelector('[data-fkey="vehicle"]'); el?.scrollIntoView({ behavior: 'smooth', block: 'center' }); el?.focus(); } },
            { key: 'F8',  label: 'Transporter', action: () => { const el = document.querySelector('[data-fkey="transporter"]'); el?.scrollIntoView({ behavior: 'smooth', block: 'center' }); el?.focus(); } },
            { key: 'F9',  label: 'Distance',    action: () => { const el = document.querySelector('[data-fkey="distance"]'); el?.scrollIntoView({ behavior: 'smooth', block: 'center' }); el?.focus(); } },
            { key: 'F10', label: 'Home',        action: () => window.location.assign('/dashboard') },
            { key: 'F11', label: 'Settings',    action: () => window.location.assign('/business-settings') },
            { key: 'F12', label: 'Close',       action: () => window.location.assign('/billing/e-way-bill') },
          ].map(({ key, label, action }, idx, arr) => (
            <button
              key={key}
              type="button"
              onClick={action}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 px-0.5 min-w-0 font-[inherit] border-0 bg-transparent cursor-pointer transition-colors"
              style={{ borderRight: idx < arr.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              onMouseDown={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.3)'; }}
              onMouseUp={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
            >
              <span className="rounded-sm text-white" style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', background: '#1d4ed8', paddingInline: 5, lineHeight: '16px' }}>
                {key}
              </span>
              <span style={{ fontSize: 11, color: 'rgba(200,223,242,0.9)', lineHeight: 1.2, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}

  //Ã¢â€â‚¬Ã¢â€â‚¬ JSX Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬





