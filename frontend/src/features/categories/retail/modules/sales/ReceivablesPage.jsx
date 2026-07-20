import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, TrendingDown, AlertCircle, Clock } from 'lucide-react';
import { api } from '../../../../../services/api.js';
import { RecordPaymentModal } from './shared/RecordPaymentModal.jsx';
import { useListKeyboardNav } from '../../../../../hooks/useListKeyboardNav.js';

function fmt(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const STATUS_FILTERS = ['All', 'Unpaid', 'Partial', 'Overdue', 'Paid'];

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
  return `#/billing/${route}/${row.id}/view`;
}

export function ReceivablesPage() {
  const [rows, setRows]           = useState([]);
  const [summary, setSummary]     = useState({ totalOutstanding: 0, totalOverdue: 0, dueThisWeek: 0 });
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFrom, setDateFrom]   = useState('');
  const [dateTo, setDateTo]       = useState('');
  const [paymentRow, setPaymentRow] = useState(null);
  const searchRef = useRef(null);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const res = await api.listOutstanding({ status: 'All', search: '', from: '', to: '' });
      setRows(res.rows ?? []);
      setSummary(res.summary ?? { totalOutstanding: 0, totalOverdue: 0, dueThisWeek: 0 });
    } catch (err) {
      setError(err.message || 'Unable to load receivables');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== 'All' && r.status !== statusFilter) return false;
      if (q && !r.customer.toLowerCase().includes(q) && !r.number.toLowerCase().includes(q)) return false;
      if (dateFrom && r.date < dateFrom) return false;
      if (dateTo && r.date > dateTo) return false;
      return true;
    });
  }, [rows, search, statusFilter, dateFrom, dateTo]);

  const { highlightedIndex } = useListKeyboardNav({
    rowCount: filtered.length,
    onOpen: (index) => {
      const row = filtered[index];
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
            <a href="#/dashboard" className="text-blue-600 no-underline hover:underline">Home</a>
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
          {/* Date range */}
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] font-[inherit] outline-none focus:border-blue-500 bg-white"
          />
          <span className="text-[#94a3b8] text-[13px]">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] font-[inherit] outline-none focus:border-blue-500 bg-white"
          />
          {(dateFrom || dateTo) && (
            <button type="button" onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-[13px] text-blue-600 bg-transparent border-0 cursor-pointer font-[inherit] hover:underline">Clear</button>
          )}

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] font-[inherit] outline-none focus:border-blue-500 bg-white text-[#374151]"
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>
            ))}
          </select>

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
            <table className="w-full border-collapse" style={{ minWidth: 900 }}>
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
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-16 text-[#536173] text-[13px]">
                      {rows.length === 0 ? 'No invoices found.' : 'No results for the current filters.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((row, rowIndex) => (
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
