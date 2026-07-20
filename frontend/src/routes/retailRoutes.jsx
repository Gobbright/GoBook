import { BalanceSheetPage } from '../features/categories/common/modules/accounting/BalanceSheetPage.jsx';
import { AccountingReportsPage } from '../features/categories/common/modules/accounting/AccountingReportsPage.jsx';
import { BankBookPage } from '../features/categories/common/modules/accounting/BankBookPage.jsx';
import { BankReconciliationPage } from '../features/categories/common/modules/accounting/BankReconciliationPage.jsx';
import { CashBookPage } from '../features/categories/common/modules/accounting/CashBookPage.jsx';
import { AccountingVoucherPage } from '../features/categories/common/modules/accounting/AccountingVoucherPage.jsx';
import { JournalEntryPage } from '../features/categories/common/modules/accounting/JournalEntryPage.jsx';
import { LedgerPage } from '../features/categories/common/modules/accounting/LedgerPage.jsx';
import { PnlPage } from '../features/categories/common/modules/accounting/PnlPage.jsx';
import { TrialBalancePage } from '../features/categories/common/modules/accounting/TrialBalancePage.jsx';
import { CustomerLifecyclePage } from '../features/categories/common/modules/crm/CustomerLifecyclePage.jsx';
import { CustomersPage } from '../features/categories/common/modules/crm/CustomersPage.jsx';
import { FollowUpsPage } from '../features/categories/common/modules/crm/FollowUpsPage.jsx';
import { LeadsPage } from '../features/categories/common/modules/crm/LeadsPage.jsx';
import { GstDashboard } from '../features/categories/common/modules/gst/GstDashboard.jsx';
import { GstReconciliation } from '../features/categories/common/modules/gst/GstReconciliation.jsx';
import { GstReports } from '../features/categories/common/modules/gst/GstReports.jsx';
import { Gstr1Page } from '../features/categories/common/modules/gst/Gstr1Page.jsx';
import { Gstr3bPage } from '../features/categories/common/modules/gst/Gstr3bPage.jsx';
import { Gstr9Page } from '../features/categories/common/modules/gst/Gstr9Page.jsx';
import { AttendancePage } from '../features/categories/common/modules/hr-payroll/AttendancePage.jsx';
import { DocumentsPage } from '../features/categories/common/modules/hr-payroll/DocumentsPage.jsx';
import { EmployeesPage } from '../features/categories/common/modules/hr-payroll/EmployeesPage.jsx';
import { LeaveManagementPage } from '../features/categories/common/modules/hr-payroll/LeaveManagementPage.jsx';
import { PayrollPage } from '../features/categories/common/modules/hr-payroll/PayrollPage.jsx';
import { BarcodePage } from '../features/categories/common/modules/inventory/BarcodePage.jsx';
import { ProductsPage } from '../features/categories/common/modules/inventory/ProductsPage.jsx';
import { StockAlertsPage } from '../features/categories/common/modules/inventory/StockAlertsPage.jsx';
import { StockInPage } from '../features/categories/common/modules/inventory/StockInPage.jsx';
import { StockLedgerPage } from '../features/categories/common/modules/inventory/StockLedgerPage.jsx';
import { StockOutPage } from '../features/categories/common/modules/inventory/StockOutPage.jsx';
import { StockSummaryPage } from '../features/categories/common/modules/inventory/StockSummaryPage.jsx';
import { WarehousePage } from '../features/categories/common/modules/inventory/WarehousePage.jsx';
import { EmailMarketingPage } from '../features/categories/common/modules/more-modules/EmailMarketingPage.jsx';
import { ReportsPage } from '../features/categories/common/modules/more-modules/ReportsPage.jsx';
import { SalesManagementPage } from '../features/categories/common/modules/more-modules/SalesManagementPage.jsx';
import { VendorManagementPage } from '../features/categories/common/modules/more-modules/VendorManagementPage.jsx';
import { WhatsAppBusinessPage } from '../features/categories/common/modules/more-modules/WhatsAppBusinessPage.jsx';
import { ModuleReportsPage } from '../features/categories/common/modules/reports/ModuleReportsPage.jsx';
import { ModulePlaceholderPage } from '../components/common/ModulePlaceholderPage.jsx';
import { BusinessSettingsPage } from '../features/categories/common/modules/settings/BusinessSettingsPage.jsx';
import { MultiBranchPage } from '../features/categories/common/modules/settings/MultiBranchPage.jsx';
import { UsersRolesPage } from '../features/categories/common/modules/settings/UsersRolesPage.jsx';

