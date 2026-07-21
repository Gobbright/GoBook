import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';

import {
  getAccountingDayBook,
  getBillWiseStatement,
  getCostCenterStatement,
  getLedgerAccounts,
  getLedgerStatement,
  getOutstandingStatement,
  getVoucherRegister,
  getVoucherTypes,
} from '../../../../../services/accountingService.js';
import { ExportButtons } from '../../../../../components/forms/ExportButtons.jsx';
import { formatCurrency } from '../../../../../utils/formatCurrency.js';

const TH = 'text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-4 py-3 border-b border-[#edf2f7]';
const TD = 'px-4 py-3 border-b border-[#f3f4f6] text-[13px]';
const FIELD = 'border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] bg-white font-[inherit] outline-none focus:border-blue-500';

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

function balanceText(value) {
  const amount = Number(value) || 0;
  if (amount === 0) return 'Nil'; 
  return `${formatCurrency(Math.abs(amount))} ${amount >= 0 ? 'Dr' : 'Cr'}`;
}

export function AccountingReportsPage() {
  const [activeTab, setActiveTab] = useState('day-book');
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [voucherType, setVoucherType] = useState('All');
  const [status, setStatus] = useState('Posted');
  const [ledgerName, setLedgerName] = useState('');
  const [outstandingType, setOutstandingType] = useState('receivables');
  const [voucherTypes, setVoucherTypes] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [dayBook, setDayBook] = useState({ vouchers: [], summary: [], totals: {} });
  const [ledgerStatement, setLedgerStatement] = useState({ ledger: {}, entries: [], totals: {} });
  const [register, setRegister] = useState({ rows: [], vouchers: [] });
  const [outstanding, setOutstanding] = useState({ rows: [], totalOutstanding: 0 });
  const [billWise, setBillWise] = useState({ rows: [], totalOutstanding: 0 });
  const [costCenters, setCostCenters] = useState({ rows: [], totals: {} });
  const [loading, setLoading] = useState(false);

  const selectedRows = useMemo(() => {
    if (activeTab === 'day-book') return dayBook.vouchers;
    if (activeTab === 'ledger') return ledgerStatement.entries;
    if (activeTab === 'register') return register.rows;
    if (activeTab === 'bill-wise') return billWise.rows;
    if (activeTab === 'cost-centers') return costCenters.rows;
    return outstanding.rows;
  }, [activeTab, billWise.rows, costCenters.rows, dayBook.vouchers, ledgerStatement.entries, outstanding.rows, register.rows]);

  useEffect(() => {
    Promise.all([getVoucherTypes(), getLedgerAccounts()])
      .then(([typeData, ledgerData]) => {
        setVoucherTypes(typeData.types ?? []);
        const accounts = ledgerData.accounts ?? [];
        setLedgers(accounts);
        setLedgerName((current) => current || accounts[0]?.name || '');
      })
      .catch(() => {});
  }, []);

  function reportParams() {
    return { from, to, voucherType, status };
  }

  async function loadReports() {
    setLoading(true);
    try {
      const params = reportParams();
      const [dayBookData, registerData, outstandingData, billWiseData, costCenterData] = await Promise.all([
        getAccountingDayBook(params),
        getVoucherRegister(params),
        getOutstandingStatement({ type: outstandingType }),
        getBillWiseStatement({ ...params, type: outstandingType }),
        getCostCenterStatement(params),
      ]);
      setDayBook(dayBookData);
      setRegister(registerData);
      setOutstanding(outstandingData);
      setBillWise(billWiseData);
      setCostCenters(costCenterData);

      if (ledgerName) {
        const ledgerData = await getLedgerStatement({ ...params, ledgerName });
        setLedgerStatement(ledgerData);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports().catch(() => {});
  }, [from, to, voucherType, status, outstandingType, ledgerName]);

  const exportColumns = {
    'day-book': [
      { label: 'Date', value: (row) => row.date },
      { label: 'Voucher No.', value: (row) => row.voucherNo },
      { label: 'Type', value: (row) => row.voucherType },
      { label: 'Party', value: (row) => row.partyName },
      { label: 'Debit', value: (row) => formatCurrency(row.debitTotal) },
      { label: 'Credit', value: (row) => formatCurrency(row.creditTotal) },
    ],
    ledger: [
      { label: 'Date', value: (row) => row.date },
      { label: 'Voucher No.', value: (row) => row.voucherNo },
      { label: 'Particulars', value: (row) => row.particulars },
      { label: 'Debit', value: (row) => formatCurrency(row.debit) },
      { label: 'Credit', value: (row) => formatCurrency(row.credit) },
      { label: 'Balance', value: (row) => balanceText(row.balance) },
    ],
    register: [
      { label: 'Type', value: (row) => row.voucherType },
      { label: 'Count', value: (row) => row.count },
      { label: 'Debit', value: (row) => formatCurrency(row.debitTotal) },
      { label: 'Credit', value: (row) => formatCurrency(row.creditTotal) },
    ],
    outstanding: [
      { label: 'Ledger', value: (row) => row.ledgerName },
      { label: 'Group', value: (row) => row.group },
      { label: 'Outstanding', value: (row) => formatCurrency(row.outstanding) },
    ],
    'bill-wise': [
      { label: 'Party', value: (row) => row.partyName },
      { label: 'Bill Ref', value: (row) => row.billRef },
      { label: 'Date', value: (row) => row.firstDate },
      { label: 'Outstanding', value: (row) => formatCurrency(row.outstanding) },
    ],
    'cost-centers': [
      { label: 'Cost Center', value: (row) => row.costCenter },
      { label: 'Debit', value: (row) => formatCurrency(row.debit) },
      { label: 'Credit', value: (row) => formatCurrency(row.credit) },
      { label: 'Net', value: (row) => balanceText(row.net) },
    ],
  };

  return (
    <div className="p-4 md:p-7">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-1">
        <div>
          <nav className="flex items-center gap-1 text-[13px] text-[#536173] mb-1">
            <a className="text-blue-600 no-underline hover:underline" href="/dashboard">Home</a>
            <span>/</span><span>Accounting</span><span>/</span><span>Reports</span>
          </nav>
          <h1 className="m-0 text-[22px] font-bold">Accounting Reports</h1>
          <p className="m-0 text-[13px] text-[#536173] mt-0.5">Day book, ledger statement, voucher register, and outstanding balances</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportButtons title="Accounting Reports" filename={`accounting-${activeTab}`} rows={selectedRows} columns={exportColumns[activeTab]} />
          <button type="button" onClick={() => loadReports()} disabled={loading} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit] disabled:opacity-60">
            <RefreshCw size={14} />
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="bg-white border border-[#dfe7f1] rounded-xl p-4 my-5">
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            ['day-book', 'Day Book'],
            ['ledger', 'Ledger Statement'],
            ['register', 'Voucher Register'],
            ['outstanding', 'Outstanding'],
            ['bill-wise', 'Bill-wise'],
            ['cost-centers', 'Cost Centers'],
          ].map(([key, label]) => (
            <button key={key} type="button" onClick={() => setActiveTab(key)} className={`px-3 py-2 rounded-md border text-[13px] font-medium font-[inherit] cursor-pointer ${activeTab === key ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-[#dbe4ef] text-[#374151] hover:bg-gray-50'}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input className={FIELD} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input className={FIELD} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <select className={FIELD} value={voucherType} onChange={(e) => setVoucherType(e.target.value)}>
            <option>All</option>
            {voucherTypes.map((type) => <option key={type}>{type}</option>)}
          </select>
          <select className={FIELD} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option>Posted</option>
            <option>Draft</option>
            <option>All</option>
          </select>
          {activeTab === 'ledger' && (
            <div className="relative min-w-65">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#536173]" />
              <input className={`${FIELD} w-full pl-8`} list="report-ledgers" value={ledgerName} onChange={(e) => setLedgerName(e.target.value)} placeholder="Select ledger" />
              <datalist id="report-ledgers">
                {ledgers.map((ledger) => <option key={ledger._id} value={ledger.name} />)}
              </datalist>
            </div>
          )}
          {(activeTab === 'outstanding' || activeTab === 'bill-wise') && (
            <select className={FIELD} value={outstandingType} onChange={(e) => setOutstandingType(e.target.value)}>
              <option value="receivables">Receivables</option>
              <option value="payables">Payables</option>
            </select>
          )}
        </div>
      </div>

      {activeTab === 'day-book' && (
        <ReportTable
          title={`Day Book (${dayBook.totals?.count ?? 0} vouchers)`}
          footer={`Debit ${formatCurrency(dayBook.totals?.debitTotal || 0)} | Credit ${formatCurrency(dayBook.totals?.creditTotal || 0)}`}
          columns={['Date', 'Voucher No.', 'Type', 'Party', 'Debit', 'Credit']}
          rows={dayBook.vouchers}
          render={(row) => [
            row.date,
            row.voucherNo,
            row.voucherType,
            row.partyName || row.sourceNumber || '-',
            formatCurrency(row.debitTotal),
            formatCurrency(row.creditTotal),
          ]}
        />
      )}

      {activeTab === 'ledger' && (
        <ReportTable
          title={`${ledgerStatement.ledger?.name || 'Ledger'} Statement`}
          footer={`Opening ${formatCurrency(ledgerStatement.ledger?.opening || 0)} | Closing ${balanceText(ledgerStatement.totals?.closing || 0)}`}
          columns={['Date', 'Voucher No.', 'Particulars', 'Debit', 'Credit', 'Balance']}
          rows={ledgerStatement.entries}
          render={(row) => [
            row.date,
            row.voucherNo,
            row.particulars || row.partyName || '-',
            row.debit ? formatCurrency(row.debit) : '-',
            row.credit ? formatCurrency(row.credit) : '-',
            balanceText(row.balance),
          ]}
        />
      )}

      {activeTab === 'register' && (
        <ReportTable
          title="Voucher Register"
          footer={`${register.vouchers?.length || 0} vouchers in selected period`}
          columns={['Voucher Type', 'Count', 'Debit', 'Credit']}
          rows={register.rows}
          render={(row) => [
            row.voucherType,
            row.count,
            formatCurrency(row.debitTotal),
            formatCurrency(row.creditTotal),
          ]}
        />
      )}

      {activeTab === 'outstanding' && (
        <ReportTable
          title={outstandingType === 'payables' ? 'Outstanding Payables' : 'Outstanding Receivables'}
          footer={`Total ${formatCurrency(outstanding.totalOutstanding || 0)}`}
          columns={['Ledger', 'Group', 'Debit', 'Credit', 'Outstanding']}
          rows={outstanding.rows}
          render={(row) => [
            row.ledgerName,
            row.group,
            formatCurrency(row.debit),
            formatCurrency(row.credit),
            formatCurrency(row.outstanding),
          ]}
        />
      )}

      {activeTab === 'bill-wise' && (
        <ReportTable
          title={outstandingType === 'payables' ? 'Bill-wise Payables' : 'Bill-wise Receivables'}
          footer={`Total ${formatCurrency(billWise.totalOutstanding || 0)}`}
          columns={['Party', 'Bill Ref', 'First Date', 'Last Date', 'Debit', 'Credit', 'Outstanding']}
          rows={billWise.rows}
          render={(row) => [
            row.partyName,
            row.billRef,
            row.firstDate,
            row.lastDate,
            formatCurrency(row.debit),
            formatCurrency(row.credit),
            formatCurrency(row.outstanding),
          ]}
        />
      )}

      {activeTab === 'cost-centers' && (
        <ReportTable
          title="Cost Center Summary"
          footer={`Debit ${formatCurrency(costCenters.totals?.debit || 0)} | Credit ${formatCurrency(costCenters.totals?.credit || 0)} | Net ${balanceText(costCenters.totals?.net || 0)}`}
          columns={['Cost Center', 'Voucher Lines', 'Debit', 'Credit', 'Net']}
          rows={costCenters.rows}
          render={(row) => [
            row.costCenter,
            row.voucherCount,
            formatCurrency(row.debit),
            formatCurrency(row.credit),
            balanceText(row.net),
          ]}
        />
      )}
    </div>
  );
}

function ReportTable({ title, footer, columns, rows, render }) {
  return (
    <div className="bg-white border border-[#dfe7f1] rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[#edf2f7] flex flex-wrap justify-between items-center gap-2">
        <span className="text-[13px] font-semibold text-[#374151]">{title}</span>
        <span className="text-xs text-[#536173]">{footer}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-180">
          <thead>
            <tr>
              {columns.map((column) => <th key={column} className={TH}>{column}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows?.length ? rows.map((row, rowIndex) => (
              <tr key={row._id || row.voucherId || row.ledgerName || `${rowIndex}`} className="hover:bg-gray-50">
                {render(row).map((value, index) => (
                  <td key={index} className={`${TD} ${index >= columns.length - 3 ? 'text-right' : ''}`}>{value}</td>
                ))}
              </tr>
            )) : (
              <tr><td className={`${TD} text-[#536173]`} colSpan={columns.length}>No data found for this report.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
