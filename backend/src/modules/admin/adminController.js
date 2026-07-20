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
  { key: 'users', label: 'Users', model: AppUser, fields: ['name', 'email', 'phone', 'role', 'status', 'businessName', 'category', 'subscriptionPlan', 'subscriptionAmount', 'authProvider', 'createdAt', 'lastLogin'] },
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


function getCollectionConfig(section) {
  return COLLECTIONS.find((c) => c.key === section);
}

function cleanMutationPayload(payload = {}) {
  const clean = { ...payload };
  delete clean.id;
  delete clean._id;
  delete clean.createdAt;
  delete clean.updatedAt;
  delete clean.__v;
  return clean;
}
function pickFields(doc, fields) {
  const row = { id: doc._id, createdAt: doc.createdAt, updatedAt: doc.updatedAt };
  for (const field of fields) {
    if (field === 'mode') row[field] = doc.mode ?? doc.method ?? '';
    else if (field === 'status' && doc.status == null) row[field] = 'success';
    else row[field] = doc[field] ?? '';
  }
  return row;
}


function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

async function getAdminPanelStats() {
  const today = startOfToday();
  const [
    totalUsers,
    activeUsers,
    blockedUsers,
    todayRegistrations,
    allUsers,
    payments,
  ] = await Promise.all([
    AppUser.countDocuments(),
    AppUser.countDocuments({ status: /^active$/i }),
    AppUser.countDocuments({ status: /^blocked$/i }),
    AppUser.countDocuments({ createdAt: { $gte: today } }),
    AppUser.find({}).select('name email businessName category subscriptionPlan subscriptionAmount status createdAt lastLogin phone').lean(),
    Payment.find({}).select('amount status date createdAt customerName mode').lean(),
  ]);

  const subscriptionCounts = allUsers.reduce((acc, user) => {
    const plan = user.subscriptionPlan || 'noPlan';
    acc[plan] = (acc[plan] || 0) + 1;
    return acc;
  }, {});

  const totalRevenue = payments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
  const successfulPayments = payments.filter((payment) => /^success|paid|completed$/i.test(String(payment.status || ''))).length;
  const failedPayments = payments.filter((payment) => /^fail|failed|cancelled$/i.test(String(payment.status || ''))).length;
  const pendingPayments = payments.filter((payment) => /^pending|processing$/i.test(String(payment.status || ''))).length;

  return {
    totalUsers,
    activeUsers,
    expiredUsers: 0,
    blockedUsers,
    todayRegistrations,
    upcomingRenewals: 0,
    totalRevenue,
    trialUsers: subscriptionCounts.noPlan || 0,
    activeSubscriptions: totalUsers - (subscriptionCounts.noPlan || 0),
    expiredSubscriptions: 0,
    renewalRequests: 0,
    renewalHistory: payments.length,
    allPayments: payments.length,
    pendingPayments,
    successfulPayments,
    failedPayments,
    subscriptionCounts,
    users: allUsers.slice(0, 20),
    payments: payments.slice(0, 20),
  };
}
async function summarizeCollection(item) {
  const [count, latest] = await Promise.all([
    item.model.countDocuments(),
    item.model.find({}).sort({ createdAt: -1, _id: -1 }).limit(1000).lean(),
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
    const panel = await getAdminPanelStats();
    res.json({ generatedAt: new Date().toISOString(), totals, sections, panel });
  } catch (err) {
    next(err);
  }
}

export async function getAdminSection(req, res, next) {
  try {
    const { section } = req.params;
    const collectionConfig = getCollectionConfig(section);
    if (!collectionConfig) {
      return next(httpError(404, `Section "${section}" not found`));
    }
    const data = await summarizeCollection(collectionConfig);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function getAdminStats(_req, res, next) {
  try {
    const stats = await Promise.all(COLLECTIONS.map(async (config) => ({
      key: config.key,
      label: config.label,
      count: await config.model.countDocuments(),
    })));
    res.json({ stats, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}




export async function getAdminRecords(req, res, next) {
  try {
    const { kind } = req.params;
    const config = ADMIN_RECORD_TYPES[kind];
    if (!config) return next(httpError(404, `Admin record type "${kind}" not found`));

    await ensureAdminRecord(kind);
    const docs = await AdminRecord.find({ kind }).sort({ createdAt: -1, _id: -1 }).limit(1000).lean();
    res.json({
      key: kind,
      label: config.label,
      group: config.group,
      count: docs.length,
      fields: ['title', 'status', 'amount', 'target', 'scheduledDate', 'notes', 'createdAt'],
      rows: docs.map(pickAdminRecord),
    });
  } catch (err) {
    next(err);
  }
}

export async function createAdminRecord(req, res, next) {
  try {
    const { kind } = req.params;
    const config = ADMIN_RECORD_TYPES[kind];
    if (!config) return next(httpError(404, `Admin record type "${kind}" not found`));

    const doc = await AdminRecord.create({
      kind,
      group: config.group,
      title: req.body.title || config.title,
      status: req.body.status || config.status,
      amount: Number(req.body.amount || config.amount || 0),
      target: req.body.target || 'All Users',
      notes: req.body.notes || config.notes,
      scheduledDate: req.body.scheduledDate || new Date().toISOString().slice(0, 10),
    });
    res.status(201).json({ record: pickAdminRecord(doc) });
  } catch (err) {
    next(err);
  }
}


export async function updateAdminSectionRow(req, res, next) {
  try {
    const { section, id } = req.params;
    const collectionConfig = getCollectionConfig(section);
    if (!collectionConfig) return next(httpError(404, `Section "${section}" not found`));

    const updated = await collectionConfig.model.findByIdAndUpdate(id, cleanMutationPayload(req.body), { new: true, runValidators: true }).lean();
    if (!updated) return next(httpError(404, 'Record not found'));
    res.json({ row: pickFields(updated, collectionConfig.fields) });
  } catch (err) {
    next(err);
  }
}

export async function deleteAdminSectionRow(req, res, next) {
  try {
    const { section, id } = req.params;
    const collectionConfig = getCollectionConfig(section);
    if (!collectionConfig) return next(httpError(404, `Section "${section}" not found`));

    const deleted = await collectionConfig.model.findByIdAndDelete(id).lean();
    if (!deleted) return next(httpError(404, 'Record not found'));
    res.json({ deleted: true, id });
  } catch (err) {
    next(err);
  }
}

export async function updateAdminRecord(req, res, next) {
  try {
    const { kind, id } = req.params;
    if (!ADMIN_RECORD_TYPES[kind]) return next(httpError(404, `Admin record type "${kind}" not found`));
    const updated = await AdminRecord.findOneAndUpdate({ _id: id, kind }, cleanMutationPayload(req.body), { new: true, runValidators: true }).lean();
    if (!updated) return next(httpError(404, 'Record not found'));
    res.json({ row: pickAdminRecord(updated) });
  } catch (err) {
    next(err);
  }
}

export async function deleteAdminRecord(req, res, next) {
  try {
    const { kind, id } = req.params;
    if (!ADMIN_RECORD_TYPES[kind]) return next(httpError(404, `Admin record type "${kind}" not found`));
    const deleted = await AdminRecord.findOneAndDelete({ _id: id, kind }).lean();
    if (!deleted) return next(httpError(404, 'Record not found'));
    res.json({ deleted: true, id });
  } catch (err) {
    next(err);
  }
}
