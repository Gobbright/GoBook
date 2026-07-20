import { AccountingPosting } from '../../models/AccountingPosting.js';
import { AccountingVoucher } from '../../models/AccountingVoucher.js';
import { AppUser } from '../../models/AppUser.js';
import { Attendance } from '../../models/Attendance.js';
import { BankBookEntry } from '../../models/BankBookEntry.js';
import { Branch } from '../../models/Branch.js';
import { Business } from '../../models/Business.js';
import { BusinessSettings } from '../../models/BusinessSettings.js';
import { CashBookEntry } from '../../models/CashBookEntry.js';
import { Customer } from '../../models/Customer.js';
import { HRDocument } from '../../models/Document.js';
import { EmailCampaign } from '../../models/EmailCampaign.js';
import { Employee } from '../../models/Employee.js';
import { FollowUp } from '../../models/FollowUp.js';
import { Gstr1 } from '../../models/Gstr1.js';
import { Gstr3b } from '../../models/Gstr3b.js';
import { GstReconciliation } from '../../models/GstReconciliation.js';
import { Invoice } from '../../models/Invoice.js';
import { JournalEntry } from '../../models/JournalEntry.js';
import { Lead } from '../../models/Lead.js';
import { Leave } from '../../models/Leave.js';
import { LedgerAccount } from '../../models/LedgerAccount.js';
import { Payment } from '../../models/Payment.js';
import { Payroll } from '../../models/Payroll.js';
import { Product } from '../../models/Product.js';
import { SalesRecord } from '../../models/SalesRecord.js';
import { StockIn } from '../../models/StockIn.js';
import { StockOut } from '../../models/StockOut.js';
import { Vendor } from '../../models/Vendor.js';
import { Warehouse } from '../../models/Warehouse.js';
import { WhatsAppCampaign } from '../../models/WhatsAppCampaign.js';
import { env } from '../../config/env.js';
import { httpError } from '../../utils/httpError.js';
import { signAdminToken } from './adminAuth.js';

