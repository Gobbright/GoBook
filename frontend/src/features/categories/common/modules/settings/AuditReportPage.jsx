import { useEffect, useState } from 'react';
import { History, PlusCircle, Pencil, Trash2, ListChecks } from 'lucide-react';

import { api } from '../../../../../services/api.js';
import { DateRangeFilter } from '../../../../../components/forms/DateRangeFilter.jsx';
import { ExportButtons } from '../../../../../components/forms/ExportButtons.jsx';
import { useDebouncedValue } from '../../../../../hooks/useDebouncedValue.js';

const LIMIT = 25;
const SELECT = 'border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit] bg-white text-[#374151] cursor-pointer';
const TH = 'text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-5 py-3 border-b border-[#edf2f7]';
const TD = 'px-5 py-3.5 border-b border-[#f3f4f6] text-[13px]';

const ACTION_STYLES = {
  create: { bg: 'bg-green-50', text: 'text-green-700', Icon: PlusCircle },
  update: { bg: 'bg-blue-50', text: 'text-blue-700', Icon: Pencil },
  delete: { bg: 'bg-red-50', text: 'text-red-700', Icon: Trash2 },
};

function ActionBadge({ action }) {
  const style = ACTION_STYLES[action] ?? { bg: 'bg-gray-50', text: 'text-gray-600', Icon: ListChecks };
  const { Icon } = style;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold capitalize ${style.bg} ${style.text}`}>
      <Icon size={11} /> {action}
    </span>
  );
}

function fmtDateTime(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function StatCard({ label, value, accentColor, icon }) {
  return (
    <div className="bg-white border border-[#dfe7f1] rounded-lg p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-[#536173]">{label}</span>
        <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-none" style={{ backgroundColor: accentColor + '1a' }}>
          {icon}
        </span>
      </div>
      <div className="text-[22px] font-bold text-[#111827] leading-none">{Number(value).toLocaleString('en-IN')}</div>
    </div>
  );
}

export function AuditReportPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [action, setAction] = useState('');
  const [modelName, setModelName] = useState('');
  const [performedBy, setPerformedBy] = useState('');
  const [page, setPage] = useState(1);

  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ total: 0, creates: 0, updates: 0, deletes: 0 });
  const [modelNames, setModelNames] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.listAuditModelNames().then(setModelNames).catch(() => {});
    api.listStaffUsers().then((res) => setStaffUsers(res.users ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');
    const params = { dateFrom, dateTo, action, modelName, performedBy, search: debouncedSearch, page, limit: LIMIT };
    api.listAuditLogs(params)
      .then((res) => {
        setLogs(res.data ?? []);
        setTotal(res.total ?? 0);
        setStats(res.stats ?? { total: 0, creates: 0, updates: 0, deletes: 0 });
      })
      .catch((err) => setError(err.message || 'Unable to load audit report'))
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo, action, modelName, performedBy, debouncedSearch, page]);

  useEffect(() => { setPage(1); }, [dateFrom, dateTo, action, modelName, performedBy, debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const exportColumns = [
    { label: 'Timestamp', value: (row) => fmtDateTime(row.performedAt) },
    { label: 'Action', value: (row) => row.action },
    { label: 'Module', value: (row) => row.modelName },
    { label: 'Record', value: (row) => row.documentLabel },
    { label: 'Performed By', value: (row) => row.performedBy?.email || 'System' },
  ];

  return (
    <div className="p-4 md:p-7">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-6">
        <div>
          <nav className="flex items-center gap-1 text-[13px] text-[#536173] mb-1">
            <a className="text-blue-600 no-underline hover:underline" href="/dashboard">Home</a>
            <span>›</span><span>Settings</span><span>›</span>
            <span className="text-[#111827]">Audit Report</span>
          </nav>
          <h1 className="m-0 text-[22px] font-bold text-[#111827]">Audit Report</h1>
          <p className="m-0 text-[13px] text-[#536173] mt-0.5">Who created, edited or deleted what, and when</p>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 mb-6">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Actions" value={stats.total} accentColor="#2563eb" icon={<History size={16} color="#2563eb" />} />
        <StatCard label="Created" value={stats.creates} accentColor="#16a34a" icon={<PlusCircle size={16} color="#16a34a" />} />
        <StatCard label="Updated" value={stats.updates} accentColor="#2563eb" icon={<Pencil size={16} color="#2563eb" />} />
        <StatCard label="Deleted" value={stats.deletes} accentColor="#dc2626" icon={<Trash2 size={16} color="#dc2626" />} />
      </div>

      <div className="bg-white border border-[#dfe7f1] rounded-lg overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-[#edf2f7] px-4 py-2.5">
          <DateRangeFilter
            from={dateFrom}
            to={dateTo}
            onFromChange={setDateFrom}
            onToChange={setDateTo}
            onClear={() => { setDateFrom(''); setDateTo(''); }}
          />
          <select className={SELECT} value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">All Actions</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
          </select>
          <select className={SELECT} value={modelName} onChange={(e) => setModelName(e.target.value)}>
            <option value="">All Modules</option>
            {modelNames.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
          <select className={SELECT} value={performedBy} onChange={(e) => setPerformedBy(e.target.value)}>
            <option value="">All Users</option>
            {staffUsers.map((u) => <option key={u._id} value={u._id}>{u.name || u.email}</option>)}
          </select>
          <input
            className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit] bg-white w-52"
            placeholder="Search record or user…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="ml-auto">
            <ExportButtons title="Audit Report" filename="audit-report" rows={logs} columns={exportColumns} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={TH}>Timestamp</th>
                <th className={TH}>Action</th>
                <th className={TH}>Module</th>
                <th className={TH}>Record</th>
                <th className={TH}>Performed By</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-[13px] text-[#536173]">Loading...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-[13px] text-[#536173]">No audit activity matches these filters</td></tr>
              ) : logs.map((row) => (
                <tr key={row._id} className="hover:bg-gray-50">
                  <td className={`${TD} text-[#536173] whitespace-nowrap`}>{fmtDateTime(row.performedAt)}</td>
                  <td className={TD}><ActionBadge action={row.action} /></td>
                  <td className={`${TD} text-[#374151]`}>{row.modelName}</td>
                  <td className={`${TD} font-medium text-[#111827]`}>{row.documentLabel || '—'}</td>
                  <td className={`${TD} text-[#536173]`}>{row.performedBy?.email || 'System'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-[#edf2f7] flex flex-wrap items-center justify-between gap-2">
          <span className="text-[13px] text-[#536173]">
            Showing <span className="font-medium text-[#374151]">{logs.length === 0 ? 0 : (page - 1) * LIMIT + 1}-{Math.min(page * LIMIT, total)}</span> of{' '}
            <span className="font-medium text-[#374151]">{total}</span> entries
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 border border-[#dbe4ef] rounded text-[13px] text-[#374151] bg-white hover:bg-gray-50 cursor-pointer font-[inherit] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
            >
              ← Prev
            </button>
            <span className="px-2 text-[13px] text-[#536173]">Page {page} / {totalPages}</span>
            <button
              type="button"
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 border border-[#dbe4ef] rounded text-[13px] text-[#374151] bg-white hover:bg-gray-50 cursor-pointer font-[inherit] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
