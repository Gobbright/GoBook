import { useEffect, useState } from 'react';

import { getCashBook } from '../../../../../services/accountingService.js';
import { ExportButtons } from '../../../../../components/forms/ExportButtons.jsx';
import { formatCurrency } from '../../../../../utils/formatCurrency.js';
import { isWithinDateRange } from '../../../../../utils/dateRange.js';

const TH = 'text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-5 py-3 border-b border-[#edf2f7]';
const TD = 'px-5 py-3.5 border-b border-[#f3f4f6] text-[13px]';

const VCH_BADGE = {
  OB:      'text-blue-700 bg-blue-50',
  Receipt: 'text-green-700 bg-green-50',
  Payment: 'text-red-700 bg-red-50',
};

const PAGE_SIZE = 5;

function pageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total];
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '...', current - 1, current, current + 1, '...', total];
}

export function CashBookPage() {
  const [dateFrom, setDateFrom] = useState('2026-05-01');
  const [dateTo,   setDateTo]   = useState('2026-05-31');
  const [cashEntries, setCashEntries] = useState([]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let isMounted = true;

    getCashBook()
      .then((data) => {
        if (isMounted) setCashEntries(data.entries ?? []);
      })
      .catch(() => {
        if (isMounted) setCashEntries([]);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredEntries = cashEntries.filter((r) => r.vchType === 'OB' || isWithinDateRange(r.date, dateFrom, dateTo));
  const totalReceipts = filteredEntries.reduce((a, r) => a + r.receipt, 0);
  const totalPayments = filteredEntries.reduce((a, r) => a + r.payment, 0);
  const openingBal    = filteredEntries.find((r) => r.vchType === 'OB')?.balance ?? 0;
  const closingBal    = openingBal + totalReceipts - totalPayments;

  useEffect(() => { setPage(1); }, [dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));
  const paginated = filteredEntries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const exportColumns = [
    { label: 'Date', value: (row) => row.date },
    { label: 'Voucher Type', value: (row) => row.vchType },
    { label: 'Particulars', value: (row) => row.particulars },
    { label: 'Receipt', value: (row) => formatCurrency(row.receipt) },
    { label: 'Payment', value: (row) => formatCurrency(row.payment) },
    { label: 'Balance', value: (row) => formatCurrency(row.balance) },
  ];

  return (
    <div className="p-4 md:p-7">

      {/* ── Header ── */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-1">
        <div>
          <nav className="flex items-center gap-1 text-[13px] text-[#536173] mb-1">
            <a className="text-blue-600 no-underline hover:underline" href="#/dashboard">Home</a>
            <span>›</span><span>Accounting</span><span>›</span><span>Cash Book</span>
          </nav>
          <h1 className="m-0 text-[22px] font-bold">Cash Book</h1>
          <p className="m-0 text-[13px] text-[#536173] mt-0.5">Cash transactions for the selected period</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 border border-[#dbe4ef] rounded-md px-3 py-2 bg-white text-[13px]">
            <svg fill="none" height="13" stroke="#536173" strokeWidth="2" viewBox="0 0 24 24" width="13"><rect height="18" rx="2" ry="2" width="18" x="3" y="4" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
            <input className="outline-none font-[inherit] text-[13px] border-0 w-28" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <span className="text-[#536173]">–</span>
            <input className="outline-none font-[inherit] text-[13px] border-0 w-28" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <ExportButtons title="Cash Book" filename="cash-book" rows={filteredEntries} columns={exportColumns} />
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-5">
        {[
          { label: 'Opening Balance', value: formatCurrency(openingBal), icon: '🏦', bg: '#eff6ff', color: '#2563eb' },
          { label: 'Total Receipts',  value: formatCurrency(totalReceipts), icon: '📥', bg: '#f0fdf4', color: '#16a34a' },
          { label: 'Total Payments',  value: formatCurrency(totalPayments), icon: '📤', bg: '#fef2f2', color: '#dc2626' },
          { label: 'Closing Balance', value: formatCurrency(closingBal), icon: '💰', bg: '#fffbeb', color: '#d97706' },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-[#dfe7f1] rounded-xl p-4 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-none" style={{ background: s.bg }}>
              {s.icon}
            </div>
            <div>
              <div className="text-xs text-[#536173] mb-0.5">{s.label}</div>
              <div className="text-[17px] font-bold leading-tight" style={{ color: s.color }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Table ── */}
      <div className="bg-white border border-[#dfe7f1] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[850px]">
            <thead>
              <tr>
                <th className={TH}>Date</th>
                <th className={TH}>Particulars</th>
                <th className={TH}>Vch Type</th>
                <th className={TH}>Vch No.</th>
                <th className={`${TH} text-right`}>Receipts (₹)</th>
                <th className={`${TH} text-right`}>Payments (₹)</th>
                <th className={`${TH} text-right`}>Balance (₹)</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((row, i) => (
                <tr key={i} className={`hover:bg-gray-50 ${row.vchType === 'OB' ? 'bg-[#f8fafc]' : ''}`}>
                  <td className={`${TD} text-[#536173]`}>{row.date}</td>
                  <td className={`${TD} font-medium text-[#111827]`}>{row.particulars}</td>
                  <td className={TD}>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${VCH_BADGE[row.vchType] ?? 'text-gray-700 bg-gray-100'}`}>
                      {row.vchType}
                    </span>
                  </td>
                  <td className={`${TD} font-mono text-xs text-[#374151]`}>{row.vchNo}</td>
                  <td className={`${TD} text-right`}>
                    {row.receipt > 0 ? <span className="text-green-700 font-medium">{formatCurrency(row.receipt)}</span> : <span className="text-[#cbd5e1]">—</span>}
                  </td>
                  <td className={`${TD} text-right`}>
                    {row.payment > 0 ? <span className="text-red-600 font-medium">{formatCurrency(row.payment)}</span> : <span className="text-[#cbd5e1]">—</span>}
                  </td>
                  <td className={`${TD} text-right font-semibold text-[#111827]`}>{formatCurrency(row.balance)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#062844] text-white">
                <td className="px-5 py-4 text-[13px] font-bold" colSpan={4}>Closing Balance</td>
                <td className="px-5 py-4 text-right text-[13px] font-bold">{formatCurrency(totalReceipts)}</td>
                <td className="px-5 py-4 text-right text-[13px] font-bold">{formatCurrency(totalPayments)}</td>
                <td className="px-5 py-4 text-right text-[13px] font-bold">{formatCurrency(closingBal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-[#edf2f7] flex items-center justify-between text-[13px] text-[#536173]">
          <span>Showing {paginated.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredEntries.length)} of {filteredEntries.length}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 text-[12px] border border-[#dbe4ef] rounded hover:bg-gray-50 disabled:opacity-40 bg-white font-[inherit] cursor-pointer">←</button>
            {pageNumbers(page, totalPages).map((p, i) => p === '...' ? (
              <span key={`ellipsis-${i}`} className="px-2 py-1 text-[12px] text-[#536173]">…</span>
            ) : (
              <button key={p} onClick={() => setPage(p)} className={`px-2 py-1 text-[12px] border rounded font-[inherit] cursor-pointer ${p === page ? 'bg-blue-600 text-white border-blue-600' : 'border-[#dbe4ef] hover:bg-gray-50 bg-white'}`}>{p}</button>
            ))}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2 py-1 text-[12px] border border-[#dbe4ef] rounded hover:bg-gray-50 disabled:opacity-40 bg-white font-[inherit] cursor-pointer">→</button>
          </div>
        </div>
      </div>
    </div>
  );
}
