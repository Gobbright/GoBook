import { useEffect, useMemo, useState } from 'react';
import { Edit3, Plus, Search, Trash2, X } from 'lucide-react';

import {
  createAccountingVoucher,
  deleteAccountingVoucher,
  getAccountingVouchers,
  getLedgerAccounts,
  getNextVoucherNumber,
  getVoucherTypes,
  updateAccountingVoucher,
} from '../../../../../services/accountingService.js';
import { ExportButtons } from '../../../../../components/forms/ExportButtons.jsx';
import { formatCurrency } from '../../../../../utils/formatCurrency.js';

const EMPTY_LINE = {
  ledgerName: '',
  ledgerGroup: '',
  side: 'debit',
  amount: '',
  billRef: '',
  costCenter: '',
  narration: '',
};

const today = () => new Date().toISOString().slice(0, 10);

const emptyVoucher = () => ({
  voucherType: 'Journal',
  voucherNo: '',
  date: today(),
  partyName: '',
  referenceNo: '',
  narration: '',
  status: 'Posted',
  lines: [
    { ...EMPTY_LINE, side: 'debit' },
    { ...EMPTY_LINE, side: 'credit' },
  ],
});

const TH = 'text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-4 py-3 border-b border-[#edf2f7]';
const TD = 'px-4 py-3 border-b border-[#f3f4f6] text-[13px]';
const FIELD = 'w-full border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit] bg-white';
const PAGE_SIZE = 8;

function money(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function totals(lines) {
  return lines.reduce((acc, line) => {
    const amount = money(line.amount);
    if (line.side === 'debit') acc.debit += amount;
    if (line.side === 'credit') acc.credit += amount;
    return acc;
  }, { debit: 0, credit: 0 });
}

function pageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total];
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '...', current - 1, current, current + 1, '...', total];
}

function normalizeForForm(voucher) {
  return {
    voucherType: voucher.voucherType || 'Journal',
    voucherNo: voucher.voucherNo || '',
    date: voucher.date || today(),
    partyName: voucher.partyName || '',
    referenceNo: voucher.referenceNo || '',
    narration: voucher.narration || '',
    status: voucher.status || 'Posted',
    lines: voucher.lines?.length
      ? voucher.lines.map((line) => ({
          ledgerName: line.ledgerName || '',
          ledgerGroup: line.ledgerGroup || '',
          side: line.side || 'debit',
          amount: line.amount || '',
          billRef: line.billRef || '',
          costCenter: line.costCenter || '',
          narration: line.narration || '',
        }))
      : emptyVoucher().lines,
  };
}

