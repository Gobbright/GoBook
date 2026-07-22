import {
  BarChart3,
  BookOpen,
  Building2,
  ClipboardList,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Package,
  Scale,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';

const MODULES = {
  sales: {
    title: 'Sales Reports',
    section: 'Sales',
    description: 'Sales, billing, receivables, returns, and dispatch report shortcuts.',
    reports: [
      { title: 'Bills Register', href: '/billing/invoice', icon: FileText, category: 'Sales', description: 'Invoice-wise sales value, GST, paid amount, pending balance, and payment status.' },
      { title: 'Receivables', href: '/billing/receivables', icon: Wallet, category: 'Collections', description: 'Outstanding customer balances, overdue bills, and due-this-week collections.' },
      { title: 'Quotation Register', href: '/billing/quotation', icon: ClipboardList, category: 'Sales Pipeline', description: 'Quotation list with customer, value, date filters, and export.' },
      { title: 'Credit Notes', href: '/billing/credit-note', icon: FileCheck, category: 'Adjustments', description: 'Credit note register for sales returns and customer adjustments.' },
      { title: 'Debit Notes', href: '/billing/debit-note', icon: FileCheck, category: 'Adjustments', description: 'Debit note register for additional charges and corrections.' },
      { title: 'Delivery Challans', href: '/billing/delivery-challan', icon: Package, category: 'Dispatch', description: 'Delivery challan movement list for dispatch tracking.' },
      { title: 'E-Invoice Register', href: '/billing/e-invoice', icon: FileSpreadsheet, category: 'Compliance', description: 'E-invoice records and IRN-related status tracking.' },
      { title: 'E-Way Bill Register', href: '/billing/e-way-bill', icon: FileSpreadsheet, category: 'Compliance', description: 'E-way bill records, transport details, and generated EWB numbers.' },
    ],
  },
  purchase: {
    title: 'Purchase Reports',
    section: 'Purchase',
    description: 'Purchase order, purchase entry, vendor, and payable source reports.',
    reports: [
      { title: 'Purchase Orders', href: '/billing/purchase-order', icon: ClipboardList, category: 'Procurement', description: 'PO register with supplier, expected delivery, and order values.' },
      { title: 'Purchase Entries', href: '/billing/purchase-entry', icon: FileText, category: 'Purchases', description: 'Purchase entry list for supplier bills and purchase values.' },
      { title: 'Vendor Register', href: '/vendor-management', icon: Building2, category: 'Vendors', description: 'Vendor master list with contact details, category, and export.' },
      { title: 'Supplier GST Report', href: '/gst-reports', icon: FileSpreadsheet, category: 'GST', description: 'GST purchase report area for supplier-wise and ITC analysis.' },
      { title: 'Payables', href: '/accounting-reports', icon: Wallet, category: 'Accounting', description: 'Use Accounting Reports -> Outstanding with Payables selected.' },
    ],
  },
  crm: {
    title: 'CRM Reports',
    section: 'CRM',
    description: 'Customer, lead, follow-up, and lifecycle analysis shortcuts.',
    reports: [
      { title: 'Customer Register', href: '/customers', icon: Users, category: 'Customers', description: 'Customer list with status, city, total sales, and export.' },
      { title: 'Lead Register', href: '/leads', icon: TrendingUp, category: 'Leads', description: 'Lead list for source, status, owner, and pipeline tracking.' },
      { title: 'Follow-up Report', href: '/follow-ups', icon: ClipboardList, category: 'Activities', description: 'Follow-up schedule, pending tasks, and customer touch points.' },
      { title: 'Customer Lifecycle', href: '/customer-lifecycle', icon: BarChart3, category: 'Lifecycle', description: 'Customer stage movement and relationship progress view.' },
    ],
  },
  inventory: {
    title: 'Inventory Reports',
    section: 'Inventory',
    description: 'Stock value, stock movement, product, warehouse, and alert reports.',
    reports: [
      { title: 'Stock Summary', href: '/stock-summary', icon: BarChart3, category: 'Stock', description: 'Current stock, stock value, reorder status, and low-stock count.' },
      { title: 'Stock Ledger', href: '/stock-ledger', icon: BookOpen, category: 'Movement', description: 'Complete stock in/out movement history with date filters.' },
      { title: 'Product Register', href: '/products', icon: Package, category: 'Products', description: 'Product master list with HSN, category, rates, and export.' },
      { title: 'Stock In Register', href: '/stock-in', icon: FileText, category: 'Movement', description: 'Stock-in transaction register and inward quantity/value report.' },
      { title: 'Stock Out Register', href: '/stock-out', icon: FileText, category: 'Movement', description: 'Stock-out transaction register and outward quantity/value report.' },
      { title: 'Warehouse Report', href: '/warehouse', icon: Building2, category: 'Storage', description: 'Warehouse master and storage location report.' },
      { title: 'Stock Alerts', href: '/stock-alerts', icon: Scale, category: 'Control', description: 'Low stock, out-of-stock, and reorder attention list.' },
    ],
  },
  hr: {
    title: 'HR Reports',
    section: 'HR & Payroll',
    description: 'Employee, attendance, payroll, leave, and document report shortcuts.',
    reports: [
      { title: 'Employee Register', href: '/employees', icon: Users, category: 'Employees', description: 'Employee master report by department, status, and designation.' },
      { title: 'Attendance Report', href: '/attendance', icon: ClipboardList, category: 'Attendance', description: 'Attendance entries and status report by period.' },
      { title: 'Payroll Report', href: '/payroll', icon: Wallet, category: 'Payroll', description: 'Payroll register with salary, deductions, net pay, and payment status.' },
      { title: 'Leave Report', href: '/leave-management', icon: FileCheck, category: 'Leave', description: 'Leave requests, approvals, and leave status report.' },
      { title: 'Document Register', href: '/documents', icon: FileText, category: 'Documents', description: 'Employee document folder and file register.' },
    ],
  },
};

function ReportCard({ report }) {
  const Icon = report.icon;
  return (
    <a href={report.href} className="group bg-white border border-[#dfe7f1] rounded-lg p-4 no-underline text-[#111827] hover:border-blue-300 hover:shadow-sm transition-all">
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-none group-hover:bg-blue-600 group-hover:text-white transition-colors">
          <Icon size={17} />
        </span>
        <span className="min-w-0">
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-[#536173]">{report.category}</span>
          <span className="block text-[15px] font-semibold mt-1">{report.title}</span>
          <span className="block text-[13px] text-[#536173] leading-relaxed mt-1.5">{report.description}</span>
          <span className="inline-flex mt-3 text-[12px] font-semibold text-blue-600 group-hover:underline">Open report</span>
        </span>
      </div>
    </a>
  );
}

export function ModuleReportsPage({ type }) {
  const config = MODULES[type] ?? MODULES.sales;
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
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <div className="bg-white border border-[#dfe7f1] rounded-lg p-4">
          <div className="text-xs text-[#536173]">Available Reports</div>
          <div className="text-[22px] font-bold text-[#111827] mt-1">{config.reports.length}</div>
        </div>
        <div className="bg-white border border-[#dfe7f1] rounded-lg p-4">
          <div className="text-xs text-[#536173]">Export Support</div>
          <div className="text-[22px] font-bold text-[#16a34a] mt-1">CSV / Excel</div>
        </div>
        <div className="bg-white border border-[#dfe7f1] rounded-lg p-4">
          <div className="text-xs text-[#536173]">Source</div>
          <div className="text-[22px] font-bold text-[#2563eb] mt-1">Live Data</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {config.reports.map((report) => <ReportCard key={report.title} report={report} />)}
      </div>
    </div>
  );
}

