import { useEffect, useState } from 'react';

import { api } from '../../../../../services/api.js';
import { getTrialBalance } from '../../../../../services/accountingService.js';
import { formatCurrency } from '../../../../../utils/formatCurrency.js';

const TH = 'text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-5 py-3 border-b border-[#edf2f7]';
const TD = 'px-5 py-3.5 border-b border-[#f3f4f6] text-[13px]';

export function TrialBalancePage() {
  const [asOnDate, setAsOnDate] = useState('2026-05-31');
  const [generated, setGenerated] = useState(true);
  const [trialData, setTrialData] = useState([]);
  const [bizSettings, setBizSettings] = useState({});

  useEffect(() => {
    api.getSettings().then(setBizSettings).catch(() => {});
  }, []);

  useEffect(() => {
    let isMounted = true;

    getTrialBalance()
      .then((data) => {
        if (isMounted) setTrialData(data.accounts ?? []);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const totalDebit  = trialData.reduce((a, r) => a + r.debit, 0);
  const totalCredit = trialData.reduce((a, r) => a + r.credit, 0);
  const diff = Math.abs(totalDebit - totalCredit);

  return (
    <div className="p-4 md:p-7">

      {/* ── Header ── */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-1">
        <div>
          <nav className="flex items-center gap-1 text-[13px] text-[#536173] mb-1">
            <a className="text-blue-600 no-underline hover:underline" href="/dashboard">Home</a>
            <span>›</span><span>Accounting</span><span>›</span><span>Trial Balance</span>
          </nav>
          <h1 className="m-0 text-[22px] font-bold">Trial Balance</h1>
          <p className="m-0 text-[13px] text-[#536173] mt-0.5">View trial balance as on a specific date</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 border border-[#dbe4ef] rounded-md px-3 py-2 bg-white text-[13px]">
            <svg fill="none" height="13" stroke="#536173" strokeWidth="2" viewBox="0 0 24 24" width="13"><rect height="18" rx="2" ry="2" width="18" x="3" y="4" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
            <span className="text-[#536173] text-[12px]">As on:</span>
            <input className="outline-none font-[inherit] text-[13px] border-0 w-32" type="date" value={asOnDate} onChange={(e) => setAsOnDate(e.target.value)} />
          </div>
          <button
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit]"
            type="button"
            onClick={() => setGenerated(true)}
          >
            <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" /></svg>
            Generate
          </button>
          <button className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium text-gray-700 bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit]" type="button">
            <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" />
            </svg>
            Download PDF
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-5">
        {[
          { label: 'Total Debit', value: formatCurrency(totalDebit), icon: '📊', bg: '#fef2f2', color: '#dc2626' },
          { label: 'Total Credit', value: formatCurrency(totalCredit), icon: '📊', bg: '#f0fdf4', color: '#16a34a' },
          { label: 'Difference', value: formatCurrency(diff), sub: diff === 0 ? 'Balanced ✓' : 'Check entries', icon: diff === 0 ? '⚖️' : '⚠️', bg: diff === 0 ? '#f0fdf4' : '#fffbeb', color: diff === 0 ? '#16a34a' : '#d97706' },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-[#dfe7f1] rounded-xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-none" style={{ background: s.bg }}>
              {s.icon}
            </div>
            <div>
              <div className="text-xs text-[#536173] mb-0.5">{s.label}</div>
              <div className="text-[20px] font-bold" style={{ color: s.color }}>{s.value}</div>
              {s.sub && <div className="text-xs mt-0.5" style={{ color: s.color }}>{s.sub}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* ── Table ── */}
      {generated && (
        <div className="bg-white border border-[#dfe7f1] rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#edf2f7] flex flex-wrap justify-between items-center gap-2">
            <span className="text-[13px] font-medium text-[#374151]">Trial Balance as on <strong>{asOnDate}</strong></span>
            <span className="text-xs text-[#536173]">GSTIN: {bizSettings.gstin || '—'} · {bizSettings.businessName || '—'}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-150">
              <thead>
                <tr className="bg-[#f8fafc]">
                  <th className={TH}>Particulars</th>
                  <th className={TH}>Group</th>
                  <th className={`${TH} text-right`}>Debit Amount (₹)</th>
                  <th className={`${TH} text-right`}>Credit Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {trialData.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className={`${TD} font-medium text-[#111827]`}>{row.account}</td>
                    <td className={`${TD} text-[#536173]`}>{row.group}</td>
                    <td className={`${TD} text-right font-mono`}>
                      {row.debit > 0 ? <span className="text-[#dc2626] font-medium">{formatCurrency(row.debit)}</span> : <span className="text-[#cbd5e1]">—</span>}
                    </td>
                    <td className={`${TD} text-right font-mono`}>
                      {row.credit > 0 ? <span className="text-[#16a34a] font-medium">{formatCurrency(row.credit)}</span> : <span className="text-[#cbd5e1]">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#062844] text-white">
                  <td className="px-5 py-4 text-[13px] font-bold" colSpan={2}>Total</td>
                  <td className="px-5 py-4 text-right text-[13px] font-bold font-mono">{formatCurrency(totalDebit)}</td>
                  <td className="px-5 py-4 text-right text-[13px] font-bold font-mono">{formatCurrency(totalCredit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
