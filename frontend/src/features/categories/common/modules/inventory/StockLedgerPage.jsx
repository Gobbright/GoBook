import { useCallback, useEffect, useState } from 'react';

import { DateRangeFilter } from '../../../../../components/forms/DateRangeFilter.jsx';
import { ExportButtons } from '../../../../../components/forms/ExportButtons.jsx';
import { api } from '../../../../../services/api.js';
import { dateRangeParams } from '../../../../../utils/dateRange.js';
import { formatCurrency } from '../../../../../utils/formatCurrency.js';
import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';

const TH = 'text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-5 py-3 border-b border-[#edf2f7]';
const TD = 'px-5 py-3.5 border-b border-[#f3f4f6] text-[13px]';

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function MovementBadge({ direction }) {
  const isIn = direction === 'in';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${isIn ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
      {isIn ? 'Stock In' : 'Stock Out'}
    </span>
  );
}

function StatCard({ label, value, sub, color, bg }) {
  return (
    <div className="bg-white border border-[#dfe7f1] rounded-xl p-4">
      <div className="text-xs text-[#536173] mb-1">{label}</div>
      <div className="text-[18px] font-bold leading-tight" style={{ color }}>{value}</div>
      <div className="text-xs text-[#536173] mt-1">{sub}</div>
      <div className="h-1 rounded-full mt-3" style={{ background: bg }} />
    </div>
  );
}

function ItemTypeTabs({ value, onChange }) {
  return (
    <div className="inline-flex rounded-md border border-[#dbe4ef] bg-white p-0.5">
      {['Product', 'Service'].map((t) => (
        <button
          key={t}
          type="button"
          className={`px-3 py-1.5 text-[13px] font-medium rounded cursor-pointer font-[inherit] ${value === t ? 'bg-blue-600 text-white' : 'text-[#374151] hover:bg-gray-50'}`}
          onClick={() => onChange(t)}
        >
          {t === 'Product' ? 'Products' : 'Services'}
        </button>
      ))}
    </div>
  );
}

