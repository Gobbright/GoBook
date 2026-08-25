import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Building2,
  Download,
  FileSpreadsheet,
  HeartPulse,
  IndianRupee,
  Package,
  ReceiptText,
  TrendingUp,
  Users,
} from 'lucide-react';

import { apiClient } from '../../../../../services/apiClient.js';
import { API_BASE_URL } from '../../../../../services/apiBase.js';
import { downloadReportCsv } from '../../../../../services/reportDownloadService.js';
import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';
import { getCurrentUser } from '../../../../../services/authService.js';
import { getToken } from '../../../../../services/authToken.js';

const EMPTY_SUMMARY = {
  stats: { total: 0, financial: 0, sales: 0, inventory: 0, hr: 0, purchase: 0 },
  categories: [],
  reports: [],
};

const CATEGORY_STYLE = {
  Sales: { icon: TrendingUp, color: '#2563eb', bg: '#eff6ff' },
  Purchase: { icon: Building2, color: '#0891b2', bg: '#ecfeff' },
  Finance: { icon: ReceiptText, color: '#16a34a', bg: '#f0fdf4' },
  Inventory: { icon: Package, color: '#d97706', bg: '#fffbeb' },
  HR: { icon: BookOpen, color: '#4f46e5', bg: '#eef2ff' },
  Hospital: { icon: HeartPulse, color: '#0891b2', bg: '#ecfeff' },
  School: { icon: BookOpen, color: '#4f46e5', bg: '#eef2ff' },
  Hotel: { icon: Building2, color: '#0891b2', bg: '#ecfeff' },
  NGO: { icon: Users, color: '#e11d48', bg: '#fff1f2' },
  Automobile: { icon: Package, color: '#2563eb', bg: '#eff6ff' },
  Construction: { icon: Building2, color: '#d97706', bg: '#fffbeb' },
  GST: { icon: FileSpreadsheet, color: '#7c3aed', bg: '#f5f3ff' },
  default: { icon: BarChart3, color: '#475569', bg: '#f8fafc' },
};

function styleForCategory(category = '') {
  const direct = CATEGORY_STYLE[category];
  if (direct) return direct;
  const first = category.split('/')[0]?.trim();
  return CATEGORY_STYLE[first] || CATEGORY_STYLE.default;
}

function downloadCSV(rows, filename) {
  const headers = ['Report Name', 'Category', 'Description', 'Last Generated'];
  const csv = [headers, ...rows.map((r) => [r.name, r.category, r.description, r.lastGenerated ?? '-'])]
    .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function parseCsvLine(line) {
  const cells = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      cells.push(cell);
      cell = '';
    } else {
      cell += char;
    }
  }
  cells.push(cell);
  return cells;
}

function parseCsvTable(text = '', title = '') {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  const columns = lines[0] ? parseCsvLine(lines[0]) : [];
  const rows = lines.slice(1).map((line, index) => ({
    id: String(index),
    values: parseCsvLine(line),
  }));
  return { title, count: rows.length, columns, rows };
}

function StatCard({ label, value, sub, color, bg }) {
  return (
    <div className="bg-white border border-[#dfe7f1] rounded-lg p-4">
      <div className="text-xs text-[#536173]">{label}</div>
      <div className="text-[21px] font-bold mt-1" style={{ color }}>{value}</div>
      <div className="text-xs text-[#536173] mt-1">{sub}</div>
      <div className="h-1 rounded-full mt-3" style={{ background: bg }} />
    </div>
  );
}

function ReportRecordCard({ report, onDownload, onOpen, active }) {
  const style = styleForCategory(report.category);
  const Icon = style.icon;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(report)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onOpen(report);
      }}
      className={`w-full text-left bg-white border rounded-lg p-4 text-[#111827] cursor-pointer font-[inherit] hover:border-blue-300 hover:shadow-sm ${active ? 'border-blue-500 ring-2 ring-blue-100' : 'border-[#dfe7f1]'}`}
    >
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-lg flex items-center justify-center flex-none" style={{ background: style.bg, color: style.color }}>
          <Icon size={18} />
        </span>
        <span className="min-w-0">
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-[#536173]">{report.category}</span>
          <span className="block text-[15px] font-semibold mt-1">{report.name}</span>
          <span className="block text-[13px] text-[#536173] leading-relaxed mt-1.5">{report.description}</span>
          <span className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex text-[12px] font-semibold text-[#475569]">{report.count || 0} record{report.count === 1 ? '' : 's'}</span>
            {report.downloadKey && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onDownload(report);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-semibold text-[#374151] bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit]"
              >
                <Download size={13} /> Download
              </button>
            )}
            {report.downloadKey && (
              <span className="inline-flex px-2.5 py-1 text-[12px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-md">
                View Data
              </span>
            )}
          </span>
        </span>
      </div>
    </div>
  );
}

