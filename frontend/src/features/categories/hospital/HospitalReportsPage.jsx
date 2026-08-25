import { useCallback, useEffect, useState } from 'react';
import {
  Activity, BedDouble, CalendarDays, CreditCard, Download, FileText,
  FlaskConical, Pill, RefreshCcw, Search, Stethoscope, Users,
} from 'lucide-react';

import { api } from '../../../services/api.js';
import {
  getAccountingVouchers,
  getBankBook,
  getCashBook,
  getLedgerAccounts,
} from '../../../services/accountingService.js';
import { getCustomers, getFollowUps, getLeads } from '../../../services/crmService.js';
import { useModuleRecords } from '../shared/recordUi/useModuleRecords.js';
import { StatusBadge } from '../shared/recordUi/StatusBadge.jsx';

const REPORTS = {
  patient: {
    title: 'Patient Reports',
    subtitle: 'Patients connected with appointments, OPD, IPD, emergency, CRM and staff context.',
    icon: Users,
    modules: ['patients', 'appointments', 'opd', 'ipd', 'emergency', 'history'],
    commonModules: ['crmCustomers', 'crmFollowUps', 'hrEmployees', 'staffUsers'],
  },
  opd: {
    title: 'OPD Reports',
    subtitle: 'Consultation, diagnosis, prescriptions, procedures, follow-ups and staff activity.',
    icon: Stethoscope,
    modules: ['opd', 'appointments', 'prescriptions', 'procedures', 'followUps'],
    commonModules: ['hrEmployees', 'hrAttendance', 'crmFollowUps'],
  },
  ipd: {
    title: 'IPD Reports',
    subtitle: 'Admissions, beds, surgery, OT booking, operation notes, discharge, inventory and vouchers.',
    icon: Activity,
    modules: ['ipd', 'beds', 'surgery', 'ot', 'operationNotes', 'discharge'],
    commonModules: ['hrEmployees', 'hrAttendance', 'inventoryStockOut', 'accountingVouchers'],
  },
  doctor: {
    title: 'Doctor Reports',
    subtitle: 'Doctor schedules, workload, attendance, payroll, leaves, IPD and surgery assignment.',
    icon: Stethoscope,
    modules: ['doctors', 'doctorSchedule', 'appointments', 'opd', 'ipd', 'surgery'],
    commonModules: ['hrEmployees', 'hrAttendance', 'hrPayroll', 'hrLeaves'],
  },
  diagnostics: {
    title: 'Diagnostics Reports',
    subtitle: 'Lab and radiology workflow connected with stock issues and accounting vouchers.',
    icon: FlaskConical,
    modules: ['labWorkflow', 'labReports', 'radiologyWorkflow', 'radiologyReports', 'pendingCharges'],
    commonModules: ['inventoryProducts', 'inventoryStockOut', 'accountingVouchers'],
  },
  pharmacy: {
    title: 'Pharmacy Reports',
    subtitle: 'Prescriptions, dispensing, pharmacy billing, returns, stock, batches and common Inventory.',
    icon: Pill,
    modules: ['prescriptions', 'dispensing', 'pharmacyBilling', 'returns', 'stock'],
    commonModules: ['inventoryProducts', 'inventoryStockIn', 'inventoryStockOut', 'inventoryAlerts', 'warehouses'],
  },
  billing: {
    title: 'Billing Reports',
    subtitle: 'Hospital billing connected with common Accounting, bank/cash books and CRM parties.',
    icon: CreditCard,
    modules: ['billing', 'pharmacyBilling', 'payments', 'refunds', 'estimates'],
    commonModules: ['accountingLedger', 'accountingVouchers', 'cashBook', 'bankBook', 'crmCustomers'],
  },
  bed: {
    title: 'Bed Occupancy Reports',
    subtitle: 'Ward, room, bed, IPD admission, discharge, staff and warehouse context.',
    icon: BedDouble,
    modules: ['beds', 'ipd', 'discharge'],
    commonModules: ['hrEmployees', 'warehouses'],
  },
  occupancyClinical: {
    title: 'Occupancy & Clinical Reports',
    subtitle: 'Combined view across clinical, occupancy, inventory, accounting, CRM, HR and users.',
    icon: FileText,
    modules: ['beds', 'emergency', 'ipd', 'procedures', 'surgery', 'billing'],
    commonModules: ['inventoryProducts', 'accountingVouchers', 'crmCustomers', 'hrEmployees', 'staffUsers'],
  },
};

