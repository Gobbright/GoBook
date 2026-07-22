import { useEffect, useState } from 'react';

import { gstService } from '../../../../../services/gstService.js';
import { formatCurrency } from '../../../../../utils/formatCurrency.js';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
function generatePeriods(count = 6) {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
  });
}
const PERIODS = generatePeriods(6);

const STATUS_CONFIG = {
  matched:      { label: 'Matched',        cls: 'text-green-700 bg-green-50' },
  mismatch:     { label: 'Mismatch',       cls: 'text-red-700 bg-red-50' },
  not_in_2b:    { label: 'Not in GSTR-2B', cls: 'text-amber-700 bg-amber-50' },
  not_in_books: { label: 'Not in Books',   cls: 'text-purple-700 bg-purple-50' },
};

const TH = 'text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-4 py-3 border-b border-[#edf2f7]';
const TD = 'px-4 py-3.5 border-b border-[#f3f4f6] text-[13px]';

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.matched;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

export function GstReconciliation() {
  const [period, setPeriod]           = useState(PERIODS[0]);
  const [activeTab, setActiveTab]     = useState('2b');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQ, setSearchQ]         = useState('');

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast,   setToast]   = useState(null);

  function showToast(msg, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    setLoading(true);
    gstService.getReconciliation(period, activeTab)
      .then((data) => setEntries(data?.entries ?? []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [period, activeTab]);

  async function handleResolution(entryId, resolution) {
    try {
      // Optimistic update
      setEntries((prev) => prev.map((e) => (e._id === entryId ? { ...e, resolution } : e)));

      await gstService.updateEntry(entryId, { period, type: activeTab, resolution });
      showToast(resolution === 'accepted' ? 'Entry accepted' : 'Entry disputed');
    } catch {
      // Revert on failure
      setEntries((prev) => prev.map((e) => (e._id === entryId ? { ...e, resolution: 'none' } : e)));
      showToast('Failed to update entry', false);
    }
  }

  const filtered = entries.filter((r) => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (searchQ && !r.supplier.toLowerCase().includes(searchQ.toLowerCase()) && !r.gstin.includes(searchQ)) return false;
    return true;
  });

  const stats = {
    matched:      entries.filter((r) => r.status === 'matched').length,
    mismatch:     entries.filter((r) => r.status === 'mismatch').length,
    not_in_2b:    entries.filter((r) => r.status === 'not_in_2b').length,
    not_in_books: entries.filter((r) => r.status === 'not_in_books').length,
    itcAtRisk:    entries.filter((r) => r.status !== 'matched').reduce((a, r) => a + Math.abs(r.diff), 0),
    totalItcBooks: entries.reduce((a, r) => a + r.itcBooks, 0),
    totalItc2b:    entries.reduce((a, r) => a + r.itcGstr2b, 0),
  };

  return (
    <div className="p-4 md:p-7">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${toast.ok ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
          {toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-6">
        <div className="flex flex-col gap-1">
          <nav className="flex items-center gap-1 text-[13px] text-[#536173]">
            <a className="text-blue-600 no-underline hover:underline" href="//dashboard">Home</a>
            <span>›</span>
            <a className="text-blue-600 no-underline hover:underline" href="/gst-dashboard">GST</a>
            <span>›</span>
            <span>Reconciliation</span>
          </nav>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="m-0 text-[22px] font-bold">GST Reconciliation</h1>
            {loading && <span className="text-xs text-[#536173]">Loading…</span>}
          </div>
          <div className="text-[13px] text-[#536173] mt-0.5">Match purchase records with GSTR-2A / GSTR-2B to validate ITC claims</div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] bg-white font-[inherit] outline-none" value={period} onChange={(e) => setPeriod(e.target.value)}>
            {PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <button
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium text-gray-700 bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit]"
            type="button"
            onClick={() => {
              setLoading(true);
              gstService.getReconciliation(period, activeTab)
                .then((data) => setEntries(data?.entries ?? []))
                .catch(() => {})
                .finally(() => setLoading(false));
            }}
          >
            <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14">
              <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
            Refresh
          </button>
          <button className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium text-white bg-blue-600 border border-blue-600 rounded-md cursor-pointer hover:bg-blue-700 font-[inherit]" type="button">
            <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" />
            </svg>
            Export Report
          </button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-5">
        {[
          { label: 'Total Records',    value: String(entries.length),          sub: 'All suppliers',   color: '#2563eb', onClick: () => setFilterStatus('all') },
          { label: 'Matched',          value: String(stats.matched),           sub: `${entries.length ? Math.round(stats.matched / entries.length * 100) : 0}% of records`, color: '#16a34a', onClick: () => setFilterStatus('matched') },
          { label: 'Mismatched',       value: String(stats.mismatch),          sub: 'Value differs',   color: '#dc2626', onClick: () => setFilterStatus('mismatch') },
          { label: 'Not in GSTR-2B',  value: String(stats.not_in_2b),         sub: 'ITC at risk',     color: '#d97706', onClick: () => setFilterStatus('not_in_2b') },
          { label: 'ITC Difference',   value: formatCurrency(stats.itcAtRisk), sub: 'Total variance',  color: '#7c3aed', onClick: () => setFilterStatus('all') },
        ].map((s) => (
          <button
            key={s.label}
            className="bg-white border border-[#dfe7f1] rounded-lg p-4 text-left cursor-pointer hover:border-blue-300 transition-colors font-[inherit]"
            type="button"
            onClick={s.onClick}
          >
            <div className="text-xs text-[#536173] mb-1.5">{s.label}</div>
            <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-[#536173] mt-0.5">{s.sub}</div>
          </button>
        ))}
      </div>

      {/* ── Main Table ── */}
      <div className="bg-white border border-[#dfe7f1] rounded-lg">

        {/* Tabs + Filters */}
        <div className="flex flex-wrap items-center justify-between px-5 border-b border-[#edf2f7]">
          <div className="flex flex-wrap">
            {[
              { id: '2b', label: 'GSTR-2B Reconciliation' },
              { id: '2a', label: 'GSTR-2A Reconciliation' },
            ].map((tab) => (
              <button
                key={tab.id}
                className={`px-4 py-3.5 text-[13px] font-medium border-b-2 cursor-pointer bg-transparent border-0 whitespace-nowrap font-[inherit] transition-colors ${activeTab === tab.id ? 'text-blue-600 border-blue-600' : 'text-[#536173] border-transparent hover:text-[#111827]'}`}
                type="button"
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 py-2 flex-wrap">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#536173]" fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13">
                <circle cx="11" cy="11" r="8" /><line x1="21" x2="16.65" y1="21" y2="16.65" />
              </svg>
              <input
                className="border border-[#dbe4ef] rounded-md pl-8 pr-3 py-1.5 text-[13px] w-56 outline-none focus:border-blue-500 font-[inherit]"
                placeholder="Search supplier / GSTIN"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
              />
            </div>
            <select
              className="border border-[#dbe4ef] rounded-md px-3 py-1.5 text-[13px] bg-white font-[inherit] outline-none"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="matched">Matched</option>
              <option value="mismatch">Mismatch</option>
              <option value="not_in_2b">Not in GSTR-2B</option>
              <option value="not_in_books">Not in Books</option>
            </select>
          </div>
        </div>

        {/* Totals Bar */}
        <div className="px-5 py-3 bg-[#f8fafc] border-b border-[#edf2f7] grid grid-cols-1 sm:grid-cols-3 gap-6 text-[13px]">
          <div className="flex items-center gap-2">
            <span className="text-[#536173]">ITC as per Books:</span>
            <span className="font-bold">{formatCurrency(stats.totalItcBooks)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#536173]">ITC as per GSTR-2B:</span>
            <span className="font-bold">{formatCurrency(stats.totalItc2b)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#536173]">Net Difference:</span>
            <span className={`font-bold ${stats.totalItcBooks - stats.totalItc2b !== 0 ? 'text-red-600' : 'text-green-600'}`}>
              {stats.totalItcBooks - stats.totalItc2b > 0 ? '+' : ''}{formatCurrency(stats.totalItcBooks - stats.totalItc2b)}
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-262">
            <thead>
              <tr>
                <th className={TH}>Supplier Name</th>
                <th className={TH}>GSTIN</th>
                <th className={TH}>Invoice No.</th>
                <th className={TH}>Date</th>
                <th className={`${TH} text-right`}>Invoice Value</th>
                <th className={`${TH} text-right`}>ITC (Books)</th>
                <th className={`${TH} text-right`}>ITC (GSTR-2B)</th>
                <th className={`${TH} text-right`}>Difference</th>
                <th className={TH}>Status</th>
                <th className={TH}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td className="text-center py-12 text-[#536173] text-[13px]" colSpan={10}>
                    No records match the current filter.
                  </td>
                </tr>
              ) : (
                filtered.map((row, i) => (
                  <tr key={row._id ?? i} className={`hover:bg-gray-50 ${row.status !== 'matched' ? 'bg-red-50/30' : ''}`}>
                    <td className={`${TD} font-medium text-[#111827]`}>{row.supplier}</td>
                    <td className={`${TD} font-mono text-xs text-[#374151]`}>{row.gstin}</td>
                    <td className={TD}>{row.invoiceNo}</td>
                    <td className={`${TD} text-[#536173]`}>{row.date}</td>
                    <td className={`${TD} text-right`}>{formatCurrency(row.invoiceValue)}</td>
                    <td className={`${TD} text-right font-medium`}>{formatCurrency(row.itcBooks)}</td>
                    <td className={`${TD} text-right font-medium`}>{formatCurrency(row.itcGstr2b)}</td>
                    <td className={`${TD} text-right font-semibold ${row.diff < 0 ? 'text-red-600' : row.diff > 0 ? 'text-purple-600' : 'text-green-600'}`}>
                      {row.diff === 0 ? '—' : `${row.diff > 0 ? '+' : ''}${formatCurrency(row.diff)}`}
                    </td>
                    <td className={TD}><StatusBadge status={row.status} /></td>
                    <td className={TD}>
                      {row.status === 'matched' ? (
                        <span className="text-xs text-[#536173]">No action</span>
                      ) : row.resolution === 'accepted' ? (
                        <span className="text-xs text-green-700 font-medium">Accepted</span>
                      ) : row.resolution === 'disputed' ? (
                        <span className="text-xs text-amber-700 font-medium">Disputed</span>
                      ) : (
                        <div className="flex gap-1.5">
                          <button
                            className="text-[12px] text-blue-600 font-medium px-2 py-1 border border-blue-200 rounded hover:bg-blue-50 cursor-pointer bg-transparent font-[inherit]"
                            type="button"
                            onClick={() => handleResolution(row._id, 'accepted')}
                          >Accept</button>
                          <button
                            className="text-[12px] text-[#536173] px-2 py-1 border border-[#dbe4ef] rounded hover:bg-gray-50 cursor-pointer bg-transparent font-[inherit]"
                            type="button"
                            onClick={() => handleResolution(row._id, 'disputed')}
                          >Dispute</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-[#edf2f7] text-xs text-[#536173]">
          GSTR-2B is auto-drafted from supplier GSTR-1 filings. ITC on invoices not in GSTR-2B cannot be claimed as per Rule 36(4).
        </div>
      </div>
    </div>
  );
}