export function AccountingVoucherPage() {
  const [vouchers, setVouchers] = useState([]);
  const [voucherTypes, setVoucherTypes] = useState(['Journal']);
  const [ledgers, setLedgers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyVoucher);
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);

  const ledgerGroupsByName = useMemo(() => {
    const map = new Map();
    ledgers.forEach((ledger) => map.set(ledger.name, ledger.group));
    return map;
  }, [ledgers]);

  function loadData() {
    setLoading(true);
    return Promise.all([
      getAccountingVouchers({ limit: 500 }),
      getVoucherTypes(),
      getLedgerAccounts(),
    ])
      .then(([voucherData, typeData, ledgerData]) => {
        setVouchers(voucherData.vouchers ?? []);
        setVoucherTypes(typeData.types ?? ['Journal']);
        setLedgers(ledgerData.accounts ?? []);
      })
      .catch(() => {
        setVouchers([]);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, statusFilter]);

  async function fillNextNumber(voucherType, date = form.date) {
    try {
      const data = await getNextVoucherNumber(voucherType, date);
      setForm((current) => ({ ...current, voucherNo: data.voucherNo || current.voucherNo }));
    } catch {
      setForm((current) => ({ ...current, voucherNo: current.voucherNo }));
    }
  }

  function openNewForm() {
    const next = emptyVoucher();
    setForm(next);
    setEditingId(null);
    setFormError('');
    setShowForm(true);
    fillNextNumber(next.voucherType);
  }

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyVoucher());
    setFormError('');
  }

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    if ((field === 'voucherType' || field === 'date') && !editingId) {
      fillNextNumber(field === 'voucherType' ? value : form.voucherType, field === 'date' ? value : form.date);
    }
  }

  function updateLine(index, field, value) {
    setForm((current) => {
      const lines = current.lines.map((line, i) => {
        if (i !== index) return line;
        const next = { ...line, [field]: value };
        if (field === 'ledgerName' && ledgerGroupsByName.has(value)) {
          next.ledgerGroup = ledgerGroupsByName.get(value);
        }
        return next;
      });
      return { ...current, lines };
    });
  }

  function addLine(side = 'debit') {
    setForm((current) => ({ ...current, lines: [...current.lines, { ...EMPTY_LINE, side }] }));
  }

  function removeLine(index) {
    setForm((current) => {
      if (current.lines.length <= 2) return current;
      return { ...current, lines: current.lines.filter((_, i) => i !== index) };
    });
  }

  const filtered = vouchers.filter((voucher) => {
    if (typeFilter !== 'All' && voucher.voucherType !== typeFilter) return false;
    if (statusFilter !== 'All' && voucher.status !== statusFilter) return false;
    if (!search) return true;
    const haystack = [
      voucher.voucherNo,
      voucher.voucherType,
      voucher.partyName,
      voucher.referenceNo,
      voucher.narration,
      voucher.sourceNumber,
    ].join(' ').toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const formTotals = totals(form.lines);
  const formDiff = money(formTotals.debit - formTotals.credit);
  const postedCount = vouchers.filter((voucher) => voucher.status === 'Posted').length;
  const draftCount = vouchers.filter((voucher) => voucher.status === 'Draft').length;
  const totalDebit = vouchers.reduce((sum, voucher) => sum + money(voucher.debitTotal), 0);
  const totalCredit = vouchers.reduce((sum, voucher) => sum + money(voucher.creditTotal), 0);

  const exportColumns = [
    { label: 'Date', value: (row) => row.date },
    { label: 'Voucher Type', value: (row) => row.voucherType },
    { label: 'Voucher No.', value: (row) => row.voucherNo },
    { label: 'Financial Year', value: (row) => row.financialYear },
    { label: 'Party', value: (row) => row.partyName },
    { label: 'Debit', value: (row) => formatCurrency(row.debitTotal) },
    { label: 'Credit', value: (row) => formatCurrency(row.creditTotal) },
    { label: 'Status', value: (row) => row.status },
  ];

  function handleEdit(voucher) {
    setForm(normalizeForForm(voucher));
    setEditingId(voucher._id);
    setFormError('');
    setShowForm(true);
  }

  async function handleDelete(id) {
    await deleteAccountingVoucher(id);
    await loadData();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    if (form.status === 'Posted' && Math.abs(formDiff) >= 0.01) {
      setFormError('Debit and credit totals must match before posting.');
      return;
    }

    const payload = {
      ...form,
      lines: form.lines.map((line) => ({ ...line, amount: money(line.amount) })),
    };

    setSaving(true);
    try {
      if (editingId) await updateAccountingVoucher(editingId, payload);
      else await createAccountingVoucher(payload);
      await loadData();
      resetForm();
    } catch (err) {
      setFormError(err.message || 'Unable to save voucher');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 md:p-7">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-1">
        <div>
          <nav className="flex items-center gap-1 text-[13px] text-[#536173] mb-1">
            <a className="text-blue-600 no-underline hover:underline" href="#/dashboard">Home</a>
            <span>/</span><span>Accounting</span><span>/</span><span>Vouchers</span>
          </nav>
          <h1 className="m-0 text-[22px] font-bold">Accounting Vouchers</h1>
          <p className="m-0 text-[13px] text-[#536173] mt-0.5">Create and review Tally-style accounting vouchers</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportButtons title="Accounting Vouchers" filename="accounting-vouchers" rows={filtered} columns={exportColumns} />
          <button type="button" onClick={openNewForm} className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit]">
            <Plus size={14} />
            New Voucher
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-5">
        {[
          { label: 'Total Vouchers', value: String(vouchers.length), sub: `${postedCount} posted`, bg: '#eff6ff', color: '#2563eb' },
          { label: 'Draft Vouchers', value: String(draftCount), sub: 'Pending posting', bg: '#fffbeb', color: '#d97706' },
          { label: 'Total Debit', value: formatCurrency(totalDebit), sub: 'Posted and draft', bg: '#fef2f2', color: '#dc2626' },
          { label: 'Total Credit', value: formatCurrency(totalCredit), sub: 'Posted and draft', bg: '#f0fdf4', color: '#16a34a' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-[#dfe7f1] rounded-lg p-4">
            <div className="text-xs text-[#536173] mb-1">{stat.label}</div>
            <div className="text-[17px] font-bold leading-tight" style={{ color: stat.color }}>{stat.value}</div>
            <div className="text-xs mt-0.5" style={{ color: stat.color }}>{stat.sub}</div>
          </div>
        ))}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-[#dfe7f1] rounded-lg p-5 mb-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="m-0 text-[15px] font-semibold">{editingId ? 'Edit Voucher' : 'New Voucher'}</h3>
            <button type="button" onClick={resetForm} className="w-8 h-8 inline-flex items-center justify-center rounded-md text-[#536173] hover:bg-gray-100 bg-transparent border-0 cursor-pointer" title="Close">
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Voucher number', value: form.voucherNo || 'Auto number pending', ok: Boolean(form.voucherNo) },
              { label: 'Entry balance', value: Math.abs(formDiff) < 0.01 ? 'Debit and credit matched' : `Difference ${formatCurrency(Math.abs(formDiff))}`, ok: Math.abs(formDiff) < 0.01 },
              { label: 'Posting mode', value: form.status === 'Posted' ? 'Will update ledgers' : 'Saved as draft', ok: form.status === 'Posted' },
            ].map((item) => (
              <div key={item.label} className={`border rounded-lg px-3 py-2 ${item.ok ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
                <div className={`text-[11px] font-semibold uppercase tracking-wide ${item.ok ? 'text-green-700' : 'text-amber-700'}`}>{item.label}</div>
                <div className="text-[13px] font-medium text-[#111827] mt-0.5">{item.value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
            <div>
              <label className="block text-[12px] font-medium text-[#374151] mb-1">Voucher Type</label>
              <select className={FIELD} value={form.voucherType} onChange={(e) => updateForm('voucherType', e.target.value)}>
                {voucherTypes.map((type) => <option key={type}>{type}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#374151] mb-1">Voucher No.</label>
              <input className={FIELD} required value={form.voucherNo} onChange={(e) => updateForm('voucherNo', e.target.value)} />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#374151] mb-1">Date</label>
              <input className={FIELD} required type="date" value={form.date} onChange={(e) => updateForm('date', e.target.value)} />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#374151] mb-1">Party</label>
              <input className={FIELD} placeholder="Customer or vendor" value={form.partyName} onChange={(e) => updateForm('partyName', e.target.value)} />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#374151] mb-1">Reference No.</label>
              <input className={FIELD} value={form.referenceNo} onChange={(e) => updateForm('referenceNo', e.target.value)} />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#374151] mb-1">Status</label>
              <select className={FIELD} value={form.status} onChange={(e) => updateForm('status', e.target.value)}>
                <option>Posted</option>
                <option>Draft</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto border border-[#edf2f7] rounded-lg">
            <table className="w-full border-collapse min-w-250">
              <thead>
                <tr>
                  <th className={TH}>Ledger</th>
                  <th className={TH}>Group</th>
                  <th className={TH}>Side</th>
                  <th className={`${TH} text-right`}>Amount</th>
                  <th className={TH}>Bill Ref</th>
                  <th className={TH}>Cost Center</th>
                  <th className={TH}>Narration</th>
                  <th className={TH}>Action</th>
                </tr>
              </thead>
              <tbody>
                {form.lines.map((line, index) => (
                  <tr key={`${index}-${line.side}`}>
                    <td className={TD}>
                      <input className={FIELD} list="voucher-ledgers" required value={line.ledgerName} onChange={(e) => updateLine(index, 'ledgerName', e.target.value)} placeholder="Select or type ledger" />
                    </td>
                    <td className={TD}>
                      <input className={FIELD} value={line.ledgerGroup} onChange={(e) => updateLine(index, 'ledgerGroup', e.target.value)} placeholder="Ledger group" />
                    </td>
                    <td className={TD}>
                      <select className={FIELD} value={line.side} onChange={(e) => updateLine(index, 'side', e.target.value)}>
                        <option value="debit">Debit</option>
                        <option value="credit">Credit</option>
                      </select>
                    </td>
                    <td className={TD}>
                      <input className={`${FIELD} text-right`} required min="0" step="0.01" type="number" value={line.amount} onChange={(e) => updateLine(index, 'amount', e.target.value)} />
                    </td>
                    <td className={TD}>
                      <input className={FIELD} value={line.billRef} onChange={(e) => updateLine(index, 'billRef', e.target.value)} />
                    </td>
                    <td className={TD}>
                      <input className={FIELD} value={line.costCenter} onChange={(e) => updateLine(index, 'costCenter', e.target.value)} />
                    </td>
                    <td className={TD}>
                      <input className={FIELD} value={line.narration} onChange={(e) => updateLine(index, 'narration', e.target.value)} />
                    </td>
                    <td className={TD}>
                      <button type="button" onClick={() => removeLine(index)} disabled={form.lines.length <= 2} className="w-8 h-8 inline-flex items-center justify-center rounded-md text-red-500 hover:bg-red-50 bg-transparent border-0 cursor-pointer disabled:opacity-30" title="Remove line">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <datalist id="voucher-ledgers">
              {ledgers.map((ledger) => <option key={ledger._id} value={ledger.name} />)}
            </datalist>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mt-4">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => addLine('debit')} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-[#374151] bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit]">
                <Plus size={14} />
                Debit Line
              </button>
              <button type="button" onClick={() => addLine('credit')} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-[#374151] bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit]">
                <Plus size={14} />
                Credit Line
              </button>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="text-[13px] text-[#536173]">
                Debit <strong className="text-[#111827]">{formatCurrency(formTotals.debit)}</strong>
                <span className="mx-2">|</span>
                Credit <strong className="text-[#111827]">{formatCurrency(formTotals.credit)}</strong>
                <span className={`ml-2 font-semibold ${Math.abs(formDiff) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.abs(formDiff) < 0.01 ? 'Balanced' : `Diff ${formatCurrency(Math.abs(formDiff))}`}
                </span>
              </div>
              <button type="button" onClick={resetForm} className="px-4 py-2 text-[13px] font-medium text-gray-700 bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit]">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit] disabled:opacity-60">
                {saving ? 'Saving...' : editingId ? 'Update Voucher' : 'Save Voucher'}
              </button>
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-[12px] font-medium text-[#374151] mb-1">Voucher Narration</label>
            <textarea className={`${FIELD} min-h-20 resize-y`} value={form.narration} onChange={(e) => updateForm('narration', e.target.value)} placeholder="Narration for this voucher" />
          </div>
          {formError && <p className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mt-3">{formError}</p>}
        </form>
      )}

      <div className="bg-white border border-[#dfe7f1] rounded-lg overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 px-5 py-3.5 border-b border-[#edf2f7]">
          <div className="relative flex-1 min-w-55 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#536173]" />
            <input className="border border-[#dbe4ef] rounded-md pl-8 pr-3 py-2 text-[13px] w-full outline-none focus:border-blue-500 font-[inherit]" placeholder="Search vouchers..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] bg-white font-[inherit] outline-none" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option>All</option>
            {voucherTypes.map((type) => <option key={type}>{type}</option>)}
          </select>
          <select className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] bg-white font-[inherit] outline-none" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option>All</option>
            <option>Posted</option>
            <option>Draft</option>
            <option>Cancelled</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-220">
            <thead>
              <tr>
                <th className={TH}>Date</th>
                <th className={TH}>Voucher No.</th>
                <th className={TH}>Type</th>
                <th className={TH}>FY</th>
                <th className={TH}>Party</th>
                <th className={`${TH} text-right`}>Debit</th>
                <th className={`${TH} text-right`}>Credit</th>
                <th className={TH}>Status</th>
                <th className={TH}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className={`${TD} text-[#536173]`} colSpan="9">Loading vouchers...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td className={`${TD} text-[#536173]`} colSpan="9">No vouchers found.</td></tr>
              ) : paginated.map((voucher) => {
                const sourceLinked = Boolean(voucher.sourceType && voucher.sourceId);
                return (
                  <tr key={voucher._id} className="hover:bg-gray-50">
                    <td className={`${TD} text-[#536173]`}>{voucher.date}</td>
                    <td className={`${TD} font-mono font-semibold text-[#111827]`}>{voucher.voucherNo}</td>
                    <td className={TD}>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span>{voucher.voucherType}</span>
                        {sourceLinked && <span className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-semibold text-blue-700">Auto</span>}
                      </div>
                    </td>
                    <td className={`${TD} text-[#536173]`}>{voucher.financialYear || '-'}</td>
                    <td className={`${TD} text-[#374151]`}>{voucher.partyName || voucher.sourceNumber || '-'}</td>
                    <td className={`${TD} text-right text-[#dc2626] font-medium`}>{formatCurrency(voucher.debitTotal)}</td>
                    <td className={`${TD} text-right text-[#16a34a] font-medium`}>{formatCurrency(voucher.creditTotal)}</td>
                    <td className={TD}>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${voucher.status === 'Posted' ? 'text-green-700 bg-green-50' : voucher.status === 'Draft' ? 'text-amber-700 bg-amber-50' : 'text-red-700 bg-red-50'}`}>
                        {voucher.status}
                      </span>
                    </td>
                    <td className={TD}>
                      <div className="flex items-center gap-1">
                        <button type="button" disabled={sourceLinked} onClick={() => handleEdit(voucher)} className="w-8 h-8 inline-flex items-center justify-center rounded-md text-blue-600 hover:bg-blue-50 bg-transparent border-0 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed" title={sourceLinked ? 'Edit from source document' : 'Edit voucher'}>
                          <Edit3 size={14} />
                        </button>
                        <button type="button" disabled={sourceLinked} onClick={() => handleDelete(voucher._id)} className="w-8 h-8 inline-flex items-center justify-center rounded-md text-red-500 hover:bg-red-50 bg-transparent border-0 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed" title={sourceLinked ? 'Delete from source document' : 'Delete voucher'}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-[#edf2f7] flex items-center justify-between text-[13px] text-[#536173]">
          <span>Showing {paginated.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 text-[12px] border border-[#dbe4ef] rounded hover:bg-gray-50 disabled:opacity-40 bg-white font-[inherit] cursor-pointer">Prev</button>
            {pageNumbers(page, totalPages).map((p, i) => p === '...' ? (
              <span key={`ellipsis-${i}`} className="px-2 py-1 text-[12px] text-[#536173]">...</span>
            ) : (
              <button type="button" key={p} onClick={() => setPage(p)} className={`px-2 py-1 text-[12px] border rounded font-[inherit] cursor-pointer ${p === page ? 'bg-blue-600 text-white border-blue-600' : 'border-[#dbe4ef] hover:bg-gray-50 bg-white'}`}>{p}</button>
            ))}
            <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2 py-1 text-[12px] border border-[#dbe4ef] rounded hover:bg-gray-50 disabled:opacity-40 bg-white font-[inherit] cursor-pointer">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
