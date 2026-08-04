import { AccountingPosting } from '../../models/AccountingPosting.js';
import { AccountingVoucher } from '../../models/AccountingVoucher.js';
import { Attendance } from '../../models/Attendance.js';
import { AttendanceCorrection } from '../../models/AttendanceCorrection.js';
import { BankBookEntry } from '../../models/BankBookEntry.js';
import { Branch } from '../../models/Branch.js';
import { BusinessSettings } from '../../models/BusinessSettings.js';
import { CashBookEntry } from '../../models/CashBookEntry.js';
import { Customer } from '../../models/Customer.js';
import { HRDocument } from '../../models/Document.js';
import { EmailCampaign } from '../../models/EmailCampaign.js';
import { Employee } from '../../models/Employee.js';
import { EmployeeLogin } from '../../models/EmployeeLogin.js';
import { FollowUp } from '../../models/FollowUp.js';
import { GstReconciliation } from '../../models/GstReconciliation.js';
import { Gstr1 } from '../../models/Gstr1.js';
import { Gstr3b } from '../../models/Gstr3b.js';
import { Invoice } from '../../models/Invoice.js';
import { JournalEntry } from '../../models/JournalEntry.js';
import { Lead } from '../../models/Lead.js';
import { Leave } from '../../models/Leave.js';
import { LedgerAccount } from '../../models/LedgerAccount.js';
import { ModuleRecord } from '../../models/ModuleRecord.js';
import { Notice } from '../../models/Notice.js';
import { Payment } from '../../models/Payment.js';
import { Payroll } from '../../models/Payroll.js';
import { Product } from '../../models/Product.js';
import { ProductBrand } from '../../models/ProductBrand.js';
import { ProductCategory } from '../../models/ProductCategory.js';
import { SalesRecord } from '../../models/SalesRecord.js';
import { StockIn } from '../../models/StockIn.js';
import { StockOut } from '../../models/StockOut.js';
import { Vendor } from '../../models/Vendor.js';
import { Warehouse } from '../../models/Warehouse.js';
import { WhatsAppCampaign } from '../../models/WhatsAppCampaign.js';

export const DATA_COLLECTIONS = [
  { key: 'businessSettings', label: 'Business Settings', model: BusinessSettings, ownerField: 'userId', dateFields: ['updatedAt', 'createdAt'], deletable: false },
  { key: 'branches', label: 'Branches', model: Branch, ownerField: 'userId', dateFields: ['createdAt'] },
  { key: 'customers', label: 'Customers', model: Customer, ownerField: 'userId', dateFields: ['createdAt'] },
  { key: 'leads', label: 'Leads', model: Lead, ownerField: 'userId', dateFields: ['createdAt'] },
  { key: 'followUps', label: 'Follow Ups', model: FollowUp, ownerField: 'userId', dateFields: ['dueDate', 'createdAt'] },
  { key: 'products', label: 'Products', model: Product, ownerField: 'userId', dateFields: ['createdAt'] },
  { key: 'productCategories', label: 'Product Categories', model: ProductCategory, ownerField: 'userId', dateFields: ['createdAt'] },
  { key: 'productBrands', label: 'Product Brands', model: ProductBrand, ownerField: 'userId', dateFields: ['createdAt'] },
  { key: 'warehouses', label: 'Warehouses', model: Warehouse, ownerField: 'userId', dateFields: ['createdAt'] },
  { key: 'stockIn', label: 'Stock In', model: StockIn, ownerField: 'userId', dateFields: ['date', 'createdAt'] },
  { key: 'stockOut', label: 'Stock Out', model: StockOut, ownerField: 'userId', dateFields: ['date', 'createdAt'] },
  { key: 'invoices', label: 'Invoices & Billing', model: Invoice, ownerField: 'userId', dateFields: ['meta.date', 'createdAt'] },
  { key: 'payments', label: 'Payments', model: Payment, ownerField: 'userId', dateFields: ['date', 'createdAt'] },
  { key: 'salesRecords', label: 'Sales Management', model: SalesRecord, ownerField: 'userId', dateFields: ['date', 'createdAt'] },
  { key: 'vendors', label: 'Vendors', model: Vendor, ownerField: 'userId', dateFields: ['createdAt'] },
  { key: 'ledgerAccounts', label: 'Ledger Accounts', model: LedgerAccount, ownerField: 'userId', dateFields: ['createdAt'] },
  { key: 'journalEntries', label: 'Journal Entries', model: JournalEntry, ownerField: 'userId', dateFields: ['date', 'createdAt'] },
  { key: 'accountingVouchers', label: 'Accounting Vouchers', model: AccountingVoucher, ownerField: 'userId', dateFields: ['date', 'createdAt'] },
  { key: 'accountingPostings', label: 'Accounting Postings', model: AccountingPosting, ownerField: 'userId', dateFields: ['date', 'createdAt'] },
  { key: 'cashBookEntries', label: 'Cash Book', model: CashBookEntry, ownerField: 'userId', dateFields: ['date', 'createdAt'] },
  { key: 'bankBookEntries', label: 'Bank Book', model: BankBookEntry, ownerField: 'userId', dateFields: ['date', 'createdAt'] },
  { key: 'gstr1', label: 'GSTR-1', model: Gstr1, ownerField: 'userId', dateFields: ['period', 'createdAt'] },
  { key: 'gstr3b', label: 'GSTR-3B', model: Gstr3b, ownerField: 'userId', dateFields: ['period', 'createdAt'] },
  { key: 'gstReconciliation', label: 'GST Reconciliation', model: GstReconciliation, ownerField: 'userId', dateFields: ['period', 'createdAt'] },
  { key: 'employees', label: 'Employees', model: Employee, ownerField: 'userId', dateFields: ['createdAt'] },
  { key: 'attendance', label: 'Attendance', model: Attendance, ownerField: 'userId', dateFields: ['date', 'createdAt'] },
  { key: 'attendanceCorrections', label: 'Attendance Corrections', model: AttendanceCorrection, ownerField: 'ownerUserId', dateFields: ['date', 'createdAt'] },
  { key: 'leaves', label: 'Leaves', model: Leave, ownerField: 'userId', dateFields: ['fromDate', 'toDate', 'createdAt'] },
  { key: 'payroll', label: 'Payroll', model: Payroll, ownerField: 'userId', dateFields: ['month', 'createdAt'] },
  { key: 'documents', label: 'Documents', model: HRDocument, ownerField: 'userId', dateFields: ['uploadedAt', 'createdAt'] },
  { key: 'notices', label: 'Notices', model: Notice, ownerField: 'ownerUserId', dateFields: ['publishDate', 'createdAt'] },
  { key: 'employeeLogins', label: 'Employee Portal Logins', model: EmployeeLogin, ownerField: 'ownerUserId', dateFields: ['createdAt'], sensitiveFields: ['passwordHash'] },
  { key: 'emailCampaigns', label: 'Email Campaigns', model: EmailCampaign, ownerField: 'userId', dateFields: ['createdAt'] },
  { key: 'whatsAppCampaigns', label: 'WhatsApp Campaigns', model: WhatsAppCampaign, ownerField: 'userId', dateFields: ['createdAt'] },
  { key: 'moduleRecords', label: 'Category Module Records', model: ModuleRecord, ownerField: 'userId', dateFields: ['data.date', 'createdAt'] },
];

export const DATA_COLLECTIONS_BY_KEY = new Map(DATA_COLLECTIONS.map((collection) => [collection.key, collection]));
