import assert from 'node:assert/strict';
import test, { afterEach, mock } from 'node:test';
import { Invoice } from '../src/models/Invoice.js';
import { Product } from '../src/models/Product.js';
import { remainingPurchaseItems, validateReturnLines, prepareSupplierReturn, purchaseReturnDetails } from '../src/services/supplierReturns.js';
import { SupplierReturnLock } from '../src/models/SupplierReturnLock.js';

process.env.CLIENT_URL = 'http://localhost:5173';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/unused-test-db';
process.env.JWT_SECRET = 'supplier-return-test-secret';
const { createSupplierReturn, updateSupplierReturn, deleteSupplierReturn } = await import('../src/modules/retail/sales/supplier-return/supplierReturnController.js');

afterEach(() => mock.restoreAll());
const purchaseId = '507f1f77bcf86cd799439011';
const productId = '507f1f77bcf86cd799439012';
const base = { description: 'Test item', unit: 'Nos', size: 'Blue', qty: 10, rate: 100, gstRate: 18, discount: 0, itemType: 'Product', productId };
const purchase = { _id: purchaseId, number: 'PE-001', customer: { name: 'Supplier' }, meta: { date: '2026-09-01' }, items: [base] };
function mocks(source = purchase, prior = []) {
  mock.method(Invoice, 'findOne', (query) => {
    assert.equal(query.userId, 'owner');
    assert.equal(query.documentType, 'purchase-entry');
    return { lean: async () => source };
  });
  mock.method(Invoice, 'find', () => ({ lean: async () => prior }));
  mock.method(Product, 'findOne', () => ({ lean: async () => ({ _id: productId }) }));
}
function payload(overrides = {}) {
  return { number: 'SPR-001', meta: { date: '2026-09-16' }, customer: { name: 'Supplier' }, items: [{ ...base, qty: 2 }], extra: { originalPurchaseId: purchaseId, reason: 'Damaged' }, ...overrides };
}

test('remaining quantities deduct previous partial returns without double-counting duplicate purchase lines', () => {
  const items = remainingPurchaseItems({ items: [{ ...base, qty: 3 }, { ...base, qty: 4 }] }, [{ items: [{ ...base, qty: 5 }] }]);
  assert.deepEqual(items.map((item) => item.remainingQty), [0, 2]);
  assert.throws(() => validateReturnLines([{ ...base, qty: 3 }], items), /only 2 units/);
});

test('duplicate return rows cannot bypass remaining quantity validation', () => {
  assert.throws(() => validateReturnLines([{ ...base, qty: 6 }, { ...base, qty: 5 }], [{ ...base, remainingQty: 10 }]), /only 4 units/);
});

test('rejects changed products, variants, rates, discounts and nonpositive quantities', () => {
  for (const patch of [{ description: 'Other' }, { size: 'Red' }, { rate: 200 }, { discount: 5 }, { qty: 0 }, { qty: -1 }, { qty: Infinity }, { rate: NaN }]) {
    assert.throws(() => validateReturnLines([{ ...base, ...patch }], [{ ...base, remainingQty: 10 }]));
  }
});

test('prepares return with authoritative supplier and recalculated totals, ignoring client totals and payment', async () => {
  mocks();
  const result = await prepareSupplierReturn(payload({ totals: { finalTotal: 1 }, advanceReceived: 500, paymentMethod: 'Cash' }), 'owner');
  assert.equal(result.totals.finalTotal, 236);
  assert.equal(result.totals.totalGst, 36);
  assert.equal(result.advanceReceived, 0);
  assert.equal(result.paymentMethod, '');
  assert.equal(result.extra.originalInvoiceNo, 'PE-001');
});

test('partial returns proportionally preserve fixed purchase discounts', async () => {
  const item = { ...base, discountType: 'amount', discount: 100 };
  mocks({ ...purchase, items: [item] });
  const result = await prepareSupplierReturn(payload({ items: [{ ...base, qty: 2, discount: 10, discountType: 'percent' }] }), 'owner');
  assert.equal(result.items[0].discount, 10);
  assert.equal(result.items[0].discountType, 'percent');
  assert.equal(result.totals.finalTotal, 212);
});

test('partial returns preserve their share of the overall purchase discount', async () => {
  mocks({ ...purchase, additionalDiscount: { type: 'amount', value: 118 } });
  const result = await prepareSupplierReturn(payload({ items: [{ ...base, qty: 2, discount: 10 }], additionalDiscount: { type: 'percent', value: 90 } }), 'owner');
  assert.equal(result.additionalDiscount.value, 0);
  assert.equal(result.items[0].discount, 10);
  assert.equal(result.totals.totalGst, 32.4);
  assert.equal(result.totals.finalTotal, 212);
});

test('requires purchase, matching supplier, reason and valid chronological date', async () => {
  mocks();
  for (const patch of [{ extra: { reason: 'Damaged' } }, { customer: { name: 'Different vendor' } }, { extra: { originalPurchaseId: purchaseId, reason: '' } }, { meta: { date: '2026-08-31' } }, { meta: { date: 'bad' } }]) {
    await assert.rejects(prepareSupplierReturn(payload(patch), 'owner'));
  }
});

test('missing or foreign purchases are rejected', async () => {
  mocks(null);
  await assert.rejects(prepareSupplierReturn(payload(), 'owner'), /not found/);
});

test('edits exclude only their own return while counting other returns', async () => {
  mocks();
  const returnId = '507f1f77bcf86cd799439013';
  mock.method(Invoice, 'find', (query) => {
    assert.equal(query._id.$ne, returnId);
    return { lean: async () => [{ items: [{ ...base, qty: 8 }] }] };
  });
  const result = await purchaseReturnDetails('owner', purchaseId, returnId);
  assert.equal(result.items[0].remainingQty, 2);
});

test('cannot return a missing inventory product or apply unsupported adjustments', async () => {
  mocks();
  await assert.rejects(prepareSupplierReturn(payload({ charges: [{ amount: 20 }] }), 'owner'), /extra charges/);
  mock.method(Product, 'findOne', () => ({ lean: async () => null }));
  await assert.rejects(prepareSupplierReturn(payload(), 'owner'), /inventory product is missing/);
});

test('concurrent create, edit and delete requests cannot bypass the shared return lock', async () => {
  mock.method(SupplierReturnLock, 'create', async () => { throw Object.assign(new Error('duplicate'), { code: 11000 }); });
  mock.method(Invoice, 'create', () => assert.fail('Locked request must not write'));
  const release = mock.method(SupplierReturnLock, 'deleteOne', () => assert.fail('Must not release another request lock'));
  for (const handler of [createSupplierReturn, updateSupplierReturn, deleteSupplierReturn]) {
    let error;
    await handler({ user: { id: 'owner' }, body: payload(), params: { id: purchaseId } }, {}, (err) => { error = err; });
    assert.equal(error.statusCode, 409);
    assert.match(error.message, /Another supplier return/);
  }
  assert.equal(release.mock.callCount(), 0);
});

test('failed validation releases the return lock and makes no invoice writes', async () => {
  mock.method(SupplierReturnLock, 'create', async () => ({}));
  const release = mock.method(SupplierReturnLock, 'deleteOne', async () => ({}));
  mock.method(Invoice, 'create', () => assert.fail('Invalid request must not write'));
  let error;
  await createSupplierReturn({ user: { id: 'owner' }, body: payload({ number: '' }) }, {}, (err) => { error = err; });
  assert.equal(error.statusCode, 400);
  assert.equal(release.mock.callCount(), 1);
});
