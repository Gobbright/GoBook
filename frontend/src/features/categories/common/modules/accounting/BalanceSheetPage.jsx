import { useEffect, useState } from 'react';

import { getBalanceSheet } from '../../../../../services/accountingService.js';
import { formatCurrency } from '../../../../../utils/formatCurrency.js';

export function BalanceSheetPage() {
  const [asOnDate, setAsOnDate] = useState('2027-03-31');
  const [liabilities, setLiabilities] = useState([]);
  const [assets, setAssets] = useState([]);

  useEffect(() => {
    let isMounted = true;

    getBalanceSheet()
      .then((data) => {
        if (!isMounted) return;
        setLiabilities(data.liabilities ?? []);
        setAssets(data.assets ?? []);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const totalLiabilities = liabilities.reduce((a, r) => a + r.amount, 0);
  const totalAssets      = assets.reduce((a, r) => a + r.amount, 0);
  const isBalanced       = totalLiabilities === totalAssets;

  return (
    <div className="p-4 md:p-7">

      {/* ── Header ── */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-1">
        <div>
          <nav className="flex items-center gap-1 text-[13px] text-[#536173] mb-1">
            <a className="text-blue-600 no-underline hover:underline" href="//dashboard">Home</a>
            <span>›</span><span>Accounting</span><span>›</span><span>Balance Sheet</span>
          </nav>
          <h1 className="m-0 text-[22px] font-bold">Balance Sheet</h1>
          <p className="m-0 text-[13px] text-[#536173] mt-0.5">View balance sheet as on a specific date</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 border border-[#dbe4ef] rounded-md px-3 py-2 bg-white text-[13px]">
            <svg fill="none" height="13" stroke="#536173" strokeWidth="2" viewBox="0 0 24 24" width="13"><rect height="18" rx="2" ry="2" width="18" x="3" y="4" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
            <span className="text-[#536173] text-[12px]">As on Date:</span>
            <input className="outline-none font-[inherit] text-[13px] border-0 w-32" type="date" value={asOnDate} onChange={(e) => setAsOnDate(e.target.value)} />
          </div>
          <button className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit]" type="button">
            <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" />
            </svg>
            Download PDF
          </button>
        </div>
      </div>

      {/* ── Balance check ── */}
      <div className={`my-5 border rounded-xl px-5 py-3.5 flex items-center gap-3 ${isBalanced ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
        <svg fill="none" height="16" stroke={isBalanced ? '#16a34a' : '#dc2626'} strokeWidth="2" viewBox="0 0 24 24" width="16" className="flex-none">
          {isBalanced ? <polyline points="20 6 9 17 4 12" /> : <><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /><circle cx="12" cy="12" r="10" /></>}
        </svg>
        <span className={`text-[13px] font-medium ${isBalanced ? 'text-green-800' : 'text-red-800'}`}>
          {isBalanced ? `Balance Sheet is balanced as on ${asOnDate} — Total: ${formatCurrency(totalAssets)}` : `Balance Sheet does not balance — Difference: ${formatCurrency(Math.abs(totalAssets - totalLiabilities))}`}
        </span>
      </div>

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Liabilities */}
        <div className="bg-white border border-[#dfe7f1] rounded-xl overflow-hidden">
          <div className="bg-[#fef2f2] px-5 py-3 border-b border-[#fee2e2]">
            <h2 className="m-0 text-[14px] font-bold text-red-800">Liabilities</h2>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-5 py-3 border-b border-[#edf2f7]">Particulars</th>
                <th className="text-right text-xs font-semibold uppercase tracking-wide text-[#536173] px-5 py-3 border-b border-[#edf2f7]">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {liabilities.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-5 py-3.5 border-b border-[#f3f4f6] text-[13px] text-[#374151]">{row.label}</td>
                  <td className="px-5 py-3.5 border-b border-[#f3f4f6] text-[13px] text-right font-medium">{formatCurrency(row.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#fef2f2]">
                <td className="px-5 py-4 text-[13px] font-bold text-red-800">Total Liabilities</td>
                <td className="px-5 py-4 text-right text-[13px] font-bold text-red-700">{formatCurrency(totalLiabilities)}</td>
              </tr>
            </tfoot>
          </table>
          </div>
        </div>

        {/* Assets */}
        <div className="bg-white border border-[#dfe7f1] rounded-xl overflow-hidden">
          <div className="bg-[#f0fdf4] px-5 py-3 border-b border-[#dcfce7]">
            <h2 className="m-0 text-[14px] font-bold text-green-800">Assets</h2>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-5 py-3 border-b border-[#edf2f7]">Particulars</th>
                <th className="text-right text-xs font-semibold uppercase tracking-wide text-[#536173] px-5 py-3 border-b border-[#edf2f7]">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-5 py-3.5 border-b border-[#f3f4f6] text-[13px] text-[#374151]">{row.label}</td>
                  <td className="px-5 py-3.5 border-b border-[#f3f4f6] text-[13px] text-right font-medium">{formatCurrency(row.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#f0fdf4]">
                <td className="px-5 py-4 text-[13px] font-bold text-green-800">Total Assets</td>
                <td className="px-5 py-4 text-right text-[13px] font-bold text-green-700">{formatCurrency(totalAssets)}</td>
              </tr>
            </tfoot>
          </table>
          </div>
        </div>

      </div>
    </div>
  );
}