export function StockLedgerPage() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [itemType, setItemType] = useState('Product');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const LIMIT = 20;

  function loadLedger() {
    setLoading(true);
    setError('');
    const params = { page, limit: LIMIT, type, itemType, ...dateRangeParams(dateFrom, dateTo) };
    if (search) params.search = search;
    api.invStockLedger(params)
      .then((res) => {
        setRows(res.data ?? []);
        setTotal(res.total ?? 0);
        setStats(res.stats ?? null);
      })
      .catch(() => setError('Failed to load stock ledger'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadLedger(); }, [search, type, itemType, dateFrom, dateTo, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAllForExport = useCallback(async () => {
    const params = { page: 1, limit: 9999, type, itemType, ...dateRangeParams(dateFrom, dateTo) };
    if (search) params.search = search;
    const res = await api.invStockLedger(params);
    return res.data ?? [];
  }, [dateFrom, dateTo, search, type, itemType]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const exportColumns = [
    { label: 'Date', value: (row) => formatDate(row.date) },
    { label: 'Type', value: (row) => (row.direction === 'in' ? 'Stock In' : 'Stock Out') },
    { label: 'Number', value: (row) => row.number },
    { label: 'Source', value: (row) => row.sourceNo || '' },
    { label: 'Product', value: (row) => row.productName || '' },
    { label: 'Party', value: (row) => row.party || '' },
    { label: 'Qty In', value: (row) => row.qtyIn },
    { label: 'Qty Out', value: (row) => row.qtyOut },
    { label: 'Value', value: (row) => formatCurrency(row.value || 0) },
    { label: 'Status', value: (row) => row.status },
  ];

  return (
    <div className="p-4 md:p-7">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-5">
        <div>
          <h1 className="m-0 text-[22px] font-bold text-[#111827]">Stock Ledger</h1>
          <p className="m-0 text-[13px] text-[#536173] mt-0.5">Complete product movement history from sales, purchases and manual entries</p>
        </div>
        <ExportButtons title="Stock Ledger" filename="stock-ledger" rows={rows} columns={exportColumns} fetchRows={fetchAllForExport} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatCard label="Qty In" value={(stats?.totalInQty ?? 0).toLocaleString('en-IN')} sub={formatCurrency(stats?.totalInValue ?? 0)} color="#16a34a" bg="#bbf7d0" />
        <StatCard label="Qty Out" value={(stats?.totalOutQty ?? 0).toLocaleString('en-IN')} sub={formatCurrency(stats?.totalOutValue ?? 0)} color="#dc2626" bg="#fecaca" />
        <StatCard label="Net Movement" value={((stats?.totalInQty ?? 0) - (stats?.totalOutQty ?? 0)).toLocaleString('en-IN')} sub="In quantity minus out quantity" color="#2563eb" bg="#bfdbfe" />
        <StatCard label="Entries" value={total.toLocaleString('en-IN')} sub="Matching ledger records" color="#7c3aed" bg="#ddd6fe" />
      </div>

      <div className="bg-white border border-[#dfe7f1] rounded-xl">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[#edf2f7] flex-wrap">
          <ItemTypeTabs value={itemType} onChange={(t) => { setItemType(t); setPage(1); }} />
          <div className="relative flex-1 max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#536173]" fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>
            <input className="border border-[#dbe4ef] rounded-md pl-8 pr-3 py-2 text-[13px] w-full outline-none focus:border-blue-500 font-[inherit]" placeholder="Search product, number or party..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <SelectDropdown
            buttonClassName="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none font-[inherit] text-[#374151] bg-white cursor-pointer"
            value={type}
            onChange={(v) => { setType(v); setPage(1); }}
            options={[{ value: 'all', label: 'All Movements' }, { value: 'in', label: 'Stock In Only' }, { value: 'out', label: 'Stock Out Only' }]}
          />
          <DateRangeFilter
            from={dateFrom}
            to={dateTo}
            onFromChange={(value) => { setDateFrom(value); setPage(1); }}
            onToChange={(value) => { setDateTo(value); setPage(1); }}
            onClear={() => { setDateFrom(''); setDateTo(''); setPage(1); }}
          />
        </div>

        {error && <div className="px-5 py-4 text-[13px] text-red-600">{error}</div>}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={TH}>Date</th>
                <th className={TH}>Type</th>
                <th className={TH}>Number</th>
                <th className={TH}>Product</th>
                <th className={TH}>Party</th>
                <th className={TH}>Qty In</th>
                <th className={TH}>Qty Out</th>
                <th className={TH}>Value</th>
                <th className={TH}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-5 py-8 text-center text-[13px] text-[#536173]">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={9} className="px-5 py-8 text-center text-[13px] text-[#536173]">No stock movement found</td></tr>
              ) : rows.map((row) => (
                <tr key={row._id} className="hover:bg-gray-50">
                  <td className={`${TD} text-[#536173]`}>{formatDate(row.date)}</td>
                  <td className={TD}><MovementBadge direction={row.direction} /></td>
                  <td className={TD}>
                    <div className="font-medium text-blue-600">{row.number}</div>
                    {row.sourceNo && row.sourceNo !== row.number && <div className="text-[11px] text-[#536173]">From {row.sourceNo}</div>}
                  </td>
                  <td className={`${TD} font-medium text-[#111827]`}>{row.productName || '-'}</td>
                  <td className={`${TD} text-[#536173]`}>{row.party || '-'}</td>
                  <td className={`${TD} font-semibold text-green-700`}>{Number(row.qtyIn || 0).toLocaleString('en-IN')}</td>
                  <td className={`${TD} font-semibold text-red-700`}>{Number(row.qtyOut || 0).toLocaleString('en-IN')}</td>
                  <td className={`${TD} text-[#111827]`}>{formatCurrency(row.value || 0)}</td>
                  <td className={TD}>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${row.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{row.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-[#edf2f7] flex flex-wrap justify-between gap-2 text-[13px] text-[#536173]">
          <span>Showing {rows.length === 0 ? 0 : (page - 1) * LIMIT + 1} to {(page - 1) * LIMIT + rows.length} of {total} entries</span>
          <div className="flex items-center gap-1 flex-wrap">
            <button className="px-2.5 py-1 rounded border border-[#dbe4ef] hover:bg-gray-50 text-[12px] bg-white font-[inherit] cursor-pointer disabled:opacity-40" type="button" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
            <span className="px-2 text-[12px]">Page {page} / {totalPages}</span>
            <button className="px-2.5 py-1 rounded border border-[#dbe4ef] hover:bg-gray-50 text-[12px] bg-white font-[inherit] cursor-pointer disabled:opacity-40" type="button" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