const MODULES = {
  patients: { label: 'Patients', key: 'hospital/patients' },
  appointments: { label: 'Appointments', key: 'hospital/appointments' },
  opd: { label: 'OPD Visits', key: 'hospital/opd-visits' },
  ipd: { label: 'IPD Admissions', key: 'hospital/ipd-admissions' },
  emergency: { label: 'Emergency Cases', key: 'hospital/emergency-cases' },
  history: { label: 'Medical History', key: 'hospital/medical-history' },
  prescriptions: { label: 'Prescriptions', key: 'hospital/prescription' },
  procedures: { label: 'Procedures', key: 'hospital/procedures' },
  followUps: { label: 'Follow Ups', key: 'hospital/follow-up' },
  doctors: { label: 'Doctors', key: 'hospital/doctors' },
  doctorSchedule: { label: 'Doctor Schedule', key: 'hospital/doctor-schedule' },
  beds: { label: 'Beds / Wards', key: 'hospital/bed-management' },
  surgery: { label: 'Surgery Schedule', key: 'hospital/surgery-schedule' },
  ot: { label: 'OT Booking', key: 'hospital/ot-booking' },
  operationNotes: { label: 'Operation Notes', key: 'hospital/operation-notes' },
  discharge: { label: 'Discharge', key: 'hospital/discharge' },
  labWorkflow: { label: 'Lab Workflow', key: 'hospital/lab-workflow' },
  labReports: { label: 'Lab Reports', key: 'hospital/lab-reports' },
  radiologyWorkflow: { label: 'Radiology Workflow', key: 'hospital/radiology-workflow' },
  radiologyReports: { label: 'Radiology Reports', key: 'hospital/radiology-reports' },
  pendingCharges: { label: 'Pending Charges', key: 'hospital/pending-charges' },
  dispensing: { label: 'Medicine Dispensing', key: 'hospital/pharmacy-dispensing' },
  pharmacyBilling: { label: 'Pharmacy Billing', key: 'hospital/pharmacy-billing' },
  returns: { label: 'Medicine Returns', key: 'hospital/pharmacy-returns' },
  stock: { label: 'Pharmacy Stock', key: 'hospital/pharmacy-stock' },
  billing: { label: 'Hospital Billing', key: 'hospital/billing' },
  payments: { label: 'Payments', key: 'hospital/payments' },
  refunds: { label: 'Refunds', key: 'hospital/refunds' },
  estimates: { label: 'Estimates', key: 'hospital/estimates' },
};

const COMMON_MODULES = {
  inventoryProducts: { label: 'Common Inventory Products', key: 'inventory/products' },
  inventoryStockIn: { label: 'Common Stock In', key: 'inventory/stock-in' },
  inventoryStockOut: { label: 'Common Stock Out', key: 'inventory/stock-out' },
  inventoryAlerts: { label: 'Common Stock Alerts', key: 'inventory/alerts' },
  warehouses: { label: 'Common Warehouses', key: 'inventory/warehouses' },
  accountingLedger: { label: 'Common Ledger', key: 'accounting/ledger' },
  accountingVouchers: { label: 'Common Vouchers', key: 'accounting/vouchers' },
  cashBook: { label: 'Common Cash Book', key: 'accounting/cash-book' },
  bankBook: { label: 'Common Bank Book', key: 'accounting/bank-book' },
  crmCustomers: { label: 'Common CRM Customers', key: 'crm/customers' },
  crmLeads: { label: 'Common CRM Leads', key: 'crm/leads' },
  crmFollowUps: { label: 'Common CRM Follow Ups', key: 'crm/follow-ups' },
  hrEmployees: { label: 'Common HR Employees', key: 'hr-payroll/employees' },
  hrAttendance: { label: 'Common Attendance', key: 'hr-payroll/attendance' },
  hrPayroll: { label: 'Common Payroll', key: 'hr-payroll/payroll' },
  hrLeaves: { label: 'Common Leaves', key: 'hr-payroll/leaves' },
  staffUsers: { label: 'Common Users & Roles', key: 'settings/users' },
};

