import assert from 'node:assert/strict';
import test, { afterEach, mock } from 'node:test';
import mongoose from 'mongoose';

process.env.CLIENT_URL = 'http://localhost:5173';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/admin-whatsapp-tests';
process.env.JWT_SECRET = 'admin-whatsapp-test-jwt-key';

const { buildProviderRows, getWhatsAppProviderAdminOverview, updateWhatsAppProviderStatus } = await import('../src/modules/admin/whatsAppProviderAdminController.js');
const { Business } = await import('../src/models/Business.js');
const { AppUser } = await import('../src/models/AppUser.js');
const { MetaConnection } = await import('../src/models/MetaIntegration.js');
const { WhatsAppCampaign } = await import('../src/models/WhatsAppCampaign.js');
const { WhatsAppMessageLog } = await import('../src/models/WhatsAppMessageLog.js');
const { WhatsAppProviderProfile } = await import('../src/models/WhatsAppProviderProfile.js');
const { WhatsAppTemplate } = await import('../src/models/WhatsAppTemplate.js');
const { WhatsAppUsageRecord } = await import('../src/models/WhatsAppUsageRecord.js');

const businessA = new mongoose.Types.ObjectId('507f1f77bcf86cd799439021');
const businessB = new mongoose.Types.ObjectId('507f1f77bcf86cd799439022');
const profileA = new mongoose.Types.ObjectId('507f1f77bcf86cd799439031');
const userA = new mongoose.Types.ObjectId('507f1f77bcf86cd799439041');
const userB = new mongoose.Types.ObjectId('507f1f77bcf86cd799439042');

const chain = (value) => ({
  select() { return this; },
  sort() { return this; },
  limit() { return this; },
  lean: async () => value,
});

