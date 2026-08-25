import { Invoice } from '../../../models/Invoice.js';
import { Product } from '../../../models/Product.js';
import { DATA_COLLECTIONS } from '../../data-management/registry.js';
import { branchScopedAggregateMatch, branchScopedQuery } from '../../../utils/branchScope.js';

function sumTotals(invoices) {
  return invoices.reduce((a, inv) => {
    const t = inv.totals ?? {};
    return a + Number(t.grandTotal ?? t.total ?? t.subTotal ?? 0);
  }, 0);
}

function monthBounds(monthOffset = 0) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function fmtDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Shared by GET /api/more-modules/ai-insights and the AI chat assistant.
export async function buildAiInsights(userId) {
  const now = new Date();
  const thisMonth = monthBounds(0);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const sameDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate(), 23, 59, 59, 999);
  const cutoff60 = new Date(now);
  cutoff60.setDate(cutoff60.getDate() - 60);

  const invoiceBase = { userId, documentType: 'invoice', status: { $in: ['paid', 'sent'] } };

  const [thisMonthInvoices, lastMonthInvoices, allInvoices, lowStockProducts] = await Promise.all([
    Invoice.find({ ...invoiceBase, createdAt: { $gte: thisMonth.start, $lte: thisMonth.end } })
      .select('totals customer createdAt').lean(),
    Invoice.find({ ...invoiceBase, createdAt: { $gte: startOfLastMonth, $lte: sameDayLastMonth } })
      .select('totals').lean(),
    Invoice.find({ userId, documentType: 'invoice', 'customer.name': { $ne: '' } }).select('customer.name createdAt').lean(),
    Product.find({ userId, $expr: { $lte: ['$stock', '$minStockLevel'] }, status: 'Active' }).select('_id').lean(),
  ]);

  const monthTotal = sumTotals(thisMonthInvoices);
  const dayOfMonth = now.getDate();
  const daysInMonth = thisMonth.end.getDate();
  const predicted = dayOfMonth > 0 ? Math.round((monthTotal / dayOfMonth) * daysInMonth) : 0;

  const lastMonthTotal = sumTotals(lastMonthInvoices);
  const changePct = lastMonthTotal > 0 ? ((monthTotal - lastMonthTotal) / lastMonthTotal) * 100 : null;

  const byCustomer = new Map();
  thisMonthInvoices.forEach((inv) => {
    const name = inv.customer?.name;
    if (!name) return;
    const t = inv.totals ?? {};
    const amt = Number(t.grandTotal ?? t.total ?? t.subTotal ?? 0);
    byCustomer.set(name, (byCustomer.get(name) ?? 0) + amt);
  });
  const topCustomers = [...byCustomer.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, amount], i) => ({ rank: i + 1, name, amount }));

  const lastSeen = new Map();
  allInvoices.forEach((inv) => {
    const name = inv.customer?.name;
    if (!name) return;
    const date = new Date(inv.createdAt);
    if (!lastSeen.has(name) || date > lastSeen.get(name)) lastSeen.set(name, date);
  });
  const churnRisk = [...lastSeen.values()].filter((d) => d < cutoff60).length;

  return {
    salesPrediction: { amount: predicted, changePct },
    lowStockCount: lowStockProducts.length,
    churnRisk,
    topCustomers,
  };
}

// GET /api/more-modules/ai-insights
export async function getAiInsights(req, res, next) {
  try {
    const insights = await buildAiInsights(req.user.id);
    res.json(insights);
  } catch (err) {
    next(err);
  }
}

function moduleCategory(moduleKey = '') {
  const [category, group] = moduleKey.split('/');
  if (!category) return 'Modules';
  if (!group) return category.replace(/\b\w/g, (char) => char.toUpperCase());
  return `${category.replace(/\b\w/g, (char) => char.toUpperCase())} / ${group.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())}`;
}

function moduleName(moduleKey = '') {
  return moduleKey.split('/').filter(Boolean).map((part) => (
    part.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
  )).join(' / ') || 'Module Records';
}

function plural(value, singular, pluralText = `${singular}s`) {
  return `${value} ${value === 1 ? singular : pluralText}`;
}

function latestSort(collection) {
  return collection.dateFields.reduce((sort, field) => {
    sort[field] = -1;
    return sort;
  }, { updatedAt: -1, createdAt: -1 });
}

function latestSelect(collection) {
  return [...new Set([...collection.dateFields, 'updatedAt', 'createdAt'])].join(' ');
}