const COMMON_SOURCE_LOADERS = {
  inventoryProducts: () => api.invListProducts({ page: 1, limit: 500, itemType: 'Product' }),
  inventoryStockIn: () => api.invListStockIn({ page: 1, limit: 500 }),
  inventoryStockOut: () => api.invListStockOut({ page: 1, limit: 500 }),
  inventoryAlerts: () => api.invListAlerts({ page: 1, limit: 500 }),
  warehouses: () => api.invListWarehouses({ page: 1, limit: 500 }),
  accountingLedger: getLedgerAccounts,
  accountingVouchers: () => getAccountingVouchers({ limit: 500 }),
  cashBook: getCashBook,
  bankBook: getBankBook,
  crmCustomers: getCustomers,
  crmLeads: getLeads,
  crmFollowUps: getFollowUps,
  hrEmployees: () => api.hrListEmployees({ page: 1, limit: 500 }),
  hrAttendance: () => api.hrListAttendance({ page: 1, limit: 500 }),
  hrPayroll: () => api.hrListPayroll({ page: 1, limit: 500 }),
  hrLeaves: () => api.hrListLeaves({ page: 1, limit: 500 }),
  staffUsers: () => api.listStaffUsers({ page: 1, limit: 500 }),
};

const DRILLDOWN_ROUTES = {
  patients: '/hospital/patient-registration',
  appointments: '/hospital/appointment-calendar',
  opd: '/hospital/consultation',
  ipd: '/hospital/inpatients',
  emergency: '/hospital/emergency-cases',
  history: '/hospital/medical-history',
  prescriptions: '/hospital/prescription-orders',
  procedures: '/hospital/procedures',
  followUps: '/hospital/follow-up',
  doctors: '/hospital/doctors',
  doctorSchedule: '/hospital/doctor-schedule',
  beds: '/hospital/ward-room-bed',
  surgery: '/hospital/surgery-schedule',
  ot: '/hospital/ot-booking',
  operationNotes: '/hospital/operation-notes',
  discharge: '/hospital/discharge-summary',
  labWorkflow: '/hospital/test-booking',
  labReports: '/hospital/lab-reports',
  radiologyWorkflow: '/hospital/radiology',
  radiologyReports: '/hospital/radiology-reports',
  pendingCharges: '/hospital/new-bill',
  dispensing: '/hospital/medicine-dispensing',
  pharmacyBilling: '/hospital/pharmacy-billing',
  returns: '/hospital/medicine-returns',
  stock: '/hospital/pharmacy-stock',
  billing: '/hospital/bills-invoices',
  payments: '/hospital/payments',
  refunds: '/hospital/refunds',
  estimates: '/hospital/estimates',
  inventoryProducts: '/inventory/products',
  inventoryStockIn: '/inventory/stock-in',
  inventoryStockOut: '/inventory/stock-out',
  inventoryAlerts: '/inventory/alerts',
  warehouses: '/inventory/warehouses',
  accountingLedger: '/accounting/ledger',
  accountingVouchers: '/accounting/vouchers',
  cashBook: '/accounting/cash-book',
  bankBook: '/accounting/bank-book',
  crmCustomers: '/crm/customers',
  crmLeads: '/crm/leads',
  crmFollowUps: '/crm/follow-ups',
  hrEmployees: '/hr-payroll/employees',
  hrAttendance: '/hr-payroll/attendance',
  hrPayroll: '/hr-payroll/payroll',
  hrLeaves: '/hr-payroll/leaves',
  staffUsers: '/business-settings',
};