function response() {
  const res = { statusCode: 200, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
}

async function callController(controller, req = {}) {
  const res = response();
  let err;
  await controller({ params: {}, body: {}, ...req }, res, (error) => { err = error; });
  return { res, err };
}

afterEach(() => mock.restoreAll());

test('buildProviderRows includes Meta-only customers and separates real connection status from admin review', () => {
  const rows = buildProviderRows([
    { _id: profileA, businessId: businessA, onboardingStatus: 'Completed', metaVerificationStatus: 'Verified', accountStatus: 'Active', waba: { name: 'Manual WABA', wabaId: 'manual' }, phoneNumbers: [{ _id: 'phone1', phoneNumber: '+91 90000', displayName: 'Manual' }], plan: { monthlyMessageLimit: 500 }, webhook: { url: 'https://hook.test' }, updatedAt: new Date('2026-01-01T00:00:00Z') },
  ], [
    { businessId: businessB, status: 'connected', wabaId: 'waba2', wabaName: 'Meta WABA', phoneNumberId: 'phone2', displayPhoneNumber: '+91 91111', verifiedName: 'Meta Phone', phoneStatus: 'VERIFIED', connectedAt: new Date('2026-02-01T00:00:00Z'), accessTokenCiphertext: 'secret' },
  ], [
    { _id: businessA, name: 'Manual Business' },
    { _id: businessB, name: 'Meta Business' },
  ], new Date('2026-03-01T00:00:00Z'));

  assert.equal(rows.length, 2);
  const meta = rows.find((row) => row.businessId === String(businessB));
  assert.equal(meta.id, null);
  assert.equal(meta.customer, 'Meta Business');
  assert.equal(meta.connectionStatus, 'Connected');
  assert.equal(meta.metaVerificationStatus, 'Not Started');
  assert.equal(meta.apiStatus, 'Authorized');
  assert.equal(meta.waba.source, 'Meta');
  assert.equal(meta.phoneNumbers[0].verificationStatus, 'VERIFIED');
  assert.equal(Object.hasOwn(meta, 'accessTokenCiphertext'), false);

  const manual = rows.find((row) => row.businessId === String(businessA));
  assert.equal(manual.connectionStatus, 'Not Connected');
  assert.equal(manual.waba.source, 'Manual record');
  assert.equal(manual.phoneNumbers[0].verificationStatus, 'Not checked with Meta');
});

test('admin overview uses real total counts and maps campaigns/templates to businesses without credential fields', async () => {
  mock.method(WhatsAppProviderProfile, 'find', () => chain([{ _id: profileA, businessId: businessA, onboardingStatus: 'Completed', metaVerificationStatus: 'Pending', accountStatus: 'Active', updatedAt: new Date('2026-01-01T00:00:00Z') }]));
  mock.method(MetaConnection, 'find', () => chain([{ businessId: businessB, status: 'connected', wabaId: 'waba2', wabaName: 'Meta WABA', phoneNumberId: 'phone2', displayPhoneNumber: '+91 91111', verifiedName: 'Meta Phone', phoneStatus: 'VERIFIED' }]));
  mock.method(Business, 'find', () => chain([{ _id: businessA, name: 'Alpha' }, { _id: businessB, name: 'Beta' }]));
  mock.method(AppUser, 'find', () => chain([{ _id: userA, businessId: businessA }, { _id: userB, businessId: businessB }]));
  mock.method(WhatsAppCampaign, 'find', () => chain([{ _id: 'camp1', userId: userB, name: 'Promo', status: 'Completed', sent: 7 }]));
  mock.method(WhatsAppTemplate, 'find', () => chain([{ _id: 'tmpl1', userId: userA, name: 'Welcome', status: 'Approved', sent: 99 }]));
  mock.method(WhatsAppUsageRecord, 'aggregate', async () => [{ sent: 100, delivered: 80, read: 70, failed: 3 }]);
  mock.method(WhatsAppMessageLog, 'aggregate', async () => [{ _id: 'failed', count: 2 }]);
  mock.method(WhatsAppCampaign, 'countDocuments', async () => 42);
  mock.method(WhatsAppTemplate, 'countDocuments', async () => 31);

  const { res, err } = await callController(getWhatsAppProviderAdminOverview);
  assert.equal(err, undefined);
  assert.equal(res.body.stats.customers, 2);
  assert.equal(res.body.stats.connected, 1);
  assert.equal(res.body.stats.campaigns, 42);
  assert.equal(res.body.stats.templates, 31);
  assert.deepEqual(res.body.totals, { sent: 100, delivered: 80, read: 70, failed: 3 });
  assert.equal(res.body.campaigns[0].customer, 'Beta');
  assert.equal(res.body.templates[0].customer, 'Alpha');
  assert.equal(Object.hasOwn(res.body.templates[0], 'sent'), true);
  assert.equal(JSON.stringify(res.body).includes('secret'), false);
});

test('status update rejects unknown fields and values before writing', async () => {
  const write = mock.method(WhatsAppProviderProfile, 'findOneAndUpdate', async () => { throw new Error('must not write'); });
  const { err } = await callController(updateWhatsAppProviderStatus, { params: { businessId: String(businessA) }, body: { accountStatus: 'Enabled', expectedUpdatedAt: null } });
  assert.equal(err.statusCode, 400);
  assert.equal(write.mock.callCount(), 0);
});

test('business status update requires a matching version for existing profiles', async () => {
  mock.method(WhatsAppProviderProfile, 'findOne', () => chain({ _id: profileA, businessId: businessA, updatedAt: new Date('2026-01-01T00:00:00Z') }));
  mock.method(Business, 'findById', () => chain({ _id: businessA, name: 'Alpha' }));
  const write = mock.method(WhatsAppProviderProfile, 'findOneAndUpdate', async () => { throw new Error('must not write stale update'); });
  const { err } = await callController(updateWhatsAppProviderStatus, { params: { businessId: String(businessA) }, body: { accountStatus: 'Active', expectedUpdatedAt: '2026-01-02T00:00:00.000Z' } });
  assert.equal(err.statusCode, 409);
  assert.equal(write.mock.callCount(), 0);
});

test('business status update can create an admin profile for a real Meta-only customer', async () => {
  let created;
  mock.method(WhatsAppProviderProfile, 'findOne', () => chain(null));
  mock.method(Business, 'findById', () => chain({ _id: businessB, name: 'Beta' }));
  mock.method(MetaConnection, 'findOne', () => chain({ businessId: businessB, ownerUserId: userB }));
  mock.method(AppUser, 'findOne', () => chain({ _id: userB }));
  mock.method(WhatsAppProviderProfile, 'create', async (payload) => { created = payload; return { _id: profileA, businessId: payload.businessId, updatedAt: new Date() }; });

  const { res, err } = await callController(updateWhatsAppProviderStatus, { params: { businessId: String(businessB) }, body: { onboardingStatus: 'In Progress', expectedUpdatedAt: null } });
  assert.equal(err, undefined);
  assert.equal(res.body.businessId, String(businessB));
  assert.equal(String(created.businessId), String(businessB));
  assert.equal(String(created.ownerUserId), String(userB));
  assert.equal(created.onboardingStatus, 'In Progress');
});