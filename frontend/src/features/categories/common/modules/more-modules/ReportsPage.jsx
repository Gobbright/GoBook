import { useEffect, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Building2,
  Download,
  FileSpreadsheet,
  Package,
  ReceiptText,
  TrendingUp,
  Users,
} from 'lucide-react';

import { apiClient } from '../../../../../services/apiClient.js';

const EMPTY_SUMMARY = {
  stats: { total: 0, financial: 0, sales: 0, inventory: 0, hr: 0, purchase: 0 },
  categories: [],
  reports: [],
};

const REPORT_AREAS = [
  {
    title: 'Sales Reports',
    href: '/sales-reports',
    icon: TrendingUp,
    color: '#2563eb',
    bg: '#eff6ff',
    description: 'Bills, receivables, quotations, credit/debit notes, challans, e-invoices, and e-way bills.',
  },
  {
    title: 'Purchase Reports',
    href: '/purchase-reports',
    icon: Building2,
    color: '#0891b2',
    bg: '#ecfeff',
    description: 'Purchase orders, purchase entries, vendors, supplier GST reports, and payables.',
  },
  {
    title: 'GST Reports',
    href: '/gst-reports',
    icon: FileSpreadsheet,
    color: '#7c3aed',
    bg: '#f5f3ff',
    description: 'HSN/SAC, tax-rate, state-wise, customer-wise, ITC, and supplier GST views.',
  },
  {
    title: 'Accounting Reports',
    href: '/accounting-reports',
    icon: ReceiptText,
    color: '#16a34a',
    bg: '#f0fdf4',
    description: 'Day book, ledger statement, voucher register, outstanding, bill-wise, and cost centers.',
  },
  {
    title: 'Inventory Reports',
    href: '/inventory-reports',
    icon: Package,
    color: '#d97706',
    bg: '#fffbeb',
    description: 'Stock summary, stock ledger, product register, stock in/out, warehouses, and alerts.',
  },
  {
    title: 'CRM Reports',
    href: '/crm-reports',
    icon: Users,
    color: '#e11d48',
    bg: '#fff1f2',
    description: 'Customer register, leads, follow-ups, and lifecycle reports.',
  },
  {
    title: 'HR Reports',
    href: '/hr-reports',
    icon: BookOpen,
    color: '#4f46e5',
    bg: '#eef2ff',
    description: 'Employee register, attendance, payroll, leave, and document reports.',
  },
];

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

function ReportAreaCard({ area }) {
  const Icon = area.icon;
  return (
    <a href={area.href} className="group bg-white border border-[#dfe7f1] rounded-lg p-4 no-underline text-[#111827] hover:border-blue-300 hover:shadow-sm transition-all">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-lg flex items-center justify-center flex-none transition-colors" style={{ background: area.bg, color: area.color }}>
          <Icon size={18} />
        </span>
        <span className="min-w-0">
          <span className="block text-[15px] font-semibold">{area.title}</span>
          <span className="block text-[13px] text-[#536173] leading-relaxed mt-1.5">{area.description}</span>
          <span className="inline-flex mt-3 text-[12px] font-semibold text-blue-600 group-hover:underline">Open section</span>
        </span>
      </div>
    </a>
  );
}

export function ReportsPage() {
  const [summary, setSummary] = useState(EMPTY_SUMMARY);

  useEffect(() => {
    apiClient('/more-modules/reports-summary')
      .then((data) => setSummary({ ...EMPTY_SUMMARY, ...data }))
      .catch(() => {});
  }, []);

  const { stats, reports } = summary;
  const statCards = [
    { label: 'Sales Records', value: String(stats.sales), sub: 'Billing reports', color: '#2563eb', bg: '#bfdbfe' },
    { label: 'Purchase Records', value: String(stats.purchase), sub: 'Vendor reports', color: '#0891b2', bg: '#a5f3fc' },
    { label: 'Finance Records', value: String(stats.financial), sub: 'Accounting reports', color: '#16a34a', bg: '#bbf7d0' },
    { label: 'Inventory Records', value: String(stats.inventory), sub: 'Stock reports', color: '#d97706', bg: '#fed7aa' },
    { label: 'HR Records', value: String(stats.hr), sub: 'People reports', color: '#4f46e5', bg: '#c7d2fe' },
  ];

  return (
    <div className="p-4 md:p-7">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-5">
        <div>
          <nav className="flex items-center gap-1 text-[13px] text-[#536173] mb-1">
            <a className="text-blue-600 no-underline hover:underline" href="//dashboard">Home</a>
            <span>/</span><span>More Modules</span><span>/</span><span>Reports</span>
          </nav>
          <h1 className="m-0 text-[22px] font-bold text-[#111827]">Reports Hub</h1>
          <p className="m-0 text-[13px] text-[#536173] mt-0.5">Open every section report from one place.</p>
        </div>
        <button
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit] disabled:opacity-50 disabled:cursor-not-allowed"
          type="button"
          disabled={reports.length === 0}
          onClick={() => downloadCSV(reports, `GoBook_Report_Directory_${new Date().toISOString().slice(0,10)}.csv`)}
        >
          <Download size={14} />
          Export Directory
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-5">
        {statCards.map((card) => <StatCard key={card.label} {...card} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
        {REPORT_AREAS.map((area) => <ReportAreaCard key={area.title} area={area} />)}
      </div>

      <div className="bg-white border border-[#dfe7f1] rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#edf2f7] flex items-center gap-2">
          <BarChart3 size={16} className="text-blue-600" />
          <span className="text-[14px] font-semibold text-[#111827]">Report Directory</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {['Report Name', 'Category', 'Description', 'Last Updated'].map((header) => (
                  <th key={header} className="text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-5 py-3 border-b border-[#edf2f7]">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 ? (
                <tr>
                  <td className="px-5 py-8 text-center text-[13px] text-[#536173]" colSpan={4}>No report records available yet.</td>
                </tr>
              ) : reports.map((row) => (
                <tr key={`${row.category}-${row.name}`} className="hover:bg-gray-50">
                  <td className="px-5 py-3.5 border-b border-[#f3f4f6] text-[13px] font-semibold text-[#111827]">{row.name}</td>
                  <td className="px-5 py-3.5 border-b border-[#f3f4f6] text-[13px] text-[#536173]">{row.category}</td>
                  <td className="px-5 py-3.5 border-b border-[#f3f4f6] text-[13px] text-[#536173]">{row.description}</td>
                  <td className="px-5 py-3.5 border-b border-[#f3f4f6] text-[13px] text-[#536173]">{row.lastGenerated ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

