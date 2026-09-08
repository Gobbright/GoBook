import { Invoice } from '../../models/Invoice.js';
import { Product } from '../../models/Product.js';
import { Payment } from '../../models/Payment.js';
import { branchScopedAggregateMatch, branchScopedQuery, resolveBranchScope } from '../../utils/branchScope.js';

function fmtCurrency(n) {
  return `₹ ${Number(n || 0).toLocaleString('en-IN')}`;
}

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { $gte: start, $lte: end };
}

function monthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { $gte: start, $lte: end };
}

function previousMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  return { $gte: start, $lte: end };
}

function invoiceTotal(inv) {
  const totals = inv.totals ?? {};
  const saved = Number(totals.finalTotal ?? totals.grandTotal ?? totals.total ?? totals.subTotal);
  if (Number.isFinite(saved) && saved > 0) return saved;

  let total = 0;
  for (const item of inv.items ?? []) {
    const gross = (Number(item.qty) || 0) * (Number(item.rate) || 0);
    const discountValue = Number(item.discount) || 0;
    const discount = item.discountType === 'amount'
      ? Math.min(gross, discountValue)
      : gross * (discountValue / 100);
    const taxable = gross - discount;
    const gst = taxable * ((Number(item.gstRate) || 0) / 100);
    total += taxable + gst;
  }

  for (const charge of inv.charges ?? []) {
    const amount = Number(charge.amount) || 0;
    total += amount + amount * ((Number(charge.gstRate) || 0) / 100);
  }

  return Math.round(total);
}

function sumTotals(invoices) {
  return invoices.reduce((sum, inv) => sum + invoiceTotal(inv), 0);
}

function balanceDue(inv) {
  return Math.max(0, invoiceTotal(inv) - (Number(inv.advanceReceived) || 0));
}

function isOverdue(inv) {
  const dueDate = inv.meta?.dueDate;
  if (!dueDate || balanceDue(inv) <= 0) return false;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return false;
  due.setHours(23, 59, 59, 999);
  return due < new Date();
}

function paymentStatus(inv) {
  if (balanceDue(inv) <= 0) return 'Paid';
  return isOverdue(inv) ? 'Overdue' : 'Pending';
}

