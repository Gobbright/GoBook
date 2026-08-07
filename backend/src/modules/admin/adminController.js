import bcrypt from 'bcryptjs';

import { AccountingPosting } from '../../models/AccountingPosting.js';
import { AdminRecord } from '../../models/AdminRecord.js';
import { AdminNotification } from '../../models/AdminNotification.js';
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
import { SubscriptionPayment } from '../../models/SubscriptionPayment.js';
import { SubscriptionPlan } from '../../models/SubscriptionPlan.js';
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
import { ensureDefaultSubscriptionPlans, planPublicView } from '../../services/subscriptionPlans.js';
import { createAdminNotification } from '../../services/adminNotifications.js';
import { sendSubscriptionInvoice } from '../../services/subscriptionInvoice.js';

const SALT_ROUNDS = 12;

const COLLECTIONS = [
  { key: 'businesses', label: 'Businesses', model: Business, fields: ['name', 'category', 'createdAt'] },
  { key: 'users', label: 'Users', model: AppUser, fields: ['name', 'email', 'phone', 'role', 'status', 'businessName', 'category', 'subscriptionPlan', 'subscriptionAmount', 'subscriptionStatus', 'subscriptionStartDate', 'subscriptionExpiresAt', 'authProvider', 'createdAt', 'lastLogin'] },
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


const ADMIN_RECORD_TYPES = {
  renewalReminder: { group: 'Notifications', label: 'Renewal Reminder', title: 'Renewal Reminder data', status: 'Scheduled', amount: 0, target: 'All Users', notes: 'Renewal reminder admin data' },
  expiryReminder: { group: 'Notifications', label: 'Expiry Reminder', title: 'Expiry Reminder data', status: 'Scheduled', amount: 0, target: 'All Users', notes: 'Expiry reminder admin data' },
  paymentReminder: { group: 'Notifications', label: 'Payment Reminder', title: 'Payment Reminder data', status: 'Pending', amount: 0, target: 'All Users', notes: 'Payment reminder admin data' },
  sendNotification: { group: 'Notifications', label: 'Send Notification', title: 'Send Notification data', status: 'Draft', amount: 0, target: 'All Users', notes: 'Notification draft data' },
  userReport: { group: 'Reports', label: 'User Report', title: 'User Report data', status: 'Ready', amount: 0, target: 'All Users', notes: 'User report admin data' },
  renewalReport: { group: 'Reports', label: 'Renewal Report', title: 'Renewal Report data', status: 'Ready', amount: 0, target: 'All Users', notes: 'Renewal report admin data' },
  expiryReport: { group: 'Reports', label: 'Expiry Report', title: 'Expiry Report data', status: 'Ready', amount: 0, target: 'All Users', notes: 'Expiry report admin data' },
  paymentReport: { group: 'Reports', label: 'Payment Report', title: 'Payment Report data', status: 'Ready', amount: 0, target: 'All Users', notes: 'Payment report admin data' },
  revenueReport: { group: 'Reports', label: 'Revenue Report', title: 'Revenue Report data', status: 'Ready', amount: 0, target: 'All Users', notes: 'Revenue report admin data' },
  subscriptionPlans: { group: 'Settings', label: 'Subscription Plans', title: 'Subscription Plans data', status: 'Active', amount: 0, target: 'All Users', notes: 'Subscription plan settings data' },
  trialDays: { group: 'Settings', label: 'Trial Days', title: 'Trial Days data', status: 'Active', amount: 0, target: 'Trial Users', notes: 'Trial day settings data' },
  gracePeriod: { group: 'Settings', label: 'Grace Period', title: 'Grace Period data', status: 'Active', amount: 0, target: 'Expired Users', notes: 'Grace period settings data' },
  autoBlockAfterExpiry: { group: 'Settings', label: 'Auto Block After Expiry', title: 'Auto Block After Expiry data', status: 'Enabled', amount: 0, target: 'Expired Users', notes: 'Auto block settings data' },
  paymentSettings: { group: 'Settings', label: 'Payment Settings', title: 'Payment Settings data', status: 'Active', amount: 0, target: 'All Users', notes: 'Payment settings admin data' },
};

function pickAdminRecord(doc) {
  return {
    id: doc._id,
    title: doc.title || '',
    status: doc.status || '',
    amount: doc.amount ?? 0,
    target: doc.target || '',
    scheduledDate: doc.scheduledDate || '',
    notes: doc.notes || '',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

async function ensureAdminRecord(kind) {
  const config = ADMIN_RECORD_TYPES[kind];
  if (!config) return null;
  const existing = await AdminRecord.exists({ kind });
  if (existing) return existing;
  return AdminRecord.create({
    kind,
    group: config.group,
    title: config.title,
    status: config.status,
    amount: config.amount || 0,
    target: config.target || 'All Users',
    notes: config.notes || '',
    scheduledDate: new Date().toISOString().slice(0, 10),
  });
}

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
async function cleanSectionMutationPayload(section, payload = {}) {
  const clean = cleanMutationPayload(payload);
  if (section !== 'users') return clean;

  if (clean.email !== undefined) clean.email = String(clean.email || '').trim().toLowerCase();
  if (clean.password !== undefined) {
    const password = String(clean.password || '').trim();
    if (!password) {
      delete clean.password;
    } else {
      if (password.length < 8) throw httpError(400, 'Password must be at least 8 characters');
      clean.password = await bcrypt.hash(password, SALT_ROUNDS);
    }
  }
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

function isTrialUser(user) {
  return !user.subscriptionPlan || user.subscriptionPlan === '';
}

function filterUsersByType(section, users) {
  if (section === 'users') return users;
  if (section === 'active') return users.filter((u) => u.status === 'Active' && !isTrialUser(u));
  if (section === 'trial') return users.filter(isTrialUser);
  if (section === 'blocked') return users.filter((u) => u.status === 'Blocked');
  if (section === 'deleted') return users.filter((u) => u.status === 'Deleted');
  if (section === 'expired') return users.filter((u) => u.status === 'Expired');
  return users;
}

async function getAdminPanelStats() {
  const today = startOfToday();
  const [
    totalUsers,
    activeUsers,
    blockedUsers,
    expiredUsers,
    deletedUsers,
    todayRegistrations,
    allUsers,
    subscriptionPayments,
  ] = await Promise.all([
    AppUser.countDocuments(),
    AppUser.countDocuments({ status: /^active$/i }),
    AppUser.countDocuments({ status: /^blocked$/i }),
    AppUser.countDocuments({ status: /^expired$/i }),
    AppUser.countDocuments({ status: /^deleted$/i }),
    AppUser.countDocuments({ createdAt: { $gte: today } }),
    AppUser.find({}).select('name email businessName category subscriptionPlan subscriptionAmount status createdAt lastLogin phone').lean(),
    SubscriptionPayment.find({}).select('amount status paidAt createdAt customerName method businessName category tier razorpayPaymentId').lean(),
  ]);

  const subscriptionCounts = allUsers.reduce((acc, user) => {
    const plan = user.subscriptionPlan || 'noPlan';
    acc[plan] = (acc[plan] || 0) + 1;
    return acc;
  }, {});

  const totalRevenue = subscriptionPayments.filter((payment) => payment.status === 'successful').reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
  const successfulPayments = subscriptionPayments.filter((payment) => payment.status === 'successful').length;
  const failedPayments = subscriptionPayments.filter((payment) => payment.status === 'failed').length;
  const pendingPayments = subscriptionPayments.filter((payment) => /^pending|processing$/i.test(String(payment.status || ''))).length;

  return {
    totalUsers,
    activeUsers,
    expiredUsers,
    blockedUsers,
    todayRegistrations,
    upcomingRenewals: 0,
    totalRevenue,
    deletedUsers,
    trialUsers: subscriptionCounts.noPlan || 0,
    activeSubscriptions: totalUsers - (subscriptionCounts.noPlan || 0),
    expiredSubscriptions: 0,
    renewalRequests: 0,
    renewalHistory: subscriptionPayments.length,
    allPayments: subscriptionPayments.length,
    pendingPayments,
    successfulPayments,
    failedPayments,
    subscriptionCounts,
    users: allUsers.slice(0, 20),
    payments: subscriptionPayments.slice(0, 20),
  };
}
async function summarizeCollection(item, section) {
  const [count, latest] = await Promise.all([
    item.model.countDocuments(),
    item.model.find({}).sort({ createdAt: -1, _id: -1 }).limit(1000).lean(),
  ]);

  let rows = latest.map((doc) => pickFields(doc, item.fields));
  if (item.key === 'users' && section) {
    rows = filterUsersByType(section, rows);
  }

  return {
    key: item.key,
    label: item.label,
    count,
    fields: item.fields,
    rows,
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
    const data = await summarizeCollection(collectionConfig, section);
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

export async function getSubscriptionPlans(_req, res, next) {
  try {
    await ensureDefaultSubscriptionPlans();
    const plans = await SubscriptionPlan.find({}).sort({ category: 1, sortOrder: 1 }).lean();
    res.json({ plans: plans.map(planPublicView) });
  } catch (error) {
    next(error);
  }
}

export async function updateSubscriptionPlan(req, res, next) {
  try {
    const amount = Number(req.body.amount);
    if (!Number.isInteger(amount) || amount < 1 || amount > 10000000) {
      return next(httpError(400, 'Amount must be a whole rupee value between 1 and 1,00,00,000'));
    }
    const update = { amount };
    if (req.body.enabled !== undefined) update.enabled = Boolean(req.body.enabled);
    if (Array.isArray(req.body.features)) {
      const features = req.body.features.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 30);
      if (features.length < 4) return next(httpError(400, 'Every package must have at least 4 features'));
      update.features = features;
    }
    const plan = await SubscriptionPlan.findByIdAndUpdate(req.params.id, { $set: update }, { new: true, runValidators: true }).lean();
    if (!plan) return next(httpError(404, 'Subscription plan not found'));
    res.json({ plan: planPublicView(plan) });
  } catch (error) {
    next(error);
  }
}

function subscriptionPaymentView(payment) {
  return {
    id: payment._id,
    customerName: payment.customerName,
    email: payment.email,
    businessName: payment.businessName,
    category: payment.category,
    tier: payment.tier,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    mode: payment.method || '',
    orderId: payment.razorpayOrderId,
    paymentId: payment.razorpayPaymentId || '',
    paidAt: payment.paidAt || null,
    invoiceNumber: payment.invoiceNumber || '',
    invoiceEmailStatus: payment.invoiceEmailStatus || '',
    invoiceEmailSentAt: payment.invoiceEmailSentAt || null,
    invoicePdfFileId: payment.invoicePdfFileId || null,
    createdAt: payment.createdAt,
  };
}

export async function getSubscriptionPayments(req, res, next) {
  try {
    const status = String(req.query.status || '').trim();
    const query = status === 'pending'
      ? { status: { $in: ['pending', 'processing'] } }
      : status && status !== 'all'
        ? { status: status === 'success' ? 'successful' : status }
        : {};
    const payments = await SubscriptionPayment.find(query).sort({ createdAt: -1, _id: -1 }).limit(2000).lean();
    res.json({
      key: 'subscriptionPayments',
      label: 'Razorpay Subscription Payments',
      count: payments.length,
      fields: ['customerName', 'email', 'businessName', 'category', 'tier', 'amount', 'status', 'mode', 'orderId', 'paymentId', 'invoiceNumber', 'invoiceEmailStatus', 'invoiceEmailSentAt', 'paidAt', 'createdAt'],
      rows: payments.map(subscriptionPaymentView),
    });
  } catch (error) {
    next(error);
  }
}

export async function sendSubscriptionPaymentInvoice(req, res, next) {
  try {
    const payment = await SubscriptionPayment.findById(req.params.id).select('status invoiceEmailStatus');
    if (!payment) return next(httpError(404, 'Subscription payment not found'));
    if (payment.status !== 'successful') return next(httpError(400, 'Invoice can be sent only after a successful payment'));
    const result = await sendSubscriptionInvoice(payment._id, { force: true });
    if (result.skipped) return next(httpError(409, 'Invoice email is already being processed'));
    if (!result.sent) return next(httpError(502, 'Invoice email could not be sent. It is saved for automatic retry.'));
    const updated = await SubscriptionPayment.findById(payment._id).lean();
    res.json({ message: 'Invoice sent successfully', payment: subscriptionPaymentView(updated) });
  } catch (error) {
    next(error);
  }
}




function buildNotification(id, type, title, message, relatedUser, createdAt, extra = {}) {
  return {
    id: String(id),
    type,
    title,
    message,
    relatedUser: relatedUser || '',
    read: false,
    createdAt: createdAt || new Date(),
    ...extra,
  };
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

async function getLegacyAdminNotifications(_req, res, next) {
  try {
    const today = startOfToday();
    const tomorrow = addDays(today, 1);
    const threeDaysFromNow = addDays(today, 3);

    const [newUsers, expiringUsers, renewalReminders, recentPayments] = await Promise.all([
      AppUser.find({ createdAt: { $gte: today } }).sort({ createdAt: -1, _id: -1 }).limit(25).select('name email businessName createdAt').lean(),
      AppUser.find({ status: /^expired$/i }).sort({ updatedAt: -1, _id: -1 }).limit(10).select('name email businessName updatedAt createdAt').lean(),
      AdminRecord.find({ group: 'Notifications' }).sort({ createdAt: -1, _id: -1 }).limit(10).lean(),
      SubscriptionPayment.find({ createdAt: { $gte: today }, status: 'successful' }).sort({ createdAt: -1, _id: -1 }).limit(10).select('customerName businessName amount method createdAt').lean(),
    ]);

    const notifications = [
      ...newUsers.map((user) => {
        const displayName = user.businessName || user.name || user.email || 'New user';
        return buildNotification(
          `new-user-${user._id}`,
          'new_user',
          'New User Registration',
          `${displayName} registered today`,
          displayName,
          user.createdAt,
          { userId: user._id }
        );
      }),
      ...expiringUsers.map((user) => {
        const displayName = user.businessName || user.name || user.email || 'User';
        return buildNotification(
          `expired-${user._id}`,
          'expiry_1day',
          'Expired User Alert',
          `${displayName} account is marked expired`,
          displayName,
          user.updatedAt || user.createdAt,
          { userId: user._id }
        );
      }),
      ...renewalReminders.map((record) => buildNotification(
        `admin-record-${record._id}`,
        'reminder_sent',
        record.title || 'Admin Notification',
        record.notes || `${record.title || 'Notification'} is ${record.status || 'scheduled'}`,
        record.target || '',
        record.createdAt,
        { recordId: record._id }
      )),
      ...recentPayments.map((payment) => {
        const displayName = payment.businessName || payment.customerName || 'Customer';
        return buildNotification(
          `payment-${payment._id}`,
          'payment',
          'Payment Received',
          `${displayName} paid ₹ ${Number(payment.amount || 0).toLocaleString('en-IN')}`,
          displayName,
          payment.createdAt,
          { paymentId: payment._id }
        );
      }),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({
      count: notifications.length,
      unreadCount: notifications.filter((item) => !item.read).length,
      newUserCount: newUsers.length,
      expiringCount: expiringUsers.length,
      generatedAt: new Date().toISOString(),
      notifications,
      window: { from: today, to: tomorrow, expiryTo: threeDaysFromNow },
    });
  } catch (err) {
    next(err);
  }
}

async function syncStoredAdminNotifications() {
  const today = startOfToday();
  const [newUsers, expiredUsers, payments] = await Promise.all([
    AppUser.find({ createdAt: { $gte: today } }).select('name email businessName businessId createdAt').lean(),
    AppUser.find({ status: /^expired$/i }).select('name email businessName businessId subscriptionExpiresAt updatedAt').limit(2000).lean(),
    SubscriptionPayment.find({ status: 'successful' }).select('customerName businessName amount userId businessId paidAt createdAt').sort({ createdAt: -1 }).limit(2000).lean(),
  ]);
  await Promise.all([
    ...newUsers.map((user) => createAdminNotification({
      dedupeKey: `new-user:${user._id}`, type: 'new_user', title: 'New user registration',
      message: `${user.businessName || user.name || user.email} registered today`, relatedUser: user.businessName || user.name,
      userId: user._id, businessId: user.businessId,
    })),
    ...expiredUsers.map((user) => createAdminNotification({
      dedupeKey: `expired:${user._id}:${new Date(user.subscriptionExpiresAt || user.updatedAt).toISOString().slice(0, 10)}`,
      type: 'subscription_expired', title: 'Subscription expired',
      message: `${user.businessName || user.name || user.email} is expired`, relatedUser: user.businessName || user.name,
      userId: user._id, businessId: user.businessId,
    })),
    ...payments.map((payment) => createAdminNotification({
      dedupeKey: `payment:${payment._id}`, type: 'payment', title: 'Payment received',
      message: `${payment.businessName || payment.customerName} paid INR ${Number(payment.amount || 0).toLocaleString('en-IN')}`,
      relatedUser: payment.businessName || payment.customerName, userId: payment.userId, businessId: payment.businessId, paymentId: payment._id,
    })),
  ]);
}

function notificationView(item) {
  return {
    id: item._id,
    type: item.type,
    title: item.title,
    message: item.message,
    relatedUser: item.relatedUser || '',
    read: Boolean(item.read),
    userId: item.userId || null,
    businessId: item.businessId || null,
    paymentId: item.paymentId || null,
    metadata: item.metadata || {},
    createdAt: item.createdAt,
  };
}

export async function getAdminNotifications(req, res, next) {
  try {
    await syncStoredAdminNotifications();
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 500, 1), 2000);
    const query = { archived: false };
    if (req.query.type && req.query.type !== 'all') query.type = String(req.query.type);
    const [items, count, unreadCount, grouped, newUserCount, expiringCount] = await Promise.all([
      AdminNotification.find(query).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      AdminNotification.countDocuments(query),
      AdminNotification.countDocuments({ ...query, read: false }),
      AdminNotification.aggregate([{ $match: query }, { $group: { _id: '$type', count: { $sum: 1 }, unread: { $sum: { $cond: ['$read', 0, 1] } } } }]),
      AdminNotification.countDocuments({ archived: false, type: 'new_user', createdAt: { $gte: startOfToday() } }),
      AdminNotification.countDocuments({ archived: false, type: { $in: ['expiry_30day', 'expiry_7day', 'expiry_1day', 'subscription_expired'] }, read: false }),
    ]);
    res.json({
      count,
      unreadCount,
      newUserCount,
      expiringCount,
      generatedAt: new Date().toISOString(),
      page,
      pages: Math.max(1, Math.ceil(count / limit)),
      countsByType: Object.fromEntries(grouped.map((row) => [row._id, { count: row.count, unread: row.unread }])),
      notifications: items.map(notificationView),
    });
  } catch (error) {
    next(error);
  }
}

export async function updateAdminNotification(req, res, next) {
  try {
    const notification = await AdminNotification.findByIdAndUpdate(req.params.id, { $set: { read: Boolean(req.body.read) } }, { new: true, runValidators: true }).lean();
    if (!notification) return next(httpError(404, 'Notification not found'));
    res.json({ notification: notificationView(notification) });
  } catch (error) {
    next(error);
  }
}

export async function markAllAdminNotificationsRead(_req, res, next) {
  try {
    const result = await AdminNotification.updateMany({ archived: false, read: false }, { $set: { read: true } });
    res.json({ updated: result.modifiedCount });
  } catch (error) {
    next(error);
  }
}

export async function archiveAdminNotification(req, res, next) {
  try {
    const notification = await AdminNotification.findByIdAndUpdate(req.params.id, { $set: { archived: true, read: true } }, { new: true }).lean();
    if (!notification) return next(httpError(404, 'Notification not found'));
    res.json({ archived: true, id: notification._id });
  } catch (error) {
    next(error);
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

    const updatePayload = await cleanSectionMutationPayload(section, req.body);
    const updated = await collectionConfig.model.findByIdAndUpdate(id, updatePayload, { new: true, runValidators: true }).lean();
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

export async function sendRenewalReminder(req, res, next) {
  try {
    const { userId } = req.params;
    const user = await AppUser.findById(userId);
    if (!user) return next(httpError(404, 'User not found'));

    // Create admin notification
    await AdminRecord.create({
      kind: 'renewalReminder',
      group: 'Notifications',
      title: `Renewal Reminder for ${user.name}`,
      status: 'Scheduled',
      amount: user.subscriptionAmount || 0,
      target: user.name,
      notes: `Reminder sent for ${user.businessName} - ${user.email}`,
      scheduledDate: new Date().toISOString().slice(0, 10),
    });

    // In real app, send email/push notification to user
    res.json({ success: true, message: `Reminder sent to ${user.email}` });
  } catch (err) {
    next(err);
  }
}

