import assert from 'node:assert/strict';
import test, { afterEach, mock } from 'node:test';
import { Invoice } from '../src/models/Invoice.js';
import { Product } from '../src/models/Product.js';
import { remainingSaleItems, validateSalesReturnLines, prepareSalesReturn, salesReturnDetails } from '../src/services/salesReturns.js';
import { SupplierReturnLock } from '../src/models/SupplierReturnLock.js';

process.env.CLIENT_URL = 'http://localhost:5173';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/unused-test-db';
process.env.JWT_SECRET = 'sales-return-test-secret';
const { createSalesReturn } = await import('../src/modules/retail/sales/sales-return/salesReturnController.js');

afterEach(() => mock.restoreAll());

const invoiceId = '507f1f77bcf86cd799439021';
const productId = '507f1f77bcf86cd799439022';
const base = { description: 'Sold item', unit: 'Nos', size: 'Blue', qty: 10, rate: 100, gstRate: 18, discount: 0, itemType: 'Product', productId };
const sale = { _id: invoiceId, number: 'INV-001', documentType: 'invoice', customer: { name: 'Customer' }, meta: { date: '2026-09-01' }, items: [base] };

function mocks(source = sale, prior = []) {
  mock.method(Invoice, 'findOne', (query) => {
    assert.equal(query.userId, 'owner');
    assert.deepEqual(query.documentType, { $in: ['invoice', 'bill-of-supply', 'pharmacy-bill'] });
    return { lean: async () => source };
  });
  mock.method(Invoice, 'find', () => ({ lean: async () => prior }));
  mock.method(Product, 'findOne', () => ({ lean: async () => ({ _id: productId }) }));
}

function payload(overrides = {}) {
  return { number: 'SR-001', meta: { date: '2026-09-16' }, customer: { name: 'Customer' }, items: [{ ...base, qty: 2 }], extra: { originalSalesId: invoiceId, reason: 'Damaged' }, ...overrides };
}

test('remaining sale quantities deduct previous returns and block duplicate over-return rows', () => {
  const items = remainingSaleItems({ items: [{ ...base, qty: 3 }, { ...base, qty: 4 }] }, [{ items: [{ ...base, qty: 5 }] }]);
  assert.deepEqual(items.map((item) => item.remainingQty), [0, 2]);
  assert.throws(() => validateSalesReturnLines([{ ...base, qty: 1 }, { ...base, qty: 2 }], [{ ...base, remainingQty: 2 }]), /only 1 units/);
});

test('prepares sales return from source invoice with authoritative customer and totals', async () => {
  mocks();
  const result = await prepareSalesReturn(payload({ totals: { finalTotal: 1 }, advanceReceived: 500, paymentMethod: 'Cash' }), 'owner');
  assert.equal(result.documentType, 'sales-return');
  assert.equal(result.customer.name, 'Customer');
  assert.equal(result.totals.finalTotal, 236);
  assert.equal(result.advanceReceived, 0);
  assert.equal(result.paymentMethod, '');
  assert.equal(result.extra.originalInvoiceNo, 'INV-001');
});

test('preserves line and overall discounts proportionally', async () => {
  mocks({ ...sale, items: [{ ...base, discountType: 'amount', discount: 100 }], additionalDiscount: { type: 'amount', value: 118 } });
  const result = await prepareSalesReturn(payload({ items: [{ ...base, qty: 2, discount: 20, discountType: 'percent' }], additionalDiscount: { type: 'percent', value: 90 } }), 'owner');
  assert.equal(result.additionalDiscount.value, 0);
  assert.equal(result.items[0].discount, 20);
  assert.equal(result.totals.finalTotal, 189);
});

test('requires invoice, matching customer, reason and valid chronological date', async () => {
  mocks();
  for (const patch of [{ extra: { reason: 'Damaged' } }, { customer: { name: 'Other customer' } }, { extra: { originalSalesId: invoiceId, reason: '' } }, { meta: { date: '2026-08-31' } }, { meta: { date: 'bad' } }]) {
    await assert.rejects(prepareSalesReturn(payload(patch), 'owner'));
  }
});

test('rejects changed item identity, missing stock product and unsupported adjustments', async () => {
  assert.throws(() => validateSalesReturnLines([{ ...base, rate: 99 }], [{ ...base, remainingQty: 10 }]), /must match/);
  mocks();
  await assert.rejects(prepareSalesReturn(payload({ charges: [{ amount: 20 }] }), 'owner'), /extra charges/);
  mock.method(Product, 'findOne', () => ({ lean: async () => null }));
  await assert.rejects(prepareSalesReturn(payload(), 'owner'), /inventory product is missing/);
});

test('edits exclude their own return while counting other sales returns', async () => {
  mocks();
  const returnId = '507f1f77bcf86cd799439023';
  mock.method(Invoice, 'find', (query) => {
    assert.equal(query._id.$ne, returnId);
    return { lean: async () => [{ items: [{ ...base, qty: 8 }] }] };
  });
  const result = await salesReturnDetails('owner', invoiceId, returnId);
  assert.equal(result.items[0].remainingQty, 2);
});

test('sales return lock rejects concurrent writes before invoice creation', async () => {
  mock.method(SupplierReturnLock, 'create', async () => { throw Object.assign(new Error('duplicate'), { code: 11000 }); });
  mock.method(Invoice, 'create', () => assert.fail('Locked request must not write'));
  const release = mock.method(SupplierReturnLock, 'deleteOne', () => assert.fail('Must not release another request lock'));
  let error;
  await createSalesReturn({ user: { id: 'owner' }, body: payload() }, {}, (err) => { error = err; });
  assert.equal(error.statusCode, 409);
  assert.match(error.message, /Another sales return/);
  assert.equal(release.mock.callCount(), 0);
});
