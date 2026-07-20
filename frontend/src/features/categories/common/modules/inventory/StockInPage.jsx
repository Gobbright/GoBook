import { useCallback, useEffect, useState } from 'react';

import { DateRangeFilter } from '../../../../../components/forms/DateRangeFilter.jsx';
import { ExportButtons } from '../../../../../components/forms/ExportButtons.jsx';
import { api } from '../../../../../services/api.js';
import { dateRangeParams } from '../../../../../utils/dateRange.js';

const TH = 'text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-5 py-3 border-b border-[#edf2f7]';
const TD = 'px-5 py-3.5 border-b border-[#f3f4f6] text-[13px]';
const INPUT = 'border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] w-full outline-none focus:border-blue-500 font-[inherit]';
const LABEL = 'block text-[12px] font-medium text-[#374151] mb-1';

const EditIcon = () => (
  <svg fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const TrashIcon = () => (
  <svg fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14H6L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4h6v2"/>
  </svg>
);

function formatINR(v) { return '₹ ' + Number(v).toLocaleString('en-IN'); }
function toInputDate(d) { if (!d) return ''; return new Date(d).toISOString().slice(0, 10); }
function formatDate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }

function EditModal({ entry, onSave, onClose }) {
  const [form, setForm] = useState({ ...entry, date: toInputDate(entry.date) });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.supplier.trim()) return setErr('Supplier is required');
    setSaving(true);
    setErr('');
    try {
      const payload = { ...form, itemCount: Number(form.itemCount), totalQty: Number(form.totalQty), totalValue: Number(form.totalValue) };
      const result = await api.invUpdateStockIn(entry._id, payload);
      onSave(result);
    } catch (e) {
      setErr(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-130 mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#edf2f7]">
          <h2 className="text-[16px] font-bold text-[#111827]">Edit Stock In</h2>
          <button onClick={onClose} className="text-[#536173] hover:text-[#111827] bg-transparent border-0 cursor-pointer text-lg leading-none">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4">
          {err && <div className="mb-3 px-3 py-2 bg-red-50 text-red-600 text-[12px] rounded-md">{err}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Stock In No.</label>
              <input className={`${INPUT} bg-gray-50 text-[#536173]`} value={form.stockInNo} readOnly />
            </div>
            <div>
              <label className={LABEL}>Date</label>
              <input className={INPUT} type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL}>Product Name</label>
              <input className={INPUT} value={form.productName || ''} onChange={(e) => set('productName', e.target.value)} placeholder="e.g. Widget A" />
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL}>Supplier *</label>
              <input className={INPUT} value={form.supplier} onChange={(e) => set('supplier', e.target.value)} />
            </div>
            <div>
              <label className={LABEL}>No. of Items</label>
              <input className={INPUT} type="number" min="0" value={form.itemCount} onChange={(e) => set('itemCount', e.target.value)} />
            </div>
            <div>
              <label className={LABEL}>Total Quantity</label>
              <input className={INPUT} type="number" min="0" value={form.totalQty} onChange={(e) => set('totalQty', e.target.value)} />
            </div>
            <div>
              <label className={LABEL}>Total Value (₹)</label>
              <input className={INPUT} type="number" min="0" step="0.01" value={form.totalValue} onChange={(e) => set('totalValue', e.target.value)} />
            </div>
            <div>
              <label className={LABEL}>Status</label>
              <select className={INPUT} value={form.status} onChange={(e) => set('status', e.target.value)}>
                <option>Pending</option>
                <option>Completed</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-5 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[13px] font-medium text-[#374151] bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit]">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit] disabled:opacity-60">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function StockInPage() {
  const [search, setSearch]   = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');
  const [records, setRecords] = useState([]);
  const [stats, setStats]     = useState(null);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [editing, setEditing] = useState(null);

  const LIMIT = 5;

  const fetchAllForExport = useCallback(async () => {
    const params = { page: 1, limit: 9999, ...dateRangeParams(dateFrom, dateTo) };
    if (search) params.search = search;
    const res = await api.invListStockIn(params);
    return res.data ?? [];
  }, [dateFrom, dateTo, search]);

  function loadStats() { api.invStockInStats().then(setStats).catch(() => {}); }

  function loadRecords() {
    setLoading(true);
    setError('');
    const params = { page, limit: LIMIT, ...dateRangeParams(dateFrom, dateTo) };
    if (search) params.search = search;
    api.invListStockIn(params)
      .then((res) => { setRecords(res.data); setTotal(res.total); })
      .catch(() => setError('Failed to load stock-in records'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadStats(); }, []);
  useEffect(() => { loadRecords(); }, [dateFrom, dateTo, search, page]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSaved(updated) {
    setEditing(null);
    setRecords((prev) => prev.map((r) => (r._id === updated._id ? updated : r)));
    loadStats();
  }

  function handleDelete(id) {
    if (!window.confirm('Delete this stock-in record?')) return;
    api.invDeleteStockIn(id)
      .then(() => { setRecords((prev) => prev.filter((r) => r._id !== id)); loadStats(); })
      .catch(() => alert('Failed to delete record'));
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const exportColumns = [
    { label: 'Stock In No.', value: (row) => row.stockInNo },
    { label: 'Date', value: (row) => formatDate(row.date) },
    { label: 'Product Name', value: (row) => row.productName || '' },
    { label: 'Supplier', value: (row) => row.supplier },
    { label: 'Items', value: (row) => row.itemCount },
    { label: 'Total Quantity', value: (row) => row.totalQty },
    { label: 'Total Value', value: (row) => formatINR(row.totalValue) },
    { label: 'Status', value: (row) => row.status },
  ];

  return (
    <div className="p-7">
      {editing && <EditModal entry={editing} onSave={handleSaved} onClose={() => setEditing(null)} />}

      <div className="mb-5">
        <h1 className="m-0 text-[22px] font-bold text-[#111827]">Stock In</h1>
        <p className="m-0 text-[13px] text-[#536173] mt-0.5">Stock receipts are recorded automatically when products are added or restocked</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Total Stock In',value: stats ? stats.totalStockIn.toLocaleString('en-IN') : '—', sub: 'This Month', color: '#2563eb', bg: '#eff6ff', icon: <svg fill="none" height="20" stroke="#2563eb" strokeWidth="2" viewBox="0 0 24 24" width="20"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg> },
          { label: 'Total Items',    value: stats ? stats.totalItems.toLocaleString('en-IN') : '—',   sub: 'This Month', color: '#16a34a', bg: '#f0fdf4', icon: <svg fill="none" height="20" stroke="#16a34a" strokeWidth="2" viewBox="0 0 24 24" width="20"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg> },
          { label: 'Total Value',    value: stats ? formatINR(stats.totalValue) : '—',                sub: 'This Month', color: '#7c3aed', bg: '#f5f3ff', icon: <svg fill="none" height="20" stroke="#7c3aed" strokeWidth="2" viewBox="0 0 24 24" width="20"><line x1="12" x2="12" y1="1" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg> },
          { label: 'Avg. Cost',      value: stats ? formatINR(Math.round(stats.avgCost * 100) / 100) : '—', sub: 'Per Item', color: '#0891b2', bg: '#ecfeff', icon: <svg fill="none" height="20" stroke="#0891b2" strokeWidth="2" viewBox="0 0 24 24" width="20"><line x1="12" x2="12" y1="1" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg> },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-[#dfe7f1] rounded-xl p-4 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-none" style={{ background: s.bg }}>{s.icon}</div>
            <div>
              <div className="text-xs text-[#536173] mb-0.5">{s.label}</div>
              <div className="text-[17px] font-bold leading-tight" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-[#536173] mt-0.5">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-[#dfe7f1] rounded-xl">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[#edf2f7] flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#536173]" fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>
            <input className="border border-[#dbe4ef] rounded-md pl-8 pr-3 py-2 text-[13px] w-full outline-none focus:border-blue-500 font-[inherit]" placeholder="Search stock in..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <DateRangeFilter
            from={dateFrom}
            to={dateTo}
            onFromChange={(value) => { setDateFrom(value); setPage(1); }}
            onToChange={(value) => { setDateTo(value); setPage(1); }}
            onClear={() => { setDateFrom(''); setDateTo(''); setPage(1); }}
          />
          <ExportButtons title="Stock In" filename="stock-in" rows={records} columns={exportColumns} fetchRows={fetchAllForExport} />
        </div>

        {error && <div className="px-5 py-4 text-[13px] text-red-600">{error}</div>}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={TH}>Stock In No.</th>
                <th className={TH}>Date</th>
                <th className={TH}>Product Name</th>
                <th className={TH}>Supplier</th>
                <th className={TH}>Items</th>
                <th className={TH}>Total Quantity</th>
                <th className={TH}>Total Value</th>
                <th className={TH}>Status</th>
                <th className={TH}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-5 py-8 text-center text-[13px] text-[#536173]">Loading...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={9} className="px-5 py-10 text-center text-[13px] text-[#536173]">
                  <div className="flex flex-col items-center gap-2">
                    <svg fill="none" height="32" stroke="#d1d5db" strokeWidth="1.5" viewBox="0 0 24 24" width="32"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                    <span>No stock-in records yet. Add products or increase stock to generate entries automatically.</span>
                  </div>
                </td></tr>
              ) : records.map((row) => (
                <tr key={row._id} className="hover:bg-gray-50">
                  <td className={TD}>
                    <span className="text-blue-600 font-medium">{row.stockInNo}</span>
                    {row.sourceNo && <div className="mt-1 text-[11px] font-semibold text-green-700 bg-green-50 inline-flex rounded px-1.5 py-0.5">From {row.sourceNo}</div>}
                  </td>
                  <td className={`${TD} text-[#536173]`}>{formatDate(row.date)}</td>
                  <td className={`${TD} text-[#111827]`}>{row.productName || '—'}</td>
                  <td className={`${TD} text-[#536173]`}>{row.supplier}</td>
                  <td className={`${TD} text-[#111827]`}>{row.itemCount}</td>
                  <td className={`${TD} text-[#111827]`}>{row.totalQty}</td>
                  <td className={`${TD} font-medium text-[#111827]`}>{formatINR(row.totalValue)}</td>
                  <td className={TD}>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${row.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{row.status}</span>
                  </td>
                  <td className={TD}>
                    <div className="flex items-center gap-1.5">
                      <button disabled={Boolean(row.sourceType && row.sourceId)} onClick={() => setEditing(row)} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 cursor-pointer font-[inherit] disabled:opacity-40 disabled:cursor-not-allowed"><EditIcon /> Edit</button>
                      <button disabled={Boolean(row.sourceType && row.sourceId)} onClick={() => handleDelete(row._id)} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 cursor-pointer font-[inherit] disabled:opacity-40 disabled:cursor-not-allowed"><TrashIcon /> Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-[#edf2f7] flex flex-wrap justify-between gap-2 text-[13px] text-[#536173]">
          <span>Showing {records.length === 0 ? 0 : (page - 1) * LIMIT + 1} to {(page - 1) * LIMIT + records.length} of {total} entries</span>
          <div className="flex items-center gap-1 flex-wrap">
            <button className="px-2.5 py-1 rounded border border-[#dbe4ef] hover:bg-gray-50 text-[12px] bg-white font-[inherit] cursor-pointer disabled:opacity-40" type="button" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>←</button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
              <button key={p} className={`px-2.5 py-1 rounded text-[12px] font-[inherit] cursor-pointer border ${p === page ? 'bg-blue-600 text-white border-blue-600' : 'border-[#dbe4ef] hover:bg-gray-50 bg-white'}`} type="button" onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="px-2.5 py-1 rounded border border-[#dbe4ef] hover:bg-gray-50 text-[12px] bg-white font-[inherit] cursor-pointer disabled:opacity-40" type="button" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>→</button>
          </div>
        </div>
      </div>
    </div>
  );
}
