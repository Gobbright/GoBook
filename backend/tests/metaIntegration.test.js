import assert from 'node:assert/strict';
import test, { afterEach, mock } from 'node:test';
import { createHmac } from 'node:crypto';
import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

process.env.CLIENT_URL = 'http://localhost:5173';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/meta-isolated-tests';
process.env.JWT_SECRET = 'meta-isolated-test-jwt-key';
process.env.META_APP_ID = '12345';
process.env.META_APP_SECRET = 'test-app-secret';
process.env.META_LOGIN_CONFIG_ID = '67890';
process.env.META_GRAPH_API_VERSION = 'v25.0';
process.env.META_TOKEN_ENCRYPTION_KEY = 'ab'.repeat(32);
process.env.META_PUBLIC_ORIGIN = 'https://www.gobooksuite.com';

const { verifySignedRequest, encryptToken, decryptToken, hash, stateCookieName } = await import('../src/modules/meta/security.js');
const { exchangeAndVerify } = await import('../src/modules/meta/graph.js');
const { requireMetaConfig } = await import('../src/modules/meta/config.js');
const { metaPublicRouter, metaApiRouter } = await import('../src/modules/meta/routes.js');
const { AppUser } = await import('../src/models/AppUser.js');
const { MetaOAuthState, MetaConnection, MetaSubjectGuard, MetaDeletionRequest } = await import('../src/models/MetaIntegration.js');
const nativeFetch = globalThis.fetch;
const config = requireMetaConfig();
const owner = { _id: '507f1f77bcf86cd799439011', businessId: '507f1f77bcf86cd799439012', accountType: 'owner', status: 'Active' };
const state = 'a'.repeat(64);
const browser = 'b'.repeat(64);
const bearer = 'Bearer ' + jwt.sign({ sub: owner._id }, process.env.JWT_SECRET);
const signed = (extra = {}) => {
  const body = Buffer.from(JSON.stringify({ algorithm: 'HMAC-SHA256', user_id: '555', issued_at: Math.floor(Date.now() / 1000), ...extra })).toString('base64url');
  return createHmac('sha256', config.appSecret).update(body).digest('base64url') + '.' + body;
};
const query = (value) => ({ select() { return this; }, lean: async () => value });
afterEach(() => mock.restoreAll());

async function http(fn) {
  const app = express();
  app.use(metaPublicRouter);
  app.use('/api/meta', metaApiRouter);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  try { await fn('http://127.0.0.1:' + server.address().port); }
  finally { await new Promise((resolve) => server.close(resolve)); }
}
function actor(value = owner) { mock.method(AppUser, 'findById', () => query(value)); }
function sessionMock() {
  mock.method(mongoose, 'startSession', async () => ({
    withTransaction: async (fn) => fn(), endSession: async () => {},
  }));
  mock.method(MetaSubjectGuard, 'updateOne', async () => ({}));
  mock.method(MetaSubjectGuard, 'findOneAndUpdate', async () => ({ revokedBefore: new Date(0) }));
}
function graphMock(overrides = {}) {
  const calls = [];
  mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url: new URL(url), options });
    const path = new URL(url).pathname;
    let result;
    if (path.endsWith('/oauth/access_token')) result = { access_token: 'secret-meta-token' };
    else if (path.endsWith('/debug_token')) result = { data: { is_valid: true, app_id: '12345', user_id: '555',
      scopes: ['whatsapp_business_management', 'whatsapp_business_messaging'],
      granular_scopes: [{ scope: 'whatsapp_business_management', target_ids: ['111'] }], ...overrides } };
    else if (path.endsWith('/111/phone_numbers')) result = { data: [{ id: '222', display_phone_number: '+91 123', verified_name: 'Test Business', code_verification_status: 'VERIFIED' }] };
    else if (path.endsWith('/111')) result = { id: '111', name: 'Test WABA' };
    else throw new Error('Unexpected Graph request');
    return { ok: true, json: async () => result };
  });
  return calls;
}
function attemptMock(value = {}) {
  mock.method(MetaOAuthState, 'findOneAndDelete', (filter) => {
    assert.equal(filter.stateHash, hash(state));
    assert.equal(filter.browserHash, hash(browser));
    assert.ok(filter.expiresAt.$gt instanceof Date);
    return query(value === null ? null : { userId: owner._id, businessId: owner.businessId, createdAt: new Date(Date.now() - 5000), ...value });
  });
}
const callbackHeaders = { Cookie: stateCookieName(state) + '=' + browser };