const COLLECTIONS = [
  { key: 'businesses', label: 'Businesses', model: Business, fields: ['name', 'category', 'createdAt'] },
  { key: 'users', label: 'Users', model: AppUser, fields: ['name', 'email', 'role', 'status', 'businessName', 'category', 'authProvider', 'lastLogin'] },
  { key: 'businessSettings', label: 'Business Settings', model: BusinessSettings, fields: ['businessName', 'businessEmail', 'phone', 'gstin', 'city', 'state'] },
  { key: 'branches', label: 'Branches', model: Branch, fields: ['name', 'code', 'city', 'state', 'status'] },
  { key: 'customers', label: 'Customers', model: Customer, fields: ['name', 'email', 'phone', 'gstin', 'city'] },
  { key: 'leads', label: 'CRM Leads', model: Lead, fields: ['name', 'phone', 'email', 'status', 'source', 'assignedTo'] },
  { key: 'followUps', label: 'Follow Ups', model: FollowUp, fields: ['leadName', 'customerName', 'date', 'status', 'remarks'] },
  { key: 'invoices', label: 'Invoices & Billing', model: Invoice, fields: ['number', 'documentType', 'customerName', 'grandTotal', 'status', 'createdAt'] },
  { key: 'payments', label: 'Payments', model: Payment, fields: ['customerName', 'amount', 'mode', 'status', 'date'] },
  { key: 'products', label: 'Products', model: Product, fields: ['name', 'sku', 'category', 'stock', 'sellingPrice', 'status'] },
  { key: 'warehouses', label: 'Warehouses', model: Warehouse, fields: ['name', 'code', 'city', 'status'] },
  { key: 'stockIns', label: 'Stock In', model: StockIn, fields: ['stockInNo', 'vendorName', 'totalAmount', 'status', 'date'] },
  { key: 'stockOuts', label: 'Stock Out', model: StockOut, fields: ['stockOutNo', 'customerName', 'totalAmount', 'status', 'date'] },
  { key: 'vendors', label: 'Vendors', model: Vendor, fields: ['name', 'email', 'phone', 'gstin', 'status'] },
  { key: 'employees', label: 'Employees', model: Employee, fields: ['name', 'employeeId', 'department', 'designation', 'status'] },
  { key: 'attendance', label: 'Attendance', model: Attendance, fields: ['employeeName', 'date', 'status', 'checkIn', 'checkOut'] },
  { key: 'payroll', label: 'Payroll', model: Payroll, fields: ['employeeName', 'month', 'netSalary', 'status'] },
  { key: 'leaves', label: 'Leaves', model: Leave, fields: ['employeeName', 'leaveType', 'fromDate', 'toDate', 'status'] },
  { key: 'documents', label: 'HR Documents', model: HRDocument, fields: ['employee', 'category', 'fileName', 'uploadedBy', 'createdAt'] },
  { key: 'ledgerAccounts', label: 'Ledger Accounts', model: LedgerAccount, fields: ['name', 'group', 'openingBalance', 'type'] },
  { key: 'journalEntries', label: 'Journal Entries', model: JournalEntry, fields: ['entryNo', 'date', 'narration', 'totalDebit', 'totalCredit'] },
  { key: 'accountingVouchers', label: 'Accounting Vouchers', model: AccountingVoucher, fields: ['voucherNo', 'voucherType', 'partyName', 'amount', 'date'] },
  { key: 'accountingPostings', label: 'Accounting Postings', model: AccountingPosting, fields: ['voucherNo', 'ledgerName', 'debit', 'credit', 'date'] },
  { key: 'cashBook', label: 'Cash Book', model: CashBookEntry, fields: ['vchNo', 'particulars', 'receipt', 'payment', 'date'] },
  { key: 'bankBook', label: 'Bank Book', model: BankBookEntry, fields: ['vchNo', 'bankName', 'receipt', 'payment', 'date'] },
  { key: 'gstr1', label: 'GSTR-1', model: Gstr1, fields: ['period', 'status', 'totalTaxableValue', 'totalTax'] },
  { key: 'gstr3b', label: 'GSTR-3B', model: Gstr3b, fields: ['period', 'status', 'totalTax', 'netTaxPayable'] },
  { key: 'gstReconciliation', label: 'GST Reconciliation', model: GstReconciliation, fields: ['period', 'status', 'matched', 'mismatched'] },
  { key: 'salesRecords', label: 'Sales Records', model: SalesRecord, fields: ['number', 'customerName', 'amount', 'status', 'date'] },
  { key: 'emailCampaigns', label: 'Email Campaigns', model: EmailCampaign, fields: ['name', 'subject', 'status', 'sentCount', 'createdAt'] },
  { key: 'whatsAppCampaigns', label: 'WhatsApp Campaigns', model: WhatsAppCampaign, fields: ['name', 'status', 'sentCount', 'createdAt'] },
];

function pickFields(doc, fields) {
  const row = { id: doc._id, createdAt: doc.createdAt, updatedAt: doc.updatedAt };
  for (const field of fields) row[field] = doc[field] ?? '';
  return row;
}

async function summarizeCollection(item) {
  const [count, latest] = await Promise.all([
    item.model.countDocuments(),
    item.model.find({}).sort({ createdAt: -1, _id: -1 }).limit(20).lean(),
  ]);
  return {
    key: item.key,
    label: item.label,
    count,
    fields: item.fields,
    rows: latest.map((doc) => pickFields(doc, item.fields)),
  };
}

export async function loginAdmin(req, res, next) {
  try {
    const { adminId = '', password = '' } = req.body;
    if (adminId !== env.adminLoginId || password !== env.adminLoginPassword) {
      return next(httpError(401, 'Invalid admin ID or password'));
    }
    res.json({ token: signAdminToken(), admin: { id: env.adminLoginId, name: 'Admin Panel' } });
  } catch (err) {
    next(err);
  }
}

export async function getAdminDashboard(_req, res, next) {
  try {
    const sections = await Promise.all(COLLECTIONS.map(summarizeCollection));
    const byKey = Object.fromEntries(sections.map((section) => [section.key, section]));
    const totals = {
      businesses: byKey.businesses?.count ?? 0,
      users: byKey.users?.count ?? 0,
      customers: byKey.customers?.count ?? 0,
      invoices: byKey.invoices?.count ?? 0,
      payments: byKey.payments?.count ?? 0,
      products: byKey.products?.count ?? 0,
      employees: byKey.employees?.count ?? 0,
      leads: byKey.leads?.count ?? 0,
    };
    res.json({ generatedAt: new Date().toISOString(), totals, sections });
  } catch (err) {
    next(err);
  }
}