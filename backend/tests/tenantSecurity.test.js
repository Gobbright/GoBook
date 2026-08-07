import assert from 'node:assert/strict';
import test from 'node:test';

import { stripTenantOwnershipFields } from '../src/middleware/auth.js';

test('auth sanitizer removes tenant ownership fields from request bodies', () => {
  const body = {
    name: 'Safe payload',
    userId: 'attacker-user',
    businessId: 'attacker-business',
    $set: {
      status: 'Active',
      userId: 'other-user',
      businessId: 'other-business',
    },
    $setOnInsert: {
      userId: 'insert-user',
      businessId: 'insert-business',
      code: 'A-1',
    },
    data: {
      userId: 'allowed-as-module-data',
      businessId: 'allowed-as-module-data',
    },
  };

  stripTenantOwnershipFields(body);

  assert.equal(body.userId, undefined);
  assert.equal(body.businessId, undefined);
  assert.equal(body.$set.userId, undefined);
  assert.equal(body.$set.businessId, undefined);
  assert.equal(body.$set.status, 'Active');
  assert.equal(body.$setOnInsert.userId, undefined);
  assert.equal(body.$setOnInsert.businessId, undefined);
  assert.equal(body.$setOnInsert.code, 'A-1');
  assert.equal(body.data.userId, 'allowed-as-module-data');
  assert.equal(body.data.businessId, 'allowed-as-module-data');
});
