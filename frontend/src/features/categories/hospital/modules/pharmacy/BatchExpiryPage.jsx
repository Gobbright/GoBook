import { useEffect, useMemo, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock3,
  Eye,
  History,
  PackageSearch,
  Search,
  ShieldAlert,
} from 'lucide-react';

import { api } from '../../../../../services/api.js';
import { useModuleRecords } from '../../../shared/recordUi/useModuleRecords.js';

const INPUT = 'h-10 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-[inherit] text-[#111827] outline-none focus:border-blue-500';
const TH = 'px-4 py-3 text-left text-[11px] font-extrabold uppercase text-[#536173]';
const TD = 'border-t border-[#edf2f7] px-4 py-3 text-[13px]';
const EXPIRY_FILTERS = ['All', 'Expired', '< 30 Days', '31-60 Days', '61-90 Days', '> 90 Days'];
const STOCK_FILTERS = ['Stock', 'Low Stock', 'Available', 'Out of Stock'];
const LOW_STOCK_LEVEL = 10;


function normalize(value = '') {
  return String(value || '').trim().toLowerCase();
}

function asNumber(value) {
  return Number(value || 0);
}

function daysUntil(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(23, 59, 59, 999);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((date - now) / 86400000);
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
}

function money(value) {
  return `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;
}

function statusOf(batch) {
  const days = daysUntil(batch.expiryDate);
  if (days != null && days < 0) return 'EXPIRED';
  if (days != null && days <= 30) return 'EXPIRING SOON';
  if (asNumber(batch.currentQty) <= 0) return 'OUT OF STOCK';
  if (asNumber(batch.currentQty) <= LOW_STOCK_LEVEL) return 'LOW STOCK';
  return 'GOOD';
}

function statusTone(status) {
  if (status === 'EXPIRED') return 'border-red-200 bg-red-50 text-red-700';
  if (status === 'EXPIRING SOON') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (status === 'LOW STOCK' || status === 'OUT OF STOCK') return 'border-blue-200 bg-blue-50 text-blue-700';
  return 'border-emerald-200 bg-emerald-50 text-emerald-700';
}

function normalizeBatch(record) {
  const data = record.data || record;
  const quantity = asNumber(data.quantity ?? data.stock ?? data.currentQty);
  const received = asNumber(data.receivedQty || data.openingStock || data.totalReceived || quantity);
  const soldIssued = asNumber(data.soldIssued || Math.max(0, received - quantity));
  return {
    id: record._id || data.id,
    raw: data,
    source: record.data ? 'pharmacy-stock' : 'inventory',
    medicine: data.medicineName || data.description || data.name || data.productName || 'Medicine',
    batch: data.batchNumber || data.batchNo || data.batch || 'MAIN',
    manufacturer: data.manufacturer || data.brandName || data.brand || data.supplierName || '-',
    mfgDate: data.mfgDate || data.manufacturingDate || data.receivedDate || '',
    expiryDate: data.expiryDate || data.expiry || '',
    mrp: asNumber(data.mrp || data.maximumRetailPrice),
    purchaseRate: asNumber(data.purchaseRate || data.costPrice || data.buyingPrice),
    sellingRate: asNumber(data.sellingRate || data.rate || data.sellingPrice || data.price),
    receivedQty: received,
    soldIssued,
    currentQty: quantity,
    location: data.location || data.rackLocation || data.rack || data.warehouseName || 'Pharmacy',
  };
}

function StatCard({ label, value, tone, icon: Icon }) {
  const tones = {
    red: 'border-red-200 bg-red-50 text-red-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
  };
  return (
    <div className={`rounded-lg border p-4 ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[26px] font-extrabold leading-none">{value}</div>
          <div className="mt-2 text-[13px] font-extrabold">{label}</div>
        </div>
        <Icon size={19} />
      </div>
    </div>
  );
}

