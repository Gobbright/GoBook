import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Download } from 'lucide-react';

import { apiClient } from '../../../../../services/apiClient.js';
import { downloadReportCsv } from '../../../../../services/reportDownloadService.js';
import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';
import { getCurrentUser } from '../../../../../services/authService.js';
import { formatCurrency } from '../../../../../utils/formatCurrency.js';

const MODULE_CONFIG = {
  sales: {
    title: 'Sales Reports',
    section: 'Sales',
    description: 'Sales reports generated from billing records stored in the database.',
    categories: ['Sales'],
  },
  purchase: {
    title: 'Purchase Reports',
    section: 'Purchase',
    description: 'Purchase reports generated from vendor and purchase records stored in the database.',
    categories: ['Purchase'],
  },
  crm: {
    title: 'CRM Reports',
    section: 'CRM',
    description: 'CRM reports generated from customer module records stored in the database.',
    categories: ['CRM', 'Customers'],
  },
  inventory: {
    title: 'Inventory Reports',
    section: 'Inventory',
    description: 'Inventory reports generated from product and stock records stored in the database.',
    categories: ['Inventory'],
  },
  hr: {
    title: 'HR Reports',
    section: 'HR & Payroll',
    description: 'HR reports generated from employee records stored in the database.',
    categories: ['HR'],
  },
};
const SALES_DOCUMENT_OPTIONS = [
  { value: 'invoice', label: 'Invoice' },
  { value: 'bill-of-supply', label: 'Bill Of Supply' },
  { value: 'quotation', label: 'Quotation' },
];

