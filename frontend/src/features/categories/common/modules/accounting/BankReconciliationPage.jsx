import { useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw } from 'lucide-react';

import { getBankReconciliation, updateBankReconciliation } from '../../../../../services/accountingService.js';
import { ExportButtons } from '../../../../../components/forms/ExportButtons.jsx';
import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';
import { formatCurrency } from '../../../../../utils/formatCurrency.js';

const TH = 'text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-4 py-3 border-b border-[#edf2f7]';
const TD = 'px-4 py-3 border-b border-[#f3f4f6] text-[13px]';
const FIELD = 'border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] bg-white font-[inherit] outline-none focus:border-blue-500';

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

export function BankReconciliationPage() {
  const [bank, setBank] = useState('');
  const [banks, setBanks] = useState([]);
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [status, setStatus] = useState('All');
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState({});
  const [bankDetails, setBankDetails] = useState({});
  const [loading, setLoading] = useState(false);

  async function loadData(nextBank = bank) {
    setLoading(true);
    try {
      const data = await getBankReconciliation({ bank: nextBank, from, to, status });
      setBanks(data.banks ?? []);
      if (!nextBank && data.bank) setBank(data.bank);
      setEntries(data.entries ?? []);
      setSummary(data.summary ?? {});
      setBankDetails({
        accountNo: data.accountNo ?? '',
        ifsc: data.ifsc ?? '',
        accountType: data.accountType ?? '',
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData().catch(() => {});
  }, [bank, from, to, status]);

  async function toggleCleared(row, checked) {
    await updateBankReconciliation(row._id, {
      reconciled: checked,
      bankDate: checked ? (row.bankDate || row.date) : '',
      bankReference: row.bankReference || row.vchNo,
      reconciliationNotes: row.reconciliationNotes || '',
    });
    await loadData();
  }

  async function updateField(row, field, value) {
    await updateBankReconciliation(row._id, {
      reconciled: row.reconciled,
      bankDate: field === 'bankDate' ? value : row.bankDate,
      bankReference: field === 'bankReference' ? value : row.bankReference,
      reconciliationNotes: field === 'reconciliationNotes' ? value : row.reconciliationNotes,
    });
    await loadData();
  }

  const activeEntries = entries.filter((entry) => !['OB', 'CB'].includes(entry.vchType));
  const exportColumns = [
    { label: 'Book Date', value: (row) => row.date },
    { label: 'Bank Date', value: (row) => row.bankDate },
    { label: 'Particulars', value: (row) => row.particulars },
    { label: 'Voucher No.', value: (row) => row.vchNo },
    { label: 'Deposit', value: (row) => formatCurrency(row.deposit) },
    { label: 'Withdrawal', value: (row) => formatCurrency(row.withdrawal) },
    { label: 'Status', value: (row) => row.reconciled ? 'Cleared' : 'Uncleared' },
  ];

  return (
    <div className="p-4 md:p-7">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-1">
        <div>
          <nav className="flex items-center gap-1 text-[13px] text-[#536173] mb-1">
            <a className="text-blue-600 no-underline hover:underline" href="/dashboard">Home</a>
            <span>/</span><span>Accounting</span><span>/</span><span>Bank Reconciliation</span>
          </nav>
          <h1 className="m-0 text-[22px] font-bold">Bank Reconciliation</h1>
          <p className="m-0 text-[13px] text-[#536173] mt-0.5">Match bank book entries with cleared bank statement transactions</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportButtons title="Bank Reconciliation" filename="bank-reconciliation" rows={activeEntries} columns={exportColumns} />
          <button type="button" onClick={() => loadData()} disabled={loading} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit] disabled:opacity-60">
            <RefreshCw size={14} />
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="bg-white border border-[#dfe7f1] rounded-xl p-4 my-5">
        <div className="flex flex-wrap items-center gap-3">
          <SelectDropdown buttonClassName={FIELD} value={bank} onChange={setBank} options={banks} />
          <input className={FIELD} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input className={FIELD} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <SelectDropdown buttonClassName={FIELD} value={status} onChange={setStatus} options={['All', 'Cleared', 'Uncleared']} />
          <span className="text-[13px] text-[#536173]">
            {bankDetails.accountNo || '-'} · {bankDetails.ifsc || '-'} · {bankDetails.accountType || '-'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Book Balance', value: formatCurrency(summary.bookBalance || 0), color: '#2563eb' },
          { label: 'Cleared Balance', value: formatCurrency(summary.clearedBalance || 0), color: '#16a34a' },
          { label: 'Difference', value: formatCurrency(summary.difference || 0), color: Number(summary.difference || 0) === 0 ? '#16a34a' : '#d97706' },
          { label: 'Uncleared Entries', value: String(summary.unclearedEntries || 0), color: '#dc2626' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-[#dfe7f1] rounded-xl p-4">
            <div className="text-xs text-[#536173] mb-1">{stat.label}</div>
            <div className="text-[17px] font-bold" style={{ color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-[#dfe7f1] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-250">
            <thead>
              <tr>
                <th className={TH}>Clear</th>
                <th className={TH}>Book Date</th>
                <th className={TH}>Bank Date</th>
                <th className={TH}>Particulars</th>
                <th className={TH}>Vch No.</th>
                <th className={`${TH} text-right`}>Deposit</th>
                <th className={`${TH} text-right`}>Withdrawal</th>
                <th className={TH}>Bank Ref</th>
                <th className={TH}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {activeEntries.length ? activeEntries.map((row) => (
                <tr key={row._id} className={`hover:bg-gray-50 ${row.reconciled ? 'bg-green-50/40' : ''}`}>
                  <td className={TD}>
                    <label className="inline-flex items-center gap-2 text-[13px] cursor-pointer">
                      <input type="checkbox" checked={Boolean(row.reconciled)} onChange={(e) => toggleCleared(row, e.target.checked)} />
                      {row.reconciled && <CheckCircle2 size={14} className="text-green-600" />}
                    </label>
                  </td>
                  <td className={`${TD} text-[#536173]`}>{row.date}</td>
                  <td className={TD}>
                    <input className={`${FIELD} w-36`} type="date" disabled={!row.reconciled} value={row.bankDate || ''} onChange={(e) => updateField(row, 'bankDate', e.target.value)} />
                  </td>
                  <td className={`${TD} font-medium text-[#374151]`}>{row.particulars}</td>
                  <td className={`${TD} font-mono text-xs`}>{row.vchNo}</td>
                  <td className={`${TD} text-right text-green-700 font-medium`}>{row.deposit ? formatCurrency(row.deposit) : '-'}</td>
                  <td className={`${TD} text-right text-red-600 font-medium`}>{row.withdrawal ? formatCurrency(row.withdrawal) : '-'}</td>
                  <td className={TD}>
                    <input className={`${FIELD} w-36`} disabled={!row.reconciled} value={row.bankReference || ''} onBlur={(e) => updateField(row, 'bankReference', e.target.value)} onChange={(e) => setEntries((current) => current.map((item) => item._id === row._id ? { ...item, bankReference: e.target.value } : item))} />
                  </td>
                  <td className={TD}>
                    <input className={`${FIELD} w-48`} value={row.reconciliationNotes || ''} onBlur={(e) => updateField(row, 'reconciliationNotes', e.target.value)} onChange={(e) => setEntries((current) => current.map((item) => item._id === row._id ? { ...item, reconciliationNotes: e.target.value } : item))} />
                  </td>
                </tr>
              )) : (
                <tr><td className={`${TD} text-[#536173]`} colSpan="9">No bank entries found for reconciliation.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
