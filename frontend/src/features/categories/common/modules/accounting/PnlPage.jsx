import { useEffect, useState } from 'react';

import { api } from '../../../../../services/api.js';
import { getPnlStatement } from '../../../../../services/accountingService.js';
import { ExportButtons } from '../../../../../components/forms/ExportButtons.jsx';
import { formatCurrency } from '../../../../../utils/formatCurrency.js';

export function PnlPage() {
  const [dateFrom, setDateFrom] = useState('2026-04-01');
  const [dateTo,   setDateTo]   = useState('2027-03-31');
  const [incomeItems, setIncomeItems] = useState([]);
  const [expenseItems, setExpenseItems] = useState([]);
  const [bizSettings, setBizSettings] = useState({});

  useEffect(() => {
    api.getSettings().then(setBizSettings).catch(() => {});
  }, []);

  useEffect(() => {
    let isMounted = true;

    getPnlStatement()
      .then((data) => {
        if (!isMounted) return;
        setIncomeItems(data.income ?? []);
        setExpenseItems(data.expenses ?? []);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const totalIncome   = incomeItems.reduce((a, r) => a + r.amount, 0);
  const totalExpenses = expenseItems.reduce((a, r) => a + r.amount, 0);
  const netProfit     = totalIncome - totalExpenses;
  const profitPct     = totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(2) : 0;
  const exportRows = [
    ...incomeItems.map((row) => ({ type: 'Income', account: row.account, amount: row.amount })),
    ...expenseItems.map((row) => ({ type: 'Expense', account: row.account, amount: row.amount })),
    { type: 'Summary', account: 'Total Income', amount: totalIncome },
    { type: 'Summary', account: 'Total Expenses', amount: totalExpenses },
    { type: 'Summary', account: 'Net Profit', amount: netProfit },
  ];
  const exportColumns = [
    { label: 'Type', value: (row) => row.type },
    { label: 'Account', value: (row) => row.account },
    { label: 'Amount', value: (row) => formatCurrency(row.amount) },
  ];

  return (
    <div className="p-4 md:p-7">

      {/* ── Header ── */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-1">
        <div>
          <nav className="flex items-center gap-1 text-[13px] text-[#536173] mb-1">
            <a className="text-blue-600 no-underline hover:underline" href="//dashboard">Home</a>
            <span>›</span><span>Accounting</span><span>›</span><span>P&amp;L Statement</span>
          </nav>
          <h1 className="m-0 text-[22px] font-bold">P&amp;L Statement</h1>
          <p className="m-0 text-[13px] text-[#536173] mt-0.5">Profit and Loss statement for the selected period</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 border border-[#dbe4ef] rounded-md px-3 py-2 bg-white text-[13px]">
            <svg fill="none" height="13" stroke="#536173" strokeWidth="2" viewBox="0 0 24 24" width="13"><rect height="18" rx="2" ry="2" width="18" x="3" y="4" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
            <input className="outline-none font-[inherit] text-[13px] border-0 w-28" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <span className="text-[#536173]">–</span>
            <input className="outline-none font-[inherit] text-[13px] border-0 w-28" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <ExportButtons title="P&L Statement" filename="pnl-statement" rows={exportRows} columns={exportColumns} />
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-5">
        {[
          { label: 'Total Income', value: formatCurrency(totalIncome), icon: '💹', bg: '#f0fdf4', color: '#16a34a', sub: 'All income accounts' },
          { label: 'Total Expenses', value: formatCurrency(totalExpenses), icon: '💸', bg: '#fef2f2', color: '#dc2626', sub: 'All expense accounts' },
          { label: 'Net Profit', value: formatCurrency(netProfit), icon: netProfit >= 0 ? '📈' : '📉', bg: netProfit >= 0 ? '#eff6ff' : '#fef2f2', color: netProfit >= 0 ? '#2563eb' : '#dc2626', sub: `${profitPct}% of revenue` },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-[#dfe7f1] rounded-xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-none" style={{ background: s.bg }}>
              {s.icon}
            </div>
            <div>
              <div className="text-xs text-[#536173] mb-0.5">{s.label}</div>
              <div className="text-[20px] font-bold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-[#536173] mt-0.5">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── P&L Table ── */}
      <div className="bg-white border border-[#dfe7f1] rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#edf2f7] flex flex-wrap justify-between items-center gap-2">
          <span className="text-[13px] font-medium text-[#374151]">
            Profit &amp; Loss for <strong>{dateFrom}</strong> to <strong>{dateTo}</strong>
          </span>
          <span className="text-xs text-[#536173]">{bizSettings.businessName || '—'}</span>
        </div>

        <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-100">
          {/* Income Section */}
          <tbody>
            <tr className="bg-[#f0fdf4]">
              <td className="px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-green-800 border-b border-[#dcfce7]" colSpan={2}>
                INCOME
              </td>
            </tr>
            {incomeItems.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-5 py-3.5 border-b border-[#f3f4f6] text-[13px] pl-10 text-[#374151]">{row.label}</td>
                <td className="px-5 py-3.5 border-b border-[#f3f4f6] text-[13px] text-right font-medium">{formatCurrency(row.amount)}</td>
              </tr>
            ))}
            <tr className="bg-[#f0fdf4]">
              <td className="px-5 py-3.5 border-b border-[#dcfce7] text-[13px] font-bold text-green-800">Total Income</td>
              <td className="px-5 py-3.5 border-b border-[#dcfce7] text-[13px] text-right font-bold text-green-700">{formatCurrency(totalIncome)}</td>
            </tr>

            {/* Expenses Section */}
            <tr className="bg-[#fef2f2]">
              <td className="px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-red-800 border-b border-[#fee2e2]" colSpan={2}>
                EXPENSES
              </td>
            </tr>
            {expenseItems.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-5 py-3.5 border-b border-[#f3f4f6] text-[13px] pl-10 text-[#374151]">{row.label}</td>
                <td className="px-5 py-3.5 border-b border-[#f3f4f6] text-[13px] text-right font-medium">{formatCurrency(row.amount)}</td>
              </tr>
            ))}
            <tr className="bg-[#fef2f2]">
              <td className="px-5 py-3.5 border-b border-[#fee2e2] text-[13px] font-bold text-red-800">Total Expenses</td>
              <td className="px-5 py-3.5 border-b border-[#fee2e2] text-[13px] text-right font-bold text-red-700">{formatCurrency(totalExpenses)}</td>
            </tr>

            {/* Net Profit */}
            <tr className="bg-[#062844] text-white">
              <td className="px-5 py-4 text-[14px] font-bold">Net {netProfit >= 0 ? 'Profit' : 'Loss'}</td>
              <td className="px-5 py-4 text-right text-[14px] font-bold">{formatCurrency(Math.abs(netProfit))}</td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