test('signed_request requires authentic HMAC, algorithm, identifier and issued_at', () => {
  assert.equal(verifySignedRequest(signed(), config.appSecret).user_id, '555');
  for (const bad of ['', 'x.y', signed() + '.extra', signed({ algorithm: 'none' }), signed({ user_id: {} }), signed({ issued_at: 99999999999 })]) {
    assert.throws(() => verifySignedRequest(bad, config.appSecret), { statusCode: 400 });
  }
  assert.throws(() => verifySignedRequest(signed(), 'wrong-secret'), { statusCode: 400 });
  assert.equal(verifySignedRequest(signed({ issued_at: 1000000 }), config.appSecret).user_id, '555');
});

test('AES-GCM ciphertext is randomized, authenticated and tenant-bound', () => {
  const encrypted = encryptToken('secret', config.encryptionKey, 'tenant-a');
  assert.notEqual(encrypted, encryptToken('secret', config.encryptionKey, 'tenant-a'));
  assert.equal(decryptToken(encrypted, config.encryptionKey, 'tenant-a'), 'secret');
  assert.throws(() => decryptToken(encrypted, config.encryptionKey, 'tenant-b'));
  const parts = encrypted.split('.');
  parts[3] = Buffer.from('tampered').toString('base64url');
  assert.throws(() => decryptToken(parts.join('.'), config.encryptionKey, 'tenant-a'));
});

test('code exchange validates granted assets and uses exact redirect URI only for redirect flow', async () => {
  const calls = graphMock();
  const result = await exchangeAndVerify(config, 'one-time-code', 'redirect');
  assert.equal(result.phoneNumberId, '222');
  assert.equal(calls[0].options.body.get('redirect_uri'), 'https://www.gobooksuite.com/auth/meta/callback');
  assert.equal(calls[0].options.body.get('client_secret'), config.appSecret);
  assert.equal(calls[0].url.search, '');
  await exchangeAndVerify(config, 'sdk-code', 'embedded', { wabaId: '111', phoneNumberId: '222' });
  assert.equal(calls[4].options.body.has('redirect_uri'), false);
  await assert.rejects(exchangeAndVerify(config, 'code', 'embedded', { wabaId: '999' }), { statusCode: 400 });
  await assert.rejects(exchangeAndVerify(config, 'code', 'embedded', { wabaId: '111', phoneNumberId: '999' }), { statusCode: 400 });
});

test('wrong app, expired token and missing permissions fail closed', async () => {
  for (const invalid of [{ app_id: 'other' }, { is_valid: false }, { expires_at: 1 }, { data_access_expires_at: 1 }, { scopes: [] }]) {
    mock.restoreAll(); graphMock(invalid);
    await assert.rejects(exchangeAndVerify(config, 'code', 'redirect'));
  }
});

test('provider errors cannot expose credentials or response bodies', async () => {
  mock.method(globalThis, 'fetch', async () => { throw new Error('secret-meta-token and app secret'); });
  await assert.rejects(exchangeAndVerify(config, 'code', 'redirect'), (error) => error.statusCode === 502 && !error.message.includes('secret'));
});