function ReportCard({ report, onDownload }) {
  return (
    <div className="bg-white border border-[#dfe7f1] rounded-lg p-4 text-[#111827]">
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 rounded-lg bg-[#f8fafc] text-[#475569] flex items-center justify-center flex-none">
          <BarChart3 size={17} />
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
                onClick={() => onDownload(report)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-semibold text-[#374151] bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit]"
              >
                <Download size={13} /> Download
              </button>
            )}
          </span>
        </span>
      </div>
    </div>
  );
}

function amountFromInvoice(invoice = {}) {
  const totals = invoice.totals || {};
  return Number(totals.finalTotal ?? totals.grandTotal ?? totals.total ?? totals.subTotal ?? 0);
}

function reportDate(invoice = {}) {
  const value = invoice.meta?.date || invoice.createdAt;
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function typeLabel(type = '') {
  return String(type || 'invoice').replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export function ModuleReportsPage({ type }) {
  const config = MODULE_CONFIG[type] ?? MODULE_CONFIG.sales;
  const [reports, setReports] = useState([]);
  const [branches, setBranches] = useState([]);
  const [branch, setBranch] = useState('');
  const [salesRows, setSalesRows] = useState([]);
  const [salesDocumentType, setSalesDocumentType] = useState('invoice');
  const [loading, setLoading] = useState(true);
  const [salesLoading, setSalesLoading] = useState(false);
  const currentUser = getCurrentUser();
  const isSuperAdmin = currentUser?.isSuperAdmin || currentUser?.accountType === 'owner' || currentUser?.role === 'Super Admin';
  const branchOptions = useMemo(() => [
    { value: '', label: 'All Branches' },
    ...branches.map((item) => ({ value: item.code || item.name, label: `${item.name}${item.code ? ` (${item.code})` : ''}` })),
  ], [branches]);
  const branchNameByKey = useMemo(() => {
    const map = new Map();
    branches.forEach((item) => {
      if (item.code) map.set(String(item.code), item.name || item.code);
      if (item.name) map.set(String(item.name), item.name);
    });
    return map;
  }, [branches]);
  const displayBranchName = (value) => {
    const key = String(value || '').trim();
    if (!key) return 'Head Office';
    return branchNameByKey.get(key) || key;
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiClient(`/more-modules/reports-summary${branch ? `?branch=${encodeURIComponent(branch)}` : ''}`)
      .then((data) => {
        if (active) setReports(data.reports || []);
      })
      .catch(() => {
        if (active) setReports([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [branch]);

  useEffect(() => {
    if (type !== 'sales') {
      setSalesRows([]);
      return;
    }
    let active = true;
    setSalesLoading(true);
    const branchQuery = branch ? `&branch=${encodeURIComponent(branch)}` : '';
    Promise.all([
      apiClient(`/sales/invoices?documentType=invoice&limit=200${branchQuery}`),
      apiClient(`/sales/invoices?documentType=bill-of-supply&limit=200${branchQuery}`),
      apiClient(`/sales/invoices?documentType=quotation&limit=200${branchQuery}`),
    ])
      .then((responses) => {
        if (!active) return;
        const rows = responses.flatMap((response) => response.data || []);
        rows.sort((a, b) => new Date(b.createdAt || b.meta?.date || 0) - new Date(a.createdAt || a.meta?.date || 0));
        setSalesRows(rows);
      })
      .catch(() => {
        if (active) setSalesRows([]);
      })
      .finally(() => {
        if (active) setSalesLoading(false);
      });
    return () => { active = false; };
  }, [branch, type]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    apiClient('/settings/branches')
      .then((data) => setBranches(data.branches || []))
      .catch(() => setBranches([]));
  }, [isSuperAdmin]);

  const filteredReports = useMemo(() => reports.filter((report) => (
    config.categories.some((category) => report.category === category || report.category.startsWith(`${category} /`))
  )), [config.categories, reports]);
  const filteredSalesRows = useMemo(() => (
    salesRows.filter((invoice) => invoice.documentType === salesDocumentType)
  ), [salesDocumentType, salesRows]);

  async function handleDownloadReport(report) {
    try {
      await downloadReportCsv(report.downloadKey, report.name, { branch });
    } catch (err) {
      window.alert(err.message || 'Report download failed');
    }
  }

  return (
    <div className="p-4 md:p-7">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-5">
        <div>
          <nav className="flex items-center gap-1 text-[13px] text-[#536173] mb-1">
            <a className="text-blue-600 no-underline hover:underline" href="/dashboard">Home</a>
            <span>/</span><span>{config.section}</span><span>/</span><span>Reports</span>
          </nav>
          <h1 className="m-0 text-[22px] font-bold text-[#111827]">{config.title}</h1>
          <p className="m-0 text-[13px] text-[#536173] mt-0.5">{config.description}</p>
        </div>
        <a href="/reports" className="inline-flex items-center justify-center px-3.5 py-2 text-[13px] font-semibold text-[#374151] bg-white border border-[#dbe4ef] rounded-md no-underline hover:bg-gray-50">
          All Reports Hub
        </a>
        {isSuperAdmin && (
          <SelectDropdown
            value={branch}
            onChange={setBranch}
            options={branchOptions}
            buttonClassName="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] bg-white font-[inherit] outline-none min-w-44"
          />
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <div className="bg-white border border-[#dfe7f1] rounded-lg p-4">
          <div className="text-xs text-[#536173]">Database Reports</div>
          <div className="text-[22px] font-bold text-[#111827] mt-1">{filteredReports.length}</div>
        </div>
        <div className="bg-white border border-[#dfe7f1] rounded-lg p-4">
          <div className="text-xs text-[#536173]">Database Records</div>
          <div className="text-[22px] font-bold text-[#16a34a] mt-1">{filteredReports.reduce((sum, report) => sum + (report.count || 0), 0)}</div>
        </div>
        <div className="bg-white border border-[#dfe7f1] rounded-lg p-4">
          <div className="text-xs text-[#536173]">Source</div>
          <div className="text-[22px] font-bold text-[#2563eb] mt-1">Database</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {loading && <div className="rounded-lg border border-[#dfe7f1] bg-white p-6 text-[13px] text-[#536173]">Loading database reports...</div>}
        {!loading && filteredReports.length === 0 && (
          <div className="rounded-lg border border-[#dfe7f1] bg-white p-6 text-[13px] text-[#536173]">
            No database records found for this report section.
          </div>
        )}
        {!loading && filteredReports.map((report) => <ReportCard key={`${report.category}-${report.name}`} report={report} onDownload={handleDownloadReport} />)}
      </div>

      {type === 'sales' && (
        <div className="mt-5 bg-white border border-[#dfe7f1] rounded-lg overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-[#edf2f7]">
            <div>
              <h2 className="m-0 text-[15px] font-semibold text-[#111827]">Invoice List</h2>
              <p className="m-0 mt-0.5 text-[12.5px] text-[#536173]">Invoices, bill of supply, and quotations from the database</p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <SelectDropdown
                value={salesDocumentType}
                onChange={setSalesDocumentType}
                options={SALES_DOCUMENT_OPTIONS}
                buttonClassName="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] bg-white font-[inherit] outline-none min-w-40"
              />
              <span className="text-[12px] font-semibold text-[#475569]">{filteredSalesRows.length} record{filteredSalesRows.length === 1 ? '' : 's'}</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[760px]">
              <thead>
                <tr>
                  {['No.', 'Type', 'Branch', 'Date', 'Customer', 'Phone', 'Amount', 'Status', 'Action'].map((heading) => (
                    <th key={heading} className="text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-5 py-3 border-b border-[#edf2f7]">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {salesLoading && <tr><td colSpan="9" className="px-5 py-8 text-center text-[13px] text-[#536173]">Loading invoices...</td></tr>}
                {!salesLoading && filteredSalesRows.length === 0 && <tr><td colSpan="9" className="px-5 py-8 text-center text-[13px] text-[#536173]">No invoices found.</td></tr>}
                {!salesLoading && filteredSalesRows.map((invoice) => (
                  <tr key={invoice._id || invoice.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 border-b border-[#f3f4f6] text-[13px] font-semibold text-blue-700">{invoice.number || '-'}</td>
                    <td className="px-5 py-3 border-b border-[#f3f4f6] text-[13px] text-[#536173]">{typeLabel(invoice.documentType)}</td>
                    <td className="px-5 py-3 border-b border-[#f3f4f6] text-[13px] text-[#536173]">{displayBranchName(invoice.branch)}</td>
                    <td className="px-5 py-3 border-b border-[#f3f4f6] text-[13px] text-[#536173]">{reportDate(invoice)}</td>
                    <td className="px-5 py-3 border-b border-[#f3f4f6] text-[13px] text-[#111827]">{invoice.customer?.name || 'Walk-in customer'}</td>
                    <td className="px-5 py-3 border-b border-[#f3f4f6] text-[13px] text-[#536173]">{invoice.customer?.phone || '-'}</td>
                    <td className="px-5 py-3 border-b border-[#f3f4f6] text-[13px] font-semibold text-[#111827]">{formatCurrency(amountFromInvoice(invoice))}</td>
                    <td className="px-5 py-3 border-b border-[#f3f4f6] text-[13px] text-[#536173]">{invoice.payStatus || invoice.status || '-'}</td>
                    <td className="px-5 py-3 border-b border-[#f3f4f6] text-[13px]">
                      <a className="text-blue-600 font-semibold no-underline hover:underline" href={`/billing/${invoice.documentType || 'invoice'}/${invoice._id || invoice.id}/view`}>View</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