export function BatchExpiryPage() {
  const pharmacyStock = useModuleRecords('hospital/pharmacy-stock');
  const [inventoryRows, setInventoryRows] = useState([]);
  const [inventoryError, setInventoryError] = useState('');
  const [search, setSearch] = useState('');
  const [expiryFilter, setExpiryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('Expiry');
  const [stockFilter, setStockFilter] = useState('Stock');
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    api.invListProducts({ page: 1, limit: 500, itemType: 'Product' })
      .then((res) => {
        const rows = Array.isArray(res) ? res : res.data || res.records || res.items || [];
        setInventoryRows(rows.map(normalizeBatch));
      })
      .catch((err) => {
        setInventoryRows([]);
        setInventoryError(err.message || 'Inventory products could not be loaded.');
      });
  }, []);

  const batches = useMemo(() => {
    const moduleBatches = pharmacyStock.records.map(normalizeBatch);
    const source = moduleBatches.length ? moduleBatches : inventoryRows;
    return source
      .sort((a, b) => (daysUntil(a.expiryDate) ?? 99999) - (daysUntil(b.expiryDate) ?? 99999));
  }, [inventoryRows, pharmacyStock.records]);

  const stats = useMemo(() => ({
    expired: batches.filter((batch) => statusOf(batch) === 'EXPIRED').length,
    soon: batches.filter((batch) => {
      const days = daysUntil(batch.expiryDate);
      return days != null && days >= 0 && days <= 30;
    }).length,
    low: batches.filter((batch) => asNumber(batch.currentQty) > 0 && asNumber(batch.currentQty) <= LOW_STOCK_LEVEL).length,
  }), [batches]);

  const filtered = useMemo(() => {
    const q = normalize(search);
    return batches.filter((batch) => {
      const days = daysUntil(batch.expiryDate);
      const status = statusOf(batch);
      const matchesSearch = !q || normalize([batch.medicine, batch.batch, batch.manufacturer, batch.location].filter(Boolean).join(' ')).includes(q);
      const matchesExpiry =
        expiryFilter === 'All'
        || (expiryFilter === 'Expired' && days != null && days < 0)
        || (expiryFilter === '< 30 Days' && days != null && days >= 0 && days <= 30)
        || (expiryFilter === '31-60 Days' && days != null && days >= 31 && days <= 60)
        || (expiryFilter === '61-90 Days' && days != null && days >= 61 && days <= 90)
        || (expiryFilter === '> 90 Days' && (days == null || days > 90));
      const matchesStatus = statusFilter === 'Expiry' || status === statusFilter;
      const matchesStock =
        stockFilter === 'Stock'
        || (stockFilter === 'Low Stock' && asNumber(batch.currentQty) > 0 && asNumber(batch.currentQty) <= LOW_STOCK_LEVEL)
        || (stockFilter === 'Available' && asNumber(batch.currentQty) > LOW_STOCK_LEVEL)
        || (stockFilter === 'Out of Stock' && asNumber(batch.currentQty) <= 0);
      return matchesSearch && matchesExpiry && matchesStatus && matchesStock;
    });
  }, [batches, expiryFilter, search, statusFilter, stockFilter]);

  const selected = batches.find((batch) => batch.id === selectedId) || filtered[0] || batches[0] || null;
  const fefo = batches.find((batch) => normalize(batch.medicine) === normalize(selected?.medicine) && statusOf(batch) !== 'EXPIRED' && asNumber(batch.currentQty) > 0);
  const selectedStatus = selected ? statusOf(selected) : 'GOOD';

  return (
    <div className="p-4 md:p-7">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 text-[13px] font-semibold text-[#64748b]">Home &gt; Pharmacy &gt; Batch & Expiry</div>
          <h1 className="m-0 text-[26px] font-extrabold text-[#071936]">Batch & Expiry</h1>
          <p className="m-0 mt-1 text-[13px] font-semibold text-[#64748b]">Pharmacy-specific batch monitoring. Stock transactions stay in common Inventory.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-[12px] font-extrabold text-red-700"><Ban size={14} />Expired stock blocks sale and dispensing</span>
      </div>

      {inventoryError && <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-semibold text-amber-800">{inventoryError} Showing pharmacy stock or demo batches.</div>}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="rounded-lg border border-[#dfe7f1] bg-white">
          <div className="grid gap-3 border-b border-[#edf2f7] p-4 md:grid-cols-3">
            <StatCard label="Expired" value={stats.expired} tone="red" icon={AlertOctagon} />
            <StatCard label="< 30 Days" value={stats.soon} tone="amber" icon={Clock3} />
            <StatCard label="Low Stock" value={stats.low} tone="blue" icon={PackageSearch} />
          </div>

          <div className="grid gap-3 border-b border-[#edf2f7] p-4 lg:grid-cols-[minmax(260px,1fr)_150px_150px_150px]">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
              <input className="h-10 w-full rounded-md border border-[#dbe4ef] bg-white pl-9 pr-3 text-[13px] font-[inherit] outline-none focus:border-blue-500" placeholder="Medicine / Batch" value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
            <select className={INPUT} value={expiryFilter} onChange={(event) => setExpiryFilter(event.target.value)}>{EXPIRY_FILTERS.map((item) => <option key={item}>{item}</option>)}</select>
            <select className={INPUT} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>{['Expiry', 'EXPIRED', 'EXPIRING SOON', 'LOW STOCK', 'GOOD'].map((item) => <option key={item}>{item}</option>)}</select>
            <select className={INPUT} value={stockFilter} onChange={(event) => setStockFilter(event.target.value)}>{STOCK_FILTERS.map((item) => <option key={item}>{item}</option>)}</select>
          </div>

          <div className="flex flex-wrap gap-2 border-b border-[#edf2f7] px-4 py-3">
            {EXPIRY_FILTERS.slice(1).map((item) => (
              <button key={item} type="button" onClick={() => setExpiryFilter(item)} className={`h-8 rounded-full border px-3 text-[12px] font-extrabold ${expiryFilter === item ? 'border-blue-600 bg-blue-600 text-white' : 'border-[#dbe4ef] bg-white text-[#334155] hover:bg-blue-50'}`}>
                {item}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead className="bg-[#f8fbff]">
                <tr>
                  <th className={TH}>Medicine</th>
                  <th className={TH}>Batch</th>
                  <th className={TH}>Expiry</th>
                  <th className={TH}>Qty</th>
                  <th className={TH}>Status</th>
                  <th className={TH}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((batch) => {
                  const status = statusOf(batch);
                  return (
                    <tr key={batch.id} className={`cursor-pointer ${selected?.id === batch.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`} onClick={() => setSelectedId(batch.id)}>
                      <td className={`${TD} font-extrabold text-[#071936]`}>{batch.medicine}</td>
                      <td className={`${TD} font-mono font-semibold text-[#334155]`}>{batch.batch}</td>
                      <td className={`${TD} font-semibold ${status === 'EXPIRED' ? 'text-red-600' : status === 'EXPIRING SOON' ? 'text-amber-600' : 'text-[#334155]'}`}>{formatDate(batch.expiryDate)}</td>
                      <td className={`${TD} font-extrabold text-[#071936]`}>{batch.currentQty}</td>
                      <td className={TD}><span className={`rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${statusTone(status)}`}>{status}</span></td>
                      <td className={TD}>
                        <button type="button" className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#dbe4ef] bg-white px-2.5 text-[12px] font-bold text-[#334155] hover:bg-gray-50" onClick={(event) => { event.stopPropagation(); setSelectedId(batch.id); }}>
                          <Eye size={13} /> Detail
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </main>

        <aside className="space-y-5">
          {selected && (
            <section className="rounded-lg border border-[#dfe7f1] bg-white p-4">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="m-0 text-[18px] font-extrabold uppercase text-[#071936]">{selected.medicine}</h2>
                  <p className="m-0 mt-1 text-[12px] font-semibold text-[#64748b]">Batch detail</p>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${statusTone(selectedStatus)}`}>{selectedStatus}</span>
              </div>

              <div className="grid gap-y-3 text-[13px]">
                {[
                  ['Batch No', selected.batch],
                  ['Manufacturer', selected.manufacturer],
                  ['Mfg Date', formatDate(selected.mfgDate)],
                  ['Expiry Date', formatDate(selected.expiryDate)],
                  ['MRP', money(selected.mrp)],
                  ['Purchase Rate', money(selected.purchaseRate)],
                  ['Selling Rate', money(selected.sellingRate)],
                  ['Received Qty', selected.receivedQty],
                  ['Sold/Issued', selected.soldIssued],
                  ['Current Qty', selected.currentQty],
                ].map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[120px_1fr] gap-3">
                    <span className="font-semibold text-[#64748b]">{label}</span>
                    <strong className="text-[#071936]">{value || '-'}</strong>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-md border border-[#dbe4ef] bg-[#f8fbff] p-3">
                <div className="text-[12px] font-extrabold uppercase text-[#536173]">Location</div>
                <div className="mt-1 text-[13px] font-extrabold text-[#071936]">{selected.location}</div>
              </div>

              <div className="my-5 h-px bg-[#edf2f7]" />

              <div className="space-y-3 text-[13px] font-semibold text-[#334155]">
                {selectedStatus === 'EXPIRED' ? (
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-red-700">
                    <div className="mb-1 flex items-center gap-2 font-extrabold"><ShieldAlert size={15} />EXPIRED</div>
                    <div>BLOCK SALE. BLOCK DISPENSING.</div>
                  </div>
                ) : (
                  <div className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 text-emerald-600" />Allowed for sale/dispensing if selected by FEFO and stock remains.</div>
                )}
                <div className="flex gap-2"><AlertTriangle size={16} className="mt-0.5 text-amber-600" />FEFO recommendation: {fefo?.batch || 'No usable batch available'}.</div>
              </div>

              <a href={`/stock-ledger?search=${encodeURIComponent(selected.medicine)}`} className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-extrabold text-[#334155] no-underline hover:bg-gray-50">
                <History size={15} />View Stock History
              </a>
            </section>
          )}

          <section className="rounded-lg border border-[#dfe7f1] bg-white p-4">
            <div className="mb-3 text-[15px] font-extrabold text-[#071936]">Responsibility Split</div>
            <div className="space-y-2 text-[13px] font-semibold text-[#334155]">
              <div><strong>Prescriptions:</strong> what doctor prescribed.</div>
              <div><strong>Medicine Dispensing:</strong> what pharmacy issued.</div>
              <div><strong>Returns:</strong> medicines returned.</div>
              <div><strong>Batch & Expiry:</strong> monitoring only.</div>
              <div><strong>Pharmacy Billing:</strong> price, tax, payment, invoice.</div>
              <div><strong>Inventory:</strong> stock, purchase, suppliers, adjustments.</div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