test('start requires authentication, active owner and exact frontend origin', async () => {
  actor();
  mock.method(MetaOAuthState, 'countDocuments', async () => 0);
  const create = mock.method(MetaOAuthState, 'create', async () => ({}));
  await http(async (base) => {
    const post = (headers) => nativeFetch(base + '/auth/meta/start', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify({ mode: 'redirect', businessId: 'attacker' }) });
    assert.equal((await post({})).status, 401);
    assert.equal((await post({ Authorization: bearer, Origin: 'https://evil.example' })).status, 403);
    const response = await post({ Authorization: bearer, Origin: config.publicOrigin });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('set-cookie'), /HttpOnly/);
    assert.match(response.headers.get('set-cookie'), /Secure/);
    assert.match(response.headers.get('set-cookie'), /SameSite=Lax/);
    const data = await response.json();
    assert.equal(new URL(data.authorizeUrl).searchParams.get('redirect_uri'), config.callbackUrl);
    assert.equal(create.mock.calls[0].arguments[0].businessId, owner.businessId);
    assert.notEqual(create.mock.calls[0].arguments[0].stateHash, data.state);
    assert.doesNotMatch(JSON.stringify(data), /test-app-secret|abababab/);
  });
});

test('members and blocked owners cannot access or start connections', async () => {
  for (const user of [{ ...owner, accountType: 'member' }, { ...owner, status: 'Blocked' }, null]) {
    mock.restoreAll(); actor(user);
    await http(async (base) => {
      assert.equal((await nativeFetch(base + '/api/meta/connection', { headers: { Authorization: bearer } })).status, 403);
    });
  }
});

test('callback rejects missing state, absent browser cookie, expired/replayed state and foreign POST origins', async () => {
  attemptMock(null);
  await http(async (base) => {
    assert.equal((await nativeFetch(base + '/auth/meta/callback')).status, 400);
    assert.equal((await nativeFetch(base + '/auth/meta/callback?state=' + state)).status, 400);
    assert.equal((await nativeFetch(base + '/auth/meta/callback?state=' + state, { headers: callbackHeaders })).status, 400);
    assert.equal((await nativeFetch(base + '/auth/meta/callback', { method: 'POST', headers: { ...callbackHeaders, 'Content-Type': 'application/x-www-form-urlencoded', Origin: 'https://evil.example' }, body: new URLSearchParams({ state }) })).status, 403);
  });
});

test('denial consumes state and redirects only to fixed settings URL', async () => {
  actor(); attemptMock();
  await http(async (base) => {
    const response = await nativeFetch(base + '/auth/meta/callback?state=' + state + '&error=access_denied&redirect=https://evil.example', { headers: callbackHeaders, redirect: 'manual' });
    assert.equal(response.status, 303);
    assert.equal(response.headers.get('location'), config.settingsUrl + '?meta_error=denied');
  });
});

test('successful GET and POST callbacks encrypt credentials and never return tokens', async () => {
  for (const method of ['GET', 'POST']) {
    mock.restoreAll(); actor(); attemptMock(); sessionMock(); graphMock();
    const save = mock.method(MetaConnection, 'findOneAndUpdate', async () => ({}));
    await http(async (base) => {
      const params = new URLSearchParams({ state, code: 'authorization-code', waba_id: '111', phone_number_id: '222' });
      const response = await nativeFetch(base + '/auth/meta/callback' + (method === 'GET' ? '?' + params : ''), {
        method, redirect: 'manual', headers: { ...callbackHeaders, Origin: config.publicOrigin, 'Content-Type': 'application/x-www-form-urlencoded' },
        ...(method === 'POST' ? { body: params } : {}),
      });
      assert.equal(response.status, 303);
      assert.equal(response.headers.get('location'), config.settingsUrl + '?connected=true');
      const [filter, update, options] = save.mock.calls[0].arguments;
      assert.equal(filter.businessId, owner.businessId);
      assert.ok(options.session);
      assert.equal(decryptToken(update.$set.tokenEncrypted, config.encryptionKey, owner.businessId), 'secret-meta-token');
      assert.equal(update.$set.token, undefined);
      assert.doesNotMatch(await response.text(), /secret-meta-token|authorization-code/);
    });
  }
});

