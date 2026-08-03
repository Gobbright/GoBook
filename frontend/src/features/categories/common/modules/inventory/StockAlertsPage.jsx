import { useEffect, useState } from 'react';

import { api } from '../../../../../services/api.js';

const TH = 'text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-5 py-3 border-b border-[#edf2f7]';
const TD = 'px-5 py-3.5 border-b border-[#f3f4f6] text-[13px]';

const BellIcon = ({ color }) => (
  <svg fill="none" height="13" stroke={color} strokeWidth="2" viewBox="0 0 24 24" width="13">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 01-3.46 0"/>
  </svg>
);

function StatusBadge({ status }) {
  if (status === 'Out of Stock') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-600">
        {status}
      </span>
    );
  }
  if (status === 'Not Tracked') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600">
        {status}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-100 text-orange-600">
      {status}
    </span>
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

export function StockAlertsPage() {
  const [search, setSearch]   = useState('');
  const [itemType, setItemType] = useState('Product');
  const [alerts, setAlerts]   = useState([]);
  const [stats, setStats]     = useState(null);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const LIMIT = 50;

  useEffect(() => {
    api.invAlertStats({ itemType })
      .then(setStats)
      .catch(() => {});
  }, [itemType]);

  useEffect(() => {
    setLoading(true);
    setError('');
    const params = { page, limit: LIMIT, itemType };
    if (search) params.search = search;
    api.invListAlerts(params)
      .then((res) => { setAlerts(res.data); setTotal(res.total); })
      .catch(() => setError('Failed to load stock alerts'))
      .finally(() => setLoading(false));
  }, [search, itemType, page]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="p-4 md:p-7">
      <div className="flex justify-between items-start gap-4 mb-5">
        <div>
          <h1 className="m-0 text-[22px] font-bold text-[#111827]">Stock Alerts</h1>
          <p className="m-0 text-[13px] text-[#536173] mt-0.5">Monitor low stock, out of stock and expiry alerts</p>
        </div>
      </div>

      {itemType === 'Service' && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 text-[13px] rounded-xl px-4 py-3 mb-5">
          Services aren't stock-tracked, so low/out-of-stock alerts don't apply — this tab just lists your active services.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {[
          {
            label: 'Low Stock Items', value: stats ? stats.lowStock.toLocaleString('en-IN') : '—', sub: 'Need Attention',
            color: '#f59e0b', bg: '#fffbeb',
            icon: <svg fill="none" height="20" stroke="#f59e0b" strokeWidth="2" viewBox="0 0 24 24" width="20"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>,
          },
          {
            label: 'Out of Stock Items', value: stats ? stats.outOfStock.toLocaleString('en-IN') : '—', sub: 'Out of Stock',
            color: '#ef4444', bg: '#fef2f2',
            icon: <svg fill="none" height="20" stroke="#ef4444" strokeWidth="2" viewBox="0 0 24 24" width="20"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>,
          },
          {
            label: 'Expiring Soon', value: stats ? stats.expiringSoon.toLocaleString('en-IN') : '—', sub: 'Within 30 Days',
            color: '#f97316', bg: '#fff7ed',
            icon: <svg fill="none" height="20" stroke="#f97316" strokeWidth="2" viewBox="0 0 24 24" width="20"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
          },
          {
            label: 'Expired Items', value: stats ? stats.expired.toLocaleString('en-IN') : '—', sub: 'Expired',
            color: '#6b7280', bg: '#f3f4f6',
            icon: <svg fill="none" height="20" stroke="#6b7280" strokeWidth="2" viewBox="0 0 24 24" width="20"><rect height="14" rx="2" ry="2" width="18" x="3" y="4"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><line x1="10" x2="14" y1="14" y2="14"/></svg>,
          },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-[#dfe7f1] rounded-xl p-4 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-none" style={{ background: s.bg }}>
              {s.icon}
            </div>
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
          <ItemTypeTabs value={itemType} onChange={(t) => { setItemType(t); setPage(1); }} />
          <div className="relative flex-1 max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#536173]" fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13">
              <circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/>
            </svg>
            <input
              className="border border-[#dbe4ef] rounded-md pl-8 pr-3 py-2 text-[13px] w-full outline-none focus:border-blue-500 font-[inherit]"
              placeholder="Search alerts..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>

        {error && (
          <div className="px-5 py-4 text-[13px] text-red-600">{error}</div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={TH}>Product Name</th>
                <th className={TH}>SKU / Code</th>
                <th className={TH}>Current Stock</th>
                <th className={TH}>Min. Stock Level</th>
                <th className={TH}>Status</th>
                <th className={TH}>Alert Type</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-[13px] text-[#536173]">Loading...</td></tr>
              ) : alerts.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-[13px] text-green-600">No stock alerts — all products are well stocked!</td></tr>
              ) : alerts.map((row) => (
                <tr key={row._id} className="hover:bg-gray-50">
                  <td className={`${TD} font-medium text-[#111827]`}>{row.description}</td>
                  <td className={`${TD} text-[#536173]`}>{row.code}</td>
                  <td className={`${TD} font-medium ${row.stock === 0 ? 'text-red-500' : 'text-orange-500'}`}>{row.stock}</td>
                  <td className={`${TD} text-[#536173]`}>{row.minStockLevel}</td>
                  <td className={TD}><StatusBadge status={row.alertStatus} /></td>
                  <td className={`${TD} text-[#536173]`}>{row.alertStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-[#edf2f7] flex flex-wrap justify-between gap-2 text-[13px] text-[#536173]">
          <span>Showing {alerts.length === 0 ? 0 : (page - 1) * LIMIT + 1} to {(page - 1) * LIMIT + alerts.length} of {total} alerts</span>
          <div className="flex items-center gap-1 flex-wrap">
            <button
              className="px-2.5 py-1 rounded border border-[#dbe4ef] hover:bg-gray-50 text-[12px] bg-white font-[inherit] cursor-pointer disabled:opacity-40"
              type="button"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >←</button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                className={`px-2.5 py-1 rounded text-[12px] font-[inherit] cursor-pointer border ${p === page ? 'bg-blue-600 text-white border-blue-600' : 'border-[#dbe4ef] hover:bg-gray-50 bg-white'}`}
                type="button"
                onClick={() => setPage(p)}
              >{p}</button>
            ))}
            <button
              className="px-2.5 py-1 rounded border border-[#dbe4ef] hover:bg-gray-50 text-[12px] bg-white font-[inherit] cursor-pointer disabled:opacity-40"
              type="button"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >→</button>
          </div>
        </div>
      </div>
    </div>
  );
}
