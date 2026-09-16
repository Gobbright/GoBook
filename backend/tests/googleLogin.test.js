import assert from 'node:assert/strict';
import test, { afterEach, mock } from 'node:test';
import { OAuth2Client } from 'google-auth-library';

process.env.CLIENT_URL = 'http://localhost:5173';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/unused-test-db';
process.env.JWT_SECRET = 'isolated-google-test-secret';
process.env.GOOGLE_CLIENT_ID = 'test-client';
const { googleLogin, toSafeUser, startRegistration } = await import('../src/modules/auth/authController.js');
const { AppUser } = await import('../src/models/AppUser.js');
const { PendingEmailLogin } = await import('../src/models/PendingEmailLogin.js');
const { PendingSignup } = await import('../src/models/PendingSignup.js');
afterEach(() => mock.restoreAll());

async function signIn(user) {
  mock.method(OAuth2Client.prototype, 'verifyIdToken', async () => ({
    getPayload: () => ({ email: 'person@example.com', sub: 'google-subject', email_verified: true }),
  }));
  mock.method(AppUser, 'findOne', async () => user);
  mock.method(AppUser, 'create', async () => { throw new Error('Google login must not create incomplete users'); });
  const result = {};
  await googleLogin({ body: { credential: 'verified-in-test' } }, { json: (data) => { result.data = data; } }, (error) => { result.error = error; });
  return result;
}

test('new Google users go to registration without a session or placeholder account', async () => {
  const result = await signIn(null);
  assert.ifError(result.error);
  assert.equal(result.data.registrationRequired, true);
  assert.equal(result.data.email, 'person@example.com');
  assert.equal(result.data.token, undefined);
});

test('legacy incomplete Google users return to current registration', async () => {
  const result = await signIn({ _id: 'legacy', status: 'Active', googleId: 'google-subject', onboardingCompleted: false });
  assert.ifError(result.error);
  assert.equal(result.data.registrationRequired, true);
  assert.equal(result.data.token, undefined);
});

test('registered business users sign in even when the legacy onboarding flag is false', async () => {
  const result = await signIn({ _id: 'registered', businessId: 'business', status: 'Active', category: 'school', onboardingCompleted: false, save: async () => {} });
  assert.ifError(result.error);
  assert.ok(result.data.token);
  assert.equal(result.data.user.needsOnboarding, false);
});

test('blocked Google users cannot enter registration', async () => {
  const result = await signIn({ _id: 'blocked', status: 'Blocked' });
  assert.equal(result.error.statusCode, 403);
  assert.equal(result.data, undefined);
});

test('platform owners do not need business onboarding', () => {
  assert.equal(toSafeUser({ isPlatformOwner: true }).needsOnboarding, false);
});

test('legacy registration eligibility still requires email verification before any signup writes', async () => {
  let checkedAvailability = false;
  mock.method(AppUser, 'exists', async (query) => {
    checkedAvailability = true;
    assert.equal(query.email, 'person@example.com');
    assert.deepEqual(query.$or, [
      { onboardingCompleted: true }, { businessId: { $ne: null } },
      { googleId: { $in: ['', null] } }, { status: { $ne: 'Active' } },
      { isPlatformOwner: true },
    ]);
    return null;
  });
  mock.method(PendingEmailLogin, 'exists', async () => null);
  mock.method(PendingSignup, 'findOneAndUpdate', () => { throw new Error('Unverified registration must not write'); });
  let error;
  await startRegistration({ body: {
    email: 'person@example.com', name: 'Person', password: 'password123',
    businessName: 'Business', phone: '9876543210', category: 'school',
    accountHolderName: 'Person', bankName: 'Bank', accountNumber: '1234567890', ifscCode: 'ABCD0123456',
    signupToken: 'a'.repeat(64),
  } }, { json: () => assert.fail('Must verify email first') }, (err) => { error = err; });
  assert.equal(checkedAvailability, true);
  assert.equal(error.statusCode, 400);
  assert.match(error.message, /verification expired/);
});