// GET /api/dashboard/summary
export async function getDashboardSummary(req, res, next) {
  try {
    const invoiceCollection = { model: Invoice, ownerField: 'userId' };
    const productCollection = { model: Product, ownerField: 'userId' };
    const paymentCollection = { model: Payment, ownerField: 'userId' };
    const scope = await resolveBranchScope(req);
    const invoiceFilter = await branchScopedQuery(req, invoiceCollection, { documentType: 'invoice' });
    const productFilter = await branchScopedQuery(req, productCollection);
    const paymentMatch = await branchScopedAggregateMatch(req, paymentCollection);
    const [todayInvoices, monthInvoices, lastMonthInvoices, allInvoices, recentInvoices, allProducts, paymentAgg] = await Promise.all([
      Invoice.find({ ...invoiceFilter, createdAt: todayRange() }).lean(),
      Invoice.find({ ...invoiceFilter, createdAt: monthRange() }).lean(),
      Invoice.find({ ...invoiceFilter, createdAt: previousMonthRange() }).lean(),
      Invoice.find(invoiceFilter).lean(),
      Invoice.find(invoiceFilter).sort({ createdAt: -1 }).limit(5).lean(),
      Product.find(productFilter).select('description stock minStockLevel status').lean(),
      Payment.aggregate([
        { $match: paymentMatch },
        { $group: { _id: '$invoiceId', totalPaid: { $sum: '$amount' } } },
      ]),
    ]);

    const activeProducts = allProducts.filter((p) => p.status === 'Active');
    const lowStockProducts = activeProducts.filter((p) => p.stock <= (p.minStockLevel || 0));

    // Build paid map from real Payment records
    const paidMap = {};
    for (const p of paymentAgg) paidMap[String(p._id)] = p.totalPaid;

    function realBalanceDue(inv) {
      const total = invoiceTotal(inv);
      const paid  = paidMap[String(inv._id)] ?? Number(inv.advanceReceived) ?? 0;
      return Math.max(0, total - paid);
    }

    const todaySales = sumTotals(todayInvoices);
    const monthRevenue = sumTotals(monthInvoices);
    const pendingInvoices = allInvoices.filter((inv) => realBalanceDue(inv) > 0);
    const pending = pendingInvoices.reduce((sum, inv) => sum + realBalanceDue(inv), 0);

    const metrics = [
      { label: "Today's Sales", value: fmtCurrency(todaySales), trend: `${todayInvoices.length} invoice(s)`, tone: 'blue' },
      { label: 'Monthly Revenue', value: fmtCurrency(monthRevenue), trend: `${monthInvoices.length} invoice(s)`, tone: 'green' },
      { label: 'Pending Payments', value: fmtCurrency(pending), trend: `${pendingInvoices.length} pending`, tone: 'orange' },
      { label: 'Low Stock Items', value: String(lowStockProducts.length), trend: 'Below min stock level', tone: 'purple' },
    ];

    function realPaymentStatus(inv) {
      const balance = realBalanceDue(inv);
      if (balance <= 0) return 'Paid';
      return isOverdue(inv) ? 'Overdue' : 'Pending';
    }

    const transactions = recentInvoices.map((inv) => ({
      invoice: inv.number,
      customer: inv.customer?.name ?? '-',
      amount: fmtCurrency(invoiceTotal(inv)),
      status: realPaymentStatus(inv),
      date: new Date(inv.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    }));

    const reminders = [];
    if (pendingInvoices.length > 0) {
      reminders.push({ title: `${pendingInvoices.length} Pending Invoice(s)`, description: `Total: ${fmtCurrency(pending)}` });
    }
    if (lowStockProducts.length > 0) {
      reminders.push({ title: 'Inventory Low Stock Alert', description: `${lowStockProducts.length} item(s) below minimum stock level` });
    }
    const overdueCount = pendingInvoices.filter((inv) => isOverdue(inv) && realBalanceDue(inv) > 0).length;
    if (overdueCount > 0) {
      reminders.push({ title: 'Overdue Invoices', description: `${overdueCount} invoice(s) are overdue` });
    }

    const insights = [];
    if (monthRevenue > 0) insights.push(`Monthly revenue is ${fmtCurrency(monthRevenue)}`);
    if (lowStockProducts.length > 0) insights.push(`Restock ${lowStockProducts.length} low-stock item(s) soon`);
    if (pendingInvoices.length > 0) insights.push(`Follow up on ${pendingInvoices.length} pending payment(s)`);

    // Top customers by total billed
    const customerMap = {};
    for (const inv of allInvoices) {
      const name = inv.customer?.name?.trim();
      if (!name) continue;
      customerMap[name] = (customerMap[name] || 0) + invoiceTotal(inv);
    }
    const topCustomers = Object.entries(customerMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, total]) => ({ name, total }));

    // Inventory status breakdown
    const inventoryStatus = {
      total:      activeProducts.length,
      inStock:    activeProducts.filter((p) => p.stock > (p.minStockLevel || 0)).length,
      lowStock:   activeProducts.filter((p) => p.stock > 0 && p.stock <= (p.minStockLevel || 0)).length,
      outOfStock: activeProducts.filter((p) => p.stock === 0).length,
    };

    // Sales trend — daily totals for the last 7 days
    const trendDays = [];
    const dayTotals = {};
    {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        dayTotals[key] = 0;
        trendDays.push({ key, label: d.toLocaleDateString('en-GB', { weekday: 'short' }) });
      }
    }
    for (const inv of allInvoices) {
      const key = new Date(inv.createdAt).toISOString().slice(0, 10);
      if (key in dayTotals) dayTotals[key] += invoiceTotal(inv);
    }
    const salesTrend = trendDays.map(({ key, label }) => ({ label, total: dayTotals[key] }));

    // Cash flow — real Paid / Pending / Overdue amounts across all invoices
    const totalBilled = sumTotals(allInvoices);
    const overdueTotal = pendingInvoices
      .filter((inv) => isOverdue(inv))
      .reduce((sum, inv) => sum + realBalanceDue(inv), 0);
    const cashFlow = {
      paid: Math.max(0, totalBilled - pending),
      pending: Math.max(0, pending - overdueTotal),
      overdue: overdueTotal,
    };

    // Growth score — this month's revenue vs last month's, scaled to 0-100 (50 = flat)
    const lastMonthRevenue = sumTotals(lastMonthInvoices);
    let growthPct = 0;
    if (lastMonthRevenue > 0) {
      growthPct = ((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
    } else if (monthRevenue > 0) {
      growthPct = 100;
    }
    const growthScore = {
      score: Math.max(0, Math.min(100, Math.round(50 + growthPct / 2))),
      monthRevenue,
      lastMonthRevenue,
      growthPct: Math.round(growthPct),
    };

    res.json({ metrics, transactions, reminders, insights, topCustomers, inventoryStatus, salesTrend, cashFlow, growthScore, branch: scope.branch || '' });
  } catch (err) {
    next(err);
  }
}