function latestFromDoc(doc, collection) {
  if (!doc) return null;
  for (const field of [...collection.dateFields, 'updatedAt', 'createdAt']) {
    const value = field.split('.').reduce((obj, key) => obj?.[key], doc);
    if (value) return value;
  }
  return null;
}

async function countAndLatest(collection, query) {
  const [count, latest] = await Promise.all([
    collection.model.countDocuments(query),
    collection.model.findOne(query).sort(latestSort(collection)).select(latestSelect(collection)).lean(),
  ]);
  return { count, latestDate: latestFromDoc(latest, collection) };
}

function reportRow({ count, latestDate, name, category, description }) {
  if (!count) return null;
  return { name, category, description, count, lastGenerated: fmtDate(latestDate) };
}

const COLLECTION_CATEGORY = {
  businessSettings: 'Settings',
  branches: 'Settings',
  customers: 'CRM',
  leads: 'CRM',
  followUps: 'CRM',
  products: 'Inventory',
  productCategories: 'Inventory',
  productBrands: 'Inventory',
  warehouses: 'Inventory',
  stockIn: 'Inventory',
  stockOut: 'Inventory',
  payments: 'Finance',
  salesRecords: 'Sales',
  vendors: 'Purchase',
  ledgerAccounts: 'Finance',
  journalEntries: 'Finance',
  accountingVouchers: 'Finance',
  accountingPostings: 'Finance',
  cashBookEntries: 'Finance',
  bankBookEntries: 'Finance',
  gstr1: 'GST',
  gstr3b: 'GST',
  gstReconciliation: 'GST',
  employees: 'HR',
  attendance: 'HR',
  attendanceCorrections: 'HR',
  leaves: 'HR',
  payroll: 'HR',
  documents: 'HR',
  notices: 'HR',
  employeeLogins: 'HR',
  emailCampaigns: 'Marketing',
  whatsAppCampaigns: 'Marketing',
};

const INVOICE_TYPE_CATEGORY = {
  'purchase-order': 'Purchase',
  'purchase-entry': 'Purchase',
  'supplier-return': 'Purchase',
};

