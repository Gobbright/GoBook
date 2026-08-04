import assert from 'node:assert/strict';
import test from 'node:test';

import mongoose from 'mongoose';

import { FinanceCollection } from '../src/models/FinanceCollection.js';
import { FinanceCustomer } from '../src/models/FinanceCustomer.js';

const userId = new mongoose.Types.ObjectId();
const customerId = new mongoose.Types.ObjectId();

test('finance customer accepts the required collection plan fields', () => {
  const customer = new FinanceCustomer({
    userId,
    name: 'Sample Customer',
    phone: '9876543210',
    type: 'Loan',
    totalAmount: 10000,
    dailyCollectionAmount: 250,
    startDate: '2026-07-31',
  });

  assert.equal(customer.validateSync(), undefined);
  assert.equal(customer.status, 'Active');
});

test('finance customer rejects invalid type and non-positive amounts', () => {
  const customer = new FinanceCustomer({
    userId,
    name: 'Sample Customer',
    phone: '9876543210',
    type: 'Other',
    totalAmount: 0,
    dailyCollectionAmount: -1,
    startDate: '31-07-2026',
  });

  const error = customer.validateSync();
  assert.ok(error.errors.type);
  assert.ok(error.errors.totalAmount);
  assert.ok(error.errors.dailyCollectionAmount);
  assert.ok(error.errors.startDate);
});

test('finance collection requires a positive amount and ISO date', () => {
  const validEntry = new FinanceCollection({
    userId,
    customerId,
    date: '2026-07-31',
    amount: 250,
  });
  assert.equal(validEntry.validateSync(), undefined);

  const invalidEntry = new FinanceCollection({
    userId,
    customerId,
    date: '31/07/2026',
    amount: 0,
  });
  const error = invalidEntry.validateSync();
  assert.ok(error.errors.date);
  assert.ok(error.errors.amount);
});