export function ReportsPage() {
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [branches, setBranches] = useState([]);
  const [branch, setBranch] = useState('');
  const [activeReport, setActiveReport] = useState(null);
  const [reportData, setReportData] = useState({ columns: [], rows: [], title: '', count: 0 });
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsError, setRecordsError] = useState('');
  const currentUser = getCurrentUser();
  const isSuperAdmin = currentUser?.isSuperAdmin || currentUser?.accountType === 'owner' || currentUser?.role === 'Super Admin';
  const branchOptions = useMemo(() => [
    { value: '', label: 'All Branches' },
    ...branches.map((item) => ({ value: item.code || item.name, label: `${item.name}${item.code ? ` (${item.code})` : ''}` })),
  ], [branches]);

  useEffect(() => {
    const query = branch ? `?branch=${encodeURIComponent(branch)}` : '';
    setActiveReport(null);
    setReportData({ columns: [], rows: [], title: '', count: 0 });
    apiClient(`/more-modules/reports-summary${query}`)
      .then((data) => setSummary({ ...EMPTY_SUMMARY, ...data }))
      .catch(() => {});
  }, [branch]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    apiClient('/settings/branches')
      .then((data) => setBranches(data.branches || []))
      .catch(() => setBranches([]));
  }, [isSuperAdmin]);

  const { stats, reports } = summary;
  const statCards = summary.categories.map((category) => {
    const style = styleForCategory(category.label);
    return {
      label: category.label,
      value: String(category.count),
      sub: 'Database records',
      color: style.color,
      bg: style.bg,
    };
  });

  async function handleDownloadReport(report) {
    try {
      await downloadReportCsv(report.downloadKey, report.name, { branch });
    } catch (err) {
      window.alert(err.message || 'Report download failed');
    }
  }

  async function handleOpenReport(report) {
    if (!report.downloadKey) return;
    setActiveReport(report);
    setRecordsLoading(true);
    setRecordsError('');
    try {
      const query = new URLSearchParams({ key: report.downloadKey });
      if (branch) query.set('branch', branch);
      const data = await apiClient(`/more-modules/reports-records?${query.toString()}`);
      setReportData(data);
    } catch (err) {
      try {
        const query = new URLSearchParams({ key: report.downloadKey });
        if (branch) query.set('branch', branch);
        const response = await fetch(`${API_BASE_URL}/more-modules/reports-download?${query.toString()}`, {
          headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
        });
        if (!response.ok) throw new Error(err.message || 'Unable to load report data');
        setReportData(parseCsvTable(await response.text(), report.name));
      } catch (fallbackErr) {
        setReportData({ columns: [], rows: [], title: report.name, count: 0 });
        setRecordsError(fallbackErr.message || 'Unable to load report data');
      }
    } finally {
      setRecordsLoading(false);
    }
  }

  return (
    <div className="p-4 md:p-7">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-5">
        <div>
          <nav className="flex items-center gap-1 text-[13px] text-[#536173] mb-1">
            <a className="text-blue-600 no-underline hover:underline" href="/dashboard">Home</a>
            <span>/</span><span>More Modules</span><span>/</span><span>Reports</span>
          </nav>
          <h1 className="m-0 text-[22px] font-bold text-[#111827]">Reports Hub</h1>
          <p className="m-0 text-[13px] text-[#536173] mt-0.5">Reports shown here are generated from records currently stored in your database.</p>
        </div>
        <div className="flex flex-wrap items-center justify-start lg:justify-end gap-2">
          <button
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit] disabled:opacity-50 disabled:cursor-not-allowed"
            type="button"
            disabled={reports.length === 0}
            onClick={() => downloadCSV(reports, `GoBook_Report_Directory_${new Date().toISOString().slice(0,10)}.csv`)}
          >
            <Download size={14} />
            Export Directory
          </button>
          {isSuperAdmin && (
            <SelectDropdown
              value={branch}
              onChange={setBranch}
              options={branchOptions}
              buttonClassName="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] bg-white font-[inherit] outline-none min-w-44"
            />
          )}
        </div>
      </div>

      {statCards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-5">
          {statCards.map((card) => <StatCard key={card.label} {...card} />)}
        </div>
      )}

      {reports.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
          {reports.map((report) => (
            <ReportRecordCard
              key={`${report.category}-${report.name}`}
              report={report}
              onDownload={handleDownloadReport}
              onOpen={handleOpenReport}
              active={activeReport?.downloadKey === report.downloadKey}
            />
          ))}
        </div>
      )}

      {activeReport && (
        <div className="bg-white border border-[#dfe7f1] rounded-lg overflow-hidden mb-5">
          <div className="px-5 py-3.5 border-b border-[#edf2f7] flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="m-0 text-[15px] font-semibold text-[#111827]">{reportData.title || activeReport.name}</h2>
              <p className="m-0 mt-0.5 text-[12.5px] text-[#536173]">{recordsLoading ? 'Loading records...' : `${reportData.count || 0} records from database`}</p>
            </div>
            <button
              type="button"
              onClick={() => handleDownloadReport(activeReport)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold text-[#374151] bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit]"
            >
              <Download size={13} /> Download
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[760px]">
              <thead>
                <tr>
                  {(reportData.columns || []).map((column) => (
                    <th key={column} className="text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-5 py-3 border-b border-[#edf2f7]">{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recordsLoading && <tr><td className="px-5 py-8 text-center text-[13px] text-[#536173]" colSpan={Math.max(reportData.columns.length, 1)}>Loading report data...</td></tr>}
                {!recordsLoading && recordsError && <tr><td className="px-5 py-8 text-center text-[13px] text-red-600" colSpan={Math.max(reportData.columns.length, 1)}>{recordsError}</td></tr>}
                {!recordsLoading && !recordsError && reportData.rows?.length === 0 && <tr><td className="px-5 py-8 text-center text-[13px] text-[#536173]" colSpan={Math.max(reportData.columns.length, 1)}>No records found for this report.</td></tr>}
                {!recordsLoading && !recordsError && reportData.rows?.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    {row.values.map((value, index) => (
                      <td key={`${row.id}-${index}`} className="px-5 py-3.5 border-b border-[#f3f4f6] text-[13px] text-[#374151] whitespace-nowrap">{value}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white border border-[#dfe7f1] rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#edf2f7] flex items-center gap-2">
          <BarChart3 size={16} className="text-blue-600" />
          <span className="text-[14px] font-semibold text-[#111827]">Report Directory</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {['Report Name', 'Category', 'Description', 'Last Updated', 'Download'].map((header) => (
                  <th key={header} className="text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-5 py-3 border-b border-[#edf2f7]">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 ? (
                <tr>
                  <td className="px-5 py-8 text-center text-[13px] text-[#536173]" colSpan={5}>No report records available yet.</td>
                </tr>
              ) : reports.map((row) => (
                <tr key={`${row.category}-${row.name}`} className="hover:bg-gray-50">
                  <td className="px-5 py-3.5 border-b border-[#f3f4f6] text-[13px] font-semibold text-[#111827]">{row.name}</td>
                  <td className="px-5 py-3.5 border-b border-[#f3f4f6] text-[13px] text-[#536173]">{row.category}</td>
                  <td className="px-5 py-3.5 border-b border-[#f3f4f6] text-[13px] text-[#536173]">{row.description}</td>
                  <td className="px-5 py-3.5 border-b border-[#f3f4f6] text-[13px] text-[#536173]">{row.lastGenerated ?? '-'}</td>
                  <td className="px-5 py-3.5 border-b border-[#f3f4f6] text-[13px] text-[#536173]">
                    {row.downloadKey ? (
                      <button
                        type="button"
                        onClick={() => handleDownloadReport(row)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-semibold text-[#374151] bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit]"
                      >
                        <Download size={13} /> CSV
                      </button>
                    ) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

