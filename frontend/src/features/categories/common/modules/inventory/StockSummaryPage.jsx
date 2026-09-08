import { useCallback, useEffect, useState } from 'react';

import { ExportButtons } from '../../../../../components/forms/ExportButtons.jsx';
import { api } from '../../../../../services/api.js';
import { formatCurrency } from '../../../../../utils/formatCurrency.js';
import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';

const TH = 'text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-5 py-3 border-b border-[#edf2f7]';
const TD = 'px-5 py-3.5 border-b border-[#f3f4f6] text-[13px]';

function StatusBadge({ status }) {
  const cls = status === 'Out of Stock'
    ? 'bg-red-100 text-red-700'
    : status === 'Low Stock'
      ? 'bg-orange-100 text-orange-700'
      : 'bg-green-100 text-green-700';
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${cls}`}>{status}</span>;
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

export function StockSummaryPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [itemType, setItemType] = useState('Product');
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const LIMIT = 20;

  function loadSummary() {
    setLoading(true);
    setError('');
    const params = { page, limit: LIMIT, status, itemType };
    if (search) params.search = search;
    api.invStockSummary(params)
      .then((res) => {
        setRows(res.data ?? []);
        setTotal(res.total ?? 0);
        setStats(res.stats ?? null);
      })
      .catch(() => setError('Failed to load stock summary'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadSummary(); }, [search, status, itemType, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAllForExport = useCallback(async () => {
    const params = { page: 1, limit: 9999, status, itemType };
    if (search) params.search = search;
    const res = await api.invStockSummary(params);
    return res.data ?? [];
  }, [search, status, itemType]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const exportColumns = [
    { label: 'Code', value: (row) => row.code },
    { label: 'Product', value: (row) => row.description },
    { label: 'Category', value: (row) => row.category || '' },
    { label: 'Unit', value: (row) => row.unit },
    { label: 'Current Stock', value: (row) => row.stock },
    { label: 'Minimum Stock', value: (row) => row.minStockLevel },
    { label: 'Stock In', value: (row) => row.stockInQty },
    { label: 'Stock Out', value: (row) => row.stockOutQty },
    { label: 'Rate', value: (row) => formatCurrency(row.rate) },
    { label: 'Stock Value', value: (row) => formatCurrency(row.stockValue) },
    { label: 'Status', value: (row) => row.stockStatus },
  ];

  return (
    <div className="p-4 md:p-7">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-5">
        <div>
          <h1 className="m-0 text-[22px] font-bold text-[#111827]">Stock Summary</h1>
          <p className="m-0 text-[13px] text-[#536173] mt-0.5">Current product stock, value and reorder status in one place</p>
        </div>
        <ExportButtons title="Stock Summary" filename="stock-summary" rows={rows} columns={exportColumns} fetchRows={fetchAllForExport} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatCard label={itemType === 'Service' ? 'Services' : 'Products'} value={(stats?.totalProducts ?? 0).toLocaleString('en-IN')} sub={`${stats?.activeProducts ?? 0} active`} color="#2563eb" bg="#bfdbfe" />
        <StatCard label="Current Stock" value={(stats?.totalQty ?? 0).toLocaleString('en-IN')} sub="Total available quantity" color="#16a34a" bg="#bbf7d0" />
        <StatCard label="Stock Value" value={formatCurrency(stats?.totalValue ?? 0)} sub="Based on sale price" color="#7c3aed" bg="#ddd6fe" />
        <StatCard label="Needs Attention" value={((stats?.lowStock ?? 0) + (stats?.outOfStock ?? 0)).toLocaleString('en-IN')} sub={`${stats?.lowStock ?? 0} low, ${stats?.outOfStock ?? 0} out`} color="#dc2626" bg="#fecaca" />
      </div>

      <div className="bg-white border border-[#dfe7f1] rounded-xl">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[#edf2f7] flex-wrap">
          <ItemTypeTabs value={itemType} onChange={(t) => { setItemType(t); setPage(1); }} />
          <div className="relative flex-1 max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#536173]" fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>
            <input className="border border-[#dbe4ef] rounded-md pl-8 pr-3 py-2 text-[13px] w-full outline-none focus:border-blue-500 font-[inherit]" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <SelectDropdown
            buttonClassName="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none font-[inherit] text-[#374151] bg-white cursor-pointer"
            value={status}
            onChange={(v) => { setStatus(v); setPage(1); }}
            options={[
              { value: 'all', label: 'All Stock' },
              { value: 'active', label: 'Active Products' },
              { value: 'low', label: 'Low Stock' },
              { value: 'out', label: 'Out of Stock' },
              { value: 'inactive', label: 'Inactive Products' },
            ]}
          />
        </div>

        {error && <div className="px-5 py-4 text-[13px] text-red-600">{error}</div>}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={TH}>Product</th>
                <th className={TH}>Category</th>
                <th className={TH}>Unit</th>
                <th className={TH}>Current</th>
                <th className={TH}>Minimum</th>
                <th className={TH}>Stock In</th>
                <th className={TH}>Stock Out</th>
                <th className={TH}>Value</th>
                <th className={TH}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-5 py-8 text-center text-[13px] text-[#536173]">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={9} className="px-5 py-8 text-center text-[13px] text-[#536173]">No stock records found</td></tr>
              ) : rows.map((row) => (
                <tr key={row._id} className="hover:bg-gray-50">
                  <td className={TD}>
                    <div className="font-medium text-[#111827]">{row.description}</div>
                    <div className="text-[11px] text-[#536173] font-mono">{row.code}</div>
                  </td>
                  <td className={`${TD} text-[#536173]`}>{row.category || '-'}</td>
                  <td className={`${TD} text-[#536173]`}>{row.unit || '-'}</td>
                  <td className={`${TD} font-semibold text-[#111827]`}>{Number(row.stock || 0).toLocaleString('en-IN')}</td>
                  <td className={`${TD} text-[#536173]`}>{Number(row.minStockLevel || 0).toLocaleString('en-IN')}</td>
                  <td className={`${TD} text-green-700`}>{Number(row.stockInQty || 0).toLocaleString('en-IN')}</td>
                  <td className={`${TD} text-red-700`}>{Number(row.stockOutQty || 0).toLocaleString('en-IN')}</td>
                  <td className={`${TD} font-medium text-[#111827]`}>{formatCurrency(row.stockValue || 0)}</td>
                  <td className={TD}><StatusBadge status={row.stockStatus} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-[#edf2f7] flex flex-wrap justify-between gap-2 text-[13px] text-[#536173]">
          <span>Showing {rows.length === 0 ? 0 : (page - 1) * LIMIT + 1} to {(page - 1) * LIMIT + rows.length} of {total} products</span>
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