function titleFromKey(value = '') {
  return value
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function latestOf(...dates) {
  return dates.filter(Boolean).sort((a, b) => new Date(b) - new Date(a))[0];
}

function statForCategory(reports, category) {
  return reports
    .filter((report) => report.category === category || report.category.startsWith(`${category} /`))
    .reduce((sum, report) => sum + report.count, 0);
}

// GET /api/more-modules/reports-summary
export async function getReportsSummary(req, res, next) {
  try {
    const moduleCollection = DATA_COLLECTIONS.find((collection) => collection.key === 'moduleRecords');
    const ordinaryCollections = DATA_COLLECTIONS.filter((collection) => !['invoices', 'moduleRecords'].includes(collection.key));
    const invoiceCollection = DATA_COLLECTIONS.find((collection) => collection.key === 'invoices');

    const collectionRows = (await Promise.all(ordinaryCollections.map(async (collection) => {
      const query = await branchScopedQuery(req, collection);
      if (!query) return null;
      const summary = await countAndLatest(collection, query);
      const row = reportRow({
        name: `${collection.label} Reports`,
        category: COLLECTION_CATEGORY[collection.key] || 'Other',
        description: `${plural(summary.count, 'database record')} in ${collection.label}`,
        count: summary.count,
        latestDate: summary.latestDate,
      });
      if (row) row.downloadKey = collection.key;
      return row;
    }))).filter(Boolean);

    const invoiceMatch = invoiceCollection ? await branchScopedAggregateMatch(req, invoiceCollection) : null;
    const invoiceReports = invoiceMatch ? await invoiceCollection.model.aggregate([
      { $match: invoiceMatch },
      { $group: { _id: '$documentType', count: { $sum: 1 }, lastGenerated: { $max: { $ifNull: ['$updatedAt', '$createdAt'] } } } },
      { $sort: { _id: 1 } },
    ]) : [];
    const invoiceRows = invoiceReports.map((row) => {
      const documentType = row._id || 'invoice';
      const report = reportRow({
        name: `${titleFromKey(documentType)} Reports`,
        category: INVOICE_TYPE_CATEGORY[documentType] || 'Sales',
        description: `${plural(row.count, 'billing document')} in the database`,
        count: row.count,
        latestDate: row.lastGenerated,
      });
      if (report) report.downloadKey = `invoice:${documentType}`;
      return report;
    }).filter(Boolean);

    const moduleMatch = moduleCollection ? await branchScopedAggregateMatch(req, moduleCollection) : null;
    const moduleReports = moduleMatch ? await moduleCollection.model.aggregate([
      { $match: moduleMatch },
      { $group: { _id: '$moduleKey', count: { $sum: 1 }, lastGenerated: { $max: { $ifNull: ['$updatedAt', '$createdAt'] } } } },
      { $sort: { _id: 1 } },
    ]) : [];
    const moduleRows = moduleReports.map((row) => ({
      name: moduleName(row._id),
      category: moduleCategory(row._id),
      description: `${row.count} module record${row.count === 1 ? '' : 's'} in the database`,
      count: row.count,
      lastGenerated: fmtDate(row.lastGenerated),
      downloadKey: `module:${row._id}`,
    }));

    const reports = [...collectionRows, ...invoiceRows, ...moduleRows];
    const categoryCounts = reports.reduce((map, report) => {
      map.set(report.category, (map.get(report.category) || 0) + report.count);
      return map;
    }, new Map());
    const total = reports.reduce((sum, report) => sum + report.count, 0);
    const financial = statForCategory(reports, 'Finance') + statForCategory(reports, 'GST');
    const sales = statForCategory(reports, 'Sales');
    const inventory = statForCategory(reports, 'Inventory');
    const hr = statForCategory(reports, 'HR');
    const purchase = statForCategory(reports, 'Purchase');

    res.json({
      stats: {
        total,
        financial,
        sales,
        inventory,
        hr,
        purchase,
      },
      categories: [...categoryCounts.entries()].map(([label, count]) => ({ label, count })),
      reports,
    });
  } catch (err) {
    next(err);
  }
}

function csvEscape(value) {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function sendCsv(res, filename, headers, rows) {
  const csv = [
    headers.map((header) => csvEscape(header.label)).join(','),
    ...rows.map((row) => headers.map((header) => csvEscape(header.value(row))).join(',')),
  ].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(`\uFEFF${csv}`);
}

function amountFromTotals(totals = {}) {
  return totals.grandTotal ?? totals.total ?? totals.finalTotal ?? totals.subTotal ?? 0;
}

function invoiceReportHeaders() {
  return [
    { label: 'Number', value: (row) => row.number },
    { label: 'Document Type', value: (row) => row.documentType },
    { label: 'Date', value: (row) => row.meta?.date || row.createdAt },
    { label: 'Customer', value: (row) => row.customer?.name },
    { label: 'GSTIN', value: (row) => row.customer?.gstin },
    { label: 'Phone', value: (row) => row.customer?.phone },
    { label: 'Items', value: (row) => row.items?.length || 0 },
    { label: 'Amount', value: (row) => amountFromTotals(row.totals) },
    { label: 'Payment Method', value: (row) => row.paymentMethod },
    { label: 'Status', value: (row) => row.status },
  ];
}

function productReportHeaders() {
  return [
    { label: 'Code', value: (row) => row.code },
    { label: 'Description', value: (row) => row.description },
    { label: 'Type', value: (row) => row.itemType },
    { label: 'Category', value: (row) => row.category },
    { label: 'Brand', value: (row) => row.brand },
    { label: 'HSN', value: (row) => row.hsn },
    { label: 'Unit', value: (row) => row.unit },
    { label: 'Rate', value: (row) => row.rate },
    { label: 'GST Rate', value: (row) => row.gstRate },
    { label: 'Stock', value: (row) => row.stock },
    { label: 'Min Stock', value: (row) => row.minStockLevel },
    { label: 'Status', value: (row) => row.status },
  ];
}

function genericReportHeaders(collection) {
  return [
    { label: 'ID', value: (row) => row._id },
    { label: collection.label, value: (row) => row.name || row.number || row.code || row.description || row.title || row.subject || row.email || row.phone },
    { label: 'Created At', value: (row) => row.createdAt },
    { label: 'Updated At', value: (row) => row.updatedAt },
  ];
}

function formatReportCell(value) {
  if (value == null || value === '') return '-';
  if (value instanceof Date) return fmtDate(value) || value.toISOString();
  if (Array.isArray(value)) return value.length ? `${value.length} item${value.length === 1 ? '' : 's'}` : '-';
  if (typeof value === 'object') return value.name || value.title || value.code || value.number || JSON.stringify(value);
  return value;
}

function valueAtPath(row, path) {
  return path.split('.').reduce((current, key) => current?.[key], row);
}

function dynamicReportHeaders(collection, records) {
  if (collection.key === 'products') return productReportHeaders();

  const skip = new Set([
    '_id',
    '__v',
    'userId',
    'ownerUserId',
    'businessId',
    'password',
    'passwordHash',
    ...(collection.sensitiveFields || []),
  ]);
  const preferred = ['name', 'number', 'code', 'description', 'title', 'email', 'phone', 'status', 'branch'];
  const fields = preferred.filter((field) => records.some((row) => valueAtPath(row, field) != null));

  for (const row of records.slice(0, 10)) {
    Object.keys(row || {}).forEach((field) => {
      if (!skip.has(field) && !fields.includes(field) && typeof row[field] !== 'object') fields.push(field);
    });
  }

  const selected = fields.slice(0, 8);
  return [
    { label: 'ID', value: (row) => row._id },
    ...selected.map((field) => ({ label: titleFromKey(field), value: (row) => valueAtPath(row, field) })),
    { label: 'Created At', value: (row) => row.createdAt },
  ];
}

function moduleRecordHeaders(records) {
  const keys = [];
  records.slice(0, 15).forEach((record) => {
    Object.keys(record.data || {}).forEach((key) => {
      if (!['password', 'passwordHash'].includes(key) && !keys.includes(key)) keys.push(key);
    });
  });

  return [
    { label: 'ID', value: (row) => row._id },
    ...keys.slice(0, 8).map((key) => ({ label: titleFromKey(key), value: (row) => row.data?.[key] })),
    { label: 'Created At', value: (row) => row.createdAt },
  ];
}

function tableRowsFromHeaders(headers, records) {
  return records.map((record) => ({
    id: String(record._id),
    values: headers.map((header) => formatReportCell(header.value(record))),
  }));
}

async function loadReportData(req, key) {
  const invoiceCollection = DATA_COLLECTIONS.find((collection) => collection.key === 'invoices');
  if (key.startsWith('invoice:')) {
    const documentType = key.slice('invoice:'.length) || 'invoice';
    const records = await invoiceCollection.model
      .find({ ...(await branchScopedQuery(req, invoiceCollection)), documentType })
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();
    return {
      filename: `${documentType}-report.csv`,
      title: `${titleFromKey(documentType)} Reports`,
      headers: invoiceReportHeaders(),
      records,
    };
  }

  const moduleCollection = DATA_COLLECTIONS.find((collection) => collection.key === 'moduleRecords');
  if (key.startsWith('module:')) {
    const moduleKey = key.slice('module:'.length);
    const records = await moduleCollection.model
      .find({ ...(await branchScopedQuery(req, moduleCollection)), moduleKey })
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(500)
      .lean();
    return {
      filename: `${moduleKey.replace(/[^\w-]+/g, '-')}-report.csv`,
      title: moduleName(moduleKey),
      headers: moduleRecordHeaders(records),
      records,
    };
  }

  const collection = DATA_COLLECTIONS.find((item) => item.key === key);
  if (!collection) return null;
  const records = await collection.model.find(await branchScopedQuery(req, collection)).sort(latestSort(collection)).limit(500).lean();
  return {
    filename: `${collection.key}-report.csv`,
    title: `${collection.label} Reports`,
    headers: dynamicReportHeaders(collection, records),
    records,
  };
}

// GET /api/more-modules/reports-download?key=invoice:quotation
export async function downloadReport(req, res, next) {
  try {
    const key = String(req.query.key || '').trim();
    if (!key) {
      res.status(400).json({ message: 'Report key is required' });
      return;
    }

    const report = await loadReportData(req, key);
    if (!report) {
      res.status(404).json({ message: 'Report not found' });
      return;
    }
    sendCsv(res, report.filename, report.headers, report.records);
  } catch (err) {
    next(err);
  }
}

// GET /api/more-modules/reports-records?key=products
export async function getReportRecords(req, res, next) {
  try {
    const key = String(req.query.key || '').trim();
    if (!key) {
      res.status(400).json({ message: 'Report key is required' });
      return;
    }

    const report = await loadReportData(req, key);
    if (!report) {
      res.status(404).json({ message: 'Report not found' });
      return;
    }

    res.json({
      title: report.title,
      count: report.records.length,
      columns: report.headers.map((header) => header.label),
      rows: tableRowsFromHeaders(report.headers, report.records),
    });
  } catch (err) {
    next(err);
  }
}