test('a changed business assignment invalidates an outstanding authorization', async () => {
  actor({ ...owner, businessId: '507f1f77bcf86cd799439013' }); attemptMock();
  await http(async (base) => {
    const response = await nativeFetch(base + '/auth/meta/callback?state=' + state + '&code=x', { headers: callbackHeaders });
    assert.equal(response.status, 403);
  });
});

test('revocation guard blocks an in-flight callback from restoring a removed connection', async () => {
  actor(); attemptMock(); sessionMock(); graphMock();
  MetaSubjectGuard.findOneAndUpdate.mock.mockImplementation(async () => ({ revokedBefore: new Date() }));
  const save = mock.method(MetaConnection, 'findOneAndUpdate', async () => ({}));
  await http(async (base) => {
    const response = await nativeFetch(base + '/auth/meta/callback?state=' + state + '&code=x', { headers: callbackHeaders, redirect: 'manual' });
    assert.equal(response.headers.get('location'), config.settingsUrl + '?meta_error=connection_failed');
    assert.equal(save.mock.calls.length, 0);
  });
});

test('signed deauthorization removes credentials only for matching Meta subject and event cutoff', async () => {
  sessionMock();
  const update = mock.method(MetaConnection, 'updateMany', async () => ({}));
  await http(async (base) => {
    const response = await nativeFetch(base + '/meta/deauthorize', { method: 'POST', body: new URLSearchParams({ signed_request: signed() }) });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { success: true });
    const [filter, change] = update.mock.calls[0].arguments;
    assert.equal(filter.metaUserId, '555');
    assert.ok(filter.connectedAt.$lte instanceof Date);
    assert.equal(change.$unset.tokenEncrypted, 1);
    assert.equal(change.$set.status, 'disconnected');
  });
});

test('deletion returns a random persisted confirmation only after deleting Meta data', async () => {
  sessionMock();
  mock.method(MetaDeletionRequest, 'findOne', () => query(null));
  const deletion = mock.method(MetaConnection, 'deleteMany', async () => ({}));
  const save = mock.method(MetaDeletionRequest, 'findOneAndUpdate', async (_filter, update) => update.$setOnInsert);
  await http(async (base) => {
    const response = await nativeFetch(base + '/meta/data-deletion', { method: 'POST', body: new URLSearchParams({ signed_request: signed() }) });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.match(data.confirmation_code, /^[a-f0-9]{64}$/);
    assert.equal(data.url, config.publicOrigin + '/data-deletion-status/' + data.confirmation_code);
    assert.equal(deletion.mock.calls[0].arguments[0].metaUserId, '555');
    assert.equal(save.mock.calls[0].arguments[1].$setOnInsert.confirmationCode, data.confirmation_code);
  });
});

test('repeated deletion returns the original confirmation without deleting a later connection', async () => {
  mock.method(MetaDeletionRequest, 'findOne', () => query({ confirmationCode: 'c'.repeat(64) }));
  const deletion = mock.method(MetaConnection, 'deleteMany', async () => { throw new Error('Replay must not run deletion'); });
  await http(async (base) => {
    const response = await nativeFetch(base + '/meta/data-deletion', { method: 'POST', body: new URLSearchParams({ signed_request: signed() }) });
    assert.equal((await response.json()).confirmation_code, 'c'.repeat(64));
    assert.equal(deletion.mock.calls.length, 0);
  });
});

