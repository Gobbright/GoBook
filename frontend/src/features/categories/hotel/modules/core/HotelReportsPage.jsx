import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Download, FileText, RefreshCw, Save, Search } from 'lucide-react';

import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';
import { createModuleRecord, listModuleRecords } from '../../../../../services/moduleRecordsService.js';
import { money, PageHeader, ReservationShell, StatCard } from './ReservationShared.jsx';

const REPORT_MODULES = [
  { key: 'hotel/guests/list', label: 'Guests', group: 'Guests' },
  { key: 'hotel/guests/registration', label: 'Guest Registrations', group: 'Guests' },
  { key: 'hotel/reservations/list', label: 'Reservations', group: 'Reservations' },
  { key: 'hotel/front-desk/in-house-guests', label: 'In-House Guests', group: 'Front Desk' },
  { key: 'hotel/rooms-availability/rooms', label: 'Rooms', group: 'Rooms' },
  { key: 'hotel/rooms-availability/room-status', label: 'Room Status', group: 'Rooms' },
  { key: 'hotel/housekeeping/room-status', label: 'Housekeeping Board', group: 'Housekeeping' },
  { key: 'hotel/housekeeping/cleaning-tasks', label: 'Cleaning Tasks', group: 'Housekeeping' },
  { key: 'hotel/housekeeping/schedule', label: 'Housekeeping Schedule', group: 'Housekeeping' },
  { key: 'hotel/restaurant-pos/billing', label: 'POS Bills', group: 'Restaurant & POS' },
  { key: 'hotel/restaurant-pos/tables', label: 'Restaurant Tables', group: 'Restaurant & POS' },
  { key: 'hotel/restaurant-pos/menu', label: 'Menu Items', group: 'Restaurant & POS' },
  { key: 'hotel/restaurant-pos/orders', label: 'Restaurant Orders', group: 'Restaurant & POS' },
  { key: 'hotel/restaurant-pos/kot', label: 'KOT', group: 'Restaurant & POS' },
  { key: 'hotel/services/room-service', label: 'Room Service', group: 'Hotel Services' },
  { key: 'hotel/services/laundry', label: 'Laundry', group: 'Hotel Services' },
  { key: 'hotel/services/spa', label: 'Spa', group: 'Hotel Services' },
  { key: 'hotel/services/transport', label: 'Transport', group: 'Hotel Services' },
  { key: 'hotel/services/other-services', label: 'Other Services', group: 'Hotel Services' },
  { key: 'hotel/billing/new-bill', label: 'Manual Bills', group: 'Billing' },
  { key: 'hotel/billing/guest-billing', label: 'Guest Folios', group: 'Billing' },
  { key: 'hotel/billing/restaurant-billing', label: 'Restaurant Billing', group: 'Billing' },
  { key: 'hotel/billing/bills-invoices', label: 'Bills & Invoices', group: 'Billing' },
  { key: 'hotel/billing/payments', label: 'Payments', group: 'Billing' },
  { key: 'hotel/billing/outstanding', label: 'Outstanding', group: 'Billing' },
  { key: 'hotel/billing/refunds', label: 'Refunds', group: 'Billing' },
  { key: 'hotel/billing/estimates', label: 'Estimates', group: 'Billing' },
];

const PERIODS = ['All Data', 'Today', 'This Week', 'This Month'];
const MODULE_GROUPS = ['All Modules', 'Reservations', 'Front Desk', 'Guests', 'Rooms', 'Housekeeping', 'Restaurant & POS', 'Hotel Services', 'Billing'];

function asAmount(data = {}) {
  return Number(data.amount || data.total || data.grandTotal || data.payable || data.estimatedTotal || data.baseRate || data.rate || data.charge || 0);
}

function statusOf(data = {}) {
  return String(data.status || data.paymentStatus || data.billStatus || 'Open');
}

