import { useEffect, useState } from 'react';

import { getBankBook } from '../../../../../services/accountingService.js';
import { ExportButtons } from '../../../../../components/forms/ExportButtons.jsx';
import { formatCurrency } from '../../../../../utils/formatCurrency.js';
import { isWithinDateRange } from '../../../../../utils/dateRange.js';

const TH = 'text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-5 py-3 border-b border-[#edf2f7]';
const TD = 'px-5 py-3.5 border-b border-[#f3f4f6] text-[13px]';

const VCH_BADGE = {
  OB:         'text-blue-700 bg-blue-50',
  Deposit:    'text-green-700 bg-green-50',
  Withdrawal: 'text-red-700 bg-red-50',
  CB:         'text-purple-700 bg-purple-50',
};

const PAGE_SIZE = 5;

function pageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total];
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '...', current - 1, current, current + 1, '...', total];
}

export function BankBookPage() {
  const [dateFrom, setDateFrom] = useState('2026-05-01');
  const [dateTo,   setDateTo]   = useState('2026-05-31');
  const [bank,     setBank]     = useState('');
  const [bankOptions, setBankOptions] = useState([]);
  const [bankDetails, setBankDetails] = useState({
    accountNo: '',
    ifsc: '',
    accountType: '',
  });
  const [bankEntries, setBankEntries] = useState([]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let isMounted = true;

    getBankBook(bank)
      .then((data) => {
        if (!isMounted) return;
        setBankOptions(data.banks ?? []);
        if (!bank && data.bank) setBank(data.bank);
        setBankDetails({
          accountNo: data.accountNo ?? '',
          ifsc: data.ifsc ?? '',
          accountType: data.accountType ?? '',
        });
        setBankEntries(data.entries ?? []);
      })
      .catch(() => {
        if (!isMounted) return;
        setBankOptions([]);
        setBankDetails({ accountNo: '', ifsc: '', accountType: '' });
        setBankEntries([]);
      });

    return () => {
      isMounted = false;
    };
  }, [bank]);

  const filteredEntries = bankEntries.filter((r) => ['OB', 'CB'].includes(r.vchType) || isWithinDateRange(r.date, dateFrom, dateTo));
  const entries = filteredEntries.filter((r) => r.vchType !== 'OB' && r.vchType !== 'CB');
  const totalDeposits    = entries.reduce((a, r) => a + r.deposit, 0);
  const totalWithdrawals = entries.reduce((a, r) => a + r.withdrawal, 0);
  const openingBal       = filteredEntries.find((r) => r.vchType === 'OB')?.balance ?? 0;
  const closingBal       = openingBal + totalDeposits - totalWithdrawals;

  useEffect(() => { setPage(1); }, [dateFrom, dateTo, bank]);

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));
  const paginated = filteredEntries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const exportColumns = [
    { label: 'Date', value: (row) => row.date },
    { label: 'Voucher Type', value: (row) => row.vchType },
    { label: 'Particulars', value: (row) => row.particulars },
    { label: 'Deposit', value: (row) => formatCurrency(row.deposit) },
    { label: 'Withdrawal', value: (row) => formatCurrency(row.withdrawal) },
    { label: 'Balance', value: (row) => formatCurrency(row.balance) },
  ];

  return (
    <div className="p-4 md:p-7">

      {/* ── Header ── */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-1">
        <div>
          <nav className="flex items-center gap-1 text-[13px] text-[#536173] mb-1">
            <a className="text-blue-600 no-underline hover:underline" href="/dashboard">Home</a>
            <span>›</span><span>Accounting</span><span>›</span><span>Bank Book</span>
          </nav>
          <h1 className="m-0 text-[22px] font-bold">Bank Book</h1>
          <p className="m-0 text-[13px] text-[#536173] mt-0.5">Bank transactions for the selected period</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] bg-white font-[inherit] outline-none" value={bank} onChange={(e) => setBank(e.target.value)}>
            {bankOptions.map((bankName) => <option key={bankName}>{bankName}</option>)}
          </select>
          <div className="flex items-center gap-1.5 border border-[#dbe4ef] rounded-md px-3 py-2 bg-white text-[13px]">
            <svg fill="none" height="13" stroke="#536173" strokeWidth="2" viewBox="0 0 24 24" width="13"><rect height="18" rx="2" ry="2" width="18" x="3" y="4" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
            <input className="outline-none font-[inherit] text-[13px] border-0 w-28" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <span className="text-[#536173]">–</span>
            <input className="outline-none font-[inherit] text-[13px] border-0 w-28" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <ExportButtons title="Bank Book" filename="bank-book" rows={filteredEntries} columns={exportColumns} />
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-5">
        {[
          { label: 'Opening Balance', value: formatCurrency(openingBal),       icon: '🏦', bg: '#eff6ff', color: '#2563eb' },
          { label: 'Total Deposits',  value: formatCurrency(totalDeposits),    icon: '📥', bg: '#f0fdf4', color: '#16a34a' },
          { label: 'Total Withdrawals',value: formatCurrency(totalWithdrawals),icon: '📤', bg: '#fef2f2', color: '#dc2626' },
          { label: 'Closing Balance', value: formatCurrency(closingBal),       icon: '💳', bg: '#fffbeb', color: '#d97706' },
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

      {/* ── Bank info banner ── */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 mb-4 flex items-center gap-3">
        <svg fill="none" height="16" stroke="#2563eb" strokeWidth="2" viewBox="0 0 24 24" width="16" className="flex-none">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        <span className="text-[13px] text-blue-800">
          <strong>{bank}</strong> · A/c: {bankDetails.accountNo} · IFSC: {bankDetails.ifsc} · {bankDetails.accountType}
        </span>
      </div>

      {/* ── Table ── */}
      <div className="bg-white border border-[#dfe7f1] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-225">
            <thead>
              <tr>
                <th className={TH}>Date</th>
                <th className={TH}>Particulars</th>
                <th className={TH}>Vch Type</th>
                <th className={TH}>Vch No.</th>
                <th className={`${TH} text-right`}>Deposit (₹)</th>
                <th className={`${TH} text-right`}>Withdrawal (₹)</th>
                <th className={`${TH} text-right`}>Balance (₹)</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((row, i) => {
                const isSpecial = row.vchType === 'OB' || row.vchType === 'CB';
                return (
                  <tr key={i} className={`hover:bg-gray-50 ${isSpecial ? 'bg-[#f8fafc]' : ''}`}>
                    <td className={`${TD} text-[#536173]`}>{row.date}</td>
                    <td className={`${TD} ${isSpecial ? 'font-bold text-[#111827]' : 'font-medium text-[#374151]'}`}>{row.particulars}</td>
                    <td className={TD}>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${VCH_BADGE[row.vchType] ?? 'text-gray-700 bg-gray-100'}`}>
                        {row.vchType}
                      </span>
                    </td>
                    <td className={`${TD} font-mono text-xs text-[#374151]`}>{row.vchNo}</td>
                    <td className={`${TD} text-right`}>
                      {row.deposit > 0 ? <span className="text-green-700 font-medium">{formatCurrency(row.deposit)}</span> : <span className="text-[#cbd5e1]">—</span>}
                    </td>
                    <td className={`${TD} text-right`}>
                      {row.withdrawal > 0 ? <span className="text-red-600 font-medium">{formatCurrency(row.withdrawal)}</span> : <span className="text-[#cbd5e1]">—</span>}
                    </td>
                    <td className={`${TD} text-right font-semibold text-[#111827]`}>{formatCurrency(row.balance)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-[#062844] text-white">
                <td className="px-5 py-4 text-[13px] font-bold" colSpan={4}>Total</td>
                <td className="px-5 py-4 text-right text-[13px] font-bold">{formatCurrency(totalDeposits)}</td>
                <td className="px-5 py-4 text-right text-[13px] font-bold">{formatCurrency(totalWithdrawals)}</td>
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