function toNumber(value) {
  const number = Number(String(value ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(number) ? number : 0;
}

function formatMoney(value) {
  return `Rs. ${toNumber(value).toLocaleString('en-IN')}`;
}

function titleOf(record) {
  const data = record.data || {};
  return data.name || data.description || data.patientName || data.surgery || data.procedure || data.invoiceNo || data.billNo || data.medicine || data.testName || data.voucherNo || data.employeeName || 'Untitled';
}

function dateOf(record) {
  const data = record.data || {};
  return data.date || data.createdAt || data.arrivalDate || data.admissionDate || data.appointmentDate || data.transactionDate || data.voucherDate || '';
}

function partyOf(record) {
  const data = record.data || {};
  return data.patientName || data.patient || data.customerName || data.partyName || data.employeeName || data.name || '-';
}

function statusOf(record) {
  return record.data?.status || record.data?.priority || record.data?.category || record.data?.group || '-';
}

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function metricValue(metric, data) {
  if (metric === 'revenue') return data.reduce((sum, item) => sum + toNumber(item.record.data?.amount || item.record.data?.total || item.record.data?.paidAmount || item.record.data?.netPay), 0);
  if (metric === 'occupied') return data.filter((item) => ['OCCUPIED', 'ADMITTED', 'IN TREATMENT', 'TREATING'].includes(String(statusOf(item.record)).toUpperCase())).length;
  if (metric === 'completed') return data.filter((item) => ['COMPLETED', 'FINALIZED', 'PAID', 'ACTIVE'].includes(String(statusOf(item.record)).toUpperCase())).length;
  return data.length;
}

function normalizeApiRows(response) {
  if (Array.isArray(response)) return response;
  return response?.records
    || response?.data
    || response?.accounts
    || response?.vouchers
    || response?.entries
    || response?.customers
    || response?.leads
    || response?.followUps
    || response?.employees
    || response?.attendance
    || response?.payroll
    || response?.leaves
    || response?.users
    || response?.warehouses
    || response?.alerts
    || [];
}

function normalizeCommonRecord(moduleId, module, row, index) {
  const data = {
    ...row,
    name: row.name || row.description || row.employeeName || row.customerName || row.voucherNo || row.invoiceNo || module.label,
    amount: row.amount || row.total || row.netPay || row.debit || row.credit || row.value || 0,
    status: row.status || row.group || row.type || 'Active',
  };
  return {
    moduleId,
    module,
    record: {
      _id: row._id || row.id || `${moduleId}-${index}`,
      data,
      common: true,
    },
  };
}

function useCommonRows(moduleId, active) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(active);
  const [error, setError] = useState('');

  const reload = useCallback(() => {
    const loader = COMMON_SOURCE_LOADERS[moduleId];
    if (!active || !loader) {
      setRecords([]);
      setLoading(false);
      return Promise.resolve();
    }
    setLoading(true);
    setError('');
    return loader()
      .then((response) => setRecords(normalizeApiRows(response)))
      .catch((err) => {
        setRecords([]);
        setError(err.message || 'Unable to load common module data');
      })
      .finally(() => setLoading(false));
  }, [active, moduleId]);

  useEffect(() => { reload(); }, [reload]);

  return { records, loading, error, reload };
}

function Stat({ label, value, tone = 'blue' }) {
  const tones = {
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    red: 'border-red-200 bg-red-50 text-red-700',
  };
  return (
    <div className={`rounded-lg border px-4 py-3 ${tones[tone] || tones.blue}`}>
      <div className="text-[11px] font-extrabold uppercase opacity-75">{label}</div>
      <div className="mt-1 text-2xl font-extrabold">{value}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-[#cbd5e1] bg-white px-5 py-10 text-center text-[13px] font-semibold text-[#64748b]">
      No connected records found for the selected filters.
    </div>
  );
}

export function HospitalReportsPage({ type = 'patient' }) {
  const report = REPORTS[type] || REPORTS.patient;
  const commonModuleIds = report.commonModules || [];
  const Icon = report.icon;
  const stores = {
    patients: useModuleRecords('hospital/patients'),
    appointments: useModuleRecords('hospital/appointments'),
    opd: useModuleRecords('hospital/opd-visits'),
    ipd: useModuleRecords('hospital/ipd-admissions'),
    emergency: useModuleRecords('hospital/emergency-cases'),
    history: useModuleRecords('hospital/medical-history'),
    prescriptions: useModuleRecords('hospital/prescription'),
    procedures: useModuleRecords('hospital/procedures'),
    followUps: useModuleRecords('hospital/follow-up'),
    doctors: useModuleRecords('hospital/doctors'),
    doctorSchedule: useModuleRecords('hospital/doctor-schedule'),
    beds: useModuleRecords('hospital/bed-management'),
    surgery: useModuleRecords('hospital/surgery-schedule'),
    ot: useModuleRecords('hospital/ot-booking'),
    operationNotes: useModuleRecords('hospital/operation-notes'),
    discharge: useModuleRecords('hospital/discharge'),
    labWorkflow: useModuleRecords('hospital/lab-workflow'),
    labReports: useModuleRecords('hospital/lab-reports'),
    radiologyWorkflow: useModuleRecords('hospital/radiology-workflow'),
    radiologyReports: useModuleRecords('hospital/radiology-reports'),
    pendingCharges: useModuleRecords('hospital/pending-charges'),
    dispensing: useModuleRecords('hospital/pharmacy-dispensing'),
    pharmacyBilling: useModuleRecords('hospital/pharmacy-billing'),
    returns: useModuleRecords('hospital/pharmacy-returns'),
    stock: useModuleRecords('hospital/pharmacy-stock'),
    billing: useModuleRecords('hospital/billing'),
    payments: useModuleRecords('hospital/payments'),
    refunds: useModuleRecords('hospital/refunds'),
    estimates: useModuleRecords('hospital/estimates'),
  };
  const commonStores = {
    inventoryProducts: useCommonRows('inventoryProducts', commonModuleIds.includes('inventoryProducts')),
    inventoryStockIn: useCommonRows('inventoryStockIn', commonModuleIds.includes('inventoryStockIn')),
    inventoryStockOut: useCommonRows('inventoryStockOut', commonModuleIds.includes('inventoryStockOut')),
    inventoryAlerts: useCommonRows('inventoryAlerts', commonModuleIds.includes('inventoryAlerts')),
    warehouses: useCommonRows('warehouses', commonModuleIds.includes('warehouses')),
    accountingLedger: useCommonRows('accountingLedger', commonModuleIds.includes('accountingLedger')),
    accountingVouchers: useCommonRows('accountingVouchers', commonModuleIds.includes('accountingVouchers')),
    cashBook: useCommonRows('cashBook', commonModuleIds.includes('cashBook')),
    bankBook: useCommonRows('bankBook', commonModuleIds.includes('bankBook')),
    crmCustomers: useCommonRows('crmCustomers', commonModuleIds.includes('crmCustomers')),
    crmLeads: useCommonRows('crmLeads', commonModuleIds.includes('crmLeads')),
    crmFollowUps: useCommonRows('crmFollowUps', commonModuleIds.includes('crmFollowUps')),
    hrEmployees: useCommonRows('hrEmployees', commonModuleIds.includes('hrEmployees')),
    hrAttendance: useCommonRows('hrAttendance', commonModuleIds.includes('hrAttendance')),
    hrPayroll: useCommonRows('hrPayroll', commonModuleIds.includes('hrPayroll')),
    hrLeaves: useCommonRows('hrLeaves', commonModuleIds.includes('hrLeaves')),
    staffUsers: useCommonRows('staffUsers', commonModuleIds.includes('staffUsers')),
  };
  const [query, setQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const hospitalConnected = report.modules.flatMap((moduleId) => {
    const module = MODULES[moduleId];
    return (stores[moduleId]?.records || []).map((record) => ({ moduleId, module, record }));
  });
  const commonConnected = commonModuleIds.flatMap((moduleId) => {
    const module = COMMON_MODULES[moduleId];
    return (commonStores[moduleId]?.records || []).map((row, index) => normalizeCommonRecord(moduleId, module, row, index));
  });
  const allConnected = [...hospitalConnected, ...commonConnected];
  const statuses = ['All', ...new Set(allConnected.map((item) => statusOf(item.record)).filter((value) => value && value !== '-'))];
  const q = query.trim().toLowerCase();
  const filtered = allConnected.filter((item) => {
    const moduleMatch = moduleFilter === 'All' || item.moduleId === moduleFilter;
    const statusMatch = statusFilter === 'All' || statusOf(item.record) === statusFilter;
    const searchMatch = !q || JSON.stringify(item.record.data || {}).toLowerCase().includes(q) || item.module.label.toLowerCase().includes(q);
    return moduleMatch && statusMatch && searchMatch;
  });

  const loading = report.modules.some((moduleId) => stores[moduleId]?.loading) || commonModuleIds.some((moduleId) => commonStores[moduleId]?.loading);
  const amountTotal = metricValue('revenue', allConnected);
  const completedTotal = metricValue('completed', allConnected);
  const occupiedTotal = metricValue('occupied', allConnected);

  function refreshAll() {
    report.modules.forEach((moduleId) => stores[moduleId]?.reload());
    commonModuleIds.forEach((moduleId) => commonStores[moduleId]?.reload());
  }

  function exportRows() {
    downloadCsv(`${report.title.toLowerCase().replace(/\s+/g, '-')}.csv`, [
      ['Source Module', 'Record', 'Patient / Party / Staff', 'Date', 'Amount', 'Status', 'Drill-down Route'],
      ...filtered.map((item) => [
        item.module.label,
        titleOf(item.record),
        partyOf(item.record),
        dateOf(item.record),
        toNumber(item.record.data?.amount || item.record.data?.total || item.record.data?.paidAmount || item.record.data?.netPay),
        statusOf(item.record),
        DRILLDOWN_ROUTES[item.moduleId] || '',
      ]),
    ]);
  }

  return (
    <div className="p-4 md:p-7">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 text-[13px] font-semibold text-[#64748b]">Home &gt; Reports &gt; {report.title}</div>
          <h1 className="m-0 flex items-center gap-2 text-[26px] font-extrabold text-[#071936]"><Icon size={24} />{report.title}</h1>
          <p className="m-0 mt-1 text-[13px] font-semibold text-[#64748b]">{report.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={refreshAll} className="inline-flex h-10 items-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-semibold text-[#374151] hover:bg-gray-50"><RefreshCcw size={14} />Refresh</button>
          <button type="button" onClick={exportRows} className="inline-flex h-10 items-center gap-2 rounded-md border border-blue-600 bg-blue-600 px-3 text-[13px] font-semibold text-white hover:bg-blue-700"><Download size={14} />Export</button>
        </div>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Connected Records" value={allConnected.length} />
        <Stat label="Completed / Active" value={completedTotal} tone="green" />
        <Stat label={type === 'billing' ? 'Total Amount' : type === 'bed' ? 'Occupied / Active' : 'Active Signals'} value={type === 'billing' ? formatMoney(amountTotal) : occupiedTotal} tone="amber" />
        <Stat label="Source Modules" value={report.modules.length + commonModuleIds.length} tone="red" />
      </div>

      <section className="rounded-lg border border-[#dfe7f1] bg-white">
        <div className="grid gap-3 border-b border-[#edf2f7] p-4 lg:grid-cols-[minmax(260px,1fr)_240px_220px]">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
            <input className="h-10 w-full rounded-md border border-[#dbe4ef] bg-white px-3 pl-9 text-[13px] font-[inherit] outline-none focus:border-blue-500" placeholder="Search patient / doctor / bill / medicine / surgery / common source" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <select className="h-10 rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-[inherit]" value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value)}>
            <option value="All">All Modules</option>
            {report.modules.map((moduleId) => <option key={moduleId} value={moduleId}>{MODULES[moduleId].label}</option>)}
            {commonModuleIds.map((moduleId) => <option key={moduleId} value={moduleId}>{COMMON_MODULES[moduleId].label}</option>)}
          </select>
          <select className="h-10 rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-[inherit]" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            {statuses.map((status) => <option key={status} value={status}>{status === 'All' ? 'All Status' : status}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-[13px]">
            <thead className="bg-[#f8fafc] text-[11px] uppercase text-[#64748b]">
              <tr>
                <th className="px-4 py-3">Source Module</th>
                <th className="px-4 py-3">Record</th>
                <th className="px-4 py-3">Patient / Party / Staff</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Open</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan="7" className="px-4 py-8 text-center text-[#64748b]">Loading connected module data...</td></tr>}
              {!loading && filtered.map((item) => (
                <tr key={`${item.moduleId}-${item.record._id}`} className="border-t border-[#edf2f7]">
                  <td className="px-4 py-3">
                    <span className="font-semibold text-[#334155]">{item.module.label}</span>
                    {item.record.common && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold uppercase text-slate-600">Common</span>}
                  </td>
                  <td className="px-4 py-3 font-semibold text-[#111827]">{titleOf(item.record)}</td>
                  <td className="px-4 py-3 text-[#475569]">{partyOf(item.record)}</td>
                  <td className="px-4 py-3 text-[#475569]"><CalendarDays size={13} className="mr-1 inline" />{dateOf(item.record) || '-'}</td>
                  <td className="px-4 py-3 text-[#475569]">{formatMoney(item.record.data?.amount || item.record.data?.total || item.record.data?.paidAmount || item.record.data?.netPay)}</td>
                  <td className="px-4 py-3"><StatusBadge value={statusOf(item.record)} /></td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => window.location.assign(DRILLDOWN_ROUTES[item.moduleId] || '/hospital/patient-reports')} className="rounded-md border border-[#dbe4ef] bg-white px-2.5 py-1 text-[12px] font-semibold text-blue-700 hover:bg-blue-50">Open Source</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length === 0 && <div className="p-4"><EmptyState /></div>}
      </section>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {report.modules.map((moduleId) => {
          const module = MODULES[moduleId];
          const count = stores[moduleId]?.records.length || 0;
          return (
            <div key={moduleId} className="rounded-lg border border-[#dfe7f1] bg-white p-4">
              <div className="text-[12px] font-extrabold uppercase text-[#64748b]">{module.label}</div>
              <div className="mt-2 text-2xl font-extrabold text-[#071936]">{count}</div>
              <div className="mt-1 text-[12px] font-semibold text-[#94a3b8]">Source: {module.key}</div>
            </div>
          );
        })}
        {commonModuleIds.map((moduleId) => {
          const module = COMMON_MODULES[moduleId];
          const count = commonStores[moduleId]?.records.length || 0;
          const error = commonStores[moduleId]?.error;
          return (
            <div key={moduleId} className="rounded-lg border border-[#dfe7f1] bg-white p-4">
              <div className="text-[12px] font-extrabold uppercase text-[#64748b]">{module.label}</div>
              <div className="mt-2 text-2xl font-extrabold text-[#071936]">{count}</div>
              <div className="mt-1 text-[12px] font-semibold text-[#94a3b8]">Source: {module.key}</div>
              {error && <div className="mt-2 text-[12px] font-semibold text-amber-700">{error}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
