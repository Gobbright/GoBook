import { useEffect, useRef, useState } from 'react';
import { Search, TrendingDown, AlertCircle, Clock } from 'lucide-react';
import { api } from '../../../../../services/api.js';
import { DateRangeFilter } from '../../../../../components/forms/DateRangeFilter.jsx';
import { SalesFilterBar } from '../../../../../components/forms/SalesFilterBar.jsx';
import { EMPTY_SALES_FILTERS } from '../../../../../components/forms/salesFilterDefaults.js';
import { RecordPaymentModal } from './shared/RecordPaymentModal.jsx';
import { useListKeyboardNav } from '../../../../../hooks/useListKeyboardNav.js';
import { useDebouncedValue } from '../../../../../hooks/useDebouncedValue.js';

const LIMIT = 20;

function fmt(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const STATUS_CLASSES = {
  Paid:    'bg-green-50 text-green-700',
  Partial: 'bg-blue-50 text-blue-700',
  Unpaid:  'bg-amber-50 text-amber-700',
  Overdue: 'bg-red-50 text-red-700',
};

function SummaryCard({ label, value, icon, accentColor }) {
  return (
    <div className="bg-white border border-[#dfe7f1] rounded-lg p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-[#536173]">{label}</span>
        <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-none" style={{ backgroundColor: accentColor + '1a' }}>
          {icon}
        </span>
      </div>
      <div className="text-[22px] font-bold text-[#111827] leading-none">{fmt(value)}</div>
    </div>
  );
}

function documentViewHref(row) {
  const route = row.documentType === 'bill-of-supply' ? 'bill-of-supply' : 'invoice';
  return `/billing/${route}/${row.id}/view`;
}

export function ReceivablesPage() {
  const [rows, setRows]           = useState([]);
  const [total, setTotal]         = useState(0);
  const [summary, setSummary]     = useState({ totalOutstanding: 0, totalOverdue: 0, dueThisWeek: 0 });
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [search, setSearch]       = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [filters, setFilters]     = useState(EMPTY_SALES_FILTERS);
  const [dateFrom, setDateFrom]   = useState('');
  const [dateTo, setDateTo]       = useState('');
  const [page, setPage]           = useState(1);
  const [paymentRow, setPaymentRow] = useState(null);
  const searchRef = useRef(null);

  function updateFilter(key, value) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const res = await api.listOutstanding({ ...filters, search: debouncedSearch, dateFrom, dateTo, page, limit: LIMIT });
      setRows(res.data ?? []);
      setTotal(res.total ?? 0);
      setSummary(res.summary ?? { totalOutstanding: 0, totalOverdue: 0, dueThisWeek: 0 });
    } catch (err) {
      setError(err.message || 'Unable to load receivables');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, [filters, debouncedSearch, dateFrom, dateTo, page]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setPage(1); }, [filters, debouncedSearch, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const { highlightedIndex } = useListKeyboardNav({
    rowCount: rows.length,
    onOpen: (index) => {
      const row = rows[index];
      if (row && row.balance > 0) setPaymentRow(row);
    },
    searchRef,
  });

  return (
    <div className="p-4 md:p-7">

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <nav className="flex items-center gap-1 text-[13px] text-[#536173] mb-1">
            <a href="/dashboard" className="text-blue-600 no-underline hover:underline">Home</a>
            <span>›</span>
            <span>Sales</span>
            <span>›</span>
            <span className="text-[#111827]">Receivables</span>
          </nav>
          <h1 className="m-0 text-[22px] font-bold text-[#111827]">Receivables</h1>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 mb-6">{error}</div>}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <SummaryCard
          label="Total Outstanding"
          value={summary.totalOutstanding}
          icon={<TrendingDown size={16} color="#ea580c" />}
          accentColor="#ea580c"
        />
        <SummaryCard
          label="Overdue"
          value={summary.totalOverdue}
          icon={<AlertCircle size={16} color="#dc2626" />}
          accentColor="#dc2626"
        />
        <SummaryCard
          label="Due This Week"
          value={summary.dueThisWeek}
          icon={<Clock size={16} color="#d97706" />}
          accentColor="#d97706"
        />
      </div>

      {/* Filters + Table */}
      <div className="bg-white border border-[#dfe7f1] rounded-lg overflow-hidden">

        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-[#edf2f7]">
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
            fields={['gstType', 'paymentMethod', 'paymentStatus', 'customer', 'city', 'state', 'supplyType', 'amountRange', 'itemType', 'hsn', 'productName', 'barcode']}
          />

          <div className="relative ml-auto">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer or invoice…"
              className="pl-8 pr-3 py-2 border border-[#dbe4ef] rounded-md text-[13px] font-[inherit] outline-none focus:border-blue-500 w-60"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-[13px] text-[#94a3b8]">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse sales-list-table">
              <thead>
                <tr className="bg-[#f8fafc]">
                  {[
                    { label: 'Invoice No.', align: 'left' },
                    { label: 'Customer', align: 'left' },
                    { label: 'Invoice Date', align: 'left' },
                    { label: 'Due Date', align: 'left' },
                    { label: 'Total', align: 'right' },
                    { label: 'Received', align: 'right' },
                    { label: 'Balance Due', align: 'right' },
                    { label: 'Status', align: 'left' },
                    { label: '', align: 'right' },
                  ].map((col, i) => (
                    <th key={i} className={`text-xs font-semibold uppercase tracking-wide text-[#536173] px-4 py-3 ${col.align === 'right' ? 'text-right' : 'text-left'}`}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-16 text-[#536173] text-[13px]">
                      {total === 0 ? 'No invoices found.' : 'No results for the current filters.'}
                    </td>
                  </tr>
                ) : (
                  rows.map((row, rowIndex) => (
                    <tr key={row.id} className={`border-t border-[#edf2f7] hover:bg-[#fafbfe] transition-colors ${highlightedIndex === rowIndex ? 'bg-[#eef4fd]' : ''}`}>
                      <td className="px-4 py-3.5">
                        <a href={documentViewHref(row)} className="text-[13px] font-semibold text-blue-600 no-underline hover:underline">
                          {row.number}
                        </a>
                        {row.documentType === 'bill-of-supply'
                          ? <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-500">No GST</span>
                          : <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-500">GST</span>
                        }
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-[13px] font-medium text-[#111827]">{row.customer}</div>
                        {row.customerPhone && <div className="text-xs text-[#94a3b8] mt-0.5">{row.customerPhone}</div>}
                      </td>
                      <td className="px-4 py-3.5 text-[13px] text-[#374151] whitespace-nowrap">{fmtDate(row.date)}</td>
                      <td className="px-4 py-3.5 text-[13px] whitespace-nowrap">
                        <span className={row.isOverdue ? 'text-red-600 font-medium' : 'text-[#374151]'}>
                          {fmtDate(row.dueDate)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right text-[13px] text-[#374151]">{fmt(row.invoiceTotal)}</td>
                      <td className="px-4 py-3.5 text-right text-[13px] text-green-700">{fmt(row.totalPaid)}</td>
                      <td className="px-4 py-3.5 text-right">
                        <span className={`text-[13px] font-bold ${row.balance > 0 ? 'text-[#b45309]' : 'text-green-700'}`}>
                          {fmt(row.balance)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${STATUS_CLASSES[row.status] ?? 'bg-gray-50 text-gray-600'}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {row.balance > 0 && (
                          <button
                            type="button"
                            onClick={() => setPaymentRow(row)}
                            className="text-[12px] font-semibold px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 border-0 cursor-pointer font-[inherit]"
                          >
                            Record Payment
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer */}
        <div className="px-4 py-3 border-t border-[#edf2f7] flex flex-wrap items-center justify-between gap-2">
          <span className="text-[13px] text-[#536173]">
            Showing <span className="font-medium text-[#374151]">{rows.length === 0 ? 0 : (page - 1) * LIMIT + 1}-{Math.min(page * LIMIT, total)}</span> of{' '}
            <span className="font-medium text-[#374151]">{total}</span> invoices
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 border border-[#dbe4ef] rounded text-[13px] text-[#374151] bg-white hover:bg-gray-50 cursor-pointer font-[inherit] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
            >
              ← Prev
            </button>
            <span className="px-2 text-[13px] text-[#536173]">Page {page} / {totalPages}</span>
            <button
              type="button"
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 border border-[#dbe4ef] rounded text-[13px] text-[#374151] bg-white hover:bg-gray-50 cursor-pointer font-[inherit] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {paymentRow && (
        <RecordPaymentModal
          invoice={{
            id: paymentRow.id,
            number: paymentRow.number,
            customer: { name: paymentRow.customer },
            balance: paymentRow.balance,
            invoiceTotal: paymentRow.invoiceTotal,
          }}
          onClose={() => setPaymentRow(null)}
          onSaved={() => { setPaymentRow(null); loadData(); }}
        />
      )}
    </div>
  );
}
