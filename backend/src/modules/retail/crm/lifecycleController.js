import { Invoice } from '../../../models/Invoice.js';
import { Customer } from '../../../models/Customer.js';

const STAGE_DEFS = [
  { stage: 'New',       minOrders: 0, maxOrders: 0 },
  { stage: 'Active',    minOrders: 1, maxOrders: 3 },
  { stage: 'Loyal',     minOrders: 4, maxOrders: 9 },
  { stage: 'Champion',  minOrders: 10, maxOrders: Infinity },
  { stage: 'At Risk',   minOrders: null },  // handled separately
];

// GET /api/crm/lifecycle
export async function getLifecycle(_req, res, next) {
  try {
    const [customers, invoices] = await Promise.all([
      Customer.find().lean(),
      Invoice.find({ documentType: 'invoice', status: { $ne: 'cancelled' } })
        .select('customer.name totals status createdAt')
        .lean(),
    ]);

    // Build per-customer revenue/order counts from invoices
    const map = {};
    for (const inv of invoices) {
      const name = inv.customer?.name?.trim();
      if (!name) continue;
      if (!map[name]) map[name] = { orders: 0, revenue: 0 };
      map[name].orders += 1;
      map[name].revenue += Number(inv.totals?.grandTotal ?? inv.totals?.total ?? 0);
    }

    // Assign lifecycle stages
    const stageCounts = { 'New': 0, 'Active': 0, 'Loyal': 0, 'Champion': 0 };
    for (const c of customers) {
      const stats = map[c.name?.trim()] ?? { orders: 0, revenue: 0 };
      const orders = stats.orders;
      if (orders === 0) stageCounts['New']++;
      else if (orders <= 3) stageCounts['Active']++;
      else if (orders <= 9) stageCounts['Loyal']++;
      else stageCounts['Champion']++;
    }

    const stages = Object.entries(stageCounts).map(([stage, count]) => ({ stage, count, change: null }));

    // Top customers by lifetime value
    const topCustomers = Object.entries(map)
      .map(([name, s]) => ({ name, orders: s.orders, revenue: s.revenue, ltv: s.revenue }))
      .sort((a, b) => b.ltv - a.ltv)
      .slice(0, 10);

    res.json({ stages, topCustomers });
  } catch (err) {
    next(err);
  }
}
