import { Employee } from '../../../models/Employee.js';
import { Invoice } from '../../../models/Invoice.js';
import { JournalEntry } from '../../../models/JournalEntry.js';
import { Product } from '../../../models/Product.js';
import { Vendor } from '../../../models/Vendor.js';

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

const REPORT_DEFS = [
  { name: 'Sales Summary',    category: 'Sales',     description: 'Summary of sales by date range' },
  { name: 'Purchase Summary', category: 'Purchase',  description: 'Summary of purchases by vendor' },
  { name: 'Profit & Loss',    category: 'Finance',   description: 'P&L statement for selected period' },
  { name: 'Balance Sheet',    category: 'Finance',   description: 'Balance sheet for selected period' },
  { name: 'Stock Summary',    category: 'Inventory', description: 'Current stock summary' },
  { name: 'Employee Summary', category: 'HR',        description: 'Employee details summary' },
];

// GET /api/more-modules/reports-summary
export async function getReportsSummary(req, res, next) {
  try {
    const userId = req.user.id;
    const [
      salesCount, purchaseCount, financeCount, inventoryCount, hrCount,
      latestInvoice, latestVendor, latestJournal, latestProduct, latestEmployee,
    ] = await Promise.all([
      Invoice.countDocuments({ userId, documentType: 'invoice' }),
      Vendor.countDocuments({ userId }),
      JournalEntry.countDocuments({ userId }),
      Product.countDocuments({ userId }),
      Employee.countDocuments({ userId }),
      Invoice.findOne({ userId, documentType: 'invoice' }).sort({ createdAt: -1 }).select('createdAt').lean(),
      Vendor.findOne({ userId }).sort({ createdAt: -1 }).select('createdAt').lean(),
      JournalEntry.findOne({ userId }).sort({ createdAt: -1 }).select('createdAt').lean(),
      Product.findOne({ userId }).sort({ updatedAt: -1 }).select('updatedAt').lean(),
      Employee.findOne({ userId }).sort({ createdAt: -1 }).select('createdAt').lean(),
    ]);

    const counts = { Sales: salesCount, Purchase: purchaseCount, Finance: financeCount, Inventory: inventoryCount, HR: hrCount };
    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    const lastGeneratedByCategory = {
      Sales:     fmtDate(latestInvoice?.createdAt),
      Purchase:  fmtDate(latestVendor?.createdAt),
      Finance:   fmtDate(latestJournal?.createdAt),
      Inventory: fmtDate(latestProduct?.updatedAt),
      HR:        fmtDate(latestEmployee?.createdAt),
    };

    const reports = REPORT_DEFS.map((r) => ({ ...r, lastGenerated: lastGeneratedByCategory[r.category] }));

    res.json({
      stats: {
        total,
        financial:  counts.Finance,
        sales:      counts.Sales,
        inventory:  counts.Inventory,
        hr:         counts.HR,
        purchase:   counts.Purchase,
      },
      categories: [
        { label: 'Sales',     count: counts.Sales,     color: '#2563eb' },
        { label: 'Finance',   count: counts.Finance,   color: '#16a34a' },
        { label: 'Inventory', count: counts.Inventory, color: '#d97706' },
        { label: 'HR',        count: counts.HR,        color: '#7c3aed' },
        { label: 'Purchase',  count: counts.Purchase,  color: '#0891b2' },
      ],
      reports,
    });
  } catch (err) {
    next(err);
  }
}