test('invalid signed callbacks and deletion failures never report completed deletion', async () => {
  sessionMock(); mock.method(MetaDeletionRequest, 'findOne', () => query(null));
  mock.method(MetaConnection, 'deleteMany', async () => { throw new Error('secret database detail'); });
  const record = mock.method(MetaDeletionRequest, 'findOneAndUpdate', async () => ({}));
  await http(async (base) => {
    for (const path of ['/meta/deauthorize', '/meta/data-deletion']) {
      assert.equal((await nativeFetch(base + path, { method: 'POST', body: new URLSearchParams({ signed_request: 'invalid' }) })).status, 400);
    }
    const response = await nativeFetch(base + '/meta/data-deletion', { method: 'POST', body: new URLSearchParams({ signed_request: signed() }) });
    assert.equal(response.status, 500);
    assert.doesNotMatch(await response.text(), /secret|confirmation_code/);
    assert.equal(record.mock.calls.length, 0);
  });
});

test('public deletion lookup needs no login, disables caching and excludes identity', async () => {
  const code = 'd'.repeat(64);
  mock.method(MetaDeletionRequest, 'findOne', () => query({ confirmationCode: code, status: 'completed', completedAt: new Date() }));
  await http(async (base) => {
    const response = await nativeFetch(base + '/meta/deletion-status/' + code);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(Object.keys(await response.json()).sort(), ['completedAt', 'confirmationCode', 'status']);
    assert.equal((await nativeFetch(base + '/meta/deletion-status/invalid')).status, 404);
  });
});

test('local disconnect removes only the current tenant and invalidates pending authorization', async () => {
  actor(); sessionMock();
  const states = mock.method(MetaOAuthState, 'deleteMany', async () => ({}));
  const connection = mock.method(MetaConnection, 'deleteOne', async () => ({}));
  await http(async (base) => {
    assert.equal((await nativeFetch(base + '/api/meta/connection', { method: 'DELETE' })).status, 401);
    const response = await nativeFetch(base + '/api/meta/connection', { method: 'DELETE', headers: { Authorization: bearer } });
    assert.equal(response.status, 200);
    assert.equal(states.mock.calls[0].arguments[0].businessId, owner.businessId);
    assert.equal(connection.mock.calls[0].arguments[0].businessId, owner.businessId);
    assert.ok(connection.mock.calls[0].arguments[1].session);
  });
});

test('start rate limit bounds outstanding OAuth attempts without issuing more state', async () => {
  actor();
  mock.method(MetaOAuthState, 'countDocuments', async () => 10);
  const create = mock.method(MetaOAuthState, 'create', async () => ({}));
  await http(async (base) => {
    const response = await nativeFetch(base + '/auth/meta/start', { method: 'POST',
      headers: { Authorization: bearer, Origin: config.publicOrigin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'embedded' }) });
    assert.equal(response.status, 429);
    assert.equal(create.mock.calls.length, 0);
  });
});

test('expired authorization is shown as expired by the tenant-scoped connection API', async () => {
  actor();
  const lookup = mock.method(MetaConnection, 'findOne', () => query({ status: 'connected', tokenExpiresAt: new Date(1), wabaId: '111' }));
  await http(async (base) => {
    const response = await nativeFetch(base + '/api/meta/connection', { headers: { Authorization: bearer } });
    assert.equal((await response.json()).connection.status, 'expired');
    assert.equal(lookup.mock.calls[0].arguments[0].businessId, owner.businessId);
  });
});

test('connection index conflict produces a safe failure instead of moving another tenant phone', async () => {
  actor(); attemptMock(); sessionMock(); graphMock();
  mock.method(MetaConnection, 'findOneAndUpdate', async () => { const error = new Error('database index detail'); error.code = 11000; throw error; });
  await http(async (base) => {
    const response = await nativeFetch(base + '/auth/meta/callback?state=' + state + '&code=x', { headers: callbackHeaders, redirect: 'manual' });
    assert.equal(response.headers.get('location'), config.settingsUrl + '?meta_error=asset_in_use');
    assert.doesNotMatch(await response.text(), /database|secret/);
  });
});

test('malformed JSON does not echo request bodies', async () => {
  await http(async (base) => {
    const response = await nativeFetch(base + '/meta/data-deletion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{private-token' });
    assert.equal(response.status, 400);
    assert.doesNotMatch(await response.text(), /private-token/);
  });
});