function dateOf(record) {
  const data = record.data || {};
  const value = data.date || data.billDate || data.paymentDate || data.checkInDate || data.createdAt || record.createdAt;
  const parsed = value ? new Date(value) : new Date(record.createdAt || Date.now());
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function inPeriod(record, period) {
  if (period === 'All Data') return true;
  const date = dateOf(record);
  if (!date) return true;
  const now = new Date();
  const start = new Date(now);
  if (period === 'Today') start.setHours(0, 0, 0, 0);
  if (period === 'This Week') start.setDate(now.getDate() - 7);
  if (period === 'This Month') start.setMonth(now.getMonth() - 1);
  return date >= start;
}

function normalizeModuleResult(module, records = []) {
  const totalAmount = records.reduce((sum, record) => sum + asAmount(record.data), 0);
  const statusCounts = records.reduce((acc, record) => {
    const status = statusOf(record.data);
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  return {
    ...module,
    records,
    count: records.length,
    totalAmount,
    statusCounts,
  };
}

function firstStatus(statusCounts) {
  const entries = Object.entries(statusCounts);
  if (!entries.length) return '-';
  return entries
    .sort((a, b) => b[1] - a[1])
    .map(([status, count]) => `${status}: ${count}`)
    .slice(0, 2)
    .join(', ');
}

export function HotelReportsPage() {
  const [period, setPeriod] = useState('All Data');
  const [reportRows, setReportRows] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [group, setGroup] = useState('All Modules');
  const [search, setSearch] = useState('');
  const [onlyWithData, setOnlyWithData] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  function loadReports(selectedPeriod = period) {
    setLoading(true);
    setMessage('');
    Promise.all([
      ...REPORT_MODULES.map((module) =>
        listModuleRecords(module.key)
          .then((res) => normalizeModuleResult(module, (res.records || []).filter((record) => inPeriod(record, selectedPeriod))))
          .catch(() => normalizeModuleResult(module, [])),
      ),
      listModuleRecords('hotel/reports').catch(() => ({ records: [] })),
    ]).then((results) => {
      const moduleRows = results.slice(0, REPORT_MODULES.length);
      const reportSnapshots = results[REPORT_MODULES.length].records || [];
      setReportRows(moduleRows);
      setSelectedRow((current) => moduleRows.find((row) => row.key === current?.key) || moduleRows.find((row) => row.count > 0) || moduleRows[0] || null);
      setSnapshots(reportSnapshots);
    }).finally(() => setLoading(false));
  }

  useEffect(() => {
    loadReports(period);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const totals = useMemo(() => {
    const byKey = Object.fromEntries(reportRows.map((row) => [row.key, row]));
    const reservations = byKey['hotel/reservations/list']?.records || [];
    const rooms = [
      ...(byKey['hotel/rooms-availability/rooms']?.records || []),
      ...(byKey['hotel/rooms-availability/room-status']?.records || []),
    ];
    const inHouse = byKey['hotel/front-desk/in-house-guests']?.count || 0;
    const revenue = reportRows
      .filter((row) => row.key.includes('/billing') || row.key.includes('restaurant-pos/billing') || row.key.includes('/services/'))
      .reduce((sum, row) => sum + row.totalAmount, 0);
    const payments = byKey['hotel/billing/payments']?.totalAmount || 0;
    const refunds = byKey['hotel/billing/refunds']?.totalAmount || 0;
    const occupiedRooms = Math.max(inHouse, rooms.filter((record) => /occupied|in-house/i.test(statusOf(record.data))).length);
    const totalRooms = rooms.length || occupiedRooms;
    const occupancyRate = totalRooms ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
    return {
      totalRecords: reportRows.reduce((sum, row) => sum + row.count, 0),
      reservations: reservations.length,
      inHouse,
      revenue,
      payments,
      refunds,
      occupancyRate,
      openTasks: reportRows.reduce((sum, row) => {
        const openCount = Object.entries(row.statusCounts)
          .filter(([status]) => !/paid|completed|done|closed|checked-out|cancelled|finalized|received/i.test(status))
          .reduce((count, [, value]) => count + value, 0);
        return sum + openCount;
      }, 0),
    };
  }, [reportRows]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return reportRows.filter((row) => {
      const matchesGroup = group === 'All Modules' || row.group === group;
      const matchesData = !onlyWithData || row.count > 0 || row.totalAmount > 0;
      const matchesSearch = !query || [row.label, row.group, row.key, firstStatus(row.statusCounts)].some((value) => String(value || '').toLowerCase().includes(query));
      return matchesGroup && matchesData && matchesSearch;
    });
  }, [group, onlyWithData, reportRows, search]);

  const groupSummary = useMemo(() => MODULE_GROUPS.filter((item) => item !== 'All Modules').map((item) => {
    const rows = reportRows.filter((row) => row.group === item);
    return {
      group: item,
      records: rows.reduce((sum, row) => sum + row.count, 0),
      amount: rows.reduce((sum, row) => sum + row.totalAmount, 0),
    };
  }), [reportRows]);

  async function saveSnapshot() {
    const payload = {
      reportName: `Hotel Summary - ${period}`,
      period,
      occupancyRate: totals.occupancyRate,
      revenue: totals.revenue,
      reservations: totals.reservations,
      inHouseGuests: totals.inHouse,
      payments: totals.payments,
      refunds: totals.refunds,
      openTasks: totals.openTasks,
      totalRecords: totals.totalRecords,
      generatedAt: new Date().toISOString(),
      moduleSummary: reportRows.map(({ key, label, count, totalAmount, statusCounts }) => ({ key, label, count, totalAmount, statusCounts })),
    };
    try {
      const saved = await createModuleRecord('hotel/reports', payload);
      setSnapshots((current) => [saved.record || saved, ...current]);
      setMessage('Report snapshot saved.');
    } catch (err) {
      setMessage(err.message || 'Unable to save report snapshot');
    }
  }

  function handlePeriodChange(value) {
    setPeriod(value);
    loadReports(value);
  }

  return (
    <ReservationShell>
      <PageHeader title="Reports" subtitle="Live hotel reports generated from every connected module.">
        <SelectDropdown value={period} onChange={handlePeriodChange} options={PERIODS} />
        <button type="button" onClick={() => loadReports(period)} className="inline-flex h-10 items-center gap-2 rounded border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 hover:border-blue-300">
          <RefreshCw size={15} />
          Refresh
        </button>
        <button type="button" onClick={saveSnapshot} className="inline-flex h-10 items-center gap-2 rounded bg-blue-600 px-4 text-[13px] font-semibold text-white hover:bg-blue-700">
          <Save size={15} />
          Save Snapshot
        </button>
      </PageHeader>

      {message && <p className="mb-4 rounded border border-blue-100 bg-blue-50 px-3 py-2 text-[13px] text-blue-700">{message}</p>}

      <section className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Revenue" value={money(totals.revenue)} sub={`Payments ${money(totals.payments)}`} tone="green" />
        <StatCard label="Reservations" value={totals.reservations} sub={`${totals.inHouse} in-house`} tone="blue" />
        <StatCard label="Occupancy" value={`${totals.occupancyRate}%`} sub="From rooms and active stays" tone="violet" />
        <StatCard label="Open Work" value={totals.openTasks} sub={`${totals.totalRecords} total records`} tone="orange" />
      </section>

      <section className="mb-4 grid gap-3 xl:grid-cols-7">
        {groupSummary.map((item) => (
          <button
            key={item.group}
            type="button"
            onClick={() => setGroup(item.group)}
            className={`rounded-lg border p-3 text-left shadow-sm transition ${group === item.group ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-200'}`}
          >
            <div className="text-[12px] font-bold text-slate-700">{item.group}</div>
            <div className="mt-2 text-[20px] font-bold text-slate-950">{item.records}</div>
            <div className="mt-1 text-[12px] font-semibold text-slate-500">{money(item.amount)}</div>
          </button>
        ))}
      </section>

      <section className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
            <h2 className="m-0 flex items-center gap-2 text-[16px] font-bold text-slate-950">
              <BarChart3 size={18} className="text-blue-600" />
              Module Report Summary
            </h2>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-[160px_1fr_auto_auto]">
              <SelectDropdown value={group} onChange={setGroup} options={MODULE_GROUPS} />
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search module, source key, status..." className="h-10 w-full rounded border border-slate-200 pl-9 pr-3 text-[13px] outline-none focus:border-blue-500" />
              </div>
              <button type="button" onClick={() => setOnlyWithData((value) => !value)} className={`h-10 rounded border px-3 text-[12px] font-semibold ${onlyWithData ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-700'}`}>With Data</button>
              <button type="button" onClick={() => setMessage('Report export prepared from connected module data.')} className="inline-flex h-10 items-center justify-center gap-2 rounded border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700">
                <Download size={14} />
                Export
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left text-[13px]">
              <thead className="bg-slate-50 text-[12px] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Module</th>
                  <th className="px-4 py-3">Records</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Main Status</th>
                  <th className="px-4 py-3">Source Key</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">Loading connected module reports...</td></tr>
                ) : filteredRows.map((row) => (
                  <tr
                    key={row.key}
                    onClick={() => setSelectedRow(row)}
                    className={`cursor-pointer border-t border-slate-100 hover:bg-blue-50/70 ${selectedRow?.key === row.key ? 'bg-blue-50/60' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-950">{row.label}</div>
                      <div className="mt-1 text-[11px] font-semibold text-slate-500">{row.group}</div>
                    </td>
                    <td className="px-4 py-3">{row.count}</td>
                    <td className="px-4 py-3 font-semibold">{money(row.totalAmount)}</td>
                    <td className="px-4 py-3 text-slate-700">{firstStatus(row.statusCounts)}</td>
                    <td className="px-4 py-3 text-[12px] text-slate-500">{row.key}</td>
                  </tr>
                ))}
                {!loading && filteredRows.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">No report rows match the selected filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="m-0 text-[16px] font-bold text-slate-950">Report Details</h2>
          {!selectedRow ? (
            <p className="m-0 mt-3 text-[13px] text-slate-500">Select a report row to view module details.</p>
          ) : (
            <>
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-[17px] font-bold text-slate-950">{selectedRow.label}</div>
                <div className="mt-1 text-[12px] font-semibold text-slate-500">{selectedRow.group}</div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-[12px]">
                <span className="rounded bg-blue-50 p-3 text-blue-700">Records <strong className="block text-[20px] text-slate-950">{selectedRow.count}</strong></span>
                <span className="rounded bg-green-50 p-3 text-green-700">Amount <strong className="block text-[20px] text-slate-950">{money(selectedRow.totalAmount)}</strong></span>
              </div>
              <div className="mt-4 space-y-3 text-[13px]">
                <div><span className="text-slate-500">Source Key</span><div className="mt-1 break-all font-semibold text-slate-950">{selectedRow.key}</div></div>
                <div><span className="text-slate-500">Main Status</span><div className="mt-1 font-semibold text-slate-950">{firstStatus(selectedRow.statusCounts)}</div></div>
              </div>
              <div className="mt-4 rounded-lg border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-3 py-2 text-[12px] font-bold text-slate-500">Latest Records</div>
                {selectedRow.records.slice(0, 5).map((record) => {
                  const data = record.data || {};
                  const title = data.orderId || data.billNo || data.guestName || data.name || data.roomNumber || data.number || record._id;
                  return (
                    <div key={record._id} className="border-b border-slate-100 px-3 py-2 text-[12px] last:border-b-0">
                      <div className="font-bold text-slate-950">{title}</div>
                      <div className="mt-1 text-slate-500">{statusOf(data)} | {money(asAmount(data))}</div>
                    </div>
                  );
                })}
                {selectedRow.records.length === 0 && <div className="px-3 py-4 text-[13px] text-slate-500">No records found for this module.</div>}
              </div>
            </>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="m-0 flex items-center gap-2 text-[16px] font-bold text-slate-950">
              <FileText size={18} className="text-blue-600" />
              Saved Snapshots
            </h2>
          </div>
          <div className="max-h-[620px] overflow-y-auto p-4">
            {snapshots.length === 0 ? (
              <p className="m-0 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-[13px] text-slate-500">No saved report snapshots yet.</p>
            ) : (
              <div className="space-y-3">
                {snapshots.map((snapshot) => {
                  const data = snapshot.data || {};
                  return (
                    <article key={snapshot._id || data.generatedAt} className="rounded-lg border border-slate-200 p-3">
                      <div className="font-bold text-slate-950">{data.reportName || 'Hotel Report'}</div>
                      <div className="mt-1 text-[12px] text-slate-500">{data.period || 'All Data'} | {data.generatedAt ? new Date(data.generatedAt).toLocaleString() : '-'}</div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
                        <span className="rounded bg-slate-50 p-2">Revenue <strong className="block text-slate-950">{money(data.revenue)}</strong></span>
                        <span className="rounded bg-slate-50 p-2">Occupancy <strong className="block text-slate-950">{data.occupancyRate || 0}%</strong></span>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        </aside>
      </section>
    </ReservationShell>
  );
}