// Common to every category (GST, Accounting, CRM, Inventory, HR & Payroll, More Modules, Settings).
export const commonRoutes = [
  { path: '/gst-dashboard', element: <GstDashboard /> },
  { path: '/gstr-1', element: <Gstr1Page /> },
  { path: '/gstr-3b', element: <Gstr3bPage /> },
  { path: '/gstr-9', element: <Gstr9Page /> },
  { path: '/gst-reconciliation', element: <GstReconciliation /> },
  { path: '/gst-reports', element: <GstReports /> },

  { path: '/vouchers', element: <AccountingVoucherPage /> },
  { path: '/accounting-reports', element: <AccountingReportsPage /> },
  { path: '/ledger', element: <LedgerPage /> },
  { path: '/journal-entry', element: <JournalEntryPage /> },
  { path: '/trial-balance', element: <TrialBalancePage /> },
  { path: '/pnl', element: <PnlPage /> },
  { path: '/balance-sheet', element: <BalanceSheetPage /> },
  { path: '/cash-book', element: <CashBookPage /> },
  { path: '/bank-book', element: <BankBookPage /> },
  { path: '/bank-reconciliation', element: <BankReconciliationPage /> },

  { path: '/customers', element: <CustomersPage /> },
  { path: '/leads', element: <LeadsPage /> },
  { path: '/follow-ups', element: <FollowUpsPage /> },
  { path: '/customer-lifecycle', element: <CustomerLifecyclePage /> },
  { path: '/crm-reports', element: <ModuleReportsPage type="crm" /> },

  { path: '/products', element: <ProductsPage /> },
  { path: '/stock-summary', element: <StockSummaryPage /> },
  { path: '/stock-ledger', element: <StockLedgerPage /> },
  { path: '/inventory-reports', element: <ModuleReportsPage type="inventory" /> },
  { path: '/stock-in', element: <StockInPage /> },
  { path: '/stock-out', element: <StockOutPage /> },
  { path: '/warehouse', element: <WarehousePage /> },
  { path: '/barcode', element: <BarcodePage /> },
  { path: '/stock-alerts', element: <StockAlertsPage /> },

  { path: '/employees', element: <EmployeesPage /> },
  { path: '/attendance', element: <AttendancePage /> },
  { path: '/payroll', element: <PayrollPage /> },
  { path: '/leave-management', element: <LeaveManagementPage /> },
  { path: '/documents', element: <DocumentsPage /> },
  { path: '/hr-reports', element: <ModuleReportsPage type="hr" /> },

  { path: '/sales-management', element: <SalesManagementPage /> },
  { path: '/vendor-management', element: <VendorManagementPage /> },
  { path: '/whatsapp-business', element: <WhatsAppBusinessPage /> },
  { path: '/email-marketing', element: <EmailMarketingPage /> },
  { path: '/reports', element: <ReportsPage /> },

  { path: '/multi-branch', element: <MultiBranchPage /> },
  { path: '/users-roles', element: <UsersRolesPage /> },
  { path: '/business-settings', element: <BusinessSettingsPage /> },
];

// Retail-only (Sales / Billing reports — tied to the Sales nav section, which stays Retail-exclusive).
export const retailRoutes = [
  { path: '/sales-return', element: <ModulePlaceholderPage title="Sales Return" group="Sales" category="Retail" /> },
  { path: '/supplier-returns', element: <ModulePlaceholderPage title="Supplier Returns" group="Purchase" category="Retail" /> },
  { path: '/product-categories', element: <ModulePlaceholderPage title="Categories" group="Inventory" category="Retail" /> },
  { path: '/brands', element: <ModulePlaceholderPage title="Brands" group="Inventory" category="Retail" /> },  { path: '/sales-reports', element: <ModuleReportsPage type="sales" /> },
  { path: '/purchase-reports', element: <ModuleReportsPage type="purchase" /> },
];
