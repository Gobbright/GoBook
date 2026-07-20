import { Customer } from '../../models/Customer.js';
import { Invoice } from '../../models/Invoice.js';
import { Product } from '../../models/Product.js';

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// GET /api/search?q=
export async function globalSearch(req, res, next) {
  try {
    const q = String(req.query.q ?? '').trim();
    if (!q) return res.json({ customers: [], products: [], invoices: [] });

    const re = new RegExp(escapeRegex(q), 'i');

    const [customers, products, invoices] = await Promise.all([
      Customer.find({ $or: [{ name: re }, { phone: re }, { gstin: re }] })
        .sort({ name: 1 }).limit(5).lean(),
      Product.find({ $or: [{ description: re }, { code: re }, { hsn: re }] })
        .sort({ description: 1 }).limit(5).lean(),
      Invoice.find({ $or: [{ number: re }, { 'customer.name': re }] })
        .sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    res.json({
      customers: customers.map((c) => ({
        id: c._id, name: c.name, phone: c.phone, gstin: c.gstin,
      })),
      products: products.map((p) => ({
        id: p._id, description: p.description, code: p.code,
      })),
      invoices: invoices.map((i) => ({
        id: i._id,
        number: i.number,
        documentType: i.documentType,
        customerName: i.customer?.name ?? '',
        total: i.totals?.finalTotal ?? 0,
      })),
    });
  } catch (err) {
    next(err);
  }
}
